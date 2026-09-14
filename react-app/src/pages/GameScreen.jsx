import React, { useState, useEffect, useRef } from 'react';
import SoundManager from '../services/soundManager';
import PaletteManager from '../services/paletteManager';
import { FuzzyMatcher } from '../services/fuzzyMatcher';
import { SecurityUtil } from '../services/securityUtil';
import { AVATAR_MAP, getAvatarSrc } from '../services/gameConstants';

export const GameScreen = ({
  isActive,
  isHost,
  playerId,
  playerName,
  playerAvatar,
  players = [],
  currentPlaylist = [],
  currentPlayIndex = 0,
  currentFrame,
  timeRemaining = 30,
  timerMax = 30,
  isPaused = false,
  isRoundFinished = false,
  isAnswerRevealed = false,
  maskedHint = null,
  chatMessages = [],
  onSkipRound,
  onNextRound,
  onTogglePause,
  onEndMatch,
  onRequestHint,
  onSubmitGuess,
  onSendChatMessage,
  onAdjustScore
}) => {
  const [guessInput, setGuessInput] = useState('');
  const [mobileGuessInput, setMobileGuessInput] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showScoringOverlay, setShowScoringOverlay] = useState(false);
  const chatStreamRef = useRef(null);
  const imgRef = useRef(null);

  const frame = currentFrame || currentPlaylist[currentPlayIndex] || null;
  const roundNum = currentPlayIndex + 1;
  const totalRounds = currentPlaylist.length || 20;

  // Palette extraction from frame image
  useEffect(() => {
    if (frame && frame.content && frame.type === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        PaletteManager.fromImage(img);
      };
      img.src = `/${frame.content}`;
    }
  }, [frame]);

  // Preload next frame image in background to eliminate round transition latency
  useEffect(() => {
    if (currentPlaylist && currentPlaylist[currentPlayIndex + 1]) {
      const nextItem = currentPlaylist[currentPlayIndex + 1];
      if (nextItem && nextItem.content && nextItem.type === 'image') {
        const preloadImg = new Image();
        preloadImg.src = nextItem.content.startsWith('/') ? nextItem.content : `/${nextItem.content}`;
      }
    }
  }, [currentPlaylist, currentPlayIndex]);

  // Auto-scroll chat stream on new message
  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const effectiveIsHost = Boolean(isHost || (typeof window !== 'undefined' && window.MultiplayerEngine?.isHost));

  const submitGuess = (val) => {
    const clean = val.trim();
    if (!clean) return;
    setGuessInput('');
    setMobileGuessInput('');
    if (typeof window !== 'undefined' && window.ChatEngine?.processOutgoingMessage) {
      window.ChatEngine.processOutgoingMessage(clean);
    } else if (typeof window !== 'undefined' && window.MultiplayerEngine) {
      if (window.MultiplayerEngine.isHost) {
        window.MultiplayerEngine.validateAndProcessGuess({
          playerId: window.MultiplayerEngine.playerId || playerId,
          playerName: window.MultiplayerEngine.playerName || playerName,
          playerAvatar: window.MultiplayerEngine.playerAvatar || playerAvatar,
          guess: clean,
          roundIndex: window.MultiplayerEngine.currentPlayIndex ?? currentPlayIndex ?? 0
        });
      } else {
        window.MultiplayerEngine.sendEvent('SUBMIT_GUESS', {
          playerId: window.MultiplayerEngine.playerId || playerId,
          playerName: window.MultiplayerEngine.playerName || playerName,
          playerAvatar: window.MultiplayerEngine.playerAvatar || playerAvatar,
          guess: clean,
          roundIndex: window.MultiplayerEngine.currentPlayIndex ?? currentPlayIndex ?? 0
        });
      }
    }
    if (onSubmitGuess) onSubmitGuess(clean);
  };

  const handleGuessSubmit = (e) => {
    e.preventDefault();
    submitGuess(guessInput);
  };

  const handleMobileGuessSubmit = (e) => {
    e.preventDefault();
    submitGuess(mobileGuessInput);
  };

  // Timer SVG circle calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const timerRatio = timerMax > 0 ? timeRemaining / timerMax : 0;
  const strokeDashoffset = circumference * (1 - timerRatio);

  let timerColor = '#4ade80';
  let isPulse = false;
  if (timeRemaining <= timerMax * 0.2) {
    timerColor = '#ef4444';
    isPulse = true;
  } else if (timeRemaining <= timerMax * 0.5) {
    timerColor = '#fbbf24';
  }

  return (
    <div id="gameScreen" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="game-main-row">
        {/* LEFT: HERO GAME STAGE COLUMN */}
        <div className="game-stage-col">
          {/* Top Game Header */}
          <header className="game-header">
            <div
              className="header-logo-wrap"
              onClick={() => {
                SoundManager.playClick();
                PaletteManager.reset();
              }}
              title="ScoopCast — Return to Home"
            >
              <img className="header-logo-img" src="/logo.png" alt="ScoopCast" />
            </div>

            <div className="game-progress">
              <div className="sec-badge">
                <span id="curSecIcon">
                  {frame?.type === 'dialogue' ? (
                    <span className="material-symbols-outlined text-base">chat</span>
                  ) : frame?.category === 'eyes' || frame?.sectionName === 'Guess the Eyes' ? (
                    <span className="material-symbols-outlined text-base">visibility</span>
                  ) : (
                    <svg className="svg-icon">
                      <use href="#icon-clapperboard" />
                    </svg>
                  )}
                </span>
                <span id="curSecName">
                  {frame?.sectionName || (frame?.type === 'dialogue' ? 'Guess the Dialogue' : (frame?.category === 'eyes' ? 'Guess the Eyes' : 'Guess the Frame'))}
                </span>
              </div>
              <div className="round-info" id="roundInfo">
                Round {roundNum} / {totalRounds}
              </div>
            </div>
          </header>

          {/* Hero Frame Cinematic Area */}
          <div className="frame-area">
            <div className="state-ind" id="stateInd" style={{ display: 'none' }}>
              ROUND ACTIVE
            </div>

            <div className="frame-display" id="frameDisplay">
              <div className="frame-stage-loader" id="frameStageLoader" style={{ display: 'none' }}>
                <div className="fsl-bar"></div>
              </div>
              <div className="frame-placeholder hidden" id="framePlaceholder">
                <span className="emoji">
                  <svg className="svg-icon">
                    <use href="#icon-clapperboard" />
                  </svg>
                </span>
                <h2>ScoopCast</h2>
              </div>
              <div className="frame-layer" id="frameLayer"></div>

              {/* Dialogue display */}
              <div
                className={`frame-dialogue ${frame?.type === 'dialogue' ? 'visible' : ''}`}
                id="frameDialogue"
                style={{ display: frame?.type === 'dialogue' ? 'flex' : 'none' }}
              >
                <div className="dialogue-content">
                  <div className="dialogue-quote" id="dialogueQuote">{frame?.content || ''}</div>
                  <div className="dialogue-context" id="dialogueContext">Guess the Movie / Show</div>
                </div>
              </div>

              {/* Image container with crossfade */}
              <div
                className={`frame-image-container ${frame?.type === 'dialogue' ? 'hidden' : ''}`}
                id="imageContainer"
                style={{ display: frame?.type === 'dialogue' ? 'none' : 'flex' }}
              >
                {frame && frame.type === 'image' && (
                  <img
                    ref={imgRef}
                    className={`frame-image loaded ${isRoundFinished || isAnswerRevealed ? 'revealed' : 'blurred'}`}
                    src={`/${(isRoundFinished || isAnswerRevealed) && frame.revealContent ? frame.revealContent : frame.content}`}
                    alt={frame?.sectionName || "Movie Frame"}
                    loading="eager"
                    onError={(e) => {
                      // Graceful fallback
                      e.target.style.display = 'none';
                    }}
                  />
                )}
              </div>

              {/* Answer Overlay */}
              <div className={`answer-overlay ${isRoundFinished || isAnswerRevealed ? 'visible active' : ''}`} id="answerOverlay">
                <div className="ans-card">
                  <div className="ans-badge">
                    {frame?.type === 'dialogue' ? 'Movie Quote' : (frame?.category === 'eyes' || frame?.sectionName === 'Guess the Eyes' ? 'Celebrity' : 'Answer')}
                  </div>
                  <div className="ans-year" id="ansYear">{frame?.year || ''}</div>
                  <div className="ans-divider"></div>
                  <div className="ans-title" id="ansTitle">{frame?.answer || ''}</div>
                  <div className="ans-dialogue" id="ansDialogue">{frame?.type === 'dialogue' ? `"${frame?.content}"` : ''}</div>
                  <div className="ans-action-bar" id="ansActionBar">
                    <button
                      type="button"
                      className="ans-next-round-btn"
                      id="ansNextRoundBtn"
                      style={{ display: effectiveIsHost ? 'block' : 'none' }}
                      onClick={() => {
                        SoundManager.playClick();
                        if (typeof window !== 'undefined' && window.MultiplayerEngine?.hostNextRound) {
                          window.MultiplayerEngine.hostNextRound();
                        }
                        if (onNextRound) onNextRound();
                      }}
                    >
                      NEXT ROUND ⏭
                    </button>
                    <div
                      className="ans-waiting-host-pill"
                      id="ansWaitingHostPill"
                      style={{ display: !effectiveIsHost ? 'block' : 'none' }}
                    >
                      ⌛ Waiting for host to start next round...
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scoring Overlay */}
            <div className={`scoring-overlay ${showScoringOverlay ? 'on visible' : ''}`} id="scoringOv">
              <div className="scoring-answer-badge" id="scoringAnswerBadge">
                <span className="sab-label">
                  <svg className="svg-icon"><use href="#icon-check" /></svg> Correct Answer
                </span>
                <span className="sab-title" id="scoringAnswerTitle">{frame?.answer || '—'}</span>
                <span className="sab-year" id="scoringAnswerYear">{frame?.year || ''}</span>
              </div>
              <div className="scoring-title">
                <svg className="svg-icon"><use href="#icon-target" /></svg> Who Got It Right?
              </div>
              <div className="scoring-sub" id="scoringSub">Click the player who answered correctly</div>
              <div className="scoring-grid" id="scoringGrid">
                {players.map((p, i) => {
                  const avKey = (p.avatar || 'aman').toLowerCase().replace(/[^a-z0-9]/g, '');
                  return (
                    <button
                      key={p.id || i}
                      type="button"
                      className="spbtn"
                      onClick={() => {
                        SoundManager.playSelPlayer();
                        if (onAdjustScore) onAdjustScore(i, 10);
                        setShowScoringOverlay(false);
                      }}
                    >
                      <img src={getAvatarSrc(p.avatar, 'aman')} alt={p.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/avvtar/aman.svg'; }} />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="locked-ind" id="lockedInd" style={{ display: 'none' }}>
                <svg className="svg-icon"><use href="#icon-check" /></svg> Points Awarded — Moving to Next Round...
              </div>
              <div className="skipped-ind" id="skippedInd" style={{ display: 'none' }}>
                ⏭ Skipped — No One Knew
              </div>
              <div className="waiting-host-ind" id="waitingHostInd" style={{ display: 'none' }}>
                ⌛ Waiting for host to award points...
              </div>
            </div>
          </div>

          {/* Host Controls */}
          <div className="host-floating-bar" id="hostFloatingBar" style={{ display: effectiveIsHost ? 'flex' : 'none' }}>
            <span className="hfb-label" id="hfbLabel">👑 HOST CONTROLS:</span>
            <div className="hfb-host-only" id="hfbHostOnly" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="hfb-btn"
                id="hfbSkipBtn"
                onClick={() => {
                  SoundManager.playSkip();
                  if (typeof window !== 'undefined' && window.MultiplayerEngine) {
                    window.MultiplayerEngine.isRoundFinished = true;
                  }
                  if (onSkipRound) onSkipRound();
                }}
              >
                ⏭ Skip Frame
              </button>
              <button
                type="button"
                className="hfb-btn"
                id="hfbNextBtn"
                onClick={() => {
                  SoundManager.playClick();
                  if (onNextRound) onNextRound();
                }}
                style={{ display: isRoundFinished ? 'inline-block' : 'none', background: '#10B981 !important', color: '#fff !important' }}
              >
                ▶ Next Round
              </button>
              <button
                type="button"
                className="hfb-btn"
                id="hfbPauseBtn"
                onClick={() => {
                  SoundManager.playClick();
                  if (typeof window !== 'undefined' && window.MultiplayerEngine) {
                    window.MultiplayerEngine.isPaused = !window.MultiplayerEngine.isPaused;
                  }
                  if (onTogglePause) onTogglePause();
                }}
              >
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <button
                type="button"
                className="hfb-btn"
                id="hfbEndBtn"
                onClick={() => {
                  SoundManager.playClick();
                  if (window.confirm('Are you sure you want to end this match?')) {
                    if (onEndMatch) onEndMatch();
                  }
                }}
              >
                🏁 End Match
              </button>
            </div>
            <button
              type="button"
              className="hfb-btn"
              id="hfbHintBtn"
              onClick={() => {
                SoundManager.playClick();
                if (typeof window !== 'undefined' && window.MultiplayerEngine?.requestHint) {
                  window.MultiplayerEngine.requestHint();
                }
                if (onRequestHint) onRequestHint();
              }}
              style={{ background: '#FDE047 !important' }}
            >
              💡 Hint (-2 pts)
            </button>

            {/* Active Hint Display */}
            <div
              className="hfb-active-hint-pill"
              id="hfbActiveHintPill"
              style={{ display: maskedHint ? 'inline-flex' : 'none' }}
            >
              <span className="hahp-badge">💡 HINT:</span>
              <span className="hahp-text" id="hfbActiveHintText">{maskedHint || ''}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: SIDEBAR CONTROLS, LEADERBOARD & LIVE CHAT COLUMN */}
        <aside className="game-sidebar-col">
          {/* Card 1: Round Controls */}
          <div className="panel-sec">
            <h3>
              <svg className="svg-icon"><use href="#icon-target" /></svg> Round Controls
            </h3>
            <div className="nonk-panel" id="nonkPanel">
              <button
                type="button"
                className="nonk-btn"
                id="nonkBtn"
                onClick={() => {
                  SoundManager.playSkip();
                  if (onSkipRound) onSkipRound();
                }}
              >
                <svg className="svg-icon"><use href="#icon-circle-help" /></svg>
                No One Knows — Skip Round
              </button>
              <div className="skip-msg" id="skipMsgEl" style={{ display: 'none' }}>
                Skipping to next round...
              </div>
            </div>

            <div className="timer-block">
              <div className={`timer-circle ${isPulse ? 't-pulse' : ''}`} id="timerCircle">
                <svg viewBox="0 0 100 100">
                  <circle className="tbg" cx="50" cy="50" r="42"></circle>
                  <circle
                    className="tpg"
                    id="timerProg"
                    cx="50"
                    cy="50"
                    r="42"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    stroke={timerColor}
                  ></circle>
                </svg>
                <span className="ttx" id="timerTxt">{timeRemaining}</span>
              </div>
              <div className="timer-label" id="timerLbl">Time Remaining</div>
            </div>
          </div>

          {/* Card 2: Leaderboard */}
          <div className="panel-sec">
            <h3>
              <svg className="svg-icon"><use href="#icon-trophy" /></svg> Leaderboard
            </h3>
            <div className="leaderboard" id="leaderboard">
              {[...players].sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, idx) => {
                const avKey = (p.avatar || 'aman').toLowerCase().replace(/[^a-z0-9]/g, '');
                return (
                  <div key={p.id || idx} className="lb-item">
                    <div className="lb-av-wrap">
                      <img src={getAvatarSrc(p.avatar, 'aman')} alt={p.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/avvtar/aman.svg'; }} />
                    </div>
                    <span className="lb-name">{p.name}</span>
                    <span className="lb-score">{p.score || 0} pts</span>
                  </div>
                );
              })}
            </div>
            <div className="leaderboard-actions">
              <button
                type="button"
                className="skip-btn"
                id="skipBtn"
                onClick={() => {
                  SoundManager.playSkip();
                  if (onSkipRound) onSkipRound();
                }}
              >
                Skip
              </button>
            </div>
          </div>

          {/* Card 3: Live Chat & Guess Stream Panel */}
          <div className={`live-chat-panel ${mobileDrawerOpen ? 'mobile-open active' : ''}`} id="liveChatPanel">
            <div className="chat-header">
              <div className="chat-header-title">
                <span>💬 Live Chat &amp; Guesses</span>
              </div>
              <button
                type="button"
                className="chat-hint-btn"
                id="chatHintBtn"
                onClick={() => {
                  SoundManager.playClick();
                  if (onRequestHint) onRequestHint();
                }}
                title="Get a masked letter hint for -2 points"
              >
                💡 Hint (-2 pts)
              </button>
              <button
                type="button"
                className="chat-close-btn"
                id="mobileChatCloseBtn"
                onClick={() => setMobileDrawerOpen(false)}
              >
                ✕ Close
              </button>
            </div>

            <div
              className="chat-active-hint"
              id="chatActiveHint"
              style={{ display: maskedHint ? 'block' : 'none' }}
            >
              <div className="cah-label">💡 HINT (-2 PTS):</div>
              <div className="cah-text" id="chatActiveHintText">{maskedHint || ''}</div>
            </div>

            <div className="chat-stream" id="liveChatStream" ref={chatStreamRef}>
              <div id="chatMessages" className="chat-messages-wrap">
                <div className="chat-msg-round">🎬 Welcome to Live Guess Stream!</div>
              </div>
            </div>

            <form className="chat-input-form" id="chatInputForm" onSubmit={handleGuessSubmit}>
              <input
                type="text"
                id="chatTextInput"
                className="chat-input-box"
                placeholder="Type guess or chat..."
                autoComplete="off"
                maxLength={80}
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
              />
              <button type="submit" className="chat-send-btn" id="chatSendBtn">
                Send
              </button>
            </form>
          </div>
        </aside>
      </div>

      {/* Backdrop for mobile chat drawer */}
      <div
        id="mobileChatBackdrop"
        className={`mobile-chat-backdrop ${mobileDrawerOpen ? 'active' : ''}`}
        onClick={() => setMobileDrawerOpen(false)}
      ></div>

      {/* Mobile Sticky Bottom Guess & Chat Bar */}
      <div className="mobile-bottom-bar" id="mobileBottomBar">
        <div
          id="mobileHintBanner"
          className="mobile-hint-banner"
          style={{ display: maskedHint ? 'block' : 'none' }}
        >
          <span className="mhb-badge">💡 HINT:</span>
          <span className="mhb-text" id="mobileHintText">{maskedHint || ''}</span>
        </div>
        <div className="mobile-bottom-bar-row">
          <form className="mobile-guess-form" id="mobileQuickForm" onSubmit={handleMobileGuessSubmit}>
            <input
              type="text"
              id="mobileQuickInput"
              className="mobile-quick-input"
              placeholder="Type movie guess..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              maxLength={80}
              value={mobileGuessInput}
              onChange={(e) => setMobileGuessInput(e.target.value)}
            />
            <button type="submit" className="mobile-quick-btn" id="mobileQuickBtn" title="Submit Guess">
              <span>GUESS</span>
            </button>
          </form>
          <button
            type="button"
            className="mobile-bar-hint-btn"
            id="mobileQuickHintBtn"
            onClick={() => {
              SoundManager.playClick();
              if (onRequestHint) onRequestHint();
            }}
            title="Get Hint (-2 pts)"
          >
            <span>💡</span>
          </button>
          <button
            type="button"
            className="mobile-bar-chat-btn"
            id="mobileChatToggleBtn"
            onClick={() => setMobileDrawerOpen(prev => !prev)}
            title="Open Live Chat"
          >
            <span style={{ fontSize: '18px' }}>💬</span>
            <span id="mobileChatBadge" className="mobile-chat-badge" style={{ display: 'none' }}>0</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
