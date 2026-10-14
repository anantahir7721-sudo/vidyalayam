import React from 'react';
import { Volume2 } from 'lucide-react';

interface VoiceGenderSelectorProps {
  className?: string;
  compact?: boolean;
}

export const VoiceGenderSelector: React.FC<VoiceGenderSelectorProps> = ({
  className = '',
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 bg-white/80 dark:bg-black/40 border border-slate-200 dark:border-white/10 px-2 py-1 rounded-xl text-xs backdrop-blur-xs shadow-2xs ${className}`}>
        <span className="font-bold text-[11px] text-[#C45A2D] dark:text-[#f59c73] flex items-center gap-1">
          <span>👩 ગુજરાતી મહિલા વાણી</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 bg-white dark:bg-[#121921]/90 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-2xl text-xs shadow-xs backdrop-blur-xs ${className}`}>
      <Volume2 className="w-3.5 h-3.5 text-[#C45A2D] dark:text-[#f59c73]" />
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
        👩 ગુજરાતી મહિલા શિક્ષક વાણી (ધ્વનિ)
      </span>
    </div>
  );
};
