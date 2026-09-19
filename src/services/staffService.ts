import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Staff } from '../types';

/**
 * Strips undefined values to prevent Firestore rejection.
 */
function cleanObject<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Fetch all staff members belonging to a school.
 * Storage path: /schools/{schoolId}/staff
 */
export async function getStaff(schoolId: string): Promise<Staff[]> {
  const staffCol = collection(db, 'schools', schoolId, 'staff');
  const snapshot = await getDocs(staffCol);
  const list = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Staff, 'id'>),
  }));

  list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  return list;
}

/**
 * Real-time listener for staff members.
 */
export function subscribeToStaff(
  schoolId: string,
  callback: (staffList: Staff[]) => void
): () => void {
  const staffCol = collection(db, 'schools', schoolId, 'staff');
  return onSnapshot(
    staffCol,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Staff, 'id'>),
      }));
      list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      callback(list);
    },
    (error) => {
      console.error('Error subscribing to staff:', error);
    }
  );
}

/**
 * Add a new staff member under the school's subcollection.
 */
export async function addStaff(
  schoolId: string,
  data: Omit<Staff, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
): Promise<Staff> {
  const staffCol = collection(db, 'schools', schoolId, 'staff');
  const now = new Date().toISOString();
  const newStaff: Omit<Staff, 'id'> = {
    ...data,
    schoolId,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(staffCol, cleanObject(newStaff));
  return {
    id: docRef.id,
    ...newStaff,
  };
}

/**
 * Update a staff member's record.
 */
export async function updateStaff(
  schoolId: string,
  staffId: string,
  data: Partial<Omit<Staff, 'id' | 'schoolId' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, 'schools', schoolId, 'staff', staffId);
  await updateDoc(docRef, cleanObject({
    ...data,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Delete a staff member.
 */
export async function deleteStaff(schoolId: string, staffId: string): Promise<void> {
  const docRef = doc(db, 'schools', schoolId, 'staff', staffId);
  await deleteDoc(docRef);
}
