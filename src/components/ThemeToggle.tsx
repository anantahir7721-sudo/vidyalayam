import React from 'react';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

/**
 * ThemeToggle is disabled while the application is locked to dark mode.
 * Will be re-enabled when light theme is rebuilt from scratch.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = () => {
  return null;
};

