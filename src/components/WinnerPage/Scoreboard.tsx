import React from 'react';
import { Player } from './types';

interface ScoreboardProps {
  players: Player[];
  className?: string;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  players,
  className = '',
}) => {
  // Sort players by rank / score
  const sortedPlayers = [...players].sort((a, b) => a.rank - b.rank);

  return (
    <aside
      aria-label="Scoreboard"
      className={`bg-white border-[3.5px] border-[#111827] rounded-2xl p-3 sm:p-4 shadow-[5px_5px_0px_#111827] flex flex-col gap-2.5 w-full max-w-[320px] mx-auto select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b-[2.5px] border-[#111827] pb-2">
        <span className="text-xl" role="img" aria-label="Trophy">
          🏆
        </span>
        <h2 className="font-['Luckiest_Guy',_Anton,_sans-serif] font-black text-base sm:text-lg text-[#111827] tracking-wider uppercase m-0">
          SCOREBOARD
        </h2>
      </div>

      {/* List of Player Rows */}
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[280px] pr-0.5">
        {sortedPlayers.map((player) => {
          const isWinner = player.rank === 1;
          const rowBg = isWinner ? 'bg-[#FFD83D]' : 'bg-[#F3F4F6] hover:bg-[#E5E7EB]';
          const borderClass = isWinner
            ? 'border-[2.5px] border-[#111827] shadow-[2px_2px_0px_#111827]'
            : 'border-2 border-[#111827] shadow-[1.5px_1.5px_0px_#111827]';

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors ${rowBg} ${borderClass}`}
            >
              {/* Left Side: Rank, Avatar, Name */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-black text-xs sm:text-sm w-4 text-center shrink-0 text-[#111827]">
                  {isWinner ? '👑' : player.rank}
                </span>

                <div className="w-7 h-7 rounded-full border-2 border-[#111827] bg-white overflow-hidden shrink-0 flex items-center justify-center">
                  <img
                    src={player.avatarUrl}
                    alt={player.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                <span className="font-['Luckiest_Guy',_Anton,_sans-serif] font-bold text-xs sm:text-sm text-[#111827] tracking-wide uppercase truncate max-w-[95px] sm:max-w-[110px]">
                  {player.name}
                </span>
              </div>

              {/* Right Side: Points Badge */}
              <div className="bg-[#111827] text-white rounded-lg px-2 py-0.5 shrink-0 border border-black shadow-[1px_1px_0px_#111827]">
                <span className="font-mono font-black text-[11px] sm:text-xs tracking-wider text-[#FFD83D]">
                  {player.score} PTS
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default Scoreboard;
