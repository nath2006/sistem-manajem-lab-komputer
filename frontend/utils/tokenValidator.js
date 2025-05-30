/* eslint-disable no-unused-vars */

import { jwtDecode } from 'jwt-decode';

export const verifyToken = (token) => {
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);

    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return null;
    }

    return {
      userId: decoded.id,
      fullName: decoded.fullName,  
      username: decoded.username,
      role: decoded.role,
      email: decoded.email
    };
  } catch (error) {
  
    return null;
  }
};
