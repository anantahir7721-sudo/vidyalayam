import React, { useState, useMemo, useEffect, useRef } from 'react';
import { School, Student, MarkRecord, AllowedStandard } from '../types';
import * as XLSX from 'xlsx';
import {
  Award,
  FileSpreadsheet,
  Printer,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  Eye,
  Search,
  Users,
  Download,
  Upload,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Percent,
  Send,
  MessageSquare,
  Save,
  Loader2,
  RefreshCw,
  Calculator,
  Info,
} from 'lucide-react';
import {
  calculateClassResults,
  CalculatedStudentResult,
  getSubjectsForStandard,
  getExamsForStandard,
  STANDARD_OPTIONS,
  StandardOption,
  SubjectDef,
  ExamDef,
  generateExcelMarksheetWorkbook,
  normalizeStandardAndStream,
  calculateGsebGrade,
} from '../utils/resultFormulaUtils';
import { saveBatchExamMarks } from '../services/firestoreService';
import { printHtmlDocument } from '../utils/printAndPdfUtils';
import { SendExamResultModal } from './SendExamResultModal';

interface ResultsManagerProps {
  school: School;
  students: Student[];
  marks: MarkRecord[];
  onBack: () => void;
  onRefresh?: () => void;
  onNavigateToMarks?: () => void;
  initialView?: 'gazette' | 'marks_entry' | 'progress_card';
}

interface StudentMarksRowState {
  student: Student;
  pratham: string;
  dwitiya: string;
  ekam1: string;
  ekam2: string;
  practical: string;
  internal: string;
  varshik: string;
  // Computed values
  total100: number;
  grade: string;
  status: 'PASS' | 'GRACE' | 'FAIL';
  isDirty: boolean;
}

export const ResultsManager: React.FC<ResultsManagerProps> = ({
  school,
  students,
  marks,
  onBack,
  onRefresh,
  onNavigateToMarks,
  initialView = 'gazette',
}) => {
  const [selectedStandard, setSelectedStandard] = useState<string>('9');
  const [viewMode, setViewMode] = useState<'gazette' | 'marks_entry' | 'progress_card'>(initialView);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'PASS_WITH_SIDDHI' | 'PASS_WITH_KRUPA' | 'FAIL'>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [sendResultModalOpen, setSendResultModalOpen] = useState(false);

  // Marks Entry state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [marksGrid, setMarksGrid] = useState<Record<string, StudentMarksRowState>>({});
  const [isSavingMarks, setIsSavingMarks] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalized Standard & Stream details
  const currentStdInfo = useMemo(() => {
    return normalizeStandardAndStream(selectedStandard);
  }, [selectedStandard]);

  // Current Subjects and Exams for the selected standard/stream
  const subjects = useMemo(() => {
    return getSubjectsForStandard(selectedStandard);
  }, [selectedStandard]);

  const exams = useMemo(() => {
    return getExamsForStandard(selectedStandard);
  }, [selectedStandard]);

  // Default subject when subjects list changes
  useEffect(() => {
    if (subjects.length > 0 && (!selectedSubjectId || !subjects.some((s) => s.id === selectedSubjectId))) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  const activeSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  }, [subjects, selectedSubjectId]);

  // Students belonging to the selected standard
  const standardStudents = useMemo(() => {
    return students.filter((s) => {
      const sNorm = normalizeStandardAndStream(s.standard);
      return sNorm.baseStd === currentStdInfo.baseStd;
    }).sort((a, b) => {
      const rA = parseInt(a.rollNumber || '9999', 10);
      const rB = parseInt(b.rollNumber || '9999', 10);
      return rA - rB;
    });
  }, [students, currentStdInfo.baseStd]);

  // Helper to compute a student's row in the Excel marks grid
  const computeRowTotals = (
    prathamStr: string,
    dwitiyaStr: string,
    ekam1Str: string,
    ekam2Str: string,
    practicalStr: string,
    internalStr: string,
    varshikStr: string
  ) => {
    const parseVal = (str: string) => {
      if (!str || str.trim().toUpperCase() === 'AB') return 0;
      const n = parseFloat(str.trim());
      return isNaN(n) ? 0 : n;
    };

    const p = parseVal(prathamStr);
    const d = parseVal(dwitiyaStr);
    const e1 = parseVal(ekam1Str);
    const e2 = parseVal(ekam2Str);
    const prac = parseVal(practicalStr);
    const v = parseVal(varshikStr);
    let intVal = parseVal(internalStr);

    // If internal is empty but unit tests are filled
    if (!internalStr && (ekam1Str || ekam2Str)) {
      intVal = Math.round(((e1 + e2) / 50) * 20);
    }

    let total100 = 0;
    if (currentStdInfo.stream === 'science' && currentStdInfo.baseStd === '11') {
      // 10% + 10% + 20% (prac) + 10% (int) + 50% (annual)
      const pW = (p / 50) * 10;
      const dW = (d / 50) * 10;
      const pracW = (prac / 50) * 20;
      const intW = (intVal / 20) * 10;
      const vW = (v / 80) * 50;
      total100 = Math.round(pW + dW + pracW + intW + vW);
    } else if (currentStdInfo.stream === 'science' && currentStdInfo.baseStd === '12') {
      // 10% + 25% (prac) + 50% (prelim) + 15% (int)
      const pW = (p / 50) * 10;
      const pracW = (prac / 50) * 25;
      const prelW = (d / 100) * 50;
      const intW = (intVal / 20) * 15;
      total100 = Math.round(pW + pracW + prelW + intW);
    } else if (currentStdInfo.baseStd === '10' || currentStdInfo.baseStd === '12') {
      // 10% + 70% (prelim) + 20% (int)
      const pW = (p / 50) * 10;
      const maxPrel = currentStdInfo.baseStd === '12' ? 100 : 80;
      const prelW = (d / maxPrel) * 70;
      total100 = Math.round(pW + prelW + intVal);
    } else {
      // Std 9 & 11 General: 10% + 10% + 60% + 20%
      const pW = (p / 50) * 10;
      const dW = (d / 50) * 10;
      const vW = (v / 80) * 60;
      total100 = Math.round(pW + dW + vW + intVal);
    }

    const grade = calculateGsebGrade(total100, 100);
    const status: 'PASS' | 'GRACE' | 'FAIL' =
      total100 >= 33 ? 'PASS' : total100 >= 25 ? 'GRACE' : 'FAIL';

    return { total100, grade, status };
  };

  // Populate Excel Marks Grid from stored Firestore marks when Subject or Standard changes
  useEffect(() => {
    if (!activeSubject) return;

    const initialMap: Record<string, StudentMarksRowState> = {};

    standardStudents.forEach((student) => {
      const studentMarks = marks.filter((m) => {
        if (m.studentId !== student.id) return false;
        const matchesSubject =
          (m.subjectId && m.subjectId.toLowerCase() === activeSubject.id.toLowerCase()) ||
          (m.subjectName && m.subjectName.toLowerCase().includes(activeSubject.nameGu.toLowerCase()));
        return matchesSubject;
      });

      const getVal = (examTypeKey: string): string => {
        const found = studentMarks.find((m) => {
          const ex = (m.examType || '').toLowerCase();
          if (examTypeKey === 'pratham') return ex.includes('pratham') || ex.includes('પ્રથમ') || ex.includes('first');
          if (examTypeKey === 'dwitiya' || examTypeKey === 'prelim') {
            return ex.includes('dwitiya') || ex.includes('દ્વિતીય') || ex.includes('second') || ex.includes('prelim') || ex.includes('પ્રિલિમ');
          }
          if (examTypeKey === 'ekam_1') return ex.includes('એકમ') && ex.includes('1') || ex.includes('unit test 1');
          if (examTypeKey === 'ekam_2') return ex.includes('એકમ') && ex.includes('2') || ex.includes('unit test 2');
          if (examTypeKey === 'practical') return ex.includes('practical') || ex.includes('પ્રાયોગિક');
          if (examTypeKey === 'internal') return ex.includes('internal') || ex.includes('આંતરિક');
          if (examTypeKey === 'varshik') return ex.includes('varshik') || ex.includes('વાર્ષિક') || ex.includes('annual');
          return false;
        });
        if (!found) return '';
        if (found.overallGrade === 'AB') return 'AB';
        return found.totalObtained !== undefined ? String(found.totalObtained) : '';
      };

      const pStr = getVal('pratham');
      const dStr = getVal(currentStdInfo.baseStd === '10' || currentStdInfo.baseStd === '12' ? 'prelim' : 'dwitiya');
      const e1Str = getVal('ekam_1');
      const e2Str = getVal('ekam_2');
      const pracStr = getVal('practical');
      const intStr = getVal('internal');
      const vStr = getVal('varshik');

      const { total100, grade, status } = computeRowTotals(pStr, dStr, e1Str, e2Str, pracStr, intStr, vStr);

      initialMap[student.id] = {
        student,
        pratham: pStr,
        dwitiya: dStr,
        ekam1: e1Str,
        ekam2: e2Str,
        practical: pracStr,
        internal: intStr,
        varshik: vStr,
        total100,
        grade,
        status,
        isDirty: false,
      };
    });

    setMarksGrid(initialMap);
    setSaveSuccessMsg(null);
  }, [activeSubject?.id, selectedStandard, standardStudents, marks]);

  // Handle cell input in Excel Grid
  const handleCellChange = (studentId: string, field: keyof StudentMarksRowState, value: string) => {
    setMarksGrid((prev) => {
      const current = prev[studentId];
      if (!current) return prev;

      const updated = { ...current, [field]: value, isDirty: true };
      const { total100, grade, status } = computeRowTotals(
        field === 'pratham' ? value : updated.pratham,
        field === 'dwitiya' ? value : updated.dwitiya,
        field === 'ekam1' ? value : updated.ekam1,
        field === 'ekam2' ? value : updated.ekam2,
        field === 'practical' ? value : updated.practical,
        field === 'internal' ? value : updated.internal,
        field === 'varshik' ? value : updated.varshik
      );

      updated.total100 = total100;
      updated.grade = grade;
      updated.status = status;

      return { ...prev, [studentId]: updated };
    });
  };

  // Batch Save all marks to Firestore
  const handleSaveMarks = async () => {
    if (!activeSubject) return;
    setIsSavingMarks(true);
    setSaveSuccessMsg(null);

    try {
      const recordsToSave: any[] = [];
      const academicYear = '૨૦૨૬–૨૭';

      Object.values(marksGrid).forEach((row) => {
        const { student, pratham, dwitiya, ekam1, ekam2, practical, internal, varshik } = row;

        const addRecord = (examId: string, examType: string, val: string, maxM: number) => {
          if (!val || val.trim() === '') return;
          const isAb = val.trim().toUpperCase() === 'AB';
          const obtained = isAb ? 0 : parseFloat(val.trim()) || 0;

          recordsToSave.push({
            studentId: student.id,
            studentName: student.studentName,
            grNumber: student.grNumber || '',
            rollNumber: student.rollNumber || '',
            standard: currentStdInfo.baseStd,
            division: student.section || student.division || 'A',
            examId,
            examType,
            academicYear,
            subjectId: activeSubject.id,
            subjectName: activeSubject.nameGu,
            totalObtained: obtained,
            totalMax: maxM,
            percentage: isAb ? 0 : Math.round((obtained / maxM) * 100),
            overallGrade: isAb ? 'AB' : calculateGsebGrade(obtained, maxM),
          });
        };

        addRecord('pratham', 'પ્રથમ પરીક્ષા', pratham, 50);
        addRecord(
          currentStdInfo.baseStd === '10' || currentStdInfo.baseStd === '12' ? 'prelim' : 'dwitiya',
          currentStdInfo.baseStd === '10' || currentStdInfo.baseStd === '12' ? 'પ્રિલિમિનરી પરીક્ષા' : 'દ્વિતીય પરીક્ષા',
          dwitiya,
          currentStdInfo.baseStd === '12' ? 100 : currentStdInfo.baseStd === '10' ? 80 : 50
        );
        addRecord('ekam_1', 'એકમ કસોટી - ૧', ekam1, 25);
        addRecord('ekam_2', 'એકમ કસોટી - ૨', ekam2, 25);
        if (activeSubject.hasPractical) {
          addRecord('practical', 'પ્રાયોગિક પરીક્ષા', practical, 50);
        }
        addRecord('internal', 'આંતરિક મૂલ્યાંકન', internal, 20);
        addRecord('varshik', 'વાર્ષિક પરીક્ષા', varshik, 80);
      });

      if (recordsToSave.length > 0) {
        await saveBatchExamMarks(school.id, recordsToSave);
      }

      // Mark clean
      setMarksGrid((prev) => {
        const clean: Record<string, StudentMarksRowState> = {};
        Object.entries(prev).forEach(([k, v]) => {
          clean[k] = { ...v, isDirty: false };
        });
        return clean;
      });

      setSaveSuccessMsg(`સફળતાપૂર્વક ${recordsToSave.length} ગુણ રેકોર્ડ્સ ડેટાબેઝમાં સાચવી લેવામાં આવ્યા છે!`);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error saving marks batch:', err);
      alert('ગુણ સેવ કરવામાં ભૂલ થઈ. કૃપા કરીને પુનઃ પ્રયત્ન કરો.');
    } finally {
      setIsSavingMarks(false);
    }
  };

  // Download Excel Template for active Subject
  const handleDownloadExcelTemplate = () => {
    if (!activeSubject) return;
    const wb = generateExcelMarksheetWorkbook(standardStudents, selectedStandard, activeSubject, school.schoolName);
    const fileName = `${school.schoolName}_ધોરણ_${selectedStandard}_${activeSubject.nameGu.replace(/[\s/\\?%*:|"<>]/g, '_')}_Marksheet.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Import Excel File (.xlsx)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 4) {
          alert('એક્સેલ ફાઈલ ખાલી છે અથવા યોગ્ય ફોર્મેટમાં નથી.');
          return;
        }

        // Find header row (usually contains 'Roll' or 'રોલ' or 'નામ' or 'Student')
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const rowText = (rows[i] || []).join(' ').toLowerCase();
          if (rowText.includes('roll') || rowText.includes('નામ') || rowText.includes('gr') || rowText.includes('વિદ્યાર્થી')) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          alert('એક્સેલ શીટમાં વિદ્યાર્થી રોલ નંબર કે નામની હેડર લાઈન ઓળખી શકાઈ નથી.');
          return;
        }

        const headers = rows[headerRowIdx].map((h: any) => String(h || '').trim().toLowerCase());
        const rollIdx = headers.findIndex((h) => h.includes('roll') || h.includes('રોલ'));
        const grIdx = headers.findIndex((h) => h.includes('gr') || h.includes('જી.આર') || h.includes('જીઆર'));
        const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('નામ'));

        // Identify exam columns
        const prathamIdx = headers.findIndex((h) => h.includes('પ્રથમ') || h.includes('first'));
        const dwitiyaIdx = headers.findIndex((h) => h.includes('દ્વિતીય') || h.includes('second') || h.includes('prelim') || h.includes('પ્રિલિમ'));
        const ekam1Idx = headers.findIndex((h) => (h.includes('એકમ') && h.includes('1')) || h.includes('unit 1') || h.includes('unit test 1'));
        const ekam2Idx = headers.findIndex((h) => (h.includes('એકમ') && h.includes('2')) || h.includes('unit 2') || h.includes('unit test 2'));
        const practicalIdx = headers.findIndex((h) => h.includes('practical') || h.includes('પ્રાયોગિક'));
        const internalIdx = headers.findIndex((h) => h.includes('આંતરિક') || h.includes('internal'));
        const varshikIdx = headers.findIndex((h) => h.includes('વાર્ષિક') || h.includes('annual'));

        let matchedCount = 0;

        setMarksGrid((prev) => {
          const next = { ...prev };

          for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const rowData = rows[r];
            if (!rowData || rowData.length === 0) continue;

            const rollVal = rollIdx !== -1 ? String(rowData[rollIdx] || '').trim() : '';
            const grVal = grIdx !== -1 ? String(rowData[grIdx] || '').trim().toLowerCase() : '';
            const nameVal = nameIdx !== -1 ? String(rowData[nameIdx] || '').trim().toLowerCase() : '';

            // Match student in class
            const targetStudent = standardStudents.find((st) => {
              if (rollVal && st.rollNumber && st.rollNumber.trim() === rollVal) return true;
              if (grVal && st.grNumber && st.grNumber.trim().toLowerCase() === grVal) return true;
              if (nameVal && st.studentName && st.studentName.trim().toLowerCase().includes(nameVal)) return true;
              return false;
            });

            if (targetStudent && next[targetStudent.id]) {
              matchedCount++;
              const cur = next[targetStudent.id];

              const p = prathamIdx !== -1 && rowData[prathamIdx] !== undefined ? String(rowData[prathamIdx]) : cur.pratham;
              const d = dwitiyaIdx !== -1 && rowData[dwitiyaIdx] !== undefined ? String(rowData[dwitiyaIdx]) : cur.dwitiya;
              const e1 = ekam1Idx !== -1 && rowData[ekam1Idx] !== undefined ? String(rowData[ekam1Idx]) : cur.ekam1;
              const e2 = ekam2Idx !== -1 && rowData[ekam2Idx] !== undefined ? String(rowData[ekam2Idx]) : cur.ekam2;
              const prac = practicalIdx !== -1 && rowData[practicalIdx] !== undefined ? String(rowData[practicalIdx]) : cur.practical;
              const intVal = internalIdx !== -1 && rowData[internalIdx] !== undefined ? String(rowData[internalIdx]) : cur.internal;
              const v = varshikIdx !== -1 && rowData[varshikIdx] !== undefined ? String(rowData[varshikIdx]) : cur.varshik;

              const { total100, grade, status } = computeRowTotals(p, d, e1, e2, prac, intVal, v);

              next[targetStudent.id] = {
                ...cur,
                pratham: p,
                dwitiya: d,
                ekam1: e1,
                ekam2: e2,
                practical: prac,
                internal: intVal,
                varshik: v,
                total100,
                grade,
                status,
                isDirty: true,
              };
            }
          }

          return next;
        });

        setImportStatusMsg(`એક્સેલ ફાઈલમાંથી ${matchedCount} વિદ્યાર્થીઓના ગુણ સફળતાપૂર્વક લોડ કરવામાં આવ્યા છે! ચકાસીને 'બધા ગુણ સેવ કરો' બટન પર ક્લિક કરો.`);
      } catch (err) {
        console.error('Error importing Excel:', err);
        alert('એક્સેલ ફાઈલ વાંચવામાં ક્ષતિ થઈ. ખાતરી કરો કે ફાઈલ .xlsx ફોર્મેટમાં છે.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 1. Calculate Results using the exact GSEB Formula Engine
  const classResults = useMemo(() => {
    return calculateClassResults(students, marks, selectedStandard);
  }, [students, marks, selectedStandard]);

  // Set default selected student when list changes
  const activeStudentResult = useMemo(() => {
    if (classResults.length === 0) return null;
    if (!selectedStudentId) return classResults[0];
    return classResults.find((r) => r.student.id === selectedStudentId) || classResults[0];
  }, [classResults, selectedStudentId]);

  // Filtered results for Gazette
  const filteredResults = useMemo(() => {
    return classResults.filter((res) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = res.student.studentName.toLowerCase().includes(q);
        const matchesRoll = res.student.rollNumber && res.student.rollNumber.includes(q);
        const matchesGr = res.student.grNumber && res.student.grNumber.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesGr) return false;
      }
      // Status filter
      if (statusFilter === 'PASS') return res.resultStatus === 'PASS';
      if (statusFilter === 'PASS_WITH_SIDDHI') return res.resultStatus === 'PASS_WITH_SIDDHI';
      if (statusFilter === 'PASS_WITH_KRUPA') return res.resultStatus === 'PASS_WITH_KRUPA';
      if (statusFilter === 'FAIL') return res.resultStatus === 'NEEDS_IMPROVEMENT';
      return true;
    });
  }, [classResults, searchQuery, statusFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = classResults.length;
    if (total === 0) {
      return { total: 0, directPassCount: 0, siddhiCount: 0, krupaCount: 0, failCount: 0, passPct: 0, avgPct: 0, highestPct: 0 };
    }
    const directPassCount = classResults.filter((r) => r.resultStatus === 'PASS').length;
    const siddhiCount = classResults.filter((r) => r.resultStatus === 'PASS_WITH_SIDDHI').length;
    const krupaCount = classResults.filter((r) => r.resultStatus === 'PASS_WITH_KRUPA').length;
    const failCount = classResults.filter((r) => r.resultStatus === 'NEEDS_IMPROVEMENT').length;
    const passedTotal = directPassCount + siddhiCount + krupaCount;
    const passPct = Math.round((passedTotal / total) * 100 * 10) / 10;

    const sumPct = classResults.reduce((sum, r) => sum + r.percentage, 0);
    const avgPct = Math.round((sumPct / total) * 10) / 10;
    const highestPct = Math.max(...classResults.map((r) => r.percentage), 0);

    return { total, directPassCount, siddhiCount, krupaCount, failCount, passPct, avgPct, highestPct };
  }, [classResults]);

  // Grade Distribution
  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, D: 0, E1: 0, E2: 0 };
    classResults.forEach((r) => {
      if (counts[r.overallGrade] !== undefined) {
        counts[r.overallGrade]++;
      }
    });
    return counts;
  }, [classResults]);

  // Format subject score display: e.g. "28+5#" or "27+6*" or "27+3#+3*" or "54"
  const formatSubjectScoreDisplay = (sc: any) => {
    let text = `${sc.total100}`;
    if (sc.siddhiMarksGiven > 0 && sc.krupaMarksGiven > 0) {
      return `${sc.total100}+${sc.siddhiMarksGiven}#+${sc.krupaMarksGiven}*`;
    }
    if (sc.siddhiMarksGiven > 0) {
      return `${sc.total100}+${sc.siddhiMarksGiven}#`;
    }
    if (sc.krupaMarksGiven > 0) {
      return `${sc.total100}+${sc.krupaMarksGiven}*`;
    }
    return text;
  };

  // Export Master Result Gazette to Excel
  const handleExportGazetteExcel = () => {
    if (classResults.length === 0) {
      alert('ધોરણ ' + selectedStandard + ' માટે કોઈ પરિણામ ઉપલબ્ધ નથી.');
      return;
    }

    const rows = classResults.map((res, idx) => {
      const rowData: Record<string, any> = {
        'ક્રમ': idx + 1,
        'રોલ નંબર': res.student.rollNumber || '-',
        'G.R. નંબર': res.student.grNumber || '-',
        'વિદ્યાર્થીનું નામ (GR મુજબ)': res.student.studentName,
        'ધોરણ': selectedStandard,
        'વર્ગ': res.student.section || res.student.division || 'A',
      };

      res.subjectScores.forEach((sc) => {
        const key = sc.subjectNameGu.split(' ')[0] + ' (100M)';
        rowData[key] = formatSubjectScoreDisplay(sc);
        rowData[sc.subjectNameGu.split(' ')[0] + ' Grade'] = sc.grade;
      });

      rowData['કુલ ગુણ'] = res.totalObtained;
      rowData['મહત્તમ ગુણ'] = res.totalMax;
      rowData['ટકાવારી (%)'] = res.percentage;
      rowData['એકંદર ગ્રેડ'] = res.overallGrade;
      rowData['સિદ્ધિ ગુણ (#)'] = res.totalSiddhiGiven > 0 ? res.totalSiddhiGiven : '-';
      rowData['કૃપા ગુણ (*)'] = res.totalKrupaGiven > 0 ? res.totalKrupaGiven : '-';
      rowData['પરિણામ સ્થિતિ'] = res.resultStatusGu;
      rowData['વર્ગમાં ક્રમ'] = res.rankInClass || '-';

      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Std_${selectedStandard}_Gazette`);
    XLSX.writeFile(wb, `${school.schoolName}_ધોરણ_${selectedStandard}_વાર્ષિક_ગેઝેટ.xlsx`);
  };

  // Print Gazette
  const handlePrintGazette = () => {
    if (classResults.length === 0) {
      alert('પ્રિન્ટ કરવા માટે કોઈ પરિણામ ઉપલબ્ધ નથી.');
      return;
    }

    const rowsHtml = classResults
      .map(
        (r, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.student.rollNumber || idx + 1}</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.student.grNumber || '-'}</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: left; font-weight: bold;">${r.student.studentName}</td>
          ${r.subjectScores
            .map(
              (s) => `
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">
              <strong>${
                s.siddhiMarksGiven > 0 && s.krupaMarksGiven > 0
                  ? `${s.total100}+<span style="color:#047857;">${s.siddhiMarksGiven}#</span>+<span style="color:#b45309;">${s.krupaMarksGiven}*</span>`
                  : s.siddhiMarksGiven > 0
                  ? `${s.total100}+<span style="color:#047857;">${s.siddhiMarksGiven}#</span>`
                  : s.krupaMarksGiven > 0
                  ? `${s.total100}+<span style="color:#b45309;">${s.krupaMarksGiven}*</span>`
                  : s.total100
              }</strong>
              <div style="font-size: 8pt; color: #555;">${s.grade}</div>
            </td>
          `
            )
            .join('')}
          <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: 800;">${r.totalObtained}/${r.totalMax}</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: 800;">${r.percentage}%</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${r.overallGrade}</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 8.5pt;">
            ${
              r.resultStatus === 'PASS'
                ? '<span style="color: #047857;">ઉત્તીર્ણ</span>'
                : r.resultStatus === 'PASS_WITH_SIDDHI'
                ? `<span style="color: #059669;">સિદ્ધિ (${r.totalSiddhiGiven}#)</span>`
                : r.resultStatus === 'PASS_WITH_KRUPA'
                ? `<span style="color: #b45309;">કૃપા (${r.totalKrupaGiven}*)</span>`
                : '<span style="color: #b91c1c;">સુધારણા જરૂરી</span>'
            }
          </td>
          <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${r.rankInClass || '-'}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${school.schoolName} - ધોરણ ${selectedStandard} સંકલિત પરિણામ પત્રક (Gazette)</title>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 8mm 10mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Anek Gujarati', system-ui, sans-serif; color: #000; background: #fff; margin: 0; padding: 5px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
          .school-name { font-size: 16pt; font-weight: 800; margin: 0; text-transform: uppercase; }
          .sub-header { font-size: 9.5pt; margin-top: 2px; }
          .title-badge { display: inline-block; background: #000; color: #fff; font-size: 11pt; font-weight: 800; padding: 2px 14px; border-radius: 4px; margin-top: 4px; }
          .summary-strip { display: flex; justify-content: space-between; font-size: 8.5pt; font-weight: bold; background: #f1f5f9; border: 1px solid #000; padding: 4px 8px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
          th { border: 1px solid #000; background-color: #e2e8f0; padding: 4px; text-align: center; font-weight: 800; }
          .signatures { margin-top: 30px; display: flex; justify-content: space-between; font-size: 9.5pt; font-weight: bold; padding: 0 40px; }
          .sig-line { border-top: 1px dashed #000; padding-top: 4px; width: 150px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="school-name">${school.schoolName}</h1>
          <div class="sub-header">
            ${school.village ? school.village + ', ' : ''}${school.taluka ? school.taluka + ', ' : ''}${school.district} • DISE કોડ: <strong>${school.diseCode}</strong>
          </div>
          <div class="title-badge">વાર્ષિક સંકલિત પરિણામ પત્રક (ANNUAL RESULT GAZETTE) • ધોરણ ${selectedStandard} • વર્ષ ૨૦૨૬–૨૭</div>
        </div>
        <div class="summary-strip">
          <span>કુલ વિદ્યાર્થીઓ: ${stats.total}</span>
          <span>સીધા ઉત્તીર્ણ: ${stats.directPassCount}</span>
          <span>સિદ્ધિ ગુણ (#): ${stats.siddhiCount}</span>
          <span>કૃપા ગુણ (*): ${stats.krupaCount}</span>
          <span>સુધારણા જરૂરી: ${stats.failCount}</span>
          <span>પરિણામ ટકાવારી: ${stats.passPct}%</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px;">રોલ</th>
              <th style="width: 65px;">G.R. નં</th>
              <th style="text-align: left;">વિદ્યાર્થીનું નામ</th>
              ${subjects.map((sub) => `<th>${sub.nameGu.split(' ')[0]}<br><span style="font-weight:normal; font-size:7.5pt;">(૧૦૦)</span></th>`).join('')}
              <th style="width: 65px;">કુલ ગુણ</th>
              <th style="width: 45px;">ટકા</th>
              <th style="width: 45px;">ગ્રેડ</th>
              <th style="width: 85px;">પરિણામ</th>
              <th style="width: 45px;">ક્રમ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="signatures">
          <div class="sig-line">વર્ગ શિક્ષકની સહી</div>
          <div class="sig-line">પરીક્ષા પ્રમુખશ્રીની સહી</div>
          <div class="sig-line">આચાર્યશ્રીની સહી અને સિક્કો</div>
        </div>
      </body>
      </html>
    `;

    printHtmlDocument(html, `${school.schoolName}_Std_${selectedStandard}_Gazette`);
  };

  // Print Individual Student Progress Card
  const handlePrintStudentCard = (studentResult?: CalculatedStudentResult) => {
    const res = studentResult || activeStudentResult;
    if (!res) {
      alert('કોઈ વિદ્યાર્થી પસંદ થયેલ નથી.');
      return;
    }

    const marksRows = res.subjectScores
      .map(
        (sc, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px; font-weight: bold;">${sc.subjectNameGu}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${sc.prathamRaw !== null ? sc.prathamRaw : '-'}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${sc.dwitiyaRaw !== null ? sc.dwitiyaRaw : '-'}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${sc.varshikRaw !== null ? sc.varshikRaw : '-'}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${sc.internalRaw !== null ? sc.internalRaw : '-'}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; font-size: 10pt;">
            ${formatSubjectScoreDisplay(sc)}
          </td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold;">${sc.grade}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${res.student.studentName} - ધોરણ ${selectedStandard} પ્રગતિ પત્રક</title>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Anek Gujarati', system-ui, sans-serif; color: #000; background: #fff; margin: 0; padding: 5px; }
          .border-frame { border: 3px double #000; padding: 15px; min-height: 98vh; display: flex; flex-direction: column; justify-content: space-between; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
          .school-title { font-size: 18pt; font-weight: 800; margin: 0; text-transform: uppercase; }
          .card-badge { display: inline-block; background: #000; color: #fff; font-size: 11pt; font-weight: bold; padding: 3px 16px; border-radius: 4px; margin-top: 6px; }
          .student-meta-box { border: 1.5px solid #000; padding: 8px 12px; margin-bottom: 14px; font-size: 9.5pt; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; background: #fafafa; }
          table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 14px; }
          th { border: 1px solid #000; background-color: #f1f5f9; padding: 6px; text-align: center; font-weight: 800; }
          .summary-card { border: 1.5px solid #000; padding: 8px 12px; margin-bottom: 14px; display: flex; justify-content: space-around; background: #f8fafc; text-align: center; }
          .sum-lbl { font-size: 8pt; color: #555; font-weight: bold; }
          .sum-val { font-size: 13pt; font-weight: 800; margin-top: 2px; }
          .signatures { margin-top: 35px; display: flex; justify-content: space-between; font-size: 9.5pt; font-weight: 700; padding: 0 15px; }
          .sig-line { border-top: 1.5px dashed #000; padding-top: 5px; width: 160px; text-align: center; }
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
              <div class="card-badge">વાર્ષિક પ્રગતિ પત્રક (ANNUAL PROGRESS REPORT) • ધોરણ ${selectedStandard} • વર્ષ ૨૦૨૬–૨૭</div>
            </div>
            <div class="student-meta-box">
              <div>G.R. નંબર: <strong>${res.student.grNumber || '-'}</strong></div>
              <div>રોલ નંબર: <strong>${res.student.rollNumber || '-'}</strong></div>
              <div>ધોરણ & વર્ગ: <strong>${selectedStandard} (${res.student.section || res.student.division || 'A'})</strong></div>
              <div>વિદ્યાર્થીનું નામ: <strong>${res.student.studentName}</strong></div>
            </div>
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
                ${marksRows}
              </tbody>
            </table>
            <div class="summary-card">
              <div><div class="sum-lbl">કુલ મેળવેલ ગુણ</div><div class="sum-val">${res.totalObtained} / ${res.totalMax}</div></div>
              <div><div class="sum-lbl">ટકાવારી (%)</div><div class="sum-val">${res.percentage}%</div></div>
              <div><div class="sum-lbl">ગ્રેડ</div><div class="sum-val">${res.overallGrade}</div></div>
              <div><div class="sum-lbl">સ્થિતિ</div><div class="sum-val" style="color: ${res.resultStatus === 'PASS' ? '#047857' : '#b91c1c'};">${res.resultStatusGu}</div></div>
              <div><div class="sum-lbl">વર્ગમાં ક્રમ</div><div class="sum-val">${res.rankInClass ? `#${res.rankInClass}` : '-'}</div></div>
            </div>
          </div>
          <div class="signatures">
            <div class="sig-line">વર્ગ શિક્ષકની સહી</div>
            <div class="sig-line">પરીક્ષા પ્રમુખશ્રીની સહી</div>
            <div class="sig-line">આચાર્યશ્રીની સહી અને સિક્કો</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const studentName = res.student.studentName.replace(/[\s/\\?%*:|"<>]/g, '_');
    printHtmlDocument(html, `${studentName}_Progress_Report`);
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportExcel}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Top Banner */}
      <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-slate-800 dark:text-[#e4ded6] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 mt-1 border border-[#E2E8F0] dark:border-transparent"
              title="પાછળના મેનુ પર જાઓ (Go Back)"
            >
              <ArrowLeft className="w-5 h-5 text-[#C45A2D] dark:text-[#f59c73]" />
            </button>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#FBE9DF] dark:bg-[#9d512d]/25 text-[#C45A2D] dark:text-[#f59c73] border border-[#C45A2D]/30 dark:border-[#9d512d]/40 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ઓટોમેટેડ પરિણામ કેન્દ્ર • ધોરણ ૯ થી ૧૨ • એક્સેલ ગણતરી & શીટ સુવિધા</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-[#e4ded6] tracking-tight">
                વાર્ષિક પરિણામ અને ગુણપત્રક કેન્દ્ર
              </h2>
              <p className="text-xs text-slate-600 dark:text-[#a99f91] mt-1 max-w-2xl leading-relaxed">
                પ્રથમ કસોટી, દ્વિતીય/પ્રિલિમ, એકમ કસોટી, પ્રાયોગિક અને આંતરિક ગુણની એક્સેલ જેવી સરળ એન્ટ્રી. વાર્ષિક ૧૦૦ ગુણમાં ઓટોમેટેડ રૂપાંતરણ, GSEB સિદ્ધિ (#) અને કૃપા (*) ગુણ સાથે ગેઝેટ અને પ્રગતિ પત્રક.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowRulesModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-card text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-white border-amber-500/30 hover:border-amber-500 transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>ફોર્મ્યુલા & શું આપવું?</span>
            </button>
          </div>
        </div>

        {/* Standard Selector Pills (Std 9, 10, 11 General, 11 Science, 12 General, 12 Science) */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-600 dark:text-[#a99f91] shrink-0 mr-1">
            ધોરણ પસંદ કરો:
          </span>
          {STANDARD_OPTIONS.map((opt) => {
            const isSelected = selectedStandard === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setSelectedStandard(opt.id);
                  setSelectedStudentId('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'btn-terracotta text-white shadow-lg shadow-[#C45A2D]/30 scale-105'
                    : 'glass-card text-slate-700 dark:text-[#a99f91] hover:text-slate-900 dark:hover:text-white border border-[#E2E8F0] dark:border-white/10'
                }`}
              >
                {opt.nameGu}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card rounded-2xl border border-[#E2E8F0] dark:border-white/10 p-4">
          <div className="text-[11px] text-slate-500 dark:text-[#a99f91] font-bold">કુલ વિદ્યાર્થીઓ</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">ધોરણ {selectedStandard}</div>
        </div>

        <div className="glass-card rounded-2xl border border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/5 p-4">
          <div className="text-[11px] text-emerald-800 dark:text-emerald-400 font-bold">સીધા ઉત્તીર્ણ (Direct)</div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{stats.directPassCount}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">કોઈ ગ્રેસ વગર પાસ</div>
        </div>

        <div className="glass-card rounded-2xl border border-teal-500/30 dark:border-teal-500/20 bg-teal-500/10 dark:bg-teal-500/5 p-4">
          <div className="text-[11px] text-teal-800 dark:text-teal-400 font-bold">સિદ્ધિ ગુણ (#)</div>
          <div className="text-2xl font-black text-teal-700 dark:text-teal-300 mt-1">{stats.siddhiCount}</div>
          <div className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">રેન્ક માટે પાત્ર (1-15M)</div>
        </div>

        <div className="glass-card rounded-2xl border border-amber-500/30 dark:border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/5 p-4">
          <div className="text-[11px] text-amber-800 dark:text-amber-400 font-bold">કૃપા ગુણ (*)</div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">{stats.krupaCount}</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">આચાર્ય ક્વોટા (1-10M)</div>
        </div>

        <div className="glass-card rounded-2xl border border-rose-500/30 dark:border-red-500/20 bg-rose-500/10 dark:bg-red-500/5 p-4">
          <div className="text-[11px] text-rose-800 dark:text-red-400 font-bold">સુધારણા જરૂરી</div>
          <div className="text-2xl font-black text-rose-700 dark:text-red-400 mt-1">{stats.failCount}</div>
          <div className="text-[10px] text-rose-600 dark:text-red-500 mt-0.5">પુનઃપરીક્ષા પાત્ર</div>
        </div>

        <div className="glass-card rounded-2xl border border-blue-500/30 dark:border-blue-500/20 bg-blue-500/10 dark:bg-blue-500/5 p-4">
          <div className="text-[11px] text-blue-800 dark:text-blue-400 font-bold">પરિણામ ટકાવારી</div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">{stats.passPct}%</div>
          <div className="text-[10px] text-blue-600 dark:text-blue-500 mt-0.5">સર્વોચ્ચ: {stats.highestPct}%</div>
        </div>
      </div>

      {/* Grade Distribution Pill Strip */}
      <div className="glass-card rounded-2xl border border-[#E2E8F0] dark:border-white/10 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-700 dark:text-[#a99f91] flex items-center gap-1.5">
          <Award className="w-4 h-4 text-[#C45A2D] dark:text-[#f59c73]" />
          ગ્રેડ વિતરણ:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(gradeDistribution).map(([gr, rawCount]) => {
            const count = Number(rawCount);
            return (
              <span
                key={gr}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  count > 0
                    ? gr.startsWith('A')
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-400'
                      : gr.startsWith('B')
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-800 dark:text-blue-400'
                      : gr.startsWith('C') || gr === 'D'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-400'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-500'
                }`}
              >
                {gr}: <strong>{count}</strong>
              </span>
            );
          })}
        </div>
      </div>

      {/* View Switcher & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 3-Way Mode Switcher: Gazette | Excel Marks Entry | Progress Card */}
        <div className="flex gap-1.5 p-1 rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-sm overflow-x-auto">
          <button
            onClick={() => setViewMode('gazette')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'gazette'
                ? 'btn-terracotta text-white shadow'
                : 'text-slate-600 hover:text-slate-900 dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>વાર્ષિક પરિણામ ગેઝેટ</span>
          </button>

          <button
            onClick={() => setViewMode('marks_entry')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'marks_entry'
                ? 'btn-terracotta text-white shadow'
                : 'text-slate-600 hover:text-slate-900 dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>📝 એક્સેલ ગુણ એન્ટ્રી શીટ</span>
          </button>

          <button
            onClick={() => setViewMode('progress_card')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'progress_card'
                ? 'btn-terracotta text-white shadow'
                : 'text-slate-600 hover:text-slate-900 dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>વિદ્યાર્થી પ્રગતિ પત્રક</span>
          </button>
        </div>

        {/* Action Buttons based on View */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setSendResultModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            title="વાલીઓને વ્યક્તિગત પરીક્ષા પરિણામ WhatsApp / SMS દ્વારા મોકલો"
          >
            <Send className="w-3.5 h-3.5" />
            <span>વાલીઓને પરિણામ મોકલો 🚀</span>
          </button>

          {viewMode === 'marks_entry' && (
            <>
              <button
                onClick={handleDownloadExcelTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass-card text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-white transition-all cursor-pointer border border-[#E2E8F0] dark:border-white/10"
                title="વિદ્યાર્થીઓના નામ અને રોલ નંબર સાથે એક્સેલ શીટ ડાઉનલોડ કરો"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ટેમ્પલેટ ડાઉનલોડ (.xlsx)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass-card text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-white transition-all cursor-pointer border border-[#E2E8F0] dark:border-white/10"
                title="તમારી શાળાની એક્સેલ ફાઈલ અપલોડ કરો"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>એક્સેલ અપલોડ કરો</span>
              </button>

              <button
                onClick={handleSaveMarks}
                disabled={isSavingMarks}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl btn-terracotta text-white text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingMarks ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>સેવ થઈ રહ્યું છે...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>બધા ગુણ સેવ કરો 💾</span>
                  </>
                )}
              </button>
            </>
          )}

          {viewMode === 'gazette' && (
            <>
              <button
                onClick={handleExportGazetteExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass-card text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-white transition-all cursor-pointer border border-[#E2E8F0] dark:border-white/10"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ગેઝેટ એક્સેલ (.xlsx)</span>
              </button>
              <button
                onClick={handlePrintGazette}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl btn-terracotta text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>ગેઝેટ પ્રિન્ટ (A4 Landscape)</span>
              </button>
            </>
          )}

          {viewMode === 'progress_card' && (
            <button
              onClick={() => handlePrintStudentCard()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl btn-terracotta text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>પ્રગતિ પત્રક પ્રિન્ટ (A4 Portrait)</span>
            </button>
          )}
        </div>
      </div>

      {/* Success / Status Messages */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-400 hover:underline">
            ✕
          </button>
        </div>
      )}

      {importStatusMsg && (
        <div className="p-3 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{importStatusMsg}</span>
          </div>
          <button onClick={() => setImportStatusMsg(null)} className="text-blue-700 dark:text-blue-400 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* VIEW 1: EXCEL-LIKE MARKS ENTRY GRID */}
      {viewMode === 'marks_entry' && (
        <div className="glass-card rounded-2xl border border-[#E2E8F0] dark:border-white/10 overflow-hidden shadow-2xl space-y-0">
          {/* Controls Strip: Subject Selector & Helper */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-b border-[#E2E8F0] dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-[#a99f91]">વિષય પસંદ કરો:</span>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C45A2D]"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.nameGu} {sub.hasPractical ? '(થિયરી + પ્રાયોગિક)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>
                <strong>{activeSubject?.nameGu}</strong> ના ગુણ એન્ટ્રી શીટ ({standardStudents.length} વિદ્યાર્થીઓ)
              </span>
            </div>
          </div>

          {/* Excel Instructions strip */}
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span>
              💡 <strong>એક્સેલ સુવિધા:</strong> કોઈપણ ખાનામાં સીધા ગુણ લખો (ગેરહાજર માટે <strong>AB</strong>). ૧૦૦ માંથી કુલ ગણતરી આપોઆપ થઈ જશે. ફેરફાર પૂર્ણ કરી ઉપરનું <strong>'બધા ગુણ સેવ કરો'</strong> બટન દબાવો.
            </span>
            <span className="text-[10px] font-mono opacity-80">Tab / Enter = Next Field</span>
          </div>

          {/* Interactive Spreadsheet Table */}
          <div className="overflow-x-auto mobile-table-scroll max-h-[640px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-[#a99f91] sticky top-0 z-10 shadow-xs border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 text-center w-12 font-bold">રોલ</th>
                  <th className="py-3 px-3 w-20 font-bold">G.R. નં</th>
                  <th className="py-3 px-4 min-w-[150px] font-bold text-slate-900 dark:text-white">વિદ્યાર્થીનું નામ</th>
                  <th className="py-3 px-2 text-center w-24 font-bold bg-blue-50/60 dark:bg-blue-950/20">
                    <div>પ્રથમ કસોટી</div>
                    <div className="text-[10px] text-slate-500 font-normal">(૫૦ માંથી)</div>
                  </th>
                  <th className="py-3 px-2 text-center w-24 font-bold bg-blue-50/60 dark:bg-blue-950/20">
                    <div>{currentStdInfo.baseStd === '10' || currentStdInfo.baseStd === '12' ? 'પ્રિલિમ' : 'દ્વિતીય કસોટી'}</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      ({currentStdInfo.baseStd === '12' ? '૧૦૦' : currentStdInfo.baseStd === '10' ? '૮૦' : '૫૦'} માંથી)
                    </div>
                  </th>
                  <th className="py-3 px-2 text-center w-20 font-bold bg-amber-50/60 dark:bg-amber-950/20">
                    <div>એકમ ૧</div>
                    <div className="text-[10px] text-slate-500 font-normal">(૨૫ માંથી)</div>
                  </th>
                  <th className="py-3 px-2 text-center w-20 font-bold bg-amber-50/60 dark:bg-amber-950/20">
                    <div>એકમ ૨</div>
                    <div className="text-[10px] text-slate-500 font-normal">(૨૫ માંથી)</div>
                  </th>
                  {activeSubject?.hasPractical && (
                    <th className="py-3 px-2 text-center w-24 font-bold bg-teal-50/60 dark:bg-teal-950/20">
                      <div>પ્રાયોગિક</div>
                      <div className="text-[10px] text-slate-500 font-normal">(૫૦ માંથી)</div>
                    </th>
                  )}
                  <th className="py-3 px-2 text-center w-20 font-bold bg-purple-50/60 dark:bg-purple-950/20">
                    <div>આંતરિક</div>
                    <div className="text-[10px] text-slate-500 font-normal">(૨૦ માંથી)</div>
                  </th>
                  {(currentStdInfo.baseStd === '9' || currentStdInfo.baseStd === '11') && (
                    <th className="py-3 px-2 text-center w-24 font-bold bg-emerald-50/60 dark:bg-emerald-950/20">
                      <div>વાર્ષિક પરીક્ષા</div>
                      <div className="text-[10px] text-slate-500 font-normal">(૮૦ માંથી)</div>
                    </th>
                  )}
                  <th className="py-3 px-3 text-center w-24 font-black bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white">
                    <div>રૂપાંતરિત કુલ</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 font-normal">(૧૦૦ માંથી)</div>
                  </th>
                  <th className="py-3 px-2 text-center w-14 font-bold">ગ્રેડ</th>
                  <th className="py-3 px-3 text-center w-20 font-bold">સ્થિતિ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono">
                {standardStudents.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-500 dark:text-slate-400 font-sans">
                      આ ધોરણમાં હજુ કોઈ વિદ્યાર્થી દાખલ થયેલ નથી.
                    </td>
                  </tr>
                ) : (
                  standardStudents.map((st, idx) => {
                    const row = marksGrid[st.id] || {
                      student: st,
                      pratham: '',
                      dwitiya: '',
                      ekam1: '',
                      ekam2: '',
                      practical: '',
                      internal: '',
                      varshik: '',
                      total100: 0,
                      grade: '-',
                      status: 'FAIL',
                      isDirty: false,
                    };

                    return (
                      <tr
                        key={st.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors ${
                          row.isDirty ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-bold text-slate-800 dark:text-slate-200 font-sans">
                          {st.rollNumber || idx + 1}
                        </td>
                        <td className="py-2 px-3 text-[#9d512d] dark:text-[#f59c73] text-[11px]">
                          {st.grNumber || '-'}
                        </td>
                        <td className="py-2 px-4 font-bold text-slate-900 dark:text-white font-sans truncate max-w-[180px]">
                          {st.studentName}
                        </td>

                        {/* First Exam Input */}
                        <td className="py-1.5 px-1.5 text-center bg-blue-50/20 dark:bg-blue-950/10">
                          <input
                            type="text"
                            value={row.pratham}
                            onChange={(e) => handleCellChange(st.id, 'pratham', e.target.value)}
                            placeholder="0-50"
                            className="w-16 py-1 px-1.5 rounded-lg text-center text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#C45A2D]"
                          />
                        </td>

                        {/* Second / Prelim Exam Input */}
                        <td className="py-1.5 px-1.5 text-center bg-blue-50/20 dark:bg-blue-950/10">
                          <input
                            type="text"
                            value={row.dwitiya}
                            onChange={(e) => handleCellChange(st.id, 'dwitiya', e.target.value)}
                            placeholder={currentStdInfo.baseStd === '12' ? '0-100' : currentStdInfo.baseStd === '10' ? '0-80' : '0-50'}
                            className="w-16 py-1 px-1.5 rounded-lg text-center text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#C45A2D]"
                          />
                        </td>

                        {/* Ekam 1 Input */}
                        <td className="py-1.5 px-1.5 text-center bg-amber-50/20 dark:bg-amber-950/10">
                          <input
                            type="text"
                            value={row.ekam1}
                            onChange={(e) => handleCellChange(st.id, 'ekam1', e.target.value)}
                            placeholder="0-25"
                            className="w-14 py-1 px-1.5 rounded-lg text-center text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#C45A2D]"
                          />
                        </td>

                        {/* Ekam 2 Input */}
                        <td className="py-1.5 px-1.5 text-center bg-amber-50/20 dark:bg-amber-950/10">
                          <input
                            type="text"
                            value={row.ekam2}
                            onChange={(e) => handleCellChange(st.id, 'ekam2', e.target.value)}
                            placeholder="0-25"
                            className="w-14 py-1 px-1.5 rounded-lg text-center text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#C45A2D]"
                          />
                        </td>

                        {/* Practical Input if applicable */}
                        {activeSubject?.hasPractical && (
                          <td className="py-1.5 px-1.5 text-center bg-teal-50/20 dark:bg-teal-950/10">
                            <input
                              type="text"
                              value={row.practical}
                              onChange={(e) => handleCellChange(st.id, 'practical', e.target.value)}
                              placeholder="0-50"
                              className="w-16 py-1 px-1.5 rounded-lg text-center text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#C45A2D]"
                            />
                          </td>
                        )}

                        {/* Internal Input */}
                        <td className="py-1.5 px-1.5 text-center bg-purple-50/20 dark:bg-purple-950/10">
                          <input
                            type="text"
                            value={row.internal}
                            onChange={(e) => handleCellChange(st.id, 'internal', e.target.value)}
                            placeholder="0-20"
                            className="w-14 py-1 px-1.5 rounded-lg text-center text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#C45A2D]"
                          />
                        </td>

                        {/* Annual Exam Input for Std 9 & 11 */}
                        {(currentStdInfo.baseStd === '9' || currentStdInfo.baseStd === '11') && (
                          <td className="py-1.5 px-1.5 text-center bg-emerald-50/20 dark:bg-emerald-950/10">
                            <input
                              type="text"
                              value={row.varshik}
                              onChange={(e) => handleCellChange(st.id, 'varshik', e.target.value)}
                              placeholder="0-80"
                              className="w-16 py-1 px-1.5 rounded-lg text-center text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#C45A2D]"
                            />
                          </td>
                        )}

                        {/* Converted Total 100 */}
                        <td className="py-2 px-3 text-center font-black text-sm text-slate-900 dark:text-white bg-slate-200/50 dark:bg-slate-800/50">
                          {row.total100}
                        </td>

                        {/* Grade */}
                        <td className="py-2 px-2 text-center font-bold text-xs">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              row.grade.startsWith('A')
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : row.grade.startsWith('B')
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                : row.grade.startsWith('C') || row.grade === 'D'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-red-300'
                            }`}
                          >
                            {row.grade}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3 text-center font-sans">
                          {row.status === 'PASS' ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">ઉત્તીર્ણ</span>
                          ) : row.status === 'GRACE' ? (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400" title="સિદ્ધિ/કૃપા ગુણ પાત્ર">ગ્રેસ પાત્ર</span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">પુનઃપરીક્ષા</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: GAZETTE (Class Master Marksheet Matrix) */}
      {viewMode === 'gazette' && (
        <div className="glass-card rounded-2xl border border-[#E2E8F0] dark:border-white/10 overflow-hidden shadow-2xl">
          {/* Table Search & Filter Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-b border-[#E2E8F0] dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="નામ, રોલ નંબર અથવા G.R. નંબરથી શોધો..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#C45A2D] dark:focus:border-[#f59c73]"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <span className="text-slate-600 dark:text-slate-400 mr-1 text-[11px]">સ્થિતિ:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'btn-terracotta text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-[#E2E8F0] dark:border-transparent'
                }`}
              >
                બધા ({classResults.length})
              </button>
              <button
                onClick={() => setStatusFilter('PASS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'PASS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent'
                }`}
              >
                સીધા પાસ ({stats.directPassCount})
              </button>
              <button
                onClick={() => setStatusFilter('PASS_WITH_SIDDHI')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'PASS_WITH_SIDDHI'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent'
                }`}
              >
                સિદ્ધિ (#) ({stats.siddhiCount})
              </button>
              <button
                onClick={() => setStatusFilter('PASS_WITH_KRUPA')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'PASS_WITH_KRUPA'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent'
                }`}
              >
                કૃપા (*) ({stats.krupaCount})
              </button>
              <button
                onClick={() => setStatusFilter('FAIL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'FAIL'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-transparent'
                }`}
              >
                સુધારણા ({stats.failCount})
              </button>
            </div>
          </div>

          {/* Master Table */}
          <div className="overflow-x-auto mobile-table-scroll max-h-[620px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-[#a99f91] sticky top-0 z-10 shadow-xs border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 text-center w-12 font-bold">રોલ</th>
                  <th className="py-3 px-3 w-24 font-bold">G.R. નં</th>
                  <th className="py-3 px-4 min-w-[160px] font-bold text-slate-900 dark:text-white">વિદ્યાર્થીનું નામ</th>
                  {subjects.map((sub) => (
                    <th key={sub.id} className="py-3 px-3 text-center min-w-[75px] font-bold">
                      <div className="text-slate-900 dark:text-white">{sub.nameGu.split(' ')[0]}</div>
                      <div className="text-[10px] text-slate-500 font-normal">(૧૦૦ ગુણ)</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-24 font-bold">કુલ ગુણ</th>
                  <th className="py-3 px-3 text-center w-16 font-bold">ટકા</th>
                  <th className="py-3 px-3 text-center w-16 font-bold">ગ્રેડ</th>
                  <th className="py-3 px-3 text-center w-32 font-bold">પરિણામ</th>
                  <th className="py-3 px-3 text-center w-16 font-bold">ક્રમ</th>
                  <th className="py-3 px-3 text-center w-16 font-bold">ક્રિયા</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={subjects.length + 7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      કોઈ વિદ્યાર્થી મળ્યા નથી.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((r, idx) => (
                    <tr key={r.student.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white">
                        {r.student.rollNumber || idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#9d512d] dark:text-[#f59c73]">
                        {r.student.grNumber || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                        {r.student.studentName}
                      </td>
                      {r.subjectScores.map((sc) => (
                        <td key={sc.subjectId} className="py-2 px-3 text-center">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {sc.siddhiMarksGiven > 0 && sc.krupaMarksGiven > 0 ? (
                              <span>
                                {sc.total100}
                                <span className="text-teal-600 dark:text-teal-400 text-xs">+{sc.siddhiMarksGiven}#</span>
                                <span className="text-amber-600 dark:text-amber-400 text-xs">+{sc.krupaMarksGiven}*</span>
                              </span>
                            ) : sc.siddhiMarksGiven > 0 ? (
                              <span>
                                {sc.total100}
                                <span className="text-teal-600 dark:text-teal-400 text-xs">+{sc.siddhiMarksGiven}#</span>
                              </span>
                            ) : sc.krupaMarksGiven > 0 ? (
                              <span>
                                {sc.total100}
                                <span className="text-amber-600 dark:text-amber-400 text-xs">+{sc.krupaMarksGiven}*</span>
                              </span>
                            ) : (
                              <span className={sc.needsReExam ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                                {sc.total100}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500">
                            {sc.grade}
                          </div>
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-center font-black text-slate-900 dark:text-white">
                        {r.totalObtained}/{r.totalMax}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-[#9d512d] dark:text-[#f59c73]">
                        {r.percentage}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                          {r.overallGrade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold">
                        {r.resultStatus === 'PASS' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                            ઉત્તીર્ણ
                          </span>
                        ) : r.resultStatus === 'PASS_WITH_SIDDHI' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30">
                            સિદ્ધિ ({r.totalSiddhiGiven}#)
                          </span>
                        ) : r.resultStatus === 'PASS_WITH_KRUPA' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">
                            કૃપા ({r.totalKrupaGiven}*)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30">
                            સુધારણા ({r.failedSubjectsCount})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {r.rankInClass ? `#${r.rankInClass}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedStudentId(r.student.id);
                            setViewMode('progress_card');
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title="પ્રગતિ પત્રક જુઓ"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: INDIVIDUAL STUDENT PROGRESS CARD */}
      {viewMode === 'progress_card' && activeStudentResult && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl border border-[#E2E8F0] dark:border-white/10 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-[#a99f91]">વિદ્યાર્થી પસંદ કરો:</span>
              <select
                value={activeStudentResult.student.id}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#C45A2D]"
              >
                {classResults.map((r) => (
                  <option key={r.student.id} value={r.student.id}>
                    Roll {r.student.rollNumber || '-'} • {r.student.studentName} ({r.percentage}%)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handlePrintStudentCard(activeStudentResult)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-terracotta text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>પ્રગતિ પત્રક પ્રિન્ટ (A4)</span>
            </button>
          </div>

          {/* Printable Card Preview Frame */}
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-300 shadow-xl max-w-4xl mx-auto">
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900">{school.schoolName}</h2>
              <p className="text-xs text-slate-600 mt-1">
                {school.village ? school.village + ', ' : ''}{school.taluka ? school.taluka + ', ' : ''}{school.district} • DISE કોડ: <strong>{school.diseCode}</strong>
              </p>
              <span className="inline-block mt-3 px-4 py-1 rounded bg-slate-900 text-white text-xs font-black tracking-wide">
                વાર્ષિક પ્રગતિ પત્રક • ધોરણ {selectedStandard} • વર્ષ ૨૦૨૬–૨૭
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6 font-medium">
              <div>
                <span className="text-slate-500 block text-[10px]">વિદ્યાર્થીનું નામ:</span>
                <span className="font-bold text-slate-900 text-sm">{activeStudentResult.student.studentName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">G.R. નંબર:</span>
                <span className="font-bold text-slate-900">{activeStudentResult.student.grNumber || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">રોલ નંબર:</span>
                <span className="font-bold text-slate-900">{activeStudentResult.student.rollNumber || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ધોરણ & વર્ગ:</span>
                <span className="font-bold text-slate-900">{selectedStandard} ({activeStudentResult.student.section || 'A'})</span>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse border border-slate-300 mb-6">
              <thead className="bg-slate-100 text-slate-800 text-center font-bold">
                <tr>
                  <th className="border border-slate-300 py-2 px-2 w-10">ક્રમ</th>
                  <th className="border border-slate-300 py-2 px-3 text-left">વિષય</th>
                  <th className="border border-slate-300 py-2 px-2">પ્રથમ (૫૦)</th>
                  <th className="border border-slate-300 py-2 px-2">દ્વિતીય (૫૦)</th>
                  <th className="border border-slate-300 py-2 px-2">વાર્ષિક (૮૦)</th>
                  <th className="border border-slate-300 py-2 px-2">આંતરિક (૨૦)</th>
                  <th className="border border-slate-300 py-2 px-3">કુલ (૧૦૦)</th>
                  <th className="border border-slate-300 py-2 px-2">ગ્રેડ</th>
                </tr>
              </thead>
              <tbody>
                {activeStudentResult.subjectScores.map((sc, idx) => (
                  <tr key={sc.subjectId} className="text-center hover:bg-slate-50">
                    <td className="border border-slate-300 py-2 px-2">{idx + 1}</td>
                    <td className="border border-slate-300 py-2 px-3 text-left font-bold">{sc.subjectNameGu}</td>
                    <td className="border border-slate-300 py-2 px-2">{sc.prathamRaw !== null ? sc.prathamRaw : '-'}</td>
                    <td className="border border-slate-300 py-2 px-2">{sc.dwitiyaRaw !== null ? sc.dwitiyaRaw : '-'}</td>
                    <td className="border border-slate-300 py-2 px-2">{sc.varshikRaw !== null ? sc.varshikRaw : '-'}</td>
                    <td className="border border-slate-300 py-2 px-2">{sc.internalRaw !== null ? sc.internalRaw : '-'}</td>
                    <td className="border border-slate-300 py-2 px-3 font-black text-sm">
                      {formatSubjectScoreDisplay(sc)}
                    </td>
                    <td className="border border-slate-300 py-2 px-2 font-bold">{sc.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-100 border border-slate-300 text-center mb-8">
              <div>
                <div className="text-[10px] text-slate-500 font-bold">કુલ ગુણ</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{activeStudentResult.totalObtained} / {activeStudentResult.totalMax}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold">ટકાવારી</div>
                <div className="text-lg font-black text-[#9d512d] mt-0.5">{activeStudentResult.percentage}%</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold">એકંદર ગ્રેડ</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{activeStudentResult.overallGrade}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold">સ્થિતિ</div>
                <div className="text-xs font-black text-emerald-700 mt-1">{activeStudentResult.resultStatusGu}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold">વર્ગમાં ક્રમ</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{activeStudentResult.rankInClass ? `#${activeStudentResult.rankInClass}` : '-'}</div>
              </div>
            </div>

            <div className="pt-8 flex justify-between items-center text-xs font-bold text-slate-800 px-6">
              <div className="border-t-2 border-dashed border-slate-700 pt-1.5 w-36 text-center">
                વર્ગ શિક્ષકની સહી
              </div>
              <div className="border-t-2 border-dashed border-slate-700 pt-1.5 w-36 text-center">
                પરીક્ષા પ્રમુખશ્રી
              </div>
              <div className="border-t-2 border-dashed border-slate-700 pt-1.5 w-44 text-center">
                આચાર્યશ્રીની સહી / સિક્કો
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules & What to Provide Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/20 rounded-3xl max-w-3xl w-full p-6 text-slate-800 dark:text-white space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">ધોરણ ૯ થી ૧૨ પરિણામ ફોર્મ્યુલા & એક્સેલ માર્ગદર્શન</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">GSEB સત્તાવાર નિયમો અને તમારી એક્સેલ ફાઈલ સેટિંગ્સ</p>
                </div>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300 max-h-[500px] overflow-y-auto pr-2">
              {/* Highlighted section answering what to provide */}
              <div className="bg-[#FBE9DF] dark:bg-[#9d512d]/20 p-4 rounded-2xl border border-[#C45A2D]/40 text-slate-900 dark:text-white">
                <h4 className="font-extrabold text-[#C45A2D] dark:text-[#f59c73] text-sm mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  તમારે આ માટે શું આપવું/પૂરૂ પાડવું જોઈએ? (What should you provide?)
                </h4>
                <p className="mb-2.5 leading-normal">
                  અમારી સિસ્ટમમાં ધોરણ ૯, ૧૦, ૧૧ (સામાન્ય/વિજ્ઞાન) અને ૧૨ (સામાન્ય/વિજ્ઞાન) ના તમામ ગુજરાત બોર્ડ ફોર્મ્યુલા તૈયાર છે. તમારી શાળાની ચોક્કસ જરૂરિયાત મુજબ નીચેની વિગતો શેર કરી શકો છો:
                </p>
                <div className="space-y-2">
                  <div className="p-2.5 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/10">
                    <strong>૧. તમારી એક્સેલ ફાઈલ (.xlsx અથવા સ્ક્રીનશોટ):</strong>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      તમે હાલમાં જે એક્સેલ શીટ વાપરો છો તેની કોપી અથવા કૉલમના નામો (દા.ત. Roll, Name, Pratham, Dwitiya, Ekam 1, Ekam 2, Internal, Annual).
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/10">
                    <strong>૨. ગુણભાર અને ગણતરી પદ્ધતિ (Weightage Formula):</strong>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      જો તમારી શાળામાં ૧૦% + ૧૦% + ૬૦% + ૨૦% થી અલગ ટકાવારી કે એકમ કસોટીની એવરેજ ગણવામાં આવતી હોય તો તે ફોર્મ્યુલા.
                    </p>
                  </div>
                  <div className="p-2.5 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/10">
                    <strong>૩. ધોરણ ૧૧ & ૧૨ ના વિષયો (Subjects & Streams):</strong>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      તમારી શાળામાં કોમર્સ, આર્ટ્સ કે સાયન્સમાં જે વૈકલ્પિક વિષયો (દા.ત. કમ્પ્યુટર, એસ.પી., મનોવિજ્ઞાન) ચાલતા હોય તેની યાદી.
                    </p>
                  </div>
                </div>
              </div>

              {/* Standard-wise formula breakdown */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-[#9d512d] dark:text-[#f59c73] text-sm mb-1.5">ધોરણ ૯ અને ૧૧ (સામાન્ય પ્રવાહ) ફોર્મ્યુલા</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  <li><strong>પ્રથમ પરીક્ષા (૫૦ ગુણ):</strong> ૧૦% ગુણભાર (ગુણ / ૫)</li>
                  <li><strong>દ્વિતીય પરીક્ષા (૫૦ ગુણ):</strong> ૧૦% ગુણભાર (ગુણ / ૫)</li>
                  <li><strong>વાર્ષિક પરીક્ષા (૮૦ ગુણ):</strong> ૬૦% ગુણભાર (ગુણ / ૮૦ × ૬૦)</li>
                  <li><strong>આંતરિક મૂલ્યાંકન (૨૦ ગુણ):</strong> ૨૦% ગુણભાર (એકમ કસોટી ૧ & ૨ અથવા સીધા ગુણ)</li>
                  <li><strong>વાર્ષિક કુલ:</strong> ૧૦ + ૧૦ + ૬૦ + ૨૦ = ૧૦૦ ગુણ</li>
                </ul>
              </div>

              <div className="bg-teal-50 dark:bg-teal-950/40 p-3.5 rounded-xl border border-teal-200 dark:border-teal-500/30">
                <h4 className="font-bold text-teal-800 dark:text-teal-300 text-sm mb-1.5">ધોરણ ૧૧ અને ૧૨ (વિજ્ઞાન પ્રવાહ) ફોર્મ્યુલા</h4>
                <ul className="list-disc list-inside space-y-1 text-teal-900 dark:text-teal-100">
                  <li>ભૌતિકવિજ્ઞાન, રસાયણવિજ્ઞાન, જીવવિજ્ઞાનમાં <strong>૫૦ ગુણ થિયરી + ૫૦ ગુણ પ્રાયોગિક (Practical)</strong>.</li>
                  <li>પ્રાયોગિક ગુણ વાર્ષિક પરિણામમાં ૨૦% થી ૨૫% ગુણભાર તરીકે ગણાય છે.</li>
                </ul>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/30">
                <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1.5">સિદ્ધિ (#) અને કૃપા (*) ગુણ</h4>
                <ul className="list-disc list-inside space-y-1 text-amber-900 dark:text-amber-100">
                  <li><strong>સિદ્ધિ ગુણ (#):</strong> ૩૩% થી ઉપરના દરેક ટકા દીઠ ૧ ગુણ (મહત્તમ ૧૫ ગુણ). રેન્ક માટે પાત્ર.</li>
                  <li><strong>કૃપા ગુણ (*):</strong> આચાર્યશ્રી દ્વારા કુલ ૧૦ ગુણ સુધી. રેન્ક માટે અપાત્ર.</li>
                  <li><strong>૨૫% શરત:</strong> જે વિષયમાં ઓછામાં ઓછા ૨૫ ગુણ હોય તેમાં જ સિદ્ધિ કે કૃપા ગુણ આપી શકાય.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-5 py-2 rounded-xl btn-terracotta text-white text-xs font-bold transition-all cursor-pointer"
              >
                સમજાયું (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Exam Result to Parents Modal */}
      {sendResultModalOpen && (
        <SendExamResultModal
          isOpen={sendResultModalOpen}
          onClose={() => setSendResultModalOpen(false)}
          school={school}
          students={students}
          marks={marks}
          initialStandard={currentStdInfo.baseStd}
        />
      )}
    </div>
  );
};
