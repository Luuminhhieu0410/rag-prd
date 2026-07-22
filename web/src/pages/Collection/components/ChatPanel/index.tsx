import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import useFetchApi from '@/hooks/api/useFetchApi';
import { useChatStream } from '@/hooks/chat/useChatStream';
import type { DocumentRecord } from '@/types/api';
import type {
  ChatHistoryPage,
  ChatMessage,
  ChatStage,
  ChatStreamEvent,
} from '@/types/chat';
import { EllipsisVertical, RefreshCw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatComposer } from './ChatComposer';
import { ChatMessage as Message } from './ChatMessage';

const EMPTY_HISTORY: ChatHistoryPage = {
  conversationId: null,
  messages: [],
  nextCursor: null,
};

export function ChatPanel({ collectionId }: { collectionId: string }) {
  const { t } = useTranslation();
  const historyUrl = `/api/collection/${collectionId}/chat`;
  const { data: history, loading } = useFetchApi<ChatHistoryPage>({
    url: historyUrl,
    defaultData: EMPTY_HISTORY,
  });
  const { data: documents } = useFetchApi<DocumentRecord[]>({
    url: `/api/collection/${collectionId}/documents`,
    defaultData: [],
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partial, setPartial] = useState('');
  const [stage, setStage] = useState<ChatStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryMessageId, setRetryMessageId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const onEvent = useCallback((event: ChatStreamEvent) => {
    if (event.event === 'accepted') {
      setMessages((current) =>
        current.some((item) => item.id === event.data.userMessage.id)
          ? current
          : [...current, event.data.userMessage],
      );
      setRetryMessageId(event.data.userMessage.id);
    } else if (event.event === 'status') {
      setStage(event.data.stage);
    } else if (event.event === 'token') {
      setStage(null);
      setPartial((current) => current + event.data.delta);
    } else if (event.event === 'completed') {
      setMessages((current) => [...current, event.data.message]);
      setPartial('');
      setStage(null);
      setError(null);
      setRetryMessageId(null);
    } else if (event.event === 'error') {
      setError(event.data.message);
      setStage(null);
    }
  }, []);
  const stream = useChatStream(collectionId, onEvent);
  const ready = documents.some((document) => document.status === 'ready');
  const suggestions = useMemo(
    () => [
      t('collection.chat.promptSummary'),
      t('collection.chat.promptCompare'),
      t('collection.chat.promptStudy'),
    ],
    [t],
  );
  const displayMessages = useMemo(() => {
    const byId = new Map(
      history.messages.map((message) => [message.id, message]),
    );
    for (const message of messages) byId.set(message.id, message);
    return [...byId.values()].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    );
  }, [history.messages, messages]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [displayMessages, partial, stage]);

  const send = (content: string) => {
    setError(null);
    setPartial('');
    setStage(null);
    void stream.submit({ content });
  };
  const hasMessages =
    displayMessages.length > 0 || partial || stream.isStreaming;

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-card">
      <div className="flex h-14 shrink-0 items-center border-b px-4 sm:px-5">
        <h2 className="font-semibold">{t('collection.chat.title')}</h2>
        <Button
          className="ml-auto"
          variant="ghost"
          size="sm"
          aria-label={t('collection.chat.options')}
        >
          <EllipsisVertical />
        </Button>
      </div>

      <div
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
      >
        {loading ? (
          <div className="mx-auto space-y-6">
            <Skeleton className="h-16 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
            <Skeleton className="h-24 w-4/5" />
          </div>
        ) : !hasMessages ? (
          <div className="flex min-h-full flex-col items-center justify-center py-8 text-center">
            <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-balance">
              {t('collection.chat.heading')}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground text-pretty">
              {t('collection.chat.description')}
            </p>
            <div className="mt-7 flex max-w-2xl flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  disabled={!ready}
                  className="h-auto whitespace-normal py-2.5 text-left font-normal"
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex flex-col gap-7">
            {displayMessages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            {partial && (
              <Message
                message={{
                  id: 'partial',
                  role: 'assistant',
                  content: partial,
                  citations: [],
                  structuredResultMeta: null,
                  createdAt: new Date().toISOString(),
                  incomplete: Boolean(error),
                }}
              />
            )}
            {stage && (
              <div
                className="flex items-center gap-2 text-sm text-muted-foreground"
                aria-live="polite"
              >
                <span className="size-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                {t(`collection.chat.stage.${stage}`)}
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <p>{error}</p>
                {retryMessageId && (
                  <Button
                    className="mt-2"
                    size="sm"
                    variant="outline"
                    disabled={stream.isStreaming}
                    onClick={() => {
                      setError(null);
                      setPartial('');
                      void stream.submit({ userMessageId: retryMessageId });
                    }}
                  >
                    <RefreshCw />
                    {t('collection.chat.retry')}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pb-4 sm:px-5 sm:pb-5">
        {!ready && (
          <p className="mb-2 text-center text-xs text-muted-foreground">
            {t('collection.chat.noReadySources')}
          </p>
        )}
        <ChatComposer disabled={!ready || stream.isStreaming} onSend={send} />
      </div>
    </section>
  );
}
