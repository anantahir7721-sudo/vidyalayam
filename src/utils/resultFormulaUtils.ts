import { AllowedStandard, Student, MarkRecord } from '../types';
import * as XLSX from 'xlsx';

export interface ExamDef {
  id: string;
  nameGu: string;
  nameEn: string;
  maxMarks: number;
  weightage: number; // Percentage contribution to 100 (e.g., 10 for Pratham, 10 for Dwitiya, 60 for Varshik, 20 for Internal)
  isOptionalInAnnual?: boolean;
}

export interface SubjectDef {
  id: string;
  code?: string;
  nameGu: string;
  nameEn: string;
  isMainSubject: boolean; // Counts in grand total
  hasPractical?: boolean; // For Science / Computer subjects
}

export interface StandardOption {
  id: string; // '9' | '10' | '11-G' | '11-S' | '12-G' | '12-S'
  baseStd: AllowedStandard;
  stream: 'general' | 'science';
  nameGu: string;
  nameEn: string;
}

export const STANDARD_OPTIONS: StandardOption[] = [
  { id: '9', baseStd: '9', stream: 'general', nameGu: 'ધોરણ ૯ (Standard 9)', nameEn: 'Standard 9' },
  { id: '10', baseStd: '10', stream: 'general', nameGu: 'ધોરણ ૧૦ (Standard 10 - Board)', nameEn: 'Standard 10 (Board)' },
  { id: '11-G', baseStd: '11', stream: 'general', nameGu: 'ધોરણ ૧૧ સામાન્ય પ્રવાહ (Std 11 General / Commerce / Arts)', nameEn: 'Std 11 General' },
  { id: '11-S', baseStd: '11', stream: 'science', nameGu: 'ધોરણ ૧૧ વિજ્ઞાન પ્રવાહ (Std 11 Science)', nameEn: 'Std 11 Science' },
  { id: '12-G', baseStd: '12', stream: 'general', nameGu: 'ધોરણ ૧૨ સામાન્ય પ્રવાહ (Std 12 General / Commerce / Arts)', nameEn: 'Std 12 General (Board)' },
  { id: '12-S', baseStd: '12', stream: 'science', nameGu: 'ધોરણ ૧૨ વિજ્ઞાન પ્રવાહ (Std 12 Science)', nameEn: 'Std 12 Science (Board)' },
];

// Standard 9 Curriculum
export const STD_9_EXAMS: ExamDef[] = [
  { id: 'pratham', nameGu: 'પ્રથમ પરીક્ષા', nameEn: 'First Exam', maxMarks: 50, weightage: 10 },
  { id: 'dwitiya', nameGu: 'દ્વિતીય પરીક્ષા', nameEn: 'Second Exam', maxMarks: 50, weightage: 10 },
  { id: 'ekam_1', nameGu: 'એકમ કસોટી - ૧', nameEn: '1st Unit Test', maxMarks: 25, weightage: 0, isOptionalInAnnual: true },
  { id: 'ekam_2', nameGu: 'એકમ કસોટી - ૨', nameEn: '2nd Unit Test', maxMarks: 25, weightage: 0, isOptionalInAnnual: true },
  { id: 'internal', nameGu: 'આંતરિક મૂલ્યાંકન', nameEn: 'Internal Assessment', maxMarks: 20, weightage: 20 },
  { id: 'varshik', nameGu: 'વાર્ષિક પરીક્ષા', nameEn: 'Annual Exam', maxMarks: 80, weightage: 60 },
];

export const STD_9_SUBJECTS: SubjectDef[] = [
  { id: 'gujarati', code: '01', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati (FL)', isMainSubject: true },
  { id: 'maths', code: '12', nameGu: 'ગણિત', nameEn: 'Mathematics', isMainSubject: true },
  { id: 'science', code: '11', nameGu: 'વિજ્ઞાન અને ટેકનોલોજી', nameEn: 'Science & Tech', isMainSubject: true },
  { id: 'social_science', code: '10', nameGu: 'સામાજિક વિજ્ઞાન', nameEn: 'Social Science', isMainSubject: true },
  { id: 'english', code: '16', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English (SL)', isMainSubject: true },
  { id: 'hindi_sanskrit', code: '14', nameGu: 'હિન્દી / સંસ્કૃત', nameEn: 'Hindi / Sanskrit', isMainSubject: true },
  { id: 'pe_computer', code: '40', nameGu: 'શારીરિક શિક્ષણ / કમ્પ્યુટર', nameEn: 'P.E. / Computer', isMainSubject: false, hasPractical: true },
];

// Standard 10 Curriculum (Pratham & Prelims; 3rd is GSEB Board Exam)
export const STD_10_EXAMS: ExamDef[] = [
  { id: 'pratham', nameGu: 'પ્રથમ સત્રાંત પરીક્ષા', nameEn: 'First Terminal Exam', maxMarks: 50, weightage: 10 },
  { id: 'ekam_1', nameGu: 'એકમ કસોટી - ૧', nameEn: '1st Unit Test', maxMarks: 25, weightage: 0, isOptionalInAnnual: true },
  { id: 'ekam_2', nameGu: 'એકમ કસોટી - ૨', nameEn: '2nd Unit Test', maxMarks: 25, weightage: 0, isOptionalInAnnual: true },
  { id: 'prelim', nameGu: 'પ્રિલિમિનરી પરીક્ષા', nameEn: 'Preliminary Exam', maxMarks: 80, weightage: 70 },
  { id: 'internal', nameGu: 'શાળા આંતરિક મૂલ્યાંકન (બોર્ડ)', nameEn: 'Internal Assessment (For Board)', maxMarks: 20, weightage: 20 },
];

export const STD_10_SUBJECTS: SubjectDef[] = [
  { id: 'gujarati', code: '01', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati (FL)', isMainSubject: true },
  { id: 'maths_basic', code: '18', nameGu: 'ગણિત (બેઝિક/સ્ટાન્ડર્ડ)', nameEn: 'Mathematics (Basic/Std)', isMainSubject: true },
  { id: 'science', code: '11', nameGu: 'વિજ્ઞાન', nameEn: 'Science', isMainSubject: true },
  { id: 'social_science', code: '10', nameGu: 'સામાજિક વિજ્ઞાન', nameEn: 'Social Science', isMainSubject: true },
  { id: 'english', code: '16', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English (SL)', isMainSubject: true },
  { id: 'hindi_sanskrit', code: '14', nameGu: 'હિન્દી / સંસ્કૃત', nameEn: 'Hindi / Sanskrit', isMainSubject: true },
  { id: 'pe_computer', code: '40', nameGu: 'શારીરિક શિક્ષણ / કમ્પ્યુટર', nameEn: 'P.E. / Computer', isMainSubject: false, hasPractical: true },
];

// Standard 11 General Stream (Commerce / Arts)
export const STD_11_GENERAL_EXAMS: ExamDef[] = [
  { id: 'pratham', nameGu: 'પ્રથમ સત્રાંત પરીક્ષા', nameEn: 'First Exam', maxMarks: 50, weightage: 10 },
  { id: 'dwitiya', nameGu: 'દ્વિતીય સત્રાંત પરીક્ષા', nameEn: 'Second Exam', maxMarks: 50, weightage: 10 },
  { id: 'ekam_1', nameGu: 'એકમ કસોટી - ૧', nameEn: '1st Unit Test', maxMarks: 25, weightage: 0, isOptionalInAnnual: true },
  { id: 'ekam_2', nameGu: 'એકમ કસોટી - ૨', nameEn: '2nd Unit Test', maxMarks: 25, weightage: 0, isOptionalInAnnual: true },
  { id: 'internal', nameGu: 'આંતરિક મૂલ્યાંકન', nameEn: 'Internal Assessment', maxMarks: 20, weightage: 20 },
  { id: 'varshik', nameGu: 'વાર્ષિક પરીક્ષા', nameEn: 'Annual Exam', maxMarks: 80, weightage: 60 },
];

export const STD_11_GENERAL_SUBJECTS: SubjectDef[] = [
  { id: 'elements_of_accounts', code: '154', nameGu: 'નામાના મૂળતત્વો (Accounts)', nameEn: 'Elements of Accounts', isMainSubject: true },
  { id: 'business_studies', code: '153', nameGu: 'વાણિજ્ય વ્યવસ્થા અને સંચાલન (B.A.)', nameEn: 'Org. of Commerce', isMainSubject: true },
  { id: 'economics', code: '022', nameGu: 'અર્થશાસ્ત્ર (Economics)', nameEn: 'Economics', isMainSubject: true },
  { id: 'statistics', code: '135', nameGu: 'આંકડાશાસ્ત્ર (Statistics)', nameEn: 'Statistics', isMainSubject: true },
  { id: 'gujarati', code: '001', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati', isMainSubject: true },
  { id: 'english', code: '013', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English', isMainSubject: true },
  { id: 'spcc_computer', code: '337', nameGu: 'એસ.પી. અને સી.સી. / કમ્પ્યુટર', nameEn: 'S.P. & C.C. / Comp', isMainSubject: true, hasPractical: true },
];

// Standard 11 Science Stream
export const STD_11_SCIENCE_EXAMS: ExamDef[] = [
  { id: 'pratham', nameGu: 'પ્રથમ સત્રાંત પરીક્ષા', nameEn: 'First Exam', maxMarks: 50, weightage: 10 },
  { id: 'dwitiya', nameGu: 'દ્વિતીય સત્રાંત પરીક્ષા', nameEn: 'Second Exam', maxMarks: 50, weightage: 10 },
  { id: 'practical', nameGu: 'પ્રાયોગિક પરીક્ષા (Practical)', nameEn: 'Practical Exam', maxMarks: 50, weightage: 20 },
  { id: 'internal', nameGu: 'આંતરિક મૂલ્યાંકન', nameEn: 'Internal Assessment', maxMarks: 20, weightage: 10 },
  { id: 'varshik', nameGu: 'વાર્ષિક થિયરી પરીક્ષા', nameEn: 'Annual Theory Exam', maxMarks: 80, weightage: 50 },
];

export const STD_11_SCIENCE_SUBJECTS: SubjectDef[] = [
  { id: 'physics', code: '054', nameGu: 'ભૌતિકવિજ્ઞાન (Physics)', nameEn: 'Physics', isMainSubject: true, hasPractical: true },
  { id: 'chemistry', code: '052', nameGu: 'રસાયણવિજ્ઞાન (Chemistry)', nameEn: 'Chemistry', isMainSubject: true, hasPractical: true },
  { id: 'biology_maths', code: '056', nameGu: 'જીવવિજ્ઞાન / ગણિત', nameEn: 'Biology / Mathematics', isMainSubject: true, hasPractical: true },
  { id: 'english', code: '013', nameGu: 'અંગ્રેજી (SL)', nameEn: 'English', isMainSubject: true },
  { id: 'gujarati_sanskrit', code: '001', nameGu: 'ગુજરાતી / સંસ્કૃત', nameEn: 'Gujarati / Sanskrit', isMainSubject: true },
  { id: 'computer_studies', code: '331', nameGu: 'કમ્પ્યુટર અધ્યયન (Computer)', nameEn: 'Computer Studies', isMainSubject: true, hasPractical: true },
];

// Standard 12 General Stream (Commerce / Arts Board Class)
export const STD_12_GENERAL_EXAMS: ExamDef[] = [
  { id: 'pratham', nameGu: 'પ્રથમ સત્રાંત પરીક્ષા', nameEn: 'First Exam', maxMarks: 50, weightage: 10 },
  { id: 'ekam_1', nameGu: 'એકમ કસોટી - ૧', nameEn: '1st Unit Test', maxMarks: 25, weightage: 0, isOptionalInAnnual: true },
  { id: 'ekam_2', nameGu: 'એકમ કસોટી - ૨', nameEn: '2nd Unit Test', maxMarks: 25, weightage: 0, isOptionalInAnnual: true },
  { id: 'prelim', nameGu: 'પ્રિલિમિનરી પરીક્ષા', nameEn: 'Preliminary Exam', maxMarks: 100, weightage: 70 },
  { id: 'internal', nameGu: 'શાળા આંતરિક મૂલ્યાંકન (બોર્ડ)', nameEn: 'Internal Assessment (Board)', maxMarks: 20, weightage: 20 },
];

export const STD_12_GENERAL_SUBJECTS: SubjectDef[] = [
  { id: 'elements_of_accounts', code: '154', nameGu: 'નામાના મૂળતત્વો (Accounts)', nameEn: 'Elements of Accounts', isMainSubject: true },
  { id: 'business_studies', code: '153', nameGu: 'વાણિજ્ય વ્યવસ્થા અને સંચાલન (B.A.)', nameEn: 'Org. of Commerce', isMainSubject: true },
  { id: 'economics', code: '022', nameGu: 'અર્થશાસ્ત્ર (Economics)', nameEn: 'Economics', isMainSubject: true },
  { id: 'statistics', code: '135', nameGu: 'આંકડાશાસ્ત્ર (Statistics)', nameEn: 'Statistics', isMainSubject: true },
  { id: 'gujarati', code: '001', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati', isMainSubject: true },
  { id: 'english', code: '013', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English', isMainSubject: true },
  { id: 'spcc_computer', code: '337', nameGu: 'એસ.પી. અને સી.સી. / કમ્પ્યુટર', nameEn: 'S.P. & C.C. / Comp', isMainSubject: true, hasPractical: true },
];

// Standard 12 Science Stream (Board Class)
export const STD_12_SCIENCE_EXAMS: ExamDef[] = [
  { id: 'pratham', nameGu: 'પ્રથમ સત્રાંત પરીક્ષા', nameEn: 'First Exam', maxMarks: 50, weightage: 10 },
  { id: 'practical', nameGu: 'પ્રાયોગિક પરીક્ષા (Practical)', nameEn: 'Practical Exam', maxMarks: 50, weightage: 25 },
  { id: 'prelim', nameGu: 'પ્રિલિમિનરી થિયરી પરીક્ષા', nameEn: 'Preliminary Theory Exam', maxMarks: 100, weightage: 50 },
  { id: 'internal', nameGu: 'શાળા આંતરિક મૂલ્યાંકન (બોર્ડ)', nameEn: 'Internal Assessment (Board)', maxMarks: 20, weightage: 15 },
];

export const STD_12_SCIENCE_SUBJECTS: SubjectDef[] = [
  { id: 'physics', code: '054', nameGu: 'ભૌતિકવિજ્ઞાન (Physics)', nameEn: 'Physics', isMainSubject: true, hasPractical: true },
  { id: 'chemistry', code: '052', nameGu: 'રસાયણવિજ્ઞાન (Chemistry)', nameEn: 'Chemistry', isMainSubject: true, hasPractical: true },
  { id: 'biology_maths', code: '056', nameGu: 'જીવવિજ્ઞાન / ગણિત', nameEn: 'Biology / Mathematics', isMainSubject: true, hasPractical: true },
  { id: 'english', code: '013', nameGu: 'અંગ્રેજી (SL)', nameEn: 'English', isMainSubject: true },
  { id: 'computer_studies', code: '331', nameGu: 'કમ્પ્યુટર અધ્યયન (Computer)', nameEn: 'Computer Studies', isMainSubject: true, hasPractical: true },
];

// Backward-compatible aliases
export const STD_11_EXAMS = STD_11_GENERAL_EXAMS;
export const STD_11_SUBJECTS = STD_11_GENERAL_SUBJECTS;

/**
 * Normalizes standard and stream identifiers
 */
export function normalizeStandardAndStream(rawStandard: string): { baseStd: AllowedStandard; stream: 'general' | 'science'; fullKey: string } {
  const s = String(rawStandard).toLowerCase().trim().replace(/^class\s*/i, '');
  if (s.includes('11') && (s.includes('sci') || s.includes('-s'))) {
    return { baseStd: '11', stream: 'science', fullKey: '11-S' };
  }
  if (s.includes('12') && (s.includes('sci') || s.includes('-s'))) {
    return { baseStd: '12', stream: 'science', fullKey: '12-S' };
  }
  if (s.includes('11')) {
    return { baseStd: '11', stream: 'general', fullKey: '11-G' };
  }
  if (s.includes('12')) {
    return { baseStd: '12', stream: 'general', fullKey: '12-G' };
  }
  if (s.includes('10')) {
    return { baseStd: '10', stream: 'general', fullKey: '10' };
  }
  return { baseStd: '9', stream: 'general', fullKey: '9' };
}

/**
 * Get available exams for a standard and stream
 */
export function getExamsForStandard(standard: string): ExamDef[] {
  const { baseStd, stream } = normalizeStandardAndStream(standard);
  if (baseStd === '10') return STD_10_EXAMS;
  if (baseStd === '11') return stream === 'science' ? STD_11_SCIENCE_EXAMS : STD_11_GENERAL_EXAMS;
  if (baseStd === '12') return stream === 'science' ? STD_12_SCIENCE_EXAMS : STD_12_GENERAL_EXAMS;
  return STD_9_EXAMS;
}

/**
 * Get available curriculum subjects for a standard and stream
 */
export function getSubjectsForStandard(standard: string): SubjectDef[] {
  const { baseStd, stream } = normalizeStandardAndStream(standard);
  if (baseStd === '10') return STD_10_SUBJECTS;
  if (baseStd === '11') return stream === 'science' ? STD_11_SCIENCE_SUBJECTS : STD_11_GENERAL_SUBJECTS;
  if (baseStd === '12') return stream === 'science' ? STD_12_SCIENCE_SUBJECTS : STD_12_GENERAL_SUBJECTS;
  return STD_9_SUBJECTS;
}

/**
 * GSEB Official 8-Point Grading Scale (Gujarat Secondary Board Standard)
 */
export function calculateGsebGrade(marksObtained: number, maxMarks: number = 100): string {
  if (maxMarks <= 0) return '-';
  const percentage = (marksObtained / maxMarks) * 100;
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  if (percentage >= 21) return 'E1';
  return 'E2';
}

/**
 * Grade point for GPA
 */
export function getGradePoint(grade: string): number {
  switch (grade) {
    case 'A1': return 10;
    case 'A2': return 9;
    case 'B1': return 8;
    case 'B2': return 7;
    case 'C1': return 6;
    case 'C2': return 5;
    case 'D': return 4;
    default: return 0;
  }
}

export interface StudentSubjectScore {
  subjectId: string;
  subjectNameGu: string;
  subjectNameEn: string;
  isMainSubject: boolean;
  hasPractical?: boolean;
  // Raw marks entered for each exam
  prathamRaw?: number | null; // out of 50
  prathamAbsent?: boolean;
  dwitiyaRaw?: number | null; // out of 50 (or prelim)
  dwitiyaAbsent?: boolean;
  unitTest1Raw?: number | null; // out of 25
  unitTest1Absent?: boolean;
  unitTest2Raw?: number | null; // out of 25
  unitTest2Absent?: boolean;
  practicalRaw?: number | null; // out of 50
  practicalAbsent?: boolean;
  internalRaw?: number | null; // out of 20
  internalAbsent?: boolean;
  varshikRaw?: number | null; // out of 80/100
  varshikAbsent?: boolean;
  // Weighted components out of 100
  prathamWeighted: number;
  dwitiyaWeighted: number;
  varshikWeighted: number;
  internalWeighted: number;
  practicalWeighted?: number;
  total100: number; // Raw converted total out of 100
  siddhiMarksGiven: number; // સિદ્ધિ ગુણ (33% થી ઉપરના ટકા દીઠ 1 ગુણ, મહત્તમ 15 સુધી - રેન્ક પાત્ર)
  krupaMarksGiven: number; // કૃપા ગુણ (આચાર્યશ્રી દ્વારા વધુમાં વધુ 10 ગુણ - રેન્ક અપાતો નથી)
  finalMarkWithGrace: number; // Final display mark (33 if passed with siddhi/krupa)
  grade: string; // A1 to E2
  isPass: boolean; // >= 33
  needsReExam: boolean; // Failed in this subject
}

export interface CalculatedStudentResult {
  student: Student;
  standard: string;
  stream: 'general' | 'science';
  subjectScores: StudentSubjectScore[];
  mainSubjectsCount: number;
  totalObtained: number; // Actual sum of marks obtained across main subjects (without inflating total)
  totalMax: number; // e.g. 600 or 700
  percentage: number;
  overallGrade: string;
  resultStatus: 'PASS' | 'PASS_WITH_SIDDHI' | 'PASS_WITH_KRUPA' | 'NEEDS_IMPROVEMENT';
  resultStatusGu: string; // 'ઉત્તીર્ણ' | 'સિદ્ધિ ગુણ સાથે ઉત્તીર્ણ' | 'કૃપા ગુણ સાથે ઉત્તીર્ણ' | 'સુધારણા જરૂરી (પુનઃપરીક્ષા)'
  siddhiPoolEarned: number; // Total siddhi marks earned based on percentage above 33% (max 15)
  totalSiddhiGiven: number; // Total siddhi marks consumed
  totalKrupaGiven: number; // Total krupa marks consumed (max 10)
  isEligibleForRank: boolean; // true for PASS and PASS_WITH_SIDDHI; false for PASS_WITH_KRUPA and NEEDS_IMPROVEMENT
  failedSubjectsCount: number;
  reExamSubjects: string[];
  rankInClass?: number;
}

/**
 * Core GSEB Formula Calculation Engine
 * Flexible for Standards 9, 10, 11 (General & Science), 12 (General & Science)
 */
export function calculateStudentAnnualResult(
  student: Student,
  allMarksForSchool: MarkRecord[],
  standard: string
): CalculatedStudentResult {
  const { baseStd, stream, fullKey } = normalizeStandardAndStream(standard);
  const subjects = getSubjectsForStandard(fullKey);
  const studentMarks = allMarksForSchool.filter((m) => {
    if (m.studentId !== student.id) return false;
    const mStdNorm = normalizeStandardAndStream(m.standard);
    return mStdNorm.baseStd === baseStd;
  });

  const rawSubjectCalculations: {
    subj: SubjectDef;
    prathamRaw: number | null;
    prathamAbsent: boolean;
    dwitiyaRaw: number | null;
    dwitiyaAbsent: boolean;
    unitTest1Raw: number | null;
    unitTest1Absent: boolean;
    unitTest2Raw: number | null;
    unitTest2Absent: boolean;
    practicalRaw: number | null;
    practicalAbsent: boolean;
    internalRaw: number | null;
    internalAbsent: boolean;
    varshikRaw: number | null;
    varshikAbsent: boolean;
    prathamWeighted: number;
    dwitiyaWeighted: number;
    varshikWeighted: number;
    internalWeighted: number;
    practicalWeighted: number;
    total100: number;
  }[] = [];

  for (const subj of subjects) {
    const findMark = (examKey: string) => {
      return studentMarks.find((m) => {
        const matchesSubject =
          (m.subjectId && m.subjectId.toLowerCase() === subj.id.toLowerCase()) ||
          (m.subjectName && m.subjectName.toLowerCase().includes(subj.nameGu.toLowerCase())) ||
          (subj.nameEn && m.subjectName && m.subjectName.toLowerCase().includes(subj.nameEn.toLowerCase()));
        if (!matchesSubject) return false;

        const exLower = (m.examType || '').toLowerCase();
        if (examKey === 'pratham') {
          return exLower.includes('pratham') || exLower.includes('પ્રથમ') || exLower.includes('first');
        }
        if (examKey === 'dwitiya' || examKey === 'prelim') {
          return (
            exLower.includes('dwitiya') ||
            exLower.includes('દ્વિતીય') ||
            exLower.includes('second') ||
            exLower.includes('prelim') ||
            exLower.includes('પ્રિલિમ')
          );
        }
        if (examKey === 'ekam_1') {
          return exLower.includes('એકમ કસોટી - ૧') || exLower.includes('unit test 1') || exLower.includes('ekam_1') || (exLower.includes('એકમ') && exLower.includes('1'));
        }
        if (examKey === 'ekam_2') {
          return exLower.includes('એકમ કસોટી - ૨') || exLower.includes('unit test 2') || exLower.includes('ekam_2') || (exLower.includes('એકમ') && exLower.includes('2'));
        }
        if (examKey === 'practical') {
          return exLower.includes('practical') || exLower.includes('પ્રાયોગિક');
        }
        if (examKey === 'varshik') {
          return (
            exLower.includes('varshik') ||
            exLower.includes('વાર્ષિક') ||
            exLower.includes('annual') ||
            exLower.includes('trutiya') ||
            exLower.includes('તૃતીય')
          );
        }
        if (examKey === 'internal') {
          return exLower.includes('internal') || exLower.includes('આંતરિક') || exLower.includes('મૂલ્યાંકન');
        }
        return false;
      });
    };

    const prathamRec = findMark('pratham');
    const dwitiyaRec = findMark(baseStd === '10' || baseStd === '12' ? 'prelim' : 'dwitiya');
    const ekam1Rec = findMark('ekam_1');
    const ekam2Rec = findMark('ekam_2');
    const practicalRec = findMark('practical');
    const internalRec = findMark('internal');
    const varshikRec = findMark(baseStd === '10' || baseStd === '12' ? 'prelim' : 'varshik');

    const prathamRaw = prathamRec !== undefined ? prathamRec.totalObtained : null;
    const prathamAbsent = prathamRec?.overallGrade === 'AB';

    const dwitiyaRaw = dwitiyaRec !== undefined ? dwitiyaRec.totalObtained : null;
    const dwitiyaAbsent = dwitiyaRec?.overallGrade === 'AB';

    const unitTest1Raw = ekam1Rec !== undefined ? ekam1Rec.totalObtained : null;
    const unitTest1Absent = ekam1Rec?.overallGrade === 'AB';

    const unitTest2Raw = ekam2Rec !== undefined ? ekam2Rec.totalObtained : null;
    const unitTest2Absent = ekam2Rec?.overallGrade === 'AB';

    const practicalRaw = practicalRec !== undefined ? practicalRec.totalObtained : null;
    const practicalAbsent = practicalRec?.overallGrade === 'AB';

    const internalRaw = internalRec !== undefined ? internalRec.totalObtained : null;
    const internalAbsent = internalRec?.overallGrade === 'AB';

    const varshikRaw = varshikRec !== undefined ? varshikRec.totalObtained : null;
    const varshikAbsent = varshikRec?.overallGrade === 'AB';

    let prathamWeighted = 0;
    let dwitiyaWeighted = 0;
    let varshikWeighted = 0;
    let internalWeighted = 0;
    let practicalWeighted = 0;
    let total100 = 0;

    // Internal calculation: if direct internal is entered, use it (max 20).
    // If internal is not entered directly but Unit Tests are present: convert (UT1 + UT2) / 50 * 20
    if (internalRaw !== null && !internalAbsent) {
      internalWeighted = internalRaw;
    } else if (unitTest1Raw !== null || unitTest2Raw !== null) {
      const u1 = unitTest1Raw || 0;
      const u2 = unitTest2Raw || 0;
      internalWeighted = Math.round(((u1 + u2) / 50) * 20);
    }

    if (stream === 'science' && baseStd === '11') {
      // Std 11 Science GSEB Formula
      // First (50M -> 10) + Second (50M -> 10) + Practical (50M -> 20) + Internal (20M -> 10) + Annual (80M -> 50) = 100M
      prathamWeighted = prathamRaw !== null && !prathamAbsent ? Math.round((prathamRaw / 50) * 10 * 10) / 10 : 0;
      dwitiyaWeighted = dwitiyaRaw !== null && !dwitiyaAbsent ? Math.round((dwitiyaRaw / 50) * 10 * 10) / 10 : 0;
      practicalWeighted = practicalRaw !== null && !practicalAbsent ? Math.round((practicalRaw / 50) * 20 * 10) / 10 : 0;
      const intWeight = Math.round((internalWeighted / 20) * 10 * 10) / 10;
      varshikWeighted = varshikRaw !== null && !varshikAbsent ? Math.round((varshikRaw / 80) * 50 * 10) / 10 : 0;
      total100 = Math.round(prathamWeighted + dwitiyaWeighted + practicalWeighted + intWeight + varshikWeighted);
    } else if (stream === 'science' && baseStd === '12') {
      // Std 12 Science Board Prep Formula
      // First (50M -> 10) + Practical (50M -> 25) + Prelim Theory (100M -> 50) + Internal (20M -> 15) = 100M
      prathamWeighted = prathamRaw !== null && !prathamAbsent ? Math.round((prathamRaw / 50) * 10 * 10) / 10 : 0;
      practicalWeighted = practicalRaw !== null && !practicalAbsent ? Math.round((practicalRaw / 50) * 25 * 10) / 10 : 0;
      const prelRaw = dwitiyaRaw !== null ? dwitiyaRaw : (varshikRaw !== null ? varshikRaw : 0);
      const prelWeight = Math.round((prelRaw / 100) * 50 * 10) / 10;
      const intWeight = Math.round((internalWeighted / 20) * 15 * 10) / 10;
      total100 = Math.round(prathamWeighted + practicalWeighted + prelWeight + intWeight);
    } else if (baseStd === '10' || baseStd === '12') {
      // Board classes (Std 10 & 12 General)
      // First (50M -> 10) + Prelim (80M or 100M -> 70) + Internal (20M -> 20) = 100M
      prathamWeighted = prathamRaw !== null && !prathamAbsent ? Math.round((prathamRaw / 50) * 10 * 10) / 10 : 0;
      const prelRaw = dwitiyaRaw !== null ? dwitiyaRaw : (varshikRaw !== null ? varshikRaw : 0);
      const maxPrel = baseStd === '12' ? 100 : 80;
      dwitiyaWeighted = Math.round((prelRaw / maxPrel) * 70 * 10) / 10;
      total100 = Math.round(prathamWeighted + dwitiyaWeighted + internalWeighted);
    } else {
      // Standard 9 & 11 General GSEB Formula
      // First (50M -> 10) + Second (50M -> 10) + Annual (80M -> 60) + Internal (20M -> 20) = 100M
      prathamWeighted = prathamRaw !== null && !prathamAbsent ? Math.round((prathamRaw / 50) * 10 * 10) / 10 : 0;
      dwitiyaWeighted = dwitiyaRaw !== null && !dwitiyaAbsent ? Math.round((dwitiyaRaw / 50) * 10 * 10) / 10 : 0;
      varshikWeighted = varshikRaw !== null && !varshikAbsent ? Math.round((varshikRaw / 80) * 60 * 10) / 10 : 0;
      total100 = Math.round(prathamWeighted + dwitiyaWeighted + varshikWeighted + internalWeighted);
    }

    rawSubjectCalculations.push({
      subj,
      prathamRaw,
      prathamAbsent,
      dwitiyaRaw,
      dwitiyaAbsent,
      unitTest1Raw,
      unitTest1Absent,
      unitTest2Raw,
      unitTest2Absent,
      practicalRaw,
      practicalAbsent,
      internalRaw,
      internalAbsent,
      varshikRaw,
      varshikAbsent,
      prathamWeighted,
      dwitiyaWeighted,
      varshikWeighted,
      internalWeighted,
      practicalWeighted,
      total100,
    });
  }

  // Step 1: Calculate raw total and raw percentage across main subjects
  const mainRawList = rawSubjectCalculations.filter((r) => r.subj.isMainSubject);
  const mainSubjectsCount = mainRawList.length;
  const rawTotalObtained = mainRawList.reduce((sum, r) => sum + r.total100, 0);
  const totalMax = mainSubjectsCount * 100;
  const rawPercentage = totalMax > 0 ? Math.round((rawTotalObtained / totalMax) * 100 * 10) / 10 : 0;

  // Step 2: Compute Siddhi Marks Pool
  let siddhiPool = 0;
  if (rawPercentage > 33) {
    siddhiPool = Math.min(15, Math.floor(rawPercentage - 33));
  }
  const siddhiPoolEarned = siddhiPool;

  // Step 3: Compute Krupa Marks Pool
  let remainingSiddhi = siddhiPool;
  let remainingKrupa = 10;
  let totalSiddhiUsed = 0;
  let totalKrupaUsed = 0;

  // Step 4: Apply Siddhi and Krupa marks to failing subjects
  const scores: StudentSubjectScore[] = [];
  const reExamSubjects: string[] = [];

  for (const item of rawSubjectCalculations) {
    const { subj, total100 } = item;
    let siddhiGiven = 0;
    let krupaGiven = 0;
    let finalMark = total100;
    let isPass = total100 >= 33;
    let needsReExam = false;

    if (!isPass) {
      const deficit = 33 - total100;
      if (total100 >= 25) {
        if (remainingSiddhi >= deficit) {
          siddhiGiven = deficit;
          remainingSiddhi -= deficit;
          totalSiddhiUsed += deficit;
          isPass = true;
          finalMark = 33;
        } else if (remainingSiddhi > 0) {
          const usedFromSiddhi = remainingSiddhi;
          const stillNeeded = deficit - usedFromSiddhi;
          siddhiGiven = usedFromSiddhi;
          remainingSiddhi = 0;
          totalSiddhiUsed += usedFromSiddhi;

          if (remainingKrupa >= stillNeeded) {
            krupaGiven = stillNeeded;
            remainingKrupa -= stillNeeded;
            totalKrupaUsed += stillNeeded;
            isPass = true;
            finalMark = 33;
          } else {
            needsReExam = true;
          }
        } else {
          if (remainingKrupa >= deficit) {
            krupaGiven = deficit;
            remainingKrupa -= deficit;
            totalKrupaUsed += deficit;
            isPass = true;
            finalMark = 33;
          } else {
            needsReExam = true;
          }
        }
      } else {
        needsReExam = true;
      }
    }

    if (needsReExam && subj.isMainSubject) {
      reExamSubjects.push(subj.nameGu);
    }

    const grade = calculateGsebGrade(finalMark, 100);

    scores.push({
      subjectId: subj.id,
      subjectNameGu: subj.nameGu,
      subjectNameEn: subj.nameEn,
      isMainSubject: subj.isMainSubject,
      hasPractical: subj.hasPractical,
      prathamRaw: item.prathamRaw,
      prathamAbsent: item.prathamAbsent,
      dwitiyaRaw: item.dwitiyaRaw,
      dwitiyaAbsent: item.dwitiyaAbsent,
      unitTest1Raw: item.unitTest1Raw,
      unitTest1Absent: item.unitTest1Absent,
      unitTest2Raw: item.unitTest2Raw,
      unitTest2Absent: item.unitTest2Absent,
      practicalRaw: item.practicalRaw,
      practicalAbsent: item.practicalAbsent,
      internalRaw: item.internalRaw,
      internalAbsent: item.internalAbsent,
      varshikRaw: item.varshikRaw,
      varshikAbsent: item.varshikAbsent,
      prathamWeighted: item.prathamWeighted,
      dwitiyaWeighted: item.dwitiyaWeighted,
      varshikWeighted: item.varshikWeighted,
      internalWeighted: item.internalWeighted,
      practicalWeighted: item.practicalWeighted,
      total100,
      siddhiMarksGiven: siddhiGiven,
      krupaMarksGiven: krupaGiven,
      finalMarkWithGrace: finalMark,
      grade,
      isPass,
      needsReExam,
    });
  }

  // Step 5: Overall Status and Rank Eligibility
  const failedMainCount = scores.filter((s) => s.isMainSubject && !s.isPass).length;
  let resultStatus: 'PASS' | 'PASS_WITH_SIDDHI' | 'PASS_WITH_KRUPA' | 'NEEDS_IMPROVEMENT' = 'PASS';
  let resultStatusGu = 'ઉત્તીર્ણ (Passed)';
  let isEligibleForRank = false;

  if (failedMainCount > 0) {
    resultStatus = 'NEEDS_IMPROVEMENT';
    resultStatusGu = 'સુધારણા જરૂરી (પુનઃપરીક્ષા)';
    isEligibleForRank = false;
  } else if (totalKrupaUsed > 0) {
    resultStatus = 'PASS_WITH_KRUPA';
    resultStatusGu = 'કૃપા ગુણ સાથે ઉત્તીર્ણ';
    isEligibleForRank = false;
  } else if (totalSiddhiUsed > 0) {
    resultStatus = 'PASS_WITH_SIDDHI';
    resultStatusGu = 'સિદ્ધિ ગુણ સાથે ઉત્તીર્ણ';
    isEligibleForRank = true;
  } else {
    resultStatus = 'PASS';
    resultStatusGu = 'ઉત્તીર્ણ (Direct Pass)';
    isEligibleForRank = true;
  }

  const overallGrade = calculateGsebGrade(rawTotalObtained, totalMax);

  return {
    student,
    standard: fullKey,
    stream,
    subjectScores: scores,
    mainSubjectsCount,
    totalObtained: rawTotalObtained,
    totalMax,
    percentage: rawPercentage,
    overallGrade,
    resultStatus,
    resultStatusGu,
    siddhiPoolEarned,
    totalSiddhiGiven: totalSiddhiUsed,
    totalKrupaGiven: totalKrupaUsed,
    isEligibleForRank,
    failedSubjectsCount: failedMainCount,
    reExamSubjects,
  };
}

/**
 * Compute results for all students of a standard and assign class ranks
 */
export function calculateClassResults(
  students: Student[],
  allMarks: MarkRecord[],
  standard: string
): CalculatedStudentResult[] {
  const { baseStd, fullKey, stream } = normalizeStandardAndStream(standard);
  const stdStudents = students.filter((s) => {
    const sStd = normalizeStandardAndStream(s.standard);
    return sStd.baseStd === baseStd;
  });

  const results = stdStudents.map((st) => calculateStudentAnnualResult(st, allMarks, fullKey));

  // Sort by rank eligibility and percentage descending
  const sorted = [...results].sort((a, b) => {
    if (a.isEligibleForRank && !b.isEligibleForRank) return -1;
    if (!a.isEligibleForRank && b.isEligibleForRank) return 1;
    return b.percentage - a.percentage;
  });

  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].isEligibleForRank) {
      sorted[i].rankInClass = currentRank++;
    } else {
      sorted[i].rankInClass = undefined;
    }
  }

  return sorted;
}

/**
 * Generates an Excel template workbook with pre-populated students & formulas
 */
export function generateExcelMarksheetWorkbook(
  students: Student[],
  standard: string,
  subject: SubjectDef,
  schoolName: string
): XLSX.WorkBook {
  const { baseStd, stream, fullKey } = normalizeStandardAndStream(standard);
  const exams = getExamsForStandard(fullKey);

  const headers = ['Roll No', 'GR No', 'વિદ્યાર્થીનું નામ (Student Name)'];
  exams.forEach((ex) => {
    headers.push(`${ex.nameGu} (મહત્તમ ${ex.maxMarks})`);
  });
  headers.push('કુલ ગણતરી (100 માંથી)');
  headers.push('ગ્રેડ (Grade)');
  headers.push('સ્થિતિ (Status)');

  const rows: any[][] = [];
  rows.push([`${schoolName} - પરિણામ ગુણપત્રક (Marksheet)`]);
  rows.push([`ધોરણ: ${fullKey} | વિષય: ${subject.nameGu} (${subject.nameEn})`]);
  rows.push([]);
  rows.push(headers);

  const sortedStudents = [...students].sort((a, b) => {
    const rA = parseInt(a.rollNumber || '9999', 10);
    const rB = parseInt(b.rollNumber || '9999', 10);
    return rA - rB;
  });

  sortedStudents.forEach((st, idx) => {
    const row = [st.rollNumber || `${idx + 1}`, st.grNumber || '', st.studentName];
    // Empty cells for exam scores
    exams.forEach(() => row.push(''));
    // Excel formula placeholder or blank for total
    row.push('');
    row.push('');
    row.push('');
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, subject.id.substring(0, 30));
  return wb;
}
