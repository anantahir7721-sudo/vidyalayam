import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { School, Student, MarkRecord } from '../types';
import * as XLSX from 'xlsx';
import {
  Award,
  FileSpreadsheet,
  Printer,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  Download,
  BookOpen,
  Sparkles,
  HelpCircle,
  Save,
  Loader2,
  Calculator,
  Info,
  Calendar,
  Layers,
  FileText,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Check,
  X,
  Edit2,
  Lock,
  GraduationCap,
  LayoutGrid,
  Smartphone,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  Class9ExamType,
  CLASS_9_MAIN_SUBJECTS,
  CLASS_9_ADDITIONAL_SUBJECTS,
  CLASS_9_PRAYOGIK_SUBJECTS,
  ALL_CLASS_9_SUBJECTS,
  Class9SubjectDef,
  StudentResultClass9,
  calculateGsebGrade,
  computeClass9StudentResult,
} from '../utils/class9ResultCalculations';
import { Class10BoardAnalyticsModal } from './Class10BoardAnalyticsModal';
import { Std10SubjectSelectionModal } from './Std10SubjectSelectionModal';
import {
  StandardKey,
  StreamKey,
  STANDARD_TABS,
  FIRST_SECOND_EXAM_SUBJECTS,
  getSubjectsForStandard as getMultiSubjects,
  getExamsForStandard as getMultiExams,
  computeMultiStandardAllResults,
  Std11SubjectConfig,
  DEFAULT_STD_11_SUBJECT_CONFIG,
  STD_11_ALL_AVAILABLE_SUBJECTS,
  getStd11ActiveSubjects,
  computeClass11StudentResult,
  Std10SubjectConfig,
  DEFAULT_STD_10_SUBJECT_CONFIG,
  CLASS_10_AVAILABLE_SUBJECTS,
  getStd10StudentSubjects,
  calculateGseb10Grade,
  computeClass10StudentResult,
} from '../utils/multiStandardResultCalculations';
import {
  saveBatchExamMarks,
  bulkDeleteMarks,
  deleteMarksForStandard,
  deleteAllSchoolMarks,
} from '../services/firestoreService';
import { printHtmlDocument } from '../utils/printAndPdfUtils';

export interface Class9ResultManagerProps {
  school: School;
  students: Student[];
  marks: MarkRecord[];
  onBack: () => void;
  onRefresh?: () => void;
  onSwitchToGeneralResults?: () => void;
}

export const Class9ResultManager: React.FC<Class9ResultManagerProps> = ({
  school,
  students,
  marks,
  onBack,
  onRefresh,
  onSwitchToGeneralResults,
}) => {
  // 1. Core Standard & Stream Selection
  const [selectedStandard, setSelectedStandard] = useState<StandardKey>('9');
  const [selectedStream, setSelectedStream] = useState<StreamKey>('general');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [academicYear, setAcademicYear] = useState<string>(school?.academicYear || '૨૦૨૬–૨૭');

  // Std 11 Subject Customization State (7 Main + 2 Co-subs = 900 Marks)
  const [std11Config, setStd11Config] = useState<Std11SubjectConfig>(() => {
    try {
      const saved = localStorage.getItem(`vidyalayam_std11_subject_config_${school?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading Std 11 subject config:', e);
    }
    return DEFAULT_STD_11_SUBJECT_CONFIG;
  });

  // Std 10 Subject Configuration State (Maths Basic/Std, Sanskrit/Hindi, PT/Computer)
  const [std10Config, setStd10Config] = useState<Std10SubjectConfig>(() => {
    try {
      const saved = localStorage.getItem(`vidyalayam_std10_subject_config_${school?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading Std 10 subject config:', e);
    }
    return DEFAULT_STD_10_SUBJECT_CONFIG;
  });

  // Std 10 Modals state
  const [boardAnalyticsModalOpen, setBoardAnalyticsModalOpen] = useState(false);
  const [std10SubjectModalOpen, setStd10SubjectModalOpen] = useState(false);

  const updateStd10Config = (newCfg: Std10SubjectConfig) => {
    setStd10Config(newCfg);
    try {
      localStorage.setItem(`vidyalayam_std10_subject_config_${school?.id || 'default'}`, JSON.stringify(newCfg));
    } catch (e) {
      console.error(e);
    }
  };

  const updateStd11Config = (newCfg: Std11SubjectConfig) => {
    setStd11Config(newCfg);
    try {
      localStorage.setItem(`vidyalayam_std11_subject_config_${school?.id || 'default'}`, JSON.stringify(newCfg));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleStd11ElectiveGroup = (subId: string) => {
    const current = std11Config.electiveGroup || [];
    let updated: string[];
    if (current.includes(subId)) {
      if (current.length <= 1) return; // Keep at least 1
      updated = current.filter((id) => id !== subId);
    } else {
      if (current.length >= 3) {
        // Keep last 2 and append new one to maintain exactly 3
        updated = [...current.slice(1), subId];
      } else {
        updated = [...current, subId];
      }
    }
    updateStd11Config({ ...std11Config, electiveGroup: updated });
  };

  // Active Std 11 Subjects Memo (7 Main + 2 Co-subs)
  const std11Active = useMemo(() => getStd11ActiveSubjects(std11Config), [std11Config]);

  // View Navigation Tabs: Marks Entry | Download Section | Result Register | Marksheet | Siddhi-Krupa
  const [viewTab, setViewTab] = useState<'marks_entry' | 'download_section' | 'result_register' | 'individual_marksheet' | 'siddhi_krupa_entry'>('marks_entry');
  const [showDetailedKpi, setShowDetailedKpi] = useState(false);

  // Exam Selection in Marks Entry
  const [marksEntryExamId, setMarksEntryExamId] = useState<string>('first_exam');

  // Internal Assessment Entry Mode (5+5+5+5 for Main, 10+10 for Prayogik vs Direct 20M)
  const [internalEntryMode, setInternalEntryMode] = useState<'components' | 'direct'>('components');
  const [internalSelectedSubjId, setInternalSelectedSubjId] = useState<string>('gujarati');

  // Exam Selection in Result Register & Marksheet: 'first_exam' | 'second_exam' | 'annual'
  const [resultExamMode, setResultExamMode] = useState<'first_exam' | 'second_exam' | 'annual'>('first_exam');

  // Annual Result Format: 700 vs 1000 (Std 9) | 700 vs 900 (Std 11)
  const [resultFormat, setResultFormat] = useState<'700' | '1000' | '900'>('700');

  // Annual Marksheet Display Mode: Detailed Breakdown vs Simple 100 Marks Only
  const [marksheetPrintMode, setMarksheetPrintMode] = useState<'detailed' | 'simple100'>('simple100');

  // Marks Entry Layout Mode: Table vs Mobile Student Card
  const [entryLayoutMode, setEntryLayoutMode] = useState<'table' | 'card'>('table');
  const [cardStudentIndex, setCardStudentIndex] = useState<number>(0);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'PASS_WITH_SIDDHI' | 'PASS_WITH_KRUPA' | 'FAIL'>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // 1. Seat Numbers fetched from ExamFileTab blocks in localStorage
  const examFileSeatMap = useMemo(() => {
    const map: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(`vidyalayam_exam_file_${school?.id || 'default'}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.blocks)) {
          parsed.blocks.forEach((b: any) => {
            b.sections?.forEach((sec: any) => {
              sec.students?.forEach((st: any) => {
                if (st.id && st.seatNumber !== undefined && st.seatNumber !== null && String(st.seatNumber).trim() !== '') {
                  map[st.id] = String(st.seatNumber).trim();
                }
              });
            });
          });
        }
      }
    } catch (e) {
      console.error('Error reading exam file seat numbers:', e);
    }
    return map;
  }, [school?.id]);

  // 2. Manual seat number overrides stored locally
  const [manualSeatNumbers, setManualSeatNumbers] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(`vidyalayam_seat_numbers_${school?.id || 'default'}`);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  const getSeatNumber = (studentId: string, rollNumber?: string): string => {
    if (manualSeatNumbers[studentId]?.trim()) return manualSeatNumbers[studentId].trim();
    if (examFileSeatMap[studentId]?.trim()) return examFileSeatMap[studentId].trim();
    const st = students.find((s) => s.id === studentId);
    if ((st as any)?.seatNumber?.trim()) return (st as any).seatNumber.trim();
    return rollNumber ? String(rollNumber) : '-';
  };

  const handleUpdateSeatNumber = (studentId: string, newSeatNo: string) => {
    const updated = { ...manualSeatNumbers, [studentId]: newSeatNo.trim() };
    setManualSeatNumbers(updated);
    try {
      localStorage.setItem(`vidyalayam_seat_numbers_${school?.id || 'default'}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Manual Grace Overrides: studentId -> subjectId -> { siddhi, krupa }
  const [manualGraceOverrides, setManualGraceOverrides] = useState<Record<string, Record<string, { siddhi?: number; krupa?: number }>>>(() => {
    try {
      const saved = localStorage.getItem(`vidyalayam_grace_overrides_${school?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saved grace overrides:', e);
    }
    return {};
  });

    const [siddhiDirtyStudents, setSiddhiDirtyStudents] = useState<Set<string>>(new Set());
  const [siddhiSaveSuccess, setSiddhiSaveSuccess] = useState<string | null>(null);
  const locallyModifiedStudentsRef = useRef<Set<string>>(new Set());
  const deletedMarkKeysRef = useRef<Set<string>>(new Set());
  const saveLocalInputsTimerRef = useRef<any>(null);

  // Sync saved grace marks from Firestore (examId === 'siddhi_krupa_grace')
  useEffect(() => {
    if (!marks || marks.length === 0) return;
    const graceRecords = marks.filter((m) => m.examId === 'siddhi_krupa_grace');
    if (graceRecords.length === 0) return;

    setManualGraceOverrides((prev) => {
      const merged = { ...prev };
      let hasChanges = false;

      graceRecords.forEach((m) => {
        if (!m.studentId || !m.subjectId) return;
        // Never overwrite students who have been modified locally in this session or are dirty
        if (siddhiDirtyStudents.has(m.studentId) || locallyModifiedStudentsRef.current.has(m.studentId)) {
          return;
        }

        const qm = (m as any).questionMarks;
        const siddhi = qm?.siddhi !== undefined ? qm.siddhi : 0;
        const krupa = qm?.krupa !== undefined ? qm.krupa : 0;

        // If local state already has an entry for this student and subject, do not overwrite with old cloud mark
        if (merged[m.studentId]?.[m.subjectId] !== undefined) {
          return;
        }

        if (!merged[m.studentId]) {
          merged[m.studentId] = {};
        }

        merged[m.studentId][m.subjectId] = { siddhi, krupa };
        hasChanges = true;
      });

      if (hasChanges) {
        try {
          localStorage.setItem(`vidyalayam_grace_overrides_${school?.id || 'default'}`, JSON.stringify(merged));
        } catch (e) {
          console.error(e);
        }
        return merged;
      }
      return prev;
    });
  }, [marks, school?.id, siddhiDirtyStudents]);

  const [graceModalStudent, setGraceModalStudent] = useState<StudentResultClass9 | null>(null);

  // Siddhi-Krupa Sub-tab specific states
  const [siddhiSelectedStudentId, setSiddhiSelectedStudentId] = useState<string>('');
  const [siddhiSearchQuery, setSiddhiSearchQuery] = useState('');
  const [siddhiSectionFilter, setSiddhiSectionFilter] = useState<string>('ALL');
  const [siddhiFilterMode, setSiddhiFilterMode] = useState<'ALL' | 'ELIGIBLE' | 'ELIGIBLE_SIDDHI' | 'NEEDS_GRACE' | 'PASSED' | 'FAILED'>('ELIGIBLE');
  const [siddhiViewLayout, setSiddhiViewLayout] = useState<'student' | 'overview'>('student');


  // Marks Entry Local State: studentId_subjectId_examType -> string value
  const [gridInputs, setGridInputs] = useState<Record<string, string>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

  // Auto Cloud Sync & Offline Queue States
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle');
  const [graceSyncStatus, setGraceSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle');
  const autoSyncMarksTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSyncGraceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stable references for debounced sync
  const gridInputsRef = useRef(gridInputs);
  gridInputsRef.current = gridInputs;
  const marksEntryExamIdRef = useRef(marksEntryExamId);
  marksEntryExamIdRef.current = marksEntryExamId;
  const manualGraceOverridesRef = useRef(manualGraceOverrides);
  manualGraceOverridesRef.current = manualGraceOverrides;

  // Real-time synchronization & mutex lock refs
  const dirtyKeysRef = useRef<Set<string>>(new Set());
  const isSyncingMarksRef = useRef(false);
  const pendingSyncNeededRef = useRef(false);
  const lastInitKeyRef = useRef<string>('');
  const focusedCellKeyRef = useRef<string | null>(null);

  // Zero-friction tab navigation: all changes are auto-saved in local cache and synced to cloud
  const handleSwitchTab = (newTab: 'marks_entry' | 'download_section' | 'result_register' | 'individual_marksheet' | 'siddhi_krupa_entry') => {
    setViewTab(newTab);
    if (newTab === 'siddhi_krupa_entry') {
      setMarksEntryExamId('siddhi_krupa_entry');
    }
  };

  const handleSafeBack = () => {
    onBack();
  };

  // Student Counts per standard for high-level tabs
  const studentCountsByStd = useMemo(() => {
    const counts: Record<string, number> = { '9': 0, '10': 0, '11': 0, '12': 0 };
    students.forEach((s) => {
      const std = String(s.standard || '').trim().replace(/^class\s*/i, '');
      if (std === '9') counts['9']++;
      else if (std === '10') counts['10']++;
      else if (std.startsWith('11')) counts['11']++;
      else if (std.startsWith('12')) counts['12']++;
    });
    return counts;
  }, [students]);

  // Filter students for the active standard and stream
  const activeStandardStudents = useMemo(() => {
    return students.filter((s) => {
      const std = String(s.standard || '').trim().replace(/^class\s*/i, '');
      if (selectedStandard === '9') return std === '9';
      if (selectedStandard === '10') return std === '10';
      if (selectedStandard === '11') {
        if (selectedStream === 'science') {
          return std === '11-S' || (std === '11' && (s.stream === 'science' || s.division?.toUpperCase().includes('S')));
        }
        return (
          std === '11' ||
          std === '11-G' ||
          std === '11-A' ||
          std === '11-C' ||
          ((std.startsWith('11') || std === '11') && s.stream !== 'science')
        );
      }
      if (selectedStandard === '12') {
        if (selectedStream === 'science') {
          return std === '12-S' || (std === '12' && (s.stream === 'science' || s.division?.toUpperCase().includes('S')));
        }
        return std === '12' || std === '12-G' || s.stream === 'general' || !s.stream;
      }
      return false;
    });
  }, [students, selectedStandard, selectedStream]);

  // Available sections in selected standard
  const availableSections = useMemo(() => {
    const sections = new Set<string>();
    activeStandardStudents.forEach((s) => {
      const sec = s.section || s.division;
      if (sec && sec.trim()) sections.add(sec.trim().toUpperCase());
    });
    return Array.from(sections).sort();
  }, [activeStandardStudents]);

  // Section-filtered students
  const filteredStudents = useMemo(() => {
    let list = activeStandardStudents;
    if (selectedSection !== 'ALL') {
      list = list.filter((s) => (s.section || s.division || 'A').toUpperCase() === selectedSection);
    }
    return list.sort((a, b) => {
      const rA = parseInt(a.rollNumber || '9999', 10);
      const rB = parseInt(b.rollNumber || '9999', 10);
      return rA - rB;
    });
  }, [activeStandardStudents, selectedSection]);

  // Active exam list for Marks Entry (Excludes direct 100-mark annual_result as 100 is auto-computed from 200/2)
  const marksEntryExams = useMemo(() => {
    return getMultiExams(selectedStandard).filter((e) => e.id !== 'annual_result' && e.id !== 'final_marksheet');
  }, [selectedStandard]);

  // Prayogik / Co-subjects for selected standard
  const prayogikSubjects = useMemo(() => {
    if (selectedStandard === '11') {
      return std11Active.coSubjects;
    }
    return CLASS_9_PRAYOGIK_SUBJECTS;
  }, [selectedStandard, std11Active]);

  // All active internal subjects (main + prayogik/co-subjects)
  const allActiveInternalSubjects = useMemo(() => {
    if (selectedStandard === '11') {
      return std11Active.allSubjects;
    }
    return ALL_CLASS_9_SUBJECTS;
  }, [selectedStandard, std11Active]);

  // Subjects to display in Marks Entry table (subject-wise columns for the chosen exam)
  const entrySubjects = useMemo(() => {
    if (selectedStandard === '10') {
      if (marksEntryExamId === 'board_practical') {
        const coSub = std10Config.defaultCoSubject === 'computer' ? CLASS_10_AVAILABLE_SUBJECTS.computer : CLASS_10_AVAILABLE_SUBJECTS.physical_education;
        return [coSub];
      }
      if (marksEntryExamId === 'board_exam' || marksEntryExamId === 'internal_assessment') {
        const { mainSubjects } = getStd10StudentSubjects(undefined, std10Config);
        return mainSubjects; // 6 main subjects for board exam (80M) and internal assessment (20M)
      }
      const { allSubjects } = getStd10StudentSubjects(undefined, std10Config);
      return allSubjects;
    }
    if (selectedStandard === '11') {
      if (marksEntryExamId === 'first_exam' || marksEntryExamId === 'second_exam' || marksEntryExamId === 'annual_exam') {
        return std11Active.mainSubjects; // 7 Main GSEB subjects chosen for Std 11
      }
      if (marksEntryExamId === 'prayogik_annual') {
        return std11Active.coSubjects; // 2 Co-subjects (Udyog + chosen co-subject)
      }
      return std11Active.allSubjects;
    }
    if (marksEntryExamId === 'first_exam' || marksEntryExamId === 'second_exam' || marksEntryExamId === 'annual_exam') {
      return FIRST_SECOND_EXAM_SUBJECTS; // 7 GSEB core subjects: Gujarati, Maths, Science, SS, English, Hindi, Sanskrit
    }
    if (marksEntryExamId === 'prayogik_annual') {
      return CLASS_9_PRAYOGIK_SUBJECTS; // 3 Prayogik subjects: Computer (42), PE & Yoga (40), Art & Music (41)
    }
    return getMultiSubjects(selectedStandard, selectedStream, resultFormat, marksEntryExamId);
  }, [selectedStandard, selectedStream, resultFormat, marksEntryExamId, std11Active]);

  // Max marks per subject for the chosen marks entry exam
  const entryMaxMarks = useMemo(() => {
    if (selectedStandard === '10') {
      if (marksEntryExamId === 'first_exam' || marksEntryExamId === 'second_exam' || marksEntryExamId === 'board_exam') return 80;
      if (marksEntryExamId === 'board_practical') return 100;
      if (marksEntryExamId === 'internal_assessment') return 20;
      return 100;
    }
    if (marksEntryExamId === 'first_exam' || marksEntryExamId === 'second_exam') return 50;
    if (marksEntryExamId === 'periodic_test_1' || marksEntryExamId === 'periodic_test_2') return 25;
    if (marksEntryExamId === 'internal_assessment') return 20;
    if (marksEntryExamId === 'annual_exam') return 80;
    if (marksEntryExamId === 'prayogik_annual') return 80; // 40 Theory + 40 Practical
    return 100;
  }, [marksEntryExamId]);

  // Total Max Marks for the chosen marks entry exam
  const entryTotalMax = useMemo(() => {
    if (marksEntryExamId === 'prayogik_annual') {
      return prayogikSubjects.length * 80; // Std 11: 2 * 80 = 160 | Std 9: 3 * 80 = 240
    }
    return entrySubjects.length * entryMaxMarks;
  }, [entrySubjects, entryMaxMarks, marksEntryExamId, prayogikSubjects]);

  // Effective format: Std 9 has 700 or 1000; Std 11 has 700 or 900
  const effectiveResultFormat: '700' | '1000' | '900' = useMemo(() => {
    if (selectedStandard === '11') {
      return resultFormat === '700' ? '700' : '900';
    }
    return resultFormat === '1000' ? '1000' : '700';
  }, [selectedStandard, resultFormat]);

  // Calculate All Results based on active resultExamMode
  const allResults = useMemo(() => {
    return computeMultiStandardAllResults(
      filteredStudents,
      marks,
      selectedStandard,
      selectedStream,
      effectiveResultFormat,
      manualGraceOverrides,
      resultExamMode,
      std11Config,
      std10Config
    );
  }, [filteredStudents, marks, selectedStandard, selectedStream, effectiveResultFormat, manualGraceOverrides, resultExamMode, std11Config, std10Config]);

  // Filtered Results for Register View
  const filteredResults = useMemo(() => {
    return allResults.filter((res) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = res.student.studentName.toLowerCase().includes(q);
        const matchRoll = (res.rollNumber || '').toLowerCase().includes(q);
        const matchGr = (res.grNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchGr) return false;
      }

      if (statusFilter === 'PASS') return res.overallResult === 'PASS';
      if (statusFilter === 'PASS_WITH_SIDDHI') return res.overallResult === 'PASS_WITH_SIDDHI';
      if (statusFilter === 'PASS_WITH_KRUPA') return res.overallResult === 'PASS_WITH_KRUPA';
      if (statusFilter === 'FAIL') return res.overallResult === 'NEEDS_IMPROVEMENT';
      return true;
    });
  }, [allResults, searchQuery, statusFilter]);

  // Active student result for Individual Marksheet
  const activeStudentResult = useMemo(() => {
    if (allResults.length === 0) return null;
    if (!selectedStudentId) return allResults[0];
    return allResults.find((r) => r.student.id === selectedStudentId) || allResults[0];
  }, [allResults, selectedStudentId]);

  // Helper to resolve an existing mark value from Firestore marks array for a given student & subject
  const getExistingMarkVal = useCallback(
    (studentMarks: MarkRecord[], subj: any, targetExamId: string, examKeywords: string[]): string | null => {
      const targetSubId = (subj.id || '').toLowerCase().trim();
      const targetSubName = (subj.nameGu || '').toLowerCase().trim();

      const found = studentMarks.find((m) => {
        const sId = (m.subjectId || '').toLowerCase().trim();
        const sName = (m.subjectName || '').toLowerCase().trim();

        // 1. Precise Subject Matching: Absolutely NEVER allow cross-matching between science & social_science or hindi & sanskrit
        let subMatch = false;

        if (targetSubId === 'science') {
          if (sId === 'social_science' || sId === 'ss' || sName.includes('સામાજિક')) {
            return false;
          }
          subMatch = sId === 'science' || sId === 'sci' || (sName.includes('વિજ્ઞાન') && !sName.includes('સામાજિક'));
        } else if (targetSubId === 'social_science') {
          if (sId === 'science' || (sName.includes('વિજ્ઞાન') && !sName.includes('સામાજિક') && sId !== 'social_science' && sId !== 'ss')) {
            return false;
          }
          subMatch = sId === 'social_science' || sId === 'ss' || sName.includes('સામાજિક');
        } else if (targetSubId === 'hindi') {
          if (sId === 'sanskrit' || sName.includes('સંસ્કૃત')) {
            return false;
          }
          subMatch = sId === 'hindi' || sId === 'hin' || (sName.includes('હિન્દી') && !sName.includes('સંસ્કૃત'));
        } else if (targetSubId === 'sanskrit') {
          if (sId === 'hindi' || sName.includes('હિન્દી')) {
            return false;
          }
          subMatch = sId === 'sanskrit' || sId === 'san' || (sName.includes('સંસ્કૃત') && !sName.includes('હિન્દી'));
        } else if (sId === targetSubId) {
          subMatch = true;
        } else if (sName && targetSubName && (sName === targetSubName || sName.startsWith(targetSubName) || targetSubName.startsWith(sName))) {
          subMatch = true;
        }

        if (!subMatch) return false;

        const mExId = ((m as any).examId || '').toLowerCase().trim();
        const mExType = (m.examType || '').toLowerCase().trim();
        const mDocId = (m.id || '').toLowerCase().trim();
        const cleanTargetExam = targetExamId.toLowerCase().trim();

        if (mExId === cleanTargetExam || mDocId.includes(`_${cleanTargetExam}_`)) {
          return true;
        }
        return examKeywords.some((k) => mExType.includes(k) || mExId.includes(k) || mDocId.includes(k));
      });

      if (!found) return null;
      if (found.overallGrade === 'AB') return 'AB';
      return found.totalObtained !== undefined && found.totalObtained !== null ? String(found.totalObtained) : '';
    },
    []
  );

  // Populate & Smoothly Reconcile Grid Inputs with Cloud-First Online Sync
  useEffect(() => {
    const std11Key = selectedStandard === '11' ? `_${std11Config.electiveLanguage}_${(std11Config.electiveGroup || []).join('-')}_${std11Config.electiveCoSub}` : '';
    const currentInitKey = `${school?.id || 'default'}_${selectedStandard}_${selectedSection}${std11Key}`;
    const isFirstInit = lastInitKeyRef.current !== currentInitKey;
    const subjectsForInputs = selectedStandard === '11' ? std11Active.allSubjects : ALL_CLASS_9_SUBJECTS;

    if (isFirstInit) {
      lastInitKeyRef.current = currentInitKey;
      const initialInputs: Record<string, string> = {};

      filteredStudents.forEach((student) => {
        const studentMarks = marks.filter((m) => m.studentId === student.id);

        subjectsForInputs.forEach((subj) => {
          const applyVal = (key: string, targetExamId: string, examKeywords: string[]) => {
            // Keep active live user input if currently focused or dirty
            if (
              (focusedCellKeyRef.current === key || dirtyKeysRef.current.has(key)) &&
              gridInputsRef.current[key] !== undefined
            ) {
              initialInputs[key] = gridInputsRef.current[key];
              return;
            }

            const cloudVal = getExistingMarkVal(studentMarks, subj, targetExamId, examKeywords);
            initialInputs[key] = cloudVal !== null ? cloudVal : '';
          };

          // Main Exams
          applyVal(`${student.id}_${subj.id}_first_exam`, 'first_exam', ['first', 'pratham', 'પ્રથમ']);
          applyVal(`${student.id}_${subj.id}_second_exam`, 'second_exam', ['second', 'dwitiya', 'દ્વિતીય', 'prelim', 'પ્રિલિમ']);
          applyVal(`${student.id}_${subj.id}_periodic_test_1`, 'periodic_test_1', ['pt1', 'periodic_1', 'periodic_test_1', 'સામાયિક કસોટી ૧', 'એકમ_1', 'કસોટી ૧']);
          applyVal(`${student.id}_${subj.id}_periodic_test_2`, 'periodic_test_2', ['pt2', 'periodic_2', 'periodic_test_2', 'સામાયિક કસોટી ૨', 'એકમ_2', 'કસોટી ૨']);
          applyVal(`${student.id}_${subj.id}_internal_assessment`, 'internal_assessment', ['internal', 'આંતરિક', 'internal_assessment']);
          applyVal(`${student.id}_${subj.id}_annual_exam`, 'annual_exam', ['annual', 'varshik', 'વાર્ષિક', 'board', 'બોર્ડ', 'annual_exam']);

          // Prayogik Theory & Practical (40 + 40)
          applyVal(`${student.id}_${subj.id}_theory40`, 'annual_theory', ['annual_theory', 'theory', 'થિયરી']);
          applyVal(`${student.id}_${subj.id}_practical40`, 'annual_practical', ['annual_practical', 'practical', 'પ્રાયોગિક', 'પ્રેક્ટિકલ']);

          // Internal Assessment Components (5+5+5+5 for Main, 10+10 for Prayogik)
          applyVal(`${student.id}_${subj.id}_internal_pt1`, 'internal_pt1', ['internal_pt1', 'pt1_conv', 'કસોટી_૧', 'કસોટી ૧']);
          applyVal(`${student.id}_${subj.id}_internal_pt2`, 'internal_pt2', ['internal_pt2', 'pt2_conv', 'કસોટી_૨', 'કસોટી ૨']);
          applyVal(`${student.id}_${subj.id}_internal_competency`, 'internal_competency', ['internal_competency', 'competency', 'સજ્જતા']);
          applyVal(`${student.id}_${subj.id}_internal_notebook`, 'internal_notebook', ['internal_notebook', 'notebook', 'નોટબુક']);
          applyVal(`${student.id}_${subj.id}_internal_practical_work`, 'internal_practical_work', ['internal_practical_work', 'પ્રાયોગિક_કાર્ય', 'પ્રોજેક્ટ']);
          applyVal(`${student.id}_${subj.id}_internal_continuous_eval`, 'internal_continuous_eval', ['internal_continuous_eval', 'સાતત્યપૂર્ણ', 'કૌશલ્ય']);
        });
      });

      gridInputsRef.current = initialInputs;
      setGridInputs(initialInputs);
    } else {
      // Incremental Reconciliation: Update non-dirty and non-focused cells from incoming Cloud Firestore marks!
      // Guarantees active keystrokes are NEVER overwritten mid-typing.
      setGridInputs((prev) => {
        const next = { ...prev };
        let changed = false;

        filteredStudents.forEach((student) => {
          const studentMarks = marks.filter((m) => m.studentId === student.id);

          subjectsForInputs.forEach((subj) => {
            const syncKey = (key: string, targetExamId: string, examKeywords: string[]) => {
              // CRITICAL: NEVER overwrite keys currently focused, dirty, or recently cleared!
              if (focusedCellKeyRef.current === key || dirtyKeysRef.current.has(key) || deletedMarkKeysRef.current.has(key)) return;

              const cloudVal = getExistingMarkVal(studentMarks, subj, targetExamId, examKeywords);
              const expectedVal = cloudVal !== null ? cloudVal : '';
              if (next[key] !== expectedVal) {
                next[key] = expectedVal;
                changed = true;
              }
            };

            syncKey(`${student.id}_${subj.id}_first_exam`, 'first_exam', ['first', 'pratham', 'પ્રથમ']);
            syncKey(`${student.id}_${subj.id}_second_exam`, 'second_exam', ['second', 'dwitiya', 'દ્વિતીય', 'prelim', 'પ્રિલિમ']);
            syncKey(`${student.id}_${subj.id}_periodic_test_1`, 'periodic_test_1', ['pt1', 'periodic_1', 'periodic_test_1', 'સામાયિક કસોટી ૧', 'એકમ_1', 'કસોટી ૧']);
            syncKey(`${student.id}_${subj.id}_periodic_test_2`, 'periodic_test_2', ['pt2', 'periodic_2', 'periodic_test_2', 'સામાયિક કસોટી ૨', 'એકમ_2', 'કસોટી ૨']);
            syncKey(`${student.id}_${subj.id}_internal_assessment`, 'internal_assessment', ['internal', 'આંતરિક', 'internal_assessment']);
            syncKey(`${student.id}_${subj.id}_annual_exam`, 'annual_exam', ['annual', 'varshik', 'વાર્ષિક', 'board', 'બોર્ડ', 'annual_exam']);
            syncKey(`${student.id}_${subj.id}_theory40`, 'annual_theory', ['annual_theory', 'theory', 'થિયરી']);
            syncKey(`${student.id}_${subj.id}_practical40`, 'annual_practical', ['annual_practical', 'practical', 'પ્રાયોગિક', 'પ્રેક્ટિકલ']);
            syncKey(`${student.id}_${subj.id}_internal_pt1`, 'internal_pt1', ['internal_pt1', 'pt1_conv', 'કસોટી_૧', 'કસોટી ૧']);
            syncKey(`${student.id}_${subj.id}_internal_pt2`, 'internal_pt2', ['internal_pt2', 'pt2_conv', 'કસોટી_૨', 'કસોટી ૨']);
            syncKey(`${student.id}_${subj.id}_internal_competency`, 'internal_competency', ['internal_competency', 'competency', 'સજ્જતા']);
            syncKey(`${student.id}_${subj.id}_internal_notebook`, 'internal_notebook', ['internal_notebook', 'notebook', 'નોટબુક']);
            syncKey(`${student.id}_${subj.id}_internal_practical_work`, 'internal_practical_work', ['internal_practical_work', 'પ્રાયોગિક_કાર્ય', 'પ્રોજેક્ટ']);
            syncKey(`${student.id}_${subj.id}_internal_continuous_eval`, 'internal_continuous_eval', ['internal_continuous_eval', 'સાતત્યપૂર્ણ', 'કૌશલ્ય']);
          });
        });

        if (changed) {
          gridInputsRef.current = next;
          return next;
        }
        return prev;
      });
    }

    setSaveSuccessMsg(null);
  }, [filteredStudents, marks, selectedStandard, selectedSection, school?.id, getExistingMarkVal, std11Active, std11Config]);

  // Helper to compile Firestore records from grid inputs (and detect deleted records)
  const buildMarksRecordsToSave = (
    inputsMap: Record<string, string>,
    activeExamId: string,
    targetKeys?: Set<string>
  ): { recordsToSave: any[]; idsToDelete: string[] } => {
    const recordsToSave: any[] = [];
    const idsToDelete: string[] = [];
    const examNameDisplay = marksEntryExams.find((e) => e.id === activeExamId)?.nameGu || activeExamId;

    if (activeExamId === 'prayogik_annual') {
      const prayogikSubs = prayogikSubjects;
      filteredStudents.forEach((student) => {
        prayogikSubs.forEach((subj) => {
          const keyTh = `${student.id}_${subj.id}_theory40`;
          const keyPr = `${student.id}_${subj.id}_practical40`;

          if (targetKeys && targetKeys.size > 0 && !targetKeys.has(keyTh) && !targetKeys.has(keyPr)) {
            return;
          }

          const valTh = inputsMap[keyTh];
          const valPr = inputsMap[keyPr];

          if (valTh !== undefined && valTh.trim() !== '') {
            const isAb = valTh.trim().toUpperCase() === 'AB';
            const num = isAb ? 0 : parseFloat(valTh) || 0;
            recordsToSave.push({
              studentId: student.id,
              studentName: student.studentName,
              grNumber: student.grNumber || '',
              rollNumber: student.rollNumber || '',
              standard: selectedStandard,
              division: student.section || student.division || 'A',
              examId: 'annual_theory',
              examType: `${subj.nameGu} - વાર્ષિક થિયરી (૪૦)`,
              academicYear,
              subjectId: subj.id,
              subjectName: subj.nameGu,
              totalObtained: num,
              totalMax: 40,
              percentage: Math.round((num / 40) * 100),
              overallGrade: isAb ? 'AB' : calculateGsebGrade(num, 40),
            });
          } else if (valTh !== undefined && valTh.trim() === '') {
            idsToDelete.push(`${student.id}_annual_theory_${subj.id}`);
          }

          if (valPr !== undefined && valPr.trim() !== '') {
            const isAb = valPr.trim().toUpperCase() === 'AB';
            const num = isAb ? 0 : parseFloat(valPr) || 0;
            recordsToSave.push({
              studentId: student.id,
              studentName: student.studentName,
              grNumber: student.grNumber || '',
              rollNumber: student.rollNumber || '',
              standard: selectedStandard,
              division: student.section || student.division || 'A',
              examId: 'annual_practical',
              examType: `${subj.nameGu} - વાર્ષિક પ્રાયોગિક (૪૦)`,
              academicYear,
              subjectId: subj.id,
              subjectName: subj.nameGu,
              totalObtained: num,
              totalMax: 40,
              percentage: Math.round((num / 40) * 100),
              overallGrade: isAb ? 'AB' : calculateGsebGrade(num, 40),
            });
          } else if (valPr !== undefined && valPr.trim() === '') {
            idsToDelete.push(`${student.id}_annual_practical_${subj.id}`);
          }

          // Combined annual_exam out of 80
          const hasTh = valTh !== undefined && valTh.trim() !== '';
          const hasPr = valPr !== undefined && valPr.trim() !== '';
          if (hasTh || hasPr) {
            const nTh = parseFloat(valTh || '0') || 0;
            const nPr = parseFloat(valPr || '0') || 0;
            const combined80 = Math.min(80, nTh + nPr);
            recordsToSave.push({
              studentId: student.id,
              studentName: student.studentName,
              grNumber: student.grNumber || '',
              rollNumber: student.rollNumber || '',
              standard: selectedStandard,
              division: student.section || student.division || 'A',
              examId: 'annual_exam',
              examType: `${subj.nameGu} - વાર્ષિક પરીક્ષા (૮૦)`,
              academicYear,
              subjectId: subj.id,
              subjectName: subj.nameGu,
              totalObtained: combined80,
              totalMax: 80,
              percentage: Math.round((combined80 / 80) * 100),
              overallGrade: calculateGsebGrade(combined80, 80),
            });
          } else if ((!targetKeys || targetKeys.has(keyTh) || targetKeys.has(keyPr)) && !hasTh && !hasPr) {
            idsToDelete.push(`${student.id}_annual_exam_${subj.id}`);
          }
        });
      });
    } else if (activeExamId === 'internal_assessment' && internalEntryMode === 'components') {
      const activeSub = allActiveInternalSubjects.find((s) => s.id === internalSelectedSubjId) || allActiveInternalSubjects[0];
      filteredStudents.forEach((student) => {
        if (activeSub.isPrayogik) {
          const kPrac = `${student.id}_${activeSub.id}_internal_practical_work`;
          const kSkill = `${student.id}_${activeSub.id}_internal_continuous_eval`;

          if (targetKeys && targetKeys.size > 0 && !targetKeys.has(kPrac) && !targetKeys.has(kSkill)) {
            return;
          }

          const vPrac = inputsMap[kPrac];
          const vSkill = inputsMap[kSkill];

          if (vPrac !== undefined && vPrac.trim() !== '') {
            const num = vPrac.trim().toUpperCase() === 'AB' ? 0 : parseFloat(vPrac) || 0;
            recordsToSave.push({
              studentId: student.id,
              studentName: student.studentName,
              grNumber: student.grNumber || '',
              rollNumber: student.rollNumber || '',
              standard: selectedStandard,
              division: student.section || student.division || 'A',
              examId: 'internal_practical_work',
              examType: `${activeSub.nameGu} - પ્રાયોગિક કાર્ય/પ્રોજેક્ટ (૧૦)`,
              academicYear,
              subjectId: activeSub.id,
              subjectName: activeSub.nameGu,
              totalObtained: num,
              totalMax: 10,
              percentage: Math.round((num / 10) * 100),
              overallGrade: vPrac.trim().toUpperCase() === 'AB' ? 'AB' : calculateGsebGrade(num, 10),
            });
          } else if (vPrac !== undefined && vPrac.trim() === '') {
            idsToDelete.push(`${student.id}_internal_practical_work_${activeSub.id}`);
          }

          if (vSkill !== undefined && vSkill.trim() !== '') {
            const num = vSkill.trim().toUpperCase() === 'AB' ? 0 : parseFloat(vSkill) || 0;
            recordsToSave.push({
              studentId: student.id,
              studentName: student.studentName,
              grNumber: student.grNumber || '',
              rollNumber: student.rollNumber || '',
              standard: selectedStandard,
              division: student.section || student.division || 'A',
              examId: 'internal_continuous_eval',
              examType: `${activeSub.nameGu} - સાતત્યપૂર્ણ કૌશલ્ય (૧૦)`,
              academicYear,
              subjectId: activeSub.id,
              subjectName: activeSub.nameGu,
              totalObtained: num,
              totalMax: 10,
              percentage: Math.round((num / 10) * 100),
              overallGrade: vSkill.trim().toUpperCase() === 'AB' ? 'AB' : calculateGsebGrade(num, 10),
            });
          } else if (vSkill !== undefined && vSkill.trim() === '') {
            idsToDelete.push(`${student.id}_internal_continuous_eval_${activeSub.id}`);
          }

          const hasPrac = vPrac !== undefined && vPrac.trim() !== '';
          const hasSkill = vSkill !== undefined && vSkill.trim() !== '';
          if (hasPrac || hasSkill) {
            const n1 = parseFloat(vPrac || '0') || 0;
            const n2 = parseFloat(vSkill || '0') || 0;
            const tot20 = Math.min(20, Math.round(n1 + n2));
            recordsToSave.push({
              studentId: student.id,
              studentName: student.studentName,
              grNumber: student.grNumber || '',
              rollNumber: student.rollNumber || '',
              standard: selectedStandard,
              division: student.section || student.division || 'A',
              examId: 'internal_assessment',
              examType: `${activeSub.nameGu} - આંતરિક મૂલ્યાંકન (૨૦)`,
              academicYear,
              subjectId: activeSub.id,
              subjectName: activeSub.nameGu,
              totalObtained: tot20,
              totalMax: 20,
              percentage: Math.round((tot20 / 20) * 100),
              overallGrade: calculateGsebGrade(tot20, 20),
            });
          } else {
            idsToDelete.push(`${student.id}_internal_assessment_${activeSub.id}`);
          }
        } else {
          // Main subject: 5 + 5 + 5 + 5
          const kPt1 = `${student.id}_${activeSub.id}_internal_pt1`;
          const kPt2 = `${student.id}_${activeSub.id}_internal_pt2`;
          const kComp = `${student.id}_${activeSub.id}_internal_competency`;
          const kNote = `${student.id}_${activeSub.id}_internal_notebook`;
          const kRawPt1 = `${student.id}_${activeSub.id}_periodic_test_1`;
          const kRawPt2 = `${student.id}_${activeSub.id}_periodic_test_2`;

          if (
            targetKeys &&
            targetKeys.size > 0 &&
            !targetKeys.has(kPt1) &&
            !targetKeys.has(kPt2) &&
            !targetKeys.has(kComp) &&
            !targetKeys.has(kNote) &&
            !targetKeys.has(kRawPt1) &&
            !targetKeys.has(kRawPt2)
          ) {
            return;
          }

          const rawPt1 = inputsMap[kRawPt1];
          const rawPt2 = inputsMap[kRawPt2];

          const convPt1 = rawPt1 === 'AB' ? '0' : (rawPt1 !== undefined && rawPt1 !== '' ? String(Math.round(((parseFloat(rawPt1) || 0) / 25) * 5 * 10) / 10) : undefined);
          const convPt2 = rawPt2 === 'AB' ? '0' : (rawPt2 !== undefined && rawPt2 !== '' ? String(Math.round(((parseFloat(rawPt2) || 0) / 25) * 5 * 10) / 10) : undefined);

          const vPt1 = convPt1 !== undefined ? convPt1 : inputsMap[kPt1];
          const vPt2 = convPt2 !== undefined ? convPt2 : inputsMap[kPt2];
          const vComp = inputsMap[kComp];
          const vNote = inputsMap[kNote];

          const addComp = (fieldKey: string, typeName: string, val: string | undefined) => {
            if (val !== undefined && val.trim() !== '') {
              const num = val.trim().toUpperCase() === 'AB' ? 0 : parseFloat(val) || 0;
              recordsToSave.push({
                studentId: student.id,
                studentName: student.studentName,
                grNumber: student.grNumber || '',
                rollNumber: student.rollNumber || '',
                standard: selectedStandard,
                division: student.section || student.division || 'A',
                examId: fieldKey,
                examType: `${activeSub.nameGu} - ${typeName}`,
                academicYear,
                subjectId: activeSub.id,
                subjectName: activeSub.nameGu,
                totalObtained: num,
                totalMax: 5,
                percentage: Math.round((num / 5) * 100),
                overallGrade: val.trim().toUpperCase() === 'AB' ? 'AB' : calculateGsebGrade(num, 5),
              });
            } else if (val !== undefined && val.trim() === '') {
              idsToDelete.push(`${student.id}_${fieldKey}_${activeSub.id}`);
            }
          };

          addComp('internal_pt1', 'કસોટી ૧ (૫)', vPt1);
          addComp('internal_pt2', 'કસોટી ૨ (૫)', vPt2);
          addComp('internal_competency', 'વિષય સજ્જતા (૫)', vComp);
          addComp('internal_notebook', 'નોટબુક કાર્ય (૫)', vNote);

          const hasAnyComp =
            (vPt1 !== undefined && vPt1.trim() !== '') ||
            (vPt2 !== undefined && vPt2.trim() !== '') ||
            (vComp !== undefined && vComp.trim() !== '') ||
            (vNote !== undefined && vNote.trim() !== '');

          if (hasAnyComp) {
            const n1 = parseFloat(vPt1 || '0') || 0;
            const n2 = parseFloat(vPt2 || '0') || 0;
            const n3 = parseFloat(vComp || '0') || 0;
            const n4 = parseFloat(vNote || '0') || 0;
            const tot20 = Math.min(20, Math.round(n1 + n2 + n3 + n4));
            recordsToSave.push({
              studentId: student.id,
              studentName: student.studentName,
              grNumber: student.grNumber || '',
              rollNumber: student.rollNumber || '',
              standard: selectedStandard,
              division: student.section || student.division || 'A',
              examId: 'internal_assessment',
              examType: `${activeSub.nameGu} - આંતરિક મૂલ્યાંકન (૨૦)`,
              academicYear,
              subjectId: activeSub.id,
              subjectName: activeSub.nameGu,
              totalObtained: tot20,
              totalMax: 20,
              percentage: Math.round((tot20 / 20) * 100),
              overallGrade: calculateGsebGrade(tot20, 20),
            });
          } else {
            idsToDelete.push(`${student.id}_internal_assessment_${activeSub.id}`);
          }
        }
      });
    } else {
      filteredStudents.forEach((student) => {
        entrySubjects.forEach((subj) => {
          const valKey = `${student.id}_${subj.id}_${activeExamId}`;
          if (targetKeys && targetKeys.size > 0 && !targetKeys.has(valKey)) {
            return;
          }

          const val = inputsMap[valKey];
          const cleanExam = activeExamId.toLowerCase().trim();
          const docId = `${student.id}_${cleanExam}_${subj.id}`;

          if (val === undefined || val.trim() === '') {
            if (!targetKeys || targetKeys.has(valKey)) {
              idsToDelete.push(docId);
            }
            return;
          }

          const isAb = val.trim().toUpperCase() === 'AB';
          const obtained = isAb ? 0 : parseFloat(val) || 0;

          recordsToSave.push({
            studentId: student.id,
            studentName: student.studentName,
            grNumber: student.grNumber || '',
            rollNumber: student.rollNumber || '',
            standard: selectedStandard,
            division: student.section || student.division || 'A',
            examId: activeExamId,
            examType: examNameDisplay,
            academicYear,
            subjectId: subj.id,
            subjectName: subj.nameGu,
            totalObtained: obtained,
            totalMax: entryMaxMarks,
            percentage: isAb ? 0 : Math.round((obtained / entryMaxMarks) * 100),
            overallGrade: isAb ? 'AB' : undefined,
          });
        });
      });
    }

    return { recordsToSave, idsToDelete };
  };

  // Perform background auto-sync to Firestore with queue mutex lock
  const performAutoSyncMarks = async (inputsOverride?: Record<string, string>) => {
    const currentExam = marksEntryExamIdRef.current;
    if (currentExam === 'siddhi_krupa_entry') return;

    // Mutex guard: If a sync is already in flight, flag pending and wait for current to finish
    if (isSyncingMarksRef.current) {
      pendingSyncNeededRef.current = true;
      return;
    }

    if (!navigator.onLine) {
      setCloudSyncStatus('offline');
      try {
        localStorage.setItem(`vidyalayam_pending_marks_${school?.id || 'default'}`, 'true');
      } catch (e) {}
      return;
    }

    // Freeze snapshot of dirty keys to process in this specific cycle
    const keysToSave = new Set(dirtyKeysRef.current);
    const inputsToUse = inputsOverride || { ...gridInputsRef.current };

    if (keysToSave.size === 0 && !inputsOverride) {
      setCloudSyncStatus((prev) => (prev === 'syncing' ? 'idle' : prev));
      return;
    }

    isSyncingMarksRef.current = true;
    setCloudSyncStatus('syncing');

    try {
      const { recordsToSave, idsToDelete } = buildMarksRecordsToSave(
        inputsToUse,
        currentExam,
        keysToSave.size > 0 ? keysToSave : undefined
      );

      const uniqueDeleteIds = Array.from(new Set(idsToDelete));
      const syncPromises: Promise<any>[] = [];

      if (recordsToSave.length > 0) {
        syncPromises.push(saveBatchExamMarks(school.id, recordsToSave));
      }
      if (uniqueDeleteIds.length > 0) {
        syncPromises.push(bulkDeleteMarks(school.id, uniqueDeleteIds));
      }

      if (syncPromises.length > 0) {
        await Promise.race([
          Promise.all(syncPromises),
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]);
      }

      // ONLY clear dirty status for a key if the in-memory value STILL equals what was sent to cloud!
      // If user typed another character (e.g. '3' after '2') while save was in-flight, it REMAINS dirty!
      keysToSave.forEach((k) => {
        if (gridInputsRef.current[k] === inputsToUse[k]) {
          dirtyKeysRef.current.delete(k);
        }
      });
      setDirtyKeys(new Set(dirtyKeysRef.current));

      try {
        localStorage.removeItem(`vidyalayam_pending_marks_${school?.id || 'default'}`);
      } catch (e) {}

      setCloudSyncStatus('synced');
      setTimeout(() => {
        setCloudSyncStatus((prev) => (prev === 'synced' ? 'idle' : prev));
      }, 2000);
    } catch (err) {
      console.error('Auto cloud sync marks error:', err);
      setCloudSyncStatus('offline');
    } finally {
      isSyncingMarksRef.current = false;
      // If user typed into subsequent cells while this save was executing, process them immediately!
      if (pendingSyncNeededRef.current || dirtyKeysRef.current.size > 0) {
        pendingSyncNeededRef.current = false;
        performAutoSyncMarks();
      }
    }
  };

  // Debounced auto-sync trigger (1200ms pause during typing, or immediate on blur/exit)
  const triggerDebouncedMarksSync = (inputsOverride?: Record<string, string>, immediate: boolean = false) => {
    if (autoSyncMarksTimerRef.current) {
      clearTimeout(autoSyncMarksTimerRef.current);
    }
    setCloudSyncStatus('syncing');
    if (immediate) {
      performAutoSyncMarks(inputsOverride);
    } else {
      autoSyncMarksTimerRef.current = setTimeout(() => {
        performAutoSyncMarks(inputsOverride);
      }, 1200);
    }
  };

  // Handle cell modification in Spreadsheet Grid with immediate offline save & auto-sync
  const handleCellChange = (key: string, value: string, maxMarks: number) => {
    if (selectedStandard === '10' && !std10Config?.isFinalized) {
      setStd10SubjectModalOpen(true);
      return;
    }

    const trimmed = value.trim();
    let updatedVal: string | null = null;

    if (trimmed.toUpperCase() === 'AB') {
      updatedVal = 'AB';
    } else if (trimmed === '') {
      updatedVal = '';
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num) && num >= 0 && num <= maxMarks) {
        updatedVal = value;
      }
    }

    if (updatedVal !== null) {
      // 1. Synchronously mark key as dirty in ref and state
      dirtyKeysRef.current.add(key);
      setDirtyKeys(new Set(dirtyKeysRef.current));

      // 2. Synchronously update in-memory reference and React state
      const nextInputs = { ...gridInputsRef.current, [key]: updatedVal };
      gridInputsRef.current = nextInputs;
      setGridInputs(nextInputs);

      // 3. Asynchronous debounced local persistence (prevents JSON stringify UI freezing!)
      if (trimmed === '') {
        deletedMarkKeysRef.current.add(key);
      } else {
        deletedMarkKeysRef.current.delete(key);
      }
      if (saveLocalInputsTimerRef.current) {
        clearTimeout(saveLocalInputsTimerRef.current);
      }
      saveLocalInputsTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(
            `vidyalayam_class9_inputs_${school?.id || 'default'}_${selectedStandard}`,
            JSON.stringify(gridInputsRef.current)
          );
        } catch (e) {
          console.error('Local cache error:', e);
        }
      }, 500);

      // 4. Trigger debounced real-time cloud synchronization
      triggerDebouncedMarksSync();
    }
  };

  // Re-sync listener for connectivity restoration
  useEffect(() => {
    const handleOnline = () => {
      try {
        const hasPendingMarks = localStorage.getItem(`vidyalayam_pending_marks_${school?.id || 'default'}`);
        if (hasPendingMarks === 'true') {
          performAutoSyncMarks();
        }
        const hasPendingGrace = localStorage.getItem(`vidyalayam_pending_grace_${school?.id || 'default'}`);
        if (hasPendingGrace === 'true') {
          performAutoSyncGrace();
        }
      } catch (e) {}
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [school?.id]);

  // Direct manual save fallback (if needed)
  const handleSaveMarks = async () => {
    await performAutoSyncMarks();
  };

  // State and handler to completely clear/delete marks for the current exam from Cloud Firestore
  const [isClearingExamMarks, setIsClearingExamMarks] = useState(false);

  const handleClearExamMarks = async () => {
    const examObj = marksEntryExams.find((e) => e.id === marksEntryExamId);
    const examLabel = examObj?.nameGu || marksEntryExamId;

    const ok = window.confirm(
      `શું તમે ખરેખર ધોરણ ${selectedStandard} ના "${examLabel}" ના તમામ ગુણ ક્લાઉડમાંથી સાફ (ડિલીટ) કરવા માંગો છો?\n\nઆ કરવાથી તમામ વિદ્યાર્થીઓના આ પરીક્ષાના ગુણ કાયમ માટે ડિલીટ થઈ જશે અને વેબ તથા મોબાઇલ એપ્લિકેશન બંનેમાં તરત જ સાફ થઈ જશે.`
    );
    if (!ok) return;

    setIsClearingExamMarks(true);
    try {
      const idsToDelete: string[] = [];
      const nextInputs = { ...gridInputsRef.current };

      if (marksEntryExamId === 'prayogik_annual') {
        filteredStudents.forEach((student) => {
          CLASS_9_PRAYOGIK_SUBJECTS.forEach((subj) => {
            const kTh = `${student.id}_${subj.id}_theory40`;
            const kPr = `${student.id}_${subj.id}_practical40`;
            delete nextInputs[kTh];
            delete nextInputs[kPr];
            dirtyKeysRef.current.delete(kTh);
            dirtyKeysRef.current.delete(kPr);
            idsToDelete.push(`${student.id}_annual_theory_${subj.id}`);
            idsToDelete.push(`${student.id}_annual_practical_${subj.id}`);
            idsToDelete.push(`${student.id}_annual_exam_${subj.id}`);
          });
        });
      } else if (marksEntryExamId === 'internal_assessment') {
        filteredStudents.forEach((student) => {
          ALL_CLASS_9_SUBJECTS.forEach((subj) => {
            const keys = [
              `${student.id}_${subj.id}_internal_assessment`,
              `${student.id}_${subj.id}_internal_pt1`,
              `${student.id}_${subj.id}_internal_pt2`,
              `${student.id}_${subj.id}_internal_competency`,
              `${student.id}_${subj.id}_internal_notebook`,
              `${student.id}_${subj.id}_internal_practical_work`,
              `${student.id}_${subj.id}_internal_continuous_eval`,
            ];
            keys.forEach((k) => {
              delete nextInputs[k];
              dirtyKeysRef.current.delete(k);
            });
            idsToDelete.push(`${student.id}_internal_assessment_${subj.id}`);
            idsToDelete.push(`${student.id}_internal_pt1_${subj.id}`);
            idsToDelete.push(`${student.id}_internal_pt2_${subj.id}`);
            idsToDelete.push(`${student.id}_internal_competency_${subj.id}`);
            idsToDelete.push(`${student.id}_internal_notebook_${subj.id}`);
            idsToDelete.push(`${student.id}_internal_practical_work_${subj.id}`);
            idsToDelete.push(`${student.id}_internal_continuous_eval_${subj.id}`);
          });
        });
      } else {
        const cleanExam = marksEntryExamId.toLowerCase().trim();
        filteredStudents.forEach((student) => {
          entrySubjects.forEach((subj) => {
            const valKey = `${student.id}_${subj.id}_${marksEntryExamId}`;
            delete nextInputs[valKey];
            dirtyKeysRef.current.delete(valKey);
            idsToDelete.push(`${student.id}_${cleanExam}_${subj.id}`);
          });
        });
      }

      const uniqueIds = Array.from(new Set(idsToDelete));
      await Promise.all([
        bulkDeleteMarks(school.id, uniqueIds),
        deleteMarksForStandard(school.id, selectedStandard, marksEntryExamId),
      ]);

      gridInputsRef.current = nextInputs;
      setGridInputs(nextInputs);
      setDirtyKeys(new Set(dirtyKeysRef.current));

      try {
        localStorage.setItem(
          `vidyalayam_class9_inputs_${school?.id || 'default'}_${selectedStandard}`,
          JSON.stringify(nextInputs)
        );
      } catch (e) {}

      setSaveSuccessMsg(`"${examLabel}" ના તમામ ગુણ ક્લાઉડમાંથી સફળતાપૂર્વક સાફ કરવામાં આવ્યા છે.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error clearing exam marks:', err);
      alert('ગુણ સાફ કરવામાં ત્રુટિ આવી. કૃપા કરીને પુનઃ પ્રયાસ કરો.');
    } finally {
      setIsClearingExamMarks(false);
    }
  };

  // KPI Metrics for Active Results
  const stats = useMemo(() => {
    const total = allResults.length;
    if (total === 0) {
      return { total: 0, directPass: 0, siddhiCount: 0, krupaCount: 0, failCount: 0, passPct: 0, completeCount: 0 };
    }
    const directPass = allResults.filter((r) => r.overallResult === 'PASS').length;
    const siddhiCount = allResults.filter((r) => r.overallResult === 'PASS_WITH_SIDDHI').length;
    const krupaCount = allResults.filter((r) => r.overallResult === 'PASS_WITH_KRUPA').length;
    const failCount = allResults.filter((r) => r.overallResult === 'NEEDS_IMPROVEMENT').length;
    const completeCount = allResults.filter((r) => !r.hasIncompleteMarks).length;
    const passedTotal = directPass + siddhiCount + krupaCount;
    const passPct = Math.round((passedTotal / total) * 100 * 10) / 10;

    return { total, directPass, siddhiCount, krupaCount, failCount, passPct, completeCount };
  }, [allResults]);

  // Perform background auto-sync to Firestore for Siddhi & Krupa grace marks
  const performAutoSyncGrace = async (overridesToUse?: Record<string, Record<string, { siddhi?: number; krupa?: number }>>) => {
    const currentOverrides = overridesToUse || manualGraceOverridesRef.current;

    if (!navigator.onLine) {
      setGraceSyncStatus('offline');
      try {
        localStorage.setItem(`vidyalayam_pending_grace_${school?.id || 'default'}`, 'true');
      } catch (e) {}
      return;
    }

    setGraceSyncStatus('syncing');
    try {
      const recordsToSave: any[] = [];
      filteredStudents.forEach((student) => {
        const studentGrace = currentOverrides[student.id] || {};
        const activeRes = computeClass9StudentResult(student, marks, '700', studentGrace);

        activeRes.scores.forEach((sc) => {
          const siddhiGiven = studentGrace[sc.subject.id]?.siddhi || 0;
          const krupaGiven = studentGrace[sc.subject.id]?.krupa || 0;

          if (siddhiGiven > 0 || krupaGiven > 0) {
            recordsToSave.push({
              studentId: student.id,
              studentName: student.studentName,
              grNumber: student.grNumber || '',
              rollNumber: student.rollNumber || '',
              standard: '9',
              division: student.section || student.division || 'A',
              examId: 'siddhi_krupa_grace',
              examType: `${sc.subject.nameGu} - સિદ્ધિ/કૃપા ગુણ`,
              academicYear,
              subjectId: sc.subject.id,
              subjectName: sc.subject.nameGu,
              totalObtained: sc.finalMarksWithGrace !== null ? sc.finalMarksWithGrace : 0,
              totalMax: 100,
              percentage: sc.finalMarksWithGrace !== null ? sc.finalMarksWithGrace : 0,
              questionMarks: {
                siddhi: siddhiGiven,
                krupa: krupaGiven,
                originalMarks: sc.converted100 ?? 0,
                eligiblePool: activeRes.siddhiPoolEarned,
              },
              overallGrade: sc.grade,
            });
          }
        });
      });

      const idsToDelete: string[] = [];
      filteredStudents.forEach((st) => {
        const studentGrace = currentOverrides[st.id] || {};
        marks.forEach((m) => {
          if (m.studentId === st.id && m.examId === 'siddhi_krupa_grace') {
            const sid = m.subjectId;
            const curG = studentGrace[sid];
            if (!curG || ((curG.siddhi || 0) === 0 && (curG.krupa || 0) === 0)) {
              idsToDelete.push(m.id);
            }
          }
        });
      });

      const uniqueDeleteGraceIds = Array.from(new Set(idsToDelete));
      if (uniqueDeleteGraceIds.length > 0) {
        await bulkDeleteMarks(school.id, uniqueDeleteGraceIds);
      }
      if (recordsToSave.length > 0) {
        await saveBatchExamMarks(school.id, recordsToSave);
      }
      if (uniqueDeleteGraceIds.length > 0 || recordsToSave.length > 0) {
        onRefresh?.();
      }

      setSiddhiDirtyStudents(new Set());
      try {
        localStorage.removeItem(`vidyalayam_pending_grace_${school?.id || 'default'}`);
      } catch (e) {}
      setGraceSyncStatus('synced');
      setTimeout(() => {
        setGraceSyncStatus((prev) => (prev === 'synced' ? 'idle' : prev));
      }, 3000);
    } catch (err) {
      console.error('Grace auto sync error:', err);
      setGraceSyncStatus('offline');
    }
  };

  // Debounced auto-sync trigger for grace marks (450ms)
  const triggerDebouncedGraceSync = (nextOverrides: Record<string, Record<string, { siddhi?: number; krupa?: number }>>) => {
    if (autoSyncGraceTimerRef.current) {
      clearTimeout(autoSyncGraceTimerRef.current);
    }
    setGraceSyncStatus('syncing');
    autoSyncGraceTimerRef.current = setTimeout(() => {
      performAutoSyncGrace(nextOverrides);
    }, 450);
  };

  // Handle Single Subject Grace Change (Siddhi or Krupa)
  // Enforces GSEB rule: student has an overall pool (max 15 for siddhi, max 10 for krupa)
  // And 25-mark rule: student with < 25 marks in a subject cannot receive grace or pass that subject
  const handleGraceChange = (studentId: string, subjectId: string, field: 'siddhi' | 'krupa', rawVal: string) => {
    const trimmed = rawVal.trim();
    const num = trimmed === '' ? 0 : parseInt(trimmed, 10);
    if (isNaN(num) || num < 0) return;

    // Check 25 marks rule: if raw converted marks < 25, grace cannot be given
    const student = activeStandardStudents.find((s) => s.id === studentId);
    if (student) {
      const rawRes = computeClass9StudentResult(student, marks, '700', {});
      const targetScore = rawRes.scores.find((s) => s.subject.id === subjectId);
      if ((targetScore?.converted100 ?? 0) < 25 && num > 0) {
        alert('GSEB નિયમાનુસાર ૨૫ થી ઓછા ગુણ ધરાવતા વિષયમાં ગ્રેસ ગુણ આપી શકાતા નથી અને વિદ્યાર્થી પાસ થઈ શકે નહીં.');
        return;
      }
    }

    // Determine overall pool limit for this student
    let studentMaxPool = field === 'siddhi' ? 15 : 10;
    if (student && field === 'siddhi') {
      const rawRes = computeClass9StudentResult(student, marks, '700', {});
      studentMaxPool = rawRes.siddhiPoolEarned; // strictly capped at 15
    }

    const currentMap = manualGraceOverridesRef.current[studentId] || {};
    let otherSubjectsSum = 0;
    Object.entries(currentMap).forEach(([sid, g]) => {
      if (sid !== subjectId) {
        otherSubjectsSum += (field === 'siddhi' ? g.siddhi : g.krupa) || 0;
      }
    });

    const maxForThisSubject = Math.max(0, studentMaxPool - otherSubjectsSum);
    const validNum = Math.min(maxForThisSubject, num);

    const nextStudentMap = { ...currentMap };
    nextStudentMap[subjectId] = { ...(nextStudentMap[subjectId] || {}), [field]: validNum };
    const nextOverrides = { ...manualGraceOverridesRef.current, [studentId]: nextStudentMap };

    manualGraceOverridesRef.current = nextOverrides;
    setManualGraceOverrides(nextOverrides);
    locallyModifiedStudentsRef.current.add(studentId);
    setSiddhiDirtyStudents((prev) => new Set(prev).add(studentId));

    // 1. Immediate offline local persistence
    try {
      localStorage.setItem(`vidyalayam_grace_overrides_${school?.id || 'default'}`, JSON.stringify(nextOverrides));
    } catch (e) {
      console.error(e);
    }

    // 2. Debounced real-time cloud synchronization
    triggerDebouncedGraceSync(nextOverrides);
  };

  // Standard-aware student result calculation for grace and preview (supports Std 9 and Std 11)
  const computeActiveStdStudentResult = useCallback(
    (student: Student, overrideMap?: Record<string, { siddhi?: number; krupa?: number }>) => {
      if (selectedStandard === '11') {
        return computeClass11StudentResult(student, marks, std11Config, overrideMap, effectiveResultFormat === '700' ? '700' : '900');
      }
      return computeClass9StudentResult(student, marks, effectiveResultFormat === '1000' ? '1000' : '700', overrideMap);
    },
    [selectedStandard, marks, std11Config, effectiveResultFormat]
  );

  // Auto-Apply Grace for a Single Student based on GSEB Rules with immediate auto-sync
  const handleAutoApplyGraceForStudent = (student: Student) => {
    const rawRes = computeActiveStdStudentResult(student, {});
    const pool = rawRes.siddhiPoolEarned;
    const hasUnder25 = rawRes.scores.filter((s) => s.subject.isMainSubject).some((s) => (s.converted100 ?? 0) < 25);

    if (hasUnder25) {
      alert('વિદ્યાર્થીને કોઈ વિષયમાં ૨૫ થી ઓછા ગુણ હોવાથી GSEB નિયમાનુસાર ગ્રેસ મળવાપાત્ર નથી અને પાસ થઈ શકે નહીં.');
      return;
    }

    let remainingSiddhi = pool;
    let remainingKrupa = 10;
    const studentGraces: Record<string, { siddhi?: number; krupa?: number }> = {};

    rawRes.scores.forEach((sc) => {
      const raw = sc.converted100 ?? 0;
      if (raw >= 33) return; // already passed

      const deficit = 33 - raw;
      let siddhiToGive = 0;
      let krupaToGive = 0;

      if (remainingSiddhi >= deficit) {
        siddhiToGive = deficit;
        remainingSiddhi -= deficit;
      } else if (remainingSiddhi > 0) {
        siddhiToGive = remainingSiddhi;
        const stillNeeded = deficit - siddhiToGive;
        remainingSiddhi = 0;
        if (remainingKrupa >= stillNeeded) {
          krupaToGive = stillNeeded;
          remainingKrupa -= stillNeeded;
        }
      } else if (remainingKrupa >= deficit) {
        krupaToGive = deficit;
        remainingKrupa -= deficit;
      }

      studentGraces[sc.subject.id] = {
        siddhi: siddhiToGive,
        krupa: krupaToGive,
      };
    });

    const nextOverrides = { ...manualGraceOverridesRef.current, [student.id]: studentGraces };
    setManualGraceOverrides(nextOverrides);
    setSiddhiDirtyStudents((prev) => new Set(prev).add(student.id));

    try {
      localStorage.setItem(`vidyalayam_grace_overrides_${school?.id || 'default'}`, JSON.stringify(nextOverrides));
    } catch (e) {
      console.error(e);
    }

    performAutoSyncGrace(nextOverrides);
    setSiddhiSaveSuccess(`${student.studentName} માટે નિયમાનુસાર ઓટો-ગ્રેસ લાગુ થયો અને આપોઆપ ક્લાઉડ સિંક થયો.`);
    setTimeout(() => setSiddhiSaveSuccess(null), 3000);
  };

  // Reset Grace for a Student with immediate auto-sync
  const handleResetGraceForStudent = (studentId: string) => {
    const nextOverrides = { ...manualGraceOverridesRef.current };
    delete nextOverrides[studentId];

    setManualGraceOverrides(nextOverrides);
    setSiddhiDirtyStudents((prev) => new Set(prev).add(studentId));

    try {
      localStorage.setItem(`vidyalayam_grace_overrides_${school?.id || 'default'}`, JSON.stringify(nextOverrides));
    } catch (e) {
      console.error(e);
    }

    performAutoSyncGrace(nextOverrides);
  };

  // Batch Auto-Apply Grace for all eligible students in Class 9 / 11 with immediate auto-sync
  const handleBatchAutoApplyGrace = () => {
    let appliedCount = 0;
    const updatedOverrides = { ...manualGraceOverridesRef.current };

    filteredStudents.forEach((student) => {
      const rawRes = computeActiveStdStudentResult(student, {});
      const hasUnder25 = rawRes.scores.filter((s) => s.subject.isMainSubject).some((s) => (s.converted100 ?? 0) < 25);
      if (hasUnder25) return;

      const failingScores = rawRes.scores.filter((s) => (s.converted100 ?? 0) < 33);
      if (failingScores.length === 0) return;

      let remainingSiddhi = rawRes.siddhiPoolEarned;
      let remainingKrupa = 10;
      const studentGraces: Record<string, { siddhi?: number; krupa?: number }> = {};

      failingScores.forEach((sc) => {
        const raw = sc.converted100 ?? 0;
        const deficit = 33 - raw;
        let siddhiToGive = 0;
        let krupaToGive = 0;

        if (remainingSiddhi >= deficit) {
          siddhiToGive = deficit;
          remainingSiddhi -= deficit;
        } else if (remainingSiddhi > 0) {
          siddhiToGive = remainingSiddhi;
          const stillNeeded = deficit - siddhiToGive;
          remainingSiddhi = 0;
          if (remainingKrupa >= stillNeeded) {
            krupaToGive = stillNeeded;
            remainingKrupa -= stillNeeded;
          }
        } else if (remainingKrupa >= deficit) {
          krupaToGive = deficit;
          remainingKrupa -= deficit;
        }

        studentGraces[sc.subject.id] = {
          siddhi: siddhiToGive,
          krupa: krupaToGive,
        };
      });

      updatedOverrides[student.id] = studentGraces;
      appliedCount++;
    });

    setManualGraceOverrides(updatedOverrides);
    try {
      localStorage.setItem(`vidyalayam_grace_overrides_${school?.id || 'default'}`, JSON.stringify(updatedOverrides));
    } catch (e) {
      console.error(e);
    }

    filteredStudents.forEach((s) => setSiddhiDirtyStudents((prev) => new Set(prev).add(s.id)));
    performAutoSyncGrace(updatedOverrides);
    setSiddhiSaveSuccess(`કુલ ${appliedCount} પાત્ર વિદ્યાર્થીઓને ઓટો-ગ્રેસ લાગુ થયો અને આપોઆપ ક્લાઉડ સિંક થઈ ગયો છે.`);
    setTimeout(() => setSiddhiSaveSuccess(null), 4000);
  };


  // Export Result Register to Excel (.xlsx) with optional targetExamMode override
  const handleExportRegisterExcel = (targetExamMode?: 'first_exam' | 'second_exam' | 'annual', targetFormat?: '700' | '1000' | '900') => {
    const examMode = targetExamMode || resultExamMode;
    const formatToUse = targetFormat || effectiveResultFormat;
    const resultsToUse = examMode === resultExamMode && formatToUse === effectiveResultFormat ? allResults : computeMultiStandardAllResults(
      filteredStudents,
      marks,
      selectedStandard,
      selectedStream,
      formatToUse,
      manualGraceOverrides,
      examMode,
      std11Config
    );

    if (resultsToUse.length === 0) {
      alert('એક્સપોર્ટ કરવા માટે કોઈ પરિણામ ઉપલબ્ધ નથી.');
      return;
    }

    const examTitle =
      examMode === 'first_exam'
        ? (selectedStandard === '11' ? 'પ્રથમ પરીક્ષા (૩૫૦ ગુણ)' : 'પ્રથમ પરીક્ષા (૩૦૦ ગુણ)')
        : examMode === 'second_exam'
        ? (selectedStandard === '11' ? 'દ્વિતીય પરીક્ષા (૩૫૦ ગુણ)' : 'દ્વિતીય પરીક્ષા (૩૦૦ ગુણ)')
        : `વાર્ષિક પરિણામ (${formatToUse} ગુણ)`;

    const rows = resultsToUse.map((r, idx) => {
      const rowData: Record<string, any> = {
        'ક્રમ': idx + 1,
        'રોલ નં': r.rollNumber,
        'બેઠક ક્રમાંક': getSeatNumber(r.student.id, r.rollNumber),
        'G.R. નં': r.grNumber,
        'વિદ્યાર્થીનું નામ': r.student.studentName,
        'વર્ગ / સેક્શન': r.section,
      };

      r.scores.forEach((sc) => {
        const markVal = sc.converted100 !== null ? sc.converted100 : '-';
        const graceSuffix = sc.siddhiGiven > 0 ? ` +${sc.siddhiGiven}#` : sc.krupaGiven > 0 ? ` +${sc.krupaGiven}*` : '';
        const maxLabel = examMode === 'annual' ? '૧૦૦' : '૫૦';
        rowData[`${sc.subject.nameGu} (${maxLabel})`] = `${markVal}${graceSuffix}`;
        rowData[`${sc.subject.nameGu} ગ્રેડ`] = sc.grade;
      });

      rowData['કુલ ગુણ'] = r.totalObtained;
      rowData['મહત્તમ ગુણ'] = r.totalMax;
      rowData['ટકાવારી (%)'] = r.percentage;
      rowData['ગ્રેડ'] = r.overallGrade;
      rowData['પરિણામ સ્થિતિ'] = r.overallResultGu;
      rowData['વર્ગમાં ક્રમ'] = r.rank ? r.rank : '-';

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    const sheetName = examMode === 'first_exam' ? 'First_Exam' : examMode === 'second_exam' ? 'Second_Exam' : 'Annual';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${school.schoolName}_Std${selectedStandard}_${sheetName}_${examMode === 'annual' ? formatToUse + 'M_' : ''}Register.xlsx`);
  };

  // Print Result Register (A4 Landscape) with optional targetExamMode override
  const handlePrintRegister = (targetExamMode?: 'first_exam' | 'second_exam' | 'annual', targetFormat?: '700' | '1000' | '900') => {
    const examMode = targetExamMode || resultExamMode;
    const formatToUse = targetFormat || effectiveResultFormat;
    const resultsToUse = examMode === resultExamMode && formatToUse === effectiveResultFormat ? allResults : computeMultiStandardAllResults(
      filteredStudents,
      marks,
      selectedStandard,
      selectedStream,
      formatToUse,
      manualGraceOverrides,
      examMode,
      std11Config
    );

    if (resultsToUse.length === 0) {
      alert('પ્રિન્ટ કરવા માટે કોઈ પરિણામ ઉપલબ્ધ નથી.');
      return;
    }

    const examTitle =
      examMode === 'first_exam'
        ? (selectedStandard === '11' ? 'પ્રથમ સત્રાંત પરીક્ષા પરિણામ રજિસ્ટર (૩૫૦ ગુણ પદ્ધતિ)' : 'પ્રથમ સત્રાંત પરીક્ષા પરિણામ રજિસ્ટર (૩૦૦ ગુણ પદ્ધતિ)')
        : examMode === 'second_exam'
        ? (selectedStandard === '11' ? 'દ્વિતીય સત્રાંત પરીક્ષા પરિણામ રજિસ્ટર (૩૫૦ ગુણ પદ્ધતિ)' : 'દ્વિતીય સત્રાંત પરીક્ષા પરિણામ રજિસ્ટર (૩૦૦ ગુણ પદ્ધતિ)')
        : `વાર્ષિક પરિણામ રજિસ્ટર • ${formatToUse} ગુણ પદ્ધતિ`;

    const subMaxLabel = examMode === 'annual' ? '૧૦૦' : '૫૦';

    const rowsHtml = resultsToUse
      .map(
        (r, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #000; padding: 4px;">${r.rollNumber || idx + 1}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px; font-family: monospace;">${getSeatNumber(r.student.id, r.rollNumber)}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px;">${r.grNumber || '-'}</td>
        <td style="text-align: left; border: 1px solid #000; padding: 4px; font-weight: bold;">${r.student.studentName}</td>
        ${r.scores
          .map(
            (sc) => `
          <td style="text-align: center; border: 1px solid #000; padding: 4px; ${!sc.isPassed ? 'background-color:#fee2e2; color:#991b1b; font-weight:bold;' : ''}">
            ${sc.converted100 !== null ? sc.converted100 : '-'}
            ${sc.siddhiGiven > 0 ? `<span style="font-size:7pt; color:#0f766e;">+${sc.siddhiGiven}#</span>` : ''}
            ${sc.krupaGiven > 0 ? `<span style="font-size:7pt; color:#b45309;">+${sc.krupaGiven}*</span>` : ''}
          </td>
        `
          )
          .join('')}
        <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: 800;">${r.totalObtained}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: bold;">${r.percentage}%</td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: bold;">${r.overallGrade}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px; font-size: 7.5pt; font-weight: bold; ${r.overallResult === 'PASS' ? 'color:#047857;' : 'color:#b91c1c;'}">
          ${r.overallResultGu.split(' ')[0]}
        </td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: 800;">${r.rank ? `#${r.rank}` : '-'}</td>
      </tr>
    `
      )
      .join('');

    const activeRegSubjects = resultsToUse[0]?.scores.map((s) => s.subject) || [];
    const passedCount = resultsToUse.filter((r) => r.overallResult !== 'NEEDS_IMPROVEMENT').length;
    const regPassPct = resultsToUse.length > 0 ? Math.round((passedCount / resultsToUse.length) * 100 * 10) / 10 : 0;

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${school.schoolName} - ધોરણ ${selectedStandard} પરિણામ રજિસ્ટર</title>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Anek Gujarati', system-ui, sans-serif; color: #000; background: #fff; margin: 0; padding: 0; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
          .school-name { font-size: 16pt; font-weight: 800; margin: 0; text-transform: uppercase; }
          .sub-header { font-size: 9pt; margin-top: 2px; }
          .badge { display: inline-block; background: #000; color: #fff; font-size: 10.5pt; font-weight: 800; padding: 2px 14px; border-radius: 4px; margin-top: 4px; }
          .summary-strip { display: flex; justify-content: space-between; font-size: 8.5pt; font-weight: bold; background: #f1f5f9; border: 1px solid #000; padding: 4px 8px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 8pt; }
          th { border: 1px solid #000; background-color: #e2e8f0; padding: 4px; text-align: center; font-weight: 800; }
          .signatures { margin-top: 30px; display: flex; justify-content: space-between; font-size: 9pt; font-weight: bold; padding: 0 40px; }
          .sig-line { border-top: 1px dashed #000; padding-top: 4px; width: 150px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="school-name">${school.schoolName}</h1>
          <div class="sub-header">
            ${school.village ? school.village + ', ' : ''}${school.taluka ? school.taluka + ', ' : ''}${school.district} • DISE: <strong>${school.diseCode}</strong>
          </div>
          <div class="badge">ધોરણ ${selectedStandard} • ${examTitle} • શૈક્ષણિક વર્ષ ${academicYear}</div>
        </div>
        <div class="summary-strip">
          <span>કુલ વિદ્યાર્થી: ${resultsToUse.length}</span>
          <span>ઉત્તીર્ણ: ${passedCount}</span>
          <span>સુધારણા: ${resultsToUse.length - passedCount}</span>
          <span>પરિણામ: ${regPassPct}%</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 28px;">રોલ</th>
              <th style="width: 48px;">બેઠક નં.</th>
              <th style="width: 50px;">G.R.</th>
              <th style="text-align: left;">વિદ્યાર્થીનું નામ</th>
              ${activeRegSubjects.map((sub) => `<th>${sub.nameGu.split(' ')[0]}<br><span style="font-weight:normal; font-size:7pt;">(${subMaxLabel})</span></th>`).join('')}
              <th style="width: 55px;">કુલ (${resultsToUse[0]?.totalMax || 300})</th>
              <th style="width: 40px;">ટકા</th>
              <th style="width: 40px;">ગ્રેડ</th>
              <th style="width: 75px;">પરિણામ</th>
              <th style="width: 35px;">ક્રમ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="signatures">
          <div class="sig-line">વર્ગ શિક્ષકની સહી</div>
          <div class="sig-line">પરીક્ષા સમિતિ સહી</div>
          <div class="sig-line">આચાર્યશ્રી સિક્કો & સહી</div>
        </div>
      </body>
      </html>
    `;

    printHtmlDocument(html, `${school.schoolName}_Std${selectedStandard}_Result_Register`);
  };

  // Print Individual Marksheet (Progress Card - A4 Portrait)
  const handlePrintIndividualMarksheet = () => {
    if (!activeStudentResult) {
      alert('કોઈ વિદ્યાર્થી પસંદ થયેલ નથી.');
      return;
    }

    const isFirstOrSecond = resultExamMode === 'first_exam' || resultExamMode === 'second_exam';
    const examBadgeTitle =
      resultExamMode === 'first_exam'
        ? `પ્રથમ સત્રાંત પરીક્ષા ગુણપત્રક (FIRST TERMINAL MARKSHEET) • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`
        : resultExamMode === 'second_exam'
        ? `દ્વિતીય સત્રાંત પરીક્ષા ગુણપત્રક (SECOND TERMINAL MARKSHEET) • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`
        : marksheetPrintMode === 'simple100'
        ? `વાર્ષિક ગુણપત્રક (ANNUAL MARKSHEET) • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`
        : `વાર્ષિક પ્રગતિ પત્રક (PROGRESS REPORT) • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`;

    let tableContentHtml = '';

    if (isFirstOrSecond) {
      // 6 subjects out of 50
      const rows = activeStudentResult.scores
        .map(
          (sc, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px 12px; font-weight: bold; text-align: left;">${sc.subject.nameGu}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">૫૦</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: 800; font-size: 11pt;">
            ${sc.converted100 !== null ? sc.converted100 : '-'}
          </td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; font-size: 11pt;">${sc.grade}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: ${sc.isPassed ? '#047857' : '#b91c1c'};">
            ${sc.converted100 === null ? '-' : sc.isPassed ? 'ઉત્તીર્ણ (Pass)' : 'સુધારણા (Re-exam)'}
          </td>
        </tr>
      `
        )
        .join('');

      tableContentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 45px;">અનુ. ક્રમ</th>
              <th style="text-align: left; padding-left: 12px;">વિષયનું નામ (Subject)</th>
              <th style="width: 90px;">કુલ ગુણ</th>
              <th style="width: 120px;">મેળવેલ ગુણ (૫૦)</th>
              <th style="width: 80px;">વિષય ગ્રેડ</th>
              <th style="width: 100px;">પરિણામ સ્થિતિ</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    } else if (marksheetPrintMode === 'simple100') {
      // Option 2: Simple 100 Marks Only
      const simpleRows = activeStudentResult.scores
        .map(
          (sc, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 7px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 7px 12px; font-weight: bold; text-align: left;">${sc.subject.nameGu}</td>
          <td style="border: 1px solid #000; padding: 7px; text-align: center; font-weight: 800; font-size: 11pt;">
            ${sc.converted100 !== null ? sc.converted100 : '-'}
            ${sc.siddhiGiven > 0 ? `<span style="color:#0f766e; font-size:8.5pt;"> +${sc.siddhiGiven}#</span>` : ''}
            ${sc.krupaGiven > 0 ? `<span style="color:#b45309; font-size:8.5pt;"> +${sc.krupaGiven}*</span>` : ''}
          </td>
          <td style="border: 1px solid #000; padding: 7px; text-align: center; font-weight: bold; font-size: 10.5pt;">${sc.grade}</td>
        </tr>
      `
        )
        .join('');

      tableContentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 45px;">અનુ. ક્રમ</th>
              <th style="text-align: left; padding-left: 12px;">વિષયનું નામ (Subject)</th>
              <th style="width: 140px;">મેળવેલ ગુણ / ૧૦૦</th>
              <th style="width: 90px;">વિષય ગ્રેડ</th>
            </tr>
          </thead>
          <tbody>
            ${simpleRows}
          </tbody>
        </table>
      `;
    } else {
      // Option 1: Detailed Breakdown
      const detailedRows = activeStudentResult.scores
        .map(
          (sc, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">${sc.subject.nameGu}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${sc.first50 !== null ? sc.first50 : '-'}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${sc.second50 !== null ? sc.second50 : '-'}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${sc.annual80 !== null ? sc.annual80 : '-'}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${sc.internal20 !== null ? sc.internal20 : '-'}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; font-size: 10pt;">
            ${sc.converted100 !== null ? sc.converted100 : '-'}
            ${sc.siddhiGiven > 0 ? `<span style="color:#0f766e; font-size:8pt;">+${sc.siddhiGiven}#</span>` : ''}
            ${sc.krupaGiven > 0 ? `<span style="color:#b45309; font-size:8pt;">+${sc.krupaGiven}*</span>` : ''}
          </td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold;">${sc.grade}</td>
        </tr>
      `
        )
        .join('');

      tableContentHtml = `
        <table>
          <thead>
            <tr>
              <th style="width: 35px;">ક્રમ</th>
              <th style="text-align: left;">વિષયનું નામ</th>
              <th>પ્રથમ (૫૦)</th>
              <th>દ્વિતીય (૫૦)</th>
              <th>વાર્ષિક (૮૦)</th>
              <th>આંતરિક (૨૦)</th>
              <th>કુલ (૧૦૦)</th>
              <th>ગ્રેડ</th>
            </tr>
          </thead>
          <tbody>
            ${detailedRows}
          </tbody>
        </table>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${activeStudentResult.student.studentName} - ધોરણ ${selectedStandard} ગુણપત્રક</title>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Anek Gujarati', system-ui, sans-serif; color: #000; background: #fff; margin: 0; padding: 5px; }
          .border-frame { border: 3px double #000; padding: 18px; min-height: 98vh; display: flex; flex-direction: column; justify-content: space-between; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
          .school-title { font-size: 18pt; font-weight: 800; margin: 0; text-transform: uppercase; }
          .badge { display: inline-block; background: #000; color: #fff; font-size: 10.5pt; font-weight: bold; padding: 3px 16px; border-radius: 4px; margin-top: 6px; }
          .meta-box { border: 1.5px solid #000; padding: 8px 12px; margin-bottom: 14px; font-size: 9.5pt; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; background: #fafafa; }
          table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 14px; }
          th { border: 1px solid #000; background-color: #f1f5f9; padding: 7px; text-align: center; font-weight: 800; }
          .summary-card { border: 1.5px solid #000; padding: 8px 12px; margin-bottom: 14px; display: flex; justify-content: space-around; background: #f8fafc; text-align: center; }
          .sum-lbl { font-size: 8pt; color: #555; font-weight: bold; }
          .sum-val { font-size: 13pt; font-weight: 800; margin-top: 2px; }
          .signatures { margin-top: 35px; display: flex; justify-content: space-between; font-size: 9.5pt; font-weight: 700; padding: 0 15px; }
          .sig-line { border-top: 1.5px dashed #000; padding-top: 5px; width: 160px; text-align: center; }
          .notes { font-size: 8pt; color: #555; border: 1px dashed #777; padding: 6px; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="border-frame">
          <div>
            <div class="header">
              <h1 class="school-title">${school.schoolName}</h1>
              <div style="font-size: 9.5pt; margin-top: 2px;">
                ${school.village ? school.village + ', ' : ''}${school.taluka ? school.taluka + ', ' : ''}${school.district} • DISE: <strong>${school.diseCode}</strong>
              </div>
              <div class="badge">${examBadgeTitle}</div>
            </div>
            <div class="meta-box">
              <div>G.R. નંબર: <strong>${activeStudentResult.grNumber}</strong></div>
              <div>રોલ નંબર: <strong>${activeStudentResult.rollNumber}</strong></div>
              <div>બેઠક ક્રમાંક: <strong>${getSeatNumber(activeStudentResult.student.id, activeStudentResult.rollNumber)}</strong></div>
              <div>ધોરણ & વર્ગ: <strong>ધોરણ ${selectedStandard} (${activeStudentResult.section})</strong></div>
              <div style="grid-column: span 2;">વિદ્યાર્થીનું નામ: <strong>${activeStudentResult.student.studentName}</strong></div>
            </div>
            ${tableContentHtml}
            <div class="summary-card">
              <div><div class="sum-lbl">કુલ મેળવેલ ગુણ</div><div class="sum-val">${activeStudentResult.totalObtained} / ${activeStudentResult.totalMax}</div></div>
              <div><div class="sum-lbl">ટકાવારી (%)</div><div class="sum-val">${activeStudentResult.percentage}%</div></div>
              <div><div class="sum-lbl">પરિણામ ગ્રેડ</div><div class="sum-val">${activeStudentResult.overallGrade}</div></div>
              <div><div class="sum-lbl">વર્ગમાં ક્રમ</div><div class="sum-val">${activeStudentResult.rank ? `#${activeStudentResult.rank}` : '-'}</div></div>
              <div><div class="sum-lbl">પરિણામ સ્થિતિ</div><div class="sum-val" style="color:${activeStudentResult.overallResult === 'PASS' ? '#047857' : '#b91c1c'};">${activeStudentResult.overallResultGu}</div></div>
            </div>
            <div class="notes">
              • પ્રથમ/દ્વિતીય પરીક્ષામાં વિષય દીઠ ૫૦ માંથી ૧૭ ગુણ (૩૩%) પાસિંગ ધોરણ છે.<br>
              • કસોટી મૂલ્યાંકન GSEB નિયમોનુસાર પ્રમાણિત કરવામાં આવેલ છે.
            </div>
          </div>
          <div class="signatures">
            <div class="sig-line">વર્ગ શિક્ષકની સહી</div>
            <div class="sig-line">પરીક્ષા પ્રમુખશ્રી સહી</div>
            <div class="sig-line">આચાર્યશ્રી સિક્કો & સહી</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const cleanName = activeStudentResult.student.studentName.replace(/[\s/\\?%*:|"<>]/g, '_');
    printHtmlDocument(html, `${cleanName}_Std${selectedStandard}_Marksheet`);
  };

  // Print All Marksheets in batch (Multi-page A4 document)
  const handlePrintAllMarksheets = () => {
    if (allResults.length === 0) {
      alert('પ્રિન્ટ કરવા માટે કોઈ પરિણામ ઉપલબ્ધ નથી.');
      return;
    }

    const isFirstOrSecond = resultExamMode === 'first_exam' || resultExamMode === 'second_exam';
    const examBadgeTitle =
      resultExamMode === 'first_exam'
        ? `પ્રથમ સત્રાંત પરીક્ષા ગુણપત્રક • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`
        : resultExamMode === 'second_exam'
        ? `દ્વિતીય સત્રાંત પરીક્ષા ગુણપત્રક • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`
        : marksheetPrintMode === 'simple100'
        ? `વાર્ષિક ગુણપત્રક • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`
        : `વાર્ષિક પ્રગતિ પત્રક • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`;

    const studentPagesHtml = allResults
      .map((r) => {
        let tableContentHtml = '';

        if (isFirstOrSecond) {
          const rows = r.scores
            .map(
              (sc, sIdx) => `
            <tr>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${sIdx + 1}</td>
              <td style="border: 1px solid #000; padding: 6px 10px; font-weight: bold; text-align: left;">${sc.subject.nameGu}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">૫૦</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: 800; font-size: 11pt;">
                ${sc.converted100 !== null ? sc.converted100 : '-'}
              </td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold; font-size: 10.5pt;">${sc.grade}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold; color: ${sc.isPassed ? '#047857' : '#b91c1c'};">
                ${sc.converted100 === null ? '-' : sc.isPassed ? 'ઉત્તીર્ણ' : 'સુધારણા'}
              </td>
            </tr>
          `
            )
            .join('');

          tableContentHtml = `
            <table>
              <thead>
                <tr>
                  <th style="width: 45px;">ક્રમ</th>
                  <th style="text-align: left; padding-left: 10px;">વિષયનું નામ</th>
                  <th style="width: 80px;">કુલ ગુણ</th>
                  <th style="width: 100px;">મેળવેલ ગુણ (૫૦)</th>
                  <th style="width: 75px;">વિષય ગ્રેડ</th>
                  <th style="width: 90px;">પરિણામ</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          `;
        } else {
          const simpleRows = r.scores
            .map(
              (sc, sIdx) => `
            <tr>
              <td style="border: 1px solid #000; padding: 6px; text-align: center;">${sIdx + 1}</td>
              <td style="border: 1px solid #000; padding: 6px 10px; font-weight: bold; text-align: left;">${sc.subject.nameGu}</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: 800; font-size: 11pt;">
                ${sc.converted100 !== null ? sc.converted100 : '-'}
                ${sc.siddhiGiven > 0 ? `<span style="color:#0f766e; font-size:8.5pt;"> +${sc.siddhiGiven}#</span>` : ''}
                ${sc.krupaGiven > 0 ? `<span style="color:#b45309; font-size:8.5pt;"> +${sc.krupaGiven}*</span>` : ''}
              </td>
              <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold; font-size: 10.5pt;">${sc.grade}</td>
            </tr>
          `
            )
            .join('');

          tableContentHtml = `
            <table>
              <thead>
                <tr>
                  <th style="width: 45px;">ક્રમ</th>
                  <th style="text-align: left; padding-left: 10px;">વિષયનું નામ</th>
                  <th style="width: 140px;">મેળવેલ ગુણ / ૧૦૦</th>
                  <th style="width: 90px;">વિષય ગ્રેડ</th>
                </tr>
              </thead>
              <tbody>${simpleRows}</tbody>
            </table>
          `;
        }

        return `
          <div class="marksheet-page" style="page-break-after: always; padding: 10px 0;">
            <div class="border-frame">
              <div>
                <div class="header">
                  <h1 class="school-title">${school.schoolName}</h1>
                  <div style="font-size: 9pt; margin-top: 2px;">
                    ${school.village ? school.village + ', ' : ''}${school.taluka ? school.taluka + ', ' : ''}${school.district} • DISE: <strong>${school.diseCode}</strong>
                  </div>
                  <div class="badge">${examBadgeTitle}</div>
                </div>
                <div class="meta-box">
                  <div>G.R. નંબર: <strong>${r.grNumber || '-'}</strong></div>
                  <div>રોલ નંબર: <strong>${r.rollNumber || '-'}</strong></div>
                  <div>બેઠક ક્રમાંક: <strong>${getSeatNumber(r.student.id, r.rollNumber)}</strong></div>
                  <div>ધોરણ & વર્ગ: <strong>ધોરણ ${selectedStandard} (${r.section})</strong></div>
                  <div style="grid-column: span 2;">વિદ્યાર્થીનું નામ: <strong>${r.student.studentName}</strong></div>
                </div>
                ${tableContentHtml}
                <div class="summary-card">
                  <div><div class="sum-lbl">કુલ મેળવેલ ગુણ</div><div class="sum-val">${r.totalObtained} / ${r.totalMax}</div></div>
                  <div><div class="sum-lbl">ટકાવારી (%)</div><div class="sum-val">${r.percentage}%</div></div>
                  <div><div class="sum-lbl">પરિણામ ગ્રેડ</div><div class="sum-val">${r.overallGrade}</div></div>
                  <div><div class="sum-lbl">વર્ગમાં ક્રમ</div><div class="sum-val">${r.rank ? `#${r.rank}` : '-'}</div></div>
                  <div><div class="sum-lbl">પરિણામ સ્થિતિ</div><div class="sum-val" style="color:${r.overallResult === 'PASS' ? '#047857' : '#b91c1c'};">${r.overallResultGu}</div></div>
                </div>
                <div class="notes">
                  • કસોટી મૂલ્યાંકન GSEB નિયમોનુસાર પ્રમાણિત કરવામાં આવેલ છે.
                </div>
              </div>
              <div class="signatures">
                <div class="sig-line">વર્ગ શિક્ષકની સહી</div>
                <div class="sig-line">પરીક્ષા પ્રમુખશ્રી સહી</div>
                <div class="sig-line">આચાર્યશ્રી સિક્કો & સહી</div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${school.schoolName} - ધોરણ ${selectedStandard} તમામ ગુણપત્રક</title>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Anek Gujarati', system-ui, sans-serif; color: #000; background: #fff; margin: 0; padding: 0; }
          .border-frame { border: 3px double #000; padding: 16px; min-height: 96vh; display: flex; flex-direction: column; justify-content: space-between; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
          .school-title { font-size: 16pt; font-weight: 800; margin: 0; text-transform: uppercase; }
          .badge { display: inline-block; background: #000; color: #fff; font-size: 10pt; font-weight: bold; padding: 2px 14px; border-radius: 4px; margin-top: 4px; }
          .meta-box { border: 1.5px solid #000; padding: 6px 10px; margin-bottom: 10px; font-size: 9pt; display: grid; grid-template-columns: 1fr 1fr; gap: 3px 14px; background: #fafafa; }
          table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 10px; }
          th { border: 1px solid #000; background-color: #f1f5f9; padding: 6px; text-align: center; font-weight: 800; }
          .summary-card { border: 1.5px solid #000; padding: 6px 10px; margin-bottom: 10px; display: flex; justify-content: space-around; background: #f8fafc; text-align: center; }
          .sum-lbl { font-size: 7.5pt; color: #555; font-weight: bold; }
          .sum-val { font-size: 12pt; font-weight: 800; margin-top: 2px; }
          .signatures { margin-top: 25px; display: flex; justify-content: space-between; font-size: 9pt; font-weight: 700; padding: 0 15px; }
          .sig-line { border-top: 1.5px dashed #000; padding-top: 4px; width: 140px; text-align: center; }
          .notes { font-size: 7.5pt; color: #555; border: 1px dashed #777; padding: 4px; margin-top: 4px; }
        </style>
      </head>
      <body>
        ${studentPagesHtml}
      </body>
      </html>
    `;

    printHtmlDocument(html, `${school.schoolName}_Std${selectedStandard}_All_Marksheets`);
  };

  // Card view student navigation
  const currentCardStudent = filteredStudents[cardStudentIndex] || filteredStudents[0];

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Top Banner: Streamlined Standard & Section Control Bar */}
      <div className="glass-panel rounded-2xl sm:rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-3.5 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 relative z-10 flex-wrap">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSafeBack}
              className="p-2 rounded-xl bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-slate-800 dark:text-[#e4ded6] transition-all cursor-pointer shadow-xs shrink-0 border border-[#E2E8F0] dark:border-transparent"
              title="પાછળ જાઓ"
            >
              <ArrowLeft className="w-4 h-4 text-[#C45A2D] dark:text-[#f59c73]" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#C45A2D] text-white shadow-xs">
                  <GraduationCap className="w-3 h-3" />
                  <span>પરિણામ કેન્દ્ર</span>
                </span>
                <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  ધોરણ ૯ થી ૧૨ પરિણામ સિસ્ટમ
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onSwitchToGeneralResults && (
              <button
                type="button"
                onClick={onSwitchToGeneralResults}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
                title="સામાન્ય ગેઝેટ વ્યુ"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">ગેઝેટ વ્યૂ</span>
              </button>
            )}
            <button
              onClick={() => setRulesModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl glass-card text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 border-amber-500/30 transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>નિયમો</span>
            </button>
          </div>
        </div>

        {/* 4 Standards Selector Tabs (Compact for Android) */}
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {STANDARD_TABS.map((tab) => {
              const isSelected = selectedStandard === tab.id;
              const count = studentCountsByStd[tab.id] || 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedStandard(tab.id);
                    setCardStudentIndex(0);
                  }}
                  className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-[#C45A2D] text-white border-[#C45A2D] shadow-xs'
                      : 'bg-white/80 dark:bg-white/5 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-[#C45A2D]/50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-black truncate">{tab.labelGu}</div>
                    <div className={`text-[10px] hidden sm:block truncate ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                      {tab.labelEn}
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold shrink-0 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stream selector if standard 11 or 12 is chosen */}
          {(selectedStandard === '11' || selectedStandard === '12') && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 text-xs overflow-x-auto">
              <span className="font-bold text-amber-900 dark:text-amber-200 px-1.5 shrink-0">પ્રવાહ:</span>
              <button
                type="button"
                onClick={() => setSelectedStream('general')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedStream === 'general' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
                }`}
              >
                સામાન્ય પ્રવાહ
              </button>
              <button
                type="button"
                onClick={() => setSelectedStream('science')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedStream === 'science' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
                }`}
              >
                વિજ્ઞાન પ્રવાહ
              </button>
            </div>
          )}

          {/* Std 11 Subject Selection Panel (7 Main + 2 Co-subs = 900 Marks) */}
          {selectedStandard === '11' && selectedStream === 'general' && (
            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-orange-50/90 via-amber-50/70 to-orange-50/90 dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 border-2 border-orange-200 dark:border-orange-500/30 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-orange-200/70 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#C45A2D] text-white">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      ધોરણ ૧૧ વિષય પસંદગી (૭ મુખ્ય + ૨ સહ-વિષય = ૯૦૦ ગુણ)
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      ગુજરાતી, હિન્દી, અંગ્રેજી (ફરજિયાત) + નીચેના વિષયો પસંદ કરો:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500/10 text-orange-900 dark:text-orange-200 text-xs font-bold font-mono">
                  <span>કુલ: <strong>૯૦૦ ગુણ</strong></span>
                  <span>•</span>
                  <span>સિદ્ધિ: <strong>૯૦૦ માંથી ટકા - ૩૩</strong></span>
                </div>
              </div>

              {/* 3 Interactive Selection Groups */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                {/* Group 1: સંસ્કૃત / મનોવિજ્ઞાન (1 પસંદ કરો) */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-800 dark:text-slate-200">
                    <span>૧. સંસ્કૃત / મનોવિજ્ઞાન:</span>
                    <span className="text-[10px] text-orange-600 font-bold">૧ પસંદ કરો</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateStd11Config({ ...std11Config, electiveLanguage: 'sanskrit' })}
                      className={`p-2 rounded-lg font-bold text-xs transition-all cursor-pointer border text-center ${
                        std11Config.electiveLanguage === 'sanskrit'
                          ? 'bg-[#C45A2D] text-white border-[#C45A2D] shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                      }`}
                    >
                      સંસ્કૃત
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStd11Config({ ...std11Config, electiveLanguage: 'psychology' })}
                      className={`p-2 rounded-lg font-bold text-xs transition-all cursor-pointer border text-center ${
                        std11Config.electiveLanguage === 'psychology'
                          ? 'bg-[#C45A2D] text-white border-[#C45A2D] shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-300'
                      }`}
                    >
                      મનોવિજ્ઞાન
                    </button>
                  </div>
                </div>

                {/* Group 2: કોઈપણ ૩ પસંદ કરો (અર્થશાસ્ત્ર, સમાજશાસ્ત્ર, રાજ્યશાસ્ત્ર, ઇતિહાસ, ભૂગોળ, તત્વજ્ઞાન) */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-800 dark:text-slate-200">
                    <span>૨. ૬ માંથી ૩ વિષય પસંદ કરો:</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      (std11Config.electiveGroup || []).length === 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {(std11Config.electiveGroup || []).length}/૩ પસંદ
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'economics', label: 'અર્થશાસ્ત્ર' },
                      { id: 'sociology', label: 'સમાજશાસ્ત્ર' },
                      { id: 'political_science', label: 'રાજ્યશાસ્ત્ર' },
                      { id: 'history', label: 'ઇતિહાસ' },
                      { id: 'geography', label: 'ભૂગોળ' },
                      { id: 'philosophy', label: 'તત્વજ્ઞાન' },
                    ].map((opt) => {
                      const isChosen = (std11Config.electiveGroup || []).includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleStd11ElectiveGroup(opt.id)}
                          className={`p-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border truncate text-center ${
                            isChosen
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Group 3: સહ-વિષયો (ઉદ્યોગ + ૧ પસંદ કરો) */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-800 dark:text-slate-200">
                    <span>૩. સહ-વિષય (ઉદ્યોગ + ૧):</span>
                    <span className="text-[10px] text-teal-700 font-bold">૨૦૦ ગુણ</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => updateStd11Config({ ...std11Config, electiveCoSub: 'computer_studies' })}
                      className={`p-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border text-center ${
                        std11Config.electiveCoSub === 'computer_studies'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-300'
                      }`}
                    >
                      કોમ્પ્યુટર
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStd11Config({ ...std11Config, electiveCoSub: 'art_drawing' })}
                      className={`p-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border text-center ${
                        std11Config.electiveCoSub === 'art_drawing'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-300'
                      }`}
                    >
                      ચિત્રકલા
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStd11Config({ ...std11Config, electiveCoSub: 'music' })}
                      className={`p-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border text-center ${
                        std11Config.electiveCoSub === 'music'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-300'
                      }`}
                    >
                      સંગીત
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Selected Subjects Ribbon */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1">
                <span className="font-black text-slate-700 dark:text-slate-300">સક્રિય વિષયો (૯):</span>
                {std11Active.mainSubjects.map((s) => (
                  <span key={s.id} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
                    {s.nameGu.split(' ')[0]}
                  </span>
                ))}
                {std11Active.coSubjects.map((s) => (
                  <span key={s.id} className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700 font-bold text-teal-800 dark:text-teal-200">
                    {s.nameGu.split(' ')[0]} (સહ)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section & Academic Year Controls (Fast 1-tap pills for Android) */}
          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {availableSections.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-bold text-slate-600 dark:text-slate-400 mr-1">સેક્શન:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSection('ALL');
                      setCardStudentIndex(0);
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedSection === 'ALL'
                        ? 'bg-[#C45A2D] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    બધા ({activeStandardStudents.length})
                  </button>
                  {availableSections.map((sec) => {
                    const secCount = activeStandardStudents.filter((s) => (s.section || s.division || 'A').toUpperCase() === sec).length;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setSelectedSection(sec);
                          setCardStudentIndex(0);
                        }}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedSection === sec
                            ? 'bg-[#C45A2D] text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {sec} ({secCount})
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-600 dark:text-slate-400">વર્ષ:</span>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-white font-mono text-xs"
                >
                  <option value="૨૦૨૬–૨૭">૨૦૨૬–૨૭</option>
                  <option value="૨૦૨૫–૨૬">૨૦૨૫–૨૬</option>
                </select>
              </div>
            </div>

            <div className="text-slate-500 text-[11px] font-medium">
              છાત્રો: <strong className="text-slate-800 dark:text-slate-200 font-mono">{filteredStudents.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main View Tabs: Marks Entry | Download Section | Result Register | Marksheet */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => handleSwitchTab('marks_entry')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewTab === 'marks_entry'
                ? 'bg-[#C45A2D] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>📝 ગુણ એન્ટ્રી</span>
            {dirtyKeys.size > 0 && <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />}
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('download_section')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewTab === 'download_section'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 bg-emerald-500/10'
            }`}
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>📥 ડાઉનલોડ સેક્શન</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('result_register')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewTab === 'result_register'
                ? 'bg-[#C45A2D] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>📋 રજિસ્ટર</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('individual_marksheet')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewTab === 'individual_marksheet'
                ? 'bg-[#C45A2D] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>🎓 માર્કશીટ</span>
          </button>

          {(selectedStandard === '9' || selectedStandard === '11') && (
            <button
              type="button"
              onClick={() => handleSwitchTab('siddhi_krupa_entry')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewTab === 'siddhi_krupa_entry'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm'
                  : 'text-amber-800 dark:text-amber-300 hover:text-amber-900 bg-amber-500/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>✨ સિદ્ધિ–કૃપા</span>
            </button>
          )}
        </div>

        {/* Quick export/print buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleExportRegisterExcel()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Excel ફાઇલ ડાઉનલોડ કરો"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            type="button"
            onClick={() => handlePrintRegister()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="A4 રજિસ્ટર પ્રિન્ટ / PDF કરો"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">રજિસ્ટર</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip - Compact 1-line on mobile, full grid on tablet/desktop */}
      <div className="space-y-2">
        <div className="flex sm:hidden items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs text-xs">
          <div className="flex items-center gap-2.5 font-bold text-slate-700 dark:text-slate-300">
            <span>કુલ: <strong className="text-slate-900 dark:text-white font-mono">{stats.total}</strong></span>
            <span>•</span>
            <span>પાસ: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{stats.directPass + stats.siddhiCount + stats.krupaCount}</strong></span>
            <span>•</span>
            <span>ટકા: <strong className="text-[#C45A2D] dark:text-[#f59c73] font-mono">{stats.passPct}%</strong></span>
          </div>
          <button
            type="button"
            onClick={() => setShowDetailedKpi(!showDetailedKpi)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white underline cursor-pointer"
          >
            {showDetailedKpi ? 'ઓછું કરો ▲' : 'વિગત ▼'}
          </button>
        </div>

        <div className={`${showDetailedKpi ? 'grid' : 'hidden sm:grid'} grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2`}>
          <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">કુલ છાત્રો</div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">સીધા પાસ</div>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.directPass}</div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center">
            <div className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase">સિદ્ધિ (#)</div>
            <div className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5">{stats.siddhiCount}</div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">કૃપા (*)</div>
            <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.krupaCount}</div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
            <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">સુધારણા</div>
            <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">{stats.failCount}</div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
            <div className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase">સંપૂર્ણ ગુણ</div>
            <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{stats.completeCount}</div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-[#C45A2D]/10 border border-[#C45A2D]/20 text-center col-span-2 sm:col-span-1">
            <div className="text-[10px] font-bold text-[#C45A2D] dark:text-[#f59c73] uppercase">પરિણામ ટકા</div>
            <div className="text-base sm:text-lg font-black text-[#C45A2D] dark:text-[#f59c73] mt-0.5">{stats.passPct}%</div>
          </div>
        </div>
      </div>

      {/* VIEW TAB: DEDICATED DOWNLOAD SECTION (ડાઉનલોડ સેક્શન) */}
      {viewTab === 'download_section' && (
        <div className="glass-panel rounded-2xl sm:rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-4 sm:p-6 shadow-lg space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <span>ધોરણ {selectedStandard} • ડાઉનલોડ & પ્રિન્ટ સેક્શન (Download Center)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedSection !== 'ALL' ? `સેક્શન ${selectedSection} • ` : 'બધા સેક્શન • '} શૈક્ષણિક વર્ષ {academicYear}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                કુલ છાત્રો: <strong className="text-slate-900 dark:text-white font-mono">{filteredResults.length}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold">
                પાસ: <strong className="font-mono">{stats.directPass + stats.siddhiCount + stats.krupaCount}</strong> ({stats.passPct}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Excel Downloads Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/20 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <div className="p-2 rounded-xl bg-emerald-500/10">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">Excel પરિણામ રજિસ્ટર</h3>
                  <div className="text-[11px] text-slate-500">MS Excel (.xlsx) ફાઇલ ડાઉનલોડ</div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleExportRegisterExcel('first_exam')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-200 text-xs font-bold transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>🥇 પ્રથમ પરીક્ષા Excel ({selectedStandard === '10' ? '૪૮૦ ગુણ' : selectedStandard === '11' ? '૩૫૦ ગુણ' : '૩૦૦ ગુણ'})</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-70">.xlsx</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportRegisterExcel('second_exam')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-200 text-xs font-bold transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>🥈 દ્વિતીય / પ્રિલિમ પરીક્ષા Excel ({selectedStandard === '10' ? '૪૮૦ ગુણ' : selectedStandard === '11' ? '૩૫૦ ગુણ' : '૩૦૦ ગુણ'})</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-70">.xlsx</span>
                </button>

                {selectedStandard === '10' ? (
                  <button
                    type="button"
                    onClick={() => handleExportRegisterExcel('annual', '700')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-3.5 h-3.5" />
                      <span>🏆 વાર્ષિક આખરી પરિણામ Excel (૬૦૦ ગુણ)</span>
                    </span>
                    <span className="text-[10px] font-mono opacity-80">.xlsx</span>
                  </button>
                ) : selectedStandard === '11' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExportRegisterExcel('annual', '700')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5" />
                        <span>🏆 વાર્ષિક રજિસ્ટર Excel (Annual-700)</span>
                      </span>
                      <span className="text-[10px] font-mono opacity-80">.xlsx</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportRegisterExcel('annual', '900')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5" />
                        <span>🏆 વાર્ષિક રજિસ્ટર Excel (Annual-900)</span>
                      </span>
                      <span className="text-[10px] font-mono opacity-80">.xlsx</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExportRegisterExcel('annual', '700')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5" />
                        <span>🏆 વાર્ષિક રજિસ્ટર Excel (Annual-700)</span>
                      </span>
                      <span className="text-[10px] font-mono opacity-80">.xlsx</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportRegisterExcel('annual', '1000')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5" />
                        <span>🏆 વાર્ષિક રજિસ્ટર Excel (Annual-1000)</span>
                      </span>
                      <span className="text-[10px] font-mono opacity-80">.xlsx</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 2. PDF & A4 Register Print Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/20 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <div className="p-2 rounded-xl bg-indigo-500/10">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">A4 પરિણામ રજિસ્ટર (PDF)</h3>
                  <div className="text-[11px] text-slate-500">લેન્ડસ્કેપ ફોર્મેટ પ્રિન્ટ / PDF</div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handlePrintRegister('first_exam')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-900 dark:text-indigo-200 text-xs font-bold transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800"
                >
                  <span className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>🥇 પ્રથમ પરીક્ષા રજિસ્ટર (A4)</span>
                  </span>
                  <span className="text-[10px] opacity-70">પ્રિન્ટ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintRegister('second_exam')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-900 dark:text-indigo-200 text-xs font-bold transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800"
                >
                  <span className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>🥈 દ્વિતીય પરીક્ષા રજિસ્ટર (A4)</span>
                  </span>
                  <span className="text-[10px] opacity-70">પ્રિન્ટ</span>
                </button>

                {selectedStandard === '10' ? (
                  <button
                    type="button"
                    onClick={() => handlePrintRegister('annual', '700')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                  >
                    <span className="flex items-center gap-2">
                      <Printer className="w-3.5 h-3.5" />
                      <span>🏆 વાર્ષિક આખરી રજિસ્ટર A4 (૬૦૦ ગુણ)</span>
                    </span>
                    <span className="text-[10px] opacity-80">પ્રિન્ટ</span>
                  </button>
                ) : selectedStandard === '11' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePrintRegister('annual', '700')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Printer className="w-3.5 h-3.5" />
                        <span>🏆 વાર્ષિક રજિસ્ટર A4 (Annual-700)</span>
                      </span>
                      <span className="text-[10px] opacity-80">પ્રિન્ટ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintRegister('annual', '900')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Printer className="w-3.5 h-3.5" />
                        <span>🏆 વાર્ષિક રજિસ્ટર A4 (Annual-900)</span>
                      </span>
                      <span className="text-[10px] opacity-80">પ્રિન્ટ</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePrintRegister('annual', '700')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Printer className="w-3.5 h-3.5" />
                        <span>🏆 વાર્ષિક રજિસ્ટર A4 (Annual-700)</span>
                      </span>
                      <span className="text-[10px] opacity-80">પ્રિન્ટ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintRegister('annual', '1000')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Printer className="w-3.5 h-3.5" />
                        <span>🏆 વાર્ષિક રજિસ્ટર A4 (Annual-1000)</span>
                      </span>
                      <span className="text-[10px] opacity-80">પ્રિન્ટ</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 3. Marksheet Print & Batch Download Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-[#C45A2D]/20 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-[#C45A2D]">
                <div className="p-2 rounded-xl bg-[#C45A2D]/10">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">વિદ્યાર્થી ગુણપત્રક (Marksheet)</h3>
                  <div className="text-[11px] text-slate-500">A4 પોર્ટ્રેટ વ્યક્તિગત / સામૂહિક પ્રિન્ટ</div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={handlePrintAllMarksheets}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-black transition-all cursor-pointer shadow-xs"
                >
                  <span className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5" />
                    <span>🎓 બધા છાત્રોની માર્કશીટ એકસાથે પ્રિન્ટ / PDF</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-80">{filteredResults.length} છાત્રો</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchTab('individual_marksheet')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 text-orange-900 dark:text-orange-200 text-xs font-bold transition-all cursor-pointer border border-orange-200 dark:border-orange-800"
                >
                  <span className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-orange-600" />
                    <span>📄 વ્યક્તિગત માર્કશીટ જુઓ</span>
                  </span>
                  <span className="text-[10px] opacity-70">વ્યૂઅર</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 1: MARKS ENTRY (SUBJECT-WISE COLUMNS FOR THE CHOSEN EXAM!) */}
      {viewTab === 'marks_entry' && (
        <div className="glass-panel rounded-2xl sm:rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-3.5 sm:p-5 shadow-lg space-y-3 sm:space-y-4">
          {/* Header & Save Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#C45A2D]" />
                <span>
                  ધોરણ {selectedStandard} • {marksEntryExams.find((e) => e.id === marksEntryExamId)?.nameGu || 'પરીક્ષા'} ગુણ એન્ટ્રી
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle Table vs Mobile Card Mode */}
              <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setEntryLayoutMode('table')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    entryLayoutMode === 'table' ? 'bg-white dark:bg-slate-900 text-[#C45A2D] shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>કોષ્ટક</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryLayoutMode('card')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    entryLayoutMode === 'card' ? 'bg-white dark:bg-slate-900 text-[#C45A2D] shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>કાર્ડ</span>
                </button>
              </div>

              {/* Live Zero-Button Auto Cloud Sync Pill */}
              <div className="flex items-center gap-1">
                {cloudSyncStatus === 'syncing' ? (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                    <span>સિંક...</span>
                  </div>
                ) : cloudSyncStatus === 'synced' ? (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>✓ સાચવેલું</span>
                  </div>
                ) : cloudSyncStatus === 'offline' ? (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>ઑફલાઇન</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>☁️ ઓટો સિંક</span>
                  </div>
                )}
              </div>

              {/* Std 10 Subject Selection Toolbar Button */}
              {selectedStandard === '10' && (
                <button
                  type="button"
                  onClick={() => setStd10SubjectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/40 dark:hover:bg-orange-900/50 text-[#C45A2D] dark:text-[#f59c73] border border-[#C45A2D]/30 text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>વિષય પસંદગી પત્રક ({std10Config?.isFinalized ? '✓ ફાઇનલ' : '⚠️ બાકી'})</span>
                </button>
              )}

              {/* Clear Exam Marks from Cloud */}
              {marksEntryExamId !== 'siddhi_krupa_entry' && (
                <button
                  type="button"
                  onClick={handleClearExamMarks}
                  disabled={isClearingExamMarks}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="આ પરીક્ષાના તમામ ગુણ ક્લાઉડમાંથી ડિલીટ (સાફ) કરો"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  <span>{isClearingExamMarks ? '...' : 'સાફ'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Std 10 Subject Selection Mandatory Prompt Banner */}
          {selectedStandard === '10' && !std10Config?.isFinalized && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-pulse">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <div className="font-black text-xs sm:text-sm">
                    ⚠️ ધોરણ ૧૦ ના વૈકલ્પિક વિષયો પસંદ કરવા ફરજિયાત છે!
                  </div>
                  <div className="text-[11px] sm:text-xs text-amber-900 dark:text-amber-300 mt-0.5">
                    ગુણ એન્ટ્રી કરતાં પહેલાં વિદ્યાર્થીવાર ગણિત (બેઝિક/સ્ટાન્ડર્ડ), સંસ્કૃત/હિન્દી અને પી.ટી./કમ્પ્યુટર પસંદ કરી સાચવો (Save કરો).
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStd10SubjectModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white font-black text-xs transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>વિષય પસંદગી કરો & અનલૉક કરો</span>
              </button>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Exam Selector Segmented Tabs (Clean single-line pills for Android) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {marksEntryExams.map((ex) => {
                const isActive = marksEntryExamId === ex.id;
                const isSiddhiKrupa = ex.id === 'siddhi_krupa_entry';

                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setMarksEntryExamId(ex.id);
                      if (isSiddhiKrupa) {
                        setViewTab('siddhi_krupa_entry');
                      }
                    }}
                    className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? isSiddhiKrupa
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-500 shadow-sm'
                          : 'bg-[#C45A2D] text-white border-[#C45A2D] shadow-sm'
                        : isSiddhiKrupa
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:border-amber-400'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-[#C45A2D]/50'
                    }`}
                  >
                    {isSiddhiKrupa && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                    <span>{ex.nameGu}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-controls for Internal Assessment (Components vs Direct) */}
          {marksEntryExamId === 'internal_assessment' && (
            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-indigo-950 dark:text-indigo-200">આંતરિક ગુણ પદ્ધતિ:</span>
                  <div className="flex items-center gap-1 p-0.5 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setInternalEntryMode('components')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        internalEntryMode === 'components'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      ✨ વિગતવાર ઘટકો (૫+૫+૫+૫)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInternalEntryMode('direct')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        internalEntryMode === 'direct'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      📋 સીધા ૨૦ માંથી
                    </button>
                  </div>
                </div>
              </div>

              {internalEntryMode === 'components' && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">વિષય પસંદ કરો:</div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {allActiveInternalSubjects.map((subj) => (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => setInternalSelectedSubjId(subj.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                          internalSelectedSubjId === subj.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : subj.isPrayogik
                            ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-700 hover:bg-teal-100'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{subj.nameGu}</span>
                        {subj.isPrayogik && <span className="ml-1 text-[10px] opacity-80">(૧૦+૧૦)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SPREADSHEET TABLE MODE */}
          {entryLayoutMode === 'table' && (
            <div className="border-2 border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
              <div className="overflow-x-auto max-h-[550px] relative">
                {/* 1. SPECIAL CASE A: PRAYOGIK ANNUAL (40 Theory + 40 Practical = 80 per subject) */}
                {marksEntryExamId === 'prayogik_annual' ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 sticky top-0 z-20 shadow-xs font-bold">
                      <tr>
                        <th rowSpan={2} className="py-2 px-1 border border-slate-300 dark:border-slate-700 w-11 sm:w-14 text-center sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 text-[10px] sm:text-xs font-bold">
                          <div>બેઠક</div>
                          <div className="text-[9px] font-normal opacity-70">નંબર</div>
                        </th>
                        <th rowSpan={2} className="py-2 px-1.5 border border-slate-300 dark:border-slate-700 sticky left-11 sm:left-14 z-30 bg-slate-100 dark:bg-slate-800 w-24 sm:w-40 min-w-[92px] max-w-[105px] sm:max-w-[180px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] text-left text-[10px] sm:text-xs font-bold">
                          વિદ્યાર્થીનું નામ
                        </th>
                        {prayogikSubjects.map((sub) => (
                          <th key={sub.id} colSpan={3} className="py-2 px-2 border border-slate-300 dark:border-slate-700 text-center bg-teal-500/10 text-teal-900 dark:text-teal-200 font-black">
                            {sub.nameGu} (કુલ ૮૦)
                          </th>
                        ))}
                        <th rowSpan={2} className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 text-center w-24 bg-indigo-500/10 font-black text-indigo-900 dark:text-indigo-200">
                          કુલ ({prayogikSubjects.length * 80})
                        </th>
                        <th rowSpan={2} className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 text-center w-16 bg-indigo-500/10 font-black text-indigo-900 dark:text-indigo-200">
                          ટકા
                        </th>
                      </tr>
                      <tr>
                        {prayogikSubjects.map((sub) => (
                          <React.Fragment key={sub.id}>
                            <th className="py-1 px-1 border border-slate-300 dark:border-slate-700 text-center min-w-[65px] bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 text-[10px]">
                              થિયરી (૪૦)
                            </th>
                            <th className="py-1 px-1 border border-slate-300 dark:border-slate-700 text-center min-w-[65px] bg-teal-50 dark:bg-teal-900/30 text-teal-900 dark:text-teal-200 text-[10px]">
                              પ્રાયોગિક (૪૦)
                            </th>
                            <th className="py-1 px-1 border border-slate-300 dark:border-slate-700 text-center min-w-[50px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200 font-black text-[10px]">
                              કુલ (૮૦)
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[10px] sm:text-xs">
                      {filteredStudents.map((student) => {
                        let totalRowObtained = 0;
                        let anyMarksEntered = false;

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                            <td className="py-1.5 px-1 text-center font-mono font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-11 sm:w-14 text-[10px] sm:text-xs">
                              {getSeatNumber(student.id, student.rollNumber)}
                            </td>
                            <td className="py-1.5 px-1.5 font-bold text-slate-900 dark:text-white sticky left-11 sm:left-14 z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] text-[10px] sm:text-xs leading-tight whitespace-normal break-words w-24 sm:w-40 min-w-[92px] max-w-[105px] sm:max-w-[180px]">
                              {student.studentName}
                            </td>

                            {prayogikSubjects.map((sub) => {
                              const keyTh = `${student.id}_${sub.id}_theory40`;
                              const keyPr = `${student.id}_${sub.id}_practical40`;
                              const valTh = gridInputs[keyTh] || '';
                              const valPr = gridInputs[keyPr] || '';

                              const numTh = valTh.toUpperCase() === 'AB' ? 0 : parseFloat(valTh) || 0;
                              const numPr = valPr.toUpperCase() === 'AB' ? 0 : parseFloat(valPr) || 0;
                              const hasSubMark = valTh !== '' || valPr !== '';
                              if (hasSubMark) anyMarksEntered = true;
                              const subTotal = hasSubMark ? numTh + numPr : null;
                              if (subTotal !== null) totalRowObtained += subTotal;

                              return (
                                <React.Fragment key={sub.id}>
                                  <td className="py-1.5 px-0.5 sm:px-1 text-center border border-slate-200 dark:border-slate-800">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={valTh}
                                      placeholder="0-40"
                                      onFocus={() => {
                                        focusedCellKeyRef.current = keyTh;
                                      }}
                                      onBlur={() => {
                                        if (focusedCellKeyRef.current === keyTh) {
                                          focusedCellKeyRef.current = null;
                                        }
                                        if (dirtyKeysRef.current.has(keyTh)) {
                                          triggerDebouncedMarksSync(undefined, true);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      onChange={(e) => handleCellChange(keyTh, e.target.value, 40)}
                                      className={`w-12 sm:w-16 h-8 sm:h-9 px-1 text-center font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border-2 transition-all block mx-auto ${
                                        dirtyKeys.has(keyTh)
                                          ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                      }`}
                                    />
                                  </td>
                                  <td className="py-1.5 px-0.5 sm:px-1 text-center border border-slate-200 dark:border-slate-800">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={valPr}
                                      placeholder="0-40"
                                      onFocus={() => {
                                        focusedCellKeyRef.current = keyPr;
                                      }}
                                      onBlur={() => {
                                        if (focusedCellKeyRef.current === keyPr) {
                                          focusedCellKeyRef.current = null;
                                        }
                                        if (dirtyKeysRef.current.has(keyPr)) {
                                          triggerDebouncedMarksSync(undefined, true);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      onChange={(e) => handleCellChange(keyPr, e.target.value, 40)}
                                      className={`w-12 sm:w-16 h-8 sm:h-9 px-1 text-center font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border-2 transition-all block mx-auto ${
                                        dirtyKeys.has(keyPr)
                                          ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                      }`}
                                    />
                                  </td>
                                  <td className="py-1.5 px-1 text-center font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                                    {subTotal !== null ? subTotal : '-'}
                                  </td>
                                </React.Fragment>
                              );
                            })}

                            <td className="py-1.5 px-1.5 text-center font-black text-slate-900 dark:text-white bg-indigo-500/10 border border-slate-200 dark:border-slate-800">
                              {anyMarksEntered ? totalRowObtained : '-'}
                            </td>
                            <td className="py-1.5 px-1.5 text-center font-bold text-[#C45A2D] bg-indigo-500/10 border border-slate-200 dark:border-slate-800">
                              {anyMarksEntered ? `${Math.round((totalRowObtained / 240) * 100 * 10) / 10}%` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : marksEntryExamId === 'internal_assessment' && internalEntryMode === 'components' ? (
                  /* 2. SPECIAL CASE B: INTERNAL ASSESSMENT COMPONENTS (5+5+5+5 for Main, 10+10 for Prayogik) */
                  (() => {
                    const activeSub = ALL_CLASS_9_SUBJECTS.find((s) => s.id === internalSelectedSubjId) || ALL_CLASS_9_SUBJECTS[0];

                    return (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 sticky top-0 z-20 shadow-xs font-bold">
                          <tr>
                            <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 w-11 sm:w-14 text-center sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 text-[10px] sm:text-xs font-bold">
                              <div>બેઠક</div>
                              <div className="text-[9px] font-normal opacity-70">નંબર</div>
                            </th>
                            <th className="py-2 px-1.5 border-b border-slate-300 dark:border-slate-700 sticky left-11 sm:left-14 z-30 bg-slate-100 dark:bg-slate-800 w-24 sm:w-40 min-w-[92px] max-w-[105px] sm:max-w-[180px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] text-left text-[10px] sm:text-xs font-bold">
                              વિદ્યાર્થીનું નામ
                            </th>

                            {activeSub.isPrayogik ? (
                              <>
                                <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center min-w-[80px] bg-teal-500/10 text-teal-900 dark:text-teal-200 font-black text-[10px] sm:text-xs">
                                  પ્રાયોગિક (૧૦)
                                </th>
                                <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center min-w-[80px] bg-teal-500/10 text-teal-900 dark:text-teal-200 font-black text-[10px] sm:text-xs">
                                  કૌશલ્ય (૧૦)
                                </th>
                              </>
                            ) : (
                                <>
                                <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center min-w-[75px] bg-amber-500/10 text-amber-900 dark:text-amber-200 font-black text-[10px]">
                                  <div>કસોટી ૧ (૫)</div>
                                  <div className="text-[9px] font-normal text-amber-700 dark:text-amber-300">૨૫ થી ઓટો</div>
                                </th>
                                <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center min-w-[75px] bg-amber-500/10 text-amber-900 dark:text-amber-200 font-black text-[10px]">
                                  <div>કસોટી ૨ (૫)</div>
                                  <div className="text-[9px] font-normal text-amber-700 dark:text-amber-300">૨૫ થી ઓટો</div>
                                </th>
                                <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center min-w-[70px] bg-amber-500/10 text-amber-900 dark:text-amber-200 font-black text-[10px]">
                                  <div>સજ્જતા (૫)</div>
                                  <div className="text-[9px] font-normal opacity-80">(એન્ટ્રી)</div>
                                </th>
                                <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center min-w-[70px] bg-amber-500/10 text-amber-900 dark:text-amber-200 font-black text-[10px]">
                                  <div>નોટબુક (૫)</div>
                                  <div className="text-[9px] font-normal opacity-80">(એન્ટ્રી)</div>
                                </th>
                              </>
                            )}

                            <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center w-20 bg-indigo-500/10 font-black text-indigo-900 dark:text-indigo-200 text-[10px] sm:text-xs">
                              કુલ (૨૦)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[10px] sm:text-xs">
                          {filteredStudents.map((student) => {
                            if (activeSub.isPrayogik) {
                              const kPrac = `${student.id}_${activeSub.id}_internal_practical_work`;
                              const kSkill = `${student.id}_${activeSub.id}_internal_continuous_eval`;
                              const vPrac = gridInputs[kPrac] || '';
                              const vSkill = gridInputs[kSkill] || '';

                              const nPrac = vPrac.toUpperCase() === 'AB' ? 0 : parseFloat(vPrac) || 0;
                              const nSkill = vSkill.toUpperCase() === 'AB' ? 0 : parseFloat(vSkill) || 0;
                              const hasAny = vPrac !== '' || vSkill !== '';
                              const tot20 = hasAny ? Math.min(20, Math.round(nPrac + nSkill)) : null;

                              return (
                                <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                  <td className="py-1.5 px-1 text-center font-mono font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-11 sm:w-14 text-[10px] sm:text-xs">
                                    {getSeatNumber(student.id, student.rollNumber)}
                                  </td>
                                  <td className="py-1.5 px-1.5 font-bold text-slate-900 dark:text-white sticky left-11 sm:left-14 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] text-[10px] sm:text-xs leading-tight whitespace-normal break-words w-24 sm:w-40 min-w-[92px] max-w-[105px] sm:max-w-[180px]">
                                    {student.studentName}
                                  </td>

                                  <td className="py-1.5 px-0.5 sm:px-1 text-center">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={vPrac}
                                      placeholder="0-10"
                                      onChange={(e) => handleCellChange(kPrac, e.target.value, 10)}
                                      className={`w-12 sm:w-16 h-8 sm:h-9 px-1 text-center font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border-2 transition-all block mx-auto ${
                                        dirtyKeys.has(kPrac)
                                          ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                      }`}
                                    />
                                  </td>

                                  <td className="py-1.5 px-0.5 sm:px-1 text-center">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={vSkill}
                                      placeholder="0-10"
                                      onChange={(e) => handleCellChange(kSkill, e.target.value, 10)}
                                      className={`w-12 sm:w-16 h-8 sm:h-9 px-1 text-center font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border-2 transition-all block mx-auto ${
                                        dirtyKeys.has(kSkill)
                                          ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                      }`}
                                    />
                                  </td>

                                  <td className="py-1.5 px-1.5 text-center font-black text-slate-900 dark:text-white bg-indigo-500/10 text-xs sm:text-sm">
                                    {tot20 !== null ? tot20 : '-'}
                                  </td>
                                </tr>
                              );
                            }

                            // Main Subject: 5 + 5 + 5 + 5 (PT1 auto /5, PT2 auto /5, Competency 5, Notebook 5)
                            const kRawPt1 = `${student.id}_${activeSub.id}_periodic_test_1`;
                            const kRawPt2 = `${student.id}_${activeSub.id}_periodic_test_2`;
                            const rawPt1 = gridInputs[kRawPt1];
                            const rawPt2 = gridInputs[kRawPt2];

                            const convPt1 = rawPt1 === 'AB' ? 0 : (rawPt1 !== undefined && rawPt1 !== '' ? Math.round(((parseFloat(rawPt1) || 0) / 25) * 5 * 10) / 10 : null);
                            const convPt2 = rawPt2 === 'AB' ? 0 : (rawPt2 !== undefined && rawPt2 !== '' ? Math.round(((parseFloat(rawPt2) || 0) / 25) * 5 * 10) / 10 : null);

                            const kPt1 = `${student.id}_${activeSub.id}_internal_pt1`;
                            const kPt2 = `${student.id}_${activeSub.id}_internal_pt2`;
                            const effPt1 = convPt1 !== null ? convPt1 : (gridInputs[kPt1] !== undefined && gridInputs[kPt1] !== '' ? (gridInputs[kPt1].toUpperCase() === 'AB' ? 0 : parseFloat(gridInputs[kPt1]) || 0) : null);
                            const effPt2 = convPt2 !== null ? convPt2 : (gridInputs[kPt2] !== undefined && gridInputs[kPt2] !== '' ? (gridInputs[kPt2].toUpperCase() === 'AB' ? 0 : parseFloat(gridInputs[kPt2]) || 0) : null);

                            const kComp = `${student.id}_${activeSub.id}_internal_competency`;
                            const kNote = `${student.id}_${activeSub.id}_internal_notebook`;

                            const vComp = gridInputs[kComp] || '';
                            const vNote = gridInputs[kNote] || '';

                            const n1 = effPt1 ?? 0;
                            const n2 = effPt2 ?? 0;
                            const n3 = vComp.toUpperCase() === 'AB' ? 0 : parseFloat(vComp) || 0;
                            const n4 = vNote.toUpperCase() === 'AB' ? 0 : parseFloat(vNote) || 0;

                            const hasAny = effPt1 !== null || effPt2 !== null || vComp !== '' || vNote !== '';
                            const tot20 = hasAny ? Math.min(20, Math.round(n1 + n2 + n3 + n4)) : null;

                            return (
                              <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                <td className="py-1.5 px-1 text-center font-mono font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-11 sm:w-14 text-[10px] sm:text-xs">
                                  {getSeatNumber(student.id, student.rollNumber)}
                                </td>
                                <td className="py-1.5 px-1.5 font-bold text-slate-900 dark:text-white sticky left-11 sm:left-14 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] text-[10px] sm:text-xs leading-tight whitespace-normal break-words w-24 sm:w-40 min-w-[92px] max-w-[105px] sm:max-w-[180px]">
                                  {student.studentName}
                                </td>

                                {/* PT1 Auto Converted Badge */}
                                <td className="py-2 px-1 text-center">
                                  <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                                    <span className="font-black text-amber-950 dark:text-amber-200 text-xs">
                                      {effPt1 !== null ? `${effPt1} / ૫` : '-'}
                                    </span>
                                    <span className="text-[9px] text-amber-700 dark:text-amber-400 font-mono">
                                      {rawPt1 !== undefined && rawPt1 !== '' ? `(કસોટી: ${rawPt1}/૨૫)` : '(૨૫ માંથી બાકી)'}
                                    </span>
                                  </div>
                                </td>

                                {/* PT2 Auto Converted Badge */}
                                <td className="py-2 px-1 text-center">
                                  <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                                    <span className="font-black text-amber-950 dark:text-amber-200 text-xs">
                                      {effPt2 !== null ? `${effPt2} / ૫` : '-'}
                                    </span>
                                    <span className="text-[9px] text-amber-700 dark:text-amber-400 font-mono">
                                      {rawPt2 !== undefined && rawPt2 !== '' ? `(કસોટી: ${rawPt2}/૨૫)` : '(૨૫ માંથી બાકી)'}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-1.5 px-0.5 sm:px-1 text-center">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={vComp}
                                    placeholder="0-5"
                                    onChange={(e) => handleCellChange(kComp, e.target.value, 5)}
                                    className={`w-12 sm:w-16 h-8 sm:h-9 px-1 text-center font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border-2 transition-all block mx-auto ${
                                      dirtyKeys.has(kComp)
                                        ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                    }`}
                                  />
                                </td>

                                <td className="py-1.5 px-0.5 sm:px-1 text-center">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={vNote}
                                    placeholder="0-5"
                                    onChange={(e) => handleCellChange(kNote, e.target.value, 5)}
                                    className={`w-12 sm:w-16 h-8 sm:h-9 px-1 text-center font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border-2 transition-all block mx-auto ${
                                      dirtyKeys.has(kNote)
                                        ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                    }`}
                                  />
                                </td>

                                <td className="py-1.5 px-1.5 text-center font-black text-slate-900 dark:text-white bg-indigo-500/10 text-xs sm:text-sm">
                                  {tot20 !== null ? tot20 : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()
                ) : (
                  /* 3. STANDARD SPREADSHEET TABLE (First Exam, Second Exam, Annual 80 Main, PT1, PT2, Direct Internal) */
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 sticky top-0 z-20 shadow-xs font-bold text-[10px] sm:text-xs">
                      <tr>
                        <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 w-11 sm:w-14 text-center sticky left-0 z-30 bg-slate-100 dark:bg-slate-800">
                          <div>બેઠક</div>
                          <div className="text-[9px] font-normal opacity-70">નંબર</div>
                        </th>
                        <th className="py-2 px-1.5 border-b border-slate-300 dark:border-slate-700 sticky left-11 sm:left-14 z-30 bg-slate-100 dark:bg-slate-800 w-24 sm:w-40 min-w-[92px] max-w-[105px] sm:max-w-[180px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] text-left">
                          વિદ્યાર્થીનું નામ
                        </th>
                        {/* Subject Columns for this Exam */}
                        {entrySubjects.map((sub) => (
                          <th
                            key={sub.id}
                            className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center min-w-[56px] sm:min-w-[80px] bg-amber-500/10 text-amber-900 dark:text-amber-200 font-black"
                          >
                            <div className="truncate">{sub.nameGu}</div>
                            <div className="text-[9px] sm:text-[10px] font-normal opacity-80">({entryMaxMarks})</div>
                          </th>
                        ))}
                        <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center w-12 sm:w-20 bg-indigo-500/10 font-black text-indigo-900 dark:text-indigo-200">
                          <div>કુલ</div>
                          <div className="text-[9px] font-normal opacity-80">({entryTotalMax})</div>
                        </th>
                        <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center w-11 sm:w-16 bg-indigo-500/10 font-black text-indigo-900 dark:text-indigo-200">
                          ટકા
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[10px] sm:text-xs">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4 + entrySubjects.length} className="py-12 text-center text-slate-500 font-bold">
                            કોઈ વિદ્યાર્થીઓ નોંધાયેલા મળ્યા નથી.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student) => {
                          let rowObtained = 0;
                          let hasAnyMark = false;

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="py-1.5 px-1 text-center font-mono font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-11 sm:w-14">
                                {getSeatNumber(student.id, student.rollNumber)}
                              </td>
                              <td className="py-1.5 px-1.5 font-bold text-slate-900 dark:text-white sticky left-11 sm:left-14 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] text-[10px] sm:text-xs leading-tight whitespace-normal break-words w-24 sm:w-40 min-w-[92px] max-w-[105px] sm:max-w-[180px]">
                                {student.studentName}
                              </td>

                              {/* Subject-Wise Input Cells with Fixed Border Visibility */}
                              {entrySubjects.map((sub) => {
                                const cellKey = `${student.id}_${sub.id}_${marksEntryExamId}`;
                                const cellVal = gridInputs[cellKey] || '';
                                if (cellVal !== '') {
                                  hasAnyMark = true;
                                  if (cellVal.trim().toUpperCase() !== 'AB') {
                                    rowObtained += parseFloat(cellVal) || 0;
                                  }
                                }

                                return (
                                  <td key={sub.id} className="py-1.5 px-0.5 sm:px-1 text-center min-w-[56px] sm:min-w-[80px]">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={cellVal}
                                      placeholder={`0-${entryMaxMarks}`}
                                      onFocus={() => {
                                        focusedCellKeyRef.current = cellKey;
                                      }}
                                      onBlur={() => {
                                        if (focusedCellKeyRef.current === cellKey) {
                                          focusedCellKeyRef.current = null;
                                        }
                                        if (dirtyKeysRef.current.has(cellKey)) {
                                          triggerDebouncedMarksSync(undefined, true);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      onChange={(e) => handleCellChange(cellKey, e.target.value, entryMaxMarks)}
                                      className={`w-12 sm:w-16 h-8 sm:h-9 px-1 text-center font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border-2 transition-all shadow-xs outline-none block mx-auto ${
                                        dirtyKeys.has(cellKey)
                                          ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D] dark:bg-[#9d512d]/30 dark:text-[#f59c73]'
                                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#C45A2D]'
                                      }`}
                                    />
                                  </td>
                                );
                              })}

                              {/* Live Computed Row Total */}
                              <td className="py-1.5 px-1 text-center font-black text-slate-900 dark:text-white bg-indigo-500/5 text-xs">
                                {hasAnyMark ? rowObtained : '-'}
                              </td>

                              {/* Live Computed Row % */}
                              <td className="py-1.5 px-1 text-center font-bold text-[#C45A2D] bg-indigo-500/5 text-xs">
                                {hasAnyMark ? `${Math.round((rowObtained / entryTotalMax) * 100 * 10) / 10}%` : '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Layout Mode 2: MOBILE STUDENT CARD (Quick Single-Student Input) */}
          {entryLayoutMode === 'card' && currentCardStudent && (
            <div className="bg-white dark:bg-slate-900 border-2 border-[#C45A2D]/30 rounded-3xl p-5 shadow-lg space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500">વિદ્યાર્થી {cardStudentIndex + 1} of {filteredStudents.length}</span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {currentCardStudent.studentName}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono">
                    રોલ: <strong>{currentCardStudent.rollNumber || '-'}</strong> • G.R.: <strong>{currentCardStudent.grNumber || '-'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={cardStudentIndex <= 0}
                    onClick={() => setCardStudentIndex((i) => Math.max(0, i - 1))}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  </button>
                  <button
                    type="button"
                    disabled={cardStudentIndex >= filteredStudents.length - 1}
                    onClick={() => setCardStudentIndex((i) => Math.min(filteredStudents.length - 1, i + 1))}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  </button>
                </div>
              </div>

              {/* CARD MODE: Special Prayogik vs Internal vs Standard */}
              {marksEntryExamId === 'prayogik_annual' ? (
                <div className="space-y-4">
                  {CLASS_9_PRAYOGIK_SUBJECTS.map((sub) => {
                    const keyTh = `${currentCardStudent.id}_${sub.id}_theory40`;
                    const keyPr = `${currentCardStudent.id}_${sub.id}_practical40`;
                    const valTh = gridInputs[keyTh] || '';
                    const valPr = gridInputs[keyPr] || '';
                    const numTh = valTh.toUpperCase() === 'AB' ? 0 : parseFloat(valTh) || 0;
                    const numPr = valPr.toUpperCase() === 'AB' ? 0 : parseFloat(valPr) || 0;
                    const subTot = valTh !== '' || valPr !== '' ? numTh + numPr : null;

                    return (
                      <div key={sub.id} className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-teal-950 dark:text-teal-200">{sub.nameGu}</span>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            કુલ: <strong>{subTot !== null ? subTot : '-'}</strong> / ૮૦
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">થિયરી (૪૦ ગુણ)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={valTh}
                              placeholder="0-40"
                              onChange={(e) => handleCellChange(keyTh, e.target.value, 40)}
                              className={`w-full h-11 px-2 text-center font-black text-sm rounded-xl border-2 transition-all ${
                                dirtyKeys.has(keyTh)
                                  ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">પ્રાયોગિક (૪૦ ગુણ)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={valPr}
                              placeholder="0-40"
                              onChange={(e) => handleCellChange(keyPr, e.target.value, 40)}
                              className={`w-full h-11 px-2 text-center font-black text-sm rounded-xl border-2 transition-all ${
                                dirtyKeys.has(keyPr)
                                  ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : marksEntryExamId === 'internal_assessment' && internalEntryMode === 'components' ? (
                (() => {
                  const activeSub = ALL_CLASS_9_SUBJECTS.find((s) => s.id === internalSelectedSubjId) || ALL_CLASS_9_SUBJECTS[0];

                  if (activeSub.isPrayogik) {
                    const kPrac = `${currentCardStudent.id}_${activeSub.id}_internal_practical_work`;
                    const kSkill = `${currentCardStudent.id}_${activeSub.id}_internal_continuous_eval`;
                    const vPrac = gridInputs[kPrac] || '';
                    const vSkill = gridInputs[kSkill] || '';
                    const n1 = vPrac.toUpperCase() === 'AB' ? 0 : parseFloat(vPrac) || 0;
                    const n2 = vSkill.toUpperCase() === 'AB' ? 0 : parseFloat(vSkill) || 0;
                    const tot20 = vPrac !== '' || vSkill !== '' ? Math.min(20, Math.round(n1 + n2)) : null;

                    return (
                      <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-950 dark:text-indigo-200">{activeSub.nameGu} (પ્રાયોગિક આંતરિક)</span>
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">કુલ: {tot20 !== null ? tot20 : '-'} / ૨૦</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">પ્રાયોગિક કાર્ય (૧૦)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={vPrac}
                              placeholder="0-10"
                              onChange={(e) => handleCellChange(kPrac, e.target.value, 10)}
                              className="w-full h-11 px-2 text-center font-black text-sm rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">સાતત્યપૂર્ણ કૌશલ્ય (૧૦)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={vSkill}
                              placeholder="0-10"
                              onChange={(e) => handleCellChange(kSkill, e.target.value, 10)}
                              className="w-full h-11 px-2 text-center font-black text-sm rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Main Subject: 5+5+5+5 (Auto PT1 /5, Auto PT2 /5, Competency 5, Notebook 5)
                  const kRawPt1 = `${currentCardStudent.id}_${activeSub.id}_periodic_test_1`;
                  const kRawPt2 = `${currentCardStudent.id}_${activeSub.id}_periodic_test_2`;
                  const rawPt1 = gridInputs[kRawPt1];
                  const rawPt2 = gridInputs[kRawPt2];

                  const convPt1 = rawPt1 === 'AB' ? 0 : (rawPt1 !== undefined && rawPt1 !== '' ? Math.round(((parseFloat(rawPt1) || 0) / 25) * 5 * 10) / 10 : null);
                  const convPt2 = rawPt2 === 'AB' ? 0 : (rawPt2 !== undefined && rawPt2 !== '' ? Math.round(((parseFloat(rawPt2) || 0) / 25) * 5 * 10) / 10 : null);

                  const kPt1 = `${currentCardStudent.id}_${activeSub.id}_internal_pt1`;
                  const kPt2 = `${currentCardStudent.id}_${activeSub.id}_internal_pt2`;
                  const effPt1 = convPt1 !== null ? convPt1 : (gridInputs[kPt1] !== undefined && gridInputs[kPt1] !== '' ? (gridInputs[kPt1].toUpperCase() === 'AB' ? 0 : parseFloat(gridInputs[kPt1]) || 0) : null);
                  const effPt2 = convPt2 !== null ? convPt2 : (gridInputs[kPt2] !== undefined && gridInputs[kPt2] !== '' ? (gridInputs[kPt2].toUpperCase() === 'AB' ? 0 : parseFloat(gridInputs[kPt2]) || 0) : null);

                  const kComp = `${currentCardStudent.id}_${activeSub.id}_internal_competency`;
                  const kNote = `${currentCardStudent.id}_${activeSub.id}_internal_notebook`;
                  const vComp = gridInputs[kComp] || '';
                  const vNote = gridInputs[kNote] || '';
                  const n1 = effPt1 ?? 0;
                  const n2 = effPt2 ?? 0;
                  const n3 = vComp.toUpperCase() === 'AB' ? 0 : parseFloat(vComp) || 0;
                  const n4 = vNote.toUpperCase() === 'AB' ? 0 : parseFloat(vNote) || 0;
                  const hasAny = effPt1 !== null || effPt2 !== null || vComp !== '' || vNote !== '';
                  const tot20 = hasAny ? Math.min(20, Math.round(n1 + n2 + n3 + n4)) : null;

                  return (
                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-950 dark:text-amber-200">{activeSub.nameGu} (મુખ્ય આંતરિક)</span>
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">કુલ: {tot20 !== null ? tot20 : '-'} / ૨૦</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-center flex flex-col justify-center">
                          <label className="text-[10px] font-bold text-slate-500 block">કસોટી ૧ (૫)</label>
                          <span className="font-black text-amber-900 dark:text-amber-200 text-sm mt-0.5">
                            {effPt1 !== null ? `${effPt1} / ૫` : '-'}
                          </span>
                          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-mono">
                            {rawPt1 ? `(${rawPt1}/૨૫)` : '(૨૫ માંથી ઓટો)'}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-center flex flex-col justify-center">
                          <label className="text-[10px] font-bold text-slate-500 block">કસોટી ૨ (૫)</label>
                          <span className="font-black text-amber-900 dark:text-amber-200 text-sm mt-0.5">
                            {effPt2 !== null ? `${effPt2} / ૫` : '-'}
                          </span>
                          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-mono">
                            {rawPt2 ? `(${rawPt2}/૨૫)` : '(૨૫ માંથી ઓટો)'}
                          </span>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">સજ્જતા (૫)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={vComp}
                            placeholder="0-5"
                            onChange={(e) => handleCellChange(kComp, e.target.value, 5)}
                            className="w-full h-10 px-1 text-center font-black text-sm rounded-xl border-2 border-slate-300 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">નોટબુક (૫)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={vNote}
                            placeholder="0-5"
                            onChange={(e) => handleCellChange(kNote, e.target.value, 5)}
                            className="w-full h-10 px-1 text-center font-black text-sm rounded-xl border-2 border-slate-300 bg-white dark:bg-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* Standard Subject Input Fields in Clean 2-Column Mobile Grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {entrySubjects.map((sub) => {
                    const cellKey = `${currentCardStudent.id}_${sub.id}_${marksEntryExamId}`;
                    const cellVal = gridInputs[cellKey] || '';

                    return (
                      <div key={sub.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{sub.nameGu}</label>
                          <span className="text-[10px] text-slate-500">/{entryMaxMarks}</span>
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={cellVal}
                          placeholder={`0-${entryMaxMarks}`}
                          onChange={(e) => handleCellChange(cellKey, e.target.value, entryMaxMarks)}
                          className={`w-full h-11 px-2 text-center font-black text-base rounded-xl border-2 transition-all ${
                            dirtyKeys.has(cellKey)
                              ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={cardStudentIndex <= 0}
                  onClick={() => setCardStudentIndex((i) => Math.max(0, i - 1))}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs cursor-pointer"
                >
                  ← પાછળનો વિદ્યાર્થી
                </button>
                <button
                  type="button"
                  disabled={cardStudentIndex >= filteredStudents.length - 1}
                  onClick={() => setCardStudentIndex((i) => Math.min(filteredStudents.length - 1, i + 1))}
                  className="px-4 py-2 rounded-xl bg-[#C45A2D] text-white font-bold text-xs cursor-pointer"
                >
                  આગળનો વિદ્યાર્થી →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW TAB 2: RESULT REGISTER (FIRST / SECOND / ANNUAL REGISTER) */}
      {viewTab === 'result_register' && (
        <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#C45A2D]" />
                <span>
                  ધોરણ {selectedStandard} • {resultExamMode === 'first_exam' ? 'પ્રથમ પરીક્ષા પરિણામ' : resultExamMode === 'second_exam' ? 'દ્વિતીય પરીક્ષા પરિણામ' : 'વાર્ષિક પરિણામ રજિસ્ટર'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {resultExamMode === 'first_exam' || resultExamMode === 'second_exam'
                  ? '૬ મુખ્ય વિષયો (વિષય દીઠ ૫૦ ગુણ • કુલ ૩૦૦ ગુણ) પત્રક.'
                  : `વાર્ષિક આખરી પરિણામ પત્રક (${resultFormat} ગુણ પદ્ધતિ).`}
              </p>
            </div>

            {/* Exam Filter Buttons in Register: First Exam | Second Exam | Annual */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setResultExamMode('first_exam')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  resultExamMode === 'first_exam' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                🥇 પ્રથમ પરીક્ષા
              </button>
              <button
                type="button"
                onClick={() => setResultExamMode('second_exam')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  resultExamMode === 'second_exam' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                🥈 દ્વિતીય પરીક્ષા
              </button>
              <button
                type="button"
                onClick={() => setResultExamMode('annual')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  resultExamMode === 'annual' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                🏆 વાર્ષિક પરિણામ
              </button>
            </div>

            {/* Annual Format Selector: 700 vs 1000 (Std 9) | 700 vs 900 (Std 11) - Hidden for Std 10 */}
            {resultExamMode === 'annual' && selectedStandard !== '10' && (
              <div className="flex items-center gap-1 p-1 bg-amber-500/10 dark:bg-amber-950/30 rounded-2xl border border-amber-300 dark:border-amber-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setResultFormat('700')}
                  className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                    effectiveResultFormat === '700'
                      ? 'bg-[#C45A2D] text-white shadow-xs'
                      : 'text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  }`}
                >
                  Annual-700
                </button>
                <button
                  type="button"
                  onClick={() => setResultFormat(selectedStandard === '11' ? '900' : '1000')}
                  className={`px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                    effectiveResultFormat !== '700'
                      ? 'bg-[#C45A2D] text-white shadow-xs'
                      : 'text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  }`}
                >
                  {selectedStandard === '11' ? 'Annual-900' : 'Annual-1000'}
                </button>
              </div>
            )}
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="નામ / રોલ / G.R. શોધો..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white w-48 sm:w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="ALL">બધા પરિણામ ({allResults.length})</option>
              <option value="PASS">માત્ર ઉત્તીર્ણ</option>
              <option value="FAIL">સુધારણા જરૂરી</option>
            </select>
          </div>

          {/* Result Register Table */}
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 sticky top-0 z-10 shadow-xs font-bold text-center">
                  <tr>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-12">રોલ</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-20">બેઠક નં.</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-16">G.R.</th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-left min-w-[180px]">વિદ્યાર્થીનું નામ</th>
                    {allResults[0]?.scores.map((sc) => (
                      <th key={sc.subject.id} className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 min-w-[70px]">
                        {sc.subject.nameGu}
                        <span className="block text-[9px] font-normal text-slate-500">
                          ({resultExamMode === 'annual' ? '૧૦૦' : '૫૦'})
                        </span>
                      </th>
                    ))}
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-16 bg-amber-500/10 font-black">
                      કુલ ({allResults[0]?.totalMax || 300})
                    </th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-14 bg-amber-500/10 font-black">ટકા</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-12 bg-amber-500/10 font-black">ગ્રેડ</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-24">પરિણામ</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-12 font-black">રેન્ક</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-center">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-slate-500 font-bold">
                        કોઈ પરિણામ રેકોર્ડ મળ્યો નથી.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r, idx) => (
                      <tr key={r.student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2 px-2 font-bold text-slate-900 dark:text-white">{r.rollNumber || idx + 1}</td>
                        <td className="py-2 px-2 font-mono text-slate-700 dark:text-slate-300 font-bold bg-slate-50/50 dark:bg-slate-800/40">{getSeatNumber(r.student.id, r.rollNumber)}</td>
                        <td className="py-2 px-2 text-slate-500 font-mono">{r.grNumber || '-'}</td>
                        <td className="py-2 px-3 text-left font-bold text-slate-900 dark:text-white truncate">
                          {r.student.studentName}
                        </td>

                        {/* Subject marks */}
                        {r.scores.map((sc) => (
                          <td
                            key={sc.subject.id}
                            className={`py-2 px-1 font-bold ${
                              !sc.isPassed ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' : ''
                            }`}
                          >
                            <span>{sc.converted100 !== null ? sc.converted100 : '-'}</span>
                          </td>
                        ))}

                        <td className="py-2 px-2 font-black text-slate-900 dark:text-white bg-amber-500/5">
                          {r.totalObtained}
                        </td>
                        <td className="py-2 px-2 font-bold text-[#C45A2D] bg-amber-500/5">
                          {r.percentage}%
                        </td>
                        <td className="py-2 px-2 font-black text-slate-900 dark:text-white bg-amber-500/5">
                          {r.overallGrade}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              r.overallResult === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            {r.overallResultGu.split(' ')[0]}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-black text-indigo-600 dark:text-indigo-400">
                          {r.rank ? `#${r.rank}` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 3: INDIVIDUAL MARKSHEET (વ્યક્તિગત ગુણપત્રક) */}
      {viewTab === 'individual_marksheet' && (
        <div className="space-y-4">
          {/* Controls Bar: Student Selector & Exam Switcher & Print Action */}
          <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">વિદ્યાર્થી:</span>
              <select
                value={selectedStudentId || (activeStudentResult?.student.id || '')}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
              >
                {allResults.map((r) => (
                  <option key={r.student.id} value={r.student.id}>
                    રોલ {r.rollNumber || '-'} • {r.student.studentName} ({r.percentage}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Exam selector for Marksheet */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setResultExamMode('first_exam')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    resultExamMode === 'first_exam' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🥇 પ્રથમ પરીક્ષા
                </button>
                <button
                  type="button"
                  onClick={() => setResultExamMode('second_exam')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    resultExamMode === 'second_exam' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🥈 દ્વિતીય પરીક્ષા
                </button>
                <button
                  type="button"
                  onClick={() => setResultExamMode('annual')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    resultExamMode === 'annual' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🏆 વાર્ષિક
                </button>
              </div>

              {resultExamMode === 'annual' && selectedStandard !== '10' && (
                <>
                  <div className="flex items-center gap-1 p-1 bg-amber-500/10 dark:bg-amber-950/30 rounded-2xl border border-amber-300 dark:border-amber-700/60 text-xs">
                    <button
                      type="button"
                      onClick={() => setResultFormat('700')}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        effectiveResultFormat === '700' ? 'bg-[#C45A2D] text-white' : 'text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      Annual-700
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultFormat(selectedStandard === '11' ? '900' : '1000')}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        effectiveResultFormat !== '700' ? 'bg-[#C45A2D] text-white' : 'text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      {selectedStandard === '11' ? 'Annual-900' : 'Annual-1000'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setMarksheetPrintMode('simple100')}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        marksheetPrintMode === 'simple100' ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      ૧૦૦ માંથી
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarksheetPrintMode('detailed')}
                      className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        marksheetPrintMode === 'detailed' ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      વિગતવાર
                    </button>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handlePrintIndividualMarksheet}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>માર્કશીટ પ્રિન્ટ / PDF</span>
              </button>
            </div>
          </div>

          {/* Marksheet Live A4 Preview Card */}
          {activeStudentResult && (
            <div className="bg-white text-slate-900 p-6 sm:p-10 rounded-3xl border-2 border-slate-300 shadow-2xl max-w-4xl mx-auto font-sans">
              <div className="border-4 border-double border-slate-800 p-6 sm:p-8 rounded-xl space-y-6">
                {/* Header */}
                <div className="text-center border-b-2 border-slate-800 pb-4">
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900">
                    {school.schoolName}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    ${school.village ? school.village + ', ' : ''}${school.taluka ? school.taluka + ', ' : ''}${school.district} • DISE: <strong>{school.diseCode}</strong>
                  </p>
                  <div className="inline-block px-4 py-1.5 rounded-md bg-slate-900 text-white font-bold text-xs mt-3 uppercase tracking-wider">
                    {resultExamMode === 'first_exam'
                      ? `પ્રથમ સત્રાંત પરીક્ષા પરિણામ પત્રક (FIRST TERMINAL REPORT) • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`
                      : resultExamMode === 'second_exam'
                      ? `દ્વિતીય સત્રાંત પરીક્ષા પરિણામ પત્રક (SECOND TERMINAL REPORT) • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`
                      : `વાર્ષિક પરિણામ પત્રક (ANNUAL MARKSHEET) • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`}
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block text-[10px]">વિદ્યાર્થીનું નામ:</span>
                    <span className="font-bold text-slate-900">{activeStudentResult.student.studentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">બેઠક ક્રમાંક (Seat):</span>
                    <span className="font-bold text-[#C45A2D] font-mono">{getSeatNumber(activeStudentResult.student.id, activeStudentResult.rollNumber)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">G.R. નંબર:</span>
                    <span className="font-bold text-slate-900">{activeStudentResult.grNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">રોલ નંબર:</span>
                    <span className="font-bold text-slate-900">{activeStudentResult.rollNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ધોરણ & સેક્શન:</span>
                    <span className="font-bold text-slate-900">ધોરણ {selectedStandard} ({activeStudentResult.section})</span>
                  </div>
                </div>

                {/* Marksheet Table */}
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 text-center font-bold">
                    <tr>
                      <th className="border border-slate-300 py-2.5 px-3 w-14">અનુ. ક્રમ</th>
                      <th className="border border-slate-300 py-2.5 px-4 text-left">વિષયનું નામ (Subject)</th>
                      <th className="border border-slate-300 py-2.5 px-3 w-28">કુલ ગુણ</th>
                      <th className="border border-slate-300 py-2.5 px-3 w-36">મેળવેલ ગુણ</th>
                      <th className="border border-slate-300 py-2.5 px-3 w-28">વિષય ગ્રેડ</th>
                      <th className="border border-slate-300 py-2.5 px-3 w-32">પરિણામ સ્થિતિ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStudentResult.scores.map((sc, idx) => (
                      <tr key={sc.subject.id} className="text-center hover:bg-slate-50">
                        <td className="border border-slate-300 py-2.5 px-3 font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 py-2.5 px-4 text-left font-bold">{sc.subject.nameGu}</td>
                        <td className="border border-slate-300 py-2.5 px-3">{resultExamMode === 'annual' ? '૧૦૦' : '૫૦'}</td>
                        <td className="border border-slate-300 py-2.5 px-3 font-black text-sm">
                          {sc.converted100 !== null ? sc.converted100 : '-'}
                        </td>
                        <td className="border border-slate-300 py-2.5 px-3 font-bold text-xs">{sc.grade}</td>
                        <td className="border border-slate-300 py-2.5 px-3 font-bold text-xs">
                          {sc.converted100 === null ? '-' : sc.isPassed ? (
                            <span className="text-emerald-700">ઉત્તીર્ણ (Pass)</span>
                          ) : (
                            <span className="text-rose-700">સુધારણા (Re-exam)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary Card with Auto-Calculated Totals, Percentage & Rank */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-100 border border-slate-300 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">કુલ મેળવેલ ગુણ</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{activeStudentResult.totalObtained} / {activeStudentResult.totalMax}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">ટકાવારી (%)</div>
                    <div className="text-lg font-black text-[#C45A2D] mt-0.5">{activeStudentResult.percentage}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">પરિણામ ગ્રેડ</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{activeStudentResult.overallGrade}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">વર્ગમાં ક્રમ</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">{activeStudentResult.rank ? `#${activeStudentResult.rank}` : '-'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">પરિણામ સ્થિતિ</div>
                    <div className="text-xs font-black text-emerald-700 mt-1">{activeStudentResult.overallResultGu}</div>
                  </div>
                </div>

                {/* Signatures Block */}
                <div className="pt-8 flex justify-between items-center text-xs font-bold text-slate-800 px-4">
                  <div className="border-t-2 border-dashed border-slate-700 pt-1.5 w-36 text-center">
                    વર્ગ શિક્ષકની સહી
                  </div>
                  <div className="border-t-2 border-dashed border-slate-700 pt-1.5 w-36 text-center">
                    પરીક્ષા સમિતિ સહી
                  </div>
                  <div className="border-t-2 border-dashed border-slate-700 pt-1.5 w-44 text-center">
                    આચાર્યશ્રી સિક્કો & સહી
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW TAB 4: SIDDHI-KRUPA MARKS ENTRY (સિદ્ધિ–કૃપા ગુણ એન્ટ્રી - CLASS 9 ONLY) */}
      {(selectedStandard === '9' || selectedStandard === '11') && viewTab === 'siddhi_krupa_entry' && (
        <div className="space-y-5">
          {/* Exam Selector Segmented Tabs (All 8 GSEB Exams - quick switching) */}
          <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-4 shadow-sm space-y-1.5">
            <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider">પરીક્ષા પસંદ કરો (Exam):</div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {marksEntryExams.map((ex) => {
                const isActive = marksEntryExamId === ex.id;
                const isSiddhiKrupa = ex.id === 'siddhi_krupa_entry';

                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setMarksEntryExamId(ex.id);
                      if (isSiddhiKrupa) {
                        setViewTab('siddhi_krupa_entry');
                      } else {
                        setViewTab('marks_entry');
                      }
                    }}
                    className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border ${
                      isActive
                        ? isSiddhiKrupa
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-500 shadow-md scale-[1.01]'
                          : 'bg-[#C45A2D] text-white border-[#C45A2D] shadow-md scale-[1.01]'
                        : isSiddhiKrupa
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:border-amber-400'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-[#C45A2D]/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 justify-center">
                      {isSiddhiKrupa && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                      <span>{ex.nameGu}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* GSEB Class 9 Rules Guidance Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-300 dark:border-amber-700/60 shadow-lg space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-200">
                    ધોરણ {selectedStandard} • સિદ્ધિ–કૃપા ગુણ એન્ટ્રી ({effectiveResultFormat} ગુણ પદ્ધતિ)
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    ગુજરાત માધ્યમિક અને ઉચ્ચતર માધ્યમિક શિક્ષણ બોર્ડ (GSEB) ના નિયમોનુસાર સિદ્ધિ અને કૃપા ગુણ આપવાનું પત્રક.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Format toggle for Siddhi */}
                <div className="flex items-center gap-1 p-1 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-amber-300 dark:border-amber-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setResultFormat('700')}
                    className={`px-2.5 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                      effectiveResultFormat === '700' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-amber-950 dark:text-amber-200'
                    }`}
                  >
                    Annual-700
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultFormat(selectedStandard === '11' ? '900' : '1000')}
                    className={`px-2.5 py-1.5 rounded-xl font-black transition-all cursor-pointer ${
                      effectiveResultFormat !== '700' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-amber-950 dark:text-amber-200'
                    }`}
                  >
                    {selectedStandard === '11' ? 'Annual-900' : 'Annual-1000'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleBatchAutoApplyGrace}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>બધાને નિયમાનુસાર ઓટો-ગ્રેસ</span>
                </button>

                {/* Live Auto Cloud Sync Pill for Grace */}
                <div className="flex items-center gap-1.5">
                  {graceSyncStatus === 'syncing' ? (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      <span>ક્લાઉડ સિંક થઈ રહ્યું છે...</span>
                    </div>
                  ) : graceSyncStatus === 'synced' ? (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>✓ સાચવેલું</span>
                    </div>
                  ) : graceSyncStatus === 'offline' ? (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>📡 ઑફલાઇન સેવ</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>☁️ ઓટો ક્લાઉડ સિંક સક્રિય</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Rule Badges with exact user formula & examples */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800 space-y-1">
                <span className="font-bold text-amber-900 dark:text-amber-200 block">૧. મળવાપાત્ર સિદ્ધિ ગુણ ({effectiveResultFormat} ગુણ):</span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedStandard === '11' && effectiveResultFormat === '900'
                    ? 'કુલ ૯ વિષયોના ૯૦૦ માંથી મેળવેલ ગુણના ટકા − ૩૩% (મહત્તમ ૧૫ ગુણ પૂલ).'
                    : '૭ મુખ્ય વિષયોના ૭૦૦ માંથી મેળવેલ ગુણના ટકા − ૩૩% (મહત્તમ ૧૫ ગુણ પૂલ).'}
                </p>
                <div className="text-[10px] text-amber-800 dark:text-amber-400 bg-amber-500/10 p-1.5 rounded-lg font-mono">
                  {selectedStandard === '11' && effectiveResultFormat === '900' ? (
                    <>દા.ત. ૪૫૦/૯૦૦ = ૫૦% − ૩૩% = ૧૭ → મહત્તમ ૧૫ ગુણ<br />૩૬૦/૯૦૦ = ૪૦% − ૩૩% = ૭ ગુણ</>
                  ) : (
                    <>દા.ત. ૨૮૦/૭૦૦ = ૪૦% − ૩૩% = ૭ ગુણ<br />૫૬૦/૭૦૦ = ૮૦% − ૩૩% = ૪૭ → મહત્તમ ૧૫ ગુણ</>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800 space-y-1">
                <span className="font-bold text-amber-900 dark:text-amber-200 block">૨. કૃપા ગુણ (આચાર્યશ્રી વિવેક):</span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  નાપાસ વિષયમાં પાસિંગ (૩૩ ગુણ) કરવા કુલ વધુમાં વધુ ૧૦ ગુણ.
                </p>
                <div className="text-[10px] text-amber-800 dark:text-amber-400 bg-amber-500/10 p-1.5 rounded-lg">
                  સિદ્ધિ ગુણ પૂરતા ન હોય ત્યારે વિદ્યાર્થીને ઉત્તીર્ણ કરવા વપરાય છે.
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800 space-y-1">
                <span className="font-bold text-rose-900 dark:text-rose-300 block">૩. ૨૫ ગુણ નિયમ (અપાત્રતા):</span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  કોઈપણ વિષયમાં ૧૦૦ માંથી મૂળ ગુણ <strong>૨૫ થી ઓછા</strong> હોય તો તે વિદ્યાર્થી પાસ થઈ શકે નહીં.
                </p>
                <div className="text-[10px] text-rose-700 dark:text-rose-400 bg-rose-500/10 p-1.5 rounded-lg font-bold">
                  ⚠️ ૨૫ થી ઓછા ગુણ ધરાવતા વિષયમાં કોઈ ગ્રેસ મળવાપાત્ર નથી.
                </div>
              </div>
            </div>
          </div>

          {siddhiSaveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{siddhiSaveSuccess}</span>
            </div>
          )}

          {/* Filter Bar & View Toggle */}
          <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="નામ / રોલ / બેઠક નં / GR..."
                  value={siddhiSearchQuery}
                  onChange={(e) => setSiddhiSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Section Filter */}
              {availableSections.length > 1 && (
                <select
                  value={siddhiSectionFilter}
                  onChange={(e) => setSiddhiSectionFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="ALL">બધા સેક્શન</option>
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>સેક્શન {sec}</option>
                  ))}
                </select>
              )}

              {/* Status Quick Filter */}
              <select
                value={siddhiFilterMode}
                onChange={(e) => setSiddhiFilterMode(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-xs font-bold text-amber-950 dark:text-amber-200"
              >
                <option value="ELIGIBLE">✨ ફક્ત પાત્ર વિદ્યાર્થીઓ</option>
                <option value="NEEDS_GRACE">ગ્રેસથી પાસ થઈ શકે તેવા</option>
                <option value="ELIGIBLE_SIDDHI">સિદ્ધિ ગુણ મળવાપાત્ર</option>
                <option value="ALL">બધા વિદ્યાર્થી ({filteredStudents.length})</option>
                <option value="PASSED">ઉત્તીર્ણ (Pass)</option>
                <option value="FAILED">સુધારણા જરૂરી (Fail)</option>
              </select>
            </div>

            {/* Layout Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setSiddhiViewLayout('student')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  siddhiViewLayout === 'student' ? 'bg-white dark:bg-slate-900 text-[#C45A2D] shadow-xs' : 'text-slate-600'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>વિદ્યાર્થીવાર એન્ટ્રી</span>
              </button>
              <button
                type="button"
                onClick={() => setSiddhiViewLayout('overview')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  siddhiViewLayout === 'overview' ? 'bg-white dark:bg-slate-900 text-[#C45A2D] shadow-xs' : 'text-slate-600'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>વર્ગવાર કોષ્ટક</span>
              </button>
            </div>
          </div>

          {/* Unified Siddhi / Krupa Calculation Scope for Layout 1 & Layout 2 */}
          {(() => {
            const siddhiStudents = filteredStudents.filter((st) => {
              if (siddhiSectionFilter !== 'ALL' && (st.section || st.division || 'A').toUpperCase() !== siddhiSectionFilter) {
                return false;
              }
              if (siddhiSearchQuery.trim()) {
                const q = siddhiSearchQuery.toLowerCase().trim();
                const mName = (st.studentName || '').toLowerCase().includes(q);
                const mRoll = (st.rollNumber || '').toLowerCase().includes(q);
                const mGr = (st.grNumber || '').toLowerCase().includes(q);
                const mSeat = getSeatNumber(st.id, st.rollNumber).toLowerCase().includes(q);
                if (!mName && !mRoll && !mGr && !mSeat) return false;
              }

              const rawRes = computeActiveStdStudentResult(st, {});
              const activeRes = computeActiveStdStudentResult(st, manualGraceOverrides[st.id]);
              const pool = rawRes.siddhiPoolEarned;
              const hasFailing = rawRes.scores.some((s) => (s.converted100 ?? 0) < 33);
              const hasUnder25 = rawRes.scores.filter((s) => s.subject.isMainSubject).some((s) => (s.converted100 ?? 0) < 25);
              const hasGraceAssigned = activeRes.totalSiddhiUsed > 0 || activeRes.totalKrupaUsed > 0;
              const isEligible = (hasFailing && !hasUnder25 && (pool > 0 || 10 > 0)) || hasGraceAssigned;

              if (siddhiFilterMode === 'ELIGIBLE') return isEligible;
              if (siddhiFilterMode === 'ELIGIBLE_SIDDHI') return pool > 0;
              if (siddhiFilterMode === 'NEEDS_GRACE') return hasFailing && !hasUnder25 && (pool > 0 || 10 > 0);
              if (siddhiFilterMode === 'PASSED') return activeRes.overallResult !== 'NEEDS_IMPROVEMENT';
              if (siddhiFilterMode === 'FAILED') return activeRes.overallResult === 'NEEDS_IMPROVEMENT';

              return true;
            });

            if (siddhiStudents.length === 0) {
              return (
                <div className="p-12 text-center text-slate-500 font-bold bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                  <div className="text-base text-slate-800 dark:text-slate-200">
                    પસંદ કરેલ ફિલ્ટર મુજબ કોઈ વિદ્યાર્થી મળ્યા નથી.
                  </div>
                  <div className="text-xs text-slate-500">
                    તમામ વિદ્યાર્થીઓની યાદી જોવા માટે ઉપર ફિલ્ટરમાંથી <strong>"બધા વિદ્યાર્થી"</strong> પસંદ કરો.
                  </div>
                </div>
              );
            }

            const activeSiddhiStudent = siddhiStudents.find((s) => s.id === siddhiSelectedStudentId) || siddhiStudents[0];
            const rawRes = computeActiveStdStudentResult(activeSiddhiStudent, {});
            const activeRes = computeActiveStdStudentResult(activeSiddhiStudent, manualGraceOverrides[activeSiddhiStudent.id]);
            const siddhiPool = rawRes.siddhiPoolEarned;
            const hasUnder25 = rawRes.scores.filter((s) => s.subject.isMainSubject).some((s) => (s.converted100 ?? 0) < 25);
            const awardedSiddhiTotal = activeRes.totalSiddhiUsed;
            const awardedKrupaTotal = activeRes.totalKrupaUsed;
            const remainingSiddhi = Math.max(0, siddhiPool - awardedSiddhiTotal);
            const remainingKrupa = Math.max(0, 10 - awardedKrupaTotal);

            const isSiddhiOverLimit = awardedSiddhiTotal > siddhiPool;
            const isKrupaOverLimit = awardedKrupaTotal > 10;
            const studentGraceMap = manualGraceOverrides[activeSiddhiStudent.id] || {};

            return (
              <>
                {/* LAYOUT 1: STUDENT-WISE VIEW */}
                {siddhiViewLayout === 'student' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Side: Student Selection List */}
                    <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                          {siddhiFilterMode === 'ELIGIBLE' ? 'પાત્ર વિદ્યાર્થી યાદી' : 'વિદ્યાર્થી યાદી'} ({siddhiStudents.length})
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">રોલ / બેઠક / સિદ્ધિ</span>
                      </div>

                      <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
                        {siddhiStudents.map((st) => {
                          const stRawRes = computeActiveStdStudentResult(st, {});
                          const stActiveRes = computeActiveStdStudentResult(st, manualGraceOverrides[st.id]);
                          const isSelected = st.id === activeSiddhiStudent.id;
                          const hasDirty = siddhiDirtyStudents.has(st.id);
                          const stSeat = getSeatNumber(st.id, st.rollNumber);

                          return (
                            <div
                              key={st.id}
                              onClick={() => setSiddhiSelectedStudentId(st.id)}
                              className={`p-3 rounded-2xl cursor-pointer transition-all border text-left ${
                                isSelected
                                  ? 'bg-[#C45A2D]/10 border-[#C45A2D] shadow-xs'
                                  : 'bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                  {st.studentName}
                                </span>
                                {hasDirty && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="સેવ બાકી" />
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                                <span>રોલ: <strong>{st.rollNumber || '-'}</strong> • બેઠક: <strong>{stSeat}</strong></span>
                                <span className="font-mono text-[10px]">GR: {st.grNumber || '-'}</span>
                              </div>

                              <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                                {/* Eligible Siddhi badge - strictly from this student's earned pool */}
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
                                  <span>સિદ્ધિ પૂલ:</span>
                                  <strong>{stRawRes.siddhiPoolEarned} ગુણ</strong>
                                </span>

                                {/* Result status */}
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    stActiveRes.overallResult === 'PASS'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : stActiveRes.overallResult === 'PASS_WITH_SIDDHI'
                                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                                      : stActiveRes.overallResult === 'PASS_WITH_KRUPA'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                  }`}
                                >
                                  {stActiveRes.overallResultGu.split(' ')[0]}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Side: Active Student Subject-Wise Grace Table */}
                    <div className="lg:col-span-8 space-y-4">
                      {/* Student Header & Quick KPI Bar */}
                      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-5 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                                {activeSiddhiStudent.studentName}
                              </h4>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                  activeRes.overallResult === 'PASS'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : activeRes.overallResult === 'PASS_WITH_SIDDHI'
                                    ? 'bg-teal-100 text-teal-800'
                                    : activeRes.overallResult === 'PASS_WITH_KRUPA'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {activeRes.overallResultGu}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono flex-wrap">
                              <span>રોલ નં: <strong>{activeSiddhiStudent.rollNumber || '-'}</strong></span>
                              <span>•</span>
                              <span>
                                બેઠક ક્રમાંક:{' '}
                                <input
                                  type="text"
                                  value={getSeatNumber(activeSiddhiStudent.id, activeSiddhiStudent.rollNumber)}
                                  onChange={(e) => handleUpdateSeatNumber(activeSiddhiStudent.id, e.target.value)}
                                  className="w-20 px-1 py-0.5 border border-slate-300 dark:border-slate-700 rounded-md font-bold text-slate-900 dark:text-white text-xs text-center"
                                  title="બેઠક ક્રમાંક બદલો"
                                />
                              </span>
                              <span>•</span>
                              <span>G.R. નં: <strong>{activeSiddhiStudent.grNumber || '-'}</strong></span>
                              <span>•</span>
                              <span>વર્ગ: <strong>ધોરણ {selectedStandard} ({activeSiddhiStudent.section || 'A'})</strong></span>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAutoApplyGraceForStudent(activeSiddhiStudent)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>ઓટો-ગ્રેસ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetGraceForStudent(activeSiddhiStudent.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>રીસેટ</span>
                            </button>
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                graceSyncStatus === 'syncing'
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/60'
                                  : !navigator.onLine
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/60'
                              }`}
                            >
                              <span
                                className={`inline-block w-2 h-2 rounded-full ${
                                  graceSyncStatus === 'syncing'
                                    ? 'bg-amber-500 animate-pulse'
                                    : !navigator.onLine
                                    ? 'bg-slate-400'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              <span>
                                {graceSyncStatus === 'syncing'
                                  ? 'ક્લાઉડ સિંક...'
                                  : !navigator.onLine
                                  ? 'ઑફલાઇન સેવ'
                                  : 'ઓટો સિંક સક્રિય'}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* 4 Summary Stat Chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">મૂળ સરેરાશ ટકા</div>
                            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                              {rawRes.percentage}%
                            </div>
                            <div className="text-[10px] text-slate-400">કુલ {effectiveResultFormat} ગુણ</div>
                          </div>

                          <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30">
                            <div className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase">મળવાપાત્ર સિદ્ધિ ગુણ પૂલ</div>
                            <div className="text-lg font-black text-teal-700 dark:text-teal-300 mt-0.5">
                              {siddhiPool} ગુણ
                            </div>
                            <div className="text-[10px] text-teal-600 dark:text-teal-400">
                              {hasUnder25 ? 'અપાત્ર (<૨૫ ગુણ)' : 'સરેરાશ >૩૩% નિયમ'}
                            </div>
                          </div>

                          <div className={`p-3 rounded-2xl border ${
                            isSiddhiOverLimit
                              ? 'bg-rose-500/10 border-rose-500/30'
                              : 'bg-indigo-500/10 border-indigo-500/30'
                          }`}>
                            <div className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300 uppercase">આપેલ સિદ્ધિ ગુણ (#)</div>
                            <div className={`text-lg font-black mt-0.5 ${isSiddhiOverLimit ? 'text-rose-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                              {awardedSiddhiTotal} ગુણ
                            </div>
                            <div className="text-[10px] text-indigo-700 dark:text-indigo-300">
                              બાકી ઉપલબ્ધ: <strong>{remainingSiddhi}</strong> / {siddhiPool}
                            </div>
                          </div>

                          <div className={`p-3 rounded-2xl border ${
                            isKrupaOverLimit
                              ? 'bg-rose-500/10 border-rose-500/30'
                              : 'bg-amber-500/10 border-amber-500/30'
                          }`}>
                            <div className="text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase">આપેલ કૃપા ગુણ (*)</div>
                            <div className={`text-lg font-black mt-0.5 ${isKrupaOverLimit ? 'text-rose-600' : 'text-amber-600 dark:text-amber-400'}`}>
                              {awardedKrupaTotal} / ૧૦
                            </div>
                            <div className="text-[10px] text-amber-700 dark:text-amber-300">
                              બાકી: <strong>{remainingKrupa}</strong> / ૧૦
                            </div>
                          </div>
                        </div>

                        {/* GSEB Student Pool Rule Guidance Banner */}
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>સિદ્ધિ ગુણ વિતરણ નિયમ:</strong> સિદ્ધિ ગુણ વિદ્યાર્થીનો કુલ પૂલ છે (વિષયવાર મર્યાદિત નથી). દા.ત. જો વિદ્યાર્થીને ૭ સિદ્ધિ ગુણ મળવાપાત્ર હોય, તો તેને એક વિષયમાં ૪ અને બીજામાં ૩ એમ કુલ ૭ સુધી જરૂરિયાત મુજબ આપી શકાય છે.
                          </div>
                        </div>

                        {/* Validation Warnings */}
                        {isSiddhiOverLimit && (
                          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>ધ્યાન આપો: આપેલ સિદ્ધિ ગુણ ({awardedSiddhiTotal}) વિદ્યાર્થીના મળવાપાત્ર પૂલ ({siddhiPool}) કરતાં વધી ગયા છે! કૃપા કરીને સુધારો કરો.</span>
                          </div>
                        )}

                        {isKrupaOverLimit && (
                          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>ધ્યાન આપો: આપેલ કૃપા ગુણ ({awardedKrupaTotal}) નિયમાનુસાર મહત્તમ ૧૦ ગુણ કરતાં વધી ગયા છે!</span>
                          </div>
                        )}

                        {hasUnder25 && (
                          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>આ વિદ્યાર્થીને એક અથવા વધુ વિષયમાં મૂળ ગુણ ૨૫ કરતાં ઓછા હોવાથી GSEB નિયમાનુસાર પ્રમોશન માટે સિદ્ધિ ગુણ મળવાપાત્ર નથી.</span>
                          </div>
                        )}
                      </div>

                      {/* Subject-Wise Grace Marks Table */}
                      <div className="border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-center border-b">
                              <tr>
                                <th className="py-3 px-3 text-left min-w-[140px]">વિષય (Subject)</th>
                                <th className="py-3 px-2 w-28 bg-slate-200/60 dark:bg-slate-700/60">
                                  <div>મૂળ મેળવેલ ગુણ</div>
                                  <div className="text-[10px] font-normal text-slate-500">૧૦૦ માંથી</div>
                                </th>
                                <th className="py-3 px-2 w-32 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                                  <div>જરૂરિયાત (Deficit)</div>
                                  <div className="text-[10px] font-normal text-amber-700">૩૩ ગુણ પાસિંગ માટે</div>
                                </th>
                                <th className="py-3 px-2 w-32 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200">
                                  <div>આપેલ સિદ્ધિ ગુણ (#)</div>
                                  <div className="text-[10px] font-normal text-indigo-700">બાકી પૂલ: {remainingSiddhi}/{siddhiPool}</div>
                                </th>
                                <th className="py-3 px-2 w-32 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                                  <div>આપેલ કૃપા ગુણ (*)</div>
                                  <div className="text-[10px] font-normal text-amber-700">બાકી: {remainingKrupa}/૧૦</div>
                                </th>
                                <th className="py-3 px-2 w-28 bg-emerald-500/10 font-black text-emerald-950 dark:text-emerald-200">
                                  <div>આખરી ગુણ</div>
                                  <div className="text-[10px] font-normal text-emerald-700">૧૦૦ માંથી</div>
                                </th>
                                <th className="py-3 px-3 w-28">પરિણામ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-center">
                              {rawRes.scores.map((sc) => {
                                const raw = sc.converted100 ?? 0;
                                const isSubjectUnder25 = raw < 25;
                                const sid = sc.subject.id;
                                const siddhiVal = studentGraceMap[sid]?.siddhi || 0;
                                const krupaVal = studentGraceMap[sid]?.krupa || 0;
                                const finalMark = Math.min(100, raw + siddhiVal + krupaVal);
                                const isPassed = finalMark >= 33;
                                const deficit = Math.max(0, 33 - raw);

                                return (
                                  <tr key={sid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-3 px-3 text-left font-black text-slate-900 dark:text-white">
                                      <div>{sc.subject.nameGu}</div>
                                      <div className="text-[10px] text-slate-400 font-normal">{sc.subject.nameEn}</div>
                                    </td>

                                    {/* 1. મૂળ મેળવેલ ગુણ */}
                                    <td className="py-3 px-2 font-black text-sm bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200">
                                      {sc.converted100 !== null ? sc.converted100 : '-'}
                                      {isSubjectUnder25 && (
                                        <span className="block text-[9px] text-rose-600 font-normal">(&lt;૨૫ ગુણ)</span>
                                      )}
                                    </td>

                                    {/* 2. જરૂરિયાત (Deficit) */}
                                    <td className="py-3 px-2 font-bold text-xs bg-amber-500/5">
                                      {raw >= 33 ? (
                                        <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md inline-block">
                                          ✓ પાસ ({raw})
                                        </span>
                                      ) : isSubjectUnder25 ? (
                                        <span className="text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md inline-block font-black">
                                          અપાત્ર (&lt;૨૫)
                                        </span>
                                      ) : (
                                        <div className="space-y-1">
                                          <span className="text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md inline-block font-black">
                                            {deficit} ગુણ જરૂર
                                          </span>
                                          {!hasUnder25 && remainingSiddhi > 0 && siddhiVal === 0 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const allocate = Math.min(deficit, remainingSiddhi);
                                                handleGraceChange(activeSiddhiStudent.id, sid, 'siddhi', String(allocate));
                                              }}
                                              className="block mx-auto text-[10px] px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all cursor-pointer shadow-xs"
                                              title={`આ વિષયમાં ${Math.min(deficit, remainingSiddhi)} સિદ્ધિ ગુણ ફાળવો`}
                                            >
                                              +{Math.min(deficit, remainingSiddhi)} ફાળવો
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </td>

                                    {/* 3. આપેલ સિદ્ધિ ગુણ (#) */}
                                    <td className="py-2 px-2 bg-indigo-500/5">
                                      <input
                                        type="number"
                                        min="0"
                                        max={Math.max(0, siddhiPool - (awardedSiddhiTotal - siddhiVal))}
                                        value={siddhiVal > 0 ? siddhiVal : ''}
                                        placeholder="0"
                                        disabled={hasUnder25 || isSubjectUnder25}
                                        onChange={(e) => handleGraceChange(activeSiddhiStudent.id, sid, 'siddhi', e.target.value)}
                                        className={`w-20 h-10 text-center font-black text-sm rounded-xl border-2 transition-all mx-auto block ${
                                          siddhiVal > 0
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200'
                                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                                        } ${hasUnder25 || isSubjectUnder25 ? 'opacity-40 cursor-not-allowed' : ''}`}
                                      />
                                    </td>

                                    {/* 4. આપેલ કૃપા ગુણ (*) */}
                                    <td className="py-2 px-2 bg-amber-500/5">
                                      <input
                                        type="number"
                                        min="0"
                                        max={Math.max(0, 10 - (awardedKrupaTotal - krupaVal))}
                                        value={krupaVal > 0 ? krupaVal : ''}
                                        placeholder="0"
                                        disabled={isSubjectUnder25}
                                        onChange={(e) => handleGraceChange(activeSiddhiStudent.id, sid, 'krupa', e.target.value)}
                                        className={`w-20 h-10 text-center font-black text-sm rounded-xl border-2 transition-all mx-auto block ${
                                          krupaVal > 0
                                            ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                                        } ${isSubjectUnder25 ? 'opacity-40 cursor-not-allowed' : ''}`}
                                      />
                                    </td>

                                    {/* 5. કુલ ગુણ (મૂળ + સિદ્ધિ + કૃપા) */}
                                    <td className="py-3 px-2 font-black text-base text-emerald-950 dark:text-emerald-200 bg-emerald-500/10">
                                      {sc.converted100 !== null ? finalMark : '-'}
                                      {(siddhiVal > 0 || krupaVal > 0) && (
                                        <span className="block text-[9px] text-slate-500 font-normal">
                                          ({raw} {siddhiVal > 0 ? `+${siddhiVal}#` : ''} {krupaVal > 0 ? `+${krupaVal}*` : ''})
                                        </span>
                                      )}
                                    </td>

                                    {/* 6. પરિણામ (પાસ / નાપાસ) */}
                                    <td className="py-3 px-3">
                                      <span
                                        className={`px-3 py-1 rounded-full text-xs font-black inline-block ${
                                          sc.converted100 === null
                                            ? 'text-slate-400 bg-slate-100'
                                            : isPassed
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                        }`}
                                      >
                                        {sc.converted100 === null ? '-' : isPassed ? 'પાસ' : 'નાપાસ'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* LAYOUT 2: CLASS-WIDE OVERVIEW TABLE */}
                {siddhiViewLayout === 'overview' && (
                  <div className="border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xs bg-white dark:bg-slate-900 space-y-4 p-4">
                    <div className="flex items-center justify-between pb-3 border-b flex-wrap gap-3">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        ધોરણ {selectedStandard} • વર્ગવાર સિદ્ધિ અને કૃપા ગુણ વિહંગાવલોકન
                      </span>
                      <span className="text-xs text-slate-500">
                        {siddhiFilterMode === 'ELIGIBLE' ? (
                          <>પાત્ર વિદ્યાર્થીઓ: <strong>{siddhiStudents.length}</strong> / {filteredStudents.length}</>
                        ) : (
                          <>દર્શાવેલ વિદ્યાર્થીઓ: <strong>{siddhiStudents.length}</strong> / {filteredStudents.length}</>
                        )}
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-[600px]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-center sticky top-0 z-10">
                          <tr>
                            <th className="py-3 px-2 w-12 border-b">રોલ</th>
                            <th className="py-3 px-2 w-20 border-b">બેઠક નં.</th>
                            <th className="py-3 px-2 w-16 border-b">G.R.</th>
                            <th className="py-3 px-3 text-left border-b min-w-[180px]">વિદ્યાર્થીનું નામ</th>
                            <th className="py-3 px-2 w-16 border-b">મૂળ ટકા</th>
                            <th className="py-3 px-2 w-24 border-b bg-teal-500/10 text-teal-900">મળવાપાત્ર સિદ્ધિ</th>
                            <th className="py-3 px-2 w-24 border-b bg-indigo-500/10 text-indigo-900">આપેલ સિદ્ધિ (#)</th>
                            <th className="py-3 px-2 w-24 border-b bg-amber-500/10 text-amber-900">આપેલ કૃપા (*)</th>
                            <th className="py-3 px-2 w-16 border-b font-black">આખરી ટકા</th>
                            <th className="py-3 px-2 w-28 border-b">પરિણામ સ્થિતિ</th>
                            <th className="py-3 px-2 w-20 border-b">એક્શન</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-center">
                          {siddhiStudents.map((st, idx) => {
                            const rawRes = computeActiveStdStudentResult(st, {});
                            const activeRes = computeActiveStdStudentResult(st, manualGraceOverrides[st.id]);
                            const pool = rawRes.siddhiPoolEarned;

                            return (
                              <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                <td className="py-2 px-2 font-bold">{st.rollNumber || idx + 1}</td>
                                <td className="py-2 px-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {getSeatNumber(st.id, st.rollNumber)}
                                </td>
                                <td className="py-2 px-2 font-mono text-slate-500">{st.grNumber || '-'}</td>
                                <td className="py-2 px-3 text-left font-bold text-slate-900 dark:text-white truncate">
                                  {st.studentName}
                                </td>
                                <td className="py-2 px-2 font-bold text-slate-600">{rawRes.percentage}%</td>
                                <td className="py-2 px-2 font-black text-teal-700 bg-teal-500/5">{pool} ગુણ</td>
                                <td className="py-2 px-2 font-black text-indigo-700 bg-indigo-500/5">
                                  {activeRes.totalSiddhiUsed > 0 ? `+${activeRes.totalSiddhiUsed}#` : '-'}
                                </td>
                                <td className="py-2 px-2 font-black text-amber-700 bg-amber-500/5">
                                  {activeRes.totalKrupaUsed > 0 ? `+${activeRes.totalKrupaUsed}*` : '-'}
                                </td>
                                <td className="py-2 px-2 font-black text-[#C45A2D]">{activeRes.percentage}%</td>
                                <td className="py-2 px-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                      activeRes.overallResult === 'PASS'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : activeRes.overallResult === 'PASS_WITH_SIDDHI'
                                        ? 'bg-teal-100 text-teal-800'
                                        : activeRes.overallResult === 'PASS_WITH_KRUPA'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {activeRes.overallResultGu.split(' ')[0]}
                                  </span>
                                </td>
                                <td className="py-2 px-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSiddhiSelectedStudentId(st.id);
                                      setSiddhiViewLayout('student');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#C45A2D] hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all cursor-pointer"
                                  >
                                    સુધારો
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* GSEB Rules Guidance Modal */}
      {rulesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border rounded-3xl max-w-xl w-full p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black">GSEB પરીક્ષા નિયમો</h3>
              </div>
              <button onClick={() => setRulesModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">✕</button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed max-h-[420px] overflow-y-auto pr-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white">૧. ૨૦૦ → ૧૦૦ રૂપાંતરણ & રાઉન્ડ ફિગર નિયમ</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  પ્રથમ (૫૦) + દ્વિતીય (૫૦) + વાર્ષિક (૮૦) + આંતરિક (૨૦) = ૨૦૦ / ૨ = ૧૦૦ ગુણ ઓટોમેટિક ગણાય છે. આંતરિક (૨૦) તથા ૧૦૦ ના રૂપાંતરણમાં રાઉન્ડ ફિગર નિયમ મુજબ .૪ સુધી નીચલો પૂર્ણાંક (દા.ત. ૧૫.૪ → ૧૫) અને .૫ કે તેથી વધુ હોય તો ઉપલો પૂર્ણાંક (દા.ત. ૧૫.૫ → ૧૬) ગણાય છે.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-1">
                <h4 className="font-black text-teal-900 dark:text-teal-200">૨. સિદ્ધિ ગુણ પૂલ ફોર્મ્યુલા (વિદ્યાર્થી કુલ મહત્તમ ૧૫ ગુણ)</h4>
                <p className="text-teal-800 dark:text-teal-300">
                  ફોર્મ્યુલા: <strong>(મુખ્ય ૭ વિષયોના ૧૦૦ માંથી કુલ ગુણ / ૭) - ૩૩</strong>. જો વિદ્યાર્થીના ૭ વિષયના ગુણ ૩૮૯ હોય તો ૩૮૯/૭ = ૫૫.૬ - ૩૩ = ૨૨.૬, જે મહત્તમ ૧૫ ગુણ પૂલ ગણાય. દરેક વિષયના અલગ સિદ્ધિ ગુણ નથી, સમગ્ર વિદ્યાર્થીનો કુલ ૧૫ ગુણનો પૂલ નાપાસ વિષયોમાં વહેંચી શકાય છે.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <h4 className="font-black text-amber-900 dark:text-amber-200">૩. કૃપા ગુણ (વિદ્યાર્થી કુલ મહત્તમ ૧૦ ગુણ)</h4>
                <p className="text-amber-800 dark:text-amber-300">
                  નિયમાનુસાર વિદ્યાર્થીને પાસ થવા માટે કુલ મહત્તમ ૧૦ કૃપા ગુણ મળવાપાત્ર છે. નોંધ: કોઈ વિષયમાં ૨૫ થી ઓછા ગુણ હોય તો નિયમ મુજબ ગ્રેસ મળવાપાત્ર નથી.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white">૪. GSEB ગ્રેડિંગ સ્કેલ</h4>
                <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  A1 (91-100) • A2 (81-90) • B1 (71-80) • B2 (61-70) • C1 (51-60) • C2 (41-50) • D (33-40) • E1 (21-32) • E2 (0-20)
                </p>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setRulesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                સમજાયું
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Std 10 GSEB Official A4 Board Result Analytics Modal */}
      {selectedStandard === '10' && (
        <Class10BoardAnalyticsModal
          isOpen={boardAnalyticsModalOpen}
          onClose={() => setBoardAnalyticsModalOpen(false)}
          school={school}
          students={activeStandardStudents}
          marks={marks}
          results={allResults}
        />
      )}

      {/* Std 10 Subject Selection Modal (Maths Basic/Std, Sanskrit/Hindi, PT/Computer) */}
      {selectedStandard === '10' && (
        <Std10SubjectSelectionModal
          isOpen={std10SubjectModalOpen}
          onClose={() => setStd10SubjectModalOpen(false)}
          students={activeStandardStudents}
          config={std10Config}
          onSave={updateStd10Config}
          getSeatNumber={getSeatNumber}
        />
      )}
    </div>
  );
};
