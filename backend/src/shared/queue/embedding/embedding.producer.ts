import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingProducer {
  constructor(@InjectQueue('embedding') private queue: Queue) {}
  async addBulkJob<T>(jobName: string, listData: Array<T>) {
    await this.queue.addBulk(
      listData.map((data) => ({
        name: jobName,
        data,
      })),
    );
  }
  async addJob(jobName: string, data = {}) {
    await this.queue.add(jobName, data);
  }
}
