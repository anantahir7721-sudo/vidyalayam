import React, { useMemo } from 'react';
import { VidyalayamLogo } from './VidyalayamLogo';
import { getRandomShloka } from '../data/shlokas';
import { useTheme } from '../context/ThemeContext';

/**
 * Premium Loading Screen for Vidyalayam
 * Displays the Vidyalayam logo, elegant loading indicator, and a non-consecutive
 * randomly selected sacred Sanskrit shloka with its English meaning.
 * Strictly adheres to the user's active theme:
 * - Crisp, clean, daylight styling in Light theme (#F5F7FA, pure white card, slate text)
 * - Deep, obsidian, warm styling in Dark theme (#080b0f, rich dark card, warm parchment text)
 */
export const VidyalayamLoadingScreen: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  // Select a random shloka once on mount, ensuring no consecutive repeats
  const shloka = useMemo(() => getRandomShloka(), []);

  return (
    <div
      data-theme={theme}
      className={`min-h-screen w-full flex flex-col items-center justify-between p-6 sm:p-8 relative overflow-hidden select-none transition-colors duration-300 ${
        isDark ? 'bg-[#080b0f] text-[#e4ded6]' : 'bg-[#F5F7FA] text-slate-800'
      }`}
    >
      {/* Ambient background glow */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[540px] h-[340px] sm:h-[540px] rounded-full blur-[120px] pointer-events-none transition-all ${
          isDark ? 'bg-[#9d512d]/15' : 'bg-[#C45A2D]/12'
        }`}
        aria-hidden="true"
      />
      <div
        className={`absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] sm:w-[420px] h-[260px] sm:h-[420px] rounded-full blur-[100px] pointer-events-none transition-all ${
          isDark ? 'bg-[#fbd38d]/5' : 'bg-amber-400/15'
        }`}
        aria-hidden="true"
      />

      {/* Top subtle branding strip */}
      <div className="w-full max-w-xl flex justify-between items-center z-10">
        <span
          className={`text-[11px] font-mono tracking-widest uppercase font-bold ${
            isDark ? 'text-[#a99f91]' : 'text-slate-500'
          }`}
        >
          વિદ્યાલયમ • શૈક્ષણિક પોર્ટલ
        </span>
        <span
          className={`text-[11px] font-mono font-bold ${
            isDark ? 'text-[#f59c73]' : 'text-[#C45A2D]'
          }`}
        >
          v2.5
        </span>
      </div>

      {/* Center Main Stage */}
      <div className="w-full max-w-xl flex flex-col items-center text-center my-auto py-6 animate-in fade-in duration-500 z-10">
        {/* Centered Vidyalayam Logo */}
        <div className="relative mb-5">
          <div
            className={`absolute -inset-3 rounded-3xl blur-xl animate-pulse ${
              isDark ? 'bg-[#9d512d]/25' : 'bg-[#C45A2D]/20'
            }`}
          />
          <VidyalayamLogo size={82} glow />
        </div>

        {/* Loading Titles */}
        <h1
          className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight mb-2 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          વિદ્યાલયમ લોડ થઈ રહ્યું છે...
        </h1>
        <p
          className={`text-xs sm:text-sm font-bold tracking-wide mb-6 ${
            isDark ? 'text-[#a99f91]' : 'text-slate-500'
          }`}
        >
          કૃપા કરીને ક્ષણવાર પ્રતીક્ષા કરો...
        </p>

        {/* Minimal loading indicator */}
        <div
          className={`relative w-36 h-1.5 rounded-full overflow-hidden mb-8 shadow-inner ${
            isDark ? 'bg-white/10' : 'bg-slate-200'
          }`}
        >
          <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-[#C45A2D] via-[#e8733a] to-[#fbd38d] rounded-full animate-[progress_1.6s_ease-in-out_infinite]" />
        </div>

        {/* Sacred Sanskrit Shloka Card */}
        <div
          className={`w-full rounded-2xl backdrop-blur-md p-6 sm:p-8 shadow-xl relative border transition-all ${
            isDark
              ? 'bg-[#121921]/90 border-white/10 shadow-black/40'
              : 'bg-white/95 border-slate-200/90 shadow-slate-200/60'
          }`}
        >
          {/* Subtle top decorative badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span
              className={`h-px w-8 ${
                isDark ? 'bg-[#fbd38d]/30' : 'bg-[#C45A2D]/30'
              }`}
            />
            <span
              className={`text-[11px] uppercase font-black tracking-widest ${
                isDark ? 'text-[#f59c73]' : 'text-[#C45A2D]'
              }`}
            >
              સુવિચાર • SHLOKA
            </span>
            <span
              className={`h-px w-8 ${
                isDark ? 'bg-[#fbd38d]/30' : 'bg-[#C45A2D]/30'
              }`}
            />
          </div>

          {/* Sanskrit Text in elegant Devanagari typography */}
          <div
            className={`font-['Noto_Serif_Devanagari',serif] text-base sm:text-lg md:text-xl leading-relaxed font-bold tracking-wide space-y-2 ${
              isDark ? 'text-[#fef3c7]' : 'text-slate-900'
            }`}
          >
            {shloka.sanskrit.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>

          {/* English Meaning */}
          <p
            className={`text-xs sm:text-sm italic font-sans mt-4 pt-3.5 border-t leading-relaxed max-w-md mx-auto font-medium ${
              isDark
                ? 'text-slate-300 border-white/10'
                : 'text-slate-600 border-slate-100'
            }`}
          >
            "{shloka.meaning}"
          </p>
        </div>
      </div>

      {/* Bottom copyright watermark */}
      <div
        className={`w-full text-center text-[11px] font-bold tracking-wide z-10 ${
          isDark ? 'text-[#635848]' : 'text-slate-400'
        }`}
      >
        વિદ્યાલયમ • સર્વાંગી શાળા પ્રબંધન પોર્ટલ
      </div>
    </div>
  );
};
