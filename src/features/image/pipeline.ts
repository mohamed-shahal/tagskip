import { requestImageRemoval } from './api';
import { AppError } from '@/lib/errors';
import { decodeImageFile } from './decode';
import { getImageRuntime, setImageRuntime } from '@/store/session';
import type { RemovalResponse } from '@/store/useAppStore';

export async function decodeImageItem(
  itemId: string,
  file: File,
): Promise<{ width: number; height: number; thumbnail: string }> {
  const decoded = await decodeImageFile(file);
  setImageRuntime(itemId, {
    file,
    originalUrl: decoded.originalUrl,
  });
  return { width: decoded.width, height: decoded.height, thumbnail: decoded.thumbnail };
}

export async function processImageItem(
  itemId: string,
): Promise<{ response: RemovalResponse; durationMs: number }> {
  const runtime = getImageRuntime(itemId);
  if (!runtime) throw new AppError('decode-failed', 'The image data is no longer available. Add the file again.');

  const started = performance.now();
  const response = await requestImageRemoval(runtime.file);
  return { response, durationMs: Math.round(performance.now() - started) };
}
