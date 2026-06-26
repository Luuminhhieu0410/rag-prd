import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { AuthModule } from '../auth/auth.module';
import { EmbeddingModule } from '../../embedding/embedding.module';
import { ElasticsearchModule } from '../../databases/elasticsearch/elasticsearch.module';
import { WorkerModule } from '../../shared/worker/worker.module';
import { StorageModule } from '../../shared/storage/storage.module';
import { HttpModule } from '@nestjs/axios';
import { RepositoryModule } from '../../repository/repository.module';
import { EmbeddingModule as EmbeddingQueueModule } from '../../shared/queue/embedding/embedding.module';

@Module({
  imports: [
    AuthModule,
    EmbeddingModule,
    ElasticsearchModule,
    WorkerModule,
    StorageModule,
    HttpModule,
    RepositoryModule,
    EmbeddingQueueModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
