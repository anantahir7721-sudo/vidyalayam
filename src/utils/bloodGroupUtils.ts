import { Student } from '../types';

/**
 * Standard accepted Human Blood Groups
 */
export const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;
export const COMMON_BLOOD_GROUPS = VALID_BLOOD_GROUPS;
export type ValidBloodGroup = typeof VALID_BLOOD_GROUPS[number];

/**
 * Checks if a string is strictly a valid canonical blood group
 */
export function isValidBloodGroup(val: any): val is ValidBloodGroup {
  if (!val || typeof val !== 'string') return false;
  return (VALID_BLOOD_GROUPS as readonly string[]).includes(val.trim().toUpperCase());
}

/**
 * Normalizes and validates any blood group input.
 * Handles:
 * - Direct matches: A+, B+, O+, AB+, A-, B-, O-, AB-
 * - Case insensitivity: 'b+', 'a+', 'o-', 'ab+'
 * - Spacing: 'B +', 'O -', 'AB +'
 * - Suffixes: 'B+ve', 'B-ve', 'O Positive', 'A Negative', 'AB Pos', 'B POSITIVE'
 * - UDISE+ standard numeric codes:
 *     1 = A+, 2 = A-, 3 = B+, 4 = B-, 5 = O+, 6 = O-, 7 = AB+, 8 = AB-
 * - Gujarati spellings: 'બી પોઝિટિવ', 'ઓ પોઝિટિવ', 'એ પોઝિટિવ', 'એબી પોઝિટિવ', etc.
 *
 * Rejects and returns undefined for:
 * - Mediums: 'Gujarati', 'English', 'Hindi', etc.
 * - Castes: 'General', 'SEBC', 'SC', 'ST', 'OBC', 'EWS', etc.
 * - Yes / No flags: 'Yes', 'No', 'True', 'False', 'Y', 'N'
 * - Gender: 'Boy', 'Girl', 'Male', 'Female'
 * - Invalid text: Dates, mobile numbers, names, addresses, 'Pass', 'Promoted', etc.
 * - UDISE Unknown / Under investigation: '9', 'Under Investigation', 'Unknown', 'NA', '-'
 */
export function cleanAndNormalizeBloodGroup(raw: any): ValidBloodGroup | undefined {
  if (raw === undefined || raw === null) return undefined;
  let str = String(raw).trim();
  if (!str || str === '-' || str === '--' || str === 'NA' || str === 'N/A' || str === 'null' || str === 'undefined') {
    return undefined;
  }

  // Check UDISE+ numeric codes
  if (str === '1') return 'A+';
  if (str === '2') return 'A-';
  if (str === '3') return 'B+';
  if (str === '4') return 'B-';
  if (str === '5') return 'O+';
  if (str === '6') return 'O-';
  if (str === '7') return 'AB+';
  if (str === '8') return 'AB-';
  if (str === '9') return undefined; // Code 9 = Unknown / Under Investigation

  // Known invalid non-blood terms to reject immediately
  const lower = str.toLowerCase();
  if (
    lower.includes('gujarati') ||
    lower.includes('ગુજરાતી') ||
    lower.includes('english') ||
    lower.includes('અંગ્રેજી') ||
    lower.includes('hindi') ||
    lower.includes('હિન્દી') ||
    lower.includes('general') ||
    lower.includes('sebc') ||
    lower.includes('obc') ||
    lower.includes('sc') && lower.length <= 3 ||
    lower.includes('st') && lower.length <= 3 ||
    lower === 'yes' ||
    lower === 'no' ||
    lower === 'y' ||
    lower === 'n' ||
    lower === 'હા' ||
    lower === 'ના' ||
    lower === 'boy' ||
    lower === 'girl' ||
    lower === 'male' ||
    lower === 'female' ||
    lower.includes('investigation') ||
    lower.includes('unknown') ||
    lower.includes('not known') ||
    lower.includes('promoted') ||
    lower.includes('pass') ||
    lower.includes('fail') ||
    lower.includes('direct') ||
    /^\d{4,}$/.test(str) // phone or year or 4+ digits
  ) {
    return undefined;
  }

  // Gujarati script blood group conversions
  if (lower.includes('બી પોઝિટિવ') || lower.includes('બી +') || lower.includes('બી+')) return 'B+';
  if (lower.includes('બી નેગેટિવ') || lower.includes('બી -') || lower.includes('બી-')) return 'B-';
  if (lower.includes('એ પોઝિટિવ') || lower.includes('એ +') || lower.includes('એ+')) return 'A+';
  if (lower.includes('એ નેગેટિવ') || lower.includes('એ -') || lower.includes('એ-')) return 'A-';
  if (lower.includes('ઓ પોઝિટિવ') || lower.includes('ઓ +') || lower.includes('ઓ+')) return 'O+';
  if (lower.includes('ઓ નેગેટિવ') || lower.includes('ઓ -') || lower.includes('ઓ-')) return 'O-';
  if (lower.includes('એબી પોઝિટિવ') || lower.includes('એબી +') || lower.includes('એબી+')) return 'AB+';
  if (lower.includes('એબી નેગેટિવ') || lower.includes('એબી -') || lower.includes('એબી-')) return 'AB-';

  // Normalize English text
  let cleaned = str
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/POSITIVE|POS|\+VE/g, '+')
    .replace(/NEGATIVE|NEG|\-VE/g, '-');

  // Check direct matches
  if (cleaned === 'A+' || cleaned === 'A-') return cleaned as ValidBloodGroup;
  if (cleaned === 'B+' || cleaned === 'B-') return cleaned as ValidBloodGroup;
  if (cleaned === 'O+' || cleaned === 'O-') return cleaned as ValidBloodGroup;
  if (cleaned === 'AB+' || cleaned === 'AB-') return cleaned as ValidBloodGroup;

  // Check patterns like '(A+)', 'A +', 'Blood Group: B+'
  const match = cleaned.match(/\b(AB|A|B|O)[\+\-]\b/);
  if (match) {
    return match[0] as ValidBloodGroup;
  }

  return undefined;
}

/**
 * Categorizes an invalid entry in bloodGroup so we can migrate it to the correct field
 */
export function inspectInvalidBloodGroupEntry(rawVal: string): {
  targetField?: 'medium' | 'caste' | 'gender';
  migratedValue?: string;
  reason: string;
} {
  const trimmed = rawVal.trim();
  const lower = trimmed.toLowerCase();

  // Medium detection
  if (lower.includes('gujarati') || lower.includes('ગુજરાતી')) {
    return { targetField: 'medium', migratedValue: 'Gujarati', reason: 'ભાષા / માધ્યમ (Medium) માં ખસેડાયું' };
  }
  if (lower.includes('english') || lower.includes('અંગ્રેજી')) {
    return { targetField: 'medium', migratedValue: 'English', reason: 'ભાષા / માધ્યમ (Medium) માં ખસેડાયું' };
  }
  if (lower.includes('hindi') || lower.includes('હિન્દી')) {
    return { targetField: 'medium', migratedValue: 'Hindi', reason: 'ભાષા / માધ્યમ (Medium) માં ખસેડાયું' };
  }

  // Caste detection
  if (lower.includes('general') || lower === 'gen') {
    return { targetField: 'caste', migratedValue: 'General', reason: 'જ્ઞાતિ (Caste) માં ખસેડાયું' };
  }
  if (lower.includes('sebc') || lower.includes('obc')) {
    return { targetField: 'caste', migratedValue: 'SEBC', reason: 'જ્ઞાતિ (Caste) માં ખસેડાયું' };
  }
  if (lower === 'sc') {
    return { targetField: 'caste', migratedValue: 'SC', reason: 'જ્ઞાતિ (Caste) માં ખસેડાયું' };
  }
  if (lower === 'st') {
    return { targetField: 'caste', migratedValue: 'ST', reason: 'જ્ઞાતિ (Caste) માં ખસેડાયું' };
  }

  // Gender detection
  if (lower === 'boy' || lower === 'male' || lower === 'કુમાર') {
    return { targetField: 'gender', migratedValue: 'Boy', reason: 'જાતિ (Gender) માં ખસેડાયું' };
  }
  if (lower === 'girl' || lower === 'female' || lower === 'કન્યા') {
    return { targetField: 'gender', migratedValue: 'Girl', reason: 'જાતિ (Gender) માં ખસેડાયું' };
  }

  return { reason: 'અમાન્ય ડેટા સાફ કરવામાં આવ્યો (Cleared invalid non-blood value)' };
}

/**
 * Result of diagnosing a single student's blood group field
 */
export interface StudentBloodDiagnostic {
  student: Student;
  status: 'valid' | 'empty' | 'normalized' | 'invalid_cleared' | 'misplaced_recovered';
  oldBloodGroup?: string;
  newBloodGroup?: string;
  recoveredFromField?: string;
  cleanRollNumber?: boolean;
  fixedSection?: string;
  fixedDob?: string;
  migratedToField?: string;
  migratedValue?: string;
  description: string;
}

export type BloodGroupDiagnosis = StudentBloodDiagnostic;

/**
 * Checks if a string looks like a date (DD/MM/YYYY, YYYY-MM-DD, etc.)
 */
export function isDateLikeString(val?: string): boolean {
  if (!val) return false;
  const s = String(val).trim();
  return (
    /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/.test(s) ||
    /^(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/.test(s)
  );
}

/**
 * Analyzes a student record to see if bloodGroup is corrupted, misplaced, or cleanable.
 * Specifically detects if a blood group was mistakenly placed in rollNumber, or if
 * section/DOB were shifted during imports.
 */
export function diagnoseStudentBloodGroup(student: Student): StudentBloodDiagnostic {
  const rawBlood = student.bloodGroup ? student.bloodGroup.trim() : '';

  // Critical Check: Check if rollNumber accidentally contains a Blood Group!
  // e.g. rollNumber is "O+", "B+", "A+", etc. Roll numbers should NEVER be blood groups.
  const rollAsBlood = student.rollNumber ? cleanAndNormalizeBloodGroup(student.rollNumber) : undefined;
  if (rollAsBlood) {
    const isSectionDate = isDateLikeString(student.section);
    return {
      student,
      status: 'misplaced_recovered',
      oldBloodGroup: rawBlood || undefined,
      newBloodGroup: rollAsBlood,
      recoveredFromField: 'rollNumber',
      cleanRollNumber: true,
      fixedSection: isSectionDate ? 'A' : undefined,
      fixedDob: isSectionDate ? student.section : undefined,
      description: `રોલ નં (${student.rollNumber}) માં બ્લડ ગ્રૂપ હોવાથી તે "${rollAsBlood}" તરીકે સુધાર્યું અને રોલ નં ખાલી કર્યો`,
    };
  }

  // Case 1: bloodGroup is empty
  if (!rawBlood) {
    // Check if any other field accidentally has a valid blood group!
    const candidateFields: Array<{ name: string; val?: string }> = [
      { name: 'rollNumber', val: student.rollNumber },
      { name: 'medium', val: student.medium },
      { name: 'caste', val: student.caste },
      { name: 'cwsnDisability', val: student.cwsnDisability },
      { name: 'placeOfBirth', val: student.placeOfBirth },
      { name: 'section', val: student.section },
    ];

    for (const cand of candidateFields) {
      if (cand.val && cleanAndNormalizeBloodGroup(cand.val)) {
        const blood = cleanAndNormalizeBloodGroup(cand.val)!;
        return {
          student,
          status: 'misplaced_recovered',
          oldBloodGroup: undefined,
          newBloodGroup: blood,
          recoveredFromField: cand.name,
          cleanRollNumber: cand.name === 'rollNumber',
          fixedSection: cand.name === 'section' ? 'A' : undefined,
          description: `અન્ય ફીલ્ડ (${cand.name}: "${cand.val}") માંથી બ્લડ ગ્રૂપ "${blood}" મળ્યું`,
        };
      }
    }

    return {
      student,
      status: 'empty',
      oldBloodGroup: undefined,
      newBloodGroup: undefined,
      description: 'બ્લડ ગ્રૂપ નોંધાયેલ નથી (Not Specified)',
    };
  }

  // Case 2: rawBlood is already perfectly valid
  if (isValidBloodGroup(rawBlood)) {
    return {
      student,
      status: 'valid',
      oldBloodGroup: rawBlood,
      newBloodGroup: rawBlood,
      description: 'યોગ્ય બ્લડ ગ્રૂપ (Valid)',
    };
  }

  // Case 3: rawBlood can be normalized (e.g. 'b+', 'B +ve', '1', 'o positive')
  const normalized = cleanAndNormalizeBloodGroup(rawBlood);
  if (normalized) {
    return {
      student,
      status: 'normalized',
      oldBloodGroup: rawBlood,
      newBloodGroup: normalized,
      description: `"${rawBlood}" ને પ્રમાણિત "${normalized}" માં ફેરવવામાં આવ્યું`,
    };
  }

  // Case 4: rawBlood is NOT a blood group (e.g. "Gujarati", "General", "Yes", "No", etc.)
  const inspection = inspectInvalidBloodGroupEntry(rawBlood);
  return {
    student,
    status: 'invalid_cleared',
    oldBloodGroup: rawBlood,
    newBloodGroup: undefined,
    migratedToField: inspection.targetField,
    migratedValue: inspection.migratedValue,
    description: `અયોગ્ય એન્ટ્રી "${rawBlood}" બ્લડ ગ્રૂપમાંથી દૂર કરી ${inspection.reason}`,
  };
}
