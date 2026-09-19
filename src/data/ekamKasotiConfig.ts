import { AllowedStandard } from '../types';

export interface QuestionConfig {
  id: string; // unique key in questionMarks object
  label: string; // Short code, e.g. "Q1", "Q1-A", "Section A"
  description?: string; // Full descriptive title in Gujarati
  section?: string; // Section grouping e.g. "Section A", "Section B"
  maxMarks?: number | null; // Optional: null/undefined if not specified yet
}

export interface SubjectConfig {
  id: string;
  name: string;
  gujaratiName: string;
  englishName: string;
  standard: AllowedStandard;
  totalMarks?: number | null;
  questions: QuestionConfig[];
  isCustom?: boolean;
}

export const ACADEMIC_YEAR = '૨૦૨૬–૨૭';
export const EXAM_NAME = 'એકમ કસોટી – 1';
export const EXAM_TITLE_GUJARATI = 'એકમ કસોટી પ્રથમ સત્ર';

export const EKAM_KASOTI_SUBJECTS: Record<AllowedStandard, SubjectConfig[]> = {
  '9': [
    {
      id: 'std9_gujarati',
      name: 'ગુજરાતી (Gujarati)',
      gujaratiName: 'ગુજરાતી',
      englishName: 'Gujarati',
      standard: '9',
      totalMarks: 25,
      questions: [
        { id: 'q1', label: 'Q1', description: 'પ્રશ્ન ૧', maxMarks: 6 },
        { id: 'q2', label: 'Q2', description: 'પ્રશ્ન ૨', maxMarks: 7 },
        { id: 'q3', label: 'Q3', description: 'પ્રશ્ન ૩', maxMarks: 5 },
        { id: 'q4', label: 'Q4', description: 'પ્રશ્ન ૪', maxMarks: 7 },
      ],
    },
    {
      id: 'std9_maths',
      name: 'ગણિત (Mathematics)',
      gujaratiName: 'ગણિત',
      englishName: 'Mathematics',
      standard: '9',
      totalMarks: 25,
      questions: [
        { id: 'q1', label: 'Q1', description: 'પ્રશ્ન ૧', maxMarks: 3 },
        { id: 'q2', label: 'Q2', description: 'પ્રશ્ન ૨', maxMarks: 7 },
        { id: 'q3', label: 'Q3', description: 'પ્રશ્ન ૩', maxMarks: 8 },
        { id: 'q4', label: 'Q4', description: 'પ્રશ્ન ૪', maxMarks: 4 },
        { id: 'q5', label: 'Q5', description: 'પ્રશ્ન ૫', maxMarks: 3 },
      ],
    },
    {
      id: 'std9_science',
      name: 'વિજ્ઞાન અને ટેકનોલોજી (Science & Technology)',
      gujaratiName: 'વિજ્ઞાન અને ટેકનોલોજી',
      englishName: 'Science & Technology',
      standard: '9',
      totalMarks: 25,
      questions: [
        { id: 'secA', label: 'Section A', section: 'Section A (૭ ગુણ)', description: 'વિભાગ A', maxMarks: 7 },
        { id: 'secB', label: 'Section B', section: 'Section B (૬ ગુણ)', description: 'વિભાગ B', maxMarks: 6 },
        { id: 'secC', label: 'Section C', section: 'Section C (૬ ગુણ)', description: 'વિભાગ C', maxMarks: 6 },
        { id: 'secD', label: 'Section D', section: 'Section D (૬ ગુણ)', description: 'વિભાગ D', maxMarks: 6 },
      ],
    },
    {
      id: 'std9_social_science',
      name: 'સામાજિક વિજ્ઞાન (Social Science)',
      gujaratiName: 'સામાજિક વિજ્ઞાન',
      englishName: 'Social Science',
      standard: '9',
      totalMarks: 25,
      questions: [
        { id: 'secA', label: 'Section A', description: 'વિભાગ A', maxMarks: 6 },
        { id: 'secB', label: 'Section B', description: 'વિભાગ B', maxMarks: 6 },
        { id: 'secC', label: 'Section C', description: 'વિભાગ C', maxMarks: 9 },
        { id: 'secD', label: 'Section D', description: 'વિભાગ D', maxMarks: 4 },
      ],
    },
  ],
  '10': [
    {
      id: 'std10_gujarati',
      name: 'ગુજરાતી (Gujarati)',
      gujaratiName: 'ગુજરાતી',
      englishName: 'Gujarati',
      standard: '10',
      totalMarks: 25,
      questions: [
        { id: 'secA', label: 'Section A', section: 'Section A (૭ ગુણ)', description: 'વિભાગ A', maxMarks: 7 },
        { id: 'secB', label: 'Section B', section: 'Section B (૭ ગુણ)', description: 'વિભાગ B', maxMarks: 7 },
        { id: 'secC', label: 'Section C', section: 'Section C (૭ ગુણ)', description: 'વિભાગ C', maxMarks: 7 },
        { id: 'secD', label: 'Section D', section: 'Section D (૪ ગુણ)', description: 'વિભાગ D', maxMarks: 4 },
      ],
    },
    {
      id: 'std10_maths',
      name: 'ગણિત (Mathematics)',
      gujaratiName: 'ગણિત',
      englishName: 'Mathematics',
      standard: '10',
      totalMarks: 25,
      questions: [
        { id: 'q1', label: 'Q1', description: 'પ્રશ્ન ૧', maxMarks: 3 },
        { id: 'q2', label: 'Q2', description: 'પ્રશ્ન ૨', maxMarks: 3 },
        { id: 'q3', label: 'Q3', description: 'પ્રશ્ન ૩', maxMarks: 4 },
        { id: 'q4', label: 'Q4', description: 'પ્રશ્ન ૪', maxMarks: 6 },
        { id: 'q5', label: 'Q5', description: 'પ્રશ્ન ૫', maxMarks: 5 },
        { id: 'q6', label: 'Q6', description: 'પ્રશ્ન ૬', maxMarks: 4 },
      ],
    },
    {
      id: 'std10_science',
      name: 'વિજ્ઞાન અને ટેકનોલોજી (Science & Technology)',
      gujaratiName: 'વિજ્ઞાન અને ટેકનોલોજી',
      englishName: 'Science & Technology',
      standard: '10',
      totalMarks: 25,
      questions: [
        { id: 'secA', label: 'Section A', section: 'Section A (૭ ગુણ)', description: 'વિભાગ A', maxMarks: 7 },
        { id: 'secB', label: 'Section B', section: 'Section B (૬ ગુણ)', description: 'વિભાગ B', maxMarks: 6 },
        { id: 'secC', label: 'Section C', section: 'Section C (૬ ગુણ)', description: 'વિભાગ C', maxMarks: 6 },
        { id: 'secD', label: 'Section D', section: 'Section D (૬ ગુણ)', description: 'વિભાગ D', maxMarks: 6 },
      ],
    },
    {
      id: 'std10_social_science',
      name: 'સામાજિક વિજ્ઞાન (Social Science)',
      gujaratiName: 'સામાજિક વિજ્ઞાન',
      englishName: 'Social Science',
      standard: '10',
      totalMarks: 25,
      questions: [
        { id: 'secA', label: 'Section A', section: 'Section A (૬ ગુણ)', description: 'વિભાગ A', maxMarks: 6 },
        { id: 'secB', label: 'Section B', section: 'Section B (૬ ગુણ)', description: 'વિભાગ B', maxMarks: 6 },
        { id: 'secC', label: 'Section C', section: 'Section C (૯ ગુણ)', description: 'વિભાગ C', maxMarks: 9 },
        { id: 'secD', label: 'Section D', section: 'Section D (૪ ગુણ)', description: 'વિભાગ D', maxMarks: 4 },
      ],
    },
  ],
  '11': [
    {
      id: 'std11_english',
      name: 'English (અંગ્રેજી)',
      gujaratiName: 'અંગ્રેજી',
      englishName: 'English',
      standard: '11',
      totalMarks: 25,
      questions: [
        { id: 'secA', label: 'Section A', description: 'Section A', maxMarks: 6 },
        { id: 'secB', label: 'Section B', description: 'Section B', maxMarks: 6 },
        { id: 'secC', label: 'Section C', description: 'Section C', maxMarks: 6 },
        { id: 'secD', label: 'Section D', description: 'Section D', maxMarks: 2 },
        { id: 'secE', label: 'Section E', description: 'Section E', maxMarks: 5 },
      ],
    },
    {
      id: 'std11_economics',
      name: 'Economics (અર્થશાસ્ત્ર)',
      gujaratiName: 'અર્થશાસ્ત્ર',
      englishName: 'Economics',
      standard: '11',
      totalMarks: 25,
      questions: [
        { id: 'secA', label: 'Section A', description: '5 questions × 1 = 5', maxMarks: 5 },
        { id: 'secB', label: 'Section B', description: '5 questions × 1 = 5', maxMarks: 5 },
        { id: 'secC', label: 'Section C', description: '2 questions × 2 = 4', maxMarks: 4 },
        { id: 'secD', label: 'Section D', description: '3 questions × 3 (Answer any 2, Max = 6)', maxMarks: 6 },
        { id: 'secE', label: 'Section E', description: '2 questions × 5 (Answer any 1, Max = 5)', maxMarks: 5 },
      ],
    },
  ],
  '12': [
    {
      id: 'std12_english',
      name: 'English (અંગ્રેજી)',
      gujaratiName: 'અંગ્રેજી',
      englishName: 'English',
      standard: '12',
      totalMarks: 25,
      questions: [
        { id: 'secA', label: 'Section A', description: 'Section A (૫ ગુણ)', maxMarks: 5 },
        { id: 'secB', label: 'Section B', description: 'Section B (૫ ગુણ)', maxMarks: 5 },
        { id: 'secC', label: 'Section C', description: 'Section C (૫ ગુણ)', maxMarks: 5 },
        { id: 'secD', label: 'Section D', description: 'Section D (૫ ગુણ)', maxMarks: 5 },
        { id: 'secE', label: 'Section E', description: 'Section E (૫ ગુણ)', maxMarks: 5 },
      ],
    },
    {
      id: 'std12_economics',
      name: 'Economics (અર્થશાસ્ત્ર)',
      gujaratiName: 'અર્થશાસ્ત્ર',
      englishName: 'Economics',
      standard: '12',
      totalMarks: 25,
      questions: [
        { id: 'secA', label: 'Section A', description: 'વિભાગ A (૫ ગુણ)', maxMarks: 5 },
        { id: 'secB', label: 'Section B', description: 'વિભાગ B (૫ ગુણ)', maxMarks: 5 },
        { id: 'secC', label: 'Section C', description: 'વિભાગ C (૪ ગુણ)', maxMarks: 4 },
        { id: 'secD', label: 'Section D', description: 'વિભાગ D (૬ ગુણ)', maxMarks: 6 },
        { id: 'secE', label: 'Section E', description: 'વિભાગ E (૫ ગુણ)', maxMarks: 5 },
      ],
    },
    {
      id: 'std12_gujarati',
      name: 'ગુજરાતી (Gujarati)',
      gujaratiName: 'ગુજરાતી',
      englishName: 'Gujarati',
      standard: '12',
      totalMarks: 25,
      questions: [
        { id: 'secA', label: 'Section A', description: 'વિભાગ A (૭ ગુણ)', maxMarks: 7 },
        { id: 'secB', label: 'Section B', description: 'વિભાગ B (૭ ગુણ)', maxMarks: 7 },
        { id: 'secC', label: 'Section C', description: 'વિભાગ C (૭ ગુણ)', maxMarks: 7 },
        { id: 'secD', label: 'Section D', description: 'વિભાગ D (૪ ગુણ)', maxMarks: 4 },
      ],
    },
    {
      id: 'std12_accounts',
      name: 'નામાના મૂળતત્વો (Elements of Accounts)',
      gujaratiName: 'નામાના મૂળતત્વો',
      englishName: 'Elements of Accounts',
      standard: '12',
      totalMarks: 25,
      questions: [
        { id: 'secA', label: 'Section A', description: 'વિભાગ A (૫ ગુણ)', maxMarks: 5 },
        { id: 'secB', label: 'Section B', description: 'વિભાગ B (૫ ગુણ)', maxMarks: 5 },
        { id: 'secC', label: 'Section C', description: 'વિભાગ C (૫ ગુણ)', maxMarks: 5 },
        { id: 'secD', label: 'Section D', description: 'વિભાગ D (૫ ગુણ)', maxMarks: 5 },
        { id: 'secE', label: 'Section E', description: 'વિભાગ E (૫ ગુણ)', maxMarks: 5 },
      ],
    },
  ],
};

/**
 * Returns the configured subjects for a given Standard
 */
export function getSubjectsForStandard(standard: AllowedStandard): SubjectConfig[] {
  return EKAM_KASOTI_SUBJECTS[standard] || [];
}

/**
 * Calculates sum of max marks for validation
 */
export function calculateTotalMaxMarks(questions: QuestionConfig[]): number {
  return questions.reduce((sum, q) => sum + (typeof q.maxMarks === 'number' ? q.maxMarks : 0), 0);
}
