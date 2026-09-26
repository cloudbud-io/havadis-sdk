import { describe, expect, it } from 'vitest';
import type { paths } from '../src/generated/openapi-types.js';
import type {
  ContentDetail,
  ContentSummary,
  Job,
  KeysetPage,
  Me,
  TopicRun,
  TopicSuggestion,
} from '../src/types.js';

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
type GeneratedTopic = Ok200<
  paths['/api/v1/brands/{brandId}/topics']['get']
>['data'][number];
type GeneratedTopicRun = Ok200<
  paths['/api/v1/brands/{brandId}/topics/runs/{runId}']['get']
>;

// Assignability both ways = the shapes agree.
type Extends<A, B> = A extends B ? true : never;
// Every field the API returns is modelled. Forward assignability alone lets
// a curated type silently lack a field the wire has.
type NoMissingKeys<Generated, Curated> = [
  Exclude<keyof Generated, keyof Curated>,
] extends [never]
  ? true
  : never;

const meForward: Extends<GeneratedMe, Me> = true;
const meBackward: Extends<Me, GeneratedMe> = true;
const detailForward: Extends<GeneratedContentDetail, ContentDetail> = true;
const listForward: Extends<GeneratedContentList, KeysetPage<ContentSummary>> =
  true;
const jobForward: Extends<GeneratedJob, Job> = true;
const created: Extends<GeneratedJobCreated, { id: string; status: string }> =
  true;
const topicForward: Extends<GeneratedTopic, TopicSuggestion> = true;
const runForward: Extends<GeneratedTopicRun, TopicRun> = true;
const jobKeys: NoMissingKeys<GeneratedJob, Job> = true;
const summaryKeys: NoMissingKeys<
  GeneratedContentList['data'][number],
  ContentSummary
> = true;
const topicKeys: NoMissingKeys<GeneratedTopic, TopicSuggestion> = true;
const runKeys: NoMissingKeys<GeneratedTopicRun, TopicRun> = true;

describe('generated ⇄ curated type drift', () => {
  it('compiles — the assertions above ARE the test', () => {
    const checks = [
      meForward,
      meBackward,
      detailForward,
      listForward,
      jobForward,
      created,
      topicForward,
      runForward,
      jobKeys,
      summaryKeys,
      topicKeys,
      runKeys,
    ];
    expect(checks.every((check) => check === true)).toBe(true);
  });
});
