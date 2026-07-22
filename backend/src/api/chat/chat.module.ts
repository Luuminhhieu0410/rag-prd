import { Module } from '@nestjs/common';
import { EmbeddingModule } from '../../embedding/embedding.module';
import { RepositoryModule } from '../../repository/repository.module';
import { VectorStoreModule } from '../../shared/vectorstore/vectorstore.module';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatRetrievalService } from './chat-retrieval.service';
import { ChatService } from './chat.service';
import { QueryPlanner } from './query-planner';
import { StructuredQueryService } from './structured-query.service';
import { StructuredQueryValidator } from './structured-query.validator';

@Module({
  imports: [AuthModule, RepositoryModule, EmbeddingModule, VectorStoreModule],
  controllers: [ChatController],
  providers: [
    QueryPlanner,
    ChatRetrievalService,
    StructuredQueryValidator,
    StructuredQueryService,
    ChatService,
  ],
})
export class ChatApiModule {}
