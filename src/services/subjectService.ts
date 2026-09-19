import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AllowedStandard, StandardSubject, SubjectSection } from '../types';
import { EKAM_KASOTI_SUBJECTS, SubjectConfig } from '../data/ekamKasotiConfig';

export type CustomSubjectRecord = StandardSubject;

/**
 * Strips undefined values so Firestore does not reject writes.
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
 * Fetch custom subjects created for a specific standard in a school.
 * Storage path: /schools/{schoolId}/standards/{standard}/subjects
 */
export async function getCustomSubjects(
  schoolId: string,
  standard: AllowedStandard
): Promise<StandardSubject[]> {
  const subjectsCol = collection(db, 'schools', schoolId, 'standards', String(standard), 'subjects');
  const snapshot = await getDocs(subjectsCol);
  const list = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<StandardSubject, 'id'>),
  }));

  list.sort((a, b) => (a.subjectName || '').localeCompare(b.subjectName || ''));
  return list;
}

/**
 * Real-time listener for standard-specific subjects in a school.
 */
export function subscribeToCustomSubjects(
  schoolId: string,
  standard: AllowedStandard,
  callback: (subjects: StandardSubject[]) => void
): () => void {
  const subjectsCol = collection(db, 'schools', schoolId, 'standards', String(standard), 'subjects');
  return onSnapshot(
    subjectsCol,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<StandardSubject, 'id'>),
      }));
      list.sort((a, b) => (a.subjectName || '').localeCompare(b.subjectName || ''));
      callback(list);
    },
    (err) => {
      console.error(`Error subscribing to subjects for standard ${standard}:`, err);
    }
  );
}

/**
 * Add a new subject strictly to a specific standard.
 * A subject added to one standard NEVER automatically appears in another standard.
 */
export async function addCustomSubject(
  schoolId: string,
  standard: AllowedStandard,
  data: {
    subjectName: string;
    englishName?: string;
    sections: Array<{
      name: string;
      label?: string;
      maxMarks?: number | null;
    }>;
  }
): Promise<StandardSubject> {
  const subjectsCol = collection(db, 'schools', schoolId, 'standards', String(standard), 'subjects');
  const now = new Date().toISOString();

  // Process sections: if maxMarks is null/undefined/blank, leave as null (not zero!)
  const formattedSections: SubjectSection[] = data.sections.map((sec, idx) => ({
    id: `sec_${Date.now()}_${idx}`,
    name: sec.name.trim(),
    label: sec.label ? sec.label.trim() : sec.name.trim(),
    description: sec.name.trim(),
    maxMarks: typeof sec.maxMarks === 'number' && !isNaN(sec.maxMarks) ? sec.maxMarks : null,
  }));

  // Calculate total marks only for sections that have specified maxMarks
  const knownTotal = formattedSections.reduce(
    (sum, s) => sum + (typeof s.maxMarks === 'number' ? s.maxMarks : 0),
    0
  );

  const newSubject: Omit<StandardSubject, 'id'> = {
    standard,
    subjectName: data.subjectName.trim(),
    gujaratiName: data.subjectName.trim(),
    englishName: data.englishName ? data.englishName.trim() : data.subjectName.trim(),
    totalMarks: knownTotal > 0 ? knownTotal : null,
    sections: formattedSections,
    isCustom: true,
    schoolId,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(subjectsCol, cleanObject(newSubject));
  return {
    id: docRef.id,
    ...newSubject,
  };
}

/**
 * Update an existing custom subject (e.g. modify section max marks later).
 */
export async function updateCustomSubject(
  schoolId: string,
  standard: AllowedStandard,
  subjectId: string,
  data: {
    subjectName?: string;
    englishName?: string;
    sections?: SubjectSection[];
  }
): Promise<void> {
  const subjectDocRef = doc(db, 'schools', schoolId, 'standards', String(standard), 'subjects', subjectId);
  const now = new Date().toISOString();

  const updates: Record<string, any> = {
    updatedAt: now,
  };

  if (data.subjectName) {
    updates.subjectName = data.subjectName.trim();
    updates.gujaratiName = data.subjectName.trim();
  }
  if (data.englishName !== undefined) {
    updates.englishName = data.englishName.trim();
  }
  if (data.sections) {
    updates.sections = data.sections.map((sec) => ({
      ...sec,
      name: sec.name.trim(),
      maxMarks: typeof sec.maxMarks === 'number' && !isNaN(sec.maxMarks) ? sec.maxMarks : null,
    }));
    const knownTotal = updates.sections.reduce(
      (sum: number, s: SubjectSection) => sum + (typeof s.maxMarks === 'number' ? s.maxMarks : 0),
      0
    );
    updates.totalMarks = knownTotal > 0 ? knownTotal : null;
  }

  await updateDoc(subjectDocRef, cleanObject(updates));
}

/**
 * Delete a custom subject.
 */
export async function deleteCustomSubject(
  schoolId: string,
  standard: AllowedStandard,
  subjectId: string
): Promise<void> {
  const subjectDocRef = doc(db, 'schools', schoolId, 'standards', String(standard), 'subjects', subjectId);
  await deleteDoc(subjectDocRef);
}

/**
 * Converts a custom StandardSubject to the standard SubjectConfig format
 * used by MarksManager, Excel Export, and A4 PDF print.
 */
export function convertToSubjectConfig(sub: StandardSubject): SubjectConfig {
  return {
    id: sub.id,
    name: sub.subjectName,
    gujaratiName: sub.gujaratiName || sub.subjectName,
    englishName: sub.englishName || sub.subjectName,
    standard: sub.standard,
    totalMarks: sub.totalMarks || null,
    isCustom: true,
    questions: sub.sections.map((sec) => ({
      id: sec.id,
      label: sec.label || sec.name,
      description: sec.name,
      section: sec.name,
      maxMarks: sec.maxMarks ?? null,
    })),
  };
}

/**
 * Returns all subjects for a standard:
 * Combines installed GSEB papers + school's custom subjects for THAT standard only!
 */
export function mergeInstalledAndCustomSubjects(
  standard: AllowedStandard,
  customSubjects: StandardSubject[]
): SubjectConfig[] {
  const installed = EKAM_KASOTI_SUBJECTS[standard] || [];
  const custom = customSubjects
    .filter((s) => String(s.standard) === String(standard))
    .map(convertToSubjectConfig);

  return [...installed, ...custom];
}
