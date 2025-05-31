// utils/api.js
import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = import.meta.env.VITE_BASE_URL; // Misal: 'http://localhost:5500/api'

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json', // Default Content-Type untuk request JSON biasa
  },
});

// Request interceptor: untuk menambahkan token otentikasi
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

// Response interceptor untuk menangani token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Tandai request agar tidak di-retry berulang kali jika refresh gagal
      
      try {
        console.log("Attempting to refresh token...");
        const refreshApiClient = axios.create({ baseURL: BASE_URL }); // Instance baru untuk menghindari loop interceptor
        const refreshToken = Cookies.get('refresh_token');

        if (!refreshToken) {
          console.error("No refresh token found. Redirecting to login.");
          Cookies.remove('auth_token');
          // window.location.href = '/login'; // Pertimbangkan cara penanganan yang lebih baik daripada redirect paksa
          return Promise.reject(new Error("No refresh token available for refresh attempt."));
        }

        // Sesuaikan endpoint dan payload untuk refresh token Anda
        const response = await refreshApiClient.post(`/auth/refresh-token`, { refreshToken }); 
        const newAuthToken = response.data.token; // Sesuaikan dengan struktur respons API Anda
        const newRefreshToken = response.data.refreshToken; 
        
        if (newAuthToken) {
          console.log("Token refreshed successfully.");
          Cookies.set('auth_token', newAuthToken, { 
            expires: 7, 
            secure: import.meta.env.PROD, 
            sameSite: 'Strict'
          });
          if (newRefreshToken) { // Jika backend juga mengirim refresh token baru
            Cookies.set('refresh_token', newRefreshToken, { /* opsi cookie, misal httpOnly, secure, sameSite */ });
          }
          
          // Update default header untuk request apiClient selanjutnya
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAuthToken}`;
          // Update header untuk request asli yang gagal
          originalRequest.headers['Authorization'] = `Bearer ${newAuthToken}`;
          return apiClient(originalRequest); // Ulangi request asli dengan token baru
        } else {
          // Jika tidak ada token baru meskipun refresh berhasil (seharusnya tidak terjadi jika API benar)
          throw new Error("New token not received after refresh attempt.");
        }
      } catch (refreshError) {
        console.error("Refresh token failed, logging out:", refreshError.response?.data || refreshError.message);
        Cookies.remove('auth_token');
        Cookies.remove('refresh_token');
        // window.location.href = '/login'; // Pertimbangkan cara penanganan yang lebih baik
        return Promise.reject(refreshError); // Lempar error refresh agar bisa ditangani lebih lanjut jika perlu
      }
    }
    
    // Untuk error selain 401 atau jika sudah di-retry
    return Promise.reject(error);
  }
);

// --- FUNGSI API STANDAR (application/json) ---

export const get = async (endpoint, params = {}) => {
  try {
    const response = await apiClient.get(endpoint, { params });
    return response.data; // Umumnya komponen hanya perlu response.data
  } catch (error) {
    console.error(`Error in GET request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error; // Lempar error yang lebih informatif
  }
};

export const post = async (endpoint, data = {}) => {
  try {
    // Menggunakan apiClient yang defaultnya application/json
    const response = await apiClient.post(endpoint, data);
    return response; // Kembalikan seluruh objek response (termasuk response.data, status, dll)
  } catch (error) {
    console.error(`Error in POST request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error;
  }
};

export const put = async (endpoint, data = {}) => {
  try {
    // Menggunakan apiClient yang defaultnya application/json
    const response = await apiClient.put(endpoint, data);
    return response;
  } catch (error) {
    console.error(`Error in PUT request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error;
  }
};

export const deleteData = async (endpoint) => {
  try {
    const response = await apiClient.delete(endpoint);
    return response;
  } catch (error) {
    console.error(`Error in DELETE request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error;
  }
};


// --- FUNGSI UNTUK REQUEST DENGAN FILE (FormData) ---

/**
 * Mengirim request POST dengan FormData (misalnya untuk membuat entitas baru dengan file).
 * @param {string} endpoint - Endpoint API.
 * @param {FormData} formData - Objek FormData yang berisi data teks dan file.
 * @returns {Promise<AxiosResponse<any>>} - Respons dari Axios.
 */
export const postWithFile = async (endpoint, formData) => {
  try {
    // Menggunakan apiClient agar interceptor (misalnya untuk token) tetap berjalan.
    // Header 'Content-Type' di-override menjadi undefined agar Axios/browser
    // secara otomatis mengatur Content-Type yang benar untuk FormData (multipart/form-data dengan boundary).
    const response = await apiClient.post(endpoint, formData, {
      headers: {
        'Content-Type': undefined, 
      },
    });
    return response;
  } catch (error) {
    console.error(`Error in POST with file request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error;
  }
};

/**
 * Mengirim request PUT dengan FormData (misalnya untuk memperbarui entitas dengan file).
 * @param {string} endpoint - Endpoint API.
 * @param {FormData} formData - Objek FormData yang berisi data teks dan file.
 * @returns {Promise<AxiosResponse<any>>} - Respons dari Axios.
 */
export const putWithFile = async (endpoint, formData) => {
  try {
    const response = await apiClient.put(endpoint, formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response;
  } catch (error) {
    console.error(`Error in PUT with file request to ${endpoint}:`, error.response?.data || error.message || error);
    throw error.response?.data || error;
  }
};

export default apiClient; // Ekspor apiClient jika ada bagian lain yang menggunakannya secara langsung
