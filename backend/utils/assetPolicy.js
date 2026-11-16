export const ASSET_USES = Object.freeze(["Pembelajaran", "Operasional"]);
export const ASSET_CONDITIONS = Object.freeze(["Baik", "Rusak", "Perlu Perbaikan", "Dalam Perbaikan"]);
export function validateAssetCondition(value) {
  if (!ASSET_CONDITIONS.includes(value)) throw assetError(400, "Kondisi aset tidak valid.");
  return value;
}
export const ASSET_CATEGORIES = Object.freeze([
  "Komputer",
  "Laptop",
  "Monitor",
  "Printer",
  "Perangkat Jaringan",
  "Proyektor",
  "Lainnya",
]);
export function assetError(status, message, code) {
  return Object.assign(new Error(message), {
    status,
    ...(code ? { code } : {}),
  });
}
export const ASSET_FIELDS = Object.freeze([
  "nama_perangkat",
  "spesifikasi",
  "nomor_inventaris",
  "penggunaan",
  "kategori",
  "lab_id",
  "lokasi",
  "tahun_pengadaan",
  "sumber_dana",
  "harga_beli",
]);
const invalid = (field) => {
  throw assetError(400, `${field} tidak valid.`);
};
const blank = (value) =>
  value == null || (typeof value === "string" && !value.trim());
function text(value, field, max, required = false) {
  if (blank(value)) {
    if (required) invalid(field);
    return null;
  }
  if (typeof value !== "string" || [...value.trim()].length > max)
    invalid(field);
  return value.trim();
}
export function assetId(value) {
  if (
    !/^[1-9]\d*$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) > 2147483647
  )
    invalid("ID");
  return Number(value);
}
export function normalizeAsset(input, previous = {}) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => k !== "status" && !ASSET_FIELDS.includes(k))
  )
    invalid("Field aset");
  const body = {
    ...Object.fromEntries(
      ASSET_FIELDS.filter((k) => Object.hasOwn(previous, k)).map((k) => [
        k,
        previous[k],
      ]),
    ),
    ...input,
  };
  if (!ASSET_USES.includes(body.penggunaan)) invalid("Penggunaan");
  if (!ASSET_CATEGORIES.includes(body.kategori)) invalid("Kategori");
  let lab = null;
  if (body.penggunaan === "Pembelajaran") lab = assetId(body.lab_id);
  else if (!blank(body.lab_id)) invalid("Lab aset operasional");
  const year = blank(body.tahun_pengadaan)
    ? null
    : String(body.tahun_pengadaan).trim();
  if (
    year !== null &&
    (!/^\d{4}$/.test(year) ||
      Number(year) < 1900 ||
      Number(year) > new Date().getFullYear())
  )
    invalid("Tahun pengadaan");
  let price = null;
  if (!blank(body.harga_beli)) {
    if (
      typeof body.harga_beli !== "string" ||
      !/^\d{1,13}(\.\d{1,2})?$/.test(body.harga_beli.trim())
    )
      invalid("Harga beli (string desimal, maksimal 13 digit dan 2 desimal)");
    const [whole, fraction = ""] = body.harga_beli.trim().split(".");
    price = `${whole.replace(/^0+(?=\d)/, "")}.${fraction.padEnd(2, "0")}`;
  }
  return {
    ...(Object.hasOwn(input, "status") ? { status: validateAssetCondition(input.status) }
      : Object.hasOwn(previous, "status") ? { status: previous.status } : {}),
    nama_perangkat: text(body.nama_perangkat, "Nama perangkat", 100, true),
    spesifikasi: text(body.spesifikasi, "Spesifikasi", 16000),
    nomor_inventaris: text(body.nomor_inventaris, "Nomor inventaris", 50),
    penggunaan: body.penggunaan,
    kategori: body.kategori,
    lab_id: lab,
    lokasi: text(body.lokasi, "Lokasi", 150),
    tahun_pengadaan: year === null ? null : Number(year),
    sumber_dana: text(body.sumber_dana, "Sumber dana", 150),
    harga_beli: price,
  };
}
