import React from 'react';
import { Player } from './types';
import PlayerCard from './PlayerCard';

interface PodiumProps {
  players: Player[];
  className?: string;
}

export const Podium: React.FC<PodiumProps> = ({ players, className = '' }) => {
  // Sort players descending by score / rank
  const sorted = [...players].sort((a, b) => a.rank - b.rank);
  const first = sorted.find((p) => p.rank === 1) || sorted[0];
  const second = sorted.find((p) => p.rank === 2) || sorted[1];
  const third = sorted.find((p) => p.rank === 3) || sorted[2];

  return (
    <section
      aria-label="Winner Podium"
      className={`flex items-end justify-center gap-2 sm:gap-3 md:gap-4 w-full max-w-[560px] mx-auto py-2 ${className}`}
    >
      {/* Second Place (Left, Blue) */}
      {second && (
        <div className="flex-1 flex justify-center pb-2">
          <PlayerCard player={second} rank={2} delayMs={350} />
        </div>
      )}

      {/* First Place (Center, Elevated Champion Yellow) */}
      {first && (
        <div className="flex-1 flex justify-center z-10 pb-5">
          <PlayerCard player={first} rank={1} delayMs={200} />
        </div>
      )}

      {/* Third Place (Right, Orange) */}
      {third && (
        <div className="flex-1 flex justify-center pb-0">
          <PlayerCard player={third} rank={3} delayMs={500} />
        </div>
      )}
    </section>
  );
};

export default Podium;
