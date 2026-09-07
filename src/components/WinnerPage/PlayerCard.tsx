import React from 'react';
import { Player } from './types';

interface PlayerCardProps {
  player: Player;
  rank: 1 | 2 | 3;
  className?: string;
  delayMs?: number;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  rank,
  className = '',
  delayMs = 0,
}) => {
  const isChamp = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;

  // Neo-Brutalist Color Palettes
  const cardColorClass = isChamp
    ? 'bg-[#FFD83D]'
    : isSecond
    ? 'bg-[#3B82F6]'
    : 'bg-[#F97316]';

  const rankBadgeBg = isChamp
    ? 'bg-[#111827] text-[#FFD83D]'
    : isSecond
    ? 'bg-[#111827] text-white'
    : 'bg-[#111827] text-white';

  const scoreBadgeBg = isChamp
    ? 'bg-[#111827] text-[#FFD83D]'
    : isSecond
    ? 'bg-[#111827] text-white'
    : 'bg-[#111827] text-white';

  // Responsive zero-collision card widths and heights
  const cardDimensions = isChamp
    ? 'w-[130px] sm:w-[142px] md:w-[152px] min-h-[195px] sm:min-h-[210px] md:min-h-[225px]'
    : 'w-[112px] sm:w-[122px] md:w-[132px] min-h-[175px] sm:min-h-[190px] md:min-h-[205px]';

  return (
    <div
      className={`relative flex flex-col items-center select-none transition-transform duration-200 hover:-translate-y-1 ${className}`}
      style={{
        animation: `podiumCardEntry 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delayMs}ms both`,
      }}
    >
      {/* Radiating Corner Speed Dashes (Left for 2nd, Right for 3rd) */}
      {isSecond && (
        <div className="absolute -top-3 left-0 w-6 h-5 opacity-90 pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 30 25" fill="none" className="w-full h-full">
            <line x1="22" y1="22" x2="8" y2="6" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
            <line x1="28" y1="12" x2="16" y2="2" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      )}
      {isThird && (
        <div className="absolute -top-3 right-0 w-6 h-5 opacity-90 pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 30 25" fill="none" className="w-full h-full">
            <line x1="8" y1="22" x2="22" y2="6" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
            <line x1="2" y1="12" x2="14" y2="2" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Main Neo-Brutalist Card Body */}
      <div
        className={`${cardColorClass} ${cardDimensions} border-4 border-[#111827] rounded-[20px] shadow-[6px_6px_0px_#111827] flex flex-col items-center justify-between p-2 sm:p-2.5 relative`}
      >
        {/* Top Rank Badge Tab */}
        <div
          className={`absolute -top-4 w-8 h-8 sm:w-9 sm:h-9 rounded-full border-[3px] border-[#111827] flex items-center justify-center font-black text-xs sm:text-sm shadow-[2px_2px_0px_#111827] ${rankBadgeBg}`}
        >
          {isChamp ? (
            <svg viewBox="0 0 24 20" width="16" height="13" fill="currentColor" aria-label="Crown">
              <path d="M2 5l4.5 4L12 2l5.5 7L22 5l-2.5 11H4.5L2 5z" />
              <rect x="3.5" y="17.5" width="17" height="2.5" rx="1" />
            </svg>
          ) : (
            rank
          )}
        </div>

        {/* Circular Avatar Frame */}
        <div
          className={`mt-2 ${
            isChamp ? 'w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20' : 'w-13 h-13 sm:w-14 sm:h-14 md:w-16 md:h-16'
          } rounded-full border-[3.5px] border-[#111827] bg-white overflow-hidden shadow-[2px_2px_0px_#111827] flex items-center justify-center shrink-0`}
        >
          <img
            src={player.avatarUrl}
            alt={player.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Nameplate Box */}
        <div className="w-full bg-white border-[2.5px] border-[#111827] rounded-xl py-0.5 px-1.5 my-1 shadow-[2px_2px_0px_#111827] text-center">
          <span className="font-['Luckiest_Guy',_Anton,_sans-serif] font-black text-xs sm:text-sm text-[#111827] tracking-wide uppercase truncate block">
            {player.name}
          </span>
        </div>

        {/* Points Tag */}
        <div
          className={`w-full ${scoreBadgeBg} border-2 border-[#111827] rounded-full py-0.5 px-1 text-center shadow-[1.5px_1.5px_0px_#111827]`}
        >
          <span className="font-mono font-black text-[10px] sm:text-[11px] tracking-wider uppercase block">
            {player.score} {player.score === 1 ? 'POINT' : 'POINTS'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
