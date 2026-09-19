import { AllowedStandard, Student } from './index';

export type OnlineExamType = 'school_exam' | 'extra_exam';

export type OnlineExamStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';

export type ResultVisibilityType = 'immediate' | 'later';

export interface OnlineExam {
  id: string;
  schoolId: string;
  examType: OnlineExamType; // 'school_exam' (PT, Udyog, Chitrakala, Computer) vs 'extra_exam' (GK, Quiz, Practice, Competition)
  title: string;
  standard: AllowedStandard | string;
  subject: string;
  instructions?: string;
  durationMinutes: number; // e.g. 30, 45, 60
  scheduledDate: string; // YYYY-MM-DD
  scheduledStartTime: string; // HH:mm (24-hour)
  scheduledStartTimestamp: number; // Epoch ms timestamp
  status: OnlineExamStatus;
  resultVisibility: ResultVisibilityType;
  totalMarks: number;
  passingMarks?: number;
  questionsCount: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MCQQuestion {
  id: string;
  examId?: string;
  schoolId: string;
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D' | ''; // empty string if not determined yet during AI review
  marks: number;
  imageUrl?: string;
  aiConfidence?: 'high' | 'medium' | 'low';
  needsReview?: boolean;
  reviewNotes?: string;
  topic?: string;
  subject?: string;
  standard?: string;
}

export interface QuestionBankItem {
  id: string;
  schoolId: string;
  standard: string;
  subject: string;
  topic?: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  marks: number;
  imageUrl?: string;
  createdAt: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  standard: string;
  grNumber?: string;
  rollNumber?: string;
  startedAt: number; // Timestamp ms
  expiresAt: number; // Timestamp ms
  submittedAt?: number; // Timestamp ms
  status: 'in_progress' | 'submitted' | 'timed_out';
  answers: Record<string, string>; // questionId -> 'A' | 'B' | 'C' | 'D'
  score: number;
  totalMarks: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  percentage: number;
  ipAddress?: string;
}

export interface StudentSession {
  student: Student;
  schoolId?: string;
  schoolName?: string;
  diseCode?: string;
  district?: string;
  schoolLogo?: string;
  school: {
    id: string;
    schoolName: string;
    diseCode: string;
    district?: string;
    address?: string;
    principalName?: string;
    logoUrl?: string;
  };
  loginAt: number;
  sessionToken: string;
}
