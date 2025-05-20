import db from "../config/db.js";


// Create Pemeriksaan Baru
export const createPemeriksaan = async (req, res) => {
  const conn = await db.getConnection(); // optional kalau pakai pool
  try {
    const {
      user_id,
      perangkat_id,
      tanggal_pemeriksaan,
      hasil_pemeriksaan,
      catatan
    } = req.body;

    await conn.beginTransaction();

    // 1. Simpan ke tabel pemeriksaan
    const [result] = await conn.query(
      `INSERT INTO pemeriksaan 
      (user_id, perangkat_id, tanggal_pemeriksaan, hasil_pemeriksaan, catatan)
      VALUES (?, ?, ?, ?, ?)`,
      [user_id, perangkat_id, tanggal_pemeriksaan, hasil_pemeriksaan, catatan]
    );

    const pemeriksaan_id = result.insertId;

    // 2. Jika hasil pemeriksaan "Bermasalah", tambahkan ke tabel pengecekan
    if (hasil_pemeriksaan === 'Bermasalah') {
      await conn.query(
        `INSERT INTO pengecekan 
        (user_id, perangkat_id, tanggal_pengecekan, ditemukan_kerusakan)
        VALUES (?, ?, ?, ?)`,
        [user_id, perangkat_id, tanggal_pemeriksaan, catatan || 'Belum ada catatan']
      );
    }

    await conn.commit();

    res.status(201).json({
      data: {
        id: pemeriksaan_id,
        user_id,
        perangkat_id,
        tanggal_pemeriksaan,
        hasil_pemeriksaan,
        catatan
      },
      message: "Data Pemeriksaan Berhasil Ditambahkan"
    });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({
      message: "Menambahkan Data Pemeriksaan Gagal",
      error: error.message
    });
  } finally {
    conn.release();
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
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const {
      user_id,
      perangkat_id,
      tanggal_pemeriksaan,
      hasil_pemeriksaan,
      catatan
    } = req.body;

    await conn.beginTransaction();

    // 1. Cek apakah data pemeriksaan ada
    const [existing] = await conn.query(
      "SELECT * FROM pemeriksaan WHERE pemeriksaan_id = ?",
      [id]
    );

    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        message: "Data Pemeriksaan Tidak Ditemukan"
      });
    }

    // 2. Update data pemeriksaan
    const [updateResult] = await conn.query(
      `UPDATE pemeriksaan SET 
        user_id = ?, 
        perangkat_id = ?, 
        tanggal_pemeriksaan = ?, 
        hasil_pemeriksaan = ?, 
        catatan = ?
      WHERE pemeriksaan_id = ?`,
      [user_id, perangkat_id, tanggal_pemeriksaan, hasil_pemeriksaan, catatan, id]
    );

    // 3. Cek apakah hasil pemeriksaan berubah
    const prevResult = existing[0].hasil_pemeriksaan;

    // 4. Jika sekarang jadi 'Bermasalah'
    if (hasil_pemeriksaan === 'Bermasalah') {
      // Cek apakah pengecekan sudah ada
      const [cekPengecekan] = await conn.query(
        `SELECT * FROM pengecekan WHERE perangkat_id = ?`,
        [perangkat_id]
      );

      if (cekPengecekan.length > 0) {
        // Update pengecekan jika sudah ada
        await conn.query(
          `UPDATE pengecekan SET 
            user_id = ?, 
            tanggal_pengecekan = ?, 
            ditemukan_kerusakan = ?
          WHERE perangkat_id = ?`,
          [user_id, tanggal_pemeriksaan, catatan || 'Belum ada catatan', perangkat_id]
        );
      } else {
        // Tambahkan pengecekan baru jika belum ada
        await conn.query(
          `INSERT INTO pengecekan (user_id, perangkat_id, tanggal_pengecekan, ditemukan_kerusakan)
          VALUES (?, ?, ?, ?)`,
          [user_id, perangkat_id, tanggal_pemeriksaan, catatan || 'Belum ada catatan']
        );
      }
    }

    // 5. Jika sekarang 'Baik', tapi sebelumnya 'Bermasalah' → hapus pengecekan
    if (hasil_pemeriksaan === 'Baik' && prevResult === 'Bermasalah') {
      await conn.query(
        `DELETE FROM pengecekan WHERE perangkat_id = ?`,
        [perangkat_id]
      );
    }

    await conn.commit();

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
    await conn.rollback();
    console.error(error);
    res.status(500).json({
      message: "Mengupdate Data Pemeriksaan Gagal",
      error: error.message
    });
  } finally {
    conn.release();
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
