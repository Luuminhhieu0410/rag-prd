import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useEditApi from '@/hooks/api/useEditApi';
import useFetchApi from '@/hooks/api/useFetchApi';
import { AppShell } from '@/layouts/AppShell';
import { ChatPanel } from '@/pages/Collection/components/ChatPanel';
import { CollectionSkeleton } from '@/pages/Collection/components/CollectionSkeleton';
import { SourcesPanel } from '@/pages/Collection/components/SourcesPanel';
import type { Collection } from '@/types/api';
import { ArrowLeft, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

export default function CollectionPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const url = `/api/collection/${id}`;
  const {
    data: collection,
    loading,
    error,
  } = useFetchApi<Collection | undefined>({
    url,
    enabled: Boolean(id),
  });
  const titleMutation = useEditApi<Collection, { name: string }>({
    url,
    method: 'PATCH',
    successMsg: t('collection.titleSaved'),
    errorMsg: t('collection.titleError'),
  });

  async function saveTitle(input: HTMLInputElement) {
    const nextTitle = input.value.trim();
    if (
      !collection ||
      !nextTitle ||
      nextTitle === collection.name ||
      titleMutation.isPending
    ) {
      input.value = collection?.name ?? '';
      return;
    }
    input.value = nextTitle;
    try {
      await titleMutation.mutateAsync({
        data: { name: nextTitle },
        invalidateKey: [url, {}],
      });
    } catch {
      input.value = collection.name;
    }
  }

  if (loading) {
    return (
      <AppShell
        fluid
        headerContent={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" disabled>
              <ArrowLeft />
            </Button>
            <div className="h-7 w-52 animate-pulse rounded-md bg-muted" />
          </div>
        }
      >
        <CollectionSkeleton />
      </AppShell>
    );
  }

  if (error || !collection) {
    return (
      <AppShell
        fluid
        headerContent={
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link to="/" />}
              aria-label={t('collection.actions.back')}
            >
              <ArrowLeft />
            </Button>
            <span className="truncate font-semibold">
              {t('collection.notFound.title')}
            </span>
          </div>
        }
      >
        <div className="grid min-h-[calc(100dvh-9rem)] place-items-center px-4 text-center">
          <div>
            <div className="mx-auto grid size-11 place-items-center rounded-xl bg-muted">
              <SearchX className="size-5" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">
              {t('collection.notFound.title')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('collection.notFound.description')}
            </p>
            <Button className="mt-5" variant="outline" render={<Link to="/" />}>
              <ArrowLeft />
              {t('collection.actions.back')}
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      fluid
      headerContent={
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link to="/" />}
            aria-label={t('collection.actions.back')}
          >
            <ArrowLeft />
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <input
              defaultValue={collection.name}
              onBlur={(event) => saveTitle(event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') {
                  event.currentTarget.value = collection.name;
                  event.currentTarget.blur();
                }
              }}
              aria-label={t('collection.titleLabel')}
              className="min-w-20 max-w-[min(34rem,45vw)] [field-sizing:content] border-b border-transparent bg-transparent px-1 py-1 text-base font-semibold tracking-[-0.02em] outline-none hover:border-border focus:border-primary disabled:opacity-60 sm:text-lg"
              disabled={titleMutation.isPending}
            />
            {titleMutation.isPending && (
              <Spinner className="text-muted-foreground" />
            )}
          </div>
        </div>
      }
    >
      <Tabs
        defaultValue="chat"
        className="h-[calc(100dvh-5.5rem)] min-h-0 flex-col lg:hidden"
      >
        <TabsList variant="line" className="grid h-10 w-full grid-cols-2">
          <TabsTrigger
            value="sources"
            className="rounded-none after:hidden data-active:[&>span]:after:opacity-100 [&>span]:relative [&>span]:after:absolute [&>span]:after:inset-x-0 [&>span]:after:-bottom-2.5 [&>span]:after:h-0.5 [&>span]:after:bg-primary [&>span]:after:opacity-0"
          >
            <span>{t('collection.sources.title')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="rounded-none after:hidden data-active:[&>span]:after:opacity-100 [&>span]:relative [&>span]:after:absolute [&>span]:after:inset-x-0 [&>span]:after:-bottom-2.5 [&>span]:after:h-0.5 [&>span]:after:bg-primary [&>span]:after:opacity-0"
          >
            <span>{t('collection.chat.title')}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sources" className="min-h-0 overflow-hidden">
          <SourcesPanel
            collectionId={id}
            className="h-full rounded-none border-0"
          />
        </TabsContent>
        <TabsContent value="chat" className="min-h-0 overflow-hidden">
          <ChatPanel collectionId={id} />
        </TabsContent>
      </Tabs>

      <div className="hidden gap-3 lg:grid lg:h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:grid-cols-[380px_minmax(0,1fr)]">
        <SourcesPanel collectionId={id} className="flex" />
        <ChatPanel collectionId={id} />
      </div>
    </AppShell>
  );
}
