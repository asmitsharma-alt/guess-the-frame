import React from 'react';
import { Scale, Crown } from 'lucide-react';

export const JudgeOverlay = ({ isOn, chosenJudge = null, candidates = [] }) => {
  return (
    <div className={`judge-ov ${isOn ? 'on' : ''}`} id="judgeOv">
      <div className="nb-shapes" aria-hidden="true">
        <div className="nb-shape nb-circle" style={{ top: '12%', left: '10%', background: 'var(--nb-yellow, #FACC15)' }}></div>
        <div className="nb-shape nb-square" style={{ top: '18%', right: '14%', background: 'var(--nb-blue, #3B82F6)' }}></div>
        <div className="nb-shape nb-star-shape" style={{ bottom: '15%', left: '8%', color: 'var(--nb-pink, #FF6B9D)' }}>★</div>
        <div className="nb-shape nb-square nb-sm" style={{ bottom: '12%', right: '12%', background: 'var(--nb-orange, #FB923C)' }}></div>
      </div>

      <div className="jo-window">
        <div className="jo-win-bar">
          <div className="jo-win-dots">
            <span className="jo-dot jo-dot-red"></span>
            <span className="jo-dot jo-dot-yellow"></span>
            <span className="jo-dot jo-dot-green"></span>
          </div>
          <div className="jo-win-tag"><Scale size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> JUDGE SELECTION</div>
        </div>

        <div className="jo-win-body">
          <h2 className="jo-title">SELECTING JUDGE</h2>
          <p className="jo-sub">WHO WILL RULE THIS ROUND?</p>

          <div className="jo-candidates" id="joCandidates">
            {candidates.map((p, idx) => (
              <div key={idx} className={`jo-cand ${chosenJudge?.name === p.name ? 'sel' : ''}`}>
                <div className="jo-circle" style={{ background: p.color || '#cae6ff' }}>
                  <img src={p.avatarImg || `/avvtar/${p.avatar || 'aman'}.svg`} alt={p.name} />
                </div>
                <div className="jo-cname">{p.name}</div>
              </div>
            ))}
          </div>

          <div className={`jo-sel-msg ${chosenJudge ? 'on' : ''}`} id="joSelMsg">
            <Crown size={16} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> <span className="sn" id="joSelName">{chosenJudge?.name || 'Player'}</span> IS THE JUDGE!
          </div>

          <div className="jo-footer">
            <div className="jo-rot-info">
              JUDGE SERVES FOR <span id="joServeRounds">3</span> ROUNDS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgeOverlay;
