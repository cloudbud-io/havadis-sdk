import { readFileSync } from 'node:fs';
import { FetchTransport } from '../dist/index.mjs';

/**
 * The User-Agent carries the SDK version into API logs, and it is the only
 * place a consumer's version reaches us. 0.1.0 and 0.1.1 both shipped it
 * hard-coded in transport.ts, so 0.1.1 introduced itself as 0.1.0 on every
 * request. tsdown's `define` now injects it.
 *
 * This drives the BUILT bundle with a stub fetch and reads the header back,
 * rather than grepping dist for a string: the bundler is free to keep the
 * template literal and hoist the version into a const, which a text match
 * would call a failure.
 */
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const expected = `havadis-sdk/${version} (node)`;

let sent = null;
const transport = new FetchTransport({
  apiKey: `havadis_check123_${'0'.repeat(32)}`,
  baseUrl: 'https://api.example.invalid',
  fetch: async (_url, init) => {
    sent = init.headers['user-agent'];
    return new Response('{}', { headers: { 'content-type': 'application/json' } });
  },
});
await transport.request({ method: 'GET', path: '/api/v1/me' });

if (sent !== expected) {
  console.error(
    `dist sends User-Agent "${sent}" but package.json is ${version} ` +
      `(expected "${expected}").\n` +
      'The tsdown `define` for __SDK_VERSION__ did not reach the bundle.',
  );
  process.exit(1);
}
console.log(`User-Agent in dist matches package.json: ${expected}`);
