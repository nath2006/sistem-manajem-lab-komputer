import { build } from 'esbuild';
import { createRequire } from 'node:module';
import process from 'node:process';
const require = createRequire(import.meta.url);

export async function renderUI(contents) {
  const result = await build({
    stdin: { contents, loader: 'jsx', resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'cjs', write: false,
    jsx: 'automatic', loader: { '.png': 'dataurl' },
    external: ['react', 'react-dom/server', 'react-router-dom'],
    define: { 'import.meta.env': JSON.stringify({ PROD: true, DEV: false, VITE_BASE_URL: 'http://example.invalid/api' }) },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}
