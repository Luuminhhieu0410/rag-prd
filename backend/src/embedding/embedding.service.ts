import { Injectable } from '@nestjs/common';
import { OpenaiEmbeddingProvider } from './providers/openai-embedding.povider';
import { JinaProvider } from './providers/jina.provider';
import { envConfig } from '../shared/config/env.config';
import { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import { Embeddings } from '@langchain/core/embeddings';

@Injectable()
export class EmbeddingService extends Embeddings {
  constructor(
    private readonly jinaProvider: JinaProvider,
    private readonly openaiEmbeddingProvider: OpenaiEmbeddingProvider,
  ) {
    super({});
  }
  getEmbeddingProvider() {
    switch (envConfig.EMBEDDING_MODEL) {
      case 'openai':
        return this.openaiEmbeddingProvider;
      case 'jina':
        return this.jinaProvider;
      default:
        return this.jinaProvider;
    }
  }
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = (await this.getEmbeddingProvider().embeddingDocument(
      texts,
    )) as unknown as CreateEmbeddingResponse;
    return res.data.map((d) => d.embedding);
  }

  async embedQuery(text: string): Promise<number[]> {
    const res = (await this.getEmbeddingProvider().embeddingQuery(
      text,
    )) as unknown as CreateEmbeddingResponse;
    return res.data[0].embedding;
  }
}
