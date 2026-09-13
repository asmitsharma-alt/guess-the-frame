import React from 'react';

export const SecIntroOverlay = ({ isOn, name = 'Movies', rounds = 10, iconName = 'icon-clapperboard' }) => {
  return (
    <div className={`sec-intro-ov ${isOn ? 'on' : ''}`} id="secIntroOv">
      <div className="sio-particles" id="sioParticles"></div>
      <div className="sio-orb"></div>
      <div className="sio-content">
        <div className="sio-eyebrow">NOW ENTERING</div>
        <div className="sio-icon" id="sioIcon">
          <svg className="svg-icon">
            <use href={`#${iconName}`} />
          </svg>
        </div>
        <div className="sio-name" id="sioName">{name}</div>
        <div className="sio-meta"><span id="sioRounds">{rounds}</span> Rounds</div>
        <div className="sio-line"></div>
        <div className="sio-ready">Get Ready</div>
        <div className="sio-dots" id="sioDots"></div>
      </div>
    </div>
  );
};

export default SecIntroOverlay;
