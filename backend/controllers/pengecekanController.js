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

// Ambil Semua Pengecekan (dengan detail nama user, nama perangkat, dan nama lab)
export const getAllPengecekan = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         p.pengecekan_id,
         p.user_id,
         p.perangkat_id,
         p.pemeriksaan_id,
         p.tanggal_pengecekan,
         p.ditemukan_kerusakan,
         p.status_pengecekan,
         u.nama_lengkap AS nama_user, 
         d.nama_perangkat,
         l.nama_lab -- Kolom baru untuk nama lab
       FROM pengecekan p
       JOIN user u ON p.user_id = u.user_id
       JOIN perangkat d ON p.perangkat_id = d.perangkat_id
       JOIN laboratorium l ON d.lab_id = l.lab_id -- JOIN baru ke tabel laboratorium
       ORDER BY p.tanggal_pengecekan DESC`
    );

    res.status(200).json({
      data: rows,
      message: "Berhasil Mengambil Data Pengecekan"
    });
  } catch (error) {
    console.error("Error fetching all pengecekan:", error); // Log error yang lebih spesifik
    res.status(500).json({
      message: "Mengambil Data Pengecekan Gagal",
      error: error.message
    });
  }
};

// Anda mungkin juga ingin menyesuaikan fungsi getPengecekanById jika ada,
// agar mengembalikan informasi nama_lab juga.
// Contoh:
export const getPengecekanById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT 
         p.pengecekan_id,
         p.user_id,
         p.perangkat_id,
         p.pemeriksaan_id,
         p.tanggal_pengecekan,
         p.ditemukan_kerusakan,
         p.status_pengecekan,
         u.nama_lengkap AS nama_user, 
         d.nama_perangkat,
         l.nama_lab
       FROM pengecekan p
       JOIN user u ON p.user_id = u.user_id
       JOIN perangkat d ON p.perangkat_id = d.perangkat_id
       JOIN laboratorium l ON d.lab_id = l.lab_id
       WHERE p.pengecekan_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Data Pengecekan tidak ditemukan" });
    }

    res.status(200).json({
      data: rows[0],
      message: "Berhasil Mengambil Detail Data Pengecekan"
    });
  } catch (error) {
    console.error(`Error fetching pengecekan by ID ${id}:`, error);
    res.status(500).json({
      message: "Mengambil Detail Data Pengecekan Gagal",
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
