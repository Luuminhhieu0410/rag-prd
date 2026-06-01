import { Injectable } from '@nestjs/common';
import IORedis from 'ioredis';
import { envConfig } from '../config/env.config';
@Injectable()
export class RedisService extends IORedis {
  constructor() {
    super({
      maxRetriesPerRequest: null,
      password: envConfig.REDIS_PASSWORD,
    });
    this.on('ready', () => console.log('Redis client is ready to use!'));
  }
}
