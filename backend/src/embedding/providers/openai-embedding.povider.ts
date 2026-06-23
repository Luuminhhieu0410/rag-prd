import 'dotenv/config';
import { APIPromise, OpenAI } from 'openai';
import { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenaiEmbeddingProvider implements OnModuleInit {
  private client: OpenAI;
  constructor(private readonly configService: ConfigService) {}
  onModuleInit() {
    this.client = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }
  async embeddingQuery(
    query: string,
  ): Promise<APIPromise<CreateEmbeddingResponse>> {
    this.configService.get('');
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
