import { Module } from '@nestjs/common';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';
import { UserModule } from './user/user.module';
import { CollectionModule } from './collection/collection.module';

@Module({
  controllers: [ApiController],
  providers: [ApiService],
  imports: [UserModule, CollectionModule],
})
export class ApiModule {}
