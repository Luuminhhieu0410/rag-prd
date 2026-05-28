import OpenAI, { APIPromise } from 'openai';
import { CreateEmbeddingResponse } from 'openai/resources/embeddings';

export class OpenaiEmbeddingProvider extends OpenAI {
  constructor() {
    super({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  async embeddingQuery(
    query: string,
  ): Promise<APIPromise<CreateEmbeddingResponse>> {
    return this.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: query,
      encoding_format: 'float',
    });
  }
  async embedDocuments(
    texts: string[],
  ): Promise<APIPromise<CreateEmbeddingResponse>> {
    return this.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: texts,
      encoding_format: 'float',
    });
  }
}
