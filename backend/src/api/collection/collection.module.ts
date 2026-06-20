import { Module } from '@nestjs/common';

import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { AuthModule } from '../auth/auth.module';
import { CollectionRepository } from './collection.repository';

@Module({
  controllers: [CollectionController],
  providers: [CollectionService, CollectionRepository],
  imports: [AuthModule],
  exports: [CollectionRepository],
})
export class CollectionModule {}
