import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/cn';

export function Slider({
  value,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 1,
  step = 0.01,
  disabled,
  ariaLabel,
  className,
}: {
  value: number;
  onValueChange: (value: number) => void;
  onValueCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex h-6 w-full touch-none select-none items-center', className)}
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(next) => onValueChange(next[0] ?? value)}
      onValueCommit={(next) => onValueCommit?.(next[0] ?? value)}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-surface-2">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-accent/70" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        className="block size-4 rounded-full border border-accent/70 bg-accent shadow-[0_0_0_4px_rgba(131,232,255,0.12)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50"
      />
    </SliderPrimitive.Root>
  );
}
