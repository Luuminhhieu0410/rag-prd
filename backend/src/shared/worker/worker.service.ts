import { Injectable } from '@nestjs/common';
import { Processor, Worker } from 'bullmq';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class WorkerService {
  private worker: Worker;

  constructor(private readonly redisService: RedisService) {}

  createWorker(queueName: string, processor: Processor) {
    this.worker = new Worker(queueName, processor, {
      connection: this.redisService.getClient(),
    });
  }
}
