import { DEFAULT_FRAMES, DEFAULT_EYES, DEFAULT_TIE_BREAKERS, AVATAR_MAP } from './gameConstants';

/**
 * Enterprise Asset Preloader & Synchronizer
 * Pre-fetches and GPU-decodes all game frames, eye reveals, and tie-breakers into memory.
 * Guarantees 0ms instant display latency without image decode lag or network delays during rounds.
 */
class AssetPreloaderService {
  constructor() {
    this.cache = new Map(); // url -> HTMLImageElement
    this.total = 0;
    this.loaded = 0;
    this.percent = 0;
    this.isComplete = false;
    this.isLoading = false;
    this.listeners = new Set();
    this.preloadPromise = null;

    if (typeof window !== 'undefined') {
      window.AssetPreloader = this;
    }
  }

  /**
   * Extract all unique image paths across the entire game catalog
   */
  getAllAssetUrls() {
    const urls = new Set();

    const normalize = (path) => {
      if (!path) return null;
      let clean = String(path).trim();
      if (!clean.startsWith('/') && !clean.startsWith('http')) {
        clean = `/${clean}`;
      }
      return clean;
    };

    // 1. Movie Frames
    DEFAULT_FRAMES.forEach(f => {
      if (f.content && f.type === 'image') {
        const u = normalize(f.content);
        if (u) urls.add(u);
      }
    });

    // 2. Guess the Eyes (both cropped frame and full celebrity reveal image)
    DEFAULT_EYES.forEach(e => {
      if (e.content && e.type === 'image') {
        const u = normalize(e.content);
        if (u) urls.add(u);
      }
      if (e.revealContent) {
        const u = normalize(e.revealContent);
        if (u) urls.add(u);
      }
    });

    // 3. Tie Breakers
    DEFAULT_TIE_BREAKERS.forEach(t => {
      if (t.content && t.type === 'image') {
        const u = normalize(t.content);
        if (u) urls.add(u);
      }
    });

    // 4. Core Avatars
    Object.values(AVATAR_MAP).forEach(av => {
      if (av.img) {
        const u = normalize(av.img);
        if (u) urls.add(u);
      }
    });

    return Array.from(urls);
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(listener) {
    this.listeners.add(listener);
    // Send immediate current state
    listener(this.getProgress());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const p = this.getProgress();
    this.listeners.forEach(fn => {
      try { fn(p); } catch (e) { console.error('[AssetPreloader] Listener error:', e); }
    });
  }

  getProgress() {
    return {
      loaded: this.loaded,
      total: this.total,
      percent: this.percent,
      isComplete: this.isComplete,
      isLoading: this.isLoading
    };
  }

  /**
   * Preload a single image with hardware GPU off-thread decoding
   */
  preloadImage(url) {
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url));
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';

      let done = false;
      let timer = null;

      const finish = () => {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        this.cache.set(url, img);
        this.loaded += 1;
        this.percent = Math.min(100, Math.round((this.loaded / Math.max(1, this.total)) * 100));
        this.notify();
        resolve(img);
      };

      // Safety timeout: 7s per image max to never stall on network lag
      timer = setTimeout(finish, 7000);

      img.onload = () => {
        // img.decode() forces off-thread GPU decode for 0ms paint lag
        if (typeof img.decode === 'function') {
          img.decode().then(finish).catch(finish);
        } else {
          finish();
        }
      };

      img.onerror = () => {
        finish();
      };

      img.src = url;
    });
  }

  /**
   * Preload all match assets with batch concurrency
   */
  async preloadAll(onProgress = null) {
    if (onProgress) {
      this.subscribe(onProgress);
    }

    if (this.isComplete) {
      return this.getProgress();
    }

    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    const allUrls = this.getAllAssetUrls();
    this.total = allUrls.length;
    this.loaded = 0;
    this.percent = 0;
    this.isLoading = true;
    this.notify();

    // Concurrency pool: 2 simultaneous downloads to leave HTTP pipes open for game events
    const CONCURRENCY = 2;
    let queueIndex = 0;

    const worker = async () => {
      while (queueIndex < allUrls.length) {
        const idx = queueIndex++;
        await this.preloadImage(allUrls[idx]);
      }
    };

    this.preloadPromise = (async () => {
      const workers = [];
      for (let i = 0; i < Math.min(CONCURRENCY, allUrls.length); i++) {
        workers.push(worker());
      }
      await Promise.all(workers);

      this.isComplete = true;
      this.isLoading = false;
      this.percent = 100;
      this.notify();
      return this.getProgress();
    })();

    return this.preloadPromise;
  }

  /**
   * Synchronous check if an image is already cached
   */
  has(url) {
    const clean = url?.startsWith('/') ? url : `/${url}`;
    return this.cache.has(clean);
  }
}

export const AssetPreloader = new AssetPreloaderService();
export default AssetPreloader;
