import {
  ASSET_FIELDS,
  normalizeAsset,
  assetError,
  assetId,
} from "../utils/assetPolicy.js";
import { createDeletionService } from "./deletionService.js";
const projection = `SELECT p.perangkat_id,p.nama_perangkat,p.spesifikasi,p.status,p.lab_id,p.foto_perangkat,p.nomor_inventaris,
 p.penggunaan,p.kategori,p.lokasi,p.tahun_pengadaan,p.sumber_dana,CAST(p.harga_beli AS CHAR) AS harga_beli,l.nama_lab
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
    return id === undefined ? rows : rows[0];
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
        const [saved] = await c.query(
          `INSERT INTO perangkat (${ASSET_FIELDS.join(",")}) VALUES (${ASSET_FIELDS.map(() => "?").join(",")})`,
          ASSET_FIELDS.map((k) => value[k]),
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
        await c.query(
          `UPDATE perangkat SET ${ASSET_FIELDS.map((k) => `${k}=?`).join(",")} WHERE perangkat_id=?`,
          [...ASSET_FIELDS.map((k) => value[k]), key],
        );
        return read(key, c);
      });
    },
    remove: (actor, id) =>
      createDeletionService({ db }).remove("perangkat", id, actor),
  };
}
