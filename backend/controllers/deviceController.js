import db from "../config/db.js";

//Buat Data Perangkat Baru
export const createDevice = async (req, res) => {
  try {
    const {nama_perangkat, spesifikasi, status, lokasi, lab_id, nomor_inventaris} = req.body;

    const [result] = await db.query(
      "INSERT INTO perangkat (nama_perangkat, spesifikasi, status, lokasi, lab_id, nomor_inventaris) VALUES (?,?,?,?,?,?)",
      [nama_perangkat, spesifikasi, status, lokasi, lab_id, nomor_inventaris]
    );

    const newLab = {
      id: result.insertId,
      nama_perangkat, 
      spesifikasi, 
      status, 
      lokasi, 
      lab_id, 
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
export const getPerangkatById = async (req, res) => {
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

