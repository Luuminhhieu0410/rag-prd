import { Injectable } from '@nestjs/common';
import { Worker } from 'bullmq';
import { RedisService } from '../redis/redis.service';
import IORedis from 'ioredis';

const connection = new IORedis({
  maxRetriesPerRequest: null,
  password: 'hehehehe',
});
@Injectable()
export class WorkerService extends Worker {
  constructor(queueName: string, job: (data: any) => Promise<void>) {
    super(queueName, job, { connection: connection });
  }
}
