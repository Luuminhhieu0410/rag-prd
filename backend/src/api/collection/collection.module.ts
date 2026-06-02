import { Module } from '@nestjs/common';

import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { AuthModule } from '../auth/auth.module';
import { PostgresModule } from '../../databases/postgres/postgres.module';

@Module({
  controllers: [CollectionController],
  providers: [CollectionService],
  imports: [AuthModule],
})
export class CollectionModule {}
