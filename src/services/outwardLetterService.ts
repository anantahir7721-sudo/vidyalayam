import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { OutwardLetter, OutwardLetterSettings } from '../types';

const SETTINGS_KEY_PREFIX = 'vidyalayam_outward_settings_';
const LETTERS_CACHE_PREFIX = 'vidyalayam_outward_letters_';
const CHUNK_SIZE = 400000; // 400KB characters per chunk document to avoid 1MB limit

/**
 * Helper to reassemble large original letterhead image stored across chunk documents
 */
async function assembleLetterheadIfChunked(
  schoolId: string,
  rawData: any
): Promise<string> {
  if (rawData.letterheadChunkCount && rawData.letterheadChunkCount > 0) {
    try {
      const chunksCol = collection(db, 'schools', schoolId, 'settings', 'outward_letter', 'chunks');
      const snap = await getDocs(chunksCol);
      if (!snap.empty) {
        const chunkDocs = snap.docs.map((d) => d.data() as { index: number; chunk: string });
        chunkDocs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        return chunkDocs.map((c) => c.chunk).join('');
      }
    } catch (e) {
      console.warn('Error assembling chunked letterhead:', e);
    }
  }
  return rawData.letterheadUrl || '';
}

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
    const snap = await getDoc(settingsDoc);
    if (snap.exists()) {
      const rawData = snap.data() as any;
      let finalLetterhead = rawData.letterheadUrl;
      if (rawData.letterheadChunkCount && rawData.letterheadChunkCount > 0) {
        finalLetterhead = await assembleLetterheadIfChunked(schoolId, rawData);
      }
      const data: OutwardLetterSettings = {
        ...rawData,
        letterheadUrl: finalLetterhead || rawData.letterheadUrl,
      };
      const merged = { ...cached, ...data };
      try {
        localStorage.setItem(localKey, JSON.stringify(merged));
      } catch (e) {}
      return merged;
    }
  } catch (err) {
    console.warn('Error fetching outward settings from Firestore, using cache:', err);
  }

  return cached;
}

/**
 * Save outward letter settings to both LocalStorage and Firestore
 * Supports original high-resolution uncompressed letterheads by chunking when needed
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
    const chunksCol = collection(db, 'schools', schoolId, 'settings', 'outward_letter', 'chunks');
    const fullLetterhead = settings.letterheadUrl || '';

    if (fullLetterhead && fullLetterhead.length > 500000) {
      // Original large image: chunk across subcollection documents to avoid 1MB Firestore limit
      const chunks: string[] = [];
      for (let i = 0; i < fullLetterhead.length; i += CHUNK_SIZE) {
        chunks.push(fullLetterhead.slice(i, i + CHUNK_SIZE));
      }

      await Promise.all(
        chunks.map((chunk, idx) =>
          setDoc(doc(chunksCol, String(idx)), { index: idx, chunk })
        )
      );

      const { letterheadUrl, ...restSettings } = settings;
      await setDoc(settingsDoc, {
        ...restSettings,
        letterheadUrl: '',
        letterheadChunkCount: chunks.length,
      }, { merge: true });
    } else {
      // Normal size image or removed image
      await setDoc(settingsDoc, {
        ...settings,
        letterheadChunkCount: 0,
      }, { merge: true });

      // If letterhead was removed, clean up chunks
      if (!fullLetterhead) {
        getDocs(chunksCol).then((snap) => {
          snap.forEach((d) => deleteDoc(d.ref));
        }).catch(() => {});
      }
    }
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
    async (snap) => {
      if (snap.exists()) {
        const rawData = snap.data() as any;
        let finalLetterhead = rawData.letterheadUrl;
        if (rawData.letterheadChunkCount && rawData.letterheadChunkCount > 0) {
          finalLetterhead = await assembleLetterheadIfChunked(schoolId, rawData);
        }
        const data: OutwardLetterSettings = {
          ...rawData,
          letterheadUrl: finalLetterhead || rawData.letterheadUrl,
        };
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
    const snapshot = await getDocs(lettersCol);

    const list: OutwardLetter[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<OutwardLetter, 'id'>),
    }));

    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    if (list.length > 0) {
      try {
        localStorage.setItem(localKey, JSON.stringify(list));
      } catch (e) {}
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

  return onSnapshot(
    lettersCol,
    (snapshot) => {
      const list: OutwardLetter[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<OutwardLetter, 'id'>),
      }));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      try {
        localStorage.setItem(localKey, JSON.stringify(list));
      } catch (e) {}
      callback(list);
    },
    (err) => {
      console.warn('Real-time outward letters subscription error:', err);
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
