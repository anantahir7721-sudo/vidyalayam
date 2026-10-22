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
  UserCheck,
  Check,
  X,
  Edit2,
  Lock,
  GraduationCap,
} from 'lucide-react';
import {
  Class9ExamType,
  CLASS_9_MAIN_SUBJECTS,
  CLASS_9_ADDITIONAL_SUBJECTS,
  ALL_CLASS_9_SUBJECTS,
  Class9SubjectDef,
  StudentResultClass9,
  calculateGsebGrade,
} from '../utils/class9ResultCalculations';
import {
  StandardKey,
  StreamKey,
  STANDARD_TABS,
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

  // View Navigation
  const [viewTab, setViewTab] = useState<'marks_entry' | 'result_register' | 'individual_marksheet'>('result_register');
  const [resultFormat, setResultFormat] = useState<'700' | '1000'>('700');

  // Marksheet Display Mode: Detailed Breakdown vs Simple 100 Marks Only
  const [marksheetPrintMode, setMarksheetPrintMode] = useState<'detailed' | 'simple100'>('detailed');

  // Active exam for Marks Entry / Register View
  const [activeExamId, setActiveExamId] = useState<string>('annual_result_700');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'PASS_WITH_SIDDHI' | 'PASS_WITH_KRUPA' | 'FAIL'>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Selected Subject for single-subject marks entry
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('gujarati');

  // Manual Grace Overrides: studentId -> subjectId -> { siddhi, krupa }
  const [manualGraceOverrides, setManualGraceOverrides] = useState<Record<string, Record<string, { siddhi?: number; krupa?: number }>>>({});
  const [graceModalStudent, setGraceModalStudent] = useState<StudentResultClass9 | null>(null);

  // Marks Entry Local State: studentId_subjectId_examType -> string value
  const [gridInputs, setGridInputs] = useState<Record<string, string>>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

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

  // Subjects for the active standard and stream
  const activeStandardSubjects = useMemo(() => {
    return getMultiSubjects(selectedStandard, selectedStream, resultFormat);
  }, [selectedStandard, selectedStream, resultFormat]);

  // Exams for the active standard
  const activeStandardExams = useMemo(() => {
    return getMultiExams(selectedStandard);
  }, [selectedStandard]);

  // Keep selectedSubjectId valid when standard changes
  useEffect(() => {
    if (activeStandardSubjects.length > 0 && !activeStandardSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(activeStandardSubjects[0].id);
    }
  }, [activeStandardSubjects, selectedSubjectId]);

  // Keep activeExamId valid when standard changes
  useEffect(() => {
    if (activeStandardExams.length > 0 && !activeStandardExams.some((e) => e.id === activeExamId)) {
      setActiveExamId(activeStandardExams[activeStandardExams.length - 1].id);
    }
  }, [activeStandardExams, activeExamId]);

  // Calculate All Results for the selected standard and students
  const allResults = useMemo(() => {
    return computeMultiStandardAllResults(
      filteredStudents,
      marks,
      selectedStandard,
      selectedStream,
      resultFormat,
      manualGraceOverrides
    );
  }, [filteredStudents, marks, selectedStandard, selectedStream, resultFormat, manualGraceOverrides]);

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

      activeStandardSubjects.forEach((subj) => {
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
        const kCompetency = `${student.id}_${subj.id}_competency`;
        const kNotebook = `${student.id}_${subj.id}_notebook`;
        const kInternal = `${student.id}_${subj.id}_internal_assessment`;
        const kAnnual = `${student.id}_${subj.id}_annual_exam`;
        const kDirect100 = `${student.id}_${subj.id}_annual_result_100`;

        initialInputs[kFirst] = getExistingVal(['first', 'pratham', 'પ્રથમ']);
        initialInputs[kSecond] = getExistingVal(['second', 'dwitiya', 'દ્વિતીય', 'prelim', 'પ્રિલિમ']);
        initialInputs[kPt1] = getExistingVal(['pt1', 'periodic_1', 'એકમ_1', 'કસોટી ૧']);
        initialInputs[kPt2] = getExistingVal(['pt2', 'periodic_2', 'એકમ_2', 'કસોટી ૨']);
        initialInputs[kCompetency] = getExistingVal(['competency', 'સજ્જતા']);
        initialInputs[kNotebook] = getExistingVal(['notebook', 'નોટબુક']);
        initialInputs[kInternal] = getExistingVal(['internal', 'આંતરિક']);
        initialInputs[kAnnual] = getExistingVal(['annual', 'varshik', 'વાર્ષિક', 'board', 'બોર્ડ']);
        initialInputs[kDirect100] = getExistingVal(['100', 'પરિણામ', 'result']);
      });
    });

    setGridInputs(initialInputs);
    setDirtyKeys(new Set());
    setSaveSuccessMsg(null);
  }, [filteredStudents, marks, activeStandardSubjects]);

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

  // Batch Save all marks to Firestore
  const handleSaveMarks = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const recordsToSave: any[] = [];

      filteredStudents.forEach((student) => {
        activeStandardSubjects.forEach((subj) => {
          const makeRecord = (examId: string, examTypeDisplay: string, valKey: string, maxM: number) => {
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
              examId,
              examType: examTypeDisplay,
              academicYear,
              subjectId: subj.id,
              subjectName: subj.nameGu,
              totalObtained: obtained,
              totalMax: maxM,
              percentage: isAb ? 0 : Math.round((obtained / maxM) * 100),
              overallGrade: isAb ? 'AB' : undefined,
            });
          };

          makeRecord('first_exam', 'પ્રથમ પરીક્ષા', `${student.id}_${subj.id}_first_exam`, 50);
          makeRecord('second_exam', 'દ્વિતીય પરીક્ષા', `${student.id}_${subj.id}_second_exam`, selectedStandard === '12' ? 100 : (selectedStandard === '10' ? 80 : 50));
          makeRecord('periodic_test_1', 'સામાયિક કસોટી ૧', `${student.id}_${subj.id}_periodic_test_1`, 25);
          makeRecord('periodic_test_2', 'સામાયિક કસોટી ૨', `${student.id}_${subj.id}_periodic_test_2`, 25);
          makeRecord('competency', 'વિષય સજ્જતા', `${student.id}_${subj.id}_competency`, 5);
          makeRecord('notebook', 'નોટબુક સબમિશન', `${student.id}_${subj.id}_notebook`, 5);
          makeRecord('internal_assessment', 'આંતરિક મૂલ્યાંકન', `${student.id}_${subj.id}_internal_assessment`, 20);
          makeRecord('annual_exam', 'વાર્ષિક પરીક્ષા', `${student.id}_${subj.id}_annual_exam`, 80);
          makeRecord('annual_result_100', 'વાર્ષિક પરિણામ ૧૦૦', `${student.id}_${subj.id}_annual_result_100`, 100);
        });
      });

      if (recordsToSave.length > 0) {
        await saveBatchExamMarks(school.id, recordsToSave);
      }

      setDirtyKeys(new Set());
      setSaveSuccessMsg(`સફળતાપૂર્વક ${recordsToSave.length} ગુણ રેકોર્ડ્સ ધોરણ ${selectedStandard} માટે સાચવી લેવામાં આવ્યા છે!`);

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

  // KPI Metrics
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

  // Export Result Register to Excel (.xlsx)
  const handleExportRegisterExcel = () => {
    if (allResults.length === 0) {
      alert('એક્સપોર્ટ કરવા માટે કોઈ પરિણામ ઉપલબ્ધ નથી.');
      return;
    }

    const rows = allResults.map((r, idx) => {
      const rowData: Record<string, any> = {
        'ક્રમ': idx + 1,
        'રોલ નં': r.rollNumber,
        'G.R. નં': r.grNumber,
        'વિદ્યાર્થીનું નામ': r.student.studentName,
        'વર્ગ / સેક્શન': r.section,
      };

      r.scores.forEach((sc) => {
        const markStr = sc.converted100 !== null ? sc.converted100 : '-';
        const graceSuffix = sc.siddhiGiven > 0 ? ` +${sc.siddhiGiven}#` : sc.krupaGiven > 0 ? ` +${sc.krupaGiven}*` : '';
        rowData[`${sc.subject.nameGu} (૧૦૦)`] = `${markStr}${graceSuffix}`;
        rowData[`${sc.subject.nameGu} ગ્રેડ`] = sc.grade;
      });

      rowData['કુલ ગુણ'] = r.totalObtained;
      rowData['મહત્તમ ગુણ'] = r.totalMax;
      rowData['ટકાવારી (%)'] = r.percentage;
      rowData['આખરી ગ્રેડ'] = r.overallGrade;
      rowData['પરિણામ સ્થિતિ'] = r.overallResultGu;
      rowData['વર્ગમાં ક્રમ'] = r.rank ? r.rank : '-';

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Std_${selectedStandard}_Result`);
    XLSX.writeFile(workbook, `${school.schoolName}_Std_${selectedStandard}_Result_Register.xlsx`);
  };

  // Print Result Register (A4 Landscape)
  const handlePrintRegister = () => {
    if (allResults.length === 0) {
      alert('પ્રિન્ટ કરવા માટે કોઈ પરિણામ ઉપલબ્ધ નથી.');
      return;
    }

    const rowsHtml = allResults
      .map(
        (r, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #000; padding: 4px;">${r.rollNumber || idx + 1}</td>
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

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${school.schoolName} - ધોરણ ${selectedStandard} પરિણામ પત્રક</title>
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
          <div class="badge">ધોરણ ${selectedStandard} વાર્ષિક પરિણામ રજિસ્ટર • વર્ષ ${academicYear}</div>
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
              <th style="width: 30px;">રોલ</th>
              <th style="width: 55px;">G.R.</th>
              <th style="text-align: left;">વિદ્યાર્થીનું નામ</th>
              ${activeStandardSubjects.map((sub) => `<th>${sub.nameGu.split(' ')[0]}<br><span style="font-weight:normal; font-size:7pt;">(૧૦૦)</span></th>`).join('')}
              <th style="width: 55px;">કુલ</th>
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

    printHtmlDocument(html, `${school.schoolName}_Std_${selectedStandard}_Result_Register`);
  };

  // Print Individual Marksheet (Progress Card - A4 Portrait)
  const handlePrintIndividualMarksheet = () => {
    if (!activeStudentResult) {
      alert('કોઈ વિદ્યાર્થી પસંદ થયેલ નથી.');
      return;
    }

    let tableContentHtml = '';

    if (marksheetPrintMode === 'simple100') {
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
              <th>દ્વિતીય / પ્રિલિમ</th>
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
          .border-frame { border: 3px double #000; padding: 16px; min-height: 98vh; display: flex; flex-direction: column; justify-content: space-between; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
          .school-title { font-size: 18pt; font-weight: 800; margin: 0; text-transform: uppercase; }
          .badge { display: inline-block; background: #000; color: #fff; font-size: 11pt; font-weight: bold; padding: 3px 16px; border-radius: 4px; margin-top: 6px; }
          .meta-box { border: 1.5px solid #000; padding: 8px 12px; margin-bottom: 14px; font-size: 9.5pt; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; background: #fafafa; }
          table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 14px; }
          th { border: 1px solid #000; background-color: #f1f5f9; padding: 6px; text-align: center; font-weight: 800; }
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
              <div class="badge">વાર્ષિક ગુણપત્રક (ANNUAL MARKSHEET) • ધોરણ ${selectedStandard} • શૈક્ષણિક વર્ષ ${academicYear}</div>
            </div>
            <div class="meta-box">
              <div>G.R. નંબર: <strong>${activeStudentResult.grNumber}</strong></div>
              <div>રોલ નંબર: <strong>${activeStudentResult.rollNumber}</strong></div>
              <div>ધોરણ & વર્ગ: <strong>ધોરણ ${selectedStandard} (${activeStudentResult.section})</strong></div>
              <div>વિદ્યાર્થીનું નામ: <strong>${activeStudentResult.student.studentName}</strong></div>
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
              • <strong># (સિદ્ધિ ગુણ):</strong> રેન્ક પાત્ર (મહત્તમ ૧૫) • <strong>* (કૃપા ગુણ):</strong> આચાર્ય ક્વોટા (મહત્તમ ૧૦).<br>
              • <strong>પ્રમોશન પાત્રતા:</strong> વિષયમાં લઘુત્તમ ૨૫ ગુણ જરૂરી. ૨૫ થી ઓછા ગુણવાળા વિદ્યાર્થી પ્રમોશન માટે અપાત્ર ગણાય છે.
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
    printHtmlDocument(html, `${cleanName}_Std${selectedStandard}_Marksheet_${marksheetPrintMode}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Standard Selection Bar */}
      <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-3.5">
            <button
              type="button"
              onClick={onBack}
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
                સરળ ગુણ એન્ટ્રી, રજિસ્ટર ડાઉનલોડિંગ અને ૨ પ્રકારના વ્યક્તિગત પરિણામ પત્રકો સાથે સંપૂર્ણ પરિણામ તૈયાર કરો.
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
            {selectedStandard === '9' && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-[11px] font-bold text-slate-500 px-2">ધોરણ ૯ ફોર્મેટ:</span>
                <button
                  onClick={() => setResultFormat('700')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    resultFormat === '700'
                      ? 'bg-white dark:bg-slate-900 text-[#C45A2D] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ૭૦૦ ગુણ
                </button>
                <button
                  onClick={() => setResultFormat('1000')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    resultFormat === '1000'
                      ? 'bg-white dark:bg-slate-900 text-[#C45A2D] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ૧૦૦૦ ગુણ
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {STANDARD_TABS.map((tab) => {
              const isSelected = selectedStandard === tab.id;
              const count = studentCountsByStd[tab.id] || 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStandard(tab.id)}
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
              <span className="font-bold text-amber-900 dark:text-amber-200 px-2">પ્રવાહ (Stream):</span>
              <button
                type="button"
                onClick={() => setSelectedStream('general')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  selectedStream === 'general'
                    ? 'bg-[#C45A2D] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
                }`}
              >
                સામાન્ય પ્રવાહ (Commerce / Arts)
              </button>
              <button
                type="button"
                onClick={() => setSelectedStream('science')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  selectedStream === 'science'
                    ? 'bg-[#C45A2D] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60'
                }`}
              >
                વિજ્ઞાન પ્રવાહ (Science)
              </button>
            </div>
          )}

          {/* Section & Academic Year Controls */}
          <div className="pt-2 flex items-center justify-between gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Section Selector */}
              {availableSections.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-600 dark:text-slate-400">સેક્શન / વર્ગ:</span>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-white"
                  >
                    <option value="ALL">બધા સેક્શન ({activeStandardStudents.length})</option>
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>સેક્શન {sec}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Academic Year Selector */}
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
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setViewTab('marks_entry')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewTab === 'marks_entry'
                ? 'bg-[#C45A2D] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Edit2 className="w-4 h-4" />
            <span>📝 સરળ ગુણ એન્ટ્રી (Marks Entry)</span>
            {dirtyKeys.size > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setViewTab('result_register')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
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
            onClick={() => setViewTab('individual_marksheet')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              viewTab === 'individual_marksheet'
                ? 'bg-[#C45A2D] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>🎓 વ્યક્તિગત પરિણામ પત્રક (Marksheet)</span>
          </button>
        </div>

        {/* Quick action buttons for Register export & print */}
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
            <span>રજિસ્ટર પ્રિન્ટ / PDF</span>
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

      {/* VIEW TAB 1: MARKS ENTRY (સરળ ગુણ એન્ટ્રી) */}
      {viewTab === 'marks_entry' && (
        <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 sm:p-6 shadow-xl space-y-5">
          {/* Top Exam Selector & Save Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C45A2D]" />
                <span>ધોરણ {selectedStandard} ગુણ એન્ટ્રી સ્પ્રેડશીટ</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                પરીક્ષા અને વિષય પસંદ કરીને ઝડપથી કીબોર્ડ (Enter/Tab) વડે ગુણ એન્ટર કરો. ગેરહાજર માટે 'AB' લખો.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {dirtyKeys.size > 0 && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                  ⚠️ {dirtyKeys.size} ગુણ સેવ કરવાના બાકી છે
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

          {/* Exam Selector Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {activeStandardExams.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setActiveExamId(ex.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeExamId === ex.id
                    ? 'bg-[#C45A2D] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-[#C45A2D]/50'
                }`}
              >
                <span>{ex.nameGu}</span>
                <span className="ml-1.5 opacity-80 text-[10px]">({ex.maxMarksPerSubject} ગુણ)</span>
              </button>
            ))}
          </div>

          {/* Subject Selector Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
            <span className="text-xs font-bold text-slate-500 px-1 shrink-0">વિષય:</span>
            {activeStandardSubjects.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedSubjectId === sub.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {sub.nameGu}
              </button>
            ))}
          </div>

          {/* Spreadsheet Entry Table with Sticky Student Names */}
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
            <div className="overflow-x-auto max-h-[550px] relative">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 sticky top-0 z-20 shadow-xs font-bold">
                  <tr>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 w-16 text-center sticky left-0 z-30 bg-slate-100 dark:bg-slate-800">
                      રોલ નં
                    </th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 w-24 text-center">
                      G.R. નં
                    </th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 sticky left-16 z-30 bg-slate-100 dark:bg-slate-800 min-w-[180px]">
                      વિદ્યાર્થીનું પૂરું નામ
                    </th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-center w-28 bg-amber-500/10 font-black text-amber-900 dark:text-amber-200">
                      પ્રથમ (૫૦)
                    </th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-center w-28 bg-orange-500/10 font-black text-orange-900 dark:text-orange-200">
                      દ્વિતીય / પ્રિલિમ
                    </th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-center w-28 bg-blue-500/10 font-black text-blue-900 dark:text-blue-200">
                      કસોટી ૧ (૨૫)
                    </th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-center w-28 bg-blue-500/10 font-black text-blue-900 dark:text-blue-200">
                      કસોટી ૨ (૨૫)
                    </th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-center w-28 bg-emerald-500/10 font-black text-emerald-900 dark:text-emerald-200">
                      આંતરિક (૨૦)
                    </th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-center w-28 bg-indigo-500/10 font-black text-indigo-900 dark:text-indigo-200">
                      વાર્ષિક (૮૦)
                    </th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-center w-24 bg-purple-500/10 font-black text-purple-900 dark:text-purple-200">
                      કુલ (૧૦૦)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-bold">
                        ધોરણ {selectedStandard} માટે કોઈ વિદ્યાર્થીઓ નોંધાયેલા મળ્યા નથી.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      const kFirst = `${student.id}_${selectedSubjectId}_first_exam`;
                      const kSecond = `${student.id}_${selectedSubjectId}_second_exam`;
                      const kPt1 = `${student.id}_${selectedSubjectId}_periodic_test_1`;
                      const kPt2 = `${student.id}_${selectedSubjectId}_periodic_test_2`;
                      const kInternal = `${student.id}_${selectedSubjectId}_internal_assessment`;
                      const kAnnual = `${student.id}_${selectedSubjectId}_annual_exam`;

                      const valFirst = gridInputs[kFirst] || '';
                      const valSecond = gridInputs[kSecond] || '';
                      const valPt1 = gridInputs[kPt1] || '';
                      const valPt2 = gridInputs[kPt2] || '';
                      const valInternal = gridInputs[kInternal] || '';
                      const valAnnual = gridInputs[kAnnual] || '';

                      // Auto-computed preview for 100
                      const nF = parseFloat(valFirst) || 0;
                      const nS = parseFloat(valSecond) || 0;
                      const nA = parseFloat(valAnnual) || 0;
                      const nI = parseFloat(valInternal) || 0;
                      const hasMarks = valFirst || valSecond || valAnnual || valInternal;
                      const preview100 = hasMarks ? Math.round(((nF + nS + nA + nI) / 2) * 10) / 10 : '-';

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2 px-3 text-center font-bold text-slate-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                            {student.rollNumber || idx + 1}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500 font-mono">
                            {student.grNumber || '-'}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white sticky left-16 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 truncate">
                            {student.studentName}
                          </td>

                          {/* First Exam (50) */}
                          <td className="py-1 px-1.5 text-center">
                            <input
                              type="text"
                              value={valFirst}
                              placeholder="0-50"
                              onChange={(e) => handleCellChange(kFirst, e.target.value, 50)}
                              className={`w-20 py-1.5 px-2 rounded-lg border text-center font-bold transition-all text-xs ${
                                dirtyKeys.has(kFirst)
                                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                              }`}
                            />
                          </td>

                          {/* Second Exam (50 / 80) */}
                          <td className="py-1 px-1.5 text-center">
                            <input
                              type="text"
                              value={valSecond}
                              placeholder="0-50"
                              onChange={(e) => handleCellChange(kSecond, e.target.value, selectedStandard === '12' ? 100 : (selectedStandard === '10' ? 80 : 50))}
                              className={`w-20 py-1.5 px-2 rounded-lg border text-center font-bold transition-all text-xs ${
                                dirtyKeys.has(kSecond)
                                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                              }`}
                            />
                          </td>

                          {/* Periodic 1 (25) */}
                          <td className="py-1 px-1.5 text-center">
                            <input
                              type="text"
                              value={valPt1}
                              placeholder="0-25"
                              onChange={(e) => handleCellChange(kPt1, e.target.value, 25)}
                              className={`w-20 py-1.5 px-2 rounded-lg border text-center font-bold transition-all text-xs ${
                                dirtyKeys.has(kPt1)
                                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                              }`}
                            />
                          </td>

                          {/* Periodic 2 (25) */}
                          <td className="py-1 px-1.5 text-center">
                            <input
                              type="text"
                              value={valPt2}
                              placeholder="0-25"
                              onChange={(e) => handleCellChange(kPt2, e.target.value, 25)}
                              className={`w-20 py-1.5 px-2 rounded-lg border text-center font-bold transition-all text-xs ${
                                dirtyKeys.has(kPt2)
                                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                              }`}
                            />
                          </td>

                          {/* Internal (20) */}
                          <td className="py-1 px-1.5 text-center">
                            <input
                              type="text"
                              value={valInternal}
                              placeholder="0-20"
                              onChange={(e) => handleCellChange(kInternal, e.target.value, 20)}
                              className={`w-20 py-1.5 px-2 rounded-lg border text-center font-bold transition-all text-xs ${
                                dirtyKeys.has(kInternal)
                                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                              }`}
                            />
                          </td>

                          {/* Annual (80) */}
                          <td className="py-1 px-1.5 text-center">
                            <input
                              type="text"
                              value={valAnnual}
                              placeholder="0-80"
                              onChange={(e) => handleCellChange(kAnnual, e.target.value, 80)}
                              className={`w-20 py-1.5 px-2 rounded-lg border text-center font-bold transition-all text-xs ${
                                dirtyKeys.has(kAnnual)
                                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                              }`}
                            />
                          </td>

                          {/* Computed 100 Preview */}
                          <td className="py-1 px-2 text-center font-black text-slate-900 dark:text-white bg-purple-500/5">
                            {preview100}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: RESULT REGISTER (પરિણામ રજિસ્ટર) */}
      {viewTab === 'result_register' && (
        <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#C45A2D]" />
                <span>ધોરણ {selectedStandard} પરિણામ રજિસ્ટર (Gazette Register)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                વિષયવાર ગુણ, કુલ, ટકાવારી, ગ્રેડ, સિદ્ધિ/કૃપા ગુણ અને વર્ગ રેન્ક.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search Bar */}
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

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="ALL">બધા પરિણામ ({allResults.length})</option>
                <option value="PASS">માત્ર સીધા ઉત્તીર્ણ</option>
                <option value="PASS_WITH_SIDDHI">સિદ્ધિ ગુણ સાથે (#)</option>
                <option value="PASS_WITH_KRUPA">કૃપા ગુણ સાથે (*)</option>
                <option value="FAIL">સુધારણા જરૂરી</option>
              </select>
            </div>
          </div>

          {/* Result Register Table */}
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 sticky top-0 z-10 shadow-xs font-bold text-center">
                  <tr>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-12">રોલ</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-16">G.R.</th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 text-left min-w-[180px]">વિદ્યાર્થીનું નામ</th>
                    {activeStandardSubjects.map((sub) => (
                      <th key={sub.id} className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 min-w-[70px]">
                        {sub.nameGu.split(' ')[0]}
                        <span className="block text-[9px] font-normal text-slate-500">(૧૦૦)</span>
                      </th>
                    ))}
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-16 bg-amber-500/10 font-black">કુલ</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-14 bg-amber-500/10 font-black">ટકા</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-12 bg-amber-500/10 font-black">ગ્રેડ</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-24">પરિણામ</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-12 font-black">રેન્ક</th>
                    <th className="py-2.5 px-2 border-b border-slate-200 dark:border-slate-700 w-20">ગ્રેસ (#/*)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-center">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={10 + activeStandardSubjects.length} className="py-12 text-slate-500 font-bold">
                        કોઈ પરિણામ રેકોર્ડ મળ્યો નથી.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r, idx) => (
                      <tr key={r.student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2 px-2 font-bold text-slate-900 dark:text-white">{r.rollNumber || idx + 1}</td>
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
                            {sc.siddhiGiven > 0 && <span className="text-[10px] text-teal-600 block">+{sc.siddhiGiven}#</span>}
                            {sc.krupaGiven > 0 && <span className="text-[10px] text-amber-600 block">+{sc.krupaGiven}*</span>}
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
                                : r.overallResult === 'PASS_WITH_SIDDHI'
                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                                : r.overallResult === 'PASS_WITH_KRUPA'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            {r.overallResultGu.split(' ')[0]}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-black text-indigo-600 dark:text-indigo-400">
                          {r.rank ? `#${r.rank}` : '-'}
                        </td>
                        <td className="py-2 px-2">
                          <button
                            type="button"
                            onClick={() => setGraceModalStudent(r)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                          >
                            {r.totalSiddhiUsed > 0 || r.totalKrupaUsed > 0 ? (
                              <span className="text-teal-600">
                                {r.totalSiddhiUsed > 0 && `${r.totalSiddhiUsed}#`}
                                {r.totalKrupaUsed > 0 && ` ${r.totalKrupaUsed}*`}
                              </span>
                            ) : (
                              <span>ગોઠવો</span>
                            )}
                          </button>
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

      {/* VIEW TAB 3: INDIVIDUAL MARKSHEET (વ્યક્તિગત પરિણામ પત્રક) */}
      {viewTab === 'individual_marksheet' && (
        <div className="space-y-4">
          {/* Controls Bar: Student Selector & 2 Marksheet Format Options */}
          <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">વિદ્યાર્થી પસંદ કરો:</span>
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

            {/* 2 User-Requested Options for Individual Marksheet */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setMarksheetPrintMode('detailed')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    marksheetPrintMode === 'detailed'
                      ? 'bg-[#C45A2D] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  📋 સંપૂર્ણ વિગતવાર પત્રક
                </button>
                <button
                  type="button"
                  onClick={() => setMarksheetPrintMode('simple100')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    marksheetPrintMode === 'simple100'
                      ? 'bg-[#C45A2D] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  📄 માત્ર ૧૦૦ માંથી ગુણ પત્રક
                </button>
              </div>

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
                    {school.village ? school.village + ', ' : ''}{school.taluka ? school.taluka + ', ' : ''}{school.district} • DISE: <strong>{school.diseCode}</strong>
                  </p>
                  <div className="inline-block px-4 py-1 rounded-md bg-slate-900 text-white font-bold text-xs mt-3 uppercase tracking-wider">
                    {marksheetPrintMode === 'simple100'
                      ? `વાર્ષિક ગુણપત્રક (ANNUAL MARKSHEET) • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`
                      : `વાર્ષિક પ્રગતિ પત્રક (PROGRESS REPORT) • ધોરણ ${selectedStandard} • વર્ષ ${academicYear}`}
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">વિદ્યાર્થીનું નામ:</span>
                    <span className="font-bold text-slate-900">{activeStudentResult.student.studentName}</span>
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

                {/* Marksheet Table: Option 1 (Detailed) vs Option 2 (Simple 100) */}
                {marksheetPrintMode === 'simple100' ? (
                  <table className="w-full text-left text-xs border-collapse border border-slate-300">
                    <thead className="bg-slate-100 text-slate-800 text-center font-bold">
                      <tr>
                        <th className="border border-slate-300 py-2.5 px-3 w-14">અનુ. ક્રમ</th>
                        <th className="border border-slate-300 py-2.5 px-4 text-left">વિષયનું નામ (Subject)</th>
                        <th className="border border-slate-300 py-2.5 px-3 w-36">મેળવેલ ગુણ / ૧૦૦</th>
                        <th className="border border-slate-300 py-2.5 px-3 w-28">વિષય ગ્રેડ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStudentResult.scores.map((sc, idx) => (
                        <tr key={sc.subject.id} className="text-center hover:bg-slate-50">
                          <td className="border border-slate-300 py-2.5 px-3 font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 py-2.5 px-4 text-left font-bold">{sc.subject.nameGu}</td>
                          <td className="border border-slate-300 py-2.5 px-3 font-black text-sm">
                            {sc.converted100 !== null ? sc.converted100 : '-'}
                            {sc.siddhiGiven > 0 && <span className="text-teal-700 text-xs"> +{sc.siddhiGiven}#</span>}
                            {sc.krupaGiven > 0 && <span className="text-amber-700 text-xs"> +{sc.krupaGiven}*</span>}
                          </td>
                          <td className="border border-slate-300 py-2.5 px-3 font-bold text-xs">{sc.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs border-collapse border border-slate-300">
                    <thead className="bg-slate-100 text-slate-800 text-center font-bold">
                      <tr>
                        <th className="border border-slate-300 py-2 px-2 w-10">ક્રમ</th>
                        <th className="border border-slate-300 py-2 px-3 text-left">વિષયનું નામ</th>
                        <th className="border border-slate-300 py-2 px-2">પ્રથમ (૫૦)</th>
                        <th className="border border-slate-300 py-2 px-2">દ્વિતીય / પ્રિલિમ</th>
                        <th className="border border-slate-300 py-2 px-2">વાર્ષિક (૮૦)</th>
                        <th className="border border-slate-300 py-2 px-2">આંતરિક (૨૦)</th>
                        <th className="border border-slate-300 py-2 px-3 font-black">કુલ (૧૦૦)</th>
                        <th className="border border-slate-300 py-2 px-2">ગ્રેડ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStudentResult.scores.map((sc, idx) => (
                        <tr key={sc.subject.id} className="text-center hover:bg-slate-50">
                          <td className="border border-slate-300 py-2 px-2">{idx + 1}</td>
                          <td className="border border-slate-300 py-2 px-3 text-left font-bold">{sc.subject.nameGu}</td>
                          <td className="border border-slate-300 py-2 px-2">{sc.first50 !== null ? sc.first50 : '-'}</td>
                          <td className="border border-slate-300 py-2 px-2">{sc.second50 !== null ? sc.second50 : '-'}</td>
                          <td className="border border-slate-300 py-2 px-2">{sc.annual80 !== null ? sc.annual80 : '-'}</td>
                          <td className="border border-slate-300 py-2 px-2">{sc.internal20 !== null ? sc.internal20 : '-'}</td>
                          <td className="border border-slate-300 py-2 px-3 font-black text-sm">
                            {sc.converted100 !== null ? sc.converted100 : '-'}
                            {sc.siddhiGiven > 0 && <span className="text-teal-700 text-xs">+{sc.siddhiGiven}#</span>}
                            {sc.krupaGiven > 0 && <span className="text-amber-700 text-xs">+{sc.krupaGiven}*</span>}
                          </td>
                          <td className="border border-slate-300 py-2 px-2 font-bold">{sc.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

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

      {/* Manual Grace Override Modal */}
      {graceModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border rounded-3xl max-w-lg w-full p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold">સિદ્ધિ (#) અને કૃપા (*) ગુણ ગોઠવો</h3>
                <p className="text-xs text-slate-500">{graceModalStudent.student.studentName} (રોલ: {graceModalStudent.rollNumber})</p>
              </div>
              <button onClick={() => setGraceModalStudent(null)} className="p-1 rounded-lg hover:bg-slate-100">✕</button>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
                સિદ્ધિ ગુણ પુલ: <strong>{graceModalStudent.siddhiPoolEarned} ગુણ</strong> (૩૩% ઉપરના ટકા મુજબ)
              </div>

              {graceModalStudent.scores.map((sc) => {
                const curOverride = manualGraceOverrides[graceModalStudent.student.id]?.[sc.subject.id] || {};
                const curSiddhi = curOverride.siddhi !== undefined ? curOverride.siddhi : sc.siddhiGiven;
                const curKrupa = curOverride.krupa !== undefined ? curOverride.krupa : sc.krupaGiven;

                return (
                  <div key={sc.subject.id} className="p-3 rounded-xl border flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold">{sc.subject.nameGu}</div>
                      <div className="text-[11px] text-slate-500">મૂળ ગુણ: {sc.converted100 !== null ? sc.converted100 : '-'} / ૧૦૦</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="text-[10px] block text-slate-500">સિદ્ધિ (#)</label>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={curSiddhi}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setManualGraceOverrides((prev) => ({
                              ...prev,
                              [graceModalStudent.student.id]: {
                                ...prev[graceModalStudent.student.id],
                                [sc.subject.id]: {
                                  ...prev[graceModalStudent.student.id]?.[sc.subject.id],
                                  siddhi: val,
                                },
                              },
                            }));
                          }}
                          className="w-14 py-1 px-1.5 rounded-lg border text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] block text-slate-500">કૃપા (*)</label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={curKrupa}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setManualGraceOverrides((prev) => ({
                              ...prev,
                              [graceModalStudent.student.id]: {
                                ...prev[graceModalStudent.student.id],
                                [sc.subject.id]: {
                                  ...prev[graceModalStudent.student.id]?.[sc.subject.id],
                                  krupa: val,
                                },
                              },
                            }));
                          }}
                          className="w-14 py-1 px-1.5 rounded-lg border text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setGraceModalStudent(null)}
                className="px-4 py-2 rounded-xl bg-[#C45A2D] text-white font-bold text-xs"
              >
                સાચવો અને બંધ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GSEB Rules Guidance Modal */}
      {rulesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border rounded-3xl max-w-xl w-full p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black">GSEB પરિણામ નિયમો & ફોર્મ્યુલા</h3>
              </div>
              <button onClick={() => setRulesModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">✕</button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed max-h-[400px] overflow-y-auto pr-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white">૧. ૨૦૦ → ૧૦૦ રૂપાંતરણ (ધોરણ ૯)</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  પ્રથમ સત્રાંત (૫૦) + દ્વિતીય સત્રાંત (૫૦) + વાર્ષિક પરીક્ષા (૮૦) + આંતરિક મૂલ્યાંકન (૨૦) = કુલ ૨૦૦ / ૨ = ૧૦૦ ગુણ.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white">૨. પ્રમોશન પાત્રતા નિયમ (લઘુત્તમ ૨૫ ગુણ)</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  વિદ્યાર્થીને પ્રમોશન મળવા માટે વિષય દીઠ ઓછામાં ઓછા ૨૫ ગુણ મેળવેલા હોવા જોઈએ. ૨૫ થી ઓછા ગુણવાળા વિદ્યાર્થી પ્રમોશન માટે અપાત્ર બને છે.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white">૩. સિદ્ધિ ગુણ (#) & કૃપા ગુણ (*)</h4>
                <p className="text-slate-600 dark:text-slate-400">
                  • <strong>સિદ્ધિ (#):</strong> વિદ્યાર્થીના ટકા ૩૩% થી જેટલા વધુ હોય તેટલા ગુણનો પુલ બને છે (મહત્તમ ૧૫ ગુણ). આ ગુણ સાથે વિદ્યાર્થી વર્ગ રેન્ક માટે પાત્ર રહે છે.<br />
                  • <strong>કૃપા (*):</strong> આચાર્ય ક્વોટા હેઠળ વધુમાં વધુ ૧૦ ગુણ આપી શકાય છે. આ ગુણ મેળવનાર વિદ્યાર્થીને રેન્ક મળતો નથી.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white">૪. GSEB ૮-પોઇન્ટ ગ્રેડિંગ સ્કેલ</h4>
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
