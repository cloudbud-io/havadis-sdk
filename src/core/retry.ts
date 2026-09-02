/** 429 + transient 5xx are worth another try; 4xx client errors never are. */
export function isRetriableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;

/**
 * Exponential backoff with full jitter; a server-provided Retry-After
 * (seconds) always wins over the computed delay — the server knows when
 * the window resets, the client is guessing.
 */
export function computeBackoffMs(
  attempt: number,
  retryAfterHeader: string | null,
): number {
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : NaN;
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1000, MAX_DELAY_MS);
  }
  const ceiling = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return Math.floor(Math.random() * ceiling);
}
