/**
 * Notification Scheduler Utility for Vidyalayam
 * Automatically manages scheduled routine notifications:
 * - 06:00 AM Morning News Bulletin & Prayer
 * - 02:00 PM Afternoon Knowledge & Quiz
 * - 06:00 PM Evening Circular & Exam Reminders
 * 
 * Works across Native Android APK and Modern Web / PWA environments.
 */

import { runScheduledNotificationCheck } from '../services/notificationService';

let schedulerIntervalId: ReturnType<typeof setInterval> | null = null;
let isSchedulerInitialized = false;

/**
 * Trigger immediate check for pending scheduled notifications
 */
export function triggerScheduledCheck(): void {
  try {
    runScheduledNotificationCheck();
  } catch (error) {
    console.warn('[NotificationScheduler] Failed to run scheduled check:', error);
  }
}

/**
 * Initialize the global notification scheduler
 * Runs an immediate check and sets up recurring intervals as well as
 * event listeners for app resume / visibility change.
 */
export function initNotificationScheduler(): void {
  if (typeof window === 'undefined') return;
  if (isSchedulerInitialized) return;

  isSchedulerInitialized = true;

  // Run initial check once page is loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(triggerScheduledCheck, 1500);
  } else {
    window.addEventListener(
      'DOMContentLoaded',
      () => {
        setTimeout(triggerScheduledCheck, 1500);
      },
      { once: true }
    );
  }

  // Periodic recurring check every 30 seconds
  if (!schedulerIntervalId) {
    schedulerIntervalId = setInterval(() => {
      triggerScheduledCheck();
    }, 30000);
  }

  // Check whenever user switches back to the application tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerScheduledCheck();
    }
  });

  // Check when window gains focus
  window.addEventListener('focus', () => {
    triggerScheduledCheck();
  });

  // Check when device comes back online
  window.addEventListener('online', () => {
    triggerScheduledCheck();
  });
}

/**
 * Clear the notification scheduler interval if needed
 */
export function stopNotificationScheduler(): void {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
  }
  isSchedulerInitialized = false;
}
