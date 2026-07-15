import { Injectable } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { encode } from 'gpt-tokenizer';
import type { DocumentModel } from '../../../../generated/prisma/models/Document';
import { ChunkMetaRepository } from '../../../repository/chunk-meta.repository';
import { VectorStoreService } from '../../vectorstore/vectorstore.service';
import { chunkId } from './chunk-identity';

@Injectable()
export class IngestionBatchService {
  constructor(
    private readonly chunkMetaRepository: ChunkMetaRepository,
    private readonly vectorStore: VectorStoreService,
  ) {}

  async processBatch(
    doc: DocumentModel,
    chunks: Document[],
    chunkIndexOffset: number,
  ): Promise<void> {
    const ids = chunks.map((_, index) =>
      chunkId(doc.id, chunkIndexOffset + index),
    );
    const documents = chunks.map((chunk, index) =>
      this.chunkDocument(doc, chunk, ids[index], chunkIndexOffset + index),
    );
    const metadata = chunks.map((chunk, index) => ({
      id: ids[index],
      documentId: doc.id,
      chunkIndex: chunkIndexOffset + index,
      page: this.pageOf(chunk),
      tokenCount: encode(chunk.pageContent).length,
    }));
    const vectorStore = this.vectorStore.getElasticVectorSearch();

    const writes = await Promise.allSettled([
      Promise.resolve().then(() =>
        this.chunkMetaRepository.createManyIdempotent(metadata),
      ),
      Promise.resolve().then(() =>
        vectorStore.addDocuments(documents, { ids }),
      ),
    ]);
    const writeErrors = this.rejectionMessages(writes);
    if (writeErrors.length === 0) return;

    const cleanup = await Promise.allSettled([
      Promise.resolve().then(() =>
        this.chunkMetaRepository.deleteRange(
          doc.id,
          chunkIndexOffset,
          chunkIndexOffset + chunks.length,
        ),
      ),
      Promise.resolve().then(() => vectorStore.delete({ ids })),
    ]);
    const cleanupErrors = this.rejectionMessages(cleanup);
    throw new Error(
      [
        ...writeErrors,
        ...cleanupErrors.map((message) => `cleanup: ${message}`),
      ].join('; '),
    );
  }

  private chunkDocument(
    doc: DocumentModel,
    chunk: Document,
    id: string,
    chunkIndex: number,
  ): Document {
    return new Document({
      pageContent: chunk.pageContent,
      metadata: {
        ...chunk.metadata,
        user_id: doc.userId,
        collection_id: doc.collectionId,
        document_id: doc.id,
        chunk_id: id,
        chunk_index: chunkIndex,
        page: this.pageOf(chunk),
      },
    });
  }

  private pageOf(doc: Document): number | null {
    const loc = doc.metadata?.loc as { pageNumber?: number } | undefined;
    return (
      loc?.pageNumber ?? (doc.metadata?.page as number | undefined) ?? null
    );
  }

  private rejectionMessages(
    results: PromiseSettledResult<unknown>[],
  ): string[] {
    return results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      )
      .map(({ reason }) =>
        reason instanceof Error ? reason.message : String(reason),
      );
  }
}
