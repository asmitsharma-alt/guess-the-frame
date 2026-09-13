import React, { useState, useRef, useMemo, useCallback } from 'react';
import SoundManager from '../../services/soundManager';
import { getAvatarSrc, BOLD_AVATAR_COLORS, AVATAR_SEEDS } from '../../services/gameConstants';

const FOUNDER_AVATARS = [
  { id: 'aman', name: 'Aman', src: '/avvtar/aman.svg' },
  { id: 'amish', name: 'Amish', src: '/avvtar/amish.svg' },
  { id: 'aziz', name: 'Aziz', src: '/avvtar/aziz.svg' },
  { id: 'vish', name: 'Vish', src: '/avvtar/vish.svg' }
];

const BATCH_SIZE = 25;

export const AvatarPicker = ({ selectedAvatar, onSelectAvatar }) => {
  const [loadedCount, setLoadedCount] = useState(BATCH_SIZE);
  const scrollContainerRef = useRef(null);

  // Generate deterministic list of completely unique avatars (zero repeats)
  const infiniteAvatars = useMemo(() => {
    const list = [];
    const seenUrls = new Set();
    const founderIds = new Set(['aman', 'amish', 'aziz', 'vish']);

    for (let i = 0; i < loadedCount && i < AVATAR_SEEDS.length; i++) {
      const seed = AVATAR_SEEDS[i];
      if (founderIds.has(seed.toLowerCase())) continue;
      const color = BOLD_AVATAR_COLORS[i % BOLD_AVATAR_COLORS.length];
      const url = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${color}`;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        list.push({ id: url, url, seed, color });
      }
    }
    return list;
  }, [loadedCount]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 140) {
      setLoadedCount(prev => Math.min(prev + BATCH_SIZE, AVATAR_SEEDS.length));
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

  const previewSrc = getAvatarSrc(selectedAvatar, 'aman');

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

      {/* Scrollable Container with Founders Row + Infinite Grid */}
      <div
        className="mp-avatar-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {/* Founders Row ("Classic Crew") */}
        <div className="mp-picker-section-label">⭐ CLASSIC CREW</div>
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

        {/* Infinite Grid ("Bold Cinema Characters") */}
        <div className="mp-picker-section-label mp-infinite-header">
          <span>✨ MORE BOLD CHARACTERS</span>
          <span className="mp-infinite-sublabel">Infinite Avatars</span>
        </div>

        <div className="mp-infinite-avatar-grid">
          {infiniteAvatars.map((item, idx) => {
            const isSelected = selectedAvatar === item.url;
            return (
              <button
                key={`${item.url}_${idx}`}
                type="button"
                className={`mp-circular-avatar-btn ${isSelected ? 'selected' : ''}`}
                data-avatar={item.url}
                onClick={() => handleSelect(item.url)}
                title={`Select Avatar ${idx + 1}`}
                style={{ backgroundColor: `#${item.color}` }}
              >
                <img
                  src={item.url}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/avvtar/aman.svg';
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
          <span>Scroll down for more avatars...</span>
        </div>
      </div>
    </div>
  );
};

export default AvatarPicker;
