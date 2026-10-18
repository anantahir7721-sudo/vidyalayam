/**
 * Online Exam Status & Lifecycle Utilities
 *
 * Provides definitive, authoritative checks for exam status:
 * - Upcoming / Scheduled
 * - Currently Live (strictly within official start time and duration + 10 min cutoff on the scheduled date)
 * - Concluded / Expired (date in the past e.g. yesterday, or elapsed past scheduled window + cutoff)
 */

export interface ExamTimeInfo {
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledStartTimestamp?: number;
  durationMinutes?: number;
  status?: string;
}

/**
 * Returns YYYY-MM-DD formatted date string in Indian Standard Time (IST) or local fallback.
 */
export function getLocalDateString(dateInput: Date | number = new Date()): string {
  const d = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d); // Returns 'YYYY-MM-DD'
  } catch {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Resolves reliable epoch milliseconds timestamp for an exam's scheduled start.
 * Uses IST timezone parsing to ensure seamless cross-platform parity between browser and server.
 */
export function getExamStartTimestamp(exam: ExamTimeInfo | null | undefined): number | null {
  if (!exam) return null;

  if (
    typeof exam.scheduledStartTimestamp === 'number' &&
    !isNaN(exam.scheduledStartTimestamp) &&
    exam.scheduledStartTimestamp > 0
  ) {
    return exam.scheduledStartTimestamp;
  }

  if (exam.scheduledDate) {
    const time = exam.scheduledStartTime && exam.scheduledStartTime.trim() ? exam.scheduledStartTime.trim() : '00:00';
    // Try parsing with IST timezone offset (+05:30)
    const istParsed = new Date(`${exam.scheduledDate}T${time}:00+05:30`).getTime();
    if (!isNaN(istParsed)) return istParsed;

    const fallbackParsed = new Date(`${exam.scheduledDate}T${time}:00`).getTime();
    if (!isNaN(fallbackParsed)) return fallbackParsed;
  }

  return null;
}

/**
 * Resolves epoch milliseconds for an exam's scheduled end time.
 */
export function getExamEndTimestamp(exam: ExamTimeInfo | null | undefined): number | null {
  const start = getExamStartTimestamp(exam);
  if (!start) return null;
  const durationMs = (Number(exam?.durationMinutes) || 30) * 60 * 1000;
  return start + durationMs;
}

/**
 * Resolves hard cutoff timestamp (end time + grace period, default 10 minutes).
 */
export function getExamCutoffTimestamp(
  exam: ExamTimeInfo | null | undefined,
  graceMinutes: number = 10
): number | null {
  const end = getExamEndTimestamp(exam);
  if (!end) return null;
  return end + graceMinutes * 60 * 1000;
}

/**
 * Determines whether an exam has concluded / expired.
 * True if:
 * 1. Marked completed or cancelled.
 * 2. Scheduled date is strictly before today's date in IST (yesterday or earlier).
 * 3. Scheduled window + cutoff time has elapsed.
 */
export function isExamConcluded(exam: ExamTimeInfo | null | undefined, nowMs: number = Date.now()): boolean {
  if (!exam) return true;
  if (exam.status === 'completed' || exam.status === 'cancelled') return true;

  const todayStr = getLocalDateString(nowMs);

  // If the scheduled date is before today, the exam is permanently concluded
  if (exam.scheduledDate && exam.scheduledDate < todayStr) {
    return true;
  }

  // Check cutoff timestamp
  const cutoff = getExamCutoffTimestamp(exam, 10);
  if (cutoff && nowMs > cutoff) {
    return true;
  }

  // Check end timestamp with fallback buffer
  const end = getExamEndTimestamp(exam);
  if (end && nowMs > end + 10 * 60 * 1000) {
    return true;
  }

  return false;
}

/**
 * Determines whether an exam is currently LIVE.
 * An exam can ONLY be live if:
 * 1. Not concluded / not expired / not cancelled / not draft.
 * 2. Scheduled date is NOT in the past (must be today or future).
 * 3. Current time is >= scheduled start time AND <= cutoff time.
 */
export function isExamLive(exam: ExamTimeInfo | null | undefined, nowMs: number = Date.now()): boolean {
  if (!exam) return false;
  if (exam.status === 'draft' || exam.status === 'cancelled') return false;
  if (isExamConcluded(exam, nowMs)) return false;

  const todayStr = getLocalDateString(nowMs);
  if (exam.scheduledDate && exam.scheduledDate < todayStr) {
    return false;
  }

  const start = getExamStartTimestamp(exam);
  const cutoff = getExamCutoffTimestamp(exam, 10);

  if (start && cutoff) {
    return nowMs >= start && nowMs <= cutoff;
  }

  if (start) {
    const durationMs = (Number(exam.durationMinutes) || 30) * 60 * 1000;
    return nowMs >= start && nowMs <= start + durationMs + 10 * 60 * 1000;
  }

  // If no start timestamp could be extracted, only explicit 'live' status on today's date
  return exam.status === 'live' && (!exam.scheduledDate || exam.scheduledDate === todayStr);
}

/**
 * Determines whether an exam is upcoming (scheduled for future time).
 */
export function isExamUpcoming(exam: ExamTimeInfo | null | undefined, nowMs: number = Date.now()): boolean {
  if (!exam) return false;
  if (exam.status === 'draft' || exam.status === 'cancelled') return false;
  if (isExamConcluded(exam, nowMs)) return false;
  if (isExamLive(exam, nowMs)) return false;

  const start = getExamStartTimestamp(exam);
  if (start) {
    return nowMs < start;
  }

  const todayStr = getLocalDateString(nowMs);
  if (exam.scheduledDate && exam.scheduledDate > todayStr) {
    return true;
  }

  return exam.status === 'scheduled';
}

/**
 * Returns computed authoritative status:
 * 'completed' | 'live' | 'scheduled' | 'draft' | 'cancelled'
 */
export function getEffectiveExamStatus(
  exam: ExamTimeInfo | null | undefined,
  nowMs: number = Date.now()
): 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled' {
  if (!exam) return 'completed';
  if (exam.status === 'draft' || exam.status === 'cancelled') return exam.status;
  if (isExamConcluded(exam, nowMs)) return 'completed';
  if (isExamLive(exam, nowMs)) return 'live';
  if (isExamUpcoming(exam, nowMs)) return 'scheduled';
  return 'completed';
}
