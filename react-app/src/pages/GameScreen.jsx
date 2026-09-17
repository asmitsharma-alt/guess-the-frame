import React, { useState, useEffect, useRef } from 'react';
import { Crown, Gamepad2, SkipForward, Play, Pause, Flag, Lightbulb, MessageCircle, Clapperboard, X, Hourglass } from 'lucide-react';
import SoundManager from '../services/soundManager';
import PaletteManager from '../services/paletteManager';
import { FuzzyMatcher } from '../services/fuzzyMatcher';
import { SecurityUtil } from '../services/securityUtil';
import { AVATAR_MAP, getAvatarSrc, getAvatarColor } from '../services/gameConstants';
import { AssetPreloader } from '../services/assetPreloader';

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
  roundWinners = [],
  onSkipRound,
  onNextRound,
  onTogglePause,
  onEndMatch,
  onRequestHint,
  onSubmitGuess,
  onSendChatMessage,
  onAdjustScore,
  onSendReaction
}) => {
  const [guessInput, setGuessInput] = useState('');
  const [mobileGuessInput, setMobileGuessInput] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showScoringOverlay, setShowScoringOverlay] = useState(false);
  const [lastSubmittedGuess, setLastSubmittedGuess] = useState(null);
  const guessFeedbackTimerRef = useRef(null);
  const chatStreamRef = useRef(null);
  const imgRef = useRef(null);

  const handleSendReaction = (messageId, reaction) => {
    SoundManager.playClick();
    if (onSendReaction) {
      onSendReaction(messageId, reaction);
    } else if (typeof window !== 'undefined' && window.__sendMultiplayerReaction) {
      window.__sendMultiplayerReaction(messageId, reaction);
    } else if (typeof window !== 'undefined' && window.MultiplayerEngine?.sendReaction) {
      window.MultiplayerEngine.sendReaction(messageId, reaction);
    }
  };

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

  // Preload and GPU-decode upcoming frame images and reveals in background to eliminate transition latency
  useEffect(() => {
    if (currentPlaylist && currentPlaylist.length > 0) {
      for (let i = currentPlayIndex; i <= Math.min(currentPlaylist.length - 1, currentPlayIndex + 3); i++) {
        const item = currentPlaylist[i];
        if (item && item.type === 'image') {
          if (item.content) {
            const u = item.content.startsWith('/') ? item.content : `/${item.content}`;
            AssetPreloader.preloadImage(u);
          }
          if (item.revealContent) {
            const u = item.revealContent.startsWith('/') ? item.revealContent : `/${item.revealContent}`;
            AssetPreloader.preloadImage(u);
          }
        }
      }
    }
  }, [currentPlaylist, currentPlayIndex]);

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [latestIncomingChat, setLatestIncomingChat] = useState(null);
  const prevChatCountRef = useRef(chatMessages?.length || 0);
  const incomingChatTimerRef = useRef(null);

  // Auto-scroll chat stream and track unread chat for mobile
  useEffect(() => {
    if (chatStreamRef.current) {
      const el = chatStreamRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 100;
      if (isNearBottom || prevChatCountRef.current === 0) {
        el.scrollTop = el.scrollHeight;
      }
    }
    const currentLen = chatMessages?.length || 0;
    if (currentLen > prevChatCountRef.current) {
      const newMsg = chatMessages[currentLen - 1];
      const effPid = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerId) || playerId;
      if (newMsg && newMsg.senderId !== effPid) {
        // Show mobile toast notification only for important messages (not repetitive guess attempts)
        if (!mobileDrawerOpen && newMsg.type !== 'guess_attempt' && newMsg.type !== 'spoiler_hidden') {
          setUnreadChatCount(prev => prev + 1);
          setLatestIncomingChat(newMsg);
          if (incomingChatTimerRef.current) clearTimeout(incomingChatTimerRef.current);
          incomingChatTimerRef.current = setTimeout(() => {
            setLatestIncomingChat(null);
          }, 4500);
        }
      }
    }
    prevChatCountRef.current = currentLen;
  }, [chatMessages, mobileDrawerOpen, playerId]);

  const handleToggleMobileDrawer = () => {
    setMobileDrawerOpen(prev => {
      const next = !prev;
      if (next) {
        setUnreadChatCount(0);
        setLatestIncomingChat(null);
      }
      return next;
    });
  };

  const [rejectionAlert, setRejectionAlert] = useState(null);
  const rejectionTimerRef = useRef(null);

  useEffect(() => {
    const handleCommandRejected = (e) => {
      const detail = e.detail;
      if (!detail) return;
      let msg = '';
      if (detail.reason === 'ALREADY_SUBMITTED_THIS_ROUND' || detail.code === 'ALREADY_SUBMITTED_THIS_ROUND') {
        msg = '⚠️ Only 1 answer attempt allowed per round!';
      } else if (detail.reason === 'ALREADY_CORRECT_THIS_ROUND' || detail.code === 'ALREADY_CORRECT_THIS_ROUND') {
        msg = '🎉 You already answered correctly this round!';
      } else if (detail.reason === 'HINT_ALREADY_USED' || detail.code === 'HINT_ALREADY_USED') {
        msg = '💡 You have already used your hint for this round!';
      } else if (detail.reason === 'ROUND_ALREADY_FINISHED' || detail.code === 'ROUND_ALREADY_FINISHED') {
        msg = '⌛ This round has already finished!';
      } else if (detail.reason === 'NOT_HOST' || detail.code === 'NOT_HOST' || detail.reason === 'UNAUTHORIZED_NON_HOST') {
        msg = '👑 Only the host can execute this command!';
      } else if (detail.reason === 'ROUND_PAUSED' || detail.code === 'ROUND_PAUSED') {
        msg = '⏸ Match is currently paused!';
      } else {
        msg = `Action rejected: ${detail.reason || detail.code || 'Command rejected'}`;
      }
      setRejectionAlert(msg);
      if (rejectionTimerRef.current) clearTimeout(rejectionTimerRef.current);
      rejectionTimerRef.current = setTimeout(() => {
        setRejectionAlert(null);
      }, 4000);
    };

    window.addEventListener('command_rejected', handleCommandRejected);
    return () => {
      window.removeEventListener('command_rejected', handleCommandRejected);
      if (rejectionTimerRef.current) clearTimeout(rejectionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setRejectionAlert(null);
    setLastSubmittedGuess(null);
  }, [currentPlayIndex]);

  const effectivePlayerId = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerId) || playerId;
  const myPlayer = players.find(p => p.id === effectivePlayerId || p.id === playerId);
  const effectiveIsHost = Boolean(
    myPlayer !== undefined
      ? myPlayer.isHost === true
      : (isHost && (typeof window === 'undefined' || !window.MultiplayerEngine || window.MultiplayerEngine.isHost === true))
  );

  const winnersList = Array.isArray(roundWinners)
    ? roundWinners
    : (typeof window !== 'undefined' && (window.MultiplayerEngine?.gameState?.round?.winners || window.MultiplayerEngine?.currentRoundWinners || window.GS?.roundWinners)) || [];
  const hasWonThisRound = Boolean(winnersList.some(w => w && (w.playerId === effectivePlayerId || w.id === effectivePlayerId)));

  // Unlimited guessing and chatting: input is only disabled if round finished or match paused
  const isInputDisabled = isRoundFinished || isPaused;

  let inputPlaceholder = "Type guess or chat...";
  let mobileInputPlaceholder = "Type movie guess...";
  if (hasWonThisRound) {
    inputPlaceholder = "🎉 You guessed correctly! Chat with players...";
    mobileInputPlaceholder = "🎉 Chat with players...";
  } else if (isRoundFinished) {
    inputPlaceholder = "⌛ Round finished - revealing answer...";
    mobileInputPlaceholder = "⌛ Round finished";
  } else if (isPaused) {
    inputPlaceholder = "⏸ Match paused...";
    mobileInputPlaceholder = "⏸ Match paused";
  }

  const submitGuess = (val) => {
    const clean = val.trim();
    if (!clean || isInputDisabled) return;
    if (!hasWonThisRound) {
      SoundManager.playGuessSubmit();
    }
    setGuessInput('');
    setMobileGuessInput('');
    setLastSubmittedGuess({ text: clean, timestamp: Date.now() });
    if (guessFeedbackTimerRef.current) clearTimeout(guessFeedbackTimerRef.current);
    guessFeedbackTimerRef.current = setTimeout(() => {
      setLastSubmittedGuess(null);
    }, 3500);

    const senderPid = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerId) || playerId;
    const senderPname = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerName) || playerName;
    const senderPav = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerAvatar) || playerAvatar;
    const curIdx = (typeof window !== 'undefined' && window.MultiplayerEngine?.currentPlayIndex !== undefined)
      ? window.MultiplayerEngine.currentPlayIndex
      : (currentPlayIndex ?? 0);

    if (onSubmitGuess) {
      onSubmitGuess(clean);
    } else if (typeof window !== 'undefined' && window.MultiplayerEngine?.sendEvent) {
      window.MultiplayerEngine.sendEvent('SUBMIT_GUESS', {
        playerId: senderPid,
        senderId: senderPid,
        playerName: senderPname,
        playerAvatar: senderPav,
        guess: clean,
        roundIndex: curIdx
      });
    }
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

              {/* Mobile-Only Live Countdown Timer Badge */}
              <div
                className={`mobile-timer-pill ${timeRemaining <= 5 ? 'pulse-urgent' : ''}`}
                title="Time Remaining"
              >
                <span className="mtp-icon"><Hourglass size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /></span>
                <span className="mtp-val" id="mobileTimerVal">{timeRemaining}s</span>
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
                {frame && frame.type === 'image' && (() => {
                  const rawSrc = (isRoundFinished || isAnswerRevealed) && frame.revealContent ? frame.revealContent : frame.content;
                  const safeSrc = rawSrc ? (rawSrc.startsWith('/') ? rawSrc : `/${rawSrc}`) : '';
                  return (
                    <img
                      ref={imgRef}
                      key={safeSrc}
                      className={`frame-image loaded ${isRoundFinished || isAnswerRevealed ? 'revealed' : 'blurred'}`}
                      src={safeSrc}
                      alt={frame?.sectionName || "Movie Frame"}
                      loading="eager"
                      decoding="async"
                      style={{
                        transition: 'filter 0.25s ease, opacity 0.2s ease',
                        willChange: 'filter, opacity'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  );
                })()}
              </div>

              {/* Answer Overlay */}
              <div className={`answer-overlay ${isRoundFinished || isAnswerRevealed ? 'visible active' : ''}`} id="answerOverlay">
                <div className="ans-card">
                  <div className="ans-badge">
                    {frame?.type === 'dialogue' ? 'Movie Quote' : (frame?.category === 'eyes' || frame?.sectionName === 'Guess the Eyes' ? 'Celebrity' : 'Answer')}
                  </div>
                  <div className="ans-title" id="ansCorrectTitle">
                    {frame?.answer || (frame?.type === 'dialogue' ? frame?.movie : 'Answer')}
                  </div>
                  <div className="ans-subtitle" id="ansSubtitle">
                    {frame?.year ? `${frame.year} ${frame?.category ? `• ${frame.category.toUpperCase()}` : ''}` : ''}
                  </div>

                  <div className="ans-action-zone">
                    {/* Host Next Round Button */}
                    <div className="ans-host-actions" id="ansHostActions">
                      <button
                        className="ans-btn-primary"
                        id="ansNextRoundBtn"
                        style={{ display: effectiveIsHost ? 'block' : 'none' }}
                        onClick={() => {
                          SoundManager.playClick();
                          if (onNextRound) onNextRound();
                        }}
                      >
                        NEXT ROUND <SkipForward size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} />
                      </button>
                    </div>
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
                  const avColor = p.color || getAvatarColor(p.avatar);
                  return (
                    <button
                      key={p.id || i}
                      type="button"
                      className="spbtn"
                      style={{ backgroundColor: avColor, '--avatar-bg': avColor }}
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
                <SkipForward size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Skipped — No One Knew
              </div>
              <div className="waiting-host-ind" id="waitingHostInd" style={{ display: 'none' }}>
                <Hourglass size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Waiting for host to award points...
              </div>
            </div>
          </div>

          {/* Host Controls */}
          {effectiveIsHost && (
            <div className="host-floating-bar" id="hostFloatingBar" style={{ display: 'flex' }}>
              <span className="hfb-label" id="hfbLabel"><Crown size={16} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> HOST CONTROLS:</span>
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
                  <SkipForward size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Skip Frame
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
                  <Play size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Next Round
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
                  {isPaused ? <><Play size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Resume</> : <><Pause size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Pause</>}
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
                  <Flag size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> End Match
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
                <Lightbulb size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Hint (-2 pts)
              </button>

              {/* Active Hint Display */}
              <div
                className="hfb-active-hint-pill"
                id="hfbActiveHintPill"
                style={{ display: maskedHint ? 'inline-flex' : 'none' }}
              >
                <span className="hahp-badge"><Lightbulb size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> HINT:</span>
                <span className="hahp-text" id="hfbActiveHintText">{maskedHint || ''}</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: SIDEBAR CONTROLS, LEADERBOARD & LIVE CHAT COLUMN */}
        <aside className={`game-sidebar-col ${mobileDrawerOpen ? 'drawer-open' : ''}`}>
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
                const avColor = p.color || getAvatarColor(p.avatar);
                return (
                  <div key={p.id || idx} className="lb-item">
                    <div className="lb-av-wrap" style={{ backgroundColor: avColor, '--avatar-bg': avColor }}>
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
                <span><MessageCircle size={16} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Live Chat &amp; Guesses</span>
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
                <Lightbulb size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Hint (-2 pts)
              </button>
              <button
                type="button"
                className="chat-close-btn"
                id="mobileChatCloseBtn"
                onClick={() => setMobileDrawerOpen(false)}
              >
                <X size={14} strokeWidth={3} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Close
              </button>
            </div>

            <div
              className="chat-active-hint"
              id="chatActiveHint"
              style={{ display: maskedHint ? 'block' : 'none' }}
            >
              <div className="cah-label"><Lightbulb size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> HINT (-2 PTS):</div>
              <div className="cah-text" id="chatActiveHintText">{maskedHint || ''}</div>
            </div>

            <div className="chat-stream" id="liveChatStream" ref={chatStreamRef}>
              <div id="chatMessages" className="chat-messages-wrap">
                {chatMessages && chatMessages.map((m, idx) => {
                  if (m.type === 'winner') {
                    const isSelf = Boolean(effectivePlayerId && (m.senderId === effectivePlayerId || m.senderId === playerId));
                    const likesCount = m.reactions?.likes?.length || 0;
                    const dislikesCount = m.reactions?.dislikes?.length || 0;
                    const hasLiked = Boolean(effectivePlayerId && m.reactions?.likes?.includes(effectivePlayerId));
                    const hasDisliked = Boolean(effectivePlayerId && m.reactions?.dislikes?.includes(effectivePlayerId));
                    const posLabel = m.position === 1 ? '1ST' : m.position === 2 ? '2ND' : m.position === 3 ? '3RD' : '';
                    const pointsWon = m.points || (m.position === 1 ? 10 : m.position === 2 ? 7 : 5);

                    return (
                      <div key={m.id || idx} className={`chat-msg chat-msg-winner-banner pos-${m.position || 1}`} data-message-id={m.id}>
                        <div className="chat-avatar">
                          <img src={getAvatarSrc(m.senderAvatar, 'aman')} alt={m.senderName || 'Player'} />
                        </div>
                        <div className="chat-winner-content">
                          <div className="chat-winner-header">
                            <span className="chat-winner-title">
                              {m.senderName} GUESSED +{pointsWon} PTS
                            </span>
                            {posLabel && <span className="chat-winner-badge">#{posLabel}</span>}
                          </div>
                          <div className="chat-reaction-btns">
                            <button
                              type="button"
                              className={`chat-react-btn like-btn ${hasLiked ? 'active' : ''}`}
                              disabled={isSelf}
                              onClick={() => handleSendReaction(m.id, 'like')}
                              title={isSelf ? 'Cannot react to your own answer' : 'Like'}
                            >
                              👍 <span className="chat-react-count">{likesCount}</span>
                            </button>
                            <button
                              type="button"
                              className={`chat-react-btn dislike-btn ${hasDisliked ? 'active' : ''}`}
                              disabled={isSelf}
                              onClick={() => handleSendReaction(m.id, 'dislike')}
                              title={isSelf ? 'Cannot react to your own answer' : 'Dislike'}
                            >
                              👎 <span className="chat-react-count">{dislikesCount}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (m.type === 'guess_attempt') {
                    const guessVal = m.guessText || (m.text && m.text.includes('"') ? m.text.slice(m.text.indexOf('"') + 1, m.text.lastIndexOf('"')) : (m.text && !m.text.endsWith(' guessed') ? m.text : null));
                    return (
                      <div key={m.id || idx} className="chat-msg chat-msg-guess-attempt" data-message-id={m.id}>
                        <div className="chat-avatar small">
                          <img src={getAvatarSrc(m.senderAvatar, 'aman')} alt={m.senderName || 'Player'} />
                        </div>
                        <div className="chat-guess-content">
                          <div className="chat-guess-header">
                            <span className="chat-guess-sender">
                              <strong>{m.senderName}</strong>
                            </span>
                            <span className="chat-wrong-badge">❌ WRONG GUESS</span>
                          </div>
                          {guessVal && (
                            <div className="chat-guess-val">
                              "{guessVal}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (m.type === 'spoiler_hidden') {
                    return (
                      <div key={m.id || idx} className="chat-msg chat-msg-spoiler-hidden" data-message-id={m.id}>
                        <div className="chat-avatar small">
                          <img src={getAvatarSrc(m.senderAvatar, 'aman')} alt={m.senderName || 'Player'} />
                        </div>
                        <div className="chat-msg-body">
                          <span className="chat-spoiler-pill">🤫 spoiler hidden</span>
                        </div>
                      </div>
                    );
                  }

                  if (m.type === 'reaction_notification') {
                    // Strictly private to target recipient
                    if (m.targetPlayerId && m.targetPlayerId !== effectivePlayerId) {
                      return null;
                    }
                    return (
                      <div key={m.id || idx} className="chat-msg chat-msg-personal-reaction" data-message-id={m.id}>
                        <div className="chat-msg-body">
                          <span className="personal-reaction-pill">{m.text}</span>
                        </div>
                      </div>
                    );
                  }

                  // Default player chat or system message
                  return (
                    <div key={m.id || idx} className={`chat-msg ${m.type === 'system' ? 'chat-msg-system' : ''}`} data-message-id={m.id}>
                      <div className="chat-avatar">
                        <img src={getAvatarSrc(m.senderAvatar, 'aman')} alt={m.senderName || 'Player'} />
                      </div>
                      <div className="chat-msg-body">
                        <div className="chat-msg-header">
                          <span style={{ color: '#1a1a1a', fontWeight: 700 }}>{m.senderName || 'Player'}</span>
                        </div>
                        <div className="chat-msg-text">{m.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {rejectionAlert && (
              <div className="command-rejection-banner" style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000',
                textAlign: 'center',
                margin: '6px 10px 2px 10px'
              }}>
                {rejectionAlert}
              </div>
            )}

            <form className="chat-input-form" id="chatInputForm" onSubmit={handleGuessSubmit}>
              <input
                type="text"
                id="chatTextInput"
                className="chat-input-box"
                placeholder={inputPlaceholder}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={80}
                value={guessInput}
                disabled={isInputDisabled}
                onChange={(e) => setGuessInput(e.target.value)}
              />
              <button
                type="submit"
                className="chat-send-btn"
                id="chatSendBtn"
                disabled={isInputDisabled}
              >
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
      <div
        className={`mobile-bottom-bar ${mobileDrawerOpen ? 'drawer-open' : ''}`}
        id="mobileBottomBar"
        style={mobileDrawerOpen ? { pointerEvents: 'none' } : undefined}
      >
        {/* Floating Live Typing Preview Banner (Ensures 100% visibility of what is being typed) */}
        {mobileGuessInput && mobileGuessInput.trim().length > 0 && (
          <div className="mobile-typing-preview-bubble" id="mobileTypingPreview">
            <div className="mtp-inner">
              <span className="mtp-label">Typing:</span>
              <span className="mtp-text">{mobileGuessInput}</span>
              <button
                type="button"
                className="mtp-clear-btn"
                onClick={() => setMobileGuessInput('')}
                title="Clear text"
              >
                <X size={14} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        {/* Floating Guess Submission Feedback Chip (Shows submitted answer even with drawer closed) */}
        {!mobileGuessInput && lastSubmittedGuess && (
          <div className="mobile-submitted-guess-bubble" id="mobileSubmittedFeedback">
            <div className="msgb-inner">
              <span className="msgb-badge">GUESS SENT:</span>
              <span className="msgb-text">"{lastSubmittedGuess.text}"</span>
            </div>
          </div>
        )}

        {/* Floating Live Incoming Chat Pop-In Banner for Mobile */}
        {!mobileDrawerOpen && latestIncomingChat && (
          <div
            className="mobile-incoming-chat-toast"
            id="mobileIncomingChatToast"
            onClick={handleToggleMobileDrawer}
          >
            <div className="mict-inner">
              <span className="mict-badge">CHAT</span>
              <span className="mict-sender">{latestIncomingChat.senderName}:</span>
              <span className="mict-text">"{latestIncomingChat.text}"</span>
              <span className="mict-action">VIEW &gt;</span>
            </div>
          </div>
        )}

        <div
          id="mobileHintBanner"
          className="mobile-hint-banner"
          style={{ display: maskedHint ? 'block' : 'none' }}
        >
          <span className="mhb-badge"><Lightbulb size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> HINT:</span>
          <span className="mhb-text" id="mobileHintText">{maskedHint || ''}</span>
        </div>
        {rejectionAlert && (
          <div className="command-rejection-banner" style={{
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '11px',
            padding: '5px 8px',
            borderRadius: '6px',
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            textAlign: 'center',
            margin: '4px 8px'
          }}>
            {rejectionAlert}
          </div>
        )}
        <div className="mobile-bottom-bar-row">
          <form className="mobile-guess-form" id="mobileQuickForm" onSubmit={handleMobileGuessSubmit}>
            <input
              type="text"
              id="mobileQuickInput"
              className="mobile-quick-input"
              placeholder={mobileInputPlaceholder}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={80}
              value={mobileGuessInput}
              disabled={isInputDisabled}
              onChange={(e) => setMobileGuessInput(e.target.value)}
            />
            <button
              type="submit"
              className="mobile-quick-btn"
              id="mobileQuickBtn"
              title={hasWonThisRound ? "Send Chat" : "Submit Guess"}
              disabled={isInputDisabled}
            >
              <span>{hasWonThisRound ? 'CHAT' : 'GUESS'}</span>
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
            <span><Lightbulb size={18} strokeWidth={2.5} /></span>
          </button>
          <button
            type="button"
            className="mobile-bar-chat-btn"
            id="mobileChatToggleBtn"
            onClick={handleToggleMobileDrawer}
            title="Open Live Chat"
          >
            <span style={{ fontSize: '18px' }}><MessageCircle size={18} strokeWidth={2.5} /></span>
            <span
              id="mobileChatBadge"
              className="mobile-chat-badge"
              style={{ display: unreadChatCount > 0 ? 'flex' : 'none' }}
            >
              {unreadChatCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
