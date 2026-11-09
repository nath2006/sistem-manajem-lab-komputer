import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import flowbiteReact from "flowbite-react/plugin/vite";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const api = new URL(env.VITE_BASE_URL || '/api', env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:5000');
  const assets = new URL(env.VITE_ASSET_BASE_URL || api.origin, api.origin);
  const apiPath = api.pathname.replace(/\/$/, '');
  const assetPath = assets.pathname.replace(/\/$/, '');

  return {
    // Development stays same-origin: a phone must not call its own localhost.
    // Production keeps its explicitly configured endpoints.
    define: command === 'serve' ? {
      'import.meta.env.VITE_BASE_URL': JSON.stringify('/api'),
      'import.meta.env.VITE_ASSET_BASE_URL': 'window.location.origin',
    } : {},
    server: {
      port: 5174,
      host: true,
      proxy: {
        '/api': {
          target: api.origin,
          changeOrigin: true,
          rewrite: path => apiPath + path.slice('/api'.length),
        },
        '/uploads': {
          target: assets.origin,
          changeOrigin: true,
          rewrite: path => assetPath + path,
        },
      },
    },
    plugins: [react(), tailwindcss(), flowbiteReact()],
  };
})
