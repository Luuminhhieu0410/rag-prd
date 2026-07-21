import 'dotenv/config';
import { APIPromise, OpenAI } from 'openai';
import { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

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

  async structuredChat<T>(input: {
    messages: ChatCompletionMessageParam[];
    schemaName: string;
    schema: Record<string, unknown>;
  }): Promise<T> {
    const response = await this.client.chat.completions.create({
      model:
        this.configService.get<string>('OPENAI_ANALYSIS_MODEL') ||
        'gpt-4.1-mini',
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: input.schemaName,
          strict: true,
          schema: input.schema,
        },
      },
      messages: input.messages,
    });
    return JSON.parse(response.choices[0]?.message.content || '{}') as T;
  }

  streamChat(input: {
    messages: ChatCompletionMessageParam[];
    signal?: AbortSignal;
  }) {
    return this.client.chat.completions.create(
      {
        model:
          this.configService.get<string>('OPENAI_CHAT_MODEL') || 'gpt-4.1-mini',
        stream: true,
        temperature: 0.2,
        messages: input.messages,
      },
      { signal: input.signal },
    );
  }
}
