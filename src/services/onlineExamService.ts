import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  OnlineExam,
  MCQQuestion,
  QuestionBankItem,
  ExamAttempt,
  StudentSession,
} from '../types';

/**
 * Fetch all online exams for a given school.
 */
export async function getOnlineExams(schoolId: string): Promise<OnlineExam[]> {
  try {
    const examsCol = collection(db, 'schools', schoolId, 'online_exams');
    const q = query(examsCol, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as OnlineExam[];
  } catch (err) {
    console.error('Error fetching online exams:', err);
    return [];
  }
}

/**
 * Subscribe to online exams in real-time.
 */
export function subscribeToOnlineExams(
  schoolId: string,
  callback: (exams: OnlineExam[]) => void
): () => void {
  const examsCol = collection(db, 'schools', schoolId, 'online_exams');
  const q = query(examsCol, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const exams = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as OnlineExam[];
      callback(exams);
    },
    (err) => {
      console.error('Realtime online exams subscription error:', err);
    }
  );
}

/**
 * Fetch questions for a specific exam.
 */
export async function getExamQuestions(
  schoolId: string,
  examId: string
): Promise<MCQQuestion[]> {
  try {
    const questionsCol = collection(db, 'schools', schoolId, 'online_exams', examId, 'questions');
    const q = query(questionsCol, orderBy('questionNumber', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as MCQQuestion[];
  } catch (err) {
    console.error('Error fetching exam questions:', err);
    return [];
  }
}

/**
 * Detects if a new or updated exam clashes in time with any existing exam for this school.
 * Prevents scheduling two exams at the same time ("ek j time par 2 exam set na thai jay").
 */
export function findConflictingExam(
  exams: OnlineExam[],
  scheduledDate: string,
  scheduledStartTime: string,
  durationMinutes: number,
  excludeExamId?: string,
  standard?: string
): OnlineExam | null {
  if (!scheduledDate || !scheduledStartTime || !durationMinutes) return null;
  const newStart = new Date(`${scheduledDate}T${scheduledStartTime}:00`).getTime();
  const newEnd = newStart + Number(durationMinutes) * 60 * 1000;
  if (isNaN(newStart) || isNaN(newEnd)) return null;

  for (const ex of exams) {
    if (excludeExamId && ex.id === excludeExamId) continue;
    if (ex.status === 'cancelled' || ex.status === 'completed') continue;
    if (!ex.scheduledDate || !ex.scheduledStartTime) continue;

    const exStart = new Date(`${ex.scheduledDate}T${ex.scheduledStartTime}:00`).getTime();
    const exDur = Number(ex.durationMinutes) || 30;
    const exEnd = exStart + exDur * 60 * 1000;
    if (isNaN(exStart) || isNaN(exEnd)) continue;

    // Time window overlap condition: StartA < EndB AND EndA > StartB
    if (newStart < exEnd && newEnd > exStart) {
      return ex;
    }
  }

  return null;
}

/**
 * Create a new Online Exam along with its MCQ questions.
 */
export async function createOnlineExam(
  schoolId: string,
  examData: Omit<OnlineExam, 'id' | 'schoolId' | 'createdAt' | 'updatedAt' | 'questionsCount' | 'totalMarks'>,
  questions: MCQQuestion[]
): Promise<string> {
  const now = new Date().toISOString();
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  // Compute scheduledStartTimestamp
  let scheduledStartTimestamp = Date.now();
  if (examData.scheduledDate && examData.scheduledStartTime) {
    const dateTimeStr = `${examData.scheduledDate}T${examData.scheduledStartTime}:00`;
    const parsed = new Date(dateTimeStr).getTime();
    if (!isNaN(parsed)) {
      scheduledStartTimestamp = parsed;
    }
  }

  const examsCol = collection(db, 'schools', schoolId, 'online_exams');
  const examPayload: Omit<OnlineExam, 'id'> = {
    ...examData,
    schoolId,
    totalMarks,
    questionsCount: questions.length,
    scheduledStartTimestamp,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(examsCol, examPayload);
  const examId = docRef.id;

  // Batch insert questions
  if (questions.length > 0) {
    const batch = writeBatch(db);
    const questionsCol = collection(db, 'schools', schoolId, 'online_exams', examId, 'questions');

    questions.forEach((q, idx) => {
      const qRef = doc(questionsCol);
      batch.set(qRef, {
        examId,
        schoolId,
        questionNumber: idx + 1,
        questionText: q.questionText.trim(),
        optionA: q.optionA.trim(),
        optionB: q.optionB.trim(),
        optionC: q.optionC.trim(),
        optionD: q.optionD.trim(),
        correctAnswer: q.correctAnswer,
        marks: Number(q.marks) || 1,
        imageUrl: q.imageUrl || '',
        aiConfidence: q.aiConfidence || 'high',
        needsReview: q.needsReview || false,
        topic: q.topic || '',
        subject: examData.subject,
        standard: examData.standard,
      });
    });

    await batch.commit();
  }

  return examId;
}

/**
 * Update existing Online Exam and optionally overwrite its questions.
 */
export async function updateOnlineExam(
  schoolId: string,
  examId: string,
  examData: Partial<OnlineExam>,
  questions?: MCQQuestion[]
): Promise<void> {
  const examRef = doc(db, 'schools', schoolId, 'online_exams', examId);
  const now = new Date().toISOString();

  let scheduledStartTimestamp = examData.scheduledStartTimestamp;
  if (examData.scheduledDate && examData.scheduledStartTime) {
    const dateTimeStr = `${examData.scheduledDate}T${examData.scheduledStartTime}:00`;
    const parsed = new Date(dateTimeStr).getTime();
    if (!isNaN(parsed)) {
      scheduledStartTimestamp = parsed;
    }
  }

  const updatePayload: any = {
    ...examData,
    updatedAt: now,
  };
  if (scheduledStartTimestamp) {
    updatePayload.scheduledStartTimestamp = scheduledStartTimestamp;
  }

  if (questions) {
    updatePayload.questionsCount = questions.length;
    updatePayload.totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
  }

  await updateDoc(examRef, updatePayload);

  if (questions) {
    // Delete existing questions and replace
    const questionsCol = collection(db, 'schools', schoolId, 'online_exams', examId, 'questions');
    const existingSnap = await getDocs(questionsCol);
    const deleteBatch = writeBatch(db);
    existingSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    // Insert new questions
    if (questions.length > 0) {
      const insertBatch = writeBatch(db);
      questions.forEach((q, idx) => {
        const qRef = doc(questionsCol);
        insertBatch.set(qRef, {
          examId,
          schoolId,
          questionNumber: idx + 1,
          questionText: q.questionText.trim(),
          optionA: q.optionA.trim(),
          optionB: q.optionB.trim(),
          optionC: q.optionC.trim(),
          optionD: q.optionD.trim(),
          correctAnswer: q.correctAnswer,
          marks: Number(q.marks) || 1,
          imageUrl: q.imageUrl || '',
          aiConfidence: q.aiConfidence || 'high',
          needsReview: q.needsReview || false,
          topic: q.topic || '',
          subject: examData.subject || '',
          standard: examData.standard || '',
        });
      });
      await insertBatch.commit();
    }
  }
}

/**
 * Delete an Online Exam and all its subcollections (questions and student attempts).
 */
export async function deleteOnlineExam(
  schoolId: string,
  examId: string
): Promise<void> {
  // Delete questions subcollection
  const questionsCol = collection(db, 'schools', schoolId, 'online_exams', examId, 'questions');
  const qSnap = await getDocs(questionsCol);
  if (!qSnap.empty) {
    const batch = writeBatch(db);
    qSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Delete attempts for this exam
  const attemptsCol = collection(db, 'schools', schoolId, 'exam_attempts');
  const atQuery = query(attemptsCol, where('examId', '==', examId));
  const atSnap = await getDocs(atQuery);
  if (!atSnap.empty) {
    const batch = writeBatch(db);
    atSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Delete exam document
  const examRef = doc(db, 'schools', schoolId, 'online_exams', examId);
  await deleteDoc(examRef);
}

/**
 * Fetch all student attempts for a given exam.
 */
export async function getExamAttempts(
  schoolId: string,
  examId: string
): Promise<ExamAttempt[]> {
  try {
    const attemptsCol = collection(db, 'schools', schoolId, 'exam_attempts');
    const q = query(attemptsCol, where('examId', '==', examId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ExamAttempt[];
  } catch (err) {
    console.error('Error fetching exam attempts:', err);
    return [];
  }
}

/**
 * Subscribe to attempts for an exam in real-time.
 */
export function subscribeToExamAttempts(
  schoolId: string,
  examId: string,
  callback: (attempts: ExamAttempt[]) => void
): () => void {
  const attemptsCol = collection(db, 'schools', schoolId, 'exam_attempts');
  const q = query(attemptsCol, where('examId', '==', examId));

  return onSnapshot(
    q,
    (snap) => {
      const attempts = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ExamAttempt[];
      callback(attempts);
    },
    (err) => {
      console.error('Realtime exam attempts error:', err);
    }
  );
}

// =========================================================================
// Question Bank APIs
// =========================================================================
export async function getQuestionBank(
  schoolId: string,
  standard?: string,
  subject?: string
): Promise<QuestionBankItem[]> {
  try {
    const bankCol = collection(db, 'schools', schoolId, 'question_bank');
    let q = query(bankCol, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as QuestionBankItem[];

    if (standard && standard !== 'all') {
      items = items.filter((it) => it.standard === standard);
    }
    if (subject && subject !== 'all') {
      items = items.filter((it) => it.subject.toLowerCase() === subject.toLowerCase());
    }
    return items;
  } catch (err) {
    console.error('Error fetching question bank:', err);
    return [];
  }
}

export async function bulkAddToQuestionBank(
  schoolId: string,
  items: Array<Omit<QuestionBankItem, 'id' | 'schoolId' | 'createdAt'>>
): Promise<number> {
  if (items.length === 0) return 0;
  const batch = writeBatch(db);
  const bankCol = collection(db, 'schools', schoolId, 'question_bank');
  const now = new Date().toISOString();

  items.forEach((it) => {
    const newRef = doc(bankCol);
    batch.set(newRef, {
      ...it,
      schoolId,
      createdAt: now,
    });
  });

  await batch.commit();
  return items.length;
}

// =========================================================================
// AI Multimodal Question Extractor Client Call
// =========================================================================
export async function extractQuestionsWithAI(params: {
  text?: string;
  fileBase64?: string;
  mimeType?: string;
}): Promise<{ success: boolean; count: number; questions: MCQQuestion[]; error?: string }> {
  const res = await fetch('/api/ai/extract-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to extract questions');
  }
  return data;
}

// =========================================================================
// Authoritative Server Time
// =========================================================================
export async function getServerTime(): Promise<number> {
  try {
    const res = await fetch('/api/time');
    if (res.ok) {
      const data = await res.json();
      return data.serverTime;
    }
  } catch (e) {
    // Fallback to client time
  }
  return Date.now();
}

// =========================================================================
// Student Portal Client APIs
// =========================================================================
export async function studentLogin(params: {
  studentDiseCode?: string;
  diseCode?: string;
  dob: string;
  grNumber?: string;
}): Promise<StudentSession> {
  const cleanCode = (params.studentDiseCode || params.diseCode || '').trim();
  const cleanDob = (params.dob || '').trim();

  if (!cleanCode) {
    throw new Error('કૃપા કરીને વિદ્યાર્થીનો DISE કોડ દાખલ કરો.');
  }
  if (!cleanDob) {
    throw new Error('કૃપા કરીને પાસવર્ડ તરીકે તમારી જન્મ તારીખ (Birthdate) દાખલ કરો.');
  }

  let res: Response;
  try {
    res = await fetch('/api/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentDiseCode: cleanCode,
        diseCode: cleanCode,
        dob: cleanDob,
        grNumber: params.grNumber?.trim() || undefined,
      }),
    });
  } catch (netErr: any) {
    throw new Error('સર્વર સાથે સંપર્ક થઈ શક્યો નથી. કૃપા કરીને તમારું ઇન્ટરનેટ કનેક્શન તપાસો.');
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch (jsonErr) {
    throw new Error('સર્વર તરફથી અયોગ્ય પ્રતિસાદ મળ્યો છે.');
  }

  if (!res.ok) {
    throw new Error(data.error || 'વિદ્યાર્થી લૉગિન નિષ્ફળ થયું.');
  }

  // Store in sessionStorage for fast recovery on page reload
  if (data.session) {
    sessionStorage.setItem('vidyalayam_student_session', JSON.stringify(data.session));
  }

  return data.session;
}

export function getStoredStudentSession(): StudentSession | null {
  try {
    const stored = sessionStorage.getItem('vidyalayam_student_session');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {}
  return null;
}

export function clearStudentSession() {
  sessionStorage.removeItem('vidyalayam_student_session');
}

export async function fetchStudentExams(token: string) {
  let res: Response;
  try {
    res = await fetch('/api/student/exams', {
      headers: { 'x-student-token': token },
    });
  } catch (netErr) {
    throw new Error('પરીક્ષાઓ લોડ કરવા માટે સર્વર સાથે સંપર્ક થઈ શક્યો નથી.');
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch (jsonErr) {
    throw new Error('સર્વર તરફથી અયોગ્ય ડેટા મળ્યો છે.');
  }

  if (!res.ok) {
    throw new Error(data.error || 'પરીક્ષાઓ લોડ કરવામાં સમસ્યા થઈ.');
  }
  return data;
}

export async function startStudentExam(token: string, examId: string) {
  let res: Response;
  try {
    res = await fetch('/api/student/start-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-student-token': token,
      },
      body: JSON.stringify({ examId }),
    });
  } catch (netErr) {
    throw new Error('પરીક્ષા શરૂ કરવા માટે સર્વર સાથે સંપર્ક થઈ શક્યો નથી.');
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch (jsonErr) {
    throw new Error('સર્વર તરફથી અયોગ્ય પ્રતિસાદ મળ્યો.');
  }

  if (!res.ok) {
    throw new Error(data.error || 'પરીક્ષા શરૂ કરવામાં સમસ્યા થઈ.');
  }
  return data;
}

export async function saveStudentAnswers(
  token: string,
  attemptId: string,
  answers: Record<string, string>
) {
  let res: Response;
  try {
    res = await fetch('/api/student/save-answers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-student-token': token,
      },
      body: JSON.stringify({ attemptId, answers }),
    });
  } catch (netErr) {
    throw new Error('જવાબો સાચવવા માટે કનેક્શન મળી શક્યું નથી.');
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch (jsonErr) {
    throw new Error('જવાબો સાચવતી વખતે સર્વર ભૂલ થઈ.');
  }

  if (!res.ok) {
    throw new Error(data.error || 'જવાબો સાચવવામાં સમસ્યા થઈ.');
  }
  return data;
}

export async function submitStudentExam(
  token: string,
  attemptId: string,
  answers: Record<string, string>
) {
  let res: Response;
  try {
    res = await fetch('/api/student/submit-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-student-token': token,
      },
      body: JSON.stringify({ attemptId, answers }),
    });
  } catch (netErr) {
    throw new Error('પરીક્ષા સબમિટ કરવા માટે સર્વર સાથે સંપર્ક થઈ શક્યો નથી.');
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch (jsonErr) {
    throw new Error('સબમિશન પ્રતિસાદ વાંચવામાં ભૂલ થઈ.');
  }

  if (!res.ok) {
    throw new Error(data.error || 'પરીક્ષા સબમિટ કરવામાં સમસ્યા થઈ.');
  }
  return data;
}

export async function fetchStudentMarks(token: string) {
  let res: Response;
  try {
    res = await fetch('/api/student/my-marks', {
      headers: { 'x-student-token': token },
    });
  } catch (netErr) {
    throw new Error('ગુણ લોડ કરવા માટે સર્વર સાથે સંપર્ક થઈ શક્યો નથી.');
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch (jsonErr) {
    throw new Error('ગુણનો ડેટા વાંચવામાં ભૂલ થઈ.');
  }

  if (!res.ok) {
    throw new Error(data.error || 'ગુણ મેળવવામાં સમસ્યા થઈ.');
  }
  return data;
}
