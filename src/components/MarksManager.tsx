import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { School, Student, MarkRecord, AllowedStandard } from '../types';
import {
  EKAM_KASOTI_SUBJECTS,
  getSubjectsForStandard,
  SubjectConfig,
  QuestionConfig,
  ACADEMIC_YEAR,
  EXAM_NAME,
  EXAM_TITLE_GUJARATI,
} from '../data/ekamKasotiConfig';
import { saveBatchEkamKasotiMarks, saveSingleStudentMark } from '../services/firestoreService';
import {
  subscribeToCustomSubjects,
  mergeInstalledAndCustomSubjects,
  CustomSubjectRecord,
} from '../services/subjectService';
import { exportEkamKasotiExcel, printEkamKasotiA4, StudentMarkEntry } from '../utils/ekamKasotiExport';
import { TermExamMarksManager } from './TermExamMarksManager';
import {
  Award,
  Save,
  Printer,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  FileText,
  Filter,
  Check,
  Download,
  Info,
  ChevronRight,
  BookOpen,
  Loader2,
  Users,
} from 'lucide-react';

interface MarksManagerProps {
  school: School;
  students: Student[];
  marks: MarkRecord[];
  onRefresh: () => void;
  defaultSystem?: 'term_exams' | 'ekam_kasoti';
}

// Helper to resolve current or legacy sub-question marks seamlessly
function getLegacyOrCurrentMark(
  questionMarks: Record<string, number> | undefined,
  qId: string
): number | '' {
  if (!questionMarks) return '';
  if (questionMarks[qId] !== undefined) return questionMarks[qId];

  // Science / Gujarati / Social Science fallback aggregations
  if (qId === 'secA') {
    if (questionMarks['secA_q1a'] !== undefined || questionMarks['secA_q1b'] !== undefined) {
      return (questionMarks['secA_q1a'] || 0) + (questionMarks['secA_q1b'] || 0);
    }
    const legacyA = [
      questionMarks['secA_matching'],
      questionMarks['secA_blanks'],
      questionMarks['secA_one_sentence'],
      questionMarks['secA_two_words'],
      questionMarks['secA_true_false'],
    ].filter((v) => v !== undefined);
    if (legacyA.length > 0) {
      return legacyA.reduce((sum, v) => sum + (v || 0), 0);
    }
  }

  if (qId === 'secB') {
    if (questionMarks['secB_q2a'] !== undefined || questionMarks['secB_q2b'] !== undefined) {
      return (questionMarks['secB_q2a'] || 0) + (questionMarks['secB_q2b'] || 0);
    }
    const legacyB = [questionMarks['secB_short'], questionMarks['secB_detailed']].filter(
      (v) => v !== undefined
    );
    if (legacyB.length > 0) {
      return legacyB.reduce((sum, v) => sum + (v || 0), 0);
    }
  }

  if (qId === 'secC') {
    if (questionMarks['secC_q3a'] !== undefined || questionMarks['secC_q3b'] !== undefined) {
      return (questionMarks['secC_q3a'] || 0) + (questionMarks['secC_q3b'] || 0);
    }
    const legacyC = [
      questionMarks['secC_3_1'],
      questionMarks['secC_3_2'],
      questionMarks['secC_3_3'],
      questionMarks['secC_3_4'],
      questionMarks['secC_3_5'],
      questionMarks['secC_3_6'],
      questionMarks['secC_3_7'],
    ].filter((v) => v !== undefined);
    if (legacyC.length > 0) {
      return legacyC.reduce((sum, v) => sum + (v || 0), 0);
    }
  }

  if (qId === 'secD') {
    if (questionMarks['secD_q4a'] !== undefined || questionMarks['secD_q4b'] !== undefined) {
      return (questionMarks['secD_q4a'] || 0) + (questionMarks['secD_q4b'] || 0);
    }
    if (questionMarks['secD_writing'] !== undefined) {
      return questionMarks['secD_writing'];
    }
  }

  return '';
}

export const MarksManager: React.FC<MarksManagerProps> = ({
  school,
  students,
  marks,
  onRefresh,
  defaultSystem = 'ekam_kasoti',
}) => {
  // Navigation & Selection state - strictly supports Standard 9, 10, 11, 12
  const [selectedStandard, setSelectedStandard] = useState<AllowedStandard>('9');
  const [examSystem, setExamSystem] = useState<'term_exams' | 'ekam_kasoti'>(defaultSystem);
  
  // Custom subjects added by school
  const [customSubjects, setCustomSubjects] = useState<CustomSubjectRecord[]>([]);

  // Subscribe to custom subjects for this school and active standard
  useEffect(() => {
    if (!school?.id) return;
    const unsubscribe = subscribeToCustomSubjects(school.id, selectedStandard, (list) => {
      setCustomSubjects(list);
    });
    return () => unsubscribe();
  }, [school?.id, selectedStandard]);

  // Combined subjects for the active standard (official GSEB + school custom)
  const availableSubjects = useMemo(() => {
    return mergeInstalledAndCustomSubjects(selectedStandard, customSubjects);
  }, [selectedStandard, customSubjects]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(availableSubjects[0]?.id || '');

  // Keep subjectId in sync when standard changes
  useEffect(() => {
    if (availableSubjects.length > 0) {
      const exists = availableSubjects.some((s) => s.id === selectedSubjectId);
      if (!exists) {
        setSelectedSubjectId(availableSubjects[0].id);
      }
    }
  }, [availableSubjects, selectedSubjectId]);

  // Current active subject configuration
  const currentSubject: SubjectConfig | undefined = useMemo(() => {
    return availableSubjects.find((s) => s.id === selectedSubjectId) || availableSubjects[0];
  }, [availableSubjects, selectedSubjectId]);

  // Effective total max marks for this subject
  const currentTotalMaxMarks = useMemo(() => {
    if (!currentSubject) return 25;
    if (typeof currentSubject.totalMarks === 'number' && currentSubject.totalMarks > 0) {
      return currentSubject.totalMarks;
    }
    let sum = 0;
    let hasKnown = false;
    currentSubject.questions.forEach((q) => {
      if (typeof q.maxMarks === 'number' && q.maxMarks > 0) {
        sum += q.maxMarks;
        hasKnown = true;
      }
    });
    return hasKnown && sum > 0 ? sum : 25;
  }, [currentSubject]);

  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Marks state: mapping [studentId] -> [questionId] -> number | ''
  const [marksData, setMarksData] = useState<Record<string, Record<string, number | ''>>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [studentSaveStates, setStudentSaveStates] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Auto-save refs to manage debouncing and active typing safely
  const debounceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const activeEditingStudentsRef = useRef<Set<string>>(new Set());
  const marksDataRef = useRef<Record<string, Record<string, number | ''>>>(marksData);
  marksDataRef.current = marksData;
  const prevSelectionKeyRef = useRef<string>('');

  // Clear debounce timers on unmount
  useEffect(() => {
    return () => {
      const timers = debounceTimersRef.current;
      for (const key in timers) {
        if (Object.prototype.hasOwnProperty.call(timers, key)) {
          clearTimeout(timers[key]);
        }
      }
    };
  }, []);

  // A4 Printable Preview Modal
  const [showA4Preview, setShowA4Preview] = useState(false);

  // Filter and sort students belonging to the selected Standard strictly by name
  const standardStudents = useMemo(() => {
    return students
      .filter((s) => String(s.standard) === String(selectedStandard))
      .filter((s) => {
        if (!searchQuery.trim()) return true;
        return s.studentName.toLowerCase().includes(searchQuery.trim().toLowerCase());
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [students, selectedStandard, searchQuery]);

  const currentSelectionKey = `${selectedStandard}_${selectedSubjectId}`;

  // Initialize or reload marks when standard, subject, or marks prop changes
  useEffect(() => {
    if (!currentSubject) return;

    const selectionChanged = prevSelectionKeyRef.current !== currentSelectionKey;

    if (selectionChanged) {
      prevSelectionKeyRef.current = currentSelectionKey;
      const initialData: Record<string, Record<string, number | ''>> = {};

      standardStudents.forEach((student) => {
        // Find existing mark record for this student and subject
        const existing = marks.find(
          (m) =>
            m.studentId === student.id &&
            (m.subjectId === currentSubject.id || m.subjectName === currentSubject.name) &&
            (m.examType === EXAM_NAME || m.examType?.includes('એકમ કસોટી'))
        );

        const qMap: Record<string, number | ''> = {};
        currentSubject.questions.forEach((q) => {
          qMap[q.id] = getLegacyOrCurrentMark(existing?.questionMarks, q.id);
        });

        initialData[student.id] = qMap;
      });

      setMarksData(initialData);
      setHasUnsavedChanges(false);
      setSaveFeedback(null);
      setAutoSaveStatus('idle');
      return;
    }

    // When marks prop updates from parent, merge data for students not actively being edited
    setMarksData((prev) => {
      const updated = { ...prev };
      standardStudents.forEach((student) => {
        if (activeEditingStudentsRef.current.has(student.id)) {
          return;
        }
        const existing = marks.find(
          (m) =>
            m.studentId === student.id &&
            (m.subjectId === currentSubject.id || m.subjectName === currentSubject.name) &&
            (m.examType === EXAM_NAME || m.examType?.includes('એકમ કસોટી'))
        );
        if (existing?.questionMarks) {
          const qMap: Record<string, number | ''> = { ...(updated[student.id] || {}) };
          currentSubject.questions.forEach((q) => {
            const resolved = getLegacyOrCurrentMark(existing.questionMarks, q.id);
            if (resolved !== '') {
              qMap[q.id] = resolved;
            }
          });
          updated[student.id] = qMap;
        }
      });
      return updated;
    });
  }, [selectedStandard, selectedSubjectId, currentSubject, marks, standardStudents, currentSelectionKey]);

  // Perform single student auto-save directly to Firestore
  const performAutoSave = useCallback(
    async (studentId: string, studentMarksMap: Record<string, number | ''>) => {
      if (!currentSubject) return;
      const student = students.find((s) => s.id === studentId);
      if (!student) return;

      try {
        setAutoSaveStatus('saving');
        setStudentSaveStates((prev) => ({ ...prev, [studentId]: 'saving' }));

        const qMarks: Record<string, number> = {};
        let totalObtained = 0;
        currentSubject.questions.forEach((q) => {
          const val = studentMarksMap ? studentMarksMap[q.id] : undefined;
          const num = typeof val === 'number' ? val : 0;
          qMarks[q.id] = num;
          if (typeof val === 'number') {
            totalObtained += val;
          }
        });

        await saveSingleStudentMark(school.id, {
          studentId: student.id,
          studentName: student.studentName,
          standard: String(selectedStandard),
          examType: EXAM_NAME,
          academicYear: ACADEMIC_YEAR,
          subjectId: currentSubject.id,
          subjectName: currentSubject.name,
          questionMarks: qMarks,
          totalObtained,
          totalMax: currentTotalMaxMarks,
          percentage: Number(((totalObtained / currentTotalMaxMarks) * 100).toFixed(1)),
        });

        setStudentSaveStates((prev) => ({ ...prev, [studentId]: 'saved' }));
        setAutoSaveStatus('saved');
        setHasUnsavedChanges(false);
        const timeStr = new Date().toLocaleTimeString('gu-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSavedTime(timeStr);
      } catch (err: any) {
        console.error('Auto-save error:', err);
        setAutoSaveStatus('error');
        setStudentSaveStates((prev) => ({ ...prev, [studentId]: 'error' }));
      } finally {
        setTimeout(() => {
          activeEditingStudentsRef.current.delete(studentId);
        }, 1200);
      }
    },
    [currentSubject, students, school.id, selectedStandard, currentTotalMaxMarks]
  );

  // Handle score change for a specific question with automatic debounced save
  const handleMarkChange = (studentId: string, question: QuestionConfig, rawValue: string) => {
    setSaveFeedback(null);

    let newVal: number | '' = '';
    if (rawValue.trim() !== '') {
      const num = Number(rawValue);
      if (isNaN(num)) return;
      newVal = Math.max(0, num);
      // If maximum marks are defined, validate upper bound.
      // If blank/null: DO NOT reject, DO NOT set to 0. Allow user to enter any valid score!
      if (typeof question.maxMarks === 'number' && question.maxMarks > 0) {
        if (newVal > question.maxMarks) {
          newVal = question.maxMarks;
        }
      }
    }

    const updatedStudentMarks = {
      ...(marksData[studentId] || {}),
      [question.id]: newVal,
    };

    setMarksData((prev) => ({
      ...prev,
      [studentId]: updatedStudentMarks,
    }));

    activeEditingStudentsRef.current.add(studentId);
    setAutoSaveStatus('saving');
    setStudentSaveStates((prev) => ({ ...prev, [studentId]: 'saving' }));

    // Debounce save to Firestore by 400ms as user types
    if (debounceTimersRef.current[studentId]) {
      clearTimeout(debounceTimersRef.current[studentId]);
    }

    debounceTimersRef.current[studentId] = setTimeout(() => {
      delete debounceTimersRef.current[studentId];
      performAutoSave(studentId, updatedStudentMarks);
    }, 400);
  };

  // Immediate save on blur if debounce timer is still pending
  const handleInputBlur = (studentId: string) => {
    if (debounceTimersRef.current[studentId]) {
      clearTimeout(debounceTimersRef.current[studentId]);
      delete debounceTimersRef.current[studentId];
      const studentMarks = marksDataRef.current[studentId] || {};
      performAutoSave(studentId, studentMarks);
    }
  };

  // Calculate total obtained marks for a student
  const getStudentTotal = useCallback(
    (studentId: string): number => {
      if (!currentSubject) return 0;
      const sMarks = marksData[studentId] || {};
      let total = 0;
      currentSubject.questions.forEach((q) => {
        const val = sMarks[q.id];
        if (typeof val === 'number') {
          total += val;
        }
      });
      return total;
    },
    [currentSubject, marksData]
  );

  // Check if any mark in student entry exceeds question max
  const getStudentValidationStatus = useCallback(
    (studentId: string): { isComplete: boolean; isOverMax: boolean } => {
      if (!currentSubject) return { isComplete: false, isOverMax: false };
      const sMarks = marksData[studentId] || {};
      let allFilled = true;
      let overMax = false;

      currentSubject.questions.forEach((q) => {
        const val = sMarks[q.id];
        if (val === '' || val === undefined) {
          allFilled = false;
        } else if (
          typeof val === 'number' &&
          typeof q.maxMarks === 'number' &&
          q.maxMarks > 0 &&
          val > q.maxMarks
        ) {
          overMax = true;
        }
      });

      return { isComplete: allFilled, isOverMax: overMax };
    },
    [currentSubject, marksData]
  );

  // Save all marks for the current standard & subject to Firestore
  const handleSaveAll = async () => {
    if (!currentSubject) return;
    setIsSaving(true);
    setSaveFeedback(null);

    try {
      const recordsToSave = standardStudents.map((student) => {
        const sMarks = marksData[student.id] || {};
        const qMarks: Record<string, number> = {};

        currentSubject.questions.forEach((q) => {
          const val = sMarks[q.id];
          qMarks[q.id] = typeof val === 'number' ? val : 0;
        });

        const totalObtained = getStudentTotal(student.id);

        return {
          studentId: student.id,
          studentName: student.studentName,
          standard: String(selectedStandard),
          examType: EXAM_NAME,
          academicYear: ACADEMIC_YEAR,
          subjectId: currentSubject.id,
          subjectName: currentSubject.name,
          questionMarks: qMarks,
          totalObtained,
          totalMax: currentTotalMaxMarks,
          percentage: Number(((totalObtained / currentTotalMaxMarks) * 100).toFixed(1)),
        };
      });

      await saveBatchEkamKasotiMarks(school.id, recordsToSave);
      setHasUnsavedChanges(false);
      setSaveFeedback({
        type: 'success',
        message: `ધોરણ ${selectedStandard} ના ${currentSubject.gujaratiName} વિષયના તમામ ગુણ સફળતાપૂર્વક સાચવવામાં આવ્યા છે.`,
      });
      onRefresh();
    } catch (err: any) {
      setSaveFeedback({
        type: 'error',
        message: err.message || 'Error saving marks to Cloud Firestore.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Prepare entries list for Export & Print
  const exportEntries: StudentMarkEntry[] = useMemo(() => {
    return standardStudents.map((student) => {
      const sMarks = marksData[student.id] || {};
      const total = getStudentTotal(student.id);
      return {
        student,
        questionMarks: sMarks,
        totalObtained: total,
      };
    });
  }, [standardStudents, marksData, getStudentTotal]);

  const handleExportExcel = () => {
    if (!currentSubject) return;
    exportEkamKasotiExcel(school.schoolName, school.diseCode, currentSubject, exportEntries);
  };

  const handlePrintA4 = () => {
    if (!currentSubject) return;
    printEkamKasotiA4(school.schoolName, school.diseCode, school.district, currentSubject, exportEntries, school.logoUrl);
  };

  // Group questions by section if applicable (e.g. Science & Tech, Std 10 Gujarati)
  const groupedQuestions = useMemo(() => {
    if (!currentSubject) return [];
    const groups: { section: string; questions: QuestionConfig[] }[] = [];
    let currentGroup: { section: string; questions: QuestionConfig[] } | null = null;

    currentSubject.questions.forEach((q) => {
      const secName = q.section || '';
      if (!currentGroup || currentGroup.section !== secName) {
        currentGroup = { section: secName, questions: [q] };
        groups.push(currentGroup);
      } else {
        currentGroup.questions.push(q);
      }
    });

    return groups;
  }, [currentSubject]);

  return (
    <div className="space-y-6">
      {/* Top System Switcher: Term & Annual Exams vs Ekam Kasoti */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExamSystem('term_exams')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              examSystem === 'term_exams'
                ? 'bg-[#9d512d] text-white shadow-md shadow-[#9d512d]/30'
                : 'text-[#a99f91] hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>સત્રાંત અને વાર્ષિક પરીક્ષાઓ (Std 9, 10, 11 - સત્ર 1, 2, 3)</span>
          </button>
          <button
            type="button"
            onClick={() => setExamSystem('ekam_kasoti')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              examSystem === 'ekam_kasoti'
                ? 'bg-[#9d512d] text-white shadow-md shadow-[#9d512d]/30'
                : 'text-[#a99f91] hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>એકમ કસોટી (Unit Test - 25 ગુણ)</span>
          </button>
        </div>
      </div>

      {examSystem === 'term_exams' ? (
        <TermExamMarksManager
          school={school}
          students={students}
          marks={marks}
          onRefresh={onRefresh}
        />
      ) : (
        <>
          {/* Top Banner: Single Exam Focus (Ekam Kasoti - 1) */}
          <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wide">
                {EXAM_NAME}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/5 text-emerald-300 border border-emerald-500/30">
                શૈક્ષણિક વર્ષ: {ACADEMIC_YEAR}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/5 text-slate-300 border border-white/10">
                કુલ ગુણ: {currentTotalMaxMarks}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>મલ્ટિ-ડિવાઇસ લાઇવ સિંક</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {EXAM_TITLE_GUJARATI} – ગુણાંકન પત્રક
            </h2>
            <p className="text-xs text-slate-300">
              શાળા: <strong className="text-white">{school.schoolName}</strong> • DISE કોડ: <span className="font-mono text-emerald-400">{school.diseCode}</span> • {school.district}
            </p>
          </div>

          {/* Action buttons (Excel, Print A4, Preview) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-preview-a4"
              onClick={() => setShowA4Preview(true)}
              className="flex items-center gap-1.5 px-3 py-2 glass-card hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold transition-all touch-manipulation min-h-[42px]"
              title="View formatted A4 printable sheet"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              <span>A4 પૂર્વાવલોકન</span>
            </button>

            <button
              id="btn-print-a4"
              onClick={handlePrintA4}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all touch-manipulation min-h-[42px]"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>પ્રિન્ટ / PDF</span>
            </button>

            <button
              id="btn-export-excel"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 btn-terracotta text-white rounded-xl text-xs font-bold shadow-md transition-all touch-manipulation min-h-[42px]"
              title="Export marks table to Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 1: Standard Selection & Step 2: Subject Selection */}
      <div className="glass-panel rounded-3xl border border-white/10 p-4 sm:p-5 shadow-lg space-y-4">
        {/* Step 1: Standard Selector with Standard 12 */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#a99f91] mb-2">
            પગલું ૧: ધોરણ પસંદ કરો (Step 1: Select Standard)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {(['9', '10', '11', '12'] as const).map((std) => {
              const isSelected = selectedStandard === std;
              const count = students.filter((s) => String(s.standard) === std).length;
              return (
                <button
                  key={std}
                  id={`btn-select-std-${std}`}
                  type="button"
                  onClick={() => setSelectedStandard(std)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all touch-manipulation min-h-[60px] ${
                    isSelected
                      ? 'bg-[#9d512d] border-[#f59c73]/60 text-white shadow-lg ring-2 ring-[#9d512d]/40 font-extrabold'
                      : 'glass-card border-white/10 text-[#a99f91] hover:border-white/20 hover:text-[#e4ded6] font-semibold'
                  }`}
                >
                  <span className="text-base sm:text-lg">ધોરણ {std}</span>
                  <span className="text-[11px] opacity-80 font-normal">
                    {count} વિદ્યાર્થીઓ ({count} Enrolled)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Subject Selector for selected standard */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#a99f91]">
              પગલું ૨: વિષય પસંદ કરો (Step 2: Select Subject)
            </label>
            <span className="text-[11px] text-[#f59c73] font-medium">
              ધોરણ {selectedStandard} ના વિષયો ({availableSubjects.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {availableSubjects.map((subj) => {
              const isSelected = selectedSubjectId === subj.id;
              const isCustom = 'isCustom' in subj && (subj as any).isCustom;
              return (
                <button
                  key={subj.id}
                  id={`btn-select-subject-${subj.id}`}
                  type="button"
                  onClick={() => setSelectedSubjectId(subj.id)}
                  className={`flex items-start justify-between p-3 rounded-2xl border text-left transition-all touch-manipulation min-h-[58px] ${
                    isSelected
                      ? 'bg-[#202d38] border-[#9d512d] text-[#e4ded6] shadow-md ring-2 ring-[#9d512d]/50'
                      : 'glass-card border-white/10 text-[#a99f91] hover:border-white/20 hover:text-[#e4ded6]'
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5 text-[#e4ded6]">
                      {subj.gujaratiName}
                      {isCustom && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#9d512d]/20 text-[#f59c73] border border-[#9d512d]/40">
                          શાળા વિષય
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-normal text-[#a99f91]">({subj.englishName})</div>
                    <div className="text-[11px] text-[#f59c73] mt-0.5">
                      {subj.questions.length} વિભાગો • કુલ ગુણ {subj.totalMarks || 25}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subject Question Structure Overview */}
      {currentSubject && (
        <div className="glass-panel rounded-2xl border border-white/10 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                પ્રશ્ન રચના અને ગુણભાર: {currentSubject.name} (કુલ ગુણ {currentTotalMaxMarks})
              </h3>
            </div>
            <span className="text-xs glass-card border border-white/10 px-2.5 py-1 rounded-lg text-slate-300">
              ધોરણ {selectedStandard} - વિશિષ્ટ રચના
            </span>
          </div>

          {/* Render question chips */}
          <div className="flex flex-wrap gap-2">
            {currentSubject.questions.map((q) => (
              <div
                key={q.id}
                className="glass-card border border-white/10 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2"
              >
                <div className="font-semibold text-slate-200">
                  {q.section ? `${q.section.split(' ')[0]}: ` : ''}
                  {q.label}
                </div>
                {q.description && q.description !== q.label && (
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    ({q.description})
                  </span>
                )}
                <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                  {typeof q.maxMarks === 'number' ? `Max: ${q.maxMarks}` : 'નિયત નથી'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/90 p-3.5 rounded-xl border border-slate-700">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-search-marks-students"
              type="text"
              placeholder="વિદ્યાર્થીનું નામ શોધો (Search Student Name)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Auto-save status and student counts */}
        <div className="flex flex-wrap items-center gap-2.5 justify-end shrink-0">
          {/* Live Auto-Save Status Badge */}
          <div
            id="status-autosave-badge"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              autoSaveStatus === 'saving'
                ? 'bg-amber-950/70 border-amber-800/80 text-amber-300'
                : autoSaveStatus === 'saved'
                ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
                : autoSaveStatus === 'error'
                ? 'bg-red-950/70 border-red-800/80 text-red-300'
                : 'bg-slate-900/90 border-slate-700 text-slate-300'
            }`}
          >
            {autoSaveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                <span>સાચવી રહ્યું છે... (Saving)</span>
              </>
            ) : autoSaveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {lastSavedTime ? `આપોઆપ સાચવાઈ ગયું (${lastSavedTime})` : 'બધા ગુણ સાચવેલ છે (Auto-saved)'}
                </span>
              </>
            ) : autoSaveStatus === 'error' ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>ઓટો-સેવમાં ક્ષતિ આવી</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span>ઓટો-સેવ સક્રિય છે (Auto-save Active)</span>
              </>
            )}
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            વિદ્યાર્થીઓ: <strong className="text-white font-mono">{standardStudents.length}</strong>
          </span>

          <button
            id="btn-save-all-marks"
            type="button"
            disabled={isSaving || standardStudents.length === 0}
            onClick={handleSaveAll}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all touch-manipulation min-h-[38px] ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-500/50'
                : 'bg-slate-700/80 hover:bg-slate-700 text-slate-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="બધા વિદ્યાર્થીઓના ગુણ એકસાથે ક્લાઉડમાં સાચવો"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'સાચવી રહ્યાં છીએ...' : 'બધા સાચવો (Save All)'}</span>
          </button>
        </div>
      </div>

      {/* Save Feedback Banner */}
      {saveFeedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
              : 'bg-red-950/80 border border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {saveFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{saveFeedback.message}</span>
          </div>
          <button
            onClick={() => setSaveFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Marks Entry Grid (Desktop & Mobile Responsive) */}
      {currentSubject && (
        <div className="glass-panel rounded-3xl border border-white/10 shadow-xl overflow-hidden">
          {standardStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Info className="w-8 h-8 mx-auto text-slate-500 mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                ધોરણ {selectedStandard} માં કોઈ વિદ્યાર્થી નોંધાયેલ નથી.
              </p>
              <p className="text-xs text-slate-500">
                વિદ્યાર્થીઓ ટેબમાં જઈ વિદ્યાર્થીઓની નોંધણી કરો અથવા એક્સેલ (.xlsx) દ્વારા અપલોડ કરો.
              </p>
            </div>
          ) : (
            <div>
              {/* Mobile Horizontal Scroll Indicator */}
              <div className="sm:hidden px-3.5 py-2 bg-slate-950/90 text-[11px] text-[#f59c73] flex items-center justify-between border-b border-white/5">
                <span className="font-semibold">📱 મોબાઇલ ટિપ: પ્રશ્નો અને ગુણ ભરવા માટે ડાબે-જમણે સ્ક્રોલ કરો</span>
                <span className="text-[10px] text-slate-400 font-mono">↔️ Swipe</span>
              </div>
              <div className="overflow-x-auto mobile-table-scroll">
                <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-white/10 text-slate-400">
                    <th className="py-3.5 px-3 w-12 text-center font-bold">ક્રમ</th>
                    <th className="py-3.5 px-4 min-w-[200px] font-bold text-white">વિદ્યાર્થીનું નામ</th>
                    {/* Question Column Headers */}
                    {currentSubject.questions.map((q) => (
                      <th
                        key={q.id}
                        className="py-2.5 px-2 text-center min-w-[80px] font-bold text-slate-200 border-l border-white/5"
                      >
                        <div className="text-[11px] leading-tight text-emerald-400">{q.label}</div>
                        <div className="text-[9.5px] text-slate-400 font-normal">
                          {typeof q.maxMarks === 'number' ? `Max: ${q.maxMarks}` : 'નિયત નથી'}
                        </div>
                      </th>
                    ))}
                    <th className="py-3.5 px-4 w-28 text-center font-black text-white bg-slate-900/90 border-l border-white/10">
                      કુલ / {currentTotalMaxMarks}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {standardStudents.map((student, idx) => {
                    const studentMarks = marksData[student.id] || {};
                    const total = getStudentTotal(student.id);
                    const { isComplete } = getStudentValidationStatus(student.id);

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-white/5 transition-colors group"
                      >
                        {/* Serial Number */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-300">
                          {idx + 1}
                        </td>

                        {/* Student Name */}
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-white text-xs tracking-tight">
                            {student.studentName}
                          </div>
                        </td>

                        {/* Question Inputs */}
                        {currentSubject.questions.map((q) => {
                          const val = studentMarks[q.id];
                          const isFilled = val !== '' && val !== undefined;
                          const isInvalid =
                            typeof val === 'number' &&
                            typeof q.maxMarks === 'number' &&
                            q.maxMarks > 0 &&
                            val > q.maxMarks;

                          return (
                            <td
                              key={q.id}
                              className="py-1.5 px-1.5 text-center border-l border-white/5"
                            >
                              <div className="relative inline-block w-full max-w-[72px]">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min="0"
                                  max={typeof q.maxMarks === 'number' ? q.maxMarks : undefined}
                                  step="0.5"
                                  placeholder="0"
                                  value={val === undefined ? '' : val}
                                  onChange={(e) => handleMarkChange(student.id, q, e.target.value)}
                                  onBlur={() => handleInputBlur(student.id)}
                                  className={`w-full text-center py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all border outline-none touch-manipulation min-h-[40px] ${
                                    isInvalid
                                      ? 'bg-red-950/80 border-red-500 text-red-200'
                                      : isFilled
                                      ? 'bg-slate-900 border-emerald-500/50 text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                                      : 'bg-slate-900/60 border-white/10 text-slate-400 focus:border-emerald-500'
                                  }`}
                                />
                              </div>
                            </td>
                          );
                        })}

                        {/* Total Marks Column with Auto-Save Row Status */}
                        <td className="py-2.5 px-3 text-center border-l border-white/10 bg-slate-900/40">
                          <div className="flex items-center justify-center gap-1.5">
                            <div
                              className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-mono font-extrabold ${
                                total === currentTotalMaxMarks
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : total > 0
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : 'bg-white/5 text-slate-400 border border-white/10'
                              }`}
                            >
                              <span>{total}</span>
                              <span className="text-[10px] text-slate-400 ml-0.5">/ {currentTotalMaxMarks}</span>
                            </div>

                            {/* Live Per-Student Save Indicator */}
                            {studentSaveStates[student.id] === 'saving' && (
                              <span title="આપોઆપ ક્લાઉડમાં સાચવી રહ્યું છે..." className="text-amber-400 animate-spin shrink-0">
                                <Loader2 className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {studentSaveStates[student.id] === 'saved' && (
                              <span title="સાચવેલ છે" className="text-emerald-400 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {studentSaveStates[student.id] === 'error' && (
                              <span title="સાચવવામાં ક્ષતિ આવી" className="text-red-400 shrink-0">
                                <AlertCircle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
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

      {/* A4 Printable Document Preview Modal */}
      {showA4Preview && currentSubject && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
            {/* Modal Bar */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  A4 ગુણાંકન પત્રક પૂર્વાવલોકન (A4 Marks Sheet Preview)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-modal-print"
                  onClick={handlePrintA4}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>પ્રિન્ટ / PDF</span>
                </button>
                <button
                  onClick={() => setShowA4Preview(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Sheet Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 font-sans bg-slate-50">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-sm max-w-3xl mx-auto space-y-4">
                {/* Official Heading */}
                <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                  <div className="text-xs font-bold text-emerald-700">એકમ કસોટી ગુણપત્રક • Created by NR Chad</div>
                  <h1 className="text-lg sm:text-xl font-extrabold uppercase text-slate-900 tracking-wide">
                    {school.schoolName}
                  </h1>
                  <div className="text-sm font-bold text-slate-800">
                    {EXAM_TITLE_GUJARATI} — ધોરણ: {currentSubject.standard}
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    શૈક્ષણિક વર્ષ {ACADEMIC_YEAR}
                  </div>
                  <div className="text-xs font-bold text-emerald-800 bg-emerald-50 py-1 px-3 rounded inline-block mt-1">
                    ધોરણ: {currentSubject.standard} — {currentSubject.name} (કુલ ગુણ {currentTotalMaxMarks})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    DISE કોડ: {school.diseCode} • {school.district} જિલ્લો
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-slate-800 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 border-b border-slate-800">
                        <th className="border border-slate-800 p-2 text-center w-10">ક્રમ</th>
                        <th className="border border-slate-800 p-2 text-left">વિદ્યાર્થીનું નામ</th>
                        {currentSubject.questions.map((q) => (
                          <th key={q.id} className="border border-slate-800 p-1.5 text-center text-[10px]">
                            <div>{q.label}</div>
                            <div className="text-[9px] text-slate-600 font-normal">
                              ({typeof q.maxMarks === 'number' ? q.maxMarks : '-'})
                            </div>
                          </th>
                        ))}
                        <th className="border border-slate-800 p-2 text-center w-16 bg-slate-200 font-black">
                          કુલ ({currentTotalMaxMarks})
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {standardStudents.map((student, idx) => {
                        const sMarks = marksData[student.id] || {};
                        const total = getStudentTotal(student.id);

                        return (
                          <tr key={student.id} className="border-b border-slate-800">
                            <td className="border border-slate-800 p-1.5 text-center">{idx + 1}</td>
                            <td className="border border-slate-800 p-1.5 text-left font-semibold">
                              {student.studentName}
                            </td>
                            {currentSubject.questions.map((q) => {
                              const val = sMarks[q.id];
                              return (
                                <td key={q.id} className="border border-slate-800 p-1.5 text-center font-mono">
                                  {val === '' || val === undefined ? '0' : val}
                                </td>
                              );
                            })}
                            <td className="border border-slate-800 p-1.5 text-center font-black bg-slate-50">
                              {total}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Signatures */}
                <div className="pt-14 flex justify-between items-center text-xs font-bold text-slate-800 px-4">
                  <div className="border-t border-slate-800 pt-2 text-center w-40">
                    વર્ગ શિક્ષકની સહી
                  </div>
                  <div className="border-t border-slate-800 pt-2 text-center w-40">
                    તારીખ: {new Date().toLocaleDateString('gu-IN')}
                  </div>
                  <div className="border-t border-slate-800 pt-2 text-center w-48">
                    આચાર્યશ્રીની સહી તથા સિક્કો
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-200">
                  એકમ કસોટી ગુણપત્રક • Created by NR Chad
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
