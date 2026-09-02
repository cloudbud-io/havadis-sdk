/**
 * Framework-neutral SSG example: dump every published content as a JSON
 * file your static site generator (Astro, Eleventy, Next SSG, Hugo via
 * data files…) renders at build time.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { Havadis } from '@havadis/sdk';

const havadis = new Havadis({ apiKey: process.env.HAVADIS_API_KEY! });
const scope = havadis.brand(process.env.HAVADIS_BRAND_ID!);

async function main(): Promise<void> {
  await mkdir('content-out', { recursive: true });
  let count = 0;
  for await (const item of scope.contents.list({ status: 'published' })) {
    const detail = await scope.contents.get(item.id);
    await writeFile(
      `content-out/${detail.slug || detail.id}.json`,
      JSON.stringify(
        {
          title: detail.title,
          body: detail.body,
          seo: detail.seo_metadata,
          faq: detail.aeo_metadata.faq_items,
          jsonLd: detail.geo_metadata.structured_data,
          cover: detail.cover_image_url,
          publishedAt: detail.published_at,
        },
        null,
        2,
      ),
    );
    count += 1;
  }
  console.log(`exported ${count} published content file(s) to content-out/`);
}

void main();
