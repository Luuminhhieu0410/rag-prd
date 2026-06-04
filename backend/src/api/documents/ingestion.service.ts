import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { encode } from 'gpt-tokenizer';
import { PostgresService } from '../../databases/postgres/postgres.service';
import { ElasticsearchService } from '../../databases/elasticsearch/elasticsearch.service';
import { EmbeddingService } from '../../embedding/embedding.service';
import { WorkerService } from '../../shared/worker/worker.service';
import { StorageService } from '../../shared/storage/storage.service';
import { INGESTION_QUEUE, IngestionJobData } from './documents.constants';
import { createLoader } from './loaders';
import { createChunkVectorStore } from './vector-store';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

@Injectable()
export class IngestionService implements OnModuleInit {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly workerService: WorkerService,
    private readonly prisma: PostgresService,
    private readonly storage: StorageService,
    private readonly embedding: EmbeddingService,
    private readonly es: ElasticsearchService,
  ) {}

  onModuleInit() {
    this.workerService.createWorker(INGESTION_QUEUE, (job) =>
      this.handle(job as Job<IngestionJobData>),
    );
    this.logger.log(`ingestion worker started on queue "${INGESTION_QUEUE}"`);
  }

  private async handle(job: Job<IngestionJobData>): Promise<void> {
    const { documentId, rawObjectPath } = job.data;
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      this.logger.warn(`document ${documentId} not found, skip`);
      return;
    }

    try {
      // 1. Tải file gốc từ Storage (object path lấy từ job, không từ DB)
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'parsing' },
      });
      const buf = await this.storage.getBytes(rawObjectPath);
      const blob = new Blob([Uint8Array.from(buf)]);

      // 2. Load + parse theo loại file
      const loader = createLoader(doc.sourceType, blob);
      const loaded = await loader.load();
      const pageCount = doc.sourceType === 'pdf' ? loaded.length : null;
      console.log('loaded', loaded);
      // Lưu text trích xuất ra Storage, lưu object key (presigned khi viewer cần)
      // const fullText = loaded.map((d) => d.pageContent).join('\n\n');
      // const textObjectPath = `documents/${doc.userId}/${doc.collectionId}/${doc.id}/text/content.txt`;
      // await this.storage.put(
      //   textObjectPath,
      //   fullText,
      //   'text/plain; charset=utf-8',
      // );
      //
      // // 3. Chunk (text ngắn hơn CHUNK_SIZE -> 1 chunk duy nhất)
      // await this.prisma.document.update({
      //   where: { id: documentId },
      //   data: { status: 'chunking' },
      // });
      // const splitter = new RecursiveCharacterTextSplitter({
      //   chunkSize: CHUNK_SIZE,
      //   chunkOverlap: CHUNK_OVERLAP,
      // });
      // const chunks = await splitter.splitDocuments(loaded);
      //
      // if (chunks.length === 0) {
      //   await this.prisma.document.update({
      //     where: { id: documentId },
      //     data: {
      //       status: 'ready',
      //       textPath: textObjectPath,
      //       pageCount,
      //       chunkCount: 0,
      //     },
      //   });
      //   return;
      // }
      //
      // // 4. chunk id + metadata + ChunkMeta rows
      // const ids = chunks.map(() => randomUUID());
      // const enriched = chunks.map(
      //   (c, i) =>
      //     new Document({
      //       pageContent: c.pageContent,
      //       metadata: {
      //         user_id: doc.userId,
      //         collection_id: doc.collectionId,
      //         document_id: doc.id,
      //         chunk_id: ids[i],
      //         chunk_index: i,
      //         page: this.pageOf(c),
      //       },
      //     }),
      // );
      // const chunkRows = chunks.map((c, i) => ({
      //   id: ids[i],
      //   documentId: doc.id,
      //   chunkIndex: i,
      //   page: this.pageOf(c),
      //   tokenCount: encode(c.pageContent).length,
      // }));
      // await this.prisma.chunkMeta.createMany({ data: chunkRows });
      //
      // // 5. Embed + index vào Elasticsearch (id ES = chunk_id = ChunkMeta.id)
      // await this.prisma.document.update({
      //   where: { id: documentId },
      //   data: { status: 'embedding' },
      // });
      // const vectorStore = createChunkVectorStore(
      //   this.es,
      //   this.embedding.getLangchainEmbeddings(),
      // );
      // await vectorStore.addDocuments(enriched, { ids });
      //
      // // 6. Hoàn tất
      // await this.prisma.document.update({
      //   where: { id: documentId },
      //   data: {
      //     status: 'ready',
      //     textPath: textObjectPath,
      //     pageCount,
      //     chunkCount: chunks.length,
      //   },
      // });
      // this.logger.log(
      //   `document ${documentId} ready: ${chunks.length} chunks indexed`,
      // );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`ingestion failed for ${documentId}: ${message}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'failed', errorMessage: message },
      });
      throw err; // để BullMQ ghi nhận job failed
    }
  }

  private pageOf(doc: Document): number | null {
    const loc = doc.metadata?.loc as { pageNumber?: number } | undefined;
    return (
      loc?.pageNumber ?? (doc.metadata?.page as number | undefined) ?? null
    );
  }
}
