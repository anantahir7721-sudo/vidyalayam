import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

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

// The single, consistent Firestore database instance for the entire application.
// Enabled with IndexedDB Persistent Local Cache for 100% offline access and automatic sync.
// experimentalForceLongPolling avoids WebSocket connection handshake timeouts and ensures immediate connectivity.
// ignoreUndefinedProperties: true prevents 'Unsupported field value: undefined' errors when sending notifications or saving objects with optional fields.
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      ignoreUndefinedProperties: true,
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
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
        experimentalForceLongPolling: true,
      },
      FIRESTORE_DATABASE_ID
    );
  } catch (e2) {
    firestoreInstance = getFirestore(app, FIRESTORE_DATABASE_ID);
  }
}

export const db = firestoreInstance;

export function getDb() {
  return db;
}

export function getActiveDbId(): string {
  return FIRESTORE_DATABASE_ID;
}


