/**
 * Centralized Environment Configuration for Guess The Frame
 * Cloudflare Workers PartyKit Edge Backend Architecture
 */

export const getPartyKitHost = () => {
  if (import.meta.env.VITE_PARTYKIT_HOST) {
    return import.meta.env.VITE_PARTYKIT_HOST.trim();
  }
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return 'localhost:10000';
    }
  }
  return 'guess-the-frame-party.asmit-sharma.workers.dev';
};

export const PARTYKIT_HOST = getPartyKitHost();

export default {
  PARTYKIT_HOST,
  isProduction: import.meta.env.PROD
};


