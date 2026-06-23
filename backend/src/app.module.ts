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
import { APP_GUARD } from '@nestjs/core';
import { FirebaseAuthGuard } from './api/auth/firebase-auth.guard';
import { ConfigModule } from '@nestjs/config';
import { join, resolve } from 'node:path';

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
    ConfigModule.forRoot({
      envFilePath: join(resolve(), 'backend', '.env'),
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: FirebaseAuthGuard }],
})
export class AppModule {}
