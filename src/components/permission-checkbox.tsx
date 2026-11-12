import { ShieldCheck } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/cn';

export function PermissionCheckbox({
  checked,
  onChange,
  className,
  bare = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  bare?: boolean;
}) {
  return (
    <label
      htmlFor="rights-confirmation"
      className={cn(
        'flex cursor-pointer items-center gap-3 transition',
        bare
          ? 'text-sm'
          : 'rounded-xl border border-border bg-surface/70 px-4 py-3 hover:border-border-strong hover:bg-surface-2/60',
        !bare && checked && 'border-accent/25 bg-accent-soft/25',
        className,
      )}
    >
      <Checkbox
        id="rights-confirmation"
        checked={checked}
        onCheckedChange={onChange}
        label="I own this media or have permission to modify it"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-snug text-foreground">
          I own this media or have permission to modify it
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-xs leading-snug text-subtle-foreground">
          <ShieldCheck className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
          Images are sent for removal only when you choose Remove watermark.
        </span>
      </span>
    </label>
  );
}
