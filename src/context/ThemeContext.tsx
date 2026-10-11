import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncNativeStatusBarTheme } from '../utils/statusBarHelper';

export type Theme = 'dark' | 'light';
export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const resolveSystemTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  themeMode: 'auto',
  setThemeMode: () => {},
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const savedMode = localStorage.getItem('ekam_theme_mode');
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto') {
        return savedMode as ThemeMode;
      }
      const legacySaved = localStorage.getItem('ekam_theme');
      if (legacySaved === 'light' || legacySaved === 'dark') {
        return legacySaved as ThemeMode;
      }
    } catch (e) {}
    return 'auto';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    if (themeMode === 'dark') return 'dark';
    if (themeMode === 'light') return 'light';
    return resolveSystemTheme();
  });

  const applyTheme = (targetTheme: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;

    if (targetTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';

      if (body) {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
      }
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', '#F5F7FA');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';

      if (body) {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
      }
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', '#080b0f');
    }

    // Sync with Capacitor native Android / iOS status bar & Native Bridge
    try {
      syncNativeStatusBarTheme(targetTheme === 'dark');
    } catch (e) {}

    try {
      localStorage.setItem('ekam_theme', targetTheme);
    } catch (e) {}
  };

  // Re-evaluate theme whenever themeMode changes
  useEffect(() => {
    const effective = themeMode === 'auto' ? resolveSystemTheme() : themeMode;
    setThemeState(effective);
    applyTheme(effective);
  }, [themeMode]);

  // Real-time listener for system theme changes when themeMode is 'auto'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e: MediaQueryListEvent) => {
      try {
        const currentMode = localStorage.getItem('ekam_theme_mode') || themeMode;
        if (currentMode === 'auto') {
          const nextTheme: Theme = e.matches ? 'dark' : 'light';
          setThemeState(nextTheme);
          applyTheme(nextTheme);
        }
      } catch (err) {}
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  }, [themeMode]);

  const setThemeMode = (newMode: ThemeMode) => {
    setThemeModeState(newMode);
    try {
      localStorage.setItem('ekam_theme_mode', newMode);
    } catch (e) {}
    const effective = newMode === 'auto' ? resolveSystemTheme() : newMode;
    setThemeState(effective);
    applyTheme(effective);
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeMode(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  return useContext(ThemeContext);
};

