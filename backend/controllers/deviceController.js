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

    const newLab = {
      id: result.insertId,
      nama_perangkat, 
      spesifikasi, 
      status, 
      lab_id, 
      foto_perangkat,
      nomor_inventaris
    }

    res.status(201).json({
      data: newLab,
      message: "Data Perangkat Baru Berhasil Ditambahkan"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Membuat Perangkat Baru Gagal' ,
      error: error.message,
    });
  }
};

//Get All Perangkat
export const getAllDevice = async (req,res) => {
  try {
    const [rows] = await db.query("SELECT * FROM perangkat");
    res.status(200).json({
      data: rows,
      message: 'Berhasil Mengambil Data Perangkat'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Mengambil Data Perangkat' ,
      error: error.message,
    });
  }
};

//Get Perangkat By ID
export const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM perangkat WHERE perangkat_id = ?", [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        message: 'User Tidak Ditemukan' 
      });
    }

    res.status(200).json({
      data: rows[0],
      message: 'Berhasil Mengambil Data Perangkat'
    });
  } catch (error) {
    console.error(error);
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
    
    //Ambil data perangkat lama untuk mengetahui nama file lama
    const [oldRows] = await db.query(
      "SELECT * FROM perangkat WHERE perangkat_id = ?",
      [id]);

    if (oldRows.length === 0) {
      return res.status(404).json({ 
        message: 'Data Perangkat Tidak Ditemukan' 
      });
    }
    const oldFotoPerangkat = oldRows[0].foto_perangkat;

    let newFotoPerangkat = oldFotoPerangkat;

    //Jika user upload foto baru
    if(req.file) {
      newFotoPerangkat = req.file.filename;
      
      //Hapus file lama
      if(oldFotoPerangkat){
        const oldPath = path.join("uploads/perangkat", oldFotoPerangkat);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
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
      return res.status(404).json({ 
        message: 'Data Perangkat Tidak Ditemukan' 
      });
    }

    res.status(200).json({
      data: {
        id,
        nama_perangkat, 
        spesifikasi, 
        status, 
        lab_id, 
        foto_perangkat: newFotoPerangkat,
        nomor_inventaris
      },
      message: 'Data Perangkat Berhasil Diupdate'
    });

  } catch (error) {
    console.error(error);
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

    // Ambil data perangkat untuk mengetahui nama file gambar
    const [oldRows] = await db.query(
      "SELECT foto_perangkat FROM perangkat WHERE perangkat_id = ?",
      [id]
    );

    if (oldRows.length === 0) {
      return res.status(404).json({ 
        message: 'Data Perangkat Tidak Ditemukan' 
      });
    }

    const oldFotoPerangkat = oldRows[0].foto_perangkat;

    // Hapus file gambar dari server
    if (oldFotoPerangkat) {
      const oldPath = path.join("uploads/perangkat", oldFotoPerangkat);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const [result] = await db.query(
      "DELETE FROM perangkat WHERE perangkat_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: 'Data Perangkat Tidak Ditemukan' 
      });
    }

    res.status(200).json({
      message: "Data Perangkat Berhasil Dihapus",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Menghapus Data Perangkat Gagal' ,
      error: error.message,
    });
  }
};
