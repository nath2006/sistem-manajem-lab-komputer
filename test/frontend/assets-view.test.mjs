import test from "node:test";
import assert from "node:assert/strict";
const m = await import("../../frontend/src/features/AsetIT/assetView.js").catch(() => ({}));
test("asset view distinguishes zero price from unknown and builds nullable procurement payloads", () => {
  assert.equal(typeof m.assetPayload, "function");
  assert.equal(m.displayPrice(null), "-");
  assert.equal(m.displayPrice(""), "-");
  assert.match(m.displayPrice("0.00"), /0/);
  const values = m.assetPayload({
    nama_perangkat: "Printer",
    penggunaan: "Operasional",
    kategori: "Printer",
    lab_id: "",
    tahun_pengadaan: " ",
    sumber_dana: "",
    harga_beli: "",
  });
  assert.equal(values.lab_id, null);
  assert.equal(values.tahun_pengadaan, null);
  assert.equal(values.sumber_dana, null);
  assert.equal(values.harga_beli, null);
  assert.equal(m.assetPayload({ ...values, harga_beli: "0" }).harga_beli, "0");
});
test("asset row write controls use assigned learning lab, not just Head role", () => {
  assert.equal(m.canWriteAsset({ role: "Guru" }, {}), false);
  assert.equal(m.canWriteAsset({ role: "Admin" }, {}), true);
  assert.equal(
    m.canWriteAsset(
      { role: "Kepala Lab", lab_id_kepala: 2 },
      { penggunaan: "Pembelajaran", lab_id: 2 },
    ),
    true,
  );
  assert.equal(
    m.canWriteAsset(
      { role: "Kepala Lab", lab_id_kepala: 2 },
      { penggunaan: "Pembelajaran", lab_id: 3 },
    ),
    false,
  );
  assert.equal(
    m.canWriteAsset(
      { role: "Kepala Lab", lab_id_kepala: 2 },
      { penggunaan: "Operasional", lab_id: null },
    ),
    false,
  );
});
