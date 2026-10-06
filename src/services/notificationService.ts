import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AppNotification, AppNotificationCategory } from '../types';
import { sendNotification } from '../utils/notificationUtils';
import { apiUrl } from '../utils/apiConfig';

/**
 * Dispatch an individual in-app and push notification.
 * Saves to Firestore under school subcollection or global system collection.
 */
export async function createAppNotification(
  notif: Omit<AppNotification, 'id' | 'timestamp' | 'createdAt'> & { id?: string }
): Promise<string> {
  const timestamp = Date.now();
  const createdAt = new Date().toISOString();
  const docId = notif.id || `notif_${timestamp}_${Math.random().toString(36).slice(2, 7)}`;

  const notificationData: AppNotification = {
    ...notif,
    id: docId,
    timestamp,
    createdAt,
    read: false,
  };

  try {
    if (notif.targetType === 'admin' || !notif.schoolId) {
      // Global system notification (for admin)
      const docRef = doc(db, 'system_notifications', docId);
      await setDoc(docRef, notificationData);
    } else {
      // School-specific or student-specific notification
      const docRef = doc(db, 'schools', notif.schoolId, 'notifications', docId);
      await setDoc(docRef, notificationData);
    }
  } catch (err) {
    console.warn('[NotificationService] Firestore save error:', err);
  }

  // Also trigger local device push notification if appropriate
  try {
    let pushType: 'general' | 'exam' | 'daily' | 'attendance' | 'alert' = 'general';
    if (notif.category.includes('exam')) pushType = 'exam';
    else if (notif.category.includes('daily')) pushType = 'daily';
    else if (notif.category.includes('approval') || notif.category.includes('reset')) pushType = 'alert';

    sendNotification(notif.title, notif.body, pushType);
  } catch (e) {
    console.warn('[NotificationService] Push dispatch failed:', e);
  }

  return docId;
}

/**
 * Send customized, personalized notifications to multiple students at once.
 * Each student receives their own record containing their personal details.
 */
export async function createBulkStudentNotifications(
  schoolId: string,
  items: Array<{
    studentId: string;
    studentName: string;
    standard?: string;
    title: string;
    body: string;
    category: AppNotificationCategory;
    metadata?: Record<string, any>;
  }>
): Promise<number> {
  if (!items.length) return 0;

  const batch = writeBatch(db);
  const now = Date.now();
  const createdAt = new Date().toISOString();
  let count = 0;

  for (const item of items) {
    const docId = `sn_${now}_${item.studentId.slice(0, 6)}_${Math.random().toString(36).slice(2, 6)}`;
    const docRef = doc(db, 'schools', schoolId, 'notifications', docId);

    const record: AppNotification = {
      id: docId,
      title: item.title,
      body: item.body,
      targetType: 'student',
      targetId: item.studentId,
      studentName: item.studentName,
      schoolId,
      standard: item.standard,
      category: item.category,
      createdAt,
      timestamp: now,
      read: false,
      metadata: item.metadata,
    };

    batch.set(docRef, record);
    count++;
  }

  await batch.commit();

  // Trigger one crisp summary push notification on the device
  if (items.length > 0) {
    sendNotification(
      items[0].title,
      `${items.length} વિદ્યાર્થીઓને કસ્ટમ સૂચના સફળતાપૂર્વક મોકલવામાં આવી.`,
      items[0].category.includes('exam') ? 'exam' : 'general'
    );
  }

  return count;
}

/**
 * Subscribe to notifications tailored strictly for a specific student.
 */
export function subscribeToStudentNotifications(
  schoolId: string,
  studentId: string,
  callback: (notifications: AppNotification[]) => void
): () => void {
  if (!schoolId || !studentId) {
    callback([]);
    return () => {};
  }

  const notifsCol = collection(db, 'schools', schoolId, 'notifications');
  const q = query(
    notifsCol,
    where('targetId', '==', studentId),
    orderBy('timestamp', 'desc'),
    limit(40)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as AppNotification);
      callback(list);
    },
    (err) => {
      console.warn('[NotificationService] Student notif listen error:', err);
      // Fallback: try querying without orderby if index missing
      const fallbackQuery = query(notifsCol, where('targetId', '==', studentId), limit(40));
      onSnapshot(fallbackQuery, (snap) => {
        const list = snap.docs
          .map((d) => d.data() as AppNotification)
          .sort((a, b) => b.timestamp - a.timestamp);
        callback(list);
      });
    }
  );
}

/**
 * Subscribe to all notifications for a school (Admissions, circulars, etc.)
 */
export function subscribeToSchoolNotifications(
  schoolId: string,
  callback: (notifications: AppNotification[]) => void
): () => void {
  if (!schoolId) {
    callback([]);
    return () => {};
  }

  const notifsCol = collection(db, 'schools', schoolId, 'notifications');
  const q = query(notifsCol, limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => d.data() as AppNotification)
        .sort((a, b) => b.timestamp - a.timestamp);
      callback(list);
    },
    (err) => {
      console.warn('[NotificationService] School notif listen error:', err);
    }
  );
}

/**
 * Subscribe to system-level admin notifications (Password reset requests, new schools)
 */
export function subscribeToAdminNotifications(
  callback: (notifications: AppNotification[]) => void
): () => void {
  const systemNotifsCol = collection(db, 'system_notifications');
  const q = query(systemNotifsCol, limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => d.data() as AppNotification)
        .sort((a, b) => b.timestamp - a.timestamp);
      callback(list);
    },
    (err) => {
      console.warn('[NotificationService] Admin notif listen error:', err);
    }
  );
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  schoolId: string | null | undefined,
  notificationId: string
): Promise<void> {
  try {
    if (schoolId) {
      const docRef = doc(db, 'schools', schoolId, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } else {
      const docRef = doc(db, 'system_notifications', notificationId);
      await updateDoc(docRef, { read: true });
    }
  } catch (err) {
    console.warn('[NotificationService] markNotificationAsRead error:', err);
  }
}

/**
 * Mark all notifications in a list as read
 */
export async function markAllNotificationsAsRead(
  schoolId: string | null | undefined,
  notifications: AppNotification[]
): Promise<void> {
  const unreadList = notifications.filter((n) => !n.read);
  if (!unreadList.length) return;

  const batch = writeBatch(db);
  for (const n of unreadList) {
    const docRef = schoolId
      ? doc(db, 'schools', schoolId, 'notifications', n.id)
      : doc(db, 'system_notifications', n.id);
    batch.update(docRef, { read: true });
  }
  await batch.commit();
}

/**
 * Scheduled Notifications Engine:
 * 1. 06:00 AM: Fresh Daily News & Morning Prayer
 * 2. 02:00 PM: Daily Knowledge (Janva Jevu & Prashnotari)
 * 3. 06:00 PM: Evening Circular & Homework / Exam Alerts
 */
export function runScheduledNotificationCheck(): void {
  try {
    const prefsStr = localStorage.getItem('vidyalayam_notification_prefs');
    const prefs = prefsStr ? JSON.parse(prefsStr) : { dailyBulletin: true, examAlerts: true };

    const now = new Date();
    const hours = now.getHours();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 1. Morning 06:00 AM Slot (fires between 06:00 and 06:59 AM)
    if (hours >= 6 && hours < 8 && prefs.dailyBulletin !== false) {
      const morningSent = localStorage.getItem(`vidyalayam_sched_06am_${todayKey}`);
      if (!morningSent) {
        localStorage.setItem(`vidyalayam_sched_06am_${todayKey}`, 'true');
        // Fetch top headline if available
        fetch(apiUrl('/api/daily-news'))
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            const topItem = data?.bulletin?.items?.[0];
            const headline = topItem?.headline || 'શિક્ષણ અને સામાન્ય જ્ઞાનના આજના મહત્વના દૈનિક સમાચાર';
            sendNotification('📰 દૈનિક તાજા સમાચાર • વિદ્યાલયમ', `${headline}. સવારની પ્રાર્થના & સમાચાર તૈયાર છે.`, 'daily');
          })
          .catch(() => {
            sendNotification('📰 દૈનિક તાજા સમાચાર • વિદ્યાલયમ', 'આજના શિક્ષણ, વિજ્ઞાન અને જ્ઞાનવર્ધક તાજા સમાચાર ઉપલબ્ધ છે.', 'daily');
          });
      }
    }

    // 2. Afternoon 02:00 PM Slot (14:00 - 15:00)
    if (hours >= 14 && hours < 16 && prefs.dailyBulletin !== false) {
      const afternoonSent = localStorage.getItem(`vidyalayam_sched_02pm_${todayKey}`);
      if (!afternoonSent) {
        localStorage.setItem(`vidyalayam_sched_02pm_${todayKey}`, 'true');
        sendNotification(
          '💡 બપોરનું સામાન્ય જ્ઞાન & પ્રશ્નોત્તરી',
          'આજના ૧૨ રોચક તથ્યો અને ૨૦ પાઠ્યપુસ્તક પ્રશ્નોત્તરી વિદ્યાલયમ પોર્ટલ પર અપડેટ થઈ ગઈ છે.',
          'daily'
        );
      }
    }

    // 3. Evening 06:00 PM Slot (18:00 - 19:30)
    if (hours >= 18 && hours < 20) {
      const eveningSent = localStorage.getItem(`vidyalayam_sched_06pm_${todayKey}`);
      if (!eveningSent) {
        localStorage.setItem(`vidyalayam_sched_06pm_${todayKey}`, 'true');
        sendNotification(
          '🌆 સાંજનું શાળા પરિપત્ર & પરીક્ષા બુલેટિન',
          'આવતીકાલના શૈક્ષણિક આયોજન, પરિપત્રો અને એકમ કસોટીની વિગતો ચકાસો.',
          'general'
        );
      }
    }
  } catch (err) {
    console.warn('[NotificationService] Scheduled check error:', err);
  }
}

/**
 * 5-Minute Exam Countdown Monitor for Student
 */
export function checkUpcomingExamReminders(exams: any[]): void {
  if (!Array.isArray(exams) || exams.length === 0) return;
  const now = Date.now();

  for (const ex of exams) {
    if (!ex.scheduledStartTimestamp || ex.status === 'completed') continue;
    const diffMs = ex.scheduledStartTimestamp - now;
    const diffMinutes = Math.floor(diffMs / 60000);

    // Alert strictly when 4-5 minutes remain before start
    if (diffMinutes >= 4 && diffMinutes <= 5) {
      const alertKey = `exam_5min_alert_${ex.id}`;
      if (!sessionStorage.getItem(alertKey)) {
        sessionStorage.setItem(alertKey, 'true');
        sendNotification(
          '⏳ પરીક્ષા શરૂ થવામાં ૫ મિનિટ બાકી!',
          `${ex.subjectName || 'વિષય'} પરીક્ષા (${ex.title}) ૫ મિનિટમાં શરૂ થશે. પોર્ટલ પર તૈયાર રહો!`,
          'exam'
        );
      }
    }
  }
}
