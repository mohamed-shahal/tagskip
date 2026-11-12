import { Images, Loader2, Play, Trash2, X } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { useAppStore, type ImageItem } from '@/store/useAppStore';
import { cn } from '@/lib/cn';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Panel, PanelBody, PanelHeader, PanelTitle } from './ui/panel';
import { Progress } from './ui/progress';
import { Tooltip } from './ui/tooltip';
import { ImageStatusBadge, isImageBusy } from './status-badge';

type ImageQueueProps = {
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onProcessAll: () => void;
  onClearAll: () => void;
  rightsAcknowledged: boolean;
};

function QueueCard({
  item,
  selected,
  busy,
  onSelect,
  onRemove,
}: {
  item: ImageItem;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border p-2.5 transition',
        selected ? 'border-accent/50 bg-accent-soft/25' : 'border-border bg-surface-2/40 hover:border-border-strong',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Select ${item.name}`}
        aria-current={selected || undefined}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <Images className="size-4 text-subtle-foreground" aria-hidden="true" />
          )}
          {busy ? (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="size-4 animate-spin text-accent" aria-hidden="true" />
            </span>
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{item.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-subtle-foreground">
            {item.width > 0 ? (
              <span>
                {item.width}×{item.height}
              </span>
            ) : null}
            <span>{formatBytes(item.size)}</span>
          </span>
          <span className="mt-1 block">
            <ImageStatusBadge status={item.status} />
          </span>
        </span>
      </button>
      <Tooltip label={`Remove ${item.name}`}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${item.name}`}
          disabled={busy}
          onClick={onRemove}
          className="size-7 shrink-0"
        >
          <X className="size-3.5" />
        </Button>
      </Tooltip>
    </div>
  );
}

export function ImageQueue({
  onSelect,
  onRemove,
  onProcessAll,
  onClearAll,
  rightsAcknowledged,
}: ImageQueueProps) {
  const images = useAppStore((state) => state.images);
  const selectedImageId = useAppStore((state) => state.selectedImageId);
  const batch = useAppStore((state) => state.imageBatch);
  const doneCount = images.filter((item) => item.result).length;
  const working = images.some((item) => isImageBusy(item.status));
  const batchPercent = batch.total > 0 ? (batch.completed / batch.total) * 100 : 0;

  return (
    <Panel>
      <PanelHeader className="flex-col gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <PanelTitle>Batch queue</PanelTitle>
            <Badge tone="neutral">{images.length}</Badge>
            {doneCount > 0 ? <Badge tone="success">{doneCount} complete</Badge> : null}
          </div>
          <p className="text-xs text-subtle-foreground">Images are sent one at a time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onProcessAll} disabled={!rightsAcknowledged || batch.running || working}>
            <Play className="size-3.5" />
            Process all
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearAll} disabled={batch.running || images.length === 0}>
            <Trash2 className="size-3.5" />
            Clear all
          </Button>
        </div>
      </PanelHeader>
      <PanelBody className="space-y-3 pt-4">
        {batch.running || batch.message ? (
          <div className="space-y-1.5 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <span className="truncate">{batch.message || 'Batch queue'}</span>
              {batch.total > 0 ? (
                <span className="shrink-0">
                  {batch.completed} / {batch.total}
                </span>
              ) : null}
            </div>
            <Progress
              value={batchPercent}
              indeterminate={batch.running && batch.total === 0}
              label="Batch progress"
            />
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((item) => (
            <QueueCard
              key={item.id}
              item={item}
              selected={item.id === selectedImageId}
              busy={isImageBusy(item.status)}
              onSelect={() => onSelect(item.id)}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      </PanelBody>
    </Panel>
  );
}
