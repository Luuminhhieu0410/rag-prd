import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { IngestionProcessor } from './ingestion.processor';

@Injectable()
@Processor('ingestion')
export class IngestionWorker extends WorkerHost {
  constructor(private readonly ingestionProcessor: IngestionProcessor) {
    super();
  }
  async process(
    job: Job<{ documentId: string; rawObjectPath: string }>,
  ): Promise<any> {
    await this.ingestionProcessor.handle(job);
  }
}
