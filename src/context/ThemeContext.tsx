import React, { createContext, useContext, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('ekam_theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {}
    return 'light';
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

    // Sync with Capacitor native Android / iOS status bar
    try {
      if (Capacitor.isPluginAvailable('StatusBar')) {
        // Keep status bar full screen (edge-to-edge transparent overlay)
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        if (targetTheme === 'light') {
          // Light theme: Dark status bar text/icons over transparent light header
          StatusBar.setStyle({ style: Style.Light }).catch(() => {});
          StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {});
        } else {
          // Dark theme: Light status bar text/icons over transparent dark header
          StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
          StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {});
        }
        // Query status bar height to guarantee correct insets
        StatusBar.getInfo().then((info) => {
          if (info && typeof info.height === 'number' && info.height > 0) {
            document.documentElement.style.setProperty('--system-status-bar-height', `${info.height}px`);
          }
        }).catch(() => {});
      }
    } catch (e) {}

    try {
      localStorage.setItem('ekam_theme', targetTheme);
    } catch (e) {}
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for device system theme changes if user hasn't explicitly set a preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem('ekam_theme');
        if (!saved) {
          const next = e.matches ? 'dark' : 'light';
          setThemeState(next);
          applyTheme(next);
        }
      } catch (err) {}
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
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

