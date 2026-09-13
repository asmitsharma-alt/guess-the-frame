import React, { useState, useRef, useMemo, useCallback } from 'react';
import SoundManager from '../../services/soundManager';
import {
  getAvatarSrc,
  BOLD_AVATAR_COLORS,
  AVATAR_SEEDS,
  AVATAR_API_STYLES,
  buildAvatarDescriptor
} from '../../services/gameConstants';

const FOUNDER_AVATARS = [
  { id: 'aman', name: 'Aman', src: '/avvtar/aman.svg', color: 'ff6b9d' },
  { id: 'amish', name: 'Amish', src: '/avvtar/amish.svg', color: '38bdf8' },
  { id: 'aziz', name: 'Aziz', src: '/avvtar/aziz.svg', color: '84cc16' },
  { id: 'vish', name: 'Vish', src: '/avvtar/vish.svg', color: 'facc15' }
];

const INITIAL_BATCH = 30;
const BATCH_INCREMENT = 25;

export const AvatarPicker = ({ selectedAvatar, onSelectAvatar }) => {
  const [category, setCategory] = useState('all');
  const [shuffleKey, setShuffleKey] = useState(0);
  const [loadedCount, setLoadedCount] = useState(INITIAL_BATCH);
  const scrollContainerRef = useRef(null);

  // Pre-generate shuffled pool for 'all' mode (excluding founders)
  const allRandomizedPool = useMemo(() => {
    const pool = [];
    const founderNames = new Set(['aman', 'amish', 'aziz', 'vish']);
    const styleIds = AVATAR_API_STYLES.map(s => s.id);

    for (const style of styleIds) {
      for (const seed of AVATAR_SEEDS) {
        if (founderNames.has(seed.toLowerCase())) continue;
        pool.push({ seed, style });
      }
    }

    // Fisher-Yates shuffle with shuffleKey dependency to randomize order
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool;
  }, [shuffleKey]);

  // Compute avatar list based on active category with strict zero-duplication
  const displayAvatars = useMemo(() => {
    const list = [];
    const seenUrls = new Set();
    const founderNames = new Set(['aman', 'amish', 'aziz', 'vish']);

    if (category === 'founders') {
      return []; // Founders are rendered in the dedicated Classic Crew section
    }

    if (category === 'all') {
      for (let i = 0; i < loadedCount && i < allRandomizedPool.length; i++) {
        const item = allRandomizedPool[i];
        const color = BOLD_AVATAR_COLORS[i % BOLD_AVATAR_COLORS.length];
        const descriptor = buildAvatarDescriptor(item.seed, item.style, color);
        if (!seenUrls.has(descriptor.url)) {
          seenUrls.add(descriptor.url);
          list.push(descriptor);
        }
      }
    } else {
      let idx = 0;
      for (let i = 0; idx < loadedCount && i < AVATAR_SEEDS.length; i++) {
        const seed = AVATAR_SEEDS[i];
        if (founderNames.has(seed.toLowerCase())) continue;
        const color = BOLD_AVATAR_COLORS[idx % BOLD_AVATAR_COLORS.length];
        const descriptor = buildAvatarDescriptor(seed, category, color);
        if (!seenUrls.has(descriptor.url)) {
          seenUrls.add(descriptor.url);
          list.push(descriptor);
          idx++;
        }
      }
    }

    return list;
  }, [category, loadedCount, allRandomizedPool]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 140) {
      setLoadedCount(prev => prev + BATCH_INCREMENT);
    }
  }, []);

  const handleSelect = (avIdOrUrl) => {
    try {
      SoundManager.playClick();
    } catch (e) {}
    if (typeof onSelectAvatar === 'function') {
      onSelectAvatar(avIdOrUrl);
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

  const handleShuffle = () => {
    try {
      SoundManager.playClick();
    } catch (e) {}
    setCategory('all');
    setShuffleKey(prev => prev + 1);
    setLoadedCount(INITIAL_BATCH);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const previewSrc = getAvatarSrc(selectedAvatar, 'aman');

  // Category Header Label
  const getCategoryTitle = () => {
    if (category === 'all') return '✨ RANDOMIZED MIX';
    if (category === 'founders') return '👑 THE ORIGINAL FOUNDERS';
    const found = AVATAR_API_STYLES.find(s => s.id === category);
    return found ? `${found.icon} ${found.name.toUpperCase()}` : 'CHARACTERS';
  };

  return (
    <div className="mp-avatar-picker-wrap">
      {/* Selected Avatar Live Preview Pill */}
      <div className="mp-avatar-selected-preview">
        <div className="mp-preview-circle-wrap">
          <img
            src={previewSrc}
            alt="Selected Avatar"
            className="mp-preview-circle-img"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/avvtar/aman.svg';
            }}
          />
          <span className="mp-preview-check-badge">✓</span>
        </div>
        <div className="mp-preview-meta">
          <span className="mp-preview-label">CURRENT AVATAR</span>
          <span className="mp-preview-sub">Tap any character below to change</span>
        </div>
      </div>

      {/* Category Tabs & Shuffle Button Bar */}
      <div className="mp-avatar-category-bar">
        <button
          type="button"
          className={`mp-category-tab ${category === 'all' ? 'active' : ''}`}
          onClick={() => handleCategoryChange('all')}
        >
          ⭐ All
        </button>
        <button
          type="button"
          className="mp-shuffle-btn"
          onClick={handleShuffle}
          title="Shuffle randomized avatars"
        >
          🎲 Shuffle
        </button>
        <button
          type="button"
          className={`mp-category-tab ${category === 'founders' ? 'active' : ''}`}
          onClick={() => handleCategoryChange('founders')}
        >
          👑 Founders
        </button>
        {AVATAR_API_STYLES.map(st => (
          <button
            key={st.id}
            type="button"
            className={`mp-category-tab ${category === st.id ? 'active' : ''}`}
            onClick={() => handleCategoryChange(st.id)}
          >
            <span>{st.icon}</span> {st.name}
          </button>
        ))}
      </div>

      {/* Scrollable Container with Founders Row + Infinite Grid */}
      <div
        className="mp-avatar-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {/* Founders Row ("Classic Crew") - Fixed in place, never randomized */}
        {(category === 'all' || category === 'founders') && (
          <>
            <div className="mp-picker-section-label">
              <span>⭐ CLASSIC CREW</span>
              <span className="mp-infinite-sublabel">Original Founders</span>
            </div>
            <div className="mp-avatar-grid mp-founders-grid">
              {FOUNDER_AVATARS.map((av) => {
                const isSelected = selectedAvatar === av.id || selectedAvatar === av.src;
                return (
                  <div
                    key={av.id}
                    className={`mp-avatar-option ${isSelected ? 'selected' : ''}`}
                    data-avatar={av.id}
                    onClick={() => handleSelect(av.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <img
                      src={av.src}
                      alt={av.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/avvtar/aman.svg';
                      }}
                    />
                    <div className="mp-avatar-name">{av.name}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Dynamic / Randomized Grid */}
        {category !== 'founders' && (
          <>
            <div className="mp-picker-section-label mp-infinite-header">
              <span>{getCategoryTitle()}</span>
              <span className="mp-infinite-sublabel">
                {category === 'all' ? 'Randomized Styles' : 'Infinite Avatars'}
              </span>
            </div>

            <div className="mp-infinite-avatar-grid">
              {displayAvatars.map((item, idx) => {
                const isSelected = selectedAvatar === item.url;
                return (
                  <button
                    key={`${item.url}_${idx}`}
                    type="button"
                    className={`mp-circular-avatar-btn ${isSelected ? 'selected' : ''}`}
                    data-avatar={item.url}
                    onClick={() => handleSelect(item.url)}
                    title={item.label || `Avatar ${idx + 1}`}
                    style={{ backgroundColor: `#${item.color}` }}
                  >
                    <img
                      src={item.url}
                      alt={item.seed}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        // Never fall back to a founder avatar inside the grid
                        e.currentTarget.src = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(item.seed)}&backgroundColor=${item.color}`;
                      }}
                    />
                    {isSelected && (
                      <span className="mp-avatar-item-check">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Infinite Loader Indicator */}
            <div className="mp-infinite-loading-indicator">
              <span className="mp-spinner-icon">⏳</span>
              <span>Scroll down for more unique avatars...</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AvatarPicker;

