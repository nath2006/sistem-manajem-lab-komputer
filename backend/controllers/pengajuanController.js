import db from "../config/db.js";

// Di dalam controllers/pengajuanLabController.js

export const createPengajuan = async (req, res) => {
  try {
    const {
      lab_id,
      // guru_id dari body sekarang opsional
      tanggal_pakai,
      jam_mulai,
      jam_selesai,
      kelas,
      mata_pelajaran,
      kegiatan,
    } = req.body;

    // PENYESUAIAN CARA MENGAMBIL INFORMASI USER DARI req:
    const requesterUserId = req.user_id;         // Menggunakan req.user_id
    const requesterRole = req.user?.role;        // Menggunakan req.user?.role (aman jika req.user mungkin undefined)

    let target_guru_id;

    // Pastikan requesterUserId dan requesterRole ada
    if (!requesterUserId || !requesterRole) {
        console.error("Informasi user (ID atau Role) tidak ditemukan dari token.");
        return res.status(401).json({ error: "Unauthorized - Informasi pengguna tidak lengkap." });
    }

    // Validasi input dasar
    if (!lab_id || !tanggal_pakai || !jam_mulai || !jam_selesai || !kelas || !mata_pelajaran || !kegiatan) {
        return res.status(400).json({ error: "Semua field (lab, tanggal, jam, kelas, mapel, kegiatan) wajib diisi." });
    }

    // Penentuan target_guru_id
    if ((requesterRole === "Admin" || requesterRole === "Kepala Lab") && req.body.guru_id) {
        const [guruUser] = await db.query("SELECT user_id, role FROM user WHERE user_id = ?", [req.body.guru_id]);
        if (guruUser.length === 0) {
            return res.status(400).json({ error: "Guru ID yang diajukan tidak ditemukan." });
        }
        // Opsional: Validasi role guruUser[0].role === 'Guru'
        target_guru_id = req.body.guru_id;
    } else if (requesterRole === "Guru" && req.body.guru_id && String(req.body.guru_id) !== String(requesterUserId)) {
        // Jika Guru mencoba membuat pengajuan untuk guru lain (konversi ke string untuk perbandingan aman)
        return res.status(403).json({ error: "Anda tidak memiliki izin untuk membuat pengajuan atas nama guru lain." });
    } else {
        // Default: pengajuan dibuat atas nama pengguna yang melakukan request
        target_guru_id = requesterUserId;
    }

    // Pastikan target_guru_id telah di-set
    if (!target_guru_id) {
        // Ini seharusnya tidak terjadi jika logika di atas benar, tapi sebagai pengaman
        console.error("target_guru_id tidak terdefinisi setelah logika penentuan.");
        return res.status(500).json({ error: "Kesalahan internal: ID Guru untuk pengajuan tidak dapat ditentukan." });
    }
    
    // ... (Validasi format jam dan jam selesai > jam mulai) ...
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    if (!timeRegex.test(jam_mulai) || !timeRegex.test(jam_selesai)) {
        return res.status(400).json({ error: "Format jam mulai atau jam selesai tidak valid. Gunakan HH:MM." });
    }
    if (jam_selesai <= jam_mulai) {
        return res.status(400).json({ error: "Jam selesai harus setelah jam mulai." });
    }

    // ... (Logika cek overlapPengajuan dan overlapJadwal) ...
    const [overlapPengajuan] = await db.query(
      `SELECT pengajuan_id FROM pengajuan_lab
       WHERE lab_id = ? AND tanggal_pakai = ? AND
       NOT (jam_selesai <= ? OR jam_mulai >= ?)
       AND status IN ('Menunggu', 'Disetujui')`,
      [lab_id, tanggal_pakai, jam_mulai, jam_selesai]
    );

    if (overlapPengajuan.length > 0) {
      return res
        .status(400)
        .json({ error: "Jadwal bentrok dengan pengajuan lain yang sedang diproses atau sudah disetujui." });
    }

    const [overlapJadwal] = await db.query(
      `SELECT jadwal_id FROM jadwal_lab
       WHERE lab_id = ? AND tanggal = ? AND
       NOT (jam_selesai <= ? OR jam_mulai >= ?)
       AND status = 'Terisi'`,
      [lab_id, tanggal_pakai, jam_mulai, jam_selesai]
    );

    if (overlapJadwal.length > 0) {
      return res
        .status(400)
        .json({ error: "Jadwal bentrok dengan jadwal lab yang sudah terisi." });
    }
    
    await db.query(
      `INSERT INTO pengajuan_lab (lab_id, guru_id, tanggal_pakai, jam_mulai, jam_selesai, kelas, mata_pelajaran, kegiatan, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu')`,
      [
        lab_id,
        target_guru_id, // Menggunakan target_guru_id
        tanggal_pakai,
        jam_mulai,
        jam_selesai,
        kelas,
        mata_pelajaran,
        kegiatan,
      ]
    );

    res.status(201).json({
      message: "Pengajuan jadwal berhasil dibuat dan sedang menunggu persetujuan.",
    });
  } catch (error) {
    console.error("Error creating pengajuan:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// Di dalam getPengajuanMenunggu
export const getPengajuanMenunggu = async (req, res) => {
  try {
    const userId = req.user_id;
    const userRole = req.user.role;
    const { lab_id: queryLabId } = req.query;

    if (!userId || !userRole) {
      console.error("Error di getPengajuanMenunggu: userId atau userRole tidak ditemukan di req object.");
      return res.status(401).json({ error: "Unauthorized - Informasi pengguna tidak lengkap dari token." });
    }

    let pengajuan;
    let baseQuery = `
      SELECT p.pengajuan_id, p.lab_id, p.guru_id, p.tanggal_pakai,
             TIME_FORMAT(p.jam_mulai, '%H:%i') AS jam_mulai,
             TIME_FORMAT(p.jam_selesai, '%H:%i') AS jam_selesai,
             p.kelas, p.mata_pelajaran, p.kegiatan, p.status,
             p.tanggal_pengajuan, /* << GANTI DARI p.created_at MENJADI p.tanggal_pengajuan */
             u.nama_lengkap AS guru_nama, l.nama_lab
      FROM pengajuan_lab p
      JOIN user u ON p.guru_id = u.user_id
      JOIN laboratorium l ON p.lab_id = l.lab_id
      WHERE p.status = 'Menunggu'
    `;
    const params = [];

    if (userRole === "Admin") {
      if (queryLabId && queryLabId !== "all" && queryLabId !== "") {
        baseQuery += ` AND p.lab_id = ?`;
        params.push(queryLabId);
      }
    } else if (userRole === "Kepala Lab") {
      baseQuery += ` AND l.kepala_lab_id = ?`;
      params.push(userId);
    } else {
      return res.status(403).json({ error: "Akses ditolak untuk peran ini." });
    }

    baseQuery += ` ORDER BY p.tanggal_pengajuan DESC`; /* << GANTI JUGA DI SINI */
    [pengajuan] = await db.query(baseQuery, params);
    res.json(pengajuan);

  } catch (error) {
    console.error("Error fetching pengajuan menunggu:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// Di dalam getPengajuanByGuru
export const getPengajuanByGuru = async (req, res) => {
  try {
    const userId = req.user_id;

    const [pengajuan] = await db.query(
      `SELECT p.pengajuan_id, p.lab_id, p.guru_id, p.tanggal_pakai,
              TIME_FORMAT(p.jam_mulai, '%H:%i') AS jam_mulai,
              TIME_FORMAT(p.jam_selesai, '%H:%i') AS jam_selesai,
              p.kelas, p.mata_pelajaran, p.kegiatan, p.status, p.alasan_penolakan,
              p.disetujui_oleh, p.waktu_persetujuan, p.tanggal_pengajuan, /* << GANTI DARI p.created_at MENJADI p.tanggal_pengajuan */
              l.nama_lab,
              u.nama_lengkap AS guru_nama,
              approver.nama_lengkap AS nama_penyetuju
       FROM pengajuan_lab p
       JOIN laboratorium l ON p.lab_id = l.lab_id
       JOIN user u ON p.guru_id = u.user_id
       LEFT JOIN user approver ON p.disetujui_oleh = approver.user_id
       WHERE p.guru_id = ?
       ORDER BY p.tanggal_pengajuan DESC`, /* << GANTI JUGA DI SINI */
      [userId]
    );
    res.json(pengajuan);
  } catch (error) {
    console.error("Error fetching pengajuan by guru:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// Di dalam controllers/pengajuanLabController.js

export const approvePengajuan = async (req, res) => {
  try {
    const pengajuanId = req.params.id;
    const disetujui_oleh = req.user_id; // ID Admin atau Kepala Lab yang menyetujui
    const now = new Date();

    const [[pengajuan]] = await db.query(
      `SELECT * FROM pengajuan_lab WHERE pengajuan_id = ?`,
      [pengajuanId]
    );

    if (!pengajuan) {
      return res.status(404).json({ error: "Pengajuan tidak ditemukan." });
    }
    if (pengajuan.status !== "Menunggu") {
      return res.status(400).json({ error: "Pengajuan ini sudah diproses (status bukan 'Menunggu')." });
    }

    const [overlapJadwal] = await db.query(
      `SELECT jadwal_id FROM jadwal_lab
       WHERE lab_id = ? AND tanggal = ? AND
       NOT (jam_selesai <= ? OR jam_mulai >= ?)
       AND status = 'Terisi'`,
      [pengajuan.lab_id, pengajuan.tanggal_pakai, pengajuan.jam_mulai, pengajuan.jam_selesai]
    );

    if (overlapJadwal.length > 0) {
      await db.query(
        `UPDATE pengajuan_lab SET status = 'Ditolak', alasan_penolakan = ?, disetujui_oleh = ?, waktu_persetujuan = ? WHERE pengajuan_id = ?`,
        ["Jadwal bentrok dengan penggunaan lain yang sudah terkonfirmasi saat proses approval.", disetujui_oleh, now, pengajuanId]
      );
      return res
        .status(409)
        .json({ error: "Jadwal lab bentrok. Pengajuan ini secara otomatis ditolak." });
    }

    // Masukkan ke jadwal_lab
    await db.query(
      `INSERT INTO jadwal_lab (lab_id, guru_id, tanggal, jam_mulai, jam_selesai, kelas, mata_pelajaran, kegiatan, status, pengajuan_id_asal) /* << DIUBAH DI SINI */
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Terisi', ?)`,
      [
        pengajuan.lab_id,
        pengajuan.guru_id,
        pengajuan.tanggal_pakai,
        pengajuan.jam_mulai,
        pengajuan.jam_selesai,
        pengajuan.kelas,
        pengajuan.mata_pelajaran,
        pengajuan.kegiatan,
        pengajuan.pengajuan_id // Nilai pengajuan.pengajuan_id dimasukkan ke kolom pengajuan_id_asal
      ]
    );

    // Update status pengajuan_lab
    await db.query(
      `UPDATE pengajuan_lab SET status = 'Disetujui', disetujui_oleh = ?, waktu_persetujuan = ? WHERE pengajuan_id = ?`,
      [disetujui_oleh, now, pengajuanId]
    );

    res.json({
      message: "Pengajuan berhasil disetujui dan telah dimasukkan ke jadwal lab.",
    });
  } catch (error) {
    console.error("Error approving pengajuan:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// Menolak pengajuan
export const rejectPengajuan = async (req, res) => {
  try {
    const pengajuanId = req.params.id;
    const { alasan_penolakan } = req.body;
    const disetujui_oleh = req.user.user_id; // User yang melakukan aksi (Admin/Kepala Lab)
    const now = new Date();

    if (!alasan_penolakan || alasan_penolakan.trim() === "") {
        return res.status(400).json({ error: "Alasan penolakan wajib diisi." });
    }

    const [[pengajuan]] = await db.query(
      `SELECT status FROM pengajuan_lab WHERE pengajuan_id = ?`,
      [pengajuanId]
    );

    if (!pengajuan) {
      return res.status(404).json({ error: "Pengajuan tidak ditemukan." });
    }
    if (pengajuan.status !== "Menunggu") {
      return res.status(400).json({ error: "Pengajuan ini sudah diproses (status bukan 'Menunggu')." });
    }

    await db.query(
      `UPDATE pengajuan_lab
       SET status = 'Ditolak',
           alasan_penolakan = ?,
           disetujui_oleh = ?,
           waktu_persetujuan = ?
       WHERE pengajuan_id = ?`,
      [alasan_penolakan, disetujui_oleh, now, pengajuanId]
    );

    res.json({ message: "Pengajuan berhasil ditolak." });
  } catch (error) {
    console.error("Error rejecting pengajuan:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// Mendapatkan statistik pengajuan untuk dashboard
export const getStatistikPengajuan = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const userRole = req.user.role;
        const { lab_id: queryLabId } = req.query; // Untuk filter Admin

        let whereClauses = []; // Array untuk menampung kondisi WHERE
        const params = []; // Array untuk parameter query

        // Menentukan join dan kondisi where berdasarkan peran dan filter
        let joinLaboratorium = '';
        if (userRole === "Admin") {
            if (queryLabId && queryLabId !== "all" && queryLabId !== "") {
                // Jika Admin memfilter berdasarkan lab_id, tidak perlu join khusus untuk filter ini
                // kecuali jika kepala_lab_id juga ada di tabel pengajuan_lab (kurang umum)
                whereClauses.push(`p.lab_id = ?`);
                params.push(queryLabId);
            }
            // Jika Admin tidak memfilter atau memilih "Semua Lab", maka statistik dari semua lab.
        } else if (userRole === "Kepala Lab") {
            joinLaboratorium = `JOIN laboratorium l ON p.lab_id = l.lab_id`;
            whereClauses.push(`l.kepala_lab_id = ?`);
            params.push(userId);
        } else {
            // Peran lain tidak diizinkan mengakses statistik ini melalui endpoint ini
            return res.status(403).json({ error: "Akses ditolak untuk melihat statistik ini." });
        }
        
        // Gabungkan semua kondisi WHERE dengan 'AND' jika ada lebih dari satu
        const finalWhereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const query = `
            SELECT
                SUM(CASE WHEN p.status = 'Menunggu' THEN 1 ELSE 0 END) AS menunggu,
                SUM(CASE WHEN p.status = 'Disetujui' THEN 1 ELSE 0 END) AS disetujui,
                SUM(CASE WHEN p.status = 'Ditolak' THEN 1 ELSE 0 END) AS ditolak,
                COUNT(p.pengajuan_id) AS total_filter // Jumlah total pengajuan sesuai filter yang diterapkan
            FROM pengajuan_lab p
            ${joinLaboratorium}
            ${finalWhereClause}
        `;
        
        const [stats] = await db.query(query, params);
        
        // Mengembalikan 0 jika tidak ada data, bukan null
        const resultStats = {
            menunggu: stats[0]?.menunggu || 0,
            disetujui: stats[0]?.disetujui || 0,
            ditolak: stats[0]?.ditolak || 0,
            total_filter: stats[0]?.total_filter || 0,
        };
        res.json(resultStats);

    } catch (error) {
        console.error("Error fetching statistik pengajuan:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
};
