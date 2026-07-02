import { Module } from '@nestjs/common';
import { IngestionWorker } from './ingestion.worker';
import { IngestionProducer } from './ingestion.producer';
import { AuthModule } from '../../../api/auth/auth.module';
import { WorkerModule } from '../../worker/worker.module';
import { StorageModule } from '../../storage/storage.module';
import { HttpModule } from '@nestjs/axios';
import { RepositoryModule } from '../../../repository/repository.module';
import { IngestionProcessor } from './ingestion.processor';
import { BullModule } from '@nestjs/bullmq';
import { VectorStoreModule } from '../../vectorstore/vectorstore.module';
import { AsyncLocalStorageModule } from '../../../async-local-storage/async-local-storage.module';

@Module({
  providers: [IngestionWorker, IngestionProducer, IngestionProcessor],
  imports: [
    AuthModule,
    WorkerModule,
    StorageModule,
    HttpModule,
    RepositoryModule,
    VectorStoreModule,
    AsyncLocalStorageModule,
    BullModule.registerQueue({ name: 'ingestion' }),
  ],
  exports: [IngestionProducer],
})
export class IngestionModule {}
