import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/browser-shim.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node22.18',
});
