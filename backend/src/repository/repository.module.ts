import { Module } from '@nestjs/common';
import { CollectionRepository } from './collection.repository';
import { DocumentRepository } from './documents.repository';
import { PostgresModule } from '../databases/postgres/postgres.module';
import { ChunkMetaRepository } from './chunk-meta.repository';

@Module({
  imports: [PostgresModule],
  providers: [CollectionRepository, DocumentRepository, ChunkMetaRepository],
  exports: [CollectionRepository, DocumentRepository, ChunkMetaRepository],
})
export class RepositoryModule {}
