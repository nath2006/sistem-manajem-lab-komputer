import db from '../config/db.js';
import bcrypt from 'bcrypt';

//Buat User Baru
export const createUser = async (req, res) => {
  try {
    const { username, password, nama_lengkap, email, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await db.query(
      "INSERT INTO user (username, password, nama_lengkap, email, role) VALUES (?, ?, ?, ?, ?)",
      [username, hashedPassword, nama_lengkap, email, role]
    );

    const newUser = {
      id: result.insertId,
      username,
      nama_lengkap,
      email,
      role
    }

    res.status(201).json({ 
      data: newUser,
      message: 'User Berhasil Ditambahkan '
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Membuat User Baru Gagal' ,
      error: error.message,
    });
  }
};

//Get All User
export const getAllUser = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM user");
    res.status(200).json({
      data: rows,
      message: 'Berhasil Mengambil Data User'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Mengambil Data User Gagal' ,
      error: error.message,
    });
  }
};

//Get User By ID  
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM user WHERE user_id = ?", [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        message: 'User Tidak Ditemukan' 
      });
    }

    res.status(200).json({
      data: rows[0],
      message: 'Berhasil Mengambil Data User'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Mengambil Data User Gagal' ,
      error: error.message,
    });
  }
};

//Update User
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, nama_lengkap, email, role, is_active } = req.body; // Tambahkan is_active jika dikirim dari frontend

    let query = "UPDATE user SET username = ?, nama_lengkap = ?, email = ?, role = ?";
    const queryParams = [username, nama_lengkap, email, role];

    // Tambahkan is_active ke query jika ada
    // Backend Anda mungkin mengharapkan 'is_active' atau 'is_online'
    // Sesuaikan nama field di bawah ini dengan skema database Anda
    // if (is_active !== undefined) { // Atau periksa field lain seperti is_online
    //    query += ", is_active = ?"; // atau is_online = ?
    //    queryParams.push(is_active); // Kirim 1 atau 0
    // }


    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ", password = ?";
      queryParams.push(hashedPassword);
    }

    query += " WHERE user_id = ?";
    queryParams.push(id);

    const [result] = await db.query(query, queryParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'User Tidak Ditemukan'
      });
    }

    res.status(200).json({
      message: 'User Berhasil Diupdate'
    });
  } catch (error) {
    console.error("Error updating user:", error); // Logging yang lebih detail
    res.status(500).json({
      message: 'Mengupdate User Gagal',
      error: error.message,
    });
  }
};

// Hapus User
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah user menjadi kepala lab
    const [labRelation] = await db.query(
      "SELECT * FROM laboratorium WHERE kepala_lab_id = ?",
      [id]
    );

    if (labRelation.length > 0) {
      return res.status(400).json({
        message: "Harap ubah kepala lab jika ingin melanjutkan menghapus user"
      });
    }

    // Lanjut hapus jika tidak ada relasi
    const [result] = await db.query(
      "DELETE FROM user WHERE user_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        message: 'User Tidak Ditemukan' 
      });
    }

    res.status(200).json({
      message: 'User Berhasil Dihapus'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      message: 'Menghapus User Gagal',
      error: error.message
    });
  }
};
