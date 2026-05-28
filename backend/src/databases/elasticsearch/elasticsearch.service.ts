import { Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { readFileSync } from 'fs';
@Injectable()
export class ElasticsearchService extends Client {
  constructor() {
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
}
