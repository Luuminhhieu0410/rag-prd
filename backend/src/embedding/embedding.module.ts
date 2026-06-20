import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { HttpModule } from '@nestjs/axios';
import { JinaProvider } from './providers/jina.provider';
import { OpenaiEmbeddingProvider } from './providers/openai-embedding.povider';

@Module({
  providers: [EmbeddingService, JinaProvider, OpenaiEmbeddingProvider],
  exports: [EmbeddingService],
  imports: [HttpModule],
})
export class EmbeddingModule {}
