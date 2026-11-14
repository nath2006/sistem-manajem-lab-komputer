import express from "express";
import { issueAssetQr } from "../services/assetQrService.js";
import { assetId } from "../utils/assetPolicy.js";
const fields = [
  "perangkat_id",
  "nama_perangkat",
  "spesifikasi",
  "nomor_inventaris",
  "status",
  "penggunaan",
  "kategori",
  "lokasi",
  "nama_lab",
];
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const error = (status, message, code) =>
  Object.assign(new Error(message), { status, code });
async function requireQrSchema(db) {
  const [columns] = await db.query(
    "SELECT COLUMN_TYPE,IS_NULLABLE,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' AND COLUMN_NAME='qr_public_id'",
  );
  const [indexes] = await db.query(
    "SELECT INDEX_NAME,NON_UNIQUE,COLUMN_NAME,SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='perangkat' ORDER BY INDEX_NAME,SEQ_IN_INDEX",
  );
  const validIndex = indexes.some(
    (i) =>
      Number(i.NON_UNIQUE) === 0 &&
      i.COLUMN_NAME === "qr_public_id" &&
      indexes.filter((j) => j.INDEX_NAME === i.INDEX_NAME).length === 1,
  );
  if (
    columns.length !== 1 ||
    columns[0].COLUMN_TYPE !== "char(36)" ||
    columns[0].IS_NULLABLE !== "YES" ||
    columns[0].COLLATION_NAME !== "ascii_bin" ||
    !validIndex
  )
    throw error(
      503,
      "Skema QR belum siap. Jalankan migrasi review QR.",
      "QR_SCHEMA_REQUIRED",
    );
}
export function createAssetQrRouter(db, authenticate) {
  const router = express.Router();
  const handle = (fn) => async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      await fn(req, res);
    } catch (e) {
      res
        .status(e.status || 500)
        .json({
          message: e.status ? e.message : "Gagal memproses QR aset.",
          ...(e.code === "QR_SCHEMA_REQUIRED" ? { code: e.code } : {}),
        });
    }
  };
  router.get(
    "/:publicId",
    handle(async (req, res) => {
      if (!uuidPattern.test(req.params.publicId))
        throw error(400, "Identitas QR tidak valid.");
      await requireQrSchema(db);
      const [rows] = await db.query(
        `SELECT p.perangkat_id,p.nama_perangkat,p.spesifikasi,p.nomor_inventaris,p.status,p.penggunaan,p.kategori,p.lokasi,l.nama_lab FROM perangkat p LEFT JOIN laboratorium l ON l.lab_id=p.lab_id WHERE p.qr_public_id=?`,
        [req.params.publicId],
      );
      if (!rows.length) throw error(404, "Aset tidak ditemukan.");
      res.json({
        data: Object.fromEntries(fields.map((k) => [k, rows[0][k]])),
      });
    }),
  );
  // Never cache even authentication failures on the private/issuer paths.
  const noCache = (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  };
  router.get(
    "/:publicId/private",
    noCache,
    authenticate,
    handle(async (req, res) => {
      if (!uuidPattern.test(req.params.publicId))
        throw error(400, "Identitas QR tidak valid.");
      await requireQrSchema(db);
      const [rows] = await db.query(
        "SELECT tahun_pengadaan,sumber_dana,CAST(harga_beli AS CHAR) AS harga_beli FROM perangkat WHERE qr_public_id=?",
        [req.params.publicId],
      );
      if (!rows.length) throw error(404, "Aset tidak ditemukan.");
      res.json({
        data: Object.fromEntries(
          ["tahun_pengadaan", "sumber_dana", "harga_beli"].map((k) => [
            k,
            rows[0][k],
          ]),
        ),
      });
    }),
  );
  router.get(
    "/identity/:id",
    noCache,
    authenticate,
    handle(async (req, res) => {
      const id = assetId(req.params.id);
      await requireQrSchema(db);
      const [rows] = await db.query(
        "SELECT perangkat_id,qr_public_id FROM perangkat WHERE perangkat_id=?",
        [id],
      );
      if (!rows.length) throw error(404, "Aset tidak ditemukan.");
      res.json({
        data: {
          perangkat_id: rows[0].perangkat_id,
          public_id: rows[0].qr_public_id,
        },
      });
    }),
  );
  router.post(
    "/issue/:id",
    noCache,
    authenticate,
    handle(async (req, res) => {
      await requireQrSchema(db);
      res.json({ data: await issueAssetQr(db, req.user, req.params.id) });
    }),
  );
  return router;
}
