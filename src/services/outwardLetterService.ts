import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { OutwardLetter, OutwardLetterSettings } from '../types';

const SETTINGS_KEY_PREFIX = 'vidyalayam_outward_settings_';
const LETTERS_CACHE_PREFIX = 'vidyalayam_outward_letters_';

/**
 * Load outward letter settings (Letterhead image, Principal Sign, Margins)
 * Combines localStorage cache with Firestore for fast rendering and multi-device sync
 */
export async function getOutwardSettings(schoolId: string): Promise<OutwardLetterSettings> {
  const localKey = `${SETTINGS_KEY_PREFIX}${schoolId}`;
  let cached: OutwardLetterSettings = {};
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) cached = JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local outward settings:', e);
  }

  try {
    const settingsDoc = doc(db, 'schools', schoolId, 'settings', 'outward_letter');
    const snap = await import('firebase/firestore').then(f => f.getDoc(settingsDoc));
    if (snap.exists()) {
      const data = snap.data() as OutwardLetterSettings;
      const merged = { ...cached, ...data };
      localStorage.setItem(localKey, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Error fetching outward settings from Firestore, using cache:', err);
  }

  return cached;
}

/**
 * Save outward letter settings to both LocalStorage and Firestore
 */
export async function saveOutwardSettings(
  schoolId: string,
  settings: OutwardLetterSettings
): Promise<void> {
  const localKey = `${SETTINGS_KEY_PREFIX}${schoolId}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(settings));
  } catch (e) {
    console.warn('Error writing local outward settings:', e);
  }

  try {
    const settingsDoc = doc(db, 'schools', schoolId, 'settings', 'outward_letter');
    const firestorePromise = setDoc(settingsDoc, settings, { merge: true });
    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 2000));
    await Promise.race([firestorePromise, timeoutPromise]);
  } catch (err) {
    console.warn('Notice saving outward settings to Firestore:', err);
  }
}

/**
 * Real-time subscription to outward letter settings (Letterhead, Sign, Margins, Prefix)
 * Ensures changes by any teacher or principal sync automatically to all devices
 */
export function subscribeToOutwardSettings(
  schoolId: string,
  callback: (settings: OutwardLetterSettings) => void
): () => void {
  const localKey = `${SETTINGS_KEY_PREFIX}${schoolId}`;
  const settingsDoc = doc(db, 'schools', schoolId, 'settings', 'outward_letter');

  return onSnapshot(
    settingsDoc,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as OutwardLetterSettings;
        try {
          localStorage.setItem(localKey, JSON.stringify(data));
        } catch (e) {}
        callback(data);
      }
    },
    (err) => {
      console.warn('Real-time outward settings subscription notice:', err);
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) callback(JSON.parse(raw));
      } catch (e) {}
    }
  );
}

/**
 * Fetch all outward letters for the school
 */
export async function getOutwardLetters(schoolId: string): Promise<OutwardLetter[]> {
  const localKey = `${LETTERS_CACHE_PREFIX}${schoolId}`;
  let cached: OutwardLetter[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) cached = JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local outward letters cache:', e);
  }

  try {
    const lettersCol = collection(db, 'schools', schoolId, 'outward_letters');
    const q = query(lettersCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const list: OutwardLetter[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<OutwardLetter, 'id'>),
    }));

    if (list.length > 0) {
      localStorage.setItem(localKey, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Error fetching outward letters from Firestore, using cache:', err);
  }

  return cached;
}

/**
 * Real-time subscription to outward letters
 */
export function subscribeToOutwardLetters(
  schoolId: string,
  callback: (letters: OutwardLetter[]) => void
): () => void {
  const localKey = `${LETTERS_CACHE_PREFIX}${schoolId}`;
  const lettersCol = collection(db, 'schools', schoolId, 'outward_letters');
  const q = query(lettersCol, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: OutwardLetter[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<OutwardLetter, 'id'>),
      }));
      try {
        localStorage.setItem(localKey, JSON.stringify(list));
      } catch (e) {}
      callback(list);
    },
    (err) => {
      console.warn('Real-time outward letters subscription error:', err);
      // Fallback to local cache
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) callback(JSON.parse(raw));
      } catch (e) {}
    }
  );
}

/**
 * Save or update an outward letter in Firestore and Local Cache
 */
export async function saveOutwardLetter(
  schoolId: string,
  letter: OutwardLetter
): Promise<void> {
  const localKey = `${LETTERS_CACHE_PREFIX}${schoolId}`;

  // Update local cache immediately
  try {
    const raw = localStorage.getItem(localKey);
    const list: OutwardLetter[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((l) => l.id === letter.id);
    if (idx >= 0) {
      list[idx] = letter;
    } else {
      list.unshift(letter);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {}

  // Save to Firestore
  try {
    const letterDoc = doc(db, 'schools', schoolId, 'outward_letters', letter.id);
    await setDoc(letterDoc, letter, { merge: true });
  } catch (err) {
    console.error('Error saving outward letter to Firestore:', err);
    throw err;
  }
}

/**
 * Delete an outward letter
 */
export async function deleteOutwardLetter(
  schoolId: string,
  letterId: string
): Promise<void> {
  const localKey = `${LETTERS_CACHE_PREFIX}${schoolId}`;

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: OutwardLetter[] = JSON.parse(raw);
      const filtered = list.filter((l) => l.id !== letterId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch (e) {}

  const letterDoc = doc(db, 'schools', schoolId, 'outward_letters', letterId);
  await deleteDoc(letterDoc);
}
