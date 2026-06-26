import { DynamicModule, Module } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';

@Module({})
export class ElasticsearchModule {
  static forRoot({ isGlobal = false }: { isGlobal: boolean }): DynamicModule {
    return {
      global: isGlobal,
      module: ElasticsearchModule,
      exports: [ElasticsearchService],
      providers: [ElasticsearchService],
    };
  }
}
