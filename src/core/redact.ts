/**
 * Strip the API key from anything about to leave the SDK through an error
 * path (messages, causes, stringified fetch errors). The secret must never
 * ride an exception into a log aggregator.
 */
export function redactKey<T>(err: T, apiKey: string): T {
  if (err instanceof Error && apiKey.length > 0) {
    if (err.message.includes(apiKey)) {
      err.message = err.message.split(apiKey).join('havadis_***');
    }
  }
  return err;
}
