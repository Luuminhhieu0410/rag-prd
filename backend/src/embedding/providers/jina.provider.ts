import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

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
  // Select a downstream task to apply task-specific optimization via LoRA adapters. docs : https://jina.ai/
  private readonly DOWNSTREAM_TASK = {
    document: 'retrieval.passage',
    query: 'retrieval.query',
  };
  private async embedding(
    input: string | string[],
    task: string,
  ): Promise<RESPONSE_JINA> {
    // retry đang nuốt lỗi xử lý sau
    // const { data } = await retry<AxiosResponse<RESPONSE_JINA>>(() => {
    //   return this.httpService.axiosRef.post<RESPONSE_JINA>(
    //     'https://api.jina.ai/v1/embeddings',
    //     {
    //       embedding_type: 'float',
    //       task,
    //       input,
    //       model: this.MODEL_NAME,
    //       normalized: true,
    //       truncate: false,
    //     },
    //     {
    //       headers: {
    //         Authorization: `Bearer ${this.API_KEY}`,
    //       },
    //     },
    //   );
    // });
    const { data } = await this.httpService.axiosRef.post<RESPONSE_JINA>(
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

    return data;
  }

  async embeddingDocument(input: string | string[]) {
    return this.embedding(input, this.DOWNSTREAM_TASK.document);
  }

  async embeddingQuery(input: string | string[]) {
    return this.embedding(input, this.DOWNSTREAM_TASK.query);
  }

  async rerank(query: string, documents: string[], topN: number) {
    if (!documents.length) return [];
    const { data } = await this.httpService.axiosRef.post<{
      results: Array<{ index: number; relevance_score: number }>;
    }>(
      'https://api.jina.ai/v1/rerank',
      {
        model:
          this.configService.get<string>('JINA_RERANK_MODEL') ||
          'jina-reranker-v2-base-multilingual',
        query,
        documents,
        top_n: Math.min(topN, documents.length),
        return_documents: false,
      },
      { headers: { Authorization: `Bearer ${this.API_KEY}` } },
    );
    return data.results;
  }
}
