import { Client } from '@elastic/elasticsearch';
import { EmbeddingsInterface } from '@langchain/core/embeddings';
import {
  ElasticVectorSearch,
  HybridRetrievalStrategy,
} from '@langchain/community/vectorstores/elasticsearch';
import { ConfigService } from '@nestjs/config';

/**
 * Vector store cho index `chunks`: hybrid search (BM25 + kNN, RRF), cosine.
 * Index tự tạo ở lần addVectors đầu, dims suy ra từ embedding (1536).
 */
export function createChunkVectorStore(
  client: Client,
  embeddings: EmbeddingsInterface,
  configService: ConfigService,
): ElasticVectorSearch {
  return new ElasticVectorSearch(embeddings, {
    client,
    indexName: configService.get<string>('ES_CHUNK_INDEX') || 'chunks',
    vectorSearchOptions: { similarity: 'cosine' },
    strategy: new HybridRetrievalStrategy(),
  });
}
