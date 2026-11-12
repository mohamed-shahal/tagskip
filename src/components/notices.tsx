import { BookOpen, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { Separator } from './ui/separator';

export function HowItWorksDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <BookOpen className="size-3.5" />
          How it works
        </Button>
      </DialogTrigger>
      <DialogContent
        title="How TagSkip works"
        description="Upload an image, send it for processing, and download the result."
      >
        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold text-foreground">1. Upload in your browser</h3>
            <p>
              Images are decoded with{' '}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">createImageBitmap</code> for a local preview.
              Nothing is sent until you choose Remove watermark.
            </p>
          </section>
          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold text-foreground">2. Send the file</h3>
            <p>
              The original file is sent as-is — no resizing, cropping or re-encoding — to the configured removal
              service.
            </p>
          </section>
          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold text-foreground">3. Get the result</h3>
            <p>
              The removal service returns the cleaned image. TagSkip shows it in the interface and lets you download
              it, without post-processing or storing it.
            </p>
          </section>
          <AlertLike>
            <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              The visible watermark is processed by the removal service. Invisible provenance marks such as SynthID are not targeted,
              and this tool does not claim universal watermark removal.
            </span>
          </AlertLike>
          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold text-foreground">Usage notice</h3>
            <p>
              Use TagSkip only on media you own or have permission to modify. Do not use it to bypass licensing,
              ownership or attribution restrictions.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreditsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="h-auto px-0 text-xs">
          Licenses &amp; credits
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Licenses and credits"
        description="The libraries used by the browser interface."
      >
        <div className="space-y-5 text-sm text-muted-foreground">
          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold text-foreground">Third-party software</h3>
            <ul className="space-y-1 text-[11px] leading-relaxed">
              <li>React, Radix UI, lucide-react, Zustand, Tailwind CSS — MIT / ISC licenses.</li>
              <li>clsx, tailwind-merge and class-variance-authority — MIT / Apache-2.0 licenses.</li>
              <li>Inter and Space Grotesk fonts — SIL Open Font License 1.1, self-hosted via Fontsource.</li>
              <li>The removal service runs separately and is not bundled with the browser app.</li>
            </ul>
            <p className="text-[11px] text-subtle-foreground">
              Full notices are recorded in THIRD_PARTY_NOTICES.md in the project source.
            </p>
          </section>
          <Separator />
          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold text-foreground">Application code</h3>
            <p className="text-[11px] leading-relaxed">MIT licensed. TagSkip is not affiliated with Google or Gemini.</p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AlertLike({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-accent/25 bg-accent-soft/60 px-3.5 py-3 text-xs leading-relaxed text-foreground">
      {children}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer id="about" className="mt-16 border-t border-border pb-10 pt-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-3">
        <section className="space-y-2">
          <h2 className="font-display text-sm font-semibold text-foreground">What happens to the image</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            The uploaded file is sent to the configured removal service and the result is shown in the interface.
            The browser does not run watermark removal locally.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-display text-sm font-semibold text-foreground">Processing and privacy</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Preview and validation run in your browser. The original file is sent to the backend only when you choose
            Remove watermark. The application has no account, analytics or media database.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-accent">
            <Lock className="size-3.5" aria-hidden="true" />
            Transfer occurs only when you send an image
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-display text-sm font-semibold text-foreground">Limits and honesty</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Results depend entirely on the configured removal service. Invisible provenance marks such as SynthID are not targeted.
            The response is shown as returned and may not include an image.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            PNG, JPEG and WebP inputs are supported, up to the configured upload limit. Video watermark removal is
            coming soon.
          </p>
        </section>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-3 px-4 text-[11px] text-subtle-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-start gap-1.5">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
          Only edit media you own or have permission to modify. TagSkip is not affiliated with Google or Gemini.
        </p>
        <div className="flex items-center gap-4">
          <CreditsDialog />
          <span>MIT licensed application code</span>
        </div>
      </div>
    </footer>
  );
}
