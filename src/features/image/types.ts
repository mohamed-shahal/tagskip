import type { ImageItem } from '@/store/useAppStore';
import { createId } from '@/store/useAppStore';

export type { ImageItem };

export function createEmptyImageItem(file: File): ImageItem {
  return {
    id: createId('image'),
    name: file.name,
    size: file.size,
    mime: file.type || 'image/*',
    width: 0,
    height: 0,
    thumbnail: '',
    status: 'decoding',
    result: null,
    addedAt: Date.now(),
  };
}
