// authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import db from '../config/db.js';

dotenv.config();

// Fungsi untuk membuat Access Token
const generateAccessToken = (user) => { // Perbaikan: nama fungsi konsisten
  const payload = {
    id: user.user_id,
    username: user.username,
    // Jangan sertakan password dalam token!
    fullName: user.nama_lengkap,
    email: user.email,
    role: user.role,
  };
  // Tambahkan lab_id_kepala ke payload jika ada
  if (user.role === 'Kepala Lab' && user.lab_id_kepala) {
    payload.lab_id_kepala = user.lab_id_kepala;
  }
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '1h' } // Token akan expired dalam 1 jam
  );
}

// Fungsi untuk membuat Refresh Token
const generateRefreshToken = (user) => { // Perbaikan: nama fungsi konsisten
  const payload = {
    id: user.user_id,
    username: user.username,
    // Jangan sertakan password dalam token!
    fullName: user.nama_lengkap, // Perbaikan: Menggunakan nama_lengkap dari user object
    email: user.email,
    role: user.role,
  };
  // Tambahkan lab_id_kepala ke payload jika ada
  if (user.role === 'Kepala Lab' && user.lab_id_kepala) {
    payload.lab_id_kepala = user.lab_id_kepala;
  }
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, // Gunakan secret berbeda untuk refresh token jika ada
    { expiresIn: '7d' } // Refresh token akan expired dalam 7 hari
  );
}

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username dan Password wajib diisi.' });
    }

    const query = 'SELECT * FROM user WHERE username = ?';
    const [rows] = await db.query(query, [username]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Username atau Password Salah' });
    }
    const user = rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Username atau Password Salah' });
    }

    // Jika user adalah Kepala Lab, ambil lab_id yang diampu
    let labIdKepala = null;
    if (user.role === 'Kepala Lab') {
      const [labRows] = await db.query(
        'SELECT lab_id FROM laboratorium WHERE kepala_lab_id = ? LIMIT 1',
        [user.user_id]
      );
      if (labRows.length > 0) {
        labIdKepala = labRows[0].lab_id;
        user.lab_id_kepala = labIdKepala; // Tambahkan ke objek user untuk generate token
      } else {
        console.warn(`Kepala Lab dengan user_id: ${user.user_id} tidak terhubung dengan lab manapun.`);
        // Anda bisa memutuskan apakah ini error atau tidak. Untuk saat ini kita biarkan labIdKepala null.
      }
    }

    const accessToken = generateAccessToken(user); // user sudah mengandung lab_id_kepala jika dia KaLab
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict', // 'Strict' lebih aman
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });     
    
    await db.query(
      "UPDATE user SET is_online = true WHERE user_id = ?", // Menggunakan true bukan 1 untuk boolean
      [user.user_id]
    );

    // Data yang dikirim ke frontend setelah login
    const responsePayload = {
      msg: 'Login successful',
      userId: user.user_id,
      token: accessToken,
      // refreshToken tidak perlu dikirim di body jika sudah di httpOnly cookie
      username: user.username,
      fullName: user.nama_lengkap,
      email: user.email,
      role: user.role,
    };
    if (user.role === 'Kepala Lab' && labIdKepala) {
      responsePayload.lab_id_kepala = labIdKepala;
    }

    return res.status(200).json(responsePayload);

  } catch (error) {
      console.error("Error in login function:", error);
      return res.status(500).json({
        msg: "Login Failed",
        error: error.message,
      });
  }
}

export const refreshToken = async (req, res) => { // Tambahkan async karena ada query DB
  const refreshTokenFromCookie = req.cookies.refreshToken;
  if (!refreshTokenFromCookie) {
    return res.status(401).json({ message: 'Refresh token tidak ditemukan' });
  }

  try {
    const decoded = jwt.verify(refreshTokenFromCookie, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Optional: Verifikasi user masih ada di DB berdasarkan decoded.id
    const [userRows] = await db.query('SELECT * FROM user WHERE user_id = ?', [decoded.id]);
    if (userRows.length === 0) {
        return res.status(403).json({ message: 'User tidak lagi valid.' });
    }
    const userFromDb = userRows[0];

    // Jika user adalah Kepala Lab, ambil lagi lab_id_kepala dari DB untuk konsistensi
    // atau pastikan refresh token juga membawa info ini jika perlu.
    // Untuk kesederhanaan, kita re-build user object dari DB.
    let labIdKepalaForNewToken = null;
    if (userFromDb.role === 'Kepala Lab') {
        const [labRows] = await db.query(
            'SELECT lab_id FROM laboratorium WHERE kepala_lab_id = ? LIMIT 1',
            [userFromDb.user_id]
        );
        if (labRows.length > 0) {
            labIdKepalaForNewToken = labRows[0].lab_id;
            userFromDb.lab_id_kepala = labIdKepalaForNewToken; // Tambahkan ke objek user untuk generate token
        }
    }

    const newAccessToken = generateAccessToken(userFromDb); // Gunakan userFromDb yang sudah ada lab_id_kepala jika KaLab

    // Data yang dikirim ke frontend setelah refresh token
    const responsePayload = {
        token: newAccessToken,
        userId: userFromDb.user_id, // Kirim juga userId
        username: userFromDb.username,
        fullName: userFromDb.nama_lengkap,
        role: userFromDb.role,
    };
    if (userFromDb.role === 'Kepala Lab' && labIdKepalaForNewToken) {
        responsePayload.lab_id_kepala = labIdKepalaForNewToken;
    }

    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error("Error refreshing token:", error);
    if (error.name === 'TokenExpiredError') {
        return res.status(403).json({ message: 'Refresh token kedaluwarsa, silakan login kembali.' });
    }
    return res.status(403).json({ message: 'Refresh token tidak valid.' });
  }
}

export const logout = async (req, res) => {
  try {
    // req.user didapat dari middleware verifyToken
    const userId = req.user?.id || req.user?.userId; // Sesuaikan dengan properti ID di req.user Anda

    if (userId) { // Update is_online hanya jika userId teridentifikasi
      await db.query("UPDATE user SET is_online = false WHERE user_id = ?", [userId]); // Menggunakan false bukan 0
    }
  
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict', 
        // path: '/' // Tambahkan path jika cookie diset dengan path tertentu
    });
    
    return res.status(200).json({ message: 'Logout successful' });
  
  } catch (error) {
    console.error("Error in logout function:", error);
    return res.status(500).json({
      msg: "Logout Failed",
      error: error.message,
    });
  }
};
