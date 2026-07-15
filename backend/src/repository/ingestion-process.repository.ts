import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PostgresService } from '../databases/postgres/postgres.service';
import { IngestionFileMetadata } from '../shared/queue/ingestion/ingestion-job.types';

@Injectable()
export class IngestionProcessRepository {
  constructor(private readonly prisma: PostgresService) {}

  findByJobId(jobId: string) {
    return this.prisma.getClient().ingestionProcess.findUnique({
      where: { jobId },
    });
  }

  createUploaded(input: {
    jobId: string;
    documentId: string;
    fileMetadata: IngestionFileMetadata;
  }) {
    return this.prisma.getClient().ingestionProcess.upsert({
      where: { jobId: input.jobId },
      update: {},
      create: {
        ...input,
        fileMetadata: input.fileMetadata as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async beginAttempt(jobId: string) {
    const client = this.prisma.getClient();
    const startedAt = new Date();

    return client.$transaction(async (transaction) => {
      await transaction.ingestionProcess.updateMany({
        where: { jobId, startedAt: null },
        data: { startedAt },
      });

      return transaction.ingestionProcess.update({
        where: { jobId },
        data: {
          status: 'processing',
          attemptCount: { increment: 1 },
          lastError: null,
        },
      });
    });
  }

  setTotalChunks(jobId: string, totalChunks: number) {
    return this.prisma.getClient().ingestionProcess.update({
      where: { jobId },
      data: { totalChunks },
    });
  }

  advanceCheckpoint(jobId: string, processedChunks: number) {
    return this.prisma.getClient().ingestionProcess.update({
      where: { jobId },
      data: { processedChunks },
    });
  }

  recordRetryableError(jobId: string, lastError: string) {
    return this.prisma.getClient().ingestionProcess.update({
      where: { jobId },
      data: { status: 'processing', lastError },
    });
  }

  markReady(input: {
    jobId: string;
    documentId: string;
    totalChunks: number;
    document: { textPath: string; pageCount: number | null };
  }) {
    const completedAt = new Date();
    return this.prisma.getClient().$transaction((transaction) =>
      Promise.all([
        transaction.ingestionProcess.update({
          where: { jobId: input.jobId },
          data: {
            status: 'ready',
            totalChunks: input.totalChunks,
            processedChunks: input.totalChunks,
            lastError: null,
            completedAt,
          },
        }),
        transaction.document.update({
          where: { id: input.documentId },
          data: {
            status: 'ready',
            textPath: input.document.textPath,
            pageCount: input.document.pageCount,
            chunkCount: input.totalChunks,
            errorMessage: null,
          },
        }),
      ]),
    );
  }

  markFailed(input: { jobId: string; documentId: string; message: string }) {
    const completedAt = new Date();
    return this.prisma.getClient().$transaction((transaction) =>
      Promise.all([
        transaction.ingestionProcess.update({
          where: { jobId: input.jobId },
          data: {
            status: 'failed',
            lastError: input.message,
            completedAt,
          },
        }),
        transaction.document.update({
          where: { id: input.documentId },
          data: { status: 'failed', errorMessage: input.message },
        }),
      ]),
    );
  }
}
