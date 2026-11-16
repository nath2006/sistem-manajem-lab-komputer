import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../.."),
  scratch = process.env.TMPDIR;
if (!scratch) throw Error("Explicit scratch TMPDIR required");
const sessionPath = resolve(scratch, "qr-evidence/session.json");
const session = JSON.parse(await readFile(sessionPath, "utf8"));
const server = await createServer({
  root,
  resolve: { dedupe: ['react', 'react-dom'] },
  configFile: false,
  envFile: false,
  cacheDir: resolve(scratch, "qr-vite-" + randomUUID()),
  plugins: [
    react(),
    tailwind(),
    {
      name: "isolated-qr-session",
      configureServer(s) {
        s.middlewares.use("/__qr_session", async (req, res) => {
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Content-Type", "application/json");
          res.end(await readFile(sessionPath, "utf8"));
        });
      },
    },
  ],
  define: {
    "import.meta.env.VITE_BASE_URL": JSON.stringify("/api"),
    "import.meta.env.VITE_ASSET_BASE_URL": JSON.stringify(""),
  },
  server: {
    host: "127.0.0.1",
    port: 5198,
    strictPort: true,
    proxy: { "/api": { target: session.origin, changeOrigin: true } },
  },
});
await server.listen();
console.log("QR_FIXTURE_READY http://127.0.0.1:5198/test/frontend/fixtures/qr.html");
for (const event of ["SIGTERM", "SIGINT"])
  process.on(event, async () => {
    await server.close();
    process.exit(0);
  });
