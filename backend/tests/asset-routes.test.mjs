import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
const module = await import("../router/assetRoutes.js").catch(() => ({}));
test("mounted assets authenticate before schema discovery and fail gracefully without migration", async () => {
  assert.equal(typeof module.createAssetRouter, "function");
  let queries = 0;
  const app = express();
  app.use(express.json());
  app.use(
    "/api/assets",
    module.createAssetRouter(
      {
        query: async () => {
          queries++;
          return [[]];
        },
      },
      (req, res, next) => {
        if (!req.headers.authorization) return res.sendStatus(403);
        req.user = { id: 1, role: "Admin" };
        next();
      },
    ),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/assets`;
    assert.equal((await fetch(url)).status, 403);
    assert.equal(queries, 0);
    for (const [path, method] of [
      ["", "GET"],
      ["", "POST"],
      ["/1", "GET"],
      ["/1", "PUT"],
      ["/1", "DELETE"],
    ]) {
      const res = await fetch(url + path, {
        method,
        headers: { Authorization: "fixture" },
      });
      assert.equal(res.status, 503);
      assert.equal((await res.json()).code, "ASSET_SCHEMA_REQUIRED");
    }
  } finally {
    await new Promise((r) => server.close(r));
  }
});
