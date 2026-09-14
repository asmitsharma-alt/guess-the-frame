import React from 'react';
import SoundManager from '../services/soundManager';

export const HomeScreen = ({ isActive, onCreateRoom, onJoinRoom }) => {
  const filmstripItems = [
    'MARVEL', 'DC', 'HARRY POTTER', 'STAR WARS', 'LORD OF THE RINGS', 'THE HOBBIT',
    'FAST & FURIOUS', 'JURASSIC PARK', 'MISSION IMPOSSIBLE', 'JOHN WICK', 'JAMES BOND',
    'PIRATES OF THE CARIBBEAN', 'TRANSFORMERS', 'SPIDER-MAN', 'BATMAN', 'SUPERMAN',
    'X-MEN', 'AVENGERS', 'IRON MAN', 'NARUTO', 'ONE PIECE', 'DRAGON BALL',
    'ATTACK ON TITAN', 'DEMON SLAYER', 'DEATH NOTE', 'JUJUTSU KAISEN', 'BLEACH',
    'MY HERO ACADEMIA', 'CHAINSAW MAN', 'SPY X FAMILY'
  ];

  return (
    <div id="homeScreen" className={`screen ${isActive ? 'active' : ''}`}>
      {/* Decorative scattered shapes */}
      <div className="nb-shapes" aria-hidden="true">
        <div className="nb-shape nb-circle" style={{ top: '12%', left: '6%', background: 'var(--nb-yellow,#FACC15)' }}></div>
        <div className="nb-shape nb-square" style={{ top: '22%', right: '10%', background: 'var(--nb-blue,#3B82F6)' }}></div>
        <div className="nb-shape nb-star-shape" style={{ bottom: '28%', left: '4%', color: 'var(--nb-pink,#FF6B9D)' }}>★</div>
        <div className="nb-shape nb-circle nb-sm" style={{ top: '55%', right: '7%', background: 'var(--nb-green,#84CC16)' }}></div>
        <div className="nb-shape nb-square nb-sm" style={{ bottom: '12%', right: '18%', background: 'var(--nb-orange,#FB923C)' }}></div>
        <div className="nb-shape nb-circle nb-xs" style={{ top: '8%', left: '42%', background: 'var(--nb-pink,#FF6B9D)' }}></div>
        <div className="nb-shape nb-diamond" style={{ bottom: '38%', left: '12%', background: 'var(--nb-blue,#3B82F6)' }}></div>
        <div className="nb-shape nb-circle nb-xs" style={{ top: '45%', right: '22%', background: 'var(--nb-yellow,#FACC15)' }}></div>
        <div className="nb-shape nb-square nb-xs" style={{ bottom: '22%', left: '25%', background: 'var(--nb-green,#84CC16)' }}></div>
        <div className="nb-shape nb-star-shape nb-sm" style={{ top: '35%', right: '5%', color: 'var(--nb-orange,#FB923C)' }}>✦</div>
      </div>

      {/* Film strip marquee — neobrutalist */}
      <div className="h-filmstrip" aria-hidden="true">
        {filmstripItems.concat(filmstripItems).map((title, i) => (
          <div key={i} className="h-film-cell">{title}</div>
        ))}
      </div>

      {/* Retro OS Window Title Badge */}
      <div className="nb-retro-os-badge">
        <div className="nb-os-dots">
          <span className="nb-os-dot nb-os-dot-red"></span>
          <span className="nb-os-dot nb-os-dot-yellow"></span>
          <span className="nb-os-dot nb-os-dot-green"></span>
        </div>
        <span className="nb-os-title">GTF_SYSTEM_V3.0 // CINEMA FRAME GUESSING ENGINE</span>
        <span className="nb-os-status">● LIVE REALTIME</span>
      </div>

      {/* Hero Logo Image */}
      <div className="h-hero">
        <img
          src="/bg/guess_the_frame.webp"
          alt="Guess The Frame by Asmit"
          className="h-logo-img"
          decoding="async"
          fetchpriority="high"
          loading="eager"
        />
      </div>

      {/* Floating Sticker Badges */}
      <div className="h-stickers-row">
        <div className="nb-sticker" style={{ background: '#F9E900', '--sticker-rot': '-2deg', '--sticker-rot-hover': '-4deg' }}>
          <span>⚡</span> 100% REALTIME
        </div>
        <div className="nb-sticker" style={{ background: '#B8FF00', '--sticker-rot': '1.5deg', '--sticker-rot-hover': '3deg' }}>
          <span>🎬</span> 2,000+ FRAMES
        </div>
        <div className="nb-sticker" style={{ background: '#65F4FF', '--sticker-rot': '-1deg', '--sticker-rot-hover': '2deg' }}>
          <span>👾</span> ZERO SIGNUP
        </div>
        <div className="nb-sticker" style={{ background: '#FF2E93', color: '#fff', '--sticker-rot': '2deg', '--sticker-rot-hover': '-2deg' }}>
          <span>🍿</span> PARTY GAME
        </div>
      </div>

      {/* Action cards for Online Multiplayer */}
      <div className="h-cards-multiplayer">
        <div
          className="h-card-mp h-card-create"
          onClick={() => {
            SoundManager.playClick();
            if (typeof onCreateRoom === 'function') onCreateRoom();
          }}
        >
          <span className="h-card-tag">HOST PASS</span>
          <div className="h-card-title-lg">⚡ CREATE ROOM</div>
          <span className="h-card-sub">START PARTY LOBBY →</span>
        </div>

        <div
          className="h-card-mp h-card-join"
          onClick={() => {
            SoundManager.playClick();
            if (typeof onJoinRoom === 'function') onJoinRoom();
          }}
        >
          <span className="h-card-tag">JOIN PASS</span>
          <div className="h-card-title-lg">🎮 JOIN ROOM</div>
          <span className="h-card-sub">ENTER 4-LETTER CODE →</span>
        </div>
      </div>

      {/* Bottom caption */}
      <div className="h-footer">
        [GTF_ENGINE // ARCHIVE_01] — CAN <em>YOU</em> NAME EVERY FRAME?
      </div>

      {/* invisible secret trigger — Space x5 opens admin */}
      <div id="hSecretHint" className="h-secret-hint"></div>
    </div>
  );
};

export default HomeScreen;
