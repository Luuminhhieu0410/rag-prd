import { Module } from '@nestjs/common';
import { CollectionRepository } from './collection.repository';
import { DocumentRepository } from './documents.repository';
import { PostgresModule } from '../databases/postgres/postgres.module';

@Module({
  imports: [PostgresModule],
  providers: [CollectionRepository, DocumentRepository],
  exports: [CollectionRepository, DocumentRepository],
})
export class RepositoryModule {}
