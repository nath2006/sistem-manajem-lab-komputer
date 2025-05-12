import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import db from '../config/db.js';

dotenv.config();

const generateAccesToken = (user) => {
  return jwt.sign(
    {
      id: user.user_id,
      username: user.username,
      password: user.password,
      fullName: user.nama_lengkap,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    //token akan expired dalam 1 jam
    { expiresIn: '1h' }
  );
}

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.user_id,
      username: user.username,
      password: user.password,
      fullName: user.nama_lengkap,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    //Refresh token akan expired dalam 7 hari
    { expiresIn: '7d' }
  );
}

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const query = 'SELECT * FROM user WHERE username = ?';
    //query ke dalam database
    const [rows] = await db.query(query, [username]);

    //query untuk cek apakah username dan password ada di dalam database
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const user = rows[0];

    //query untuk cek apakah password yang diinputkan sama dengan password yang ada di dalam database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const accessToken = generateAccesToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      msg: 'Login successful',
      token: accessToken,
      refreshToken : refreshToken,
      username: user.username,
      fullName: user.nama_lengkap,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
      console.error("Error in login function:", error);
      return res.status(500).json({
        msg: "Login Failed",
        error: error.message,
      });
  }
}

export const refreshToken = (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not found' });
  }

  jwt.verify(
    refreshToken,
    process.env.JWT_SECRET,
    (error, decoded) => {
      if(error) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }

      //untuk debug di console
      console.log('Decoded refresh token:', decoded);

      if(!decoded.full_name){
        return res.status(403).json({ message: 'Invalid refresh token' });
      }

      const newAccessToken = generateAccesToken(
        {
          id: decoded.id,
          username: decoded.username,
          password: decoded.password,
          fullName: decoded.nama_lengkap,
          email: decoded.email,
          role: decoded.role,
        }
      );

      return res.status(200).json({
        token: newAccessToken,
        username: decoded.username,
        fullName: decoded.nama_lengkap,
        role: decoded.role
      });
    }
  )
}

export const logout = (req, res) => {
  res.clearCookie('refreshToken');
  return res.status(200).json({ message: 'Logout successful' });
}
