import React from 'react';
import { Volume2 } from 'lucide-react';
import { useVoice, VoiceGender } from '../context/VoiceContext';
import { haptic } from '../utils/haptics';

interface VoiceGenderSelectorProps {
  className?: string;
  compact?: boolean;
}

export const VoiceGenderSelector: React.FC<VoiceGenderSelectorProps> = ({
  className = '',
  compact = false,
}) => {
  const { voiceGender, setVoiceGender } = useVoice();

  const handleSelect = (gender: VoiceGender) => {
    haptic.light();
    setVoiceGender(gender);
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 bg-white/80 dark:bg-black/40 border border-slate-200 dark:border-white/10 p-0.5 rounded-xl text-xs backdrop-blur-xs shadow-2xs ${className}`}>
        <button
          type="button"
          onClick={() => handleSelect('female')}
          className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
            voiceGender === 'female'
              ? 'bg-[#C45A2D] text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
          title="મહિલા અવાજ (Female Voice)"
        >
          <span>👩 મહિલા</span>
        </button>
        <button
          type="button"
          onClick={() => handleSelect('male')}
          className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
            voiceGender === 'male'
              ? 'bg-[#C45A2D] text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
          title="પુરુષ અવાજ (Male Voice)"
        >
          <span>👨 પુરુષ</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 bg-white dark:bg-[#121921]/90 border border-slate-200 dark:border-white/10 p-1 rounded-2xl text-xs shadow-xs backdrop-blur-xs ${className}`}>
      <span className="text-[11px] font-bold text-slate-500 dark:text-[#a99f91] px-1.5 flex items-center gap-1">
        <Volume2 className="w-3.5 h-3.5 text-[#C45A2D] dark:text-[#f59c73]" />
        <span>વાણી:</span>
      </span>
      <button
        type="button"
        onClick={() => handleSelect('female')}
        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
          voiceGender === 'female'
            ? 'bg-[#C45A2D] text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
        title="મધુર મહિલા શિક્ષક વાણી"
      >
        <span>👩 મહિલા અવાજ</span>
      </button>
      <button
        type="button"
        onClick={() => handleSelect('male')}
        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
          voiceGender === 'male'
            ? 'bg-[#C45A2D] text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
        title="ગંભીર પ્રભાવશાળી પુરુષ વાણી"
      >
        <span>👨 પુરુષ અવાજ</span>
      </button>
    </div>
  );
};
