import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
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
 * 3. Binds the authenticated UID to the school record
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

/**
 * Log in school using DISE Code and Password
 */
export async function loginSchool(diseCode: string, password: string): Promise<{ user: User; school: School }> {
  const cleanDise = diseCode.trim();
  if (!cleanDise || !password) {
    throw new Error('Please enter both School DISE Code and Password.');
  }

  const email = diseCodeToAuthEmail(cleanDise);

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Fetch the school document bound to this UID
    const schoolDocRef = doc(db, 'schools', user.uid);
    const schoolSnapshot = await getDoc(schoolDocRef);

    if (!schoolSnapshot.exists()) {
      // Create fallback record if missing with pending status
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
      // Legacy compatibility: schools created before status field are treated as 'approved'
      status: rawData.status || 'approved',
    };

    return { user, school: schoolData };
  } catch (error: any) {
    if (
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-credential'
    ) {
      throw new Error('Invalid School DISE Code or Password. Please check your credentials.');
    }
    throw error;
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
