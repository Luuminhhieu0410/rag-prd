import { API_BASE_URL } from '@/const/api';
import { decodeChatEvent } from '@/helpers/chat/events';
import { auth } from '@/helpers/firebase';
import { createSseParser } from '@/helpers/sse/parser';
import type { ChatStreamEvent } from '@/types/chat';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useChatStream(
  collectionId: string,
  onEvent: (event: ChatStreamEvent) => void,
) {
  const callbackRef = useRef(onEvent);
  const controllerRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  const submit = useCallback(
    async (body: { content: string } | { userMessageId: string }) => {
      if (controllerRef.current) return;
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsStreaming(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch(
          `${API_BASE_URL}/api/collection/${collectionId}/chat/stream`,
          {
            method: 'POST',
            headers: {
              Accept: 'text/event-stream',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          },
        );
        if (!response.ok || !response.body) {
          throw new Error(`Chat request failed (${response.status})`);
        }
        const parser = createSseParser(({ event, data }) => {
          const decoded = decodeChatEvent(event, data);
          if (decoded) callbackRef.current(decoded);
        });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (!controller.signal.aborted) {
          const chunk = await reader.read();
          if (chunk.done) break;
          parser(decoder.decode(chunk.value, { stream: true }));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          callbackRef.current({
            event: 'error',
            data: {
              code: 'NETWORK_ERROR',
              message: error instanceof Error ? error.message : 'Network error',
              retryable: true,
            },
          });
        }
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
        setIsStreaming(false);
      }
    },
    [collectionId],
  );

  const abort = useCallback(() => controllerRef.current?.abort(), []);
  useEffect(() => abort, [abort]);
  return { submit, abort, isStreaming };
}

