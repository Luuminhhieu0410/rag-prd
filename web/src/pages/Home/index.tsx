import { AppShell } from '@/layouts/AppShell';
import { Card, CardContent } from '@/components/ui/card.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import useEditApi from '@/hooks/api/useEditApi.ts';
import useFetchApi from '@/hooks/api/useFetchApi.ts';
import useDialogState from '@/hooks/useDialogState.ts';
import { CollectionList } from '@/pages/Home/components/CollectionList';
import { HomeSkeleton } from '@/pages/Home/components/Skeleton/HomeSkeleton.tsx';
import type { Collection } from '@/types/api.ts';
import { CirclePlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { delay } from '@/helpers/utils /delay.ts';

export default function HomePage() {
  const { t } = useTranslation();
  const { data: collections = [], fetching } = useFetchApi<Collection[]>({
    url: '/api/collection/',
    defaultData: [],
  });
  const navigate = useNavigate();
  const editDialog = useDialogState<Collection>();
  const deleteDialog = useDialogState<Collection>();
  const editing = editDialog.data;
  const deleting = deleteDialog.data;
  const [title, setTitle] = useState('');
  const createMutation = useEditApi<Collection, undefined>({
    url: '/api/collection/',
    useToast: false,
  });

  const editMutation = useEditApi<Collection, { name: string }>({
    url: `/api/collection/${editing?.id}`,
    method: 'PATCH',
  });
  const deleteMutation = useEditApi<unknown, undefined>({
    url: `/api/collection/${deleting?.id}`,
    method: 'DELETE',
  });

  async function createCollection() {
    navigate('/collection/creating');
    await delay(1000);
    try {
      const { data } = await createMutation.mutateAsync({ data: undefined });
      navigate(data ? `/collection/${data.id}` : '/', { replace: true });
    } catch {
      navigate('/', { replace: true });
    }
  }

  async function saveTitle() {
    if (!editing) return;
    editDialog.closeDialog();
    await editMutation.mutateAsync({
      data: { name: title },
      invalidateKey: ['/api/collection/'],
    });
  }

  async function deleteCollection() {
    if (!deleting) return;
    deleteDialog.closeDialog();
    await deleteMutation.mutateAsync({
      data: undefined,
      invalidateKey: ['/api/collection/'],
    });
  }

  return (
    <AppShell>
      <div>
        <div>
          {fetching && <HomeSkeleton count={collections.length || 4} />}
          {!fetching && (
            <div className={'grid gap-4 md:grid-cols-2 lg:grid-cols-4'}>
              <Card
                className="h-[222px] ring-0 flex cursor-pointer flex-col items-center justify-center gap-2 aria-busy:cursor-wait aria-busy:opacity-60"
                aria-busy={createMutation.isPending}
                onClick={() => !createMutation.isPending && createCollection()}
              >
                <CardContent className="p-0">
                  <CirclePlus />
                </CardContent>
                <CardContent className="p-0 text-xl">
                  {t('home.createNotebook')}
                </CardContent>
              </Card>
              <CollectionList
                collections={collections}
                onEdit={(item) => {
                  editDialog.openDialog(item);
                  setTitle(item.name);
                }}
                onDelete={deleteDialog.openDialog}
              />
            </div>
          )}
        </div>
      </div>
      <Dialog open={editDialog.open} onOpenChange={editDialog.onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('home.editTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveTitle();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={editDialog.closeDialog}>
              {t('home.cancel')}
            </Button>
            <Button
              onClick={saveTitle}
              disabled={!title.trim() || editMutation.isPending}
              aria-busy={editMutation.isPending}
            >
              {editMutation.isPending && <Spinner />}
              {t('home.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.onOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('home.deleteNotebookTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('home.deleteNotebookDescription', {
                name: deleting?.name ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('home.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={deleteCollection}
              disabled={deleteMutation.isPending}
              aria-busy={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Spinner />}
              {t('home.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
