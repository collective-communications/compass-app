import { join } from 'node:path';

const uiDir = join(import.meta.dir, 'ui');

const result = await Bun.build({
  entrypoints: [join(uiDir, 'src/main.ts')],
  outdir: join(uiDir, 'dist'),
  target: 'browser',
  format: 'esm',
  minify: false,
  sourcemap: 'linked',
});

if (!result.success) {
  console.error('[build-ui] failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`[build-ui] ${result.outputs.length} file(s) → ui/dist/`);
