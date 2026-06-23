import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { QueueModule } from './queue/queue.module';
import { WorkerModule } from './worker/worker.module';
import { RedisModule } from './redis/redis.module';

@Module({
  providers: [SharedService],
  imports: [QueueModule, WorkerModule, RedisModule],
  exports: [QueueModule, WorkerModule, RedisModule],
})
export class SharedModule {}
