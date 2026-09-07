import React from 'react';
import { WinnerPageProps, Player } from './types';
import VictoryBanner from './VictoryBanner';
import Podium from './Podium';
import Scoreboard from './Scoreboard';
import MessageCard from './MessageCard';
import CreditsBar from './CreditsBar';
import ActionButtons from './ActionButtons';

// Default mock players if none provided
const DEFAULT_PLAYERS: Player[] = [
  { id: '1', name: 'AMAN', score: 30, rank: 1, avatarUrl: '/avvtar/aman.svg' },
  { id: '2', name: 'AZIZ', score: 22, rank: 2, avatarUrl: '/avvtar/aziz.svg' },
  { id: '3', name: 'AMISH', score: 16, rank: 3, avatarUrl: '/avvtar/amish.svg' },
  { id: '4', name: 'VISH', score: 7, rank: 4, avatarUrl: '/avvtar/vish.svg' },
];

export const WinnerPage: React.FC<WinnerPageProps> = ({
  players = DEFAULT_PLAYERS,
  message,
  credits,
  actions,
  title = 'VICTORY!',
  className = '',
}) => {
  return (
    <main
      className={`min-h-screen w-full flex items-center justify-center p-3 sm:p-5 md:p-6 font-sans relative overflow-x-hidden ${className}`}
      style={{
        background: '#F4EEDC url("/bg/cinema_bg.webp") no-repeat center center fixed',
        backgroundSize: 'cover',
      }}
    >
      {/* Background Soft Backdrop Blur Overlay */}
      <div
        className="fixed inset-0 bg-[#F4EEDC]/80 backdrop-blur-[3px] pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* ── MAIN NEO-BRUTALIST VICTORY PANEL ── */}
      <div className="relative z-10 w-[95vw] max-w-[1200px] bg-[#FFF8EF] border-4 border-[#111827] rounded-[24px] shadow-[8px_8px_0px_#111827] p-4 sm:p-6 md:p-8 flex flex-col justify-between gap-4 md:gap-6 overflow-hidden">
        
        {/* ── DECORATIVE CORNER TRIANGLES ── */}
        {/* Top-Left Blue Triangle */}
        <div
          className="absolute top-6 left-0 w-0 h-0 border-t-[40px] border-t-transparent border-b-[40px] border-b-transparent border-l-[55px] border-l-[#3B82F6] pointer-events-none z-1"
          aria-hidden="true"
        />
        {/* Bottom-Left Pink Triangle */}
        <div
          className="absolute bottom-0 left-0 w-0 h-0 border-b-[85px] sm:border-b-[105px] border-b-[#F472B6] border-r-[95px] sm:border-r-[115px] border-r-transparent pointer-events-none z-1"
          aria-hidden="true"
        />
        {/* Bottom-Right Yellow Triangle */}
        <div
          className="absolute bottom-0 right-0 w-0 h-0 border-b-[95px] sm:border-b-[115px] border-b-[#FACC15] border-l-[105px] sm:border-l-[125px] border-l-transparent pointer-events-none z-1"
          aria-hidden="true"
        />

        {/* ── 1. HEADER BANNER ── */}
        <header className="w-full flex justify-center pt-1 pb-1">
          <VictoryBanner title={title} />
        </header>

        {/* ── 2. MAIN CONTENT AREA (3 COLUMNS ON DESKTOP, ORDERED ON MOBILE) ── */}
        <section
          aria-label="Match Results"
          className="w-full grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] items-center gap-4 sm:gap-5 md:gap-6 relative z-10"
        >
          {/* LEFT: Feedback Message Card (Desktop: Col 1, Mobile: Order 3) */}
          <div className="order-3 lg:order-1 flex justify-center w-full">
            <MessageCard message={message} />
          </div>

          {/* CENTER: Winner Podium + Credits Bar (Desktop: Col 2, Mobile: Order 1) */}
          <div className="order-1 lg:order-2 flex flex-col items-center justify-center gap-3 w-full">
            <Podium players={players} />
            
            {/* Credits Section directly below podium */}
            <div className="w-full flex justify-center pt-1">
              <CreditsBar credits={credits} />
            </div>
          </div>

          {/* RIGHT: Scoreboard Panel (Desktop: Col 3, Mobile: Order 2) */}
          <div className="order-2 lg:order-3 flex justify-center w-full">
            <Scoreboard players={players} />
          </div>
        </section>

        {/* ── 3. BOTTOM ACTION BUTTONS ── */}
        <footer className="w-full pt-2 sm:pt-4 relative z-10">
          <ActionButtons actions={actions} />
        </footer>
      </div>
    </main>
  );
};

export default WinnerPage;
