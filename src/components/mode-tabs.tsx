import { Image as ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ModeTabs() {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border-strong bg-surface/80 p-1 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
      <div
        aria-current="page"
        className={cn(
          'group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
          'bg-elevated text-foreground shadow-[0_2px_20px_-8px_rgba(131,232,255,0.45)]',
        )}
      >
        <ImageIcon className="size-4 text-accent" aria-hidden="true" />
        <span>Image</span>
        <span className="hidden text-[10px] font-normal uppercase tracking-[0.12em] text-subtle-foreground sm:inline">
          PNG, JPEG, WebP
        </span>
      </div>
      <div
        aria-disabled="true"
        title="Video watermark removal is coming soon"
        className="inline-flex cursor-default items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-subtle-foreground"
      >
        <Video className="size-4" aria-hidden="true" />
        <span>Video</span>
        <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-normal uppercase tracking-[0.12em]">
          Coming soon
        </span>
      </div>
    </div>
  );
}
