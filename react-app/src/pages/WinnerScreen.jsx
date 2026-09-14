import React, { useEffect } from 'react';
import { Sparkles, Trophy, Users, Home, Play } from 'lucide-react';
import SoundManager from '../services/soundManager';
import { SecurityUtil } from '../services/securityUtil';
import { getAvatarSrc } from '../services/gameConstants';
import confetti from 'canvas-confetti';

export const WinnerScreen = ({
  isActive,
  players = [],
  onPlayAgain,
  onRematch,
  onReturnToLobby
}) => {
  const sorted = [...players].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  const p1 = sorted[0] || { name: 'AMAN', score: 0, avatar: 'aman' };
  const p2 = sorted[1] || { name: 'AZIZ', score: 0, avatar: 'aziz' };
  const p3 = sorted[2] || { name: 'AMISH', score: 0, avatar: 'amish' };

  useEffect(() => {
    if (!isActive) return;
    SoundManager.playWinner();

    // Trigger celebratory confetti cannon burst
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    const timer1 = setTimeout(() => triggerPopper('left'), 350);
    const timer2 = setTimeout(() => triggerPopper('right'), 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isActive]);

  const triggerPopper = (side) => {
    const popperEl = document.getElementById(side === 'left' ? 'popperLeft' : 'popperRight');
    if (popperEl) {
      popperEl.classList.remove('popping');
      void popperEl.offsetWidth;
      popperEl.classList.add('popping');
      setTimeout(() => { if (popperEl) popperEl.classList.remove('popping'); }, 450);
    }
    SoundManager.play('correct');

    try {
      confetti({
        particleCount: 40,
        angle: side === 'left' ? 60 : 120,
        spread: 55,
        origin: { x: side === 'left' ? 0.2 : 0.8, y: 0.7 }
      });
    } catch (e) {}
  };

  return (
    <div id="winnerScreen" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="comic-confetti-layer" id="confettiBox" aria-hidden="true"></div>

      <div className="comic-winner-card">
        {/* Corner Accent Polygons */}
        <div className="corner-poly poly-top-left" aria-hidden="true"></div>
        <div className="corner-poly poly-bottom-left" aria-hidden="true"></div>
        <div className="corner-poly poly-bottom-right" aria-hidden="true"></div>

        {/* Party Poppers */}
        <div
          className="cw-party-popper popper-left"
          id="popperLeft"
          onClick={() => triggerPopper('left')}
          role="button"
          tabIndex={0}
          title="Click to pop confetti!"
        >
          <div className="popper-blast-lines">
            <span></span><span></span><span></span>
          </div>
          <svg className="popper-cone" width="48" height="54" viewBox="0 0 46 52" fill="none">
            <path d="M23 48L3 8C3 8 13 2 23 2C33 2 43 8 43 8L23 48Z" fill="#EC4899" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M14 26C17 29 29 29 32 26" stroke="#FDE047" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M19 14C21 16 25 16 27 14" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="23" cy="8" r="3" fill="#FDE047" />
          </svg>
          <span className="popper-tooltip"><Sparkles size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> POP ME!</span>
        </div>

        <div
          className="cw-party-popper popper-right"
          id="popperRight"
          onClick={() => triggerPopper('right')}
          role="button"
          tabIndex={0}
          title="Click to pop confetti!"
        >
          <div className="popper-blast-lines">
            <span></span><span></span><span></span>
          </div>
          <svg className="popper-cone" width="48" height="54" viewBox="0 0 46 52" fill="none">
            <path d="M23 48L3 8C3 8 13 2 23 2C33 2 43 8 43 8L23 48Z" fill="#3B82F6" stroke="#000000" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M14 26C17 29 29 29 32 26" stroke="#FACC15" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M19 14C21 16 25 16 27 14" stroke="#4ADE80" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="23" cy="8" r="3" fill="#FACC15" />
          </svg>
          <span className="popper-tooltip"><Sparkles size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> POP ME!</span>
        </div>

        {/* Victory Header */}
        <div className="cw-victory-section">
          <div className="cw-victory-banner-wrap">
            <div className="cw-burst-dashes left-dashes" aria-hidden="true">
              <svg viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="33" y1="13" x2="11" y2="4" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
                <line x1="35" y1="23" x2="8" y2="23" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
                <line x1="33" y1="33" x2="11" y2="42" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </div>
            <div className="cw-victory-badge">
              <h1 className="cw-victory-title">VICTORY!</h1>
            </div>
            <div className="cw-burst-dashes right-dashes" aria-hidden="true">
              <svg viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="5" y1="13" x2="27" y2="4" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
                <line x1="3" y1="23" x2="30" y2="23" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
                <line x1="5" y1="33" x2="27" y2="42" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* 3-Column Main Stage */}
        <div className="cw-center-stage-grid">
          {/* Left Column: Message */}
          <div className="cw-left-col">
            <div className="cw-msg-card">
              <div className="cw-info-header">
                <span className="msg-icon-wrap" aria-hidden="true">
                  <svg width="22" height="20" viewBox="0 0 24 22" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    <circle cx="9" cy="11.5" r="1" fill="#4F46E5" />
                    <circle cx="12" cy="11.5" r="1" fill="#4F46E5" />
                    <circle cx="15" cy="11.5" r="1" fill="#4F46E5" />
                  </svg>
                </span>
                <span>MESSAGE</span>
              </div>
              <p className="cw-info-text">
                Umeed hai ki aapko yeh khel pasand aaya hoga. Agar koi sujhav ya pratikriya ho toh humein zaroor batayega. Phir milte hain agle hafte ek naye anubhav ke saath. <br />
                <span className="cw-info-closing">Dhanyavaad! <Sparkles size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} /></span>
              </p>
            </div>
          </div>

          {/* Center Column: 3 Podium Runner Cards */}
          <div className="cw-center-col">
            <div className="cw-stage-section">
              {/* Silver (2nd) */}
              <div className="cw-runner-col">
                <div className="cw-card-burst burst-left" aria-hidden="true">
                  <svg viewBox="0 0 30 25" width="22" height="18" fill="none">
                    <line x1="22" y1="22" x2="8" y2="6" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
                    <line x1="28" y1="12" x2="16" y2="2" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="cw-runner-card runner-blue" id="silverCard">
                  <div className="runner-rank-tab blue-tab">2</div>
                  <div className="runner-avatar-frame" id="silverAvatarWrap">
                    <img id="silverAvatarImg" src={getAvatarSrc(p2.avatar, 'aziz')} alt="2nd Place" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/avvtar/aziz.svg'; }} />
                  </div>
                  <div className="runner-nameplate" id="silverName">{(p2.name || 'AZIZ').toUpperCase()}</div>
                  <div className="runner-score-tag blue-score-tag" id="silverScore">{p2.score || 0} POINTS</div>
                </div>
              </div>

              {/* Champion (1st) */}
              <div className="cw-runner-col">
                <div className="cw-runner-card runner-gold" id="champHeroCard">
                  <div className="runner-rank-tab gold-tab">
                    <svg viewBox="0 0 24 20" width="18" height="15" fill="#111827">
                      <path d="M2 5l4.5 4L12 2l5.5 7L22 5l-2.5 11H4.5L2 5z" />
                      <rect x="3.5" y="17.5" width="17" height="2.5" rx="1" />
                    </svg>
                  </div>
                  <div className="runner-avatar-frame champ-avatar-frame" id="champAvatarWrap">
                    <img id="champAvatarImg" src={getAvatarSrc(p1.avatar, 'aman')} alt="Champion" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/avvtar/aman.svg'; }} />
                  </div>
                  <div className="runner-nameplate champ-nameplate" id="champName">{(p1.name || 'AMAN').toUpperCase()}</div>
                  <div className="runner-score-tag gold-score-tag" id="champScore">{p1.score || 0} POINTS</div>
                </div>
              </div>

              {/* Bronze (3rd) */}
              <div className="cw-runner-col">
                <div className="cw-card-burst burst-right" aria-hidden="true">
                  <svg viewBox="0 0 30 25" width="22" height="18" fill="none">
                    <line x1="8" y1="22" x2="22" y2="6" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
                    <line x1="2" y1="12" x2="14" y2="2" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="cw-runner-card runner-orange" id="bronzeCard">
                  <div className="runner-rank-tab orange-tab">3</div>
                  <div className="runner-avatar-frame" id="bronzeAvatarWrap">
                    <img id="bronzeAvatarImg" src={getAvatarSrc(p3.avatar, 'amish')} alt="3rd Place" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/avvtar/amish.svg'; }} />
                  </div>
                  <div className="runner-nameplate" id="bronzeName">{(p3.name || 'AMISH').toUpperCase()}</div>
                  <div className="runner-score-tag orange-score-tag" id="bronzeScore">{p3.score || 0} POINTS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Scoreboard */}
          <div className="cw-right-col">
            <div className="cw-scoreboard-card">
              <div className="cw-scoreboard-header">
                <span className="trophy-icon"><Trophy size={20} strokeWidth={2.5} /></span>
                <span>SCOREBOARD</span>
              </div>
              <div className="cw-sb-list" id="winnerScoreboardList">
                {sorted.map((p, i) => {
                  const isChamp = i === 0 && (p.score || 0) > 0;
                  return (
                    <div key={p.id || i} className={`sb-row ${isChamp ? 'sb-champ' : ''}`}>
                      <div className="sb-left">
                        <span className="sb-rank">{i + 1}</span>
                        <div className="sb-avatar-mini">
                          <img src={getAvatarSrc(p.avatar, 'aman')} alt={p.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/avvtar/aman.svg'; }} />
                        </div>
                        <span className="sb-name">{(p.name || 'PLAYER').toUpperCase()}</span>
                      </div>
                      <span className="sb-score">{p.score || 0} PTS</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Credits Pill Bar */}
        <div className="cw-credits-pill-bar">
          <div className="cw-credit-item">
            <span className="cw-credit-badge">FRAMES BY</span>
            <span className="cw-credit-names" id="creatorMsg">
              tanmay, Tanuj, Darshan, Akash, Anmol (timestamp guy) and members of smoc.
            </span>
          </div>
          <div className="cw-credit-divider" aria-hidden="true">•</div>
          <div className="cw-credit-item">
            <span className="cw-credit-badge credit-badge-blue">WEBSITE BY</span>
            <span className="cw-credit-names">Asmit </span>
          </div>
        </div>

        {/* Bottom Buttons Deck */}
        <div className="cw-buttons-deck">
          <button
            type="button"
            className="cw-btn btn-play-again"
            onClick={() => {
              SoundManager.playClick();
              if (onPlayAgain) onPlayAgain();
            }}
          >
            <span className="cw-btn-icon"><Play size={18} strokeWidth={2.5} /></span>
            <span className="cw-btn-text">PLAY AGAIN</span>
          </button>
          <button
            type="button"
            className="cw-btn btn-rematch"
            onClick={() => {
              SoundManager.playClick();
              if (onRematch) onRematch();
            }}
          >
            <span className="cw-btn-icon"><Users size={18} strokeWidth={2.5} /></span>
            <span className="cw-btn-text">REMATCH</span>
          </button>
          <button
            type="button"
            className="cw-btn btn-lobby"
            onClick={() => {
              SoundManager.playClick();
              if (typeof window !== 'undefined' && window.UI?.showScreen) {
                window.UI.showScreen('playerLobbyScreen');
              }
              if (onReturnToLobby) onReturnToLobby();
            }}
          >
            <span className="cw-btn-icon"><Home size={18} strokeWidth={2.5} /></span>
            <span className="cw-btn-text">RETURN TO LOBBY</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerScreen;
