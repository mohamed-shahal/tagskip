import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Clipboard, ImagePlus, Keyboard, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './ui/button';

type UploadZoneProps = {
  multiple?: boolean;
  compact?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  onBlocked?: () => void;
  permission?: ReactNode;
};

const ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';

export function UploadZone({
  multiple = false,
  compact = false,
  disabled,
  onFiles,
  onBlocked,
  permission,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => {
    if (disabled) {
      onBlocked?.();
      return;
    }
    inputRef.current?.click();
  };

  useEffect(() => {
    if (disabled) return;
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.closest('input, textarea, select') || target.isContentEditable)) return;
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'));
      if (files.length === 0) return;
      event.preventDefault();
      onFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [disabled, onFiles]);

  const acceptFiles = (files: File[]) => {
    if (disabled) {
      onBlocked?.();
      return;
    }
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptFiles(Array.from(event.dataTransfer.files));
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple={multiple}
          className="sr-only"
          data-testid="image-input"
          aria-label="Choose images"
          disabled={disabled}
          onChange={(event) => {
            acceptFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
        <Button variant="secondary" size="sm" onClick={openPicker} disabled={disabled}>
          <UploadCloud className="size-4" />
          Add images
        </Button>
        <span className="text-xs text-subtle-foreground">PNG, JPEG, WebP · sent on request</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        className="sr-only"
        data-testid="image-input"
        aria-label="Choose images"
        disabled={disabled}
        onChange={(event) => {
          acceptFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-dashed border-border-strong bg-surface/60 transition',
          'hover:border-accent/45 hover:bg-surface-2/60',
          dragging && 'border-accent bg-accent-soft/40',
          disabled && 'opacity-70 hover:border-border-strong hover:bg-surface/60',
        )}
      >
        {permission ? (
          <div className="border-b border-border bg-surface-2/50 px-4 py-3 text-left sm:px-5">{permission}</div>
        ) : null}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled || undefined}
          aria-label="Upload images"
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'group relative flex flex-col items-center justify-center gap-4 px-6 py-12 text-center sm:py-14',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative flex size-16 items-center justify-center rounded-2xl border border-accent/25 bg-accent-soft text-accent shadow-[0_0_44px_-14px_rgba(131,232,255,0.55)] transition duration-300 group-hover:scale-105">
            <ImagePlus className="size-7" aria-hidden="true" />
          </div>
          <div className="relative space-y-1.5">
            <p className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Drop images here, or browse files
            </p>
            <p className="text-sm text-muted-foreground">
              PNG, JPEG or WebP · up to 250 MB each · multi-file queue supported
            </p>
          </div>
          <div className="relative flex flex-wrap items-center justify-center gap-2 text-[11px] text-subtle-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1">
              <Clipboard className="size-3" aria-hidden="true" /> Paste from clipboard
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1">
              <Keyboard className="size-3" aria-hidden="true" /> Enter to browse
            </span>
          </div>
          <Button variant="primary" size="lg" className="relative mt-1 pointer-events-none" tabIndex={-1}>
            <UploadCloud className="size-4" />
            Select images
          </Button>
        </div>
      </div>
    </div>
  );
}
