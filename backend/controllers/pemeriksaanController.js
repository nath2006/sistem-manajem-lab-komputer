import db from "../config/db.js";

// Create Pemeriksaan Baru
export const createPemeriksaan = async (req, res) => {
  try {
    const {
      user_id,
      perangkat_id,
      tanggal_pemeriksaan,
      hasil_pemeriksaan,
      catatan
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO pemeriksaan 
      (user_id, perangkat_id, tanggal_pemeriksaan, hasil_pemeriksaan, catatan)
      VALUES (?, ?, ?, ?, ?)`,
      [user_id, perangkat_id, tanggal_pemeriksaan, hasil_pemeriksaan, catatan]
    );

    res.status(201).json({
      data: {
        id: result.insertId,
        user_id,
        perangkat_id,
        tanggal_pemeriksaan,
        hasil_pemeriksaan,
        catatan
      },
      message: "Data Pemeriksaan Berhasil Ditambahkan"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Menambahkan Data Pemeriksaan Gagal",
      error: error.message
    });
  }
};

// Ambil Semua Pemeriksaan
export const getAllPemeriksaan = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM pemeriksaan ORDER BY tanggal_pemeriksaan DESC");

    res.status(200).json({
      data: rows,
      message: "Berhasil Mengambil Data Pemeriksaan"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Mengambil Data Pemeriksaan Gagal",
      error: error.message
    });
  }
};

// Ambil Pemeriksaan Berdasarkan ID
export const getPemeriksaanById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM pemeriksaan WHERE pemeriksaan_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Data Pemeriksaan Tidak Ditemukan"
      });
    }

    res.status(200).json({
      data: rows[0],
      message: "Berhasil Mengambil Data Pemeriksaan"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Mengambil Data Pemeriksaan Gagal",
      error: error.message
    });
  }
};

// Update Pemeriksaan
export const updatePemeriksaan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      user_id,
      perangkat_id,
      tanggal_pemeriksaan,
      hasil_pemeriksaan,
      catatan
    } = req.body;

    const [result] = await db.query(
      `UPDATE pemeriksaan SET 
        user_id = ?, 
        perangkat_id = ?, 
        tanggal_pemeriksaan = ?, 
        hasil_pemeriksaan = ?, 
        catatan = ?
      WHERE pemeriksaan_id = ?`,
      [user_id, perangkat_id, tanggal_pemeriksaan, hasil_pemeriksaan, catatan, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Data Pemeriksaan Tidak Ditemukan"
      });
    }

    res.status(200).json({
      data: {
        id,
        user_id,
        perangkat_id,
        tanggal_pemeriksaan,
        hasil_pemeriksaan,
        catatan
      },
      message: "Data Pemeriksaan Berhasil Diupdate"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Mengupdate Data Pemeriksaan Gagal",
      error: error.message
    });
  }
};

// Hapus Pemeriksaan
export const deletePemeriksaan = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM pemeriksaan WHERE pemeriksaan_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Data Pemeriksaan Tidak Ditemukan"
      });
    }

    res.status(200).json({
      message: "Data Pemeriksaan Berhasil Dihapus"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Menghapus Data Pemeriksaan Gagal",
      error: error.message
    });
  }
};
