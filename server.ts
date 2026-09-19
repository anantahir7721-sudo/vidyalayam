import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy,
  limit,
} from 'firebase/firestore';

dotenv.config();

// Load Firebase Config
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json', e);
}

const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId || undefined);

// In-memory rate limiter for student login: ip:diseCode -> { attempts, lastAttempt }
const loginRateLimitMap = new Map<string, { attempts: number; resetAt: number }>();

function checkRateLimit(key: string, maxAttempts = 8, windowMs = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const record = loginRateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    loginRateLimitMap.set(key, { attempts: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.attempts >= maxAttempts) {
    return false;
  }
  record.attempts += 1;
  return true;
}

// Student active sessions cache: token -> { student, school, createdAt }
interface CachedSession {
  student: any;
  school: any;
  createdAt: number;
}
const studentSessions = new Map<string, CachedSession>();

function normalizeDate(dateVal: any): string {
  if (!dateVal) return '';
  const str = String(dateVal).trim();

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

  // Fallback: standard timestamp or ISO date string parse
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

  // Compare purely digits if normalization didn't match
  const digits1 = s1.replace(/[^0-9]/g, '');
  const digits2 = s2.replace(/[^0-9]/g, '');
  if (digits1 && digits2 && digits1 === digits2) return true;

  return false;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body parser with high limit for image uploads
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // =========================================================================
  // API: Health & Server Time
  // =========================================================================
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  app.get('/api/time', (_req: Request, res: Response) => {
    const now = Date.now();
    res.json({
      serverTime: now,
      iso: new Date(now).toISOString(),
    });
  });

  // =========================================================================
  // API: Student Login (by Student's DISE Code stored in school student data)
  // =========================================================================
  app.post('/api/student/login', async (req: Request, res: Response) => {
    try {
      const { studentDiseCode, diseCode, dob, grNumber } = req.body;
      const cleanInputCode = (studentDiseCode || diseCode || '').toString().trim();
      const cleanDob = (dob || '').toString().trim();
      const cleanGr = (grNumber || '').toString().trim();

      if (!cleanInputCode) {
        return res.status(400).json({
          error: 'કૃપા કરીને વિદ્યાર્થીનો DISE કોડ (Student DISE Code) દાખલ કરો.',
        });
      }

      if (!cleanDob) {
        return res.status(400).json({
          error: 'કૃપા કરીને પાસવર્ડ તરીકે તમારી જન્મ તારીખ (Birthdate) દાખલ કરો.',
        });
      }

      // Rate limit check: ip + inputCode
      const clientIp = req.ip || req.socket.remoteAddress || 'ip';
      const rateLimitKey = `${clientIp}:${cleanInputCode}`;
      if (!checkRateLimit(rateLimitKey)) {
        return res.status(429).json({
          error: 'ઘણા બધા પ્રયાસો થયા છે. સુરક્ષા ખાતર ૫ મિનિટ પછી ફરી પ્રયત્ન કરો.',
        });
      }

      interface StudentMatch {
        student: any;
        schoolId: string;
      }
      let foundStudents: StudentMatch[] = [];

      // 1. Primary Strategy: Query collectionGroup by Student DISE Code (diseCode in student record)
      try {
        const qDise = query(collectionGroup(db, 'students'), where('diseCode', '==', cleanInputCode));
        const snapDise = await getDocs(qDise);
        snapDise.forEach((d) => {
          const pathSegments = d.ref.path.split('/');
          const schoolId = pathSegments[1];
          foundStudents.push({ student: { id: d.id, ...d.data() }, schoolId });
        });
      } catch (cgErr) {
        console.warn('collectionGroup diseCode query note:', cgErr);
      }

      // 2. Secondary Strategy: Query collectionGroup by studentStateCode (UDISE+ Child UID)
      if (foundStudents.length === 0) {
        try {
          const qState = query(collectionGroup(db, 'students'), where('studentStateCode', '==', cleanInputCode));
          const snapState = await getDocs(qState);
          snapState.forEach((d) => {
            const pathSegments = d.ref.path.split('/');
            const schoolId = pathSegments[1];
            foundStudents.push({ student: { id: d.id, ...d.data() }, schoolId });
          });
        } catch (cgErr2) {
          console.warn('collectionGroup studentStateCode query note:', cgErr2);
        }
      }

      // 3. Strategy: Check studentId field in student subcollections
      if (foundStudents.length === 0) {
        try {
          const qId = query(collectionGroup(db, 'students'), where('studentId', '==', cleanInputCode));
          const snapId = await getDocs(qId);
          snapId.forEach((d) => {
            const pathSegments = d.ref.path.split('/');
            const schoolId = pathSegments[1];
            foundStudents.push({ student: { id: d.id, ...d.data() }, schoolId });
          });
        } catch (cgErr3) {
          console.warn('collectionGroup studentId query note:', cgErr3);
        }
      }

      // 4. Strategy: Check if the student's DISE code starts with an 11-digit school DISE code
      if (foundStudents.length === 0 && cleanInputCode.length >= 11) {
        const potentialSchoolDise = cleanInputCode.substring(0, 11);
        try {
          const schoolsCol = collection(db, 'schools');
          const schoolQuery = query(schoolsCol, where('diseCode', '==', potentialSchoolDise));
          const schoolSnap = await getDocs(schoolQuery);
          if (!schoolSnap.empty) {
            const schId = schoolSnap.docs[0].id;
            const studentsSnap = await getDocs(collection(db, 'schools', schId, 'students'));
            studentsSnap.forEach((d) => {
              const data = d.data() as any;
              const sDise = (data.diseCode || '').toString().trim();
              const sState = (data.studentStateCode || '').toString().trim();
              const sId = (data.studentId || '').toString().trim();
              if (sDise === cleanInputCode || sState === cleanInputCode || sId === cleanInputCode) {
                foundStudents.push({ student: { id: d.id, ...data }, schoolId: schId });
              }
            });
          }
        } catch (prefixErr) {
          console.warn('School prefix lookup note:', prefixErr);
        }
      }

      // 5. Strategy: Check if inputCode is an 11-digit School DISE Code (legacy fallback)
      if (foundStudents.length === 0 && cleanInputCode.length === 11) {
        try {
          const schoolsCol = collection(db, 'schools');
          const schoolQuery = query(schoolsCol, where('diseCode', '==', cleanInputCode));
          const schoolSnap = await getDocs(schoolQuery);
          if (!schoolSnap.empty) {
            const schId = schoolSnap.docs[0].id;
            const studentsSnap = await getDocs(collection(db, 'schools', schId, 'students'));
            studentsSnap.forEach((d) => {
              foundStudents.push({ student: { id: d.id, ...d.data() }, schoolId: schId });
            });
          }
        } catch (schErr) {
          console.warn('Legacy school DISE code query note:', schErr);
        }
      }

      // 6. Strategy: Search all schools directly to ensure 100% match coverage
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
              if (
                sDise === cleanInputCode ||
                sState === cleanInputCode ||
                sId === cleanInputCode ||
                sAadhaar === cleanInputCode
              ) {
                foundStudents.push({ student: { id: d.id, ...data }, schoolId: schId });
              }
            });
            if (foundStudents.length > 0) break;
          }
        } catch (fullScanErr) {
          console.warn('Full scan fallback note:', fullScanErr);
        }
      }

      // If no student found with this DISE code in school database
      if (foundStudents.length === 0) {
        return res.status(404).json({
          error: `વિદ્યાર્થીનો DISE કોડ "${cleanInputCode}" શાળાના ડેટામાં મળ્યો નથી. કૃપા કરીને સાચો વિદ્યાર્થી DISE કોડ દાખલ કરો.`,
        });
      }

      // Verify that Birthdate (functioning as password) matches the student's record in school database
      const dobMatched = foundStudents.filter((item) => {
        return datesMatch(item.student.dob, cleanDob);
      });

      if (dobMatched.length === 0) {
        return res.status(401).json({
          error: 'વિદ્યાર્થી DISE કોડ અથવા જન્મ તારીખ (પાસવર્ડ) મેળ ખાતા નથી. કૃપા કરીને શાળાના રેકોર્ડ મુજબ સાચી જન્મ તારીખ દાખલ કરો.',
        });
      }

      // Narrow down to matching student(s) with correct birthdate
      foundStudents = dobMatched;

      // If GR number is provided, filter by GR number
      if (cleanGr) {
        const grMatched = foundStudents.filter((item) => {
          const stGr = (item.student.grNumber || '').toString().trim();
          return stGr.toLowerCase() === cleanGr.toLowerCase();
        });
        if (grMatched.length > 0) {
          foundStudents = grMatched;
        }
      }

      // If multiple students match (e.g. legacy school code without GR)
      if (foundStudents.length > 1 && !cleanGr) {
        return res.json({
          multipleMatches: true,
          message: 'એકથી વધુ વિદ્યાર્થીઓ મળ્યા છે. કૃપા કરીને તમારો G.R. નંબર પસંદ કરો અથવા દાખલ કરો.',
          candidates: foundStudents.map((item) => ({
            studentName: item.student.studentName,
            standard: item.student.standard,
            grNumber: item.student.grNumber || '',
            rollNumber: item.student.rollNumber || '',
            diseCode: item.student.diseCode || item.student.studentStateCode || '',
          })),
        });
      }

      const selectedMatch = foundStudents[0];
      const selectedStudent = selectedMatch.student;
      const schoolId = selectedMatch.schoolId;

      // Fetch School Details
      let schoolData: any = {};
      try {
        const schoolDocSnap = await getDoc(doc(db, 'schools', schoolId));
        if (schoolDocSnap.exists()) {
          schoolData = schoolDocSnap.data();
        }
      } catch (sErr) {
        console.warn('Could not fetch school doc for student session:', sErr);
      }

      // Create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionPayload = {
        student: {
          id: selectedStudent.id,
          studentName: selectedStudent.studentName,
          standard: selectedStudent.standard,
          section: selectedStudent.section || selectedStudent.division || '',
          grNumber: selectedStudent.grNumber || '',
          rollNumber: selectedStudent.rollNumber || '',
          diseCode: selectedStudent.diseCode || selectedStudent.studentStateCode || cleanInputCode,
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
        sessionToken,
      };

      studentSessions.set(sessionToken, {
        student: selectedStudent,
        school: sessionPayload.school,
        createdAt: Date.now(),
      });

      return res.json({
        success: true,
        session: sessionPayload,
      });
    } catch (err: any) {
      console.error('Student login error:', err);
      return res.status(500).json({ error: 'વિદ્યાર્થી લોગિનમાં સર્વર ભૂલ થઈ છે. થોડીવાર પછી પ્રયત્ન કરો.' });
    }
  });

  // Helper middleware to verify student session
  function requireStudentSession(req: Request, res: Response, next: () => void) {
    const token = req.headers['x-student-token'] as string;
    if (!token || !studentSessions.has(token)) {
      return res.status(401).json({ error: 'સત્ર સમાપ્ત થઈ ગયું છે. કૃપા કરીને ફરી લોગિન કરો.' });
    }
    (req as any).studentSession = studentSessions.get(token);
    next();
  }

  // =========================================================================
  // API: Student Marks & Results (Read-Only)
  // =========================================================================
  app.get('/api/student/my-marks', requireStudentSession, async (req: Request, res: Response) => {
    try {
      const session = (req as any).studentSession as CachedSession;
      const { student, school } = session;

      const marksCol = collection(db, 'schools', school.id, 'marks');
      const marksQuery = query(marksCol, where('studentId', '==', student.id));
      const marksSnap = await getDocs(marksQuery);

      const markRecords = marksSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      return res.json({
        marks: markRecords,
        studentName: student.studentName,
        standard: student.standard,
      });
    } catch (err: any) {
      console.error('Error fetching student marks:', err);
      return res.status(500).json({ error: 'ગુણ મેળવવામાં સમસ્યા થઈ.' });
    }
  });

  // =========================================================================
  // API: AI Multimodal Question Importer (Gemini 2.5 Flash)
  // =========================================================================
  app.post('/api/ai/extract-questions', async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'Gemini API Key is not configured in the environment. Please set GEMINI_API_KEY.',
        });
      }

      const { text, fileBase64, mimeType } = req.body;

      if (!text && !fileBase64) {
        return res.status(400).json({
          error: 'કૃપા કરીને પ્રશ્નો ધરાવતી PDF, ફોટો/ઈમેજ અથવા ટેક્સ્ટ આપો.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemPrompt = `You are an expert Gujarati and bilingual educational examination parser.
Your task is to extract Multiple Choice Questions (MCQ) from the provided document, image, scanned paper, handwriting, or text.
Supported languages: Gujarati, English, Hindi, Sanskrit.

CRITICAL RULES:
1. All questions must be strictly Multiple Choice Questions (MCQs) with options A, B, C, D.
2. DO NOT GUESS OR INVENT CORRECT ANSWERS.
   - If the source paper EXPLICITLY indicates the correct answer (e.g., answer key table, marked checkbox, tick mark, underlined option, or explicit statement like "જવાબ: B"), extract it as 'A', 'B', 'C', or 'D'.
   - If the source paper does NOT explicitly state the correct answer, you MUST set correctAnswer to "" (empty string) and set needsReview to true.
   - DO NOT silently answer the questions using your own knowledge!
3. Identify question number, question text, option A, option B, option C, option D, marks (default to 1 if not mentioned).
4. Assign an aiConfidence level:
   - "high": Text and options are crystal clear and unambiguous.
   - "medium": Text is readable but has slight ambiguity, mixed formatting, or minor handwriting blur.
   - "low": Very blurry, incomplete options, unclear handwriting, or heavy scan artifacts.
5. In 'reviewNotes', explain in Gujarati why review is needed if confidence is not high or if answer was not explicitly found.
6. Return ONLY a valid JSON array of objects. Do not wrap in markdown quotes if possible, or return strictly parsable JSON.

Schema per question:
{
  "questionNumber": number,
  "questionText": string (in Gujarati or language of paper),
  "optionA": string,
  "optionB": string,
  "optionC": string,
  "optionD": string,
  "correctAnswer": "A" | "B" | "C" | "D" | "",
  "marks": number,
  "aiConfidence": "high" | "medium" | "low",
  "needsReview": boolean,
  "reviewNotes": string
}`;

      const contents: any[] = [];

      if (fileBase64) {
        // Strip data:image/...;base64, prefix if present
        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
        const fileMime = mimeType || 'image/jpeg';
        contents.push({
          inlineData: {
            mimeType: fileMime,
            data: cleanBase64,
          },
        });
      }

      const userText = text
        ? `Please extract all MCQs from this content:\n\n${text}`
        : 'Please extract all MCQ questions from this image/document.';

      contents.push(userText);

      // Model priority: modern gemini-3.8-flash, followed by gemini-3.6-flash
      const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash'];
      let response: any = null;
      let lastModelError: any = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          });
          if (response) break;
        } catch (mErr: any) {
          console.warn(`Model ${modelName} attempt error:`, mErr?.message || mErr);
          lastModelError = mErr;
        }
      }

      if (!response) {
        throw lastModelError || new Error('Failed to generate response using Gemini models.');
      }

      const responseText = response.text || '[]';
      let extractedQuestions: any[] = [];

      try {
        extractedQuestions = JSON.parse(responseText);
        if (!Array.isArray(extractedQuestions)) {
          if ((extractedQuestions as any).questions && Array.isArray((extractedQuestions as any).questions)) {
            extractedQuestions = (extractedQuestions as any).questions;
          } else {
            extractedQuestions = [extractedQuestions];
          }
        }
      } catch (parseErr) {
        console.warn('Direct JSON parse failed, trying regex match:', parseErr);
        const match = responseText.match(/\[[\s\S]*\]/);
        if (match) {
          extractedQuestions = JSON.parse(match[0]);
        } else {
          throw new Error('Could not parse AI response as JSON.');
        }
      }

      // Normalize and sanitize extracted questions
      const sanitized = extractedQuestions.map((q, idx) => ({
        id: `q_ai_${Date.now()}_${idx + 1}`,
        questionNumber: q.questionNumber || idx + 1,
        questionText: (q.questionText || '').trim(),
        optionA: (q.optionA || '').trim(),
        optionB: (q.optionB || '').trim(),
        optionC: (q.optionC || '').trim(),
        optionD: (q.optionD || '').trim(),
        correctAnswer: ['A', 'B', 'C', 'D'].includes((q.correctAnswer || '').toUpperCase())
          ? (q.correctAnswer.toUpperCase() as 'A' | 'B' | 'C' | 'D')
          : '',
        marks: typeof q.marks === 'number' && q.marks > 0 ? q.marks : 1,
        aiConfidence: ['high', 'medium', 'low'].includes(q.aiConfidence) ? q.aiConfidence : 'medium',
        needsReview: q.needsReview ?? (!q.correctAnswer || q.aiConfidence === 'low'),
        reviewNotes: q.reviewNotes || (q.correctAnswer ? '' : 'સાચો જવાબ મળ્યો નથી. કૃપા કરીને મેન્યુઅલી પસંદ કરો.'),
      }));

      return res.json({
        success: true,
        count: sanitized.length,
        questions: sanitized,
      });
    } catch (err: any) {
      console.error('AI extraction error:', err);
      return res.status(500).json({
        error: err.message || 'AI પ્રશ્ન એક્સટ્રેક્શનમાં ખામી આવી છે. કૃપા કરીને ફરી પ્રયાસ કરો.',
      });
    }
  });

  // =========================================================================
  // API: Student Exams List & Attempt Handlers
  // =========================================================================
  app.get('/api/student/exams', requireStudentSession, async (req: Request, res: Response) => {
    try {
      const session = (req as any).studentSession as CachedSession;
      const { student, school } = session;

      const examsCol = collection(db, 'schools', school.id, 'online_exams');
      const examsSnap = await getDocs(examsCol);

      const now = Date.now();
      const allExams = examsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

      // Filter exams matching student standard and not in draft/cancelled
      const studentExams = allExams.filter((ex) => {
        const stdMatches =
          !ex.standard ||
          ex.standard === student.standard ||
          ex.standard === 'all' ||
          ex.standard === String(student.standard);
        const statusValid = ex.status === 'scheduled' || ex.status === 'live' || ex.status === 'completed';
        return stdMatches && statusValid;
      });

      // Also fetch student's existing attempts for these exams
      const attemptsCol = collection(db, 'schools', school.id, 'exam_attempts');
      const attemptsQuery = query(attemptsCol, where('studentId', '==', student.id));
      const attemptsSnap = await getDocs(attemptsQuery);
      const attemptsMap = new Map<string, any>();
      attemptsSnap.docs.forEach((d) => {
        const at = d.data();
        attemptsMap.set(at.examId, { id: d.id, ...at });
      });

      const enrichedExams = studentExams.map((ex) => {
        const attempt = attemptsMap.get(ex.id);
        const isScheduled = ex.scheduledStartTimestamp > now;
        const isLive = ex.status === 'live' || (!isScheduled && ex.status === 'scheduled');

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

      return res.json({ exams: enrichedExams, serverTime: now });
    } catch (err: any) {
      console.error('Error fetching student exams:', err);
      return res.status(500).json({ error: 'પરીક્ષાઓ લોડ કરવામાં સમસ્યા થઈ.' });
    }
  });

  // Start / Resume Exam Attempt
  app.post('/api/student/start-exam', requireStudentSession, async (req: Request, res: Response) => {
    try {
      const session = (req as any).studentSession as CachedSession;
      const { student, school } = session;
      const { examId } = req.body;

      if (!examId) {
        return res.status(400).json({ error: 'Exam ID is required.' });
      }

      const examDocRef = doc(db, 'schools', school.id, 'online_exams', examId);
      const examSnap = await getDoc(examDocRef);
      if (!examSnap.exists()) {
        return res.status(404).json({ error: 'પરીક્ષા મળી નથી.' });
      }

      const examData = examSnap.data() as any;
      const now = Date.now();

      // Enforce scheduled start time (cannot start early)
      if (examData.scheduledStartTimestamp && now < examData.scheduledStartTimestamp) {
        const diffMs = examData.scheduledStartTimestamp - now;
        return res.status(403).json({
          error: 'પરીક્ષા હજુ શરૂ થઈ નથી.',
          scheduledStartTimestamp: examData.scheduledStartTimestamp,
          remainingMs: diffMs,
          serverTime: now,
        });
      }

      // Late entry prevention rule:
      // If student tries to start after the exam's designated completion time + 10 minutes grace,
      // prevent starting and inform them that the exam has concluded.
      if (examData.scheduledStartTimestamp && examData.durationMinutes) {
        const durationMs = Number(examData.durationMinutes) * 60 * 1000;
        const examOfficialEndTime = examData.scheduledStartTimestamp + durationMs;
        const cutoffTime = examOfficialEndTime + 10 * 60 * 1000; // 10 minutes past exam completion

        if (now > cutoffTime) {
          return res.status(403).json({
            error: 'પરીક્ષા પૂર્ણ થઈ ગઈ છે. પરીક્ષાનો સમય સમાપ્ત થઈ ગયેલ હોવાથી હવે પરીક્ષા શરૂ કરી શકાશે નહીં.',
            isExpired: true,
            scheduledStartTimestamp: examData.scheduledStartTimestamp,
            examOfficialEndTime,
            serverTime: now,
          });
        }
      }

      // Check existing attempt
      const attemptsCol = collection(db, 'schools', school.id, 'exam_attempts');
      const q = query(attemptsCol, where('examId', '==', examId), where('studentId', '==', student.id));
      const existingAttempts = await getDocs(q);

      let attempt: any = null;
      if (!existingAttempts.empty) {
        attempt = { id: existingAttempts.docs[0].id, ...existingAttempts.docs[0].data() };
        if (attempt.status === 'submitted' || attempt.status === 'timed_out') {
          return res.status(403).json({
            error: 'તમે આ પરીક્ષા પહેલેથી જ આપી દીધી છે. પુનઃપ્રયાસ કરવાની મંજૂરી નથી.',
            attempt,
          });
        }
      } else {
        // Create new attempt with authoritative start & expiry time
        const durationMs = (Number(examData.durationMinutes) || 30) * 60 * 1000;
        // Cap expiry at the exam's official end time plus 10 minutes grace, or now + durationMs
        let calculatedExpiry = now + durationMs;
        if (examData.scheduledStartTimestamp) {
          const hardCutoff = examData.scheduledStartTimestamp + durationMs + 10 * 60 * 1000;
          calculatedExpiry = Math.min(calculatedExpiry, hardCutoff);
        }

        const newAttemptData = {
          examId,
          schoolId: school.id,
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

      // Fetch questions with correctAnswer STRIPPED OUT to prevent cheating!
      const questionsCol = collection(db, 'schools', school.id, 'online_exams', examId, 'questions');
      const qSnap = await getDocs(query(questionsCol, orderBy('questionNumber', 'asc')));

      let safeQuestions = qSnap.docs.map((d) => {
        const qData = d.data();
        return {
          id: d.id,
          questionNumber: qData.questionNumber,
          questionText: qData.questionText,
          optionA: qData.optionA,
          optionB: qData.optionB,
          optionC: qData.optionC,
          optionD: qData.optionD,
          marks: qData.marks || 1,
          imageUrl: qData.imageUrl || '',
        };
      });

      // Optional randomization
      if (examData.randomizeQuestions) {
        safeQuestions = safeQuestions.sort(() => Math.random() - 0.5);
      }

      return res.json({
        success: true,
        exam: {
          id: examId,
          title: examData.title,
          subject: examData.subject,
          standard: examData.standard,
          durationMinutes: examData.durationMinutes,
          totalMarks: examData.totalMarks,
          instructions: examData.instructions,
        },
        attempt: {
          id: attempt.id,
          startedAt: attempt.startedAt,
          expiresAt: attempt.expiresAt,
          answers: attempt.answers || {},
          status: attempt.status,
        },
        questions: safeQuestions,
        serverTime: now,
      });
    } catch (err: any) {
      console.error('Error starting exam:', err);
      return res.status(500).json({ error: 'પરીક્ષા શરૂ કરવામાં સમસ્યા થઈ.' });
    }
  });

  // Auto-save student answers continuously
  app.post('/api/student/save-answers', requireStudentSession, async (req: Request, res: Response) => {
    try {
      const session = (req as any).studentSession as CachedSession;
      const { student, school } = session;
      const { attemptId, answers } = req.body;

      if (!attemptId || !answers) {
        return res.status(400).json({ error: 'Attempt ID and answers are required.' });
      }

      const attemptRef = doc(db, 'schools', school.id, 'exam_attempts', attemptId);
      const attemptSnap = await getDoc(attemptRef);

      if (!attemptSnap.exists()) {
        return res.status(404).json({ error: 'Attempt not found.' });
      }

      const attemptData = attemptSnap.data() as any;
      if (attemptData.studentId !== student.id) {
        return res.status(403).json({ error: 'Unauthorized attempt access.' });
      }

      const now = Date.now();
      // Allow 30 seconds grace period for network latency
      if (attemptData.status === 'submitted' || now > attemptData.expiresAt + 30000) {
        return res.status(403).json({
          error: 'પરીક્ષાનો સમય સમાપ્ત થઈ ગયો છે અથવા સબમિટ થઈ ગઈ છે.',
          expired: true,
        });
      }

      const mergedAnswers = { ...(attemptData.answers || {}), ...answers };
      await updateDoc(attemptRef, {
        answers: mergedAnswers,
        lastSavedAt: now,
      });

      return res.json({ success: true, savedAt: now });
    } catch (err: any) {
      console.error('Error saving answers:', err);
      return res.status(500).json({ error: 'જવાબો સાચવવામાં સમસ્યા થઈ.' });
    }
  });

  // Submit Exam Attempt & Auto Evaluate
  app.post('/api/student/submit-exam', requireStudentSession, async (req: Request, res: Response) => {
    try {
      const session = (req as any).studentSession as CachedSession;
      const { student, school } = session;
      const { attemptId, answers: finalAnswers } = req.body;

      if (!attemptId) {
        return res.status(400).json({ error: 'Attempt ID is required.' });
      }

      const attemptRef = doc(db, 'schools', school.id, 'exam_attempts', attemptId);
      const attemptSnap = await getDoc(attemptRef);
      if (!attemptSnap.exists()) {
        return res.status(404).json({ error: 'Attempt not found.' });
      }

      const attemptData = attemptSnap.data() as any;
      if (attemptData.studentId !== student.id) {
        return res.status(403).json({ error: 'Unauthorized attempt access.' });
      }

      if (attemptData.status === 'submitted') {
        return res.json({
          success: true,
          message: 'પરીક્ષા પહેલેથી સબમિટ થઈ ચૂકી છે.',
          attempt: attemptData,
        });
      }

      const examId = attemptData.examId;
      const examRef = doc(db, 'schools', school.id, 'online_exams', examId);
      const examSnap = await getDoc(examRef);
      const examData = examSnap.data() as any;

      // Merge latest answers
      const answersToEvaluate = { ...(attemptData.answers || {}), ...(finalAnswers || {}) };

      // Fetch authentic questions with correct answers
      const questionsCol = collection(db, 'schools', school.id, 'online_exams', examId, 'questions');
      const qSnap = await getDocs(questionsCol);

      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;
      let obtainedMarks = 0;
      let totalMarks = 0;

      qSnap.docs.forEach((qDoc) => {
        const q = qDoc.data();
        const qMarks = q.marks || 1;
        totalMarks += qMarks;

        const studentAns = (answersToEvaluate[qDoc.id] || '').toUpperCase();
        const correctAns = (q.correctAnswer || '').toUpperCase();

        if (!studentAns) {
          unansweredCount += 1;
        } else if (studentAns === correctAns) {
          correctCount += 1;
          obtainedMarks += qMarks;
        } else {
          incorrectCount += 1;
        }
      });

      const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 1000) / 10 : 0;
      const now = Date.now();

      const updatedAttempt = {
        answers: answersToEvaluate,
        score: obtainedMarks,
        totalMarks,
        correctCount,
        incorrectCount,
        unansweredCount,
        percentage,
        submittedAt: now,
        status: 'submitted',
        isTimedOut: now > attemptData.expiresAt,
      };

      await updateDoc(attemptRef, updatedAttempt);

      const showResult = examData?.resultVisibility === 'immediate';

      return res.json({
        success: true,
        message: 'તમારી પરીક્ષા સફળતાપૂર્વક સબમિટ થઈ ગઈ છે.',
        showResult,
        result: showResult
          ? {
              score: obtainedMarks,
              totalMarks,
              percentage,
              correctCount,
              incorrectCount,
              unansweredCount,
            }
          : null,
      });
    } catch (err: any) {
      console.error('Error submitting exam:', err);
      return res.status(500).json({ error: 'પરીક્ષા સબમિટ કરવામાં સમસ્યા થઈ.' });
    }
  });

  // =========================================================================
  // Vite Middleware (Dev) vs Static Files (Prod)
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
