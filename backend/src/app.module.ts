import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostgresModule } from './databases/postgres/postgres.module';
import { ElasticsearchModule } from './databases/elasticsearch/elasticsearch.module';
import { ApiModule } from './api/api.module';
import { EmbeddingModule } from './embedding/embedding.module';

@Module({
  imports: [PostgresModule, ElasticsearchModule, ApiModule, EmbeddingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
