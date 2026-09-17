import React from 'react';
import { Zap, Gamepad2 } from 'lucide-react';
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

      {/* Action cards for Online Multiplayer & Local */}
      <div className="h-cards-multiplayer">
        <div
          id="homeCreateBtn"
          className="h-card-mp h-card-create"
          role="button"
          tabIndex={0}
          aria-label="Create Online Room"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              SoundManager.playClick();
              if (typeof onCreateRoom === 'function') onCreateRoom();
            }
          }}
          onClick={() => {
            SoundManager.playClick();
            if (typeof onCreateRoom === 'function') onCreateRoom();
          }}
        >
          <div className="h-card-title-lg"><Zap size={20} strokeWidth={3} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> CREATE ROOM</div>
        </div>

        <div
          id="homeJoinBtn"
          className="h-card-mp h-card-join"
          role="button"
          tabIndex={0}
          aria-label="Join Online Room"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              SoundManager.playClick();
              if (typeof onJoinRoom === 'function') onJoinRoom();
            }
          }}
          onClick={() => {
            SoundManager.playClick();
            if (typeof onJoinRoom === 'function') onJoinRoom();
          }}
        >
          <div className="h-card-title-lg"><Gamepad2 size={20} strokeWidth={3} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> JOIN ROOM</div>
        </div>


      </div>

      {/* Bottom caption */}
      <div className="h-footer">How many can <em>you</em> name?</div>

      {/* invisible secret trigger — Space x5 opens admin */}
      <div id="hSecretHint" className="h-secret-hint"></div>
    </div>
  );
};

export default HomeScreen;
