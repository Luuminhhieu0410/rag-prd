import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  providers: [EmbeddingService],
  exports: [EmbeddingService],
  imports: [HttpModule],
})
export class EmbeddingModule {}
