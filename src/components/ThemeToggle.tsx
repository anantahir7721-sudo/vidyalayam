import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false, className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      id="btn-theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} theme (${isDark ? 'લાઇટ મોડ' : 'ડાર્ક મોડ'})`}
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-300 touch-manipulation min-h-[36px] ${
        isDark
          ? 'bg-[#141d24] hover:bg-[#202d38] text-[#e4ded6] border border-white/15 shadow-inner'
          : 'bg-[#ede7df] hover:bg-[#e4ded6] text-[#202d38] border border-[#a99f91]/40 shadow-sm'
      } ${className}`}
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform duration-300 ${
          isDark
            ? 'bg-[#9d512d] text-white rotate-0'
            : 'bg-[#9d512d] text-white rotate-180'
        }`}
      >
        {isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
      </div>

      {!compact && (
        <span className="text-xs font-semibold tracking-wide pr-1 select-none">
          {isDark ? 'ડાર્ક' : 'લાઇટ'}
        </span>
      )}
    </button>
  );
};
