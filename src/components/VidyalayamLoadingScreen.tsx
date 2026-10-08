import React, { useMemo } from 'react';
import { getRandomShloka } from '../data/shlokas';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

/**
 * Sophisticated Vidyalayam Splash & Loading Screen
 * Features:
 * 1. Slowly spinning sacred Lotus Mandala Petal Ring (360° smooth continuous rotation)
 * 2. Stationary central Gurukul emblem (Guru, disciples, thatch cottage, "Vidyalayam by NR Chad", and sacred scripture book)
 * 3. Divine breathing aura / radiant halo pulse behind the Guru
 * 4. Sacred Sanskrit Shloka card with Devanagari & Gujarati fonts
 * 5. Elegant light & dark theme styling (Rich Terracotta in Light mode / Deep Obsidian Gold in Dark mode)
 * 6. Smooth progress bar & quick theme preview toggle
 */
export const VidyalayamLoadingScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // Select a sacred shloka on mount
  const shloka = useMemo(() => getRandomShloka(), []);

  return (
    <div
      data-theme={theme}
      style={{
        paddingTop: 'max(1.5rem, max(env(safe-area-inset-top, 0px), var(--system-status-bar-height, 0px)))',
      }}
      className={`min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] relative overflow-hidden select-none transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-[#120E0C] via-[#0B0908] to-[#080B0F] text-[#F3ECE1]'
          : 'bg-gradient-to-br from-[#BA613B] via-[#A8512D] to-[#8C3F1E] text-[#FFF6EE]'
      }`}
    >
      {/* Ambient background radiant lighting */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[620px] h-[340px] sm:h-[620px] rounded-full blur-[140px] pointer-events-none transition-all duration-700 ${
          isDark ? 'bg-amber-500/15' : 'bg-orange-300/25'
        }`}
        aria-hidden="true"
      />
      <div
        className={`absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] rounded-full blur-[120px] pointer-events-none transition-all duration-700 ${
          isDark ? 'bg-orange-700/10' : 'bg-yellow-400/20'
        }`}
        aria-hidden="true"
      />

      {/* Top Header Bar */}
      <div className="w-full max-w-xl flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] sm:text-xs font-bold tracking-widest uppercase font-gujarati ${
              isDark ? 'text-amber-200/80' : 'text-amber-100/90'
            }`}
          >
            વિદ્યાલયમ • શૈક્ષણિક પોર્ટલ
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick theme switcher for splash screen */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'લાઇટ થીમ' : 'ડાર્ક થીમ'}
            className={`p-1.5 rounded-full transition-all cursor-pointer backdrop-blur-md border ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-amber-300 border-white/10 shadow-sm'
                : 'bg-black/15 hover:bg-black/25 text-amber-100 border-white/20 shadow-sm'
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <span
            className={`text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full backdrop-blur-md border ${
              isDark
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                : 'bg-black/20 text-white border-white/30'
            }`}
          >
            v2.5
          </span>
        </div>
      </div>

      {/* Center Stage: Spinning Mandala + Stationary Sacred Emblem */}
      <div className="w-full max-w-xl flex flex-col items-center text-center my-auto py-2 z-10">
        {/* Animated Sacred Emblem Container */}
        <div className="relative flex items-center justify-center w-[250px] h-[250px] sm:w-[290px] sm:h-[290px] mb-5">
          {/* 1. Outermost Faint Counter-Rotating Sacred Aura Ring */}
          <div
            className={`absolute inset-[-14px] rounded-full border border-dashed pointer-events-none transition-all duration-700 ${
              isDark ? 'border-amber-400/20' : 'border-amber-200/30'
            }`}
            style={{
              animation: 'spin-reverse-slow 48s linear infinite',
            }}
          />

          {/* 2. Soft Breathing Divine Glow */}
          <div
            className={`absolute inset-4 rounded-full blur-xl pointer-events-none transition-all duration-700 ${
              isDark ? 'bg-amber-500/30' : 'bg-amber-300/35'
            }`}
            style={{
              animation: 'pulse-gentle 3.5s ease-in-out infinite',
            }}
          />

          {/* 3. The Slowly Spinning Sacred Lotus Mandala Ring */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-transform"
            style={{
              animation: 'spin-slow 34s linear infinite',
              filter: isDark
                ? 'drop-shadow(0 0 14px rgba(244, 178, 102, 0.45))'
                : 'drop-shadow(0 0 10px rgba(255, 230, 216, 0.35))',
            }}
          >
            <img
              src={isDark ? '/splash/mandala-dark.svg' : '/splash/mandala-light.svg'}
              alt="Sacred Mandala Ring"
              className="w-full h-full object-contain select-none"
              draggable={false}
            />
          </div>

          {/* 4. Stationary Inner Sacred Emblem (Guru, Disciples, Cottage, Typography, and Book) */}
          <div
            className="relative z-20 w-[74%] h-[74%] flex items-center justify-center rounded-full overflow-hidden shadow-2xl transition-all duration-500"
            style={{
              animation: 'divine-shimmer 4s ease-in-out infinite',
            }}
          >
            <img
              src={isDark ? '/splash/emblem-inner-dark.png' : '/splash/emblem-inner.png'}
              alt="વિદ્યાલયમ • Vidyalayam"
              className="w-full h-full object-contain drop-shadow-md select-none transform hover:scale-105 transition-transform duration-300"
              draggable={false}
            />
          </div>
        </div>

        {/* Portal Title & Subtitle */}
        <h1
          className={`text-2xl sm:text-3xl font-black tracking-tight mb-1 font-gujarati drop-shadow-sm ${
            isDark ? 'text-amber-100' : 'text-white'
          }`}
        >
          વિદ્યાલયમ
        </h1>
        <p
          className={`text-xs sm:text-sm font-semibold tracking-wide mb-4 font-gujarati ${
            isDark ? 'text-amber-200/75' : 'text-amber-100/85'
          }`}
        >
          શૈક્ષણિક સંસ્કાર અને જ્ઞાનનું પવિત્ર મંદિર
        </p>

        {/* Sleek Golden Progress Indicator */}
        <div
          className={`relative w-48 sm:w-56 h-1.5 rounded-full overflow-hidden mb-6 shadow-inner ${
            isDark ? 'bg-black/40' : 'bg-black/20'
          }`}
        >
          <div
            className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-100 rounded-full shadow-sm"
            style={{
              animation: 'progress 1.6s ease-in-out infinite',
            }}
          />
        </div>

        {/* Sacred Sanskrit Shloka Card */}
        <div
          className={`w-full rounded-2xl backdrop-blur-md p-5 sm:p-7 shadow-2xl relative border transition-all duration-500 ${
            isDark
              ? 'bg-[#14100E]/80 border-amber-500/20 shadow-black/60'
              : 'bg-[#7C3618]/30 border-white/20 shadow-black/20'
          }`}
        >
          {/* Subtle Top Decorative Badge */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span
              className={`h-px w-8 ${
                isDark ? 'bg-amber-400/40' : 'bg-amber-200/40'
              }`}
            />
            <span
              className={`text-[10px] sm:text-[11px] uppercase font-black tracking-widest font-gujarati ${
                isDark ? 'text-amber-300' : 'text-amber-200'
              }`}
            >
              પ્રેરણાદાયી સુવિચાર • SHLOKA
            </span>
            <span
              className={`h-px w-8 ${
                isDark ? 'bg-amber-400/40' : 'bg-amber-200/40'
              }`}
            />
          </div>

          {/* Sanskrit Text in elegant Devanagari typography */}
          <div
            className={`font-['Noto_Serif_Devanagari',serif] text-sm sm:text-base md:text-lg leading-relaxed font-bold tracking-wide space-y-1.5 ${
              isDark ? 'text-amber-100' : 'text-white'
            }`}
          >
            {shloka.sanskrit.map((line, idx) => (
              <p key={idx} className="drop-shadow-xs">
                {line}
              </p>
            ))}
          </div>

          {/* English Meaning */}
          <p
            className={`text-xs sm:text-[13px] italic font-sans mt-3 pt-3 border-t leading-relaxed max-w-md mx-auto font-medium ${
              isDark
                ? 'text-amber-200/70 border-white/10'
                : 'text-amber-100/80 border-white/15'
            }`}
          >
            "{shloka.meaning}"
          </p>
        </div>
      </div>

      {/* Bottom Footer Watermark */}
      <div
        className={`w-full text-center text-[11px] font-semibold tracking-wide z-10 font-gujarati ${
          isDark ? 'text-amber-400/40' : 'text-amber-200/60'
        }`}
      >
        વિદ્યાલયમ • સર્વાંગી શાળા પ્રબંધન પોર્ટલ • Created by NR Chad
      </div>
    </div>
  );
};
