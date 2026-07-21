import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // envía la cookie del refresh token
});

// Adjunta el access token a cada petición.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manejo de expiración: intenta refrescar una vez y reintenta la petición.
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isAuthCall = original?.url?.includes('/auth/');

    if (status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing =
          refreshing ||
          api.post('/auth/refresh').then((r) => {
            useAuthStore.getState().setAuth(r.data.data);
            return r.data.data.accessToken;
          });
        const newToken = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        useAuthStore.getState().clearAuth();
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

// Extrae el mensaje de error legible de la respuesta del backend.
export const errMsg = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Ocurrió un error';
