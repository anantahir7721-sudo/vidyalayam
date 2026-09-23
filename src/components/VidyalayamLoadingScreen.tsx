import React, { useMemo } from 'react';
import { VidyalayamLogo } from './VidyalayamLogo';
import { getRandomShloka } from '../data/shlokas';

/**
 * Premium Loading Screen for Vidyalayam
 * Displays the Vidyalayam logo, elegant loading indicator, and a non-consecutive
 * randomly selected sacred Sanskrit shloka with its English meaning.
 * Modern, minimal, and pristine in BOTH light and dark themes.
 */
export const VidyalayamLoadingScreen: React.FC = () => {
  // Select a random shloka once on mount, ensuring no consecutive repeats
  const shloka = useMemo(() => getRandomShloka(), []);

  return (
    <div className="min-h-screen w-full bg-[#faf7f2] dark:bg-[#080b0f] text-[#141d24] dark:text-white flex flex-col items-center justify-between p-6 sm:p-8 relative overflow-hidden select-none transition-colors duration-300">
      {/* Ambient background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[540px] h-[340px] sm:h-[540px] rounded-full bg-[#9d512d]/10 dark:bg-[#9d512d]/15 blur-[120px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] sm:w-[420px] h-[260px] sm:h-[420px] rounded-full bg-[#fbd38d]/15 dark:bg-[#fbd38d]/5 blur-[100px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Top subtle branding strip */}
      <div className="w-full max-w-xl flex justify-between items-center opacity-70 z-10">
        <span className="text-[11px] font-mono tracking-widest text-[#7a6b58] dark:text-[#a99f91] uppercase font-semibold">
          વિદ્યાલયમ • શૈક્ષણિક પોર્ટલ
        </span>
        <span className="text-[11px] font-mono text-[#9d512d] dark:text-[#f59c73] font-bold">
          v2.5
        </span>
      </div>

      {/* Center Main Stage */}
      <div className="w-full max-w-xl flex flex-col items-center text-center my-auto py-6 animate-in fade-in duration-700 z-10">
        {/* Centered Vidyalayam Logo */}
        <div className="relative mb-5">
          <div className="absolute -inset-3 rounded-3xl bg-[#9d512d]/20 blur-xl animate-pulse" />
          <VidyalayamLogo size={82} glow />
        </div>

        {/* Loading Titles */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[#141d24] dark:text-white mb-1.5 drop-shadow-xs">
          Vidyalayam is loading…
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-[#7a6b58] dark:text-[#a99f91] tracking-wide mb-6">
          Please wait…
        </p>

        {/* Sophisticated minimal loading indicator */}
        <div className="relative w-36 h-1 bg-[#e6dfd5] dark:bg-white/10 rounded-full overflow-hidden mb-8 shadow-inner">
          <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-[#9d512d] via-[#e8733a] to-[#fbd38d] rounded-full animate-[progress_1.6s_ease-in-out_infinite]" />
        </div>

        {/* Sacred Sanskrit Shloka Card - High contrast, legible & elegant in both themes */}
        <div className="w-full rounded-2xl bg-white/95 dark:bg-[#121921]/90 border border-[#e5dcd1] dark:border-white/10 backdrop-blur-md p-6 sm:p-8 shadow-[0_12px_40px_rgba(74,38,18,0.08)] dark:shadow-2xl relative transition-all duration-300">
          {/* Subtle top decorative pill */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-px w-8 bg-[#9d512d]/30 dark:bg-[#fbd38d]/30" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#9d512d] dark:text-[#f59c73]">
              સુવિચાર • SHLOKA
            </span>
            <span className="h-px w-8 bg-[#9d512d]/30 dark:bg-[#fbd38d]/30" />
          </div>

          {/* Sanskrit Text in elegant Devanagari typography */}
          <div className="font-['Noto_Serif_Devanagari',serif] text-slate-900 dark:text-[#fef3c7] text-base sm:text-lg md:text-xl leading-relaxed font-bold tracking-wide space-y-2">
            {shloka.sanskrit.map((line, idx) => (
              <p key={idx} className="drop-shadow-xs">
                {line}
              </p>
            ))}
          </div>

          {/* Subtle English Meaning */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic font-sans mt-4 pt-3.5 border-t border-[#e8ded2] dark:border-white/10 leading-relaxed max-w-md mx-auto font-medium">
            "{shloka.meaning}"
          </p>
        </div>
      </div>

      {/* Bottom subtle copyright watermark */}
      <div className="w-full text-center text-[11px] text-[#7a6b58] dark:text-[#635848] font-semibold tracking-wide z-10">
        Vidyalayam • by NRChad
      </div>
    </div>
  );
};
