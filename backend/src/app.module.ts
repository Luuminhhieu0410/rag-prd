import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostgresModule } from './databases/postgres/postgres.module';
import { ElasticsearchModule } from './databases/elasticsearch/elasticsearch.module';
import { ApiModule } from './api/api.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './api/auth/auth.module';

@Module({
  imports: [
    AuthModule,
    PostgresModule,
    ElasticsearchModule,
    ApiModule,
    EmbeddingModule,
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
