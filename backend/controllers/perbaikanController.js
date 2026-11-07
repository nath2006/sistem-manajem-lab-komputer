// controllers/perbaikanController.js
import db from "../config/db.js";
import { syncMaintenanceStatus } from "../services/maintenanceStatusService.js";

const validRepair = b => ['Berhasil', 'Gagal', 'Perlu Penggantian Komponen'].includes(b.hasil_perbaikan)
  && typeof b.tindakan === 'string' && b.tindakan.trim().length > 0
  && /^\d{4}-\d{2}-\d{2}$/.test(b.tanggal_perbaikan || '')
  && !Number.isNaN(Date.parse(b.tanggal_perbaikan));

export const createPerbaikan = async (req, res) => {
  const { pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan } = req.body;

  if (!Number.isSafeInteger(Number(pengecekan_id)) || Number(pengecekan_id) <= 0 || !validRepair(req.body)) {
    return res.status(400).json({ message: "pengecekan_id wajib diisi." });
  }
  // Tambahkan validasi lain jika perlu

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // ==============================================================================
    // LANGKAH 1: Ambil perangkat_id dari tabel pengecekan SEBELUM dihapus
    // ==============================================================================
    const [pengecekanRows] = await connection.query(
      `SELECT * FROM pengecekan WHERE pengecekan_id = ? FOR UPDATE`,
      [pengecekan_id]
    );

    if (pengecekanRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: `Data Pengecekan dengan ID ${pengecekan_id} tidak ditemukan. Perbaikan tidak dapat ditambahkan.`,
      });
    }
    if (pengecekanRows[0].status_pengecekan === 'Sudah Ditangani') {
      await connection.rollback();
      return res.status(409).json({ message: 'Pengecekan sudah ditangani. Buat pemeriksaan baru untuk masalah baru.' });
    }
    const perangkatIdSnapshot = pengecekanRows[0].perangkat_id; // INI DIAMBIL

    // ==============================================================================
    // LANGKAH 2: Masukkan data perbaikan baru, TERMASUK perangkat_id_snapshot
    // ==============================================================================
    // Pastikan tabel `perbaikan` Anda sudah punya kolom `perangkat_id_snapshot`
    const sqlInsertPerbaikan = `
      INSERT INTO perbaikan 
        (pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan, perangkat_id_snapshot) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [resultPerbaikan] = await connection.query(sqlInsertPerbaikan, [
      pengecekan_id, 
      req.user.id,
      tanggal_perbaikan,
      tindakan,
      hasil_perbaikan, // Pastikan ini dikirim dengan kapitalisasi yang benar, misal "Berhasil"
      catatan_tambahan || null,
      perangkatIdSnapshot, // INI DISIMPAN KE DATABASE
    ]);
    const perbaikanId = resultPerbaikan.insertId;

    // ==============================================================================
    // LANGKAH 3: Hapus data pengecekan yang terkait
    // ==============================================================================
    const ticket = pengecekanRows[0];
    const success = hasil_perbaikan === 'Berhasil';
    await syncMaintenanceStatus(
      connection,
      { ...ticket, pengecekan_id },
      perangkatIdSnapshot,
      success
    );
    await connection.query('UPDATE perbaikan SET tanggal_selesai_perbaikan = ? WHERE perbaikan_id = ?',
      [success ? tanggal_perbaikan : null, perbaikanId]);

    // Ambil data lengkap perbaikan yang baru dibuat untuk respons
    const [newPerbaikanData] = await connection.query(
        `SELECT 
            pb.perbaikan_id, pb.pengecekan_id, pb.user_id, u.nama_lengkap AS nama_user,
            pb.tanggal_perbaikan, pb.tindakan, pb.hasil_perbaikan, pb.catatan_tambahan,
            pb.perangkat_id_snapshot, pr.nama_perangkat, l.nama_lab
         FROM perbaikan pb
         JOIN user u ON pb.user_id = u.user_id
         LEFT JOIN perangkat pr ON pb.perangkat_id_snapshot = pr.perangkat_id
         LEFT JOIN laboratorium l ON pr.lab_id = l.lab_id
         WHERE pb.perbaikan_id = ?`,
        [perbaikanId]
    );

    await connection.commit();
    res.status(201).json({
      data: newPerbaikanData[0] || { id: perbaikanId },
      message: "Data Perbaikan berhasil ditambahkan dan Data Pengecekan terkait telah diproses."
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({ message: "Operasi Gagal: " + error.message, error: error.toString() });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ... (getAllPerbaikan dan fungsi lainnya SUDAH BENAR jika createPerbaikan menyimpan perangkat_id_snapshot)
// Salin fungsi getAllPerbaikan, getPerbaikanById, updatePerbaikan, deletePerbaikan
// dari respons saya sebelumnya yang sudah menyertakan JOIN ke perangkat dan laboratorium
// melalui perangkat_id_snapshot.
// Contoh getAllPerbaikan yang benar:
export const getAllPerbaikan = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        pb.perbaikan_id,
        pb.pengecekan_id,
        pb.user_id,
        u.nama_lengkap AS nama_user,
        pb.tanggal_perbaikan,
        pb.tindakan,
        pb.hasil_perbaikan,
        pb.catatan_tambahan,
        pb.perangkat_id_snapshot,
        pr.nama_perangkat, -- Nama perangkat dari join
        l.nama_lab -- Nama lab dari join
      FROM perbaikan pb
      JOIN user u ON pb.user_id = u.user_id
      LEFT JOIN perangkat pr ON pb.perangkat_id_snapshot = pr.perangkat_id
      LEFT JOIN laboratorium l ON pr.lab_id = l.lab_id
      ORDER BY pb.tanggal_perbaikan DESC, pb.perbaikan_id DESC
    `);
    res.status(200).json({ data: rows, message: "Berhasil Mengambil Data Perbaikan" });
  } catch (error) {
    console.error("Error in getAllPerbaikan:", error);
    res.status(500).json({ message: "Gagal Mengambil Data Perbaikan: " + error.message, error: error.toString() });
  }
};

// (Sertakan juga getPerbaikanById, updatePerbaikan, deletePerbaikan yang sudah disesuaikan)
export const getPerbaikanById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT 
        pb.perbaikan_id,
        pb.pengecekan_id, 
        pb.user_id,
        u.nama_lengkap AS nama_user,
        pb.tanggal_perbaikan,
        pb.tindakan,
        pb.hasil_perbaikan,
        pb.catatan_tambahan,
        pb.perangkat_id_snapshot,
        pr.nama_perangkat,
        l.nama_lab
      FROM perbaikan pb
      JOIN user u ON pb.user_id = u.user_id
      LEFT JOIN perangkat pr ON pb.perangkat_id_snapshot = pr.perangkat_id
      LEFT JOIN laboratorium l ON pr.lab_id = l.lab_id
      WHERE pb.perbaikan_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Data Perbaikan Tidak Ditemukan" });
    }

    res.status(200).json({ data: rows[0], message: "Berhasil Mengambil Data Perbaikan" });
  } catch (error) {
    console.error("Error in getPerbaikanById:", error);
    res.status(500).json({ message: "Gagal Mengambil Data Perbaikan: " + error.message, error: error.toString() });
  }
};

export const updatePerbaikan = async (req, res) => {
  if (!validRepair(req.body)) return res.status(400).json({ message: 'Tanggal, tindakan dan hasil perbaikan wajib valid.' });
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT * FROM perbaikan WHERE perbaikan_id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ message: 'Data perbaikan tidak ditemukan.' }); }
    const original = rows[0];
    if (req.user.role !== 'Admin' && Number(original.user_id) !== Number(req.user.id)) {
      await connection.rollback();
      return res.status(403).json({ message: 'Hanya teknisi pencatat atau admin dapat mengubah perbaikan.' });
    }
    const b = req.body;
    await connection.query(`UPDATE perbaikan SET tanggal_perbaikan = ?, tindakan = ?, hasil_perbaikan = ?,
      catatan_tambahan = ?, tanggal_selesai_perbaikan = ? WHERE perbaikan_id = ?`,
      [b.tanggal_perbaikan, b.tindakan, b.hasil_perbaikan, b.catatan_tambahan || null,
        b.hasil_perbaikan === 'Berhasil' ? b.tanggal_perbaikan : null, req.params.id]);
    if (original.pengecekan_id) {
      const [tickets] = await connection.query('SELECT * FROM pengecekan WHERE pengecekan_id = ? FOR UPDATE', [original.pengecekan_id]);
      if (tickets.length) {
        const [latest] = await connection.query('SELECT hasil_perbaikan FROM perbaikan WHERE pengecekan_id = ? ORDER BY perbaikan_id DESC LIMIT 1', [original.pengecekan_id]);
        const success = latest[0]?.hasil_perbaikan === 'Berhasil';
        await syncMaintenanceStatus(
          connection,
          { ...tickets[0], pengecekan_id: original.pengecekan_id },
          original.perangkat_id_snapshot,
          success
        );
      }
    }
    const [saved] = await connection.query('SELECT * FROM perbaikan WHERE perbaikan_id = ?', [req.params.id]);
    await connection.commit();
    res.status(200).json({ data: saved[0], message: 'Perbaikan dan status terkait berhasil diperbarui.' });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: 'Gagal memperbarui perbaikan.', error: error.message });
  } finally { connection?.release(); }
};

// Preserve history and source links; corrections go through update.
export const deletePerbaikan = async (req, res) => res.status(409).json({ message: 'Riwayat perbaikan tidak dapat dihapus. Gunakan edit untuk koreksi.' });
