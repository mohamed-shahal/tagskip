import { Badge } from './ui/badge';
import type { ImageStatus } from '@/store/useAppStore';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'violet';

const IMAGE_STATUS: Record<ImageStatus, { label: string; tone: Tone }> = {
  decoding: { label: 'Decoding', tone: 'accent' },
  ready: { label: 'Ready', tone: 'neutral' },
  processing: { label: 'Sending', tone: 'accent' },
  done: { label: 'Response received', tone: 'success' },
  error: { label: 'Error', tone: 'danger' },
};

export function ImageStatusBadge({ status }: { status: ImageStatus }) {
  const meta = IMAGE_STATUS[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function isImageBusy(status: ImageStatus): boolean {
  return status === 'decoding' || status === 'processing';
}
