import React, { useState, useEffect, useMemo } from 'react';
import { School, Student, MarkRecord, AllowedStandard } from '../types';
import {
  getExamsForStandard,
  getSubjectsForStandard,
  ExamDef,
  SubjectDef,
  calculateGsebGrade,
} from '../utils/resultFormulaUtils';
import { saveBatchExamMarks } from '../services/firestoreService';
import * as XLSX from 'xlsx';
import {
  Award,
  Save,
  Printer,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  BookOpen,
  Users,
  Check,
  Loader2,
  RefreshCw,
  Info,
} from 'lucide-react';

interface TermExamMarksManagerProps {
  school: School;
  students: Student[];
  marks: MarkRecord[];
  onRefresh: () => void;
  defaultStandard?: AllowedStandard;
}

export const TermExamMarksManager: React.FC<TermExamMarksManagerProps> = ({
  school,
  students,
  marks,
  onRefresh,
  defaultStandard = '9',
}) => {
  const [selectedStandard, setSelectedStandard] = useState<AllowedStandard>(defaultStandard);
  const [academicYear, setAcademicYear] = useState<string>('૨૦૨૬–૨૭');

  const availableExams = useMemo(() => getExamsForStandard(selectedStandard), [selectedStandard]);
  const [selectedExamId, setSelectedExamId] = useState<string>(availableExams[0]?.id || 'pratham');

  const availableSubjects = useMemo(() => getSubjectsForStandard(selectedStandard), [selectedStandard]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(availableSubjects[0]?.id || 'gujarati');

  // Update selected exam/subject when standard changes if needed
  useEffect(() => {
    const exams = getExamsForStandard(selectedStandard);
    if (!exams.some((e) => e.id === selectedExamId)) {
      setSelectedExamId(exams[0]?.id || 'pratham');
    }
    const subjs = getSubjectsForStandard(selectedStandard);
    if (!subjs.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(subjs[0]?.id || 'gujarati');
    }
  }, [selectedStandard]);

  const currentExam = useMemo(
    () => availableExams.find((e) => e.id === selectedExamId) || availableExams[0],
    [availableExams, selectedExamId]
  );

  const currentSubject = useMemo(
    () => availableSubjects.find((s) => s.id === selectedSubjectId) || availableSubjects[0],
    [availableSubjects, selectedSubjectId]
  );

  const maxMarks = currentExam?.maxMarks || 50;

  // Filter students for the selected standard and sort by Roll Number or Name
  const standardStudents = useMemo(() => {
    const normStd = String(selectedStandard).replace(/^class\s*/i, '').trim();
    const list = students.filter(
      (s) => String(s.standard).replace(/^class\s*/i, '').trim() === normStd
    );
    return list.sort((a, b) => {
      const rollA = parseInt(a.rollNumber || '0', 10);
      const rollB = parseInt(b.rollNumber || '0', 10);
      if (rollA && rollB && rollA !== rollB) return rollA - rollB;
      return (a.studentName || '').localeCompare(b.studentName || '', 'gu');
    });
  }, [students, selectedStandard]);

  // Local state for entered marks: studentId -> { marks: number | '', isAbsent: boolean }
  const [marksState, setMarksState] = useState<
    Record<string, { marks: number | ''; isAbsent: boolean }>
  >({});

  const [searchQuery, setSearchQuery] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Initialize marksState whenever exam, subject, standard, or marks list updates
  useEffect(() => {
    const state: Record<string, { marks: number | ''; isAbsent: boolean }> = {};

    standardStudents.forEach((student) => {
      // Find matching record
      const existing = marks.find((m) => {
        if (m.studentId !== student.id) return false;
        const normMStd = String(m.standard).replace(/^class\s*/i, '').trim();
        const normCurrStd = String(selectedStandard).replace(/^class\s*/i, '').trim();
        if (normMStd !== normCurrStd) return false;

        const exLower = (m.examType || '').toLowerCase();
        const matchesExam =
          (m as any).examId === currentExam.id ||
          exLower.includes(currentExam.id) ||
          exLower.includes(currentExam.nameGu.toLowerCase());

        const subLower = (m.subjectId || m.subjectName || '').toLowerCase();
        const matchesSubject =
          (m.subjectId && m.subjectId.toLowerCase() === currentSubject.id.toLowerCase()) ||
          subLower.includes(currentSubject.id.toLowerCase()) ||
          subLower.includes(currentSubject.nameGu.toLowerCase());

        return matchesExam && matchesSubject;
      });

      if (existing) {
        state[student.id] = {
          marks: existing.totalObtained !== undefined ? existing.totalObtained : '',
          isAbsent: existing.overallGrade === 'AB',
        };
      } else {
        state[student.id] = { marks: '', isAbsent: false };
      }
    });

    setMarksState(state);
    setSaveSuccessMessage(null);
    setImportMessage(null);
  }, [selectedStandard, selectedExamId, selectedSubjectId, marks, standardStudents]);

  // Handle Mark Change
  const handleMarkChange = (studentId: string, val: string) => {
    if (val === '') {
      setMarksState((prev) => ({
        ...prev,
        [studentId]: { ...prev[studentId], marks: '', isAbsent: false },
      }));
      return;
    }

    if (val.toUpperCase() === 'AB') {
      setMarksState((prev) => ({
        ...prev,
        [studentId]: { marks: 0, isAbsent: true },
      }));
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num)) return;

    // Cap at maxMarks
    const capped = Math.max(0, Math.min(maxMarks, num));
    setMarksState((prev) => ({
      ...prev,
      [studentId]: { marks: capped, isAbsent: false },
    }));
  };

  // Toggle Absent
  const toggleAbsent = (studentId: string) => {
    setMarksState((prev) => {
      const current = prev[studentId] || { marks: '', isAbsent: false };
      const nextAbsent = !current.isAbsent;
      return {
        ...prev,
        [studentId]: {
          marks: nextAbsent ? 0 : '',
          isAbsent: nextAbsent,
        },
      };
    });
  };

  // Save All Marks to Firestore
  const handleSaveAll = async () => {
    setSaveLoading(true);
    setSaveSuccessMessage(null);

    try {
      const recordsToSave = standardStudents.map((st) => {
        const entry = marksState[st.id] || { marks: '', isAbsent: false };
        const obtained = typeof entry.marks === 'number' ? entry.marks : 0;
        const isAbsent = entry.isAbsent;
        const pct = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0;
        const grade = isAbsent ? 'AB' : calculateGsebGrade(obtained, maxMarks);

        return {
          studentId: st.id,
          studentName: st.studentName,
          grNumber: st.grNumber,
          rollNumber: st.rollNumber,
          standard: String(selectedStandard),
          division: st.section || st.division,
          examId: currentExam.id,
          examType: currentExam.nameGu,
          academicYear,
          subjectId: currentSubject.id,
          subjectName: currentSubject.nameGu,
          totalObtained: obtained,
          totalMax: maxMarks,
          percentage: Math.round(pct * 10) / 10,
          overallGrade: grade,
        };
      });

      await saveBatchExamMarks(school.id, recordsToSave);
      setSaveSuccessMessage(
        `ધોરણ ${selectedStandard} • ${currentExam.nameGu} • ${currentSubject.nameGu} ના તમામ ${recordsToSave.length} વિદ્યાર્થીઓના ગુણ સફળતાપૂર્વક સાચવવામાં આવ્યા છે!`
      );
      onRefresh();
    } catch (err: any) {
      console.error('Error saving exam marks:', err);
      alert('ગુણ સાચવતી વખતે ભૂલ આવી: ' + (err.message || 'અજ્ઞાત ભૂલ'));
    } finally {
      setSaveLoading(false);
    }
  };

  // Download Excel Template for Entering Marks
  const handleDownloadExcelTemplate = () => {
    const rows = standardStudents.map((st, idx) => {
      const entry = marksState[st.id];
      return {
        'અનુક્રમ': idx + 1,
        'રોલ નંબર': st.rollNumber || '-',
        'G.R. નંબર': st.grNumber || '-',
        'વિદ્યાર્થીનું નામ (GR મુજબ)': st.studentName,
        'ધોરણ': selectedStandard,
        'વર્ગ': st.section || st.division || '-',
        'પરીક્ષાનું નામ': currentExam.nameGu,
        'વિષય': currentSubject.nameGu,
        'કુલ ગુણ': maxMarks,
        [`મેળવેલ ગુણ (0 થી ${maxMarks} અથવા AB)`]:
          entry && entry.marks !== '' ? (entry.isAbsent ? 'AB' : entry.marks) : '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${currentSubject.nameGu.slice(0, 20)}`);

    const fileName = `Std_${selectedStandard}_${currentExam.id}_${currentSubject.id}_Mark_Entry.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Import Marks from Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          alert('એક્સેલ શીટમાં કોઈ ડેટા મળ્યો નથી.');
          return;
        }

        let matchedCount = 0;
        const updated = { ...marksState };

        rows.forEach((row) => {
          const rowGr = String(row['G.R. નંબર'] || row['GR No'] || row['GR'] || '').trim();
          const rowRoll = String(row['રોલ નંબર'] || row['Roll No'] || row['Roll'] || '').trim();
          const rowName = String(
            row['વિદ્યાર્થીનું નામ (GR મુજબ)'] || row['વિદ્યાર્થીનું નામ'] || row['Name'] || ''
          ).trim();

          // Find student in standardStudents
          const found = standardStudents.find((s) => {
            if (rowGr && s.grNumber && s.grNumber.trim() === rowGr) return true;
            if (rowRoll && s.rollNumber && s.rollNumber.trim() === rowRoll) return true;
            if (rowName && s.studentName.trim().toLowerCase() === rowName.toLowerCase()) return true;
            return false;
          });

          if (found) {
            // Find mark column
            const markVal =
              row['મેળવેલ ગુણ (0 થી ' + maxMarks + ' અથવા AB)'] ??
              row['મેળવેલ ગુણ'] ??
              row['Marks Obtained'] ??
              row['Marks'];

            if (markVal !== undefined && markVal !== null && String(markVal).trim() !== '') {
              const strVal = String(markVal).trim();
              if (strVal.toUpperCase() === 'AB') {
                updated[found.id] = { marks: 0, isAbsent: true };
                matchedCount++;
              } else {
                const num = parseFloat(strVal);
                if (!isNaN(num)) {
                  updated[found.id] = {
                    marks: Math.max(0, Math.min(maxMarks, num)),
                    isAbsent: false,
                  };
                  matchedCount++;
                }
              }
            }
          }
        });

        setMarksState(updated);
        setImportMessage(
          `એક્સેલ ફાઇલમાંથી ${matchedCount} વિદ્યાર્થીઓના ગુણ સફળતાપૂર્વક લોડ થયા. સાચવવા માટે નીચે "બધા ગુણ સાચવો" બટન દબાવો.`
        );
      } catch (err: any) {
        console.error('Error parsing Excel marks:', err);
        alert('એક્સેલ વાંચવામાં ભૂલ: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Statistics for this exam & subject
  const markEntries = useMemo(() => {
    return Object.values(marksState) as { marks: number | ''; isAbsent: boolean }[];
  }, [marksState]);

  const enteredCount = useMemo(() => {
    return markEntries.filter((m) => m.marks !== '' || m.isAbsent).length;
  }, [markEntries]);

  const absentCount = useMemo(() => {
    return markEntries.filter((m) => m.isAbsent).length;
  }, [markEntries]);

  const averageMarks = useMemo(() => {
    const presentMarks = markEntries
      .filter((m) => typeof m.marks === 'number' && !m.isAbsent)
      .map((m) => m.marks as number);
    if (presentMarks.length === 0) return 0;
    const sum = presentMarks.reduce((a, b) => a + b, 0);
    return Math.round((sum / presentMarks.length) * 10) / 10;
  }, [markEntries]);

  // Filtered list by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return standardStudents;
    const q = searchQuery.toLowerCase().trim();
    return standardStudents.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        (s.rollNumber && s.rollNumber.includes(q)) ||
        (s.grNumber && s.grNumber.toLowerCase().includes(q))
    );
  }, [standardStudents, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Examination & Mark Entry */}
      <div className="glass-panel rounded-3xl border border-white/10 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#9d512d]/25 text-[#f59c73] border border-[#9d512d]/40 mb-2">
              <Award className="w-3.5 h-3.5" />
              <span>વિદ્યાલયમ પરિણામ સિસ્ટમ • ગુજરાત શિક્ષણ બોર્ડ પદ્ધતિ</span>
            </div>
            <h2 className="text-2xl font-black text-[#e4ded6] tracking-tight">
              વિષયવાર ગુણ નોંધણી કેન્દ્ર (Exam Mark Entry)
            </h2>
            <p className="text-xs text-[#a99f91] mt-1 max-w-2xl leading-relaxed">
              ધોરણ 9 અને 11 માટે ૩ સત્રાંત કસોટીઓ (પ્રથમ, દ્વિતીય, વાર્ષિક) + આંતરિક મૂલ્યાંકન, તથા ધોરણ 10 માટે પ્રથમ અને પ્રિલિમિનરી પરીક્ષાના ગુણ અહીં સહેલાઈથી નોંધો.
            </p>
          </div>

          {/* Standard Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#a99f91]">ધોરણ:</span>
            <div className="flex gap-2">
              {(['9', '10', '11'] as AllowedStandard[]).map((std) => (
                <button
                  key={std}
                  onClick={() => setSelectedStandard(std)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    selectedStandard === std
                      ? 'bg-[#9d512d] text-white shadow-lg shadow-[#9d512d]/30 scale-105'
                      : 'glass-card text-[#a99f91] hover:text-white'
                  }`}
                >
                  ધોરણ {std}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selector Toolbar: Exam Selection, Subject Selection, and Actions */}
      <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* 1. Exam Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#a99f91] uppercase tracking-wider mb-1.5">
              પરીક્ષા પસંદ કરો (Select Exam):
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-[#f59c73]"
            >
              {availableExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.nameGu} ({ex.maxMarks} ગુણ)
                </option>
              ))}
            </select>
          </div>

          {/* 2. Subject Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#a99f91] uppercase tracking-wider mb-1.5">
              વિષય પસંદ કરો (Select Subject):
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-[#f59c73]"
            >
              {availableSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nameGu} {sub.code ? `[${sub.code}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Search Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#a99f91] uppercase tracking-wider mb-1.5">
              વિદ્યાર્થી શોધો (Search Student):
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="નામ, રોલ નં, GR નંબર..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f59c73]"
              />
            </div>
          </div>

          {/* 4. Quick Actions */}
          <div className="flex gap-2 items-end">
            <button
              onClick={handleDownloadExcelTemplate}
              title="વિદ્યાર્થીઓના નામ સાથે ગુણ નોંધણી શીટ ડાઉનલોડ કરો"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl glass-card text-xs font-bold text-[#e4ded6] hover:text-white hover:border-[#f59c73] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>એક્સેલ ફોર્મ</span>
            </button>

            <label
              title="ભરેલી એક્સેલ ફાઇલ અપલોડ કરી એકસાથે ગુણ લોડ કરો"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl glass-card text-xs font-bold text-[#e4ded6] hover:text-white hover:border-[#f59c73] transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>આયાત (Import)</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
            </label>
          </div>
        </div>

        {/* Status Indicators & Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs text-[#a99f91]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#f59c73]" />
              કુલ વિદ્યાર્થીઓ:{' '}
              <strong className="text-white">{standardStudents.length}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ગુણ નોંધાયા:{' '}
              <strong className="text-white">
                {enteredCount} / {standardStudents.length}
              </strong>
            </span>
            {absentCount > 0 && (
              <span className="text-amber-400 font-semibold">
                ગેરહાજર (AB): {absentCount}
              </span>
            )}
            {averageMarks > 0 && (
              <span className="text-blue-300 font-semibold">
                વર્ગ સરેરાશ: {averageMarks} / {maxMarks}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAll}
              disabled={saveLoading || standardStudents.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black tracking-wide shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {saveLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>બધા ગુણ સાચવો (SAVE ALL)</span>
            </button>
          </div>
        </div>

        {saveSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {importMessage && (
          <div className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{importMessage}</span>
          </div>
        )}
      </div>

      {/* Interactive Mark Entry Table */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="px-5 py-4 bg-slate-900/80 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#f59c73]" />
            <h3 className="text-sm font-black text-white">
              {currentExam.nameGu} • {currentSubject.nameGu} (કુલ ગુણ: {maxMarks})
            </h3>
          </div>
          <span className="text-xs text-[#a99f91]">
            ટિપ: ગુણ લખીને <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-white">Tab</kbd> અથવા <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-white">Enter</kbd> દબાવો. ગેરહાજર માટે <strong className="text-amber-400">AB</strong> લખો.
          </span>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-[#a99f91] sticky top-0 z-10 shadow border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">રોલ</th>
                <th className="py-3 px-4 w-28">G.R. નંબર</th>
                <th className="py-3 px-4">વિદ્યાર્થીનું પૂરું નામ (GR મુજબ)</th>
                <th className="py-3 px-4 w-16 text-center">વર્ગ</th>
                <th className="py-3 px-4 w-44 text-center">
                  મેળવેલ ગુણ (/{maxMarks})
                </th>
                <th className="py-3 px-4 w-24 text-center">ગેરહાજર (AB)</th>
                <th className="py-3 px-4 w-24 text-center">ગ્રેડ</th>
                <th className="py-3 px-4 w-28 text-center">પરિણામ સ્થિતિ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ધોરણ {selectedStandard} માં કોઈ વિદ્યાર્થી મળ્યા નથી.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const entry = marksState[st.id] || { marks: '', isAbsent: false };
                  const isAbsent = entry.isAbsent;
                  const val = entry.marks;
                  const hasMark = typeof val === 'number';
                  const grade = isAbsent ? 'AB' : hasMark ? calculateGsebGrade(val, maxMarks) : '-';
                  const isPass = hasMark && !isAbsent && (val / maxMarks) * 100 >= 33;

                  return (
                    <tr
                      key={st.id}
                      className={`hover:bg-white/5 transition-colors ${
                        isAbsent ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center font-bold text-white">
                        {st.rollNumber || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#f59c73]">
                        {st.grNumber || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white">
                        {st.studentName}
                      </td>
                      <td className="py-2.5 px-4 text-center text-[#a99f91]">
                        {st.section || st.division || 'A'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="text"
                            disabled={isAbsent}
                            value={isAbsent ? 'AB' : val}
                            onChange={(e) => handleMarkChange(st.id, e.target.value)}
                            placeholder={`0-${maxMarks}`}
                            className={`w-24 text-center py-1.5 px-2 rounded-lg font-black text-sm border focus:outline-none transition-all ${
                              isAbsent
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 cursor-not-allowed'
                                : hasMark
                                ? isPass
                                  ? 'bg-slate-900 border-emerald-500/50 text-emerald-400'
                                  : 'bg-slate-900 border-red-500/50 text-red-400'
                                : 'bg-slate-900 border-slate-700 text-white focus:border-[#f59c73]'
                            }`}
                          />
                          <span className="text-[11px] text-slate-500 font-bold">
                            /{maxMarks}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAbsent(st.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                            isAbsent
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {isAbsent ? 'ગેરહાજર' : 'હાજર'}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            isAbsent
                              ? 'bg-amber-500/20 text-amber-400'
                              : grade.startsWith('A')
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : grade.startsWith('B')
                              ? 'bg-blue-500/20 text-blue-400'
                              : grade.startsWith('C') || grade === 'D'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {grade}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-semibold">
                        {isAbsent ? (
                          <span className="text-amber-400">ગેરહાજર</span>
                        ) : !hasMark ? (
                          <span className="text-slate-500">બાકી</span>
                        ) : isPass ? (
                          <span className="text-emerald-400">ઉત્તીર્ણ (Pass)</span>
                        ) : (
                          <span className="text-red-400">સુધારણા જરૂરી</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Save Bar */}
        <div className="p-4 bg-slate-900/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#a99f91]">
            બધા ગુણ દાખલ કર્યા પછી સાચવવાનું ભૂલશો નહીં. આ ગુણ ઓટોમેટિકલી વાર્ષિક પરિણામમાં ગણાઈ જશે.
          </div>
          <button
            onClick={handleSaveAll}
            disabled={saveLoading || standardStudents.length === 0}
            className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black tracking-wide shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>બધા ગુણ સાચવો (SAVE ALL MARKS)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
