import { randomUUID } from "node:crypto";
import { assetId, assetError } from "../utils/assetPolicy.js";
// Issuing is explicit, authenticated and serialized on the existing asset row.
// UUIDs are persisted, never derived from signing keys or mutable inventory text.
export async function issueAssetQr(db, actor, id) {
  const key = assetId(id);
  if (!["Admin", "Kepala Lab"].includes(actor?.role))
    throw assetError(403, "Anda hanya memiliki akses baca aset.");
  const c = await db.getConnection();
  let discard = false;
  try {
    await c.beginTransaction();
    const [rows] = await c.query(
      "SELECT perangkat_id,penggunaan,lab_id,qr_public_id FROM perangkat WHERE perangkat_id=? FOR UPDATE",
      [key],
    );
    if (!rows.length) throw assetError(404, "Aset tidak ditemukan.");
    const row = rows[0];
    if (actor.role === "Kepala Lab") {
      if (row.penggunaan !== "Pembelajaran")
        throw assetError(403, "Aset operasional hanya dapat dikelola Admin.");
      const [labs] = await c.query(
        "SELECT kepala_lab_id FROM laboratorium WHERE lab_id=? FOR UPDATE",
        [row.lab_id],
      );
      if (!labs.length || Number(labs[0].kepala_lab_id) !== Number(actor.id))
        throw assetError(403, "Aset berada di luar laboratorium Anda.");
    }
    let publicId = row.qr_public_id;
    if (!publicId) {
      // A unique index is the final collision guard; retries never change issued IDs.
      for (let attempt = 0; attempt < 3; attempt++) {
        publicId = randomUUID();
        try {
          await c.query(
            "UPDATE perangkat SET qr_public_id=? WHERE perangkat_id=? AND qr_public_id IS NULL",
            [publicId, key],
          );
          break;
        } catch (e) {
          if (e.code !== "ER_DUP_ENTRY" || attempt === 2) throw e;
        }
      }
    }
    await c.commit();
    return { public_id: publicId, perangkat_id: key };
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
}
