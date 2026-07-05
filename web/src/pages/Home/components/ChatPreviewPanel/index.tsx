import { MessageSquare, Search, Send, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/Panel';
import { Textarea } from '@/components/ui/textarea';

export function ChatPreviewPanel({ readySources }: { readySources: number }) {
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
    <aside className="min-w-0 lg:sticky lg:top-[5.5rem] lg:self-start">
      <Panel>
        <div className="flex min-h-[calc(100dvh-7rem)] flex-col bg-white">
          <div className="border-b border-emerald-950/10 px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-white">
                <MessageSquare className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-zinc-950">
                  Chat with sources
                </h2>
                <p className="text-sm text-zinc-600">
                  {readySources > 0
                    ? `${readySources} ready source${readySources === 1 ? '' : 's'}`
                    : 'Waiting for ready sources'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 bg-emerald-50/40 p-4">
            <div className="rounded-xl border border-emerald-950/10 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-600">
                <Sparkles className="size-3.5" />
                Assistant
              </div>
              <p className="text-sm leading-6 text-zinc-700">
                Answers will be shown as readable cards with inline citations like{' '}
                <Badge className="border-emerald-950/10 bg-emerald-50 text-emerald-900">[1]</Badge>{' '}
                and{' '}
                <Badge className="border-emerald-950/10 bg-emerald-50 text-emerald-900">[2]</Badge>.
              </p>
            </div>
            <div className="ml-auto max-w-[82%] rounded-xl bg-emerald-950 px-4 py-3 text-sm leading-6 text-white">
              What are the key findings in this collection?
            </div>
            <div className="rounded-xl border border-emerald-950/10 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-600">
                <Search className="size-3.5" />
                Searching sources...
              </div>
              <div className="space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-emerald-100" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-emerald-100" />
              </div>
            </div>
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold text-zinc-950">Retrieved chunks</h3>
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="rounded-xl border border-emerald-950/10 bg-white p-3"
                >
                  <Badge className="mb-2 border-emerald-950/10 bg-emerald-50 text-emerald-900">
                    [{chunk.id}]
                  </Badge>
                  <p className="text-sm font-medium text-zinc-950">{chunk.title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">{chunk.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-emerald-950/10 bg-white p-4">
            <div className="flex items-end gap-3">
              <Textarea
                rows={2}
                placeholder={
                  readySources > 0
                    ? 'Query endpoint is not connected yet'
                    : 'Upload and index a source first'
                }
                disabled
                className="min-h-12"
              />
              <Button size="icon" disabled title="Send message">
                <Send />
              </Button>
            </div>
          </div>
        </div>
      </Panel>
    </aside>
  );
}
