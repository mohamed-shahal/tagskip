import type { ImageItem } from './useAppStore';

/** Large media objects live outside the reactive store. */
export type ImageRuntime = {
  file: File;
  originalUrl: string;
};

const imageRuntime = new Map<string, ImageRuntime>();

export function setImageRuntime(id: string, runtime: ImageRuntime): void {
  imageRuntime.set(id, runtime);
}

export function getImageRuntime(id: string): ImageRuntime | undefined {
  return imageRuntime.get(id);
}

export function disposeImageRuntime(id: string): void {
  const runtime = imageRuntime.get(id);
  if (!runtime) return;
  if (runtime.originalUrl.startsWith('blob:')) URL.revokeObjectURL(runtime.originalUrl);
  imageRuntime.delete(id);
}

export type { ImageItem };
