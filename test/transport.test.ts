import { describe, expect, it, vi } from 'vitest';
import { FetchTransport, requestOrThrow } from '../src/core/transport.js';
import {
  DailySpendCapError,
  NotFoundError,
  RateLimitError,
} from '../src/core/errors.js';

const API_KEY = `havadis_abcd1234_${'s'.repeat(32)}`;

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('FetchTransport', () => {
  it('sends bearer auth, JSON body and the idempotency key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(202, { id: 'j1' }));
    const transport = new FetchTransport({
      apiKey: API_KEY,
      baseUrl: 'https://example.test',
      fetch: fetchMock as never,
    });

    await transport.request({
      method: 'POST',
      path: '/api/v1/brands/b1/jobs',
      body: { brief: 'x' },
      idempotencyKey: 'key-1',
      query: { a: 1, skip: undefined },
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://example.test/api/v1/brands/b1/jobs?a=1');
    expect(init.headers.authorization).toBe(`Bearer ${API_KEY}`);
    expect(init.headers['idempotency-key']).toBe('key-1');
    expect(init.body).toBe('{"brief":"x"}');
  });

  it('retries a GET on 429 honoring Retry-After, then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(429, { error: { code: 'rate_limit_exceeded' } }, { 'retry-after': '0' }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const transport = new FetchTransport({
      apiKey: API_KEY,
      baseUrl: 'https://example.test',
      fetch: fetchMock as never,
    });

    const res = await transport.request<{ ok: boolean }>({
      method: 'GET',
      path: '/api/v1/me',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.body.ok).toBe(true);
  });

  it('NEVER retries a POST without an idempotency key', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(503, { error: { code: 'internal_error' } }));
    const transport = new FetchTransport({
      apiKey: API_KEY,
      baseUrl: 'https://example.test',
      fetch: fetchMock as never,
    });

    const res = await transport.request({
      method: 'POST',
      path: '/api/v1/brands/b1/contents/c1/publish',
      body: { channel: 'custom_website' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(503);
  });

  it('retries a keyed POST on 5xx — the server replays, never re-runs', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(502, { error: { code: 'internal_error' } }))
      .mockResolvedValueOnce(jsonResponse(202, { id: 'j1', status: 'pending' }));
    const transport = new FetchTransport({
      apiKey: API_KEY,
      baseUrl: 'https://example.test',
      fetch: fetchMock as never,
    });

    const res = await transport.request({
      method: 'POST',
      path: '/api/v1/brands/b1/jobs',
      body: {},
      idempotencyKey: 'key-1',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(202);
    // Same key on both attempts — that is the whole safety argument.
    expect(fetchMock.mock.calls[0]![1].headers['idempotency-key']).toBe('key-1');
    expect(fetchMock.mock.calls[1]![1].headers['idempotency-key']).toBe('key-1');
  });

  it('redacts the API key out of network error messages', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new TypeError(`fetch failed for ${API_KEY}`));
    const transport = new FetchTransport({
      apiKey: API_KEY,
      baseUrl: 'https://example.test',
      maxRetries: 0,
      fetch: fetchMock as never,
    });

    await expect(
      transport.request({ method: 'GET', path: '/api/v1/me' }),
    ).rejects.toSatisfy((err: Error) => {
      expect(err.message).not.toContain(API_KEY);
      expect(err.message).toContain('havadis_***');
      return true;
    });
  });
});

describe('requestOrThrow — envelope → typed errors', () => {
  const respond = (status: number, body: unknown) => ({
    request: async () => ({
      status,
      body,
      headers: new Headers(),
    }),
  });

  it('maps daily_spend_cap_exceeded with its actionable fields', async () => {
    await expect(
      requestOrThrow(
        respond(429, {
          error: {
            type: 'rate_limit_error',
            code: 'daily_spend_cap_exceeded',
            message: 'capped',
            retry_after_seconds: 120,
            capCredits: 50,
            spentTodayCredits: 49,
          },
          request_id: 'req-1',
        }) as never,
        { method: 'POST', path: '/x' },
      ),
    ).rejects.toSatisfy((err: DailySpendCapError) => {
      expect(err).toBeInstanceOf(DailySpendCapError);
      expect(err.retryAfterSeconds).toBe(120);
      expect(err.capCredits).toBe(50);
      expect(err.requestId).toBe('req-1');
      return true;
    });
  });

  it('maps brand_not_found to NotFoundError and 429 fallback to RateLimitError', async () => {
    await expect(
      requestOrThrow(
        respond(404, {
          error: { type: 'not_found_error', code: 'brand_not_found', message: 'x' },
        }) as never,
        { method: 'GET', path: '/x' },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(
      requestOrThrow(
        respond(429, { error: { type: 'x', code: 'mystery', message: 'x' } }) as never,
        { method: 'GET', path: '/x' },
      ),
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});
