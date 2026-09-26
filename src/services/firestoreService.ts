import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Student,
  MarkRecord,
  StudentUidConflict,
  RegisteredSchoolInfo,
  ParentBroadcastRecord,
  School,
  SchoolAdmissionSettings,
  AdmissionApplication,
} from '../types';
import { cleanAndNormalizeBloodGroup, diagnoseStudentBloodGroup } from '../utils/bloodGroupUtils';

/**
 * Fetch all students belonging strictly to the specified school.
 * Storage path: /schools/{schoolId}/students
 */
export async function getStudents(schoolId: string): Promise<Student[]> {
  const studentsCol = collection(db, 'schools', schoolId, 'students');
  const snapshot = await getDocs(studentsCol);

  const list = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Student, 'id'>),
  }));

  list.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
  return list;
}

/**
 * Real-time subscription to school students collection.
 * Automatically synchronizes student updates across all logged-in devices.
 */
export function subscribeToStudents(
  schoolId: string,
  callback: (students: Student[]) => void
): () => void {
  const studentsCol = collection(db, 'schools', schoolId, 'students');
  return onSnapshot(
    studentsCol,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Student, 'id'>),
      }));
      list.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
      callback(list);
    },
    (error) => {
      console.error('Realtime students subscription error:', error);
    }
  );
}

/**
 * Add a new student under the authenticated school's subcollection.
 * Security: Firestore rules ensure only the school with matching UID can write here.
 */
export async function addStudent(
  schoolId: string,
  data: Partial<Omit<Student, 'id' | 'schoolId' | 'createdAt'>> & {
    studentName: string;
    standard: string;
  }
): Promise<Student> {
  const studentsCol = collection(db, 'schools', schoolId, 'students');
  const newStudent: Omit<Student, 'id'> = {
    schoolId,
    studentName: data.studentName.trim(),
    standard: data.standard.trim(),
    createdAt: new Date().toISOString(),
    ...(data.diseCode ? { diseCode: data.diseCode.trim() } : {}),
    ...(data.grNumber ? { grNumber: data.grNumber.trim() } : {}),
    ...(data.section ? { section: data.section.trim(), division: data.section.trim() } : {}),
    ...(data.division && !data.section ? { section: data.division.trim(), division: data.division.trim() } : {}),
    ...(data.rollNumber ? { rollNumber: data.rollNumber.trim() } : {}),
    ...(data.gender ? { gender: data.gender } : {}),
    ...(data.dob ? { dob: data.dob.trim() } : {}),
    ...(data.doa ? { doa: data.doa.trim() } : {}),
    ...(data.address ? { address: data.address.trim() } : {}),
    ...(data.motherName ? { motherName: data.motherName.trim() } : {}),
    ...(data.fatherName ? { fatherName: data.fatherName.trim() } : {}),
    ...(data.caste ? { caste: data.caste.trim() } : {}),
    ...(data.bloodGroup && cleanAndNormalizeBloodGroup(data.bloodGroup)
      ? { bloodGroup: cleanAndNormalizeBloodGroup(data.bloodGroup) }
      : {}),
    ...(data.contactNumber ? { contactNumber: data.contactNumber.trim(), mobileNumber: data.contactNumber.trim() } : {}),
    ...(data.mobileNumber && !data.contactNumber ? { contactNumber: data.mobileNumber.trim(), mobileNumber: data.mobileNumber.trim() } : {}),
    ...(data.fatherOccupation ? { fatherOccupation: data.fatherOccupation.trim() } : {}),
    ...(data.motherOccupation ? { motherOccupation: data.motherOccupation.trim() } : {}),
    ...(data.placeOfBirth ? { placeOfBirth: data.placeOfBirth.trim() } : {}),
    ...(data.aadhaarNo ? { aadhaarNo: data.aadhaarNo.trim() } : {}),
    ...(data.photoUrl ? { photoUrl: data.photoUrl.trim() } : {}),
    ...(data.academicYear ? { academicYear: data.academicYear.trim() } : {}),
    ...(data.previousYearTotalDays !== undefined ? { previousYearTotalDays: data.previousYearTotalDays } : {}),
    ...(data.previousYearPresentDays !== undefined ? { previousYearPresentDays: data.previousYearPresentDays } : {}),
    ...(data.previousYearPercentage !== undefined ? { previousYearPercentage: data.previousYearPercentage } : {}),
    ...(data.height !== undefined ? { height: data.height } : {}),
    ...(data.weight !== undefined ? { weight: data.weight } : {}),
  };

  const docRef = await addDoc(studentsCol, newStudent);
  return {
    id: docRef.id,
    ...newStudent,
  };
}

/**
 * Batch add multiple students into Firestore under the school subcollection.
 * Uses Firestore writeBatch in chunks of 400 items.
 */
export async function bulkAddStudents(
  schoolId: string,
  studentsList: Array<Partial<Omit<Student, 'id' | 'schoolId'>> & { studentName: string; standard: string }>
): Promise<number> {
  if (studentsList.length === 0) return 0;

  const chunkSize = 400;
  let totalAdded = 0;

  for (let i = 0; i < studentsList.length; i += chunkSize) {
    const chunk = studentsList.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const docRef = doc(collection(db, 'schools', schoolId, 'students'));
      const newStudentData = {
        schoolId,
        studentName: item.studentName.trim(),
        standard: item.standard.trim(),
        createdAt: new Date().toISOString(),
        ...(item.diseCode ? { diseCode: item.diseCode.trim() } : {}),
        ...(item.grNumber ? { grNumber: item.grNumber.trim() } : {}),
        ...(item.section ? { section: item.section.trim(), division: item.section.trim() } : {}),
        ...(item.division && !item.section ? { section: item.division.trim(), division: item.division.trim() } : {}),
        ...(item.rollNumber ? { rollNumber: item.rollNumber.trim() } : {}),
        ...(item.gender ? { gender: item.gender } : {}),
        ...(item.dob ? { dob: item.dob.trim() } : {}),
        ...(item.doa ? { doa: item.doa.trim() } : {}),
        ...(item.address ? { address: item.address.trim() } : {}),
        ...(item.motherName ? { motherName: item.motherName.trim() } : {}),
        ...(item.fatherName ? { fatherName: item.fatherName.trim() } : {}),
        ...(item.caste ? { caste: item.caste.trim() } : {}),
        ...(item.bloodGroup && cleanAndNormalizeBloodGroup(item.bloodGroup)
          ? { bloodGroup: cleanAndNormalizeBloodGroup(item.bloodGroup) }
          : {}),
        ...(item.contactNumber ? { contactNumber: item.contactNumber.trim(), mobileNumber: item.contactNumber.trim() } : {}),
        ...(item.mobileNumber && !item.contactNumber ? { contactNumber: item.mobileNumber.trim(), mobileNumber: item.mobileNumber.trim() } : {}),
        ...(item.fatherOccupation ? { fatherOccupation: item.fatherOccupation.trim() } : {}),
        ...(item.motherOccupation ? { motherOccupation: item.motherOccupation.trim() } : {}),
        ...(item.placeOfBirth ? { placeOfBirth: item.placeOfBirth.trim() } : {}),
        ...(item.aadhaarNo ? { aadhaarNo: item.aadhaarNo.trim() } : {}),
        ...(item.photoUrl ? { photoUrl: item.photoUrl.trim() } : {}),
        ...(item.previousYearTotalDays !== undefined ? { previousYearTotalDays: item.previousYearTotalDays } : {}),
        ...(item.previousYearPresentDays !== undefined ? { previousYearPresentDays: item.previousYearPresentDays } : {}),
        ...(item.previousYearPercentage !== undefined ? { previousYearPercentage: item.previousYearPercentage } : {}),
        ...(item.height !== undefined ? { height: item.height } : {}),
        ...(item.weight !== undefined ? { weight: item.weight } : {}),
      };
      batch.set(docRef, newStudentData);
    }

    await batch.commit();
    totalAdded += chunk.length;
  }

  return totalAdded;
}

/**
 * Bulk upsert students: updates existing students if matched by GR No. or Name+Standard,
 * otherwise inserts new student documents. Preserves existing student IDs and mark associations.
 */
export async function bulkUpsertStudents(
  schoolId: string,
  studentsList: Array<Partial<Omit<Student, 'id' | 'schoolId'>> & { studentName: string; standard: string }>,
  existingStudents: Student[]
): Promise<{ added: number; updated: number }> {
  if (studentsList.length === 0) return { added: 0, updated: 0 };

  // Map existing students by grNumber (lowercase) and by name+standard
  const existingByGr = new Map<string, Student>();
  const existingByNameStd = new Map<string, Student>();
  const existingByDise = new Map<string, Student>();

  for (const s of existingStudents) {
    if (s.grNumber && s.grNumber.trim()) {
      existingByGr.set(s.grNumber.trim().toLowerCase(), s);
    }
    const key = `${s.studentName.trim().toLowerCase()}_${String(s.standard).trim()}`;
    existingByNameStd.set(key, s);

    if (s.diseCode && s.diseCode.trim()) {
      existingByDise.set(s.diseCode.trim().toLowerCase(), s);
    }
    if (s.studentStateCode && s.studentStateCode.trim()) {
      existingByDise.set(s.studentStateCode.trim().toLowerCase(), s);
    }
    if (s.aadhaarNo && s.aadhaarNo.trim()) {
      existingByDise.set(s.aadhaarNo.trim().toLowerCase(), s);
    }
  }

  const chunkSize = 400;
  let addedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < studentsList.length; i += chunkSize) {
    const chunk = studentsList.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const cleanName = item.studentName.trim();
      const cleanStd = item.standard.trim();
      const cleanGr = item.grNumber ? item.grNumber.trim().toLowerCase() : '';
      const cleanDise = item.diseCode ? item.diseCode.trim().toLowerCase() : (item.studentStateCode ? item.studentStateCode.trim().toLowerCase() : '');

      // Check for match: first by GR number, then by DISE/State code, then by Name + Standard
      let match: Student | undefined;
      if (cleanGr && existingByGr.has(cleanGr)) {
        match = existingByGr.get(cleanGr);
      } else if (cleanDise && existingByDise.has(cleanDise)) {
        match = existingByDise.get(cleanDise);
      } else {
        const key = `${cleanName.toLowerCase()}_${cleanStd}`;
        if (existingByNameStd.has(key)) {
          match = existingByNameStd.get(key);
        }
      }

      if (match) {
        // Update existing student document, preserving student ID
        const docRef = doc(db, 'schools', schoolId, 'students', match.id);
        const updateData: Record<string, any> = {
          studentName: cleanName,
          standard: cleanStd,
          updatedAt: new Date().toISOString(),
        };

        if (item.diseCode !== undefined) updateData.diseCode = item.diseCode.trim();
        if (item.grNumber !== undefined) updateData.grNumber = item.grNumber.trim();
        if (item.section !== undefined) {
          updateData.section = item.section.trim();
          updateData.division = item.section.trim();
        }
        if (item.rollNumber !== undefined) updateData.rollNumber = item.rollNumber.trim();
        if (item.gender !== undefined) updateData.gender = item.gender;
        if (item.dob !== undefined) updateData.dob = item.dob.trim();
        if (item.doa !== undefined) updateData.doa = item.doa.trim();
        if (item.address !== undefined) updateData.address = item.address.trim();
        if (item.motherName !== undefined) updateData.motherName = item.motherName.trim();
        if (item.fatherName !== undefined) updateData.fatherName = item.fatherName.trim();
        if (item.caste !== undefined) updateData.caste = item.caste.trim();
        if (item.bloodGroup !== undefined) {
          const cleanB = cleanAndNormalizeBloodGroup(item.bloodGroup);
          updateData.bloodGroup = cleanB || '';
        }
        if (item.contactNumber !== undefined) {
          updateData.contactNumber = item.contactNumber.trim();
          updateData.mobileNumber = item.contactNumber.trim();
        }
        if (item.fatherOccupation !== undefined) updateData.fatherOccupation = item.fatherOccupation.trim();
        if (item.motherOccupation !== undefined) updateData.motherOccupation = item.motherOccupation.trim();
        if (item.placeOfBirth !== undefined) updateData.placeOfBirth = item.placeOfBirth.trim();
        if (item.aadhaarNo !== undefined) updateData.aadhaarNo = item.aadhaarNo.trim();
        if (item.photoUrl !== undefined && item.photoUrl.trim() !== '') updateData.photoUrl = item.photoUrl.trim();
        if (item.studentStateCode !== undefined) updateData.studentStateCode = item.studentStateCode.trim();
        if (item.cwsnDisability !== undefined) updateData.cwsnDisability = item.cwsnDisability.trim();
        if (item.medium !== undefined) updateData.medium = item.medium.trim();
        if (item.previousYearTotalDays !== undefined) updateData.previousYearTotalDays = item.previousYearTotalDays;
        if (item.previousYearPresentDays !== undefined) updateData.previousYearPresentDays = item.previousYearPresentDays;
        if (item.previousYearPercentage !== undefined) updateData.previousYearPercentage = item.previousYearPercentage;
        if (item.height !== undefined) updateData.height = item.height;
        if (item.weight !== undefined) updateData.weight = item.weight;

        batch.set(docRef, updateData, { merge: true });
        updatedCount++;
      } else {
        // Add new student document
        const docRef = doc(collection(db, 'schools', schoolId, 'students'));
        const newStudentData = {
          schoolId,
          studentName: cleanName,
          standard: cleanStd,
          createdAt: new Date().toISOString(),
          ...(item.diseCode ? { diseCode: item.diseCode.trim() } : {}),
          ...(item.studentStateCode ? { studentStateCode: item.studentStateCode.trim() } : {}),
          ...(item.cwsnDisability ? { cwsnDisability: item.cwsnDisability.trim() } : {}),
          ...(item.medium ? { medium: item.medium.trim() } : {}),
          ...(item.grNumber ? { grNumber: item.grNumber.trim() } : {}),
          ...(item.section ? { section: item.section.trim(), division: item.section.trim() } : {}),
          ...(item.division && !item.section ? { section: item.division.trim(), division: item.division.trim() } : {}),
          ...(item.rollNumber ? { rollNumber: item.rollNumber.trim() } : {}),
          ...(item.gender ? { gender: item.gender } : {}),
          ...(item.dob ? { dob: item.dob.trim() } : {}),
          ...(item.doa ? { doa: item.doa.trim() } : {}),
          ...(item.address ? { address: item.address.trim() } : {}),
          ...(item.motherName ? { motherName: item.motherName.trim() } : {}),
          ...(item.fatherName ? { fatherName: item.fatherName.trim() } : {}),
          ...(item.caste ? { caste: item.caste.trim() } : {}),
          ...(item.bloodGroup && cleanAndNormalizeBloodGroup(item.bloodGroup)
            ? { bloodGroup: cleanAndNormalizeBloodGroup(item.bloodGroup) }
            : {}),
          ...(item.contactNumber ? { contactNumber: item.contactNumber.trim(), mobileNumber: item.contactNumber.trim() } : {}),
          ...(item.mobileNumber && !item.contactNumber ? { contactNumber: item.mobileNumber.trim(), mobileNumber: item.mobileNumber.trim() } : {}),
          ...(item.fatherOccupation ? { fatherOccupation: item.fatherOccupation.trim() } : {}),
          ...(item.motherOccupation ? { motherOccupation: item.motherOccupation.trim() } : {}),
          ...(item.placeOfBirth ? { placeOfBirth: item.placeOfBirth.trim() } : {}),
          ...(item.aadhaarNo ? { aadhaarNo: item.aadhaarNo.trim() } : {}),
          ...(item.photoUrl ? { photoUrl: item.photoUrl.trim() } : {}),
          ...(item.previousYearTotalDays !== undefined ? { previousYearTotalDays: item.previousYearTotalDays } : {}),
          ...(item.previousYearPresentDays !== undefined ? { previousYearPresentDays: item.previousYearPresentDays } : {}),
          ...(item.previousYearPercentage !== undefined ? { previousYearPercentage: item.previousYearPercentage } : {}),
          ...(item.height !== undefined ? { height: item.height } : {}),
          ...(item.weight !== undefined ? { weight: item.weight } : {}),
        };
        batch.set(docRef, newStudentData);
        addedCount++;
      }
    }

    await batch.commit();
  }

  return { added: addedCount, updated: updatedCount };
}

/**
 * Checks if a given student Child UID (૧૮ અંકનો DISE / State Code) is already registered in another school.
 * A student can only belong to one school at a time across Gujarat.
 * Returns the conflict details including registered school and principal contact, or null if clear.
 */
export async function checkStudentUidConflict(
  uid: string,
  currentSchoolId: string
): Promise<StudentUidConflict | null> {
  if (!uid) return null;
  const cleanUid = uid.replace(/\D/g, '');
  if (!cleanUid || cleanUid.length < 10) return null;

  const queries = [
    query(collectionGroup(db, 'students'), where('studentStateCode', '==', cleanUid)),
    query(collectionGroup(db, 'students'), where('diseCode', '==', cleanUid)),
  ];

  if (uid.trim() !== cleanUid) {
    queries.push(query(collectionGroup(db, 'students'), where('studentStateCode', '==', uid.trim())));
    queries.push(query(collectionGroup(db, 'students'), where('diseCode', '==', uid.trim())));
  }

  try {
    const snapshots = await Promise.all(queries.map((q) => getDocs(q)));

    for (const snap of snapshots) {
      for (const d of snap.docs) {
        const pathParts = d.ref.path.split('/');
        // Path format: schools/{schoolId}/students/{studentId}
        const schoolId = pathParts[1];
        if (schoolId && schoolId !== currentSchoolId) {
          const studentData = d.data();
          let registeredSchool: RegisteredSchoolInfo = {
            id: schoolId,
            schoolName: 'અન્ય શાળા (Other School)',
            diseCode: '',
          };

          try {
            const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
            if (schoolDoc.exists()) {
              const sData = schoolDoc.data() as any;
              registeredSchool = {
                id: schoolId,
                schoolName: sData.schoolName || 'શાળા નામ ઉપલબ્ધ નથી',
                diseCode: sData.diseCode || '',
                principalName: sData.principalName || '',
                principalPhone: sData.principalPhone || sData.contactPhone || '',
                contactPhone: sData.contactPhone || sData.principalPhone || '',
                contactEmail: sData.contactEmail || '',
                district: sData.district || '',
                taluka: sData.taluka || '',
                village: sData.village || '',
                address: sData.address || '',
              };
            }
          } catch (sErr) {
            console.warn('Error fetching registered school details:', sErr);
          }

          return {
            studentId: d.id,
            studentUid: cleanUid || uid.trim(),
            studentName: studentData.studentName || 'વિદ્યાર્થી',
            standard: studentData.standard || '',
            grNumber: studentData.grNumber || '',
            registeredSchoolId: schoolId,
            registeredSchool,
          };
        }
      }
    }
  } catch (err) {
    console.error('Error during cross-school UID check:', err);
  }

  return null;
}

/**
 * Batch checks an array of student UIDs against all other schools in Firestore.
 * Used during Excel import (single Excel or CTS + UDISE+ merge) to identify and block
 * students already registered in other schools before writing to Firestore.
 */
export async function checkBatchStudentUidConflicts(
  uids: string[],
  currentSchoolId: string
): Promise<Map<string, StudentUidConflict>> {
  const conflicts = new Map<string, StudentUidConflict>();
  if (!uids || uids.length === 0) return conflicts;

  // Normalize UIDs and remove duplicates & empties
  const cleanUidSet = new Set<string>();
  for (const raw of uids) {
    if (!raw) continue;
    const clean = raw.replace(/\D/g, '');
    if (clean && clean.length >= 10) {
      cleanUidSet.add(clean);
    }
  }

  const uniqueUids = Array.from(cleanUidSet);
  if (uniqueUids.length === 0) return conflicts;

  const schoolCache = new Map<string, RegisteredSchoolInfo>();

  // Process in chunks of 25 (Firestore 'in' operator max is 30)
  const chunkSize = 25;
  for (let i = 0; i < uniqueUids.length; i += chunkSize) {
    const chunk = uniqueUids.slice(i, i + chunkSize);

    try {
      const [snapState, snapDise] = await Promise.all([
        getDocs(query(collectionGroup(db, 'students'), where('studentStateCode', 'in', chunk))),
        getDocs(query(collectionGroup(db, 'students'), where('diseCode', 'in', chunk))),
      ]);

      const allDocs = [...snapState.docs, ...snapDise.docs];
      for (const d of allDocs) {
        const pathParts = d.ref.path.split('/');
        const schoolId = pathParts[1];
        if (schoolId && schoolId !== currentSchoolId) {
          const studentData = d.data();
          const matchedUid =
            (studentData.studentStateCode ? studentData.studentStateCode.replace(/\D/g, '') : '') ||
            (studentData.diseCode ? studentData.diseCode.replace(/\D/g, '') : '');

          if (matchedUid && !conflicts.has(matchedUid)) {
            let schoolInfo = schoolCache.get(schoolId);
            if (!schoolInfo) {
              try {
                const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
                if (schoolDoc.exists()) {
                  const sData = schoolDoc.data() as any;
                  schoolInfo = {
                    id: schoolId,
                    schoolName: sData.schoolName || 'શાળા નામ ઉપલબ્ધ નથી',
                    diseCode: sData.diseCode || '',
                    principalName: sData.principalName || '',
                    principalPhone: sData.principalPhone || sData.contactPhone || '',
                    contactPhone: sData.contactPhone || sData.principalPhone || '',
                    contactEmail: sData.contactEmail || '',
                    district: sData.district || '',
                    taluka: sData.taluka || '',
                    village: sData.village || '',
                    address: sData.address || '',
                  };
                } else {
                  schoolInfo = {
                    id: schoolId,
                    schoolName: 'અન્ય શાળા (Other School)',
                    diseCode: '',
                  };
                }
              } catch {
                schoolInfo = {
                  id: schoolId,
                  schoolName: 'અન્ય શાળા (Other School)',
                  diseCode: '',
                };
              }
              schoolCache.set(schoolId, schoolInfo);
            }

            conflicts.set(matchedUid, {
              studentId: d.id,
              studentUid: matchedUid,
              studentName: studentData.studentName || 'વિદ્યાર્થી',
              standard: studentData.standard || '',
              grNumber: studentData.grNumber || '',
              registeredSchoolId: schoolId,
              registeredSchool: schoolInfo,
            });
          }
        }
      }
    } catch (batchErr) {
      console.error('Batch cross-school UID check error:', batchErr);
    }
  }

  return conflicts;
}

/**
 * Update an existing student record
 */
export async function updateStudent(
  schoolId: string,
  studentId: string,
  data: Partial<Omit<Student, 'id' | 'schoolId' | 'createdAt'>>
): Promise<void> {
  const studentDocRef = doc(db, 'schools', schoolId, 'students', studentId);
  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  // Safe stripping of undefined values so Firestore updateDoc never throws invalid field value
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      updateData[key] = value;
    }
  }

  if (data.bloodGroup !== undefined) {
    updateData.bloodGroup = cleanAndNormalizeBloodGroup(data.bloodGroup) || '';
  }

  await updateDoc(studentDocRef, updateData);
}

/**
 * Delete a student record
 */
export async function deleteStudent(schoolId: string, studentId: string): Promise<void> {
  const studentDocRef = doc(db, 'schools', schoolId, 'students', studentId);
  await deleteDoc(studentDocRef);
}

/**
 * Bulk delete multiple students by IDs in chunks of 400
 */
export async function bulkDeleteStudents(schoolId: string, studentIds: string[]): Promise<number> {
  if (!studentIds || studentIds.length === 0) return 0;

  const chunkSize = 400;
  let deletedCount = 0;

  for (let i = 0; i < studentIds.length; i += chunkSize) {
    const chunk = studentIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const id of chunk) {
      const studentDocRef = doc(db, 'schools', schoolId, 'students', id);
      batch.delete(studentDocRef);
    }

    await batch.commit();
    deletedCount += chunk.length;
  }

  return deletedCount;
}

/**
 * Delete ALL student records belonging to this school
 */
export async function deleteAllStudents(schoolId: string): Promise<number> {
  const studentsCol = collection(db, 'schools', schoolId, 'students');
  const snapshot = await getDocs(studentsCol);
  const ids = snapshot.docs.map((docSnap) => docSnap.id);
  return bulkDeleteStudents(schoolId, ids);
}

/**
 * Fetch all marks records belonging to the school
 * Storage path: /schools/{schoolId}/marks
 */
export async function getMarks(schoolId: string): Promise<MarkRecord[]> {
  const marksCol = collection(db, 'schools', schoolId, 'marks');
  const snapshot = await getDocs(marksCol);

  const list = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<MarkRecord, 'id'>),
  }));

  list.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return list;
}

/**
 * Real-time subscription to school marks collection.
 * Enables live simultaneous multi-teacher and multi-device updates.
 */
export function subscribeToMarks(
  schoolId: string,
  callback: (marks: MarkRecord[]) => void
): () => void {
  const marksCol = collection(db, 'schools', schoolId, 'marks');
  return onSnapshot(
    marksCol,
    (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<MarkRecord, 'id'>),
      }));
      list.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      callback(list);
    },
    (error) => {
      console.error('Realtime marks subscription error:', error);
    }
  );
}

/**
 * Add a new mark evaluation record for a student
 */
export async function addMarkRecord(
  schoolId: string,
  data: Omit<MarkRecord, 'id' | 'schoolId' | 'createdAt'>
): Promise<MarkRecord> {
  const marksCol = collection(db, 'schools', schoolId, 'marks');
  const now = new Date().toISOString();
  const newMark: Omit<MarkRecord, 'id'> = {
    ...data,
    schoolId,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(marksCol, newMark);
  return {
    id: docRef.id,
    ...newMark,
  };
}

/**
 * Helper to strip undefined values so Firestore never throws
 * "Unsupported field value: undefined"
 */
function stripUndefinedValues<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Save or update Ekam Kasoti - 1 marks for multiple students in a batch
 * Stored under /schools/{schoolId}/marks/{studentId_subjectId}
 */
export async function saveBatchEkamKasotiMarks(
  schoolId: string,
  records: Array<{
    studentId: string;
    studentName: string;
    grNumber?: string;
    rollNumber?: string;
    standard: string;
    division?: string;
    examType: string;
    academicYear: string;
    subjectId: string;
    subjectName: string;
    questionMarks: Record<string, number>;
    totalObtained: number;
    totalMax: number;
    percentage?: number;
    overallGrade?: string;
  }>
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  for (const record of records) {
    const docId = `${record.studentId}_${record.subjectId}`;
    const docRef = doc(db, 'schools', schoolId, 'marks', docId);
    
    // Clean all undefined values so Firestore writeBatch.set never throws
    const cleanDocData = stripUndefinedValues({
      ...record,
      schoolId,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(docRef, cleanDocData, { merge: true });
  }

  await batch.commit();
}

/**
 * Save or update batch exam marks for any standard, exam type, and subject.
 * Stored under /schools/{schoolId}/marks/{studentId_examId_subjectId}
 */
export async function saveBatchExamMarks(
  schoolId: string,
  records: Array<{
    studentId: string;
    studentName: string;
    grNumber?: string;
    rollNumber?: string;
    standard: string;
    division?: string;
    examId: string; // 'pratham' | 'dwitiya' | 'varshik' | 'prelim' | 'internal'
    examType: string; // Display name
    academicYear: string;
    subjectId: string;
    subjectName: string;
    totalObtained: number;
    totalMax: number;
    percentage?: number;
    overallGrade?: string; // e.g. 'A1', 'B2', or 'AB'
    questionMarks?: Record<string, number>;
  }>
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  for (const record of records) {
    const cleanExamId = (record.examId || 'exam').toLowerCase().trim();
    const docId = `${record.studentId}_${cleanExamId}_${record.subjectId}`;
    const docRef = doc(db, 'schools', schoolId, 'marks', docId);

    const cleanDocData = stripUndefinedValues({
      ...record,
      schoolId,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(docRef, cleanDocData, { merge: true });
  }

  await batch.commit();
}

/**
 * Save or update Ekam Kasoti marks for a single student automatically as typed.
 * Stored under /schools/{schoolId}/marks/{studentId_subjectId}
 */
export async function saveSingleStudentMark(
  schoolId: string,
  record: {
    studentId: string;
    studentName: string;
    grNumber?: string;
    rollNumber?: string;
    standard: string;
    division?: string;
    examType: string;
    academicYear: string;
    subjectId: string;
    subjectName: string;
    questionMarks: Record<string, number>;
    totalObtained: number;
    totalMax: number;
    percentage?: number;
    overallGrade?: string;
  }
): Promise<void> {
  const docId = `${record.studentId}_${record.subjectId}`;
  const docRef = doc(db, 'schools', schoolId, 'marks', docId);
  const now = new Date().toISOString();

  const cleanDocData = stripUndefinedValues({
    ...record,
    schoolId,
    createdAt: now,
    updatedAt: now,
  });

  await setDoc(docRef, cleanDocData, { merge: true });
}

/**
 * Delete a mark record
 */
export async function deleteMarkRecord(schoolId: string, markId: string): Promise<void> {
  const markDocRef = doc(db, 'schools', schoolId, 'marks', markId);
  await deleteDoc(markDocRef);
}

/**
 * Test & verify cross-school security isolation against Firestore Rules.
 * Attempts to read another school's student collection.
 * This proves to administrators that Firestore Security Rules actively block unauthorized access.
 */
export async function testCrossSchoolAccessPrevention(currentSchoolId: string, targetForeignId: string): Promise<{
  blockedSuccessfully: boolean;
  message: string;
  errorName?: string;
}> {
  try {
    const foreignCol = collection(db, 'schools', targetForeignId, 'students');
    await getDocs(foreignCol);
    return {
      blockedSuccessfully: false,
      message: 'SECURITY WARNING: Query succeeded when it should have been blocked!',
    };
  } catch (err: any) {
    const isPermissionDenied =
      err?.code === 'permission-denied' ||
      err?.message?.includes('insufficient permissions') ||
      err?.message?.includes('Missing or insufficient permissions');

    return {
      blockedSuccessfully: isPermissionDenied,
      message: isPermissionDenied
        ? 'Security Verified: Firestore Security Rules blocked the unauthorized cross-school request with permission-denied.'
        : `Request failed as expected: ${err.message}`,
      errorName: err.code || err.name,
    };
  }
}

/**
 * Update school profile information.
 * Excludes protected keys (status, ownerUid, id, diseCode) to satisfy Firestore Security Rules.
 */
export async function updateSchoolProfile(
  schoolId: string,
  profileData: {
    schoolName?: string;
    district?: string;
    address?: string;
    village?: string;
    taluka?: string;
    schoolType?: string;
    medium?: string;
    principalName?: string;
    principalPhone?: string;
    contactEmail?: string;
    contactPhone?: string;
    establishedYear?: string;
    logoUrl?: string;
  }
): Promise<void> {
  const schoolRef = doc(db, 'schools', schoolId);
  const cleanData = stripUndefinedValues({
    ...profileData,
    updatedAt: new Date().toISOString(),
  });

  // Ensure forbidden keys are never included
  delete cleanData.status;
  delete cleanData.ownerUid;
  delete cleanData.id;
  delete cleanData.diseCode;

  await updateDoc(schoolRef, cleanData);
}

/**
 * Scans all students of a school and automatically fixes any corrupted or misplaced blood group entries.
 * - Non-blood values (e.g. 'Gujarati', 'General', 'Yes', 'No') are cleared from bloodGroup and moved to medium/caste if applicable.
 * - Non-standard blood group entries (e.g. 'b+', 'B +ve', '1', 'o positive') are normalized to canonical forms ('B+', 'O+').
 * - Misplaced blood groups in other fields (e.g., caste or medium holding a valid blood group) are recovered.
 * Writes batch updates to Firestore in chunks of 400.
 */
export async function fixSchoolStudentsBloodGroups(
  schoolId: string,
  students: Student[]
): Promise<{
  totalScanned: number;
  fixedCount: number;
  details: Array<{
    id: string;
    studentName: string;
    grNumber?: string;
    standard: string;
    oldBloodGroup?: string;
    newBloodGroup?: string;
    action: string;
    description: string;
  }>;
}> {
  const details: Array<{
    id: string;
    studentName: string;
    grNumber?: string;
    standard: string;
    oldBloodGroup?: string;
    newBloodGroup?: string;
    action: string;
    description: string;
  }> = [];

  const studentsToUpdate: Array<{
    id: string;
    updateData: Record<string, any>;
    detail: any;
  }> = [];

  for (const st of students) {
    const diag = diagnoseStudentBloodGroup(st);

    if (diag.status === 'valid' || diag.status === 'empty') {
      continue; // Clean entry, no action required
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    let action = '';
    if (diag.status === 'normalized') {
      updateData.bloodGroup = diag.newBloodGroup || '';
      action = `પ્રમાણિત કર્યું (${diag.oldBloodGroup} -> ${diag.newBloodGroup})`;
    } else if (diag.status === 'invalid_cleared') {
      updateData.bloodGroup = '';
      action = `અયોગ્ય એન્ટ્રી "${diag.oldBloodGroup}" દૂર કરી`;
      if (diag.migratedToField === 'medium' && (!st.medium || st.medium === '')) {
        updateData.medium = diag.migratedValue;
        action += ` (માધ્યમ: ${diag.migratedValue} માં ખસેડાયું)`;
      } else if (diag.migratedToField === 'caste' && (!st.caste || st.caste === '')) {
        updateData.caste = diag.migratedValue;
        action += ` (જ્ઞાતિ: ${diag.migratedValue} માં ખસેડાયું)`;
      }
    } else if (diag.status === 'misplaced_recovered') {
      updateData.bloodGroup = diag.newBloodGroup || '';
      action = `${diag.recoveredFromField} માંથી બ્લડ ગ્રૂપ ${diag.newBloodGroup} પુનઃપ્રાપ્ત કર્યું`;
      if (diag.cleanRollNumber) {
        updateData.rollNumber = '';
        action += ` (અને રોલ નંબર ખાલી કર્યો)`;
      }
      if (diag.fixedSection) {
        updateData.section = diag.fixedSection;
      }
      if (diag.fixedDob && (!st.dob || st.dob === '')) {
        updateData.dob = diag.fixedDob;
      }
    }

    const detailItem = {
      id: st.id,
      studentName: st.studentName,
      grNumber: st.grNumber,
      standard: String(st.standard),
      oldBloodGroup: diag.oldBloodGroup,
      newBloodGroup: diag.newBloodGroup,
      action,
      description: diag.description,
    };

    details.push(detailItem);
    studentsToUpdate.push({
      id: st.id,
      updateData,
      detail: detailItem,
    });
  }

  // Execute in Firestore batches of up to 400
  const chunkSize = 400;
  for (let i = 0; i < studentsToUpdate.length; i += chunkSize) {
    const chunk = studentsToUpdate.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const studentDocRef = doc(db, 'schools', schoolId, 'students', item.id);
      batch.update(studentDocRef, item.updateData);
    }

    await batch.commit();
  }

  return {
    totalScanned: students.length,
    fixedCount: studentsToUpdate.length,
    details,
  };
}

/**
 * Save record of parent message broadcast to Firestore.
 * Path: /schools/{schoolId}/parent_broadcasts/{broadcastId}
 */
export async function saveParentMessageBroadcast(
  schoolId: string,
  record: Omit<ParentBroadcastRecord, 'id'>
): Promise<string> {
  const col = collection(db, 'schools', schoolId, 'parent_broadcasts');
  const docRef = await addDoc(col, {
    ...record,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Fetch past parent message broadcasts for the school.
 */
export async function getParentMessageBroadcasts(
  schoolId: string
): Promise<ParentBroadcastRecord[]> {
  try {
    const col = collection(db, 'schools', schoolId, 'parent_broadcasts');
    const q = query(col, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ParentBroadcastRecord[];
  } catch (err) {
    console.error('Error fetching parent message broadcasts:', err);
    return [];
  }
}

/**
 * Fetch all registered schools for the public Admission Directory.
 * Accessible from the login screen so students/parents can find their school.
 */
export async function getSchoolsForAdmissionDirectory(): Promise<School[]> {
  try {
    const schoolsCol = collection(db, 'schools');
    const snap = await getDocs(schoolsCol);
    const schools = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as School[];

    // Filter approved schools or active legacy schools
    return schools.filter((s) => s.status === 'approved' || !s.status);
  } catch (err) {
    console.error('Error fetching schools for admission directory:', err);
    return [];
  }
}

/**
 * Update school admission settings (open/closed, dates, instructions).
 * Stored on the school document: /schools/{schoolId}
 */
export async function updateSchoolAdmissionSettings(
  schoolId: string,
  settings: SchoolAdmissionSettings
): Promise<void> {
  const schoolRef = doc(db, 'schools', schoolId);
  await updateDoc(schoolRef, {
    admissionSettings: {
      ...settings,
      updatedAt: new Date().toISOString(),
    },
  });
}

/**
 * Submit an online admission application from student/parent.
 * Path: /schools/{schoolId}/admissions/{applicationId}
 */
export async function submitAdmissionApplication(
  schoolId: string,
  application: Omit<AdmissionApplication, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const col = collection(db, 'schools', schoolId, 'admissions');
  const now = new Date().toISOString();
  const docRef = await addDoc(col, {
    ...application,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

/**
 * Real-time listener for school's admission applications.
 * Path: /schools/{schoolId}/admissions
 */
export function subscribeToAdmissionApplications(
  schoolId: string,
  callback: (applications: AdmissionApplication[]) => void
): () => void {
  const col = collection(db, 'schools', schoolId, 'admissions');
  return onSnapshot(
    col,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AdmissionApplication[];
      // Sort newest first
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    (err) => {
      console.error('Error in admission applications listener:', err);
    }
  );
}

/**
 * Update an existing admission application (e.g. edit student details before admitting).
 */
export async function updateAdmissionApplication(
  schoolId: string,
  applicationId: string,
  data: Partial<AdmissionApplication>
): Promise<void> {
  const ref = doc(db, 'schools', schoolId, 'admissions', applicationId);
  await updateDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Accept student admission application:
 * 1. Creates a new Student record in /schools/{schoolId}/students with the specified Admission Date (DOA)
 *    and other fields from the form.
 * 2. Marks the application as 'approved' with the admission date and createdStudentId.
 */
export async function acceptAdmissionApplication(
  schoolId: string,
  application: AdmissionApplication,
  admissionDate: string
): Promise<Student> {
  // Normalize blood group
  const cleanBlood = cleanAndNormalizeBloodGroup(application.bloodGroup) || application.bloodGroup || '';

  // 1. Create the new Student record in school's students subcollection
  const studentsCol = collection(db, 'schools', schoolId, 'students');
  const now = new Date().toISOString();

  const newStudentData: Omit<Student, 'id'> = {
    schoolId,
    studentName: application.studentName.trim(),
    standard: String(application.admissionStandard).trim(),
    dob: application.dob.trim(),
    doa: admissionDate.trim(), // Date of Admission entered by school
    diseCode: application.childUid.trim(), // 18-digit child UID
    motherName: application.motherName.trim(),
    gender: application.gender,
    bloodGroup: cleanBlood,
    caste: application.category,
    contactNumber: application.contactNumber.trim(),
    address: application.address.trim(),
    photoUrl: application.photoUrl || undefined,
    previousYearTotalDays: application.previousYearTotalDays || undefined,
    previousYearPresentDays: application.previousYearPresentDays || undefined,
    previousYearPercentage: application.previousYearPercentage || undefined,
    height: application.height || undefined,
    weight: application.weight || undefined,
    admissionApplicationId: application.id,
    createdAt: now,
    updatedAt: now,
    // rollNumber, grNumber, and section are intentionally blank for the school to assign later
  };

  const studentDocRef = await addDoc(studentsCol, newStudentData);

  // 2. Mark the admission application as approved
  const appRef = doc(db, 'schools', schoolId, 'admissions', application.id);
  await updateDoc(appRef, {
    status: 'approved',
    admissionDate: admissionDate.trim(),
    createdStudentId: studentDocRef.id,
    reviewedAt: now,
    updatedAt: now,
  });

  return {
    id: studentDocRef.id,
    ...newStudentData,
  };
}

/**
 * Reject an admission application with an optional reason.
 */
export async function rejectAdmissionApplication(
  schoolId: string,
  applicationId: string,
  reason?: string
): Promise<void> {
  const ref = doc(db, 'schools', schoolId, 'admissions', applicationId);
  await updateDoc(ref, {
    status: 'rejected',
    rejectionReason: reason || 'પ્રવેશ માન્ય રાખેલ નથી',
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete an admission application.
 */
export async function deleteAdmissionApplication(
  schoolId: string,
  applicationId: string
): Promise<void> {
  const ref = doc(db, 'schools', schoolId, 'admissions', applicationId);
  await deleteDoc(ref);
}


