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
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleClick = () => {
    haptic.light();
    toggleTheme();
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`p-1.5 rounded-full transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
          isDark
            ? 'bg-white/5 hover:bg-white/10 text-amber-400 border border-white/10'
            : 'bg-white/90 hover:bg-white text-amber-600 border border-[#E2E8F0] shadow-xs'
        } ${className}`}
        title={isDark ? 'લાઇટ થીમ ચાલુ કરો (Switch to Light Mode)' : 'ડાર્ક થીમ ચાલુ કરો (Switch to Dark Mode)'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 transition-transform hover:rotate-45 duration-300" />
        ) : (
          <Moon className="w-3.5 h-3.5 transition-transform hover:-rotate-12 duration-300" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation ${
        isDark
          ? 'bg-white/5 hover:bg-white/10 text-[#e4ded6] hover:text-white border border-white/10'
          : 'bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-[#E2E8F0] shadow-xs'
      } ${className}`}
      title={isDark ? 'લાઇટ થીમ ચાલુ કરો' : 'ડાર્ક થીમ ચાલુ કરો'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px]">લાઇટ</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-[11px]">ડાર્ક</span>
        </>
      )}
    </button>
  );
};


