import { Module } from '@nestjs/common';
import { CollectionRepository } from './collection.repository';
import { DocumentRepository } from './documents.repository';
import { PostgresModule } from '../databases/postgres/postgres.module';
import { ChunkMetaRepository } from './chunk-meta.repository';
import { IngestionProcessRepository } from './ingestion-process.repository';
import { ConversationRepository } from './conversation.repository';
import { MessageRepository } from './message.repository';
import { StructuredDataRepository } from './structured-data.repository';

@Module({
  imports: [PostgresModule],
  providers: [
    CollectionRepository,
    DocumentRepository,
    ChunkMetaRepository,
    IngestionProcessRepository,
    ConversationRepository,
    MessageRepository,
    StructuredDataRepository,
  ],
  exports: [
    CollectionRepository,
    DocumentRepository,
    ChunkMetaRepository,
    IngestionProcessRepository,
    ConversationRepository,
    MessageRepository,
    StructuredDataRepository,
  ],
})
export class RepositoryModule {}
