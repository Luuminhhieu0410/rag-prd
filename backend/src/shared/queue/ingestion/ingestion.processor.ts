import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkerService } from '../../worker/worker.service';
import { PostgresService } from '../../../databases/postgres/postgres.service';
import { StorageService } from '../../storage/storage.service';
import {
  MarkdownTextSplitter,
  RecursiveCharacterTextSplitter,
  TextSplitter,
} from '@langchain/textsplitters';
import { createLoader, Document } from '../../../helpers/documents/loaders';
import createPath from '../../../helpers/r2/createPath';
import { encode } from 'punycode';
import { randomUUID } from 'crypto';
import { DocumentRepository } from '../../../repository/documents.repository';
import { VectorStoreService } from '../../vectorstore/vectorstore.service';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;
const CODE_CHUNK_OVERLAP = 100;
const JSON_SECTION_MAX_CHARS = 4000;
const EMBED_MAX_RETRIES = 3;
const EMBED_BASE_DELAY_MS = 1000;

@Injectable()
export class IngestionProcessor {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly workerService: WorkerService,
    private readonly prisma: PostgresService,
    private readonly documentRepository: DocumentRepository,
    private readonly storage: StorageService,
    private readonly vectorStore: VectorStoreService,
  ) {}
  async handle(
    job: Job<{ documentId: string; rawObjectPath: string }>,
  ): Promise<any> {
    const { documentId, rawObjectPath } = job.data;
    const doc = await this.documentRepository.getDocById(documentId);
    if (!doc) {
      this.logger.warn(`document ${documentId} not found, skip`);
      return;
    }

    try {
      const buf = await this.storage.getBytes(rawObjectPath);
      const blob = new Blob([Uint8Array.from(buf)]);
      const loader = createLoader(doc.sourceType, blob);
      const loaded = await loader.load();
      const pageCount = doc.sourceType === 'pdf' ? loaded.length : null;

      const sourceDocs = this.normalizeLoadedDocuments(doc.sourceType, loaded);
      const fullText = sourceDocs.map((d) => d.pageContent).join('\n\n');
      const textObjectPath = createPath(
        'documents',
        doc.userId,
        doc.collectionId,
        doc.id,
        'text',
        'content.txt',
      );

      const [chunks] = await Promise.all([
        this.createChunks(doc.sourceType, sourceDocs),
        this.storage.put(textObjectPath, fullText, 'text/plain; charset=utf-8'),
        this.documentRepository.updateByField(documentId, {
          status: 'chunking',
        }),
        this.deleteExistingChunks(documentId),
      ]);

      if (chunks.length === 0) {
        await this.documentRepository.updateByField(documentId, {
          status: 'ready',
          textPath: textObjectPath,
          pageCount,
          chunkCount: 0,
        });
        return;
      }

      const ids = chunks.map(() => randomUUID());
      const enriched = chunks.map(
        (chunk, index) =>
          new Document({
            pageContent: chunk.pageContent,
            metadata: {
              ...chunk.metadata,
              user_id: doc.userId,
              collection_id: doc.collectionId,
              document_id: doc.id,
              chunk_id: ids[index],
              chunk_index: index,
              page: this.pageOf(chunk),
            },
          }),
      );
      await this.prisma.getClient().chunkMeta.createMany({
        data: chunks.map((chunk, index) => ({
          id: ids[index],
          documentId: doc.id,
          chunkIndex: index,
          page: this.pageOf(chunk),
          tokenCount: encode(chunk.pageContent).length,
        })),
      });

      await this.documentRepository.updateByField(documentId, {
        status: 'embedding',
      });

      await this.vectorStore
        .getElasticVectorSearch()
        .addDocuments(enriched, { ids });

      await this.documentRepository.updateByField(documentId, {
        status: 'ready',
        textPath: textObjectPath,
        pageCount,
        chunkCount: chunks.length,
      });
      this.logger.log(
        `document ${documentId} ready: ${chunks.length} chunks indexed`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`ingestion failed for ${documentId}: ${message}`);
      await this.documentRepository.updateByField(documentId, {
        status: 'failed',
        errorMessage: message,
      });
      throw err;
    }
  }

  private createSplitter(sourceType: string): TextSplitter {
    switch (sourceType) {
      case 'markdown':
        return new MarkdownTextSplitter({
          chunkSize: CHUNK_SIZE,
          chunkOverlap: CHUNK_OVERLAP,
        });
      case 'javascript':
      case 'typescript':
        return RecursiveCharacterTextSplitter.fromLanguage('js', {
          chunkSize: CHUNK_SIZE,
          chunkOverlap: CODE_CHUNK_OVERLAP,
        });
      case 'python':
        return RecursiveCharacterTextSplitter.fromLanguage('python', {
          chunkSize: CHUNK_SIZE,
          chunkOverlap: CODE_CHUNK_OVERLAP,
        });
      case 'html':
        return RecursiveCharacterTextSplitter.fromLanguage('html', {
          chunkSize: CHUNK_SIZE,
          chunkOverlap: CODE_CHUNK_OVERLAP,
        });
      default:
        return new RecursiveCharacterTextSplitter({
          chunkSize: CHUNK_SIZE,
          chunkOverlap: CHUNK_OVERLAP,
        });
    }
  }

  private normalizeLoadedDocuments(
    sourceType: string,
    loaded: Document[],
  ): Document[] {
    switch (sourceType) {
      case 'markdown':
        return loaded.flatMap((doc) => this.splitMarkdownSections(doc));
      case 'json':
        return loaded.flatMap((doc) => this.splitJsonDocument(doc));
      default:
        return loaded
          .map((doc) => this.trimDocument(doc))
          .filter(this.isDocument);
    }
  }

  private async createChunks(
    sourceType: string,
    sourceDocs: Document[],
  ): Promise<Document[]> {
    const splitter = this.createSplitter(sourceType);
    const chunks = await splitter.splitDocuments(sourceDocs);
    return chunks
      .map((chunk) => this.withChunkContext(sourceType, chunk))
      .map((chunk) => this.trimDocument(chunk))
      .filter(this.isDocument);
  }

  private splitMarkdownSections(doc: Document): Document[] {
    const lines = doc.pageContent.split(/\r?\n/);
    const sections: Document[] = [];
    const headingStack: string[] = [];
    let buffer: string[] = [];
    let currentPath: string | null = null;
    let currentLevel: number | null = null;
    let inCodeFence = false;
    let sawHeading = false;

    const flush = () => {
      const pageContent = buffer.join('\n').trim();
      if (!pageContent) return;

      sections.push(
        new Document({
          pageContent,
          metadata: {
            ...doc.metadata,
            section: currentPath ?? 'intro',
            headingPath: currentPath,
            headingLevel: currentLevel,
          },
        }),
      );
      buffer = [];
    };

    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        inCodeFence = !inCodeFence;
      }

      const heading = inCodeFence
        ? null
        : /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (heading) {
        sawHeading = true;
        flush();

        const level = heading[1].length;
        const title = heading[2].trim();
        headingStack.splice(level - 1);
        headingStack[level - 1] = title;
        currentPath = headingStack.filter(Boolean).join(' > ');
        currentLevel = level;
      }

      buffer.push(line);
    }
    flush();

    return sawHeading
      ? sections
      : [this.trimDocument(doc)].filter(this.isDocument);
  }

  private splitJsonDocument(doc: Document): Document[] {
    try {
      const parsed = JSON.parse(doc.pageContent) as unknown;
      return this.splitJsonValue(parsed, '$', doc.metadata);
    } catch {
      this.logger.warn('invalid JSON document, fallback to recursive splitter');
    }

    return [this.trimDocument(doc)].filter(this.isDocument);
  }

  private splitJsonValue(
    value: unknown,
    path: string,
    metadata: Record<string, unknown>,
  ): Document[] {
    const rendered = JSON.stringify(value, null, 2);
    if (
      rendered.length <= JSON_SECTION_MAX_CHARS ||
      value === null ||
      typeof value !== 'object'
    ) {
      return [
        new Document({
          pageContent: rendered,
          metadata: {
            ...metadata,
            section: path,
            jsonPath: path,
          },
        }),
      ];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item, index) =>
        this.splitJsonValue(item, `${path}[${index}]`, metadata),
      );
    }

    const entries = Object.entries(value);
    if (entries.length === 0) {
      return [
        new Document({
          pageContent: rendered,
          metadata: {
            ...metadata,
            section: path,
            jsonPath: path,
          },
        }),
      ];
    }

    return entries.flatMap(([key, child]) =>
      this.splitJsonValue(child, `${path}.${key}`, metadata),
    );
  }

  private withChunkContext(sourceType: string, chunk: Document): Document {
    const text = chunk.pageContent.trim();
    const headingPath = chunk.metadata?.headingPath;
    const jsonPath = chunk.metadata?.jsonPath;

    if (
      sourceType === 'markdown' &&
      typeof headingPath === 'string' &&
      headingPath &&
      !text.startsWith('Section:')
    ) {
      return new Document({
        pageContent: `Section: ${headingPath}\n\n${text}`,
        metadata: chunk.metadata,
      });
    }

    if (
      sourceType === 'json' &&
      typeof jsonPath === 'string' &&
      jsonPath &&
      !text.startsWith('JSON path:')
    ) {
      return new Document({
        pageContent: `JSON path: ${jsonPath}\n\n${text}`,
        metadata: chunk.metadata,
      });
    }

    return chunk;
  }

  private trimDocument(doc: Document): Document | null {
    const pageContent = doc.pageContent.trim();
    if (!pageContent) return null;

    return new Document({
      pageContent,
      metadata: doc.metadata,
    });
  }
  private async deleteExistingChunks(documentId: string): Promise<void> {
    const chunks = await this.prisma.getClient().chunkMeta.findMany({
      where: { documentId },
      select: { id: true },
    });
    if (chunks.length === 0) return;

    await this.vectorStore
      .getElasticVectorSearch()
      .delete({ ids: chunks.map((chunk) => chunk.id) });
    await this.prisma
      .getClient()
      .chunkMeta.deleteMany({ where: { documentId } });
  }

  private pageOf(doc: Document): number | null {
    const loc = doc.metadata?.loc as { pageNumber?: number } | undefined;
    return (
      loc?.pageNumber ?? (doc.metadata?.page as number | undefined) ?? null
    );
  }
  private isDocument(doc: Document | null): doc is Document {
    return doc !== null;
  }
}
