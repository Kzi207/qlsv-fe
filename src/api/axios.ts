import axios, { AxiosHeaders } from 'axios';

const CSRF_STORAGE_KEY = 'csrf_token_fallback';
const AUTH_TOKEN_STORAGE_KEY = 'qlsv_auth_token_fallback';
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
let authTokenCache = '';
const responseCache = new Map<string, { expiresAt: number; response: any }>();
const inflightGetRequests = new Map<string, Promise<any>>();
const DEFAULT_CACHE_TTL_MS = 0;

const buildCacheKey = (url: string, config?: any) =>
  JSON.stringify({
    url: String(url || ''),
    params: config?.params || null,
    responseType: config?.responseType || 'json',
  });

const getCacheTtlMs = (url: string, config?: any) => {
  const normalizedUrl = String(url || '').trim().toLowerCase();
  if (!normalizedUrl || (config?.responseType && config.responseType !== 'json')) {
    return 0;
  }

  if (normalizedUrl === '/classes' || normalizedUrl.startsWith('/classes?')) {
    return 5 * 60 * 1000;
  }

  if (normalizedUrl === '/semesters' || normalizedUrl.startsWith('/semesters?')) {
    return 5 * 60 * 1000;
  }

  if (normalizedUrl === '/support' || normalizedUrl.startsWith('/support?')) {
    return 30 * 1000;
  }

  return DEFAULT_CACHE_TTL_MS;
};

const pruneExpiredResponseCache = () => {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (entry.expiresAt <= now) {
      responseCache.delete(key);
    }
  }
};

export const invalidateApiCache = (matcher?: string | RegExp | ((key: string) => boolean)) => {
  if (!matcher) {
    responseCache.clear();
    inflightGetRequests.clear();
    return;
  }

  for (const key of responseCache.keys()) {
    const matched =
      typeof matcher === 'string'
        ? key.includes(matcher)
        : matcher instanceof RegExp
          ? matcher.test(key)
          : matcher(key);
    if (matched) {
      responseCache.delete(key);
      inflightGetRequests.delete(key);
    }
  }
};

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

const readStoredAuthToken = () => {
  if (authTokenCache) return authTokenCache;

  try {
    authTokenCache = sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
    if (authTokenCache) return authTokenCache;
  } catch {
    // ignore storage failures
  }

  try {
    authTokenCache = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
  } catch {
    // ignore storage failures
  }

  return authTokenCache;
};

export const setFallbackAuthToken = (token: string, remember = true) => {
  authTokenCache = String(token || '').trim();

  try {
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }

  try {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }

  if (!authTokenCache) return;

  try {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(AUTH_TOKEN_STORAGE_KEY, authTokenCache);
  } catch {
    // Keep the in-memory token for the current page session.
  }
};

export const clearFallbackAuthToken = () => {
  setFallbackAuthToken('');
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

const hasHeader = (headers: any, name: string) => {
  if (!headers) return false;
  if (headers instanceof AxiosHeaders) {
    return Boolean(headers.get(name));
  }

  const normalizedName = name.toLowerCase();
  return Object.keys(headers).some(
    (key) => key.toLowerCase() === normalizedName && Boolean(headers[key]),
  );
};

const setHeader = (config: any, name: string, value: string) => {
  config.headers = config.headers || new AxiosHeaders();

  if (config.headers instanceof AxiosHeaders) {
    config.headers.set(name, value);
  } else {
    (config.headers as Record<string, any>)[name] = value;
  }
};

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

const originalGet = api.get.bind(api);

(api as any).get = (url: string, config?: any) => {
  const ttlMs = getCacheTtlMs(url, config);
  if (!ttlMs) {
    return originalGet(url, config);
  }

  pruneExpiredResponseCache();
  const cacheKey = buildCacheKey(url, config);
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.response);
  }

  const inflight = inflightGetRequests.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = originalGet(url, config)
    .then((response) => {
      responseCache.set(cacheKey, {
        expiresAt: Date.now() + ttlMs,
        response,
      });
      return response;
    })
    .finally(() => {
      inflightGetRequests.delete(cacheKey);
    });

  inflightGetRequests.set(cacheKey, request);
  return request;
};

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
      setHeader(config, 'x-csrf-token', String(csrfToken).trim());
    }
  }

  const fallbackAuthToken = readStoredAuthToken();
  if (fallbackAuthToken && !hasHeader(config.headers, 'Authorization')) {
    setHeader(config, 'Authorization', `Bearer ${fallbackAuthToken}`);
  }

  const deviceId = getDeviceId();
  if (deviceId) {
    setHeader(config, 'x-device-id', deviceId);
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const responseToken = response?.data?.csrfToken;
    if (typeof responseToken === 'string' && responseToken) {
      writeStoredCsrfToken(responseToken);
    }

    const method = String(response?.config?.method || 'get').toUpperCase();
    if (method !== 'GET') {
      invalidateApiCache();
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
      invalidateApiCache();
      const isPublicPath = window.location.pathname === '/login' || window.location.pathname.startsWith('/dangky');
      if (!isPublicPath) {
        // Chỉ xóa token nếu request bị từ chối thực sự đã gửi token đó đi.
        // Tránh trường hợp request /auth/me gửi trước khi token được lưu (race condition lúc login Google)
        // khi phản hồi 401 về sẽ xóa nhầm token mới lưu.
        const reqAuthHeader = originalRequest.headers instanceof AxiosHeaders
          ? originalRequest.headers.get('Authorization')
          : originalRequest.headers?.['Authorization'] || originalRequest.headers?.['authorization'];
        
        const currentToken = readStoredAuthToken();
        
        // Nếu request có gửi token và trùng với token hiện tại, hoặc request không gửi token và hiện tại cũng không có token nào mới được set
        const shouldClear = reqAuthHeader
          ? (String(reqAuthHeader) === `Bearer ${currentToken}`)
          : !currentToken;

        if (shouldClear) {
          writeStoredCsrfToken('');
          clearFallbackAuthToken();
        }

        if (!isAuthProbeRequest(originalRequest.url)) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
