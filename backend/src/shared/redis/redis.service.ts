import { Injectable, Logger } from '@nestjs/common';
import IORedis from 'ioredis';
import { envConfig } from '../config/env.config';

@Injectable()
export class RedisService extends IORedis {
  private readonly logger = new Logger(RedisService.name);
  constructor() {
    super({
      maxRetriesPerRequest: null,
      password: envConfig.REDIS_PASSWORD,
    });
    this.on('ready', () => this.logger.log('Redis client is ready to use!'));
  }
}
