import React from 'react';
import { AVATAR_MAP } from '../../services/gameConstants';
import { SecurityUtil } from '../../services/securityUtil';

export const Avatar = ({ player, className = 'av-img-elem', style = {} }) => {
  const safeName = SecurityUtil.escapeHtml(player?.name || 'Player');
  const rawAv = player?.avatar || player?.name?.toLowerCase() || 'aman';
  const avKey = String(rawAv).toLowerCase().replace(/[^a-z0-9]/g, '');
  const validAvatars = ['aman', 'amish', 'aziz', 'vish'];
  const safeAv = validAvatars.includes(avKey) ? avKey : 'aman';
  const avSrc = player?.avatarImg || `/avvtar/${safeAv}.svg`;

  return (
    <img
      src={avSrc}
      alt={safeName}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        borderRadius: '50%',
        display: 'block',
        ...style
      }}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/avvtar/aman.svg';
      }}
    />
  );
};

export default Avatar;
