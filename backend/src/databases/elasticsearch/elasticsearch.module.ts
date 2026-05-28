import { Module } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { EmbeddingModule } from '../../embedding/embedding.module';

@Module({
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
  imports: [EmbeddingModule],
})
export class ElasticsearchModule {}
