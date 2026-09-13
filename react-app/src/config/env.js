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

export const getMqttBrokers = () => {
  const custom = import.meta.env.VITE_MQTT_BROKER_URL;
  const list = [];
  if (custom && custom.trim()) {
    list.push({ name: 'Custom Cloud Broker (HiveMQ/CloudMQTT)', url: custom.trim() });
  }
  list.push(
    { name: 'EMQX Cloud Broker', url: 'wss://broker.emqx.io:8084/mqtt' },
    { name: 'HiveMQ Cloud / WebSockets', url: 'wss://broker.hivemq.com:8884/mqtt' },
    { name: 'Eclipse Mosquitto', url: 'wss://test.mosquitto.org:8081/mqtt' }
  );
  return list;
};

export const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = getWsBaseUrl();
export const MQTT_BROKERS = getMqttBrokers();

export default {
  API_BASE_URL,
  WS_BASE_URL,
  MQTT_BROKERS,
  isProduction: import.meta.env.PROD
};
