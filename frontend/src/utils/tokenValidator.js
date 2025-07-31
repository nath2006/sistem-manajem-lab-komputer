// utils/tokenValidator.js
import { jwtDecode } from 'jwt-decode';

export const verifyToken = (token) => {
  if (!token) {
    console.warn("TokenValidator: Tidak ada token.");
    return null;
  }

  try {
    const decoded = jwtDecode(token);
    console.log("TokenValidator - Decoded JWT payload:", decoded); 

    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      console.warn("TokenValidator: Token kedaluwarsa.");
      return null;
    }

    return {
      userId: decoded.id,
      fullName: decoded.fullName,  
      username: decoded.username || "N/A",
      role: decoded.role || null,
      email: decoded.email || "N/A", 
      lab_id_kepala: decoded.lab_id_kepala || decoded.labIdKepala || null 
    };
  } catch (error) {
    console.error("TokenValidator: Gagal decode token:", error);
    return null;
  }
};
