import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, User, signOut as fbSignOut } from 'firebase/auth';
import {
  auth,
  db,
  projectId,
  FIRESTORE_DATABASE_ID,
} from '../firebase/config';
import { createAppNotification } from './notificationService';
import {
  School,
  SchoolStatus,
  AdminRecord,
  PasswordResetRequest,
  SchoolStorageData,
  SchoolsStorageSummary,
  Student,
  Staff,
} from '../types';
import { autoResizeBase64 } from '../utils/imageUtils';

export interface DatabaseCheckDiagnostic {
  databaseId: string;
  docPath: string;
  exists: boolean;
  roleValue?: string;
  isRoleAdmin: boolean;
  fieldKeys?: string[];
  error?: string | null;
}

export interface AdminDiagnosticReport {
  timestamp: string;
  uid: string;
  projectId: string;
  activeDatabaseId: string;
  checks: DatabaseCheckDiagnostic[];
  authorized: boolean;
}

let latestAdminDiagnostic: AdminDiagnosticReport | null = null;

export function getLatestAdminDiagnostic(): AdminDiagnosticReport | null {
  return latestAdminDiagnostic;
}

/**
 * Check if the given UID exists in /admins/{uid} and has role === 'admin'
 * strictly inside the AI Studio named database: ai-studio-f31f93ae-44ec-4b38-97ab-6ff71ff82da1.
 */
export async function checkIsAdmin(uid: string): Promise<boolean> {
  if (!uid) return false;

  const docPath = `admins/${uid}`;
  let exists = false;
  let roleValue: string | undefined = undefined;
  let isRoleAdmin = false;
  let fieldKeys: string[] = [];
  let errorMsg: string | null = null;

  try {
    const docRef = doc(db, 'admins', uid);
    let snap = await getDoc(docRef);

    // Verify directly with Firestore server if local snapshot returns non-existent
    if (!snap.exists()) {
      try {
        snap = await getDocFromServer(docRef);
      } catch (serverErr: any) {
        if (!errorMsg && serverErr?.message) {
          errorMsg = serverErr.message;
        }
      }
    }

    if (snap.exists()) {
      exists = true;
      const data = snap.data();
      fieldKeys = Object.keys(data || {});
      const rawRole = data?.role;
      roleValue = typeof rawRole === 'string' ? rawRole : String(rawRole ?? '');
      const roleNormalized = roleValue.trim().toLowerCase();
      isRoleAdmin = roleNormalized === 'admin' || data?.isAdmin === true;
    }
  } catch (err: any) {
    errorMsg = err?.message || String(err);
    console.warn(`[checkIsAdmin] Error checking /admins/${uid} in named database "${FIRESTORE_DATABASE_ID}":`, errorMsg);
  }

  const checkInfo: DatabaseCheckDiagnostic = {
    databaseId: FIRESTORE_DATABASE_ID,
    docPath,
    exists,
    roleValue,
    isRoleAdmin,
    fieldKeys,
    error: errorMsg,
  };

  latestAdminDiagnostic = {
    timestamp: new Date().toISOString(),
    uid,
    projectId,
    activeDatabaseId: FIRESTORE_DATABASE_ID,
    checks: [checkInfo],
    authorized: isRoleAdmin,
  };

  if (typeof window !== 'undefined') {
    (window as any).__ADMIN_DIAGNOSTIC__ = latestAdminDiagnostic;
  }

  return isRoleAdmin;
}

/**
 * Converts an Admin Mobile number or ID to the corresponding Firebase Auth email identifier.
 * Example:
 *   Mobile "9876543210" -> "admin_9876543210@gujarat-schools.internal"
 *   ID "superadmin"     -> "admin_superadmin@gujarat-schools.internal"
 * If the input already contains '@' (e.g. an email address), it is preserved.
 */
export function adminIdentifierToAuthEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  let clean = trimmed.replace(/[^a-z0-9_]/g, '');
  if (clean.startsWith('admin_')) {
    clean = clean.substring('admin_'.length);
  }
  return `admin_${clean}@gujarat-schools.internal`;
}

/**
 * Admin Login:
 * Authenticates using Firebase Auth by converting Admin Mobile / ID into the
 * internal Firebase Auth identifier, then verifies /admins/{uid} has role == "admin".
 * If the user is authenticated in Firebase Auth but not in /admins, immediately signs out and throws an error.
 */
export async function loginAdmin(
  identifier: string,
  pass: string
): Promise<{ user: User; adminRecord: AdminRecord }> {
  const cleanId = identifier.trim();
  if (!cleanId || !pass) {
    throw new Error('Please enter both Admin Mobile / ID and Password.');
  }

  const primaryEmail = adminIdentifierToAuthEmail(cleanId);
  let user: User;

  try {
    const credential = await signInWithEmailAndPassword(auth, primaryEmail, pass);
    user = credential.user;
  } catch (err: any) {
    // If not found and identifier didn't have '@', try alternative fallback without 'admin_' prefix just in case
    if (
      (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') &&
      !cleanId.includes('@')
    ) {
      const sanitized = cleanId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const altEmail = `${sanitized}@gujarat-schools.internal`;
      if (altEmail !== primaryEmail) {
        try {
          const fallbackCred = await signInWithEmailAndPassword(auth, altEmail, pass);
          user = fallbackCred.user;
        } catch {
          throw err;
        }
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  // Authorization check: Must exist in /admins/{uid} with role: "admin"
  const isAdminAuthorized = await checkIsAdmin(user.uid);
  if (!isAdminAuthorized) {
    await fbSignOut(auth);
    throw new Error(
      'Access Denied: This account is authenticated in Firebase Auth but not registered in the /admins database. Please ensure your UID exists in /admins with role: "admin".'
    );
  }

  return {
    user,
    adminRecord: {
      id: user.uid,
      role: 'admin',
    },
  };
}

/**
 * Normalize school status:
 * Legacy schools created before the status field existed are treated as 'approved'
 * so legitimate existing schools are never locked out.
 */
export function normalizeSchoolStatus(school: School): School {
  return {
    ...school,
    status: school.status || 'approved',
  };
}

/**
 * Fetch all registered schools (Admin Only)
 */
export async function getAllSchools(): Promise<School[]> {
  const schoolsCol = collection(db, 'schools');
  const snapshot = await getDocs(schoolsCol);
  const list: School[] = snapshot.docs.map((d) => {
    const data = d.data() as School;
    return normalizeSchoolStatus({
      ...data,
      id: d.id,
      ownerUid: data.ownerUid || d.id,
    });
  });

  // Sort by registration date descending
  list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return list;
}

/**
 * Real-time subscription to all registered schools (Admin Only)
 */
export function subscribeToSchools(callback: (schools: School[]) => void): () => void {
  const schoolsCol = collection(db, 'schools');
  return onSnapshot(
    schoolsCol,
    (snapshot) => {
      const list: School[] = snapshot.docs.map((d) => {
        const data = d.data() as School;
        return normalizeSchoolStatus({
          ...data,
          id: d.id,
          ownerUid: data.ownerUid || d.id,
        });
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(list);
    },
    (err) => {
      console.error('Error in subscribeToSchools snapshot:', err);
    }
  );
}

/**
 * Update a school's status (Admin Only: 'approved' | 'rejected' | 'inactive' | 'pending')
 */
export async function updateSchoolStatus(
  schoolId: string,
  newStatus: SchoolStatus
): Promise<void> {
  if (!schoolId) throw new Error('School ID is required.');
  const schoolDocRef = doc(db, 'schools', schoolId);
  await updateDoc(schoolDocRef, {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Submit a Password Reset Request (Called by school user when password is forgotten)
 */
export async function submitPasswordResetRequest(params: {
  diseCode: string;
  schoolName?: string;
  contactNumber?: string;
}): Promise<string> {
  const colRef = collection(db, 'password_reset_requests');
  const docRef = await addDoc(colRef, {
    diseCode: params.diseCode.trim(),
    schoolName: (params.schoolName || '').trim(),
    contactNumber: (params.contactNumber || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  // Notify system administrators about the password reset request
  try {
    createAppNotification({
      targetType: 'admin',
      title: '🔑 પાસવર્ડ રીસેટ વિનંતી',
      body: `${params.schoolName || 'શાળા'} (DISE: ${params.diseCode}) તરફથી પાસવર્ડ રીસેટ કરવાની નવી વિનંતી આવી છે.`,
      category: 'password_reset',
      metadata: { requestId: docRef.id, diseCode: params.diseCode },
    }).catch(() => {});
  } catch (e) {}

  return docRef.id;
}

/**
 * Real-time subscription to Password Reset Requests (Admin Only)
 */
export function subscribeToPasswordResetRequests(
  callback: (requests: PasswordResetRequest[]) => void
): () => void {
  const colRef = collection(db, 'password_reset_requests');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PasswordResetRequest[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PasswordResetRequest, 'id'>),
      }));
      list.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      callback(list);
    },
    (err) => {
      console.error('Error in subscribeToPasswordResetRequests:', err);
    }
  );
}

/**
 * Update the status of a Password Reset Request (Admin Only)
 */
export async function updatePasswordResetRequestStatus(
  requestId: string,
  status: 'resolved' | 'rejected',
  adminNotes?: string
): Promise<void> {
  const docRef = doc(db, 'password_reset_requests', requestId);
  await updateDoc(docRef, {
    status,
    resolvedAt: new Date().toISOString(),
    ...(adminNotes ? { adminNotes } : {}),
  });
}

/**
 * Admin: Generate & Set Temporary Password for a School.
 * Also resolves any open password reset requests for this school.
 */
export async function setTemporaryPasswordForSchool(
  schoolId: string,
  tempPassword: string,
  diseCode?: string
): Promise<void> {
  if (!schoolId || !tempPassword) {
    throw new Error('School ID and Temporary Password are required.');
  }

  // Update directly in Firestore
  try {
    const schoolDocRef = doc(db, 'schools', schoolId);
    await updateDoc(schoolDocRef, {
      temporaryPassword: tempPassword.trim(),
      mustResetPassword: true,
      temporaryPasswordCreatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('Direct Firestore update warning, calling backend proxy:', err);
  }

  // Call backend API for reliable updates and automatic reset request resolution
  try {
    const res = await fetch('/api/admin/set-temp-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId,
        tempPassword: tempPassword.trim(),
        diseCode: diseCode?.trim(),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to set temporary password');
    }
  } catch (backendErr: any) {
    console.warn('Backend API note:', backendErr);
  }
}

/**
 * Admin: Delete a School and ALL associated data (students, marks, staff, exams, attempts, certificates)
 * completely and irreversibly from Firestore.
 */
export async function deleteSchoolCompletely(
  schoolId: string,
  diseCode?: string
): Promise<{ success: boolean; message: string }> {
  if (!schoolId) throw new Error('School ID is required.');

  // 1. Authenticated deletion from client where auth.currentUser has verified Admin privileges
  const simpleSubcollections = ['students', 'marks', 'staff', 'exam_attempts', 'subjects', 'certificates', 'reports'];

  // Delete simple subcollections
  for (const subcol of simpleSubcollections) {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, subcol));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn(`Note: cleanup for subcollection ${subcol}:`, e);
    }
  }

  // Delete online_exams and their questions subcollections
  try {
    const examsSnap = await getDocs(collection(db, 'schools', schoolId, 'online_exams'));
    for (const examDoc of examsSnap.docs) {
      try {
        const qSnap = await getDocs(collection(db, 'schools', schoolId, 'online_exams', examDoc.id, 'questions'));
        if (!qSnap.empty) {
          const qBatch = writeBatch(db);
          qSnap.docs.forEach((qDoc) => qBatch.delete(qDoc.ref));
          await qBatch.commit();
        }
      } catch (err) {
        console.warn('Note: cleanup for questions:', err);
      }
      try {
        await deleteDoc(examDoc.ref);
      } catch {}
    }
  } catch (e) {
    console.warn('Note: cleanup for online_exams:', e);
  }

  // Delete password reset requests associated with this school DISE code
  if (diseCode) {
    try {
      const prQuery = query(collection(db, 'password_reset_requests'), where('diseCode', '==', diseCode.trim()));
      const prSnap = await getDocs(prQuery);
      if (!prSnap.empty) {
        const prBatch = writeBatch(db);
        prSnap.docs.forEach((d) => prBatch.delete(d.ref));
        await prBatch.commit();
      }
    } catch (e) {
      console.warn('Note: cleanup for password_reset_requests:', e);
    }
  }

  // Finally delete the school root document
  const schoolRef = doc(db, 'schools', schoolId);
  await deleteDoc(schoolRef);

  // Notify backend route (graceful fallback)
  try {
    await fetch('/api/admin/delete-school', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, diseCode }),
    });
  } catch {
    // Client-side delete succeeded, backend notification is secondary
  }

  return {
    success: true,
    message: 'શાળા અને તેનો તમામ ડેટા સંપૂર્ણપણે ડિલીટ થઈ ગયો છે.',
  };
}

/**
 * Fetch server storage metrics for all schools.
 * Calculates exact bytes & document counts across student rosters, marks, exams, staff, and certificates.
 */
export async function getSchoolsStorageMetrics(
  forceRefresh = false
): Promise<{
  schools: SchoolStorageData[];
  summary: SchoolsStorageSummary;
  fromCache?: boolean;
}> {
  try {
    const url = `/api/admin/schools-storage${forceRefresh ? '?force=true' : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to load storage metrics.');
    }
    return {
      schools: data.schools || [],
      summary: data.summary,
      fromCache: data.fromCache,
    };
  } catch (err: any) {
    console.warn('Falling back or failed to fetch /api/admin/schools-storage:', err);
    throw new Error(err.message || 'સર્વર સ્ટોરેજ વિગતો મેળવવામાં સમસ્યા આવી.');
  }
}

export interface PhotoOptimizationResult {
  success: boolean;
  totalChecked: number;
  totalOptimized: number;
  totalBytesBefore: number;
  totalBytesAfter: number;
  savedBytes: number;
  formattedSaved: string;
  items: Array<{ type: string; schoolName: string; name: string; savedKb: string }>;
  message: string;
}

/**
 * Automatically resize and compress all stored photos (students, staff, school logos)
 * directly in Firestore, reducing database storage size without quality degradation.
 */
export async function optimizeAllStoredPhotos(
  targetSchoolId?: string,
  onProgress?: (message: string, percent: number) => void
): Promise<PhotoOptimizationResult> {
  let schoolsList: Array<{ id: string; schoolName: string; logoUrl?: string }> = [];

  onProgress?.('શાળાઓની માહિતી ચકાસી રહ્યા છીએ...', 5);
  if (targetSchoolId) {
    const sDoc = await getDoc(doc(db, 'schools', targetSchoolId));
    if (sDoc.exists()) {
      const d = sDoc.data() as School;
      schoolsList.push({ id: sDoc.id, schoolName: d.schoolName || sDoc.id, logoUrl: d.logoUrl });
    }
  } else {
    const sSnap = await getDocs(collection(db, 'schools'));
    schoolsList = sSnap.docs.map((d) => {
      const data = d.data() as School;
      return { id: d.id, schoolName: data.schoolName || d.id, logoUrl: data.logoUrl };
    });
  }

  let totalChecked = 0;
  let totalOptimized = 0;
  let totalBytesBefore = 0;
  let totalBytesAfter = 0;
  const items: Array<{ type: string; schoolName: string; name: string; savedKb: string }> = [];

  const totalSchools = schoolsList.length;

  for (let i = 0; i < totalSchools; i++) {
    const s = schoolsList[i];
    const pct = Math.round(10 + (i / totalSchools) * 85);
    onProgress?.(`શાળા સ્કેન થઈ રહી છે (${i + 1}/${totalSchools}): ${s.schoolName}...`, pct);

    // 1. School Logo
    if (s.logoUrl && s.logoUrl.startsWith('data:image/') && s.logoUrl.length > 25000) {
      totalChecked++;
      const bytesBefore = s.logoUrl.length;
      const optimized = await autoResizeBase64(s.logoUrl, 260, 260, 0.82);
      const bytesAfter = optimized.length;
      totalBytesBefore += bytesBefore;
      totalBytesAfter += bytesAfter;
      if (bytesAfter < bytesBefore && (bytesBefore - bytesAfter) > 2000) {
        await updateDoc(doc(db, 'schools', s.id), {
          logoUrl: optimized,
          updatedAt: new Date().toISOString(),
        });
        totalOptimized++;
        const savedKb = `${((bytesBefore - bytesAfter) / 1024).toFixed(1)} KB`;
        items.push({ type: 'School Logo', schoolName: s.schoolName, name: 'શાળાનો લોગો', savedKb });
      }
    }

    // 2. Students Photos
    try {
      const stuSnap = await getDocs(collection(db, 'schools', s.id, 'students'));
      for (const stuDoc of stuSnap.docs) {
        const st = stuDoc.data() as Student;
        if (st.photoUrl && st.photoUrl.startsWith('data:image/') && st.photoUrl.length > 25000) {
          totalChecked++;
          const bytesBefore = st.photoUrl.length;
          const optimized = await autoResizeBase64(st.photoUrl, 260, 340, 0.80);
          const bytesAfter = optimized.length;
          totalBytesBefore += bytesBefore;
          totalBytesAfter += bytesAfter;
          if (bytesAfter < bytesBefore && (bytesBefore - bytesAfter) > 2000) {
            await updateDoc(stuDoc.ref, {
              photoUrl: optimized,
              updatedAt: new Date().toISOString(),
            });
            totalOptimized++;
            const savedKb = `${((bytesBefore - bytesAfter) / 1024).toFixed(1)} KB`;
            items.push({ type: 'Student Photo', schoolName: s.schoolName, name: st.studentName || stuDoc.id, savedKb });
          }
        }
      }
    } catch (e) {
      console.warn('Could not scan students for school:', s.id, e);
    }

    // 3. Staff Photos
    try {
      const staffSnap = await getDocs(collection(db, 'schools', s.id, 'staff'));
      for (const staffDoc of staffSnap.docs) {
        const sf = staffDoc.data() as Staff;
        if (sf.photoUrl && sf.photoUrl.startsWith('data:image/') && sf.photoUrl.length > 25000) {
          totalChecked++;
          const bytesBefore = sf.photoUrl.length;
          const optimized = await autoResizeBase64(sf.photoUrl, 260, 340, 0.80);
          const bytesAfter = optimized.length;
          totalBytesBefore += bytesBefore;
          totalBytesAfter += bytesAfter;
          if (bytesAfter < bytesBefore && (bytesBefore - bytesAfter) > 2000) {
            await updateDoc(staffDoc.ref, {
              photoUrl: optimized,
              updatedAt: new Date().toISOString(),
            });
            totalOptimized++;
            const savedKb = `${((bytesBefore - bytesAfter) / 1024).toFixed(1)} KB`;
            items.push({ type: 'Staff Photo', schoolName: s.schoolName, name: sf.fullName || staffDoc.id, savedKb });
          }
        }
      }
    } catch (e) {
      console.warn('Could not scan staff for school:', s.id, e);
    }
  }

  onProgress?.('ઓપ્ટિમાઇઝેશન પૂર્ણ!', 100);

  const savedBytes = Math.max(0, totalBytesBefore - totalBytesAfter);
  const formattedSaved =
    savedBytes > 1024 * 1024
      ? `${(savedBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(savedBytes / 1024).toFixed(1)} KB`;

  return {
    success: true,
    totalChecked,
    totalOptimized,
    totalBytesBefore,
    totalBytesAfter,
    savedBytes,
    formattedSaved,
    items,
    message: totalOptimized > 0
      ? `${totalOptimized} ફોટા સફળતાપૂર્વક ઓટો-રીસાઇઝ કરી સાચવવામાં આવ્યા અને ${formattedSaved} સર્વર સ્ટોરેજની બચત થઈ.`
      : 'બધા ફોટા પહેલેથી જ ઓપ્ટિમાઇઝ્ડ અને સાઇઝમાં યોગ્ય છે.',
  };
}

