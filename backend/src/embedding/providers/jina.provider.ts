import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { retry } from '../../helpers/http/httpRetry';
import { AxiosResponse } from 'axios';

type EMBED_DATA = {
  object: string;
  index: number;
  embedding: Array<number>;
};

type RESPONSE_JINA = {
  model: string;
  object: string;
  usage: {
    total_tokens: number;
  };
  data: Array<EMBED_DATA>;
};

@Injectable()
export class JinaProvider {
  private readonly API_KEY: string;
  private readonly MODEL_NAME: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.API_KEY = this.configService.get<string>('JINA_APIKEY') || '';
    this.MODEL_NAME = this.configService.get<string>('JINA_MODEL') || '';
  }
  // Select a downstream task to apply task-specific optimization via LoRA adapters. https://jina.ai/
  private readonly DOWNSTREAM_TASK = {
    document: 'retrieval.passage',
    query: 'retrieval.query',
  };
  private async embedding(
    input: string | string[],
    task: string,
  ): Promise<RESPONSE_JINA> {
    const { data } = await retry<AxiosResponse<RESPONSE_JINA>>(() => {
      return this.httpService.axiosRef.post<RESPONSE_JINA>(
        'https://api.jina.ai/v1/embeddings',
        {
          embedding_type: 'float',
          task,
          input,
          model: this.MODEL_NAME,
          normalized: true,
          truncate: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.API_KEY}`,
          },
        },
      );
    });

    return data;
  }

  async embeddingDocument(input: string | string[]) {
    return this.embedding(input, this.DOWNSTREAM_TASK.document);
  }

  async embeddingQuery(input: string | string[]) {
    return this.embedding(input, this.DOWNSTREAM_TASK.query);
  }
}
