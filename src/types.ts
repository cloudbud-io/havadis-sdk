/**
 * Hand-curated wire types for the /v1 façade, kept 1:1 with the OpenAPI
 * document committed at ./openapi.json (regenerate `generated/` and diff
 * on API upgrades). Response shapes are OPEN on purpose — the server may
 * add fields any day; request shapes list exactly what the API validates.
 */

export type ContentStatus = 'draft' | 'published';

/**
 * The shape a blog was written in when it is not a general post:
 * `use_case` is one product for one industry, from a product-page topic
 * run. Open — new formats may be added.
 */
export type ArticleFormat = 'use_case' | (string & {});

export interface ContentSummary {
  id: string;
  slug: string;
  title: string;
  content_type: string;
  /** The blog's article format; null on every other content. */
  article_format: ArticleFormat | null;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  cover_image_url: string | null;
}

export interface ContentDetail extends ContentSummary {
  summary: string;
  body: string;
  hashtags: string[];
  seo_metadata: {
    meta_title: string;
    meta_description: string;
    keywords: string[];
    slug: string;
  };
  aeo_metadata: {
    featured_snippet_target: string;
    faq_items: { question: string; answer: string }[];
  };
  geo_metadata: {
    citations: { source: string; claim: string }[];
    structured_data: Record<string, unknown>;
  };
}

export interface KeysetPage<T> {
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
  total?: number;
}

export interface Brand {
  id: string;
  name: string;
  website: string;
  industry: string;
  description: string;
  created_at: string;
}

export type JobStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed'
  | 'cancelled';

export interface JobPlatform {
  content_type: string;
  status: string;
  content_id: string | null;
  completed_at: string | null;
  failure_reason: string | null;
}

/** Which funnel created a job. Open — new funnels may be added. */
export type JobOrigin =
  | 'manual'
  | 'suggestion'
  | 'search_console'
  | 'bulk_plan'
  | 'ai_visibility'
  | 'meta_ads'
  | 'product_page'
  | (string & {});

/**
 * The origins a create request may state: funnels whose evidence the server
 * does not hold. Every other origin is derived by the server (pass
 * `suggestionId` to get a suggestion's).
 */
export type DeclarableJobOrigin = 'manual' | 'search_console' | 'meta_ads';

export interface Job {
  id: string;
  status: JobStatus | string;
  content_types: string[];
  platforms: JobPlatform[];
  /** Null on jobs created before origins were recorded. */
  origin: JobOrigin | null;
  /** The blog's article format, carried over from its suggestion. */
  article_format: ArticleFormat | null;
  created_at: string;
}

export interface CreateJobParams {
  contentTypes: string[];
  brief: string;
  keywords?: string[];
  language?: string;
  instructions?: string;
  styleUrls?: string[];
  researchUrls?: string[];
  targetPersonaId?: string | null;
  wordCountRange?: string | null;
  aiModelKey?: string | null;
  generateCoverImage?: boolean;
  coverImageReferenceUrl?: string | null;
  coverStyleTemplateKey?: string | null;
  viralOptions?: Record<string, unknown> | null;
  /** Ad creative runs/jobs: `{ objective, conceptCount }`; ignored for other types. */
  adOptions?: Record<string, unknown> | null;
  /**
   * Approve a topic suggestion into this job. The server marks it approved
   * and carries over what it promised: its article format (a product-page
   * suggestion is written as a use case), its origin, and the page it was
   * written from as a research source.
   */
  suggestionId?: string | null;
  /** Where the job came from, when the server cannot tell (no suggestion). */
  origin?: DeclarableJobOrigin | null;
  /** Re-run a failed job: links the two attempts and retires the old one. */
  recreatedFromJobId?: string | null;
}

/** What a focused discovery run was pointed at, as its suggestions report it. */
export type TopicFocus =
  | {
      source: 'ai_visibility';
      prompt_id: string;
      /** The question as it read when the run was launched. */
      question: string;
      language: string;
    }
  | {
      source: 'product_page';
      url: string;
      note: string | null;
      /** What the run understood the page to offer; null if it could not tell. */
      product: {
        name: string;
        category: string | null;
        summary: string;
      } | null;
    };

export interface TopicSuggestion {
  id: string;
  status: 'pending' | 'approved' | 'dismissed';
  title: string;
  short_description: string;
  rationale: string;
  suggested_brief: string;
  suggested_keywords: string[];
  content_type: string;
  language: string;
  /**
   * The industry or audience a product-page suggestion targets, with how
   * well the product fits it (0..1). Null on other suggestions.
   */
  segment: { label: string; fit_score: number } | null;
  /** The format a blog approved from this suggestion is written in. */
  article_format: ArticleFormat | null;
  /** Null for a brand-wide run. */
  focus: TopicFocus | null;
  created_at: string;
}

/** Where a discovery run is. `completed` and `failed` are terminal. */
export type TopicRunStatus =
  | 'pending'
  | 'preparing'
  | 'thinking'
  | 'finalizing'
  | 'completed'
  | 'failed';

export interface TopicRun {
  run_id: string;
  status: TopicRunStatus | (string & {});
  content_type: string;
  /**
   * Why a failed run failed, as a stable code — e.g.
   * `product_page_unreadable` when the product page could not be read.
   * Null otherwise; the raw provider message is never exposed.
   */
  error_code: string | null;
  /** True once a failed run's charge has been returned. */
  credits_refunded: boolean;
  /** The suggestions it produced; read them with `topics.list()`. */
  suggestion_ids: string[];
  created_at: string;
  updated_at: string;
}

/** What to point a discovery run at. Omit for a brand-wide run. */
export type SuggestTopicsFocus =
  | {
      /**
       * One product or service page: it is read, and each suggestion targets
       * one industry segment with a fit score. Blogs approved from them are
       * written as use-case articles. Must be a public http(s) page.
       */
      source: 'product_page';
      url: string;
      /** Optional steer, e.g. "focus on small veterinary clinics". */
      note?: string | null;
    }
  | {
      /** One of the brand's AI-visibility questions. */
      source: 'ai_visibility';
      promptId: string;
    };

export interface SuggestTopicsParams {
  contentType?: string;
  language?: string;
  targetPersonaId?: string | null;
  generateCoverImage?: boolean;
  coverImageReferenceUrl?: string | null;
  coverStyleTemplateKey?: string | null;
  viralOptions?: Record<string, unknown> | null;
  /** Ad creative runs/jobs: `{ objective, conceptCount }`; ignored for other types. */
  adOptions?: Record<string, unknown> | null;
  focus?: SuggestTopicsFocus | null;
}

export interface PublishParams {
  title?: string;
  contentHtml?: string;
  coverImageUrl?: string;
}

export interface PublishResult {
  published: boolean;
  warnings: string[];
}

export interface Me {
  tenant: { id: string; name: string; slug: string; plan: string };
  api_key: { prefix: string; label: string; scopes: string[] };
  limits: { rate_limit_per_minute: number; daily_credit_cap: number };
}

export interface Credits {
  balance: number | null;
  is_unlimited: boolean;
  plan: string;
  daily_credit_cap: number;
}

/**
 * The site-refresh ping Havadis sends a connected website when content is
 * published or taken down (see docs/webhooks.md). Read it with
 * `verifyWebhook<SiteRefreshEvent>(...)`.
 */
export interface SiteRefreshEvent {
  event: 'content.published' | 'content.unpublished' | (string & {});
  contentId: string;
  contentType: string;
  /** A blog's article format (`use_case`); null on everything else. */
  articleFormat: ArticleFormat | null;
  slug: string;
  /** Sent with `content.published`. */
  title?: string;
}
