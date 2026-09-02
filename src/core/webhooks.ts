import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Standard Webhooks v1 verification (https://www.standardwebhooks.com) —
 * the scheme Havadis signs its site-refresh pings with. ~10 lines of
 * node:crypto on purpose; the npm package's published 1.0.0 has been
 * stale since 2024.
 *
 * signed_content = `${webhook-id}.${webhook-timestamp}.${raw payload}`
 * signature      = base64(HMAC-SHA256(secret, signed_content))
 * header         = `v1,<sig>` — possibly several, space-separated (secret
 *                  rotation sends old+new so receivers never break).
 */
export interface WebhookHeaders {
  'webhook-id': string;
  'webhook-timestamp': string;
  'webhook-signature': string;
}

export interface VerifyWebhookOptions {
  /** Clock tolerance in seconds (default 300 — the spec's 5 minutes). */
  toleranceSeconds?: number;
  now?: Date;
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

/**
 * Throws WebhookVerificationError unless the payload verifies; returns the
 * parsed JSON payload on success. `payload` must be the RAW request body
 * bytes — re-serialized JSON will not match the signature.
 */
export function verifyWebhook<T = unknown>(
  payload: string | Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
  options: VerifyWebhookOptions = {},
): T {
  const id = headerOf(headers, 'webhook-id');
  const timestamp = headerOf(headers, 'webhook-timestamp');
  const signatureHeader = headerOf(headers, 'webhook-signature');
  if (!id || !timestamp || !signatureHeader) {
    throw new WebhookVerificationError('Missing webhook headers');
  }

  const tolerance = options.toleranceSeconds ?? 300;
  const nowSec = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > tolerance) {
    throw new WebhookVerificationError('Timestamp outside tolerance');
  }

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signedContent = `${id}.${timestamp}.${payload.toString()}`;
  const expected = createHmac('sha256', key).update(signedContent).digest();

  const candidates = signatureHeader
    .split(' ')
    .filter((part) => part.startsWith('v1,'))
    .map((part) => part.slice(3));
  const match = candidates.some((candidate) => {
    const provided = Buffer.from(candidate, 'base64');
    return (
      provided.length === expected.length &&
      timingSafeEqual(provided, expected)
    );
  });
  if (!match) throw new WebhookVerificationError('No matching signature');

  return JSON.parse(payload.toString()) as T;
}

function headerOf(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
