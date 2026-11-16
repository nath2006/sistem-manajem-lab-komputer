import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("asset migration is additive guarded SQL and preserves nullable exact precision metadata", async () => {
  const sql = await readFile(
    new URL("../../backend/migrations/20261114_school_assets.sql", import.meta.url),
    "utf8",
  ).catch(() => "");
  assert.match(sql, /information_schema\.COLUMNS/);
  assert.match(sql, /MODIFY COLUMN lab_id INT NULL/i);
  assert.match(sql, /DECIMAL\(15,2\)/i);
  assert.match(sql, /DEFAULT ''Lainnya''/);
  assert.doesNotMatch(sql, /DROP\s+(TABLE|COLUMN)|ADD COLUMN IF NOT EXISTS/i);
});
test("Prisma asset model keeps existing identity with optional lab and nullable procurement", async () => {
  const schema = await readFile(
    new URL("../../backend/prisma/schema.prisma", import.meta.url),
    "utf8",
  );
  const body = schema.split("model perangkat {")[1].split("\n}")[0];
  assert.match(body, /lab_id\s+Int\?/);
  assert.match(body, /laboratorium\s+laboratorium\?/);
  assert.match(body, /harga_beli\s+Decimal\?\s+@db.Decimal\(15, 2\)/);
  assert.match(body, /kategori\s+perangkat_kategori\s+@default\(Lainnya\)/);
});
