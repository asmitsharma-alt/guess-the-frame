import React from 'react';
import { AVATAR_MAP, getAvatarSrc } from '../../services/gameConstants';
import { SecurityUtil } from '../../services/securityUtil';

export const Avatar = ({ player, className = 'av-img-elem', style = {} }) => {
  const safeName = SecurityUtil.escapeHtml(player?.name || 'Player');
  const avSrc = player?.avatarImg || getAvatarSrc(player?.avatar, 'aman');
  const isPortrait = avSrc && (
    avSrc.includes('anilist.co') || 
    avSrc.includes('tvmaze.com') || 
    avSrc.includes('thronesapi.com') || 
    avSrc.includes('superhero-api')
  );

  return (
    <img
      src={avSrc}
      alt={safeName}
      className={className}
      referrerPolicy="no-referrer"
      style={{
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'cover',
        objectPosition: isPortrait ? 'center 4%' : 'center',
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
