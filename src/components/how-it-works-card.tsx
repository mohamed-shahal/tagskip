import { Download, Sparkles, UploadCloud, Video } from 'lucide-react';
import { cn } from '@/lib/cn';

const STEPS = [
  {
    icon: UploadCloud,
    title: 'Add an image',
    body: 'Drop a PNG, JPEG or WebP. It stays in your browser until you send it.',
  },
  {
    icon: Sparkles,
    title: 'Remove the overlay',
    body: 'The visible watermark is processed by the configured removal service.',
  },
  {
    icon: Download,
    title: 'Download the result',
    body: 'Preview the cleaned image and save it. Nothing is stored.',
  },
];

export function HowItWorksCard({ className }: { className?: string }) {
  return (
    <div className={cn('panel relative overflow-hidden p-5 sm:p-6', className)}>
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-accent/10 blur-3xl"
        aria-hidden="true"
      />
      <p className="eyebrow relative">How it works</p>
      <ol className="relative mt-4 space-y-4 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-border">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative flex gap-3">
            <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-elevated text-accent">
              <step.icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-foreground">
                <span className="mr-1.5 text-[11px] font-semibold text-subtle-foreground">{index + 1}.</span>
                {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="relative mt-5 flex items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-[11px] text-subtle-foreground">
        <Video className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
        Video watermark removal is coming soon.
      </div>
    </div>
  );
}
