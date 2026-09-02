import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ESM-only + `require(esm)` consumers: a top-level await in the shipped
 * bundle would throw ERR_REQUIRE_ASYNC_MODULE in every CJS consumer.
 * Cheap source-level gate; runs on dist so it checks what actually ships.
 */
const offenders = [];
for (const file of readdirSync('dist')) {
  if (!file.endsWith('.mjs')) continue;
  const source = readFileSync(join('dist', file), 'utf8');
  // Strip strings/comments crudely; TLA in our own output is not subtle.
  if (/^\s*await\s|[;{}()\n]\s*await\s/m.test(source) && !/async/.test(source.split('await')[0] ?? '')) {
    // Verify: await outside any function — search for module-level await.
    if (/(^|\n)(?![^\n]*(?:function|=>|async))[^\n]*\bawait\b/.test(source)) {
      offenders.push(file);
    }
  }
}
if (offenders.length > 0) {
  console.error(`Top-level await found in: ${offenders.join(', ')}`);
  process.exit(1);
}
console.log('No top-level await in dist output.');
