import test from "node:test";
import assert from "node:assert/strict";
const module = await import("../../backend/utils/assetPolicy.js").catch(() => ({}));
test("asset procurement accepts blanks as null and preserves exact zero decimal", () => {
  assert.equal(typeof module.normalizeAsset, "function");
  const base = {
    nama_perangkat: "Printer TU",
    penggunaan: "Operasional",
    kategori: "Printer",
    lab_id: null,
  };
  const blank = module.normalizeAsset({
    ...base,
    tahun_pengadaan: "  ",
    sumber_dana: " ",
    harga_beli: "",
  });
  assert.equal(blank.tahun_pengadaan, null);
  assert.equal(blank.sumber_dana, null);
  assert.equal(blank.harga_beli, null);
  assert.equal(
    module.normalizeAsset({ ...base, harga_beli: "0" }).harga_beli,
    "0.00",
  );
});
const base = {
  nama_perangkat: "Router sekolah",
  penggunaan: "Operasional",
  kategori: "Perangkat Jaringan",
  lab_id: null,
};
test("asset input rejects unsafe fields, invalid numeric bounds and precision", () => {
  for (const fields of [
    { status: "Tidak dikenal" },
    { foto_perangkat: "x" },
    { user_id: 5 },
    { harga_beli: 0 },
    { harga_beli: "1e3" },
    { harga_beli: "1.001" },
    { harga_beli: "10000000000000" },
    { harga_beli: "-1" },
    { tahun_pengadaan: 0 },
    { tahun_pengadaan: "20.5" },
    { tahun_pengadaan: "1e3" },
    { tahun_pengadaan: 9999 },
    { kategori: "Router" },
    { penggunaan: "Other" },
    { lab_id: 1 },
    { nama_perangkat: " " },
    { nama_perangkat: "a".repeat(101) },
    { nomor_inventaris: "a".repeat(51) },
    { lokasi: 5 },
  ]) {
    assert.throws(
      () => module.normalizeAsset({ ...base, ...fields }),
      (error) => error.status === 400,
      JSON.stringify(fields),
    );
  }
  assert.equal(
    module.normalizeAsset({
      ...base,
      harga_beli: "9999999999999.99",
      tahun_pengadaan: "1900",
    }).harga_beli,
    "9999999999999.99",
  );
});
test("partial asset updates preserve omitted optional fields and allow explicit clearing", () => {
  const previous = {
    ...base,
    spesifikasi: "old",
    lokasi: "TU",
    nomor_inventaris: "A1",
    tahun_pengadaan: 2020,
    sumber_dana: "BOS",
    harga_beli: "0.00",
  };
  assert.deepEqual(module.normalizeAsset({ nama_perangkat: "New" }, previous), {
    ...previous,
    nama_perangkat: "New",
  });
  const cleared = module.normalizeAsset(
    { tahun_pengadaan: null, sumber_dana: "", harga_beli: null },
    previous,
  );
  assert.equal(cleared.harga_beli, null);
  assert.equal(cleared.tahun_pengadaan, null);
  assert.equal(cleared.sumber_dana, null);
  assert.throws(
    () =>
      module.normalizeAsset({
        ...base,
        penggunaan: "Pembelajaran",
        lab_id: null,
      }),
    (e) => e.status === 400,
  );
});
