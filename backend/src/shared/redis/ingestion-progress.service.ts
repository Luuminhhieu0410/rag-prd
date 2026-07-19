import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { filter, Observable, Subject } from 'rxjs';
import IORedis from 'ioredis';
import {
  INGESTION_PROGRESS_PATTERN,
  ingestionProgressChannel,
} from '../../const/pubsub/process';
import { RedisService } from './redis.service';
import { IngestionProgressEvent } from './ingestion-progress.types';

@Injectable()
export class IngestionProgressService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionProgressService.name);
  private readonly events = new Subject<IngestionProgressEvent>();
  private subscriber: IORedis;

  constructor(private readonly redis: RedisService) {}

  async onModuleInit() {
    this.subscriber = this.redis.getClient().duplicate();
    this.subscriber.on('pmessage', (_pattern, _channel, raw) => {
      try {
        const event = JSON.parse(raw) as IngestionProgressEvent;
        if (this.isEvent(event)) this.events.next(event);
        else this.logger.warn('ignored invalid ingestion progress event');
      } catch (error) {
        this.logger.warn(
          `ignored malformed ingestion progress event: ${error}`,
        );
      }
    });
    await this.subscriber.psubscribe(INGESTION_PROGRESS_PATTERN);
  }

  async onModuleDestroy() {
    this.events.complete();
    if (this.subscriber) await this.subscriber.quit();
  }

  observe(collectionId: string): Observable<IngestionProgressEvent> {
    return this.events.pipe(
      filter((event) => event.collectionId === collectionId),
    );
  }

  async publish(event: IngestionProgressEvent): Promise<void> {
    try {
      await this.redis
        .getClient()
        .publish(
          ingestionProgressChannel(event.collectionId),
          JSON.stringify(event),
        );
    } catch (error) {
      this.logger.warn(`failed to publish ingestion progress: ${error}`);
    }
  }

  private isEvent(value: unknown): value is IngestionProgressEvent {
    if (!value || typeof value !== 'object') return false;
    const event = value as Partial<IngestionProgressEvent>;
    return (
      typeof event.jobId === 'string' &&
      typeof event.collectionId === 'string' &&
      typeof event.documentId === 'string' &&
      ['uploaded', 'processing', 'ready', 'failed'].includes(
        event.status ?? '',
      ) &&
      typeof event.processedChunks === 'number' &&
      (event.totalChunks === null || typeof event.totalChunks === 'number')
    );
  }
}
