import React from 'react';
import { ActionCallbacks } from './types';

interface ActionButtonsProps {
  actions?: ActionCallbacks;
  className?: string;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  actions,
  className = '',
}) => {
  return (
    <nav
      aria-label="Game Results Actions"
      className={`w-full flex flex-col sm:flex-row items-stretch justify-center gap-3 sm:gap-4 max-w-[850px] mx-auto select-none ${className}`}
    >
      {/* Button 1: Play Again (Yellow) */}
      <button
        type="button"
        onClick={actions?.onPlayAgain}
        className="flex-1 min-h-[56px] sm:min-h-[65px] bg-[#FFD83D] hover:bg-[#FACC15] text-[#111827] border-4 border-[#111827] rounded-[16px] shadow-[5px_5px_0px_#111827] hover:-translate-y-[3px] hover:shadow-[5px_8px_0px_#111827] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111827] transition-all duration-150 flex items-center justify-center gap-2.5 px-4 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#FFD83D]/50"
      >
        <span className="text-lg sm:text-xl" aria-hidden="true">
          ▶
        </span>
        <span className="font-['Luckiest_Guy',_Anton,_sans-serif] font-black text-sm sm:text-base md:text-lg tracking-wider uppercase">
          PLAY AGAIN
        </span>
      </button>

      {/* Button 2: Rematch (Blue) */}
      <button
        type="button"
        onClick={actions?.onRematch}
        className="flex-1 min-h-[56px] sm:min-h-[65px] bg-[#3B82F6] hover:bg-[#2563EB] text-white border-4 border-[#111827] rounded-[16px] shadow-[5px_5px_0px_#111827] hover:-translate-y-[3px] hover:shadow-[5px_8px_0px_#111827] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111827] transition-all duration-150 flex items-center justify-center gap-2.5 px-4 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#3B82F6]/50"
      >
        <span className="text-lg sm:text-xl" aria-hidden="true">
          👥
        </span>
        <span className="font-['Luckiest_Guy',_Anton,_sans-serif] font-black text-sm sm:text-base md:text-lg tracking-wider uppercase">
          REMATCH
        </span>
      </button>

      {/* Button 3: Return to Lobby (White) */}
      <button
        type="button"
        onClick={actions?.onReturnLobby}
        className="flex-1 min-h-[56px] sm:min-h-[65px] bg-white hover:bg-[#F3F4F6] text-[#111827] border-4 border-[#111827] rounded-[16px] shadow-[5px_5px_0px_#111827] hover:-translate-y-[3px] hover:shadow-[5px_8px_0px_#111827] active:translate-y-[2px] active:shadow-[2px_2px_0px_#111827] transition-all duration-150 flex items-center justify-center gap-2.5 px-4 cursor-pointer focus:outline-none focus:ring-4 focus:ring-black/30"
      >
        <span className="text-lg sm:text-xl" aria-hidden="true">
          🏠
        </span>
        <span className="font-['Luckiest_Guy',_Anton,_sans-serif] font-black text-sm sm:text-base md:text-lg tracking-wider uppercase">
          RETURN TO LOBBY
        </span>
      </button>
    </nav>
  );
};

export default ActionButtons;
