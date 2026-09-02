import { errorFromEnvelope, type ErrorEnvelope } from './errors.js';
import { computeBackoffMs, isRetriableStatus } from './retry.js';
import { redactKey } from './redact.js';
import { sleep } from './sleep.js';

/**
 * The one seam between resources and the network (DIP): every resource
 * speaks `Transport.request`, tests hand in a fake, and the real
 * `FetchTransport` is the only file that knows about fetch, retries and
 * auth headers.
 */
export interface TransportRequest {
  method: 'GET' | 'POST';
  /** Path starting with /api/v1 — the transport owns the origin. */
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface TransportResponse<T> {
  status: number;
  body: T;
  headers: { get(name: string): string | null };
}

export interface Transport {
  request<T>(req: TransportRequest): Promise<TransportResponse<T>>;
}

export interface FetchTransportOptions {
  apiKey: string;
  /** Origin only, e.g. https://gethavadis.co — paths carry /api/v1. */
  baseUrl?: string;
  /** Per-attempt timeout. */
  timeoutMs?: number;
  /** Max retries on retriable failures (429/5xx/network). */
  maxRetries?: number;
  fetch?: typeof fetch;
}

const DEFAULT_BASE_URL = 'https://gethavadis.co';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

export class FetchTransport implements Transport {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: FetchTransportOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async request<T>(req: TransportRequest): Promise<TransportResponse<T>> {
    // A POST is only safe to retry when an Idempotency-Key makes the
    // server replay instead of re-run; GETs are always safe.
    const retriable = req.method === 'GET' || req.idempotencyKey !== undefined;
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const response = await this.attempt<T>(req);
        if (
          retriable &&
          attempt < this.maxRetries &&
          isRetriableStatus(response.status)
        ) {
          await sleep(
            computeBackoffMs(attempt, response.headers.get('retry-after')),
            req.signal,
          );
          attempt += 1;
          continue;
        }
        return response;
      } catch (err) {
        if (req.signal?.aborted) throw err;
        const isNetwork =
          err instanceof TypeError || (err as Error)?.name === 'TimeoutError';
        if (retriable && isNetwork && attempt < this.maxRetries) {
          await sleep(computeBackoffMs(attempt, null), req.signal);
          attempt += 1;
          continue;
        }
        throw redactKey(err, this.apiKey);
      }
    }
  }

  private async attempt<T>(req: TransportRequest): Promise<TransportResponse<T>> {
    const url = new URL(this.baseUrl + req.path);
    for (const [key, value] of Object.entries(req.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.apiKey}`,
      accept: 'application/json',
      'user-agent': 'havadis-sdk/0.1.0 (node)',
    };
    if (req.body !== undefined) headers['content-type'] = 'application/json';
    if (req.idempotencyKey) headers['idempotency-key'] = req.idempotencyKey;

    const signal = req.signal
      ? AbortSignal.any([req.signal, AbortSignal.timeout(this.timeoutMs)])
      : AbortSignal.timeout(this.timeoutMs);

    const res = await this.fetchImpl(url, {
      method: req.method,
      headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      redirect: 'manual', // cover routes 302 to signed URLs; callers follow
      signal,
    });

    const bodyText = await res.text();
    const body = bodyText.length > 0 ? safeJson(bodyText) : null;
    return { status: res.status, body: body as T, headers: res.headers };
  }
}

/** Shared success/throw policy — the resources' single request throat. */
export async function requestOrThrow<T>(
  transport: Transport,
  req: TransportRequest,
): Promise<T> {
  const res = await transport.request<T>(req);
  // Strictly 2xx: the JSON endpoints never redirect, so a 3xx here is a
  // misconfiguration to surface, not a body to trust.
  if (res.status >= 200 && res.status < 300) return res.body;
  throw errorFromEnvelope(res.status, res.body as ErrorEnvelope | null);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

