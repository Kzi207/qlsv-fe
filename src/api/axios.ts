import axios, { AxiosHeaders } from 'axios';

const CSRF_STORAGE_KEY = 'csrf_token_fallback';
const DEVICE_STORAGE_KEY = 'qlsv_device_id';
const API_ENV_NAME = 'VITE_API_URL';
const DEFAULT_API_BASE_URL = '/api';
const normalizeApiBaseUrl = (value: unknown) => {
  const rawValue = String(value || '').trim();
  const baseUrl = rawValue || DEFAULT_API_BASE_URL;
  const trimmedBase = baseUrl.replace(/\/+$/, '');

  if (trimmedBase.startsWith('/')) {
    return trimmedBase || DEFAULT_API_BASE_URL;
  }

  try {
    const parsedUrl = new URL(trimmedBase);
    if (!/\/api$/i.test(parsedUrl.pathname)) {
      parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/+$/, '')}/api`;
    }
    return parsedUrl.toString().replace(/\/+$/, '');
  } catch {
    return trimmedBase;
  }
};

export const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
let csrfTokenCache = '';

const getApiConfigError = () => {
  // Relative paths (e.g. /api) are valid — they use Vite proxy and stay same-origin
  if (apiBaseUrl.startsWith('/')) {
    return '';
  }

  try {
    const parsedUrl = new URL(apiBaseUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return `${API_ENV_NAME} phải bắt đầu bằng http:// hoặc https://. Giá trị hiện tại: ${apiBaseUrl}`;
    }
  } catch {
    return `${API_ENV_NAME} không hợp lệ. Giá trị hiện tại: ${apiBaseUrl}`;
  }

  return '';
};

export const apiConfigError = getApiConfigError();

export const buildApiUrl = (path: string) => {
  const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;
  return `${apiBaseUrl}${normalizedPath}`;
};

if (apiConfigError) {
  console.error(apiConfigError);
}

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

const getDeviceId = () => {
  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_STORAGE_KEY, generated);
    return generated;
  } catch {
    return '';
  }
};

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

const isAuthProbeRequest = (url?: string) => {
  const requestUrl = String(url || '');
  return requestUrl === '/auth/me' || requestUrl.endsWith('/auth/me');
};

api.interceptors.request.use((config) => {
  if (apiConfigError) {
    return Promise.reject(new Error(apiConfigError));
  }

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

  const deviceId = getDeviceId();
  if (deviceId) {
    config.headers = config.headers || new AxiosHeaders();
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('x-device-id', deviceId);
    } else {
      (config.headers as Record<string, any>)['x-device-id'] = deviceId;
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
      if (!isPublicPath && !isAuthProbeRequest(originalRequest.url)) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
