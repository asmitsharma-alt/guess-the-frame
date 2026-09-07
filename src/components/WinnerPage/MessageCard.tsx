import React from 'react';

interface MessageCardProps {
  message?: string;
  className?: string;
}

const DEFAULT_MESSAGE =
  'Umeed hai aap sabko game pasand aaya hoga. Agar aapke paas koi feedback ho, to humein zaroor batayein. Milte hain agle podcast mein! Aur bhai log, ScoopLuck de do, life mein kaafi problems chal rahi hain. Problems solve hote hi ₹1,000 ka Super Chat pakka. Aur haan, bhai log, email ka reply bhi diya karo 😊';

export const MessageCard: React.FC<MessageCardProps> = ({
  message = DEFAULT_MESSAGE,
  className = '',
}) => {
  return (
    <article
      aria-label="Feedback Message"
      className={`bg-white border-[3.5px] border-[#111827] rounded-2xl p-3 sm:p-4 shadow-[5px_5px_0px_#111827] flex flex-col gap-2.5 w-full max-w-[320px] mx-auto select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b-[2.5px] border-[#111827] pb-2">
        <span className="text-xl" role="img" aria-label="Speech bubble">
          💬
        </span>
        <h2 className="font-['Luckiest_Guy',_Anton,_sans-serif] font-black text-base sm:text-lg text-[#111827] tracking-wider uppercase m-0">
          MESSAGE
        </h2>
      </div>

      {/* Message Body */}
      <p className="text-xs sm:text-[13px] text-[#374151] font-medium leading-relaxed overflow-y-auto max-h-[220px] pr-1 m-0">
        {message}
      </p>
    </article>
  );
};

export default MessageCard;
