import React, { useState, useRef, useMemo } from 'react';
import { School, Student, AllowedStandard, StudentUidConflict } from '../types';
import {
  addStudent,
  updateStudent,
  deleteStudent,
  bulkDeleteStudents,
  deleteAllStudents,
  bulkUpsertStudents,
  fixSchoolStudentsBloodGroups,
  checkStudentUidConflict,
  checkBatchStudentUidConflicts,
} from '../services/firestoreService';
import { StudentConflictModal } from './StudentConflictModal';
import {
  downloadStudentTemplate,
  downloadCtsTemplate,
  downloadUdisePlusTemplate,
  parseStudentsExcelFile,
  parseDualFiles,
  exportStudentsExcel,
  ExcelParseResult,
  DualFileMergeResult,
  MergedStudentRow,
  ParsedStudentRow,
  StudentFieldChange,
} from '../utils/excelUtils';
import { printStudentIdCards } from '../utils/idCardPdf';
import { compressStudentPhoto } from '../utils/imageUtils';
import { StudentProfileModal } from './StudentProfileModal';
import { ImportConfirmationModal } from './ImportConfirmationModal';
import {
  cleanAndNormalizeBloodGroup,
  diagnoseStudentBloodGroup,
  isValidBloodGroup,
  COMMON_BLOOD_GROUPS,
  BloodGroupDiagnosis,
} from '../utils/bloodGroupUtils';
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  Edit3,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  X,
  Loader2,
  Filter,
  Check,
  Building2,
  GraduationCap,
  CreditCard,
  Eye,
  Camera,
  CheckSquare,
  Square,
  FileText,
  User,
  Heart,
  Phone,
  Printer,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  LayoutGrid,
  List,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { useDeviceType } from '../utils/useDeviceType';

interface StudentsManagerProps {
  school: School;
  schoolId: string;
  students: Student[];
  onRefresh: () => void;
  onBack?: () => void;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({
  school,
  schoolId,
  students,
  onRefresh,
  onBack,
}) => {
  const device = useDeviceType();
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [viewLayout, setViewLayout] = useState<'auto' | 'cards' | 'table'>('auto');
  const isCardView = viewLayout === 'cards' || (viewLayout === 'auto' && device.effectiveType === 'mobile');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStandardFilter, setSelectedStandardFilter] = useState<string>('ALL');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('ALL');
  const [selectedBloodFilter, setSelectedBloodFilter] = useState<string>('ALL');

  // Multi-selection for ID Card generation or bulk operations
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Profile Modal State
  const [viewingProfileStudent, setViewingProfileStudent] = useState<Student | null>(null);

  // Manual Add Modal / Section State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    studentName: '',
    standard: '9' as AllowedStandard,
    grNumber: '',
    section: '',
    rollNumber: '',
    dob: '',
    doa: '',
    gender: 'Boy' as 'Boy' | 'Girl' | 'Other',
    bloodGroup: '',
    caste: '',
    contactNumber: '',
    fatherName: '',
    fatherOccupation: '',
    motherName: '',
    motherOccupation: '',
    address: '',
    placeOfBirth: '',
    aadhaarNo: '',
    photoUrl: '',
    diseCode: '',
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);

  // Quick Edit Modal State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal State
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Excel Upload & Preview State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFilterTab, setPreviewFilterTab] = useState<'all' | 'valid' | 'invalid' | 'updates'>('all');
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

  // Import Confirmation Popup State (to review new vs update count & changed fields)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmImportMode, setConfirmImportMode] = useState<'single' | 'dual'>('single');

  // Dual-File (CTS + UDISE+) Import State
  const [isDualImportModalOpen, setIsDualImportModalOpen] = useState(false);
  const [ctsFile, setCtsFile] = useState<File | null>(null);
  const [udiseFile, setUdiseFile] = useState<File | null>(null);
  const [dualParseResult, setDualParseResult] = useState<DualFileMergeResult | null>(null);
  const [isParsingDual, setIsParsingDual] = useState(false);
  const [dualFilterTab, setDualFilterTab] = useState<'all' | 'matched' | 'cts_only' | 'invalid' | 'updates'>('all');
  const [isExecutingDualImport, setIsExecutingDualImport] = useState(false);
  const ctsInputRef = useRef<HTMLInputElement>(null);
  const udiseInputRef = useRef<HTMLInputElement>(null);

  // ID Card Generation Modal State
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
  const [idCardStdSelection, setIdCardStdSelection] = useState<string>('ALL');

  // Delete All / Bulk Delete Modal State
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deleteAllScope, setDeleteAllScope] = useState<'all' | 'filtered' | 'selected'>('all');
  const [deleteAllConfirmInput, setDeleteAllConfirmInput] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Cross-School Student UID Conflict Modal & WhatsApp State
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [activeConflict, setActiveConflict] = useState<StudentUidConflict | null>(null);
  const [batchConflictsList, setBatchConflictsList] = useState<StudentUidConflict[]>([]);
  const [pendingImportRemainingRows, setPendingImportRemainingRows] = useState<any[] | null>(null);
  const [inlineUidConflict, setInlineUidConflict] = useState<StudentUidConflict | null>(null);
  const [isCheckingInlineUid, setIsCheckingInlineUid] = useState(false);

  // Derive unique sections for filtering
  const availableSections = useMemo(() => {
    const secs = new Set<string>();
    students.forEach((s) => {
      const sec = s.section || s.division;
      if (sec && sec.trim()) secs.add(sec.trim().toUpperCase());
    });
    return Array.from(secs).sort();
  }, [students]);

  // Quick stats calculation
  const counts = useMemo(() => {
    let std9 = 0;
    let std10 = 0;
    let std11 = 0;
    let std12 = 0;
    let boys = 0;
    let girls = 0;

    for (const student of students) {
      const std = String(student.standard).replace(/^class\s*/i, '').trim();
      if (std === '9') std9++;
      else if (std === '10') std10++;
      else if (std === '11') std11++;
      else if (std === '12') std12++;

      const gStr = (student.gender || '').trim().toLowerCase();
      if (gStr === 'boy' || gStr === 'male' || gStr === 'm' || gStr === 'કુમાર' || gStr === 'પુરુષ' || gStr === 'છોકરો') boys++;
      else if (gStr === 'girl' || gStr === 'female' || gStr === 'f' || gStr === 'કન્યા' || gStr === 'સ્ત્રી' || gStr === 'છોકરી') girls++;
    }

    return {
      std9,
      std10,
      std11,
      std12,
      boys,
      girls,
      total: students.length,
    };
  }, [students]);

  // Filtered students list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const normStd = String(s.standard).replace(/^class\s*/i, '').trim();
      const normSec = (s.section || s.division || '').trim().toUpperCase();

      const matchesStandard =
        selectedStandardFilter === 'ALL' || normStd === selectedStandardFilter;
      const matchesSection =
        selectedSectionFilter === 'ALL' || normSec === selectedSectionFilter;
      const matchesGender =
        selectedGenderFilter === 'ALL' || s.gender === selectedGenderFilter;
      const studentBlood = cleanAndNormalizeBloodGroup(s.bloodGroup) || '';
      const matchesBlood =
        selectedBloodFilter === 'ALL' || studentBlood === selectedBloodFilter;

      if (!matchesStandard || !matchesSection || !matchesGender || !matchesBlood) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();

      return (
        s.studentName.toLowerCase().includes(q) ||
        (s.grNumber && s.grNumber.toLowerCase().includes(q)) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
        (s.contactNumber && s.contactNumber.includes(q)) ||
        (s.diseCode && s.diseCode.includes(q))
      );
    });
  }, [
    students,
    selectedStandardFilter,
    selectedSectionFilter,
    selectedGenderFilter,
    selectedBloodFilter,
    searchQuery,
  ]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  // Trigger Print ID Cards
  const handleGenerateIdCards = (targetStudents: Student[]) => {
    if (targetStudents.length === 0) {
      alert('કૃપા કરીને આઈડી કાર્ડ છાપવા માટે વિદ્યાર્થીઓ પસંદ કરો.');
      return;
    }
    printStudentIdCards(school, targetStudents);
  };

  // Handle Photo selection for Manual Add
  const handleAddPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressStudentPhoto(file);
      setAddForm((prev) => ({ ...prev, photoUrl: compressed }));
    } catch (err: any) {
      alert(err.message || 'ઇમેજ પ્રોસેસ કરવામાં ભૂલ આવી.');
    }
  };

  // Handle Child UID Blur check in Manual Add Form
  const handleCheckAddUidOnBlur = async () => {
    const raw = addForm.diseCode.trim();
    const clean = raw.replace(/\D/g, '');
    if (clean.length >= 18) {
      setIsCheckingInlineUid(true);
      try {
        const conflict = await checkStudentUidConflict(clean, schoolId);
        setInlineUidConflict(conflict);
      } catch (err) {
        console.warn('Error checking inline UID conflict:', err);
      } finally {
        setIsCheckingInlineUid(false);
      }
    } else {
      setInlineUidConflict(null);
    }
  };

  // Submit Manual Add Student Form
  const handleSubmitAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);

    // 1. વિદ્યાર્થીનું નામ (Name) - ફરજિયાત
    const name = addForm.studentName.trim();
    if (!name) {
      setAddError('વિદ્યાર્થીનું નામ (Name as in GR) ફરજિયાત છે.');
      return;
    }

    // 2. વિદ્યાર્થી Child UID (DISE કોડ) - ૧૮ અંક ફરજિયાત
    const rawAddDise = addForm.diseCode.trim();
    const digitsAddDise = rawAddDise.replace(/\D/g, '');
    if (!rawAddDise) {
      setAddError('વિદ્યાર્થીનો ૧૮ અંકનો Child UID (DISE કોડ) ફરજિયાત છે.');
      return;
    }
    if (digitsAddDise.length < 18) {
      setAddError(`Child UID ઓછામાં ઓછો ૧૮ અંકનો હોવો જરૂરી છે (હાલ ${digitsAddDise.length} અંક છે).`);
      return;
    }
    const cleanAddDise = digitsAddDise.slice(0, 18);

    // Check duplicate Child UID in current school
    const dupUid = students.some((s) => {
      const sUid = (s.studentStateCode || s.diseCode || '').replace(/\D/g, '');
      return sUid && sUid.length >= 18 && sUid.slice(0, 18) === cleanAddDise;
    });
    if (dupUid) {
      setAddError(`આ Child UID (${cleanAddDise}) અન્ય વિદ્યાર્થી માટે પહેલેથી નોંધાયેલ છે.`);
      return;
    }

    // 3. ધોરણ (Standard) - ફરજિયાત
    if (!addForm.standard) {
      setAddError('ધોરણ (Standard) પસંદ કરવું ફરજિયાત છે.');
      return;
    }

    // 4. જાતિ (Gender: કુમાર / કન્યા) - ફરજિયાત
    if (!addForm.gender) {
      setAddError('જાતિ (Gender: કુમાર / કન્યા) પસંદ કરવી ફરજિયાત છે.');
      return;
    }

    // 5. જન્મ તારીખ (DOB) - ફરજિયાત
    const dob = addForm.dob.trim();
    if (!dob) {
      setAddError('જન્મ તારીખ (DOB) દાખલ કરવી ફરજિયાત છે.');
      return;
    }

    // Check duplicate GR if entered (optional)
    if (addForm.grNumber.trim()) {
      const dupGr = students.some(
        (s) => s.grNumber && s.grNumber.trim().toLowerCase() === addForm.grNumber.trim().toLowerCase()
      );
      if (dupGr) {
        setAddError(`આ G.R. નંબર (${addForm.grNumber}) પહેલેથી અન્ય વિદ્યાર્થી માટે નોંધાયેલ છે.`);
        return;
      }
    }

    // Check duplicate Name + Standard
    const dupNameStd = students.some(
      (s) =>
        s.studentName.trim().toLowerCase() === name.toLowerCase() &&
        String(s.standard).replace(/^class\s*/i, '').trim() === addForm.standard
    );
    if (dupNameStd) {
      setAddError(`ધોરણ ${addForm.standard} માં "${name}" નામનો વિદ્યાર્થી પહેલેથી નોંધાયેલ છે.`);
      return;
    }

    setAddSubmitting(true);
    try {
      // Cross-School Check: Child UID cannot exist in any other school
      const crossConflict = await checkStudentUidConflict(cleanAddDise, schoolId);
      if (crossConflict) {
        setActiveConflict(crossConflict);
        setBatchConflictsList([]);
        setConflictModalOpen(true);
        setAddSubmitting(false);
        return;
      }

      await addStudent(schoolId, {
        studentName: name,
        standard: addForm.standard,
        diseCode: cleanAddDise,
        studentStateCode: cleanAddDise,
        grNumber: addForm.grNumber.trim() || undefined,
        section: addForm.section.trim() || undefined,
        division: addForm.section.trim() || undefined,
        rollNumber: addForm.rollNumber.trim() || undefined,
        dob: dob,
        doa: addForm.doa.trim() || undefined,
        gender: addForm.gender,
        bloodGroup: cleanAndNormalizeBloodGroup(addForm.bloodGroup) || undefined,
        caste: addForm.caste.trim() || undefined,
        contactNumber: addForm.contactNumber.trim() || undefined,
        fatherName: addForm.fatherName.trim() || undefined,
        fatherOccupation: addForm.fatherOccupation.trim() || undefined,
        motherName: addForm.motherName.trim() || undefined,
        motherOccupation: addForm.motherOccupation.trim() || undefined,
        address: addForm.address.trim() || undefined,
        placeOfBirth: addForm.placeOfBirth.trim() || undefined,
        aadhaarNo: addForm.aadhaarNo.trim() || undefined,
        photoUrl: addForm.photoUrl || undefined,
      });

      setAddSuccess(`વિદ્યાર્થી "${name}" સફળતાપૂર્વક ઉમેરાઈ ગયો!`);
      // Reset form
      setAddForm({
        studentName: '',
        standard: '9',
        grNumber: '',
        section: '',
        rollNumber: '',
        dob: '',
        doa: '',
        gender: 'Boy',
        bloodGroup: '',
        caste: '',
        contactNumber: '',
        fatherName: '',
        fatherOccupation: '',
        motherName: '',
        motherOccupation: '',
        address: '',
        placeOfBirth: '',
        aadhaarNo: '',
        photoUrl: '',
        diseCode: '',
      });
      onRefresh();
      setTimeout(() => {
        setAddSuccess(null);
        setIsAddModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setAddError(err.message || 'વિદ્યાર્થી ઉમેરવામાં ભૂલ આવી.');
    } finally {
      setAddSubmitting(false);
    }
  };

  // Handle Quick Edit Save
  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditError(null);

    const trimmedName = (editForm.studentName || '').trim();
    if (!trimmedName) {
      setEditError('વિદ્યાર્થીનું નામ જરૂરી છે.');
      return;
    }

    setEditSubmitting(true);
    try {
      const rawEditDise = (editForm.diseCode || editForm.studentStateCode || '').trim();
      const digitsEditDise = rawEditDise.replace(/\D/g, '');
      let cleanEditDise: string | undefined = undefined;
      // Reject internal Firestore document IDs (contain letters)
      if (rawEditDise && !/[a-zA-Z]/.test(rawEditDise)) {
        cleanEditDise = digitsEditDise.length >= 18 ? digitsEditDise.slice(0, 18) : (rawEditDise || undefined);
      }

      if (cleanEditDise) {
        const crossConflict = await checkStudentUidConflict(cleanEditDise, schoolId);
        if (crossConflict && crossConflict.studentId !== editingStudent.id) {
          setActiveConflict(crossConflict);
          setBatchConflictsList([]);
          setConflictModalOpen(true);
          setEditSubmitting(false);
          return;
        }
      }

      await updateStudent(schoolId, editingStudent.id, {
        ...editForm,
        studentName: trimmedName,
        diseCode: cleanEditDise || '',
        studentStateCode: cleanEditDise || '',
      });
      onRefresh();
      setEditingStudent(null);
    } catch (err: any) {
      setEditError(err.message || 'સુધારો સાચવવામાં નિષ્ફળતા મળી.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;
    setDeleteSubmitting(true);
    try {
      await deleteStudent(schoolId, deletingStudent.id);
      onRefresh();
      setDeletingStudent(null);
    } catch (err: any) {
      alert(err.message || 'વિદ્યાર્થી કાઢી નાખવામાં નિષ્ફળતા મળી.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Determine students target list for Delete All / Bulk Delete
  const targetDeleteStudents = useMemo(() => {
    if (deleteAllScope === 'selected') {
      return students.filter((s) => selectedStudentIds.has(s.id));
    }
    if (deleteAllScope === 'filtered') {
      return filteredStudents;
    }
    return students;
  }, [deleteAllScope, students, filteredStudents, selectedStudentIds]);

  // Handle Execute Delete All / Bulk Delete
  const handleExecuteDeleteAll = async () => {
    if (targetDeleteStudents.length === 0) return;
    if (deleteAllConfirmInput.trim().toUpperCase() !== 'DELETE') {
      alert('કૃપા કરીને પુષ્ટિ માટે બોક્સમાં "DELETE" લખો.');
      return;
    }

    setIsDeletingAll(true);
    try {
      let count = 0;
      if (deleteAllScope === 'all' && targetDeleteStudents.length === students.length) {
        count = await deleteAllStudents(schoolId);
      } else {
        const ids = targetDeleteStudents.map((s) => s.id);
        count = await bulkDeleteStudents(schoolId, ids);
      }

      setImportStatusMessage(`સફળતાપૂર્વક ${count} વિદ્યાર્થીઓ ડેટાબેઝમાંથી કાઢી નાખવામાં આવ્યા.`);
      setSelectedStudentIds(new Set());
      setIsDeleteAllModalOpen(false);
      setDeleteAllConfirmInput('');
      onRefresh();
      setTimeout(() => setImportStatusMessage(null), 8000);
    } catch (err: any) {
      alert(err.message || 'વિદ્યાર્થીઓ કાઢી નાખવામાં ભૂલ આવી.');
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Handle Excel File Selected
  const handleExcelFileSelected = async (file: File) => {
    try {
      setIsParsingExcel(true);
      setExcelFile(file);
      const result = await parseStudentsExcelFile(file, students, school.diseCode);
      setParseResult(result);
      setPreviewModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Excel ફાઇલ વાંચવામાં ભૂલ આવી.');
    } finally {
      setIsParsingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Execute Excel Import via bulkUpsertStudents
  const handleExecuteImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setIsImporting(true);
    try {
      // 1. Cross-school check: ensure no student UID exists in another school
      const allUids = parseResult.validRows
        .map((r) => r.diseCode || '')
        .filter(Boolean);

      const conflictsMap = await checkBatchStudentUidConflicts(allUids, schoolId);
      if (conflictsMap.size > 0) {
        const conflictsArray = Array.from(conflictsMap.values());
        setActiveConflict(null);
        setBatchConflictsList(conflictsArray);

        // Pre-filter remaining non-conflicting rows in case user wants to proceed with remainder
        const cleanRows = parseResult.validRows
          .filter((r) => {
            const c = (r.diseCode || '').replace(/\D/g, '');
            return !conflictsMap.has(c);
          })
          .map((r) => ({
            studentName: r.name,
            standard: r.standard,
            diseCode: r.diseCode,
            studentStateCode: r.diseCode,
            grNumber: r.grNumber,
            section: r.section,
            division: r.section,
            dob: r.dob,
            doa: r.doa,
            address: r.address,
            motherName: r.motherName,
            fatherName: r.fatherName,
            gender: r.gender,
            caste: r.caste,
            bloodGroup: r.bloodGroup,
            contactNumber: r.contactNumber,
            mobileNumber: r.contactNumber,
            fatherOccupation: r.fatherOccupation,
            motherOccupation: r.motherOccupation,
            placeOfBirth: r.placeOfBirth,
            photoUrl: r.photoUrl,
            aadhaarNo: r.aadhaarNo,
            previousYearTotalDays: r.previousYearTotalDays ? String(r.previousYearTotalDays) : undefined,
            previousYearPresentDays: r.previousYearPresentDays ? String(r.previousYearPresentDays) : undefined,
            previousYearPercentage: r.previousYearPercentage ? String(r.previousYearPercentage) : undefined,
            height: r.height ? String(r.height) : undefined,
            weight: r.weight ? String(r.weight) : undefined,
          }));

        setPendingImportRemainingRows(cleanRows);
        setConflictModalOpen(true);
        setIsImporting(false);
        return;
      }

      const studentsToImport = parseResult.validRows.map((r) => ({
        studentName: r.name,
        standard: r.standard,
        diseCode: r.diseCode,
        studentStateCode: r.diseCode,
        grNumber: r.grNumber,
        section: r.section,
        division: r.section,
        dob: r.dob,
        doa: r.doa,
        address: r.address,
        motherName: r.motherName,
        fatherName: r.fatherName,
        gender: r.gender,
        caste: r.caste,
        bloodGroup: r.bloodGroup,
        contactNumber: r.contactNumber,
        mobileNumber: r.contactNumber,
        fatherOccupation: r.fatherOccupation,
        motherOccupation: r.motherOccupation,
        placeOfBirth: r.placeOfBirth,
        photoUrl: r.photoUrl,
        aadhaarNo: r.aadhaarNo,
        previousYearTotalDays: r.previousYearTotalDays ? String(r.previousYearTotalDays) : undefined,
        previousYearPresentDays: r.previousYearPresentDays ? String(r.previousYearPresentDays) : undefined,
        previousYearPercentage: r.previousYearPercentage ? String(r.previousYearPercentage) : undefined,
        height: r.height ? String(r.height) : undefined,
        weight: r.weight ? String(r.weight) : undefined,
      }));

      const res = await bulkUpsertStudents(schoolId, studentsToImport, students);

      setImportStatusMessage(
        `Excel આયાત સફળ! ${res.added} નવા વિદ્યાર્થીઓ ઉમેરાયા અને ${res.updated} જૂના વિદ્યાર્થીઓના રેકોર્ડ્સ અપડેટ થયા.`
      );
      setIsConfirmModalOpen(false);
      setPreviewModalOpen(false);
      onRefresh();
      setTimeout(() => setImportStatusMessage(null), 7000);
    } catch (err: any) {
      alert(err.message || 'વિદ્યાર્થીઓ આયાત કરવામાં ભૂલ આવી.');
    } finally {
      setIsImporting(false);
    }
  };

  // Process Dual Files (CTS + UDISE+)
  const handleProcessDualFiles = async () => {
    if (!ctsFile) {
      alert('કૃપા કરીને પ્રથમ CTS Excel ફાઇલ પસંદ કરો.');
      return;
    }
    if (!udiseFile) {
      alert('કૃપા કરીને UDISE+ Excel ફાઇલ પસંદ કરો.');
      return;
    }

    setIsParsingDual(true);
    try {
      const res = await parseDualFiles(ctsFile, udiseFile, students, school.diseCode);
      setDualParseResult(res);
    } catch (err: any) {
      alert(err.message || 'ફાઇલો મર્જ કરવામાં ભૂલ આવી.');
    } finally {
      setIsParsingDual(false);
    }
  };

  // Execute Dual Import
  const handleExecuteDualImport = async () => {
    if (!dualParseResult || dualParseResult.validRows.length === 0) return;

    setIsExecutingDualImport(true);
    try {
      // 1. Cross-school check: ensure no student UID exists in another school
      const allUids = dualParseResult.validRows
        .map((r) => r.studentStateCode || r.diseCode || '')
        .filter(Boolean);

      const conflictsMap = await checkBatchStudentUidConflicts(allUids, schoolId);
      if (conflictsMap.size > 0) {
        const conflictsArray = Array.from(conflictsMap.values());
        setActiveConflict(null);
        setBatchConflictsList(conflictsArray);

        // Pre-filter remaining non-conflicting rows in case user wants to proceed with remainder
        const cleanRows = dualParseResult.validRows
          .filter((r) => {
            const c = (r.studentStateCode || r.diseCode || '').replace(/\D/g, '');
            return !conflictsMap.has(c);
          })
          .map((r) => ({
            studentName: r.name,
            standard: r.standard,
            diseCode: r.diseCode,
            studentStateCode: r.studentStateCode,
            grNumber: r.grNumber,
            section: r.section,
            division: r.section,
            rollNumber: r.rollNumber,
            dob: r.dob,
            doa: r.doa,
            gender: r.gender,
            caste: r.caste,
            bloodGroup: r.bloodGroup,
            contactNumber: r.contactNumber,
            mobileNumber: r.contactNumber,
            medium: r.medium,
            cwsnDisability: r.cwsnDisability,
            fatherName: r.fatherName,
            motherName: r.motherName,
            address: r.address,
            aadhaarNo: r.aadhaarNo,
            placeOfBirth: r.placeOfBirth,
            fatherOccupation: r.fatherOccupation,
            motherOccupation: r.motherOccupation,
            previousYearTotalDays: r.previousYearTotalDays ? String(r.previousYearTotalDays) : undefined,
            previousYearPresentDays: r.previousYearPresentDays ? String(r.previousYearPresentDays) : undefined,
            previousYearPercentage: r.previousYearPercentage ? String(r.previousYearPercentage) : undefined,
            height: r.height ? String(r.height) : undefined,
            weight: r.weight ? String(r.weight) : undefined,
          }));

        setPendingImportRemainingRows(cleanRows);
        setConflictModalOpen(true);
        setIsExecutingDualImport(false);
        return;
      }

      const studentsToImport = dualParseResult.validRows.map((r) => ({
        studentName: r.name, // priority: UDISE+ student name
        standard: r.standard,
        diseCode: r.diseCode,
        studentStateCode: r.studentStateCode,
        grNumber: r.grNumber, // from CTS
        section: r.section,
        division: r.section,
        rollNumber: r.rollNumber,
        dob: r.dob,
        doa: r.doa,
        gender: r.gender,
        caste: r.caste,
        bloodGroup: r.bloodGroup,
        contactNumber: r.contactNumber,
        mobileNumber: r.contactNumber,
        medium: r.medium,
        cwsnDisability: r.cwsnDisability,
        fatherName: r.fatherName,
        motherName: r.motherName,
        address: r.address,
        aadhaarNo: r.aadhaarNo,
        placeOfBirth: r.placeOfBirth,
        fatherOccupation: r.fatherOccupation,
        motherOccupation: r.motherOccupation,
        previousYearTotalDays: r.previousYearTotalDays ? String(r.previousYearTotalDays) : undefined,
        previousYearPresentDays: r.previousYearPresentDays ? String(r.previousYearPresentDays) : undefined,
        previousYearPercentage: r.previousYearPercentage ? String(r.previousYearPercentage) : undefined,
        height: r.height ? String(r.height) : undefined,
        weight: r.weight ? String(r.weight) : undefined,
      }));

      const res = await bulkUpsertStudents(schoolId, studentsToImport, students);

      setImportStatusMessage(
        `દ્વિ-ફાઇલ (CTS + UDISE+) આયાત સફળ! ${res.added} નવા વિદ્યાર્થીઓ ઉમેરાયા અને ${res.updated} વિદ્યાર્થીઓના રેકોર્ડ્સ અપડેટ થયા.`
      );
      setIsConfirmModalOpen(false);
      setIsDualImportModalOpen(false);
      setCtsFile(null);
      setUdiseFile(null);
      setDualParseResult(null);
      onRefresh();
      setTimeout(() => setImportStatusMessage(null), 8000);
    } catch (err: any) {
      alert(err.message || 'વિદ્યાર્થીઓ આયાત કરવામાં ભૂલ આવી.');
    } finally {
      setIsExecutingDualImport(false);
    }
  };

  // Handle Proceeding with only remaining valid non-conflicting rows from import
  const handleProceedWithRemainingImport = async () => {
    if (!pendingImportRemainingRows || pendingImportRemainingRows.length === 0) {
      setConflictModalOpen(false);
      return;
    }

    setConflictModalOpen(false);
    setIsImporting(true);
    try {
      const res = await bulkUpsertStudents(schoolId, pendingImportRemainingRows, students);
      setImportStatusMessage(
        `આયાત સફળ! ${res.added} નવા વિદ્યાર્થીઓ ઉમેરાયા અને ${res.updated} જૂના રેકોર્ડ્સ અપડેટ થયા. (${batchConflictsList.length} અન્ય શાળામાં નોંધાયેલા વિદ્યાર્થીઓ બાકાત રખાયા છે)`
      );
      setIsConfirmModalOpen(false);
      setPreviewModalOpen(false);
      setIsDualImportModalOpen(false);
      setPendingImportRemainingRows(null);
      setCtsFile(null);
      setUdiseFile(null);
      setDualParseResult(null);
      onRefresh();
      setTimeout(() => setImportStatusMessage(null), 8000);
    } catch (err: any) {
      alert(err.message || 'વિદ્યાર્થીઓ આયાત કરવામાં ભૂલ આવી.');
    } finally {
      setIsImporting(false);
    }
  };

  // Memoized New vs Updated Student lists for Single Excel Import confirmation
  const singleNewEntries = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.validRows
      .filter((r) => !r.isExistingUpdate)
      .map((r) => ({
        name: r.name,
        grNumber: r.grNumber,
        standard: r.standard,
        section: r.section,
        rollNumber: r.rollNumber,
        diseCode: r.diseCode,
      }));
  }, [parseResult]);

  const singleUpdatedEntries = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.existingUpdateRows.map((r) => ({
      name: r.existingStudentName || r.name,
      grNumber: r.existingGrNumber || r.grNumber,
      standard: r.existingStandard || r.standard,
      section: r.section,
      rollNumber: r.rollNumber,
      diseCode: r.diseCode,
      changes: r.changes || [],
    }));
  }, [parseResult]);

  // Memoized New vs Updated Student lists for Dual-File Import confirmation
  const dualNewEntries = useMemo(() => {
    if (!dualParseResult) return [];
    return dualParseResult.validRows
      .filter((r) => !r.isExistingUpdate)
      .map((r) => ({
        name: r.name,
        grNumber: r.grNumber,
        standard: r.standard,
        section: r.section,
        rollNumber: r.rollNumber,
        diseCode: r.studentStateCode || r.diseCode,
      }));
  }, [dualParseResult]);

  const dualUpdatedEntries = useMemo(() => {
    if (!dualParseResult) return [];
    return dualParseResult.existingUpdateRows.map((r) => ({
      name: r.existingStudentName || r.name,
      grNumber: r.existingGrNumber || r.grNumber,
      standard: r.existingStandard || r.standard,
      section: r.section,
      rollNumber: r.rollNumber,
      diseCode: r.studentStateCode || r.diseCode,
      changes: r.changes || [],
    }));
  }, [dualParseResult]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="glass-card border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 mt-1"
                title="પાછળના મેનુ પર જાઓ (Go Back)"
              >
                <ArrowLeft className="w-5 h-5 text-terracotta" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/80 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  વિદ્યાર્થી માસ્ટર ઇન્ફોર્મેશન સિસ્ટમ
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  DISE: {school.diseCode || 'N/A'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                <Users className="w-6 h-6 text-terracotta shrink-0" />
                <span>વિદ્યાર્થી સંચાલન (Student Master Management)</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                સંપૂર્ણ મૂળભૂત વિગતો, G.R. નંબર, ફોટો, Excel આયાત/નિકાસ તથા ડિજિટલ આઈડી કાર્ડ જનરેશન
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Mobile Action Bar (< sm screens) */}
            <div className="flex sm:hidden items-center gap-2 w-full">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-terracotta hover:bg-terracotta-hover text-white rounded-xl text-xs font-bold shadow-md shadow-terracotta/25 transition-all min-h-[44px] cursor-pointer"
                title="નવો વિદ્યાર્થી ઉમેરો"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ નવો ઉમેરો</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileToolsOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all min-h-[44px] cursor-pointer ${
                  mobileToolsOpen
                    ? 'bg-[#9d512d] text-white border-transparent'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
                title="આયાત, નિકાસ અને ટેમ્પ્લેટ્સ સાધનો"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>સાધનો</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setViewLayout((prev) => (isCardView ? 'table' : 'cards'))}
                className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title={isCardView ? 'કોષ્ટક વ્યુમાં બદલો' : 'કાર્ડ વ્યુમાં બદલો'}
              >
                {isCardView ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              </button>
            </div>

            {/* Mobile Dropdown Menu for Excel / Tools */}
            {mobileToolsOpen && (
              <div className="sm:hidden p-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl space-y-2 animate-fadeIn w-full">
                <div className="text-[11px] font-bold text-[#f59c73] uppercase tracking-wider px-1">
                  એક્સેલ આયાત & નિકાસ સાધનો
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setMobileToolsOpen(false);
                      setIsDualImportModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-bold text-left cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>દ્વિ-ફાઇલ (CTS+UDISE)</span>
                  </button>

                  <label className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer">
                    <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>એક ફાઇલ આયાત</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      disabled={isParsingExcel}
                      onChange={(e) => {
                        setMobileToolsOpen(false);
                        if (e.target.files?.[0]) {
                          handleExcelFileSelected(e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  <button
                    onClick={() => {
                      setMobileToolsOpen(false);
                      exportStudentsExcel(students, school.schoolName, school.diseCode);
                    }}
                    className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Excel એક્સપોર્ટ</span>
                  </button>

                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 col-span-2 justify-between">
                    <span className="text-[10px] font-bold text-slate-400 pl-1">ટેમ્પ્લેટ્સ:</span>
                    <button
                      onClick={() => downloadCtsTemplate(school.diseCode, school.schoolName)}
                      className="px-2 py-1 bg-slate-800 text-emerald-300 rounded text-[11px] font-bold"
                    >
                      CTS
                    </button>
                    <button
                      onClick={() => downloadUdisePlusTemplate(school.diseCode, school.schoolName)}
                      className="px-2 py-1 bg-slate-800 text-cyan-300 rounded text-[11px] font-bold"
                    >
                      UDISE+
                    </button>
                    <button
                      onClick={() => downloadStudentTemplate(school.diseCode, school.schoolName)}
                      className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[11px] font-bold"
                    >
                      સામાન્ય
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setMobileToolsOpen(false);
                      if (selectedStudentIds.size > 0) {
                        setDeleteAllScope('selected');
                      } else if (
                        selectedStandardFilter !== 'ALL' ||
                        selectedSectionFilter !== 'ALL' ||
                        selectedGenderFilter !== 'ALL' ||
                        selectedBloodFilter !== 'ALL' ||
                        searchQuery.trim()
                      ) {
                        setDeleteAllScope('filtered');
                      } else {
                        setDeleteAllScope('all');
                      }
                      setDeleteAllConfirmInput('');
                      setIsDeleteAllModalOpen(true);
                    }}
                    disabled={students.length === 0}
                    className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-bold cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>બધા વિદ્યાર્થી કાઢી નાખો</span>
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Action Bar (>= sm screens) */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              {/* Primary 1: Add Student Button */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-terracotta hover:bg-terracotta-hover text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-terracotta/25 transition-all min-h-[44px] cursor-pointer"
                title="નવો વિદ્યાર્થી ઉમેરો"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ નવો ઉમેરો</span>
              </button>

              {/* Primary 2: Dual-File Smart Import Button (CTS + UDISE+) */}
              <button
                onClick={() => setIsDualImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/30 transition-all min-h-[44px] border border-emerald-400/40 cursor-pointer"
                title="CTS અને UDISE+ એક્સેલ ફાઇલો મર્જ કરીને આયાત કરો"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>દ્વિ-ફાઇલ આયાત (CTS + UDISE+)</span>
              </button>

              {/* Secondary 1: Single File Upload Excel */}
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer min-h-[44px]">
                {isParsingExcel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-emerald-400" />
                )}
                <span>એક ફાઇલ આયાત</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={isParsingExcel}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleExcelFileSelected(e.target.files[0]);
                    }
                  }}
                />
              </label>

              {/* Secondary 2: Export to Excel */}
              <button
                onClick={() => exportStudentsExcel(students, school.schoolName, school.diseCode)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-sm min-h-[44px] cursor-pointer"
                title="Export all students to Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>એક્સપોર્ટ</span>
              </button>

              {/* Template Downloads Menu / Buttons */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
                <span className="text-[11px] font-semibold text-slate-400 px-1.5 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  ટેમ્પ્લેટ:
                </span>
                <button
                  onClick={() => downloadCtsTemplate(school.diseCode, school.schoolName)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold transition-colors border border-emerald-700/40"
                  title="CTS Excel Template (GR No. & AadhaarUID)"
                >
                  CTS
                </button>
                <button
                  onClick={() => downloadUdisePlusTemplate(school.diseCode, school.schoolName)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold transition-colors border border-cyan-700/40"
                  title="UDISE+ Excel Template (Col 1 to 61)"
                >
                  UDISE+
                </button>
                <button
                  onClick={() => downloadStudentTemplate(school.diseCode, school.schoolName)}
                  className="px-2 py-1 hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition-colors"
                  title="General Student Master Template"
                >
                  સામાન્ય
                </button>
              </div>

              {/* Delete All Students Button */}
              <button
                onClick={() => {
                  if (selectedStudentIds.size > 0) {
                    setDeleteAllScope('selected');
                  } else if (
                    selectedStandardFilter !== 'ALL' ||
                    selectedSectionFilter !== 'ALL' ||
                    selectedGenderFilter !== 'ALL' ||
                    selectedBloodFilter !== 'ALL' ||
                    searchQuery.trim()
                  ) {
                    setDeleteAllScope('filtered');
                  } else {
                    setDeleteAllScope('all');
                  }
                  setDeleteAllConfirmInput('');
                  setIsDeleteAllModalOpen(true);
                }}
                disabled={students.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-red-950/50 hover:bg-red-900/80 text-red-300 border border-red-800/60 hover:border-red-700 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px]"
                title="બધા અથવા ફિલ્ટર કરેલા વિદ્યાર્થીઓ કાઢી નાખો (Delete All / Bulk Delete)"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>બધા કાઢી નાખો</span>
              </button>

              {/* View Layout Toggle Button */}
              <div className="flex items-center p-1 bg-slate-900 border border-slate-700 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewLayout('cards')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isCardView ? 'bg-[#9d512d] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="કાર્ડ વ્યુ"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    !isCardView ? 'bg-[#9d512d] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="કોષ્ટક વ્યુ"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Global Import Notification Banner */}
        {importStatusMessage && (
          <div className="mt-4 bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 rounded-xl p-3.5 text-xs sm:text-sm flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="flex-1">{importStatusMessage}</span>
            <button
              onClick={() => setImportStatusMessage(null)}
              className="text-emerald-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Standard Counts Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'ધોરણ 9', key: '9', count: counts.std9, color: 'border-blue-500/40 text-blue-400' },
          { label: 'ધોરણ 10', key: '10', count: counts.std10, color: 'border-emerald-500/40 text-emerald-400' },
          { label: 'ધોરણ 11', key: '11', count: counts.std11, color: 'border-purple-500/40 text-purple-400' },
          { label: 'ધોરણ 12', key: '12', count: counts.std12, color: 'border-indigo-500/40 text-indigo-400' },
          { label: 'કુમાર / કન્યા', key: 'GENDER', count: `${counts.boys} / ${counts.girls}`, color: 'border-pink-500/40 text-pink-400', noFilter: true },
          { label: 'કુલ સંખ્યા', key: 'ALL', count: counts.total, color: 'border-amber-500/40 text-amber-400' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              if (!item.noFilter) {
                setSelectedStandardFilter(selectedStandardFilter === item.key ? 'ALL' : item.key);
              }
            }}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
              selectedStandardFilter === item.key
                ? 'bg-slate-800 border-terracotta ring-2 ring-terracotta/40'
                : 'bg-slate-900/60 border-white/5 hover:border-white/15'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-400 flex justify-between items-center">
              <span>{item.label}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-mono ${item.color.split(' ')[1]}`}>
                {item.count}
              </span>
              <span className="text-[10px] text-slate-500">વિદ્યાર્થીઓ</span>
            </div>
          </button>
        ))}
      </div>

      {/* Search & Comprehensive Filters Toolbar */}
      <div className="bg-slate-900/80 rounded-2xl border border-white/10 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="નામ, GR નં, રોલ નં અથવા ફોનથી શોધો..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-terracotta min-h-[44px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Standard Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedStandardFilter}
              onChange={(e) => setSelectedStandardFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-terracotta min-h-[44px]"
            >
              <option value="ALL">બધા ધોરણ (Std)</option>
              <option value="9">ધોરણ 9</option>
              <option value="10">ધોરણ 10</option>
              <option value="11">ધોરણ 11</option>
              <option value="12">ધોરણ 12</option>
            </select>
          </div>

          {/* Section Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-terracotta min-h-[44px]"
            >
              <option value="ALL">બધા વર્ગ (Section)</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  વર્ગ {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedGenderFilter}
              onChange={(e) => setSelectedGenderFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-terracotta min-h-[44px]"
            >
              <option value="ALL">બધી જાતિ (Gender)</option>
              <option value="Boy">કુમાર (Boys)</option>
              <option value="Girl">કન્યા (Girls)</option>
              <option value="Other">અન્ય (Other)</option>
            </select>
          </div>

          {/* Blood Group Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedBloodFilter}
              onChange={(e) => setSelectedBloodFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-terracotta min-h-[44px]"
            >
              <option value="ALL">બ્લડ ગ્રૂપ (All)</option>
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-selection Context Bar */}
        {selectedStudentIds.size > 0 && (
          <div className="flex items-center justify-between p-2.5 bg-terracotta/15 border border-terracotta/30 rounded-xl text-xs text-amber-200 animate-fadeIn flex-wrap gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckSquare className="w-4 h-4 text-terracotta" />
              <span>{selectedStudentIds.size} વિદ્યાર્થીઓ પસંદ કર્યા છે</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const targetList = students.filter((s) => selectedStudentIds.has(s.id));
                  handleGenerateIdCards(targetList);
                }}
                className="px-3 py-1.5 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>પસંદ કરેલ આઈડી કાર્ડ પ્રિન્ટ</span>
              </button>

              <button
                onClick={() => {
                  setDeleteAllScope('selected');
                  setDeleteAllConfirmInput('');
                  setIsDeleteAllModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="પસંદ કરેલા વિદ્યાર્થીઓ કાઢી નાખો"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>પસંદ કરેલા કાઢી નાખો ({selectedStudentIds.size})</span>
              </button>

              <button
                onClick={() => setSelectedStudentIds(new Set())}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
              >
                પસંદગી રદ કરો
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Student List Table / Card View */}
      <div className="bg-slate-900/90 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">કોઈ વિદ્યાર્થી મળ્યા નથી</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              શોધ અથવા પસંદ કરેલા ફિલ્ટર્સ અનુસાર કોઈ પરિણામ નથી. ફિલ્ટર્સ રીસેટ કરો અથવા નવો વિદ્યાર્થી ઉમેરો.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStandardFilter('ALL');
                setSelectedSectionFilter('ALL');
                setSelectedGenderFilter('ALL');
                setSelectedBloodFilter('ALL');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-terracotta text-xs font-semibold hover:bg-slate-700"
            >
              બધા ફિલ્ટર્સ સાફ કરો
            </button>
          </div>
        ) : (
          <div>
            {/* View Mode Bar */}
            <div className="px-4 py-2.5 bg-slate-950/80 border-b border-white/10 flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white font-medium cursor-pointer"
                >
                  {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-terracotta" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>બધા પસંદ ({filteredStudents.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewLayout('cards')}
                  className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    isCardView ? 'bg-[#9d512d] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="કાર્ડ વ્યુ (મોબાઇલ માટે સરળ)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>કાર્ડ્સ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('table')}
                  className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    !isCardView ? 'bg-[#9d512d] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                  title="કોષ્ટક વ્યુ (સંપૂર્ણ વિગતો)"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>ટેબલ</span>
                </button>
              </div>
            </div>

            {/* Mobile / Card View */}
            {isCardView ? (
              <div className="p-3 sm:p-4 space-y-3">
                {filteredStudents.map((st) => {
                  const isSelected = selectedStudentIds.has(st.id);
                  const stdClean = String(st.standard).replace(/^class\s*/i, '').trim();
                  const cleanBg = cleanAndNormalizeBloodGroup(st.bloodGroup);
                  const rawPhone = st.contactNumber || st.mobileNumber || '';
                  const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

                  return (
                    <div
                      key={st.id}
                      className={`glass-card rounded-2xl border p-3.5 transition-all shadow-xs ${
                        isSelected
                          ? 'border-terracotta bg-terracotta/10'
                          : 'border-white/10 bg-slate-900/90 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Multi-select Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleSelectStudent(st.id)}
                            className="p-1 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-terracotta" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          {/* Photo Avatar */}
                          <div
                            onClick={() => setViewingProfileStudent(st)}
                            className="w-11 h-11 rounded-xl border border-slate-700 bg-slate-950 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                          >
                            {st.photoUrl ? (
                              <img src={st.photoUrl} alt={st.studentName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-slate-400">
                                {(st.studentName || 'S').trim().charAt(0)}
                              </span>
                            )}
                          </div>

                          {/* Student Details */}
                          <div className="min-w-0 flex-1">
                            <div
                              onClick={() => setViewingProfileStudent(st)}
                              className="font-bold text-white text-sm truncate hover:text-amber-300 cursor-pointer leading-tight"
                            >
                              {st.studentName}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                                ધો. {stdClean} {st.section || st.division ? `(${st.section || st.division})` : ''}
                              </span>
                              {st.rollNumber && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-slate-800/80">
                                  રોલ: {st.rollNumber}
                                </span>
                              )}
                              {st.grNumber && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-amber-300 bg-slate-950 border border-slate-800">
                                  GR: {st.grNumber}
                                </span>
                              )}
                              {cleanBg && (
                                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold text-red-300 bg-red-950/60 border border-red-800/60">
                                  {cleanBg}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Father / Address subtitle if present */}
                      {(st.fatherName || st.address) && (
                        <div className="text-[11px] text-slate-400 mt-2 pl-9 truncate">
                          {st.fatherName ? `વાલી: ${st.fatherName}` : `સરનામું: ${st.address}`}
                        </div>
                      )}

                      {/* Card Actions Bottom Strip */}
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-1 text-xs">
                        {/* Quick Call / WhatsApp */}
                        <div className="flex items-center gap-1.5">
                          {cleanPhone ? (
                            <>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 font-mono text-[11px]"
                                title="કૉલ કરો"
                              >
                                <Phone className="w-3 h-3 text-emerald-400" />
                                <span>{cleanPhone}</span>
                              </a>
                              <a
                                href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`નમસ્તે વાલીશ્રી, ${school.schoolName} તરફથી આપના પાલ્ય ${st.studentName} સંદર્ભે સંદેશ.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30"
                                title="WhatsApp મેસેજ"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic pl-1">મોબાઈલ નથી</span>
                          )}
                        </div>

                        {/* Action Icons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingProfileStudent(st)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                            title="વિદ્યાર્થી પ્રોફાઇલ જુઓ"
                          >
                            <Eye className="w-4 h-4 text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => printStudentIdCards(school, [st])}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                            title="ID કાર્ડ પ્રિન્ટ"
                          >
                            <CreditCard className="w-4 h-4 text-amber-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStudent(st);
                              setEditForm({
                                studentName: st.studentName,
                                standard: st.standard,
                                grNumber: st.grNumber,
                                section: st.section || st.division,
                                rollNumber: st.rollNumber,
                                dob: st.dob,
                                bloodGroup: cleanAndNormalizeBloodGroup(st.bloodGroup) || '',
                                contactNumber: st.contactNumber || st.mobileNumber,
                                diseCode: st.diseCode || st.studentStateCode || '',
                                studentStateCode: st.studentStateCode || st.diseCode || '',
                                aadhaarNo: st.aadhaarNo || '',
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                            title="સુધારો કરો"
                          >
                            <Edit3 className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingStudent(st)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                            title="કાઢી નાખો"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto mobile-table-scroll">
                <table className="w-full text-left text-xs sm:text-sm text-slate-200">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10 text-[11px]">
                    <tr>
                      <th className="px-4 py-3.5 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-slate-400 hover:text-white"
                          title="Select / Deselect all"
                        >
                          {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-terracotta" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3.5 w-12 text-center">ફોટો</th>
                      <th className="px-4 py-3.5">વિદ્યાર્થીનું નામ (Name as in GR)</th>
                      <th className="px-4 py-3.5">G.R. નં</th>
                      <th className="px-4 py-3.5">ધોરણ & વર્ગ</th>
                      <th className="px-4 py-3.5">રોલ નં</th>
                      <th className="px-4 py-3.5">જન્મ તારીખ (DOB)</th>
                      <th className="px-4 py-3.5">બ્લડ ગ્રૂપ</th>
                      <th className="px-4 py-3.5">મોબાઈલ</th>
                      <th className="px-4 py-3.5 text-right">ક્રિયાઓ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredStudents.map((st, idx) => {
                      const isSelected = selectedStudentIds.has(st.id);
                      const stdClean = String(st.standard).replace(/^class\s*/i, '').trim();

                      return (
                        <tr
                          key={st.id}
                          className={`hover:bg-slate-850/60 transition-colors ${
                            isSelected ? 'bg-terracotta/10' : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectStudent(st.id)}
                              className="text-slate-400 hover:text-white"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-terracotta" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Photo Avatar */}
                          <td className="px-4 py-3 text-center">
                            <div
                              onClick={() => setViewingProfileStudent(st)}
                              className="w-9 h-11 rounded-lg border border-slate-700 bg-slate-950 overflow-hidden flex items-center justify-center cursor-pointer shadow-sm mx-auto hover:border-terracotta transition-colors"
                              title="Click to view profile"
                            >
                              {st.photoUrl ? (
                                <img src={st.photoUrl} alt={st.studentName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-slate-500">
                                  {(st.studentName || 'S').trim().charAt(0)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Student Name */}
                          <td className="px-4 py-3">
                            <div
                              onClick={() => setViewingProfileStudent(st)}
                              className="font-bold text-white hover:text-amber-300 cursor-pointer flex items-center gap-1.5 transition-colors"
                            >
                              <span>{st.studentName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {st.fatherName ? `વાલી: ${st.fatherName}` : st.address ? `સરનામું: ${st.address}` : ''}
                            </div>
                          </td>

                          {/* GR Number */}
                          <td className="px-4 py-3 font-mono font-bold text-amber-300 text-xs">
                            {st.grNumber ? (
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                                {st.grNumber}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* Standard & Section */}
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-800 border border-slate-700 text-slate-200">
                              ધોરણ {stdClean} {st.section || st.division ? `(${st.section || st.division})` : ''}
                            </span>
                          </td>

                          {/* Roll Number */}
                          <td className="px-4 py-3 font-mono text-xs text-slate-300">
                            {st.rollNumber || '-'}
                          </td>

                          {/* DOB */}
                          <td className="px-4 py-3 text-xs text-slate-300 font-mono">
                            {st.dob || '-'}
                          </td>

                          {/* Blood Group */}
                          <td className="px-4 py-3">
                            {(() => {
                              const cleanBg = cleanAndNormalizeBloodGroup(st.bloodGroup);
                              if (cleanBg) {
                                return (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-950/60 border border-red-800/60 text-red-300">
                                    {cleanBg}
                                  </span>
                                );
                              }
                              if (st.bloodGroup && st.bloodGroup.trim()) {
                                return (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300"
                                    title={st.bloodGroup}
                                  >
                                    {st.bloodGroup}
                                  </span>
                                );
                              }
                              return <span className="text-slate-500 text-xs">-</span>;
                            })()}
                          </td>

                          {/* Contact Mobile */}
                          <td className="px-4 py-3 font-mono text-xs text-emerald-400">
                            {st.contactNumber || st.mobileNumber || '-'}
                          </td>

                          {/* Action buttons */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Profile */}
                              <button
                                type="button"
                                onClick={() => setViewingProfileStudent(st)}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                                title="View Full Profile"
                              >
                                <Eye className="w-4 h-4 text-emerald-400" />
                              </button>

                              {/* Print Single ID Card */}
                              <button
                                type="button"
                                onClick={() => printStudentIdCards(school, [st])}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                                title="Generate ID Card"
                              >
                                <CreditCard className="w-4 h-4 text-amber-400" />
                              </button>

                              {/* Quick Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStudent(st);
                                  setEditForm({
                                    studentName: st.studentName,
                                    standard: st.standard,
                                    grNumber: st.grNumber,
                                    section: st.section || st.division,
                                    rollNumber: st.rollNumber,
                                    dob: st.dob,
                                    bloodGroup: cleanAndNormalizeBloodGroup(st.bloodGroup) || '',
                                    contactNumber: st.contactNumber || st.mobileNumber,
                                    diseCode: st.diseCode || st.studentStateCode || '',
                                    studentStateCode: st.studentStateCode || st.diseCode || '',
                                    aadhaarNo: st.aadhaarNo || '',
                                  });
                                }}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                                title="Quick Edit"
                              >
                                <Edit3 className="w-4 h-4 text-blue-400" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setDeletingStudent(st)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                                title="Delete Student"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: ADD STUDENT MODAL (Complete Master Information) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/70 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[86dvh] sm:max-h-[90dvh] text-slate-900 dark:text-white flex flex-col animate-fadeIn my-auto overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-terracotta flex items-center justify-center text-white">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">નવો વિદ્યાર્થી ઉમેરો (New Student Master Record)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">વિદ્યાર્થી માસ્ટર ઇન્ફોર્મેશન રેકોર્ડ અને આઈડી કાર્ડ ડેટા</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSubmitAddStudent} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 flex flex-col justify-between">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950/70 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
              {addSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/70 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                  <span>{addSuccess}</span>
                </div>
              )}

              {/* Photo & Basic Identity */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center gap-5">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-30 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center">
                    {addForm.photoUrl ? (
                      <img src={addForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={addPhotoInputRef}
                    onChange={handleAddPhotoSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => addPhotoInputRef.current?.click()}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium cursor-pointer"
                  >
                    {addForm.photoUrl ? 'ફોટો બદલો' : 'ફોટો પસંદ કરો'}
                  </button>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      વિદ્યાર્થીનું નામ (Name as in GR) <span className="text-red-500 font-bold">* (ફરજિયાત)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="દા.ત. પટેલ આરવ રમેશચંદ્ર"
                      value={addForm.studentName}
                      onChange={(e) => setAddForm({ ...addForm, studentName: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      G.R. નંબર (GR No.) <span className="text-slate-400 font-normal">(મરજિયાત)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="દા.ત. 1042"
                      value={addForm.grNumber}
                      onChange={(e) => setAddForm({ ...addForm, grNumber: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>
                        Child UID (૧૮ અંકનો DISE કોડ) <span className="text-red-500 font-bold">* (ફરજિયાત)</span>
                      </span>
                      {isCheckingInlineUid && (
                        <span className="text-[10px] text-cyan-500 animate-pulse font-normal">તપાસ થઈ રહી છે...</span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={18}
                      placeholder="૧૮ અંકનો Child UID (ફરજિયાત)"
                      value={addForm.diseCode}
                      onBlur={handleCheckAddUidOnBlur}
                      onChange={(e) => {
                        setAddForm({ ...addForm, diseCode: e.target.value });
                        if (inlineUidConflict) setInlineUidConflict(null);
                      }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-cyan-600 dark:text-cyan-300 focus:outline-none focus:border-terracotta font-mono"
                    />

                    {/* Inline Conflict Warning Card */}
                    {inlineUidConflict && (
                      <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-2.5 text-xs animate-fadeIn">
                        <div className="space-y-1">
                          <div className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>આ Child UID અન્ય શાળામાં પહેલેથી નોંધાયેલ છે!</span>
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">
                            શાળા:{' '}
                            <strong className="text-slate-900 dark:text-white">
                              {inlineUidConflict.registeredSchool.schoolName}
                            </strong>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                            આચાર્યશ્રી:{' '}
                            {inlineUidConflict.registeredSchool.principalName || 'નોંધાયેલ નથી'}
                            {inlineUidConflict.registeredSchool.principalPhone
                              ? ` (${inlineUidConflict.registeredSchool.principalPhone})`
                              : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveConflict(inlineUidConflict);
                            setBatchConflictsList([]);
                            setConflictModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                        >
                          <span>વિગત & WhatsApp</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Academic & Personal Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ધોરણ (Standard) <span className="text-red-500 font-bold">* (ફરજિયાત)</span>
                  </label>
                  <select
                    required
                    value={addForm.standard}
                    onChange={(e) => setAddForm({ ...addForm, standard: e.target.value as AllowedStandard })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                  >
                    <option value="9">ધોરણ 9</option>
                    <option value="10">ધોરણ 10</option>
                    <option value="11">ધોરણ 11</option>
                    <option value="12">ધોરણ 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    વર્ગ / સેક્શન (Section)
                  </label>
                  <input
                    type="text"
                    placeholder="A, B, C..."
                    value={addForm.section}
                    onChange={(e) => setAddForm({ ...addForm, section: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    રોલ નંબર (Roll No.)
                  </label>
                  <input
                    type="text"
                    placeholder="દા.ત. 15"
                    value={addForm.rollNumber}
                    onChange={(e) => setAddForm({ ...addForm, rollNumber: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    જન્મ તારીખ (DOB) <span className="text-red-500 font-bold">* (ફરજિયાત)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={addForm.dob}
                    onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    જાતિ (Gender) <span className="text-red-500 font-bold">* (ફરજિયાત)</span>
                  </label>
                  <select
                    required
                    value={addForm.gender}
                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value as any })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                  >
                    <option value="Boy">કુમાર (Boy)</option>
                    <option value="Girl">કન્યા (Girl)</option>
                    <option value="Other">અન્ય (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    બ્લડ ગ્રૂપ (Blood Group)
                  </label>
                  <select
                    value={addForm.bloodGroup}
                    onChange={(e) => setAddForm({ ...addForm, bloodGroup: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                  >
                    <option value="">પસંદ કરો</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              {/* Family & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    પિતાનું નામ (Father Name)
                  </label>
                  <input
                    type="text"
                    value={addForm.fatherName}
                    onChange={(e) => setAddForm({ ...addForm, fatherName: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    પિતાનો વ્યવસાય (Father Occupation)
                  </label>
                  <input
                    type="text"
                    placeholder="ખેતી, વેપાર, નોકરી..."
                    value={addForm.fatherOccupation}
                    onChange={(e) => setAddForm({ ...addForm, fatherOccupation: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    માતાનું નામ (Mother Name)
                  </label>
                  <input
                    type="text"
                    value={addForm.motherName}
                    onChange={(e) => setAddForm({ ...addForm, motherName: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    માતાનો વ્યવસાય (Mother Occupation)
                  </label>
                  <input
                    type="text"
                    placeholder="ગૃહિણી, નોકરી..."
                    value={addForm.motherOccupation}
                    onChange={(e) => setAddForm({ ...addForm, motherOccupation: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    મોબાઈલ નંબર (Parent Contact)
                  </label>
                  <input
                    type="tel"
                    placeholder="10 અંકનો મોબાઈલ"
                    value={addForm.contactNumber}
                    onChange={(e) => setAddForm({ ...addForm, contactNumber: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    જન્મ સ્થળ (Place of Birth)
                  </label>
                  <input
                    type="text"
                    placeholder="ગામ / શહેરનું નામ"
                    value={addForm.placeOfBirth}
                    onChange={(e) => setAddForm({ ...addForm, placeOfBirth: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    આધાર કાર્ડ નંબર (Aadhaar No. - 12 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="XXXX XXXX XXXX"
                    value={addForm.aadhaarNo}
                    onChange={(e) => setAddForm({ ...addForm, aadhaarNo: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta font-mono"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    રહેઠાણનું સરનામું (Address)
                  </label>
                  <input
                    type="text"
                    placeholder="ગામ, સોસાયટી, તાલુકો, જિલ્લો..."
                    value={addForm.address}
                    onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-terracotta"
                  />
                </div>
              </div>

              {/* Bottom Buttons (Sticky at bottom of form) */}
              <div className="shrink-0 sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3 z-10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors border border-slate-200 dark:border-white/5"
                >
                  રદ કરો
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-hover text-white text-xs font-bold shadow-lg shadow-terracotta/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {addSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>વિદ્યાર્થી ઉમેરો (Save Record)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ID CARD GENERATION MODAL */}
      {isIdCardModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl max-w-lg w-full max-h-[88dvh] overflow-y-auto p-5 sm:p-6 text-slate-900 dark:text-white animate-fadeIn my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-terracotta flex items-center justify-center text-white">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">વિદ્યાર્થી ઓળખપત્ર (Student ID Cards) જનરેટ કરો</h3>
              </div>
              <button onClick={() => setIsIdCardModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <p className="text-slate-600 dark:text-slate-300">
                આઈડી કાર્ડ પ્રોફેશનલ લેઆઉટમાં A4 સાઈઝ પર યોગ્ય માર્જિન અને Anek Gujarati ફોન્ટ સાથે પ્રિન્ટ થશે.
              </p>

              {/* Option 1: Selected students */}
              {selectedStudentIds.size > 0 && (
                <div className="p-3.5 rounded-xl bg-terracotta/10 dark:bg-terracotta/15 border border-terracotta/30 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">પસંદ કરેલા વિદ્યાર્થીઓ ({selectedStudentIds.size})</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">ટેબલમાંથી પસંદ કરેલા વિદ્યાર્થીઓના આઈડી કાર્ડ</div>
                  </div>
                  <button
                    onClick={() => {
                      const target = students.filter((s) => selectedStudentIds.has(s.id));
                      handleGenerateIdCards(target);
                      setIsIdCardModalOpen(false);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-terracotta hover:bg-terracotta-hover text-white font-bold cursor-pointer"
                  >
                    પ્રિન્ટ કરો
                  </button>
                </div>
              )}

              {/* Option 2: Standard-wise generation */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-3">
                <label className="block font-semibold text-slate-800 dark:text-slate-200">
                  ધોરણ અનુસાર આઈડી કાર્ડ જનરેટ કરો:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { std: 'ALL', label: 'બધા વિદ્યાર્થીઓ', count: students.length },
                    { std: '9', label: 'ધોરણ 9 ના બધા', count: counts.std9 },
                    { std: '10', label: 'ધોરણ 10 ના બધા', count: counts.std10 },
                    { std: '11', label: 'ધોરણ 11 ના બધા', count: counts.std11 },
                    { std: '12', label: 'ધોરણ 12 ના બધા', count: counts.std12 },
                  ].map((opt) => (
                    <button
                      key={opt.std}
                      type="button"
                      onClick={() => {
                        const target =
                          opt.std === 'ALL'
                             ? students
                            : students.filter((s) => String(s.standard).replace(/^class\s*/i, '').trim() === opt.std);
                        handleGenerateIdCards(target);
                        setIsIdCardModalOpen(false);
                      }}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-terracotta text-left flex justify-between items-center transition-colors cursor-pointer shadow-sm"
                    >
                      <span className="font-bold text-slate-800 dark:text-white">{opt.label}</span>
                      <span className="text-[11px] font-mono text-amber-600 dark:text-amber-300">({opt.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setIsIdCardModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold dark:hover:bg-slate-700 cursor-pointer border border-slate-200 dark:border-transparent transition-colors"
              >
                બંધ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EXCEL IMPORT PREVIEW */}
      {previewModalOpen && parseResult && (
        <div className="fixed inset-0 z-[100] bg-black/70 dark:bg-black/80 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-3xl w-full max-h-[86dvh] sm:max-h-[90dvh] flex flex-col text-slate-900 dark:text-white my-auto animate-fadeIn overflow-hidden">
            {/* Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900">
              <div>
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Excel આયાત પૂર્વાવલોકન (Student Master Preview)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  ફાઇલ: {excelFile?.name} • કુલ {parseResult.totalRows} પંક્તિઓ મળી
                </p>
              </div>
              <button onClick={() => setPreviewModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Statistics */}
            <div className="shrink-0 p-3 sm:p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800/80 rounded-xl p-2 sm:p-2.5">
                <div className="text-emerald-700 dark:text-emerald-400 font-bold text-base sm:text-lg font-mono">
                  {parseResult.validRows.length - parseResult.existingUpdateRows.length}
                </div>
                <div className="text-emerald-800 dark:text-emerald-300 text-[10px] sm:text-[11px] font-medium">નવા વિદ્યાર્થીઓ</div>
              </div>

              <div className="bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/60 dark:border-blue-800/80 rounded-xl p-2 sm:p-2.5">
                <div className="text-blue-700 dark:text-blue-400 font-bold text-base sm:text-lg font-mono">
                  {parseResult.existingUpdateRows.length}
                </div>
                <div className="text-blue-800 dark:text-blue-300 text-[10px] sm:text-[11px] font-medium">અપડેટ થશે (Preserve ID)</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/60 dark:border-amber-800/80 rounded-xl p-2 sm:p-2.5">
                <div className="text-amber-700 dark:text-amber-400 font-bold text-base sm:text-lg font-mono">
                  {parseResult.duplicateInFileRows.length}
                </div>
                <div className="text-amber-800 dark:text-amber-300 text-[10px] sm:text-[11px] font-medium">ફાઈલમાં ડુપ્લિકેટ</div>
              </div>

              <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-800/80 rounded-xl p-2 sm:p-2.5">
                <div className="text-red-700 dark:text-red-400 font-bold text-base sm:text-lg font-mono">
                  {parseResult.invalidRows.length}
                </div>
                <div className="text-red-800 dark:text-red-300 text-[10px] sm:text-[11px] font-medium">અમાન્ય પંક્તિઓ</div>
              </div>
            </div>

            {/* Tab selection */}
            <div className="shrink-0 flex border-b border-slate-200 dark:border-slate-800 px-4 pt-2 gap-2 text-xs bg-white dark:bg-slate-900">
              {[
                { id: 'all', label: `બધા (${parseResult.allRows.length})` },
                { id: 'valid', label: `માન્ય / નવા (${parseResult.validRows.length})` },
                { id: 'updates', label: `અપડેટ થનાર (${parseResult.existingUpdateRows.length})` },
                { id: 'invalid', label: `ક્ષતિવાળી (${parseResult.invalidRows.length + parseResult.duplicateInFileRows.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPreviewFilterTab(tab.id as any)}
                  className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
                    previewFilterTab === tab.id
                      ? 'border-terracotta text-terracotta dark:text-amber-300 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Rows Table */}
            <div className="flex-1 overflow-y-auto p-4 max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-400 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2 w-12">રો નં</th>
                    <th className="p-2">નામ</th>
                    <th className="p-2">ધોરણ</th>
                    <th className="p-2">G.R. નં</th>
                    <th className="p-2">સ્થિતિ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {parseResult.allRows
                    .filter((r) => {
                      if (previewFilterTab === 'valid') return r.isValid;
                      if (previewFilterTab === 'updates') return r.isExistingUpdate;
                      if (previewFilterTab === 'invalid') return !r.isValid;
                      return true;
                    })
                    .map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2 font-mono text-slate-500 dark:text-slate-400">#{r.rowNumber}</td>
                        <td className="p-2 font-semibold text-slate-900 dark:text-white">{r.name || '(ખાલી)'}</td>
                        <td className="p-2 text-slate-700 dark:text-slate-300">ધોરણ {r.standard}</td>
                        <td className="p-2 font-mono text-slate-700 dark:text-slate-300">{r.grNumber || '-'}</td>
                        <td className="p-2">
                          {r.isValid ? (
                            r.isExistingUpdate ? (
                              <div className="space-y-1">
                                <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-semibold inline-flex items-center gap-1">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  અસ્તિત્વમાં છે (અપડેટ થશે)
                                </span>
                                {r.changes && r.changes.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {r.changes.map((ch, cIdx) => (
                                      <span
                                        key={cIdx}
                                        className="text-[10px] bg-slate-100 text-blue-900 border border-blue-200 dark:bg-slate-950 dark:text-blue-300 dark:border-blue-900/60 px-1.5 py-0.2 rounded"
                                        title={`${ch.fieldLabel}: ${ch.oldValue || '(ખાલી)'} ➔ ${ch.newValue}`}
                                      >
                                        {ch.fieldLabel}: <strong className="text-emerald-700 dark:text-emerald-300">{ch.newValue}</strong>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 italic">માહિતી સમાન છે</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-semibold">
                                માન્ય (નવો ઉમેરાશે)
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                              {r.errorReason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold dark:hover:bg-slate-700 cursor-pointer border border-slate-200 dark:border-transparent transition-colors"
              >
                રદ કરો
              </button>

              <button
                type="button"
                disabled={isImporting || parseResult.validRows.length === 0}
                onClick={() => {
                  setIsConfirmModalOpen(true);
                  setConfirmImportMode('single');
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>આયાત અને અપડેટ પુષ્ટિ કરો ({parseResult.validRows.length} વિદ્યાર્થીઓ)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3.5: DUAL-FILE (CTS + UDISE+) SMART IMPORT MODAL */}
      {isDualImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[86dvh] sm:max-h-[90dvh] flex flex-col text-white my-auto animate-fadeIn overflow-hidden">
            {/* Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-gradient-to-r from-emerald-950/50 to-slate-900">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    સ્માર્ટ ડ્યુઅલ આયાત (CTS + UDISE+)
                  </span>
                  <span className="text-xs text-slate-400 font-mono">DISE: {school.diseCode}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-1.5 flex items-center gap-2">
                  <span>બે એક્સેલ ફાઇલ મર્જ કરી વિદ્યાર્થીઓ આયાત કરો</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                  <strong>CTS એક્સેલ</strong> માંથી G.R. નંબર &amp; બાળ આઈડી (AadhaarUID) લેવાશે. 
                  <strong> UDISE+ એક્સેલ</strong> (કોલમ 61 Student State Code સાથે મેચ કરીને) માંથી વિદ્યાર્થીનું પૂરું નામ 
                  તથા તમામ શૈક્ષણિક વિગતો (ધોરણ, રોલ નં, જન્મ, પ્રવેશ તારીખ, બ્લડ ગ્રૂપ, દિવ્યાંગતા વગેરે) આપમેળે મર્જ થશે.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsDualImportModalOpen(false);
                  setDualParseResult(null);
                }}
                className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="બંધ કરો"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Help Bar */}
            <div className="shrink-0 px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                નમૂનારૂપ એક્સેલ ફાઇલ ટેમ્પ્લેટ્સ:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadCtsTemplate(school.diseCode, school.schoolName)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 font-medium transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CTS નમૂનો (GR &amp; AadhaarUID)</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadUdisePlusTemplate(school.diseCode, school.schoolName)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-medium transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>UDISE+ નમૂનો (Col 1 to 61)</span>
                </button>
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto">
              {/* Two File Upload Cards */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-800 bg-slate-900/40">
              {/* File 1: CTS File */}
              <div className={`p-4 rounded-xl border transition-all ${
                ctsFile
                  ? 'bg-emerald-950/20 border-emerald-500/50'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-900/50 text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-700/40">
                      ૧
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">CTS એક્સેલ ફાઇલ</h4>
                      <p className="text-[11px] text-emerald-400 font-medium">G.R. નંબર અને AadhaarUID (DISE Code)</p>
                    </div>
                  </div>
                  {ctsFile && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      પસંદ કરેલ
                    </span>
                  )}
                </div>

                {ctsFile ? (
                  <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-emerald-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-white truncate">{ctsFile.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {(ctsFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCtsFile(null);
                        setDualParseResult(null);
                        if (ctsInputRef.current) ctsInputRef.current.value = '';
                      }}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-950/50 border border-red-900/50 ml-2 shrink-0"
                    >
                      બદલો
                    </button>
                  </div>
                ) : (
                  <label className="mt-3 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/50">
                    <Upload className="w-6 h-6 text-emerald-400 mb-1.5" />
                    <span className="text-xs font-bold text-white">CTS ફાઇલ પસંદ કરો (.xlsx / .xls)</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">ક્લિક કરો અથવા ફાઇલ ખેંચીને મૂકો</span>
                    <input
                      ref={ctsInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setCtsFile(e.target.files[0]);
                          setDualParseResult(null);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* File 2: UDISE+ File */}
              <div className={`p-4 rounded-xl border transition-all ${
                udiseFile
                  ? 'bg-cyan-950/20 border-cyan-500/50'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-900/50 text-cyan-300 flex items-center justify-center font-bold text-xs border border-cyan-700/40">
                      ૨
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">UDISE+ એક્સેલ ફાઇલ</h4>
                      <p className="text-[11px] text-cyan-400 font-medium">Col 4 પૂરું નામ, Col 61 બાળ આઈડી &amp; વિગતો</p>
                    </div>
                  </div>
                  {udiseFile && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                      પસંદ કરેલ
                    </span>
                  )}
                </div>

                {udiseFile ? (
                  <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-cyan-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileSpreadsheet className="w-5 h-5 text-cyan-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-white truncate">{udiseFile.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {(udiseFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUdiseFile(null);
                        setDualParseResult(null);
                        if (udiseInputRef.current) udiseInputRef.current.value = '';
                      }}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-950/50 border border-red-900/50 ml-2 shrink-0"
                    >
                      બદલો
                    </button>
                  </div>
                ) : (
                  <label className="mt-3 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/50">
                    <Upload className="w-6 h-6 text-cyan-400 mb-1.5" />
                    <span className="text-xs font-bold text-white">UDISE+ ફાઇલ પસંદ કરો (.xlsx / .xls)</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">ક્લિક કરો અથવા ફાઇલ ખેંચીને મૂકો</span>
                    <input
                      ref={udiseInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setUdiseFile(e.target.files[0]);
                          setDualParseResult(null);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Compare & Merge Trigger Bar */}
            {!dualParseResult && (
              <div className="p-5 flex flex-col items-center justify-center text-center space-y-3">
                <p className="text-xs text-slate-400 max-w-lg">
                  બંને ફાઇલો પસંદ કર્યા બાદ નીચેના બટન પર ક્લિક કરો. સિસ્ટમ બંને ફાઇલોમાંથી બાળ આઈડી (AadhaarUID = Student State Code)
                  સરખાવીને દરેક વિદ્યાર્થીના G.R. નંબર સાથે UDISE+ નું પૂરું નામ અને વિગતો ઓટો-મર્જ કરશે.
                </p>
                <button
                  type="button"
                  disabled={!ctsFile || !udiseFile || isParsingDual}
                  onClick={handleProcessDualFiles}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl disabled:opacity-40 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isParsingDual ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ફાઇલો મર્જ થઈ રહી છે...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>બંને ફાઇલો મેળવો અને ચકાસો (Compare &amp; Merge)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* If Parsed: Result Metrics and Table */}
            {dualParseResult && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Stats cards */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-6 gap-2 border-b border-slate-800 bg-slate-950/40 text-center">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2">
                    <div className="text-white font-bold text-base font-mono">{dualParseResult.totalCtsRows}</div>
                    <div className="text-slate-400 text-[10px]">CTS વિદ્યાર્થીઓ</div>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2">
                    <div className="text-white font-bold text-base font-mono">{dualParseResult.totalUdiseRows}</div>
                    <div className="text-slate-400 text-[10px]">UDISE+ રેકોર્ડ્સ</div>
                  </div>
                  <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-2">
                    <div className="text-emerald-400 font-bold text-base font-mono">{dualParseResult.matchedCount}</div>
                    <div className="text-emerald-300 text-[10px]">DISE મેચ (બંને ફાઇલ)</div>
                  </div>
                  <div className="bg-cyan-950/60 border border-cyan-800/80 rounded-xl p-2">
                    <div className="text-cyan-400 font-bold text-base font-mono">{dualParseResult.validRows.length}</div>
                    <div className="text-cyan-300 text-[10px]">આયાત માટે માન્ય</div>
                  </div>
                  <div className="bg-blue-950/60 border border-blue-800/80 rounded-xl p-2">
                    <div className="text-blue-400 font-bold text-base font-mono">{dualParseResult.existingUpdateRows.length}</div>
                    <div className="text-blue-300 text-[10px]">ડેટાબેઝ અપડેટ</div>
                  </div>
                  <div className="bg-red-950/60 border border-red-800/80 rounded-xl p-2">
                    <div className="text-red-400 font-bold text-base font-mono">{dualParseResult.invalidRows.length}</div>
                    <div className="text-red-300 text-[10px]">અપૂર્ણ / ક્ષતિ</div>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-slate-800 px-4 pt-2 gap-2 text-xs overflow-x-auto">
                  {[
                    { id: 'all', label: `બધા રેકોર્ડ્સ (${dualParseResult.allRows.length})` },
                    { id: 'matched', label: `મેળવેલ (CTS + UDISE+) (${dualParseResult.matchedCount})` },
                    { id: 'cts_only', label: `માત્ર CTS (${dualParseResult.ctsOnlyCount})` },
                    { id: 'updates', label: `અપડેટ થનાર (${dualParseResult.existingUpdateRows.length})` },
                    { id: 'invalid', label: `ક્ષતિવાળી (${dualParseResult.invalidRows.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDualFilterTab(tab.id as any)}
                      className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
                        dualFilterTab === tab.id
                          ? 'border-emerald-400 text-emerald-300'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Merged Table */}
                <div className="flex-1 overflow-y-auto p-4 max-h-80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="p-2 w-10">#</th>
                        <th className="p-2">સ્થિતિ</th>
                        <th className="p-2">વિદ્યાર્થીનું નામ (UDISE+)</th>
                        <th className="p-2">G.R. નં (CTS)</th>
                        <th className="p-2">બાળ આઈડી / DISE</th>
                        <th className="p-2">ધોરણ-વર્ગ</th>
                        <th className="p-2">રોલ નં</th>
                        <th className="p-2">પ્રવેશ તારીખ (DOA)</th>
                        <th className="p-2">જન્મ તારીખ</th>
                        <th className="p-2">બ્લડ ગ્રૂપ</th>
                        <th className="p-2">જાતિ</th>
                        <th className="p-2">CWSN દિવ્યાંગતા</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {dualParseResult.allRows
                        .filter((r) => {
                          if (dualFilterTab === 'matched') return r.matchSource === 'both' && r.isValid;
                          if (dualFilterTab === 'cts_only') return r.matchSource === 'cts_only' && r.isValid;
                          if (dualFilterTab === 'updates') return r.isExistingUpdate;
                          if (dualFilterTab === 'invalid') return !r.isValid;
                          return true;
                        })
                        .map((r) => (
                          <tr key={r.rowNumber} className="hover:bg-slate-800/40">
                            <td className="p-2 font-mono text-slate-400">#{r.rowNumber}</td>
                            <td className="p-2">
                              {r.isValid ? (
                                r.isExistingUpdate ? (
                                  <div className="space-y-1">
                                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-blue-950 text-blue-300 border border-blue-800 inline-flex items-center gap-1">
                                      <RefreshCw className="w-2.5 h-2.5" />
                                      અપડેટ થશે
                                    </span>
                                    {r.changes && r.changes.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {r.changes.slice(0, 3).map((ch, cIdx) => (
                                          <span
                                            key={cIdx}
                                            className="text-[9px] bg-slate-950 text-blue-300 border border-blue-900/60 px-1 py-0.2 rounded"
                                            title={`${ch.fieldLabel}: ${ch.oldValue || '(ખાલી)'} ➔ ${ch.newValue}`}
                                          >
                                            {ch.fieldLabel}: <strong className="text-emerald-300">{ch.newValue}</strong>
                                          </span>
                                        ))}
                                        {r.changes.length > 3 && (
                                          <span className="text-[9px] text-slate-400">+{r.changes.length - 3} વધુ</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : r.matchSource === 'both' ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                    મેચ (નવો)
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-amber-950 text-amber-300 border border-amber-800">
                                    માત્ર CTS
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-red-950 text-red-300 border border-red-800" title={r.errorReason}>
                                  {r.errorReason || 'ક્ષતિ'}
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-bold text-white max-w-[180px] truncate" title={r.name}>
                              {r.name || '(નામ નથી)'}
                            </td>
                            <td className="p-2 font-mono text-amber-300 font-bold">{r.grNumber || '-'}</td>
                            <td className="p-2 font-mono text-slate-300 text-[11px]">{r.studentStateCode || r.diseCode || '-'}</td>
                            <td className="p-2 font-semibold text-emerald-400">
                              ધો. {r.standard} {r.section ? `(${r.section})` : ''}
                            </td>
                            <td className="p-2 font-mono">{r.rollNumber || '-'}</td>
                            <td className="p-2 text-sky-300 font-medium">{r.doa || '-'}</td>
                            <td className="p-2 text-slate-300">{r.dob || '-'}</td>
                            <td className="p-2 text-red-300 font-bold">{r.bloodGroup || '-'}</td>
                            <td className="p-2 text-slate-300">{r.caste || '-'}</td>
                            <td className="p-2 text-[11px] text-amber-200">{r.cwsnDisability || '-'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="shrink-0 p-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/90">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDualImportModalOpen(false);
                    setDualParseResult(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  બંધ કરો
                </button>
                {dualParseResult && (
                  <button
                    type="button"
                    onClick={() => {
                      setDualParseResult(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
                  >
                    ફરીથી ફાઇલ પસંદ કરો
                  </button>
                )}
              </div>

              {dualParseResult && (
                <button
                  type="button"
                  disabled={isExecutingDualImport || dualParseResult.validRows.length === 0}
                  onClick={() => {
                    setIsConfirmModalOpen(true);
                    setConfirmImportMode('dual');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50 shadow-lg cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>
                    આયાત અને અપડેટ પુષ્ટિ કરો ({dualParseResult.validRows.length} વિદ્યાર્થીઓ)
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3.8: IMPORT CONFIRMATION & DIFF POPUP */}
      <ImportConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmImportMode === 'single' ? handleExecuteImport : handleExecuteDualImport}
        isSubmitting={confirmImportMode === 'single' ? isImporting : isExecutingDualImport}
        sourceTitle={confirmImportMode === 'single' ? 'સામાન્ય Excel આયાત' : 'દ્વિ-ફાઇલ (CTS + UDISE+) આયાત'}
        fileName={
          confirmImportMode === 'single'
            ? excelFile?.name
            : ctsFile && udiseFile
            ? `${ctsFile.name} + ${udiseFile.name}`
            : undefined
        }
        newEntries={confirmImportMode === 'single' ? singleNewEntries : dualNewEntries}
        updatedEntries={confirmImportMode === 'single' ? singleUpdatedEntries : dualUpdatedEntries}
        invalidCount={
          confirmImportMode === 'single'
            ? parseResult
              ? parseResult.invalidRows.length + parseResult.duplicateInFileRows.length
              : 0
            : dualParseResult
            ? dualParseResult.invalidRows.length
            : 0
        }
      />

      {/* MODAL 4: QUICK EDIT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full max-h-[86dvh] sm:max-h-[90dvh] flex flex-col p-5 text-white animate-fadeIn my-auto overflow-hidden">
            <div className="shrink-0 flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>ઝડપી સુધારો (Quick Edit)</span>
              </h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="shrink-0 mb-3 p-2.5 bg-red-950/70 border border-red-800 rounded-lg text-xs text-red-200">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveQuickEdit} className="flex-1 overflow-y-auto space-y-3 text-xs sm:text-sm pr-1">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">વિદ્યાર્થીનું નામ (Name as in GR) *</label>
                <input
                  type="text"
                  required
                  value={editForm.studentName || ''}
                  onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-terracotta"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ધોરણ (Standard) *</label>
                  <select
                    value={String(editForm.standard || '9')}
                    onChange={(e) => setEditForm({ ...editForm, standard: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-terracotta"
                  >
                    <option value="9">ધોરણ 9</option>
                    <option value="10">ધોરણ 10</option>
                    <option value="11">ધોરણ 11</option>
                    <option value="12">ધોરણ 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">G.R. નંબર</label>
                  <input
                    type="text"
                    value={editForm.grNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, grNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-terracotta font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">વર્ગ / સેક્શન</label>
                  <input
                    type="text"
                    value={editForm.section || ''}
                    onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-terracotta"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">રોલ નંબર</label>
                  <input
                    type="text"
                    value={editForm.rollNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-terracotta font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">સંપર્ક / Mobile</label>
                  <input
                    type="tel"
                    value={editForm.contactNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-terracotta font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">બ્લડ ગ્રૂપ (Blood Group)</label>
                  <select
                    value={editForm.bloodGroup || ''}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-terracotta"
                  >
                    <option value="">ખાલી રાખો (-)</option>
                    {COMMON_BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    વિદ્યાર્થી Child UID (૧૮ અંક)
                  </label>
                  <input
                    type="text"
                    value={editForm.diseCode || editForm.studentStateCode || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        diseCode: e.target.value,
                        studentStateCode: e.target.value,
                      })
                    }
                    placeholder="દા.ત. 240104015021720076"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-terracotta font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">આધાર નંબર (Aadhaar No)</label>
                  <input
                    type="text"
                    value={editForm.aadhaarNo || ''}
                    onChange={(e) => setEditForm({ ...editForm, aadhaarNo: e.target.value })}
                    placeholder="૧૨ અંકનો આધાર નંબર"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-terracotta font-mono text-xs"
                  />
                </div>
              </div>

              <div className="shrink-0 pt-3 border-t border-slate-800 flex justify-end gap-2 sticky bottom-0 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  રદ કરો
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {editSubmitting ? 'સાચવી રહ્યું છે...' : 'સાચવો'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE CONFIRMATION MODAL */}
      {deletingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-900/60 rounded-2xl shadow-2xl max-w-sm w-full max-h-[88dvh] overflow-y-auto p-5 text-white animate-fadeIn my-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center">વિદ્યાર્થીને કાઢી નાખવાની પુષ્ટિ</h3>
            <p className="text-xs text-slate-300 text-center mt-2 leading-relaxed">
              શું તમે ખરેખર ધોરણ {String(deletingStudent.standard).replace(/^class\s*/i, '')} ના વિદ્યાર્થી{' '}
              <strong className="text-white">&ldquo;{deletingStudent.studentName}&rdquo;</strong> ને શાળા રેકોર્ડમાંથી કાયમ માટે કાઢી નાખવા માંગો છો?
            </p>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                રદ કરો
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                {deleteSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>હા, કાઢી નાખો</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5.5: BULK / DELETE ALL CONFIRMATION MODAL */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-800/80 rounded-2xl shadow-2xl max-w-lg w-full max-h-[86dvh] sm:max-h-[90dvh] flex flex-col p-5 sm:p-6 text-white my-auto animate-fadeIn overflow-hidden">
            {/* Header */}
            <div className="shrink-0 flex items-start gap-3.5 mb-4 pb-3 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-red-950/90 border border-red-700/80 text-red-400 flex items-center justify-center shrink-0 shadow-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                    અત્યંત સાવચેતી જરૂરી (Destructive Action)
                  </span>
                  <button
                    onClick={() => {
                      if (!isDeletingAll) {
                        setIsDeleteAllModalOpen(false);
                        setDeleteAllConfirmInput('');
                      }
                    }}
                    className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  વિદ્યાર્થીઓ કાઢી નાખો (Delete Students)
                </h3>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {/* Scope Selection */}
              <div className="space-y-2 mb-4">
              <label className="block text-xs font-semibold text-slate-300">
                કાઢી નાખવાનો વ્યાપ પસંદ કરો (Select Scope):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteAllScope('all')}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between cursor-pointer ${
                    deleteAllScope === 'all'
                      ? 'bg-red-950/70 border-red-500 text-white ring-1 ring-red-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold">શાળાના તમામ</span>
                  <span className="text-[11px] font-mono mt-1 text-red-400">
                    {students.length} વિદ્યાર્થીઓ
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteAllScope('filtered')}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between cursor-pointer ${
                    deleteAllScope === 'filtered'
                      ? 'bg-red-950/70 border-red-500 text-white ring-1 ring-red-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold">ફિલ્ટર થયેલા</span>
                  <span className="text-[11px] font-mono mt-1 text-amber-400">
                    {filteredStudents.length} વિદ્યાર્થીઓ
                  </span>
                </button>

                <button
                  type="button"
                  disabled={selectedStudentIds.size === 0}
                  onClick={() => setDeleteAllScope('selected')}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between ${
                    selectedStudentIds.size === 0
                      ? 'opacity-30 cursor-not-allowed bg-slate-950/40 border-slate-850 text-slate-500'
                      : deleteAllScope === 'selected'
                      ? 'bg-red-950/70 border-red-500 text-white ring-1 ring-red-500 cursor-pointer'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <span className="font-bold">પસંદ કરેલા</span>
                  <span className="text-[11px] font-mono mt-1 text-emerald-400">
                    {selectedStudentIds.size} વિદ્યાર્થીઓ
                  </span>
                </button>
              </div>
            </div>

            {/* Warning Message Box */}
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 mb-4 space-y-1.5 text-xs text-red-200">
              <div className="font-bold text-red-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  કુલ {targetDeleteStudents.length} વિદ્યાર્થીઓ કાયમ માટે ડિલીટ થશે
                </span>
              </div>
              <p className="text-[11px] text-red-300/80 leading-relaxed">
                આ ક્રિયાથી પસંદ કરેલ તમામ વિદ્યાર્થીઓનો ડેટા (નામ, G.R. નંબર, સરનામું, જન્મ તારીખ, ફોટો વગેરે) Firestore ડેટાબેઝમાંથી સંપૂર્ણપણે કાઢી નાખવામાં આવશે. આ પ્રક્રિયા પાછી વાળી શકાશે નહીં.
              </p>
            </div>

            {/* Quick Preview of Students being deleted */}
            {targetDeleteStudents.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex justify-between">
                  <span>કાઢી નાખવામાં આવનાર વિદ્યાર્થીઓ (નમૂનો):</span>
                  <span className="font-mono text-red-400 font-bold">{targetDeleteStudents.length} કુલ</span>
                </div>
                <div className="max-h-28 overflow-y-auto p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
                  {targetDeleteStudents.slice(0, 8).map((st) => (
                    <div key={st.id} className="flex items-center justify-between text-slate-300 py-0.5 border-b border-slate-900 last:border-0">
                      <span className="truncate max-w-[240px] font-medium">{st.studentName}</span>
                      <span className="font-mono text-[11px] text-slate-400 shrink-0">
                        ધો. {String(st.standard).replace(/^class\s*/i, '')} {st.grNumber ? `| GR: ${st.grNumber}` : ''}
                      </span>
                    </div>
                  ))}
                  {targetDeleteStudents.length > 8 && (
                    <div className="text-[10px] text-slate-400 text-center pt-1 italic">
                      + બીજા {targetDeleteStudents.length - 8} વિદ્યાર્થીઓ...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confirmation input */}
            <div className="space-y-1.5 mb-5">
              <label className="block text-xs font-semibold text-slate-300">
                ચોક્કસ પુષ્ટિ કરવા માટે નીચેના બોક્સમાં <strong className="text-red-400 font-mono">DELETE</strong> લખો:
              </label>
              <input
                type="text"
                value={deleteAllConfirmInput}
                onChange={(e) => setDeleteAllConfirmInput(e.target.value)}
                placeholder='DELETE લખો'
                disabled={isDeletingAll}
                className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none uppercase placeholder-slate-600"
              />
            </div>
            </div>

            {/* Action buttons */}
            <div className="shrink-0 flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => {
                  setIsDeleteAllModalOpen(false);
                  setDeleteAllConfirmInput('');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                રદ કરો
              </button>

              <button
                type="button"
                disabled={
                  deleteAllConfirmInput.trim().toUpperCase() !== 'DELETE' ||
                  isDeletingAll ||
                  targetDeleteStudents.length === 0
                }
                onClick={handleExecuteDeleteAll}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-950/50 cursor-pointer"
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ડિલીટ થઈ રહ્યું છે...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>હા, {targetDeleteStudents.length} વિદ્યાર્થીઓ કાઢી નાખો</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: COMPLETE STUDENT PROFILE VIEW & EDITOR MODAL */}
      {viewingProfileStudent && (
        <StudentProfileModal
          student={viewingProfileStudent}
          school={school}
          isOpen={true}
          onClose={() => setViewingProfileStudent(null)}
          onStudentUpdated={(updated) => {
            setViewingProfileStudent(updated);
            onRefresh();
          }}
          onGenerateIdCard={(st) => {
            printStudentIdCards(school, [st]);
          }}
        />
      )}

      {/* MODAL 7: CROSS-SCHOOL STUDENT UID CONFLICT & WHATSAPP MODAL */}
      <StudentConflictModal
        isOpen={conflictModalOpen}
        onClose={() => {
          setConflictModalOpen(false);
          setActiveConflict(null);
          setBatchConflictsList([]);
        }}
        conflict={activeConflict}
        batchConflicts={batchConflictsList}
        currentSchool={school}
        remainingCount={pendingImportRemainingRows ? pendingImportRemainingRows.length : 0}
        onProceedWithRemaining={handleProceedWithRemainingImport}
      />
    </div>
  );
};
