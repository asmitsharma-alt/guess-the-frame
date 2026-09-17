const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'avvtar_assets', 'CATALOG_ALL_CHARACTERS.md'), 'utf-8');
const lines = content.split('\n');

const categoryMap = {
  '00_Founders_Original_Avatars': { id: 'founders', label: 'Founders & Team', icon: '👑' },
  'Pokemon_Animated_GIFs': { id: 'pokemon', label: 'Pokémon Animated', icon: '⚡' },
  'Anime': { id: 'anime', label: 'Anime', icon: '⚔️' },
  'Cartoons_and_CN': { id: 'cartoons', label: 'Cartoons & CN', icon: '📺' },
  'Movies': { id: 'movies', label: 'Movies & Heroes', icon: '🎬' },
  'TV_Series': { id: 'tv', label: 'TV Series', icon: '🍿' },
  'Gaming_and_Other': { id: 'gaming', label: 'Gaming', icon: '🎮' },
  'Other': { id: 'other', label: 'Pop Culture', icon: '✨' }
};

const palette = ['#ff7eb6', '#57c3e0', '#a06bd6', '#f0a828', '#3fbf8f', '#ff5252', '#4dabf7', '#ffd43b', '#69db7c', '#e599f7'];

function getHashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

const avatars = [];
const seenIds = new Set();

// 1. Add Founders first explicitly with top priority
const coreFounders = [
  { id: 'aman', name: 'Aman', cat: 'founders', sub: 'Founders', src: 'avvtar/aman.svg', anim: false, color: '#FF6B9D' },
  { id: 'amish', name: 'Amish', cat: 'founders', sub: 'Founders', src: 'avvtar/amish.svg', anim: false, color: '#3B82F6' },
  { id: 'aziz', name: 'Aziz', cat: 'founders', sub: 'Founders', src: 'avvtar/aziz.svg', anim: false, color: '#84CC16' },
  { id: 'vish', name: 'Vish', cat: 'founders', sub: 'Founders', src: 'avvtar/vish.svg', anim: false, color: '#FACC15' },
  { id: 'nolan', name: 'Nolan', cat: 'founders', sub: 'Founders', src: 'avvtar_assets/00_Founders_Original_Avatars/PNG/Nolan.png', anim: false, color: '#A855F7' },
  { id: 'aman_anim', name: 'Aman (Animated)', cat: 'founders', sub: 'Founders Animated', src: 'avvtar_assets/00_Founders_Original_Avatars/Animated_GIFs/Aman_Animated.gif', anim: true, color: '#FF6B9D' },
  { id: 'amish_anim', name: 'Amish (Animated)', cat: 'founders', sub: 'Founders Animated', src: 'avvtar_assets/00_Founders_Original_Avatars/Animated_GIFs/Amish_Animated.gif', anim: true, color: '#3B82F6' }
];

coreFounders.forEach(f => {
  avatars.push(f);
  seenIds.add(f.id);
});

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^\|\s*\*\*([^*]+)\*\*\s*\|\s*`([^`]+)`\s*\|\s*[^|]+\|\s*\[`([^`]+)`\]\(\.\/([^)]+)\)\s*\|/);
  if (!match) continue;

  const rawName = match[1].trim();
  const format = match[2].trim().toLowerCase();
  const relPath = match[4].trim();

  // Skip animation frames and trophies
  if (relPath.includes('Animation_Frames') || relPath.includes('Trophies')) continue;

  const parts = relPath.split('/');
  const topDir = parts[0];
  const catConfig = categoryMap[topDir] || { id: 'other', label: 'Other', icon: '✨' };
  const franchise = parts.length > 2 ? parts[1].replace(/_/g, ' ') : catConfig.label;

  const isAnimated = format === 'gif';
  let cleanName = rawName.replace(/^[_\s]+/, '').replace(/_/g, ' ');

  // Skip duplicates of base founders already added
  if (cleanName.toLowerCase() === 'aman' && topDir === '00_Founders_Original_Avatars' && format === 'svg') continue;
  if (cleanName.toLowerCase() === 'amish' && topDir === '00_Founders_Original_Avatars' && format === 'svg') continue;

  let baseSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!baseSlug) baseSlug = 'avatar';
  let slug = catConfig.id + '_' + baseSlug;
  let counter = 1;
  while (seenIds.has(slug)) {
    slug = catConfig.id + '_' + baseSlug + '_' + (++counter);
  }
  seenIds.add(slug);

  const fullSrc = 'avvtar_assets/' + relPath;

  avatars.push({
    id: slug,
    name: cleanName,
    cat: catConfig.id,
    sub: franchise,
    src: fullSrc,
    anim: isAnimated,
    color: getHashColor(cleanName)
  });
}

console.log('Total avatars ready for catalog:', avatars.length);

const catalogCode = `/**
 * Guess The Frame - Master Avatar Catalog
 * Auto-generated with ${avatars.length} characters across 8 categories
 */
(function(window) {
  'use strict';

  const CATEGORIES = [
    { id: 'all', label: 'All Avatars', icon: '🔥', count: ${avatars.length} },
    { id: 'pokemon', label: 'Pokémon (Animated)', icon: '⚡', count: ${avatars.filter(a => a.cat === 'pokemon').length} },
    { id: 'founders', label: 'Founders', icon: '👑', count: ${avatars.filter(a => a.cat === 'founders').length} },
    { id: 'anime', label: 'Anime', icon: '⚔️', count: ${avatars.filter(a => a.cat === 'anime').length} },
    { id: 'cartoons', label: 'Cartoons & CN', icon: '📺', count: ${avatars.filter(a => a.cat === 'cartoons').length} },
    { id: 'movies', label: 'Movies & Heroes', icon: '🎬', count: ${avatars.filter(a => a.cat === 'movies').length} },
    { id: 'tv', label: 'TV Series', icon: '🍿', count: ${avatars.filter(a => a.cat === 'tv').length} },
    { id: 'gaming', label: 'Gaming', icon: '🎮', count: ${avatars.filter(a => a.cat === 'gaming').length} },
    { id: 'other', label: 'Pop Culture', icon: '✨', count: ${avatars.filter(a => a.cat === 'other').length} }
  ];

  // List of all avatars: { id, name, cat, sub, src, anim, color }
  const AVATARS = ${JSON.stringify(avatars)};

  // Fast ID Lookup Map
  const AVATAR_LOOKUP = new Map();
  // Name fallback first
  AVATARS.forEach(a => {
    const n = a.name.toLowerCase();
    if (!AVATAR_LOOKUP.has(n)) {
      AVATAR_LOOKUP.set(n, a);
    }
  });
  // Exact ID takes absolute priority
  AVATARS.forEach(a => {
    AVATAR_LOOKUP.set(a.id.toLowerCase(), a);
  });
  // Explicitly guarantee core native avatars map to svg assets
  ['aman', 'amish', 'aziz', 'vish'].forEach(cid => {
    const f = AVATARS.find(a => a.id === cid);
    if (f) {
      AVATAR_LOOKUP.set(cid, f);
      AVATAR_LOOKUP.set(f.name.toLowerCase(), f);
    }
  });

  const AvatarCatalog = {
    getCategories() {
      return CATEGORIES;
    },
    getAll() {
      return AVATARS;
    },
    getById(id) {
      if (!id) return AVATARS[0];
      const cleanId = String(id).trim().toLowerCase();
      return AVATAR_LOOKUP.get(cleanId) || AVATARS.find(a => a.id.toLowerCase() === cleanId || a.name.toLowerCase() === cleanId) || null;
    },
    search(query, category = 'all', limit = 120, offset = 0) {
      const q = (query || '').trim().toLowerCase();
      let results = AVATARS;

      if (category && category !== 'all') {
        results = results.filter(a => a.cat === category);
      }

      if (q) {
        results = results.filter(a => {
          return a.name.toLowerCase().includes(q) ||
                 a.sub.toLowerCase().includes(q) ||
                 (q === 'animated' && a.anim) ||
                 (q === 'pokemon' && a.cat === 'pokemon');
        });
      }

      return {
        total: results.length,
        items: results.slice(offset, offset + limit),
        hasMore: offset + limit < results.length
      };
    }
  };

  window.AvatarCatalog = AvatarCatalog;
})(typeof window !== 'undefined' ? window : this);
`;

const outputPath = path.join(__dirname, 'avatar_catalog.js');
fs.writeFileSync(outputPath, catalogCode, 'utf-8');
console.log('Successfully wrote ' + outputPath + ' (' + (catalogCode.length / 1024).toFixed(1) + ' KB)');
