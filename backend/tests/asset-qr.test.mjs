import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
const mod = await import("../router/assetQrRoutes.js").catch(() => ({}));
const uuid = "cbd402ef-c02e-42a3-b090-26311c541d14";
const safe = {
  perangkat_id: 7,
  nama_perangkat: "Printer <script>",
  spesifikasi: "Plain specs",
  nomor_inventaris: "INV7",
  status: "Baik",
  penggunaan: "Operasional",
  kategori: "Printer",
  lokasi: null,
  nama_lab: null,
};
async function fixture(db, run) {
  assert.equal(typeof mod.createAssetQrRouter, "function", "QR router exists");
  const app = express();
  app.use(express.json());
  app.use(
    "/api/asset-qr",
    mod.createAssetQrRouter(db, (req, res, next) => {
      if (!req.headers.authorization) return res.sendStatus(403);
      req.user = { id: 1, role: req.headers.authorization };
      next();
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    await run(`http://127.0.0.1:${server.address().port}/api/asset-qr`);
  } finally {
    await new Promise((r) => server.close(r));
  }
}
const columns = [
  { COLUMN_TYPE: "char(36)", IS_NULLABLE: "YES", COLLATION_NAME: "ascii_bin" },
];
const indexes = [
  {
    INDEX_NAME: "uq_perangkat_qr_public_id",
    NON_UNIQUE: 0,
    COLUMN_NAME: "qr_public_id",
    SEQ_IN_INDEX: 1,
  },
];
function dbFor(rows = [safe]) {
  const sql = [];
  return {
    sql,
    query: async (q) => {
      sql.push(q);
      if (q.includes("information_schema.COLUMNS")) return [columns];
      if (q.includes("information_schema.STATISTICS")) return [indexes];
      return [rows];
    },
  };
}
test("public verification is strictly projected and ignores include/auth flags without any mutation", async () => {
  const db = dbFor([
    {
      ...safe,
      qr_public_id: uuid,
      tahun_pengadaan: 2020,
      sumber_dana: "PRIVATE",
      harga_beli: "123",
      email: "private@example.invalid",
      created_by: 1,
      password: "SECRET",
    },
  ]);
  await fixture(db, async (url) => {
    const res = await fetch(
      url + "/" + uuid + "?include=financial&private=true",
      { headers: { Authorization: "Admin" } },
    );
    assert.equal(res.status, 200);
    assert.match(res.headers.get("cache-control"), /no-store/);
    assert.deepEqual((await res.json()).data, safe);
  });
  assert.ok(db.sql.every((q) => /^SELECT\b/.test(q)));
  assert.ok(db.sql.every((q) => !q.includes("SELECT *")));
});
test("invalid IDs fail before SQL; unknown UUID is 404; unmigrated schema is controlled 503", async () => {
  const db = dbFor([]);
  await fixture(db, async (url) => {
    for (const id of ["1", "null", "cbd402ef-c02e-12a3-b090-26311c541d14"])
      assert.equal((await fetch(url + "/" + id)).status, 400);
    assert.equal(db.sql.length, 0);
    assert.equal((await fetch(url + "/" + uuid)).status, 404);
  });
  await fixture({ query: async () => [[]] }, async (url) => {
    const r = await fetch(url + "/" + uuid);
    assert.equal(r.status, 503);
    assert.equal((await r.json()).code, "QR_SCHEMA_REQUIRED");
  });
});
test("issuer is authenticated/scoped, row-locked and stable, rolling back on failures", async () => {
  let stored = null,
    commits = 0,
    rollbacks = 0,
    releases = 0;
  const db = dbFor();
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => commits++,
    rollback: async () => rollbacks++,
    release: () => releases++,
    query: async (q, args) => {
      db.sql.push(q);
      if (q.startsWith("SELECT") && q.includes("perangkat"))
        return [
          [
            {
              perangkat_id: 7,
              penggunaan: "Operasional",
              lab_id: null,
              qr_public_id: stored,
            },
          ],
        ];
      if (q.startsWith("UPDATE")) {
        assert.match(q, /qr_public_id IS NULL/);
        assert.equal(args[1], 7);
        stored = args[0];
        return [{ affectedRows: 1 }];
      }
      throw Error("unexpected SQL");
    },
  });
  await fixture(db, async (url) => {
    assert.equal(
      (await fetch(url + "/issue/7", { method: "POST" })).status,
      403,
    );
    for (const role of ["Guru", "Teknisi", "Koordinator Lab", "Kepala Lab"])
      assert.equal(
        (
          await fetch(url + "/issue/7", {
            method: "POST",
            headers: { Authorization: role },
          })
        ).status,
        403,
      );
    for (let i = 0; i < 2; i++) {
      const r = await fetch(url + "/issue/7", {
        method: "POST",
        headers: { Authorization: "Admin" },
      });
      assert.equal(r.status, 200);
      const data = (await r.json()).data;
      assert.match(
        data.public_id,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      assert.equal(data.public_id, stored);
    }
  });
  assert.equal(db.sql.filter((q) => q.startsWith("UPDATE")).length, 1);
  assert.ok(db.sql.some((q) => q.includes("FOR UPDATE")));
  assert.equal(commits, 2);
  assert.equal(rollbacks, 1);
  assert.equal(releases, 3);
});
test("private financial detail requires authentication and is never cacheable", async () => {
  const db = dbFor([
    { ...safe, tahun_pengadaan: 2020, sumber_dana: "BOS", harga_beli: "0.00" },
  ]);
  await fixture(db, async (url) => {
    assert.equal((await fetch(url + "/" + uuid + "/private")).status, 403);
    for (const role of [
      "Admin",
      "Kepala Lab",
      "Guru",
      "Koordinator Lab",
      "Teknisi",
    ]) {
      const r = await fetch(url + "/" + uuid + "/private", {
        headers: { Authorization: role },
      });
      assert.equal(r.status, 200);
      assert.match(r.headers.get("cache-control"), /no-store/);
      assert.equal((await r.json()).data.harga_beli, "0.00");
    }
  });
});
test("review migration is additive/idempotent and QR router is mounted", async () => {
  const migration = await readFile(
    new URL("../migrations/20261115_asset_qr.sql", import.meta.url),
    "utf8",
  ).catch(() => "");
  assert.match(migration, /DATABASE\(\) REGEXP '\^simlab_review_/);
  assert.match(
    migration,
    /ADD COLUMN qr_public_id CHAR\(36\) CHARACTER SET ascii COLLATE ascii_bin NULL/,
  );
  assert.match(
    migration,
    /ADD UNIQUE INDEX uq_perangkat_qr_public_id \(qr_public_id\)/,
  );
  assert.match(migration, /information_schema.COLUMNS/);
  assert.match(migration, /information_schema.STATISTICS/);
  assert.doesNotMatch(migration, /DROP|MODIFY|UPDATE perangkat|UUID\(/i);
  const server = await readFile(
    new URL("../index.js", import.meta.url),
    "utf8",
  );
  assert.match(
    server,
    /app.use\('\/api\/asset-qr', createAssetQrRouter\(db, verifyToken\)\)/,
  );
});
test("authenticated identity lookup is read-only and does not issue a missing QR", async () => {
  const db = dbFor([{ perangkat_id: 7, qr_public_id: null }]);
  await fixture(db, async (url) => {
    assert.equal((await fetch(url + "/identity/7")).status, 403);
    const r = await fetch(url + "/identity/7", {
      headers: { Authorization: "Guru" },
    });
    assert.equal(r.status, 200);
    assert.deepEqual((await r.json()).data, {
      perangkat_id: 7,
      public_id: null,
    });
  });
  assert.ok(db.sql.every((q) => q.startsWith("SELECT")));
});
test("OpenAPI public schema cannot contain private fields and declares unauthenticated read", async () => {
  const api = JSON.parse(
    await readFile(new URL("../../docs/openapi.json", import.meta.url), "utf8"),
  );
  const read = api.paths["/api/asset-qr/{publicId}"]?.get;
  assert.ok(read, "public QR operation documented");
  assert.deepEqual(read.security, []);
  const fields = api.components.schemas.AssetQrPublic.properties;
  assert.deepEqual(Object.keys(fields).sort(), Object.keys(safe).sort());
  assert.equal(
    api.components.schemas.AssetQrPublic.additionalProperties,
    false,
  );
  for (const path of [
    "/api/asset-qr/{publicId}/private",
    "/api/asset-qr/identity/{id}",
    "/api/asset-qr/issue/{id}",
  ])
    assert.ok(api.paths[path]);
});
test("wrong QR column or nonunique/composite index is rejected", async () => {
  for (const [c, i] of [
    [[{ ...columns[0], COLUMN_TYPE: "varchar(36)" }], indexes],
    [columns, [{ ...indexes[0], NON_UNIQUE: 1 }]],
    [
      columns,
      [
        ...indexes,
        { ...indexes[0], COLUMN_NAME: "perangkat_id", SEQ_IN_INDEX: 2 },
      ],
    ],
  ]) {
    await fixture(
      { query: async (q) => [q.includes("COLUMNS") ? c : i] },
      async (url) => assert.equal((await fetch(url + "/" + uuid)).status, 503),
    );
  }
});
