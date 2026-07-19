import { Injectable, MessageEvent } from '@nestjs/common';
import { IngestionProcessRepository } from '../../repository/ingestion-process.repository';
import { IngestionProgressService } from '../../shared/redis/ingestion-progress.service';
import { concat, defer, interval, map, merge, Observable } from 'rxjs';

@Injectable()
export class IngestionProcessesService {
  constructor(
    private readonly ingestionProcessRepository: IngestionProcessRepository,
    private readonly progress: IngestionProgressService,
  ) {}

  getAllJobByCollectionId(collectionId: string) {
    return this.ingestionProcessRepository.getAllJobByCollectionId(
      collectionId,
    );
  }

  stream(collectionId: string): Observable<MessageEvent> {
    const snapshot$ = defer(() =>
      this.ingestionProcessRepository.getActiveByCollectionId(collectionId),
    ).pipe(
      map((rows) => ({
        type: 'snapshot',
        data: rows.map(({ lastError, ...row }) => ({
          ...row,
          errorMessage: lastError,
        })),
      })),
    );
    const live$ = this.progress.observe(collectionId).pipe(
      map((event) => ({
        type:
          event.status === 'ready'
            ? 'completed'
            : event.status === 'failed'
              ? 'failed'
              : 'progress',
        data: event,
      })),
    );
    const heartbeat$ = interval(15_000).pipe(
      map(() => ({ type: 'heartbeat', data: { timestamp: Date.now() } })),
    );
    return merge(concat(snapshot$, live$), heartbeat$);
  }
}
