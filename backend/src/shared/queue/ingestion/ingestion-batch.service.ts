import { Injectable } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { encode } from 'gpt-tokenizer';
import type { DocumentModel } from '../../../../generated/prisma/models/Document';
import { ChunkMetaRepository } from '../../../repository/chunk-meta.repository';
import { VectorStoreService } from '../../vectorstore/vectorstore.service';
import { generateChunkId } from './chunk-identity';

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
      generateChunkId(doc.id, chunkIndexOffset + index),
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
    await vectorStore.addDocuments(documents, { ids });

    await this.chunkMetaRepository.createManyIdempotent(metadata);

    // for cleanup but don't use
    // await this.chunkMetaRepository.deleteRange(
    //   doc.id,
    //   chunkIndexOffset,
    //   chunkIndexOffset + chunks.length,
    // );
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
        original_name: doc.originalName,
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
