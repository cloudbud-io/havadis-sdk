import {
  JobCancelledError,
  JobFailedError,
  JobTimeoutError,
} from './errors.js';
import type { Job } from '../types.js';
import { sleep } from './sleep.js';

export interface WaitForOptions {
  /** Called after every poll with the latest job snapshot. */
  onProgress?: (job: Job) => void;
  signal?: AbortSignal;
  /** Base poll interval; backs off gently up to 4× while queued. */
  pollIntervalMs?: number;
  /** Overall deadline. Default 15 minutes. */
  timeoutMs?: number;
}

const DEFAULT_POLL_MS = 3_000;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Poll until the job reaches a terminal state. `completed` AND
 * `completed_with_warnings` are both SUCCESS — warnings mean a
 * non-critical step (QA, scraping, AEO/GEO) degraded while the content
 * itself was generated; the caller reads them off the returned job.
 * `failed`/`cancelled` throw typed errors carrying the final snapshot.
 */
export async function waitForJob(
  fetchJob: () => Promise<Job>,
  jobId: string,
  options: WaitForOptions = {},
): Promise<Job> {
  const pollMs = options.pollIntervalMs ?? DEFAULT_POLL_MS;
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await fetchJob();
    options.onProgress?.(job);
    switch (job.status) {
      case 'completed':
      case 'completed_with_warnings':
        return job;
      case 'failed':
        throw new JobFailedError(jobId, job);
      case 'cancelled':
        throw new JobCancelledError(jobId, job);
      default:
        break;
    }
    if (Date.now() >= deadline) throw new JobTimeoutError(jobId);
    const delay = Math.min(pollMs * (1 + attempt * 0.5), pollMs * 4);
    attempt += 1;
    await sleep(delay, options.signal);
  }
}

