import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  DailyNewsBulletin,
  DailyJanvaJevuBulletin,
  DailyPrashnotariBulletin,
  DailyInterestingFactsBulletin,
  DailyInterestingFact,
  DailyAbhivyaktiBulletin,
  DailyAbhivyaktiIdea,
  DailySuvicharBulletin,
  DailySuvicharItem,
  NewsItem,
  JanvaJevuQuestion,
} from '../types';
import { MASTER_JANVA_JEVU_POOL, WEEKLY_CORE_QUESTIONS } from '../data/janvaJevuData';
import { MASTER_NEWS_TOPICS } from '../data/newsTopicsData';
import { SUVICHAR_COLLECTION, RawSuvichar } from '../data/suvicharData';
import { MASTER_INTERESTING_FACTS_POOL } from '../data/interestingFactsData';
import { MASTER_ABHIVYAKTI_POOL } from '../data/abhivyaktiData';

// Gujarati numbers conversion helper
export function toGujaratiDigits(num: number | string): string {
  const gujaratiDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  return String(num).replace(/[0-9]/g, (d) => gujaratiDigits[parseInt(d, 10)]);
}

// Format Date in Gujarati
export function formatGujaratiDate(date: Date): string {
  const gujaratiMonths = [
    'જાન્યુઆરી',
    'ફેબ્રુઆરી',
    'માર્ચ',
    'એપ્રિલ',
    'મે',
    'જૂન',
    'જુલાઇ',
    'ઓગસ્ટ',
    'સપ્ટેમ્બર',
    'ઓક્ટોબર',
    'નવેમ્બર',
    'ડિસેમ્બર',
  ];

  const gujaratiDays = [
    'રવિવાર',
    'સોમવાર',
    'મંગળવાર',
    'બુધવાર',
    'ગુરુવાર',
    'શુક્રવાર',
    'શનિવાર',
  ];

  const day = toGujaratiDigits(date.getDate());
  const month = gujaratiMonths[date.getMonth()];
  const year = toGujaratiDigits(date.getFullYear());
  const weekday = gujaratiDays[date.getDay()];

  return `${day} ${month} ${year}, ${weekday}`;
}

/**
 * 5:00 AM Daily News Cycle:
 * - If current time is < 05:00 AM, the active edition is yesterday's 5:00 AM cycle.
 * - If current time is >= 05:00 AM, the active edition is today's 5:00 AM cycle.
 * - Next update time is always the upcoming 5:00 AM.
 */
export function getNewsCycleDateKey(now = new Date()): {
  dateKey: string;
  editionDate: string;
  nextUpdateTime: Date;
} {
  // Always calculate using Indian Standard Time (Asia/Kolkata)
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const current = new Date(istString);
  const hours = current.getHours();

  // Reference date for the edition
  const editionDate = new Date(current);
  if (hours < 5) {
    // Before 5 AM: use yesterday's date
    editionDate.setDate(editionDate.getDate() - 1);
  }

  const y = editionDate.getFullYear();
  const m = String(editionDate.getMonth() + 1).padStart(2, '0');
  const d = String(editionDate.getDate()).padStart(2, '0');
  const dateKey = `${y}-${m}-${d}`;

  // Next update is at 5:00 AM
  const nextUpdate = new Date(current);
  if (hours < 5) {
    nextUpdate.setHours(5, 0, 0, 0);
  } else {
    nextUpdate.setDate(nextUpdate.getDate() + 1);
    nextUpdate.setHours(5, 0, 0, 0);
  }

  return {
    dateKey,
    editionDate: formatGujaratiDate(editionDate),
    nextUpdateTime: nextUpdate,
  };
}

/**
 * 1:00 PM (13:00) Daily Janva Jevu Cycle:
 * - If current time is < 13:00 (1:00 PM), the active edition is yesterday's 1:00 PM cycle.
 * - If current time is >= 13:00, the active edition is today's 1:00 PM cycle.
 * - Next update time is always the upcoming 1:00 PM.
 */
export function getJanvaJevuCycleDateKey(now = new Date()): {
  dateKey: string;
  editionDate: string;
  nextUpdateTime: Date;
} {
  const current = new Date(now);
  const hours = current.getHours();

  // Reference date for the edition
  const editionDate = new Date(current);
  if (hours < 13) {
    // Before 1 PM: use yesterday's date
    editionDate.setDate(editionDate.getDate() - 1);
  }

  const y = editionDate.getFullYear();
  const m = String(editionDate.getMonth() + 1).padStart(2, '0');
  const d = String(editionDate.getDate()).padStart(2, '0');
  const dateKey = `${y}-${m}-${d}`;

  // Next update is at 1:00 PM (13:00)
  const nextUpdate = new Date(current);
  if (hours < 13) {
    nextUpdate.setHours(13, 0, 0, 0);
  } else {
    nextUpdate.setDate(nextUpdate.getDate() + 1);
    nextUpdate.setHours(13, 0, 0, 0);
  }

  return {
    dateKey,
    editionDate: formatGujaratiDate(editionDate),
    nextUpdateTime: nextUpdate,
  };
}

// Pseudo-random deterministic hash based on a string seed
function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate the 10 Daily News items deterministically for any date
export function generateDailyNewsItems(dateKey: string): NewsItem[] {
  const hash = stringToHash(`vidyalayam-news-${dateKey}`);
  const items: NewsItem[] = [];

  // Required categories: Kutch, Gujarat, India, World, Science/Education, Sports
  const categoryOrder: Array<{
    category: 'kutch' | 'gujarat' | 'india' | 'world' | 'science_education' | 'sports';
    label: string;
    count: number;
  }> = [
    { category: 'kutch', label: 'કચ્છ વિશેષ', count: 2 },
    { category: 'gujarat', label: 'ગુજરાત સમાચાર', count: 2 },
    { category: 'india', label: 'રાષ્ટ્રીય / ભારત', count: 2 },
    { category: 'world', label: 'વિશ્વ સમાચાર', count: 2 },
    { category: 'science_education', label: 'વિજ્ઞાન અને શિક્ષણ', count: 1 },
    { category: 'sports', label: 'રમતગમત અને યુવા', count: 1 },
  ];

  let itemIdx = 1;
  for (const cat of categoryOrder) {
    const pool = MASTER_NEWS_TOPICS[cat.category] || [];
    if (pool.length === 0) continue;

    for (let c = 0; c < cat.count; c++) {
      const selectedIndex = (hash + itemIdx * 7 + c * 13) % pool.length;
      const baseItem = pool[selectedIndex];
      items.push({
        id: `news-${dateKey}-${itemIdx}`,
        category: cat.category,
        categoryLabel: cat.label,
        headline: baseItem.headline,
        summary: baseItem.summary,
        impact: baseItem.impact,
        sourceDate: dateKey,
      });
      itemIdx++;
    }
  }

  return items.slice(0, 10);
}

/**
 * Generate 20 Daily GK / Janva Jevu Questions for any date:
 * - Selects 3-4 recurring weekly core questions randomly (as requested)
 * - Selects 16-17 date-rotated syllabus questions from Class 9-12
 */
export function generateDailyJanvaJevuQuestions(dateKey: string): JanvaJevuQuestion[] {
  const dateHash = stringToHash(`vidyalayam-gk-${dateKey}`);

  // Week seed for weekly recurring core questions
  const dateObj = new Date(dateKey);
  const weekNumber = Math.ceil((dateObj.getDate() + 6 - dateObj.getDay()) / 7);
  const weekSeed = stringToHash(`week-${dateObj.getFullYear()}-${dateObj.getMonth()}-${weekNumber}`);

  // Pick 3 or 4 weekly core revision questions
  const numCore = (dateHash % 2 === 0) ? 3 : 4;
  const coreQuestions: JanvaJevuQuestion[] = [];
  const coreIndicesUsed = new Set<number>();

  for (let i = 0; i < numCore; i++) {
    const idx = (weekSeed + i * 5 + dateHash % 7) % WEEKLY_CORE_QUESTIONS.length;
    if (!coreIndicesUsed.has(idx)) {
      coreIndicesUsed.add(idx);
      const q = WEEKLY_CORE_QUESTIONS[idx];
      coreQuestions.push({
        ...q,
        id: `gk-${dateKey}-core-${i + 1}`,
        questionNumber: 0, // will assign sequentially
        isWeeklyCoreRevision: true,
      });
    }
  }

  // Pick remaining questions from the master question pool (target total = 20)
  const remainingNeeded = 20 - coreQuestions.length;
  const regularQuestions: JanvaJevuQuestion[] = [];
  const poolIndicesUsed = new Set<number>();

  for (let step = 0; step < MASTER_JANVA_JEVU_POOL.length && regularQuestions.length < remainingNeeded; step++) {
    const idx = (dateHash + step * 11) % MASTER_JANVA_JEVU_POOL.length;
    if (!poolIndicesUsed.has(idx)) {
      poolIndicesUsed.add(idx);
      const item = MASTER_JANVA_JEVU_POOL[idx];
      regularQuestions.push({
        ...item,
        id: `gk-${dateKey}-reg-${regularQuestions.length + 1}`,
        questionNumber: 0,
        isWeeklyCoreRevision: false,
      });
    }
  }

  // Combine and interleave or sort neatly
  const combined = [...coreQuestions, ...regularQuestions].map((item, idx) => ({
    ...item,
    questionNumber: idx + 1,
  }));

  return combined.slice(0, 20);
}

/**
 * Fetch or generate Daily News Bulletin:
 * Prioritizes live real-time news from /api/daily-news (5:00 AM edition).
 * Falls back to Firestore, then deterministic algorithmic syllabus topics.
 */
export async function getDailyNewsBulletin(now = new Date(), forceRefresh = false): Promise<DailyNewsBulletin> {
  const { dateKey, editionDate, nextUpdateTime } = getNewsCycleDateKey(now);

  // 1. Prioritize real-time live news from /api/daily-news
  if (typeof window !== 'undefined' && window.fetch) {
    try {
      const url = `/api/daily-news?dateKey=${dateKey}${forceRefresh ? '&forceRefresh=true' : ''}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.bulletin && Array.isArray(data.bulletin.items) && data.bulletin.items.length >= 8) {
          // Sync to client Firestore in background if needed
          try {
            setDoc(doc(db, 'daily_news', dateKey), data.bulletin, { merge: true }).catch(() => {});
          } catch {}
          return data.bulletin;
        }
      }
    } catch (e) {
      console.warn('API /api/daily-news live fetch failed, trying Firestore:', e);
    }
  }

  // 2. Try Firestore
  try {
    const docRef = doc(db, 'daily_news', dateKey);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.items) && data.items.length >= 8) {
        return {
          id: dateKey,
          editionDate: data.editionDate || editionDate,
          dateKey,
          cycleTime: data.cycleTime || 'સવારે ૫:૦૦ વાગ્યે પ્રકાશિત',
          nextCycleTime: 'આવતીકાલે સવારે ૫:૦૦ વાગ્યે',
          nextUpdateTimeTimestamp: nextUpdateTime.getTime(),
          items: data.items,
          morningPrayerShloka: data.morningPrayerShloka,
        };
      }
    }
  } catch (err) {
    console.warn('Could not read from firestore daily_news, using algorithm:', err);
  }

  // 3. Fallback: Generate deterministically from master topics
  const items = generateDailyNewsItems(dateKey);
  const bulletin: DailyNewsBulletin = {
    id: dateKey,
    editionDate,
    dateKey,
    cycleTime: 'સવારે ૫:૦૦ વાગ્યે પ્રકાશિત',
    nextCycleTime: 'આવતીકાલે સવારે ૫:૦૦ વાગ્યે',
    nextUpdateTimeTimestamp: nextUpdateTime.getTime(),
    items,
    morningPrayerShloka: 'સર્વેભવન્તુ સુખિનઃ સર્વે સન્તુ નિરામયાઃ । સર્વે ભદ્રાણિ પશ્યન્તુ મા કશ્ચિદ્ દુઃખભાગ્ભવેત્ ॥',
  };

  // Cache to Firestore in background if possible
  try {
    setDoc(doc(db, 'daily_news', dateKey), bulletin, { merge: true }).catch(() => {});
  } catch (e) {
    // Ignore cache error
  }

  return bulletin;
}

/**
  * Non-repeating suvichar retrieval based on date and optional offset
  */
export function getSuvicharForDate(dateKey: string, offsetIndex = 0): RawSuvichar {
  const parts = dateKey.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = parts[1] || 1;
  const day = parts[2] || 1;
  const dayOfYear = Math.floor(
    (new Date(year, month - 1, day).getTime() - new Date(year, 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Guarantee non-repetition across the pool
  const index = Math.abs((year * 365 + dayOfYear + offsetIndex) % SUVICHAR_COLLECTION.length);
  return SUVICHAR_COLLECTION[index];
}

/**
  * Fetch or generate Daily Suvichar Bulletin:
  * Strict requirement:
  * - Heading: "Ajno suvichar"
  * - Random suvichar with great values
  * - Short explanation
  * - Example of it
  * - Non-repeating
  */
export async function getDailySuvicharBulletin(
  now = new Date(),
  offsetIndex = 0
): Promise<DailySuvicharBulletin> {
  const { dateKey, editionDate } = getNewsCycleDateKey(now);
  const raw = getSuvicharForDate(dateKey, offsetIndex);

  return {
    id: dateKey,
    editionDate,
    dateKey,
    cycleTime: 'દૈનિક પ્રેરણા વાણી (Daily Values)',
    suvichar: {
      id: raw.id,
      thought: raw.thought,
      authorOrSource: raw.authorOrSource,
      explanation: raw.explanation,
      example: raw.example,
      moralValue: raw.moralValue,
      keyPoints: raw.keyPoints,
    },
  };
}

/**
 * Fetch or generate Daily Janva Jevu Bulletin:
 * Tries Firestore first; if not present, generates deterministically.
 */
export async function getDailyJanvaJevuBulletin(now = new Date()): Promise<DailyJanvaJevuBulletin> {
  const { dateKey, editionDate, nextUpdateTime } = getJanvaJevuCycleDateKey(now);
  const rawSuvichar = getSuvicharForDate(dateKey);
  const dailySuvichar = rawSuvichar.thought;

  try {
    const docRef = doc(db, 'daily_janva_jevu', dateKey);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.questions) && data.questions.length >= 20) {
        return {
          id: dateKey,
          editionDate: data.editionDate || editionDate,
          dateKey,
          cycleTime: 'બપોરે ૧:૦૦ વાગ્યે પ્રકાશિત',
          nextCycleTime: 'આવતીકાલે બપોરે ૧:૦૦ વાગ્યે',
          nextUpdateTimeTimestamp: nextUpdateTime.getTime(),
          questions: data.questions,
          suvichar: data.suvichar || dailySuvichar,
        };
      }
    }
  } catch (err) {
    console.warn('Could not read from firestore daily_janva_jevu, using algorithm:', err);
  }

  // Generate deterministically
  const questions = generateDailyJanvaJevuQuestions(dateKey);
  const bulletin: DailyJanvaJevuBulletin = {
    id: dateKey,
    editionDate,
    dateKey,
    cycleTime: 'બપોરે ૧:૦૦ વાગ્યે પ્રકાશિત',
    nextCycleTime: 'આવતીકાલે બપોરે ૧:૦૦ વાગ્યે',
    nextUpdateTimeTimestamp: nextUpdateTime.getTime(),
    questions,
    suvichar: dailySuvichar,
  };

  // Cache to Firestore in background
  try {
    setDoc(doc(db, 'daily_janva_jevu', dateKey), bulletin, { merge: true }).catch(() => {});
  } catch (e) {
    // Ignore cache error
  }

  return bulletin;
}

// Alias for 20-Questions Daily Quiz (આજની પ્રશ્નોત્તરી)
export const getDailyPrashnotariBulletin = getDailyJanvaJevuBulletin;

/**
 * Generate exactly 12 interesting facts specifically tailored for Std 9 to 12
 * Rotates deterministically by dateKey
 */
export function generateDailyInterestingFacts(dateKey: string): DailyInterestingFact[] {
  const hash = stringToHash(`vidyalayam-facts-12-${dateKey}`);
  const pool = MASTER_INTERESTING_FACTS_POOL;
  const selected: DailyInterestingFact[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < pool.length && selected.length < 12; i++) {
    const idx = (hash + i * 17) % pool.length;
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      const item = pool[idx];
      selected.push({
        id: `fact-${dateKey}-${selected.length + 1}`,
        factNumber: selected.length + 1,
        title: item.title,
        fact: item.fact,
        category: item.category,
        whyItMatters: item.whyItMatters,
        relatedClass: item.relatedClass,
      });
    }
  }

  return selected.slice(0, 12);
}

/**
 * Fetch or generate Daily Interesting Facts Bulletin:
 * Updates daily at 1:00 PM (13:00) exactly as requested.
 */
export async function getDailyInterestingFactsBulletin(
  now = new Date()
): Promise<DailyInterestingFactsBulletin> {
  const { dateKey, editionDate, nextUpdateTime } = getJanvaJevuCycleDateKey(now);

  try {
    const docRef = doc(db, 'daily_interesting_facts', dateKey);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.facts) && data.facts.length >= 12) {
        return {
          id: dateKey,
          editionDate: data.editionDate || editionDate,
          dateKey,
          cycleTime: 'બપોરે ૧:૦૦ વાગ્યે પ્રકાશિત (રોજના ૧૨ રોમાંચક તથ્યો)',
          nextCycleTime: 'આવતીકાલે બપોરે ૧:૦૦ વાગ્યે',
          nextUpdateTimeTimestamp: nextUpdateTime.getTime(),
          facts: data.facts,
          dailyMotto: data.dailyMotto || 'જ્ઞાન એ જ સર્વોચ્ચ શક્તિ છે — રોજ ૧૨ નવા તથ્યો શીખો!',
        };
      }
    }
  } catch (err) {
    console.warn('Could not read from firestore daily_interesting_facts, generating:', err);
  }

  const facts = generateDailyInterestingFacts(dateKey);
  const bulletin: DailyInterestingFactsBulletin = {
    id: dateKey,
    editionDate,
    dateKey,
    cycleTime: 'બપોરે ૧:૦૦ વાગ્યે પ્રકાશિત (રોજના ૧૨ રોમાંચક તથ્યો)',
    nextCycleTime: 'આવતીકાલે બપોરે ૧:૦૦ વાગ્યે',
    nextUpdateTimeTimestamp: nextUpdateTime.getTime(),
    facts,
    dailyMotto: 'જ્ઞાન એ જ સર્વોચ્ચ શક્તિ છે — રોજ ૧૨ નવા તથ્યો શીખો!',
  };

  try {
    setDoc(doc(db, 'daily_interesting_facts', dateKey), bulletin, { merge: true }).catch(() => {});
  } catch (e) {}

  return bulletin;
}

/**
 * Generate Daily Abhivyakti Ideas for Prayer Assembly
 */
export function generateDailyAbhivyaktiIdeas(dateKey: string): DailyAbhivyaktiIdea[] {
  const hash = stringToHash(`vidyalayam-abhivyakti-${dateKey}`);
  const pool = MASTER_ABHIVYAKTI_POOL;
  const selected: DailyAbhivyaktiIdea[] = [];
  const used = new Set<number>();

  for (let i = 0; i < pool.length; i++) {
    const idx = (hash + i * 3) % pool.length;
    if (!used.has(idx)) {
      used.add(idx);
      selected.push(pool[idx]);
    }
  }

  return selected;
}

/**
 * Fetch or generate Daily Abhivyakti Bulletin
 */
export async function getDailyAbhivyaktiBulletin(
  now = new Date()
): Promise<DailyAbhivyaktiBulletin> {
  const { dateKey, editionDate } = getNewsCycleDateKey(now);

  try {
    const docRef = doc(db, 'daily_abhivyakti', dateKey);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.ideas) && data.ideas.length >= MASTER_ABHIVYAKTI_POOL.length) {
        return {
          id: dateKey,
          editionDate: data.editionDate || editionDate,
          dateKey,
          cycleTime: 'દૈનિક પ્રાર્થના સભા અભિવ્યક્તિ વિચારો',
          ideas: data.ideas,
        };
      }
    }
  } catch (err) {
    console.warn('Could not read from firestore daily_abhivyakti, generating:', err);
  }

  const ideas = generateDailyAbhivyaktiIdeas(dateKey);
  const bulletin: DailyAbhivyaktiBulletin = {
    id: dateKey,
    editionDate,
    dateKey,
    cycleTime: 'દૈનિક પ્રાર્થના સભા અભિવ્યક્તિ વિચારો',
    ideas,
  };

  try {
    setDoc(doc(db, 'daily_abhivyakti', dateKey), bulletin, { merge: true }).catch(() => {});
  } catch (e) {}

  return bulletin;
}
