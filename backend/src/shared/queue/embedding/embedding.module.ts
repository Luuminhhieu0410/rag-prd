import { Module } from '@nestjs/common';
import { EmbeddingWorker } from './embedding.worker';
import { EmbeddingProducer } from './embedding.producer';
import { AuthModule } from '../../../api/auth/auth.module';
import { WorkerModule } from '../../worker/worker.module';
import { StorageModule } from '../../storage/storage.module';
import { HttpModule } from '@nestjs/axios';
import { RepositoryModule } from '../../../repository/repository.module';
import { EmbeddingProcessor } from './embedding.processor';
import { BullModule } from '@nestjs/bullmq';
import { VectorStoreModule } from '../../vectorstore/vectorstore.module';

@Module({
  providers: [EmbeddingWorker, EmbeddingProducer, EmbeddingProcessor],
  imports: [
    AuthModule,
    WorkerModule,
    StorageModule,
    HttpModule,
    RepositoryModule,
    VectorStoreModule,
    BullModule.registerQueue({ name: 'embedding' }),
  ],
  exports: [EmbeddingProducer],
})
export class EmbeddingModule {}
