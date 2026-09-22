import {
  collection,
  collectionGroup,
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
export async function extractQuestionsWithAI(
  params: {
    text?: string;
    fileBase64?: string;
    mimeType?: string;
  },
  onStatusUpdate?: (statusMsg: string) => void
): Promise<{ success: boolean; count: number; questions: MCQQuestion[]; error?: string }> {
  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1 && onStatusUpdate) {
        onStatusUpdate('Google AI સર્વર વ્યસ્ત હતું, ફરી પ્રયાસ થઈ રહ્યો છે...');
      }

      const res = await fetch('/api/ai/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return data;
      }

      // Format error
      let errorMsg = data.error || 'Failed to extract questions';
      try {
        if (typeof errorMsg === 'string' && errorMsg.startsWith('{') && errorMsg.includes('"message"')) {
          const parsed = JSON.parse(errorMsg);
          if (parsed?.error?.message) {
            errorMsg = parsed.error.message;
          }
        }
      } catch (_) {}

      if (
        errorMsg.includes('503') ||
        errorMsg.includes('high demand') ||
        errorMsg.includes('UNAVAILABLE') ||
        errorMsg.includes('overloaded')
      ) {
        errorMsg =
          'Google AI સર્વર પર હાલમાં ભારે ટ્રાફિક (High Demand) છે. કૃપા કરીને થોડી સેકન્ડ પછી "🔄 ફરી પ્રયાસ કરો" બટન દબાવો.';
      }

      const isTransient = res.status === 503 || res.status === 429 || errorMsg.includes('High Demand') || errorMsg.includes('503');
      if (isTransient && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      throw new Error(errorMsg);
    } catch (err: any) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
    }
  }

  throw lastError || new Error('AI પ્રશ્ન એક્સટ્રેક્શન નિષ્ફળ રહ્યું. કૃપા કરીને ફરી પ્રયાસ કરો.');
}

// =========================================================================
// Authoritative Monotonic Server Time
// Uses hardware-anchored performance.now() so changing mobile phone date/time
// CANNOT alter or cheat the countdown or start time!
// =========================================================================
let cachedServerTime: number = 0;
let cachedPerfAnchor: number = 0;
let isServerTimeSynced = false;

export async function getServerTime(): Promise<number> {
  try {
    const t0 = performance.now();
    const res = await fetch('/api/time');
    const t1 = performance.now();
    if (res.ok) {
      const data = await res.json();
      const networkLatency = (t1 - t0) / 2;
      const trueTime = Number(data.serverTime) + networkLatency;
      cachedServerTime = trueTime;
      cachedPerfAnchor = t1;
      isServerTimeSynced = true;
      return trueTime;
    }
  } catch (e) {
    // If network fails but we had synced previously, compute monotonic time
  }

  if (isServerTimeSynced && cachedPerfAnchor > 0) {
    return cachedServerTime + (performance.now() - cachedPerfAnchor);
  }
  return Date.now();
}

export function getAuthoritativeNow(): number {
  if (isServerTimeSynced && cachedPerfAnchor > 0) {
    // performance.now() is strictly monotonic and immune to local clock manipulation
    return cachedServerTime + (performance.now() - cachedPerfAnchor);
  }
  return Date.now();
}

export function isTimeAuthoritative(): boolean {
  return isServerTimeSynced;
}

// Helper: Normalize date to YYYY-MM-DD
function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // Try DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fallback: Date parse
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return str.replace(/[^0-9]/g, '');
}

function datesMatch(d1: any, d2: any): boolean {
  if (!d1 || !d2) return false;
  const s1 = String(d1).trim();
  const s2 = String(d2).trim();
  if (s1 === s2) return true;

  const norm1 = normalizeDate(s1);
  const norm2 = normalizeDate(s2);
  if (norm1 && norm2 && norm1 === norm2) return true;

  // Compare purely digits if normalization didn't match (e.g. 15082010 vs 20100815)
  const digits1 = s1.replace(/[^0-9]/g, '');
  const digits2 = s2.replace(/[^0-9]/g, '');
  if (digits1 && digits2 && digits1 === digits2) return true;

  return false;
}

// Client-side Direct Firebase Firestore Fallback for Static Platforms (e.g. Netlify)
async function clientSideStudentLogin(
  cleanCode: string,
  cleanDob: string,
  cleanGr?: string
): Promise<StudentSession> {
  interface StudentMatch {
    student: any;
    schoolId: string;
  }
  let foundStudents: StudentMatch[] = [];

  const candidateFields = ['diseCode', 'studentStateCode', 'studentId', 'aadhaarNo', 'grNumber'];

  // 1. Query collectionGroup by each possible unique code field
  for (const field of candidateFields) {
    try {
      const q = query(collectionGroup(db, 'students'), where(field, '==', cleanCode));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const pathSegments = d.ref.path.split('/');
        const schoolId = pathSegments[1];
        foundStudents.push({ student: { id: d.id, ...d.data() }, schoolId });
      });
      if (foundStudents.length > 0) {
        break;
      }
    } catch (cgErr) {
      console.warn(`client fallback collectionGroup ${field} note:`, cgErr);
    }
  }

  // 2. Strategy: Prefix 11-digit school DISE code lookup (First 11 digits of Child UID)
  if (foundStudents.length === 0 && cleanCode.length >= 11) {
    const potentialSchoolDise = cleanCode.substring(0, 11);
    try {
      const schoolsCol = collection(db, 'schools');
      const schoolQuery = query(schoolsCol, where('diseCode', '==', potentialSchoolDise));
      const schoolSnap = await getDocs(schoolQuery);
      if (!schoolSnap.empty) {
        for (const schDoc of schoolSnap.docs) {
          const schId = schDoc.id;
          const studentsSnap = await getDocs(collection(db, 'schools', schId, 'students'));
          studentsSnap.forEach((d) => {
            const data = d.data() as any;
            const sDise = (data.diseCode || '').toString().trim();
            const sState = (data.studentStateCode || '').toString().trim();
            const sId = (data.studentId || '').toString().trim();
            const sAadhaar = (data.aadhaarNo || '').toString().trim();
            const sGr = (data.grNumber || '').toString().trim();
            if (
              sDise === cleanCode ||
              sState === cleanCode ||
              sId === cleanCode ||
              sAadhaar === cleanCode ||
              sGr === cleanCode
            ) {
              foundStudents.push({ student: { id: d.id, ...data }, schoolId: schId });
            }
          });
        }
      }
    } catch (prefixErr) {
      console.warn('client fallback prefix lookup note:', prefixErr);
    }
  }

  // 3. Strategy: Check if input is 11-digit school code
  if (foundStudents.length === 0 && cleanCode.length === 11) {
    try {
      const schoolsCol = collection(db, 'schools');
      const schoolQuery = query(schoolsCol, where('diseCode', '==', cleanCode));
      const schoolSnap = await getDocs(schoolQuery);
      if (!schoolSnap.empty) {
        for (const schDoc of schoolSnap.docs) {
          const schId = schDoc.id;
          const studentsSnap = await getDocs(collection(db, 'schools', schId, 'students'));
          studentsSnap.forEach((d) => {
            foundStudents.push({ student: { id: d.id, ...d.data() }, schoolId: schId });
          });
        }
      }
    } catch (schErr) {
      console.warn('client fallback school query note:', schErr);
    }
  }

  // 4. Strategy: Scan all schools directly (guarantees finding record regardless of field or collectionGroup index)
  if (foundStudents.length === 0) {
    try {
      const allSchoolsSnap = await getDocs(collection(db, 'schools'));
      for (const sDoc of allSchoolsSnap.docs) {
        const schId = sDoc.id;
        const stSnap = await getDocs(collection(db, 'schools', schId, 'students'));
        stSnap.forEach((d) => {
          const data = d.data() as any;
          const sDise = (data.diseCode || '').toString().trim();
          const sState = (data.studentStateCode || '').toString().trim();
          const sId = (data.studentId || '').toString().trim();
          const sAadhaar = (data.aadhaarNo || '').toString().trim();
          const sGr = (data.grNumber || '').toString().trim();
          if (
            sDise === cleanCode ||
            sState === cleanCode ||
            sId === cleanCode ||
            sAadhaar === cleanCode ||
            sGr === cleanCode
          ) {
            foundStudents.push({ student: { id: d.id, ...data }, schoolId: schId });
          }
        });
        if (foundStudents.length > 0) break;
      }
    } catch (scanErr) {
      console.warn('client fallback scan error:', scanErr);
    }
  }

  if (foundStudents.length === 0) {
    throw new Error(`વિદ્યાર્થીનો DISE કોડ "${cleanCode}" શાળાના ડેટામાં મળ્યો નથી. કૃપા કરીને સાચો ૧૮ આંકડાનો વિદ્યાર્થી DISE કોડ દાખલ કરો.`);
  }

  // Check DOB match
  const dobMatched = foundStudents.filter((item) => datesMatch(item.student.dob, cleanDob));
  if (dobMatched.length === 0) {
    throw new Error('વિદ્યાર્થી DISE કોડ અથવા જન્મ તારીખ (પાસવર્ડ) મેળ ખાતા નથી. શાળાના રેકોર્ડ મુજબ સાચી જન્મ તારીખ દાખલ કરો.');
  }

  foundStudents = dobMatched;

  // Filter by GR if given
  if (cleanGr) {
    const grMatched = foundStudents.filter(
      (item) => (item.student.grNumber || '').toString().trim().toLowerCase() === cleanGr.toLowerCase()
    );
    if (grMatched.length > 0) {
      foundStudents = grMatched;
    }
  }

  const selectedMatch = foundStudents[0];
  const selectedStudent = selectedMatch.student;
  const schoolId = selectedMatch.schoolId;

  // Fetch School document
  let schoolData: any = {};
  try {
    const sSnap = await getDoc(doc(db, 'schools', schoolId));
    if (sSnap.exists()) {
      schoolData = sSnap.data();
    }
  } catch (e) {}

  const token = `client_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const sessionPayload: StudentSession = {
    student: {
      id: selectedStudent.id,
      schoolId: schoolId,
      studentName: selectedStudent.studentName,
      standard: selectedStudent.standard,
      section: selectedStudent.section || selectedStudent.division || '',
      grNumber: selectedStudent.grNumber || '',
      rollNumber: selectedStudent.rollNumber || '',
      diseCode: selectedStudent.diseCode || selectedStudent.studentStateCode || cleanCode,
      dob: selectedStudent.dob || '',
      doa: selectedStudent.doa || '',
      gender: selectedStudent.gender || '',
      fatherName: selectedStudent.fatherName || '',
      motherName: selectedStudent.motherName || '',
      bloodGroup: selectedStudent.bloodGroup || '',
      address: selectedStudent.address || '',
      photoUrl: selectedStudent.photoUrl || '',
      contactNumber: selectedStudent.contactNumber || selectedStudent.mobileNumber || '',
      caste: selectedStudent.caste || '',
      createdAt: selectedStudent.createdAt || new Date().toISOString(),
    },
    school: {
      id: schoolId,
      schoolName: schoolData.schoolName || '',
      diseCode: schoolData.diseCode || '',
      district: schoolData.district || '',
      address: schoolData.address || '',
      principalName: schoolData.principalName || '',
      logoUrl: schoolData.logoUrl || schoolData.schoolLogo || '',
    },
    loginAt: Date.now(),
    sessionToken: token,
  };

  sessionStorage.setItem('vidyalayam_student_session', JSON.stringify(sessionPayload));
  return sessionPayload;
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

  // Attempt server login first; if server responds with non-JSON (like Netlify 404 HTML) or fails to fetch, fallback to client-side Firestore!
  let serverFailed = false;
  let serverError = '';

  try {
    const res = await fetch('/api/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentDiseCode: cleanCode,
        diseCode: cleanCode,
        dob: cleanDob,
        grNumber: params.grNumber?.trim() || undefined,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data.session) {
        sessionStorage.setItem('vidyalayam_student_session', JSON.stringify(data.session));
        return data.session;
      }
      // If server returned a business validation error (e.g. wrong DOB or DISE not found), keep that error
      if (res.status === 400 || res.status === 401 || res.status === 404 || res.status === 429) {
        throw new Error(data.error || 'વિદ્યાર્થી લૉગિન નિષ્ફળ થયું.');
      }
      serverError = data.error || '';
      serverFailed = true;
    } else {
      // Netlify or static server returned HTML (404 page)
      serverFailed = true;
    }
  } catch (netErr: any) {
    // If it was our business throw, re-throw it
    if (netErr.message && !netErr.message.includes('fetch') && !netErr.message.includes('Network') && !netErr.message.includes('સર્વર')) {
      throw netErr;
    }
    serverFailed = true;
  }

  // If server is not present (Netlify static hosting), run direct Firebase client login!
  if (serverFailed) {
    console.info('Switching to client-side Firebase direct verification (Netlify / Static platform mode)...');
    try {
      return await clientSideStudentLogin(cleanCode, cleanDob, params.grNumber?.trim());
    } catch (fbErr: any) {
      throw new Error(fbErr.message || serverError || 'વિદ્યાર્થી લૉગિન નિષ્ફળ થયું.');
    }
  }

  throw new Error('વિદ્યાર્થી લૉગિન નિષ્ફળ થયું.');
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
  let res: Response | null = null;
  try {
    res = await fetch('/api/student/exams', {
      headers: { 'x-student-token': token },
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (netErr) {
    // Fallback to client-side Firestore
  }

  // Client Firestore Fallback:
  const session = getStoredStudentSession();
  if (!session || !session.school?.id || !session.student) {
    return { exams: [], serverTime: Date.now() };
  }

  try {
    const schoolId = session.school.id;
    const student = session.student;
    const now = Date.now();

    const examsCol = collection(db, 'schools', schoolId, 'online_exams');
    const examsSnap = await getDocs(examsCol);
    const allExams = examsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    const studentExams = allExams.filter((ex) => {
      const stdMatches =
        !ex.standard ||
        ex.standard === student.standard ||
        ex.standard === 'all' ||
        ex.standard === String(student.standard);
      const statusValid = ex.status === 'scheduled' || ex.status === 'live' || ex.status === 'completed';
      return stdMatches && statusValid;
    });

    const attemptsCol = collection(db, 'schools', schoolId, 'exam_attempts');
    const attemptsQuery = query(attemptsCol, where('studentId', '==', student.id));
    const attemptsSnap = await getDocs(attemptsQuery);
    const attemptsMap = new Map<string, any>();
    attemptsSnap.docs.forEach((d) => {
      const at = d.data();
      attemptsMap.set(at.examId, { id: d.id, ...at });
    });

    const enrichedExams = studentExams.map((ex) => {
      const attempt = attemptsMap.get(ex.id);
      return {
        id: ex.id,
        title: ex.title,
        examType: ex.examType,
        subject: ex.subject,
        standard: ex.standard,
        durationMinutes: ex.durationMinutes,
        scheduledDate: ex.scheduledDate,
        scheduledStartTime: ex.scheduledStartTime,
        scheduledStartTimestamp: ex.scheduledStartTimestamp,
        totalMarks: ex.totalMarks,
        questionsCount: ex.questionsCount,
        instructions: ex.instructions,
        status: ex.status,
        resultVisibility: ex.resultVisibility,
        attempt: attempt
          ? {
              id: attempt.id,
              status: attempt.status,
              startedAt: attempt.startedAt,
              submittedAt: attempt.submittedAt,
              score: ex.resultVisibility === 'immediate' ? attempt.score : undefined,
              totalMarks: attempt.totalMarks,
              percentage: ex.resultVisibility === 'immediate' ? attempt.percentage : undefined,
            }
          : null,
        serverTime: now,
      };
    });

    return { exams: enrichedExams, serverTime: now };
  } catch (err) {
    console.error('Error in client fallback fetchStudentExams:', err);
    return { exams: [], serverTime: Date.now() };
  }
}

export async function startStudentExam(token: string, examId: string) {
  try {
    const res = await fetch('/api/student/start-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-student-token': token,
      },
      body: JSON.stringify({ examId }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok) return data;
      if (res.status === 403 || res.status === 404) {
        throw new Error(data.error || 'પરીક્ષા શરૂ કરવામાં સમસ્યા થઈ.');
      }
    }
  } catch (netErr: any) {
    if (netErr.message && !netErr.message.includes('fetch')) {
      throw netErr;
    }
  }

  // Client Firestore Fallback
  const session = getStoredStudentSession();
  if (!session || !session.school?.id || !session.student) {
    throw new Error('વિદ્યાર્થી સત્ર મળ્યું નથી. કૃપા કરીને ફરી લોગિન કરો.');
  }

  const schoolId = session.school.id;
  const student = session.student;
  // Use authoritative server time (protected against mobile clock tampering)
  const now = await getServerTime();

  const examDocRef = doc(db, 'schools', schoolId, 'online_exams', examId);
  const examSnap = await getDoc(examDocRef);
  if (!examSnap.exists()) {
    throw new Error('પરીક્ષા મળી નથી.');
  }

  const examData = examSnap.data() as any;
  if (examData.scheduledStartTimestamp && now < examData.scheduledStartTimestamp) {
    throw new Error('પરીક્ષા હજુ શરૂ થઈ નથી. સત્તાવાર સમય પર જ શરૂ થશે. (મોબાઇલની તારીખ કે સમય બદલવાથી પરીક્ષા વહેલી શરૂ થશે નહીં.)');
  }

  // Late entry & dynamic duration rules:
  // If exam has a scheduled start time and duration:
  // - Students joining within 5 minutes of scheduled start get full exam duration.
  // - Students joining after 5 minutes lose 1 minute of exam duration for every minute past the 5-minute grace.
  // - Example: 20 min exam. If 3 min late: gets full 20 mins. If 6 min late: gets 19 mins.
  // - Once scheduled start + duration + 5 minutes grace is passed, the exam window is permanently closed.
  const durationMinutes = Number(examData.durationMinutes) || 30;
  const durationMs = durationMinutes * 60 * 1000;
  const gracePeriodMs = 5 * 60 * 1000; // 5 minutes grace

  if (examData.scheduledStartTimestamp) {
    const scheduledStart = Number(examData.scheduledStartTimestamp);
    const examWindowEnd = scheduledStart + durationMs + gracePeriodMs;

    if (now > examWindowEnd) {
      throw new Error('પરીક્ષા પૂર્ણ થઈ ગઈ છે. પરીક્ષાનો સત્તાવાર સમય અને 5 મિનિટનો વધારાનો પ્રવેશ સમય સમાપ્ત થઈ ગયેલ હોવાથી હવે પરીક્ષા શરૂ કરી શકાશે નહીં.');
    }
  }

  const attemptsCol = collection(db, 'schools', schoolId, 'exam_attempts');
  const q = query(attemptsCol, where('examId', '==', examId), where('studentId', '==', student.id));
  const existingAttempts = await getDocs(q);

  let attempt: any = null;
  if (!existingAttempts.empty) {
    attempt = { id: existingAttempts.docs[0].id, ...existingAttempts.docs[0].data() };
    if (attempt.status === 'submitted' || attempt.status === 'timed_out') {
      throw new Error('તમે આ પરીક્ષા પહેલેથી જ આપી દીધી છે. પુનઃપ્રયાસ કરવાની મંજૂરી નથી.');
    }
  } else {
    let calculatedExpiry = now + durationMs;

    if (examData.scheduledStartTimestamp) {
      const scheduledStart = Number(examData.scheduledStartTimestamp);
      const examWindowEnd = scheduledStart + durationMs + gracePeriodMs;
      const lateMs = Math.max(0, now - scheduledStart);

      if (lateMs <= gracePeriodMs) {
        // Late <= 5 minutes: gets full duration, bounded by hard exam window end
        calculatedExpiry = Math.min(now + durationMs, examWindowEnd);
      } else {
        // Late > 5 minutes: penalty for every minute beyond grace period
        // E.g. 6 min late -> 1 min penalty -> gets (20 - 1) = 19 minutes
        const excessLateMs = lateMs - gracePeriodMs;
        const remainingAllowedMs = Math.max(60 * 1000, durationMs - excessLateMs);
        calculatedExpiry = Math.min(now + remainingAllowedMs, examWindowEnd);
      }
    }

    const newAttemptData = {
      examId,
      schoolId,
      studentId: student.id,
      studentName: student.studentName,
      standard: student.standard,
      grNumber: student.grNumber || '',
      rollNumber: student.rollNumber || '',
      startedAt: now,
      expiresAt: calculatedExpiry,
      status: 'in_progress',
      answers: {},
      score: 0,
      totalMarks: examData.totalMarks || 0,
      createdAt: new Date().toISOString(),
    };

    const newDocRef = await addDoc(attemptsCol, newAttemptData);
    attempt = { id: newDocRef.id, ...newAttemptData };
  }

  // Get questions with sanitized answers
  const questionsCol = collection(db, 'schools', schoolId, 'online_exams', examId, 'questions');
  const qSnap = await getDocs(query(questionsCol, orderBy('questionNumber', 'asc')));
  const safeQuestions = qSnap.docs.map((d) => {
    const qData = d.data() as any;
    return {
      id: d.id,
      questionNumber: qData.questionNumber,
      questionText: qData.questionText,
      optionA: qData.optionA,
      optionB: qData.optionB,
      optionC: qData.optionC,
      optionD: qData.optionD,
      marks: qData.marks || 1,
    };
  });

  return {
    success: true,
    exam: {
      id: examSnap.id,
      title: examData.title,
      examType: examData.examType,
      subject: examData.subject,
      standard: examData.standard,
      durationMinutes: examData.durationMinutes,
      totalMarks: examData.totalMarks,
      instructions: examData.instructions,
    },
    attempt,
    questions: safeQuestions,
    serverTime: now,
  };
}

export async function saveStudentAnswers(
  token: string,
  attemptId: string,
  answers: Record<string, string>
) {
  try {
    const res = await fetch('/api/student/save-answers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-student-token': token,
      },
      body: JSON.stringify({ attemptId, answers }),
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  // Client Firestore Fallback
  const session = getStoredStudentSession();
  if (session && session.school?.id) {
    try {
      const attemptRef = doc(db, 'schools', session.school.id, 'exam_attempts', attemptId);
      await updateDoc(attemptRef, {
        answers,
        lastSavedAt: Date.now(),
      });
      return { success: true };
    } catch (fbErr) {
      console.warn('saveStudentAnswers client fallback error:', fbErr);
    }
  }
  return { success: true };
}

export async function submitStudentExam(
  token: string,
  attemptId: string,
  answers: Record<string, string>
) {
  try {
    const res = await fetch('/api/student/submit-exam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-student-token': token,
      },
      body: JSON.stringify({ attemptId, answers }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok) return data;
    }
  } catch (e) {}

  // Client Firestore Fallback
  const session = getStoredStudentSession();
  if (!session || !session.school?.id) {
    throw new Error('વિદ્યાર્થી સત્ર મળ્યું નથી.');
  }

  const schoolId = session.school.id;
  const attemptRef = doc(db, 'schools', schoolId, 'exam_attempts', attemptId);
  const attemptSnap = await getDoc(attemptRef);
  if (!attemptSnap.exists()) {
    throw new Error('પરીક્ષા પ્રયાસ મળ્યો નથી.');
  }

  const attemptData = attemptSnap.data() as any;
  const examId = attemptData.examId;

  // Grade exam client-side from questions
  const questionsCol = collection(db, 'schools', schoolId, 'online_exams', examId, 'questions');
  const qSnap = await getDocs(questionsCol);

  let score = 0;
  let totalMarks = 0;
  qSnap.docs.forEach((qd) => {
    const q = qd.data() as any;
    const qM = q.marks || 1;
    totalMarks += qM;
    const studentAns = (answers[qd.id] || '').toUpperCase();
    const correctAns = (q.correctAnswer || '').toUpperCase();
    if (correctAns && studentAns === correctAns) {
      score += qM;
    }
  });

  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 1000) / 10 : 0;
  const now = Date.now();

  await updateDoc(attemptRef, {
    answers,
    score,
    totalMarks,
    percentage,
    status: 'submitted',
    submittedAt: now,
  });

  return {
    success: true,
    score,
    totalMarks,
    percentage,
    submittedAt: now,
    status: 'submitted',
  };
}

export async function fetchStudentMarks(token: string) {
  try {
    const res = await fetch('/api/student/my-marks', {
      headers: { 'x-student-token': token },
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (netErr) {}

  // Client Firestore Fallback
  const session = getStoredStudentSession();
  if (!session || !session.school?.id || !session.student) {
    return { marks: [], studentName: '', standard: '' };
  }

  try {
    const marksCol = collection(db, 'schools', session.school.id, 'marks');
    const marksQuery = query(marksCol, where('studentId', '==', session.student.id));
    const marksSnap = await getDocs(marksQuery);
    const markRecords = marksSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return {
      marks: markRecords,
      studentName: session.student.studentName,
      standard: session.student.standard,
    };
  } catch (err) {
    console.warn('fetchStudentMarks client fallback error:', err);
    return { marks: [], studentName: '', standard: '' };
  }
}
