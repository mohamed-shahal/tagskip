import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  label,
  id,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  id?: string;
  className?: string;
}) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(state) => onCheckedChange(state === true)}
      aria-label={label}
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] border border-border-strong bg-surface-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        className,
      )}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5 text-[#041014]" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
