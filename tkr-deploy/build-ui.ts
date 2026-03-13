import { join } from 'node:path';

const uiDir = join(import.meta.dir, 'ui');

// Discover screen modules so they become separate chunks for dynamic import()
const screenGlob = new Bun.Glob('src/{screens,provider-screens}/*.ts');
const screenEntrypoints = [...screenGlob.scanSync({ cwd: uiDir, absolute: true })];

const result = await Bun.build({
  entrypoints: [join(uiDir, 'src/main.ts'), ...screenEntrypoints],
  outdir: join(uiDir, 'dist'),
  root: join(uiDir, 'src'),
  target: 'browser',
  format: 'esm',
  splitting: true,
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
