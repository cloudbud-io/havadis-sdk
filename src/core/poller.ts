import {
  JobCancelledError,
  JobFailedError,
  JobTimeoutError,
  TopicRunFailedError,
  TopicRunTimeoutError,
} from './errors.js';
import type { Job, TopicRun } from '../types.js';
import { sleep } from './sleep.js';

export interface WaitOptions<T> {
  /** Called after every poll with the latest snapshot. */
  onProgress?: (snapshot: T) => void;
  signal?: AbortSignal;
  /** Base poll interval; backs off gently up to 4× while waiting. */
  pollIntervalMs?: number;
  /** Overall deadline. */
  timeoutMs?: number;
}

export type WaitForOptions = WaitOptions<Job>;
export type WaitForRunOptions = WaitOptions<TopicRun>;

const DEFAULT_POLL_MS = 3_000;
const DEFAULT_JOB_TIMEOUT_MS = 15 * 60 * 1000;
/** Discovery is a 10–30 second job; the server itself calls 3 minutes stuck. */
const DEFAULT_RUN_TIMEOUT_MS = 5 * 60 * 1000;

/** What a poll decided: stop with this snapshot, or keep waiting. */
type Settled<T> = { done: true; value: T } | { done: false };

/**
 * The one polling loop behind every `waitFor*`: fetch, report, let `settle`
 * decide (finish, throw, or keep going), back off, respect the deadline and
 * the abort signal.
 */
async function pollUntil<T>(
  fetchSnapshot: () => Promise<T>,
  settle: (snapshot: T) => Settled<T>,
  onTimeout: () => Error,
  options: WaitOptions<T>,
  defaultTimeoutMs: number,
): Promise<T> {
  const pollMs = options.pollIntervalMs ?? DEFAULT_POLL_MS;
  const deadline = Date.now() + (options.timeoutMs ?? defaultTimeoutMs);
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snapshot = await fetchSnapshot();
    options.onProgress?.(snapshot);
    const settled = settle(snapshot);
    if (settled.done) return settled.value;
    if (Date.now() >= deadline) throw onTimeout();
    const delay = Math.min(pollMs * (1 + attempt * 0.5), pollMs * 4);
    attempt += 1;
    await sleep(delay, options.signal);
  }
}

/**
 * Poll until the job reaches a terminal state. `completed` AND
 * `completed_with_warnings` are both SUCCESS — warnings mean a
 * non-critical step (QA, scraping, AEO/GEO) degraded while the content
 * itself was generated; the caller reads them off the returned job.
 * `failed`/`cancelled` throw typed errors carrying the final snapshot.
 */
export function waitForJob(
  fetchJob: () => Promise<Job>,
  jobId: string,
  options: WaitForOptions = {},
): Promise<Job> {
  return pollUntil(
    fetchJob,
    (job) => {
      switch (job.status) {
        case 'completed':
        case 'completed_with_warnings':
          return { done: true, value: job };
        case 'failed':
          throw new JobFailedError(jobId, job);
        case 'cancelled':
          throw new JobCancelledError(jobId, job);
        default:
          return { done: false };
      }
    },
    () => new JobTimeoutError(jobId),
    options,
    DEFAULT_JOB_TIMEOUT_MS,
  );
}

/**
 * Poll a topic discovery run until it finishes. `completed` resolves with
 * the run (its `suggestion_ids` name what it produced); `failed` throws
 * `TopicRunFailedError`, which carries the run's stable `error_code` — e.g.
 * `product_page_unreadable` — and whether its credits were refunded.
 */
export function waitForTopicRun(
  fetchRun: () => Promise<TopicRun>,
  runId: string,
  options: WaitForRunOptions = {},
): Promise<TopicRun> {
  return pollUntil(
    fetchRun,
    (run) => {
      if (run.status === 'completed') return { done: true, value: run };
      if (run.status === 'failed') throw new TopicRunFailedError(runId, run);
      return { done: false };
    },
    () => new TopicRunTimeoutError(runId),
    options,
    DEFAULT_RUN_TIMEOUT_MS,
  );
}
