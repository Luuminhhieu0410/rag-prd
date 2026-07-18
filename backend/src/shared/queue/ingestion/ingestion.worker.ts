import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IngestionProcessor } from './ingestion.processor';
import { IngestionJobData } from './ingestion-job.types';
import { INGESTION_QUEUE } from '../../../api/documents/documents.constants';

@Injectable()
@Processor(INGESTION_QUEUE)
export class IngestionWorker extends WorkerHost {
  constructor(private readonly ingestionProcessor: IngestionProcessor) {
    super();
  }
  async process(job: Job<IngestionJobData>): Promise<void> {
    await this.ingestionProcessor.handle(job);
  }
}
