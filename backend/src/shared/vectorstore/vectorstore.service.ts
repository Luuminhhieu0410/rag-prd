import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ElasticVectorSearch,
  HybridRetrievalStrategy,
} from '@langchain/community/vectorstores/elasticsearch';
import { EmbeddingService } from '../../embedding/embedding.service';
import { ElasticsearchService } from '../../databases/elasticsearch/elasticsearch.service';

@Injectable()
export class VectorStoreService {
  constructor(
    private readonly client: ElasticsearchService,
    private readonly embeddings: EmbeddingService,
    private readonly configService: ConfigService,
  ) {}

  getElasticVectorSearch() {
    return new ElasticVectorSearch(this.embeddings, {
      client: this.client.getClient(),
      indexName: this.configService.get<string>('ES_CHUNK_INDEX') || 'chunks',
      vectorSearchOptions: { similarity: 'cosine' },
      strategy: new HybridRetrievalStrategy(),
    });
  }

  similaritySearchWithScore(query: string, k: number, filter: object) {
    return this.getElasticVectorSearch().similaritySearchWithScore(
      query,
      k,
      filter,
    );
  }
}
