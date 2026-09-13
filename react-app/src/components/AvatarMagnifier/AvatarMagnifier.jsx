import React, { useEffect, useRef, useState } from 'react';

export const AvatarMagnifier = () => {
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState('');
  const [name, setName] = useState('');
  const [coords, setCoords] = useState({ left: 0, top: 0, originY: 70 });
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleMouseOver = (e) => {
      const avWrap = e.target.closest('.lp-avatar-wrap, .lb-av-wrap, .jo-circle, .p-circle, .spbtn');
      if (!avWrap) return;

      const img = avWrap.querySelector('img');
      if (!img || !img.src) return;

      const playerCard = avWrap.closest('.lobby-player, .lb-item, .jo-cand, .sp-wrap, .podium-slot');
      let playerName = '';
      if (playerCard) {
        const nameEl = playerCard.querySelector('.lp-name, .lb-name, .jo-cname, .sp-name, .podium-name');
        if (nameEl) {
          playerName = nameEl.textContent.replace(/JUDGE|👑|\d+/g, '').trim();
        }
      }
      if (!playerName && avWrap.getAttribute('aria-label')) {
        playerName = avWrap.getAttribute('aria-label').replace('Award point to ', '').trim();
      }

      const rect = avWrap.getBoundingClientRect();
      const circleSize = 140;
      const popWidth = 140;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      let left = cx - popWidth / 2;
      let top = cy - circleSize / 2;

      if (top < 10) top = 10;
      if (left < 10) left = 10;
      if (left + popWidth > window.innerWidth - 10) left = window.innerWidth - popWidth - 10;

      setSrc(img.src);
      setName(playerName || 'PLAYER');
      setCoords({ left, top, originY: circleSize / 2 });
      setVisible(true);
    };

    const handleMouseOut = (e) => {
      const avWrap = e.target.closest('.lp-avatar-wrap, .lb-av-wrap, .jo-circle, .p-circle, .spbtn');
      if (avWrap) {
        setVisible(false);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  return (
    <div
      id="avatarMagnifierPreview"
      ref={popoverRef}
      className={`nb-av-popover ${visible ? 'visible' : ''}`}
      style={{
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        transformOrigin: `center ${coords.originY}px`
      }}
    >
      <div className="nb-popover-circle">
        <img src={src} id="nbPopoverImg" alt="Avatar Preview" />
      </div>
      <div
        className="nb-popover-name"
        id="nbPopoverName"
        style={{ display: name ? 'block' : 'none' }}
      >
        {name}
      </div>
    </div>
  );
};

export default AvatarMagnifier;
