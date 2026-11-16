// Opt-in schema-only clone; NEVER migrates or writes to the source database.
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { reviewEnvironment } from "./start-review.mjs";
import { legacySchemaPlan } from "./assets-review-baseline.mjs";
if (
  !process.argv.includes("--create-isolated") ||
  process.argv
    .slice(2)
    .some((arg) => !["--create-isolated", "--browser"].includes(arg))
)
  throw Error("Use --create-isolated [--browser].");
const backend = resolve(dirname(fileURLToPath(import.meta.url)), "../../../backend");
process.chdir(backend);
const { default: source } = await import("../../../backend/config/db.js");
const quote = (name) => "`" + name.replaceAll("`", "``") + "`";
const database = `simlab_review_${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
assert.match(database, /^simlab_review_\d{14}$/);
if (!process.env.TMPDIR) throw Error("Explicit TMPDIR scratch path required.");
const output = resolve(process.env.TMPDIR, "assets-http-review-result.json");
const result = {
  database,
  checks: [],
  completed: false,
  source_unchanged: false,
  server_stopped: false,
};
const check = (name, condition = true) => {
  assert.ok(condition, name);
  result.checks.push({ name, passed: true });
};
let target, child, before, original, originalBefore, fresh = false;
async function fingerprint(connection = source) {
  const [tables] = await connection.query(
    "SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",
  );
  const schemas = [],
    hash = createHash("sha256");
  for (const { name } of tables) {
    const [[ddl]] = await connection.query(`SHOW CREATE TABLE ${quote(name)}`);
    const [rows] = await connection.query(`SELECT * FROM ${quote(name)}`);
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
async function migrate(file) {
  const sql = await readFile(resolve(backend, "migrations", file), "utf8");
  for (const statement of sql
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await target.query(statement);
}
try {
  before = await fingerprint();
  const [[selected]] = await source.query("SELECT DATABASE() name");
  result.configured_source_database = selected.name;
  result.original_database = 'sistem-manajemen-lab-fix';
  original = await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:result.original_database,timezone:'Z'});
  originalBefore = await fingerprint(original);
  assert.notEqual(database, selected.name);
  target = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    timezone: "Z",
  });
  await target.query(
    `CREATE DATABASE ${quote(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  fresh = true;
  await target.changeUser({ database });
  await target.query("SET FOREIGN_KEY_CHECKS=0");
  for (const [, ddl] of before.schemas) await target.query(ddl);
  await target.query("SET FOREIGN_KEY_CHECKS=1");
  const [[chosen]] = await target.query('SELECT DATABASE() name');
  const [columns] = await target.query("SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,COLUMN_COMMENT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat'");
  const [keys] = await target.query("SELECT k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,r.DELETE_RULE,r.UPDATE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME AND r.TABLE_NAME=k.TABLE_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME='perangkat' AND k.COLUMN_NAME='lab_id' AND k.REFERENCED_TABLE_NAME IS NOT NULL");
  const baseline = legacySchemaPlan({database,selected:chosen.name,source:selected.name,fresh},columns,keys);
  for (const ddl of baseline) {
    const [[guard]] = await target.query('SELECT DATABASE() name');
    assert.equal(guard.name,database);
    assert.notEqual(guard.name,selected.name);
    await target.query(ddl);
  }
  check('fresh isolated clone explicitly prepared as legacy schema before seed');
  for (const file of [
    "20261102_school_settings_activity_logs.sql",
    "20261103_service_tickets.sql",
  ])
    await migrate(file);
  const password = randomBytes(24).toString("hex"),
    hash = await bcrypt.hash(password, 4),
    users = {},
    tokens = {};
  for (const [key, role] of [
    ["admin", "Admin"],
    ["head", "Kepala Lab"],
    ["other", "Kepala Lab"],
    ["manager", "Koordinator Lab"],
    ["tech", "Teknisi"],
    ["teacher", "Guru"],
  ]) {
    const username = `asset_${key}`;
    const [row] = await target.query(
      "INSERT INTO user (username,password,nama_lengkap,email,role) VALUES (?,?,?,?,?)",
      [username, hash, username, `${username}@example.invalid`, role],
    );
    users[key] = { id: row.insertId, username };
  }
  const lab = async (name, head) =>
    (
      await target.query(
        "INSERT INTO laboratorium (nama_lab,lokasi,kapasitas,kepala_lab_id) VALUES (?,?,?,?)",
        [name, "Synthetic", 20, head],
      )
    )[0].insertId;
  const mainLab = await lab("Asset review lab", users.head.id),
    otherLab = await lab("Other lab", users.other.id);
  await target.query(
    "INSERT INTO perangkat(nama_perangkat,lab_id,nomor_inventaris) VALUES (?,?,?)",
    ["Legacy synthetic", mainLab, "LEGACY"],
  );
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const env = reviewEnvironment(process.env, { database, port });
  child = spawn(process.execPath, ["index.js"], {
    cwd: backend,
    env,
    stdio: "ignore",
  });
  const origin = `http://127.0.0.1:${port}`;
  result.review_port = port;
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(origin + "/")).ok) {
        ready = true;
        break;
      }
    } catch {}
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  check("owned backend starts using both isolated DB overrides", ready);
  async function request(
    path,
    { method = "GET", actor = "admin", body, status = 200 } = {},
  ) {
    const response = await fetch(origin + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(actor ? { Authorization: `Bearer ${tokens[actor]}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = await response.json().catch(() => ({}));
    assert.equal(
      response.status,
      status,
      `${method} ${path}: expected ${status} got ${response.status} (${json.message || ""})`,
    );
    return json;
  }
  for (const [key, u] of Object.entries(users)) {
    tokens[key] = (
      await request("/auth/login", {
        actor: null,
        method: "POST",
        body: { username: u.username, password },
      })
    ).token;
    assert.ok(tokens[key]);
  }
  check("all role accounts log in over real HTTP");
  // Before migration this must be a controlled response, never a startup failure.
  const unavailable = await request("/assets", { status: 503 });
  check(
    "unmigrated assets return schema-required 503",
    unavailable.code === "ASSET_SCHEMA_REQUIRED",
  );
  await migrate("20261114_school_assets.sql");
  await migrate("20261114_school_assets.sql");
  const [[legacy]] = await target.query(
    "SELECT * FROM perangkat WHERE nomor_inventaris=?",
    ["LEGACY"],
  );
  check(
    "migration reruns preserve identity and conservative legacy defaults",
    legacy.penggunaan === "Pembelajaran" &&
      legacy.kategori === "Lainnya" &&
      legacy.tahun_pengadaan === null &&
      legacy.harga_beli === null,
  );
  const [fk] = await target.query(
    "SELECT DELETE_RULE,UPDATE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='fk_perangkat_lab'",
  );
  check(
    "lab FK rules and int type preserved",
    fk[0].DELETE_RULE === "RESTRICT" && fk[0].UPDATE_RULE === "CASCADE",
  );
  const base = {
    nama_perangkat: "Printer TU",
    penggunaan: "Operasional",
    kategori: "Printer",
    lab_id: null,
    lokasi: "Tata usaha",
    nomor_inventaris: "ASSET-001",
    tahun_pengadaan: " ",
    sumber_dana: "",
    harga_beli: null,
  };
  const asset = (
    await request("/assets", { method: "POST", body: base, status: 201 })
  ).data;
  assert.ok(asset.perangkat_id);
  const [[stored]] = await target.query(
    "SELECT * FROM perangkat WHERE perangkat_id=?",
    [asset.perangkat_id],
  );
  check(
    "real operational asset persists null lab and nullable procurement",
    stored.lab_id === null &&
      stored.tahun_pengadaan === null &&
      stored.sumber_dana === null &&
      stored.harga_beli === null &&
      stored.status === "Baik",
  );
  await request("/assets", { actor: null, status: 403 });
  for (const actor of Object.keys(users)) {
    const rows = (await request("/assets", { actor })).data;
    assert.ok(rows.some((r) => r.perangkat_id === asset.perangkat_id));
    await request(`/assets/${asset.perangkat_id}`, { actor });
  }
  check("all authenticated roles can read assets and details");
  for (const actor of ["manager", "tech", "teacher", "head"])
    await request("/assets", {
      actor,
      method: "POST",
      body: { ...base, nomor_inventaris: `DENIED-${actor}` },
      status: 403,
    });
  check("operational writes restricted to Admin");
  const learning = {
    ...base,
    nama_perangkat: "AP belajar",
    nomor_inventaris: "ASSET-002",
    penggunaan: "Pembelajaran",
    kategori: "Perangkat Jaringan",
    lab_id: mainLab,
    harga_beli: "0",
  };
  const owned = (
    await request("/assets", {
      actor: "head",
      method: "POST",
      body: learning,
      status: 201,
    })
  ).data;
  await request("/assets", {
    actor: "head",
    method: "POST",
    body: { ...learning, nomor_inventaris: "OTHER", lab_id: otherLab },
    status: 403,
  });
  await request(`/assets/${owned.perangkat_id}`, {
    actor: "other",
    method: "PUT",
    body: { nama_perangkat: "stolen" },
    status: 403,
  });
  await request(`/assets/${owned.perangkat_id}`, {
    actor: "head",
    method: "PUT",
    body: { lab_id: otherLab },
    status: 403,
  });
  await request(`/assets/${owned.perangkat_id}`, {
    actor: "head",
    method: "PUT",
    body: { penggunaan: "Operasional", lab_id: null },
    status: 403,
  });
  check(
    "Head Lab writes limited to current and destination assigned learning lab",
  );
  const zero = (await request(`/assets/${owned.perangkat_id}`)).data;
  check(
    "zero price serialized as decimal string, not unknown",
    zero.harga_beli === "0.00",
  );
  await request(`/assets/${owned.perangkat_id}`, {
    method: "PUT",
    body: {
      sumber_dana: "BOS",
      tahun_pengadaan: "2020",
      harga_beli: "9999999999999.99",
    },
  });
  await request(`/assets/${owned.perangkat_id}`, {
    method: "PUT",
    body: { nama_perangkat: "Updated AP" },
  });
  const preserved = (await request(`/assets/${owned.perangkat_id}`)).data;
  check(
    "omitted update procurement preserves exact decimal and year",
    preserved.harga_beli === "9999999999999.99" &&
      preserved.tahun_pengadaan === 2020 &&
      preserved.sumber_dana === "BOS",
  );
  await request(`/assets/${owned.perangkat_id}`, {
    method: "PUT",
    body: { sumber_dana: null, tahun_pengadaan: "", harga_beli: " " },
  });
  const [[cleared]] = await target.query(
    "SELECT sumber_dana,tahun_pengadaan,harga_beli FROM perangkat WHERE perangkat_id=?",
    [owned.perangkat_id],
  );
  check(
    "explicit clearing persists SQL NULLs",
    Object.values(cleared).every((v) => v === null),
  );
  for (const fields of [
    { status: "Baik" },
    { lab_id: mainLab },
    { tahun_pengadaan: 9999 },
    { tahun_pengadaan: "1e3" },
    { harga_beli: 0 },
    { harga_beli: "1e4" },
    { harga_beli: "1.001" },
    { harga_beli: "10000000000000" },
    { kategori: "Router" },
    { nama_perangkat: "a".repeat(101) },
    { nomor_inventaris: "x".repeat(51) },
    { unexpected: "x" },
  ])
    await request("/assets", {
      method: "POST",
      body: { ...base, ...fields },
      status: 400,
    });
  check("invalid fields bounds precision and status edit rejected via HTTP");
  await request("/assets", { method: "POST", body: base, status: 409 });
  check("duplicate inventory returns conflict");
  for (const id of ["0", "1e2", "-1", "2147483648"])
    await request("/assets/" + id, { status: 400 });
  await request("/assets/2147483647", { status: 404 });
  check("strict path IDs and missing assets controlled");
  // Existing maintenance workflows must still reach null-lab operational assets.
  const inspection = (
    await request("/pemeriksaan/create", {
      method: "POST",
      body: {
        perangkat_id: asset.perangkat_id,
        tanggal_pemeriksaan: "2026-01-01",
        hasil_pemeriksaan: "Bermasalah",
        catatan: "Synthetic asset fault",
      },
      status: 201,
    })
  ).data;
  check(
    "Admin inspection supports operational assets without lab",
    Boolean(inspection.pemeriksaan_id),
  );
  const inspections = (await request("/pemeriksaan")).data;
  assert.ok(inspections.some((r) => r.perangkat_id === asset.perangkat_id));
  const findings = (await request("/pengecekan")).data;
  check(
    "operational findings remain visible to technicians",
    findings.some((r) => r.perangkat_id === asset.perangkat_id),
  );
  const dashboard = (
    await request("/dashboard/teknisi/stats", { actor: "tech" })
  ).data;
  check(
    "existing technician queue includes operational faults",
    dashboard.antrian.some((r) => r.perangkat_id === asset.perangkat_id),
  );
  await request(`/perangkat/update/${asset.perangkat_id}`, {
    method: "PUT",
    body: {
      nama_perangkat: "Bypass",
      spesifikasi: "x",
      nomor_inventaris: "ASSET-001",
      lab_id: null,
      status: "Baik",
    },
    status: 409,
  });
  await request(`/perangkat/update/${legacy.perangkat_id}`, {
    actor: "other",
    method: "PUT",
    body: { nama_perangkat: "Crosslab", lab_id: otherLab, status: "Baik" },
    status: 403,
  });
  check(
    "legacy device API cannot bypass maintenance status or cross-lab authorization",
  );
  await request(`/assets/${asset.perangkat_id}`, {
    method: "PUT",
    body: { status: "Baik" },
    status: 400,
  });
  const preview = (await request(`/deletion/perangkat/${asset.perangkat_id}`))
    .data;
  check(
    "guarded preview retains operational asset history",
    !preview.can_delete && preview.blockers.length > 0,
  );
  await request(`/assets/${asset.perangkat_id}`, {
    method: "DELETE",
    status: 409,
  });
  await request(`/assets/${owned.perangkat_id}`, {
    actor: "other",
    method: "DELETE",
    status: 403,
  });
  await request(`/assets/${owned.perangkat_id}`, {
    actor: "head",
    method: "DELETE",
  });
  check(
    "Head Lab deletes only clean own-lab asset",
    (
      await target.query(
        "SELECT perangkat_id FROM perangkat WHERE perangkat_id=?",
        [owned.perangkat_id],
      )
    )[0].length === 0,
  );
  const finding=findings.find(r=>r.perangkat_id===asset.perangkat_id);
  await request('/perbaikan/create',{actor:'tech',method:'POST',body:{pengecekan_id:finding.pengecekan_id,tanggal_perbaikan:'2026-01-02',tindakan:'Synthetic failed repair',hasil_perbaikan:'Gagal'},status:201});
  check('existing repair workflow preserves operational fault state',(await request(`/assets/${asset.perangkat_id}`)).data.status==='Perlu Perbaikan');
  const retainedRepair=(await target.query('SELECT perbaikan_id FROM perbaikan WHERE pengecekan_id=?',[finding.pengecekan_id]))[0][0];
  await request(`/assets/${asset.perangkat_id}`,{method:'DELETE',status:409});
  check('asset deletion never cascades repair history',(await target.query('SELECT perbaikan_id FROM perbaikan WHERE perbaikan_id=?',[retainedRepair.perbaikan_id]))[0].length===1);
  const linked=(await request('/assets',{method:'POST',body:{...base,nomor_inventaris:'ASSET-TICKET'},status:201})).data;
  await request('/tickets',{actor:'teacher',method:'POST',body:{title:'Existing ticket asset link',description:'Synthetic compatibility verification',type:'incident',category:'hardware',impact:'medium',urgency:'medium',perangkat_id:linked.perangkat_id},status:201});
  const ticketPreview=(await request(`/deletion/perangkat/${linked.perangkat_id}`)).data;
  await request(`/assets/${linked.perangkat_id}`,{method:'DELETE',status:409});
  check('existing logical ticket reference blocks new asset DELETE',ticketPreview.blockers.some(b=>b.key==='service_tickets.perangkat_id'));
  const pub = await request("/perangkat");
  check(
    "legacy devices never expose procurement",
    pub.data.every(
      (r) =>
        !Object.hasOwn(r, "harga_beli") && !Object.hasOwn(r, "sumber_dana"),
    ),
  );
  // Preserve standard usable review accounts without exposing credentials.
  await new Promise((ok, no) => {
    const seed = spawn(process.execPath, ["../test/backend/scripts/seed-review.mjs"], {
      cwd: backend,
      env: { ...env, SEED_REVIEW_DATABASE: database },
      stdio: "ignore",
    });
    seed.once("error", no);
    seed.once("exit", (code) =>
      code === 0 ? ok() : no(Error("Review seed failed")),
    );
  });
  check("guarded standard review accounts initialized");
  if (process.argv.includes("--browser")) {
    const scratch = process.env.TMPDIR;
    if (!scratch)
      throw Error("Explicit TMPDIR required for browser verification.");
    await writeFile(
      resolve(scratch, "assets-browser-session.json"),
      JSON.stringify({
        origin,
        token: tokens.admin,
        user: {
          role: "Admin",
          userId: users.admin.id,
          fullName: "Review Admin",
          isAuthenticated: true,
          isLoading: false,
        },
        database,
        lab_id: mainLab,
      }),
    );
    console.log(
      "ASSETS_BROWSER_READY (isolated session stored privately in scratch)",
    );
    let finished = false;
    for (let i = 0; i < 3600; i++) {
      try {
        const done = JSON.parse(
          await readFile(resolve(scratch, "assets-browser-done.json"), "utf8"),
        );
        if (done.database === database && done.completed === true) {
          finished = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    check(
      "real browser integration completed before owned server shutdown",
      finished,
    );
    const [[row]] = await target.query(
      "SELECT lab_id,tahun_pengadaan,sumber_dana,harga_beli FROM perangkat WHERE nomor_inventaris=?",
      ["BROWSER-REAL-ASSET"],
    );
    check(
      "real browser add/edit explicit clearing verified in MySQL",
      row && Object.values(row).every((v) => v === null),
    );
  }
  result.completed = true;
} catch (error) {
  result.error =
    error.code && error.code !== "ERR_ASSERTION"
      ? `Review failed (${error.code})`
      : String(error.message).replace(/mysql:\/\/\S+/g, "[redacted]");
  process.exitCode = 1;
} finally {
  if (child) {
    const exited =
      child.exitCode === null ? once(child, "exit") : Promise.resolve();
    if (child.exitCode === null) child.kill();
    await exited;
    result.server_stopped = true;
  }
  if (before) {
    const after = await fingerprint();
    result.source_unchanged = before.hash === after.hash;
    result.source_fingerprint_before = before.hash;
    result.source_fingerprint_after = after.hash;
    if (!result.source_unchanged) process.exitCode = 1;
  }
  await target?.end();
  if (originalBefore) {
    const after = await fingerprint(original);
    result.original_unchanged = originalBefore.hash === after.hash;
    result.original_fingerprint_before = originalBefore.hash;
    result.original_fingerprint_after = after.hash;
    if (!result.original_unchanged) process.exitCode = 1;
  }
  await original?.end();
  await source.end();
  result.check_count = result.checks.length;
  result.verified =
    result.completed && result.source_unchanged && result.original_unchanged && result.server_stopped;
  if (process.argv.includes("--browser"))
    await unlink(
      resolve(process.env.TMPDIR, "assets-browser-session.json"),
    ).catch(() => {});
  await writeFile(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, evidence: output }, null, 2));
}
