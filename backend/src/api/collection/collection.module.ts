import { Module } from '@nestjs/common';

import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { AuthModule } from '../auth/auth.module';
import { RepositoryModule } from '../../repository/repository.module';

@Module({
  controllers: [CollectionController],
  providers: [CollectionService],
  imports: [AuthModule, RepositoryModule],
})
export class CollectionModule {}
