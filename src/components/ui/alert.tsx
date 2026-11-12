import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

const tones = {
  info: { icon: Info, className: 'border-accent/25 bg-accent-soft text-accent' },
  success: { icon: CheckCircle2, className: 'border-success/25 bg-success/10 text-success' },
  warning: { icon: AlertTriangle, className: 'border-warning/25 bg-warning/10 text-warning' },
  danger: { icon: XCircle, className: 'border-danger/25 bg-danger-soft text-danger' },
} as const;

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  action,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const { icon: Icon, className: toneClass } = tones[tone];
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm', toneClass, className)} role="status">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 leading-relaxed">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-1', 'text-foreground/85')}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
