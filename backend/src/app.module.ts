import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostgresModule } from './databases/postgres/postgres.module';
import { ElasticsearchModule } from './databases/elasticsearch/elasticsearch.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { AuthModule } from './api/auth/auth.module';
import { ApiKeysModule } from './api/api-keys/api-keys.module';
import { DocumentsModule } from './api/documents/documents.module';
import { UserModule } from './api/user/user.module';
import { CollectionModule } from './api/collection/collection.module';
import { IngestionProcessesModule } from './api/ingestion-processes/ingestion-processes.module';
import { RepositoryModule } from './repository/repository.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { FirebaseAuthGuard } from './api/auth/firebase-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join, resolve } from 'node:path';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from './shared/redis/redis.module';
import { VectorStoreModule } from './shared/vectorstore/vectorstore.module';
import { AsyncLocalStorageModule } from './async-local-storage/async-local-storage.module';
import { NextFunction } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { ApiResponseInterceptor } from './shared/http/api-response.interceptor';
import { ApiExceptionFilter } from './shared/http/api-exception.filter';
import { ChatApiModule } from './api/chat/chat.module';

@Module({
  imports: [
    AuthModule,
    ApiKeysModule,
    DocumentsModule,
    UserModule,
    CollectionModule,
    IngestionProcessesModule,
    ChatApiModule,
    PostgresModule,
    EmbeddingModule,
    RepositoryModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get<string>('REDIS_HOST') ?? '127.0.0.1',
          port: cfg.get<number>('REDIS_PORT') ?? 6379,
          password: cfg.get<string>('REDIS_PASSWORD') ?? undefined,
        },
        // tuỳ chỉnh chung cho tất cả queue (có thể ghi đè ở mức queue)
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),
    ElasticsearchModule.forRoot({ isGlobal: true }),
    RedisModule.forRoot({ isGlobal: true }),
    ConfigModule.forRoot({
      envFilePath: join(resolve(), 'backend', '.env'),
      isGlobal: true,
    }),
    VectorStoreModule,
    AsyncLocalStorageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly als: AsyncLocalStorage<any>) {}
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: Request, res: Response, next: NextFunction) => {
        const store = { user: null };
        this.als.run(store, () => next());
      })
      .forRoutes('*');
  }
}
