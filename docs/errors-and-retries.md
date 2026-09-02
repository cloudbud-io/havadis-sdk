# Errors & retries

Every failure is a subclass of `HavadisError` with the wire `code`, the
HTTP `status` and a `requestId` to quote at support.

| Class | code(s) | Extra fields |
| --- | --- | --- |
| `AuthenticationError` | `unauthorized` | — |
| `PermissionError` | `scope_denied`, `forbidden` | — |
| `NotFoundError` | `brand_not_found`, `not_found` | — |
| `InvalidRequestError` | `invalid_request`, `api_key_limit_reached` | — |
| `InvalidCursorError` | `invalid_cursor` | — |
| `ChannelNotSupportedError` | `channel_not_supported` | — |
| `RateLimitError` | `rate_limit_exceeded` | `retryAfterSeconds`, `limit`, `plan` |
| `DailySpendCapError` | `daily_spend_cap_exceeded` | `retryAfterSeconds`, `capCredits`, `spentTodayCredits`, `requestedCredits` |
| `InsufficientCreditsError` | `insufficient_credits`, `owner_insufficient_credits` | `requiredCredits`, `availableCredits` |
| `IdempotencyError` | `idempotency_key_required`, `idempotency_error` | — |
| `IdempotencyInFlightError` | `idempotency_in_flight` | `retryAfterSeconds` |
| `ApiError` | anything else / 5xx | — |

`JobFailedError` / `JobCancelledError` / `JobTimeoutError` come from
`jobs.waitFor` and carry the final job snapshot.

## Retry semantics (what the SDK does for you)

- **GET**: retried up to 2× on 429/502/503/504 and network failures, with
  full-jitter backoff; a `Retry-After` header always wins.
- **POST**: retried **only** when an `Idempotency-Key` rides along. The
  key makes the server replay the stored result instead of re-running —
  so a retry can never create two jobs or charge twice. `jobs.create` and
  `topics.suggest` always carry one (auto-generated per call).
- **Your own retries**: pass `{ idempotencyKey }` explicitly if your
  system may re-issue the call across process restarts; the API replays
  the same result for 24 hours.

## Idempotency rules (server-side)

- Same key + same request → replayed response, marked
  `Idempotent-Replayed: true`.
- Same key + **different** request → `idempotency_error` (400). Generate
  a fresh key per logical operation.
- Same key while the first attempt is still running →
  `IdempotencyInFlightError` with `retryAfterSeconds`.
- Validation failures (400) do **not** burn the key.

## One caveat

During key rotation both the old and the new key work for 24 hours, but
idempotency claims are scoped per key — issue a given logical request
with ONE key while you migrate, not both.
