import { Module } from '@nestjs/common';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';
import { UserModule } from './user/user.module';
import { CollectionModule } from './collection/collection.module';
import { RouterModule } from '@nestjs/core';

@Module({
  controllers: [ApiController],
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
            path: 'users',
            module: UserModule,
          },
        ],
      },
    ]),
  ],
})
export class ApiModule {}
