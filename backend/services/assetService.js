import {
  ASSET_FIELDS,
  normalizeAsset,
  assetError,
  assetId,
} from "../utils/assetPolicy.js";
import { createDeletionService } from "./deletionService.js";
import { guardManualAssetCondition } from "./assetConditionService.js";
const projection = `SELECT p.perangkat_id,p.nama_perangkat,p.spesifikasi,p.status,p.lab_id,p.foto_perangkat,p.nomor_inventaris,
 p.penggunaan,p.kategori,p.lokasi,p.tahun_pengadaan,p.sumber_dana,CAST(p.harga_beli AS CHAR) AS harga_beli,l.nama_lab,
 (SELECT COUNT(*) FROM pengecekan pc WHERE pc.perangkat_id=p.perangkat_id
  AND pc.status_pengecekan IN ('Baru','Menunggu Perbaikan')) AS active_condition_findings
 FROM perangkat p LEFT JOIN laboratorium l ON l.lab_id=p.lab_id`;
export function createAssetService(db) {
  const read = async (id, c = db) => {
    const [rows] = await c.query(
      projection +
        (id === undefined
          ? " ORDER BY p.nama_perangkat,p.perangkat_id"
          : " WHERE p.perangkat_id=?"),
      id === undefined ? [] : [assetId(id)],
    );
    if (id !== undefined && !rows.length)
      throw assetError(404, "Aset tidak ditemukan.");
    const contextual = rows.map(({ active_condition_findings, ...row }) => ({
      ...row,
      condition_editable: !Number(active_condition_findings),
      condition_edit_reason: Number(active_condition_findings)
        ? `${active_condition_findings} temuan aktif mengendalikan kondisi. Selesaikan melalui Troubleshoot / Perbaikan; metadata tetap dapat diedit.`
        : null,
    }));
    return id === undefined ? contextual : contextual[0];
  };
  async function authorize(c, actor, asset) {
    if (!["Admin", "Kepala Lab"].includes(actor?.role))
      throw assetError(403, "Anda hanya memiliki akses baca aset.");
    if (actor.role === "Kepala Lab" && asset.penggunaan !== "Pembelajaran")
      throw assetError(403, "Aset operasional hanya dapat dikelola Admin.");
    if (asset.penggunaan === "Pembelajaran") {
      const [labs] = await c.query(
        "SELECT lab_id,kepala_lab_id FROM laboratorium WHERE lab_id=? FOR UPDATE",
        [asset.lab_id],
      );
      if (!labs.length) throw assetError(400, "Laboratorium tidak ditemukan.");
      if (
        actor.role === "Kepala Lab" &&
        Number(labs[0].kepala_lab_id) !== Number(actor.id)
      )
        throw assetError(403, "Aset berada di luar laboratorium Anda.");
    }
  }
  async function transaction(fn) {
    const c = await db.getConnection();
    let discard = false;
    try {
      await c.beginTransaction();
      const value = await fn(c);
      await c.commit();
      return value;
    } catch (e) {
      try {
        await c.rollback();
      } catch {
        discard = true;
      }
      throw e;
    } finally {
      try {
        if (discard) c.destroy();
        else c.release();
      } catch {
        try {
          c.destroy();
        } catch {
          /* preserve transaction result */
        }
      }
    }
  }
  return {
    list: () => read(),
    get: (id) => read(id),
    async create(actor, body) {
      const value = normalizeAsset(body);
      return transaction(async (c) => {
        await authorize(c, actor, value);
        const fields = Object.hasOwn(value, "status") ? [...ASSET_FIELDS, "status"] : ASSET_FIELDS;
        const [saved] = await c.query(
          `INSERT INTO perangkat (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`,
          fields.map((k) => value[k]),
        );
        return read(saved.insertId, c);
      });
    },
    async update(actor, id, body) {
      const key = assetId(id);
      return transaction(async (c) => {
        const [rows] = await c.query(
          "SELECT * FROM perangkat WHERE perangkat_id=? FOR UPDATE",
          [key],
        );
        if (!rows.length) throw assetError(404, "Aset tidak ditemukan.");
        await authorize(c, actor, rows[0]);
        const value = normalizeAsset(body, rows[0]);
        await authorize(c, actor, value);
        await guardManualAssetCondition(c, rows[0], value.status);
        const fields = Object.hasOwn(body, "status") ? [...ASSET_FIELDS, "status"] : ASSET_FIELDS;
        await c.query(
          `UPDATE perangkat SET ${fields.map((k) => `${k}=?`).join(",")} WHERE perangkat_id=?`,
          [...fields.map((k) => value[k]), key],
        );
        return read(key, c);
      });
    },
    remove: (actor, id) =>
      createDeletionService({ db }).remove("perangkat", id, actor),
  };
}
