import { Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { readFileSync } from 'fs';
import { EmbeddingService } from '../../embedding/embedding.service';
import { envConfig } from '../../shared/config/env.config';

@Injectable()
export class ElasticsearchService extends Client {
  constructor(private readonly embeddingService: EmbeddingService) {
    super({
      node: envConfig.ELASTIC_HOST,
      auth: {
        username: envConfig.ELASTIC_USER,
        password: envConfig.ELASTIC_PASSWORD || '',
      },
      tls: {
        ca: readFileSync('./ca.crt'),
      },
    });
    this.info()
      .then((info) => {
        console.log('Elasticsearch service info', info);
      })
      .catch((err) => {
        console.log('Elasticsearch service error', err);
      });
  }
  insertData(text: string | string[]) {
    const provider = this.embeddingService.getEmbeddingProvider();
  }
}
