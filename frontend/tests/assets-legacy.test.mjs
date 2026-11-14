import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("legacy edit form preserves null operational lab and treats maintenance status as read-only", async () => {
  const edit = await readFile(
    new URL("../src/Components/Perangkat/EditPerangkat.jsx", import.meta.url),
    "utf8",
  );
  assert.match(edit, /setIsOperational\(perangkat\.lab_id === null\)/);
  assert.match(edit, /!isOperational && !formData\.lab_id/);
  for (const file of ["EditPerangkat", "AddPerangkat"]) {
    const src = await readFile(
      new URL(`../src/Components/Perangkat/${file}.jsx`, import.meta.url),
      "utf8",
    );
    const tag = src.match(/<select id="status"[\s\S]*?>/)[0];
    assert.match(tag, /disabled/);
  }
});
