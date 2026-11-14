import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    // console.log("Authorization header not found");
    return res.status(403).json({ msg: "No token provided." });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7, authHeader.length)
    : authHeader;

  if (!token) {
    // console.log("Token not found in header");
    return res.status(403).json({ msg: "Token missing." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Simpan user ID di request agar bisa digunakan di controller lain (untuk logging)
    req.user = decoded;
    req.user_id = decoded.id; 

    next();
  } catch (error) {
    //console.log("Token verification failed:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ msg: "Token expired. Silakan Login Lagi." });
    }

    return res.status(401).json({ msg: "Unauthorized atau token salah" });
  }
};

// export const verifyAdmin = (req, res, next) => {
//   if (!req.user || req.user.role !== "Admin") {
//     return res.status(403).json({ msg: "Access Ditolak. Hanya Admin" });
//   }
//   next();
// };

// export const verifyKepalaLab = (req, res, next) => {
//   if (!req.user || req.user.role !== "Kepala Lab") {
//     return res.status(403).json({ msg: "Access Ditolak. Hanya Kepala Lab." });
//   }
//   next();
// };

// export const verifyKoorLab = (req, res, next) => {
//   if (!req.user || req.user.role !== "Kepala Koor Lab") {
//     return res.status(403).json({ msg: "Access Ditolak. Hanya Koordinator Lab." });
//   }
//   next();
// };

// export const verifyTeknisi = (req, res, next) => {
//   if (!req.user || req.user.role !== "Teknisi") {
//     return res.status(403).json({ msg: "Access Ditolak. Hanya Teknisi." });
//   }
//   next();
// };
export const authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Akses ditolak. Role tidak diizinkan.' });
    }

    next();
  };
};
