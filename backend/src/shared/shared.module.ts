import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { SharedController } from './shared.controller';
import { QueueModule } from './queue/queue.module';
import { WorkerModule } from './worker/worker.module';
import { RedisModule } from './redis/redis.module';

@Module({
  controllers: [SharedController],
  providers: [SharedService],
  imports: [QueueModule, WorkerModule, RedisModule],
})
export class SharedModule {}
