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

    let savePromise: Promise<any>;

    if (fullLetterhead && fullLetterhead.length > 500000) {
      // Original large image: chunk across subcollection documents to avoid 1MB Firestore limit
      const chunks: string[] = [];
      for (let i = 0; i < fullLetterhead.length; i += CHUNK_SIZE) {
        chunks.push(fullLetterhead.slice(i, i + CHUNK_SIZE));
      }

      savePromise = Promise.all(
        chunks.map((chunk, idx) =>
          setDoc(doc(chunksCol, String(idx)), { index: idx, chunk })
        )
      ).then(() => {
        const { letterheadUrl, ...restSettings } = settings;
        const cleanPayload = sanitizeForFirestore({
          ...restSettings,
          letterheadUrl: '',
          letterheadChunkCount: chunks.length,
        });
        return setDoc(settingsDoc, cleanPayload, { merge: true });
      });
    } else {
      // Normal size image or removed image
      const cleanPayload = sanitizeForFirestore({
        ...settings,
        letterheadChunkCount: 0,
      });
      savePromise = setDoc(settingsDoc, cleanPayload, { merge: true });

      // If letterhead was removed, clean up chunks
      if (!fullLetterhead) {
        getDocs(chunksCol).then((snap) => {
          snap.forEach((d) => deleteDoc(d.ref));
        }).catch(() => {});
      }
    }

    // Allow up to 3.5 seconds for network ACK; local storage is already safely committed
    await Promise.race([
      savePromise,
      new Promise((resolve) => setTimeout(resolve, 3500)),
    ]);
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

const PENDING_QUEUE_PREFIX = 'vidyalayam_pending_outward_letters_';

/**
 * Recursively removes any keys with `undefined` values from an object,
 * preventing Firestore `Function setDoc() called with invalid data. Unsupported field value: undefined` error.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

function getPendingQueue(schoolId: string): OutwardLetter[] {
  try {
    const raw = localStorage.getItem(`${PENDING_QUEUE_PREFIX}${schoolId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingQueue(schoolId: string, queue: OutwardLetter[]): void {
  try {
    localStorage.setItem(`${PENDING_QUEUE_PREFIX}${schoolId}`, JSON.stringify(queue));
  } catch {}
}

/**
 * Flush any offline queued outward letters to Firestore
 */
export async function flushPendingOutwardLetters(schoolId: string): Promise<number> {
  const queue = getPendingQueue(schoolId);
  if (!queue || queue.length === 0) return 0;
  let synced = 0;
  const remaining: OutwardLetter[] = [];

  for (const letter of queue) {
    try {
      const clean = sanitizeForFirestore(letter);
      const letterDoc = doc(db, 'schools', schoolId, 'outward_letters', letter.id);
      await setDoc(letterDoc, clean, { merge: true });
      synced++;
    } catch (e) {
      console.warn('Could not sync pending letter to Firestore:', e);
      remaining.push(letter);
    }
  }
  savePendingQueue(schoolId, remaining);
  return synced;
}

/**
 * Fetch all outward letters for the school with automatic offline cache & reconciliation
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

    const remoteList: OutwardLetter[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<OutwardLetter, 'id'>),
    }));

    // Auto-reconciliation: If local has letters not yet in remote, push them to Firestore
    const remoteIds = new Set(remoteList.map((l) => l.id));
    const missingInRemote = cached.filter((l) => !remoteIds.has(l.id));
    if (missingInRemote.length > 0) {
      for (const item of missingInRemote) {
        try {
          const clean = sanitizeForFirestore(item);
          const letterDoc = doc(db, 'schools', schoolId, 'outward_letters', item.id);
          await setDoc(letterDoc, clean, { merge: true });
          remoteList.push(item);
          remoteIds.add(item.id);
        } catch (syncErr) {
          console.warn('Auto-sync missing letter error:', syncErr);
        }
      }
    }

    remoteList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    try {
      localStorage.setItem(localKey, JSON.stringify(remoteList));
    } catch (e) {}
    return remoteList;
  } catch (err) {
    console.warn('Error fetching outward letters from Firestore, using cache:', err);
  }

  return cached;
}

/**
 * Real-time subscription to outward letters with instant cache return and automatic offline reconciliation
 */
export function subscribeToOutwardLetters(
  schoolId: string,
  callback: (letters: OutwardLetter[]) => void
): () => void {
  const localKey = `${LETTERS_CACHE_PREFIX}${schoolId}`;
  const lettersCol = collection(db, 'schools', schoolId, 'outward_letters');

  // 1. Immediately invoke callback with cached letters so UI does not flicker or delay
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const cached = JSON.parse(raw);
      if (Array.isArray(cached)) {
        callback(cached);
      }
    }
  } catch (e) {}

  // 2. Try flushing any queued letters from prior offline sessions
  flushPendingOutwardLetters(schoolId).catch(() => {});

  const handleOnline = () => {
    flushPendingOutwardLetters(schoolId).catch(() => {});
  };
  window.addEventListener('online', handleOnline);

  // 3. Set up Firestore onSnapshot listener
  const unsub = onSnapshot(
    lettersCol,
    async (snapshot) => {
      const remoteList: OutwardLetter[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<OutwardLetter, 'id'>),
      }));

      // Auto-reconciliation: Check if there are letters stored locally that are not yet in Firestore
      // (e.g. created on Native APK while offline or before sanitization fix)
      let localList: OutwardLetter[] = [];
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) localList = JSON.parse(raw);
      } catch {}

      const remoteIds = new Set(remoteList.map((l) => l.id));
      const pendingUploads = localList.filter((l) => !remoteIds.has(l.id));

      if (pendingUploads.length > 0) {
        // Upload any pending offline letters to Firestore automatically!
        for (const pending of pendingUploads) {
          try {
            const clean = sanitizeForFirestore(pending);
            const letterDoc = doc(db, 'schools', schoolId, 'outward_letters', pending.id);
            await setDoc(letterDoc, clean, { merge: true });
            remoteList.push(pending);
            remoteIds.add(pending.id);
          } catch (e) {
            console.warn('Auto-reconciliation error for letter', pending.id, e);
          }
        }
      }

      remoteList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      try {
        localStorage.setItem(localKey, JSON.stringify(remoteList));
      } catch (e) {}
      callback(remoteList);
    },
    (err) => {
      console.warn('Real-time outward letters subscription notice:', err);
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) {
          callback(JSON.parse(raw));
        } else {
          callback([]);
        }
      } catch (e) {
        callback([]);
      }
    }
  );

  return () => {
    unsub();
    window.removeEventListener('online', handleOnline);
  };
}

/**
 * Save or update an outward letter in Firestore and Local Cache
 * Fully sanitized to ensure zero Firestore undefined errors, with offline queue backup
 */
export async function saveOutwardLetter(
  schoolId: string,
  letter: OutwardLetter
): Promise<void> {
  const localKey = `${LETTERS_CACHE_PREFIX}${schoolId}`;

  // 1. Update local cache immediately so native APK and UI are instant
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
  } catch (e) {
    console.warn('Error saving outward letter to local cache:', e);
  }

  // 2. Clean doc to remove any undefined fields
  const cleanDoc = sanitizeForFirestore(letter);

  // 3. Save to Firestore
  try {
    const letterDoc = doc(db, 'schools', schoolId, 'outward_letters', letter.id);
    const savePromise = setDoc(letterDoc, cleanDoc, { merge: true });
    await Promise.race([
      savePromise,
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);

    // Clean from pending queue if present
    const queue = getPendingQueue(schoolId).filter((l) => l.id !== letter.id);
    savePendingQueue(schoolId, queue);
  } catch (err) {
    console.warn('Notice saving outward letter to Firestore, queueing for background sync:', err);
    const queue = getPendingQueue(schoolId);
    if (!queue.some((l) => l.id === letter.id)) {
      queue.push(letter);
      savePendingQueue(schoolId, queue);
    }
    // If client is currently offline, don't throw an error to disrupt the user
    if (!navigator.onLine) {
      return;
    }
    throw err;
  }
}

/**
 * Delete an outward letter from Firestore and Local Cache
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

  // Also remove from pending queue
  const queue = getPendingQueue(schoolId).filter((l) => l.id !== letterId);
  savePendingQueue(schoolId, queue);

  try {
    const letterDoc = doc(db, 'schools', schoolId, 'outward_letters', letterId);
    await deleteDoc(letterDoc);
  } catch (err) {
    console.warn('Notice deleting outward letter from Firestore:', err);
  }
}
