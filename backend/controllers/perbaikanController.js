// controllers/perbaikanController.js
import db from "../config/db.js";

export const createPerbaikan = async (req, res) => {
  const { pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan } = req.body;

  if (!pengecekan_id) {
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
      `SELECT perangkat_id FROM pengecekan WHERE pengecekan_id = ? FOR UPDATE`,
      [pengecekan_id]
    );

    if (pengecekanRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: `Data Pengecekan dengan ID ${pengecekan_id} tidak ditemukan. Perbaikan tidak dapat ditambahkan.`,
      });
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
      user_id,
      tanggal_perbaikan,
      tindakan,
      hasil_perbaikan, // Pastikan ini dikirim dengan kapitalisasi yang benar, misal "Berhasil"
      catatan_tambahan,
      perangkatIdSnapshot, // INI DISIMPAN KE DATABASE
    ]);
    const perbaikanId = resultPerbaikan.insertId;

    // ==============================================================================
    // LANGKAH 3: Hapus data pengecekan yang terkait
    // ==============================================================================
    const sqlDeletePengecekan = `DELETE FROM pengecekan WHERE pengecekan_id = ?`;
    const [resultPengecekanDelete] = await connection.query(sqlDeletePengecekan, [pengecekan_id]);

    if (resultPengecekanDelete.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: `Gagal menghapus Data Pengecekan dengan ID ${pengecekan_id}. Perbaikan dibatalkan.`,
      });
    }

    await connection.commit();

    // Ambil data lengkap perbaikan yang baru dibuat untuk respons
    const [newPerbaikanData] = await db.query(
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

    res.status(201).json({
      data: newPerbaikanData[0] || { id: perbaikanId },
      message: "Data Perbaikan berhasil ditambahkan dan Data Pengecekan terkait telah diproses."
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error in createPerbaikan:", error);
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
  try {
    const { id } = req.params;
    const { user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan } = req.body;

    if (!user_id || !tanggal_perbaikan || !hasil_perbaikan) {
        return res.status(400).json({ message: "User ID, Tanggal Perbaikan, dan Hasil Perbaikan wajib diisi." });
    }

    const [result] = await db.query(`
      UPDATE perbaikan SET 
        user_id = ?, 
        tanggal_perbaikan = ?, 
        tindakan = ?, 
        hasil_perbaikan = ?, 
        catatan_tambahan = ?
      WHERE perbaikan_id = ?
    `, [user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data Perbaikan Tidak Ditemukan atau Tidak Ada Perubahan Data" });
    }
    
    const [updatedRows] = await db.query(
        `SELECT 
            pb.perbaikan_id, pb.pengecekan_id, pb.user_id, u.nama_lengkap AS nama_user,
            pb.tanggal_perbaikan, pb.tindakan, pb.hasil_perbaikan, pb.catatan_tambahan,
            pb.perangkat_id_snapshot, pr.nama_perangkat, l.nama_lab
         FROM perbaikan pb
         JOIN user u ON pb.user_id = u.user_id
         LEFT JOIN perangkat pr ON pb.perangkat_id_snapshot = pr.perangkat_id
         LEFT JOIN laboratorium l ON pr.lab_id = l.lab_id
         WHERE pb.perbaikan_id = ?`,
        [id]
    );

    res.status(200).json({
      data: updatedRows[0],
      message: "Data Perbaikan Berhasil Diupdate"
    });
  } catch (error) {
    console.error("Error in updatePerbaikan:", error);
    res.status(500).json({ message: "Gagal Update Data Perbaikan: " + error.message, error: error.toString() });
  }
};

export const deletePerbaikan = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(`DELETE FROM perbaikan WHERE perbaikan_id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data Perbaikan Tidak Ditemukan" });
    }

    res.status(200).json({ message: "Data Perbaikan Berhasil Dihapus" });
  } catch (error) {
    console.error("Error in deletePerbaikan:", error);
    res.status(500).json({ message: "Gagal Hapus Data Perbaikan: " + error.message, error: error.toString() });
  }
};
