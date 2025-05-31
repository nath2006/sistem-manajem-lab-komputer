// labController.js (atau nama file controller Anda)
import db from "../config/db.js"; // Sesuaikan path ke konfigurasi database Anda
import fs from "fs";
import path from "path";

// Path dasar tempat Multer menyimpan file untuk LABORATORIUM
// Harus konsisten dengan konfigurasi Multer Anda (basePath "uploads" + subfolder "labs")
const LAB_FILES_DIR_FROM_ROOT = path.join(process.cwd(), 'uploads', 'labs');

// Buat Data Lab Baru
export const createLab = async (req, res) => {
  console.log("CREATE LAB - REQ.BODY:", req.body);
  console.log("CREATE LAB - REQ.FILE:", req.file);

  try {
    const {
      nama_lab, 
      lokasi, 
      kapasitas,
      kepala_lab_id, // Ini harus ID user yang valid
      deskripsi,
      status, 
      jam_buka, 
      jam_tutup, 
    } = req.body;

    // Validasi input dasar
    if (!nama_lab || !lokasi || !kapasitas || !kepala_lab_id || !status || !jam_buka || !jam_tutup) {
      if (req.file) { // Hapus file yang terlanjur diupload jika validasi gagal
          const tempPath = path.join(LAB_FILES_DIR_FROM_ROOT, req.file.filename);
          if(fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      return res.status(400).json({ message: "Semua field yang wajib diisi harus lengkap." });
    }

    // Dapatkan nama file dari Multer jika ada file yang diupload
    const foto_lab_filename = req.file ? req.file.filename : null;

    const query = `
      INSERT INTO laboratorium 
      (nama_lab, lokasi, kapasitas, kepala_lab_id, deskripsi, status, jam_buka, jam_tutup, foto_lab) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      nama_lab, lokasi, kapasitas, kepala_lab_id, deskripsi, 
      status, jam_buka, jam_tutup, foto_lab_filename
    ];

    const [result] = await db.query(query, params);
    const newLabId = result.insertId;

    // Ambil data lab yang baru dibuat beserta nama kepala lab untuk respons
    const [newLabData] = await db.query(`
      SELECT l.*, u.nama_lengkap AS nama_kepala_lab 
      FROM laboratorium l
      LEFT JOIN user u ON l.kepala_lab_id = u.user_id
      WHERE l.lab_id = ?
    `, [newLabId]);

    res.status(201).json({ 
      data: newLabData.length > 0 ? newLabData[0] : { id: newLabId, ...req.body, foto_lab: foto_lab_filename }, // Fallback jika join gagal
      message: 'Data Lab Berhasil Ditambahkan'
    });
  } catch (error) {
    console.error("ERROR CREATE LAB:", error);
    if (req.file) { // Hapus file jika terjadi error saat insert DB
        const uploadedFilePath = path.join(LAB_FILES_DIR_FROM_ROOT, req.file.filename);
        if (fs.existsSync(uploadedFilePath)) {
            try {
                fs.unlinkSync(uploadedFilePath);
                console.log(`Rollback: File ${req.file.filename} dihapus karena error DB: ${error.message}`);
            } catch (rollbackErr) {
                console.error(`Gagal rollback file ${req.file.filename}:`, rollbackErr);
            }
        }
    }
    res.status(500).json({ 
      message: 'Membuat Data Lab Baru Gagal',
      error: error.message,
    });
  }
};

// Get All Lab (dengan Nama Kepala Lab)
export const getAllLab = async (req, res) => {
  try {
    const query = `
      SELECT 
        l.lab_id,
        l.nama_lab,
        l.lokasi,
        l.kapasitas,
        l.kepala_lab_id,
        u.nama_lengkap AS nama_kepala_lab, -- Nama kepala lab dari tabel user
        l.deskripsi,
        l.status,
        l.jam_buka,
        l.jam_tutup,
        l.foto_lab
      FROM 
        laboratorium l
      LEFT JOIN 
        user u ON l.kepala_lab_id = u.user_id
      ORDER BY l.nama_lab ASC;
    `;
    const [rows] = await db.query(query);
    
    // Format data untuk frontend agar konsisten, kepala_lab menjadi objek
    const formattedData = rows.map(row => ({
        ...row,
        kepala_lab: { // Membuat objek nested untuk kepala_lab
            user_id: row.kepala_lab_id,
            nama_lengkap: row.nama_kepala_lab
        }
    }));

    res.status(200).json({
      data: formattedData,
      message: 'Berhasil Mengambil Data Lab'
    });
  } catch (error) {
    console.error("ERROR GET ALL LAB:", error);
    res.status(500).json({ 
      message: 'Mengambil Data Lab Gagal',
      error: error.message,
    });
  }
};

// Get Lab By ID (dengan Nama Kepala Lab)
export const getLabById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        l.lab_id,
        l.nama_lab,
        l.lokasi,
        l.kapasitas,
        l.kepala_lab_id,
        u.nama_lengkap AS nama_kepala_lab, -- Nama kepala lab
        l.deskripsi,
        l.status,
        l.jam_buka,
        l.jam_tutup,
        l.foto_lab
      FROM 
        laboratorium l
      LEFT JOIN 
        user u ON l.kepala_lab_id = u.user_id
      WHERE 
        l.lab_id = ?;
    `;
    const [rows] = await db.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        message: 'Data Lab Tidak Ditemukan' 
      });
    }

    const labData = rows[0];
    // Format data agar kepala_lab menjadi objek
    const formattedData = {
        ...labData,
        kepala_lab: {
            user_id: labData.kepala_lab_id,
            nama_lengkap: labData.nama_kepala_lab
        }
    };

    res.status(200).json({
      data: formattedData,
      message: 'Berhasil Mengambil Data Lab'
    });
  } catch (error) {
    console.error("ERROR GET LAB BY ID:", error);
    res.status(500).json({ 
      message: 'Mengambil Data Lab Gagal',
      error: error.message,
    });
  }
};

// Update data lab (dengan penanganan file foto dan path yang benar)
export const updateLab = async (req, res) => {
  console.log("UPDATE LAB - REQ.PARAMS:", req.params);
  console.log("UPDATE LAB - REQ.BODY:", req.body);
  console.log("UPDATE LAB - REQ.FILE:", req.file);

  try {
    const { id } = req.params;
    const {
      nama_lab, lokasi, kapasitas, kepala_lab_id,
      deskripsi, status, jam_buka, jam_tutup,
    } = req.body;

    if (!nama_lab || !lokasi || !kapasitas || !kepala_lab_id || !status || !jam_buka || !jam_tutup) {
        if (req.file) {
            const tempPath = path.join(LAB_FILES_DIR_FROM_ROOT, req.file.filename);
            if(fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
        return res.status(400).json({ message: "Semua field yang wajib diisi harus lengkap." });
    }

    const [oldRows] = await db.query("SELECT foto_lab FROM laboratorium WHERE lab_id = ?", [id]);
    if (oldRows.length === 0) {
      if (req.file) {
          const tempPath = path.join(LAB_FILES_DIR_FROM_ROOT, req.file.filename);
          if(fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
      return res.status(404).json({ message: "Data Lab Tidak Ditemukan" });
    }

    const oldFotoLabBasename = oldRows[0].foto_lab; // Nama file lama dari DB
    let newFotoLabBasename = oldFotoLabBasename; // Defaultnya adalah file lama

    if (req.file) {
      newFotoLabBasename = req.file.filename; // Nama file baru dari Multer

      if (oldFotoLabBasename && oldFotoLabBasename !== newFotoLabBasename) {
        const oldFileSystemPath = path.join(LAB_FILES_DIR_FROM_ROOT, oldFotoLabBasename);
        if (fs.existsSync(oldFileSystemPath)) {
          try {
            fs.unlinkSync(oldFileSystemPath);
            console.log(`File lab lama ${oldFotoLabBasename} berhasil dihapus.`);
          } catch (unlinkErr) {
            console.error(`Gagal menghapus file lab lama ${oldFotoLabBasename}:`, unlinkErr);
          }
        }
      }
    }

    const queryUpdate = `
      UPDATE laboratorium SET 
        nama_lab = ?, lokasi = ?, kapasitas = ?, kepala_lab_id = ?, 
        deskripsi = ?, status = ?, jam_buka = ?, jam_tutup = ?, foto_lab = ? 
      WHERE lab_id = ?
    `;
    const paramsUpdate = [
      nama_lab, lokasi, kapasitas, kepala_lab_id, deskripsi, 
      status, jam_buka, jam_tutup, newFotoLabBasename, id
    ];

    const [result] = await db.query(queryUpdate, paramsUpdate);

    if (result.affectedRows === 0) {
        // Ini seharusnya tidak terjadi jika pengecekan oldRows di atas sudah ada
        return res.status(404).json({ message: "Data Lab Tidak Ditemukan saat update" });
    }
    
    // Ambil data lab yang baru diupdate beserta nama kepala lab untuk respons
    const [updatedLabData] = await db.query(`
      SELECT l.*, u.nama_lengkap AS nama_kepala_lab 
      FROM laboratorium l
      LEFT JOIN user u ON l.kepala_lab_id = u.user_id
      WHERE l.lab_id = ?
    `, [id]);

    res.status(200).json({
      data: updatedLabData.length > 0 ? updatedLabData[0] : { id, ...req.body, foto_lab: newFotoLabBasename }, // Fallback
      message: "Data Lab Berhasil Diupdate",
    });
  } catch (error) {
    console.error("ERROR UPDATE LAB:", error);
     if (req.file) {
        const uploadedFilePath = path.join(LAB_FILES_DIR_FROM_ROOT, req.file.filename);
        if (fs.existsSync(uploadedFilePath)) {
            try {
                fs.unlinkSync(uploadedFilePath);
                console.log(`Rollback: File lab ${req.file.filename} dihapus karena error DB: ${error.message}`);
            } catch (rollbackErr) {
                console.error(`Gagal rollback file lab ${req.file.filename}:`, rollbackErr);
            }
        }
    }
    res.status(500).json({
      message: "Mengupdate Data Lab Gagal",
      error: error.message,
    });
  }
};

// Delete Lab (dengan penghapusan file foto)
export const deleteLab = async (req, res) => {
  console.log("DELETE LAB - REQ.PARAMS:", req.params);
  try {
    const { id } = req.params;

    const [oldRows] = await db.query("SELECT foto_lab FROM laboratorium WHERE lab_id = ?", [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ message: "Data Lab Tidak Ditemukan" });
    }
    const oldFotoLabBasename = oldRows[0].foto_lab;

    const [result] = await db.query("DELETE FROM laboratorium WHERE lab_id = ?", [id]);
    if (result.affectedRows === 0) {
      // Seharusnya tidak terjadi karena sudah dicek di atas
      return res.status(404).json({ message: "Data Lab Tidak Ditemukan saat delete" });
    }

    if (oldFotoLabBasename) {
      const oldFileSystemPath = path.join(LAB_FILES_DIR_FROM_ROOT, oldFotoLabBasename);
      if (fs.existsSync(oldFileSystemPath)) {
        try {
          fs.unlinkSync(oldFileSystemPath);
          console.log(`File foto lab ${oldFotoLabBasename} berhasil dihapus.`);
        } catch (unlinkErr) {
          console.error(`Gagal menghapus file foto lab ${oldFotoLabBasename}:`, unlinkErr);
        }
      }
    }

    res.status(200).json({ message: "Data Lab Berhasil Dihapus" });
  } catch (error) {
    console.error("ERROR DELETE LAB:", error);
    // Jika error disebabkan oleh foreign key constraint, pesannya akan lebih spesifik
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.message.includes('foreign key constraint fails')) {
        return res.status(400).json({
            message: "Gagal menghapus data lab karena masih digunakan di data lain (misalnya jadwal, perangkat, atau pengajuan).",
            error: error.message
        });
    }
    res.status(500).json({
      message: "Menghapus Data Lab Gagal",
      error: error.message,
    });
  }
};
