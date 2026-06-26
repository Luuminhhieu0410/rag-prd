import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmbeddingProcessor } from './embedding.processor';

@Injectable()
@Processor('embedding')
export class EmbeddingWorker extends WorkerHost {
  constructor(private readonly embeddingProcessor: EmbeddingProcessor) {
    super();
  }
  async process(
    job: Job<{ documentId: string; rawObjectPath: string }>,
  ): Promise<any> {
    await this.embeddingProcessor.handle(job);
  }
}
