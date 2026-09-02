import { describe, expect, it, vi } from 'vitest';
import { Havadis } from '../src/client.js';
import { verifyWebhook, WebhookVerificationError } from '../src/core/webhooks.js';
import { waitForJob } from '../src/core/poller.js';
import { paginate } from '../src/core/pagination.js';
import { JobFailedError } from '../src/core/errors.js';
import type { Transport } from '../src/core/transport.js';
import type { Job, KeysetPage } from '../src/types.js';
import { createHmac } from 'node:crypto';

const API_KEY = `havadis_abcd1234_${'s'.repeat(32)}`;

function fakeTransport(
  handler: (req: { method: string; path: string; query?: unknown; body?: unknown; idempotencyKey?: string }) => {
    status: number;
    body: unknown;
  },
): Transport & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    async request(req) {
      calls.push(req);
      const out = handler(req as never);
      return { status: out.status, body: out.body as never, headers: new Headers() };
    },
  };
}

describe('Havadis client', () => {
  it('refuses to boot where a window global exists (browser guard)', () => {
    (globalThis as { window?: unknown }).window = {};
    try {
      expect(() => new Havadis({ apiKey: API_KEY })).toThrow(/server-side only/);
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it('rejects keys that do not carry the documented shape', () => {
    expect(() => new Havadis({ apiKey: 'sk-something-else' })).toThrow(
      /havadis_/,
    );
  });

  it('jobs.create always sends an idempotency key (generated when absent)', async () => {
    const transport = fakeTransport(() => ({
      status: 202,
      body: { id: 'j1', status: 'pending' },
    }));
    const client = new Havadis({ apiKey: API_KEY, transport });

    await client.brand('b1').jobs.create({ contentTypes: ['blog'], brief: 'x' });
    await client
      .brand('b1')
      .jobs.create(
        { contentTypes: ['blog'], brief: 'x' },
        { idempotencyKey: 'mine-1' },
      );

    const [auto, explicit] = transport.calls as { idempotencyKey?: string }[];
    expect(auto!.idempotencyKey).toMatch(/[0-9a-f-]{36}/);
    expect(explicit!.idempotencyKey).toBe('mine-1');
  });

  it('brand scope routes to brand-prefixed paths', async () => {
    const transport = fakeTransport((req) => {
      if (req.path.endsWith('/contents')) {
        return {
          status: 200,
          body: { data: [], has_more: false, next_cursor: null },
        };
      }
      return { status: 200, body: {} };
    });
    const client = new Havadis({ apiKey: API_KEY, transport });

    await client.brand('b42').contents.listPage({ status: 'draft' });

    expect(transport.calls[0]).toMatchObject({
      method: 'GET',
      path: '/api/v1/brands/b42/contents',
      query: expect.objectContaining({ status: 'draft' }),
    });
  });
});

describe('paginate', () => {
  it('walks pages by next_cursor and stops on has_more=false', async () => {
    const pages: KeysetPage<number>[] = [
      { data: [1, 2], has_more: true, next_cursor: 'c1' },
      { data: [3], has_more: false, next_cursor: null },
    ];
    const seenCursors: (string | undefined)[] = [];
    const iterable = paginate<number>(async (cursor) => {
      seenCursors.push(cursor);
      return pages.shift()!;
    });

    const items: number[] = [];
    for await (const item of iterable) items.push(item);

    expect(items).toEqual([1, 2, 3]);
    expect(seenCursors).toEqual([undefined, 'c1']);
  });
});

describe('waitForJob', () => {
  const job = (status: string): Job =>
    ({ id: 'j1', status, content_types: [], platforms: [], origin: null, created_at: '' }) as Job;

  it('resolves on completed_with_warnings — warnings are success', async () => {
    const statuses = ['pending', 'running', 'completed_with_warnings'];
    const progress: string[] = [];

    const result = await waitForJob(
      async () => job(statuses.shift() ?? 'completed_with_warnings'),
      'j1',
      { pollIntervalMs: 1, onProgress: (j) => progress.push(j.status) },
    );

    expect(result.status).toBe('completed_with_warnings');
    expect(progress).toEqual(['pending', 'running', 'completed_with_warnings']);
  });

  it('throws a typed error carrying the final snapshot on failure', async () => {
    await expect(
      waitForJob(async () => job('failed'), 'j1', { pollIntervalMs: 1 }),
    ).rejects.toBeInstanceOf(JobFailedError);
  });
});

describe('verifyWebhook (Standard Webhooks v1)', () => {
  const secret = `whsec_${Buffer.from('super-secret').toString('base64')}`;
  const sign = (id: string, ts: string, payload: string) =>
    createHmac('sha256', Buffer.from('super-secret'))
      .update(`${id}.${ts}.${payload}`)
      .digest('base64');

  const now = new Date('2026-09-02T10:00:00Z');
  const ts = String(Math.floor(now.getTime() / 1000));
  const payload = JSON.stringify({ event: 'content.published', contentId: 'c1' });

  it('accepts a valid signature and returns the parsed payload', () => {
    const out = verifyWebhook<{ event: string }>(
      payload,
      {
        'webhook-id': 'msg_1',
        'webhook-timestamp': ts,
        'webhook-signature': `v1,${sign('msg_1', ts, payload)}`,
      },
      secret,
      { now },
    );
    expect(out.event).toBe('content.published');
  });

  it('accepts when ANY of several signatures matches (secret rotation)', () => {
    const good = sign('msg_1', ts, payload);
    expect(() =>
      verifyWebhook(
        payload,
        {
          'webhook-id': 'msg_1',
          'webhook-timestamp': ts,
          'webhook-signature': `v1,${Buffer.from('bad').toString('base64')} v1,${good}`,
        },
        secret,
        { now },
      ),
    ).not.toThrow();
  });

  it.each([
    [
      'tampered payload',
      () =>
        verifyWebhook(
          payload.replace('c1', 'c2'),
          {
            'webhook-id': 'msg_1',
            'webhook-timestamp': ts,
            'webhook-signature': `v1,${sign('msg_1', ts, payload)}`,
          },
          secret,
          { now },
        ),
    ],
    [
      'stale timestamp',
      () =>
        verifyWebhook(
          payload,
          {
            'webhook-id': 'msg_1',
            'webhook-timestamp': String(Number(ts) - 3600),
            'webhook-signature': `v1,${sign('msg_1', String(Number(ts) - 3600), payload)}`,
          },
          secret,
          { now },
        ),
    ],
    [
      'missing headers',
      () => verifyWebhook(payload, {}, secret, { now }),
    ],
  ])('rejects %s', (_name, run) => {
    expect(run).toThrow(WebhookVerificationError);
  });
});
