import type { RemovalResponse } from '@/store/useAppStore';
import { AppError } from '@/lib/errors';

export async function requestImageRemoval(file: File): Promise<RemovalResponse> {
  const body = new FormData();
  body.append('file', file, file.name);

  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/remove-watermark`, { method: 'POST', body });
  } catch {
    throw new AppError('unknown', 'The removal service is unavailable. Start the backend and try again.');
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    const text = await response.text();
    let message = `The removal service returned ${response.status}.`;
    try {
      const data = JSON.parse(text) as { detail?: unknown };
      if (data.detail) {
        message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      if (text) message = text;
    }
    throw new AppError(response.status === 413 ? 'too-large' : 'unknown', message);
  }

  if (contentType.startsWith('image/')) {
    const blob = await response.blob();
    return { kind: 'image', contentType, url: URL.createObjectURL(blob), size: blob.size };
  }

  const text = await response.text();
  try {
    return { kind: 'json', contentType, value: JSON.parse(text) };
  } catch {
    return { kind: 'text', contentType, value: text };
  }
}

export function formatApiResponse(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
