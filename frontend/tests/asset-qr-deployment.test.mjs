import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("QR page base path follows Vite deployment base and private asset responses are not cached", async () => {
  const app = await readFile(
    new URL("../src/App.jsx", import.meta.url),
    "utf8",
  );
  assert.match(app, /basename=\{import\.meta\.env\?\.BASE_URL \|\| "\/"\}/);
  const routes = await readFile(
    new URL("../../backend/router/assetRoutes.js", import.meta.url),
    "utf8",
  );
  assert.match(routes, /Cache-Control.*no-store/);
});
