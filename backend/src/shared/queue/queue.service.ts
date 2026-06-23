import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class QueueService {
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly redis: RedisService) {}

  /** Lấy (hoặc tạo) queue theo tên, dùng chung connection Redis. */
  getQueue<T = unknown>(name: string): Queue<T> {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection: this.redis.getClient() });
      this.queues.set(name, queue);
    }
    return queue as Queue<T>;
  }
}
