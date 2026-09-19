import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

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

// The single, consistent Firestore database instance for the entire application
export const db = getFirestore(app, FIRESTORE_DATABASE_ID);

export function getDb() {
  return db;
}

export function getActiveDbId(): string {
  return FIRESTORE_DATABASE_ID;
}

