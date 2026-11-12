import { useMemo } from 'react';
import { Image as ImageIcon, Loader2, Trash2, Wand2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getImageRuntime } from '@/store/session';
import { useImageQueue } from '@/features/image/useImageQueue';
import { formatApiResponse } from '@/features/image/api';
import { formatBytes, getExtension } from '@/lib/format';
import { Alert } from './ui/alert';
import { Button } from './ui/button';
import { Panel, PanelBody, PanelHeader, PanelTitle } from './ui/panel';
import { Spinner } from './ui/spinner';
import { UploadZone } from './upload-zone';
import { ImageQueue } from './image-queue';
import { ImageStatusBadge, isImageBusy } from './status-badge';

export function ImageWorkspace({
  rightsAcknowledged,
  onNeedRights,
  permissionSlot,
}: {
  rightsAcknowledged: boolean;
  onNeedRights: () => void;
  permissionSlot?: React.ReactNode;
}) {
  const queue = useImageQueue();
  const images = useAppStore((state) => state.images);
  const selectedImageId = useAppStore((state) => state.selectedImageId);
  const selectImage = useAppStore((state) => state.selectImage);

  const selected = useMemo(
    () => images.find((item) => item.id === selectedImageId) ?? images[0] ?? null,
    [images, selectedImageId],
  );

  if (images.length === 0 || !selected) {
    return (
      <div className="animate-rise">
        <UploadZone
          multiple
          disabled={!rightsAcknowledged}
          onBlocked={onNeedRights}
          onFiles={(files) => void queue.addFiles(files)}
          permission={permissionSlot}
        />
      </div>
    );
  }

  const runtime = getImageRuntime(selected.id);
  const imageSrc = runtime?.originalUrl ?? selected.thumbnail;
  const busy = isImageBusy(selected.status);
  const result = selected.result;

  return (
    <div className="animate-rise space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Image mode</p>
          <h2 className="font-display text-xl font-semibold tracking-tight">Remove a watermark</h2>
        </div>
        <UploadZone
          multiple
          compact
          disabled={!rightsAcknowledged}
          onBlocked={onNeedRights}
          onFiles={(files) => void queue.addFiles(files)}
        />
      </div>

      {!rightsAcknowledged ? (
        <div className="space-y-3">
          {permissionSlot ? (
            <div className="rounded-xl border border-border bg-surface/70 px-4 py-3">{permissionSlot}</div>
          ) : null}
          <Alert tone="warning" title="Confirm the usage notice first">
            Uploading is disabled until you confirm you own this media or have permission to modify it.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader className="flex-wrap gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <PanelTitle>Preview</PanelTitle>
                <ImageStatusBadge status={selected.status} />
              </div>
              <p className="mt-1 max-w-md truncate text-xs text-subtle-foreground">{selected.name}</p>
            </div>
          </PanelHeader>
          <PanelBody>
            {selected.status === 'decoding' || !imageSrc ? (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-border bg-surface-2/40">
                <span className="flex flex-col items-center gap-3 text-sm text-subtle-foreground">
                  <Loader2 className="size-6 animate-spin text-accent" aria-hidden="true" />
                  Decoding image…
                </span>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-surface-2/40">
                <img
                  src={imageSrc}
                  alt={selected.name}
                  className="mx-auto max-h-[72vh] w-auto max-w-full object-contain"
                />
              </div>
            )}
          </PanelBody>
        </Panel>

        <div className="min-w-0 space-y-5">
          <Panel>
            <PanelHeader>
              <PanelTitle>Remove watermark</PanelTitle>
            </PanelHeader>
            <PanelBody className="space-y-3">
              <p className="text-xs leading-relaxed text-subtle-foreground">
                Sends the uploaded file to the configured removal service and shows the result here.
              </p>
              <Button
                variant="primary"
                className="w-full"
                disabled={!rightsAcknowledged || busy}
                onClick={() => void queue.restoreItem(selected.id)}
              >
                {selected.status === 'processing' ? <Spinner /> : <Wand2 className="size-4" />}
                Remove watermark
              </Button>
              {selected.error ? (
                <Alert tone={selected.status === 'error' ? 'danger' : 'warning'}>{selected.error}</Alert>
              ) : null}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Response</PanelTitle>
              {result ? (
                <span className="text-[11px] text-subtle-foreground">{Math.max(1, result.durationMs)} ms</span>
              ) : null}
            </PanelHeader>
            <PanelBody>
              {result ? (
                result.response.kind === 'image' ? (
                  <div className="space-y-2">
                    <img
                      src={result.response.url}
                      alt="Response"
                      className="max-h-80 w-auto rounded-lg border border-border"
                    />
                    <div className="flex items-center justify-between gap-3 text-[11px] text-subtle-foreground">
                      <span>
                        {result.response.contentType} · {formatBytes(result.response.size)}
                      </span>
                      <a
                        href={result.response.url}
                        download="remove-watermark-response.png"
                        className="text-accent hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                ) : (
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-2/60 p-3 text-[11px] leading-relaxed text-foreground">
                    {result.response.kind === 'json'
                      ? formatApiResponse(result.response.value)
                      : result.response.value}
                  </pre>
                )
              ) : (
                <p className="text-xs leading-relaxed text-subtle-foreground">
                  No results yet. Choose Remove watermark to see the response here.
                </p>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>File</PanelTitle>
              <span className="text-[11px] text-subtle-foreground">{getExtension(selected.name) || 'IMAGE'}</span>
            </PanelHeader>
            <PanelBody className="space-y-3">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <Row label="Dimensions" value={selected.width ? `${selected.width}×${selected.height}` : '—'} />
                <Row label="File size" value={formatBytes(selected.size)} />
                <Row label="Status" value={<ImageStatusBadge status={selected.status} />} />
                <Row label="Type" value={selected.mime || 'image'} />
              </dl>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <span className="flex min-w-0 items-center gap-2 text-[11px] text-subtle-foreground">
                  <ImageIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{selected.name}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => queue.removeImage(selected.id)}
                  aria-label={`Remove ${selected.name}`}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>

      <ImageQueue
        onSelect={selectImage}
        onRemove={queue.removeImage}
        onProcessAll={() => void queue.processAll()}
        onClearAll={queue.clearAll}
        rightsAcknowledged={rightsAcknowledged}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <dt className="shrink-0 text-subtle-foreground">{label}</dt>
      <dd className="truncate text-right text-foreground">{value}</dd>
    </div>
  );
}
