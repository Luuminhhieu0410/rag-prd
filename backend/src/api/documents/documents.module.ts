import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { IngestionService } from './ingestion.service';
import { AuthModule } from '../auth/auth.module';
import { EmbeddingModule } from '../../embedding/embedding.module';
import { ElasticsearchModule } from '../../databases/elasticsearch/elasticsearch.module';
import { QueueModule } from '../../shared/queue/queue.module';
import { WorkerModule } from '../../shared/worker/worker.module';

@Module({
  imports: [
    AuthModule, // PostgresService + FirebaseService + guards
    EmbeddingModule,
    ElasticsearchModule,
    QueueModule, // QueueService (enqueue jobs)
    WorkerModule, // WorkerService (chạy worker ingestion)
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, IngestionService],
})
export class DocumentsModule {}
