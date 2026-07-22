import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { StorageService } from '../../storage/storage.service';
import {
  MarkdownTextSplitter,
  RecursiveCharacterTextSplitter,
  TextSplitter,
} from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { createParsedSourceLoader } from '../../../helpers/documents/loaders';
import createPath from '../../../helpers/r2/createPath';
import { DocumentRepository } from '../../../repository/documents.repository';
import { IngestionProcessRepository } from '../../../repository/ingestion-process.repository';
import { StructuredDataRepository } from '../../../repository/structured-data.repository';
import { BATCH_SIZE_DOCUMENT_CHUNKS } from '../../../const/ingestion';
import { IngestionBatchService } from './ingestion-batch.service';
import { IngestionJobData } from './ingestion-job.types';
import {
  deserializeChunkArtifact,
  serializeChunkArtifact,
} from './ingestion-chunk-artifact';
import { isAxiosError } from 'axios';
import { IngestionProgressService } from '../../redis/ingestion-progress.service';
import type { IngestionProgressEvent } from '../../redis/ingestion-progress.types';
import { profileDatasets } from '../../structured-data/structured-profiler';
import type { ProfiledDataset } from '../../structured-data/structured-data.types';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;
const CODE_CHUNK_OVERLAP = 100;
const JSON_SECTION_MAX_CHARS = 4000;

class IngestionCheckpointError extends Error {}

@Injectable()
export class IngestionProcessor {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly storage: StorageService,
    private readonly processRepository: IngestionProcessRepository,
    private readonly batchService: IngestionBatchService,
    private readonly structuredDataRepository: StructuredDataRepository,
    private readonly progress: IngestionProgressService,
  ) {}
  async handle(job: Job<IngestionJobData>): Promise<void> {
    const { documentId, rawObjectPath } = job.data;
    if (!job.id) {
      const error = new Error('ingestion job id is required');
      this.logger.error(`invalid ingestion job: ${error.message}`, error);
      throw error;
    }
    const jobId = job.id;

    const doc = await this.documentRepository.getDocById(documentId);
    if (!doc) {
      this.logger.warn(`document ${documentId} not found, skip`);
      return;
    }

    let processExists = false;
    let processedChunks = 0;
    let totalChunks: number | null = null;

    try {
      const ingestionProcess = await this.processRepository.findByJobId(jobId);
      if (!ingestionProcess) {
        throw new Error(`ingestion process ${jobId} not found`);
      }
      processExists = true;
      if (ingestionProcess.status === 'ready') return;
      processedChunks = ingestionProcess.processedChunks;
      totalChunks = ingestionProcess.totalChunks;

      await this.processRepository.beginAttempt({ jobId, documentId });
      await this.publishProgress({
        jobId,
        documentId,
        collectionId: doc.collectionId,
        status: 'processing',
        processedChunks: ingestionProcess.processedChunks,
        totalChunks: ingestionProcess.totalChunks,
      });
      this.logger.log(
        `running ingestion processor for user ${doc.userId} with document: ${doc.id}`,
      );
      const textObjectPath = createPath(
        'documents',
        doc.userId,
        doc.collectionId,
        doc.id,
        'text',
        'content.txt',
      );
      const chunkArtifactPath = createPath(
        'documents',
        doc.userId,
        doc.collectionId,
        doc.id,
        'ingestion',
        'chunks.json',
      );

      let chunks: Document[];
      let datasets: ProfiledDataset[];
      let pageCount: number | null;
      if (ingestionProcess.totalChunks === null) {
        const created = await this.createIngestionArtifacts({
          documentId,
          ingestionKey: jobId,
          sourceType: doc.sourceType,
          rawObjectPath,
          textObjectPath,
          chunkArtifactPath,
        });
        chunks = created.chunks;
        datasets = created.datasets;
        pageCount = created.pageCount;
      } else {
        const artifact = await this.loadIngestionArtifact(
          chunkArtifactPath,
          doc.sourceType,
        );
        chunks = artifact.chunks;
        datasets = artifact.datasets;
        pageCount = artifact.pageCount;
      }

      this.validateCheckpoint(
        ingestionProcess.processedChunks,
        ingestionProcess.totalChunks,
        chunks.length,
      );
      if (ingestionProcess.totalChunks === null) {
        await this.processRepository.setTotalChunks(jobId, chunks.length);
        totalChunks = chunks.length;
        await this.publishProgress({
          jobId,
          documentId,
          collectionId: doc.collectionId,
          status: 'processing',
          processedChunks: ingestionProcess.processedChunks,
          totalChunks: chunks.length,
        });
      }

      for (
        let offset = ingestionProcess.processedChunks;
        offset < chunks.length;
        offset += BATCH_SIZE_DOCUMENT_CHUNKS
      ) {
        const batch = chunks.slice(offset, offset + BATCH_SIZE_DOCUMENT_CHUNKS);
        this.logger.log(
          `running ingestion batch at offset ${offset} / ${chunks.length} for document ${doc.id}, user : ${doc.userId}`,
        );
        await this.batchService.processBatch(doc, batch, offset);
        await this.processRepository.advanceCheckpoint(
          jobId,
          offset + batch.length,
        );
        processedChunks = offset + batch.length;
        await this.publishProgress({
          jobId,
          documentId,
          collectionId: doc.collectionId,
          status: 'processing',
          processedChunks: offset + batch.length,
          totalChunks: chunks.length,
        });
      }

      await this.structuredDataRepository.replaceDocumentDatasets({
        documentId,
        collectionId: doc.collectionId,
        ingestionKey: jobId,
        datasets,
      });

      await this.processRepository.markReady({
        jobId,
        documentId,
        totalChunks: chunks.length,
        document: { textPath: textObjectPath, pageCount },
      });
      processedChunks = chunks.length;
      totalChunks = chunks.length;
      await this.publishProgress({
        jobId,
        documentId,
        collectionId: doc.collectionId,
        status: 'ready',
        processedChunks: chunks.length,
        totalChunks: chunks.length,
      });
      this.logger.log(
        `document ${documentId} ready: ${chunks.length} chunks indexed , user : ${doc.userId}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (isAxiosError(err)) {
        this.logger.error(
          `ingestion failed for ${documentId}: , user : ${doc.userId} reason http request fail `,
          err.response?.status,
          JSON.stringify(err.response?.data || ''),
        );
      } else {
        this.logger.error(
          `ingestion failed for ${documentId}: ${message}, user : ${doc.userId}`,
          err,
        );
      }
      if (processExists) {
        try {
          if (
            err instanceof IngestionCheckpointError ||
            this.isFinalAttempt(job)
          ) {
            await this.processRepository.markFailed({
              jobId,
              documentId,
              message,
            });
            await this.publishProgress({
              jobId,
              documentId,
              collectionId: doc.collectionId,
              status: 'failed',
              processedChunks,
              totalChunks,
              errorMessage: message,
            });
          } else {
            await this.processRepository.recordRetryableError(jobId, message);
            await this.publishProgress({
              jobId,
              documentId,
              collectionId: doc.collectionId,
              status: 'processing',
              processedChunks,
              totalChunks,
              errorMessage: message,
            });
          }
        } catch (statusError) {
          const statusMessage =
            statusError instanceof Error
              ? statusError.message
              : String(statusError);
          this.logger.error(
            `failed to persist ingestion error status for ${documentId}: ${statusMessage}`,
            statusError,
          );
        }
      }
      if (err instanceof IngestionCheckpointError) {
        throw new UnrecoverableError(message);
      }
      throw err;
    }
  }

  private isFinalAttempt(job: Job<IngestionJobData>): boolean {
    return job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
  }

  private async publishProgress(event: IngestionProgressEvent): Promise<void> {
    try {
      await this.progress.publish(event);
    } catch (error) {
      this.logger.warn(`failed to publish ingestion progress: ${error}`);
    }
  }

  private async createIngestionArtifacts({
    documentId,
    ingestionKey,
    sourceType,
    rawObjectPath,
    textObjectPath,
    chunkArtifactPath,
  }: {
    documentId: string;
    ingestionKey: string;
    sourceType: string;
    rawObjectPath: string;
    textObjectPath: string;
    chunkArtifactPath: string;
  }): Promise<{
    chunks: Document[];
    datasets: ProfiledDataset[];
    pageCount: number | null;
  }> {
    const buf = await this.storage.getBytes(rawObjectPath);
    const blob = new Blob([Uint8Array.from(buf)]);
    const loader = createParsedSourceLoader(sourceType, blob);
    const parsed = await loader.load();
    const pageCount = sourceType === 'pdf' ? parsed.textDocuments.length : null;
    const loaded = parsed.textDocuments.map(
      (document) =>
        new Document({
          pageContent: document.pageContent,
          metadata: document.metadata,
        }),
    );
    const sourceDocs = this.normalizeLoadedDocuments(sourceType, loaded);
    const fullText = sourceDocs
      .map((document) => document.pageContent)
      .join('\n\n');
    const chunks = await this.createChunks(sourceType, sourceDocs);
    const datasets = profileDatasets(parsed.datasets, {
      documentId,
      ingestionKey,
    });

    await Promise.all([
      this.storage.put(textObjectPath, fullText, 'text/plain; charset=utf-8'),
      this.storage.put(
        chunkArtifactPath,
        serializeChunkArtifact(sourceType, pageCount, chunks, datasets),
        'application/json; charset=utf-8',
      ),
    ]);

    return { chunks, datasets, pageCount };
  }

  private async loadIngestionArtifact(
    chunkArtifactPath: string,
    sourceType: string,
  ): Promise<{
    chunks: Document[];
    datasets: ProfiledDataset[];
    pageCount: number | null;
  }> {
    try {
      const raw = await this.storage.getBytes(chunkArtifactPath);
      return deserializeChunkArtifact(raw.toString('utf8'), sourceType);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new IngestionCheckpointError(
        `cannot resume ingestion from chunk artifact: ${message}`,
      );
    }
  }

  private validateCheckpoint(
    processed: number,
    persisted: number | null,
    actual: number,
  ): void {
    if (processed < 0 || processed > actual) {
      throw new IngestionCheckpointError(
        `invalid ingestion checkpoint ${processed}/${actual}`,
      );
    }
    if (persisted !== null && persisted !== actual) {
      throw new IngestionCheckpointError(
        `ingestion chunk total changed ${persisted} -> ${actual}`,
      );
    }
    if (processed !== actual && processed % BATCH_SIZE_DOCUMENT_CHUNKS !== 0) {
      throw new IngestionCheckpointError(
        `ingestion checkpoint ${processed} is not on a batch boundary`,
      );
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
          .filter((doc): doc is Document => this.isDocument(doc));
    }
  }

  private async createChunks(
    sourceType: string,
    sourceDocs: Document[],
  ): Promise<Document[]> {
    if (sourceType === 'csv') {
      return sourceDocs
        .map((chunk) => this.withChunkContext(sourceType, chunk))
        .map((chunk) => this.trimDocument(chunk))
        .filter((doc): doc is Document => this.isDocument(doc));
    }

    const splitter = this.createSplitter(sourceType);
    const chunks = await splitter.splitDocuments(sourceDocs);
    return chunks
      .map((chunk) => this.withChunkContext(sourceType, chunk))
      .map((chunk) => this.trimDocument(chunk))
      .filter((doc): doc is Document => this.isDocument(doc));
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
      : [this.trimDocument(doc)].filter((item): item is Document =>
          this.isDocument(item),
        );
  }

  private splitJsonDocument(doc: Document): Document[] {
    try {
      const parsed = JSON.parse(doc.pageContent) as unknown;
      return this.splitJsonValue(parsed, '$', doc.metadata);
    } catch {
      this.logger.warn('invalid JSON document, fallback to recursive splitter');
    }

    return [this.trimDocument(doc)].filter((item): item is Document =>
      this.isDocument(item),
    );
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
    const metadata = chunk.metadata as Record<string, unknown>;
    const headingPath = metadata.headingPath;
    const jsonPath = metadata.jsonPath;

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
  private isDocument(doc: Document | null): doc is Document {
    return doc !== null;
  }
}
