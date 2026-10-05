/**
 * Unified Native & Web Notification Utilities for Vidyalayam
 * Supports:
 * 1. Native Android APK via AndroidBridge (Android 13+ POST_NOTIFICATIONS, System Channels & Intent)
 * 2. Progressive Web App / Modern Browser Notifications API
 */

export function isNativeAndroid(): boolean {
  try {
    return Boolean(typeof window !== 'undefined' && window.AndroidBridge && window.AndroidBridge.isAndroidApp?.());
  } catch (e) {
    return false;
  }
}

/**
 * Check whether notification permission is granted
 */
export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (isNativeAndroid()) {
    try {
      const granted = window.AndroidBridge!.hasNotificationPermission();
      return granted ? 'granted' : 'denied';
    } catch (e) {
      console.warn('[Notifications] AndroidBridge permission check failed:', e);
      return 'denied';
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }

  return 'denied';
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (isNativeAndroid()) {
    try {
      window.AndroidBridge!.requestNotificationPermission();
      // Wait briefly for system dialog to be handled
      await new Promise((r) => setTimeout(r, 600));
      const granted = window.AndroidBridge!.hasNotificationPermission();
      return granted ? 'granted' : 'denied';
    } catch (e) {
      console.warn('[Notifications] AndroidBridge request failed:', e);
      return 'denied';
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch (e) {
      console.warn('[Notifications] Web request failed:', e);
      return 'denied';
    }
  }

  return 'denied';
}

/**
 * Open the native Android notification settings screen directly
 */
export function openNotificationSettings(): void {
  if (isNativeAndroid()) {
    try {
      window.AndroidBridge!.openNotificationSettings();
      return;
    } catch (e) {
      console.warn('[Notifications] openNotificationSettings failed:', e);
    }
  }

  if (typeof window !== 'undefined') {
    console.info('[Notifications] Please enable notifications in your browser or device settings.');
  }
}

/**
 * Send an immediate push notification
 */
export async function sendNotification(
  title: string,
  body: string,
  type: 'general' | 'exam' | 'daily' | 'attendance' | 'alert' = 'general'
): Promise<boolean> {
  // 1. Android APK Native Notification
  if (isNativeAndroid()) {
    try {
      window.AndroidBridge!.showNativeNotification(title, body, type);
      return true;
    } catch (e) {
      console.warn('[Notifications] AndroidBridge showNotification failed:', e);
    }
  }

  // 2. Web Notification API
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/favicon-32x32.png',
          tag: `vidyalayam-${type}-${Date.now()}`,
        });
        return true;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/favicon-32x32.png',
            tag: `vidyalayam-${type}-${Date.now()}`,
          });
          return true;
        }
      }
    } catch (e) {
      console.warn('[Notifications] Web Notification dispatch failed:', e);
    }
  }

  return false;
}
