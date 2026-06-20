import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { readFileSync } from 'fs';
import { EmbeddingService } from '../../embedding/embedding.service';
import { envConfig } from '../../shared/config/env.config';

@Injectable()
export class ElasticsearchService extends Client {
  private readonly logger = new Logger(ElasticsearchService.name);
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
        this.logger.log('Elasticsearch service info', JSON.stringify(info));
      })
      .catch((err) => {
        this.logger.error('Elasticsearch service error', JSON.stringify(err));
      });
  }
}
