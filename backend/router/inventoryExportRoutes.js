import express from 'express';
import { ASSET_CATEGORIES } from '../utils/assetPolicy.js';
import { requireAssetSchema } from '../services/assetSchemaService.js';
const fields = ['perangkat_id','nama_perangkat','spesifikasi','status','nomor_inventaris','penggunaan','kategori','lab_id','nama_lab','lokasi','tahun_pengadaan','sumber_dana','harga_beli'];
const projection = fields.map(f => f === 'nama_lab' ? 'l.nama_lab' : f === 'harga_beli' ? 'CAST(p.harga_beli AS CHAR) AS harga_beli' : `p.${f}`).join(', ');
const positiveInt = value => Number.isInteger(value) && value > 0 && value <= 2147483647;

export function createInventoryExportRouter(db, verifyToken) {
  const router = express.Router();
  router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  router.use(verifyToken);
  router.use(async (req, res, next) => {
    try {
      const [users] = await db.query('SELECT role FROM user WHERE user_id = ?', [req.user?.id]);
      if (!['Admin', 'Teknisi'].includes(users[0]?.role) || users[0].role !== req.user?.role)
        return res.status(403).json({ message: 'Akses ekspor ditolak.' });
      next();
    } catch { res.status(500).json({ message: 'Gagal memuat data ekspor.' }); }
  });
  const exportKind = kind => async (req, res) => {
    const body = req.body;
    const filter = kind === 'assets' ? 'kategori' : 'lab_id';
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).some(key => !['perangkat_ids', filter].includes(key)) ||
        !Array.isArray(body.perangkat_ids) || body.perangkat_ids.length < 1 || body.perangkat_ids.length > 5000 ||
        !body.perangkat_ids.every(positiveInt) || new Set(body.perangkat_ids).size !== body.perangkat_ids.length ||
        (body[filter] != null && !(kind === 'assets' ? ASSET_CATEGORIES.includes(body[filter]) : positiveInt(body[filter]))))
      return res.status(400).json({ message: 'Permintaan ekspor tidak valid.' });
    try {
      await requireAssetSchema(db);
      const params = [...body.perangkat_ids];
      const scope = kind === 'assets'
        ? "p.penggunaan = 'Operasional' AND p.lab_id IS NULL"
        : "p.lab_id IS NOT NULL AND (p.penggunaan <> 'Operasional' OR p.penggunaan IS NULL)";
      let sql = `SELECT ${projection} FROM perangkat p LEFT JOIN laboratorium l ON p.lab_id = l.lab_id WHERE p.perangkat_id IN (${params.map(() => '?').join(',')}) AND ${scope}`;
      if (body[filter] != null) { sql += ` AND p.${filter} = ?`; params.push(body[filter]); }
      const [rows] = await db.query(sql, params);
      const byId = new Map(rows.map(row => [row.perangkat_id, row]));
      if (rows.length !== body.perangkat_ids.length || body.perangkat_ids.some(id => !byId.has(id)))
        return res.status(409).json({ message: 'Data inventaris berubah. Muat ulang dan pilih kembali.' });
      const data = body.perangkat_ids.map(id => Object.fromEntries(fields.map(field => [field, byId.get(id)[field] ?? null])));
      res.status(200).json({ data });
    } catch (error) {
      if (error.code === 'ASSET_SCHEMA_REQUIRED') return res.status(503).json({ message: error.message, code: error.code });
      res.status(500).json({ message: 'Gagal memuat data ekspor.' });
    }
  };
  router.post('/assets', exportKind('assets'));
  router.post('/lab', exportKind('lab'));
  return router;
}
