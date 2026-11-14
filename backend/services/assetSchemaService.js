import { assetError } from "../utils/assetPolicy.js";
export const ASSET_COLUMNS = [
  "penggunaan",
  "kategori",
  "lokasi",
  "tahun_pengadaan",
  "sumber_dana",
  "harga_beli",
];
export async function requireAssetSchema(db) {
  const [rows] = await db.query(
    "SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat'",
  );
  const columns = new Map(rows.map((r) => [r.COLUMN_NAME, r]));
  if (
    ASSET_COLUMNS.some((k) => !columns.has(k)) ||
    columns.get("lab_id")?.IS_NULLABLE !== "YES" ||
    ["lokasi", "tahun_pengadaan", "sumber_dana", "harga_beli"].some(
      (name) => columns.get(name)?.IS_NULLABLE !== "YES",
    ) ||
    columns.get("harga_beli")?.COLUMN_TYPE !== "decimal(15,2)" ||
    columns.get("penggunaan")?.COLUMN_TYPE !== "enum('Pembelajaran','Operasional')" ||
    columns.get("kategori")?.COLUMN_TYPE !== "enum('Komputer','Laptop','Monitor','Printer','Perangkat Jaringan','Proyektor','Lainnya')"
  )
    throw assetError(
      503,
      "Skema Aset IT belum tersedia. Gunakan database review yang sudah dimigrasikan.",
      "ASSET_SCHEMA_REQUIRED",
    );
}
