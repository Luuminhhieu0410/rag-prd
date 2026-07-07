import {Languages, LogOut, Search, Settings, SunMoon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {ReactNode} from "react";
import {useEffect, useState} from "react";
import {signOutUser} from "@/helpers";
import {useAuthStore} from "@/stores/authStore.ts";
import {useTheme} from "next-themes";

const languages = [
  {value: 'en', label: 'English'},
  {value: 'vi', label: 'Tiếng Việt'},
];

export function AppShell({children}: {children: ReactNode}) {

  const me = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const {theme, setTheme} = useTheme();
  const [language, setLanguage] = useState(() => localStorage.getItem('language') ?? 'en');

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const onSignOut = () => {
    signOutUser().catch((err) => console.error("Error signing out", err));
    setUser(null );
  }
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Search className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">
                Source notebook
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {me?.email ?? 'Signed in'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="Settings" />}>
                <Settings />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuRadioGroup value={language} onValueChange={setLanguage}>
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Languages className="size-3.5" />
                    Language
                  </DropdownMenuLabel>
                  {languages.map((item) => (
                    <DropdownMenuRadioItem key={item.value} value={item.value}>
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <SunMoon className="size-3.5" />
                    Theme
                  </DropdownMenuLabel>
                  <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1480px] gap-4 px-4 py-4 sm:px-6 lg:py-5">
        {children}
      </main>
    </div>
  );
}
