// Opt-in QR verification runner: schema-only clone and synthetic data, never source writes.
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { reviewEnvironment } from "./start-review.mjs";
import { processExited } from "./qr-review-state.mjs";
assert.ok(
  process.argv.includes("--create-isolated") &&
    process.argv
      .slice(2)
      .every((a) => ["--create-isolated", "--browser"].includes(a)),
  "Use --create-isolated [--browser]",
);
assert.ok(process.env.TMPDIR, "Explicit scratch TMPDIR required");
const backend = resolve(dirname(fileURLToPath(import.meta.url)), "../../../backend");
process.chdir(backend);
const { default: source } = await import("../../../backend/config/db.js");
const quote = (n) => "`" + n.replaceAll("`", "``") + "`";
const database =
  "simlab_review_" + new Date().toISOString().replace(/\D/g, "").slice(0, 14);
assert.match(database, /^simlab_review_\d{14}$/);
const directory = resolve(process.env.TMPDIR, "qr-evidence");
await mkdir(directory, { recursive: true });
const session = resolve(directory, "session.json"),
  marker = resolve(directory, "browser-done.json");
const result = {
  database,
  checks: [],
  complete: false,
  source_unchanged: false,
  original_unchanged: false,
  server_stopped: false,
};
const check = (name, ok = true) => {
  assert.ok(ok, name);
  result.checks.push({ name, passed: true });
};
let target, original, child, before, originalBefore;
async function fingerprint(c) {
  const [tables] = await c.query(
    "SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",
  );
  const schemas = [],
    hash = createHash("sha256");
  for (const { name } of tables) {
    const [[ddl]] = await c.query("SHOW CREATE TABLE " + quote(name));
    const [rows] = await c.query("SELECT * FROM " + quote(name));
    const digest = createHash("sha256")
      .update(JSON.stringify(rows.map((r) => JSON.stringify(r)).sort()))
      .digest("hex");
    schemas.push([name, ddl["Create Table"]]);
    hash.update(
      JSON.stringify([name, ddl["Create Table"], digest, rows.length]),
    );
  }
  return { schemas, hash: hash.digest("hex") };
}
async function migration() {
  const sql = await readFile(
    resolve(backend, "migrations/20261115_asset_qr.sql"),
    "utf8",
  );
  for (const statement of sql
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean))
    await target.query(statement);
}
try {
  before = await fingerprint(source);
  const [[selected]] = await source.query("SELECT DATABASE() name");
  result.configured_source_database = selected.name;
  const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    timezone: "Z",
  };
  result.original_database = "sistem-manajemen-lab-fix";
  original = await mysql.createConnection({
    ...config,
    database: result.original_database,
  });
  originalBefore = await fingerprint(original);
  assert.notEqual(database, selected.name);
  assert.notEqual(database, result.original_database);
  target = await mysql.createConnection(config);
  await target.query(
    `CREATE DATABASE ${quote(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await target.changeUser({ database });
  const [[chosen]] = await target.query("SELECT DATABASE() name");
  assert.equal(chosen.name, database);
  await target.query("SET FOREIGN_KEY_CHECKS=0");
  for (const [, ddl] of before.schemas) await target.query(ddl);
  await target.query("SET FOREIGN_KEY_CHECKS=1");
  // Deterministic pre-QR state, only inside this freshly CREATEd empty allowlisted clone.
  const [qrColumns] = await target.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' AND COLUMN_NAME='qr_public_id'",
  );
  if (qrColumns.length)
    await target.query("ALTER TABLE perangkat DROP COLUMN qr_public_id");
  const password = randomBytes(24).toString("hex"),
    hash = await bcrypt.hash(password, 4),
    users = {},
    tokens = {};
  for (const [key, role] of [
    ["admin", "Admin"],
    ["head", "Kepala Lab"],
    ["other", "Kepala Lab"],
    ["teacher", "Guru"],
    ["tech", "Teknisi"],
    ["manager", "Koordinator Lab"],
  ]) {
    const [u] = await target.query(
      "INSERT INTO user(username,password,nama_lengkap,email,role) VALUES(?,?,?,?,?)",
      [
        `qr_${key}`,
        hash,
        `QR synthetic ${key}`,
        `qr_${key}@example.invalid`,
        role,
      ],
    );
    users[key] = u.insertId;
  }
  const [lab] = await target.query(
    "INSERT INTO laboratorium(nama_lab,lokasi,kapasitas,kepala_lab_id) VALUES(?,?,?,?)",
    ["QR synthetic lab", "Synthetic", 20, users.head],
  );
  const [legacy] = await target.query(
    "INSERT INTO perangkat(nama_perangkat,lab_id,nomor_inventaris,penggunaan,kategori,spesifikasi,tahun_pengadaan,sumber_dana,harga_beli) VALUES(?,?,?,?,?,?,?,?,?)",
    [
      "QR synthetic <script>neverHTML</script>",
      lab.insertId,
      "QR-LEGACY",
      "Pembelajaran",
      "Komputer",
      "CPU 8 core\nRAM 16 GB <img onerror=alert(1)>",
      2020,
      "PRIVATE_BOS",
      "0.00",
    ],
  );
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  child = spawn(process.execPath, ["index.js"], {
    cwd: backend,
    env: reviewEnvironment(process.env, { database, port }),
    stdio: "ignore",
  });
  result.port = port;
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(origin + "/")).ok) {
        ready = true;
        break;
      }
    } catch {}
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  check("owned fixture starts with both database overrides", ready);
  async function request(
    path,
    { actor = null, method = "GET", body, status = 200 } = {},
  ) {
    const r = await fetch(origin + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(actor ? { Authorization: `Bearer ${tokens[actor]}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await r.json().catch(() => ({}));
    assert.equal(r.status, status, `${method} ${path} status ${r.status}`);
    return { json, response: r };
  }
  for (const key of Object.keys(users)) {
    const r = await request("/auth/login", {
      method: "POST",
      body: { username: `qr_${key}`, password },
    });
    tokens[key] = r.json.token;
    assert.ok(tokens[key]);
  }
  check("six synthetic identities log in over real HTTP");
  await request("/assets", { actor: "admin" });
  await request("/assets/" + legacy.insertId, { actor: "teacher" });
  check("Feature1 remains available without QR schema");
  const unavailable = await request("/asset-qr/" + randomUUID(), {
    status: 503,
  });
  check(
    "only QR guarded when unmigrated",
    unavailable.json.code === "QR_SCHEMA_REQUIRED",
  );
  await migration();
  await migration();
  check("additive QR migration executes twice");
  const [[old]] = await target.query(
    "SELECT qr_public_id FROM perangkat WHERE perangkat_id=?",
    [legacy.insertId],
  );
  check("migration never backfills UUID on read", old.qr_public_id === null);
  for (const actor of ["teacher", "tech", "manager", "other"])
    await request("/asset-qr/issue/" + legacy.insertId, {
      method: "POST",
      actor,
      status: 403,
    });
  check("role and cross-lab issuers rejected");
  const issued = await Promise.all(
    Array.from({ length: 8 }, () =>
      request("/asset-qr/issue/" + legacy.insertId, {
        actor: "head",
        method: "POST",
      }),
    ),
  );
  const publicId = issued[0].json.data.public_id;
  check(
    "eight concurrent issuers return one stable UUID",
    issued.every((r) => r.json.data.public_id === publicId) &&
      /^[a-f0-9-]{36}$/.test(publicId),
  );
  const created = (
    await request("/assets", {
      actor: "admin",
      method: "POST",
      status: 201,
      body: {
        nama_perangkat: "QR synthetic Printer TU",
        penggunaan: "Operasional",
        kategori: "Printer",
        nomor_inventaris: "QR-NEW",
      },
    })
  ).json.data;
  const next = (
    await request("/asset-qr/issue/" + created.perangkat_id, {
      actor: "admin",
      method: "POST",
    })
  ).json.data.public_id;
  check("new assets issue distinct IDs", next !== publicId);
  try {
    await target.query(
      "UPDATE perangkat SET qr_public_id=? WHERE perangkat_id=?",
      [publicId, created.perangkat_id],
    );
    assert.fail("unique index did not reject");
  } catch (e) {
    assert.equal(e.code, "ER_DUP_ENTRY");
  }
  check("database rejects duplicate UUID");
  await new Promise((r) => setTimeout(r, 200));
  const publicBefore = await fingerprint(target);
  const allowed = [
    "perangkat_id",
    "nama_perangkat",
    "spesifikasi",
    "nomor_inventaris",
    "status",
    "penggunaan",
    "kategori",
    "lokasi",
    "nama_lab",
  ].sort();
  for (const actor of [null, "admin", "teacher"]) {
    const r = await request(
      "/asset-qr/" + publicId + "?include=financial&private=true",
      { actor },
    );
    assert.deepEqual(Object.keys(r.json.data).sort(), allowed);
    assert.match(r.response.headers.get("cache-control"), /no-store/);
    assert.ok(!JSON.stringify(r.json).includes("PRIVATE_BOS"));
  }
  await new Promise((r) => setTimeout(r, 200));
  check(
    "public GET with and without Authorization is strictly readonly including audit",
    publicBefore.hash === (await fingerprint(target)).hash,
  );
  await request("/asset-qr/1", { status: 400 });
  await request("/asset-qr/" + randomUUID(), { status: 404 });
  await request("/asset-qr/" + publicId + "/private", { status: 403 });
  check("invalid unknown and unauthenticated private statuses");
  for (const actor of Object.keys(users)) {
    const r = await request("/asset-qr/" + publicId + "/private", { actor });
    assert.equal(r.json.data.harga_beli, "0.00");
    assert.equal(r.json.data.sumber_dana, "PRIVATE_BOS");
    assert.match(r.response.headers.get("cache-control"), /no-store/);
  }
  check(
    "every authenticated role reads private procurement separately no-store",
  );
  const repeated = await request("/asset-qr/issue/" + legacy.insertId, {
    actor: "admin",
    method: "POST",
  });
  check(
    "reissue preserves original token",
    repeated.json.data.public_id === publicId,
  );
  result.public_id = publicId;
  result.asset_id = legacy.insertId;
  result.second_public_id = next;
  if (process.argv.includes("--browser")) {
    await unlink(marker).catch(() => {});
    await writeFile(
      session,
      JSON.stringify({
        database,
        origin,
        publicId,
        assetId: legacy.insertId,
        secondPublicId: next,
        token: tokens.admin,
        teacherToken: tokens.teacher,
        userId: users.admin,
      }),
    );
    console.log("QR browser fixture ready; scratch session only.");
    let complete = false;
    for (let i = 0; i < 1200; i++) {
      try {
        const done = JSON.parse(await readFile(marker, "utf8"));
        if (done.database === database) {
          complete = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    check("browser completion marker received", complete);
  }
  result.complete = true;
} finally {
  await unlink(session).catch(() => {});
  if (child) {
    child.kill();
    await Promise.race([
      once(child, "exit"),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
    result.server_stopped = processExited(child);
  }
  if (before) {
    const after = await fingerprint(source);
    result.source_before = before.hash;
    result.source_after = after.hash;
    result.source_unchanged = before.hash === after.hash;
  }
  if (originalBefore) {
    const after = await fingerprint(original);
    result.original_before = originalBefore.hash;
    result.original_after = after.hash;
    result.original_unchanged = after.hash === originalBefore.hash;
  }
  if (target) await target.end();
  if (original) await original.end();
  await source.end();
  await writeFile(
    resolve(directory, "http.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      database,
      checks: result.checks.length,
      complete: result.complete,
      source_unchanged: result.source_unchanged,
      original_unchanged: result.original_unchanged,
      server_stopped: result.server_stopped,
    }),
  );
}
