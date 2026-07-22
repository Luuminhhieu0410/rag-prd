import type { ChatMessageDto } from './chat.types';

export type ChatStage = 'analyzing' | 'retrieving' | 'querying' | 'generating';
export type ChatEvent =
  | { event: 'accepted'; data: { userMessage: ChatMessageDto } }
  | { event: 'status'; data: { stage: ChatStage } }
  | { event: 'token'; data: { delta: string } }
  | { event: 'completed'; data: { message: ChatMessageDto } }
  | {
      event: 'error';
      data: { code: string; message: string; retryable: boolean };
    };
