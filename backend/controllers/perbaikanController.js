// controllers/perbaikanController.js
import db from "../config/db.js";

// Buat Perbaikan dan Hapus Pengecekan Terkait
export const createPerbaikan = async (req, res) => {
  const { pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan } = req.body;

  // Validasi dasar, pastikan pengecekan_id ada
  if (!pengecekan_id) {
    return res.status(400).json({ message: "pengecekan_id wajib diisi." });
  }

  let connection; // Definisikan variabel koneksi di luar try-catch-finally

  try {
    connection = await db.getConnection(); // Dapatkan koneksi dari pool
    await connection.beginTransaction(); // Mulai transaksi

    // 1. Masukkan data perbaikan baru
    const [resultPerbaikan] = await connection.query(
      `INSERT INTO perbaikan (pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan]
    );

    const perbaikanId = resultPerbaikan.insertId;

    // 2. Hapus data pengecekan yang terkait
    //    Pastikan ada data pengecekan sebelum mencoba menghapus untuk menghindari error jika sudah terhapus
    const [pengecekanRows] = await connection.query(
      `SELECT * FROM pengecekan WHERE pengecekan_id = ?`,
      [pengecekan_id]
    );

    if (pengecekanRows.length === 0) {
      // Jika data pengecekan tidak ditemukan, mungkin sudah diproses atau ID salah.
      // Kita bisa memilih untuk menggagalkan transaksi atau melanjutkannya tergantung kebutuhan.
      // Untuk skenario ini, jika pengecekan tidak ada, anggap ada kesalahan dan rollback.
      await connection.rollback();
      return res.status(404).json({
        message: `Data Pengecekan dengan ID ${pengecekan_id} tidak ditemukan. Perbaikan tidak ditambahkan.`,
      });
    }

    const [resultPengecekanDelete] = await connection.query(
      `DELETE FROM pengecekan WHERE pengecekan_id = ?`,
      [pengecekan_id]
    );

    // Periksa apakah ada baris yang terhapus di tabel pengecekan
    if (resultPengecekanDelete.affectedRows === 0) {
        // Ini seharusnya tidak terjadi jika pengecekanRows.length > 0, tapi sebagai pengaman tambahan
        await connection.rollback();
        return res.status(404).json({
            message: `Gagal menghapus Data Pengecekan dengan ID ${pengecekan_id}. Perbaikan tidak ditambahkan.`,
        });
    }

    await connection.commit(); // Commit transaksi jika semua berhasil

    res.status(201).json({
      data: { id: perbaikanId, pengecekan_id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan },
      message: "Data Perbaikan berhasil ditambahkan dan Data Pengecekan terkait telah dihapus."
    });

  } catch (error) {
    if (connection) {
      await connection.rollback(); // Rollback transaksi jika terjadi error
    }
    console.error("Error in createPerbaikan:", error); // Log error untuk debugging
    res.status(500).json({ message: "Operasi Gagal", error: error.message });
  } finally {
    if (connection) {
      connection.release(); // Selalu lepaskan koneksi kembali ke pool
    }
  }
};

// Ambil Semua Perbaikan
export const getAllPerbaikan = async (req, res) => {
  try {
    // Query diubah untuk tidak lagi join dengan tabel pengecekan karena data pengecekan mungkin sudah dihapus.
    // Jika Anda masih memerlukan detail dari pengecekan (misalnya nama perangkat),
    // Anda perlu menyimpan informasi tersebut di tabel perbaikan, atau melakukan join yang lebih kompleks
    // jika ada cara lain untuk menghubungkannya (misal, jika perbaikan menyimpan perangkat_id secara langsung).
    // Untuk saat ini, kita akan mengambil nama perangkat dari tabel perbaikan jika sudah ditambahkan,
    // atau dari pengecekan jika pengecekan_id di tabel perbaikan masih merujuk ke data yang (seharusnya) sudah tidak ada.
    // Idealnya, informasi penting dari 'pengecekan' yang perlu ditampilkan bersama 'perbaikan'
    // harus didenormalisasi (disalin) ke dalam tabel 'perbaikan' saat 'perbaikan' dibuat.
    // Atau, Anda bisa menambahkan 'perangkat_id' langsung ke tabel 'perbaikan'.

    // Asumsi sederhana: kita akan mengambil nama_perangkat dari tabel perangkat melalui pengecekan_id di perbaikan,
    // dan tabel pengecekan mungkin masih memiliki data perangkat_id meskipun baris pengecekan itu sendiri sudah dihapus.
    // INI PERLU PENYESUAIAN STRUKTUR DATA JIKA PENGECEKAN BENAR-BENAR DIHAPUS DAN DETAILNYA MASIH DIPERLUKAN.
    // Untuk sementara, kita akan hilangkan join ke pengecekan dan perangkat jika itu menyebabkan masalah.
    // Jika Anda ingin tetap menampilkan nama perangkat, Anda harus memastikan perangkat_id ada di tabel perbaikan
    // atau Anda memiliki snapshot data pengecekan.

    // Alternatif 1: Simpan 'perangkat_id' di tabel 'perbaikan' saat createPerbaikan.
    // Kemudian JOIN seperti ini:
    // JOIN perangkat p ON pb.perangkat_id = p.perangkat_id (jika perangkat_id ada di tabel perbaikan)

    // Alternatif 2: Jika Anda tidak menghapus data dari tabel 'pengecekan' melainkan hanya menandainya (soft delete),
    // maka join awal Anda masih valid.

    // Karena instruksinya adalah menghapus data pengecekan, maka join ke tabel 'pengecekan' untuk mendapatkan 'perangkat_id'
    // lalu ke 'perangkat' menjadi tidak reliable.
    // Mari kita sederhanakan query `getAllPerbaikan` untuk saat ini,
    // dengan asumsi bahwa detail perangkat akan ditangani secara terpisah atau data yang diperlukan disalin ke tabel perbaikan.

    const [rows] = await db.query(`
      SELECT 
        pb.perbaikan_id,
        pb.pengecekan_id, -- Masih bisa disimpan sebagai referensi historis ID pengecekan yg sudah dihapus
        pb.user_id,
        pb.tanggal_perbaikan,
        pb.tindakan,
        pb.hasil_perbaikan,
        pb.catatan_tambahan,
        u.nama_lengkap AS nama_user 
        -- p.nama_perangkat -- Kolom ini tidak bisa di-join dengan mudah lagi jika pengecekan dihapus
                           -- Kecuali jika Anda menyimpan perangkat_id atau nama_perangkat di tabel perbaikan
      FROM perbaikan pb
      JOIN user u ON pb.user_id = u.user_id
      -- Tidak bisa lagi join ke pengecekan dan perangkat dengan cara yang sama jika pengecekan dihapus
      -- JOIN pengecekan pk ON pb.pengecekan_id = pk.pengecekan_id 
      -- JOIN perangkat p ON pk.perangkat_id = p.perangkat_id
      ORDER BY pb.tanggal_perbaikan DESC
    `);
    // Jika Anda ingin tetap ada nama perangkat, Anda perlu melakukan salah satu dari ini:
    // 1. Saat `createPerbaikan`, ambil `perangkat_id` dari `pengecekan` sebelum dihapus,
    //    dan simpan `perangkat_id` tersebut di tabel `perbaikan`.
    //    Lalu `getAllPerbaikan` bisa JOIN `perbaikan` dengan `perangkat` melalui `perbaikan.perangkat_id`.
    // 2. Simpan `nama_perangkat` (snapshot) di tabel `perbaikan` saat `createPerbaikan`.

    res.status(200).json({ data: rows, message: "Berhasil Mengambil Data Perbaikan" });
  } catch (error) {
    console.error("Error in getAllPerbaikan:", error);
    res.status(500).json({ message: "Gagal Mengambil Data Perbaikan", error: error.message });
  }
};

// Ambil Perbaikan Berdasarkan ID
export const getPerbaikanById = async (req, res) => {
  try {
    const { id } = req.params;
    // Sama seperti getAllPerbaikan, join ke pengecekan dan perangkat mungkin tidak lagi valid.
    // Anda mungkin perlu mengambil detail perangkat secara terpisah jika perangkat_id disimpan di tabel perbaikan.
    const [rows] = await db.query(`
      SELECT 
        pb.perbaikan_id,
        pb.pengecekan_id, 
        pb.user_id,
        pb.tanggal_perbaikan,
        pb.tindakan,
        pb.hasil_perbaikan,
        pb.catatan_tambahan,
        u.nama_lengkap AS nama_user
        -- p.nama_perangkat -- (Lihat catatan di getAllPerbaikan)
      FROM perbaikan pb
      JOIN user u ON pb.user_id = u.user_id
      WHERE pb.perbaikan_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Data Perbaikan Tidak Ditemukan" });
    }

    res.status(200).json({ data: rows[0], message: "Berhasil Mengambil Data Perbaikan" });
  } catch (error) {
    console.error("Error in getPerbaikanById:", error);
    res.status(500).json({ message: "Gagal Mengambil Data Perbaikan", error: error.message });
  }
};

// Update Perbaikan
export const updatePerbaikan = async (req, res) => {
  try {
    const { id } = req.params;
    // Perhatikan bahwa pengecekan_id dalam update mungkin merujuk ke pengecekan yang sudah tidak ada.
    // Ini adalah aspek desain yang perlu dipertimbangkan. Biasanya setelah perbaikan dibuat dari pengecekan,
    // hubungan ke pengecekan_id itu bersifat historis saja.
    const { user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan } = req.body;

    // Biasanya, pengecekan_id tidak diubah setelah perbaikan dibuat. Jika ingin diubah,
    // pastikan logika bisnisnya memperbolehkan hal tersebut.
    // Untuk saat ini, kita anggap pengecekan_id tidak diubah saat update perbaikan.
    // Jika ingin mengizinkan perubahan pengecekan_id, tambahkan di body dan query.

    const [result] = await db.query(`
      UPDATE perbaikan SET 
        user_id = ?, 
        tanggal_perbaikan = ?, 
        tindakan = ?, 
        hasil_perbaikan = ?, 
        catatan_tambahan = ?
        -- pengecekan_id = ?, (jika ingin bisa diubah)
      WHERE perbaikan_id = ?
    `, [user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data Perbaikan Tidak Ditemukan atau Tidak Ada Perubahan Data" });
    }

    res.status(200).json({
      data: { id, user_id, tanggal_perbaikan, tindakan, hasil_perbaikan, catatan_tambahan },
      message: "Data Perbaikan Berhasil Diupdate"
    });
  } catch (error) {
    console.error("Error in updatePerbaikan:", error);
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
    console.error("Error in deletePerbaikan:", error);
    res.status(500).json({ message: "Gagal Hapus Data Perbaikan", error: error.message });
  }
};
