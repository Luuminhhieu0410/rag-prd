import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from 'react-i18next';
import useSourcesPanelContext from '@/context/SourcesPanelContext';

export function DeleteSourceDialog() {
  const { t } = useTranslation();
  const { deletion } = useSourcesPanelContext();
  return (
    <AlertDialog
      open={Boolean(deletion.document)}
      onOpenChange={(open) => !open && deletion.cancel()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('collection.sources.deleteTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('collection.sources.deleteDescription', {
              name: deletion.document?.originalName ?? '',
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t('collection.actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={deletion.confirm}
            disabled={deletion.isPending}
          >
            {deletion.isPending && <Spinner />}
            {t('collection.sources.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
