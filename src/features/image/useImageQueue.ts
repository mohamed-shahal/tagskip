import { useCallback } from 'react';
import { DEFAULT_MAX_FILE_MB, validateImageFile } from '@/lib/file-validation';
import { isCanceledError, toUserMessage } from '@/lib/errors';
import { disposeImageRuntime } from '@/store/session';
import { useAppStore, type ImageItem } from '@/store/useAppStore';
import { createEmptyImageItem } from './types';
import { decodeImageItem, processImageItem } from './pipeline';

function summarizeError(error: unknown): string {
  if (isCanceledError(error)) return 'Canceled.';
  return toUserMessage(error);
}

function revokeResult(item: ImageItem | undefined): void {
  if (item?.result?.response.kind === 'image') URL.revokeObjectURL(item.result.response.url);
}

export function useImageQueue() {
  const addFiles = useCallback(async (files: File[]): Promise<void> => {
    if (files.length === 0) return;
    const { addImages, updateImage, pushToast } = useAppStore.getState();

    const accepted: Array<{ file: File; item: ImageItem }> = [];
    for (const file of files) {
      try {
        await validateImageFile(file, DEFAULT_MAX_FILE_MB);
        accepted.push({ file, item: createEmptyImageItem(file) });
      } catch (error) {
        pushToast({
          tone: 'danger',
          title: `Could not add ${file.name}`,
          description: summarizeError(error),
        });
      }
    }
    if (accepted.length === 0) return;
    addImages(accepted.map((entry) => entry.item));

    for (const { file, item } of accepted) {
      try {
        updateImage(item.id, { status: 'decoding' });
        const decoded = await decodeImageItem(item.id, file);
        updateImage(item.id, { ...decoded, status: 'ready' });
      } catch (error) {
        const message = summarizeError(error);
        if (!isCanceledError(error)) {
          updateImage(item.id, { status: 'error', error: message });
          pushToast({
            tone: 'danger',
            title: `Could not decode ${item.name}`,
            description: message,
          });
        }
      }
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    const item = useAppStore.getState().images.find((candidate) => candidate.id === id);
    revokeResult(item);
    disposeImageRuntime(id);
    useAppStore.getState().removeImage(id);
  }, []);

  const restoreItem = useCallback(async (id: string): Promise<boolean> => {
    const state = useAppStore.getState();
    const item = state.images.find((candidate) => candidate.id === id);
    if (!item) return false;

    revokeResult(item);
    state.updateImage(id, { status: 'processing', result: null, error: undefined });
    try {
      const result = await processImageItem(id);
      state.updateImage(id, { status: 'done', result, error: undefined });
      return true;
    } catch (error) {
      const message = summarizeError(error);
      state.updateImage(id, { status: 'error', result: null, error: message });
      if (!isCanceledError(error)) {
        state.pushToast({ tone: 'danger', title: `Could not process ${item.name}`, description: message });
      }
      return false;
    }
  }, []);

  const processAll = useCallback(async () => {
    const state = useAppStore.getState();
    const queue = state.images.filter(
      (item) => item.status !== 'done' && item.status !== 'processing',
    );
    if (queue.length === 0) {
      state.pushToast({
        tone: 'info',
        title: 'Nothing queued',
        description: 'Every image already has a response.',
      });
      return;
    }
    state.setImageBatch({ running: true, currentId: null, completed: 0, total: queue.length, message: 'Starting batch…' });
    let succeeded = 0;
    try {
      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index];
        state.setImageBatch({
          running: true,
          currentId: item.id,
          completed: index,
          total: queue.length,
          message: `Sending ${item.name}`,
        });
        const ok = await restoreItem(item.id);
        if (ok) succeeded += 1;
        state.setImageBatch({
          running: true,
          currentId: null,
          completed: index + 1,
          total: queue.length,
          message: `Processed ${index + 1} of ${queue.length}`,
        });
      }
    } finally {
      state.setImageBatch({
        running: false,
        currentId: null,
        completed: queue.length,
        total: queue.length,
        message: `Batch finished: ${succeeded} of ${queue.length} completed.`,
      });
      state.pushToast({
        tone: succeeded === queue.length ? 'success' : 'warning',
        title: 'Batch complete',
        description: `${succeeded} of ${queue.length} images completed.`,
      });
    }
  }, [restoreItem]);

  const clearAll = useCallback(() => {
    const state = useAppStore.getState();
    for (const item of state.images) {
      revokeResult(item);
      disposeImageRuntime(item.id);
      state.removeImage(item.id);
    }
    state.setImageBatch({ running: false, currentId: null, completed: 0, total: 0, message: '' });
  }, []);

  return {
    addFiles,
    removeImage,
    restoreItem,
    processAll,
    clearAll,
  };
}
