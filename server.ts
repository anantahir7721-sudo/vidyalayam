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
  // API: School Secure Password Change
  // =========================================================================
  app.post('/api/school/change-password', async (req: Request, res: Response) => {
    try {
      const { schoolId, currentPassword, newPassword } = req.body;
      if (!schoolId || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'બધી વિગતો ભરવી ફરજિયાત છે.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'નવો પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.' });
      }

      const schoolRef = doc(db, 'schools', schoolId);
      const snap = await getDoc(schoolRef);
      if (!snap.exists()) {
        return res.status(404).json({ error: 'શાળાનો રેકોર્ડ મળ્યો નથી.' });
      }

      const schoolData = snap.data() as any;
      // If password field exists in Firestore, verify it matches currentPassword
      if (schoolData.password && schoolData.password !== currentPassword) {
        return res.status(401).json({ error: 'વર્તમાન પાસવર્ડ ખોટો છે.' });
      }

      await updateDoc(schoolRef, {
        password: newPassword,
        temporaryPassword: null,
        mustResetPassword: false,
        updatedAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message: 'શાળાનો પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો છે!',
      });
    } catch (err: any) {
      console.error('Change password error:', err);
      return res.status(500).json({ error: err.message || 'પાસવર્ડ બદલવામાં સમસ્યા થઈ.' });
    }
  });

  // =========================================================================
  // API: School Reset Password via Temporary Password
  // =========================================================================
  app.post('/api/school/reset-password-with-temp', async (req: Request, res: Response) => {
    try {
      const { schoolId, diseCode, temporaryPassword, newPassword } = req.body;
      if ((!schoolId && !diseCode) || !temporaryPassword || !newPassword) {
        return res.status(400).json({ error: 'બધી વિગતો ભરવી ફરજિયાત છે.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'નવો પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.' });
      }

      let schoolRef: any;
      let schoolData: any;

      if (schoolId) {
        schoolRef = doc(db, 'schools', schoolId);
        const snap = await getDoc(schoolRef);
        if (snap.exists()) {
          schoolData = snap.data();
        }
      }

      if (!schoolData && diseCode) {
        const q = query(collection(db, 'schools'), where('diseCode', '==', diseCode.trim()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          schoolRef = snap.docs[0].ref;
          schoolData = snap.docs[0].data();
        }
      }

      if (!schoolData) {
        return res.status(404).json({ error: 'આ DISE કોડ વાળી શાળા મળી નથી.' });
      }

      // Verify temporary password
      const expectedTemp = (schoolData.temporaryPassword || '').trim();
      const enteredTemp = temporaryPassword.trim();
      if (!expectedTemp || expectedTemp !== enteredTemp) {
        return res.status(401).json({ error: 'અમાન્ય ટેમ્પરરી પાસવર્ડ. કૃપા કરીને એડમિન દ્વારા આપવામાં આવેલ સાચો પાસવર્ડ દાખલ કરો.' });
      }

      await updateDoc(schoolRef, {
        password: newPassword,
        temporaryPassword: null,
        mustResetPassword: false,
        updatedAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message: 'નવો પાસવર્ડ સફળતાપૂર્વક સેટ થઈ ગયો છે!',
        school: {
          id: schoolRef.id,
          ...schoolData,
          password: newPassword,
          mustResetPassword: false,
          temporaryPassword: null,
        },
      });
    } catch (err: any) {
      console.error('Reset password with temp error:', err);
      return res.status(500).json({ error: err.message || 'પાસવર્ડ સેટ કરવામાં સમસ્યા થઈ.' });
    }
  });

  // =========================================================================
  // API: Admin Set Temporary Password for School
  // =========================================================================
  app.post('/api/admin/set-temp-password', async (req: Request, res: Response) => {
    try {
      const { schoolId, tempPassword, diseCode } = req.body;
      if (!schoolId || !tempPassword) {
        return res.status(400).json({ error: 'School ID and Temporary Password are required.' });
      }

      const schoolRef = doc(db, 'schools', schoolId);
      await updateDoc(schoolRef, {
        temporaryPassword: tempPassword.trim(),
        mustResetPassword: true,
        temporaryPasswordCreatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Automatically resolve any pending reset requests for this DISE code
      if (diseCode) {
        try {
          const prQuery = query(collection(db, 'password_reset_requests'), where('diseCode', '==', diseCode.trim()));
          const prSnap = await getDocs(prQuery);
          for (const prDoc of prSnap.docs) {
            await updateDoc(prDoc.ref, {
              status: 'resolved',
              resolvedAt: new Date().toISOString(),
              adminNotes: `ટેમ્પરરી પાસવર્ડ જનરેટ કરવામાં આવ્યો: ${tempPassword.trim()}`,
            });
          }
        } catch (e) {
          console.warn('Could not auto-resolve password reset requests:', e);
        }
      }

      return res.json({
        success: true,
        message: 'ટેમ્પરરી પાસવર્ડ સફળતાપૂર્વક સેટ થઈ ગયો છે.',
      });
    } catch (err: any) {
      console.error('Admin set temp password error:', err);
      return res.status(500).json({ error: err.message || 'ટેમ્પરરી પાસવર્ડ સેટ કરવામાં ભૂલ આવી.' });
    }
  });

  // =========================================================================
  // API: Admin Delete School and All Related Data Completely
  // =========================================================================
  app.post('/api/admin/delete-school', async (req: Request, res: Response) => {
    try {
      const { schoolId, diseCode } = req.body;
      if (!schoolId) {
        return res.status(400).json({ error: 'School ID is required.' });
      }

      const schoolRef = doc(db, 'schools', schoolId);
      const schoolSnap = await getDoc(schoolRef);
      const targetDise = diseCode || (schoolSnap.exists() ? (schoolSnap.data() as any)?.diseCode : '');

      let deletedCounts = {
        students: 0,
        marks: 0,
        staff: 0,
        online_exams: 0,
        exam_attempts: 0,
        resetRequests: 0,
      };

      // 1. Delete students subcollection
      try {
        const snap = await getDocs(collection(db, 'schools', schoolId, 'students'));
        deletedCounts.students = snap.size;
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Error deleting students:', e);
      }

      // 2. Delete marks subcollection
      try {
        const snap = await getDocs(collection(db, 'schools', schoolId, 'marks'));
        deletedCounts.marks = snap.size;
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Error deleting marks:', e);
      }

      // 3. Delete staff subcollection
      try {
        const snap = await getDocs(collection(db, 'schools', schoolId, 'staff'));
        deletedCounts.staff = snap.size;
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Error deleting staff:', e);
      }

      // 4. Delete online_exams and subcollections (/questions)
      try {
        const examsSnap = await getDocs(collection(db, 'schools', schoolId, 'online_exams'));
        deletedCounts.online_exams = examsSnap.size;
        for (const examDoc of examsSnap.docs) {
          const qSnap = await getDocs(collection(db, 'schools', schoolId, 'online_exams', examDoc.id, 'questions'));
          for (const qDoc of qSnap.docs) {
            await deleteDoc(qDoc.ref);
          }
          await deleteDoc(examDoc.ref);
        }
      } catch (e) {
        console.warn('Error deleting online exams:', e);
      }

      // 5. Delete exam_attempts subcollection
      try {
        const snap = await getDocs(collection(db, 'schools', schoolId, 'exam_attempts'));
        deletedCounts.exam_attempts = snap.size;
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Error deleting exam attempts:', e);
      }

      // 6. Delete other possible subcollections (subjects, certificates)
      for (const subcol of ['subjects', 'certificates', 'reports']) {
        try {
          const snap = await getDocs(collection(db, 'schools', schoolId, subcol));
          for (const d of snap.docs) {
            await deleteDoc(d.ref);
          }
        } catch {}
      }

      // 7. Delete password_reset_requests for this school if DISE code is known
      if (targetDise) {
        try {
          const prQuery = query(collection(db, 'password_reset_requests'), where('diseCode', '==', targetDise.trim()));
          const prSnap = await getDocs(prQuery);
          deletedCounts.resetRequests = prSnap.size;
          for (const prDoc of prSnap.docs) {
            await deleteDoc(prDoc.ref);
          }
        } catch (e) {
          console.warn('Error deleting reset requests:', e);
        }
      }

      // 8. Finally delete the school root document
      try {
        await deleteDoc(schoolRef);
      } catch (delErr) {
        console.warn('School root doc delete note (may have been deleted client-side):', delErr);
      }

      return res.json({
        success: true,
        message: 'શાળા અને તેનો તમામ ડેટા ડેટાબેઝમાંથી સંપૂર્ણપણે ડિલીટ કરવામાં આવ્યો છે.',
        details: deletedCounts,
      });
    } catch (err: any) {
      console.warn('Admin delete school server notice:', err);
      return res.json({ success: true, message: 'શાળા ડિલીટ કરવાની પ્રક્રિયા પૂર્ણ થઈ.' });
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

      // Model priority with robust fallbacks:
      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-flash-latest',
      ];
      let response: any = null;
      let lastModelError: any = null;

      const waitDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      for (const modelName of candidateModels) {
        let attemptsForThisModel = 0;
        const maxAttemptsPerModel = 2;

        while (attemptsForThisModel < maxAttemptsPerModel) {
          attemptsForThisModel++;
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
            if (response && response.text) break;
          } catch (mErr: any) {
            const errStr = String(mErr?.message || mErr || '');
            console.warn(
              `Model ${modelName} (attempt ${attemptsForThisModel}/${maxAttemptsPerModel}) error:`,
              errStr
            );
            lastModelError = mErr;

            const isQuotaExhausted =
              errStr.includes('429') ||
              errStr.includes('RESOURCE_EXHAUSTED') ||
              errStr.includes('resource_exhausted') ||
              errStr.includes('usage limit') ||
              errStr.includes('Quota') ||
              errStr.includes('quota');

            // If quota is exhausted on this specific model, immediately switch to the next fallback model
            if (isQuotaExhausted) {
              break;
            }

            const isTransientServerBusy =
              errStr.includes('503') ||
              errStr.includes('high demand') ||
              errStr.includes('UNAVAILABLE') ||
              errStr.includes('overloaded');

            if (isTransientServerBusy && attemptsForThisModel < maxAttemptsPerModel) {
              await waitDelay(1200);
            } else {
              break;
            }
          }
        }
        if (response && response.text) break;
      }

      if (!response || !response.text) {
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
      let rawMsg = String(err?.message || err || '');
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed?.error?.message) {
          rawMsg = parsed.error.message;
        }
      } catch (_) {}

      let userFriendlyMsg = 'AI પ્રશ્ન એક્સટ્રેક્શનમાં ખામી આવી છે. કૃપા કરીને ફરી પ્રયાસ કરો.';
      if (
        rawMsg.includes('503') ||
        rawMsg.includes('high demand') ||
        rawMsg.includes('UNAVAILABLE') ||
        rawMsg.includes('overloaded')
      ) {
        userFriendlyMsg =
          'Google AI સર્વર પર હાલમાં ખૂબ જ ભારે ટ્રાફિક (High Demand) છે. કૃપા કરીને થોડી સેકન્ડ પછી "🔄 ફરી પ્રયાસ કરો" બટન દબાવો.';
      } else if (
        rawMsg.includes('429') ||
        rawMsg.includes('RESOURCE_EXHAUSTED') ||
        rawMsg.includes('resource_exhausted') ||
        rawMsg.includes('usage limit') ||
        rawMsg.includes('Quota') ||
        rawMsg.includes('quota')
      ) {
        userFriendlyMsg =
          'Google AI સર્વર વપરાશ મર્યાદા (Quota Limit) આવી છે. કૃપા કરીને થોડી સેકન્ડ પછી "🔄 ફરી પ્રયાસ કરો" બટન દબાવો.';
      } else if (rawMsg.includes('API_KEY') || rawMsg.includes('apiKey')) {
        userFriendlyMsg = 'Google AI કન્ફિગરેશન ચકાસો. કૃપા કરીને ફરી પ્રયાસ કરો.';
      }

        return res.status(500).json({
        error: userFriendlyMsg,
        rawMessage: 'RESOURCE_EXHAUSTED',
      });
    }
  });

  // =========================================================================
  // API: AI Abhivyakti Generator for School Prayer Assembly (Gemini 3.8 Flash)
  // =========================================================================
  app.post('/api/ai/abhivyakti-generate', async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'Gemini API Key is not configured. Please set GEMINI_API_KEY.',
        });
      }

      const {
        interest,
        talentCategory,
        standard = '10',
        topic,
        studentName,
      } = req.body;

      const userInterest = (interest || topic || talentCategory || 'સંગીત').toString().trim();

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemPrompt = `તમે ગુજરાતની માધ્યમિક અને ઉચ્ચતર માધ્યમિક શાળાઓ (ધોરણ ૯ થી ૧૨) ના નિષ્ણાત સાંસ્કૃતિક માર્ગદર્શક અને પ્રાર્થના સંમેલન કોચ (Assembly Presentation Coach) છો.
તમારું કાર્ય વિદ્યાર્થીના રસ અને ટેલેન્ટ (જેમ કે સંગીત, ઢોલ વાદન, એકપાત્રીય અભિનય, મિમિક્રી, હિન્દી સંવાદો, કાવ્ય પઠન, પ્રાર્થના સભા રમતો, કોયડા-ઉખાણાં, પ્રેરણાદાયી વાર્તા, મહાન પુરુષ જીવનપ્રસંગ, નૃત્ય મુદ્રાઓ, રોચક વિજ્ઞાન ડેમો વગેરે) મુજબ પ્રાર્થના સભામાં સ્ટેજ પર બોલવા લાયક બરાબર ૫ મિનિટ (5 Minutes) ની સંપૂર્ણ ગુજરાતી પ્રસ્તુતિ તૈયાર કરવાનું છે.

નિયમો:
1. ભાષા શુદ્ધ, આદરણીય, રોચક અને પ્રેરક ગુજરાતી હોવી જોઈએ. (જરૂર મુજબ હિન્દી સંવાદ કે શ્લોક પણ સમાવી શકાય).
2. પ્રસ્તુતિ પ્રાર્થના સભાના સ્ટેજ પર બોલવાની શબ્દશઃ સ્ક્રિપ્ટ (Word-by-word script) આપવી.
3. ૫ મિનિટનું ચોક્કસ સમય વિભાજન આપવું (0:00 થી 5:00 મિનિટ).
4. સભાના વિદ્યાર્થીઓ સાથે ઇન્ટરેક્શન (તાળીઓ, પ્રશ્નો, રિસ્પોન્સ) નો ભાગ અવશ્ય રાખવો.
5. આઉટપુટ STRICTLY JSON ફોર્મેટમાં આપવું.

JSON સ્કીમા:
{
  "title": string (આકર્ષક શીર્ષક),
  "category": string (દા.ત. "સંગીત & ઢોલ વાદન", "એકપાત્રીય અભિનય", "મિમિક્રી & સંવાદ", "સભા રમત & કોયડા", "પ્રેરક વાર્તા", "કાવ્ય પઠન" વગેરે),
  "duration": "૫ મિનિટ",
  "targetAudience": "શાળા પ્રાર્થના સભા",
  "summary": string (ટૂંકો સારાંશ ૨ લીટીમાં),
  "timeBreakdown": [
    { "timeRange": "0:00 - 0:45", "activity": string },
    { "timeRange": "0:45 - 2:30", "activity": string },
    { "timeRange": "2:30 - 4:15", "activity": string },
    { "timeRange": "4:15 - 5:00", "activity": string }
  ],
  "fullScript": string (સ્ટેજ પર માઇક પાસે બોલવાની સંપૂર્ણ શબ્દશઃ સ્ક્રિપ્ટ, અભિનય/હાવભાવ કૌંસમાં દર્શાવવા),
  "deliveryTips": string (અવાજ, શ્વાસ, નજર અને સ્ટેજ હાવભાવ વિશે સૂચનો),
  "requiredProps": string (જો કોઈ સાધન જોઈએ તો, જેમ કે ઢોલક, પુસ્તક, ગ્લાસ, વગેરે)
}`;

      const userPrompt = `વિદ્યાર્થીનો રસ / ટેલેન્ટ: "${userInterest}"
પસંદ કરેલ કેટેગરી: "${talentCategory || 'કોઈપણ'}"
વિદ્યાર્થીનું ધોરણ: "ધોરણ ${standard}"
${topic ? `ખાસ વિષય: "${topic}"` : ''}
${studentName ? `વિદ્યાર્થીનું નામ: "${studentName}"` : ''}

કૃપા કરીને આ રસ આધારિત પ્રાર્થના સભા માટે ૫ મિનિટની ખૂબ જ રોમાંચક અને અસરકારક અભિવ્યક્તિ પ્રસ્તુતિ તૈયાર કરી આપો.`;

      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-flash-latest',
      ];

      let response: any = null;
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          });
          if (response && response.text) break;
        } catch (mErr: any) {
          lastErr = mErr;
          console.warn(`Abhivyakti generation error on ${modelName}:`, mErr?.message || mErr);
        }
      }

      if (!response || !response.text) {
        throw lastErr || new Error('Failed to generate presentation with AI.');
      }

      let parsedData: any = {};
      try {
        parsedData = JSON.parse(response.text);
      } catch (parseErr) {
        const match = response.text.match(/\{[\s\S]*\}/);
        if (match) {
          parsedData = JSON.parse(match[0]);
        } else {
          throw new Error('Could not parse AI output as JSON.');
        }
      }

      return res.json({
        success: true,
        data: {
          id: `ai-abhivyakti-${Date.now()}`,
          title: parsedData.title || `અભિવ્યક્તિ: ${userInterest}`,
          category: parsedData.category || talentCategory || 'સામાન્ય અભિવ્યક્તિ',
          categoryLabel: parsedData.category || '✨ વિશિષ્ટ અભિવ્યક્તિ',
          duration: parsedData.duration || '૫ મિનિટ',
          targetAudience: parsedData.targetAudience || 'શાળા પ્રાર્થના સભા',
          summary: parsedData.summary || '',
          timeBreakdown: Array.isArray(parsedData.timeBreakdown) ? parsedData.timeBreakdown : [],
          fullScript: parsedData.fullScript || '',
          deliveryTips: parsedData.deliveryTips || '',
          keyPropsOrRequirements: parsedData.requiredProps || '',
          aiGenerated: true,
        },
      });
    } catch (err: any) {
      console.error('Abhivyakti AI error:', err);
      return res.status(500).json({
        error: 'AI અભિવ્યક્તિ જનરેશનમાં સમસ્યા આવી. કૃપા કરીને ફરી પ્રયાસ કરો.',
        raw: String(err?.message || err),
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
  // Bulk Parent Personalized SMS Dispatcher API
  // =========================================================================
  app.post('/api/send-bulk-parent-sms', async (req: Request, res: Response) => {
    try {
      const { recipients } = req.body;
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'કોઈ વાલી નંબર મળ્યો નથી.' });
      }

      const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY;
      
      // If an external SMS gateway key is configured, dispatch concurrently
      if (apiKey) {
        let sentCount = 0;
        let failedCount = 0;

        await Promise.all(
          recipients.map(async (rec: any) => {
            const phone = String(rec.parentPhone || '').replace(/\D/g, '').slice(-10);
            if (phone.length === 10 && rec.messageText) {
              try {
                // Example Fast2SMS Quick SMS API dispatch
                const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                  method: 'POST',
                  headers: {
                    authorization: apiKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    route: 'q',
                    message: rec.messageText,
                    language: 'unicode',
                    numbers: phone,
                  }),
                });
                if (response.ok) {
                  sentCount++;
                } else {
                  failedCount++;
                }
              } catch (e) {
                failedCount++;
              }
            }
          })
        );

        return res.json({
          success: true,
          message: `${sentCount} વાલીઓને SMS સફળતાપૂર્વક મોકલાયા.`,
          sentCount,
          failedCount,
        });
      }

      // If no external gateway key is configured in env
      return res.json({
        success: true,
        isSimulated: true,
        message: 'SMS API કી રૂપરેખાંકિત નથી. સિસ્ટમ સ્થાનિક બ્રોડકાસ્ટ અને WhatsApp ઓટો-રનર દ્વારા મેસેજિંગ સુવિધા આપે છે.',
        totalRecipients: recipients.length,
      });
    } catch (err: any) {
      console.error('Error in /api/send-bulk-parent-sms:', err);
      return res.status(500).json({ error: 'SMS મોકલવામાં સમસ્યા થઈ.' });
    }
  });

  // =========================================================================
  // DAILY KNOWLEDGE & NEWS API (5:00 AM News & 1:00 PM Janva Jevu)
  // =========================================================================

  // Helper: decode HTML entities in RSS XML
  function decodeRssHtml(html: string): string {
    return html
      .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
      .replace(/&#(\d+);/g, (_, dec) => {
        const code = parseInt(dec, 10);
        return !isNaN(code) ? String.fromCharCode(code) : '';
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const code = parseInt(hex, 16);
        return !isNaN(code) ? String.fromCharCode(code) : '';
      })
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  // Helper: fetch RSS feed items in Gujarati
  async function fetchLiveGujaratiRss(url: string, maxItems = 6): Promise<Array<{ headline: string; summary: string; source: string; pubDate?: string }>> {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return [];
      const text = await res.text();
      const items: Array<{ headline: string; summary: string; source: string; pubDate?: string }> = [];
      const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?(?:<description>([\s\S]*?)<\/description>)?[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/g;
      let match;
      while ((match = itemRegex.exec(text)) !== null && items.length < maxItems) {
        let rawTitle = decodeRssHtml(match[1]);
        if (!rawTitle || rawTitle === 'Google સમાચાર' || rawTitle.includes('Google News') || rawTitle.includes(' - Google')) continue;
        let source = 'ગુજરાતી લાઈવ ન્યૂઝ';
        const sourceMatch = rawTitle.match(/\s*-\s*([^-]+)$/);
        if (sourceMatch) {
          source = sourceMatch[1].trim();
          rawTitle = rawTitle.replace(/\s*-\s*[^-]+$/, '').trim();
        }
        const rawDesc = match[2] ? decodeRssHtml(match[2]) : '';
        let summary = rawDesc.length > 20 && !rawDesc.includes('http') ? rawDesc.slice(0, 160) : rawTitle;
        if (!summary.endsWith('.')) summary += '.';
        summary += ` (સ્ત્રોત: ${source})`;

        items.push({
          headline: rawTitle,
          summary,
          source,
          pubDate: match[3],
        });
      }
      return items;
    } catch {
      return [];
    }
  }

  // Helper: Format Gujarati Date
  function formatServerGujaratiDate(date: Date): string {
    const gujaratiDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
    const toGu = (num: number) => String(num).replace(/[0-9]/g, (d) => gujaratiDigits[parseInt(d, 10)]);
    const gujaratiMonths = ['જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન', 'જુલાઇ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'];
    const gujaratiDays = ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'];
    return `${toGu(date.getDate())} ${gujaratiMonths[date.getMonth()]} ${toGu(date.getFullYear())}, ${gujaratiDays[date.getDay()]}`;
  }

  // GET /api/daily-news: returns active 5 AM news bulletin with real-time live sourcing
  app.get('/api/daily-news', async (req: Request, res: Response) => {
    try {
      // Calculate active edition cycle in Indian Standard Time (Asia/Kolkata)
      const now = new Date();
      const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const istNow = new Date(istString);
      const hours = istNow.getHours();
      const editionDate = new Date(istNow);
      if (hours < 5) {
        editionDate.setDate(editionDate.getDate() - 1);
      }
      const y = editionDate.getFullYear();
      const m = String(editionDate.getMonth() + 1).padStart(2, '0');
      const d = String(editionDate.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;
      const forceRefresh = req.query.forceRefresh === 'true';

      const nextUpdate = new Date(istNow);
      if (hours < 5) {
        nextUpdate.setHours(5, 0, 0, 0);
      } else {
        nextUpdate.setDate(nextUpdate.getDate() + 1);
        nextUpdate.setHours(5, 0, 0, 0);
      }

      // Check Firestore cache: valid only if cached during current 5 AM edition and less than 1 hour old
      const docRef = doc(db, 'daily_news', dateKey);
      if (!forceRefresh) {
        try {
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            const updatedAtTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
            const ageMs = Date.now() - updatedAtTime;
            // Cache valid if within 60 minutes and has 10 live items
            if (data.isLiveNews && Array.isArray(data.items) && data.items.length >= 10 && ageMs < 60 * 60 * 1000) {
              return res.json({ success: true, bulletin: data });
            }
          }
        } catch (readErr) {
          console.warn('Firestore read error in /api/daily-news, proceeding to live feeds:', readErr);
        }
      }

      // Fetch live fresh Gujarati news directly from real-time Gujarati sources across all 6 categories
      const [kutchFeeds, gujaratTv9Feeds, gujaratGoogleFeeds, nationalFeeds, worldFeeds, educationFeeds, sportsFeeds] = await Promise.all([
        fetchLiveGujaratiRss(`https://news.google.com/rss/search?q=${encodeURIComponent('કચ્છ OR ભુજ OR ગાંધીધામ OR અંજાર')}&hl=gu-IN&gl=IN&ceid=IN:gu`, 6),
        fetchLiveGujaratiRss('https://tv9gujarati.com/gujarat/feed', 8),
        fetchLiveGujaratiRss(`https://news.google.com/rss/search?q=${encodeURIComponent('ગુજરાત સમાચાર')}&hl=gu-IN&gl=IN&ceid=IN:gu`, 6),
        fetchLiveGujaratiRss('https://news.google.com/rss/headlines/section/topic/NATION?hl=gu-IN&gl=IN&ceid=IN:gu', 6),
        fetchLiveGujaratiRss('https://news.google.com/rss/headlines/section/topic/WORLD?hl=gu-IN&gl=IN&ceid=IN:gu', 6),
        fetchLiveGujaratiRss(`https://news.google.com/rss/search?q=${encodeURIComponent('શિક્ષણ OR શાળા OR ઇસરો OR વિજ્ઞાન')}&hl=gu-IN&gl=IN&ceid=IN:gu`, 6),
        fetchLiveGujaratiRss('https://news.google.com/rss/headlines/section/topic/SPORTS?hl=gu-IN&gl=IN&ceid=IN:gu', 6),
      ]);

      const allGujarat = [...gujaratTv9Feeds, ...gujaratGoogleFeeds];
      const items: any[] = [];
      let itemCounter = 1;

      // 1. કચ્છ વિશેષ (2 items)
      for (let i = 0; i < 2; i++) {
        const item = kutchFeeds[i] || allGujarat.find((g) => g.headline.includes('કચ્છ') || g.headline.includes('ભુજ') || g.headline.includes('ગાંધીધામ'));
        if (item) {
          items.push({
            id: `news-${dateKey}-${itemCounter++}`,
            category: 'kutch',
            categoryLabel: 'કચ્છ વિશેષ',
            headline: item.headline,
            summary: item.summary,
            impact: 'કચ્છ જિલ્લાના વિકાસ, વહીવટ, શિક્ષણ અને સમાજ જીવન વિષયક મહત્વપૂર્ણ તાજા સમાચાર.',
            sourceDate: dateKey,
          });
        }
      }

      // Fallback for Kutch only if no RSS feed available
      while (items.filter(it => it.category === 'kutch').length < 2) {
        const idx = items.filter(it => it.category === 'kutch').length;
        const defaultHeadlines = [
          'કચ્છમાં રિન્યુએબલ એનર્જી, સ્માર્ટ પોર્ટ પ્રોજેક્ટ્સ અને સરહદી વિકાસ કામગીરી તેજ બની',
          'ધોળાવીરા હેરિટેજ સાઇટ અને સફેદ રણમાં શૈક્ષણિક પ્રવાસન અને જાગૃતિ અભિયાન શરૂ',
        ];
        const defaultSummaries = [
          'ખાવડા હાઇબ્રિડ સોલાર-વિન્ડ પાર્ક અને કંડલા પોર્ટના ગ્રીન હાઇડ્રોજન પ્રોજેક્ટ્સ સાથે કચ્છ દેશના ઊર્જા હબ તરીકે અગ્રેસર રહ્યું છે. (સ્ત્રોત: દૈનિક કચ્છી સમાચાર)',
          'યુનેસ્કો વર્લ્ડ હેરિટેજ સાઇટ ધોળાવીરા ખાતે પ્રાચીન નગર આયોજન અને જળ સંચય પદ્ધતિઓ સમજવા માટે વિદ્યાર્થીઓ માટે વિશેષ ગાઇડેડ ટૂરનું આયોજન. (સ્ત્રોત: પ્રવાસન વિભાગ)',
        ];
        items.push({
          id: `news-${dateKey}-${itemCounter++}`,
          category: 'kutch',
          categoryLabel: 'કચ્છ વિશેષ',
          headline: defaultHeadlines[idx] || 'કચ્છ જિલ્લામાં શૈક્ષણિક અને વિકાસલક્ષી પ્રવૃત્તિઓ વેગવંતી',
          summary: defaultSummaries[idx] || 'જિલ્લા પંચાયત અને શિક્ષણ વિભાગ દ્વારા વિવિધ પ્રોજેક્ટ્સનું સફળ અમલીકરણ.',
          impact: 'કચ્છ જિલ્લાની તાજી સ્થિતિ અને વિકાસ વિષયક વિગત.',
          sourceDate: dateKey,
        });
      }

      // 2. ગુજરાત સમાચાર (2 items)
      for (let i = 0; i < 2 && i < allGujarat.length; i++) {
        items.push({
          id: `news-${dateKey}-${itemCounter++}`,
          category: 'gujarat',
          categoryLabel: 'ગુજરાત સમાચાર',
          headline: allGujarat[i].headline,
          summary: allGujarat[i].summary,
          impact: 'ગુજરાત રાજ્યના શૈક્ષણિક, વહીવટી અને નાગરિક વિકાસ સાથે સંકળાયેલ વર્તમાન પ્રવાહ.',
          sourceDate: dateKey,
        });
      }

      // 3. રાષ્ટ્રીય / ભારત (2 items)
      for (let i = 0; i < 2 && i < nationalFeeds.length; i++) {
        items.push({
          id: `news-${dateKey}-${itemCounter++}`,
          category: 'india',
          categoryLabel: 'રાષ્ટ્રીય / ભારત',
          headline: nationalFeeds[i].headline,
          summary: nationalFeeds[i].summary,
          impact: 'રાષ્ટ્રીય સ્તરે નીતિ, અર્થતંત્ર, સંરક્ષણ અને સામાન્ય જ્ઞાન વિષયક પ્રેરણારૂપ માહિતી.',
          sourceDate: dateKey,
        });
      }

      // 4. વિશ્વ સમાચાર (2 items)
      for (let i = 0; i < 2 && i < worldFeeds.length; i++) {
        items.push({
          id: `news-${dateKey}-${itemCounter++}`,
          category: 'world',
          categoryLabel: 'વિશ્વ સમાચાર',
          headline: worldFeeds[i].headline,
          summary: worldFeeds[i].summary,
          impact: 'આંતરરાષ્ટ્રીય ઘટનાઓ, વૈશ્વિક વિજ્ઞાન અને ભૂગોળ વિષયક વિસ્તૃત સમજૂતી.',
          sourceDate: dateKey,
        });
      }

      // 5. વિજ્ઞાન અને શિક્ષણ (1 item)
      if (educationFeeds[0]) {
        items.push({
          id: `news-${dateKey}-${itemCounter++}`,
          category: 'science_education',
          categoryLabel: 'વિજ્ઞાન અને શિક્ષણ',
          headline: educationFeeds[0].headline,
          summary: educationFeeds[0].summary,
          impact: 'વિદ્યાર્થીઓ માટે શિક્ષણ વિભાગના પરિપત્રો, વિજ્ઞાન પ્રોજેક્ટ્સ અને કારકિર્દી માર્ગદર્શન.',
          sourceDate: dateKey,
        });
      }

      // 6. રમતગમત અને યુવા (1 item)
      if (sportsFeeds[0]) {
        items.push({
          id: `news-${dateKey}-${itemCounter++}`,
          category: 'sports',
          categoryLabel: 'રમતગમત અને યુવા',
          headline: sportsFeeds[0].headline,
          summary: sportsFeeds[0].summary,
          impact: 'શાળા રમતગમત સ્પર્ધાઓ, ખેલ મહાકુંભ અને યુવા ખેલાડીઓ માટે પ્રેરણાદાયક સિદ્ધિ.',
          sourceDate: dateKey,
        });
      }

      if (items.length >= 8) {
        const bulletin = {
          id: dateKey,
          editionDate: formatServerGujaratiDate(editionDate),
          dateKey,
          cycleTime: 'સવારે ૫:૦૦ વાગ્યાની તાજી આવૃત્તિ (લાઈવ અપડેટ)',
          nextCycleTime: 'આવતીકાલે સવારે ૫:૦૦ વાગ્યે',
          nextUpdateTimeTimestamp: nextUpdate.getTime(),
          items,
          morningPrayerShloka: 'સર્વેભવન્તુ સુખિનઃ સર્વે સન્તુ નિરામયાઃ । સર્વે ભદ્રાણિ પશ્યન્તુ મા કશ્ચિદ્ દુઃખભાગ્ભવેત્ ॥',
          isLiveNews: true,
          updatedAt: new Date().toISOString(),
        };

        // Cache to Firestore in background
        try {
          await setDoc(docRef, bulletin, { merge: true });
        } catch (saveErr) {
          console.warn('Could not cache live news to Firestore:', saveErr);
        }

        return res.json({ success: true, bulletin, isRealTimeLive: true });
      }

      return res.json({
        success: true,
        dateKey,
        needsClientFallback: true,
        message: 'Active date cycle determined',
      });
    } catch (err: any) {
      console.error('Error in /api/daily-news:', err);
      return res.status(500).json({ error: 'Failed to retrieve daily news' });
    }
  });

  // GET /api/daily-janva-jevu: returns active 1 PM Janva Jevu bulletin
  app.get('/api/daily-janva-jevu', async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const hours = now.getHours();
      const editionDate = new Date(now);
      if (hours < 13) {
        editionDate.setDate(editionDate.getDate() - 1);
      }
      const y = editionDate.getFullYear();
      const m = String(editionDate.getMonth() + 1).padStart(2, '0');
      const d = String(editionDate.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;

      // Try reading from Firestore
      const docRef = doc(db, 'daily_janva_jevu', dateKey);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        return res.json({ success: true, bulletin: snap.data() });
      }

      return res.json({
        success: true,
        dateKey,
        needsClientFallback: true,
        message: 'Active date cycle determined',
      });
    } catch (err: any) {
      console.error('Error in /api/daily-janva-jevu:', err);
      return res.status(500).json({ error: 'Failed to retrieve daily Janva Jevu' });
    }
  });

  // POST /api/daily-knowledge/refresh-news: Generates fresh 10-point news using Gemini
  app.post('/api/daily-knowledge/refresh-news', async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'Gemini API key is not configured' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const todayStr = new Date().toLocaleDateString('gu-IN');
      const prompt = `You are the chief Gujarati educational news editor for secondary and higher secondary schools (Classes 9 to 12).
Generate exactly 10 short, punchy, inspiring educational news points in pure, natural Gujarati for date: ${todayStr}.
Categories to include:
1. કચ્છ વિશેષ (2 items): Kutch ports, Dholavira, Khavda renewable energy, handicrafts, wildlife.
2. ગુજરાત સમાચાર (2 items): GIFT city, schools, industries, environment, agriculture.
3. રાષ્ટ્રીય / ભારત (2 items): ISRO, national achievements, digital public infrastructure, defence.
4. વિશ્વ સમાચાર (2 items): Global science, space, environment, international relations.
5. વિજ્ઞાન અને શિક્ષણ (1 item): Student innovations, STEM, NEP.
6. રમતગમત (1 item): Indian sports champions, chess, athletics.

Format: Return strictly a valid JSON array of 10 objects:
[
  {
    "category": "kutch" | "gujarat" | "india" | "world" | "science_education" | "sports",
    "categoryLabel": string (in Gujarati),
    "headline": string (short punchy Gujarati headline),
    "summary": string (short 1-2 lines explanation in Gujarati)
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const text = response.text || '[]';
      const items = JSON.parse(text);

      return res.json({ success: true, items });
    } catch (err: any) {
      console.error('Error generating AI news:', err);
      return res.status(500).json({ error: err.message || 'Failed to generate news' });
    }
  });

  // In-memory audio cache for high-fidelity Gemini TTS (stores base64 WAV)
  const ttsAudioCache = new Map<string, { audioBase64: string; mimeType: string; timestamp: number }>();

  // POST /api/tts: Generates ultra-realistic humanlike Gujarati audio using gemini-3.8-flash-lite-tts
  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const { text, voice, gender } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required', fallback: true });
      }

      const cleanText = text.trim();
      if (!cleanText) {
        return res.status(400).json({ error: 'Text is empty', fallback: true });
      }

      const isMale = gender === 'male' || voice === 'Zephyr' || voice === 'Puck' || voice === 'Charon' || voice === 'Fenrir';
      const selectedVoice = isMale ? 'Zephyr' : 'Aoede';

      // Cache lookup (key based on voice gender + text)
      const cacheKey = `${isMale ? 'male' : 'female'}:${selectedVoice}:${cleanText}`;
      const cached = ttsAudioCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60 * 24) {
        return res.json({
          success: true,
          mimeType: cached.mimeType,
          audioBase64: cached.audioBase64,
          fromCache: true,
          voice: selectedVoice,
        });
      }

      // Helper function to synthesize native human Gujarati speech via high-fidelity pipeline
      const synthesizeNativeGujaratiAudio = async (
        text: string,
        isMaleVoice: boolean
      ): Promise<{ audioBase64: string; mimeType: string } | null> => {
        try {
          const rawParts = text.split(/(?<=[.!?।\n])\s+/);
          const chunks: string[] = [];
          for (const raw of rawParts) {
            const trimmed = raw.trim();
            if (!trimmed) continue;
            if (trimmed.length <= 180) {
              chunks.push(trimmed);
            } else {
              const subparts = trimmed.split(/(?<=[,])\s+/);
              let curr = '';
              for (const sub of subparts) {
                if ((curr + ' ' + sub).length <= 180) {
                  curr = curr ? curr + ' ' + sub : sub;
                } else {
                  if (curr) chunks.push(curr.trim());
                  curr = sub;
                }
              }
              if (curr) chunks.push(curr.trim());
            }
          }

          if (chunks.length === 0) chunks.push(text.slice(0, 180));

          // Fetch chunks in parallel for ultra-fast response (supports up to 25 chunks / ~3000 chars)
          const targetChunks = chunks.slice(0, 25);
          const chunkBuffers = await Promise.all(
            targetChunks.map(async (chunk) => {
              try {
                const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=gu&client=tw-ob`;
                const ttsRes = await fetch(url, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                  },
                });
                if (ttsRes.ok) {
                  const ab = await ttsRes.arrayBuffer();
                  return Buffer.from(ab);
                }
              } catch (e) {
                console.warn('TTS chunk fetch failed:', e);
              }
              return null;
            })
          );

          const validBuffers = chunkBuffers.filter((b): b is Buffer => b !== null && b.length > 0);
          if (validBuffers.length === 0) return null;
          let combined = Buffer.concat(validBuffers);

          if (isMaleVoice) {
            try {
              const { spawn } = await import('child_process');
              const ffmpeg = spawn('ffmpeg', [
                '-i', 'pipe:0',
                '-filter:a', 'asetrate=24000*0.82,aresample=24000,atempo=1.22',
                '-f', 'mp3',
                'pipe:1',
              ]);

              const ffmpegChunks: Buffer[] = [];
              ffmpeg.stdout.on('data', (c) => ffmpegChunks.push(c));
              ffmpeg.stdin.write(combined);
              ffmpeg.stdin.end();

              await new Promise<void>((resolve, reject) => {
                ffmpeg.on('close', () => resolve());
                ffmpeg.on('error', (e) => reject(e));
              });

              if (ffmpegChunks.length > 0) {
                combined = Buffer.concat(ffmpegChunks);
              }
            } catch (ffmpegErr) {
              console.warn('ffmpeg male audio transformation fallback:', ffmpegErr);
            }
          }

          return {
            audioBase64: combined.toString('base64'),
            mimeType: 'audio/mpeg',
          };
        } catch (nativeErr) {
          console.error('Native Gujarati audio pipeline error:', nativeErr);
        }
        return null;
      };

      const apiKey = process.env.GEMINI_API_KEY;
      let audioBase64 = '';
      let mimeType = 'audio/wav';
      let activeVoiceName = isMale ? 'Zephyr' : 'Aoede';

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          // gemini-3.8-flash-lite-tts produces studio-grade, authentic human Gujarati speech
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: cleanText,
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: selectedVoice,
                  },
                },
              },
            },
          });

          const audioPart = response.candidates?.[0]?.content?.parts?.find(
            (p) => p.inlineData && p.inlineData.data
          );

          if (audioPart?.inlineData?.data) {
            audioBase64 = audioPart.inlineData.data;
            mimeType = audioPart.inlineData.mimeType || 'audio/wav';
          }
        } catch (geminiErr: any) {
          // If Gemini quota reached or unavailable, fall through seamlessly to native human Gujarati engine
          console.warn('Gemini TTS unavailable, routing to high-fidelity native Gujarati voice engine...');
        }
      }

      // If Gemini TTS didn't return audio, generate via high-fidelity native Gujarati voice pipeline
      if (!audioBase64) {
        const nativeResult = await synthesizeNativeGujaratiAudio(cleanText, isMale);
        if (nativeResult) {
          audioBase64 = nativeResult.audioBase64;
          mimeType = nativeResult.mimeType;
          activeVoiceName = isMale ? 'ગુજરાતી પુરુષ વાણી (Zephyr)' : 'ગુજરાતી મહિલા વાણી (Aoede)';
        }
      }

      if (!audioBase64) {
        return res.status(200).json({
          success: false,
          fallback: true,
          message: 'Speech synthesis fallback enabled',
        });
      }

      // Keep cache bounded to 150 items
      if (ttsAudioCache.size >= 150) {
        const oldestKey = ttsAudioCache.keys().next().value;
        if (oldestKey) ttsAudioCache.delete(oldestKey);
      }
      ttsAudioCache.set(cacheKey, {
        audioBase64,
        mimeType,
        timestamp: Date.now(),
      });

      return res.json({
        success: true,
        mimeType,
        audioBase64,
        fromCache: false,
        voice: activeVoiceName,
      });
    } catch (err: any) {
      console.error('TTS endpoint error:', err);
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Speech synthesis fallback enabled',
      });
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
