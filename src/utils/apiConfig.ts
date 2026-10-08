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

// Development live deployment URL for this applet (fallback)
export const DEV_BACKEND_URL =
  'https://ais-dev-zfvtkxwqh2zdkbq5lhk34q-908899511909.asia-southeast1.run.app';

/**
 * Detect if running inside a native mobile container (Capacitor Android/iOS)
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isCapacitorNative = Boolean((window as any).Capacitor?.isNativePlatform?.());
    const isAndroidBridge = Boolean((window as any).AndroidBridge);
    const isCapacitorProtocol =
      window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
    const isLocalhostWithoutPort =
      window.location.hostname === 'localhost' && !window.location.port;

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

/**
 * Resilient fetch wrapper that works identically on Web and Native Android APK.
 * Features built-in timeout, mobile connection tolerance, and automatic fallback
 * between Cloud Run deployments if the primary host is temporarily unresponsive.
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 45000
): Promise<Response> {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // In Web browser (local or preview), direct relative fetch is optimal
  if (!isNativeApp()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const mergedSignal = options.signal || controller.signal;
      return await fetch(clean, { ...options, signal: mergedSignal });
    } finally {
      clearTimeout(timer);
    }
  }

  // In Native Android APK, route to live cloud backend with auto-failover
  const primaryBase = getApiBaseUrl();
  const secondaryBase =
    primaryBase === PRODUCTION_BACKEND_URL ? DEV_BACKEND_URL : PRODUCTION_BACKEND_URL;

  const targetUrls = [
    `${primaryBase}${clean}`,
    ...(secondaryBase ? [`${secondaryBase}${clean}`] : []),
  ];

  let lastError: any = null;
  for (let i = 0; i < targetUrls.length; i++) {
    const targetUrl = targetUrls[i];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const mergedSignal = options.signal || controller.signal;
      const res = await fetch(targetUrl, {
        ...options,
        signal: mergedSignal,
      });
      return res;
    } catch (err: any) {
      lastError = err;
      if (options.signal?.aborted) throw err;
      console.warn(`[APK Network] Fallback attempt from ${targetUrl} due to:`, err?.message || err);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error(`Network request failed for ${clean}`);
}
