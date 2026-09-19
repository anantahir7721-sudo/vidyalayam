import { AllowedStandard, Student, MarkRecord } from '../types';

export interface ExamDef {
  id: string;
  nameGu: string;
  nameEn: string;
  maxMarks: number;
  weightage: number; // Percentage contribution to 100 (e.g., 10 for Pratham, 10 for Dwitiya, 60 for Varshik, 20 for Internal)
}

export interface SubjectDef {
  id: string;
  code?: string;
  nameGu: string;
  nameEn: string;
  isMainSubject: boolean; // Counts in 600/700 grand total
}

// Standard 9 Curriculum
export const STD_9_EXAMS: ExamDef[] = [
  { id: 'pratham', nameGu: 'પ્રથમ પરીક્ષા', nameEn: 'First Exam', maxMarks: 50, weightage: 10 },
  { id: 'dwitiya', nameGu: 'દ્વિતીય પરીક્ષા', nameEn: 'Second Exam', maxMarks: 50, weightage: 10 },
  { id: 'varshik', nameGu: 'વાર્ષિક પરીક્ષા', nameEn: 'Annual Exam', maxMarks: 80, weightage: 60 },
  { id: 'internal', nameGu: 'આંતરિક મૂલ્યાંકન', nameEn: 'Internal Assessment', maxMarks: 20, weightage: 20 },
];

export const STD_9_SUBJECTS: SubjectDef[] = [
  { id: 'gujarati', code: '01', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati (FL)', isMainSubject: true },
  { id: 'maths', code: '12', nameGu: 'ગણિત', nameEn: 'Mathematics', isMainSubject: true },
  { id: 'science', code: '11', nameGu: 'વિજ્ઞાન અને ટેકનોલોજી', nameEn: 'Science & Tech', isMainSubject: true },
  { id: 'social_science', code: '10', nameGu: 'સામાજિક વિજ્ઞાન', nameEn: 'Social Science', isMainSubject: true },
  { id: 'english', code: '16', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English (SL)', isMainSubject: true },
  { id: 'hindi_sanskrit', code: '14', nameGu: 'હિન્દી / સંસ્કૃત', nameEn: 'Hindi / Sanskrit', isMainSubject: true },
  { id: 'pe_computer', code: '40', nameGu: 'શારીરિક શિક્ષણ / કમ્પ્યુટર', nameEn: 'P.E. / Computer', isMainSubject: false },
];

// Standard 10 Curriculum (Pratham & Prelims; 3rd is GSEB Board Exam)
export const STD_10_EXAMS: ExamDef[] = [
  { id: 'pratham', nameGu: 'પ્રથમ સત્રાંત પરીક્ષા', nameEn: 'First Terminal Exam', maxMarks: 50, weightage: 50 },
  { id: 'prelim', nameGu: 'પ્રિલિમિનરી પરીક્ષા', nameEn: 'Preliminary Exam', maxMarks: 80, weightage: 80 },
  { id: 'internal', nameGu: 'શાળા આંતરિક મૂલ્યાંકન (બોર્ડ)', nameEn: 'Internal Assessment (For Board)', maxMarks: 20, weightage: 20 },
];

export const STD_10_SUBJECTS: SubjectDef[] = [
  { id: 'gujarati', code: '01', nameGu: 'ગુજરાતી (પ્રથમ ભાષા)', nameEn: 'Gujarati (FL)', isMainSubject: true },
  { id: 'maths_basic', code: '18', nameGu: 'ગણિત (બેઝિક/સ્ટાન્ડર્ડ)', nameEn: 'Mathematics (Basic/Std)', isMainSubject: true },
  { id: 'science', code: '11', nameGu: 'વિજ્ઞાન', nameEn: 'Science', isMainSubject: true },
  { id: 'social_science', code: '10', nameGu: 'સામાજિક વિજ્ઞાન', nameEn: 'Social Science', isMainSubject: true },
  { id: 'english', code: '16', nameGu: 'અંગ્રેજી (દ્વિતીય ભાષા)', nameEn: 'English (SL)', isMainSubject: true },
  { id: 'hindi_sanskrit', code: '14', nameGu: 'હિન્દી / સંસ્કૃત', nameEn: 'Hindi / Sanskrit', isMainSubject: true },
  { id: 'pe_computer', code: '40', nameGu: 'શારીરિક શિક્ષણ / કમ્પ્યુટર', nameEn: 'P.E. / Computer', isMainSubject: false },
];

// Standard 11 Curriculum (General Stream & Science)
export const STD_11_EXAMS: ExamDef[] = [
  { id: 'pratham', nameGu: 'પ્રથમ સત્રાંત પરીક્ષા', nameEn: 'First Exam', maxMarks: 50, weightage: 10 },
  { id: 'dwitiya', nameGu: 'દ્વિતીય સત્રાંત પરીક્ષા', nameEn: 'Second Exam', maxMarks: 50, weightage: 10 },
  { id: 'varshik', nameGu: 'વાર્ષિક પરીક્ષા', nameEn: 'Annual Exam', maxMarks: 80, weightage: 60 },
  { id: 'internal', nameGu: 'આંતરિક / પ્રાયોગિક મૂલ્યાંકન', nameEn: 'Internal / Practical Assessment', maxMarks: 20, weightage: 20 },
];

export const STD_11_SUBJECTS: SubjectDef[] = [
  { id: 'elements_of_accounts', code: '154', nameGu: 'નામાના મૂળતત્વો', nameEn: 'Elements of Accounts', isMainSubject: true },
  { id: 'business_studies', code: '153', nameGu: 'વાણિજ્ય વ્યવસ્થા અને સંચાલન', nameEn: 'Org. of Commerce', isMainSubject: true },
  { id: 'economics', code: '022', nameGu: 'અર્થશાસ્ત્ર', nameEn: 'Economics', isMainSubject: true },
  { id: 'statistics', code: '135', nameGu: 'આંકડાશાસ્ત્ર', nameEn: 'Statistics', isMainSubject: true },
  { id: 'gujarati', code: '001', nameGu: 'ગુજરાતી', nameEn: 'Gujarati', isMainSubject: true },
  { id: 'english', code: '013', nameGu: 'અંગ્રેજી', nameEn: 'English', isMainSubject: true },
  { id: 'spcc_computer', code: '337', nameGu: 'એસ.પી. અને સી.સી. / કમ્પ્યુટર', nameEn: 'S.P. & C.C. / Comp', isMainSubject: true },
];

/**
 * Get available exams for a standard
 */
export function getExamsForStandard(standard: string): ExamDef[] {
  const norm = String(standard).replace(/^class\s*/i, '').trim();
  if (norm === '10') return STD_10_EXAMS;
  if (norm === '11') return STD_11_EXAMS;
  return STD_9_EXAMS;
}

/**
 * Get available curriculum subjects for a standard
 */
export function getSubjectsForStandard(standard: string): SubjectDef[] {
  const norm = String(standard).replace(/^class\s*/i, '').trim();
  if (norm === '10') return STD_10_SUBJECTS;
  if (norm === '11') return STD_11_SUBJECTS;
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
  // Raw marks entered for each exam
  prathamRaw?: number | null; // out of 50
  prathamAbsent?: boolean;
  dwitiyaRaw?: number | null; // out of 50 (or prelim)
  dwitiyaAbsent?: boolean;
  varshikRaw?: number | null; // out of 80
  varshikAbsent?: boolean;
  internalRaw?: number | null; // out of 20
  internalAbsent?: boolean;
  // Weighted components out of 100 (Std 9 & 11)
  prathamWeighted: number; // out of 10
  dwitiyaWeighted: number; // out of 10
  varshikWeighted: number; // out of 60
  internalWeighted: number; // out of 20
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
 * Core Formula Engine:
 * Exact Gujarat Secondary and Higher Secondary Education Board (GSEB) Rules:
 * Standard 9 & 11:
 * - Pratham (50M) -> 10% weightage = (marks / 50) * 10
 * - Dwitiya (50M) -> 10% weightage = (marks / 50) * 10
 * - Varshik (80M) -> 60% weightage = (marks / 80) * 60
 * - Internal (20M) -> 20% weightage = marks
 * - Annual Converted Total = Pratham(10) + Dwitiya(10) + Varshik(60) + Internal(20) = 100M
 * 
 * GSEB PASSING, SIDDHI GUN (સિદ્ધિ ગુણ) & KRUPA GUN (કૃપા ગુણ) RULES:
 * 1. પાસ થવા માટે દરેક વિષયમાં ઓછામાં ઓછા ૩૩ ગુણ (33%) જરૂરી છે.
 * 2. સિદ્ધિ ગુણ કે કૃપા ગુણ મેળવવા માટે વિદ્યાર્થીએ સંબંધિત વિષયમાં ઓછામાં ઓછા ૨૫% ગુણ (૨૫ ગુણ) મેળવેલા હોવા જોઈએ. (૨૫ થી ઓછા ગુણ હોય તો સિદ્ધિ કે કૃપા ગુણ મળતા નથી).
 * 3. સિદ્ધિ ગુણ (Siddhi Marks):
 *    - એકંદરે 33% થી વધુ ગુણ મેળવનાર વિદ્યાર્થીને 33% થી ઉપરના દરેક ટકા દીઠ 1 ગુણ અને વધુમાં વધુ 15 ગુણની મર્યાદામાં સિદ્ધિ ગુણ મળે છે.
 *    - સિદ્ધિ ગુણ મેળવનાર વિદ્યાર્થી રેન્ક (Rank) માટે પાત્ર ગણાય છે.
 * 4. કૃપા ગુણ (Krupa Marks):
 *    - સિદ્ધિ ગુણ વાપર્યા પછી પણ જો વિદ્યાર્થી પાસ ન થતો હોય, તો આચાર્યશ્રી દ્વારા કુલ 10 ગુણની મર્યાદામાં કૃપા ગુણ આપી શકાય છે.
 *    - કૃપા ગુણ મેળવનાર વિદ્યાર્થી રેન્ક (Rank) ને પાત્ર હોતો નથી.
 * 5. સિદ્ધિ ગુણ અને કૃપા ગુણ પરિણામ પત્રકમાં (+) કરીને અલગથી દર્શાવવાના હોય છે અને તે કુલ ગુણની ગણતરીમાં ઉમેરાતા નથી.
 */
export function calculateStudentAnnualResult(
  student: Student,
  allMarksForSchool: MarkRecord[],
  standard: string
): CalculatedStudentResult {
  const normStd = String(standard).replace(/^class\s*/i, '').trim();
  const subjects = getSubjectsForStandard(normStd);
  const studentMarks = allMarksForSchool.filter(
    (m) => m.studentId === student.id && String(m.standard).replace(/^class\s*/i, '').trim() === normStd
  );

  const rawSubjectCalculations: {
    subj: SubjectDef;
    prathamRaw: number | null;
    prathamAbsent: boolean;
    dwitiyaRaw: number | null;
    dwitiyaAbsent: boolean;
    varshikRaw: number | null;
    varshikAbsent: boolean;
    internalRaw: number | null;
    internalAbsent: boolean;
    prathamWeighted: number;
    dwitiyaWeighted: number;
    varshikWeighted: number;
    internalWeighted: number;
    total100: number;
  }[] = [];

  for (const subj of subjects) {
    const findMark = (examId: string) => {
      return studentMarks.find((m) => {
        const matchesSubject =
          (m.subjectId && m.subjectId.toLowerCase() === subj.id.toLowerCase()) ||
          (m.subjectName && m.subjectName.toLowerCase().includes(subj.nameGu.toLowerCase()));
        if (!matchesSubject) return false;

        const exLower = (m.examType || '').toLowerCase();
        if (examId === 'pratham') {
          return exLower.includes('pratham') || exLower.includes('પ્રથમ') || exLower.includes('first');
        }
        if (examId === 'dwitiya' || examId === 'prelim') {
          return (
            exLower.includes('dwitiya') ||
            exLower.includes('દ્વિતીય') ||
            exLower.includes('second') ||
            exLower.includes('prelim') ||
            exLower.includes('પ્રિલિમ')
          );
        }
        if (examId === 'varshik') {
          return (
            exLower.includes('varshik') ||
            exLower.includes('વાર્ષિક') ||
            exLower.includes('annual') ||
            exLower.includes('trutiya') ||
            exLower.includes('તૃતીય')
          );
        }
        if (examId === 'internal') {
          return exLower.includes('internal') || exLower.includes('આંતરિક') || exLower.includes('મૂલ્યાંકન');
        }
        return false;
      });
    };

    const prathamRec = findMark('pratham');
    const dwitiyaRec = findMark(normStd === '10' ? 'prelim' : 'dwitiya');
    const varshikRec = findMark('varshik');
    const internalRec = findMark('internal');

    const prathamRaw = prathamRec !== undefined ? prathamRec.totalObtained : null;
    const prathamAbsent = prathamRec?.overallGrade === 'AB';

    const dwitiyaRaw = dwitiyaRec !== undefined ? dwitiyaRec.totalObtained : null;
    const dwitiyaAbsent = dwitiyaRec?.overallGrade === 'AB';

    const varshikRaw = varshikRec !== undefined ? varshikRec.totalObtained : null;
    const varshikAbsent = varshikRec?.overallGrade === 'AB';

    const internalRaw = internalRec !== undefined ? internalRec.totalObtained : null;
    const internalAbsent = internalRec?.overallGrade === 'AB';

    let prathamWeighted = 0;
    let dwitiyaWeighted = 0;
    let varshikWeighted = 0;
    let internalWeighted = 0;
    let total100 = 0;

    if (normStd === '10') {
      prathamWeighted = prathamRaw !== null && !prathamAbsent ? prathamRaw : 0;
      dwitiyaWeighted = dwitiyaRaw !== null && !dwitiyaAbsent ? dwitiyaRaw : 0;
      internalWeighted = internalRaw !== null && !internalAbsent ? internalRaw : 0;
      total100 = Math.round(((prathamWeighted / 50) * 10) + ((dwitiyaWeighted / 80) * 70) + internalWeighted);
    } else {
      // Standard 9 & 11 (3 Exams Formula)
      prathamWeighted = prathamRaw !== null && !prathamAbsent ? Math.round((prathamRaw / 50) * 10 * 10) / 10 : 0;
      dwitiyaWeighted = dwitiyaRaw !== null && !dwitiyaAbsent ? Math.round((dwitiyaRaw / 50) * 10 * 10) / 10 : 0;
      varshikWeighted = varshikRaw !== null && !varshikAbsent ? Math.round((varshikRaw / 80) * 60 * 10) / 10 : 0;
      internalWeighted = internalRaw !== null && !internalAbsent ? internalRaw : 0;
      total100 = Math.round(prathamWeighted + dwitiyaWeighted + varshikWeighted + internalWeighted);
    }

    rawSubjectCalculations.push({
      subj,
      prathamRaw,
      prathamAbsent,
      dwitiyaRaw,
      dwitiyaAbsent,
      varshikRaw,
      varshikAbsent,
      internalRaw,
      internalAbsent,
      prathamWeighted,
      dwitiyaWeighted,
      varshikWeighted,
      internalWeighted,
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
  // Rule: If overall percentage > 33%, then 1 mark per percentage point above 33%, max 15 marks.
  let siddhiPool = 0;
  if (rawPercentage > 33) {
    siddhiPool = Math.min(15, Math.floor(rawPercentage - 33));
  }
  const siddhiPoolEarned = siddhiPool;

  // Step 3: Compute Krupa Marks Pool
  // Rule: Principal can grant up to 10 grace marks across subjects.
  let krupaPool = 10;

  let remainingSiddhi = siddhiPool;
  let remainingKrupa = krupaPool;
  let totalSiddhiUsed = 0;
  let totalKrupaUsed = 0;

  // Step 4: Apply Siddhi and Krupa marks to failing subjects
  // Eligibility rule: Subject score must be at least 25% (>= 25) out of 100.
  // Subjects with < 25 cannot be saved by grace or siddhi.
  const scores: StudentSubjectScore[] = [];
  const reExamSubjects: string[] = [];

  for (const item of rawSubjectCalculations) {
    const { subj, total100 } = item;
    let siddhiGiven = 0;
    let krupaGiven = 0;
    let finalMark = total100;
    let isPass = total100 >= 33;
    let needsReExam = false;

    if (!isPass && subj.isMainSubject) {
      if (total100 >= 25 && total100 < 33) {
        let deficit = 33 - total100;

        // 1. Try Siddhi marks first (retains rank eligibility)
        if (remainingSiddhi > 0 && deficit > 0) {
          const allocateSiddhi = Math.min(deficit, remainingSiddhi);
          siddhiGiven += allocateSiddhi;
          remainingSiddhi -= allocateSiddhi;
          totalSiddhiUsed += allocateSiddhi;
          deficit -= allocateSiddhi;
        }

        // 2. Try Krupa marks next for remaining deficit (Principal's quota, forfeits rank)
        if (deficit > 0 && remainingKrupa > 0) {
          const allocateKrupa = Math.min(deficit, remainingKrupa);
          krupaGiven += allocateKrupa;
          remainingKrupa -= allocateKrupa;
          totalKrupaUsed += allocateKrupa;
          deficit -= allocateKrupa;
        }

        if (deficit === 0) {
          isPass = true;
          finalMark = 33;
        } else {
          isPass = false;
          needsReExam = true;
          reExamSubjects.push(subj.nameGu);
        }
      } else {
        // Less than 25 marks: Ineligible for grace/siddhi
        isPass = false;
        needsReExam = true;
        reExamSubjects.push(subj.nameGu);
      }
    } else if (!isPass && !subj.isMainSubject) {
      // Non-main subjects (e.g. PE/Computer)
      if (total100 < 33) {
        needsReExam = true;
      }
    }

    const grade = calculateGsebGrade(finalMark, 100);

    scores.push({
      subjectId: subj.id,
      subjectNameGu: subj.nameGu,
      subjectNameEn: subj.nameEn,
      isMainSubject: subj.isMainSubject,
      prathamRaw: item.prathamRaw,
      prathamAbsent: item.prathamAbsent,
      dwitiyaRaw: item.dwitiyaRaw,
      dwitiyaAbsent: item.dwitiyaAbsent,
      varshikRaw: item.varshikRaw,
      varshikAbsent: item.varshikAbsent,
      internalRaw: item.internalRaw,
      internalAbsent: item.internalAbsent,
      prathamWeighted: item.prathamWeighted,
      dwitiyaWeighted: item.dwitiyaWeighted,
      varshikWeighted: item.varshikWeighted,
      internalWeighted: item.internalWeighted,
      total100,
      siddhiMarksGiven: siddhiGiven,
      krupaMarksGiven: krupaGiven,
      finalMarkWithGrace: finalMark,
      grade,
      isPass,
      needsReExam,
    });
  }

  // Step 5: Final Result Status Determination
  // GSEB Rule: Grace marks do NOT inflate the grand total marks obtained.
  const failedMainCount = scores.filter((s) => s.isMainSubject && !s.isPass).length;

  let resultStatus: 'PASS' | 'PASS_WITH_SIDDHI' | 'PASS_WITH_KRUPA' | 'NEEDS_IMPROVEMENT' = 'PASS';
  let resultStatusGu = 'ઉત્તીર્ણ (PASS)';
  let isEligibleForRank = true;

  if (failedMainCount > 0) {
    resultStatus = 'NEEDS_IMPROVEMENT';
    resultStatusGu = 'સુધારણા જરૂરી (પુનઃપરીક્ષા)';
    isEligibleForRank = false;
  } else if (totalKrupaUsed > 0) {
    // Krupa marks disqualify the student from receiving a rank
    resultStatus = 'PASS_WITH_KRUPA';
    resultStatusGu = `કૃપા ગુણ સાથે ઉત્તીર્ણ (${totalKrupaUsed}* ગુણ)`;
    isEligibleForRank = false;
  } else if (totalSiddhiUsed > 0) {
    // Siddhi marks allow the student to retain rank eligibility
    resultStatus = 'PASS_WITH_SIDDHI';
    resultStatusGu = `સિદ્ધિ ગુણ સાથે ઉત્તીર્ણ (${totalSiddhiUsed}# ગુણ)`;
    isEligibleForRank = true;
  }

  const overallGrade = calculateGsebGrade(rawPercentage, 100);

  return {
    student,
    standard: normStd,
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
 * GSEB Rule:
 * Only directly passed students and students passing with Siddhi Marks (સિદ્ધિ ગુણ)
 * are eligible for Class Rank.
 * Students passing with Krupa Marks (કૃપા ગુણ) or failing are NOT eligible for rank.
 */
export function calculateClassResults(
  students: Student[],
  allMarks: MarkRecord[],
  standard: string
): CalculatedStudentResult[] {
  const normStd = String(standard).replace(/^class\s*/i, '').trim();
  const stdStudents = students.filter(
    (s) => String(s.standard).replace(/^class\s*/i, '').trim() === normStd
  );

  const results = stdStudents.map((st) => calculateStudentAnnualResult(st, allMarks, normStd));

  // Sort by rank eligibility and percentage descending
  const sorted = [...results].sort((a, b) => {
    // 1. Rank eligible first
    if (a.isEligibleForRank && !b.isEligibleForRank) return -1;
    if (!a.isEligibleForRank && b.isEligibleForRank) return 1;
    // 2. High percentage first
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
