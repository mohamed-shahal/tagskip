import { useCallback } from 'react';
import { Check, Lock, ShieldCheck } from 'lucide-react';
import { ThemeProvider } from './theme';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from '@/components/header';
import { ModeTabs } from '@/components/mode-tabs';
import { PermissionCheckbox } from '@/components/permission-checkbox';
import { HowItWorksCard } from '@/components/how-it-works-card';
import { ImageWorkspace } from '@/components/image-workspace';
import { SiteFooter } from '@/components/notices';
import { Toaster } from '@/components/toaster';
import { useAppStore } from '@/store/useAppStore';

export function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AppShell />
      </TooltipProvider>
    </ThemeProvider>
  );
}

function AppShell() {
  const rightsAcknowledged = useAppStore((state) => state.rightsAcknowledged);
  const acknowledgeRights = useAppStore((state) => state.acknowledgeRights);
  const pushToast = useAppStore((state) => state.pushToast);

  const onNeedRights = useCallback(() => {
    pushToast({
      tone: 'warning',
      title: 'Confirm the usage notice',
      description: 'Tick “I own this media or have permission to modify it” before adding media.',
    });
  }, [pushToast]);

  return (
    <div id="top" className="relative min-h-dvh bg-background">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-260px] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(131,232,255,0.1),transparent_65%)]" />
        <div className="absolute right-[8%] top-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(164,147,255,0.08),transparent_70%)]" />
      </div>

      <Header />

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
            <div className="space-y-5">
              <p className="eyebrow flex items-center gap-2">
                <span className="inline-block size-1.5 rounded-full bg-accent" />
                Visible watermark removal
              </p>
              <h1 className="text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
                Remove watermarks. Keep the frame.
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Upload an image, strip the visible overlay, and download the clean result.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-subtle-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="size-3.5 text-accent" aria-hidden="true" />
                  Sent only when you choose Remove
                </span>
                <span className="hidden size-1 rounded-full bg-border-strong sm:block" aria-hidden="true" />
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-accent" aria-hidden="true" />
                  Visible overlays only
                </span>
                <span className="hidden size-1 rounded-full bg-border-strong sm:block" aria-hidden="true" />
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-accent" aria-hidden="true" />
                  No account or tracking
                </span>
              </div>
              <ModeTabs />
            </div>
            <HowItWorksCard className="hidden lg:mt-1 lg:block" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <ImageWorkspace
            rightsAcknowledged={rightsAcknowledged}
            onNeedRights={onNeedRights}
            permissionSlot={
              <PermissionCheckbox bare checked={rightsAcknowledged} onChange={acknowledgeRights} />
            }
          />
        </section>
      </main>

      <SiteFooter />
      <Toaster />
    </div>
  );
}
