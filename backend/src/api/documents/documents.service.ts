import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../../shared/storage/storage.service';
import createPath from '../../helpers/r2/createPath';
import { CollectionRepository } from '../../repository/collection.repository';
import { DocumentRepository } from '../../repository/documents.repository';
import { IngestionProducer } from '../../shared/queue/ingestion/ingestion.producer';
import { ChunkMetaRepository } from '../../repository/chunk-meta.repository';
import { IngestionProcessRepository } from '../../repository/ingestion-process.repository';
import { ingestionJobId } from '../../const/ingestion';
import { validateDocumentFile } from './document-upload.constants';
import { deserializeChunkArtifact } from '../../shared/queue/ingestion/ingestion-chunk-artifact';
import { generateChunkId } from '../../shared/queue/ingestion/chunk-identity';

@Injectable()
export class DocumentsService {
  constructor(
    private ingestionProducer: IngestionProducer,
    private readonly storage: StorageService,
    private readonly collectionRepository: CollectionRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly processRepository: IngestionProcessRepository,
    private readonly chunkMetaRepository: ChunkMetaRepository,
  ) {}

  private async assertCollection(userId: string, collectionId: string) {
    const col = await this.collectionRepository.findByIdAndUserId(
      collectionId,
      userId,
    );
    if (!col) throw new NotFoundException('collection not found');
  }

  async upload(
    userId: string,
    collectionId: string,
    file?: Express.Multer.File,
  ) {
    const validated = validateDocumentFile(file);
    file = validated.file;
    const { sourceType } = validated;
    // await this.assertCollection(userId, collectionId);

    const doc = await this.documentRepository.create({
      collectionId,
      userId,
      sourceType,
      originalName: file.originalname,
      byteSize: BigInt(file.size),
      status: 'uploaded',
    });

    const rawObjectPath = createPath(
      'documents',
      userId,
      collectionId,
      doc.id,
      file.originalname,
    );

    const [updated] = await Promise.all([
      this.documentRepository.updateByField(doc.id, {
        sourceUrl: rawObjectPath,
        errorMessage: null,
      }),
      this.storage.put(rawObjectPath, file.buffer, file.mimetype),
      this.processRepository.createUploaded({
        jobId: ingestionJobId(doc.id),
        documentId: doc.id,
        collectionId: doc.collectionId,
        status: 'uploaded',
        fileMetadata: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          byteSize: String(file.size),
          sourceType,
          rawObjectPath,
        },
      }),
    ]);

    await this.ingestionProducer.addIngestionJob({
      documentId: doc.id,
      rawObjectPath,
    });
    // await this.queue
    //   .getQueue<IngestionJobData>(INGESTION_QUEUE)
    //   .add('ingest', );

    return this.serialize(updated);
  }

  async list(userId: string, collectionId: string) {
    // await this.assertCollection(userId, collectionId);
    const docs = await this.documentRepository.findManyByCollectionAndUser(
      collectionId,
      userId,
    );
    return docs.map((d) => this.serialize(d));
  }

  async remove(userId: string, collectionId: string, documentId: string) {
    const doc = await this.documentRepository.findByIdAndUser(
      documentId,
      collectionId,
      userId,
    );
    if (!doc) throw new NotFoundException('document not found');

    const chunks =
      await this.chunkMetaRepository.findIdsByDocumentId(documentId);
    if (chunks.length > 0) {
      // const vectorStore = createChunkVectorStore(
      //   this.es,
      //   this.embedding.getLangchainEmbeddings(),
      // );
      // await vectorStore.delete({ ids: chunks.map((c) => c.id) });
    }

    // 2 xoá file trên Storage (cả raw + text)
    // 3 xoá record (ChunkMeta cascade theo FK)
    await Promise.all([
      this.storage.delete(`documents/${userId}/${collectionId}/${documentId}/`),
      this.documentRepository.delete(documentId),
    ]);
  }

  /** Presigned URL tải file gốc — chỉ trả nếu document thuộc user + collection. */
  async getRawUrl(userId: string, collectionId: string, documentId: string) {
    const doc = await this.documentRepository.findByIdAndUser(
      documentId,
      collectionId,
      userId,
    );
    if (!doc?.sourceUrl) throw new NotFoundException('document not found');
    return { url: await this.storage.getSignedUrl(doc.sourceUrl) };
  }

  /** Presigned URL tải text đã trích xuất — chỉ trả nếu document thuộc user + collection. */
  async getTextUrl(userId: string, collectionId: string, documentId: string) {
    const doc = await this.documentRepository.findByIdAndUser(
      documentId,
      collectionId,
      userId,
    );
    if (!doc?.textPath) throw new NotFoundException('text not ready');
    return { url: await this.storage.getSignedUrl(doc.textPath) };
  }

  async getContent(userId: string, collectionId: string, documentId: string) {
    const doc = await this.documentRepository.findByIdAndUser(
      documentId,
      collectionId,
      userId,
    );
    if (!doc || doc.status !== 'ready' || !doc.textPath) {
      throw new NotFoundException('text not ready');
    }

    const chunkArtifactPath = createPath(
      'documents',
      userId,
      collectionId,
      documentId,
      'ingestion',
      'chunks.json',
    );
    const [artifactBuffer, chunksMeta] = await Promise.all([
      this.storage.getBytes(chunkArtifactPath),
      this.chunkMetaRepository.findByDocumentId(documentId),
    ]);
    const artifact = deserializeChunkArtifact(
      artifactBuffer.toString('utf8'),
      doc.sourceType,
    );
    const metadataByIndex = new Map(
      chunksMeta.map((chunk) => [chunk.chunkIndex, chunk]),
    );

    return {
      document: {
        id: doc.id,
        name: doc.originalName,
        sourceType: doc.sourceType,
        pageCount: doc.pageCount,
      },
      sections: artifact.chunks.map((chunk, index) => {
        const metadata = metadataByIndex.get(index);
        return {
          id: metadata?.id ?? generateChunkId(documentId, index),
          index,
          page: metadata?.page ?? null,
          content: chunk.pageContent,
        };
      }),
    };
  }

  /** BigInt không serialize JSON được -> chuyển byteSize sang string. */
  private serialize<T extends { byteSize: bigint | null }>(doc: T) {
    return { ...doc, byteSize: doc.byteSize?.toString() ?? null };
  }
}
