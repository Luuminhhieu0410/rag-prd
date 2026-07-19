import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: IORedis;
  private readonly logger = new Logger(RedisService.name);
  constructor(private readonly configService: ConfigService) {}
  onModuleInit() {
    this.client = new IORedis({
      maxRetriesPerRequest: null,
      password: this.configService.get('REDIS_PASSWORD'),
    });
    this.client.on('ready', () =>
      this.logger.log('Redis client is ready to use!'),
    );
  }
  async onModuleDestroy() {
    if (this.client) await this.client.quit();
  }
  getClient() {
    return this.client;
  }
}
