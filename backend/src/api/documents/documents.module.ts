import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { IngestionService } from './ingestion.service';
import { AuthModule } from '../auth/auth.module';
import { EmbeddingModule } from '../../embedding/embedding.module';
import { ElasticsearchModule } from '../../databases/elasticsearch/elasticsearch.module';
import { QueueModule } from '../../shared/queue/queue.module';
import { WorkerModule } from '../../shared/worker/worker.module';
import { StorageModule } from '../../shared/storage/storage.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    AuthModule,
    EmbeddingModule,
    ElasticsearchModule,
    QueueModule,
    WorkerModule,
    StorageModule,
    HttpModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, IngestionService],
})
export class DocumentsModule {}
