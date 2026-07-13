import { Languages, LogOut, Search, Settings, SunMoon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ReactNode } from 'react';
import { signOutUser } from '@/helpers';
import { type Language, languages } from '@/helpers/i18n';
import { useAuthStore } from '@/stores/authStore.ts';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function AppShell({
  children,
  headerContent,
  fluid = false,
}: {
  children: ReactNode;
  headerContent?: ReactNode;
  fluid?: boolean;
}) {
  const me = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { theme, setTheme } = useTheme();
  const { i18n, t } = useTranslation();

  const onSignOut = () => {
    signOutUser().catch((err) => console.error('Error signing out', err));
    setUser(null);
  };
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-20  bg-background/90 backdrop-blur-xl">
        <div
          className={cn(
            'mx-auto flex h-16 items-center justify-between px-4',
            fluid ? 'max-w-none sm:px-4' : 'max-w-[1480px] sm:px-6',
          )}
        >
          {headerContent ?? (
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Search className="size-4" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold">
                  {t('layout.header.appTitle')}
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  {me?.email ?? t('layout.header.signedIn')}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={t('layout.header.settings')}
                  />
                }
              >
                <Settings />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Languages className="size-3.5" />
                    {t('layout.header.language')}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={i18n.language}
                      onValueChange={(value) =>
                        i18n.changeLanguage(value as Language)
                      }
                    >
                      {languages.map((item) => (
                        <DropdownMenuRadioItem
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <SunMoon className="size-3.5" />
                    {t('layout.header.theme')}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={theme ?? 'system'}
                      onValueChange={setTheme}
                    >
                      <DropdownMenuRadioItem value="light">
                        {t('layout.header.light')}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark">
                        {t('layout.header.dark')}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system">
                        {t('layout.header.system')}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={onSignOut}
              aria-label={t('layout.header.signOut')}
            >
              <LogOut />
              {t('layout.header.signOut')}
            </Button>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'mx-auto grid gap-4',
          fluid
            ? 'max-w-none px-3 py-3 sm:px-4'
            : 'max-w-[1480px] px-4 py-4 sm:px-6 lg:py-5',
        )}
      >
        {children}
      </main>
    </div>
  );
}
