export type AppErrorCode =
  | 'unsupported-type'
  | 'too-large'
  | 'dimensions-too-large'
  | 'decode-failed'
  | 'canceled'
  | 'unknown';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly detail?: string;

  constructor(code: AppErrorCode, message: string, detail?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.detail = detail;
  }
}

export function isCanceledError(error: unknown): boolean {
  if (error instanceof AppError) return error.code === 'canceled';
  if (error instanceof DOMException) return error.name === 'AbortError';
  return false;
}

export function toUserMessage(error: unknown, fallback = 'Something went wrong. Please try another file.'): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export class CancellationController {
  private controller = new AbortController();
  private canceled = false;

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get isCanceled(): boolean {
    return this.canceled;
  }

  cancel(): void {
    this.canceled = true;
    this.controller.abort();
  }

  throwIfCanceled(): void {
    if (this.canceled) throw new AppError('canceled', 'Operation canceled.');
  }

  reset(): void {
    this.controller = new AbortController();
    this.canceled = false;
  }
}
