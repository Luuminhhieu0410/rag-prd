import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function ChatComposer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (content: string) => void;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const send = () => {
    const value = content.trim();
    if (!value || disabled) return;
    setContent('');
    onSend(value);
  };
  return (
    <div className="relative w-full max-w-full">
      <Textarea
        value={content}
        disabled={disabled}
        maxLength={8000}
        aria-label={t('collection.chat.composerLabel')}
        placeholder={t('collection.chat.placeholder')}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
        className="max-h-40  resize-none overflow-y-auto bg-background py-5 pr-14 pl-4 text-base leading-6 [field-sizing:content] focus:border-[var(--nlm-stroke-focus)] focus:ring-0 focus:outline-none focus-visible:border-[var(--nlm-stroke-focus)] focus-visible:ring-0 focus-visible:outline-none"
      />
      <Button
        size="icon-sm"
        className="absolute right-3 bottom-3 rounded-full"
        aria-label={t('collection.chat.send')}
        disabled={disabled || !content.trim()}
        onClick={send}
      >
        <ArrowUp />
      </Button>
    </div>
  );
}
