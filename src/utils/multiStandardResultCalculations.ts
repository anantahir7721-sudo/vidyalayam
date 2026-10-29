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

// Class 10 GSEB All Available Subjects
export const CLASS_10_AVAILABLE_SUBJECTS: Record<string, Class9SubjectDef> = {
  gujarati: { id: 'gujarati', code: '01', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati (FL)', isMainSubject: true, hasFirstSecondExam: true },
  maths_basic: { id: 'maths_basic', code: '18', nameGu: 'ગણિત (બેઝિક)', nameEn: 'Mathematics (Basic)', isMainSubject: true, hasFirstSecondExam: true },
  maths_standard: { id: 'maths_standard', code: '12', nameGu: 'ગણિત (સ્ટાન્ડર્ડ)', nameEn: 'Mathematics (Standard)', isMainSubject: true, hasFirstSecondExam: true },
  science: { id: 'science', code: '10', nameGu: 'વિજ્ઞાન', nameEn: 'Science', isMainSubject: true, hasFirstSecondExam: true },
  social_science: { id: 'social_science', code: '11', nameGu: 'સામાજિક વિજ્ઞાન', nameEn: 'Social Science', isMainSubject: true, hasFirstSecondExam: true },
  english: { id: 'english', code: '16', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English (SL)', isMainSubject: true, hasFirstSecondExam: true },
  hindi: { id: 'hindi', code: '14', nameGu: 'હિન્દી (દ્વિતીય ભાષા)', nameEn: 'Hindi (SL)', isMainSubject: true, hasFirstSecondExam: true },
  sanskrit: { id: 'sanskrit', code: '15', nameGu: 'સંસ્કૃત', nameEn: 'Sanskrit', isMainSubject: true, hasFirstSecondExam: true },
  physical_education: { id: 'physical_education', code: '40', nameGu: 'શારીરિક શિક્ષણ (૫૦ થી.+૫૦ પ્રે.)', nameEn: 'Physical Education', isMainSubject: false, isPrayogik: true, hasFirstSecondExam: true },
  computer: { id: 'computer', code: '42', nameGu: 'કમ્પ્યુટર અધ્યયન (૫૦ થી.+૫૦ પ્રે.)', nameEn: 'Computer Studies', isMainSubject: false, isPrayogik: true, hasFirstSecondExam: true },
};

export interface Std10SubjectConfig {
  defaultMaths: 'basic' | 'standard';
  defaultSecondLanguage: 'sanskrit' | 'hindi';
  defaultCoSubject: 'pt' | 'computer';
  isFinalized?: boolean;
  studentOverrides?: Record<string, {
    maths?: 'basic' | 'standard';
    secondLanguage?: 'sanskrit' | 'hindi';
    coSubject?: 'pt' | 'computer';
  }>;
}

export const DEFAULT_STD_10_SUBJECT_CONFIG: Std10SubjectConfig = {
  defaultMaths: 'basic',
  defaultSecondLanguage: 'sanskrit',
  defaultCoSubject: 'pt',
  isFinalized: false,
};

export function getStd10StudentSubjects(
  student?: Student,
  config?: Std10SubjectConfig
): { mainSubjects: Class9SubjectDef[]; coSubject: Class9SubjectDef; peSubject: Class9SubjectDef; allSubjects: Class9SubjectDef[] } {
  const overrides = config?.studentOverrides?.[student?.id || ''];
  const mathsChoice = overrides?.maths || (student as any)?.mathsType || config?.defaultMaths || 'basic';
  const langChoice = overrides?.secondLanguage || (student as any)?.secondLanguage || config?.defaultSecondLanguage || 'sanskrit';
  const coChoice = overrides?.coSubject || (student as any)?.coSubject || config?.defaultCoSubject || 'pt';

  const mathsSubj = mathsChoice === 'standard' ? CLASS_10_AVAILABLE_SUBJECTS.maths_standard : CLASS_10_AVAILABLE_SUBJECTS.maths_basic;
  const langSubj = langChoice === 'hindi' ? CLASS_10_AVAILABLE_SUBJECTS.hindi : CLASS_10_AVAILABLE_SUBJECTS.sanskrit;
  const coSubj = coChoice === 'computer' ? CLASS_10_AVAILABLE_SUBJECTS.computer : CLASS_10_AVAILABLE_SUBJECTS.physical_education;

  const mainSubjects: Class9SubjectDef[] = [
    CLASS_10_AVAILABLE_SUBJECTS.gujarati,
    mathsSubj,
    CLASS_10_AVAILABLE_SUBJECTS.science,
    CLASS_10_AVAILABLE_SUBJECTS.social_science,
    CLASS_10_AVAILABLE_SUBJECTS.english,
    langSubj,
  ];

  return { mainSubjects, coSubject: coSubj, peSubject: coSubj, allSubjects: [...mainSubjects, coSubj] };
}

// Default Class 10 Subjects list
export const CLASS_10_SUBJECTS: Class9SubjectDef[] = [
  CLASS_10_AVAILABLE_SUBJECTS.gujarati,
  CLASS_10_AVAILABLE_SUBJECTS.maths_basic,
  CLASS_10_AVAILABLE_SUBJECTS.science,
  CLASS_10_AVAILABLE_SUBJECTS.social_science,
  CLASS_10_AVAILABLE_SUBJECTS.english,
  CLASS_10_AVAILABLE_SUBJECTS.sanskrit,
  CLASS_10_AVAILABLE_SUBJECTS.physical_education,
];

// GSEB 10th Grade Function
export function calculateGseb10Grade(marksOutOf100: number): string {
  if (marksOutOf100 >= 91) return 'A1';
  if (marksOutOf100 >= 81) return 'A2';
  if (marksOutOf100 >= 71) return 'B1';
  if (marksOutOf100 >= 61) return 'B2';
  if (marksOutOf100 >= 51) return 'C1';
  if (marksOutOf100 >= 41) return 'C2';
  if (marksOutOf100 >= 33) return 'D';
  if (marksOutOf100 >= 21) return 'E1';
  return 'E2';
}

// Class 11 Subject Configuration (User requested model: 7 Main + 2 Co-subs = 900 Marks)
export interface Std11SubjectConfig {
  electiveLanguage: 'sanskrit' | 'psychology';
  electiveGroup: string[]; // 3 of: ['economics', 'sociology', 'political_science', 'history', 'geography', 'philosophy']
  electiveCoSub: 'art_drawing' | 'music' | 'computer_studies';
}

export const DEFAULT_STD_11_SUBJECT_CONFIG: Std11SubjectConfig = {
  electiveLanguage: 'sanskrit',
  electiveGroup: ['economics', 'sociology', 'geography'],
  electiveCoSub: 'computer_studies',
};

// All available subjects for Std 11
export const STD_11_ALL_AVAILABLE_SUBJECTS: Record<string, Class9SubjectDef> = {
  // Compulsory main (3)
  gujarati: { id: 'gujarati', code: '001', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati (FL)', isMainSubject: true, hasFirstSecondExam: true, isPrayogik: false },
  hindi: { id: 'hindi', code: '014', nameGu: 'હિન્દી', nameEn: 'Hindi', isMainSubject: true, hasFirstSecondExam: true, isPrayogik: false },
  english: { id: 'english', code: '013', nameGu: 'English (અંગ્રેજી)', nameEn: 'English (SL)', isMainSubject: true, hasFirstSecondExam: true, isPrayogik: false },
  
  // Option 1: સંસ્કૃત / મનોવિજ્ઞાન (Choose 1)
  sanskrit: { id: 'sanskrit', code: '129', nameGu: 'સંસ્કૃત', nameEn: 'Sanskrit', isMainSubject: true, hasFirstSecondExam: true, isPrayogik: false },
  psychology: { id: 'psychology', code: '084', nameGu: 'મનોવિજ્ઞાન', nameEn: 'Psychology', isMainSubject: true, hasFirstSecondExam: true, isPrayogik: false },

  // Option 2: કોઈપણ ૩ પસંદ કરો (Choose 3 from 6)
  economics: { id: 'economics', code: '022', nameGu: 'અર્થશાસ્ત્ર', nameEn: 'Economics', isMainSubject: true, hasFirstSecondExam: true, isPrayogik: false },
  sociology: { id: 'sociology', code: '023', nameGu: 'સમાજશાસ્ત્ર', nameEn: 'Sociology', isMainSubject: true, hasFirstSecondExam: true, isPrayogik: false },
  political_science: { id: 'political_science', code: '024', nameGu: 'રાજ્યશાસ્ત્ર', nameEn: 'Political Science', isMainSubject: true, hasFirstSecondExam: true, isPrayogik: false },
  history: { id: 'history', code: '021', nameGu: 'ઇતિહાસ', nameEn: 'History', isMainSubject: true, hasFirstSecondExam: true, isPrayogik: false },
  geography: { id: 'geography', code: '025', nameGu: 'ભૂગોળ', nameEn: 'Geography', isMainSubject: true, hasFirstSecondExam: true, isPrayogik: false },
  philosophy: { id: 'philosophy', code: '136', nameGu: 'તત્વજ્ઞાન', nameEn: 'Philosophy', isMainSubject: true, hasFirstSecondExam: true, isPrayogik: false },

  // Co-subjects (2 subjects: Udyog compulsory + 1 of Chitrakala/Sangeet/Computer)
  udyog: { id: 'udyog', code: '44', nameGu: 'ઉદ્યોગ', nameEn: 'Udyog / Vocational', isMainSubject: false, hasFirstSecondExam: false, isPrayogik: true },
  art_drawing: { id: 'art_drawing', code: '41', nameGu: 'ચિત્રકલા', nameEn: 'Art / Drawing', isMainSubject: false, hasFirstSecondExam: false, isPrayogik: true },
  music: { id: 'music', code: '43', nameGu: 'સંગીત', nameEn: 'Music', isMainSubject: false, hasFirstSecondExam: false, isPrayogik: true },
  computer_studies: { id: 'computer_studies', code: '42', nameGu: 'કોમ્પ્યુટર', nameEn: 'Computer Studies', isMainSubject: false, hasFirstSecondExam: false, isPrayogik: true },
};

/**
 * Returns active 7 main subjects and 2 co-subjects for Class 11 based on configuration
 */
export function getStd11ActiveSubjects(config?: Std11SubjectConfig): {
  mainSubjects: Class9SubjectDef[];
  coSubjects: Class9SubjectDef[];
  allSubjects: Class9SubjectDef[];
} {
  const cfg = config || DEFAULT_STD_11_SUBJECT_CONFIG;
  const langSub = STD_11_ALL_AVAILABLE_SUBJECTS[cfg.electiveLanguage] || STD_11_ALL_AVAILABLE_SUBJECTS.sanskrit;
  const groupIds = Array.isArray(cfg.electiveGroup) && cfg.electiveGroup.length > 0
    ? cfg.electiveGroup
    : ['economics', 'sociology', 'geography'];

  const electives = groupIds
    .map((id) => STD_11_ALL_AVAILABLE_SUBJECTS[id])
    .filter(Boolean);

  const mainSubjects: Class9SubjectDef[] = [
    STD_11_ALL_AVAILABLE_SUBJECTS.gujarati,
    STD_11_ALL_AVAILABLE_SUBJECTS.hindi,
    STD_11_ALL_AVAILABLE_SUBJECTS.english,
    langSub,
    ...electives,
  ];

  const chosenCo = STD_11_ALL_AVAILABLE_SUBJECTS[cfg.electiveCoSub] || STD_11_ALL_AVAILABLE_SUBJECTS.computer_studies;
  const coSubjects: Class9SubjectDef[] = [
    STD_11_ALL_AVAILABLE_SUBJECTS.udyog,
    chosenCo,
  ];

  return {
    mainSubjects,
    coSubjects,
    allSubjects: [...mainSubjects, ...coSubjects],
  };
}

// Class 11 General Stream Subjects (Legacy Fallback)
export const CLASS_11_GENERAL_SUBJECTS: Class9SubjectDef[] = getStd11ActiveSubjects().allSubjects;

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
  format9: '700' | '1000' | '900' = '700',
  examId?: string,
  std11Config?: Std11SubjectConfig
): Class9SubjectDef[] {
  if (standard === '11') {
    const { mainSubjects, coSubjects, allSubjects } = getStd11ActiveSubjects(std11Config);
    if (examId === 'first_exam' || examId === 'second_exam' || examId === 'annual_exam' || examId === 'periodic_test_1' || examId === 'periodic_test_2') {
      return mainSubjects; // 7 main subjects
    }
    if (examId === 'prayogik_annual') {
      return coSubjects; // 2 co-subjects
    }
    if (examId === 'internal_assessment') {
      return allSubjects; // all 9 subjects
    }
    return allSubjects;
  }

  if (standard === '10') {
    if (examId === 'board_practical') {
      return [CLASS_10_AVAILABLE_SUBJECTS.physical_education, CLASS_10_AVAILABLE_SUBJECTS.computer];
    }
    return [
      CLASS_10_AVAILABLE_SUBJECTS.gujarati,
      CLASS_10_AVAILABLE_SUBJECTS.maths_basic,
      CLASS_10_AVAILABLE_SUBJECTS.maths_standard,
      CLASS_10_AVAILABLE_SUBJECTS.science,
      CLASS_10_AVAILABLE_SUBJECTS.social_science,
      CLASS_10_AVAILABLE_SUBJECTS.english,
      CLASS_10_AVAILABLE_SUBJECTS.hindi,
      CLASS_10_AVAILABLE_SUBJECTS.sanskrit,
      CLASS_10_AVAILABLE_SUBJECTS.physical_education,
      CLASS_10_AVAILABLE_SUBJECTS.computer,
    ];
  }

  // First Exam or Second Exam strictly uses the 7 main subjects (Class 9 & 11)
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
      { id: 'first_exam', nameGu: 'પ્રથમ પરીક્ષા', nameEn: 'First Exam (50M)', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: '૭ મુખ્ય વિષયો (ગુજરાતી, ગણિત, વિજ્ઞાન, સા.વિ., અંગ્રેજી, હિન્દી, સંસ્કૃત) • ૫૦ ગુણ • કુલ ૩૫૦ ગુણ' },
      { id: 'second_exam', nameGu: 'દ્વિતીય પરીક્ષા', nameEn: 'Second Exam (50M)', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: '૭ મુખ્ય વિષયો • વિષય દીઠ ૫૦ ગુણ • કુલ ૩૫૦ ગુણ' },
      { id: 'periodic_test_1', nameGu: 'સામાયિક કસોટી ૧', nameEn: 'Samayik 1 (25M)', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: 'સામાયિક કસોટી ૧ • ૨૫ ગુણ (આંતરિક માટે /૫ રૂપાંતરણ)' },
      { id: 'periodic_test_2', nameGu: 'સામાયિક કસોટી ૨', nameEn: 'Samayik 2 (25M)', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: 'સામાયિક કસોટી ૨ • ૨૫ ગુણ (આંતરિક માટે /૫ રૂપાંતરણ)' },
      { id: 'prayogik_annual', nameGu: 'Co-Subject (સહ-અભ્યાસિક/પ્રાયોગિક)', nameEn: 'Co subject (80M)', maxMarksPerSubject: 80, totalExamMax: 240, descriptionGu: '૩ પ્રાયોગિક વિષયો: કમ્પ્યુટર, પી.ઈ., ચિત્રકામ • ૪૦ થિયરી + ૪૦ પ્રાયોગિક (કુલ ૮૦)' },
      { id: 'internal_assessment', nameGu: 'Internal (આંતરિક ગુણ)', nameEn: 'Internal (20M)', maxMarksPerSubject: 20, totalExamMax: 200, descriptionGu: 'મુખ્ય: ૫+૫+૫+૫ | પ્રાયોગિક: ૧૦+૧૦ • કુલ ૨૦ ગુણ' },
      { id: 'annual_exam', nameGu: 'Third Exam (વાર્ષિક પરીક્ષા)', nameEn: 'Third Exam (80M)', maxMarksPerSubject: 80, totalExamMax: 560, descriptionGu: '૭ મુખ્ય વિષયો • થિયરી ૮૦ ગુણ' },
      { id: 'siddhi_krupa_entry', nameGu: 'સિદ્ધિ–કૃપા ગુણ (Siddhi Krupa gun)', nameEn: 'Siddhi Krupa gun', maxMarksPerSubject: 15, totalExamMax: 25, descriptionGu: '૭ મુખ્ય વિષયોના ટકા − ૩૩% = સિદ્ધિ ગુણ (મહત્તમ ૧૫) + કૃપા ગુણ (મહત્તમ ૧૦)' },
    ];
  }

  if (standard === '10') {
    return [
      { id: 'first_exam', nameGu: 'પ્રથમ પરીક્ષા (૮૦ ગુણ)', nameEn: 'First Exam (80M)', maxMarksPerSubject: 80, totalExamMax: 480, descriptionGu: '૬ મુખ્ય વિષયો ૮૦ ગુણ (કુલ ૪૮૦) + શારીરિક શિક્ષણ/કમ્પ્યુટર (૫૦ થી.+૫૦ પ્રે.)' },
      { id: 'second_exam', nameGu: 'દ્વિતીય / પ્રિલિમ પરીક્ષા (૮૦ ગુણ)', nameEn: 'Preliminary Exam (80M)', maxMarksPerSubject: 80, totalExamMax: 480, descriptionGu: '૬ મુખ્ય વિષયો ૮૦ ગુણ (કુલ ૪૮૦) + શારીરિક શિક્ષણ/કમ્પ્યુટર (૫૦ થી.+૫૦ પ્રે.)' },
      { id: 'internal_assessment', nameGu: 'શાળા આંતરિક મૂલ્યાંકન (૨૦ ગુણ)', nameEn: 'Internal Assessment (20M)', maxMarksPerSubject: 20, totalExamMax: 120, descriptionGu: '૬ મુખ્ય વિષયો દીઠ ૨૦ ગુણ શાળા કક્ષાએ આંતરિક ગુણ' },
      { id: 'board_practical', nameGu: 'પ્રાયોગિક બોર્ડ પરીક્ષા (સહ-વિષય)', nameEn: 'Board Practical (100M)', maxMarksPerSubject: 100, totalExamMax: 100, descriptionGu: '૫૦ થિયરી + ૫૦ પ્રેક્ટિકલ = ૧૦૦ ગુણ (શારીરિક શિક્ષણ અથવા કમ્પ્યુટર)' },
      { id: 'board_exam', nameGu: 'બોર્ડ પરીક્ષા એન્ટ્રી (૮૦ ગુણ)', nameEn: 'Board Exam Entry (80M)', maxMarksPerSubject: 80, totalExamMax: 480, descriptionGu: '૬ મુખ્ય વિષયો • ૮૦ માંથી ગુણ (બેઠક નંબર સાથે)' },
      { id: 'annual_result', nameGu: 'આખરી બોર્ડ પરિણામ (૧૦૦ ગુણ / કુલ ૬૦૦)', nameEn: 'Final Board Result (600M)', maxMarksPerSubject: 100, totalExamMax: 600, descriptionGu: '૮૦ બોર્ડ + ૨૦ આંતરિક = ૧૦૦ ગુણ • ૬ મુખ્ય વિષયો (કુલ ૬૦૦) + સહ-વિષય ગ્રેડ' },
    ];
  }

  if (standard === '11') {
    return [
      { id: 'first_exam', nameGu: '🥇 પ્રથમ કસોટી', nameEn: 'First Exam (50M)', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: '૭ મુખ્ય વિષયો • ૫૦ ગુણ • કુલ ૩૫૦ ગુણ' },
      { id: 'second_exam', nameGu: '🥈 દ્વિતીય કસોટી', nameEn: 'Second Exam (50M)', maxMarksPerSubject: 50, totalExamMax: 350, descriptionGu: '૭ મુખ્ય વિષયો • ૫૦ ગુણ • કુલ ૩૫૦ ગુણ' },
      { id: 'periodic_test_1', nameGu: '📝 સામાયિક ૧ (PT 1)', nameEn: 'Samayik 1 (25M)', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: 'સામાયિક કસોટી ૧ • ૨૫ ગુણ' },
      { id: 'periodic_test_2', nameGu: '📝 સામાયિક ૨ (PT 2)', nameEn: 'Samayik 2 (25M)', maxMarksPerSubject: 25, totalExamMax: 175, descriptionGu: 'સામાયિક કસોટી ૨ • ૨૫ ગુણ' },
      { id: 'prayogik_annual', nameGu: '🎨 સહ-અભ્યાસિક (Co-Sub)', nameEn: 'Co subject (80M)', maxMarksPerSubject: 80, totalExamMax: 160, descriptionGu: '૨ સહ-અભ્યાસિક વિષયો: ઉદ્યોગ + પસંદ કરેલ • ૪૦ થિયરી + ૪૦ પ્રાયોગિક (કુલ ૮૦)' },
      { id: 'internal_assessment', nameGu: '📋 આંતરિક ગુણ (૨૦)', nameEn: 'Internal (20M)', maxMarksPerSubject: 20, totalExamMax: 180, descriptionGu: 'મુખ્ય ૭ વિષયો: ૫+૫+૫+૫ | ૨ સહ-અભ્યાસિક: ૧૦+૧૦ • કુલ ૨૦ ગુણ' },
      { id: 'annual_exam', nameGu: '🏆 વાર્ષિક કસોટી (80M)', nameEn: 'Third Exam (80M)', maxMarksPerSubject: 80, totalExamMax: 560, descriptionGu: '૭ મુખ્ય વિષયો • થિયરી ૮૦ ગુણ' },
      { id: 'siddhi_krupa_entry', nameGu: '✨ સિદ્ધિ–કૃપા ગુણ', nameEn: 'Siddhi Krupa gun', maxMarksPerSubject: 15, totalExamMax: 25, descriptionGu: 'કુલ ૯૦૦ ગુણના ટકા − ૩૩% = સિદ્ધિ ગુણ (મહત્તમ ૧૫) + કૃપા ગુણ (મહત્તમ ૧૦)' },
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
 * Robustly matches by subjectId, subjectName, examId, examType, and document ID
 */
function extractMarkValue(records: MarkRecord[], subjectId: string, examMatches: (examType: string) => boolean, targetStudentId?: string): number | null {
  const targetSub = subjectId.toLowerCase().trim();
  const found = records.find((m) => {
    if (targetStudentId && String(m.studentId || '') !== String(targetStudentId)) {
      return false;
    }
    const sId = (m.subjectId || '').toLowerCase().trim();
    const sName = (m.subjectName || '').toLowerCase().trim();
    let subMatch = false;

    if (targetSub === 'science') {
      if (sId === 'social_science' || sId === 'ss' || sName.includes('સામાજિક')) return false;
      subMatch = sId === 'science' || sId === 'sci' || (sName.includes('વિજ્ઞાન') && !sName.includes('સામાજિક'));
    } else if (targetSub === 'social_science') {
      if (sId === 'science' || (sName.includes('વિજ્ઞાન') && !sName.includes('સામાજિક') && sId !== 'social_science' && sId !== 'ss')) return false;
      subMatch = sId === 'social_science' || sId === 'ss' || sName.includes('સામાજિક');
    } else if (targetSub === 'hindi') {
      if (sId === 'sanskrit' || sName.includes('સંસ્કૃત')) return false;
      subMatch = sId === 'hindi' || sId === 'hin' || (sName.includes('હિન્દી') && !sName.includes('સંસ્કૃત'));
    } else if (targetSub === 'sanskrit') {
      if (sId === 'hindi' || sName.includes('હિન્દી')) return false;
      subMatch = sId === 'sanskrit' || sId === 'san' || (sName.includes('સંસ્કૃત') && !sName.includes('હિન્દી'));
    } else if (targetSub === 'maths_basic') {
      subMatch = sId === 'maths_basic' || sId.includes('basic') || sName.includes('બેઝિક') || (sId.includes('math') && !sId.includes('std') && !sName.includes('સ્ટાન્ડર્ડ'));
    } else if (targetSub === 'maths_standard') {
      subMatch = sId === 'maths_standard' || sId.includes('std') || sId.includes('standard') || sName.includes('સ્ટાન્ડર્ડ');
    } else if (targetSub === 'physical_education' || targetSub === 'pe_yoga') {
      subMatch = sId === 'physical_education' || sId === 'pe_yoga' || sId.includes('pe') || sId.includes('yoga') || sName.includes('શારીરિક') || sName.includes('યોગ');
    } else if (targetSub === 'computer' || targetSub === 'computer_studies') {
      subMatch = sId === 'computer' || sId === 'computer_studies' || sId.includes('comp') || sName.includes('કમ્પ્યુટર') || sName.includes('કોમ્પ્યુટર');
    } else if (sId === targetSub) {
      subMatch = true;
    } else if (targetSub === 'gujarati' && (sId.includes('guj') || sName.includes('ગુજરાતી'))) {
      subMatch = true;
    } else if (targetSub === 'maths' && (sId.includes('math') || sName.includes('ગણિત'))) {
      subMatch = true;
    } else if (targetSub === 'english' && (sId.includes('eng') || sName.includes('અંગ્રેજી'))) {
      subMatch = true;
    } else if (targetSub === 'art_drawing' && (sId.includes('art') || sId.includes('draw') || sName.includes('ચિત્ર'))) {
      subMatch = true;
    } else if (targetSub === 'psychology' && (sId.includes('psy') || sName.includes('મનોવિજ્ઞાન'))) {
      subMatch = true;
    } else if (targetSub === 'economics' && (sId.includes('eco') || sName.includes('અર્થશાસ્ત્ર'))) {
      subMatch = true;
    } else if (targetSub === 'sociology' && (sId.includes('soc') || sName.includes('સમાજશાસ્ત્ર'))) {
      subMatch = true;
    } else if (targetSub === 'political_science' && (sId.includes('pol') || sName.includes('રાજ્યશાસ્ત્ર'))) {
      subMatch = true;
    } else if (targetSub === 'history' && (sId.includes('his') || sName.includes('ઇતિહાસ') || sName.includes('ઈતિહાસ'))) {
      subMatch = true;
    } else if (targetSub === 'geography' && (sId.includes('geo') || sName.includes('ભૂગોળ'))) {
      subMatch = true;
    } else if (targetSub === 'philosophy' && (sId.includes('phil') || sName.includes('તત્વજ્ઞાન'))) {
      subMatch = true;
    } else if (targetSub === 'udyog' && (sId.includes('udyog') || sId.includes('ind') || sName.includes('ઉદ્યોગ'))) {
      subMatch = true;
    } else if (targetSub === 'music' && (sId.includes('mus') || sName.includes('સંગીત'))) {
      subMatch = true;
    }

    if (!subMatch) return false;

    const fullExamString = `${(m as any).examId || ''} ${m.examType || ''} ${m.id || ''}`.toLowerCase();
    return examMatches(fullExamString);
  });
  if (!found) return null;
  if (found.overallGrade === 'AB') return 0;
  return found.totalObtained !== undefined && found.totalObtained !== null ? found.totalObtained : null;
}

/**
 * Computes Dedicated Single Exam Result (First Exam or Second Exam)
 * Supports all 7 subjects (Gujarati, Maths, Science, Social Science, English, Hindi, Sanskrit)
 * Max marks: 50 per subject, Total Max: 350
 */
/**
 * Computes Dedicated Single Exam Result (First Exam or Second Exam)
 * Supports all 7 subjects (Gujarati, Hindi, English, Sanskrit/Psychology, 3 electives)
 * Max marks: 50 per subject, Total Max: 350
 */
export function computeSingleExamStudentResult(
  student: Student,
  studentMarks: MarkRecord[],
  examId: 'first_exam' | 'second_exam',
  customSubjects?: Class9SubjectDef[]
): StudentResultClass9 {
  const isFirst = examId === 'first_exam';
  const examKeywords = isFirst ? ['first', 'pratham', 'પ્રથમ'] : ['second', 'dwitiya', 'દ્વિતીય'];
  const subjects = customSubjects && customSubjects.length > 0 ? customSubjects : FIRST_SECOND_EXAM_SUBJECTS;
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
  examId: 'first_exam' | 'second_exam',
  customSubjects?: Class9SubjectDef[]
): StudentResultClass9[] {
  const unranked = students.map((s) => {
    const sMarks = marks.filter((m) => m.studentId === s.id);
    return computeSingleExamStudentResult(s, sMarks, examId, customSubjects);
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
 * Computes full Annual Result for Class 11 (General / Arts).
 * Exactly identical structure to Class 9, with:
 * - 7 Main Subjects (100M each from 50 first + 50 second + 80 annual + 20 internal = 200/2)
 * - 2 Co-Curricular Subjects (100M each from 80 prayogik + 20 internal)
 * - Total Max: 900 Marks!
 * - Siddhi Gun counted from all 900 marks:
 *   e.g. 450/900 = 50% -> 50 - 33 = 17 -> 15 siddhi marks!
 * - Krupa Gun: Up to 10 marks if needed to pass.
 * - Minimum 25 marks rule applies: < 25 in any subject cannot receive grace to pass.
 */
export function computeClass11StudentResult(
  student: Student,
  studentMarks: MarkRecord[],
  std11Config?: Std11SubjectConfig,
  manualGraceOverrides?: Record<string, { siddhi?: number; krupa?: number }>,
  format: "700" | "900" = "900"
): StudentResultClass9 {
  const targetStudentId = String(student.id || '');
  const thisStudentMarks = studentMarks.filter(
    (m) => String(m.studentId || '') === targetStudentId
  );
  const { mainSubjects, coSubjects } = getStd11ActiveSubjects(std11Config);
  const rawScores: any[] = [];

  // 1. Process 7 Main Subjects (200 combined -> 100 converted)
  for (const subj of mainSubjects) {
    const first50 = extractMarkValue(thisStudentMarks, subj.id, (t) => t.includes('first') || t.includes('pratham') || t.includes('પ્રથમ'));
    const second50 = extractMarkValue(thisStudentMarks, subj.id, (t) => t.includes('second') || t.includes('dwitiya') || t.includes('દ્વિતીય') || t.includes('prelim') || t.includes('પ્રિલિમ'));
    const pt1_raw = extractMarkValue(thisStudentMarks, subj.id, (t) => t.includes('periodic_1') || t.includes('pt1') || t.includes('સામાયિક ૧') || t.includes('સામાયિક કસોટી ૧') || t.includes('સામાયિક કસોટી - ૧'));
    const pt2_raw = extractMarkValue(thisStudentMarks, subj.id, (t) => t.includes('periodic_2') || t.includes('pt2') || t.includes('સામાયિક ૨') || t.includes('સામાયિક કસોટી ૨') || t.includes('સામાયિક કસોટી - ૨'));
    const competency = extractMarkValue(thisStudentMarks, subj.id, (t) => t.includes('competency') || t.includes('સજ્જતા'));
    const notebook = extractMarkValue(thisStudentMarks, subj.id, (t) => t.includes('notebook') || t.includes('નોટબુક'));
    const internal20Direct = extractMarkValue(thisStudentMarks, subj.id, (t) => (t.includes('internal') || t.includes('આંતરિક')) && !t.includes('pt1') && !t.includes('pt2') && !t.includes('competency') && !t.includes('notebook'));
    const annual80 = extractMarkValue(thisStudentMarks, subj.id, (t) => (t.includes('annual') || t.includes('varshik') || t.includes('વાર્ષિક') || t.includes('third')) && !t.includes('prayogik'));

    const pt1_conv = pt1_raw !== null ? Math.round((pt1_raw / 25) * 5 * 10) / 10 : null;
    const pt2_conv = pt2_raw !== null ? Math.round((pt2_raw / 25) * 5 * 10) / 10 : null;

    let internal20 = internal20Direct;
    if (internal20 === null && (pt1_conv !== null || pt2_conv !== null || competency !== null || notebook !== null)) {
      internal20 = Math.min(20, Math.round((pt1_conv || 0) + (pt2_conv || 0) + (competency || 0) + (notebook || 0)));
    }

    let combined200: number | null = null;
    let converted100: number | null = null;

    if (annual80 !== null && first50 !== null && second50 !== null && internal20 !== null) {
      combined200 = first50 + second50 + annual80 + internal20;
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

  // 2. Process 2 Co-Subjects (80 Prayogik Annual + 20 Internal = 100) - Only in 900 format
  if (format === "900") {
    for (const subj of coSubjects) {
    const theory40 = extractMarkValue(thisStudentMarks, subj.id, (t) => t.includes('theory40') || (t.includes('theory') && t.includes('40')));
    const practical40 = extractMarkValue(thisStudentMarks, subj.id, (t) => t.includes('practical40') || (t.includes('practical') && t.includes('40') && !t.includes('internal')));
    const practicalWork10 = extractMarkValue(thisStudentMarks, subj.id, (t) => t.includes('practical_work') || t.includes('પ્રાયોગિક કાર્ય'));
    const continuousSkill10 = extractMarkValue(thisStudentMarks, subj.id, (t) => t.includes('continuous_eval') || t.includes('સાતત્યપૂર્ણ') || t.includes('કૌશલ્ય'));
    const directInternal20 = extractMarkValue(thisStudentMarks, subj.id, (t) => (t.includes('internal') || t.includes('આંતરિક')) && !t.includes('practical_work') && !t.includes('continuous'));

    let internal20 = directInternal20;
    if (internal20 === null && (practicalWork10 !== null || continuousSkill10 !== null)) {
      internal20 = Math.min(20, Math.round((practicalWork10 || 0) + (continuousSkill10 || 0)));
    }

    let annual80: number | null = null;
    if (theory40 !== null || practical40 !== null) {
      annual80 = (theory40 || 0) + (practical40 || 0);
    } else {
      const rawAnnual80 = extractMarkValue(thisStudentMarks, subj.id, (t) => t.includes('prayogik') || t.includes('annual_80') || t.includes('co_sub'));
      annual80 = rawAnnual80;
    }

    let converted100: number | null = null;
    if (annual80 !== null && internal20 !== null) {
      converted100 = annual80 + internal20;
    } else if (annual80 !== null) {
      converted100 = annual80;
    } else if (internal20 !== null) {
      converted100 = internal20;
    }

    const hasUnenteredMarks = converted100 === null;

    rawScores.push({
      subject: subj,
      first50: null,
      second50: null,
      pt1_raw: null,
      pt1_conv: null,
      pt2_raw: null,
      pt2_conv: null,
      competency: null,
      notebook: null,
      theory40,
      practical40,
      practicalWork10,
      continuousSkill10,
      internal20,
      annual80,
      combined200: null,
      converted100,
      hasUnenteredMarks,
    });
    }
  }

  // 3. Siddhi Pool calculation:
  const totalMax = format === "700" ? 700 : 900;
  // User Rule: "here siddhi gun can be counted from all 900 marks like if student got 450/900 his percentage is 50% so 50-33= 17 thats more than 15 so he'll get 15 siddhi"
  const rawTotalSum = rawScores.reduce((sum, r) => sum + (r.converted100 ?? 0), 0);
  const rawPercentage = (rawTotalSum / totalMax) * 100;
  const diff = rawPercentage - 33;
  const siddhiPoolEarned = diff > 0 ? Math.min(15, Math.floor(diff)) : 0;

  // 4. Grace distribution & Promotion calculation
  const studentOverrides = manualGraceOverrides?.[student.id] || {};
  let totalSiddhiUsed = 0;
  let totalKrupaUsed = 0;
  let anySubjectIneligibleForPromotion = false;

  const finalScores = rawScores.map((item) => {
    const rawVal = item.converted100 !== null ? item.converted100 : 0;
    const subjId = item.subject.id;
    const isUnder25 = rawVal < 25;
    const isEligibleForPromotion = !isUnder25;

    if (isUnder25) {
      anySubjectIneligibleForPromotion = true;
    }

    const manualSiddhi = studentOverrides[subjId]?.siddhi;
    const manualKrupa = studentOverrides[subjId]?.krupa;

    let siddhi = 0;
    let krupa = 0;

    if (!isUnder25) {
      if (manualSiddhi !== undefined) siddhi = Math.max(0, manualSiddhi);
      if (manualKrupa !== undefined) krupa = Math.max(0, manualKrupa);
    }

    totalSiddhiUsed += siddhi;
    totalKrupaUsed += krupa;

    const finalMarksWithGrace = item.converted100 !== null ? Math.min(100, rawVal + siddhi + krupa) : null;
    const effectiveMark = finalMarksWithGrace !== null ? finalMarksWithGrace : 0;
    const grade = item.converted100 !== null ? calculateGsebGrade(effectiveMark, 100) : '-';
    const isPassed = effectiveMark >= 33;

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

  const totalObtained = finalScores.reduce((acc, curr) => acc + (curr.finalMarksWithGrace || 0), 0);
  const percentage = Math.round((totalObtained / totalMax) * 100 * 10) / 10;
  const overallGrade = calculateGsebGrade(percentage, 100);

  const hasIncompleteMarks = finalScores.some((s) => s.hasUnenteredMarks);
  const anySubjectFailed = finalScores.some((s) => !s.isPassed);
  const isEligibleForPromotion = !anySubjectIneligibleForPromotion;

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
    format,
    scores: finalScores,
    totalObtained,
    totalMax,
    percentage,
    overallGrade,
    overallResult,
    overallResultGu,
    isEligibleForPromotion,
    isEligibleForRank,
    siddhiPoolEarned,
    totalSiddhiUsed,
    totalKrupaUsed,
    hasIncompleteMarks,
  };
}

/**
 * Computes Result for Class 10 (GSEB SSC Board Standard)
 * - 6 Main Subjects (Maths Basic/Std, Science, SS, Gujarati FL, English SL, Sanskrit/Hindi)
 * - 1 Physical Education (50 Theory + 50 Practical) - Grade shown, excluded from 600M percentage
 * - First Exam & Prelim: 80M per main subject (Total 480)
 * - Final Sheet: 100M (80 Board + 20 Internal = 100), Total 600
 * - Grade Scale: A1 (91-100), A2 (81-90), B1 (71-80), B2 (61-70), C1 (51-60), C2 (41-50), D (33-40), E1 (21-32), E2 (<=20)
 */
export function computeClass10StudentResult(
  student: Student,
  studentMarks: MarkRecord[],
  std10Config?: Std10SubjectConfig,
  activeExamId: string = 'annual_result'
): StudentResultClass9 {
  const targetStudentId = String(student.id || '');
  const thisStudentMarks = studentMarks.filter(
    (m) => String(m.studentId || '') === targetStudentId
  );
  const { mainSubjects, coSubject } = getStd10StudentSubjects(student, std10Config);

  // If first_exam or second_exam: 80 marks per subject
  if (activeExamId === 'first_exam' || activeExamId === 'second_exam') {
    const rawScores: any[] = [];
    const isFirst = activeExamId === 'first_exam';
    const examKeyword = isFirst ? 'first' : 'second';
    const examGujKeyword = isFirst ? 'પ્રથમ' : 'દ્વિતીય';

    for (const subj of mainSubjects) {
      const mark80 = extractMarkValue(thisStudentMarks, subj.id, (t) =>
        (t.includes(examKeyword) || t.includes(examGujKeyword) || t.includes(isFirst ? 'pratham' : 'dwitiya') || t.includes('prelim') || t.includes('પ્રિલિમ')) &&
        !t.includes('practical') && !t.includes('internal') && !t.includes('board')
      );

      const hasUnenteredMarks = mark80 === null;
      const converted100 = mark80 !== null ? Math.round((mark80 / 80) * 100) : null;
      const grade = converted100 !== null ? calculateGseb10Grade(converted100) : '-';
      const isPassed = mark80 !== null ? mark80 >= 26 : false;

      rawScores.push({
        subject: subj,
        first50: isFirst ? mark80 : null,
        second50: !isFirst ? mark80 : null,
        pt1_raw: null,
        pt1_conv: null,
        pt2_raw: null,
        pt2_conv: null,
        competency: null,
        notebook: null,
        internal20: null,
        annual80: null,
        combined200: null,
        converted100: mark80,
        siddhiGiven: 0,
        krupaGiven: 0,
        finalMarksWithGrace: mark80,
        grade,
        isPassed,
        isEligibleForPromotion: true,
        hasUnenteredMarks,
      });
    }

    // Co-Subject (Physical Education or Computer Studies): 50 Theory + 50 Practical = 100
    const peTheory = extractMarkValue(thisStudentMarks, coSubject.id, (t) =>
      (t.includes('theory') || t.includes('થિયરી')) && (t.includes(examKeyword) || t.includes(examGujKeyword) || t.includes('pe') || t.includes('comp'))
    );
    const pePractical = extractMarkValue(thisStudentMarks, coSubject.id, (t) =>
      (t.includes('practical') || t.includes('પ્રાયોગિક')) && (t.includes(examKeyword) || t.includes(examGujKeyword) || t.includes('pe') || t.includes('comp'))
    );
    const peDirect = extractMarkValue(thisStudentMarks, coSubject.id, (t) =>
      (t.includes(examKeyword) || t.includes(examGujKeyword)) && !t.includes('theory') && !t.includes('practical')
    );
    let pe100 = peDirect;
    if (pe100 === null && (peTheory !== null || pePractical !== null)) {
      pe100 = (peTheory || 0) + (pePractical || 0);
    }
    const peGrade = pe100 !== null ? calculateGseb10Grade(pe100) : '-';

    rawScores.push({
      subject: coSubject,
      first50: null,
      second50: null,
      pt1_raw: null,
      pt1_conv: null,
      pt2_raw: null,
      pt2_conv: null,
      competency: null,
      notebook: null,
      internal20: null,
      annual80: null,
      combined200: null,
      converted100: pe100,
      siddhiGiven: 0,
      krupaGiven: 0,
      finalMarksWithGrace: pe100,
      grade: peGrade,
      isPassed: pe100 !== null ? pe100 >= 33 : false,
      isEligibleForPromotion: true,
      hasUnenteredMarks: pe100 === null,
    });

    const mainScores = rawScores.filter((s) => s.subject.isMainSubject);
    const totalObtained = mainScores.reduce((sum, s) => sum + (s.finalMarksWithGrace || 0), 0);
    const totalMax = 480;
    const percentage = Math.round((totalObtained / totalMax) * 100 * 10) / 10;
    const overallGrade = calculateGseb10Grade(percentage);
    const anyFailed = mainScores.some((s) => !s.isPassed);

    return {
      student,
      rollNumber: student.rollNumber || '',
      grNumber: student.grNumber || '',
      section: student.section || student.division || 'A',
      format: '480',
      scores: rawScores,
      totalObtained,
      totalMax,
      percentage,
      overallGrade,
      overallResult: anyFailed ? 'NEEDS_IMPROVEMENT' : 'PASS',
      overallResultGu: anyFailed ? 'સુધારણા જરૂરી (Needs Improvement)' : 'ઉત્તીર્ણ (Pass)',
      isEligibleForPromotion: !anyFailed,
      isEligibleForRank: !anyFailed,
      siddhiPoolEarned: 0,
      totalSiddhiUsed: 0,
      totalKrupaUsed: 0,
      hasIncompleteMarks: rawScores.some((s) => s.hasUnenteredMarks),
    };
  }

  // Final Sheet / Board Exam (80 Board + 20 Internal = 100 per subject, Total 600)
  const rawScores: any[] = [];

  for (const subj of mainSubjects) {
    const board80 = extractMarkValue(thisStudentMarks, subj.id, (t) =>
      (t.includes('board') || t.includes('બોર્ડ') || t.includes('annual_80') || t.includes('theory')) && !t.includes('internal') && !t.includes('practical')
    );
    const internal20 = extractMarkValue(thisStudentMarks, subj.id, (t) =>
      t.includes('internal') || t.includes('આંતરિક') || t.includes('school_eval')
    );
    const direct100 = extractMarkValue(thisStudentMarks, subj.id, (t) =>
      t.includes('final_100') || t.includes('annual_100') || t.includes('total_100')
    );

    let converted100: number | null = null;
    if (direct100 !== null) {
      converted100 = direct100;
    } else if (board80 !== null && internal20 !== null) {
      converted100 = Math.min(100, board80 + internal20);
    } else if (board80 !== null) {
      converted100 = board80;
    } else if (internal20 !== null) {
      converted100 = internal20;
    }

    const hasUnenteredMarks = converted100 === null;
    const grade = converted100 !== null ? calculateGseb10Grade(converted100) : '-';
    const isPassed = converted100 !== null ? converted100 >= 33 : false;

    rawScores.push({
      subject: subj,
      first50: null,
      second50: null,
      pt1_raw: null,
      pt1_conv: null,
      pt2_raw: null,
      pt2_conv: null,
      competency: null,
      notebook: null,
      internal20,
      annual80: board80,
      combined200: null,
      converted100,
      siddhiGiven: 0,
      krupaGiven: 0,
      finalMarksWithGrace: converted100,
      grade,
      isPassed,
      isEligibleForPromotion: isPassed,
      hasUnenteredMarks,
    });
  }

  // Co-Subject (Physical Education or Computer Studies: 50 Theory + 50 Practical = 100)
  const peTheory = extractMarkValue(thisStudentMarks, coSubject.id, (t) =>
    (t.includes('theory') || t.includes('થિયરી')) && (t.includes('board') || t.includes('practical') || t.includes('pe') || t.includes('comp'))
  );
  const pePractical = extractMarkValue(thisStudentMarks, coSubject.id, (t) =>
    (t.includes('practical') || t.includes('પ્રાયોગિક')) && (t.includes('board') || t.includes('practical') || t.includes('pe') || t.includes('comp'))
  );
  const peDirect = extractMarkValue(thisStudentMarks, coSubject.id, (t) =>
    (t.includes('board') || t.includes('annual')) && !t.includes('theory') && !t.includes('practical')
  );
  let pe100 = peDirect;
  if (pe100 === null && (peTheory !== null || pePractical !== null)) {
    pe100 = Math.min(100, (peTheory || 0) + (pePractical || 0));
  }
  const peGrade = pe100 !== null ? calculateGseb10Grade(pe100) : '-';

  rawScores.push({
    subject: coSubject,
    first50: null,
    second50: null,
    pt1_raw: null,
    pt1_conv: null,
    pt2_raw: null,
    pt2_conv: null,
    competency: null,
    notebook: null,
    internal20: null,
    annual80: peTheory,
    combined200: null,
    converted100: pe100,
    siddhiGiven: 0,
    krupaGiven: 0,
    finalMarksWithGrace: pe100,
    grade: peGrade,
    isPassed: pe100 !== null ? pe100 >= 33 : false,
    isEligibleForPromotion: true,
    hasUnenteredMarks: pe100 === null,
  });

  // Main 6 subjects sum (out of 600)
  const mainScores = rawScores.filter((s) => s.subject.isMainSubject);
  const totalObtained = mainScores.reduce((sum, s) => sum + (s.finalMarksWithGrace || 0), 0);
  const totalMax = 600;
  const percentage = Math.round((totalObtained / totalMax) * 100 * 10) / 10;
  const overallGrade = calculateGseb10Grade(percentage);
  const anyFailed = mainScores.some((s) => !s.isPassed);

  return {
    student,
    rollNumber: student.rollNumber || '',
    grNumber: student.grNumber || '',
    section: student.section || student.division || 'A',
    format: '600',
    scores: rawScores,
    totalObtained,
    totalMax,
    percentage,
    overallGrade,
    overallResult: anyFailed ? 'NEEDS_IMPROVEMENT' : 'PASS',
    overallResultGu: anyFailed ? 'સુધારણા જરૂરી (Needs Improvement)' : 'ઉત્તીર્ણ (Pass)',
    isEligibleForPromotion: !anyFailed,
    isEligibleForRank: !anyFailed,
    siddhiPoolEarned: 0,
    totalSiddhiUsed: 0,
    totalKrupaUsed: 0,
    hasIncompleteMarks: rawScores.some((s) => s.hasUnenteredMarks),
  };
}

/**
 * Computes full Annual Result for any standard (9, 10, 11, 12)
 */
export function computeMultiStandardStudentResult(
  student: Student,
  studentMarks: MarkRecord[],
  standard: StandardKey,
  stream: StreamKey = 'general',
  format9: '700' | '1000' | '900' = '700',
  manualGraceOverrides?: Record<string, { siddhi?: number; krupa?: number }>,
  std11Config?: Std11SubjectConfig,
  activeExamId: string = 'annual_result',
  std10Config?: Std10SubjectConfig
): StudentResultClass9 {
  if (standard === '9') {
    return computeClass9StudentResult(student, studentMarks, format9 === '1000' ? '1000' : '700', manualGraceOverrides);
  }
  if (standard === '10') {
    return computeClass10StudentResult(student, studentMarks, std10Config, activeExamId);
  }
  if (standard === '11') {
    return computeClass11StudentResult(student, studentMarks, std11Config, manualGraceOverrides, format9 === '700' ? '700' : '900');
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
  format9: '700' | '1000' | '900' = '700',
  manualGraceOverrides?: Record<string, Record<string, { siddhi?: number; krupa?: number }>>,
  activeExamId: string = 'annual_result',
  std11Config?: Std11SubjectConfig,
  std10Config?: Std10SubjectConfig
): StudentResultClass9[] {
  // If First Exam or Second Exam is specifically selected, use the dedicated 350-mark exam calculator (except Std 10 which has 80M x 6 + 100M Co-Sub)
  if ((activeExamId === 'first_exam' || activeExamId === 'second_exam') && standard !== '10') {
    const subjectsToUse = standard === '11'
      ? getStd11ActiveSubjects(std11Config).mainSubjects
      : FIRST_SECOND_EXAM_SUBJECTS;
    return computeSingleExamAllResults(students, marks, activeExamId, subjectsToUse);
  }

  const unranked = students.map((s) => {
    const sMarks = marks.filter((m) => String(m.studentId || '') === String(s.id || ''));
    const overrides = manualGraceOverrides?.[s.id];
    return computeMultiStandardStudentResult(s, sMarks, standard, stream, format9, overrides, std11Config, activeExamId, std10Config);
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
