import { randomUUID } from 'node:crypto';

/**
 * Credit-spending POSTs REQUIRE an Idempotency-Key server-side. The SDK
 * generates one per logical call when the caller does not supply their
 * own — the retry loop then reuses that same key, so a network retry
 * replays instead of double-charging. Pass an explicit key to make YOUR
 * OWN retries (across process restarts) idempotent too.
 */
export function ensureIdempotencyKey(provided?: string): string {
  return provided ?? randomUUID();
}
