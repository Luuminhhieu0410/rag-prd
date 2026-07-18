import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import {
  INGESTION_JOB_ATTEMPTS,
  INGESTION_JOB_BACKOFF_MS,
  ingestionJobId,
} from '../../../const/ingestion';
import { IngestionJobData } from './ingestion-job.types';

@Injectable()
export class IngestionProducer {
  constructor(@InjectQueue('ingestion') private readonly queue: Queue) {}

  async addIngestionJob(data: IngestionJobData): Promise<void> {
    const jobId = ingestionJobId(data.documentId);
    await this.queue.add('ingestion', data, {
      jobId,
      attempts: INGESTION_JOB_ATTEMPTS,
      backoff: { type: 'exponential', delay: INGESTION_JOB_BACKOFF_MS },
    });
  }
}
