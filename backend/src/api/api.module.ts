import { Module } from '@nestjs/common';
import { ApiService } from './api.service';
import { UserModule } from './user/user.module';
import { CollectionModule } from './collection/collection.module';
import { RouterModule } from '@nestjs/core';
import { IngestionProcessesModule } from './ingestion-processes/ingestion-processes.module';

@Module({
  providers: [ApiService],
  imports: [
    UserModule,
    CollectionModule,
    RouterModule.register([
      {
        path: 'api',
        children: [
          {
            path: 'collection',
            module: CollectionModule,
          },
          {
            path: 'user',
            module: UserModule,
          },
        ],
      },
    ]),
    IngestionProcessesModule,
  ],
})
export class ApiModule {}
