import { Injectable } from '@nestjs/common';
import { OpenaiEmbeddingProvider } from './providers/openai-embedding.povider';
import { JinaProvider } from './providers/jina.provider';
import { ProviderEmbeddings } from './langchain-embeddings.adapter';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class EmbeddingService {
  constructor(private readonly httpService: HttpService) {}
  getEmbeddingProvider() {
    switch (process.env.EMBEDDING_MODEL) {
      case 'openai':
        return new OpenaiEmbeddingProvider();
      case 'jina':
        return new JinaProvider(this.httpService);
      default:
        return new OpenaiEmbeddingProvider();
    }
  }

  getLangchainEmbeddings(): ProviderEmbeddings {
    return new ProviderEmbeddings(this.getEmbeddingProvider());
  }
}
