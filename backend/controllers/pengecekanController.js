import db from "../config/db.js";

// Create Pengecekan Baru
export const createPengecekan = async (req, res) => {
  try {
    const { user_id, perangkat_id, tanggal_pengecekan, ditemukan_kerusakan } = req.body;

    const [result] = await db.query(
      `INSERT INTO pengecekan (user_id, perangkat_id, tanggal_pengecekan, ditemukan_kerusakan)
       VALUES (?, ?, ?, ?)`,
      [user_id, perangkat_id, tanggal_pengecekan, ditemukan_kerusakan]
    );

    res.status(201).json({
      data: {
        id: result.insertId,
        user_id,
        perangkat_id,
        tanggal_pengecekan,
        ditemukan_kerusakan
      },
      message: "Data Pengecekan Berhasil Ditambahkan"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Menambahkan Data Pengecekan Gagal",
      error: error.message
    });
  }
};

// Ambil Semua Pengecekan
export const getAllPengecekan = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.nama_lengkap AS nama_user, d.nama_perangkat 
       FROM pengecekan p
       JOIN user u ON p.user_id = u.user_id
       JOIN perangkat d ON p.perangkat_id = d.perangkat_id
       ORDER BY tanggal_pengecekan DESC`
    );

    res.status(200).json({
      data: rows,
      message: "Berhasil Mengambil Data Pengecekan"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Mengambil Data Pengecekan Gagal",
      error: error.message
    });
  }
};

// Ambil Pengecekan Berdasarkan ID
export const getPengecekanById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT p.*, u.nama_lengkap AS nama_user, d.nama_perangkat 
       FROM pengecekan p
       JOIN user u ON p.user_id = u.user_id
       JOIN perangkat d ON p.perangkat_id = d.perangkat_id
       WHERE p.pengecekan_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Data Pengecekan Tidak Ditemukan"
      });
    }

    res.status(200).json({
      data: rows[0],
      message: "Berhasil Mengambil Data Pengecekan"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Mengambil Data Pengecekan Gagal",
      error: error.message
    });
  }
};

// Update Pengecekan
export const updatePengecekan = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, perangkat_id, tanggal_pengecekan, ditemukan_kerusakan } = req.body;

    const [result] = await db.query(
      `UPDATE pengecekan SET 
        user_id = ?, 
        perangkat_id = ?, 
        tanggal_pengecekan = ?, 
        ditemukan_kerusakan = ?
       WHERE pengecekan_id = ?`,
      [user_id, perangkat_id, tanggal_pengecekan, ditemukan_kerusakan, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Data Pengecekan Tidak Ditemukan"
      });
    }

    res.status(200).json({
      data: {
        id,
        user_id,
        perangkat_id,
        tanggal_pengecekan,
        ditemukan_kerusakan
      },
      message: "Data Pengecekan Berhasil Diupdate"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Mengupdate Data Pengecekan Gagal",
      error: error.message
    });
  }
};

// Hapus Pengecekan
export const deletePengecekan = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM pengecekan WHERE pengecekan_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Data Pengecekan Tidak Ditemukan"
      });
    }

    res.status(200).json({
      message: "Data Pengecekan Berhasil Dihapus"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Menghapus Data Pengecekan Gagal",
      error: error.message
    });
  }
};
