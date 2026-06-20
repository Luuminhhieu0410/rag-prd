import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostgresModule } from './databases/postgres/postgres.module';
import { ElasticsearchModule } from './databases/elasticsearch/elasticsearch.module';
import { ApiModule } from './api/api.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './api/auth/auth.module';
import { ApiKeysModule } from './api/api-keys/api-keys.module';
import { DocumentsModule } from './api/documents/documents.module';
import { RepositoryModule } from './repository/repository.module';

@Module({
  imports: [
    AuthModule,
    ApiKeysModule,
    DocumentsModule,
    PostgresModule,
    ElasticsearchModule,
    ApiModule,
    EmbeddingModule,
    SharedModule,
    RepositoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
