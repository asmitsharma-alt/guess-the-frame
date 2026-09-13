import React from 'react';

export const TieVsOverlay = ({ isOn, tiedPlayers = [] }) => {
  return (
    <div className={`tie-vs-ov ${isOn ? 'on' : ''}`} id="tieVsOv">
      <div className="tie-vs-content">
        <div className="tie-vs-eyebrow">Tie Detected</div>
        <div className="tie-vs-title">TIE BREAKER</div>
        <div className="tie-vs-players" id="tieVsPlayers">
          {tiedPlayers.map((p, i) => (
            <div key={i} className="tie-player-card">
              <span className="tie-pname">{p.name}</span> ({p.score} pts)
            </div>
          ))}
        </div>
        <div className="tie-vs-sub">Sudden Death Round</div>
      </div>
    </div>
  );
};

export default TieVsOverlay;
