import {Button} from '@/components/ui/button';
import SadAnimation from '@/pages/NotFound/components/SadAnimation';

export function NotFound() {
  return (
    <main className="flex min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-8">
        <h1 className="text-2xl font-semibold md:text-3xl">Not found</h1>

        <div className="flex flex-1 flex-col items-center justify-center py-10 md:py-16">
          <SadAnimation />

          <h2 className="mt-6 max-w-xl text-center text-xl font-semibold md:text-3xl">
            The page you're looking for couldn't be found
          </h2>

          <p className="mt-4 max-w-xl text-center text-sm leading-7 text-muted-foreground md:text-base">
            There is a technical problem that has prevented this page from
            loading. Try reloading this page or going to another page. If that
            does not work, please contact us for support.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button variant="outline" className="sm:min-w-36">
              Go to Home
            </Button>

            <Button className="sm:min-w-28">Back</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
