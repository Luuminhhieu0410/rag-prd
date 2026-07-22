import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import { TriangleAlert } from 'lucide-react';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CitationPreview } from './CitationPreview';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const parts = message.content.split(/(\[\d+])/g);
  const structuredResultMeta = message.structuredResultMeta;
  const showCoverageWarning =
    isAssistant &&
    structuredResultMeta !== null &&
    (!structuredResultMeta.exact || structuredResultMeta.truncated);

  return (
    <article className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
      <div className={`min-w-0 ${isUser ? 'max-w-[80%]' : 'max-w-3xl flex-1'}`}>
        <div
          className={
            isUser
              ? 'rounded-xl bg-primary px-4 py-2.5 text-sm leading-6 text-primary-foreground whitespace-pre-wrap'
              : 'text-sm leading-7 whitespace-pre-wrap text-foreground'
          }
        >
          {parts.map((part, index) => {
            const match = /^\[(\d+)]$/.exec(part);
            const number = match ? Number(match[1]) : 0;
            const citation = message.citations.find(
              (item) => item.number === number,
            );
            return citation ? (
              <Button
                key={`${part}-${index}`}
                variant="outline"
                size="xs"
                className="mx-0.5 inline-flex h-5 min-w-5 rounded-full px-1.5 align-baseline text-[11px]"
                aria-label={t('collection.chat.openCitation', { number })}
                aria-expanded={selected === number}
                onClick={() => setSelected(selected === number ? null : number)}
              >
                {number}
              </Button>
            ) : (
              <Fragment key={`${part}-${index}`}>{part}</Fragment>
            );
          })}
        </div>
        {selected !== null && (
          <CitationPreview
            citation={
              message.citations.find((item) => item.number === selected)!
            }
          />
        )}
        {message.incomplete && (
          <p className="mt-2 text-xs text-destructive">
            {t('collection.chat.incomplete')}
          </p>
        )}
        {showCoverageWarning && structuredResultMeta && (
          <Alert className="mt-3">
            <TriangleAlert />
            <AlertDescription>
              {!structuredResultMeta.exact && (
                <p>{t('collection.chat.incompleteCoverage')}</p>
              )}
              {structuredResultMeta.truncated && (
                <p>{t('collection.chat.truncatedResult')}</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </article>
  );
}
