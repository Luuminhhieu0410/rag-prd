import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { CHAT_QUEUE } from '../../../const/chat/chat';
import { Queue } from 'bullmq';

@Injectable()
export class ChatProducer {
  constructor(@InjectQueue(CHAT_QUEUE) private readonly queue: Queue) {}
  addChatJob(data: any) {
    return this.queue.add(CHAT_QUEUE, data, {});
  }
}
