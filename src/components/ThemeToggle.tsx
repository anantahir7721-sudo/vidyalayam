import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  compact = false,
  className = '',
}) => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleToggle = () => {
    haptic.light();
    toggleTheme();
  };

  const handleSelect = (target: 'light' | 'dark') => {
    if (theme !== target) {
      haptic.light();
      setTheme(target);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer touch-manipulation flex items-center justify-center shrink-0 min-h-[36px] min-w-[36px] ${
          isDark
            ? 'bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 shadow-xs'
            : 'bg-white/95 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-[#CBD5E1] shadow-xs'
        } ${className}`}
        title={isDark ? 'લાઇટ થીમ કરો (Switch to Light Mode)' : 'ડાર્ક થીમ કરો (Switch to Dark Mode)'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-300 transition-transform hover:rotate-45 duration-300" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12 duration-300" />
        )}
      </button>
    );
  }

  // Segmented 2-pill toggle: Clearly shows current active theme with zero confusion!
  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-full border transition-all ${
        isDark
          ? 'bg-[#121921]/90 border-white/15'
          : 'bg-slate-100/90 border-[#CBD5E1]'
      } ${className}`}
      role="group"
      aria-label="થીમ પસંદગી (Theme Selector)"
    >
      <button
        type="button"
        onClick={() => handleSelect('light')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer touch-manipulation ${
          !isDark
            ? 'bg-white text-slate-900 shadow-xs border border-[#CBD5E1]'
            : 'text-[#a99f91] hover:text-[#e4ded6]'
        }`}
        title="લાઇટ થીમ (Light Mode)"
      >
        <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500' : 'text-[#a99f91]'}`} />
        <span>લાઇટ</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelect('dark')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer touch-manipulation ${
          isDark
            ? 'bg-[#202d38] text-amber-300 shadow-xs border border-white/15'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="ડાર્ક થીમ (Dark Mode)"
      >
        <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-amber-300' : 'text-slate-500'}`} />
        <span>ડાર્ક</span>
      </button>
    </div>
  );
};
