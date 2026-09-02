/**
 * Framework-neutral cron example: once a week, pick the newest pending
 * topic suggestion, generate a blog post from it, publish to the site.
 * Run with any scheduler (cron, systemd timer, GitHub Action).
 */
import { Havadis, DailySpendCapError } from '@havadis/sdk';

const havadis = new Havadis({ apiKey: process.env.HAVADIS_API_KEY! });
const brandId = process.env.HAVADIS_BRAND_ID!;
const scope = havadis.brand(brandId);

async function main(): Promise<void> {
  const [topic] = await scope.topics.list({ status: 'pending', limit: 1 });
  const brief =
    topic?.suggested_brief ??
    'A weekly roundup post for our audience based on recent brand activity.';

  try {
    const job = await scope.jobs.createAndWait(
      {
        contentTypes: ['blog'],
        brief,
        keywords: topic?.suggested_keywords,
        language: topic?.language,
        // A stable key makes THIS cron run idempotent even if the host
        // restarts and re-executes it.
        // (Same ISO week → same key → server replays, no double charge.)
      },
      {
        idempotencyKey: `weekly-post-${isoWeek(new Date())}`,
        onProgress: (j) => console.log(`job ${j.id}: ${j.status}`),
      },
    );

    const contentId = job.platforms.find((p) => p.content_id)?.content_id;
    if (contentId) {
      const result = await scope.contents.publish(contentId);
      console.log('published', contentId, 'warnings:', result.warnings);
    }
  } catch (err) {
    if (err instanceof DailySpendCapError) {
      console.log(`Spend cap hit — retry in ${err.retryAfterSeconds}s`);
      return;
    }
    throw err;
  }
}

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

void main();
