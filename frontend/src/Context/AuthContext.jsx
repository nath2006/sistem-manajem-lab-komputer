// Context/AuthContext.js
import { createContext, useReducer, useEffect } from "react";
import Cookies from 'js-cookie';
import { verifyToken } from '../utils/tokenValidator'; // Pastikan path ini benar
import api from '../utils/api'; // Pastikan path ini benar
// import Lab from "../features/KelolaLaboratorium/Laboratorium"; // Hapus jika tidak digunakan

export const AuthContext = createContext();

const initialState = {
  isAuthenticated: false,
  user: null,         // Ini akan tetap username (string) sesuai pendekatan Anda
  userId: null,       // ID pengguna (angka/string)
  fullName: null,
  token: null,
  role: null,
  lab_id_kepala: null, // TAMBAHKAN INI ke initialState
  isLoading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return {
        // Sebaiknya spread state sebelumnya untuk menjaga properti lain jika ada
        // Namun, karena Anda mendefinisikan semua properti di sini, tidak wajib tapi lebih aman
        ...state, 
        isAuthenticated: true,
        user: action.payload.username,
        userId: action.payload.userId,
        fullName: action.payload.fullName,
        token: action.payload.token,
        role: action.payload.role,
        lab_id_kepala: action.payload.lab_id_kepala || null, // Ambil dari payload, pastikan ada koma di atasnya
        isLoading: false,
      };
    case "AUTH_ERROR":
    case "LOGOUT":
      Cookies.remove("auth_token");
      delete api.defaults.headers.common["Authorization"];
      return {
        ...initialState, // Reset ke initialState (yang sekarang punya lab_id_kepala: null)
        isLoading: false,
      };
    case "LOADING":
      return {
        ...state,
        isLoading: true,
      };
    case "LOADED":
      return {
        ...state,
        isLoading: false,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const loadAuth = async () => {
      dispatch({ type: "LOADING" });
      const token = Cookies.get("auth_token");
      console.log("AuthContext (User's Approach) - Token from cookies:", token); // DEBUG

      if (token) {
        const userDataFromToken = verifyToken(token); // verifyToken HARUS mengembalikan lab_id_kepala
        console.log("AuthContext (User's Approach) - Data from verifyToken:", userDataFromToken); // DEBUG PENTING

        if (userDataFromToken && userDataFromToken.userId) { 
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: {
              // Mengirim semua data yang dibutuhkan oleh reducer
              userId: userDataFromToken.userId,
              username: userDataFromToken.username,
              fullName: userDataFromToken.fullName,
              role: userDataFromToken.role,
              email: userDataFromToken.email, // Meskipun tidak langsung disimpan di state root, mungkin berguna di tempat lain
              lab_id_kepala: userDataFromToken.lab_id_kepala || null, // Kirim ini
              token: token,
            },
          });
        } else {
          console.warn("AuthContext (User's Approach): userDataFromToken tidak valid atau tidak ada userId.", userDataFromToken);
          Cookies.remove("auth_token");
          dispatch({ type: "AUTH_ERROR" });
        }
      } else {
        dispatch({ type: "LOADED" }); 
      }
    };

    loadAuth();
  }, []);

  useEffect(() => {
    console.log("AuthContext (User's Approach) - State berubah:", state);
    if (state.isAuthenticated && state.token) {
      Cookies.set("auth_token", state.token, {
        expires: 7,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
      });
      api.defaults.headers.common["Authorization"] = `Bearer ${state.token}`;
    }
    // Tidak perlu 'else' untuk hapus header di sini karena sudah dihandle di LOGOUT/AUTH_ERROR
  }, [state.isAuthenticated, state.token]);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children} 
    </AuthContext.Provider>
  );
};
