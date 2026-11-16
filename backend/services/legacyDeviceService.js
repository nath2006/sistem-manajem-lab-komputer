import { assetId, assetError, validateAssetCondition } from "../utils/assetPolicy.js";
import { guardManualAssetCondition } from "./assetConditionService.js";
export const LEGACY_DEVICE_FIELDS =
  "p.perangkat_id,p.nama_perangkat,p.spesifikasi,p.status,p.lab_id,p.foto_perangkat,p.nomor_inventaris,l.nama_lab";
export function createLegacyDeviceWriter(db) {
  async function authorize(c, actor, labId) {
    if (!["Admin", "Kepala Lab"].includes(actor?.role))
      throw assetError(403, "Akses ditolak.");
    if (labId === null) {
      if (actor.role !== "Admin")
        throw assetError(403, "Aset operasional hanya dapat dikelola Admin.");
      return;
    }
    const [labs] = await c.query(
      "SELECT kepala_lab_id FROM laboratorium WHERE lab_id=? FOR UPDATE",
      [assetId(labId)],
    );
    if (!labs.length) throw assetError(400, "Laboratorium tidak ditemukan.");
    if (
      actor.role === "Kepala Lab" &&
      Number(labs[0].kepala_lab_id) !== Number(actor.id)
    )
      throw assetError(403, "Data berada di luar laboratorium Anda.");
  }
  return async function write(actor, body, id, filename) {
    if (
      !body ||
      Object.keys(body).some(
        (k) =>
          ![
            "nama_perangkat",
            "spesifikasi",
            "status",
            "lab_id",
            "nomor_inventaris",
            "_method",
          ].includes(k),
      )
    )
      throw assetError(400, "Field perangkat tidak valid.");
    const c = await db.getConnection();
    let discard = false;
    try {
      await c.beginTransaction();
      let old = null;
      if (id !== undefined) {
        const [rows] = await c.query(
          "SELECT * FROM perangkat WHERE perangkat_id=? FOR UPDATE",
          [assetId(id)],
        );
        if (!rows.length) throw assetError(404, "Perangkat tidak ditemukan.");
        old = rows[0];
        await authorize(c, actor, old.lab_id);
      }
      const status = Object.hasOwn(body, "status")
        ? validateAssetCondition(body.status) : old ? old.status : "Baik";
      await guardManualAssetCondition(c, old, status);
      const labId = Object.hasOwn(body, "lab_id")
        ? body.lab_id == null || body.lab_id === ""
          ? null
          : assetId(body.lab_id)
        : old?.lab_id;
      if (!old && labId == null)
        throw assetError(
          400,
          "Perangkat pembelajaran membutuhkan laboratorium. Gunakan Aset IT untuk operasional.",
        );
      if (old && (old.lab_id == null) !== (labId == null))
        throw assetError(
          409,
          "Ubah penggunaan/laboratorium melalui menu Aset IT.",
        );
      await authorize(c, actor, labId);
      const text = (key, max, required = false) => {
        const value = Object.hasOwn(body, key) ? body[key] : old?.[key];
        if (value == null || value === "") {
          if (required) throw assetError(400, `${key} wajib diisi.`);
          return null;
        }
        if (
          typeof value !== "string" ||
          !value.trim() ||
          [...value.trim()].length > max
        )
          throw assetError(400, `${key} tidak valid.`);
        return value.trim();
      };
      const values = [
        text("nama_perangkat", 100, true),
        text("spesifikasi", 16000),
        status,
        labId,
        filename || old?.foto_perangkat || null,
        text("nomor_inventaris", 50),
      ];
      let key = id;
      if (old)
        await c.query(
          "UPDATE perangkat SET nama_perangkat=?,spesifikasi=?,status=?,lab_id=?,foto_perangkat=?,nomor_inventaris=? WHERE perangkat_id=?",
          [...values, assetId(id)],
        );
      else {
        const [saved] = await c.query(
          "INSERT INTO perangkat(nama_perangkat,spesifikasi,status,lab_id,foto_perangkat,nomor_inventaris) VALUES (?,?,?,?,?,?)",
          values,
        );
        key = saved.insertId;
      }
      const [[row]] = await c.query(
        `SELECT ${LEGACY_DEVICE_FIELDS} FROM perangkat p LEFT JOIN laboratorium l ON p.lab_id=l.lab_id WHERE p.perangkat_id=?`,
        [key],
      );
      await c.commit();
      return { row, oldPhoto: filename ? old?.foto_perangkat : null };
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
          /* preserve result */
        }
      }
    }
  };
}
