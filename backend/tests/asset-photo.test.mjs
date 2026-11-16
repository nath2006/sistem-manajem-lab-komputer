import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
test("legacy device uploads have distinct owned filenames so failed writes cannot remove an existing photo", async () => {
  const previous = process.cwd();
  const directory = await mkdtemp(
    resolve(
      process.env.TMPDIR ||
        resolve(homedir(), "AppData/Local/hermes/cache/scratch"),
      "assets-upload-",
    ),
  );
  process.chdir(directory);
  const { multerUpload } = await import("../utils/multer.js");
  const app = express();
  app.post("/", multerUpload.single("foto_perangkat"), (req, res) =>
    res.json({ filename: req.file.filename }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    const names = [];
    for (let i = 0; i < 2; i++) {
      const body = new FormData();
      body.set("nama_perangkat", "Same device");
      body.set(
        "foto_perangkat",
        new Blob(["synthetic"], { type: "image/png" }),
        "photo.png",
      );
      const r = await fetch(`http://127.0.0.1:${server.address().port}`, {
        method: "POST",
        body,
      });
      assert.equal(r.status, 200);
      names.push((await r.json()).filename);
    }
    assert.notEqual(names[0], names[1]);
    assert.ok(names.every((n) => /\.png$/.test(n)));
  } finally {
    await new Promise((r) => server.close(r));
    process.chdir(previous);
    await rm(directory, { recursive: true, force: true });
  }
});
