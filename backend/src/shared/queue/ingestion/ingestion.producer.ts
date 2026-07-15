import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import {
  INGESTION_JOB_ATTEMPTS,
  INGESTION_JOB_BACKOFF_MS,
  ingestionJobId,
} from '../../../const/ingestion';
import { IngestionProcessRepository } from '../../../repository/ingestion-process.repository';
import { IngestionFileMetadata, IngestionJobData } from './ingestion-job.types';

@Injectable()
export class IngestionProducer {
  constructor(
    @InjectQueue('ingestion') private readonly queue: Queue,
    private readonly processRepository: IngestionProcessRepository,
  ) {}

  async addIngestionJob(
    data: IngestionJobData,
    fileMetadata: IngestionFileMetadata,
  ): Promise<void> {
    const jobId = ingestionJobId(data.documentId);
    await this.processRepository.createUploaded({
      jobId,
      documentId: data.documentId,
      fileMetadata,
    });
    await this.queue.add('ingestion', data, {
      jobId,
      attempts: INGESTION_JOB_ATTEMPTS,
      backoff: { type: 'exponential', delay: INGESTION_JOB_BACKOFF_MS },
    });
  }
}
