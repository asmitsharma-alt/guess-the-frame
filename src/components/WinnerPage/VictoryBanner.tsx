import React from 'react';

interface VictoryBannerProps {
  title?: string;
  className?: string;
}

export const VictoryBanner: React.FC<VictoryBannerProps> = ({
  title = 'VICTORY!',
  className = '',
}) => {
  return (
    <div
      className={`relative z-10 flex items-center justify-center my-1 select-none animate-[victoryEntry_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both] ${className}`}
    >
      {/* Left 3 Radiating Comic Speed Lines */}
      <div className="hidden sm:block mr-2 w-8 h-10 opacity-95 shrink-0" aria-hidden="true">
        <svg viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <line x1="33" y1="13" x2="11" y2="4" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
          <line x1="35" y1="23" x2="8" y2="23" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
          <line x1="33" y1="33" x2="11" y2="42" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>

      {/* Main Tilted Yellow Banner */}
      <div
        className="bg-[#FFD83D] border-[5px] border-[#111827] rounded-xl px-8 py-2 shadow-[6px_6px_0px_#111827] -rotate-3 transition-transform hover:scale-105 duration-200"
        style={{ transform: 'rotate(-3deg)' }}
      >
        <h1 className="font-['Luckiest_Guy',_'Bungee',_Anton,_sans-serif] text-[38px] sm:text-[48px] md:text-[60px] lg:text-[64px] font-black tracking-wider text-[#111827] uppercase leading-none m-0 text-center drop-shadow-sm">
          {title}
        </h1>
      </div>

      {/* Right 3 Radiating Comic Speed Lines */}
      <div className="hidden sm:block ml-2 w-8 h-10 opacity-95 shrink-0" aria-hidden="true">
        <svg viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <line x1="5" y1="13" x2="27" y2="4" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
          <line x1="3" y1="23" x2="30" y2="23" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
          <line x1="5" y1="33" x2="27" y2="42" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

export default VictoryBanner;
