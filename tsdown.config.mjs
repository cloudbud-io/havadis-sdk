import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsdown';

// The published version is injected into the User-Agent at build time, so
// `npm version` alone keeps it truthful — a hard-coded string silently
// misreports every release after the first in API logs.
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

export default defineConfig({
  entry: ['src/index.ts', 'src/browser-shim.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node22.18',
  define: { __SDK_VERSION__: JSON.stringify(version) },
});
