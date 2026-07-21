import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import {
  INGESTION_JOB_ATTEMPTS,
  INGESTION_JOB_BACKOFF_MS,
} from '../../../const/ingestion';
import { IngestionJobData } from './ingestion-job.types';
import { INGESTION_QUEUE } from '../../../api/documents/documents.constants';

@Injectable()
export class IngestionProducer {
  constructor(@InjectQueue(INGESTION_QUEUE) private readonly queue: Queue) {}

  async addIngestionJob(data: IngestionJobData, jobId: string): Promise<void> {
    await this.queue.add(INGESTION_QUEUE, data, {
      jobId,
      attempts: INGESTION_JOB_ATTEMPTS,
      backoff: { type: 'exponential', delay: INGESTION_JOB_BACKOFF_MS },
    });
  }
}
