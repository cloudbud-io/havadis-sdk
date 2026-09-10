/**
 * Hand-curated wire types for the /v1 façade, kept 1:1 with the OpenAPI
 * document committed at ./openapi.json (regenerate `generated/` and diff
 * on API upgrades). Response shapes are OPEN on purpose — the server may
 * add fields any day; request shapes list exactly what the API validates.
 */

export type ContentStatus = 'draft' | 'published';

export interface ContentSummary {
  id: string;
  slug: string;
  title: string;
  content_type: string;
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

export interface Job {
  id: string;
  status: JobStatus | string;
  content_types: string[];
  platforms: JobPlatform[];
  origin: string | null;
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
}

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
  created_at: string;
}

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
