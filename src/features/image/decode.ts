import { AppError } from '@/lib/errors';
import { assertReasonableDimensions } from '@/lib/file-validation';

const THUMBNAIL_MAX_EDGE = 520;

export type DecodedImage = {
  width: number;
  height: number;
  thumbnail: string;
  originalUrl: string;
};

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new AppError('decode-failed', 'This browser could not create a 2D canvas context.');
  return context;
}

export async function decodeImageFile(file: File): Promise<DecodedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new AppError(
      'decode-failed',
      'This image could not be decoded. It may be corrupted or use an unsupported encoding.',
    );
  }

  try {
    assertReasonableDimensions(bitmap.width, bitmap.height);
    const scale = Math.min(1, THUMBNAIL_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const thumbWidth = Math.max(1, Math.round(bitmap.width * scale));
    const thumbHeight = Math.max(1, Math.round(bitmap.height * scale));
    const thumbCanvas = createCanvas(thumbWidth, thumbHeight);
    const thumbContext = context2d(thumbCanvas);
    thumbContext.fillStyle = '#11141a';
    thumbContext.fillRect(0, 0, thumbWidth, thumbHeight);
    thumbContext.imageSmoothingQuality = 'high';
    thumbContext.drawImage(bitmap, 0, 0, thumbWidth, thumbHeight);
    const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.8);

    return {
      width: bitmap.width,
      height: bitmap.height,
      thumbnail,
      originalUrl: URL.createObjectURL(file),
    };
  } finally {
    bitmap.close();
  }
}
