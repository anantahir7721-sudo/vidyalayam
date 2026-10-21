export type ExamTermType = 'first' | 'second' | 'annual';

export interface ExamTermOption {
  id: ExamTermType;
  label: string; // 'પ્રથમ પરીક્ષા' | 'દ્વિતીય/પ્રિલિમ પરીક્ષા' | 'વાર્ષિક પરીક્ષા'
  defaultTitle: string; // e.g. 'પ્રથમ સત્રાંત પરીક્ષા', 'દ્વિતીય/પ્રિલિમ પરીક્ષા', 'વાર્ષિક પરીક્ષા'
  defaultMonth: string; // e.g. 'ઓક્ટોબર- 2026', 'જાન્યુઆરી- 2026', 'એપ્રિલ- 2026'
}

export const EXAM_TERM_OPTIONS: ExamTermOption[] = [
  {
    id: 'first',
    label: 'પ્રથમ પરીક્ષા',
    defaultTitle: 'પ્રથમ સત્રાંત પરીક્ષા',
    defaultMonth: 'ઓક્ટોબર- 2026',
  },
  {
    id: 'second',
    label: 'દ્વિતીય/પ્રિલિમ પરીક્ષા',
    defaultTitle: 'દ્વિતીય / પ્રિલિમિનરી પરીક્ષા',
    defaultMonth: 'જાન્યુઆરી- 2026',
  },
  {
    id: 'annual',
    label: 'વાર્ષિક પરીક્ષા',
    defaultTitle: 'વાર્ષિક પરીક્ષા',
    defaultMonth: 'એપ્રિલ- 2026',
  },
];

export interface TimetableEntry {
  id: string;
  date: string; // "DD-MM-YYYY" e.g. "06-04-2026"
  day?: string; // e.g. "સોમવાર"
  standard: string; // "9", "10", "11", "12"
  subject: string; // "ગુજરાતી", "ગણિત", "વિજ્ઞાન", etc.
  time?: string; // "11:00 થી 02:00"
}

export interface BlockStudentItem {
  id: string;
  studentName: string;
  rollNumber: string;
  standard: string;
  section?: string;
}

export interface BlockClassSection {
  standard: string;
  section?: string;
  students: BlockStudentItem[];
}

export interface ExamBlock {
  id: string;
  blockNumber: number; // 1, 2, 3...
  blockName: string; // "બ્લોક નં. 01"
  roomName?: string; // "રૂમ નં. 1"
  sections: BlockClassSection[]; // e.g. Std 11 (14) + Std 9 (13)
  totalAllotted: number;
}

export interface SupervisionScheduleRow {
  id: string;
  date: string;
  blockNumber: number;
  allottedCount: number;
  presentCount?: string | number;
  absentCount?: string | number;
  supervisorName?: string;
  supervisorId?: string;
}

export interface AnswerSheetEvaluationRow {
  id: string;
  date: string;
  standard: string;
  subject: string;
  sheetCount: number;
  receivedDate: string;
  returnedDate?: string;
  examinerName?: string;
}

export interface ExamFileSettings {
  examType: ExamTermType;
  examTitle: string; // e.g. "પ્રથમ સત્રાંત પરીક્ષા"
  monthYear: string; // e.g. "ઓક્ટોબર- 2026"
  pageSize: 'a4' | 'legal';
  blocks: ExamBlock[];
  timetable: TimetableEntry[];
  supervisionList: SupervisionScheduleRow[];
  answerSheetList: AnswerSheetEvaluationRow[];
  notes?: string;
  updatedAt?: string;
}
