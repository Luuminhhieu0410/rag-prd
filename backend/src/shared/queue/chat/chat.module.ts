import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CHAT_QUEUE } from '../../../const/chat/chat';

@Module({
  providers: [],
  imports: [BullModule.registerQueue({ name: CHAT_QUEUE })],
})
export class ChatModule {}
