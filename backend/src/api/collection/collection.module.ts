import { Module } from '@nestjs/common';

import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { AuthModule } from '../auth/auth.module';
import { RepositoryModule } from '../../repository/repository.module';
import { AsyncLocalStorageModule } from '../../async-local-storage/async-local-storage.module';

@Module({
  controllers: [CollectionController],
  providers: [CollectionService],
  imports: [AuthModule, RepositoryModule, AsyncLocalStorageModule],
})
export class CollectionModule {}
