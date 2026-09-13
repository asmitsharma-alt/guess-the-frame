import React from 'react';

export const RoundIntroOverlay = ({ isOn, roundNum = 1, tagline = 'GET READY' }) => {
  return (
    <div className={`round-intro-ov ${isOn ? 'on' : ''}`} id="roundIntroOv">
      <div className="rio-content">
        <div className="rio-badge">ROUND</div>
        <div className="rio-num" id="rioNum">{roundNum}</div>
        <div className="rio-tag" id="rioTag">{tagline}</div>
        <div className="rio-dots">
          <div className="rio-dot" id="rd1"></div>
          <div className="rio-dot" id="rd2"></div>
          <div className="rio-dot" id="rd3"></div>
        </div>
      </div>
    </div>
  );
};

export default RoundIntroOverlay;
