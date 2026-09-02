import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Havadis } from '../src/client.js';

/**
 * The default origin is the one setting no integrator ever passes: the
 * README quickstart, every doc snippet and `examples/` all construct
 * `new Havadis({ apiKey })`. 0.1.0 shipped with it pointing at
 * gethavadis.co, which serves the app and proxies nothing under /api —
 * so every first call 404'd while the whole test suite stayed green.
 *
 * This ties the default to `servers[0].url` in the committed spec, which
 * the API emits from the same value the runtime serves.
 */

const spec = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8')) as {
  servers: { url: string }[];
};

describe('default base URL', () => {
  it('matches servers[0].url in the committed openapi.json', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } }));
    const client = new Havadis({
      apiKey: `havadis_abcd1234_${'s'.repeat(32)}`,
      fetch: fetchMock as never,
    });

    await client.me.get();

    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${spec.servers[0]!.url}/api/v1/me`);
  });

  it('declares an origin only — the paths carry /api/v1', () => {
    expect(spec.servers[0]!.url).toMatch(/^https:\/\/[^/]+$/);
  });
});
