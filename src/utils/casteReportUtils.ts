import { Student } from '../types';

export type CasteCategory = 'SEBC' | 'SC' | 'ST' | 'અન્ય';

export interface StandardCasteCounts {
  standard: string; // '9', '10', '11', '12'
  standardLabel: string; // 'ધોરણ - ૯', etc.
  sebc: { boy: number; girl: number; other: number; total: number };
  sc: { boy: number; girl: number; other: number; total: number };
  st: { boy: number; girl: number; other: number; total: number };
  other: { boy: number; girl: number; other: number; total: number };
  total: { boy: number; girl: number; other: number; total: number };
}

export interface CasteSummaryData {
  standards: StandardCasteCounts[];
  grandTotal: {
    sebc: { boy: number; girl: number; other: number; total: number };
    sc: { boy: number; girl: number; other: number; total: number };
    st: { boy: number; girl: number; other: number; total: number };
    other: { boy: number; girl: number; other: number; total: number };
    total: { boy: number; girl: number; other: number; total: number };
  };
}

/**
 * Normalizes raw caste strings from Excel/UDISE/User entries into exactly 4 categories:
 * 'SEBC', 'SC', 'ST', or 'અન્ય' (General / Open / Others)
 */
export function normalizeCasteCategory(raw?: string): CasteCategory {
  if (!raw) return 'અન્ય';
  const val = String(raw).trim().toUpperCase();

  // 1. SEBC / OBC / Baxipanch
  if (
    val === 'SEBC' ||
    val === 'OBC' ||
    val.includes('SEBC') ||
    val.includes('OBC') ||
    val.includes('બક્ષી') ||
    val.includes('સા.શૈ.પ') ||
    val.includes('સામાજિક') ||
    val.includes('ઓબીસી') ||
    val.includes('એસઈબીસી')
  ) {
    return 'SEBC';
  }

  // 2. SC (Scheduled Caste / અનુસૂચિત જાતિ)
  if (
    val === 'SC' ||
    val.includes('SC') ||
    val.includes('એસસી') ||
    val.includes('અનુસૂચિત જાતિ') ||
    val.includes('SCHEDULED CASTE')
  ) {
    // Avoid false positive if string is 'ST' or 'GENERAL'
    if (!val.includes('ST') && !val.includes('GEN')) {
      return 'SC';
    }
  }

  // 3. ST (Scheduled Tribe / અનુસૂચિત જનજાતિ / આદિજાતિ)
  if (
    val === 'ST' ||
    val.includes('ST') ||
    val.includes('એસટી') ||
    val.includes('અનુસૂચિત જનજાતિ') ||
    val.includes('આદિજાતિ') ||
    val.includes('SCHEDULED TRIBE')
  ) {
    return 'ST';
  }

  // 4. Everything else defaults to 'અન્ય' (General, Open, None, Empty, etc.)
  return 'અન્ય';
}

/**
 * Normalizes student gender to Boy, Girl, or Other
 */
export function normalizeGenderType(gender?: string): 'boy' | 'girl' | 'other' {
  if (!gender) return 'boy'; // default
  const g = String(gender).trim().toLowerCase();
  if (
    g === 'girl' ||
    g === 'female' ||
    g === 'f' ||
    g === 'કન્યા' ||
    g === 'સ્ત્રી' ||
    g === 'છોકરી'
  ) {
    return 'girl';
  }
  if (g === 'other' || g === 'અન્ય') {
    return 'other';
  }
  return 'boy';
}

/**
 * Calculates caste and gender breakdown across Standards 9, 10, 11, 12
 */
export function calculateCasteSummary(students: Student[]): CasteSummaryData {
  const stdKeys: Array<{ key: string; label: string }> = [
    { key: '9', label: 'ધોરણ - ૯' },
    { key: '10', label: 'ધોરણ - ૧૦' },
    { key: '11', label: 'ધોરણ - ૧૧' },
    { key: '12', label: 'ધોરણ - ૧૨' },
  ];

  const createEmptyRow = (key: string, label: string): StandardCasteCounts => ({
    standard: key,
    standardLabel: label,
    sebc: { boy: 0, girl: 0, other: 0, total: 0 },
    sc: { boy: 0, girl: 0, other: 0, total: 0 },
    st: { boy: 0, girl: 0, other: 0, total: 0 },
    other: { boy: 0, girl: 0, other: 0, total: 0 },
    total: { boy: 0, girl: 0, other: 0, total: 0 },
  });

  const standardsMap: Record<string, StandardCasteCounts> = {
    '9': createEmptyRow('9', 'ધોરણ - ૯'),
    '10': createEmptyRow('10', 'ધોરણ - ૧૦'),
    '11': createEmptyRow('11', 'ધોરણ - ૧૧'),
    '12': createEmptyRow('12', 'ધોરણ - ૧૨'),
  };

  const grandTotal = {
    sebc: { boy: 0, girl: 0, other: 0, total: 0 },
    sc: { boy: 0, girl: 0, other: 0, total: 0 },
    st: { boy: 0, girl: 0, other: 0, total: 0 },
    other: { boy: 0, girl: 0, other: 0, total: 0 },
    total: { boy: 0, girl: 0, other: 0, total: 0 },
  };

  for (const st of students) {
    // Normalize standard (e.g. 'Class 9' -> '9')
    const stdClean = String(st.standard || '').replace(/^class\s*/i, '').trim();
    if (!standardsMap[stdClean]) {
      // If student standard is outside 9-12 or slightly different, map if possible
      continue;
    }

    const row = standardsMap[stdClean];
    const casteCat = normalizeCasteCategory(st.caste);
    const gender = normalizeGenderType(st.gender);

    // Helper to increment
    const increment = (cat: 'sebc' | 'sc' | 'st' | 'other') => {
      if (gender === 'boy') {
        row[cat].boy++;
        row.total.boy++;
        grandTotal[cat].boy++;
        grandTotal.total.boy++;
      } else if (gender === 'girl') {
        row[cat].girl++;
        row.total.girl++;
        grandTotal[cat].girl++;
        grandTotal.total.girl++;
      } else {
        row[cat].other++;
        row.total.other++;
        grandTotal[cat].other++;
        grandTotal.total.other++;
      }
      row[cat].total++;
      row.total.total++;
      grandTotal[cat].total++;
      grandTotal.total.total++;
    };

    if (casteCat === 'SEBC') increment('sebc');
    else if (casteCat === 'SC') increment('sc');
    else if (casteCat === 'ST') increment('st');
    else increment('other');
  }

  return {
    standards: stdKeys.map((item) => standardsMap[item.key]),
    grandTotal,
  };
}
