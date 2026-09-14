import React from 'react';
import SoundManager from '../../services/soundManager';
import { Crown, Gamepad2, SkipForward, Play, Pause, Flag, Lightbulb } from 'lucide-react';

export const HostFloatingBar = ({
  isVisible,
  isHost,
  isPaused,
  onSkip,
  onNext,
  onPause,
  onEndMatch,
  onRequestHint,
  hintText
}) => {
  if (!isVisible) return null;

  return (
    <div className="host-floating-bar" id="hostFloatingBar" style={{ display: 'flex' }}>
      <span className="hfb-label" id="hfbLabel">
        {isHost ? <><Crown size={16} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> HOST CONTROLS:</> : <><Gamepad2 size={16} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> PLAYER CONTROLS:</>}
      </span>

      {isHost && (
        <div className="hfb-host-only" id="hfbHostOnly" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" className="hfb-btn" id="hfbSkipBtn" onClick={onSkip}>
            <SkipForward size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Skip Frame
          </button>
          <button
            type="button"
            className="hfb-btn"
            id="hfbNextBtn"
            onClick={onNext}
            style={{ display: 'none', background: '#10B981 !important', color: '#fff !important' }}
          >
            <Play size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Next Round
          </button>
          <button type="button" className="hfb-btn" id="hfbPauseBtn" onClick={onPause}>
            {isPaused ? <><Play size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Resume</> : <><Pause size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Pause</>}
          </button>
          <button type="button" className="hfb-btn" id="hfbEndBtn" onClick={onEndMatch}>
            <Flag size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> End Match
          </button>
        </div>
      )}

      <button
        type="button"
        className="hfb-btn"
        id="hfbHintBtn"
        onClick={onRequestHint}
        style={{ background: '#FDE047', color: '#1a1a1a' }}
      >
        <Lightbulb size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Hint (-2 pts)
      </button>

      {hintText && (
        <div className="hfb-active-hint-pill" id="hfbActiveHintPill" style={{ display: 'inline-flex' }}>
          <span className="hahp-badge"><Lightbulb size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> HINT:</span>
          <span className="hahp-text" id="hfbActiveHintText">{hintText}</span>
        </div>
      )}
    </div>
  );
};

export default HostFloatingBar;
