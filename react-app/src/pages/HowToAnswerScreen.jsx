import React, { useState, useEffect, useRef } from 'react';
import SoundManager from '../services/soundManager';

export const HowToAnswerScreen = ({ isActive, isHost, onLaunchGame }) => {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      setSecondsLeft(10);
      return;
    }

    setSecondsLeft(10);
    timerRef.current = setInterval(() => {
      // Allow window.HowToAnswerGuide._secondsLeft override if set by test
      if (typeof window !== 'undefined' && window.HowToAnswerGuide && typeof window.HowToAnswerGuide._secondsLeft === 'number') {
        const guideVal = window.HowToAnswerGuide._secondsLeft;
        if (guideVal !== 10 && guideVal !== secondsLeft) {
          setSecondsLeft(Math.max(0, guideVal));
        }
      }

      setSecondsLeft(prev => {
        const next = Math.max(0, prev - 1);
        if (typeof window !== 'undefined' && window.HowToAnswerGuide) {
          window.HowToAnswerGuide._secondsLeft = next;
        }
        if (next === 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const effectiveIsHost = Boolean(isHost || (typeof window !== 'undefined' && (window.MultiplayerEngine?.isHost || window.HowToAnswerGuide?._isHost)));
  const isTimeUp = secondsLeft <= 0 || (typeof window !== 'undefined' && window.HowToAnswerGuide && typeof window.HowToAnswerGuide._secondsLeft === 'number' && window.HowToAnswerGuide._secondsLeft <= 0);

  const handleStart = () => {
    if (!effectiveIsHost || !isTimeUp) return;
    SoundManager.play('gamestart');
    if (typeof window !== 'undefined' && window.HowToAnswerGuide?.handleHostClick) {
      window.HowToAnswerGuide.handleHostClick();
    }
    if (onLaunchGame) onLaunchGame();
  };

  return (
    <div id="howToAnswerScreen" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="hta-modal-card">
        {/* TOP HEADER: BADGE | HOW TO PLAY TITLE | TIMER BOX */}
        <div className="hta-header">
          <div className="hta-badge">QUICK GUIDE</div>
          <div className="hta-title-wrap">
            <svg className="hta-title-burst" viewBox="0 0 24 24" fill="none">
              <path d="M4 12L1 12M6 6L2 3M6 18L2 21" stroke="#FF5E97" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <h2 className="hta-title">HOW TO PLAY</h2>
            <svg className="hta-title-burst right" viewBox="0 0 24 24" fill="none">
              <path d="M4 12L1 12M6 6L2 3M6 18L2 21" stroke="#FF5E97" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="hta-timer-badge">
            <span className="hta-timer-icon">⏱️</span>
            <div className="hta-timer-text-wrap">
              <span className="hta-timer-digits" id="htaTimerCount">{secondsLeft}s</span>
              <span className="hta-timer-label">GAME STARTS IN</span>
            </div>
          </div>
        </div>

        {/* SMOOTH TIMER BAR */}
        <div className="hta-timer-bar-wrap">
          <div
            className="hta-timer-bar-fill"
            id="htaTimerBar"
            style={{ width: `${(secondsLeft / 10) * 100}%`, transition: 'width 1s linear' }}
          ></div>
        </div>

        {/* 3-STEP ARCADE CARDS */}
        <div className="hta-grid">
          {/* STEP 1: WATCH FRAME */}
          <div className="hta-step-card step-1">
            <div className="hta-hero-art">
              <svg className="hta-svg-hero" viewBox="0 0 80 80" fill="none">
                <path d="M12 28L7 25M14 18L9 13M22 14L21 7" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M68 28L73 25M66 18L71 13M58 14L59 7" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
                <g transform="rotate(-12 20 32)">
                  <rect x="18" y="16" width="46" height="12" rx="4" fill="#1E293B" stroke="#111111" strokeWidth="3.5" />
                  <path d="M26 16L32 28M38 16L44 28M50 16L56 28" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
                </g>
                <rect x="18" y="32" width="46" height="34" rx="6" fill="#1E293B" stroke="#111111" strokeWidth="3.5" />
                <path d="M25 32L31 44M37 32L43 44M49 32L55 44" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="24" y1="50" x2="58" y2="50" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="24" y1="57" x2="48" y2="57" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="hta-step-title">STEP 1: WATCH FRAME</h3>
            <p className="hta-step-desc">Look closely at the screenshot for clues.</p>
            <div className="hta-bottom-pill pill-yellow">30s Round</div>
          </div>

          {/* STEP 2: TYPE GUESS */}
          <div className="hta-step-card step-2">
            <div className="hta-hero-art">
              <svg className="hta-svg-hero" viewBox="0 0 90 70" fill="none">
                <path d="M12 22L7 19M15 13L10 8" stroke="#0284C7" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M78 22L83 19M75 13L80 8" stroke="#0284C7" strokeWidth="3.5" strokeLinecap="round" />
                <rect x="15" y="24" width="60" height="34" rx="8" fill="#0F172A" />
                <rect x="15" y="20" width="60" height="34" rx="8" fill="#1E293B" stroke="#111111" strokeWidth="3.5" />
                <rect x="20" y="25" width="6" height="5" rx="1.5" fill="#FFFFFF" />
                <rect x="28" y="25" width="6" height="5" rx="1.5" fill="#FFFFFF" />
                <rect x="36" y="25" width="6" height="5" rx="1.5" fill="#FFFFFF" />
                <rect x="44" y="25" width="6" height="5" rx="1.5" fill="#FFFFFF" />
                <rect x="52" y="25" width="6" height="5" rx="1.5" fill="#FFFFFF" />
                <rect x="60" y="25" width="10" height="5" rx="1.5" fill="#F43F5E" />
                <rect x="20" y="33" width="8" height="5" rx="1.5" fill="#38BDF8" />
                <rect x="30" y="33" width="6" height="5" rx="1.5" fill="#FFFFFF" />
                <rect x="38" y="33" width="6" height="5" rx="1.5" fill="#FFFFFF" />
                <rect x="46" y="33" width="6" height="5" rx="1.5" fill="#FFFFFF" />
                <rect x="54" y="33" width="6" height="5" rx="1.5" fill="#FFFFFF" />
                <rect x="62" y="33" width="8" height="5" rx="1.5" fill="#FFFFFF" />
                <rect x="20" y="41" width="10" height="5" rx="1.5" fill="#F43F5E" />
                <rect x="32" y="41" width="26" height="5" rx="1.5" fill="#FFFFFF" />
                <rect x="60" y="41" width="10" height="5" rx="1.5" fill="#38BDF8" />
              </svg>
            </div>
            <h3 className="hta-step-title">STEP 2: TYPE GUESS</h3>
            <p className="hta-step-desc">Typos are forgiven! Acronyms accepted.</p>
            <div className="hta-search-pill">
              <span className="hsp-search-icon">🔍</span>
              <span className="hsp-search-text">Inception</span>
              <span className="hsp-typo-badge">TYPO OK</span>
            </div>
          </div>

          {/* STEP 3: UNLIMITED TRIES */}
          <div className="hta-step-card step-3">
            <div className="hta-hero-art">
              <svg className="hta-svg-hero" viewBox="0 0 80 80" fill="none">
                <path d="M14 22L9 19M16 13L11 8" stroke="#16A34A" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M66 22L71 19M64 13L69 8" stroke="#16A34A" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="40" cy="42" r="28" fill="#EF4444" stroke="#111111" strokeWidth="3.5" />
                <circle cx="40" cy="42" r="21" fill="#FFFFFF" stroke="#111111" strokeWidth="2.5" />
                <circle cx="40" cy="42" r="14" fill="#EF4444" stroke="#111111" strokeWidth="2.5" />
                <circle cx="40" cy="42" r="7" fill="#FFFFFF" stroke="#111111" strokeWidth="2" />
                <circle cx="40" cy="42" r="3" fill="#EF4444" />
                <g transform="rotate(40 40 42)">
                  <line x1="40" y1="42" x2="40" y2="12" stroke="#2563EB" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M34 16L40 22L46 16L40 8Z" fill="#3B82F6" stroke="#111111" strokeWidth="2" />
                  <path d="M40 20L40 8" stroke="#1D4ED8" strokeWidth="2" />
                </g>
              </svg>
            </div>
            <h3 className="hta-step-title">STEP 3: UNLIMITED TRIES</h3>
            <p className="hta-step-desc">No penalty for wrong guesses! Keep guessing fast.</p>
            <div className="hta-bottom-pill pill-green">Unlimited Tries</div>
          </div>
        </div>

        {/* POINTING SYSTEM SECTION */}
        <div className="hta-pointing-header">
          <div className="hta-pointing-title">
            <span>🏆</span>
            <span>POINTING SYSTEM</span>
          </div>
          <div className="hta-divider-line"></div>
        </div>

        <div className="hta-scoring-strip">
          {/* 1ST PLACE */}
          <div className="hta-score-pill pill-gold">
            <div className="hsp-icon-wrap">
              <svg className="hsp-medal-svg" viewBox="0 0 36 36" fill="none">
                <path d="M12 4L14 18L18 15L22 18L24 4H12Z" fill="#F43F5E" />
                <circle cx="18" cy="22" r="11" fill="#FBBF24" stroke="#B45309" strokeWidth="2" />
                <text x="18" y="26" textAnchor="middle" fontSize="12" fontWeight="900" fill="#78350F" fontFamily="Lilita One, sans-serif">1</text>
              </svg>
            </div>
            <div className="hsp-info">
              <span className="hsp-place">1st Place</span>
              <span className="hsp-pts">+10 PTS</span>
            </div>
          </div>

          {/* 2ND PLACE */}
          <div className="hta-score-pill pill-silver">
            <div className="hsp-icon-wrap">
              <svg className="hsp-medal-svg" viewBox="0 0 36 36" fill="none">
                <path d="M12 4L14 18L18 15L22 18L24 4H12Z" fill="#3B82F6" />
                <circle cx="18" cy="22" r="11" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" />
                <text x="18" y="26" textAnchor="middle" fontSize="12" fontWeight="900" fill="#334155" fontFamily="Lilita One, sans-serif">2</text>
              </svg>
            </div>
            <div className="hsp-info">
              <span className="hsp-place">2nd Place</span>
              <span className="hsp-pts">+7 PTS</span>
            </div>
          </div>

          {/* 3RD PLACE */}
          <div className="hta-score-pill pill-bronze">
            <div className="hsp-icon-wrap">
              <svg className="hsp-medal-svg" viewBox="0 0 36 36" fill="none">
                <path d="M12 4L14 18L18 15L22 18L24 4H12Z" fill="#EA580C" />
                <circle cx="18" cy="22" r="11" fill="#FDBA74" stroke="#C2410C" strokeWidth="2" />
                <text x="18" y="26" textAnchor="middle" fontSize="12" fontWeight="900" fill="#7C2D12" fontFamily="Lilita One, sans-serif">3</text>
              </svg>
            </div>
            <div className="hsp-info">
              <span className="hsp-place">3rd Place</span>
              <span className="hsp-pts">+5 PTS</span>
            </div>
          </div>

          {/* HINT USED */}
          <div className="hta-score-pill pill-hint">
            <div className="hsp-icon-wrap">
              <svg className="hsp-medal-svg" viewBox="0 0 36 36" fill="none">
                <path d="M18 6C13.5 6 10 9.5 10 14C10 17 12 19.5 14 22V24H22V22C24 19.5 26 17 26 14C26 9.5 22.5 6 18 6Z" fill="#FDE047" stroke="#A16207" strokeWidth="2" />
                <path d="M15 27H21M16 29H20" stroke="#713F12" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="hsp-info">
              <span className="hsp-place">Hint Used</span>
              <span className="hsp-pts minus">-2 PTS</span>
            </div>
          </div>

          {/* WRONG GUESS */}
          <div className="hta-score-pill pill-wrong">
            <div className="hsp-icon-wrap">
              <svg className="hsp-medal-svg" viewBox="0 0 36 36" fill="none">
                <path d="M18 6L9 10V18C9 23.5 13 28 18 30C23 28 27 23.5 27 18V10L18 6Z" fill="#94A3B8" stroke="#334155" strokeWidth="2" />
                <path d="M18 10L18 26" stroke="#475569" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="hsp-info">
              <span className="hsp-place">Wrong Guess</span>
              <span className="hsp-pts zero">0 PTS</span>
            </div>
          </div>
        </div>

        {/* CENTERED FOOTER ACTION */}
        <div className="hta-footer-center">
          {!effectiveIsHost && (
            <div id="htaClientStatus" className="hta-client-status">
              <span className="hta-spinner">⏳</span>
              <span id="htaClientStatusText">
                {secondsLeft > 0
                  ? `Reading rules... Waiting for host (${secondsLeft}s)`
                  : '🎮 Host can now launch Round 1! Get ready...'}
              </span>
            </div>
          )}

          <div className="hta-btn-container" style={{ display: effectiveIsHost ? 'flex' : 'none' }}>
            <div className="hta-action-rays left">
              <span></span><span></span><span></span>
            </div>
            <button
              id="htaHostStartBtn"
              className="hta-start-btn"
              disabled={!isTimeUp}
              onClick={handleStart}
            >
              {!isTimeUp ? (
                <span>⏳ Host can start in {secondsLeft}s...</span>
              ) : (
                <>
                  <span className="hta-play-icon">▶</span>
                  <span className="hta-btn-text">START GAME</span>
                </>
              )}
            </button>
            <div className="hta-action-rays right">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToAnswerScreen;
