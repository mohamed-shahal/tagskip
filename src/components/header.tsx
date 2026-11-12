import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/theme';
import { Button } from './ui/button';
import { Tooltip } from './ui/tooltip';
import { HowItWorksDialog } from './notices';
import { Logo } from './logo';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a
          href="#top"
          className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <Logo className="h-6 w-auto text-foreground transition-opacity group-hover:opacity-80 sm:h-7" />
        </a>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <HowItWorksDialog />
          <Tooltip label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </Tooltip>
          <a
            href="#about"
            className="hidden rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex"
          >
            Privacy &amp; limits
          </a>
        </nav>
      </div>
    </header>
  );
}
