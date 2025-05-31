// utils/api.js
import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = import.meta.env.VITE_BASE_URL; // Misal: 'http://localhost:5500/api'

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json', // Default Content-Type untuk sebagian besar request API
  },
});

// Request interceptor: hanya untuk menambahkan token otentikasi
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor untuk menangani token refresh (kode Anda sebelumnya sudah OK)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        console.log("Attempting to refresh token...");
        // Menggunakan axios.create() instance baru untuk refresh token agar tidak terjebak loop interceptor
        const refreshApiClient = axios.create({ baseURL: BASE_URL });
        const refreshToken = Cookies.get('refresh_token'); // Asumsi Anda punya refresh token

        // Sesuaikan endpoint dan payload untuk refresh token Anda
        if (!refreshToken) {
            console.error("No refresh token found. Redirecting to login.");
            Cookies.remove('auth_token');
            window.location.href = '/login'; // Atau cara Anda menangani logout
            return Promise.reject(new Error("No refresh token"));
        }

        const response = await refreshApiClient.post(`/auth/refresh-token`, { refreshToken }); // Kirim refresh token
        const newAuthToken = response.data.token; // Sesuaikan dengan respons API Anda
        const newRefreshToken = response.data.refreshToken; // Jika API juga mengirim refresh token baru
        
        if (newAuthToken) {
          console.log("Token refreshed successfully.");
          Cookies.set('auth_token', newAuthToken, { 
            expires: 7, // Atau sesuai durasi token Anda
            secure: import.meta.env.PROD, // true jika production
            sameSite: 'Strict'
          });
          if (newRefreshToken) {
            Cookies.set('refresh_token', newRefreshToken, { /* ...opsi cookie... */ });
          }
          
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAuthToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newAuthToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error("New token not received after refresh attempt.");
        }
      } catch (refreshError) {
        console.error("Refresh token failed, logging out:", refreshError.response?.data || refreshError.message);
        Cookies.remove('auth_token');
        Cookies.remove('refresh_token');
        window.location.href = '/login'; // Atau cara Anda menangani logout
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Fungsi API standar (menggunakan Content-Type default: application/json)
export const get = async (endpoint, params = {}) => {
  try {
    const response = await apiClient.get(endpoint, { params });
    return response.data;
  } catch (error) {
    console.error(`Error in GET request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error;
  }
};

export const post = async (endpoint, data = {}) => {
  try {
    // Menggunakan apiClient yang defaultnya application/json
    const response = await apiClient.post(endpoint, data);
    return response; // Mengembalikan seluruh objek response
  } catch (error) {
    console.error(`Error in POST request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error;
  }
};

export const put = async (endpoint, data = {}) => {
  try {
    // Menggunakan apiClient yang defaultnya application/json
    const response = await apiClient.put(endpoint, data);
    return response; // Mengembalikan seluruh objek response
  } catch (error) {
    console.error(`Error in PUT request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error;
  }
};

export const deleteData = async (endpoint) => {
  try {
    const response = await apiClient.delete(endpoint);
    return response; // Mengembalikan seluruh objek response
  } catch (error) {
    console.error(`Error in DELETE request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error;
  }
};


// --- FUNGSI BARU UNTUK FILE UPLOAD ---
// Fungsi ini akan digunakan ketika Anda perlu mengirim FormData (misalnya, upload file)

/**
 * Mengirim request POST dengan FormData (untuk upload file).
 * @param {string} endpoint - Endpoint API.
 * @param {FormData} formData - Objek FormData yang berisi data dan file.
 * @returns {Promise<AxiosResponse<any>>} - Respons dari Axios.
 */
export const postWithFile = async (endpoint, formData) => {
  try {
    // Menggunakan apiClient agar interceptor (misalnya untuk token) tetap berjalan,
    // tetapi kita override header Content-Type secara spesifik untuk request ini.
    // Mengatur Content-Type menjadi 'undefined' atau menghapusnya akan membuat Axios/browser
    // secara otomatis mengatur Content-Type yang benar untuk FormData (multipart/form-data dengan boundary).
    const response = await apiClient.post(endpoint, formData, {
      headers: {
        'Content-Type': undefined, // Biarkan Axios/browser yang atur untuk FormData
      },
    });
    return response;
  } catch (error) {
    console.error(`Error in POST with file request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error;
  }
};

/**
 * Mengirim request PUT dengan FormData (untuk update data dengan file).
 * @param {string} endpoint - Endpoint API.
 * @param {FormData} formData - Objek FormData yang berisi data dan file.
 * @returns {Promise<AxiosResponse<any>>} - Respons dari Axios.
 */
export const putWithFile = async (endpoint, formData) => {
  try {
    const response = await apiClient.put(endpoint, formData, {
      headers: {
        'Content-Type': undefined, // Biarkan Axios/browser yang atur untuk FormData
      },
    });
    return response;
  } catch (error) {
    console.error(`Error in PUT with file request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error;
  }
};

export default apiClient; // Anda bisa tetap ekspor apiClient jika digunakan di tempat lain
