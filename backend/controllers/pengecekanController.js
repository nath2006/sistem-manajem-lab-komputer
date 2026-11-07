import db from "../config/db.js";

// Create Pengecekan Baru
export const createPengecekan = async (req, res) => {
  const b = req.body;
  if (!Number.isSafeInteger(Number(b.perangkat_id)) || Number(b.perangkat_id) <= 0 ||
      !b.tanggal_pengecekan || Number.isNaN(Date.parse(b.tanggal_pengecekan)) ||
      typeof b.ditemukan_kerusakan !== 'string' || !b.ditemukan_kerusakan.trim())
    return res.status(400).json({ message: 'Perangkat, tanggal dan deskripsi kerusakan wajib valid.' });
  let conn;
  try {
    conn = await db.getConnection(); await conn.beginTransaction();
    const [devices] = await conn.query('SELECT perangkat_id FROM perangkat WHERE perangkat_id = ? FOR UPDATE', [b.perangkat_id]);
    if (!devices.length) { await conn.rollback(); return res.status(404).json({ message: 'Perangkat tidak ditemukan.' }); }
    const [result] = await conn.query(`INSERT INTO pengecekan
      (user_id, perangkat_id, tanggal_pengecekan, ditemukan_kerusakan, status_pengecekan)
      VALUES (?, ?, ?, ?, ?)`, [req.user.id, b.perangkat_id, b.tanggal_pengecekan, b.ditemukan_kerusakan.trim(), 'Baru']);
    await conn.query('UPDATE perangkat SET status = ? WHERE perangkat_id = ?', ['Perlu Perbaikan', b.perangkat_id]);
    await conn.commit(); res.status(201).json({ data: { pengecekan_id: result.insertId }, message: 'Troubleshoot baru masuk antrian teknisi.' });
  } catch (error) { if (conn) await conn.rollback(); res.status(500).json({ message: 'Gagal menyimpan pengecekan.', error: error.message }); }
  finally { conn?.release(); }
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

    const [perbaikan] = await db.query(`SELECT pb.*, u.nama_lengkap AS nama_user FROM perbaikan pb
      LEFT JOIN user u ON pb.user_id = u.user_id WHERE pb.pengecekan_id = ? ORDER BY pb.perbaikan_id`, [id]);
    res.status(200).json({
      data: { ...rows[0], perbaikan },
      message: "Berhasil Mengambil Detail Data Pengecekan"
    });
  } catch (error) {
    console.error("Error fetching pengecekan:", error.message);
    res.status(500).json({
      message: "Mengambil Detail Data Pengecekan Gagal",
      error: error.message
    });
  }
};

// Update Pengecekan
export const updatePengecekan = async (req, res) => {
  const b = req.body;
  if (b.status_pengecekan === 'Sudah Ditangani') return res.status(409).json({ message: 'Gunakan hasil perbaikan untuk menyelesaikan temuan.' });
  if (!['Baru', 'Menunggu Perbaikan'].includes(b.status_pengecekan) || !b.tanggal_pengecekan ||
      Number.isNaN(Date.parse(b.tanggal_pengecekan)) || typeof b.ditemukan_kerusakan !== 'string' || !b.ditemukan_kerusakan.trim())
    return res.status(400).json({ message: 'Tanggal, kerusakan dan status wajib valid.' });
  let conn;
  try {
    conn = await db.getConnection(); await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM pengecekan WHERE pengecekan_id = ? FOR UPDATE', [req.params.id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ message: 'Pengecekan tidak ditemukan.' }); }
    if (rows[0].status_pengecekan === 'Sudah Ditangani') { await conn.rollback(); return res.status(409).json({ message: 'Temuan selesai tidak dapat dibuka ulang. Buat pemeriksaan baru.' }); }
    // The original actor/device/source remain immutable; status closure is owned by repairs.
    await conn.query('UPDATE pengecekan SET tanggal_pengecekan = ?, ditemukan_kerusakan = ?, status_pengecekan = ? WHERE pengecekan_id = ?',
      [b.tanggal_pengecekan, b.ditemukan_kerusakan.trim(), b.status_pengecekan, req.params.id]);
    await conn.commit(); res.status(200).json({ message: 'Pengecekan berhasil diperbarui.' });
  } catch (error) { if (conn) await conn.rollback(); res.status(500).json({ message: 'Gagal memperbarui pengecekan.', error: error.message }); }
  finally { conn?.release(); }
};

// Hapus Pengecekan
export const deletePengecekan = async (req, res) => res.status(409).json({
  message: 'Pengecekan adalah riwayat temuan dan tidak dapat dihapus. Catat hasil penanganan melalui perbaikan.'
});

