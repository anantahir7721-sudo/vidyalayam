import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import {
  StandardKey,
  StreamKey,
  STANDARD_TABS,
  FIRST_SECOND_EXAM_SUBJECTS,
  getSubjectsForStandard as getMultiSubjects,
  getExamsForStandard as getMultiExams,
  computeMultiStandardAllResults,
} from '../utils/multiStandardResultCalculations';
import { saveBatchExamMarks } from '../services/firestoreService';
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

  // View Navigation Tabs
  const [viewTab, setViewTab] = useState<'marks_entry' | 'result_register' | 'individual_marksheet' | 'siddhi_krupa_entry'>('marks_entry');

  // Exam Selection in Marks Entry
  const [marksEntryExamId, setMarksEntryExamId] = useState<string>('first_exam');

  // Internal Assessment Entry Mode (5+5+5+5 for Main, 10+10 for Prayogik vs Direct 20M)
  const [internalEntryMode, setInternalEntryMode] = useState<'components' | 'direct'>('components');
  const [internalSelectedSubjId, setInternalSelectedSubjId] = useState<string>('gujarati');

  // Exam Selection in Result Register & Marksheet: 'first_exam' | 'second_exam' | 'annual'
  const [resultExamMode, setResultExamMode] = useState<'first_exam' | 'second_exam' | 'annual'>('first_exam');

  // Annual Result Format for Class 9: 700 vs 1000
  const [resultFormat, setResultFormat] = useState<'700' | '1000'>('700');

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
        const qm = (m as any).questionMarks;
        const siddhi = qm?.siddhi !== undefined ? qm.siddhi : 0;
        const krupa = qm?.krupa !== undefined ? qm.krupa : 0;

        if (!merged[m.studentId]) {
          merged[m.studentId] = {};
        }
        const existing = merged[m.studentId][m.subjectId];
        if (!existing || existing.siddhi !== siddhi || existing.krupa !== krupa) {
          merged[m.studentId][m.subjectId] = { siddhi, krupa };
          hasChanges = true;
        }
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
  }, [marks, school?.id]);

  const [graceModalStudent, setGraceModalStudent] = useState<StudentResultClass9 | null>(null);

  // Siddhi-Krupa Sub-tab specific states
  const [siddhiSelectedStudentId, setSiddhiSelectedStudentId] = useState<string>('');
  const [siddhiSearchQuery, setSiddhiSearchQuery] = useState('');
  const [siddhiSectionFilter, setSiddhiSectionFilter] = useState<string>('ALL');
  const [siddhiFilterMode, setSiddhiFilterMode] = useState<'ALL' | 'ELIGIBLE_SIDDHI' | 'NEEDS_GRACE' | 'PASSED' | 'FAILED'>('ALL');
  const [siddhiViewLayout, setSiddhiViewLayout] = useState<'student' | 'overview'>('student');
  const [siddhiDirtyStudents, setSiddhiDirtyStudents] = useState<Set<string>>(new Set());
  const [siddhiSaveSuccess, setSiddhiSaveSuccess] = useState<string | null>(null);

  // Marks Entry Local State: studentId_subjectId_examType -> string value
  const [gridInputs, setGridInputs] = useState<Record<string, string>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

  // Unsaved changes navigation guard
  const handleSwitchTab = (newTab: 'marks_entry' | 'result_register' | 'individual_marksheet' | 'siddhi_krupa_entry') => {
    if (viewTab === 'siddhi_krupa_entry' && siddhiDirtyStudents.size > 0 && newTab !== 'siddhi_krupa_entry') {
      if (!window.confirm('સિદ્ધિ–કૃપા ગુણમાં ન સાચવેલ ફેરફારો (unsaved changes) છે. શું તમે સેવ કર્યા વગર આગળ વધવા માંગો છો?')) {
        return;
      }
    } else if (viewTab === 'marks_entry' && dirtyKeys.size > 0 && newTab !== 'marks_entry') {
      if (!window.confirm('ગુણ એન્ટ્રીમાં ન સાચવેલ ગુણ (unsaved marks) છે. શું તમે સેવ કર્યા વગર આગળ વધવા માંગો છો?')) {
        return;
      }
    }
    setViewTab(newTab);
  };

  const handleSafeBack = () => {
    if (siddhiDirtyStudents.size > 0 || dirtyKeys.size > 0) {
      if (!window.confirm('તમારી પાસે ન સાચવેલ ફેરફારો છે. શું તમે ખરેખર બહાર નીકળવા માંગો છો?')) {
        return;
      }
    }
    onBack();
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (siddhiDirtyStudents.size > 0 || dirtyKeys.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [siddhiDirtyStudents.size, dirtyKeys.size]);

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
        return std === '11' || std === '11-G' || s.stream === 'general' || !s.stream;
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

  // Active exam list for Marks Entry
  const marksEntryExams = useMemo(() => {
    return getMultiExams(selectedStandard);
  }, [selectedStandard]);

  // Subjects to display in Marks Entry table (subject-wise columns for the chosen exam)
  const entrySubjects = useMemo(() => {
    if (marksEntryExamId === 'first_exam' || marksEntryExamId === 'second_exam' || marksEntryExamId === 'annual_exam') {
      return FIRST_SECOND_EXAM_SUBJECTS; // 7 GSEB core subjects: Gujarati, Maths, Science, SS, English, Hindi, Sanskrit
    }
    if (marksEntryExamId === 'prayogik_annual') {
      return CLASS_9_PRAYOGIK_SUBJECTS; // 3 Prayogik subjects: Computer (42), PE & Yoga (40), Art & Music (41)
    }
    return getMultiSubjects(selectedStandard, selectedStream, resultFormat, marksEntryExamId);
  }, [selectedStandard, selectedStream, resultFormat, marksEntryExamId]);

  // Max marks per subject for the chosen marks entry exam
  const entryMaxMarks = useMemo(() => {
    if (marksEntryExamId === 'first_exam' || marksEntryExamId === 'second_exam') return 50;
    if (marksEntryExamId === 'periodic_test_1' || marksEntryExamId === 'periodic_test_2') return 25;
    if (marksEntryExamId === 'internal_assessment') return 20;
    if (marksEntryExamId === 'annual_exam') return 80;
    if (marksEntryExamId === 'prayogik_annual') return 80; // 40 Theory + 40 Practical
    return 100;
  }, [marksEntryExamId]);

  // Total Max Marks for the chosen marks entry exam
  const entryTotalMax = useMemo(() => {
    if (marksEntryExamId === 'prayogik_annual') return 3 * 80; // 240
    return entrySubjects.length * entryMaxMarks;
  }, [entrySubjects, entryMaxMarks, marksEntryExamId]);

  // Calculate All Results based on active resultExamMode
  const allResults = useMemo(() => {
    return computeMultiStandardAllResults(
      filteredStudents,
      marks,
      selectedStandard,
      selectedStream,
      resultFormat,
      manualGraceOverrides,
      resultExamMode
    );
  }, [filteredStudents, marks, selectedStandard, selectedStream, resultFormat, manualGraceOverrides, resultExamMode]);

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

  // Populate Grid Inputs from existing Firestore marks
  useEffect(() => {
    const initialInputs: Record<string, string> = {};

    filteredStudents.forEach((student) => {
      const studentMarks = marks.filter((m) => m.studentId === student.id);

      // Populate for 6 main subjects as well as any extended subjects
      ALL_CLASS_9_SUBJECTS.forEach((subj) => {
        const getExistingVal = (examKeywords: string[]): string => {
          const found = studentMarks.find((m) => {
            const sId = (m.subjectId || '').toLowerCase();
            const sName = (m.subjectName || '').toLowerCase();
            const subMatch = sId === subj.id.toLowerCase() || sId.includes(subj.id.toLowerCase()) || sName.includes(subj.nameGu.toLowerCase());
            if (!subMatch) return false;
            const exType = (m.examType || '').toLowerCase();
            return examKeywords.some((k) => exType.includes(k));
          });
          if (!found) return '';
          if (found.overallGrade === 'AB') return 'AB';
          return found.totalObtained !== undefined ? String(found.totalObtained) : '';
        };

        const kFirst = `${student.id}_${subj.id}_first_exam`;
        const kSecond = `${student.id}_${subj.id}_second_exam`;
        const kPt1 = `${student.id}_${subj.id}_periodic_test_1`;
        const kPt2 = `${student.id}_${subj.id}_periodic_test_2`;
        const kInternal = `${student.id}_${subj.id}_internal_assessment`;
        const kAnnual = `${student.id}_${subj.id}_annual_exam`;

        initialInputs[kFirst] = getExistingVal(['first', 'pratham', 'પ્રથમ']);
        initialInputs[kSecond] = getExistingVal(['second', 'dwitiya', 'દ્વિતીય', 'prelim', 'પ્રિલિમ']);
        initialInputs[kPt1] = getExistingVal(['pt1', 'periodic_1', 'એકમ_1', 'કસોટી ૧']);
        initialInputs[kPt2] = getExistingVal(['pt2', 'periodic_2', 'એકમ_2', 'કસોટી ૨']);
        initialInputs[kInternal] = getExistingVal(['internal', 'આંતરિક']);
        initialInputs[kAnnual] = getExistingVal(['annual', 'varshik', 'વાર્ષિક', 'board', 'બોર્ડ']);

        // Prayogik Theory & Practical (40 + 40)
        const kTheory40 = `${student.id}_${subj.id}_theory40`;
        const kPractical40 = `${student.id}_${subj.id}_practical40`;
        initialInputs[kTheory40] = getExistingVal(['annual_theory', 'theory', 'થિયરી']);
        initialInputs[kPractical40] = getExistingVal(['annual_practical', 'practical', 'પ્રાયોગિક', 'પ્રેક્ટિકલ']);

        // Internal Assessment Components (5+5+5+5 for Main, 10+10 for Prayogik)
        const kPt1Conv = `${student.id}_${subj.id}_internal_pt1`;
        const kPt2Conv = `${student.id}_${subj.id}_internal_pt2`;
        const kComp = `${student.id}_${subj.id}_internal_competency`;
        const kNote = `${student.id}_${subj.id}_internal_notebook`;
        const kPracWork = `${student.id}_${subj.id}_internal_practical_work`;
        const kContSkill = `${student.id}_${subj.id}_internal_continuous_eval`;

        initialInputs[kPt1Conv] = getExistingVal(['internal_pt1', 'pt1_conv', 'કસોટી_૧']);
        initialInputs[kPt2Conv] = getExistingVal(['internal_pt2', 'pt2_conv', 'કસોટી_૨']);
        initialInputs[kComp] = getExistingVal(['internal_competency', 'સજ્જતા']);
        initialInputs[kNote] = getExistingVal(['internal_notebook', 'નોટબુક']);
        initialInputs[kPracWork] = getExistingVal(['internal_practical_work', 'પ્રાયોગિક_કાર્ય', 'પ્રોજેક્ટ']);
        initialInputs[kContSkill] = getExistingVal(['internal_continuous_eval', 'સાતત્યપૂર્ણ', 'કૌશલ્ય']);
      });
    });

    setGridInputs(initialInputs);
    setDirtyKeys(new Set());
    setSaveSuccessMsg(null);
  }, [filteredStudents, marks]);

  // Handle cell modification in Spreadsheet Grid
  const handleCellChange = (key: string, value: string, maxMarks: number) => {
    const trimmed = value.trim();
    if (trimmed.toUpperCase() === 'AB') {
      setGridInputs((prev) => ({ ...prev, [key]: 'AB' }));
      setDirtyKeys((prev) => new Set(prev).add(key));
      return;
    }

    if (trimmed === '') {
      setGridInputs((prev) => ({ ...prev, [key]: '' }));
      setDirtyKeys((prev) => new Set(prev).add(key));
      return;
    }

    const num = parseFloat(trimmed);
    if (!isNaN(num) && num >= 0 && num <= maxMarks) {
      setGridInputs((prev) => ({ ...prev, [key]: value }));
      setDirtyKeys((prev) => new Set(prev).add(key));
    }
  };

  // Batch Save all entered marks to Firestore
  const handleSaveMarks = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const recordsToSave: any[] = [];
      const examNameDisplay = marksEntryExams.find((e) => e.id === marksEntryExamId)?.nameGu || marksEntryExamId;

      if (marksEntryExamId === 'prayogik_annual') {
        const prayogikSubs = CLASS_9_PRAYOGIK_SUBJECTS;
        filteredStudents.forEach((student) => {
          prayogikSubs.forEach((subj) => {
            const keyTh = `${student.id}_${subj.id}_theory40`;
            const keyPr = `${student.id}_${subj.id}_practical40`;
            const valTh = gridInputs[keyTh];
            const valPr = gridInputs[keyPr];

            if (valTh !== undefined && valTh !== '') {
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
            }

            if (valPr !== undefined && valPr !== '') {
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
            }

            // Also save combined annual_exam out of 80
            if ((valTh !== undefined && valTh !== '') || (valPr !== undefined && valPr !== '')) {
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
            }
          });
        });
      } else if (marksEntryExamId === 'internal_assessment' && internalEntryMode === 'components') {
        const activeSub = ALL_CLASS_9_SUBJECTS.find((s) => s.id === internalSelectedSubjId) || ALL_CLASS_9_SUBJECTS[0];
        filteredStudents.forEach((student) => {
          if (activeSub.isPrayogik) {
            const kPrac = `${student.id}_${activeSub.id}_internal_practical_work`;
            const kSkill = `${student.id}_${activeSub.id}_internal_continuous_eval`;
            const vPrac = gridInputs[kPrac];
            const vSkill = gridInputs[kSkill];

            if (vPrac !== undefined && vPrac !== '') {
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
            }

            if (vSkill !== undefined && vSkill !== '') {
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
            }

            if ((vPrac !== undefined && vPrac !== '') || (vSkill !== undefined && vSkill !== '')) {
              const n1 = parseFloat(vPrac || '0') || 0;
              const n2 = parseFloat(vSkill || '0') || 0;
              const tot20 = Math.min(20, Math.round((n1 + n2) * 10) / 10);
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
            }
          } else {
            // Main subject: 5 + 5 + 5 + 5
            // PT1 and PT2 are automatically converted from 25-mark periodic tests (val / 5)
            const kRawPt1 = `${student.id}_${activeSub.id}_periodic_test_1`;
            const kRawPt2 = `${student.id}_${activeSub.id}_periodic_test_2`;
            const rawPt1 = gridInputs[kRawPt1];
            const rawPt2 = gridInputs[kRawPt2];

            const convPt1 = rawPt1 === 'AB' ? '0' : (rawPt1 !== undefined && rawPt1 !== '' ? String(Math.round(((parseFloat(rawPt1) || 0) / 25) * 5 * 10) / 10) : undefined);
            const convPt2 = rawPt2 === 'AB' ? '0' : (rawPt2 !== undefined && rawPt2 !== '' ? String(Math.round(((parseFloat(rawPt2) || 0) / 25) * 5 * 10) / 10) : undefined);

            const kPt1 = `${student.id}_${activeSub.id}_internal_pt1`;
            const kPt2 = `${student.id}_${activeSub.id}_internal_pt2`;
            const kComp = `${student.id}_${activeSub.id}_internal_competency`;
            const kNote = `${student.id}_${activeSub.id}_internal_notebook`;

            const vPt1 = convPt1 !== undefined ? convPt1 : gridInputs[kPt1];
            const vPt2 = convPt2 !== undefined ? convPt2 : gridInputs[kPt2];
            const vComp = gridInputs[kComp];
            const vNote = gridInputs[kNote];

            const addComp = (fieldKey: string, typeName: string, val: string | undefined) => {
              if (val !== undefined && val !== '') {
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
              }
            };

            addComp('internal_pt1', 'કસોટી ૧ (૫)', vPt1);
            addComp('internal_pt2', 'કસોટી ૨ (૫)', vPt2);
            addComp('internal_competency', 'વિષય સજ્જતા (૫)', vComp);
            addComp('internal_notebook', 'નોટબુક કાર્ય (૫)', vNote);

            if (
              (vPt1 !== undefined && vPt1 !== '') ||
              (vPt2 !== undefined && vPt2 !== '') ||
              (vComp !== undefined && vComp !== '') ||
              (vNote !== undefined && vNote !== '')
            ) {
              const n1 = parseFloat(vPt1 || '0') || 0;
              const n2 = parseFloat(vPt2 || '0') || 0;
              const n3 = parseFloat(vComp || '0') || 0;
              const n4 = parseFloat(vNote || '0') || 0;
              const tot20 = Math.min(20, Math.round((n1 + n2 + n3 + n4) * 10) / 10);
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
            }
          }
        });
      } else {
        filteredStudents.forEach((student) => {
          entrySubjects.forEach((subj) => {
            const valKey = `${student.id}_${subj.id}_${marksEntryExamId}`;
            const val = gridInputs[valKey];
            if (val === undefined || val === '') return;
            const isAb = val.trim().toUpperCase() === 'AB';
            const obtained = isAb ? 0 : parseFloat(val) || 0;

            recordsToSave.push({
              studentId: student.id,
              studentName: student.studentName,
              grNumber: student.grNumber || '',
              rollNumber: student.rollNumber || '',
              standard: selectedStandard,
              division: student.section || student.division || 'A',
              examId: marksEntryExamId,
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

      if (recordsToSave.length > 0) {
        await saveBatchExamMarks(school.id, recordsToSave);
      }

      setDirtyKeys(new Set());
      setSaveSuccessMsg(`સફળતાપૂર્વક ${recordsToSave.length} ગુણ રેકોર્ડ્સ (${examNameDisplay}) સાચવી લેવામાં આવ્યા છે!`);

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error saving marks batch:', err);
      alert('ગુણ સેવ કરવામાં ક્ષતિ થઈ. કૃપા કરીને પુનઃ પ્રયત્ન કરો.');
    } finally {
      setIsSaving(false);
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

  // Handle Single Subject Grace Change (Siddhi or Krupa)
  const handleGraceChange = (studentId: string, subjectId: string, field: 'siddhi' | 'krupa', rawVal: string) => {
    const trimmed = rawVal.trim();
    const num = trimmed === '' ? 0 : parseInt(trimmed, 10);
    if (isNaN(num) || num < 0) return;

    setManualGraceOverrides((prev) => {
      const studentMap = { ...(prev[studentId] || {}) };
      const currentSubj = { ...(studentMap[subjectId] || {}) };
      currentSubj[field] = num;
      studentMap[subjectId] = currentSubj;
      const next = { ...prev, [studentId]: studentMap };
      try {
        localStorage.setItem(`vidyalayam_grace_overrides_${school?.id || 'default'}`, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    setSiddhiDirtyStudents((prev) => new Set(prev).add(studentId));
  };

  // Auto-Apply Grace for a Single Student based on GSEB Rules
  const handleAutoApplyGraceForStudent = (student: Student) => {
    const rawRes = computeClass9StudentResult(student, marks, '700', {});
    const pool = rawRes.siddhiPoolEarned;
    const hasUnder25 = rawRes.scores.filter((s) => s.subject.isMainSubject).some((s) => (s.converted100 ?? 0) < 25);

    if (hasUnder25) {
      alert('વિદ્યાર્થીને કોઈ વિષયમાં ૨૫ થી ઓછા ગુણ હોવાથી GSEB નિયમાનુસાર ગ્રેસ મળવાપાત્ર નથી.');
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

    setManualGraceOverrides((prev) => {
      const next = { ...prev, [student.id]: studentGraces };
      try {
        localStorage.setItem(`vidyalayam_grace_overrides_${school?.id || 'default'}`, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    setSiddhiDirtyStudents((prev) => new Set(prev).add(student.id));
    setSiddhiSaveSuccess(`${student.studentName} માટે નિયમાનુસાર ઓટો-ગ્રેસ લાગુ કરવામાં આવ્યો.`);
    setTimeout(() => setSiddhiSaveSuccess(null), 3000);
  };

  // Reset Grace for a Student
  const handleResetGraceForStudent = (studentId: string) => {
    setManualGraceOverrides((prev) => {
      const next = { ...prev };
      delete next[studentId];
      try {
        localStorage.setItem(`vidyalayam_grace_overrides_${school?.id || 'default'}`, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    setSiddhiDirtyStudents((prev) => new Set(prev).add(studentId));
  };

  // Batch Auto-Apply Grace for all eligible students in Class 9
  const handleBatchAutoApplyGrace = () => {
    let appliedCount = 0;
    const updatedOverrides = { ...manualGraceOverrides };

    filteredStudents.forEach((student) => {
      const rawRes = computeClass9StudentResult(student, marks, '700', {});
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
    alert(`કુલ ${appliedCount} પાત્ર વિદ્યાર્થીઓને નિયમાનુસાર ઓટો-ગ્રેસ લાગુ કરવામાં આવ્યો છે.`);
  };

  // Save Grace Marks to Firestore
  const handleSaveGraceToFirestore = async (targetStudentId?: string) => {
    setIsSaving(true);
    setSiddhiSaveSuccess(null);

    try {
      const recordsToSave: any[] = [];
      const targetStudents = targetStudentId
        ? filteredStudents.filter((s) => s.id === targetStudentId)
        : filteredStudents;

      targetStudents.forEach((student) => {
        const activeRes = computeClass9StudentResult(student, marks, '700', manualGraceOverrides[student.id]);
        const studentGrace = manualGraceOverrides[student.id] || {};

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

      if (recordsToSave.length > 0) {
        await saveBatchExamMarks(school.id, recordsToSave);
      }

      localStorage.setItem(`vidyalayam_grace_overrides_${school?.id || 'default'}`, JSON.stringify(manualGraceOverrides));

      if (targetStudentId) {
        setSiddhiDirtyStudents((prev) => {
          const next = new Set(prev);
          next.delete(targetStudentId);
          return next;
        });
      } else {
        setSiddhiDirtyStudents(new Set());
      }

      setSiddhiSaveSuccess(`સિદ્ધિ–કૃપા ગુણ સફળતાપૂર્વક Firebase ડેટાબેઝમાં સાચવી લેવામાં આવ્યા છે!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error saving grace marks:', err);
      alert('સિદ્ધિ–કૃપા ગુણ સાચવવામાં ક્ષતિ થઈ.');
    } finally {
      setIsSaving(false);
    }
  };

  // Export Result Register to Excel (.xlsx)
  const handleExportRegisterExcel = () => {
    if (allResults.length === 0) {
      alert('એક્સપોર્ટ કરવા માટે કોઈ પરિણામ ઉપલબ્ધ નથી.');
      return;
    }

    const examTitle =
      resultExamMode === 'first_exam'
        ? 'પ્રથમ પરીક્ષા (૩૦૦ ગુણ)'
        : resultExamMode === 'second_exam'
        ? 'દ્વિતીય પરીક્ષા (૩૦૦ ગુણ)'
        : 'વાર્ષિક પરિણામ';

    const rows = allResults.map((r, idx) => {
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
        const maxLabel = resultExamMode === 'annual' ? '૧૦૦' : '૫૦';
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
    const sheetName = resultExamMode === 'first_exam' ? 'First_Exam' : resultExamMode === 'second_exam' ? 'Second_Exam' : 'Annual';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${school.schoolName}_Std${selectedStandard}_${sheetName}_Register.xlsx`);
  };

  // Print Result Register (A4 Landscape)
  const handlePrintRegister = () => {
    if (allResults.length === 0) {
      alert('પ્રિન્ટ કરવા માટે કોઈ પરિણામ ઉપલબ્ધ નથી.');
      return;
    }

    const examTitle =
      resultExamMode === 'first_exam'
        ? 'પ્રથમ સત્રાંત પરીક્ષા પરિણામ રજિસ્ટર (૩૦૦ ગુણ પદ્ધતિ)'
        : resultExamMode === 'second_exam'
        ? 'દ્વિતીય સત્રાંત પરીક્ષા પરિણામ રજિસ્ટર (૩૦૦ ગુણ પદ્ધતિ)'
        : `વાર્ષિક પરિણામ રજિસ્ટર • ${resultFormat} ગુણ પદ્ધતિ`;

    const subMaxLabel = resultExamMode === 'annual' ? '૧૦૦' : '૫૦';

    const rowsHtml = allResults
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

    const activeRegSubjects = allResults[0]?.scores.map((s) => s.subject) || [];

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
          <span>કુલ વિદ્યાર્થી: ${stats.total}</span>
          <span>સીધા ઉત્તીર્ણ: ${stats.directPass}</span>
          <span>સિદ્ધિ (#): ${stats.siddhiCount}</span>
          <span>કૃપા (*): ${stats.krupaCount}</span>
          <span>સુધારણા: ${stats.failCount}</span>
          <span>પરિણામ: ${stats.passPct}%</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 28px;">રોલ</th>
              <th style="width: 48px;">બેઠક નં.</th>
              <th style="width: 50px;">G.R.</th>
              <th style="text-align: left;">વિદ્યાર્થીનું નામ</th>
              ${activeRegSubjects.map((sub) => `<th>${sub.nameGu.split(' ')[0]}<br><span style="font-weight:normal; font-size:7pt;">(${subMaxLabel})</span></th>`).join('')}
              <th style="width: 55px;">કુલ (${allResults[0]?.totalMax || 300})</th>
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

  // Card view student navigation
  const currentCardStudent = filteredStudents[cardStudentIndex] || filteredStudents[0];

  return (
    <div className="space-y-6">
      {/* Top Banner: Standard Selection Bar */}
      <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-3.5">
            <button
              type="button"
              onClick={handleSafeBack}
              className="p-2.5 rounded-2xl bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-slate-800 dark:text-[#e4ded6] transition-all cursor-pointer shadow-xs shrink-0 mt-0.5 border border-[#E2E8F0] dark:border-transparent"
              title="પાછળ જાઓ"
            >
              <ArrowLeft className="w-5 h-5 text-[#C45A2D] dark:text-[#f59c73]" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-[#C45A2D] text-white shadow-xs">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>પરિણામ કેન્દ્ર (Result Hub)</span>
                </span>
                <span className="text-xs text-slate-500 font-medium font-mono">
                  GSEB ધોરણ ૯ થી ૧૨ પરિણામ સિસ્ટમ
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                પરિણામ & ગુણપત્રક વ્યવસ્થાપન (Result Management)
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                પ્રથમ, દ્વિતીય અને વાર્ષિક પરીક્ષા ગુણ એન્ટ્રી, પરિણામ રજિસ્ટર અને સુંદર વ્યક્તિગત માર્કશીટ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onSwitchToGeneralResults && (
              <button
                type="button"
                onClick={onSwitchToGeneralResults}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
                title="સામાન્ય ગેઝેટ વ્યુ"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>ગેઝેટ વ્યૂ</span>
              </button>
            )}
            <button
              onClick={() => setRulesModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-card text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 border-amber-500/30 transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>GSEB ફોર્મ્યુલા નિયમો</span>
            </button>
          </div>
        </div>

        {/* 4 Standards Selector Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>ધોરણ પસંદ કરો (Select Standard):</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#C45A2D] text-white border-[#C45A2D] shadow-md scale-[1.01]'
                      : 'bg-white/80 dark:bg-white/5 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-[#C45A2D]/50'
                  }`}
                >
                  <div>
                    <div className="text-xs sm:text-sm font-black">{tab.labelGu}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                      {tab.labelEn}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count} છાત્રો
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stream selector if standard 11 or 12 is chosen */}
          {(selectedStandard === '11' || selectedStandard === '12') && (
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 text-xs">
              <span className="font-bold text-amber-900 dark:text-amber-200 px-2">પ્રવાહ:</span>
              <button
                type="button"
                onClick={() => setSelectedStream('general')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  selectedStream === 'general' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
                }`}
              >
                સામાન્ય પ્રવાહ (Commerce / Arts)
              </button>
              <button
                type="button"
                onClick={() => setSelectedStream('science')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  selectedStream === 'science' ? 'bg-[#C45A2D] text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
                }`}
              >
                વિજ્ઞાન પ્રવાહ (Science)
              </button>
            </div>
          )}

          {/* Section & Academic Year Controls */}
          <div className="pt-2 flex items-center justify-between gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              {availableSections.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-600 dark:text-slate-400">સેક્શન / વર્ગ:</span>
                  <select
                    value={selectedSection}
                    onChange={(e) => {
                      setSelectedSection(e.target.value);
                      setCardStudentIndex(0);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-white"
                  >
                    <option value="ALL">બધા સેક્શન ({activeStandardStudents.length})</option>
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>સેક્શન {sec}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600 dark:text-slate-400">શૈક્ષણિક વર્ષ:</span>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-white font-mono"
                >
                  <option value="૨૦૨૬–૨૭">૨૦૨૬–૨૭</option>
                  <option value="૨૦૨૫–૨૬">૨૦૨૫–૨૬</option>
                </select>
              </div>
            </div>

            <div className="text-slate-500 text-[11px]">
              કુલ નોંધાયેલ વિદ્યાર્થીઓ: <strong className="text-slate-800 dark:text-slate-200">{filteredStudents.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Main View Tabs: Marks Entry | Result Register | Marksheet */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleSwitchTab('marks_entry')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewTab === 'marks_entry'
                ? 'bg-[#C45A2D] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Edit2 className="w-4 h-4" />
            <span>📝 ગુણ એન્ટ્રી (Marks Entry)</span>
            {dirtyKeys.size > 0 && <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />}
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('result_register')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewTab === 'result_register'
                ? 'bg-[#C45A2D] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📋 પરિણામ રજિસ્ટર (Result Register)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('individual_marksheet')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewTab === 'individual_marksheet'
                ? 'bg-[#C45A2D] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>🎓 ગુણપત્રક (Marksheet)</span>
          </button>

          {selectedStandard === '9' && (
            <button
              type="button"
              onClick={() => handleSwitchTab('siddhi_krupa_entry')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                viewTab === 'siddhi_krupa_entry'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                  : 'text-amber-800 dark:text-amber-300 hover:text-amber-900 bg-amber-500/10'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>✨ સિદ્ધિ–કૃપા ગુણ એન્ટ્રી</span>
            </button>
          )}
        </div>

        {/* Quick export/print buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportRegisterExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Excel ફાઇલ ડાઉનલોડ કરો"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel ડાઉનલોડ (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handlePrintRegister}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="A4 રજિસ્ટર પ્રિન્ટ / PDF કરો"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>રજિસ્ટર પ્રિન્ટ</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">કુલ છાત્રો</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">સીધા પાસ</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.directPass}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-center">
          <div className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase">સિદ્ધિ (#) પાસ</div>
          <div className="text-xl font-black text-teal-600 dark:text-teal-400 mt-0.5">{stats.siddhiCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">કૃપા (*) પાસ</div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.krupaCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
          <div className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase">સુધારણા જરૂરી</div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{stats.failCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
          <div className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase">સંપૂર્ણ ગુણ</div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{stats.completeCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#C45A2D]/10 border border-[#C45A2D]/20 text-center col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold text-[#C45A2D] dark:text-[#f59c73] uppercase">પરિણામ ટકા</div>
          <div className="text-xl font-black text-[#C45A2D] dark:text-[#f59c73] mt-0.5">{stats.passPct}%</div>
        </div>
      </div>

      {/* VIEW TAB 1: MARKS ENTRY (SUBJECT-WISE COLUMNS FOR THE CHOSEN EXAM!) */}
      {viewTab === 'marks_entry' && (
        <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 sm:p-6 shadow-xl space-y-5">
          {/* Header & Save Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C45A2D]" />
                <span>
                  ધોરણ {selectedStandard} • {marksEntryExams.find((e) => e.id === marksEntryExamId)?.nameGu || 'પરીક્ષા'} ગુણ એન્ટ્રી
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                પરીક્ષા પસંદ કરો અને નીચે આપેલા વિષયવાર બોક્સમાં ગુણ દાખલ કરો. (ગેરહાજર માટે 'AB' લખો).
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Toggle Table vs Mobile Card Mode */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setEntryLayoutMode('table')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    entryLayoutMode === 'table' ? 'bg-white dark:bg-slate-900 text-[#C45A2D] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>સ્પ્રેડશીટ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryLayoutMode('card')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    entryLayoutMode === 'card' ? 'bg-white dark:bg-slate-900 text-[#C45A2D] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>કાર્ડ મોડ</span>
                </button>
              </div>

              {dirtyKeys.size > 0 && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                  ⚠️ {dirtyKeys.size} ગુણ સેવ બાકી
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveMarks}
                disabled={isSaving || dirtyKeys.size === 0}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer ${
                  dirtyKeys.size > 0
                    ? 'bg-[#C45A2D] hover:bg-[#a84a22] text-white active:scale-95'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'સાચવી રહ્યું છે...' : `બધા સાચવો (Save Marks)`}</span>
              </button>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Exam Selector Segmented Tabs */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider">પરીક્ષા પસંદ કરો (Exam):</div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {marksEntryExams.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setMarksEntryExamId(ex.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border ${
                    marksEntryExamId === ex.id
                      ? 'bg-[#C45A2D] text-white border-[#C45A2D] shadow-md scale-[1.01]'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-[#C45A2D]/50'
                  }`}
                >
                  <div>{ex.nameGu}</div>
                  <div className={`text-[10px] font-normal ${marksEntryExamId === ex.id ? 'text-white/80' : 'text-slate-500'}`}>
                    {ex.id === 'first_exam' || ex.id === 'second_exam'
                      ? '૭ મુખ્ય વિષયો • ૫૦ ગુણ (કુલ ૩૫૦)'
                      : ex.id === 'prayogik_annual'
                      ? '૪૦ થિયરી + ૪૦ પ્રાયોગિક (૮૦ ગુણ)'
                      : ex.id === 'internal_assessment'
                      ? '૨૦ ગુણ (૫+૫+૫+૫ / ૧૦+૧૦)'
                      : `${ex.maxMarksPerSubject} ગુણ`}
                  </div>
                </button>
              ))}
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
                      ✨ વિગતવાર ઘટકો (મુખ્ય: ૫+૫+૫+૫ | પ્રાયોગિક: ૧૦+૧૦)
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

                {internalEntryMode === 'components' && (
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                    કોઈપણ વિષય પસંદ કરી તેના ૪ ઘટકો (મુખ્ય) અથવા ૨ ઘટકો (પ્રાયોગિક) ભરો.
                  </span>
                )}
              </div>

              {internalEntryMode === 'components' && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">વિષય પસંદ કરો:</div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {ALL_CLASS_9_SUBJECTS.map((subj) => (
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
                        {CLASS_9_PRAYOGIK_SUBJECTS.map((sub) => (
                          <th key={sub.id} colSpan={3} className="py-2 px-2 border border-slate-300 dark:border-slate-700 text-center bg-teal-500/10 text-teal-900 dark:text-teal-200 font-black">
                            {sub.nameGu} (કુલ ૮૦)
                          </th>
                        ))}
                        <th rowSpan={2} className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 text-center w-24 bg-indigo-500/10 font-black text-indigo-900 dark:text-indigo-200">
                          કુલ (૨૪૦)
                        </th>
                        <th rowSpan={2} className="py-2.5 px-2 border border-slate-300 dark:border-slate-700 text-center w-16 bg-indigo-500/10 font-black text-indigo-900 dark:text-indigo-200">
                          ટકા
                        </th>
                      </tr>
                      <tr>
                        {CLASS_9_PRAYOGIK_SUBJECTS.map((sub) => (
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

                            {CLASS_9_PRAYOGIK_SUBJECTS.map((sub) => {
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
                                  <td className="py-2 px-1 text-center border border-slate-200 dark:border-slate-800">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={valTh}
                                      placeholder="0-40"
                                      onChange={(e) => handleCellChange(keyTh, e.target.value, 40)}
                                      className={`w-16 h-10 px-1 text-center font-bold text-xs rounded-xl border-2 transition-all block mx-auto ${
                                        dirtyKeys.has(keyTh)
                                          ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                      }`}
                                    />
                                  </td>
                                  <td className="py-2 px-1 text-center border border-slate-200 dark:border-slate-800">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={valPr}
                                      placeholder="0-40"
                                      onChange={(e) => handleCellChange(keyPr, e.target.value, 40)}
                                      className={`w-16 h-10 px-1 text-center font-bold text-xs rounded-xl border-2 transition-all block mx-auto ${
                                        dirtyKeys.has(keyPr)
                                          ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                      }`}
                                    />
                                  </td>
                                  <td className="py-2 px-1 text-center font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                                    {subTotal !== null ? subTotal : '-'}
                                  </td>
                                </React.Fragment>
                              );
                            })}

                            <td className="py-2 px-2 text-center font-black text-slate-900 dark:text-white bg-indigo-500/10 border border-slate-200 dark:border-slate-800">
                              {anyMarksEntered ? totalRowObtained : '-'}
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[#C45A2D] bg-indigo-500/10 border border-slate-200 dark:border-slate-800">
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
                              const tot20 = hasAny ? Math.min(20, Math.round((nPrac + nSkill) * 10) / 10) : null;

                              return (
                                <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                  <td className="py-1.5 px-1 text-center font-mono font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-11 sm:w-14 text-[10px] sm:text-xs">
                                    {getSeatNumber(student.id, student.rollNumber)}
                                  </td>
                                  <td className="py-1.5 px-1.5 font-bold text-slate-900 dark:text-white sticky left-11 sm:left-14 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] text-[10px] sm:text-xs leading-tight whitespace-normal break-words w-24 sm:w-40 min-w-[92px] max-w-[105px] sm:max-w-[180px]">
                                    {student.studentName}
                                  </td>

                                  <td className="py-2 px-1 text-center">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={vPrac}
                                      placeholder="0-10"
                                      onChange={(e) => handleCellChange(kPrac, e.target.value, 10)}
                                      className={`w-20 h-10 px-1 text-center font-bold text-sm rounded-xl border-2 transition-all block mx-auto ${
                                        dirtyKeys.has(kPrac)
                                          ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                      }`}
                                    />
                                  </td>

                                  <td className="py-2 px-1 text-center">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={vSkill}
                                      placeholder="0-10"
                                      onChange={(e) => handleCellChange(kSkill, e.target.value, 10)}
                                      className={`w-20 h-10 px-1 text-center font-bold text-sm rounded-xl border-2 transition-all block mx-auto ${
                                        dirtyKeys.has(kSkill)
                                          ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                      }`}
                                    />
                                  </td>

                                  <td className="py-2 px-2 text-center font-black text-slate-900 dark:text-white bg-indigo-500/10 text-sm">
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
                            const tot20 = hasAny ? Math.min(20, Math.round((n1 + n2 + n3 + n4) * 10) / 10) : null;

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

                                <td className="py-2 px-1 text-center">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={vComp}
                                    placeholder="0-5"
                                    onChange={(e) => handleCellChange(kComp, e.target.value, 5)}
                                    className={`w-18 h-10 px-1 text-center font-bold text-sm rounded-xl border-2 transition-all block mx-auto ${
                                      dirtyKeys.has(kComp)
                                        ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                    }`}
                                  />
                                </td>

                                <td className="py-2 px-1 text-center">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={vNote}
                                    placeholder="0-5"
                                    onChange={(e) => handleCellChange(kNote, e.target.value, 5)}
                                    className={`w-18 h-10 px-1 text-center font-bold text-sm rounded-xl border-2 transition-all block mx-auto ${
                                      dirtyKeys.has(kNote)
                                        ? 'border-[#C45A2D] bg-[#FBE9DF] text-[#C45A2D]'
                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                                    }`}
                                  />
                                </td>

                                <td className="py-2 px-2 text-center font-black text-slate-900 dark:text-white bg-indigo-500/10 text-sm">
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
                            className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center min-w-[64px] sm:min-w-[85px] bg-amber-500/10 text-amber-900 dark:text-amber-200 font-black"
                          >
                            <div className="truncate">{sub.nameGu}</div>
                            <div className="text-[9px] sm:text-[10px] font-normal opacity-80">({entryMaxMarks})</div>
                          </th>
                        ))}
                        <th className="py-2 px-1 border-b border-slate-300 dark:border-slate-700 text-center w-14 sm:w-20 bg-indigo-500/10 font-black text-indigo-900 dark:text-indigo-200">
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
                                  <td key={sub.id} className="py-1.5 px-1 text-center min-w-[64px] sm:min-w-[85px]">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={cellVal}
                                      placeholder={`0-${entryMaxMarks}`}
                                      onChange={(e) => handleCellChange(cellKey, e.target.value, entryMaxMarks)}
                                      className={`w-14 sm:w-18 h-8 sm:h-9 px-1 text-center font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border-2 transition-all shadow-xs outline-none block mx-auto ${
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
                    const tot20 = vPrac !== '' || vSkill !== '' ? Math.min(20, n1 + n2) : null;

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
                  const tot20 = hasAny ? Math.min(20, Math.round((n1 + n2 + n3 + n4) * 10) / 10) : null;

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

              {resultExamMode === 'annual' && (
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
      {selectedStandard === '9' && viewTab === 'siddhi_krupa_entry' && (
        <div className="space-y-5">
          {/* GSEB Class 9 Rules Guidance Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-300 dark:border-amber-700/60 shadow-lg space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-200">
                    ધોરણ ૯ • સિદ્ધિ–કૃપા ગુણ એન્ટ્રી (GSEB Grace Marks Module)
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    ગુજરાત માધ્યમિક અને ઉચ્ચતર માધ્યમિક શિક્ષણ બોર્ડ (GSEB) ના નિયમોનુસાર સિદ્ધિ અને કૃપા ગુણ આપવાનું પત્રક.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchAutoApplyGrace}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>બધાને નિયમાનુસાર ઓટો-ગ્રેસ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveGraceToFirestore()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaving ? 'સાચવી રહ્યું છે...' : 'બધા સાચવો'}</span>
                </button>
              </div>
            </div>

            {/* Quick Rule Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800">
                <span className="font-bold text-amber-900 dark:text-amber-200">૧. મળવાપાત્ર સિદ્ધિ ગુણ:</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  મુખ્ય વિષયોના સરેરાશ ૩૩% થી ઉપરના દરેક ૧% દીઠ ૧ ગુણ (મહત્તમ ૧૫ ગુણ પૂલ).
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800">
                <span className="font-bold text-amber-900 dark:text-amber-200">૨. કૃપા ગુણ (આચાર્યશ્રી વિવેક):</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  નાપાસ વિષયમાં પાસિંગ (૩૩ ગુણ) કરવા કુલ વધુમાં વધુ ૧૦ ગુણ.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800">
                <span className="font-bold text-amber-900 dark:text-amber-200">૩. ૨૫ ગુણ નિયમ (અપાત્રતા):</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  કોઈપણ મુખ્ય વિષયમાં મૂળ ગુણ ૨૫ થી ઓછા હોય તો વિદ્યાર્થીને ગ્રેસ મળવાપાત્ર નથી.
                </p>
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
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="ALL">બધા વિદ્યાર્થી ({filteredStudents.length})</option>
                <option value="NEEDS_GRACE">ગ્રેસથી પાસ થઈ શકે તેવા</option>
                <option value="ELIGIBLE_SIDDHI">સિદ્ધિ ગુણ મળવાપાત્ર</option>
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

          {/* LAYOUT 1: STUDENT-WISE VIEW */}
          {siddhiViewLayout === 'student' && (() => {
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

              const rawRes = computeClass9StudentResult(st, marks, '700', {});
              const activeRes = computeClass9StudentResult(st, marks, '700', manualGraceOverrides[st.id]);
              const pool = rawRes.siddhiPoolEarned;
              const hasFailing = rawRes.scores.some((s) => (s.converted100 ?? 0) < 33);
              const hasUnder25 = rawRes.scores.filter((s) => s.subject.isMainSubject).some((s) => (s.converted100 ?? 0) < 25);

              if (siddhiFilterMode === 'ELIGIBLE_SIDDHI') return pool > 0;
              if (siddhiFilterMode === 'NEEDS_GRACE') return hasFailing && !hasUnder25 && (pool > 0 || 10 > 0);
              if (siddhiFilterMode === 'PASSED') return activeRes.overallResult !== 'NEEDS_IMPROVEMENT';
              if (siddhiFilterMode === 'FAILED') return activeRes.overallResult === 'NEEDS_IMPROVEMENT';

              return true;
            });

            const activeSiddhiStudent = siddhiStudents.find((s) => s.id === siddhiSelectedStudentId) || siddhiStudents[0];

            if (!activeSiddhiStudent) {
              return (
                <div className="p-12 text-center text-slate-500 font-bold bg-white dark:bg-slate-900 rounded-3xl border">
                  પસંદ કરેલ ફિલ્ટર મુજબ કોઈ વિદ્યાર્થી મળ્યા નથી.
                </div>
              );
            }

            const rawRes = computeClass9StudentResult(activeSiddhiStudent, marks, '700', {});
            const activeRes = computeClass9StudentResult(activeSiddhiStudent, marks, '700', manualGraceOverrides[activeSiddhiStudent.id]);
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Side: Student Selection List */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                      વિદ્યાર્થી યાદી ({siddhiStudents.length})
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">રોલ / બેઠક / સિદ્ધિ</span>
                  </div>

                  <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
                    {siddhiStudents.map((st) => {
                      const stRawRes = computeClass9StudentResult(st, marks, '700', {});
                      const stActiveRes = computeClass9StudentResult(st, marks, '700', manualGraceOverrides[st.id]);
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
                            {/* Eligible Siddhi badge */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
                              <span>સિદ્ધિ:</span>
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
                          <span>વર્ગ: <strong>ધોરણ ૯ ({activeSiddhiStudent.section || 'A'})</strong></span>
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
                        <button
                          type="button"
                          onClick={() => handleSaveGraceToFirestore(activeSiddhiStudent.id)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>સાચવો</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Summary Stat Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">મૂળ સરેરાશ ટકા</div>
                        <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                          {rawRes.percentage}%
                        </div>
                        <div className="text-[10px] text-slate-400">મુખ્ય વિષયો (૭૦૦)</div>
                      </div>

                      <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30">
                        <div className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase">મળવાપાત્ર સિદ્ધિ ગુણ</div>
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
                          બાકી: <strong>{remainingSiddhi}</strong> / {siddhiPool}
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

                  {/* Subject-Wise Grace Marks Table (Columns requested by User) */}
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
                            <th className="py-3 px-2 w-28 bg-teal-500/10 text-teal-900 dark:text-teal-200">
                              <div>મળવાપાત્ર સિદ્ધિ</div>
                              <div className="text-[10px] font-normal text-teal-700">પૂલ: {siddhiPool}</div>
                            </th>
                            <th className="py-3 px-2 w-28 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200">
                              <div>આપેલ સિદ્ધિ ગુણ (#)</div>
                              <div className="text-[10px] font-normal text-indigo-700">એન્ટ્રી બોક્સ</div>
                            </th>
                            <th className="py-3 px-2 w-28 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                              <div>આપેલ કૃપા ગુણ (*)</div>
                              <div className="text-[10px] font-normal text-amber-700">મહત્તમ ૧૦</div>
                            </th>
                            <th className="py-3 px-2 w-28 bg-emerald-500/10 font-black text-emerald-950 dark:text-emerald-200">
                              <div>કુલ ગુણ</div>
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

                                {/* 2. મળવાપાત્ર સિદ્ધિ ગુણ */}
                                <td className="py-3 px-2 text-teal-800 dark:text-teal-300 font-bold bg-teal-500/5">
                                  {hasUnder25 ? '૦' : siddhiPool}
                                </td>

                                {/* 3. આપેલ સિદ્ધિ ગુણ (#) */}
                                <td className="py-2 px-2 bg-indigo-500/5">
                                  <input
                                    type="number"
                                    min="0"
                                    max={siddhiPool}
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
                                    max="10"
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
            );
          })()}

          {/* LAYOUT 2: CLASS-WIDE OVERVIEW TABLE */}
          {siddhiViewLayout === 'overview' && (
            <div className="border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xs bg-white dark:bg-slate-900 space-y-4 p-4">
              <div className="flex items-center justify-between pb-3 border-b flex-wrap gap-3">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  ધોરણ ૯ • વર્ગવાર સિદ્ધિ અને કૃપા ગુણ વિહંગાવલોકન
                </span>
                <span className="text-xs text-slate-500">
                  કુલ વિદ્યાર્થીઓ: <strong>{filteredStudents.length}</strong>
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
                    {filteredStudents.map((st, idx) => {
                      const rawRes = computeClass9StudentResult(st, marks, '700', {});
                      const activeRes = computeClass9StudentResult(st, marks, '700', manualGraceOverrides[st.id]);
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

            <div className="space-y-3 text-xs leading-relaxed max-h-[400px] overflow-y-auto pr-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white">૧. પ્રથમ & દ્વિતીય પરીક્ષા વિષયો (૬ વિષયો)</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  ગુજરાતી, ગણિત, વિજ્ઞાન, સામાજિક વિજ્ઞાન, અંગ્રેજી, હિન્દી/સંસ્કૃત. વિષય દીઠ ૫૦ ગુણ, કુલ ૩૦૦ ગુણ. લઘુત્તમ પાસિંગ ૧૭ ગુણ (૩૩%).
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white">૨. ૨૦૦ → ૧૦૦ રૂપાંતરણ (વાર્ષિક)</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  પ્રથમ (૫૦) + દ્વિતીય (૫૦) + વાર્ષિક (૮૦) + આંતરિક (૨૦) = ૨૦૦ / ૨ = ૧૦૦ ગુણ.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white">૩. GSEB ગ્રેડિંગ સ્કેલ</h4>
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
    </div>
  );
};
