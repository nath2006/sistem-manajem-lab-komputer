// controllers/perbaikanController.js
import db from "../config/db.js";

// Buat Perbaikan
export const createPerbaikan = async (req, res) => {
  try {
    const { pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan } = req.body;

    const [result] = await db.query(
      `INSERT INTO perbaikan (pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan]
    );

    res.status(201).json({
      data: { id: result.insertId, pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan },
      message: "Data Perbaikan Berhasil Ditambahkan"
    });
  } catch (error) {
    res.status(500).json({ message: "Menambahkan Data Perbaikan Gagal", error: error.message });
  }
};

// Ambil Semua Perbaikan
export const getAllPerbaikan = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pb.*, u.nama_lengkap AS nama_user, p.nama_perangkat
      FROM perbaikan pb
      JOIN user u ON pb.user_id = u.user_id
      JOIN pengecekan pk ON pb.pengecekan_id = pk.pengecekan_id
      JOIN perangkat p ON pk.perangkat_id = p.perangkat_id
      ORDER BY tanggal_perbaikan DESC
    `);

    res.status(200).json({ data: rows, message: "Berhasil Mengambil Data Perbaikan" });
  } catch (error) {
    res.status(500).json({ message: "Gagal Mengambil Data Perbaikan", error: error.message });
  }
};

// Ambil Perbaikan Berdasarkan ID
export const getPerbaikanById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT * FROM perbaikan WHERE perbaikan_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Data Perbaikan Tidak Ditemukan" });
    }

    res.status(200).json({ data: rows[0], message: "Berhasil Mengambil Data Perbaikan" });
  } catch (error) {
    res.status(500).json({ message: "Gagal Mengambil Data Perbaikan", error: error.message });
  }
};

// Update Perbaikan
export const updatePerbaikan = async (req, res) => {
  try {
    const { id } = req.params;
    const { pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan } = req.body;

    const [result] = await db.query(`
      UPDATE perbaikan SET 
        pengecekan_id = ?, 
        user_id = ?, 
        tanggal_perbaikan = ?, 
        tindakan = ?, 
        hasil_perbaikan = ?, 
        catatan_tambahan = ?
      WHERE perbaikan_id = ?
    `, [pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data Perbaikan Tidak Ditemukan" });
    }

    res.status(200).json({
      data: { id, pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan },
      message: "Data Perbaikan Berhasil Diupdate"
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal Update Data Perbaikan", error: error.message });
  }
};

// Hapus Perbaikan
export const deletePerbaikan = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(`DELETE FROM perbaikan WHERE perbaikan_id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data Perbaikan Tidak Ditemukan" });
    }

    res.status(200).json({ message: "Data Perbaikan Berhasil Dihapus" });
  } catch (error) {
    res.status(500).json({ message: "Gagal Hapus Data Perbaikan", error: error.message });
  }
};
