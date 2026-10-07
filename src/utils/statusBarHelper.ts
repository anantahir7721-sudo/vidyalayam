import { Capacitor, registerPlugin } from '@capacitor/core';

interface StatusBarPlugin {
  getInfo(): Promise<{ visible: boolean; style: string; color: string; overlays: boolean; height?: number }>;
}

const StatusBar = registerPlugin<StatusBarPlugin>('StatusBar');

/**
 * Initializes and dynamically maintains full-screen edge-to-edge status bar insets.
 * Guarantees that:
 * 1. The app remains 100% full screen (background bleeds seamlessly into status bar).
 * 2. Status bar text/clock/icons are always clearly visible.
 * 3. App headers, logos, navigation buttons, and text NEVER go behind status bar text.
 */
export function initStatusBarHelper(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const root = document.documentElement;

  const updateStatusBarMetrics = async () => {
    let detectedHeight = 0;

    // 1. Check Android Native Bridge interface if available
    try {
      const androidBridge = (window as any).AndroidBridge;
      if (androidBridge && typeof androidBridge.getStatusBarHeight === 'function') {
        const bridgeHeight = Number(androidBridge.getStatusBarHeight());
        if (!isNaN(bridgeHeight) && bridgeHeight > 0) {
          detectedHeight = Math.max(detectedHeight, bridgeHeight);
        }
      }
    } catch {}

    // 2. Check Capacitor StatusBar Plugin
    try {
      if (Capacitor.isPluginAvailable('StatusBar')) {
        const info = await StatusBar.getInfo();
        if (info && typeof info.height === 'number' && info.height > 0) {
          detectedHeight = Math.max(detectedHeight, info.height);
        }
      }
    } catch {}

    // 3. Fallback for standalone PWA / Mobile Web edge-to-edge
    // If running in standalone display mode on a mobile device and env() is 0px
    try {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (window.navigator as any).standalone === true ||
        Capacitor.isNativePlatform();

      const isMobileDevice =
        window.innerWidth < 768 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;

      if (isStandalone && isMobileDevice && detectedHeight === 0) {
        // Test computed safe area inset top
        const computedSafeTop = parseFloat(
          getComputedStyle(root).getPropertyValue('--safe-area-top') || '0'
        );
        if (computedSafeTop <= 0) {
          // Standard modern smartphone status bar height (approx 28px - 32px on Android, 44px on iPhone)
          const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
          detectedHeight = isIos ? 44 : 28;
        }
      }
    } catch {}

    if (detectedHeight > 0) {
      root.style.setProperty('--system-status-bar-height', `${detectedHeight}px`);
    }
  };

  // Immediate execution
  updateStatusBarMetrics();

  // Listen for orientation change, resize, and visibility
  const handleResize = () => {
    updateStatusBarMetrics();
  };

  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('orientationchange', handleResize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateStatusBarMetrics();
    }
  });

  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
  };
}
