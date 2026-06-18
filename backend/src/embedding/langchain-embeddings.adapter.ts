import { Embeddings } from '@langchain/core/embeddings';
import type { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import { JinaProvider } from './providers/jina.provider';
import { OpenaiEmbeddingProvider } from './providers/openai-embedding.povider';

export class ProviderEmbeddings extends Embeddings {
  constructor(
    private readonly provider: JinaProvider | OpenaiEmbeddingProvider,
  ) {
    super({});
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = (await this.provider.embeddingDocument(
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
