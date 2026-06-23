import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { readFileSync } from 'fs';
import { EmbeddingService } from '../../embedding/embedding.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchService extends Client {
  private readonly logger = new Logger(ElasticsearchService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly configService: ConfigService,
  ) {
    super({
      node:
        configService.get<string>('ELASTIC_HOST') || 'https://localhost:9200',
      auth: {
        username: configService.get<string>('ELASTIC_USER') || 'elastic',
        password: configService.get<string>('ELASTIC_PASSWORD') || '',
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
