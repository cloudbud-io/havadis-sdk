/**
 * Typed error hierarchy over the API's closed envelope:
 * `{ error: { type, code, message, retry_after_seconds?, ...details }, request_id }`.
 *
 * Every class carries the wire `code`, the `requestId` for support
 * tickets, and — where the envelope whitelists them — actionable fields
 * (how long to wait, how many credits were missing). Fields mirror the
 * wire exactly; nothing here is invented client-side.
 */

export interface ErrorEnvelope {
  error: {
    type: string;
    code: string;
    message: string;
    retry_after_seconds?: number;
    [key: string]: unknown;
  };
  request_id?: string;
}

export class HavadisError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;
  readonly docsUrl = 'https://gethavadis.co/developers';

  constructor(status: number, envelope: ErrorEnvelope['error'], requestId?: string) {
    super(envelope.message);
    this.name = new.target.name;
    this.code = envelope.code;
    this.status = status;
    this.requestId = requestId ?? null;
  }
}

export class AuthenticationError extends HavadisError {}
export class PermissionError extends HavadisError {}
export class NotFoundError extends HavadisError {}
export class InvalidRequestError extends HavadisError {}
export class InvalidCursorError extends InvalidRequestError {}
export class ChannelNotSupportedError extends InvalidRequestError {}

export class RateLimitError extends HavadisError {
  readonly retryAfterSeconds: number;
  readonly limit: number | null;
  readonly plan: string | null;
  constructor(status: number, e: ErrorEnvelope['error'], requestId?: string) {
    super(status, e, requestId);
    this.retryAfterSeconds = numberOf(e.retry_after_seconds) ?? 60;
    this.limit = numberOf(e.limit);
    this.plan = typeof e.plan === 'string' ? e.plan : null;
  }
}

export class DailySpendCapError extends HavadisError {
  readonly retryAfterSeconds: number;
  readonly capCredits: number | null;
  readonly spentTodayCredits: number | null;
  readonly requestedCredits: number | null;
  constructor(status: number, e: ErrorEnvelope['error'], requestId?: string) {
    super(status, e, requestId);
    this.retryAfterSeconds = numberOf(e.retry_after_seconds) ?? 3600;
    this.capCredits = numberOf(e.capCredits);
    this.spentTodayCredits = numberOf(e.spentTodayCredits);
    this.requestedCredits = numberOf(e.requestedCredits);
  }
}

export class InsufficientCreditsError extends HavadisError {
  readonly requiredCredits: number | null;
  readonly availableCredits: number | null;
  constructor(status: number, e: ErrorEnvelope['error'], requestId?: string) {
    super(status, e, requestId);
    this.requiredCredits = numberOf(e.requiredCredits);
    this.availableCredits = numberOf(e.availableCredits);
  }
}

export class IdempotencyError extends HavadisError {}
export class IdempotencyInFlightError extends HavadisError {
  readonly retryAfterSeconds: number;
  constructor(status: number, e: ErrorEnvelope['error'], requestId?: string) {
    super(status, e, requestId);
    this.retryAfterSeconds = numberOf(e.retry_after_seconds) ?? 5;
  }
}

export class ApiError extends HavadisError {}

/** Raised locally by `jobs.waitFor` — not a wire error. */
export class JobFailedError extends Error {
  constructor(
    readonly jobId: string,
    readonly job: unknown,
  ) {
    super(`Job ${jobId} failed`);
    this.name = 'JobFailedError';
  }
}
export class JobCancelledError extends Error {
  constructor(
    readonly jobId: string,
    readonly job: unknown,
  ) {
    super(`Job ${jobId} was cancelled`);
    this.name = 'JobCancelledError';
  }
}
export class JobTimeoutError extends Error {
  constructor(readonly jobId: string) {
    super(`Timed out waiting for job ${jobId}`);
    this.name = 'JobTimeoutError';
  }
}

function numberOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Wire code → class. Unknown codes fall back by HTTP status family. */
export function errorFromEnvelope(
  status: number,
  envelope: ErrorEnvelope | null,
): HavadisError {
  const e = envelope?.error ?? {
    type: 'api_error',
    code: 'internal_error',
    message: `HTTP ${status}`,
  };
  const requestId = envelope?.request_id;
  switch (e.code) {
    case 'unauthorized':
      return new AuthenticationError(status, e, requestId);
    case 'scope_denied':
    case 'forbidden':
      return new PermissionError(status, e, requestId);
    case 'brand_not_found':
    case 'not_found':
      return new NotFoundError(status, e, requestId);
    case 'invalid_cursor':
      return new InvalidCursorError(status, e, requestId);
    case 'channel_not_supported':
      return new ChannelNotSupportedError(status, e, requestId);
    case 'invalid_request':
    case 'api_key_limit_reached':
      return new InvalidRequestError(status, e, requestId);
    case 'rate_limit_exceeded':
      return new RateLimitError(status, e, requestId);
    case 'daily_spend_cap_exceeded':
      return new DailySpendCapError(status, e, requestId);
    case 'insufficient_credits':
    case 'owner_insufficient_credits':
      return new InsufficientCreditsError(status, e, requestId);
    case 'idempotency_key_required':
    case 'idempotency_error':
      return new IdempotencyError(status, e, requestId);
    case 'idempotency_in_flight':
      return new IdempotencyInFlightError(status, e, requestId);
    default:
      break;
  }
  if (status === 401) return new AuthenticationError(status, e, requestId);
  if (status === 403) return new PermissionError(status, e, requestId);
  if (status === 404) return new NotFoundError(status, e, requestId);
  if (status === 429) return new RateLimitError(status, e, requestId);
  if (status >= 400 && status < 500) {
    return new InvalidRequestError(status, e, requestId);
  }
  return new ApiError(status, e, requestId);
}
