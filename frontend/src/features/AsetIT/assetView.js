export const assetUses = ["Pembelajaran", "Operasional"];
export const assetConditions = ["Baik", "Rusak", "Perlu Perbaikan", "Dalam Perbaikan"];
export const assetCategories = [
  "Komputer",
  "Laptop",
  "Monitor",
  "Printer",
  "Perangkat Jaringan",
  "Proyektor",
  "Lainnya",
];
export const assetFields = [
  "nama_perangkat",
  "nomor_inventaris",
  "spesifikasi",
  "penggunaan",
  "kategori",
  "lab_id",
  "lokasi",
  "tahun_pengadaan",
  "sumber_dana",
  "harga_beli",
];
const nullable = (value) =>
  value == null || String(value).trim() === "" ? null : String(value).trim();
export function assetPayload(form) {
  const result = Object.fromEntries(
    assetFields.map((k) => [k, nullable(form[k])]),
  );
  result.penggunaan = "Operasional";
  result.lab_id = null;
  if (nullable(form.status) !== null) result.status = nullable(form.status);
  return result;
}
export function canWriteAsset(user, asset) {
  return (
    user?.role === "Admin" ||
    (user?.role === "Kepala Lab" &&
      user.lab_id_kepala != null &&
      asset.penggunaan === "Pembelajaran" &&
      String(user.lab_id_kepala) === String(asset.lab_id))
  );
}
export function displayValue(value) {
  return nullable(value) ?? "-";
}
// Use BigInt for the integer part: DECIMAL(15,2) must not round via binary floats.
export function displayPrice(value) {
  if (nullable(value) === null) return "-";
  const [whole, fraction = "00"] = String(value).split(".");
  return `Rp ${BigInt(whole).toLocaleString("id-ID")},${fraction.padEnd(2, "0")}`;
}
export function filterLabDevices(devices, labId) {
  return devices.filter(
    (p) => p.lab_id != null && String(p.lab_id) === String(labId),
  );
}
