import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const scratch = process.env.TMPDIR;
if (!scratch) throw Error("Explicit TMPDIR scratch path required.");
const server = await createServer({
  root,
  resolve: { dedupe: ['react', 'react-dom'] },
  configFile: false,
  envFile: false,
  cacheDir: resolve(scratch, `assets-vite-${randomUUID()}`),
  plugins: [react(), tailwind()],
  define: {
    "import.meta.env.VITE_BASE_URL": JSON.stringify("/api"),
    "import.meta.env.VITE_ASSET_BASE_URL": JSON.stringify(""),
  },
  server: { host: "127.0.0.1", port: 5197, strictPort: true },
});
await server.listen();
console.log(
  "ASSET_FIXTURE_READY http://127.0.0.1:5197/test/frontend/fixtures/assets.html",
);
for (const event of ["SIGTERM", "SIGINT"])
  process.on(event, async () => {
    await server.close();
    process.exit(0);
  });
