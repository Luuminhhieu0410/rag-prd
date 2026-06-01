import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  providers: [WorkerService],
  imports: [RedisModule],
  exports: [WorkerService],
})
export class WorkerModule {}
