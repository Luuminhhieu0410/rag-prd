import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { readFileSync } from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;
  constructor(private readonly configService: ConfigService) {}
  onModuleInit() {
    this.client = new Client({
      node:
        this.configService.get<string>('ELASTIC_HOST') ||
        'https://localhost:9200',
      auth: {
        username: this.configService.get<string>('ELASTIC_USER') || 'elastic',
        password: this.configService.get<string>('ELASTIC_PASSWORD') || '',
      },
      tls: {
        ca: readFileSync('./ca.crt'),
      },
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
