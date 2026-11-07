import db from "../config/db.js";
import {createDeletionService,sendDeletionError} from "../services/deletionService.js";

const selectInspection = `SELECT pm.*, pm.user_id AS pemeriksa_user_id,
  u.nama_lengkap AS nama_pemeriksa, pr.nama_perangkat, pr.nomor_inventaris,
  pr.spesifikasi AS spesifikasi_perangkat, pr.status AS status_perangkat_saat_ini,
  l.lab_id, l.nama_lab, l.kepala_lab_id FROM pemeriksaan pm
  LEFT JOIN user u ON pm.user_id = u.user_id
  JOIN perangkat pr ON pm.perangkat_id = pr.perangkat_id
  JOIN laboratorium l ON pr.lab_id = l.lab_id`;
const validInspection = b => ['Baik', 'Bermasalah'].includes(b.hasil_pemeriksaan)
  && typeof b.tanggal_pemeriksaan === 'string' && !Number.isNaN(Date.parse(b.tanggal_pemeriksaan));
const allowed = (req, row) => req.user.role !== 'Kepala Lab' || Number(row.kepala_lab_id) === Number(req.user.id);

export const createPemeriksaan = async (req, res) => {
  const b = req.body;
  if (!validInspection(b) || !Number.isSafeInteger(Number(b.perangkat_id)) || Number(b.perangkat_id) <= 0)
    return res.status(400).json({ message: 'Perangkat, tanggal dan hasil pemeriksaan wajib valid.' });
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [devices] = await conn.query(`SELECT pr.perangkat_id, l.kepala_lab_id FROM perangkat pr
      JOIN laboratorium l ON pr.lab_id = l.lab_id WHERE pr.perangkat_id = ? FOR UPDATE`, [b.perangkat_id]);
    if (!devices.length || !allowed(req, devices[0])) {
      await conn.rollback(); return res.status(404).json({ message: 'Perangkat tidak ditemukan dalam laboratorium Anda.' });
    }
    const [result] = await conn.query(`INSERT INTO pemeriksaan
      (user_id, perangkat_id, tanggal_pemeriksaan, hasil_pemeriksaan, catatan) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, b.perangkat_id, b.tanggal_pemeriksaan, b.hasil_pemeriksaan, b.catatan || null]);
    if (b.hasil_pemeriksaan === 'Bermasalah') {
      await conn.query(`INSERT INTO pengecekan
        (user_id, perangkat_id, pemeriksaan_id, tanggal_pengecekan, ditemukan_kerusakan, status_pengecekan)
        VALUES (?, ?, ?, ?, ?, ?)`, [req.user.id, b.perangkat_id, result.insertId, b.tanggal_pemeriksaan, b.catatan || 'Masalah ditemukan saat pemeriksaan', 'Baru']);
      await conn.query('UPDATE perangkat SET status = ? WHERE perangkat_id = ?', ['Perlu Perbaikan', b.perangkat_id]);
    }
    await conn.commit();
    res.status(201).json({ data: { ...b, id: result.insertId, pemeriksaan_id: result.insertId, user_id: req.user.id }, message: 'Pemeriksaan tersimpan. Temuan bermasalah otomatis masuk antrian teknisi.' });
  } catch (error) {
    if (conn) await conn.rollback();
    res.status(500).json({ message: 'Gagal menyimpan pemeriksaan.', error: error.message });
  } finally { conn?.release(); }
};

export const getAllPemeriksaan = async (req, res) => {
  try {
    const scope = req.user.role === 'Kepala Lab';
    const [rows] = await db.query(`${selectInspection}${scope ? ' WHERE l.kepala_lab_id = ?' : ''}
      ORDER BY pm.tanggal_pemeriksaan DESC, pm.pemeriksaan_id DESC`, scope ? [req.user.id] : []);
    res.status(200).json({ data: rows });
  } catch (error) { res.status(500).json({ message: 'Gagal mengambil pemeriksaan.', error: error.message }); }
};

export const getPemeriksaanById = async (req, res) => {
  try {
    const [rows] = await db.query(`${selectInspection} WHERE pm.pemeriksaan_id = ?`, [req.params.id]);
    if (!rows.length || !allowed(req, rows[0])) return res.status(404).json({ message: 'Pemeriksaan tidak ditemukan.' });
    const [pengecekan] = await db.query(`SELECT pc.*, u.nama_lengkap AS nama_user FROM pengecekan pc
      LEFT JOIN user u ON pc.user_id = u.user_id WHERE pc.pemeriksaan_id = ? ORDER BY pc.pengecekan_id`, [req.params.id]);
    const [perbaikan] = await db.query(`SELECT pb.*, u.nama_lengkap AS nama_user FROM perbaikan pb
      JOIN pengecekan pc ON pb.pengecekan_id = pc.pengecekan_id
      LEFT JOIN user u ON pb.user_id = u.user_id WHERE pc.pemeriksaan_id = ? ORDER BY pb.perbaikan_id`, [req.params.id]);
    res.status(200).json({ data: { ...rows[0], pengecekan, perbaikan } });
  } catch (error) { res.status(500).json({ message: 'Gagal mengambil pemeriksaan.', error: error.message }); }
};

export const updatePemeriksaan = async (req, res) => {
  const b = req.body;
  if (!validInspection(b)) return res.status(400).json({ message: 'Tanggal dan hasil pemeriksaan wajib valid.' });
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [rows] = await conn.query(`${selectInspection} WHERE pm.pemeriksaan_id = ? FOR UPDATE`, [req.params.id]);
    if (!rows.length || !allowed(req, rows[0])) { await conn.rollback(); return res.status(404).json({ message: 'Pemeriksaan tidak ditemukan.' }); }
    const original = rows[0];
    const [tickets] = await conn.query('SELECT * FROM pengecekan WHERE pemeriksaan_id = ? FOR UPDATE', [req.params.id]);
    if (tickets.length && original.hasil_pemeriksaan !== b.hasil_pemeriksaan) {
      await conn.rollback(); return res.status(409).json({ message: 'Status temuan disinkronkan oleh perbaikan teknisi. Buat pemeriksaan baru untuk masalah baru.' });
    }
    await conn.query('UPDATE pemeriksaan SET tanggal_pemeriksaan = ?, hasil_pemeriksaan = ?, catatan = ? WHERE pemeriksaan_id = ?',
      [b.tanggal_pemeriksaan, b.hasil_pemeriksaan, b.catatan || null, req.params.id]);
    if (b.hasil_pemeriksaan === 'Bermasalah' && !tickets.length) {
      await conn.query(`INSERT INTO pengecekan (user_id, perangkat_id, pemeriksaan_id, tanggal_pengecekan, ditemukan_kerusakan, status_pengecekan)
        VALUES (?, ?, ?, ?, ?, ?)`, [original.user_id, original.perangkat_id, req.params.id, b.tanggal_pemeriksaan, b.catatan || 'Masalah ditemukan saat pemeriksaan', 'Baru']);
      await conn.query('UPDATE perangkat SET status = ? WHERE perangkat_id = ?', ['Perlu Perbaikan', original.perangkat_id]);
    }
    await conn.commit();
    res.status(200).json({ data: { ...original, ...b }, message: 'Pemeriksaan berhasil diperbarui.' });
  } catch (error) {
    if (conn) await conn.rollback();
    res.status(500).json({ message: 'Gagal memperbarui pemeriksaan.', error: error.message });
  } finally { conn?.release(); }
};

export const createDeletePemeriksaan = ({service = createDeletionService({db})} = {}) => async (req,res) => {
 try {
  await service.remove('pemeriksaan',req.params.id,req.user);
  res.status(200).json({message:'Pemeriksaan berhasil dihapus.'});
 } catch(error) {sendDeletionError(res,error);}
};
export const deletePemeriksaan = createDeletePemeriksaan();
