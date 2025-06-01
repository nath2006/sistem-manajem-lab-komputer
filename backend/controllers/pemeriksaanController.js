// File: controllers/PemeriksaanController.js (atau nama file controller Anda)
import db from "../config/db.js"; // Pastikan path ini benar

// Create Pemeriksaan Baru (Tidak ada perubahan, kode Anda sudah cukup baik)
export const createPemeriksaan = async (req, res) => {
  const conn = await db.getConnection();
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
        (user_id, perangkat_id, pemeriksaan_id, tanggal_pengecekan, ditemukan_kerusakan, status_pengecekan)
        VALUES (?, ?, ?, ?, ?, ?)`, // Tambahkan pemeriksaan_id dan status_pengecekan
        [user_id, perangkat_id, pemeriksaan_id, tanggal_pemeriksaan, catatan || 'Belum ada catatan', 'Baru'] // Set status default
      );
    }
    await conn.commit();
    res.status(201).json({
      data: {
        id: pemeriksaan_id, user_id, perangkat_id, tanggal_pemeriksaan, hasil_pemeriksaan, catatan
      },
      message: "Data Pemeriksaan Berhasil Ditambahkan"
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error in createPemeriksaan:", error);
    res.status(500).json({
      message: "Menambahkan Data Pemeriksaan Gagal",
      error: error.message
    });
  } finally {
    conn.release();
  }
};

// Ambil Semua Pemeriksaan (MODIFIKASI DI SINI)
export const getAllPemeriksaan = async (req, res) => {
  try {
    const query = `
      SELECT 
        pm.pemeriksaan_id, 
        pm.tanggal_pemeriksaan, 
        pm.hasil_pemeriksaan, 
        pm.catatan,
        pm.user_id AS pemeriksa_user_id,       -- ID User yang melakukan pemeriksaan
        u_pemeriksa.nama_lengkap AS nama_pemeriksa, -- Nama lengkap user pemeriksa
        pm.perangkat_id,                      -- ID Perangkat yang diperiksa
        pr.nama_perangkat,
        pr.nomor_inventaris,
        l.lab_id,
        l.nama_lab
      FROM pemeriksaan pm
      LEFT JOIN user u_pemeriksa ON pm.user_id = u_pemeriksa.user_id
      LEFT JOIN perangkat pr ON pm.perangkat_id = pr.perangkat_id
      LEFT JOIN laboratorium l ON pr.lab_id = l.lab_id
      ORDER BY pm.tanggal_pemeriksaan DESC, pm.pemeriksaan_id DESC
    `;
    
    const [rows] = await db.query(query);

    res.status(200).json({
      data: rows,
      message: "Berhasil Mengambil Data Pemeriksaan"
    });
  } catch (error) {
    console.error("Error in getAllPemeriksaan:", error);
    res.status(500).json({
      message: "Mengambil Data Pemeriksaan Gagal",
      error: error.message
    });
  }
};

// Ambil Pemeriksaan Berdasarkan ID (MODIFIKASI DI SINI JUGA)
export const getPemeriksaanById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        pm.pemeriksaan_id, 
        pm.tanggal_pemeriksaan, 
        pm.hasil_pemeriksaan, 
        pm.catatan,
        pm.user_id AS pemeriksa_user_id,
        u_pemeriksa.nama_lengkap AS nama_pemeriksa,
        pm.perangkat_id,
        pr.nama_perangkat,
        pr.nomor_inventaris,
        pr.spesifikasi AS spesifikasi_perangkat,
        pr.status AS status_perangkat_saat_ini,
        l.lab_id,
        l.nama_lab
      FROM pemeriksaan pm
      LEFT JOIN user u_pemeriksa ON pm.user_id = u_pemeriksa.user_id
      LEFT JOIN perangkat pr ON pm.perangkat_id = pr.perangkat_id
      LEFT JOIN laboratorium l ON pr.lab_id = l.lab_id
      WHERE pm.pemeriksaan_id = ?
    `;

    const [rows] = await db.query(query, [id]);

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
    console.error("Error in getPemeriksaanById:", error);
    res.status(500).json({
      message: "Mengambil Data Pemeriksaan Gagal",
      error: error.message
    });
  }
};

// Update Pemeriksaan (MODIFIKASI DI SINI JUGA jika ingin mengembalikan data yang di-join)
export const updatePemeriksaan = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const {
      // user_id, // User yang mengupdate mungkin berbeda, atau tetap sama. Sesuaikan kebutuhan.
      // perangkat_id, // Perangkat yang diperiksa biasanya tidak diubah saat update riwayat pemeriksaan
      tanggal_pemeriksaan,
      hasil_pemeriksaan,
      catatan
    } = req.body;

    // Ambil user_id yang melakukan update dari token/sesi jika perlu, atau biarkan dari body jika boleh diubah
    const user_id_updater = req.body.user_id || req.user?.user_id; // Contoh jika user_id dari token ada di req.user

    await conn.beginTransaction();

    // 1. Cek apakah data pemeriksaan ada
    const [existingRows] = await conn.query(
      "SELECT * FROM pemeriksaan WHERE pemeriksaan_id = ?",
      [id]
    );

    if (existingRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        message: "Data Pemeriksaan Tidak Ditemukan"
      });
    }
    const existingPemeriksaan = existingRows[0];

    // 2. Update data pemeriksaan
    // Perhatikan: user_id dan perangkat_id mungkin tidak seharusnya diubah saat update riwayat.
    // Jika hanya hasil dan catatan yang boleh diubah:
    const [updateResult] = await conn.query(
      `UPDATE pemeriksaan SET 
        tanggal_pemeriksaan = ?, 
        hasil_pemeriksaan = ?, 
        catatan = ? 
        -- user_id = ?,  -- Mungkin tidak diupdate, atau diisi user yg mengupdate
        -- perangkat_id = ? -- Hampir pasti tidak diupdate
      WHERE pemeriksaan_id = ?`,
      [tanggal_pemeriksaan, hasil_pemeriksaan, catatan, /* user_id_updater, existingPemeriksaan.perangkat_id, */ id]
    );
    
    // --- Logika untuk tabel pengecekan setelah UPDATE pemeriksaan ---
    const prevResult = existingPemeriksaan.hasil_pemeriksaan;
    const currentPerangkatId = existingPemeriksaan.perangkat_id;
    const userIdForPengecekan = existingPemeriksaan.user_id; // User yang melakukan pemeriksaan awal

    // Jika hasil pemeriksaan yang baru adalah 'Bermasalah'
    if (hasil_pemeriksaan === 'Bermasalah') {
      // Cek apakah sudah ada pengecekan terkait pemeriksaan_id ini
      const [cekPengecekanExistingByPemeriksaanId] = await conn.query(
        `SELECT * FROM pengecekan WHERE pemeriksaan_id = ?`,
        [id]
      );

      if (cekPengecekanExistingByPemeriksaanId.length > 0) {
        // Update pengecekan yang sudah ada terkait pemeriksaan_id ini
        await conn.query(
          `UPDATE pengecekan SET 
            user_id = ?, 
            perangkat_id = ?,
            tanggal_pengecekan = ?, 
            ditemukan_kerusakan = ?,
            status_pengecekan = 'Baru' -- Set status kembali ke Baru jika diupdate jadi bermasalah lagi
          WHERE pemeriksaan_id = ?`,
          [userIdForPengecekan, currentPerangkatId, tanggal_pemeriksaan, catatan || 'Belum ada catatan', id]
        );
      } else {
        // Tambahkan pengecekan baru jika belum ada untuk pemeriksaan_id ini
        await conn.query(
          `INSERT INTO pengecekan (user_id, perangkat_id, pemeriksaan_id, tanggal_pengecekan, ditemukan_kerusakan, status_pengecekan)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [userIdForPengecekan, currentPerangkatId, id, tanggal_pemeriksaan, catatan || 'Belum ada catatan', 'Baru']
        );
      }
    }
    // Jika hasil pemeriksaan yang baru adalah 'Baik', DAN sebelumnya 'Bermasalah'
    else if (hasil_pemeriksaan === 'Baik' && prevResult === 'Bermasalah') {
      // Hapus atau update status pengecekan yang terkait dengan pemeriksaan_id ini
      // Opsi 1: Hapus pengecekan (jika tidak ingin ada riwayat pengecekan jika perangkat sudah baik)
      // await conn.query(
      //   `DELETE FROM pengecekan WHERE pemeriksaan_id = ?`,
      //   [id]
      // );
      // Opsi 2: Update status pengecekan menjadi 'Sudah Ditangani' atau sejenisnya
      await conn.query(
        `UPDATE pengecekan SET status_pengecekan = 'Sudah Ditangani' WHERE pemeriksaan_id = ?`,
        [id]
      );
    }
    // --- Akhir logika tabel pengecekan ---

    await conn.commit();

    // Mengambil data yang sudah di-join untuk respons (opsional, tapi bagus untuk frontend)
    const [updatedDataJoined] = await db.query(query.replace('WHERE pm.pemeriksaan_id = ?', 'WHERE pm.pemeriksaan_id = ? LIMIT 1'), [id]);


    res.status(200).json({
      data: updatedDataJoined[0] || { id, tanggal_pemeriksaan, hasil_pemeriksaan, catatan }, // Kirim data yang di-join jika berhasil
      message: "Data Pemeriksaan Berhasil Diupdate"
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error in updatePemeriksaan:", error);
    res.status(500).json({
      message: "Mengupdate Data Pemeriksaan Gagal",
      error: error.message
    });
  } finally {
    conn.release();
  }
};


// Hapus Pemeriksaan (Tidak ada perubahan signifikan di sini)
export const deletePemeriksaan = async (req, res) => {
  // ... (kode Anda yang sudah ada, tapi pertimbangkan efek pada tabel pengecekan jika pemeriksaan dihapus) ...
  // Jika pemeriksaan dihapus, mungkin pengecekan yang terkait juga perlu dihapus atau pemeriksaan_id-nya di-set NULL
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    await conn.beginTransaction();

    // Opsional: Hapus/update referensi di tabel pengecekan sebelum menghapus pemeriksaan
    // Contoh: Set pemeriksaan_id menjadi NULL di tabel pengecekan
    await conn.query(
        "UPDATE pengecekan SET pemeriksaan_id = NULL WHERE pemeriksaan_id = ?",
        [id]
    );
    // Atau hapus entri pengecekan jika itu kebijakan Anda:
    // await conn.query("DELETE FROM pengecekan WHERE pemeriksaan_id = ?", [id]);


    const [result] = await db.query(
      "DELETE FROM pemeriksaan WHERE pemeriksaan_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({
        message: "Data Pemeriksaan Tidak Ditemukan"
      });
    }
    await conn.commit();
    res.status(200).json({
      message: "Data Pemeriksaan Berhasil Dihapus"
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error in deletePemeriksaan:", error);
    res.status(500).json({
      message: "Menghapus Data Pemeriksaan Gagal",
      error: error.message
    });
  } finally {
    conn.release();
  }
};
