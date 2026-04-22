import { join } from 'node:path';

const uiDir = join(import.meta.dir, 'ui');

const result = await Bun.build({
  entrypoints: [join(uiDir, 'src/app.tsx')],
  outdir: join(uiDir, 'dist'),
  root: join(uiDir, 'src'),
  target: 'browser',
  format: 'esm',
  splitting: true,
  minify: false,
  sourcemap: 'linked',
});

if (!result.success) {
  console.error('[build-ui] bundle failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`[build-ui] ${result.outputs.length} file(s) → ui/dist/`);
