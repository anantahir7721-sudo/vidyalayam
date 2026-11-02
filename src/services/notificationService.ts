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
import { sendNotification, isNativeAndroid, scheduleNativeRoutineAlarms } from '../utils/notificationUtils';
import { apiUrl } from '../utils/apiConfig';

// Helper: deeply strip undefined values so Firestore never throws 'Unsupported field value: undefined'
function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = cleanPayload(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

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

  const notificationData = cleanPayload({
    ...notif,
    id: docId,
    timestamp,
    createdAt,
    read: false,
  });

  try {
    if (notif.targetType === 'admin' || !notif.schoolId) {
      // Global system notification (for admin)
      const docRef = doc(db, 'system_notifications', docId);
      await setDoc(docRef, notificationData);
    } else {
      // School-specific or student-specific notification
      const cleanSchoolId = (notif.schoolId || '').trim();
      const docRef = doc(db, 'schools', cleanSchoolId, 'notifications', docId);
      await setDoc(docRef, notificationData);
    }
  } catch (err) {
    console.warn('[NotificationService] Firestore save error:', err);
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
  const cleanSchoolId = (schoolId || '').trim();
  if (!cleanSchoolId || !items.length) {
    console.warn('[NotificationService] Missing schoolId or empty items');
    return 0;
  }

  const now = Date.now();
  const createdAt = new Date().toISOString();
  let totalSaved = 0;

  // Chunk items into slices of 100 to stay safely below Firestore's limits
  const CHUNK_SIZE = 100;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    try {
      const batch = writeBatch(db);

      for (const item of chunk) {
        const safeStudentId = (item.studentId || 'st').trim();
        const docId = `sn_${now}_${safeStudentId.slice(0, 8)}_${Math.random().toString(36).slice(2, 7)}`;
        const docRef = doc(db, 'schools', cleanSchoolId, 'notifications', docId);

        const record: Record<string, any> = {
          id: docId,
          title: item.title || 'સૂચના',
          body: item.body || '',
          targetType: 'student',
          targetId: safeStudentId,
          studentName: item.studentName || 'વિદ્યાર્થી',
          schoolId: cleanSchoolId,
          standard: item.standard ? String(item.standard).replace(/^class\s*/i, '') : '',
          category: item.category || 'general_notice',
          createdAt,
          timestamp: now,
          read: false,
        };

        if (item.metadata && typeof item.metadata === 'object') {
          record.metadata = cleanPayload(item.metadata);
        }

        batch.set(docRef, cleanPayload(record));
      }

      await batch.commit();
      totalSaved += chunk.length;
    } catch (batchErr) {
      console.warn('[NotificationService] Batch commit error, falling back to individual writes:', batchErr);
      // Fallback: commit individually if batch was blocked or partially timed out
      for (const item of chunk) {
        try {
          const safeStudentId = (item.studentId || 'st').trim();
          const docId = `sn_${now}_${safeStudentId.slice(0, 8)}_${Math.random().toString(36).slice(2, 7)}`;
          const docRef = doc(db, 'schools', cleanSchoolId, 'notifications', docId);

          const record: Record<string, any> = {
            id: docId,
            title: item.title || 'સૂચના',
            body: item.body || '',
            targetType: 'student',
            targetId: safeStudentId,
            studentName: item.studentName || 'વિદ્યાર્થી',
            schoolId: cleanSchoolId,
            standard: item.standard ? String(item.standard).replace(/^class\s*/i, '') : '',
            category: item.category || 'general_notice',
            createdAt,
            timestamp: now,
            read: false,
          };

          if (item.metadata && typeof item.metadata === 'object') {
            record.metadata = cleanPayload(item.metadata);
          }

          await setDoc(docRef, cleanPayload(record));
          totalSaved++;
        } catch (singleErr) {
          console.warn('[NotificationService] Single doc fallback error:', singleErr);
        }
      }
    }
  }



  return totalSaved || items.length;
}

/**
 * Subscribe to notifications tailored strictly for a specific student.
 */
export function subscribeToStudentNotifications(
  schoolId: string,
  studentId: string,
  callback: (notifications: AppNotification[]) => void,
  studentExtra?: { grNumber?: string; standard?: string; diseCode?: string }
): () => void {
  const cleanSchoolId = (schoolId || '').trim();
  const cleanStudentId = (studentId || '').trim();
  if (!cleanSchoolId || !cleanStudentId) {
    callback([]);
    return () => {};
  }

  const cleanStd = studentExtra?.standard ? String(studentExtra.standard).trim().replace(/^class\s*/i, '') : '';
  const cleanGr = (studentExtra?.grNumber || '').toString().trim().toLowerCase();
  const cleanDise = (studentExtra?.diseCode || '').toString().trim().toLowerCase();

  const notifsCol = collection(db, 'schools', cleanSchoolId, 'notifications');
  const q = query(notifsCol, limit(100));

  let isInitialLoad = true;
  const notifiedIds = new Set<string>();

  // Helper to test if a notification belongs to this student
  const isStudentNotification = (n: any): boolean => {
    const tType = n.targetType;
    const tId = (n.targetId || '').toString().trim();
    const sId = (n.studentId || '').toString().trim();
    const stStd = (n.standard || '').toString().trim().replace(/^class\s*/i, '');
    const gr = (n.grNumber || '').toString().trim().toLowerCase();

    // Broadcasts to all or entire school
    if (tId === 'all' || tType === 'school') {
      if (!stStd || stStd === cleanStd) return true;
    }
    // Standard-wide alert (e.g. 'std_9' or '9')
    if (cleanStd && (tId === cleanStd || tId === `std_${cleanStd}` || stStd === cleanStd)) {
      return true;
    }
    // Targeted directly by studentId
    if (tId === cleanStudentId || sId === cleanStudentId) return true;
    // Targeted by GR number
    if (cleanGr && (tId.toLowerCase() === cleanGr || gr === cleanGr)) return true;
    // Targeted by DISE code
    if (cleanDise && tId.toLowerCase() === cleanDise) return true;

    return false;
  };

  const unsubFirestore = onSnapshot(
    q,
    (snapshot) => {
      const allDocs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
      const list = allDocs
        .filter(isStudentNotification)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      callback(list);

      // On initial load:
      // If there are recent unread exam/result notifications (< 24 hours), pop the notification once!
      if (isInitialLoad) {
        isInitialLoad = false;
        const recentUnread = list.find((n) => {
          if (n.read) return false;
          const isRecent = Date.now() - (n.timestamp || 0) < 24 * 60 * 60 * 1000;
          if (!isRecent) return false;
          const cat = (n.category || '').toLowerCase();
          const t = (n.title || '').toLowerCase();
          return cat.includes('result') || cat.includes('exam') || t.includes('પરિણામ') || t.includes('ગુણ');
        });

        if (recentUnread) {
          const alertKey = `vidyalayam_shown_alert_${recentUnread.id}`;
          if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(alertKey)) {
            sessionStorage.setItem(alertKey, 'true');
            sendNotification(recentUnread.title, recentUnread.body, 'exam');
          }
        }

        list.forEach((n) => notifiedIds.add(n.id));
        return;
      }

      // In-session real-time arrival:
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = { id: change.doc.id, ...change.doc.data() } as AppNotification;
          if (isStudentNotification(notif) && !notif.read && !notifiedIds.has(notif.id)) {
            notifiedIds.add(notif.id);
            const cat = (notif.category || '').toLowerCase();
            const t = (notif.title || '').toLowerCase();
            const isExamOrResult =
              cat.includes('exam') ||
              cat.includes('result') ||
              t.includes('exam') ||
              t.includes('result') ||
              t.includes('પરીક્ષા') ||
              t.includes('પરિણામ') ||
              t.includes('ગુણ') ||
              t.includes('marks');

            if (isExamOrResult) {
              sendNotification(notif.title, notif.body, 'exam');
            }
          }
        }
      });
    },
    (err) => {
      console.warn('[NotificationService] Student notif listen error:', err);
    }
  );

  // Local window event listener for instantaneous notifications across tabs
  const handleLocalResultPublish = (e: any) => {
    const detail = e.detail;
    if (detail && detail.schoolId === cleanSchoolId) {
      const pubStd = String(detail.standard || '').trim().replace(/^class\s*/i, '');
      if (!pubStd || pubStd === cleanStd) {
        sendNotification(detail.title, detail.body, 'exam');
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('vidyalayam_result_published', handleLocalResultPublish);
  }

  return () => {
    unsubFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('vidyalayam_result_published', handleLocalResultPublish);
    }
  };
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
    // If native Android APK:
    // Scheduled background routine notifications (06:00 AM news, 02:00 PM janva jevu/suvichar, 06:00 PM circular)
    // are executed on time directly by the Android OS AlarmManager (NotificationAlarmReceiver)
    // even when the application is completely closed or screen is off.
    // Therefore, do NOT pop duplicate routine notifications when the user opens the app!
    if (isNativeAndroid()) {
      scheduleNativeRoutineAlarms();
      return;
    }

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

/**
 * Dispatch Push & In-App Notification when school releases exam results (Whole Exam or Individual Subject).
 * Deep links directly to the specific exam result tab in Student Portal!
 */
export async function notifyResultRelease(params: {
  schoolId: string;
  schoolName: string;
  standard: string;
  examId: string;
  examName: string;
  subjectName?: string;
  isWholeExam?: boolean;
  students: Array<{ id: string; studentName: string; grNumber?: string }>;
}): Promise<number> {
  const { schoolId, schoolName, standard, examId, examName, subjectName, isWholeExam, students } = params;
  if (!schoolId || !standard || !students.length) return 0;

  const isWhole = Boolean(isWholeExam);
  const title = isWhole
    ? `📢 ${examName} નું પરિણામ જાહેર થયેલ છે!`
    : `📝 ${examName} - ${subjectName || 'વિષય'} ના ગુણ જાહેર થયા!`;

  const body = isWhole
    ? `ધોરણ ${standard} નું ${examName} નું સત્તાવાર પરિણામ અને માર્કશીટ જાહેર કરવામાં આવી છે. ટકાવારી અને ગુણ જોવા અહીં ક્લિક કરો.`
    : `ધોરણ ${standard} ના વિદ્યાર્થીઓ માટે ${examName} માં ${subjectName || 'વિષય'} ના ગુણ જાહેર થયા છે. ગુણ જોવા અહીં ક્લિક કરો.`;

  // 1. Send native browser / android push notification
  try {
    sendNotification(title, body, 'exam');
  } catch (e) {
    console.warn('[NotificationService] push trigger note:', e);
  }

  // 2. Dispatch personalized notifications to all students of this standard
  const items = students.map((st) => ({
    studentId: st.id,
    studentName: st.studentName,
    standard,
    title,
    body,
    category: 'exam_result' as const,
    metadata: {
      examId,
      standard,
      subjectName: subjectName || '',
      isWholeExam: isWhole,
      action: 'open_result',
    },
  }));

  const count = await createBulkStudentNotifications(schoolId, items);

  // 3. Also post a school/standard-wide alert so student sessions immediately receive real-time push
  try {
    await createAppNotification({
      title,
      body,
      targetType: 'school',
      targetId: standard ? `std_${standard}` : 'all',
      schoolId,
      schoolName,
      standard,
      category: 'exam_result',
      actionTab: 'result',
      metadata: {
        examId,
        standard,
        subjectName: subjectName || '',
        isWholeExam: isWhole,
        action: 'open_result',
      },
    });
  } catch {}

  // 4. Dispatch local window event so student sessions in any open tab/browser instantly show notification
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('vidyalayam_result_published', {
        detail: { schoolId, standard, examId, subjectName, isWholeExam, title, body },
      })
    );
  }

  return count;
}

