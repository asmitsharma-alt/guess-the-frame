import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import SoundManager from '../../services/soundManager';
import { getAvatarSrc } from '../../services/gameConstants';
import {
  AVATAR_CATEGORIES,
  searchAvatars,
  getAvatarsByCategory,
  getAvatarMeta,
  reshuffleAllAvatars
} from '../../services/avatarCatalog';

const INITIAL_BATCH = 48;
const BATCH_INCREMENT = 32;

export const TRANSPARENT_CATEGORIES = new Set([
  'doraemon', 'pokemon', 'minecraft', 'dragon-ball', 'south-park',
  'spongebob', 'ben-10', 'adventure-time', 'founders', 'the-simpsons',
  'futurama', 'bobs-burgers', 'final-space', 'disney', 'overwatch', 'genshin'
]);

export function isAvatarTransparent(item, detectedMap = {}) {
  if (!item) return false;
  if (item.isTransparent || item.isVector) return true;
  const url = item.url || '';
  if (url.includes('/avvtar/') || url.endsWith('.svg') || url.includes('dicebear.com') ||
      url.includes('showdown') || url.includes('mc-heads.net') ||
      url.includes('dragonball-api.com') || url.includes('finalspaceapi.com')) {
    return true;
  }
  if (item.category && TRANSPARENT_CATEGORIES.has(item.category)) {
    return true;
  }
  if (detectedMap[url]) {
    return true;
  }
  return false;
}

export const CharacterPreviewBadge = ({ selectedAvatar }) => {
  const meta = useMemo(() => getAvatarMeta(selectedAvatar), [selectedAvatar]);
  const previewSrc = getAvatarSrc(meta.url || selectedAvatar, 'aman');
  const previewBg = meta.isKnownDark ? '#111827' : `#${meta.color || 'facc15'}`;
  
  // If background is transparent or image is vector: NEVER zoom, show full image
  const isTransparent = isAvatarTransparent(meta);
  const previewZoom = isTransparent ? 'img-contain-fit' : (meta.isKnownPortrait ? 'img-portrait-zoom' : 'img-cover-zoom');

  return (
    <div className="mp-hero-preview-badge mp-inline-preview-badge">
      <div 
        className="mp-hero-preview-frame"
        style={{ backgroundColor: previewBg }}
      >
        <img
          src={previewSrc}
          alt={meta.name}
          className={`mp-hero-preview-img ${previewZoom}`}
          loading="eager"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/avvtar/aman.svg';
          }}
        />
        <span className="mp-hero-check-pill">✓</span>
      </div>
      <div className="mp-hero-preview-info">
        <div className="mp-hero-char-name">{meta.name || 'Selected Avatar'}</div>
        <div className="mp-hero-tags-row">
          <span className="mp-hero-cat-tag">
            {meta.categoryLabel || '👑 Founders'}
          </span>
          <span className="mp-hero-format-tag">
            {meta.format || 'SQUARE'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const AvatarPicker = ({ selectedAvatar, onSelectAvatar, hideHeroPreview = false }) => {
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadedCount, setLoadedCount] = useState(INITIAL_BATCH);
  const [customAvatar, setCustomAvatar] = useState(null);
  const [detectedBgColors, setDetectedBgColors] = useState({});
  const [detectedTransparent, setDetectedTransparent] = useState({});
  const [shuffleTick, setShuffleTick] = useState(0);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Randomize all section on initial mount so players get fresh discovery
  useEffect(() => {
    reshuffleAllAvatars();
    setShuffleTick(t => t + 1);
  }, []);

  const handleReshuffle = () => {
    try { SoundManager.playClick(); } catch (e) {}
    reshuffleAllAvatars();
    setShuffleTick(t => t + 1);
    setLoadedCount(INITIAL_BATCH);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Active avatar metadata
  const currentAvatarMeta = useMemo(() => {
    if (customAvatar && selectedAvatar === customAvatar.url) {
      return customAvatar;
    }
    return getAvatarMeta(selectedAvatar);
  }, [selectedAvatar, customAvatar]);

  // Search or category filtered avatars
  const displayedAvatars = useMemo(() => {
    let list;
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      list = searchAvatars(q, category);
      // If user typed a search query in a specific sub-category and got no results, fall back to global search across all categories
      if (list.length === 0 && category !== 'all') {
        list = searchAvatars(q, 'all');
      }
    } else {
      list = getAvatarsByCategory(category);
    }
    return list.slice(0, loadedCount);
  }, [searchQuery, category, loadedCount, shuffleTick]);

  // Infinite scroll loader
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) {
      setLoadedCount(prev => prev + BATCH_INCREMENT);
    }
  }, []);

  const handleSelect = (urlOrId) => {
    try {
      SoundManager.playClick();
    } catch (e) {}
    if (typeof onSelectAvatar === 'function') {
      onSelectAvatar(urlOrId);
    }
  };

  const handleCategoryChange = (catId) => {
    try {
      SoundManager.playClick();
    } catch (e) {}
    setCategory(catId);
    setLoadedCount(INITIAL_BATCH);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setLoadedCount(INITIAL_BATCH);
  };

  // Custom File Upload (SVG, GIF, Images)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      alert('Avatar file is too large! Please choose an SVG, GIF, or image under 2.5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        const isSvg = file.type.includes('svg') || file.name.endsWith('.svg');
        const isGif = file.type.includes('gif') || file.name.endsWith('.gif');
        const customObj = {
          id: 'custom_upload',
          name: file.name.replace(/\.[^/.]+$/, ''),
          category: 'custom',
          categoryLabel: '📤 Custom Upload',
          url: dataUrl,
          format: isSvg ? 'SVG' : (isGif ? 'GIF' : 'IMG'),
          color: '38bdf8',
          isKnownDark: false,
          isKnownPortrait: false,
          isVector: isSvg
        };
        setCustomAvatar(customObj);
        handleSelect(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // Dynamic solid background color and transparent corner detection
  const handleImageLoad = (e, item) => {
    const img = e.currentTarget;
    if (!img) return;

    if (item.isKnownDark) {
      setDetectedBgColors(prev => ({ ...prev, [item.url]: '#111827' }));
      return;
    }
    if (item.isVector || item.isTransparent || item.url.includes('/avvtar/') || item.url.endsWith('.svg')) {
      return;
    }

    try {
      if (img.naturalWidth > 10 && img.naturalHeight > 10) {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        const tl = { r: data[0], g: data[1], b: data[2], a: data[3] };
        const tr = { r: data[60], g: data[61], b: data[62], a: data[63] };
        const bl = { r: data[960], g: data[961], b: data[962], a: data[963] };
        const br = { r: data[1020], g: data[1021], b: data[1022], a: data[1023] };

        // If any corner is transparent, mark as transparent so it is NOT zoomed
        if (tl.a < 180 || tr.a < 180 || bl.a < 180 || br.a < 180) {
          setDetectedTransparent(prev => ({ ...prev, [item.url]: true }));
          return;
        }

        if (tl.a > 30 && tr.a > 30) {
          const diff = Math.abs(tl.r - tr.r) + Math.abs(tl.g - tr.g) + Math.abs(tl.b - tr.b);
          if (diff < 35) {
            const hex = '#' + ((1 << 24) + (tl.r << 16) + (tl.g << 8) + tl.b).toString(16).slice(1);
            setDetectedBgColors(prev => ({ ...prev, [item.url]: hex }));
          }
        }
      }
    } catch (err) {
      // Fallback to default
    }
  };

  const previewSrc = getAvatarSrc(currentAvatarMeta.url, 'aman');
  const previewBg = detectedBgColors[currentAvatarMeta.url] || (currentAvatarMeta.isKnownDark ? '#111827' : `#${currentAvatarMeta.color || 'facc15'}`);
  const isPreviewTransparent = isAvatarTransparent(currentAvatarMeta, detectedTransparent);
  const previewZoom = isPreviewTransparent ? 'img-contain-fit' : (currentAvatarMeta.isKnownPortrait ? 'img-portrait-zoom' : 'img-cover-zoom');

  return (
    <div className="mp-avatar-picker-wrap">
      {/* 1. Live Square Avatar Hero Preview Badge (if not rendered in credentials row) */}
      {!hideHeroPreview && (
        <div className="mp-hero-preview-badge">
          <div 
            className="mp-hero-preview-frame"
            style={{ backgroundColor: previewBg }}
          >
            <img
              src={previewSrc}
              alt={currentAvatarMeta.name}
              className={`mp-hero-preview-img ${previewZoom}`}
              loading="eager"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/avvtar/aman.svg';
              }}
            />
            <span className="mp-hero-check-pill">✓</span>
          </div>
          <div className="mp-hero-preview-info">
            <div className="mp-hero-char-name">{currentAvatarMeta.name || 'Selected Avatar'}</div>
            <div className="mp-hero-tags-row">
              <span className="mp-hero-cat-tag">
                {currentAvatarMeta.categoryLabel || '👑 Founders'}
              </span>
              <span className="mp-hero-format-tag">
                {currentAvatarMeta.format || 'SQUARE'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Typo-Tolerant Search & Custom SVG/GIF Upload Bar */}
      <div className="mp-avatar-search-bar">
        <div className="mp-avatar-search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="mp-avatar-search-input"
            placeholder="Search 1,800+ avatars (e.g. 'naroto', 'gku', 'waltr', 'batmn')..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setLoadedCount(INITIAL_BATCH);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="mp-avatar-search-clear"
              onClick={handleClearSearch}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Shuffle Random Mix Button */}
        <button
          type="button"
          className="mp-shuffle-btn"
          onClick={handleReshuffle}
          title="Reshuffle avatars mix"
        >
          <span>🎲</span> Shuffle
        </button>

        {/* Custom SVG / GIF Upload Button */}
        <button
          type="button"
          className="mp-custom-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Upload your own SVG or GIF avatar"
        >
          <span>📤</span> Upload SVG / GIF
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".svg,.gif,.png,.jpg,.jpeg,.webp,image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>

      {/* 3. Category Filter Tabs Bar */}
      <div className="mp-avatar-category-bar">
        {AVATAR_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`mp-category-tab ${category === cat.id ? 'active' : ''}`}
            onClick={(e) => {
              handleCategoryChange(cat.id);
              try {
                e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              } catch (err) {}
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 4. 100% Square Avatar Grid */}
      <div
        className="mp-avatar-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <div className="mp-infinite-avatar-grid">
          {displayedAvatars.map((item, idx) => {
            const isSelected = selectedAvatar === item.url || (item.category === 'founders' && selectedAvatar === item.id);
            const cardBg = detectedBgColors[item.url] || (item.isKnownDark ? '#111827' : `#${item.color || 'ffffff'}`);
            const isCardTransparent = isAvatarTransparent(item, detectedTransparent);
            const zoomClass = isCardTransparent ? 'img-contain-fit' : (item.isKnownPortrait ? 'img-portrait-zoom' : 'img-cover-zoom');

            return (
              <button
                key={`${item.url}_${idx}`}
                type="button"
                className={`mp-circular-avatar-btn ${isSelected ? 'selected' : ''}`}
                style={{ backgroundColor: cardBg }}
                onClick={() => handleSelect(item.url)}
                title={`${item.name} (${item.categoryLabel})`}
              >
                <img
                  src={item.url}
                  alt={item.name}
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className={zoomClass}
                  onLoad={(e) => handleImageLoad(e, item)}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(item.name)}&backgroundColor=${item.color || 'facc15'}`;
                    e.currentTarget.className = 'img-contain-fit';
                  }}
                />
                {isSelected && (
                  <span className="mp-avatar-item-check">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {displayedAvatars.length >= loadedCount && (
          <div className="mp-infinite-loading-indicator">
            <span>⏳ Scroll for more avatars...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarPicker;

