/**
 * Centralized Environment Configuration for Guess The Frame
 * Supports dynamic configuration across Local Dev, Vercel SPA, and Render Backend
 */

export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    let url = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    if (!url.endsWith('/api')) {
      url = `${url}/api`;
    }
    return url;
  }
  if (typeof window !== 'undefined' && window.location.port === '8080') {
    return 'http://localhost:4000/api';
  }
  return '/api';
};

export const getWsBaseUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL.replace(/\/+$/, '').replace(/\/api$/, '');
    const wsProto = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
    const hostPart = apiUrl.replace(/^https?:\/\//, '');
    return `${wsProto}//${hostPart}/ws`;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.port === '8080' ? 'localhost:4000' : window.location.host;
    return `${protocol}//${host}/ws`;
  }
  return 'ws://localhost:4000/ws';
};

export const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = getWsBaseUrl();

export default {
  API_BASE_URL,
  WS_BASE_URL,
  isProduction: import.meta.env.PROD
};
