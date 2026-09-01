/**
 * Cliente axios único da aplicação.
 *
 * - baseURL: VITE_API_URL sem barra final (aceita com ou sem `/api`).
 * - Request: injeta `Authorization: Bearer <access_token>` do localStorage.
 * - Response: em 401, tenta renovar o access via /api/users/auth/refresh/
 *   uma única vez (fila evita refreshes concorrentes em rajada de requests),
 *   reprocessa a chamada original e, se o refresh também falhar, limpa a
 *   sessão e repassa o erro.
 *
 * Nota: existia uma cópia em src/api/axios.js sem o interceptor de refresh;
 * ambas foram unificadas aqui (todos os imports do app usam o default export).
 */
import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const normalizedBase = rawBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '');

const api = axios.create({
  baseURL: normalizedBase,
});

// Request interceptor: anexa o token nas requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: renova o access token em 401 (uma tentativa por request)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (prom) {
      if (error) prom.reject(error);
      else prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Sem 401, sem retry já feito, ou é a própria chamada de login/refresh → propaga
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login/') ||
      originalRequest?.url?.includes('/auth/refresh/');

    if (error?.response?.status !== 401 || originalRequest?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      // Sessão inexistente/expirada: limpa e repassa (AuthContext trata o logout)
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return Promise.reject(error);
    }

    // Se já há um refresh em andamento, entra na fila em vez de duplicar
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post('/api/users/auth/refresh/', {
        refresh: refreshToken,
      });

      const newAccess = data.access;
      localStorage.setItem('access_token', newAccess);
      if (data.refresh) {
        // ROTATE_REFRESH_TOKENS: o backend devolve um novo refresh
        localStorage.setItem('refresh_token', data.refresh);
      }

      processQueue(null, newAccess);

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;