import { Button } from '@/components/ui/button';
import { ROUTES } from '@/const/app';
import SadAnimation from '@/pages/NotFound/components/SadAnimation';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-8">
        <h1 className="text-2xl font-semibold md:text-3xl">Not Found</h1>

        <div className="flex flex-1 flex-col items-center justify-center py-10 md:py-16">
          <SadAnimation />

          <h2 className="mt-6 max-w-xl text-center text-xl font-semibold md:text-3xl">
            {t('notFound.heading')}
          </h2>
          <p className="mt-4 max-w-xl text-center text-sm leading-7 text-muted-foreground md:text-base">
            {t('notFound.description')}
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              className="sm:min-w-36"
              onClick={() => navigate(ROUTES.home)}
            >
              {t('notFound.home')}
            </Button>

            <Button className="sm:min-w-28" onClick={() => navigate(-1)}>
              {t('notFound.back')}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
