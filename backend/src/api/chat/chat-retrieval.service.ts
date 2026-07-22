import { Injectable, Logger } from '@nestjs/common';
import { JinaProvider } from '../../embedding/providers/jina.provider';
import { VectorStoreService } from '../../shared/vectorstore/vectorstore.service';
import type { RetrievedChunk, RetrievalSpec } from './chat.types';

@Injectable()
export class ChatRetrievalService {
  private readonly logger = new Logger(ChatRetrievalService.name);

  constructor(
    private readonly vectorStore: VectorStoreService,
    private readonly jina: JinaProvider,
  ) {}

  async retrieve(
    retrieval: RetrievalSpec,
    standaloneQuestion: string,
    collectionId: string,
  ): Promise<RetrievedChunk[]> {
    const perQuery = retrieval.complexity === 'simple' ? 30 : 15;
    const filter = [
      {
        field: 'collection_id.keyword',
        operator: 'term',
        value: collectionId,
      },
    ];
    const resultSets = await Promise.all(
      retrieval.searchQueries.map((query) =>
        this.vectorStore.similaritySearchWithScore(query, perQuery, filter),
      ),
    );
    const unique = new Map<string, RetrievedChunk>();
    for (const [document, score] of resultSets.flat()) {
      const metadata = document.metadata ?? {};
      const chunkId = String(metadata.chunk_id ?? '');
      const documentId = String(metadata.document_id ?? '');
      if (!chunkId || !documentId || unique.has(chunkId)) continue;
      unique.set(chunkId, {
        pageContent: document.pageContent,
        chunkId,
        documentId,
        documentName: String(
          metadata.original_name ?? metadata.document_name ?? 'Source',
        ),
        page: typeof metadata.page === 'number' ? metadata.page : null,
        score: Number(score) || 0,
      });
    }
    const candidates = [...unique.values()];
    if (!candidates.length) return [];
    try {
      const ranking = await this.jina.rerank(
        standaloneQuestion,
        candidates.map((candidate) => candidate.pageContent),
        8,
      );
      return ranking
        .map((rank) => {
          const candidate = candidates[rank.index];
          return candidate
            ? { ...candidate, score: rank.relevance_score }
            : undefined;
        })
        .filter((chunk): chunk is RetrievedChunk => Boolean(chunk));
    } catch (error) {
      this.logger.warn(`Jina rerank failed; using retrieval order: ${error}`);
      return candidates.slice(0, 8);
    }
  }
}
