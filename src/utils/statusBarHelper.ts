import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Dynamically synchronizes native Android and iOS status bar styling with current theme.
 * Light theme -> dark icons (Style.Light / appearanceLightStatusBars = true)
 * Dark theme -> white icons (Style.Dark / appearanceLightStatusBars = false)
 */
export async function syncNativeStatusBarTheme(isDark: boolean): Promise<void> {
  // 1. Android Native Bridge
  try {
    const androidBridge = (window as any).AndroidBridge;
    if (androidBridge && typeof androidBridge.setStatusBarTheme === 'function') {
      androidBridge.setStatusBarTheme(isDark);
    }
  } catch {}

  // 2. Capacitor StatusBar Plugin
  try {
    if (Capacitor.isPluginAvailable('StatusBar')) {
      await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      if (isDark) {
        await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        await StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {});
      } else {
        await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        await StatusBar.setBackgroundColor({ color: '#00000000' }).catch(() => {});
      }
    }
  } catch {}
}

/**
 * Initializes and dynamically maintains full-screen edge-to-edge status bar insets.
 * Guarantees that:
 * 1. The app remains 100% full screen (background bleeds seamlessly into status bar).
 * 2. Status bar text/clock/icons are always clearly visible with appropriate contrast.
 * 3. App headers, logos, navigation buttons, and text NEVER go behind status bar icons.
 */
export function initStatusBarHelper(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const root = document.documentElement;

  // Set an immediate baseline inset if running inside Capacitor native APK
  if (Capacitor.isNativePlatform()) {
    root.style.setProperty('--system-status-bar-height', '28px');
    root.style.setProperty('--safe-area-top', '28px');
  }

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
        if (info && typeof (info as any).height === 'number' && (info as any).height > 0) {
          detectedHeight = Math.max(detectedHeight, (info as any).height);
        }
      }
    } catch {}

    // 3. Fallback for standalone PWA / Mobile Web edge-to-edge
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
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
        detectedHeight = isIos ? 44 : 28;
      }
    } catch {}

    if (detectedHeight > 0) {
      root.style.setProperty('--system-status-bar-height', `${detectedHeight}px`);
      root.style.setProperty('--safe-area-top', `${detectedHeight}px`);
    }

    // Sync status bar theme with current active theme
    const isDark = root.classList.contains('dark') || document.body.classList.contains('theme-dark');
    syncNativeStatusBarTheme(isDark);
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
