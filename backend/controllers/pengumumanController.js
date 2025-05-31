import db from "../config/db.js";
import path from "path";
import fs from "fs";

const PENGUMUMAN_FILES_DIR_FROM_ROOT = path.join(process.cwd(), 'uploads', 'pengumuman');

// Create Pengumuman
export const createAnnouncement = async (req, res) => {
  console.log("CREATE PENGUMUMAN - REQ.BODY:", req.body);
  console.log("CREATE PENGUMUMAN - REQ.FILE:", req.file); // Akan undefined jika tidak ada file diupload

  try {
    const { judul, content } = req.body;
    // 'is_active' dari FormData akan berupa string '1' atau '0'
    const is_active_from_body = req.body.is_active; 

    // AMBIL created_by dari user yang terautentikasi
    // Middleware verifyToken Anda HARUS menambahkan objek user ke req, misal: req.user = { id: userId, role: userRole, ... }
    const created_by_user_id = req.user?.id; 

    if (!created_by_user_id) {
      console.error("CREATE PENGUMUMAN Error: User ID tidak ditemukan di req.user. Pastikan middleware verifyToken mengisi req.user.id.");
      // Jika ada file yang terlanjur diupload Multer, hapus karena user tidak valid
      if (req.file) {
        const tempPath = path.join(PENGUMUMAN_FILES_DIR_FROM_ROOT, req.file.filename);
        if(fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
            console.log("File sementara dihapus karena user ID tidak ditemukan:", req.file.filename);
        }
      }
      return res.status(401).json({ message: "Autentikasi pengguna gagal atau ID pengguna tidak ditemukan." });
    }

    if (!judul || !content) {
      if (req.file) { // Jika ada file yang terlanjur diupload Multer, hapus
        const tempPath = path.join(PENGUMUMAN_FILES_DIR_FROM_ROOT, req.file.filename);
        if(fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
            console.log("File sementara dihapus karena judul/konten kosong:", req.file.filename);
        }
      }
      return res.status(400).json({ message: "Judul dan Konten tidak boleh kosong." });
    }

    // file_path untuk database, bisa null jika tidak ada file
    const filePathInDB = req.file ? req.file.filename : null;
    
    // Konversi is_active dari string '1'/'0' (dari FormData) ke boolean/integer untuk database
    const activeStatusForDB = (is_active_from_body === '1' || is_active_from_body === 1 || is_active_from_body === true) ? 1 : 0;

    console.log("Data yang akan di-INSERT ke tabel pengumuman:", {
        judul, content, filePathInDB, created_by_user_id, activeStatusForDB
    });

    const [result] = await db.query(
      "INSERT INTO pengumuman (judul, content, file_path, created_by, is_active) VALUES (?, ?, ?, ?, ?)",
      [judul, content, filePathInDB, created_by_user_id, activeStatusForDB] // Gunakan activeStatusForDB
    );

    // Ambil data user pembuat untuk respons (opsional, tapi bagus untuk konsistensi)
    const [userRows] = await db.query("SELECT user_id, nama_lengkap FROM user WHERE user_id = ?", [created_by_user_id]);
    const creatorInfo = userRows.length > 0 ? { user_id: userRows[0].user_id, nama_lengkap: userRows[0].nama_lengkap } : { user_id: created_by_user_id, nama_lengkap: 'Tidak diketahui' };


    res.status(201).json({
      data: {
        id: result.insertId,
        judul,
        content,
        file_path: filePathInDB, // Konsisten dengan GET
        created_by: creatorInfo, // Kirim objek user
        is_active: activeStatusForDB // Kirim status yang disimpan di DB
      },
      message: "Pengumuman berhasil dibuat",
    });

  } catch (error) {
    console.error("ERROR DI CREATE ANNOUNCEMENT CONTROLLER:", error.message, error.stack);
    // Jika ada file yang diupload tapi terjadi error saat proses DB, hapus file tersebut
    if (req.file) {
        const uploadedFilePath = path.join(PENGUMUMAN_FILES_DIR_FROM_ROOT, req.file.filename);
        if (fs.existsSync(uploadedFilePath)) {
            try {
                fs.unlinkSync(uploadedFilePath);
                console.log(`Rollback: File ${req.file.filename} yang diupload dihapus karena error DB: ${error.message}`);
            } catch (rollbackErr) {
                console.error(`Gagal melakukan rollback file ${req.file.filename}:`, rollbackErr);
            }
        }
    }
    res.status(500).json({ message: "Gagal membuat pengumuman", error: error.message });
  }
};

// Get All Pengumuman Aktif
export const getAllAnnouncements = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.judul,
        p.content,
        p.file_path,  -- Menggunakan file_path standar, frontend Anda menggunakan ini
        p.created_at,
        p.is_active,
        p.created_by AS created_by_user_id, -- ID user yang membuat pengumuman
        u.nama_lengkap AS creator_nama_lengkap -- Nama lengkap user dari tabel user
      FROM 
        pengumuman p
      JOIN 
        user u ON p.created_by = u.user_id
      WHERE 
        p.is_active = true 
      ORDER BY 
        p.created_at DESC;
    `;
    const [rows] = await db.query(query);

    // Mengubah struktur data agar created_by menjadi objek yang berisi user_id dan nama_lengkap
    const formattedData = rows.map(item => {
      return {
        id: item.id,
        judul: item.judul,
        content: item.content,
        file_path: item.file_path,
        created_at: item.created_at,
        is_active: item.is_active,
        created_by: { // Membuat objek nested untuk created_by
          user_id: item.created_by_user_id,
          nama_lengkap: item.creator_nama_lengkap
        }
      };
    });

    res.status(200).json({
      data: formattedData, // Kirim data yang sudah diformat
      message: "Berhasil mengambil semua pengumuman aktif",
    });
  } catch (error) {
    console.error("Error fetching active announcements:", error); // Tambahkan console.error untuk debugging di backend
    res.status(500).json({ message: "Gagal mengambil data pengumuman", error: error.message });
  }
};

// Get Pengumuman by ID
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        p.id,
        p.judul,
        p.content,
        p.file_path,  -- Menggunakan file_path standar
        p.created_at,
        p.is_active,
        p.created_by AS created_by_user_id, -- ID user yang membuat pengumuman
        u.nama_lengkap AS creator_nama_lengkap -- Nama lengkap user dari tabel user
      FROM 
        pengumuman p
      JOIN 
        user u ON p.created_by = u.user_id
      WHERE 
        p.id = ?;
    `;
    const [rows] = await db.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    const announcement = rows[0];

    // Mengubah struktur data agar created_by menjadi objek
    const formattedData = {
      id: announcement.id,
      judul: announcement.judul,
      content: announcement.content,
      file_path: announcement.file_path,
      created_at: announcement.created_at,
      is_active: announcement.is_active,
      created_by: { // Membuat objek nested untuk created_by
        user_id: announcement.created_by_user_id,
        nama_lengkap: announcement.creator_nama_lengkap
      }
    };

    res.status(200).json({
      data: formattedData, // Kirim data pengumuman tunggal yang sudah diformat
      message: "Berhasil mengambil pengumuman",
    });
  } catch (error) {
    console.error("Error fetching announcement by ID:", error); // Tambahkan console.error
    res.status(500).json({ message: "Gagal mengambil pengumuman", error: error.message });
  }
};

// Update Pengumuman
export const updateAnnouncement = async (req, res) => {
  console.log("UPDATE PENGUMUMAN - REQ.PARAMS:", req.params);
  console.log("UPDATE PENGUMUMAN - REQ.BODY:", req.body);
  console.log("UPDATE PENGUMUMAN - REQ.FILE:", req.file); // SANGAT PENTING UNTUK DEBUG

  try {
    const { id } = req.params;
    const { judul, content, is_active } = req.body;

    if (!judul || !content) {
      // Jika ada file yang terlanjur diupload Multer karena validasi gagal, hapus
      if (req.file) {
        const tempPath = path.join(PENGUMUMAN_FILES_DIR_FROM_ROOT, req.file.filename);
        if(fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      return res.status(400).json({ message: "Judul dan Konten tidak boleh kosong." });
    }

    const [oldRows] = await db.query("SELECT file_path FROM pengumuman WHERE id = ?", [id]);
    if (oldRows.length === 0) {
      if (req.file) { // Hapus file yang terupload jika pengumuman tidak ada
        const tempPath = path.join(PENGUMUMAN_FILES_DIR_FROM_ROOT, req.file.filename);
        if(fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    const oldFileBasename = oldRows[0].file_path; // Ini hanya nama file, mis: "File-Lama-20250101.pdf"
    let newFileBasename = oldFileBasename;

    if (req.file) {
      newFileBasename = req.file.filename; // Nama file baru dari Multer

      if (oldFileBasename && oldFileBasename !== newFileBasename) {
        const oldFileSystemPath = path.join(PENGUMUMAN_FILES_DIR_FROM_ROOT, oldFileBasename);
        if (fs.existsSync(oldFileSystemPath)) {
          try {
            fs.unlinkSync(oldFileSystemPath);
            console.log(`File lama ${oldFileBasename} berhasil dihapus.`);
          } catch (unlinkErr) {
            console.error(`Gagal menghapus file lama ${oldFileBasename}:`, unlinkErr);
            // Pertimbangkan apakah akan melanjutkan atau mengembalikan error
          }
        }
      }
    }

    const activeStatus = (is_active === '1' || is_active === 1 || is_active === true) ? 1 : 0;

    await db.query(
      `UPDATE pengumuman SET judul = ?, content = ?, file_path = ?, is_active = ? WHERE id = ?`,
      [judul, content, newFileBasename, activeStatus, id]
    );

    res.status(200).json({
      data: { 
        id: parseInt(id, 10), 
        judul, 
        content, 
        file_path: newFileBasename, // Konsisten dengan nama kolom DB dan GET
        is_active: activeStatus 
      },
      message: "Pengumuman berhasil diperbarui",
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    // Jika ada file baru yang diupload tapi terjadi error saat proses DB, hapus file tersebut
    if (req.file && error) { // Hanya hapus jika ada error dan req.file ada
        const uploadedFilePath = path.join(PENGUMUMAN_FILES_DIR_FROM_ROOT, req.file.filename);
        if (fs.existsSync(uploadedFilePath)) {
            try {
                fs.unlinkSync(uploadedFilePath);
                console.log(`Rollback: File ${req.file.filename} yang baru diupload dihapus karena error: ${error.message}`);
            } catch (rollbackErr) {
                console.error(`Gagal melakukan rollback file ${req.file.filename}:`, rollbackErr);
            }
        }
    }
    res.status(500).json({ message: "Gagal memperbarui pengumuman", error: error.message });
  }
};

// Delete Pengumuman
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const [oldRows] = await db.query("SELECT file_path FROM pengumuman WHERE id = ?", [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    const file = oldRows[0].file_path;
    if (file) {
      const filePath = path.join("uploads/pengumuman", file);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.query("DELETE FROM pengumuman WHERE id = ?", [id]);

    res.status(200).json({ message: "Pengumuman berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus pengumuman", error: error.message });
  }
};
