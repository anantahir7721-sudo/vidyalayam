import { sendNotification, requestNotificationPermission, checkNotificationPermission } from './notificationUtils';

export interface NotificationScheduleConfig {
  dailyMorningNews: boolean;    // 06:00 AM
  afternoonCirculars: boolean;  // 02:00 PM
  eveningQuiz: boolean;         // 06:00 PM
}

const SCHEDULE_STORAGE_KEY = 'vidyalayam_notif_schedules_v1';
const FIRST_LAUNCH_KEY = 'vidyalayam_first_launch_permissions_v1';

export function getNotificationSchedules(): NotificationScheduleConfig {
  try {
    const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {
    dailyMorningNews: true,
    afternoonCirculars: true,
    eveningQuiz: true,
  };
}

export function saveNotificationSchedules(config: NotificationScheduleConfig) {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {}
}

/**
 * Returns today's date string in YYYY-MM-DD format in IST
 */
function getTodayIstDateKey(): string {
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istNow = new Date(istString);
  const y = istNow.getFullYear();
  const m = String(istNow.getMonth() + 1).padStart(2, '0');
  const d = String(istNow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 06:00 AM: Trigger Today's Fresh School News & Morning Prayer Bulletin
 */
export async function triggerMorningNewsNotification(): Promise<boolean> {
  try {
    let headline = 'આજના શૈક્ષણિક અને રાજ્ય વર્તમાન પ્રવાહ સમાચાર પ્રસિદ્ધ';
    try {
      const res = await fetch('/api/daily-news');
      if (res.ok) {
        const json = await res.json();
        const topItem = json?.bulletin?.items?.[0];
        if (topItem && topItem.headline) {
          headline = topItem.headline;
        }
      }
    } catch {}

    const title = '📰 વિદ્યાલયમ • દૈનિક સવારના તાજા સમાચાર (06:00 AM)';
    const body = `${headline} • શાળા પ્રાર્થના અને વિદ્યાર્થી સામાન્ય જ્ઞાન બુલેટિન તૈયાર છે.`;
    return await sendNotification(title, body, 'daily');
  } catch (e) {
    console.warn('[Scheduler] Morning news notification failed:', e);
    return false;
  }
}

/**
 * 02:00 PM: Trigger Afternoon Circulars, GCERT & General Knowledge
 */
export async function triggerAfternoonCircularNotification(): Promise<boolean> {
  try {
    const title = '💡 વિદ્યાલયમ • બપોરનું સામાન્ય જ્ઞાન & પરિપત્ર (02:00 PM)';
    const body = 'GSEB/GCERT ના સત્તાવાર પરિપત્રો, વિજ્ઞાન પ્રોજેક્ટ્સ અને વિદ્યાર્થી જ્ઞાનવર્ધક અહેવાલ ઉપલબ્ધ છે.';
    return await sendNotification(title, body, 'general');
  } catch (e) {
    console.warn('[Scheduler] Afternoon circular notification failed:', e);
    return false;
  }
}

/**
 * 06:00 PM: Trigger Evening Daily Quiz, Study Revision & Thought
 */
export async function triggerEveningQuizNotification(): Promise<boolean> {
  try {
    const title = '✨ વિદ્યાલયમ • સાંજની પ્રશ્નોત્તરી & સંધ્યા સુવિચાર (06:00 PM)';
    const body = 'આજની દૈનિક પ્રશ્નોત્તરી (Daily Quiz) અને ગૃહકાર્ય રિવિઝન લાઈવ છે. તમારા જ્ઞાનની ચકાસણી કરો!';
    return await sendNotification(title, body, 'exam');
  } catch (e) {
    console.warn('[Scheduler] Evening quiz notification failed:', e);
    return false;
  }
}

/**
 * Initializes the automated 6 AM, 2 PM, 6 PM notification timers and first-launch permission check
 */
export function initNotificationScheduler(): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. First-time launch permission request
  try {
    const hasPrompted = localStorage.getItem(FIRST_LAUNCH_KEY);
    if (!hasPrompted) {
      localStorage.setItem(FIRST_LAUNCH_KEY, 'true');
      checkNotificationPermission().then((status) => {
        if (status === 'default' || status === 'denied') {
          // Delay briefly to allow main screen render
          setTimeout(() => {
            requestNotificationPermission();
          }, 1200);
        }
      });
    }
  } catch {}

  let timerIds: NodeJS.Timeout[] = [];

  const runSchedulerCheck = async () => {
    const schedules = getNotificationSchedules();
    const todayKey = getTodayIstDateKey();

    const now = new Date();
    const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istNow = new Date(istString);
    const hour = istNow.getHours();

    // 06:00 AM Slot (fires between 6 AM and 1:59 PM if not fired today)
    if (schedules.dailyMorningNews && hour >= 6 && hour < 14) {
      const lastMorning = localStorage.getItem('vidyalayam_last_notif_morning');
      if (lastMorning !== todayKey) {
        localStorage.setItem('vidyalayam_last_notif_morning', todayKey);
        await triggerMorningNewsNotification();
      }
    }

    // 02:00 PM Slot (fires between 2 PM and 5:59 PM if not fired today)
    if (schedules.afternoonCirculars && hour >= 14 && hour < 18) {
      const lastAfternoon = localStorage.getItem('vidyalayam_last_notif_afternoon');
      if (lastAfternoon !== todayKey) {
        localStorage.setItem('vidyalayam_last_notif_afternoon', todayKey);
        await triggerAfternoonCircularNotification();
      }
    }

    // 06:00 PM Slot (fires between 6 PM and 11:59 PM if not fired today)
    if (schedules.eveningQuiz && hour >= 18) {
      const lastEvening = localStorage.getItem('vidyalayam_last_notif_evening');
      if (lastEvening !== todayKey) {
        localStorage.setItem('vidyalayam_last_notif_evening', todayKey);
        await triggerEveningQuizNotification();
      }
    }

    // Calculate time until next target milestones (6 AM, 2 PM, 6 PM)
    scheduleNextAlarms();
  };

  const scheduleNextAlarms = () => {
    timerIds.forEach((id) => clearTimeout(id));
    timerIds = [];

    const now = new Date();
    const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istNow = new Date(istString);

    const targetHours = [6, 14, 18];
    targetHours.forEach((targetHour) => {
      const targetDate = new Date(istNow);
      targetDate.setHours(targetHour, 0, 0, 0);
      if (targetDate.getTime() <= istNow.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      const msUntil = Math.max(1000, targetDate.getTime() - istNow.getTime());
      const timerId = setTimeout(() => {
        runSchedulerCheck();
      }, msUntil);
      timerIds.push(timerId);
    });
  };

  // Immediate check on boot
  runSchedulerCheck();

  // Also check on visibility change (when app returns from background)
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      runSchedulerCheck();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    timerIds.forEach((id) => clearTimeout(id));
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
