import type { ChatStreamEvent } from '@/types/chat';

const eventNames = new Set([
  'accepted',
  'status',
  'token',
  'completed',
  'error',
]);

export function decodeChatEvent(event: string, raw: string): ChatStreamEvent | null {
  if (!eventNames.has(event)) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object') return null;
    return { event, data } as ChatStreamEvent;
  } catch {
    return null;
  }
}

