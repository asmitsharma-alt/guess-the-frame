/**
 * HTML5 Canvas 2D Color Quantization & Dynamic UI Palette Extraction
 * Analyzes active cinema frames to set dynamic CSS variables with clay-soft pastels.
 */
const PaletteManager = {
  framePalettesEnabled: true,
  defaults: {
    '--bg-dark': '#e9e4ff',
    '--bg-light': '#ffe9f3',
    '--neon-pink': '#ff7eb6',
    '--neon-blue': '#57c3e0',
    '--neon-purple': '#a06bd6',
    '--gold': '#f0a828',
    '--teal': '#3fb9ad',
    '--frame-bg-1': '#e9e4ff',
    '--frame-bg-2': '#ffe9f3',
    '--frame-accent': '#ff9ecb',
    '--frame-accent-2': '#c3a9e6'
  },

  _rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s, l };
  },

  _hslToRgb({ h, s, l }) {
    let r, g, b;
    h /= 360;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  },

  _hex({ r, g, b }) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  },

  _pastel(rgb, s, l) {
    const hsl = this._rgbToHsl(rgb);
    return this._hslToRgb({ h: hsl.h, s, l });
  },

  _boost(color, satMul, lightMul, score = 0) {
    const hsl = this._rgbToHsl(color);
    hsl.s = Math.min(0.92, Math.max(0.42, hsl.s * satMul));
    hsl.l = Math.min(0.68, Math.max(0.42, hsl.l * lightMul));
    return { ...this._hslToRgb(hsl), score };
  },

  _shade(color, amount) {
    const hsl = this._rgbToHsl(color);
    hsl.s = Math.min(0.55, hsl.s * 0.9);
    hsl.l = amount;
    return this._hslToRgb(hsl);
  },

  _warm(a, b) {
    const ah = this._rgbToHsl(a), bh = this._rgbToHsl(b);
    const hue = ah.h >= 25 && ah.h <= 70 ? ah.h : (bh.h >= 25 && bh.h <= 70 ? bh.h : 43);
    return this._hslToRgb({ h: hue, s: 0.88, l: 0.58 });
  },

  _rotate(color, deg) {
    const hsl = this._rgbToHsl(color);
    hsl.h = (hsl.h + deg + 360) % 360;
    hsl.s = Math.min(0.9, Math.max(0.5, hsl.s));
    return this._hslToRgb(hsl);
  },

  _pickDistinct(colors, primary, minHueDiff, secondary = null) {
    const pHsl = this._rgbToHsl(primary);
    const sHsl = secondary ? this._rgbToHsl(secondary) : null;

    for (const c of colors) {
      const cHsl = this._rgbToHsl(c);
      const diffP = Math.abs(cHsl.h - pHsl.h);
      const circularDiffP = Math.min(diffP, 360 - diffP);
      if (circularDiffP >= minHueDiff) {
        if (!sHsl) return c;
        const diffS = Math.abs(cHsl.h - sHsl.h);
        const circularDiffS = Math.min(diffS, 360 - diffS);
        if (circularDiffS >= minHueDiff) return c;
      }
    }
    return null;
  },

  apply(vars) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
  },

  reset() {
    this.apply(this.defaults);
  },

  fromImage(img) {
    if (!this.framePalettesEnabled || typeof document === 'undefined' || !img) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const w = 48, h = 48;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const data = ctx.getImageData(0, 0, w, h).data;
      const buckets = new Map();
      let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;

      for (let i = 0; i < data.length; i += 16) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 180) continue;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max < 22 || min > 238) continue;

        const sat = max === 0 ? 0 : (max - min) / max;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const weight = 0.45 + sat * 1.8 + (lum > 45 && lum < 215 ? 0.8 : 0);
        const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
        const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, w: 0, score: 0 };

        bucket.r += r * weight;
        bucket.g += g * weight;
        bucket.b += b * weight;
        bucket.w += weight;
        bucket.score += weight * (0.6 + sat);
        buckets.set(key, bucket);

        totalR += r * weight;
        totalG += g * weight;
        totalB += b * weight;
        totalWeight += weight;
      }

      if (!totalWeight || !buckets.size) return;

      const colors = [...buckets.values()]
        .map(c => this._boost({ r: c.r / c.w, g: c.g / c.w, b: c.b / c.w }, 1.18, 1.08, c.score))
        .sort((a, b) => b.score - a.score);

      const primary = colors[0];
      const secondary = this._pickDistinct(colors, primary, 44) || this._rotate(primary, 110);
      const tertiary = this._pickDistinct(colors, primary, 78, secondary) || this._rotate(primary, -95);
      const average = this._boost({ r: totalR / totalWeight, g: totalG / totalWeight, b: totalB / totalWeight }, 0.8, 0.58);
      const dark = this._shade(average, 0.18);
      const light = this._shade(average, 0.32);
      const goldish = this._warm(primary, secondary);

      this.apply({
        '--bg-dark': this._hex(dark),
        '--bg-light': this._hex(light),
        '--neon-pink': this._hex(primary),
        '--neon-blue': this._hex(secondary),
        '--neon-purple': this._hex(tertiary),
        '--gold': this._hex(goldish),
        '--teal': this._hex(this._rotate(secondary, 34)),
        '--frame-bg-1': this._hex(this._pastel(primary, 0.46, 0.89)),
        '--frame-bg-2': this._hex(this._pastel(secondary, 0.44, 0.82)),
        '--frame-accent': this._hex(this._pastel(primary, 0.74, 0.73)),
        '--frame-accent-2': this._hex(this._pastel(secondary, 0.64, 0.70))
      });
    } catch (e) {
      console.warn('Could not extract frame palette:', e);
    }
  }
};

export default PaletteManager;
