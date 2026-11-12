import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatApiResponse, requestImageRemoval } from '@/features/image/api';
import { AppError } from '@/lib/errors';

const file = new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('requestImageRemoval', () => {
  it('posts only the file field to the removal endpoint', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestImageRemoval(file);

    expect(result).toEqual({ kind: 'json', contentType: 'application/json', value: { status: 'ok' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/remove-watermark');
    expect(init.method).toBe('POST');

    const body = init.body as FormData;
    expect(Array.from(body.keys())).toEqual(['file']);
    expect((body.get('file') as File).name).toBe('photo.png');
  });

  it('returns image responses as an object URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(new Blob([new Uint8Array([9])], { type: 'image/png' }), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        }),
      ),
    );
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:response'),
      configurable: true,
    });

    const result = await requestImageRemoval(file);

    expect(result).toMatchObject({ kind: 'image', contentType: 'image/png', url: 'blob:response' });
    Reflect.deleteProperty(URL, 'createObjectURL');
  });

  it('surfaces a string error detail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ detail: 'Unsupported image' }, 422)));
    await expect(requestImageRemoval(file)).rejects.toThrow('Unsupported image');
  });

  it('surfaces a validation error array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ detail: [{ msg: 'field required', loc: ['body', 'file'] }] }, 422)),
    );
    await expect(requestImageRemoval(file)).rejects.toThrow('field required');
  });

  it('returns raw text when the response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })));
    await expect(requestImageRemoval(file)).resolves.toMatchObject({ kind: 'text', value: 'ok' });
  });

  it('reports an unreachable API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await expect(requestImageRemoval(file)).rejects.toBeInstanceOf(AppError);
  });
});

describe('formatApiResponse', () => {
  it('pretty prints objects and passes strings through', () => {
    expect(formatApiResponse({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(formatApiResponse('plain')).toBe('plain');
  });
});
