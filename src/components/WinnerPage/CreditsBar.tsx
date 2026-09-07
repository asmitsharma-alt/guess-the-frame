import React from 'react';
import { CreditsData } from './types';

interface CreditsBarProps {
  credits?: CreditsData;
  className?: string;
}

const DEFAULT_CREDITS: CreditsData = {
  framesByTitle: 'FRAMES BY',
  framesBy: 'tanmayy, Tanuj, Darshan, Akash, Anmol & smoc crew',
  websiteByTitle: 'WEBSITE BY',
  websiteBy: 'Built with ❤️ by Asmit',
};

export const CreditsBar: React.FC<CreditsBarProps> = ({
  credits = DEFAULT_CREDITS,
  className = '',
}) => {
  return (
    <div
      aria-label="Game Credits"
      className={`inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-white border-[2.5px] border-[#111827] rounded-full py-1.5 px-3 sm:px-4 shadow-[3.5px_3.5px_0px_#111827] max-w-full select-none ${className}`}
    >
      {/* Frames Credits */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="bg-[#FFD83D] text-[#111827] border-[1.5px] border-[#111827] font-black text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 shadow-[1px_1px_0px_#111827]">
          {credits.framesByTitle || 'FRAMES BY'}
        </span>
        <span className="text-[11px] sm:text-xs font-bold text-[#111827] truncate max-w-[200px] sm:max-w-[280px]">
          {credits.framesBy}
        </span>
      </div>

      {/* Divider */}
      <span className="text-[#9CA3AF] font-black text-xs hidden sm:inline" aria-hidden="true">
        •
      </span>

      {/* Website Credits */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="bg-[#FFD83D] text-[#111827] border-[1.5px] border-[#111827] font-black text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 shadow-[1px_1px_0px_#111827]">
          {credits.websiteByTitle || 'WEBSITE BY'}
        </span>
        <span className="text-[11px] sm:text-xs font-bold text-[#111827]">
          {credits.websiteBy}
        </span>
      </div>
    </div>
  );
};

export default CreditsBar;
