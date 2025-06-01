// Context/AuthContext.js
import { createContext, useReducer, useEffect } from "react";
import Cookies from 'js-cookie';
import { verifyToken } from '../utils/tokenValidator';
import api from '../utils/api';

export const AuthContext = createContext();

const initialState = {
  isAuthenticated: false,
  user: null,
  userId: null,
  fullName: null,
  token: null,
  role: null,
  isLoading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return {
        isAuthenticated: true,
        user: action.payload.username,
        userId: action.payload.userId,
        fullName: action.payload.fullName,
        token: action.payload.token,
        role: action.payload.role,
        isLoading: false,
      };
    case "AUTH_ERROR":
    case "LOGOUT":
      return {
        ...initialState,
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

      if (token) {
        const userData = verifyToken(token);

        if (userData) {
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: {
              fullName: userData.fullName,
              userId: userData.userId,
              username: userData.username,
              token: token,
              role: userData.role,
            },
          });
        } else {
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
    if (state.isAuthenticated && state.token) {
      Cookies.set("auth_token", state.token, {
        expires: 7,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      api.defaults.headers.common["Authorization"] = `Bearer ${state.token}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, [state.isAuthenticated, state.token]);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};
