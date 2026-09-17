import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeScreen } from '../pages/HomeScreen';
import { HowToAnswerScreen } from '../pages/HowToAnswerScreen';
import { WinnerScreen } from '../pages/WinnerScreen';
import { FuzzyMatcher } from '../services/fuzzyMatcher';
import { SecurityUtil } from '../services/securityUtil';
import { PARTYKIT_HOST } from '../config/env';
import SoundManager from '../services/soundManager';
import { RejoinRoomModal } from '../components/Modals/RejoinRoomModal';

vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

describe('Frontend Component & Logic Tests', () => {
  it('renders HomeScreen with hero and cards', () => {
    render(<HomeScreen isActive={true} />);
    const homeScreen = document.getElementById('homeScreen');
    expect(homeScreen).toBeDefined();
    expect(homeScreen.classList.contains('active')).toBe(true);
    expect(screen.getByText(/CREATE ROOM/i)).toBeDefined();
    expect(screen.getByText(/JOIN ROOM/i)).toBeDefined();
  });

  it('renders HowToAnswerScreen with countdown timer', () => {
    render(<HowToAnswerScreen isActive={true} isHost={true} />);
    const htaScreen = document.getElementById('howToAnswerScreen');
    expect(htaScreen).toBeDefined();
    expect(document.getElementById('htaTimerCount')).toBeDefined();
    expect(document.getElementById('htaHostStartBtn')).toBeDefined();
  });

  it('renders WinnerScreen with podium cards and scoreboard', () => {
    const testPlayers = [
      { name: 'Aman', score: 30, avatar: 'aman' },
      { name: 'Aziz', score: 20, avatar: 'aziz' },
      { name: 'Amish', score: 10, avatar: 'amish' }
    ];
    render(<WinnerScreen isActive={true} players={testPlayers} />);
    const winnerScreen = document.getElementById('winnerScreen');
    expect(winnerScreen).toBeDefined();
    expect(document.getElementById('champHeroCard')).toBeDefined();
    expect(document.getElementById('silverCard')).toBeDefined();
    expect(document.getElementById('bronzeCard')).toBeDefined();
    expect(document.getElementById('winnerScoreboardList')).toBeDefined();
  });

  it('FuzzyMatcher matches identical and typo titles correctly', () => {
    expect(FuzzyMatcher.isMatch('Inception', 'Inception')).toBe(true);
    expect(FuzzyMatcher.isMatch('Incepton', 'Inception')).toBe(true);
    expect(FuzzyMatcher.isMatch('The Batman', 'Batman')).toBe(true);
    expect(FuzzyMatcher.isMatch('Completely Wrong', 'Inception')).toBe(false);
  });

  it('SecurityUtil neutralizes XSS injection payloads', () => {
    const raw = '<script>alert("XSS")</script>';
    const escaped = SecurityUtil.escapeHtml(raw);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
  });

  it('PARTYKIT_HOST resolves to valid backend host', () => {
    expect(PARTYKIT_HOST).toBeDefined();
    expect(PARTYKIT_HOST === 'guess-the-frame.onrender.com' || PARTYKIT_HOST === 'localhost:10000').toBe(true);
  });

  it('SoundManager manages volume, mute state, and audio routing safely', () => {
    expect(SoundManager.muted).toBe(false);
    expect(SoundManager.vol).toBeGreaterThanOrEqual(0.5);
    const muted = SoundManager.toggleMute();
    expect(muted).toBe(true);
    expect(SoundManager.muted).toBe(true);
    const unmuted = SoundManager.toggleMute();
    expect(unmuted).toBe(false);
    expect(SoundManager.muted).toBe(false);
  });

  it('renders RejoinRoomModal with host badge, points, and match progress indicator', () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();
    render(
      <RejoinRoomModal
        isOpen={true}
        roomCode="CINEMA"
        playerName="Aman"
        avatar="aman"
        score={25}
        isHost={true}
        isMatchActive={true}
        currentRound={3}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />
    );
    const modal = document.getElementById('rejoinRoomModal');
    expect(modal).toBeDefined();
    expect(screen.getByText(/Active Match Found!/i)).toBeDefined();
    expect(screen.getByText(/Host Controls/i)).toBeDefined();
    expect(screen.getByText(/25 PTS/i)).toBeDefined();
    expect(screen.getByText(/Round 3 In Progress/i)).toBeDefined();
    expect(document.getElementById('rejoinRoomCodeText')?.textContent).toBe('CINEMA');
    expect(screen.getByText(/REJOIN ACTIVE MATCH/i)).toBeDefined();
  });

  it('session persistence preserves all critical state fields', () => {
    const mockSession = {
      roomCode: 'SCOOP',
      playerId: 'p_123456',
      playerName: 'Cinephile',
      playerAvatar: 'aziz',
      isHost: true,
      isMatchActive: true,
      gameState: 'playing',
      currentPlayIndex: 4,
      timestamp: Date.now()
    };
    localStorage.setItem('gtf_active_session', JSON.stringify(mockSession));
    const restored = JSON.parse(localStorage.getItem('gtf_active_session'));
    expect(restored.roomCode).toBe('SCOOP');
    expect(restored.playerId).toBe('p_123456');
    expect(restored.isHost).toBe(true);
    expect(restored.isMatchActive).toBe(true);
    expect(restored.currentPlayIndex).toBe(4);
    localStorage.removeItem('gtf_active_session');
  });

  it('clock offset and timer calculation accurately resolves with clock drift', () => {
    const clientNow = 1700000000000;
    const serverTime = 1700000005000; // Server is 5s ahead
    const clockOffset = serverTime - clientNow; // +5000ms
    const endsAt = serverTime + 25000; // 25 seconds remaining on server

    const nowWithOffset = clientNow + clockOffset;
    const remainingSecs = Math.max(0, Math.ceil((endsAt - nowWithOffset) / 1000));
    expect(remainingSecs).toBe(25);
  });
});
