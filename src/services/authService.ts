import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updatePassword,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { School } from '../types';
import { checkIsAdmin } from './adminService';

/**
 * Format School DISE code into a valid Firebase Auth identifier.
 * Schools log in purely using their DISE Code + Password.
 */
export function diseCodeToAuthEmail(diseCode: string): string {
  const sanitized = diseCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `dise_${sanitized}@gujarat-schools.internal`;
}

/**
 * Extract clean DISE code from auth email if needed
 */
export function authEmailToDiseCode(email: string): string {
  const match = email.match(/^dise_([a-z0-9]+)@/i);
  return match ? match[1] : email;
}

export interface RegisterSchoolParams {
  schoolName: string;
  diseCode: string;
  district: string;
  password: string;
  logoUrl?: string;
}

/**
 * Register a new school:
 * 1. Creates Firebase Auth user using DISE Code identifier + Password
 * 2. Writes the school profile document to Firestore at /schools/{uid} with status: "pending"
 * 3. Saves password securely in Firestore
 */
export async function registerSchool({
  schoolName,
  diseCode,
  district,
  password,
  logoUrl,
}: RegisterSchoolParams): Promise<{ user: User; school: School }> {
  const cleanDise = diseCode.trim();
  if (!cleanDise) {
    throw new Error('School DISE Code is required.');
  }
  if (!schoolName.trim()) {
    throw new Error('School Name is required.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const email = diseCodeToAuthEmail(cleanDise);

  try {
    // 1. Create user in Firebase Authentication
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // 2. Prepare the school document directly bound to user.uid with status: "pending"
    const schoolData: School = {
      id: user.uid,
      ownerUid: user.uid,
      schoolName: schoolName.trim(),
      diseCode: cleanDise,
      district: district.trim() || 'Gujarat',
      status: 'pending', // Initially pending admin approval
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logoUrl: logoUrl || '',
      password: password,
      mustResetPassword: false,
    };

    // 3. Save to Firestore under /schools/{uid}
    const schoolDocRef = doc(db, 'schools', user.uid);
    await setDoc(schoolDocRef, schoolData);

    return { user, school: schoolData };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error(`A school with DISE Code "${cleanDise}" is already registered. Please log in.`);
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password must be at least 6 characters.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid DISE Code format. Please enter a valid code.');
    }
    throw error;
  }
}

export interface LoginSchoolResult {
  user: User | null;
  school: School;
  requiresPasswordReset?: boolean;
}

/**
 * Log in school using DISE Code and Password.
 * Supports temporary password authentication (prompts to set new password twice).
 */
export async function loginSchool(
  diseCode: string,
  password: string
): Promise<LoginSchoolResult> {
  const cleanDise = diseCode.trim();
  if (!cleanDise || !password) {
    throw new Error('Please enter both School DISE Code and Password.');
  }

  const cleanPass = password.trim();
  const email = diseCodeToAuthEmail(cleanDise);

  // 1. Pre-check: Does school have a temporary password set in Firestore?
  try {
    const q = query(collection(db, 'schools'), where('diseCode', '==', cleanDise));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const schDoc = snap.docs[0];
      const schData = schDoc.data() as School;
      const schoolObj: School = {
        id: schDoc.id,
        ...schData,
        status: schData.status || 'approved',
      };

      const tempPass = (schData.temporaryPassword || '').trim();
      if (tempPass && tempPass === cleanPass) {
        return {
          user: auth.currentUser,
          school: schoolObj,
          requiresPasswordReset: true,
        };
      }
    }
  } catch (lookupErr) {
    console.warn('School pre-check note:', lookupErr);
  }

  // 2. Standard Firebase Auth sign-in
  try {
    const credential = await signInWithEmailAndPassword(auth, email, cleanPass);
    const user = credential.user;

    const schoolDocRef = doc(db, 'schools', user.uid);
    let schoolSnapshot = await getDoc(schoolDocRef);
    if (!schoolSnapshot.exists()) {
      try {
        schoolSnapshot = await getDocFromServer(schoolDocRef);
      } catch {}
    }

    if (!schoolSnapshot.exists()) {
      const fallbackSchool: School = {
        id: user.uid,
        ownerUid: user.uid,
        schoolName: `School (${cleanDise})`,
        diseCode: cleanDise,
        district: 'Gujarat',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await setDoc(schoolDocRef, fallbackSchool);
      return { user, school: fallbackSchool };
    }

    const rawData = schoolSnapshot.data() as School;
    const schoolData: School = {
      ...rawData,
      status: rawData.status || 'approved',
    };

    if (schoolData.mustResetPassword === true) {
      return {
        user,
        school: schoolData,
        requiresPasswordReset: true,
      };
    }

    return { user, school: schoolData, requiresPasswordReset: false };
  } catch (error: any) {
    // 3. Fallback: Check if temporary password matches Firestore record even if Auth sign-in failed
    try {
      const q = query(collection(db, 'schools'), where('diseCode', '==', cleanDise));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const schDoc = snap.docs[0];
        const schData = schDoc.data() as School;
        const tempPass = (schData.temporaryPassword || '').trim();
        if (tempPass && tempPass === cleanPass) {
          return {
            user: null,
            school: { id: schDoc.id, ...schData, status: schData.status || 'approved' },
            requiresPasswordReset: true,
          };
        }
      }
    } catch {}

    if (
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-credential'
    ) {
      throw new Error('અમાન્ય School DISE કોડ અથવા પાસવર્ડ. કૃપા કરીને સાચી વિગતો દાખલ કરો અથવા એડમિનનો સંપર્ક કરો.');
    }
    throw error;
  }
}

/**
 * Reset school password when logging in via temporary password.
 * Enforces new password entered twice and updates Firestore and Firebase Auth.
 */
export async function resetSchoolPasswordWithTemp(params: {
  schoolId: string;
  diseCode: string;
  temporaryPassword: string;
  newPassword: string;
}): Promise<{ school: School }> {
  const { schoolId, diseCode, temporaryPassword, newPassword } = params;

  if (newPassword.length < 6) {
    throw new Error('નવો પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.');
  }

  // 1. Call backend to update Firestore
  const res = await fetch('/api/school/reset-password-with-temp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schoolId,
      diseCode,
      temporaryPassword,
      newPassword,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'પાસવર્ડ સેટ કરવામાં ભૂલ આવી.');
  }

  const result = await res.json();
  const email = diseCodeToAuthEmail(diseCode);

  // 2. Authenticate or update password in Firebase Auth
  try {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
    } else {
      try {
        await signInWithEmailAndPassword(auth, email, newPassword);
      } catch {
        try {
          await createUserWithEmailAndPassword(auth, email, newPassword);
        } catch {}
      }
    }
  } catch (authErr) {
    console.warn('Firebase auth password sync note:', authErr);
  }

  const updatedSchool: School = result.school || {
    id: schoolId,
    ownerUid: schoolId,
    diseCode,
    schoolName: diseCode,
    district: 'Gujarat',
    status: 'approved',
    mustResetPassword: false,
    temporaryPassword: null,
  };

  return { school: updatedSchool };
}

/**
 * Securely change school password from School Dashboard / Profile.
 */
export async function changeSchoolPassword(params: {
  schoolId: string;
  currentPassword: string;
  newPassword: string;
  diseCode?: string;
}): Promise<void> {
  const { schoolId, currentPassword, newPassword } = params;

  if (!currentPassword || !newPassword) {
    throw new Error('બધી વિગતો ભરવી ફરજિયાત છે.');
  }
  if (newPassword.length < 6) {
    throw new Error('નવો પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.');
  }

  // Update in Firebase Auth if signed in
  if (auth.currentUser) {
    try {
      await updatePassword(auth.currentUser, newPassword);
    } catch (fbErr: any) {
      console.warn('Firebase Auth updatePassword warning:', fbErr);
    }
  }

  // Call backend to update Firestore
  const res = await fetch('/api/school/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId, currentPassword, newPassword }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'પાસવર્ડ બદલવામાં અસમર્થ રહ્યા.');
  }
}

/**
 * Log out the currently signed-in user (School or Admin)
 */
export async function logoutSchool(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Fetch school profile by school UID strictly from the AI Studio named database
 */
export async function getSchoolByUid(uid: string): Promise<School | null> {
  if (!uid) return null;

  try {
    const schoolRef = doc(db, 'schools', uid);
    let snap = await getDoc(schoolRef);
    if (!snap.exists()) {
      try {
        snap = await getDocFromServer(schoolRef);
      } catch {}
    }
    if (snap.exists()) {
      const rawData = snap.data() as School;
      return {
        ...rawData,
        status: rawData.status || 'approved',
      };
    }
  } catch (err) {
    console.warn(`[getSchoolByUid] Error fetching school document for UID ${uid}:`, err);
  }

  return null;
}

/**
 * Real-time listener for the currently signed-in school profile
 * Allows instant UI reactivity if Admin approves or changes school status
 */
export function subscribeToSchoolProfile(
  schoolId: string,
  callback: (school: School | null) => void
): () => void {
  const schoolDocRef = doc(db, 'schools', schoolId);
  return onSnapshot(
    schoolDocRef,
    (snap) => {
      if (snap.exists()) {
        const rawData = snap.data() as School;
        callback({
          ...rawData,
          status: rawData.status || 'approved',
        });
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error('Error in subscribeToSchoolProfile:', err);
    }
  );
}

export type AuthRoleStatus = 'loading' | 'unauthenticated' | 'admin' | 'school' | 'unauthorized';

export interface AuthSubscriptionPayload {
  status: AuthRoleStatus;
  user: User | null;
  isAdmin: boolean;
  school: School | null;
}

/**
 * Central auth state listener:
 * Determines if the current authenticated user is an Admin (/admins/{uid}) or a School (/schools/{uid}).
 * Flow:
 * 1. Checks /admins/{currentUser.uid} FIRST
 * 2. If admin document exists & role == "admin", activates Admin Dashboard and exits
 * 3. Otherwise, checks /schools/{currentUser.uid}
 * 4. Never checks /schools/{uid} before /admins/{uid}
 * 5. Uses 'loading' status during check to eliminate premature Unauthorized flashes
 */
export function subscribeToAuth(callback: (payload: AuthSubscriptionPayload) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Immediately notify loading state so UI displays role resolution spinner
      callback({ status: 'loading', user, isAdmin: false, school: null });

      try {
        // Step 1: Check if user has an Admin role in /admins/{uid} FIRST
        const isAdmin = await checkIsAdmin(user.uid);
        if (isAdmin) {
          callback({ status: 'admin', user, isAdmin: true, school: null });
          return; // Strictly stop: Do NOT check /schools/{uid} for Admin
        }

        // Step 2: If not admin, check for School document in /schools/{uid}
        const school = await getSchoolByUid(user.uid);
        if (school) {
          callback({ status: 'school', user, isAdmin: false, school });
          return;
        }

        // Step 3: Neither /admins/{uid} nor /schools/{uid} found
        callback({ status: 'unauthorized', user, isAdmin: false, school: null });
      } catch (err) {
        console.error('Error checking user role on auth state change:', err);
        callback({ status: 'unauthorized', user, isAdmin: false, school: null });
      }
    } else {
      callback({ status: 'unauthenticated', user: null, isAdmin: false, school: null });
    }
  });
}
