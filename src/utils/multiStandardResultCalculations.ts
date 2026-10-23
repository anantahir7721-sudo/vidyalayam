import { Student, MarkRecord } from '../types';
import {
  Class9SubjectDef,
  CLASS_9_ADDITIONAL_SUBJECTS,
  StudentResultClass9,
  computeClass9StudentResult,
  calculateGsebGrade,
} from './class9ResultCalculations';

export type StandardKey = '9' | '10' | '11' | '12';
export type StreamKey = 'general' | 'science';

export interface StandardTabDef {
  id: StandardKey;
  labelGu: string;
  labelEn: string;
  hasStreams: boolean;
}

export const STANDARD_TABS: StandardTabDef[] = [
  { id: '9', labelGu: 'ધોરણ ૯ (Class 9)', labelEn: 'Class 9', hasStreams: false },
  { id: '10', labelGu: 'ધોરણ ૧૦ (Class 10 - Board)', labelEn: 'Class 10 (Board)', hasStreams: false },
  { id: '11', labelGu: 'ધોરણ ૧૧ (Class 11)', labelEn: 'Class 11', hasStreams: true },
  { id: '12', labelGu: 'ધોરણ ૧૨ (Class 12 - Board)', labelEn: 'Class 12 (Board)', hasStreams: true },
];

// The exact 7 Main Subjects for First Exam (પ્રથમ પરીક્ષા) and Second Exam (દ્વિતીય પરીક્ષા)
// ગુજરાતી, ગણિત, વિજ્ઞાન, સામાજિક વિજ્ઞાન, અંગ્રેજી, હિન્દી, સંસ્કૃત
export const FIRST_SECOND_EXAM_7_SUBJECTS: Class9SubjectDef[] = [
  { id: 'gujarati', code: '01', nameGu: 'ગુજરાતી', nameEn: 'Gujarati', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'maths', code: '12', nameGu: 'ગણિત', nameEn: 'Mathematics', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'science', code: '11', nameGu: 'વિજ્ઞાન', nameEn: 'Science', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'social_science', code: '10', nameGu: 'સામાજિક વિજ્ઞાન', nameEn: 'Social Science', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'english', code: '16', nameGu: 'અંગ્રેજી', nameEn: 'English', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'hindi', code: '14', nameGu: 'હિન્દી', nameEn: 'Hindi', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'sanskrit', code: '15', nameGu: 'સંસ્કૃત', nameEn: 'Sanskrit', isMainSubject: true, hasFirstSecondExam: true },
];

export const FIRST_SECOND_EXAM_SUBJECTS = FIRST_SECOND_EXAM_7_SUBJECTS;
export const FIRST_SECOND_EXAM_6_SUBJECTS = FIRST_SECOND_EXAM_7_SUBJECTS;

// Class 9 Annual Main Subjects (7 Subjects)
export const CLASS_9_ANNUAL_MAIN_SUBJECTS: Class9SubjectDef[] = [
  { id: 'gujarati', code: '01', nameGu: 'ગુજરાતી', nameEn: 'Gujarati', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'maths', code: '12', nameGu: 'ગણિત', nameEn: 'Mathematics', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'science', code: '11', nameGu: 'વિજ્ઞાન', nameEn: 'Science', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'social_science', code: '10', nameGu: 'સામાજિક વિજ્ઞાન', nameEn: 'Social Science', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'english', code: '16', nameGu: 'અંગ્રેજી', nameEn: 'English', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'hindi', code: '14', nameGu: 'હિન્દી', nameEn: 'Hindi', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'sanskrit', code: '15', nameGu: 'સંસ્કૃત', nameEn: 'Sanskrit', isMainSubject: true, hasFirstSecondExam: true },
];

// Class 10 GSEB Subjects
export const CLASS_10_SUBJECTS: Class9SubjectDef[] = [
  { id: 'gujarati', code: '01', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati (FL)', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'maths_basic', code: '18', nameGu: 'ગણિત (બેઝિક / સ્ટાન્ડર્ડ)', nameEn: 'Mathematics (Basic/Std)', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'science', code: '11', nameGu: 'વિજ્ઞાન અને ટેકનોલોજી', nameEn: 'Science & Tech', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'social_science', code: '10', nameGu: 'સામાજિક વિજ્ઞાન', nameEn: 'Social Science', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'english', code: '16', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English (SL)', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'hindi', code: '14', nameGu: 'હિન્દી', nameEn: 'Hindi', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'sanskrit', code: '15', nameGu: 'સંસ્કૃત', nameEn: 'Sanskrit', isMainSubject: true, hasFirstSecondExam: true },
];

// Class 11 General Stream Subjects (Commerce / Arts)
export const CLASS_11_GENERAL_SUBJECTS: Class9SubjectDef[] = [
  { id: 'accounts', code: '154', nameGu: 'નામાના મૂળતત્વો (Accounts)', nameEn: 'Elements of Accounts', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'ba', code: '153', nameGu: 'વાણિજ્ય વ્યવસ્થા અને સંચાલન (B.A.)', nameEn: 'Org. of Commerce', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'economics', code: '022', nameGu: 'અર્થશાસ્ત્ર (Economics)', nameEn: 'Economics', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'statistics', code: '135', nameGu: 'આંકડાશાસ્ત્ર (Statistics)', nameEn: 'Statistics', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'gujarati', code: '001', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'english', code: '013', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'spcc_computer', code: '337', nameGu: 'એસ.પી. અને સી.સી. / કમ્પ્યુટર', nameEn: 'S.P. & C.C. / Comp', isMainSubject: true, hasFirstSecondExam: true },
];

// Class 11 Science Stream Subjects
export const CLASS_11_SCIENCE_SUBJECTS: Class9SubjectDef[] = [
  { id: 'physics', code: '054', nameGu: 'ભૌતિકવિજ્ઞાન (Physics)', nameEn: 'Physics', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'chemistry', code: '052', nameGu: 'રસાયણવિજ્ઞાન (Chemistry)', nameEn: 'Chemistry', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'biology_maths', code: '056', nameGu: 'જીવવિજ્ઞાન / ગણિત', nameEn: 'Biology / Maths', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'english', code: '013', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'gujarati_sanskrit', code: '001', nameGu: 'ગુજરાતી / સંસ્કૃત', nameEn: 'Gujarati / Sanskrit', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'computer_studies', code: '331', nameGu: 'કમ્પ્યુટર અધ્યયન (Computer)', nameEn: 'Computer Studies', isMainSubject: true, hasFirstSecondExam: true },
];

// Class 12 General Stream Subjects
export const CLASS_12_GENERAL_SUBJECTS: Class9SubjectDef[] = [
  { id: 'accounts', code: '154', nameGu: 'નામાના મૂળતત્વો (Accounts)', nameEn: 'Elements of Accounts', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'ba', code: '153', nameGu: 'વાણિજ્ય વ્યવસ્થા અને સંચાલન (B.A.)', nameEn: 'Org. of Commerce', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'economics', code: '022', nameGu: 'અર્થશાસ્ત્ર (Economics)', nameEn: 'Economics', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'statistics', code: '135', nameGu: 'આંકડાશાસ્ત્ર (Statistics)', nameEn: 'Statistics', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'gujarati', code: '001', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'english', code: '013', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'spcc_computer', code: '337', nameGu: 'એસ.પી. અને સી.સી. / કમ્પ્યુટર', nameEn: 'S.P. & C.C. / Comp', isMainSubject: true, hasFirstSecondExam: true },
];

// Class 12 Science Stream Subjects
export const CLASS_12_SCIENCE_SUBJECTS: Class9SubjectDef[] = [
  { id: 'physics', code: '054', nameGu: 'ભૌતિકવિજ્ઞાન (Physics)', nameEn: 'Physics', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'chemistry', code: '052', nameGu: 'રસાયણવિજ્ઞાન (Chemistry)', nameEn: 'Chemistry', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'biology_maths', code: '056', nameGu: 'જીવવિજ્ઞાન / ગણિત', nameEn: 'Biology / Maths', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'english', code: '013', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English', isMainSubject: true, hasFirstSecondExam: true },
  { id: 'computer_studies', code: '331', nameGu: 'કમ્પ્યુટર અધ્યયન (Computer)', nameEn: 'Computer Studies', isMainSubject: true, hasFirstSecondExam: true },
];

/**
 * Returns subjects for any chosen standard, stream, and exam
 */
export function getSubjectsForStandard(
  standard: StandardKey,
  stream: StreamKey = 'general',
  format9: '700' | '1000' = '700',
  examId?: string
): Class9SubjectDef[] {
  // First Exam or Second Exam strictly uses the 7 main subjects
  if (examId === 'first_exam' || examId === 'second_exam' || examId === 'annual_exam') {
    return FIRST_SECOND_EXAM_SUBJECTS;
  }

  // Prayogik Annual strictly uses the practical subjects
  if (examId === 'prayogik_annual') {
    return CLASS_9_ADDITIONAL_SUBJECTS;
  }

  if (standard === '9') {
    return format9 === '1000'
      ? [...CLASS_9_ANNUAL_MAIN_SUBJECTS, ...CLASS_9_ADDITIONAL_SUBJECTS]
      : CLASS_9_ANNUAL_MAIN_SUBJECTS;
  }
  if (standard === '10') {
    return CLASS_10_SUBJECTS;
  }
  if (standard === '11') {
    return stream === 'science' ? CLASS_11_SCIENCE_SUBJECTS : CLASS_11_GENERAL_SUBJECTS;
  }
  if (standard === '12') {
    return stream === 'science' ? CLASS_12_SCIENCE_SUBJECTS : CLASS_12_GENERAL_SUBJECTS;
  }
  return FIRST_SECOND_EXAM_SUBJECTS;
}

export interface StandardExamConfig {
  id: string;
  nameGu: string;
  nameEn: string;
  maxMarksPerSubject: number;
  totalExamMax: number;
  descriptionGu: string;
}

/**
 * Returns exam configurations for any standard
 */
export function getExamsForStandard(standard: StandardKey): StandardExamConfig[] {
  if (standard === '9') {
    return [
      { id: 'first_exam', nameGu: 'પ્રથમ પરીક્ષા', nameEn: 'First Exam', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: '૭ મુખ્ય વિષયો (ગુજરાતી, ગણિત, વિજ્ઞાન, સા.વિ., અંગ્રેજી, હિન્દી, સંસ્કૃત) • ૫૦ ગુણ • કુલ ૩૫૦ ગુણ' },
      { id: 'second_exam', nameGu: 'દ્વિતીય પરીક્ષા', nameEn: 'Second Exam', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: '૭ મુખ્ય વિષયો • વિષય દીઠ ૫૦ ગુણ • કુલ ૩૫૦ ગુણ' },
      { id: 'annual_exam', nameGu: 'વાર્ષિક પરીક્ષા (મુખ્ય વિષયો)', nameEn: 'Annual Exam (Main)', maxMarksPerSubject: 80, totalExamMax: 560, descriptionGu: '૭ મુખ્ય વિષયો • થિયરી ૮૦ ગુણ' },
      { id: 'prayogik_annual', nameGu: 'પ્રાયોગિક વિષયો (૪૦ થિયરી + ૪૦ પ્રેક્ટિકલ)', nameEn: 'Practical (40T+40P)', maxMarksPerSubject: 80, totalExamMax: 240, descriptionGu: '૩ પ્રાયોગિક વિષયો: કમ્પ્યુટર, પી.ઈ., ચિત્રકામ • ૪૦ થિયરી + ૪૦ પ્રાયોગિક' },
      { id: 'internal_assessment', nameGu: 'આંતરિક ગુણ (૨૦)', nameEn: 'Internal (20M)', maxMarksPerSubject: 20, totalExamMax: 200, descriptionGu: 'મુખ્ય: ૫+૫+૫+૫ | પ્રાયોગિક: ૧૦+૧૦ • કુલ ૨૦ ગુણ' },
      { id: 'periodic_test_1', nameGu: 'સામાયિક કસોટી ૧', nameEn: 'Unit Test 1', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: '૨૫ ગુણ (આંતરિક માટે /૫ રૂપાંતરણ)' },
      { id: 'periodic_test_2', nameGu: 'સામાયિક કસોટી ૨', nameEn: 'Unit Test 2', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: '૨૫ ગુણ (આંતરિક માટે /૫ રૂપાંતરણ)' },
    ];
  }

  if (standard === '10') {
    return [
      { id: 'first_exam', nameGu: 'પ્રથમ પરીક્ષા', nameEn: 'First Terminal', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: '૭ વિષયો • વિષય દીઠ ૫૦ ગુણ • કુલ ૩૫૦ ગુણ' },
      { id: 'second_exam', nameGu: 'દ્વિતીય / પ્રિલિમ પરીક્ષા', nameEn: 'Preliminary Exam', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: 'દ્વિતીય / પ્રિલિમ પરીક્ષા • ૫૦ ગુણ' },
      { id: 'periodic_test_1', nameGu: 'એકમ કસોટી - ૧', nameEn: 'Unit Test 1', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: 'એકમ કસોટી ૧ • ૨૫ ગુણ' },
      { id: 'periodic_test_2', nameGu: 'એકમ કસોટી - ૨', nameEn: 'Unit Test 2', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: 'એકમ કસોટી ૨ • ૨૫ ગુણ' },
      { id: 'internal_assessment', nameGu: 'શાળા આંતરિક ગુણ (૨૦)', nameEn: 'Internal Assessment', maxMarksPerSubject: 20, totalExamMax: 140, descriptionGu: 'બોર્ડ માટે શાળા આંતરિક મૂલ્યાંકન • ૨૦ ગુણ' },
      { id: 'annual_result', nameGu: 'આખરી વાર્ષિક પરિણામ', nameEn: 'Annual Result (100M)', maxMarksPerSubject: 100, totalExamMax: 700, descriptionGu: 'વિષય દીઠ ૧૦૦ ગુણ પદ્ધતિ • કુલ ૭૦૦ ગુણ' },
    ];
  }

  if (standard === '11') {
    return [
      { id: 'first_exam', nameGu: 'પ્રથમ પરીક્ષા', nameEn: 'First Exam', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: '૭ વિષયો • વિષય દીઠ ૫૦ ગુણ • કુલ ૩૫૦ ગુણ' },
      { id: 'second_exam', nameGu: 'દ્વિતીય પરીક્ષા', nameEn: 'Second Exam', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: 'દ્વિતીય પરીક્ષા • ૫૦ ગુણ' },
      { id: 'periodic_test_1', nameGu: 'એકમ કસોટી - ૧', nameEn: 'Unit Test 1', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: 'એકમ કસોટી ૧ • ૨૫ ગુણ' },
      { id: 'periodic_test_2', nameGu: 'એકમ કસોટી - ૨', nameEn: 'Unit Test 2', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: 'એકમ કસોટી ૨ • ૨૫ ગુણ' },
      { id: 'internal_assessment', nameGu: 'આંતરિક ગુણ (૨૦)', nameEn: 'Internal/Practical', maxMarksPerSubject: 20, totalExamMax: 140, descriptionGu: 'આંતરિક મૂલ્યાંકન • ૨૦ ગુણ' },
      { id: 'annual_result', nameGu: 'વાર્ષિક પરિણામ પત્રક', nameEn: 'Annual Result', maxMarksPerSubject: 100, totalExamMax: 700, descriptionGu: 'વાર્ષિક આખરી પરિણામ પત્રક' },
    ];
  }

  // Standard 12
  return [
    { id: 'first_exam', nameGu: 'પ્રથમ પરીક્ષા', nameEn: 'First Exam', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: '૭ વિષયો • વિષય દીઠ ૫૦ ગુણ • કુલ ૩૫૦ ગુણ' },
    { id: 'second_exam', nameGu: 'દ્વિતીય / પ્રિલિમ પરીક્ષા', nameEn: 'Preliminary Exam', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: 'પ્રિલિમિનરી પરીક્ષા • ૫૦ ગુણ' },
    { id: 'periodic_test_1', nameGu: 'એકમ કસોટી - ૧', nameEn: 'Unit Test 1', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: 'એકમ કસોટી ૧ • ૨૫ ગુણ' },
    { id: 'periodic_test_2', nameGu: 'એકમ કસોટી - ૨', nameEn: 'Unit Test 2', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: 'એકમ કસોટી ૨ • ૨૫ ગુણ' },
    { id: 'internal_assessment', nameGu: 'શાળા આંતરિક ગુણ (૨૦)', nameEn: 'Internal Assessment', maxMarksPerSubject: 20, totalExamMax: 140, descriptionGu: 'બોર્ડ આંતરિક ગુણ • ૨૦ ગુણ' },
    { id: 'annual_result', nameGu: 'વાર્ષિક પરિણામ પત્રક', nameEn: 'Annual Result', maxMarksPerSubject: 100, totalExamMax: 700, descriptionGu: 'વાર્ષિક આખરી પરિણામ પત્રક' },
  ];
}

/**
 * Extracts a numeric mark from records
 */
function extractMarkValue(records: MarkRecord[], subjectId: string, examMatches: (examType: string) => boolean): number | null {
  const found = records.find((m) => {
    const sId = (m.subjectId || '').toLowerCase();
    const sName = (m.subjectName || '').toLowerCase();
    const subMatch = sId === subjectId.toLowerCase() || sId.includes(subjectId.toLowerCase()) || sName.includes(subjectId.toLowerCase());
    return subMatch && examMatches((m.examType || '').toLowerCase());
  });
  if (!found) return null;
  if (found.overallGrade === 'AB') return 0;
  return found.totalObtained !== undefined ? found.totalObtained : null;
}

/**
 * Computes Dedicated Single Exam Result (First Exam or Second Exam)
 * Supports all 7 subjects (Gujarati, Maths, Science, Social Science, English, Hindi, Sanskrit)
 * Max marks: 50 per subject, Total Max: 350
 */
export function computeSingleExamStudentResult(
  student: Student,
  studentMarks: MarkRecord[],
  examId: 'first_exam' | 'second_exam'
): StudentResultClass9 {
  const isFirst = examId === 'first_exam';
  const examKeywords = isFirst ? ['first', 'pratham', 'પ્રથમ'] : ['second', 'dwitiya', 'દ્વિતીય'];
  const subjects = FIRST_SECOND_EXAM_SUBJECTS;
  const totalMax = subjects.length * 50; // 350

  const scores = subjects.map((subj) => {
    const rawVal = extractMarkValue(studentMarks, subj.id, (t) => examKeywords.some((k) => t.includes(k)));
    const hasUnenteredMarks = rawVal === null;
    const obtained = rawVal !== null ? rawVal : 0;
    const grade = rawVal !== null ? calculateGsebGrade(obtained, 50) : '-';
    const isPassed = obtained >= 17; // >= 33% of 50 is 16.5 ~ 17

    return {
      subject: subj,
      first50: isFirst ? rawVal : null,
      second50: !isFirst ? rawVal : null,
      pt1_raw: null,
      pt1_conv: null,
      pt2_raw: null,
      pt2_conv: null,
      competency: null,
      notebook: null,
      internal20: null,
      annual80: null,
      combined200: null,
      converted100: rawVal, // raw out of 50 for display
      siddhiGiven: 0,
      krupaGiven: 0,
      finalMarksWithGrace: rawVal,
      grade,
      isPassed,
      isEligibleForPromotion: true,
      hasUnenteredMarks,
    };
  });

  const totalObtained = scores.reduce((sum, s) => sum + (s.finalMarksWithGrace || 0), 0);
  const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100 * 10) / 10 : 0;
  const overallGrade = calculateGsebGrade(percentage, 100);
  const hasIncompleteMarks = scores.some((s) => s.hasUnenteredMarks);
  const anySubjectFailed = scores.some((s) => !s.isPassed);

  const overallResult: 'PASS' | 'PASS_WITH_SIDDHI' | 'PASS_WITH_KRUPA' | 'NEEDS_IMPROVEMENT' = anySubjectFailed
    ? 'NEEDS_IMPROVEMENT'
    : 'PASS';
  const overallResultGu = anySubjectFailed ? 'સુધારણા જરૂરી (Needs Improvement)' : 'ઉત્તીર્ણ (Pass)';

  return {
    student,
    rollNumber: student.rollNumber || '',
    grNumber: student.grNumber || '',
    section: student.section || student.division || 'A',
    format: '700',
    scores,
    totalObtained,
    totalMax,
    percentage,
    overallGrade,
    overallResult,
    overallResultGu,
    isEligibleForPromotion: true,
    isEligibleForRank: overallResult === 'PASS',
    siddhiPoolEarned: 0,
    totalSiddhiUsed: 0,
    totalKrupaUsed: 0,
    hasIncompleteMarks,
  };
}

/**
 * Computes Dedicated Single Exam Result for all students and ranks them
 */
export function computeSingleExamAllResults(
  students: Student[],
  marks: MarkRecord[],
  examId: 'first_exam' | 'second_exam'
): StudentResultClass9[] {
  const unranked = students.map((s) => {
    const sMarks = marks.filter((m) => m.studentId === s.id);
    return computeSingleExamStudentResult(s, sMarks, examId);
  });

  // Calculate tie-aware ranks based on totalObtained descending
  const sortedEligible = [...unranked]
    .filter((r) => r.isEligibleForRank && !r.hasIncompleteMarks)
    .sort((a, b) => b.totalObtained - a.totalObtained);

  const rankMap = new Map<string, number>();
  let currentRank = 1;

  for (let i = 0; i < sortedEligible.length; i++) {
    if (i > 0 && sortedEligible[i].totalObtained < sortedEligible[i - 1].totalObtained) {
      currentRank = i + 1;
    }
    rankMap.set(sortedEligible[i].student.id, currentRank);
  }

  return unranked.map((r) => ({
    ...r,
    rank: rankMap.get(r.student.id),
  }));
}

/**
 * Computes full Annual Result for any standard (9, 10, 11, 12)
 */
export function computeMultiStandardStudentResult(
  student: Student,
  studentMarks: MarkRecord[],
  standard: StandardKey,
  stream: StreamKey = 'general',
  format9: '700' | '1000' = '700',
  manualGraceOverrides?: Record<string, { siddhi?: number; krupa?: number }>
): StudentResultClass9 {
  if (standard === '9') {
    return computeClass9StudentResult(student, studentMarks, format9, manualGraceOverrides);
  }

  const subjects = getSubjectsForStandard(standard, stream);
  const totalMax = subjects.length * 100;

  const rawScores: any[] = [];

  for (const subj of subjects) {
    const first50 = extractMarkValue(studentMarks, subj.id, (t) => t.includes('first') || t.includes('pratham') || t.includes('પ્રથમ'));
    const second50 = extractMarkValue(studentMarks, subj.id, (t) => t.includes('second') || t.includes('dwitiya') || t.includes('દ્વિતીય') || t.includes('prelim') || t.includes('પ્રિલિમ'));
    const pt1_raw = extractMarkValue(studentMarks, subj.id, (t) => t.includes('periodic_1') || t.includes('pt1') || t.includes('એકમ_1') || t.includes('એકમ કસોટી ૧') || t.includes('એકમ કસોટી - ૧'));
    const pt2_raw = extractMarkValue(studentMarks, subj.id, (t) => t.includes('periodic_2') || t.includes('pt2') || t.includes('એકમ_2') || t.includes('એકમ કસોટી ૨') || t.includes('એકમ કસોટી - ૨'));
    const internal20 = extractMarkValue(studentMarks, subj.id, (t) => t.includes('internal') || t.includes('આંતરિક'));
    const annual80 = extractMarkValue(studentMarks, subj.id, (t) => t.includes('annual') || t.includes('varshik') || t.includes('વાર્ષિક') || t.includes('board') || t.includes('બોર્ડ'));

    // Check if direct 100 mark exists
    const direct100 = extractMarkValue(studentMarks, subj.id, (t) => t.includes('100') || t.includes('પરિણામ') || t.includes('result'));

    let converted100: number | null = null;
    let combined200: number | null = null;

    if (direct100 !== null) {
      converted100 = direct100;
    } else if (annual80 !== null && first50 !== null && second50 !== null && internal20 !== null) {
      combined200 = first50 + second50 + annual80 + internal20;
      // Round figure rule: combined / 2 (e.g. 15.4 -> 15, 15.5 -> 16; 32.4 -> 32, 32.5 -> 33)
      converted100 = Math.round(combined200 / 2);
    } else if (annual80 !== null && internal20 !== null) {
      converted100 = annual80 + internal20;
    } else if (annual80 !== null) {
      converted100 = annual80;
    } else if (second50 !== null) {
      converted100 = second50;
    } else if (first50 !== null) {
      converted100 = first50 * 2;
    }

    const hasUnenteredMarks = converted100 === null;

    rawScores.push({
      subject: subj,
      first50,
      second50,
      pt1_raw,
      pt1_conv: pt1_raw !== null ? Math.round((pt1_raw / 5) * 10) / 10 : null,
      pt2_raw,
      pt2_conv: pt2_raw !== null ? Math.round((pt2_raw / 5) * 10) / 10 : null,
      competency: null,
      notebook: null,
      internal20,
      annual80,
      combined200,
      converted100,
      hasUnenteredMarks,
    });
  }

  // Grace marks calculation
  const studentOverrides = manualGraceOverrides?.[student.id] || {};
  let totalSiddhiUsed = 0;
  let totalKrupaUsed = 0;

  const scoresWithGrace = rawScores.map((item) => {
    const rawVal = item.converted100 !== null ? item.converted100 : 0;
    const subjId = item.subject.id;
    const manualSiddhi = studentOverrides[subjId]?.siddhi;
    const manualKrupa = studentOverrides[subjId]?.krupa;

    let siddhi = 0;
    let krupa = 0;

    if (manualSiddhi !== undefined) {
      siddhi = Math.max(0, manualSiddhi);
    }
    if (manualKrupa !== undefined) {
      krupa = Math.max(0, manualKrupa);
    }

    totalSiddhiUsed += siddhi;
    totalKrupaUsed += krupa;

    const finalMarksWithGrace = item.converted100 !== null ? Math.min(100, rawVal + siddhi + krupa) : null;
    const effectiveMark = finalMarksWithGrace !== null ? finalMarksWithGrace : 0;
    const grade = item.converted100 !== null ? calculateGsebGrade(effectiveMark, 100) : '-';
    const isPassed = effectiveMark >= 33;
    const isEligibleForPromotion = effectiveMark >= 25;

    return {
      ...item,
      siddhiGiven: siddhi,
      krupaGiven: krupa,
      finalMarksWithGrace,
      grade,
      isPassed,
      isEligibleForPromotion,
    };
  });

  const totalObtained = scoresWithGrace.reduce((acc, curr) => acc + (curr.finalMarksWithGrace || 0), 0);
  const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100 * 10) / 10 : 0;
  const overallGrade = calculateGsebGrade(percentage, 100);

  const hasIncompleteMarks = scoresWithGrace.some((s) => s.hasUnenteredMarks);
  const anySubjectFailed = scoresWithGrace.some((s) => !s.isPassed);
  const isEligibleForPromotion = scoresWithGrace.every((s) => s.isEligibleForPromotion);

  let overallResult: 'PASS' | 'PASS_WITH_SIDDHI' | 'PASS_WITH_KRUPA' | 'NEEDS_IMPROVEMENT' = 'PASS';
  let overallResultGu = 'ઉત્તીર્ણ (Pass)';

  if (anySubjectFailed) {
    overallResult = 'NEEDS_IMPROVEMENT';
    overallResultGu = isEligibleForPromotion ? 'સુધારણા જરૂરી (Needs Improvement)' : 'અપાત્ર (Not Eligible - <25 Marks)';
  } else if (totalKrupaUsed > 0) {
    overallResult = 'PASS_WITH_KRUPA';
    overallResultGu = 'કૃપા ગુણ સાથે ઉત્તીર્ણ (*)';
  } else if (totalSiddhiUsed > 0) {
    overallResult = 'PASS_WITH_SIDDHI';
    overallResultGu = 'સિદ્ધિ ગુણ સાથે ઉત્તીર્ણ (#)';
  }

  const isEligibleForRank = (overallResult === 'PASS' || overallResult === 'PASS_WITH_SIDDHI') && isEligibleForPromotion;

  return {
    student,
    rollNumber: student.rollNumber || '',
    grNumber: student.grNumber || '',
    section: student.section || student.division || 'A',
    format: format9,
    scores: scoresWithGrace,
    totalObtained,
    totalMax,
    percentage,
    overallGrade,
    overallResult,
    overallResultGu,
    isEligibleForPromotion,
    isEligibleForRank,
    siddhiPoolEarned: Math.max(0, Math.min(15, Math.floor(percentage - 33))),
    totalSiddhiUsed,
    totalKrupaUsed,
    hasIncompleteMarks,
  };
}

/**
 * Computes all students results for a standard and computes ranks
 */
export function computeMultiStandardAllResults(
  students: Student[],
  marks: MarkRecord[],
  standard: StandardKey,
  stream: StreamKey = 'general',
  format9: '700' | '1000' = '700',
  manualGraceOverrides?: Record<string, Record<string, { siddhi?: number; krupa?: number }>>,
  activeExamId: string = 'annual_result'
): StudentResultClass9[] {
  // If First Exam or Second Exam is specifically selected, use the dedicated 350-mark exam calculator
  if (activeExamId === 'first_exam' || activeExamId === 'second_exam') {
    return computeSingleExamAllResults(students, marks, activeExamId);
  }

  const unranked = students.map((s) => {
    const sMarks = marks.filter((m) => m.studentId === s.id);
    const overrides = manualGraceOverrides?.[s.id];
    return computeMultiStandardStudentResult(s, sMarks, standard, stream, format9, overrides ? { [s.id]: overrides } : undefined);
  });

  // Calculate tie-aware ranks based on totalObtained descending
  const sortedEligible = [...unranked]
    .filter((r) => r.isEligibleForRank && !r.hasIncompleteMarks)
    .sort((a, b) => b.totalObtained - a.totalObtained);

  const rankMap = new Map<string, number>();
  let currentRank = 1;

  for (let i = 0; i < sortedEligible.length; i++) {
    if (i > 0 && sortedEligible[i].totalObtained < sortedEligible[i - 1].totalObtained) {
      currentRank = i + 1;
    }
    rankMap.set(sortedEligible[i].student.id, currentRank);
  }

  return unranked.map((r) => ({
    ...r,
    rank: rankMap.get(r.student.id),
  }));
}
