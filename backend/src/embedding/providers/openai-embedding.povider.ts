import { APIPromise, OpenAI } from 'openai';
import { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OpenaiEmbeddingProvider {
  private readonly client: OpenAI;
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  async embeddingQuery(
    query: string,
  ): Promise<APIPromise<CreateEmbeddingResponse>> {
    return this.client.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: query,
      encoding_format: 'float',
    });
  }
  async embeddingDocument(
    texts: string[],
  ): Promise<APIPromise<CreateEmbeddingResponse>> {
    return this.client.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: texts,
      encoding_format: 'float',
    });
  }
}
