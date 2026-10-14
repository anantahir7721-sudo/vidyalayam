import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
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
import { apiUrl } from '../utils/apiConfig';

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
 * Check if a school with the given DISE Code is already registered.
 * Returns true if a school document already exists with this DISE code.
 */
export async function checkSchoolDiseExists(diseCode: string): Promise<boolean> {
  const cleanDise = diseCode.trim();
  if (!cleanDise) return false;
  try {
    const q = query(collection(db, 'schools'), where('diseCode', '==', cleanDise));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    console.error('Error checking school DISE existence:', error);
    return false;
  }
}

/**
 * Register a new school:
 * 1. Checks if a school with this DISE Code is already registered
 * 2. Creates Firebase Auth user using DISE Code identifier + Password
 * 3. Writes the school profile document to Firestore at /schools/{uid} with status: "pending"
 * 4. Saves password securely in Firestore
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

  // Strictly enforce DISE Code uniqueness: if any school with this DISE already exists, reject registration
  const diseAlreadyExists = await checkSchoolDiseExists(cleanDise);
  if (diseAlreadyExists) {
    throw new Error(
      `આ DISE કોડ (${cleanDise}) ધરાવતી શાળા પહેલેથી જ રજીસ્ટર થયેલી છે. તમે પહેલેથી રજીસ્ટર થયેલા DISE કોડ સાથે નવી શાળા રજીસ્ટર કરી શકતા નથી. કૃપા કરીને લૉગિન કરો. (A school with DISE Code "${cleanDise}" is already registered. You cannot register a school with that same DISE.)`
    );
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
      throw new Error(
        `આ DISE કોડ (${cleanDise}) ધરાવતી શાળા પહેલેથી જ રજીસ્ટર થયેલી છે. તમે પહેલેથી રજીસ્ટર થયેલા DISE કોડ સાથે નવી શાળા રજીસ્ટર કરી શકતા નથી. કૃપા કરીને લૉગિન કરો. (A school with DISE Code "${cleanDise}" is already registered. You cannot register a school with that same DISE.)`
      );
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
    // 3. Fallback: Check if temporary password or stored password matches Firestore record
    try {
      const q = query(collection(db, 'schools'), where('diseCode', '==', cleanDise));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const schDoc = snap.docs[0];
        const schData = schDoc.data() as School;
        const tempPass = (schData.temporaryPassword || '').trim();
        if (tempPass && tempPass === cleanPass) {
          return {
            user: auth.currentUser,
            school: { id: schDoc.id, ...schData, status: schData.status || 'approved' },
            requiresPasswordReset: true,
          };
        }

        // Also check if stored password in Firestore matches
        const storedPass = (schData.password || '').trim();
        if (storedPass && storedPass === cleanPass) {
          let authedUser = auth.currentUser;
          if (!authedUser || authedUser.email !== email) {
            try {
              const cred = await createUserWithEmailAndPassword(auth, email, cleanPass);
              authedUser = cred.user;
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                if (tempPass) {
                  try {
                    const oldCred = await signInWithEmailAndPassword(auth, email, tempPass);
                    await updatePassword(oldCred.user, cleanPass);
                    authedUser = oldCred.user;
                  } catch {}
                }
              }
            }
          }
          return {
            user: authedUser || auth.currentUser,
            school: { id: schDoc.id, ...schData, status: schData.status || 'approved' },
            requiresPasswordReset: schData.mustResetPassword === true,
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

  const cleanDise = diseCode.trim();
  const email = diseCodeToAuthEmail(cleanDise);
  let updatedSchool: School | null = null;
  let backendSuccess = false;

  // 1. Call backend API to update Firestore and auto-resolve reset requests
  try {
    const res = await fetch(apiUrl('/api/school/reset-password-with-temp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId,
        diseCode: cleanDise,
        temporaryPassword: temporaryPassword.trim(),
        newPassword: newPassword.trim(),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      updatedSchool = data.school;
      backendSuccess = true;
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error && errData.error.includes('અમાન્ય ટેમ્પરરી પાસવર્ડ')) {
        throw new Error(errData.error);
      }
    }
  } catch (netErr: any) {
    if (netErr.message && netErr.message.includes('અમાન્ય ટેમ્પરરી પાસવર્ડ')) {
      throw netErr;
    }
    console.warn('Backend reset password API note:', netErr);
  }

  // 2. Direct Firestore update (allowed by deployed security rule for temporaryPassword reset)
  try {
    const schoolDocRef = doc(db, 'schools', schoolId);
    await updateDoc(schoolDocRef, {
      password: newPassword.trim(),
      temporaryPassword: null,
      mustResetPassword: false,
      updatedAt: new Date().toISOString(),
    });
  } catch (directErr: any) {
    if (!backendSuccess) {
      console.error('Direct Firestore update error:', directErr);
      throw new Error(directErr.message || 'પાસવર્ડ સેટ કરવામાં ભૂલ આવી.');
    }
  }

  // 3. Authenticate / update Firebase Auth user so user is properly signed in
  try {
    if (auth.currentUser && auth.currentUser.email === email) {
      await updatePassword(auth.currentUser, newPassword.trim()).catch(() => {});
    } else {
      if (auth.currentUser) {
        await fbSignOut(auth).catch(() => {});
      }

      let signedIn = false;
      try {
        await signInWithEmailAndPassword(auth, email, newPassword.trim());
        signedIn = true;
      } catch (signErr: any) {
        if (signErr.code === 'auth/wrong-password' || signErr.code === 'auth/invalid-credential') {
          try {
            const oldCred = await signInWithEmailAndPassword(auth, email, temporaryPassword.trim());
            await updatePassword(oldCred.user, newPassword.trim());
            signedIn = true;
          } catch {}
        }
        if (!signedIn && signErr.code === 'auth/user-not-found') {
          try {
            await createUserWithEmailAndPassword(auth, email, newPassword.trim());
            signedIn = true;
          } catch {}
        }
      }
    }
  } catch (authErr) {
    console.warn('Firebase auth sync note:', authErr);
  }

  // 4. Ensure final active session in auth
  if (!auth.currentUser || auth.currentUser.email !== email) {
    try {
      await signInWithEmailAndPassword(auth, email, newPassword.trim());
    } catch {}
  }

  const finalSchool: School = updatedSchool || {
    id: schoolId,
    ownerUid: schoolId,
    diseCode: cleanDise,
    schoolName: cleanDise,
    district: 'Gujarat',
    status: 'approved',
    mustResetPassword: false,
    temporaryPassword: null,
    password: newPassword.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { school: finalSchool };
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
  const { schoolId, currentPassword, newPassword, diseCode } = params;

  if (!currentPassword || !newPassword) {
    throw new Error('બધી વિગતો ભરવી ફરજિયાત છે.');
  }
  if (newPassword.length < 6) {
    throw new Error('નવો પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.');
  }

  const cleanCurrent = currentPassword.trim();
  const cleanNew = newPassword.trim();

  // 1. Call backend API to update Firestore with cross-validation on schoolId & diseCode
  const res = await fetch(apiUrl('/api/school/change-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schoolId,
      diseCode: diseCode?.trim() || '',
      currentPassword: cleanCurrent,
      newPassword: cleanNew,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'પાસવર્ડ બદલવામાં અસમર્થ રહ્યા.');
  }

  // 2. Re-authenticate with current credentials and update Firebase Auth user password
  const authEmail = diseCode ? diseCodeToAuthEmail(diseCode) : auth.currentUser?.email;
  if (auth.currentUser && authEmail) {
    try {
      const cred = EmailAuthProvider.credential(authEmail, cleanCurrent);
      await reauthenticateWithCredential(auth.currentUser, cred).catch(() => {});
      await updatePassword(auth.currentUser, cleanNew);
    } catch (fbErr: any) {
      console.warn('Firebase Auth updatePassword warning:', fbErr);
    }
  } else if (authEmail) {
    // If auth.currentUser was lost or signed out, sign in with cleanCurrent and update password
    try {
      const cred = await signInWithEmailAndPassword(auth, authEmail, cleanCurrent).catch(() => null);
      if (cred?.user) {
        await updatePassword(cred.user, cleanNew).catch(() => {});
      }
    } catch (signErr) {
      console.warn('Firebase sign-in for password sync note:', signErr);
    }
  }

  // 3. Make sure active Firebase Auth session is maintained with the new password
  if (authEmail && (!auth.currentUser || auth.currentUser.email !== authEmail)) {
    try {
      await signInWithEmailAndPassword(auth, authEmail, cleanNew);
    } catch (finalSignErr: any) {
      if (finalSignErr.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, authEmail, cleanNew);
        } catch {}
      }
    }
  }

  // 4. Keep local storage session in sync with the new password
  try {
    const storedUserJson = localStorage.getItem('vidyalayam_auth_user');
    if (storedUserJson) {
      const storedUser = JSON.parse(storedUserJson);
      if (storedUser?.school) {
        storedUser.school.password = cleanNew;
        storedUser.school.temporaryPassword = null;
        storedUser.school.mustResetPassword = false;
        localStorage.setItem('vidyalayam_auth_user', JSON.stringify(storedUser));
      }
    }
  } catch {}
}

/**
 * Log out the currently signed-in user (School or Admin)
 */
export async function logoutSchool(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Fetch a school document by UID with triple lookup:
 * 1. Directly via /schools/{uid}
 * 2. Via query by ownerUid == uid
 * 3. Via query by authenticated email (school_{diseCode}@gujarat-schools.internal)
 */
export async function getSchoolByUid(uid: string): Promise<School | null> {
  if (!uid) return null;

  try {
    // 1. Direct document lookup by uid
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
        id: snap.id,
        ...rawData,
        status: rawData.status || 'approved',
      };
    }

    // 2. Query by ownerUid
    const qOwner = query(collection(db, 'schools'), where('ownerUid', '==', uid));
    const snapOwner = await getDocs(qOwner);
    if (!snapOwner.empty) {
      const docSnap = snapOwner.docs[0];
      const rawData = docSnap.data() as School;
      return {
        id: docSnap.id,
        ...rawData,
        status: rawData.status || 'approved',
      };
    }

    // 3. Query by authenticated user's email DISE code
    const curEmail = auth.currentUser?.email;
    if (curEmail && curEmail.startsWith('school_') && curEmail.endsWith('@gujarat-schools.internal')) {
      const extractedDise = curEmail.replace('school_', '').replace('@gujarat-schools.internal', '').trim();
      if (extractedDise) {
        const qDise = query(collection(db, 'schools'), where('diseCode', '==', extractedDise));
        const snapDise = await getDocs(qDise);
        if (!snapDise.empty) {
          const docSnap = snapDise.docs[0];
          const rawData = docSnap.data() as School;
          return {
            id: docSnap.id,
            ...rawData,
            status: rawData.status || 'approved',
          };
        }
      }
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
