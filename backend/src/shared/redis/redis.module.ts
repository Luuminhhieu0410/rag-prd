import { DynamicModule, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { IngestionProgressService } from './ingestion-progress.service';

@Module({})
export class RedisModule {
  static forRoot({ isGlobal = true }: { isGlobal: boolean }): DynamicModule {
    return {
      module: RedisModule,
      global: isGlobal,
      providers: [RedisService, IngestionProgressService],
      exports: [RedisService, IngestionProgressService],
    };
  }
}
