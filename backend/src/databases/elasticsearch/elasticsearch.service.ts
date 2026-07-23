import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { readFileSync } from 'node:fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;
  constructor(private readonly configService: ConfigService) {}
  onModuleInit() {
    const caPath = this.configService.get<string>('ELASTIC_CA_PATH')?.trim();
    const tls = caPath ? { ca: readFileSync(caPath) } : undefined;

    this.client = new Client({
      node:
        this.configService.get<string>('ELASTIC_HOST') ||
        'https://localhost:9200',
      auth: {
        username: this.configService.get<string>('ELASTIC_USER') || 'elastic',
        password: this.configService.get<string>('ELASTIC_PASSWORD') || '',
      },
      ...(tls ? { tls } : {}),
    });
    this.client
      .info()
      .then((info) => {
        this.logger.log('Elasticsearch service info', JSON.stringify(info));
      })
      .catch((err) => {
        this.logger.error('Elasticsearch service error', JSON.stringify(err));
      });
  }

  getClient() {
    return this.client;
  }
}
