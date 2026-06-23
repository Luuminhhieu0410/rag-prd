import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
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
  getClient() {
    return this.client;
  }
}
