import {
  SSE_RETRY_INITIAL_MS,
  SSE_RETRY_MAX_MS,
} from '@/const/ingestion-progress';
import { auth } from '@/helpers/firebase';
import { createSseParser, type SseMessage } from '@/helpers/sse/parser';
import { useEffect, useRef } from 'react';

interface Options {
  url: string;
  enabled: boolean;
  onMessage: (message: SseMessage) => void;
}

export function useAuthenticatedSse({ url, enabled, onMessage }: Options) {
  const messageRef = useRef(onMessage);
  useEffect(() => {
    messageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const connect = async () => {
      try {
        const token = await auth.currentUser?.getIdToken(attempt > 0);
        const response = await fetch(url, {
          headers: {
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        if (!response.ok || !response.body)
          throw new Error(`SSE ${response.status}`);
        attempt = 0;
        const parser = createSseParser((message) =>
          messageRef.current(message),
        );
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (!controller.signal.aborted) {
          const chunk = await reader.read();
          if (chunk.done) throw new Error('SSE disconnected');
          parser(decoder.decode(chunk.value, { stream: true }));
        }
      } catch {
        if (controller.signal.aborted) return;
        const delay = Math.min(
          SSE_RETRY_INITIAL_MS * 2 ** attempt++,
          SSE_RETRY_MAX_MS,
        );
        retryTimer = setTimeout(connect, delay);
      }
    };
    void connect();
    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [enabled, url]);
}
