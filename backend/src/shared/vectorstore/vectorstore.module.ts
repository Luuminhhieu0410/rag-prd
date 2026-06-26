import { Module } from '@nestjs/common';
import { VectorStoreService } from './vectorstore.service';
import { EmbeddingModule } from '../../embedding/embedding.module';
import { ElasticsearchModule } from '../../databases/elasticsearch/elasticsearch.module';

@Module({
  providers: [VectorStoreService],
  exports: [VectorStoreService],
  imports: [EmbeddingModule, ElasticsearchModule],
})
export class VectorStoreModule {}
