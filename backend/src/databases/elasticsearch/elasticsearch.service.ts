import { Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { readFileSync } from 'fs';
import { EmbeddingService } from '../../embedding/embedding.service';

@Injectable()
export class ElasticsearchService extends Client {
  constructor(private readonly embeddingService: EmbeddingService) {
    super({
      node: process.env.ELASTIC_HOST || 'https://localhost:9200',
      auth: {
        username: process.env.ELASTIC_USER || '',
        password: process.env.ELASTIC_PASSWORD || '',
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
