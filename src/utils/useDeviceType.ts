import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type ViewMode = 'auto' | 'mobile' | 'desktop';

export interface DeviceInfo {
  deviceType: DeviceType;
  effectiveType: 'mobile' | 'desktop';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  screenWidth: number;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const VIEW_MODE_STORAGE_KEY = 'vidyalayam_view_mode_pref';

export function useDeviceType(): DeviceInfo {
  const [screenWidth, setScreenWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024;
  });

  const [isTouch, setIsTouch] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    return false;
  });

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored === 'mobile' || stored === 'desktop' || stored === 'auto') {
        return stored;
      }
    }
    return 'auto';
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const deviceType: DeviceType =
    screenWidth < 768 ? 'mobile' : screenWidth < 1024 ? 'tablet' : 'desktop';

  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';

  // If user forced 'desktop' view mode, effectiveType is 'desktop'.
  // If user forced 'mobile' view mode, effectiveType is 'mobile'.
  // Otherwise 'auto': mobile/tablet (<1024) -> 'mobile', desktop (>=1024) -> 'desktop'.
  let effectiveType: 'mobile' | 'desktop' = isDesktop ? 'desktop' : 'mobile';
  if (viewMode === 'desktop') effectiveType = 'desktop';
  if (viewMode === 'mobile') effectiveType = 'mobile';

  return {
    deviceType,
    effectiveType,
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    screenWidth,
    viewMode,
    setViewMode,
  };
}
