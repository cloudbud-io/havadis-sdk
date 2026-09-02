import { ensureIdempotencyKey } from '../core/idempotency.js';
import { paginate, type ListOptions } from '../core/pagination.js';
import { waitForJob, type WaitForOptions } from '../core/poller.js';
import {
  requestOrThrow,
  type Transport,
} from '../core/transport.js';
import type {
  Brand,
  ContentDetail,
  ContentStatus,
  ContentSummary,
  CreateJobParams,
  Credits,
  Job,
  KeysetPage,
  Me,
  PublishParams,
  PublishResult,
  SuggestTopicsParams,
  TopicSuggestion,
} from '../types.js';

/**
 * Resource layer: one tiny class per API noun, every call going through
 * the transport's single request throat. A new endpoint is a new method
 * here + (if new-nouned) one line in `client.ts` — nothing else moves.
 */

abstract class BaseResource {
  constructor(protected readonly transport: Transport) {}
}

export class MeResource extends BaseResource {
  get(options?: { signal?: AbortSignal }): Promise<Me> {
    return requestOrThrow(this.transport, {
      method: 'GET',
      path: '/api/v1/me',
      signal: options?.signal,
    });
  }
}

export class CreditsResource extends BaseResource {
  get(options?: { signal?: AbortSignal }): Promise<Credits> {
    return requestOrThrow(this.transport, {
      method: 'GET',
      path: '/api/v1/credits',
      signal: options?.signal,
    });
  }
}

export class BrandsResource extends BaseResource {
  async list(options?: { signal?: AbortSignal }): Promise<Brand[]> {
    const res = await requestOrThrow<{ data: Brand[] }>(this.transport, {
      method: 'GET',
      path: '/api/v1/brands',
      signal: options?.signal,
    });
    return res.data;
  }

  get(brandId: string, options?: { signal?: AbortSignal }): Promise<Brand> {
    return requestOrThrow(this.transport, {
      method: 'GET',
      path: `/api/v1/brands/${brandId}`,
      signal: options?.signal,
    });
  }
}

export interface ListContentsOptions extends ListOptions {
  status?: ContentStatus | 'all';
  includeTotal?: boolean;
}

export class ContentsResource extends BaseResource {
  constructor(
    transport: Transport,
    private readonly brandId: string,
  ) {
    super(transport);
  }

  listPage(options: ListContentsOptions = {}): Promise<KeysetPage<ContentSummary>> {
    return requestOrThrow(this.transport, {
      method: 'GET',
      path: `/api/v1/brands/${this.brandId}/contents`,
      query: {
        status: options.status,
        limit: options.limit,
        cursor: options.cursor,
        include_total: options.includeTotal ? 1 : undefined,
      },
      signal: options.signal,
    });
  }

  /** Auto-paginating iterator: `for await (const c of brand.contents.list())` */
  list(options: Omit<ListContentsOptions, 'cursor'> = {}) {
    return paginate<ContentSummary>((cursor) =>
      this.listPage({ ...options, cursor }),
    );
  }

  get(
    idOrSlug: string,
    options?: { signal?: AbortSignal },
  ): Promise<ContentDetail> {
    return requestOrThrow(this.transport, {
      method: 'GET',
      path: `/api/v1/brands/${this.brandId}/contents/${encodeURIComponent(idOrSlug)}`,
      signal: options?.signal,
    });
  }

  publish(
    contentId: string,
    params: PublishParams = {},
    options?: { signal?: AbortSignal },
  ): Promise<PublishResult> {
    return requestOrThrow(this.transport, {
      method: 'POST',
      path: `/api/v1/brands/${this.brandId}/contents/${contentId}/publish`,
      body: { channel: 'custom_website', ...params },
      signal: options?.signal,
    });
  }

  unpublish(
    contentId: string,
    options?: { signal?: AbortSignal },
  ): Promise<PublishResult> {
    return requestOrThrow(this.transport, {
      method: 'POST',
      path: `/api/v1/brands/${this.brandId}/contents/${contentId}/unpublish`,
      body: { channel: 'custom_website' },
      signal: options?.signal,
    });
  }
}

export class JobsResource extends BaseResource {
  constructor(
    transport: Transport,
    private readonly brandId: string,
  ) {
    super(transport);
  }

  /**
   * Queues generation (HTTP 202). An Idempotency-Key is REQUIRED by the
   * API; one is generated per call unless you pass your own — supply an
   * explicit key when YOUR system may retry across restarts.
   */
  create(
    params: CreateJobParams,
    options?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<Pick<Job, 'id' | 'status'>> {
    return requestOrThrow(this.transport, {
      method: 'POST',
      path: `/api/v1/brands/${this.brandId}/jobs`,
      body: params,
      idempotencyKey: ensureIdempotencyKey(options?.idempotencyKey),
      signal: options?.signal,
    });
  }

  get(jobId: string, options?: { signal?: AbortSignal }): Promise<Job> {
    return requestOrThrow(this.transport, {
      method: 'GET',
      path: `/api/v1/brands/${this.brandId}/jobs/${jobId}`,
      signal: options?.signal,
    });
  }

  listPage(options: ListOptions = {}): Promise<KeysetPage<Job>> {
    return requestOrThrow(this.transport, {
      method: 'GET',
      path: `/api/v1/brands/${this.brandId}/jobs`,
      query: { limit: options.limit, cursor: options.cursor },
      signal: options.signal,
    });
  }

  list(options: Omit<ListOptions, 'cursor'> = {}) {
    return paginate<Job>((cursor) => this.listPage({ ...options, cursor }));
  }

  costPreview(
    params: { contentTypes: string[] },
    options?: { signal?: AbortSignal },
  ): Promise<{ costs: Record<string, number> }> {
    return requestOrThrow(this.transport, {
      method: 'POST',
      path: `/api/v1/brands/${this.brandId}/jobs/cost-preview`,
      body: params,
      signal: options?.signal,
    });
  }

  /** Polls until terminal; `completed_with_warnings` counts as success. */
  waitFor(jobId: string, options: WaitForOptions = {}): Promise<Job> {
    return waitForJob(
      () => this.get(jobId, { signal: options.signal }),
      jobId,
      options,
    );
  }

  async createAndWait(
    params: CreateJobParams,
    options?: WaitForOptions & { idempotencyKey?: string },
  ): Promise<Job> {
    const created = await this.create(params, {
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
    return this.waitFor(created.id, options);
  }
}

export class TopicsResource extends BaseResource {
  constructor(
    transport: Transport,
    private readonly brandId: string,
  ) {
    super(transport);
  }

  suggest(
    params: SuggestTopicsParams = {},
    options?: { idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<{ run_id: string; status: string; content_type: string }> {
    return requestOrThrow(this.transport, {
      method: 'POST',
      path: `/api/v1/brands/${this.brandId}/topics/suggest`,
      body: params,
      idempotencyKey: ensureIdempotencyKey(options?.idempotencyKey),
      signal: options?.signal,
    });
  }

  async list(
    options?: {
      status?: TopicSuggestion['status'];
      limit?: number;
      signal?: AbortSignal;
    },
  ): Promise<TopicSuggestion[]> {
    const res = await requestOrThrow<{ data: TopicSuggestion[] }>(
      this.transport,
      {
        method: 'GET',
        path: `/api/v1/brands/${this.brandId}/topics`,
        query: { status: options?.status, limit: options?.limit },
        signal: options?.signal,
      },
    );
    return res.data;
  }
}

/** Everything scoped to one brand — `client.brand(id)`. */
export class BrandScope {
  readonly contents: ContentsResource;
  readonly jobs: JobsResource;
  readonly topics: TopicsResource;

  constructor(transport: Transport, brandId: string) {
    this.contents = new ContentsResource(transport, brandId);
    this.jobs = new JobsResource(transport, brandId);
    this.topics = new TopicsResource(transport, brandId);
  }
}
