import { Student, MarkRecord } from '../types';

export interface Class9SubjectDef {
  id: string;
  code: string;
  nameGu: string;
  nameEn: string;
  isMainSubject: boolean; // true = 7 main subjects (700M); false = 3 additional subjects (1000M)
  hasFirstSecondExam: boolean; // true for 7 main subjects; false for 3 additional subjects
}

// 7 Official GSEB Main Subjects for Class 9
export const CLASS_9_MAIN_SUBJECTS: Class9SubjectDef[] = [
  { id: 'gujarati', code: '01', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati (FL)', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'maths', code: '12', nameGu: 'ગણિત', nameEn: 'Mathematics', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'science', code: '11', nameGu: 'વિજ્ઞાન અને ટેકનોલોજી', nameEn: 'Science & Technology', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'social_science', code: '10', nameGu: 'સામાજિક વિજ્ઞાન', nameEn: 'Social Science', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'english', code: '16', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English (SL)', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'hindi_sanskrit', code: '14', nameGu: 'હિન્દી / સંસ્કૃત', nameEn: 'Hindi / Sanskrit', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'pe_yoga', code: '40', nameGu: 'શારીરિક શિક્ષણ અને યોગ', nameEn: 'P.E. & Yoga', isMainSubject: true, hasFirstSecondExam: true },
];

// 3 Additional Subjects for Class 9 (Used in 1000M format: Annual 80 + Internal 20 = 100)
export const CLASS_9_ADDITIONAL_SUBJECTS: Class9SubjectDef[] = [
  { id: 'art_drawing', code: '41', nameGu: 'ચિત્રકામ / સંગીત (કળા શિક્ષણ)', nameEn: 'Art / Music', isMainSubject: false, hasFirstSecondExam: false },
  { id: 'computer_studies', code: '42', nameGu: 'કમ્પ્યુટર અધ્યયન', nameEn: 'Computer Studies', isMainSubject: false, hasFirstSecondExam: false },
  { id: 'vocational_work', code: '43', nameGu: 'ઉદ્યોગ / કાર્ય અનુભવ', nameEn: 'Vocational / Work Exp.', isMainSubject: false, hasFirstSecondExam: false },
];

export const ALL_CLASS_9_SUBJECTS: Class9SubjectDef[] = [
  ...CLASS_9_MAIN_SUBJECTS,
  ...CLASS_9_ADDITIONAL_SUBJECTS,
];

export type Class9ExamType =
  | 'first_exam' // પ્રથમ પરીક્ષા (50M)
  | 'second_exam' // દ્વિતીય પરીક્ષા (50M)
  | 'periodic_test_1' // સામાયિક કસોટી ૧ (25M -> 5M)
  | 'periodic_test_2' // સામાયિક કસોટી ૨ (25M -> 5M)
  | 'internal_assessment' // આંતરિક મૂલ્યાંકન (20M: PT1(5) + PT2(5) + Notebook(5) + Competency(5))
  | 'annual_exam' // વાર્ષિક પરીક્ષા (80M)
  | 'final_marksheet' // આખરી ગુણપત્રક (200 -> 100)
  | 'annual_result_700' // વાર્ષિક પરિણામ — ૭૦૦ ગુણ
  | 'annual_result_1000'; // વાર્ષિક પરિણામ — ૧૦૦૦ ગુણ

export interface ExamInfo {
  id: Class9ExamType;
  nameGu: string;
  nameEn: string;
  maxMarksPerSubject: number;
  totalMax: number;
  description: string;
}

export const CLASS_9_EXAM_CONFIGS: Record<Class9ExamType, ExamInfo> = {
  first_exam: {
    id: 'first_exam',
    nameGu: 'પ્રથમ પરીક્ષા',
    nameEn: 'First Exam',
    maxMarksPerSubject: 50,
    totalMax: 350,
    description: '૭ મુખ્ય વિષયો • વિષય દીઠ ૫૦ ગુણ • કુલ ૩૫૦ ગુણ',
  },
  second_exam: {
    id: 'second_exam',
    nameGu: 'દ્વિતીય પરીક્ષા',
    nameEn: 'Second Exam',
    maxMarksPerSubject: 50,
    totalMax: 350,
    description: '૭ મુખ્ય વિષયો • વિષય દીઠ ૫૦ ગુણ • કુલ ૩૫૦ ગુણ',
  },
  periodic_test_1: {
    id: 'periodic_test_1',
    nameGu: 'સામાયિક કસોટી - ૧ (PT 1)',
    nameEn: 'Periodic Test 1',
    maxMarksPerSubject: 25,
    totalMax: 175,
    description: 'વિષય દીઠ ૨૫ ગુણ • આંતરિક મૂલ્યાંકન માટે ૫ ગુણમાં રૂપાંતર (ગુણ / ૫)',
  },
  periodic_test_2: {
    id: 'periodic_test_2',
    nameGu: 'સામાયિક કસોટી - ૨ (PT 2)',
    nameEn: 'Periodic Test 2',
    maxMarksPerSubject: 25,
    totalMax: 175,
    description: 'વિષય દીઠ ૨૫ ગુણ • આંતરિક મૂલ્યાંકન માટે ૫ ગુણમાં રૂપાંતર (ગુણ / ૫)',
  },
  internal_assessment: {
    id: 'internal_assessment',
    nameGu: 'આંતરિક મૂલ્યાંકન',
    nameEn: 'Internal Marks',
    maxMarksPerSubject: 20,
    totalMax: 140,
    description: 'વિષય દીઠ ૨૦ ગુણ: PT1 (૫) + PT2 (૫) + નોટબુક (૫) + વિષય સજ્જતા (૫)',
  },
  annual_exam: {
    id: 'annual_exam',
    nameGu: 'વાર્ષિક પરીક્ષા',
    nameEn: 'Annual Exam',
    maxMarksPerSubject: 80,
    totalMax: 560,
    description: 'મુખ્ય વિષયો • વિષય દીઠ ૮૦ ગુણ',
  },
  final_marksheet: {
    id: 'final_marksheet',
    nameGu: 'આખરી ગુણપત્રક (૨૦૦ → ૧૦૦)',
    nameEn: 'Final Marksheet',
    maxMarksPerSubject: 100,
    totalMax: 700,
    description: 'પ્રથમ (૫૦) + દ્વિતીય (૫૦) + વાર્ષિક (૮૦) + આંતરિક (૨૦) = ૨૦૦ → ૧૦૦ (ભાગ્યા ૨)',
  },
  annual_result_700: {
    id: 'annual_result_700',
    nameGu: 'વાર્ષિક પરિણામ (૭૦૦ ગુણ)',
    nameEn: 'Annual Result (700M)',
    maxMarksPerSubject: 100,
    totalMax: 700,
    description: '૭ મુખ્ય વિષયો • ૧૦૦ ગુણ લેખે કુલ ૭૦૦ ગુણ • સિદ્ધિ/કૃપા ગુણ અને રેન્ક',
  },
  annual_result_1000: {
    id: 'annual_result_1000',
    nameGu: 'વાર્ષિક પરિણામ (૧૦૦૦ ગુણ)',
    nameEn: 'Annual Result (1000M)',
    maxMarksPerSubject: 100,
    totalMax: 1000,
    description: '૧૦ વિષયો (૭ મુખ્ય ૨૦૦/૨ + ૩ વધારાના ૮૦+૨૦) • કુલ ૧૦૦૦ ગુણ',
  },
};

/**
 * Converts Periodic Test marks (out of 25) to Internal component (out of 5).
 * Formula: Converted marks = Test marks / 5
 * Example: 19 / 5 = 3.8
 */
export function convertPeriodicTestTo5(marks25: number | string | null | undefined): number | null {
  if (marks25 === null || marks25 === undefined || marks25 === '') return null;
  if (typeof marks25 === 'string' && marks25.trim().toUpperCase() === 'AB') return 0;
  const num = typeof marks25 === 'number' ? marks25 : parseFloat(marks25.toString().trim());
  if (isNaN(num)) return null;
  const clamped = Math.max(0, Math.min(25, num));
  return Math.round((clamped / 5) * 10) / 10;
}

/**
 * Calculates total internal marks out of 20 per subject.
 * Components:
 * 1. PT 1 converted: max 5
 * 2. PT 2 converted: max 5
 * 3. Subject Competency: max 5
 * 4. Notebook Submission: max 5
 * Total: 20
 */
export function calculateInternalTotal(
  pt1Conv: number | null,
  pt2Conv: number | null,
  competency: number | null,
  notebook: number | null
): { total: number | null; isComplete: boolean } {
  const parts = [pt1Conv, pt2Conv, competency, notebook];
  const filled = parts.filter((p) => p !== null) as number[];
  if (filled.length === 0) return { total: null, isComplete: false };
  const sum = filled.reduce((acc, v) => acc + v, 0);
  const roundedSum = Math.round(sum * 10) / 10;
  return {
    total: Math.min(20, roundedSum),
    isComplete: filled.length === 4,
  };
}

/**
 * Calculates Final Converted Mark out of 100 for a Main Subject:
 * Combined marks = First Exam (50) + Second Exam (50) + Annual Exam (80) + Internal Marks (20) = 200
 * Converted marks out of 100 = Combined marks / 2
 */
export function calculateMainSubjectFinal100(
  first50: number | null,
  second50: number | null,
  annual80: number | null,
  internal20: number | null
): { combined200: number | null; converted100: number | null; isComplete: boolean } {
  const isFilled = (v: number | null) => v !== null && !isNaN(v);
  const anyEntered = isFilled(first50) || isFilled(second50) || isFilled(annual80) || isFilled(internal20);
  if (!anyEntered) {
    return { combined200: null, converted100: null, isComplete: false };
  }

  const f = first50 ?? 0;
  const s = second50 ?? 0;
  const a = annual80 ?? 0;
  const i = internal20 ?? 0;

  const combined = f + s + a + i;
  const converted = Math.round((combined / 2) * 10) / 10;
  const isComplete = isFilled(first50) && isFilled(second50) && isFilled(annual80) && isFilled(internal20);

  return {
    combined200: Math.round(combined * 10) / 10,
    converted100: Math.round(converted),
    isComplete,
  };
}

/**
 * Calculates Final Converted Mark out of 100 for an Additional Subject:
 * Annual Exam (80) + Internal Marks (20) = 100
 * Does NOT include First or Second Exam marks.
 */
export function calculateAdditionalSubjectFinal100(
  annual80: number | null,
  internal20: number | null
): { converted100: number | null; isComplete: boolean } {
  const isFilled = (v: number | null) => v !== null && !isNaN(v);
  const anyEntered = isFilled(annual80) || isFilled(internal20);
  if (!anyEntered) {
    return { converted100: null, isComplete: false };
  }

  const a = annual80 ?? 0;
  const i = internal20 ?? 0;
  const total = a + i;
  const isComplete = isFilled(annual80) && isFilled(internal20);

  return {
    converted100: Math.min(100, Math.round(total)),
    isComplete,
  };
}

/**
 * GSEB Official 8-Point Grading Scale:
 * 91-100: A1
 * 81-90:  A2
 * 71-80:  B1
 * 61-70:  B2
 * 51-60:  C1
 * 41-50:  C2
 * 33-40:  D (Passing threshold)
 * 21-32:  E1 (Needs Improvement)
 * 0-20:   E2 (Needs Improvement)
 */
export function calculateGsebGrade(marks: number | null, maxMarks: number = 100): string {
  if (marks === null || isNaN(marks) || maxMarks <= 0) return '-';
  const pct = (marks / maxMarks) * 100;
  if (pct >= 91) return 'A1';
  if (pct >= 81) return 'A2';
  if (pct >= 71) return 'B1';
  if (pct >= 61) return 'B2';
  if (pct >= 51) return 'C1';
  if (pct >= 41) return 'C2';
  if (pct >= 33) return 'D';
  if (pct >= 21) return 'E1';
  return 'E2';
}

export interface StudentSubjectScoreClass9 {
  subject: Class9SubjectDef;
  first50: number | null;
  second50: number | null;
  pt1_raw: number | null;
  pt1_conv: number | null;
  pt2_raw: number | null;
  pt2_conv: number | null;
  competency: number | null;
  notebook: number | null;
  internal20: number | null;
  annual80: number | null;
  combined200: number | null;
  converted100: number | null; // Raw converted out of 100 before grace
  siddhiGiven: number; // # marks
  krupaGiven: number; // * marks
  finalMarksWithGrace: number | null; // Display marks with grace (e.g. 33)
  grade: string;
  isPassed: boolean; // >= 33
  isEligibleForPromotion: boolean; // >= 25 marks rule from workbook
  hasUnenteredMarks: boolean;
}

export interface StudentResultClass9 {
  student: Student;
  rollNumber: string;
  grNumber: string;
  section: string;
  format: '700' | '1000';
  scores: StudentSubjectScoreClass9[];
  totalObtained: number; // Sum of final marks across subjects
  totalMax: number; // 700 or 1000
  percentage: number;
  overallGrade: string;
  overallResult: 'PASS' | 'PASS_WITH_SIDDHI' | 'PASS_WITH_KRUPA' | 'NEEDS_IMPROVEMENT';
  overallResultGu: string;
  isEligibleForPromotion: boolean; // false if any subject < 25
  isEligibleForRank: boolean; // true for Direct Pass & Siddhi; false for Krupa & Fail
  siddhiPoolEarned: number;
  totalSiddhiUsed: number;
  totalKrupaUsed: number;
  rank?: number;
  hasIncompleteMarks: boolean;
}

/**
 * Extracts numeric value or null from MarkRecord
 */
function extractMarkValue(records: MarkRecord[], subjectId: string, examMatches: (examType: string) => boolean): number | null {
  const found = records.find((m) => {
    const sId = (m.subjectId || '').toLowerCase();
    const subMatch = sId === subjectId.toLowerCase() || sId.includes(subjectId.toLowerCase());
    return subMatch && examMatches((m.examType || '').toLowerCase());
  });
  if (!found) return null;
  if (found.overallGrade === 'AB') return 0;
  return found.totalObtained !== undefined ? found.totalObtained : null;
}

/**
 * Computes full Class 9 Annual Result for an individual student.
 * Supports:
 * - format = '700': 7 main subjects (max 700)
 * - format = '1000': 7 main subjects + 3 additional subjects (max 1000)
 * - Siddhi & Krupa grace calculation:
 *   - Student with < 25 marks in a subject is NOT eligible for promotion.
 *   - Siddhi Pool: 1 mark per % above 33% (max 15).
 *   - Krupa Pool: max 10 marks by Principal.
 */
export function computeClass9StudentResult(
  student: Student,
  studentMarks: MarkRecord[],
  format: '700' | '1000' = '700',
  manualGraceOverrides?: Record<string, { siddhi?: number; krupa?: number }>
): StudentResultClass9 {
  const subjectsToUse = format === '1000' ? ALL_CLASS_9_SUBJECTS : CLASS_9_MAIN_SUBJECTS;

  const rawScores: {
    subject: Class9SubjectDef;
    first50: number | null;
    second50: number | null;
    pt1_raw: number | null;
    pt1_conv: number | null;
    pt2_raw: number | null;
    pt2_conv: number | null;
    competency: number | null;
    notebook: number | null;
    internal20: number | null;
    annual80: number | null;
    combined200: number | null;
    converted100: number | null;
    hasUnenteredMarks: boolean;
  }[] = [];

  for (const subj of subjectsToUse) {
    // 1. First Exam (50M)
    const first50 = subj.hasFirstSecondExam
      ? extractMarkValue(studentMarks, subj.id, (ex) => ex.includes('first') || ex.includes('pratham') || ex.includes('પ્રથમ'))
      : null;

    // 2. Second Exam (50M)
    const second50 = subj.hasFirstSecondExam
      ? extractMarkValue(studentMarks, subj.id, (ex) => ex.includes('second') || ex.includes('dwitiya') || ex.includes('દ્વિતીય'))
      : null;

    // 3. Periodic Test 1 (25M)
    const pt1_raw = extractMarkValue(studentMarks, subj.id, (ex) => (ex.includes('pt') && ex.includes('1')) || (ex.includes('periodic') && ex.includes('1')) || (ex.includes('એકમ') && ex.includes('1')));
    const pt1_conv = convertPeriodicTestTo5(pt1_raw);

    // 4. Periodic Test 2 (25M)
    const pt2_raw = extractMarkValue(studentMarks, subj.id, (ex) => (ex.includes('pt') && ex.includes('2')) || (ex.includes('periodic') && ex.includes('2')) || (ex.includes('એકમ') && ex.includes('2')));
    const pt2_conv = convertPeriodicTestTo5(pt2_raw);

    // 5. Internal Assessment components
    const competency = extractMarkValue(studentMarks, subj.id, (ex) => ex.includes('competency') || ex.includes('સજ્જતા'));
    const notebook = extractMarkValue(studentMarks, subj.id, (ex) => ex.includes('notebook') || ex.includes('નોટબુક'));

    // Check direct internal record if entered as single lump sum
    const directInternal = extractMarkValue(studentMarks, subj.id, (ex) => ex.includes('internal') || ex.includes('આંતરિક'));
    let internal20: number | null = directInternal;

    if (internal20 === null) {
      const calcInt = calculateInternalTotal(pt1_conv, pt2_conv, competency, notebook);
      internal20 = calcInt.total;
    }

    // 6. Annual Exam (80M)
    const annual80 = extractMarkValue(studentMarks, subj.id, (ex) => ex.includes('annual') || ex.includes('varshik') || ex.includes('વાર્ષિક'));

    // 7. Combined & Converted 100
    let combined200: number | null = null;
    let converted100: number | null = null;
    let hasUnenteredMarks = false;

    if (subj.isMainSubject) {
      const calcMain = calculateMainSubjectFinal100(first50, second50, annual80, internal20);
      combined200 = calcMain.combined200;
      converted100 = calcMain.converted100;
      hasUnenteredMarks = !calcMain.isComplete;
    } else {
      const calcAdd = calculateAdditionalSubjectFinal100(annual80, internal20);
      converted100 = calcAdd.converted100;
      hasUnenteredMarks = !calcAdd.isComplete;
    }

    rawScores.push({
      subject: subj,
      first50,
      second50,
      pt1_raw,
      pt1_conv,
      pt2_raw,
      pt2_conv,
      competency,
      notebook,
      internal20,
      annual80,
      combined200,
      converted100,
      hasUnenteredMarks,
    });
  }

  // Calculate raw aggregate across main subjects to determine Siddhi Pool
  const mainScores = rawScores.filter((r) => r.subject.isMainSubject);
  const rawMainSum = mainScores.reduce((sum, r) => sum + (r.converted100 ?? 0), 0);
  const rawMainMax = mainScores.length * 100;
  const rawMainPct = rawMainMax > 0 ? (rawMainSum / rawMainMax) * 100 : 0;

  // GSEB Siddhi Pool: 1 mark per % above 33%, max 15 marks
  let siddhiPool = 0;
  if (rawMainPct > 33) {
    siddhiPool = Math.min(15, Math.floor(rawMainPct - 33));
  }
  const siddhiPoolEarned = siddhiPool;

  // Krupa Pool: max 10 marks by Principal
  let remainingSiddhi = siddhiPool;
  let remainingKrupa = 10;
  let totalSiddhiUsed = 0;
  let totalKrupaUsed = 0;

  let anySubjectIneligibleForPromotion = false;

  const finalScores: StudentSubjectScoreClass9[] = [];

  for (const raw of rawScores) {
    const rawVal = raw.converted100 ?? 0;
    const isUnder25 = rawVal < 25;
    const isEligibleForPromotion = !isUnder25;

    if (isUnder25 && raw.subject.isMainSubject) {
      anySubjectIneligibleForPromotion = true;
    }

    let siddhiGiven = 0;
    let krupaGiven = 0;
    let finalMark = rawVal;
    let isPassed = rawVal >= 33;

    // Check manual override first
    const override = manualGraceOverrides?.[raw.subject.id];
    if (override) {
      if (override.siddhi !== undefined && override.siddhi > 0) {
        siddhiGiven = override.siddhi;
        totalSiddhiUsed += siddhiGiven;
      }
      if (override.krupa !== undefined && override.krupa > 0) {
        krupaGiven = override.krupa;
        totalKrupaUsed += krupaGiven;
      }
      finalMark = Math.min(100, rawVal + siddhiGiven + krupaGiven);
      isPassed = finalMark >= 33;
    } else if (!isPassed && isEligibleForPromotion && raw.subject.isMainSubject) {
      // Automatic GSEB Grace Logic
      const deficit = 33 - rawVal;
      if (remainingSiddhi >= deficit) {
        siddhiGiven = deficit;
        remainingSiddhi -= deficit;
        totalSiddhiUsed += deficit;
        isPassed = true;
        finalMark = 33;
      } else if (remainingSiddhi > 0) {
        siddhiGiven = remainingSiddhi;
        const stillNeeded = deficit - siddhiGiven;
        remainingSiddhi = 0;
        totalSiddhiUsed += siddhiGiven;

        if (remainingKrupa >= stillNeeded) {
          krupaGiven = stillNeeded;
          remainingKrupa -= stillNeeded;
          totalKrupaUsed += stillNeeded;
          isPassed = true;
          finalMark = 33;
        }
      } else if (remainingKrupa >= deficit) {
        krupaGiven = deficit;
        remainingKrupa -= deficit;
        totalKrupaUsed += deficit;
        isPassed = true;
        finalMark = 33;
      }
    }

    const grade = calculateGsebGrade(finalMark, 100);

    finalScores.push({
      subject: raw.subject,
      first50: raw.first50,
      second50: raw.second50,
      pt1_raw: raw.pt1_raw,
      pt1_conv: raw.pt1_conv,
      pt2_raw: raw.pt2_raw,
      pt2_conv: raw.pt2_conv,
      competency: raw.competency,
      notebook: raw.notebook,
      internal20: raw.internal20,
      annual80: raw.annual80,
      combined200: raw.combined200,
      converted100: raw.converted100,
      siddhiGiven,
      krupaGiven,
      finalMarksWithGrace: raw.converted100 !== null ? finalMark : null,
      grade,
      isPassed,
      isEligibleForPromotion,
      hasUnenteredMarks: raw.hasUnenteredMarks,
    });
  }

  // Overall Totals
  const totalMax = subjectsToUse.length * 100;
  const totalObtained = finalScores.reduce((sum, s) => sum + (s.finalMarksWithGrace ?? 0), 0);
  const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100 * 10) / 10 : 0;
  const overallGrade = calculateGsebGrade(totalObtained, totalMax);

  // Overall Status
  const failedMainCount = finalScores.filter((s) => s.subject.isMainSubject && !s.isPassed).length;
  let overallResult: 'PASS' | 'PASS_WITH_SIDDHI' | 'PASS_WITH_KRUPA' | 'NEEDS_IMPROVEMENT' = 'PASS';
  let overallResultGu = 'ઉત્તીર્ણ (Direct Pass)';
  let isEligibleForRank = false;

  if (failedMainCount > 0 || anySubjectIneligibleForPromotion) {
    overallResult = 'NEEDS_IMPROVEMENT';
    overallResultGu = anySubjectIneligibleForPromotion
      ? 'સુધારણા જરૂરી (૨૫ થી ઓછા ગુણ - અપાત્ર)'
      : 'સુધારણા જરૂરી (પુનઃપરીક્ષા)';
    isEligibleForRank = false;
  } else if (totalKrupaUsed > 0) {
    overallResult = 'PASS_WITH_KRUPA';
    overallResultGu = 'કૃપા ગુણ સાથે ઉત્તીર્ણ (*)';
    isEligibleForRank = false;
  } else if (totalSiddhiUsed > 0) {
    overallResult = 'PASS_WITH_SIDDHI';
    overallResultGu = 'સિદ્ધિ ગુણ સાથે ઉત્તીર્ણ (#)';
    isEligibleForRank = true;
  } else {
    overallResult = 'PASS';
    overallResultGu = 'ઉત્તીર્ણ (Direct Pass)';
    isEligibleForRank = true;
  }

  const hasIncompleteMarks = finalScores.some((s) => s.hasUnenteredMarks);

  return {
    student,
    rollNumber: student.rollNumber || '-',
    grNumber: student.grNumber || '-',
    section: student.section || student.division || 'A',
    format,
    scores: finalScores,
    totalObtained,
    totalMax,
    percentage,
    overallGrade,
    overallResult,
    overallResultGu,
    isEligibleForPromotion: !anySubjectIneligibleForPromotion,
    isEligibleForRank,
    siddhiPoolEarned,
    totalSiddhiUsed,
    totalKrupaUsed,
    hasIncompleteMarks,
  };
}

/**
 * Computes results for all Class 9 students and assigns ranks.
 * Ranks are assigned to Direct Pass and Siddhi Pass students based on percentage descending.
 * Krupa Pass and Failed students are not eligible for rank.
 */
export function computeClass9AllResults(
  students: Student[],
  allMarks: MarkRecord[],
  format: '700' | '1000' = '700',
  manualGraceOverrides?: Record<string, Record<string, { siddhi?: number; krupa?: number }>>
): StudentResultClass9[] {
  // Restrict strictly to Class 9
  const class9Students = students.filter((s) => {
    const std = String(s.standard || '').replace(/^class\s*/i, '').trim();
    return std === '9';
  });

  const results = class9Students.map((st) => {
    const studentMarks = allMarks.filter((m) => m.studentId === st.id);
    const overrides = manualGraceOverrides?.[st.id];
    return computeClass9StudentResult(st, studentMarks, format, overrides);
  });

  // Sort: Rank-eligible first, then percentage descending, then roll number
  const sorted = [...results].sort((a, b) => {
    if (a.isEligibleForRank && !b.isEligibleForRank) return -1;
    if (!a.isEligibleForRank && b.isEligibleForRank) return 1;
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    const rA = parseInt(a.rollNumber, 10) || 9999;
    const rB = parseInt(b.rollNumber, 10) || 9999;
    return rA - rB;
  });

  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].isEligibleForRank && sorted[i].percentage > 0) {
      sorted[i].rank = currentRank++;
    } else {
      sorted[i].rank = undefined;
    }
  }

  // Restore original roll order or sort by roll number for display
  return sorted.sort((a, b) => {
    const rA = parseInt(a.rollNumber, 10) || 9999;
    const rB = parseInt(b.rollNumber, 10) || 9999;
    return rA - rB;
  });
}
