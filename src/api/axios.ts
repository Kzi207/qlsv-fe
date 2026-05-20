import axios, { AxiosHeaders } from 'axios';

const CSRF_STORAGE_KEY = 'csrf_token_fallback';
let csrfTokenCache = '';

const readStoredCsrfToken = () => {
  try {
    return sessionStorage.getItem(CSRF_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

const writeStoredCsrfToken = (token: string) => {
  csrfTokenCache = token;
  try {
    if (token) {
      sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(CSRF_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
};

const getCsrfTokenFromCookie = () => {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith('qlsv_token=')) {
      return decodeURIComponent(cookie.substring('qlsv_token='.length));
    }
  }
  return '';
};

const getEffectiveCsrfToken = () => {
  const cookieToken = getCsrfTokenFromCookie();
  if (cookieToken) {
    writeStoredCsrfToken(cookieToken);
    return cookieToken;
  }

  if (csrfTokenCache) return csrfTokenCache;

  const stored = readStoredCsrfToken();
  if (stored) {
    csrfTokenCache = stored;
  }
  return stored;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (needsCsrf) {
    const csrfToken = getEffectiveCsrfToken();
    if (csrfToken) {
      config.headers = config.headers || new AxiosHeaders();
      
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set('x-csrf-token', String(csrfToken).trim());
      } else {
        (config.headers as Record<string, any>)['x-csrf-token'] = String(csrfToken).trim();
      }
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const responseToken = response?.data?.csrfToken;
    if (typeof responseToken === 'string' && responseToken) {
      writeStoredCsrfToken(responseToken);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const message = String(error.response?.data?.message || '');

    if (
      status === 403 &&
      message.toLowerCase().includes('csrf') &&
      !originalRequest.__csrfRetried
    ) {
      try {
        const refreshRes = await api.get('/auth/me');
        const refreshedToken = refreshRes?.data?.csrfToken;
        if (typeof refreshedToken === 'string' && refreshedToken) {
          writeStoredCsrfToken(refreshedToken);
          originalRequest.__csrfRetried = true;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['x-csrf-token'] = refreshedToken;
          return api.request(originalRequest);
        }
      } catch {
        // ignore and fall through to normal handling
      }
    }

    if (error.response?.status === 401) {
      writeStoredCsrfToken('');
      const isPublicPath = window.location.pathname === '/login' || window.location.pathname.startsWith('/dangky');
      if (!isPublicPath) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
