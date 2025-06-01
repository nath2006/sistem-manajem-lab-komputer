import db from "../config/db.js";
import path from "path";
import fs from "fs";

//Buat Data Perangkat Baru
export const createDevice = async (req, res) => {
  try {
    const {
      nama_perangkat, 
      spesifikasi, 
      status, 
      lab_id, 
      nomor_inventaris
    } = req.body;

    const foto_perangkat = req.file ? req.file.filename : null;

    const [result] = await db.query(
      "INSERT INTO perangkat (nama_perangkat, spesifikasi, status, lab_id, foto_perangkat, nomor_inventaris) VALUES (?,?,?,?,?,?)",
      [nama_perangkat, spesifikasi, status, lab_id,foto_perangkat, nomor_inventaris]
    );

    // Mengambil data yang baru saja di-insert beserta nama_lab untuk respons
    const [newDeviceRows] = await db.query(
      `SELECT p.*, l.nama_lab 
       FROM perangkat p 
       LEFT JOIN laboratorium l ON p.lab_id = l.lab_id 
       WHERE p.perangkat_id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      data: newDeviceRows[0], // Mengirim data lengkap termasuk nama_lab
      message: "Data Perangkat Baru Berhasil Ditambahkan"
    });
  } catch (error) {
    console.error("Error creating device:", error); // Log error lebih spesifik
    res.status(500).json({ 
      message: 'Membuat Perangkat Baru Gagal' ,
      error: error.message,
    });
  }
};

//Get All Perangkat (dengan nama_lab)
export const getAllDevice = async (req,res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         p.perangkat_id,
         p.nama_perangkat,
         p.spesifikasi,
         p.status,
         p.lab_id,
         p.foto_perangkat,
         p.nomor_inventaris,
         l.nama_lab -- Tambahkan kolom nama_lab dari tabel laboratorium
       FROM perangkat p
       LEFT JOIN laboratorium l ON p.lab_id = l.lab_id -- LEFT JOIN untuk tetap menampilkan perangkat meski lab_id tidak valid (jarang terjadi dengan FK)
       ORDER BY p.nama_perangkat ASC` // Tambahkan ORDER BY jika diinginkan
    );
    res.status(200).json({
      data: rows,
      message: 'Berhasil Mengambil Data Perangkat'
    });
  } catch (error) {
    console.error("Error fetching all devices:", error); // Log error lebih spesifik
    res.status(500).json({ 
      message: 'Mengambil Data Perangkat Gagal' , // Pesan disesuaikan sedikit
      error: error.message,
    });
  }
};

//Get Perangkat By ID (dengan nama_lab)
export const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT 
         p.perangkat_id,
         p.nama_perangkat,
         p.spesifikasi,
         p.status,
         p.lab_id,
         p.foto_perangkat,
         p.nomor_inventaris,
         l.nama_lab -- Tambahkan kolom nama_lab dari tabel laboratorium
       FROM perangkat p
       LEFT JOIN laboratorium l ON p.lab_id = l.lab_id
       WHERE p.perangkat_id = ?`, 
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        message: 'Data Perangkat Tidak Ditemukan' // Pesan disesuaikan
      });
    }

    res.status(200).json({
      data: rows[0],
      message: 'Berhasil Mengambil Data Perangkat'
    });
  } catch (error) {
    console.error(`Error fetching device by ID ${id}:`, error); // Log error lebih spesifik
    res.status(500).json({ 
      message: 'Mengambil Data Perangkat Gagal' ,
      error: error.message,
    });
  }
};

//Update data perangkat
export const updateDevice = async (req, res) => {
  try {
    const {id} = req.params;
    const { 
      nama_perangkat, 
      spesifikasi, 
      status, 
      lab_id, 
      nomor_inventaris
    } = req.body;
    
    const [oldRows] = await db.query(
      "SELECT foto_perangkat, lab_id FROM perangkat WHERE perangkat_id = ?", // Ambil juga lab_id lama jika perlu validasi
      [id]
    );

    if (oldRows.length === 0) {
      return res.status(404).json({ 
        message: 'Data Perangkat Tidak Ditemukan untuk diupdate' 
      });
    }
    const oldFotoPerangkat = oldRows[0].foto_perangkat;
    // const oldLabId = oldRows[0].lab_id; // Bisa digunakan jika ada logika validasi lab_id

    let newFotoPerangkat = oldFotoPerangkat;

    if(req.file) {
      newFotoPerangkat = req.file.filename;
      
      if(oldFotoPerangkat){
        const oldPath = path.join("uploads/perangkat", oldFotoPerangkat); // Pastikan base path "uploads/perangkat" benar
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (unlinkErr) {
            console.error("Gagal menghapus file lama:", unlinkErr);
            // Pertimbangkan apakah ini error fatal atau bisa diabaikan (misalnya hanya log)
          }
        }
      }
    }

    const [result] = await db.query(
      `UPDATE perangkat SET 
        nama_perangkat = ?, 
        spesifikasi = ?, 
        status = ?, 
        lab_id = ?, 
        foto_perangkat = ?, 
        nomor_inventaris = ? 
      WHERE perangkat_id = ?`,
      [
        nama_perangkat, 
        spesifikasi, 
        status, 
        lab_id, 
        newFotoPerangkat,
        nomor_inventaris,
        id
      ]
    );
    
    if (result.affectedRows === 0) {
      // Ini bisa terjadi jika ID ada tapi data yang diinput sama persis dengan data lama,
      // sehingga tidak ada baris yang 'terpengaruh'. Atau jika ID tidak ada.
      // Untuk konsistensi, kita anggap jika ID ada tapi tidak ada perubahan, itu bukan error 404.
      // Namun, jika ingin strict, bisa tetap 404 atau status lain.
      // Kita ambil ulang data untuk memastikan.
    }

    // Ambil data yang baru diupdate beserta nama_lab untuk respons
    const [updatedDeviceRows] = await db.query(
      `SELECT p.*, l.nama_lab 
       FROM perangkat p 
       LEFT JOIN laboratorium l ON p.lab_id = l.lab_id 
       WHERE p.perangkat_id = ?`,
      [id]
    );

    if (updatedDeviceRows.length === 0) {
        // Seharusnya tidak terjadi jika ID valid dan update berhasil (atau tidak ada perubahan)
        return res.status(404).json({ message: "Data Perangkat tidak ditemukan setelah update." });
    }

    res.status(200).json({
      data: updatedDeviceRows[0], // Mengirim data lengkap termasuk nama_lab
      message: 'Data Perangkat Berhasil Diupdate'
    });

  } catch (error) {
    console.error("Error updating device:", error); // Log error lebih spesifik
    res.status(500).json({ 
      message: 'Mengupdate Data Perangkat Gagal' ,
      error: error.message,
    });
    
  }
}

//Delete Perangkat
export const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const [oldRows] = await db.query(
      "SELECT foto_perangkat FROM perangkat WHERE perangkat_id = ?",
      [id]
    );

    if (oldRows.length === 0) {
      return res.status(404).json({ 
        message: 'Data Perangkat Tidak Ditemukan untuk dihapus' 
      });
    }
    const oldFotoPerangkat = oldRows[0].foto_perangkat;

    // Hapus record dari database terlebih dahulu
    const [result] = await db.query(
      "DELETE FROM perangkat WHERE perangkat_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      // Ini seharusnya tidak terjadi jika oldRows.length > 0 dan tidak ada proses lain
      return res.status(404).json({ 
        message: 'Data Perangkat Tidak Ditemukan saat mencoba menghapus dari DB' 
      });
    }

    // Jika record berhasil dihapus dari DB, baru hapus file gambar
    if (oldFotoPerangkat) {
      const oldPath = path.join("uploads/perangkat", oldFotoPerangkat); // Pastikan base path benar
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (unlinkErr) {
          console.error("Gagal menghapus file gambar setelah record DB dihapus:", unlinkErr);
          // Ini bukan error fatal untuk respons ke client, tapi perlu di-log
          // Anda bisa memilih untuk mengirim pesan tambahan di respons jika ini terjadi
        }
      }
    }

    res.status(200).json({
      message: "Data Perangkat Berhasil Dihapus",
    });
  } catch (error) {
    console.error("Error deleting device:", error); // Log error lebih spesifik
    // Cek apakah error karena foreign key constraint (misalnya jika perangkat masih dirujuk)
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
        return res.status(400).json({
            message: 'Gagal menghapus data perangkat karena masih digunakan di data lain (misalnya pemeriksaan, pengecekan, atau perbaikan).',
            error: error.message
        });
    }
    res.status(500).json({ 
      message: 'Menghapus Data Perangkat Gagal' ,
      error: error.message,
    });
  }
};
