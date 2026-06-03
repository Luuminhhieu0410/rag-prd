import { Embeddings } from '@langchain/core/embeddings';
import type { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import { OpenaiEmbeddingProvider } from './providers/openai-embedding.povider';

/**
 * Bọc embedding provider sẵn có thành interface `Embeddings` của LangChain để
 * dùng được với ElasticVectorSearch. Nhờ vậy model/provider chỉ chọn ở một chỗ
 * (EmbeddingService) và embedding lúc ingest khớp với lúc query.
 */
export class ProviderEmbeddings extends Embeddings {
  constructor(private readonly provider: OpenaiEmbeddingProvider) {
    super({});
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = (await this.provider.embedDocuments(
      texts,
    )) as unknown as CreateEmbeddingResponse;
    return res.data.map((d) => d.embedding);
  }

  async embedQuery(text: string): Promise<number[]> {
    const res = (await this.provider.embeddingQuery(
      text,
    )) as unknown as CreateEmbeddingResponse;
    return res.data[0].embedding;
  }
}
