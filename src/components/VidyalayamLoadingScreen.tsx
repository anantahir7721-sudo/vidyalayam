import React, { useMemo } from 'react';
import { VidyalayamLogo } from './VidyalayamLogo';
import { getRandomShloka } from '../data/shlokas';

/**
 * Premium Loading Screen for Vidyalayam
 * Displays the Vidyalayam logo, elegant loading indicator, and a non-consecutive
 * randomly selected sacred Sanskrit shloka with its English meaning.
 */
export const VidyalayamLoadingScreen: React.FC = () => {
  // Select a random shloka once on mount, ensuring no consecutive repeats
  const shloka = useMemo(() => getRandomShloka(), []);

  return (
    <div className="min-h-screen w-full bg-[#080b0f] flex flex-col items-center justify-between text-white p-6 sm:p-8 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[520px] h-[340px] sm:h-[520px] rounded-full bg-[#9d512d]/15 blur-[120px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] sm:w-[400px] h-[260px] sm:h-[400px] rounded-full bg-[#fbd38d]/5 blur-[100px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Top spacer */}
      <div className="w-full flex justify-between items-center opacity-60">
        <span className="text-[10px] font-mono tracking-widest text-[#a99f91] uppercase">
          વિદ્યાલયમ • શૈક્ષણિક પોર્ટલ
        </span>
        <span className="text-[10px] font-mono text-[#f59c73]">
          v2.5
        </span>
      </div>

      {/* Center Main Stage */}
      <div className="w-full max-w-xl flex flex-col items-center text-center my-auto py-6 animate-in fade-in duration-700 z-10">
        {/* Centered Vidyalayam Logo with subtle breath animation */}
        <div className="relative mb-6">
          <div className="absolute -inset-3 rounded-3xl bg-[#9d512d]/25 blur-xl animate-pulse" />
          <VidyalayamLogo size={88} glow />
        </div>

        {/* Loading Titles */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-1.5 drop-shadow-sm">
          Vidyalayam is loading…
        </h1>
        <p className="text-xs sm:text-sm font-medium text-[#a99f91] tracking-wide mb-6">
          Please wait…
        </p>

        {/* Sophisticated minimal loading indicator */}
        <div className="relative w-36 h-1 bg-white/10 rounded-full overflow-hidden mb-8">
          <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-[#9d512d] via-[#f59c73] to-[#fbd38d] rounded-full animate-[progress_1.6s_ease-in-out_infinite]" />
        </div>

        {/* Sacred Sanskrit Shloka Card */}
        <div className="w-full rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md p-5 sm:p-7 shadow-2xl relative transition-all duration-300">
          {/* Subtle decorative gold top accent */}
          <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-[#fbd38d] to-transparent mx-auto mb-4 opacity-75" />

          {/* Sanskrit Text in elegant Devanagari typography */}
          <div className="font-serif text-[#fef3c7] text-sm sm:text-base md:text-lg leading-relaxed font-medium tracking-wide space-y-1.5">
            {shloka.sanskrit.map((line, idx) => (
              <p key={idx} className="drop-shadow-xs">
                {line}
              </p>
            ))}
          </div>

          {/* Subtle English Meaning */}
          <p className="text-[11px] sm:text-xs text-[#a99f91] italic font-sans mt-3.5 pt-3 border-t border-white/5 leading-relaxed max-w-md mx-auto">
            {shloka.meaning}
          </p>
        </div>
      </div>

      {/* Bottom subtle copyright watermark */}
      <div className="w-full text-center text-[10px] text-[#635848] font-medium tracking-wide z-10">
        Vidyalayam • Created by NR Chad
      </div>
    </div>
  );
};
