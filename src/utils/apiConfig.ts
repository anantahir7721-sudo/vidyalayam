/**
 * Unified API Configuration for Web and Native Android Capacitor APK.
 * 
 * In Browser (Local Dev/Preview): Uses relative paths '/api/...'
 * In Native Android APK (Capacitor): Automatically routes '/api/...' to the live
 * Cloud Run backend URL so AI features (Gemini, presentations, daily news, notice board)
 * work seamlessly inside the installed APK!
 */

// Production live deployment URL for this applet
export const PRODUCTION_BACKEND_URL =
  'https://ais-pre-zfvtkxwqh2zdkbq5lhk34q-908899511909.asia-southeast1.run.app';

/**
 * Detect if running inside a native mobile container (Capacitor Android/iOS)
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isCapacitorNative = Boolean((window as any).Capacitor?.isNativePlatform?.());
    const isAndroidBridge = Boolean((window as any).AndroidBridge);
    const isCapacitorProtocol = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
    const isLocalhostWithoutPort = window.location.hostname === 'localhost' && !window.location.port;

    return isCapacitorNative || isAndroidBridge || isCapacitorProtocol || isLocalhostWithoutPort;
  } catch {
    return false;
  }
}

/**
 * Get active API base URL
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // 1. Check custom configured server URL in localStorage
  try {
    const custom = localStorage.getItem('vidyalayam_server_url');
    if (custom && custom.startsWith('http')) {
      return custom.replace(/\/+$/, '');
    }
  } catch {}

  // 2. If running inside Native Capacitor APK on mobile device
  if (isNativeApp()) {
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    return (envUrl || PRODUCTION_BACKEND_URL).replace(/\/+$/, '');
  }

  // 3. Web SPA - relative URL
  return '';
}

/**
 * Format full URL for any API endpoint
 */
export function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${clean}` : clean;
}
