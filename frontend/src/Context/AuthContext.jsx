/* eslint-disable react-refresh/only-export-components */
/* eslint-disable no-undef */
import { createContext, useReducer, useEffect } from "react";
import Cookies from 'js-cookie';
import { verifyToken } from '../utils/tokenValidator';
import api from '../utils/api';

export const AuthContext = createContext();

const initialState = {
  isAuthenticated: false,
  user: null,
  fullName: null,
  token: null,
  role: null,
  isLoading: true
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return {
        isAuthenticated: true,
        user: action.payload.username,
        fullName: action.payload.fullName,
        token: action.payload.token,
        role: action.payload.role,
        isLoading: false
      };
    case "AUTH_ERROR":
    case "LOGOUT":
      return {
        isAuthenticated: false,
        user: null,
        fullName: null,
        token: null,
        role: null,
        isLoading: false
      };
    case "LOADING":
      return {
        ...state,
        isLoading: true
      };
    case "LOADED":
      return {
        ...state,
        isLoading: false
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check token on mount and set auth state
  useEffect(() => {
    const loadAuth = async () => {
      dispatch({ type: "LOADING" });
      const token = Cookies.get('auth_token');
      
      if (token) {
        const userData = verifyToken(token);
        
        if (userData) {
          // Set auth headers for all future requests
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: {
              fullName: userData.fullName,
              username: userData.username,
              token: token,
              role: userData.role
            }
          });
        } else {
          // Token invalid, clear it
          Cookies.remove('auth_token');
          dispatch({ type: "AUTH_ERROR" });
        }
      } else {
        dispatch({ type: "LOADED" });
      }
    };
    
    loadAuth();
  }, []);

  // Store token in cookie when auth state changes
  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      // Store token in cookie with secure settings
      Cookies.set('auth_token', state.token, { 
        expires: 7, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      // Set auth header for all requests
      api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
    } else if (!state.isAuthenticated) {
      // Remove auth header
      delete api.defaults.headers.common['Authorization'];
    }
  }, [state.isAuthenticated, state.token]);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};
