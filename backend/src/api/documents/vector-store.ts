import { Client } from '@elastic/elasticsearch';
import { EmbeddingsInterface } from '@langchain/core/embeddings';
import {
  ElasticVectorSearch,
  HybridRetrievalStrategy,
} from '@langchain/community/vectorstores/elasticsearch';
import { envConfig } from '../../shared/config/env.config';

/**
 * Vector store cho index `chunks`: hybrid search (BM25 + kNN, RRF), cosine.
 * Index tự tạo ở lần addVectors đầu, dims suy ra từ embedding (1536).
 */
export function createChunkVectorStore(
  client: Client,
  embeddings: EmbeddingsInterface,
): ElasticVectorSearch {
  return new ElasticVectorSearch(embeddings, {
    client,
    indexName: envConfig.ES_CHUNK_INDEX,
    vectorSearchOptions: { similarity: 'cosine' },
    strategy: new HybridRetrievalStrategy(),
  });
}
