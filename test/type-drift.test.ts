import { describe, expect, it } from 'vitest';
import type { paths } from '../src/generated/openapi-types.js';
import type { ContentDetail, Job, KeysetPage, ContentSummary, Me } from '../src/types.js';

/**
 * Compile-time drift guard between the hand-curated ergonomic types and
 * the types GENERATED from the committed openapi.json. Regenerate with
 * `npm run generate:types` after an API upgrade; if a wire field moved,
 * these aliases stop compiling before any runtime test runs.
 */

type Ok200<T> = T extends {
  responses: { 200: { content: { 'application/json': infer B } } };
}
  ? B
  : never;
type Ok202<T> = T extends {
  responses: { 202: { content: { 'application/json': infer B } } };
}
  ? B
  : never;

type GeneratedMe = Ok200<paths['/api/v1/me']['get']>;
type GeneratedContentList = Ok200<
  paths['/api/v1/brands/{brandId}/contents']['get']
>;
type GeneratedContentDetail = Ok200<
  paths['/api/v1/brands/{brandId}/contents/{idOrSlug}']['get']
>;
type GeneratedJob = Ok200<
  paths['/api/v1/brands/{brandId}/jobs/{jobId}']['get']
>;
type GeneratedJobCreated = Ok202<paths['/api/v1/brands/{brandId}/jobs']['post']>;

// Assignability both ways = the shapes agree.
type Extends<A, B> = A extends B ? true : never;

const meForward: Extends<GeneratedMe, Me> = true;
const meBackward: Extends<Me, GeneratedMe> = true;
const detailForward: Extends<GeneratedContentDetail, ContentDetail> = true;
const listForward: Extends<GeneratedContentList, KeysetPage<ContentSummary>> =
  true;
const jobForward: Extends<GeneratedJob, Job> = true;
const created: Extends<GeneratedJobCreated, { id: string; status: string }> =
  true;

describe('generated ⇄ curated type drift', () => {
  it('compiles — the assertions above ARE the test', () => {
    expect([
      meForward,
      meBackward,
      detailForward,
      listForward,
      jobForward,
      created,
    ]).toEqual([true, true, true, true, true, true]);
  });
});
