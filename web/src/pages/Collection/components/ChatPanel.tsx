import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, EllipsisVertical, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ChatPanel() {
  const { t } = useTranslation();
  const suggestions = [
    t('collection.chat.promptSummary'),
    t('collection.chat.promptCompare'),
    t('collection.chat.promptStudy'),
  ];

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-card">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4 sm:px-5">
        <div>
          <h2 className="font-semibold">{t('collection.chat.title')}</h2>
        </div>
        <Button className="ml-auto" variant="ghost" size="sm">
          <EllipsisVertical />
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </div>
        <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-balance">
          {t('collection.chat.heading')}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground text-pretty">
          {t('collection.chat.description')}
        </p>
        <div className="mt-7 flex w-full max-w-2xl flex-wrap justify-center gap-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              className="h-auto max-w-full justify-start whitespace-normal py-2.5 text-left font-normal"
              disabled
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-3 pb-4 sm:px-5 sm:pb-5">
        <div className="relative w-full">
          <Textarea
            aria-label={t('collection.chat.composerLabel')}
            placeholder={t('collection.chat.placeholder')}
            className=" focus-visible:ring-0 max-h-40 min-h-20 resize-none overflow-y-auto bg-background py-6 pr-14 pl-3 text-base leading-6 [field-sizing:content] placeholder:text-base"
          />
          <Button
            size="icon-sm"
            className="absolute right-3 bottom-3 rounded-full"
            aria-label={t('collection.chat.send')}
          >
            <ArrowUp />
          </Button>
        </div>
      </div>
    </section>
  );
}
