import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/cn';

export function Progress({
  value,
  className,
  indeterminate = false,
  label,
}: {
  value: number;
  className?: string;
  indeterminate?: boolean;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <ProgressPrimitive.Root
      value={indeterminate ? null : clamped}
      aria-label={label ?? 'Progress'}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full rounded-full bg-accent transition-[width] duration-300 ease-out',
          indeterminate && 'w-1/3 animate-[fc-indeterminate_1.4s_ease-in-out_infinite]',
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
