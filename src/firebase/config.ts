import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
  enableNetwork,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import { isNativeApp } from '../utils/apiConfig';

// Intercept and handle benign Firestore offline / 10s backend connection notices gracefully
if (typeof console !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args.map(arg => (typeof arg === 'string' ? arg : (arg?.message || ''))).join(' ');
    if (
      message.includes('Could not reach Cloud Firestore backend') ||
      message.includes("Backend didn't respond within 10 seconds") ||
      message.includes('client will operate in offline mode')
    ) {
      // Benign network latency / offline notice - keep in console as info without triggering runtime error
      console.info('[Firestore]', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// Silence non-fatal Firestore network transition warnings
try {
  setLogLevel('silent');
} catch {}

// Firebase configuration loaded from provisioned project
export const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
  measurementId: firebaseConfigData.measurementId,
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore strictly using the AI Studio named database ID
export const projectId = firebaseConfigData.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfigData.firestoreDatabaseId || 'ai-studio-f31f93ae-44ec-4b38-97ab-6ff71ff82da1';

// Clear any stale local preference to prevent switching away from the named database
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('gs_active_database_id');
  } catch {}
}

/**
 * Determine if running in a single-instance mobile container (e.g., Capacitor Android APK)
 * where WebLocks are unsupported or deadlock, requiring persistentSingleTabManager({ forceOwnership: true }).
 */
export function shouldUseSingleTabManager(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (isNativeApp()) return true;
    const ua = navigator.userAgent || '';
    if (
      /Android.*wv/.test(ua) ||
      (window as any).Capacitor !== undefined ||
      (window as any).AndroidBridge !== undefined
    ) {
      return true;
    }
    if (typeof navigator !== 'undefined' && !('locks' in navigator)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// The single, consistent Firestore database instance for the entire application.
// In Native Android APK: Uses persistentSingleTabManager({ forceOwnership: true }) to guarantee
// immediate ownership of the IndexedDB cache and activate real-time network streams instantly.
// experimentalAutoDetectLongPolling: true allows fast WebSockets with smooth automatic fallback.
const useSingleTab = shouldUseSingleTabManager();
const tabManager = useSingleTab
  ? persistentSingleTabManager({ forceOwnership: true })
  : persistentMultipleTabManager();

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager,
      }),
    },
    FIRESTORE_DATABASE_ID
  );
} catch (e) {
  try {
    firestoreInstance = initializeFirestore(
      app,
      {
        ignoreUndefinedProperties: true,
        experimentalAutoDetectLongPolling: true,
      },
      FIRESTORE_DATABASE_ID
    );
  } catch (e2) {
    firestoreInstance = getFirestore(app, FIRESTORE_DATABASE_ID);
  }
}

/**
 * Actively ensure Firestore network client is running whenever online
 */
export async function ensureFirestoreOnline(): Promise<void> {
  try {
    if (firestoreInstance) {
      await enableNetwork(firestoreInstance);
    }
  } catch {
    // Harmless if already enabled
  }
}

// Automatically wake up Firestore network on online, focus, or visibility restore
if (typeof window !== 'undefined') {
  const triggerOnline = () => {
    ensureFirestoreOnline().catch(() => {});
  };
  window.addEventListener('online', triggerOnline);
  window.addEventListener('focus', triggerOnline);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerOnline();
    }
  });
}

export const db = firestoreInstance;

export function getDb() {
  return db;
}

export function getActiveDbId(): string {
  return FIRESTORE_DATABASE_ID;
}


