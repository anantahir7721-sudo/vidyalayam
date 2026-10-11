import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
  showLabels?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  compact = false,
  className = '',
  showLabels = true,
}) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const isDark = theme === 'dark';

  const handleSelect = (mode: ThemeMode) => {
    haptic.light();
    setThemeMode(mode);
  };

  if (compact) {
    // 3-mode compact segmented pill
    return (
      <div
        className={`inline-flex items-center p-0.5 rounded-xl border transition-all ${
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
          className={`p-1.5 rounded-lg transition-all cursor-pointer touch-manipulation flex items-center gap-1 ${
            themeMode === 'light'
              ? 'bg-white text-slate-900 shadow-xs border border-[#CBD5E1]'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
          title="લાઇટ થીમ (Light Mode)"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          {showLabels && <span className="text-[10px] font-bold hidden sm:inline">લાઇટ</span>}
        </button>

        <button
          type="button"
          onClick={() => handleSelect('dark')}
          className={`p-1.5 rounded-lg transition-all cursor-pointer touch-manipulation flex items-center gap-1 ${
            themeMode === 'dark'
              ? 'bg-[#202d38] text-amber-300 shadow-xs border border-white/15'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
          title="ડાર્ક થીમ (Dark Mode)"
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400 dark:text-amber-300" />
          {showLabels && <span className="text-[10px] font-bold hidden sm:inline">ડાર્ક</span>}
        </button>

        <button
          type="button"
          onClick={() => handleSelect('auto')}
          className={`p-1.5 rounded-lg transition-all cursor-pointer touch-manipulation flex items-center gap-1 ${
            themeMode === 'auto'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
          title="ઓટો / સિસ્ટમ થીમ (Auto System Mode)"
        >
          <Laptop className="w-3.5 h-3.5 text-emerald-400" />
          {showLabels && <span className="text-[10px] font-bold hidden sm:inline">ઓટો</span>}
        </button>
      </div>
    );
  }

  // Full segmented 3-option selector: Light, Dark, and Auto
  return (
    <div
      className={`inline-flex items-center p-1 rounded-2xl border transition-all ${
        isDark
          ? 'bg-[#121921]/95 border-white/15'
          : 'bg-slate-100 border-[#CBD5E1]'
      } ${className}`}
      role="group"
      aria-label="થીમ પસંદગી (Theme Selector)"
    >
      <button
        type="button"
        onClick={() => handleSelect('light')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation ${
          themeMode === 'light'
            ? 'bg-white text-slate-900 shadow-sm border border-[#CBD5E1]'
            : 'text-slate-600 dark:text-[#a99f91] hover:text-slate-900 dark:hover:text-[#e4ded6]'
        }`}
        title="લાઇટ થીમ (Light Mode)"
      >
        <Sun className="w-4 h-4 text-amber-500" />
        <span>લાઇટ</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelect('dark')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation ${
          themeMode === 'dark'
            ? 'bg-[#202d38] text-amber-300 shadow-sm border border-white/15'
            : 'text-slate-600 dark:text-[#a99f91] hover:text-slate-900 dark:hover:text-[#e4ded6]'
        }`}
        title="ડાર્ક થીમ (Dark Mode)"
      >
        <Moon className="w-4 h-4 text-indigo-400 dark:text-amber-300" />
        <span>ડાર્ક</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelect('auto')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation ${
          themeMode === 'auto'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-[#a99f91] hover:text-slate-900 dark:hover:text-[#e4ded6]'
        }`}
        title="ઓટો / સિસ્ટમ થીમ (Auto System Mode)"
      >
        <Laptop className="w-4 h-4 text-emerald-300" />
        <span>ઓટો</span>
      </button>
    </div>
  );
};
