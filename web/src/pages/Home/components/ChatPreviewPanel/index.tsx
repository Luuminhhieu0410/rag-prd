import { MessageSquare, Search, Send, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export function ChatPreviewPanel() {
  const chunks = [
    {
      id: 1,
      title: 'Onboarding guide',
      text: 'Chunk preview from a ready source will appear here with document title and relevance context.',
    },
    {
      id: 2,
      title: 'Product notes',
      text: 'Retrieved passages are grouped in the citation panel so answers stay traceable.',
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="grid min-h-[34rem] lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-h-[34rem] flex-col bg-zinc-50/60">
          <div className="border-b border-zinc-100 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-zinc-950 text-white">
                <MessageSquare className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-zinc-950">
                  Chat with sources
                </h2>
                <p className="text-sm text-zinc-500">
                  Ask questions after documents finish indexing.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 p-5">
            <div className="max-w-[80%] rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/[0.03]">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500">
                <Sparkles className="size-3.5" />
                Assistant
              </div>
              <p className="text-sm leading-6 text-zinc-700">
                Answers will be shown as readable cards with inline citations like{' '}
                <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700">[1]</Badge>{' '}
                and{' '}
                <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700">[2]</Badge>.
              </p>
            </div>
            <div className="ml-auto max-w-[75%] rounded-2xl bg-zinc-950 px-4 py-3 text-sm leading-6 text-white shadow-sm shadow-zinc-950/15">
              What are the key findings in this collection?
            </div>
            <div className="max-w-[80%] rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/[0.03]">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500">
                <Search className="size-3.5" />
                Searching sources...
              </div>
              <div className="space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-zinc-100" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-zinc-100" />
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-zinc-100 bg-white p-4">
            <div className="flex items-end gap-3">
              <Textarea
                rows={2}
                placeholder="Ask a question about selected sources"
                disabled
                className="min-h-12"
              />
              <Button size="icon" disabled title="Send message">
                <Send />
              </Button>
            </div>
          </div>
        </div>

        <aside className="border-t border-zinc-100 bg-white p-4 lg:border-l lg:border-t-0">
          <h3 className="text-sm font-semibold text-zinc-950">Retrieved chunks</h3>
          <div className="mt-4 grid gap-3">
            {chunks.map((chunk) => (
              <div
                key={chunk.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
              >
                <Badge className="mb-2 border-zinc-200 bg-white text-zinc-700">
                  [{chunk.id}]
                </Badge>
                <p className="text-sm font-medium text-zinc-950">{chunk.title}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{chunk.text}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </Card>
  );
}
