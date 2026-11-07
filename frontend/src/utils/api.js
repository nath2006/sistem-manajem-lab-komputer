// utils/api.js
import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const AUTHLESS_ROUTES = [
  '/auth/login',
  '/auth/refresh-token'
];

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json', 
  },
});

// ===== Request interceptor =====
apiClient.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    const skipAuth = config._skipAuth || AUTHLESS_ROUTES.some(p => url.includes(p));

    const token = Cookies.get('auth_token');
    // catat apakah request INI awalnya punya token (penting untuk keputusan refresh)
    config._hadAuthToken = Boolean(token);

    if (!skipAuth && token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Response interceptor (refresh logic) =====
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const url = originalRequest.url || '';

    const isAuthlessRoute = AUTHLESS_ROUTES.some(p => url.includes(p));
    const skipRefresh = originalRequest._skipRefresh || isAuthlessRoute || url.includes('/auth/logout');

    // Hanya refresh jika:
    // - 401
    // - belum di-retry
    // - request sebelumnya MEMBAWA token (bukan login awal)
    // - bukan endpoint authless (login/refresh)
    if (status === 401 && !originalRequest._retry && originalRequest._hadAuthToken && !skipRefresh) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refresh_token');
        if (!refreshToken) {
          // Tidak ada refresh token: anggap sesi habis → bersihkan & lempar error
          Cookies.remove('auth_token');
          Cookies.remove('refresh_token');
          return Promise.reject(error);
        }

        // Pakai client "bersih" tanpa interceptor untuk refresh
        const refreshApiClient = axios.create({ baseURL: BASE_URL });
        const resp = await refreshApiClient.post('/auth/refresh-token', { refreshToken });

        const newAuthToken = resp.data?.token;
        const newRefreshToken = resp.data?.refreshToken;

        if (!newAuthToken) {
          Cookies.remove('auth_token');
          Cookies.remove('refresh_token');
          return Promise.reject(error);
        }

        // Simpan token baru
        Cookies.set('auth_token', newAuthToken, {
          expires: 7,
          secure: import.meta.env.PROD,
          sameSite: 'Strict',
        });
        if (newRefreshToken) {
          Cookies.set('refresh_token', newRefreshToken, {
            expires: 30,
            secure: import.meta.env.PROD,
            sameSite: 'Strict',
          });
        }

        // Update header default & request asli
        apiClient.defaults.headers.common.Authorization = `Bearer ${newAuthToken}`;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAuthToken}`;

        // Ulangi request asli
        return apiClient(originalRequest);
      } catch (refreshError) {
        Cookies.remove('auth_token');
        Cookies.remove('refresh_token');
        return Promise.reject(refreshError);
      }
    }

    // Kasus login awal salah kredensial: biarkan error lewat ke caller
    return Promise.reject(error);
  }
);
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
    const response = await apiClient.post(endpoint, data);
    return response; 
  } catch (error) {
    const apiMessage = error.response?.data?.message || error.message || "Terjadi kesalahan";
    console.error(`Error in POST request to ${endpoint}:`, apiMessage);
    throw new Error(apiMessage); 
  }
};

export const put = async (endpoint, data = {}) => {
  try {
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



/**
 * Mengirim request POST dengan FormData ( untuk membuat entitas baru dengan file).
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
 * Mengirim request PUT dengan FormData (untuk memperbarui entitas dengan file).
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

export default apiClient; 
