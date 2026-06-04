import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostgresService } from '../../databases/postgres/postgres.service';
import { ElasticsearchService } from '../../databases/elasticsearch/elasticsearch.service';
import { EmbeddingService } from '../../embedding/embedding.service';
import { QueueService } from '../../shared/queue/queue.service';
import { StorageService } from '../../shared/storage/storage.service';
import { INGESTION_QUEUE, IngestionJobData } from './documents.constants';
import { detectSourceType } from './source-type';
import { createChunkVectorStore } from './vector-store';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly queue: QueueService,
    private readonly prisma: PostgresService,
    private readonly storage: StorageService,
    private readonly es: ElasticsearchService,
    private readonly embedding: EmbeddingService,
  ) {}

  private async assertCollection(userId: string, collectionId: string) {
    const col = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
      select: { id: true },
    });
    if (!col) throw new NotFoundException('collection not found');
  }

  async upload(
    userId: string,
    collectionId: string,
    file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('file is required');
    await this.assertCollection(userId, collectionId);

    const sourceType = detectSourceType(file);
    if (!sourceType) {
      throw new BadRequestException(
        `unsupported file type: ${file.mimetype || file.originalname}`,
      );
    }
    // Tạo record trước để có id cho đường dẫn Storage
    const doc = await this.prisma.document.create({
      data: {
        collectionId,
        userId,
        sourceType,
        originalName: file.originalname,
        byteSize: BigInt(file.size),
        status: 'uploaded',
      },
    });

    // Upload lên R2 (bucket private), lưu object key vào DB (không lưu URL)
    const rawObjectPath = `documents/${userId}/${collectionId}/${doc.id}/raw/${file.originalname}`;
    await this.storage.put(rawObjectPath, file.buffer, file.mimetype);

    const updated = await this.prisma.document.update({
      where: { id: doc.id },
      data: { sourceUrl: rawObjectPath },
    });

    // Worker nhận object path qua job data để tải file parse
    await this.queue
      .getQueue<IngestionJobData>(INGESTION_QUEUE)
      .add('ingest', { documentId: doc.id, rawObjectPath });

    return this.serialize(updated);
  }

  async list(userId: string, collectionId: string) {
    await this.assertCollection(userId, collectionId);
    const docs = await this.prisma.document.findMany({
      where: { collectionId, userId },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => this.serialize(d));
  }

  async remove(userId: string, collectionId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId, collectionId },
    });
    if (!doc) throw new NotFoundException('document not found');

    // 1. Xoá chunk khỏi Elasticsearch (theo chunk id = ChunkMeta.id)
    const chunks = await this.prisma.chunkMeta.findMany({
      where: { documentId },
      select: { id: true },
    });
    if (chunks.length > 0) {
      const vectorStore = createChunkVectorStore(
        this.es,
        this.embedding.getLangchainEmbeddings(),
      );
      await vectorStore.delete({ ids: chunks.map((c) => c.id) });
    }

    // 2. Xoá file trên Storage (cả raw + text)
    await this.storage
      .delete(`documents/${userId}/${collectionId}/${documentId}/`)
      .catch(() => undefined);

    // 3. Xoá record (ChunkMeta cascade theo FK)
    await this.prisma.document.delete({ where: { id: documentId } });
  }

  /** Presigned URL tải file gốc — chỉ trả nếu document thuộc user + collection. */
  async getRawUrl(userId: string, collectionId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId, collectionId },
      select: { sourceUrl: true },
    });
    if (!doc?.sourceUrl) throw new NotFoundException('document not found');
    return { url: await this.storage.getSignedUrl(doc.sourceUrl) };
  }

  /** Presigned URL tải text đã trích xuất — chỉ trả nếu document thuộc user + collection. */
  async getTextUrl(userId: string, collectionId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId, collectionId },
      select: { textPath: true },
    });
    if (!doc?.textPath) throw new NotFoundException('text not ready');
    return { url: await this.storage.getSignedUrl(doc.textPath) };
  }

  /** BigInt không serialize JSON được -> chuyển byteSize sang string. */
  private serialize<T extends { byteSize: bigint | null }>(doc: T) {
    return { ...doc, byteSize: doc.byteSize?.toString() ?? null };
  }
}
