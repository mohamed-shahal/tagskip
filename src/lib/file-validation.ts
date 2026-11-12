import { AppError } from './errors';

export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_IMAGE_MEGAPIXELS = 64;
export const MAX_DIMENSION = 16384;
export const DEFAULT_MAX_FILE_MB = 250;

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'unknown';

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

export async function readImageFormat(file: Blob): Promise<ImageFormat> {
  const buffer = await file.slice(0, 32).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') return 'png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp';
  return 'unknown';
}

export async function validateImageFile(file: File, maxFileMb: number): Promise<ImageFormat> {
  if (file.size === 0) {
    throw new AppError('decode-failed', 'This file is empty.');
  }
  if (file.size > maxFileMb * 1024 * 1024) {
    throw new AppError(
      'too-large',
      `This file is ${(file.size / 1024 / 1024).toFixed(0)} MB. The current limit is ${maxFileMb} MB.`,
    );
  }
  const format = await readImageFormat(file);
  if (format === 'unknown') {
    throw new AppError(
      'unsupported-type',
      'This is not a PNG, JPEG or WebP image. Choose an image file to continue.',
    );
  }
  return format;
}

export function assertReasonableDimensions(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new AppError('decode-failed', 'The image dimensions could not be read.');
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new AppError(
      'dimensions-too-large',
      `This image is ${width}×${height}. Dimensions above ${MAX_DIMENSION}px are not supported.`,
    );
  }
  if (width * height > MAX_IMAGE_MEGAPIXELS * 1_000_000) {
    throw new AppError(
      'dimensions-too-large',
      `This image is ${Math.round((width * height) / 1_000_000)} MP. The limit is ${MAX_IMAGE_MEGAPIXELS} MP.`,
    );
  }
}
