import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppStore, type Toast } from '@/store/useAppStore';
import { Alert } from './ui/alert';
import { Button } from './ui/button';

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 7000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="pointer-events-auto animate-rise">
      <Alert
        tone={toast.tone}
        title={toast.title}
        action={
          <Button variant="ghost" size="icon" className="size-7" onClick={onDismiss} aria-label="Dismiss notification">
            <X className="size-3.5" />
          </Button>
        }
      >
        {toast.description ? <span className="text-xs leading-relaxed">{toast.description}</span> : null}
      </Alert>
    </div>
  );
}

export function Toaster() {
  const toasts = useAppStore((state) => state.toasts);
  const dismissToast = useAppStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
}
