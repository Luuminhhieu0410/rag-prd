import { Injectable } from '@nestjs/common';
import { OpenaiEmbeddingProvider } from './providers/openai-embedding.povider';
import { ProviderEmbeddings } from './langchain-embeddings.adapter';

@Injectable()
export class EmbeddingService {
  getEmbeddingProvider() {
    switch (process.env.EMBEDDING_MODEL) {
      case 'openai':
        return new OpenaiEmbeddingProvider();
      default:
        return new OpenaiEmbeddingProvider();
    }
  }

  getLangchainEmbeddings(): ProviderEmbeddings {
    return new ProviderEmbeddings(this.getEmbeddingProvider());
  }
}
