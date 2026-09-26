import React, { useState, useMemo } from 'react';
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
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Percent,
  Send,
  MessageSquare,
} from 'lucide-react';
import {
  calculateClassResults,
  CalculatedStudentResult,
  getSubjectsForStandard,
  getExamsForStandard,
} from '../utils/resultFormulaUtils';
import { SendExamResultModal } from './SendExamResultModal';

interface ResultsManagerProps {
  school: School;
  students: Student[];
  marks: MarkRecord[];
  onBack: () => void;
  onNavigateToMarks?: () => void;
}

export const ResultsManager: React.FC<ResultsManagerProps> = ({
  school,
  students,
  marks,
  onBack,
  onNavigateToMarks,
}) => {
  const [selectedStandard, setSelectedStandard] = useState<AllowedStandard>('9');
  const [viewMode, setViewMode] = useState<'gazette' | 'progress_card'>('gazette');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'PASS_WITH_SIDDHI' | 'PASS_WITH_KRUPA' | 'FAIL'>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [sendResultModalOpen, setSendResultModalOpen] = useState(false);

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
      if (statusFilter === 'PASS') {
        return res.resultStatus === 'PASS';
      }
      if (statusFilter === 'PASS_WITH_SIDDHI') {
        return res.resultStatus === 'PASS_WITH_SIDDHI';
      }
      if (statusFilter === 'PASS_WITH_KRUPA') {
        return res.resultStatus === 'PASS_WITH_KRUPA';
      }
      if (statusFilter === 'FAIL') {
        return res.resultStatus === 'NEEDS_IMPROVEMENT';
      }
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

  const subjects = useMemo(() => getSubjectsForStandard(selectedStandard), [selectedStandard]);

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

  // 2. Export Master Result Gazette to Excel
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

      // Add each subject's converted annual total & grade
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

    const filename = `${school.schoolName.replace(/[\s/\\?%*:|"<>]/g, '_')}_Std_${selectedStandard}_Result_Gazette.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // 3. Print Class Gazette (A4 Landscape)
  const handlePrintGazette = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('પ્રિન્ટ કરવા માટે પોપઅપ વિન્ડોને મંજૂરી આપો.');
      return;
    }

    const tableRows = classResults
      .map(
        (r, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.student.rollNumber || idx + 1}</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: center; font-family: monospace;">${r.student.grNumber || '-'}</td>
          <td style="border: 1px solid #000; padding: 4px; font-weight: bold; text-align: left; white-space: nowrap;">${r.student.studentName}</td>
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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body {
            font-family: 'Anek Gujarati', system-ui, sans-serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 5px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .school-header-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 2px;
          }
          .school-logo-img {
            width: 40px;
            height: 40px;
            object-fit: contain;
            border-radius: 4px;
          }
          .school-name {
            font-size: 16pt;
            font-weight: 800;
            margin: 0;
            text-transform: uppercase;
          }
          .sub-header {
            font-size: 9.5pt;
            margin-top: 2px;
          }
          .title-badge {
            display: inline-block;
            background: #000;
            color: #fff;
            font-size: 11pt;
            font-weight: 800;
            padding: 2px 14px;
            border-radius: 4px;
            margin-top: 4px;
          }
          .summary-strip {
            display: flex;
            justify-content: space-between;
            font-size: 8.5pt;
            font-weight: bold;
            background: #f1f5f9;
            border: 1px solid #000;
            padding: 4px 8px;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
          }
          th {
            border: 1px solid #000;
            background-color: #e2e8f0;
            padding: 4px;
            text-align: center;
            font-weight: 800;
          }
          .notes-strip {
            margin-top: 8px;
            font-size: 8pt;
            color: #333;
            border: 1px dashed #777;
            padding: 4px 8px;
          }
          .signatures {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            font-size: 9.5pt;
            font-weight: bold;
            padding: 0 40px;
          }
          .sig-line {
            border-top: 1px dashed #000;
            padding-top: 4px;
            width: 150px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-header-row">
            ${school.logoUrl ? `<img src="${school.logoUrl}" alt="School Logo" class="school-logo-img" />` : ''}
            <h1 class="school-name">${school.schoolName}</h1>
          </div>
          <div class="sub-header">
            ${school.village ? school.village + ', ' : ''}${school.taluka ? school.taluka + ', ' : ''}${school.district} • DISE કોડ: <strong>${school.diseCode}</strong>
          </div>
          <div class="title-badge">
            વાર્ષિક સંકલિત પરિણામ પત્રક (ANNUAL RESULT GAZETTE) • ધોરણ: ${selectedStandard} • શૈક્ષણિક વર્ષ ૨૦૨૬–૨૭
          </div>
        </div>

        <div class="summary-strip">
          <span>કુલ વિદ્યાર્થી: <strong>${stats.total}</strong></span>
          <span>સીધા ઉત્તીર્ણ: <strong>${stats.directPassCount}</strong></span>
          <span>સિદ્ધિ ગુણ (#): <strong>${stats.siddhiCount}</strong></span>
          <span>કૃપા ગુણ (*): <strong>${stats.krupaCount}</strong></span>
          <span>સુધારણા જરૂરી: <strong>${stats.failCount}</strong></span>
          <span>પરિણામ ટકા: <strong>${stats.passPct}%</strong></span>
          <span>વર્ગ સરેરાશ: <strong>${stats.avgPct}%</strong></span>
          <span>સર્વોચ્ચ ગુણ: <strong>${stats.highestPct}%</strong></span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;">રોલ</th>
              <th style="width: 60px;">G.R. નં</th>
              <th style="text-align: left;">વિદ્યાર્થીનું નામ</th>
              ${subjects
                .map(
                  (s) => `
                <th style="min-width: 55px;">
                  <div>${s.nameGu.split(' ')[0]}</div>
                  <div style="font-size: 7.5pt; font-weight: normal;">(૧૦૦ ગુણ)</div>
                </th>
              `
                )
                .join('')}
              <th style="width: 65px;">કુલ ગુણ</th>
              <th style="width: 45px;">ટકા</th>
              <th style="width: 40px;">ગ્રેડ</th>
              <th style="width: 75px;">પરિણામ</th>
              <th style="width: 35px;">ક્રમ</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="notes-strip">
          <strong>GSEB પરિણામ નોંધ:</strong> 
          • <strong># (સિદ્ધિ ગુણ):</strong> એકંદરે ૩૩% થી વધુ ગુણ મેળવનારને ૩૩% થી ઉપરના દરેક ૧% દીઠ ૧ ગુણ (મહત્તમ ૧૫ ગુણ) - રેન્ક માટે પાત્ર.
          • <strong>* (કૃપા ગુણ):</strong> આચાર્યશ્રી દ્વારા વધુમાં વધુ ૧૦ ગુણની મર્યાદામાં કૃપા ગુણ - રેન્ક માટે અપાત્ર.
          • લઘુત્તમ શરત: જે વિષયમાં ૨૫% કે વધુ ગુણ હોય તેમાં જ સિદ્ધિ/કૃપા ગુણ આપેલા છે. સિદ્ધિ/કૃપા ગુણ કુલ મેળવેલ ગુણમાં ઉમેરાતા નથી.
        </div>

        <div class="signatures">
          <div class="sig-line">વર્ગ શિક્ષકની સહી</div>
          <div class="sig-line">પરીક્ષા પ્રમુખશ્રીની સહી</div>
          <div class="sig-line">આચાર્યશ્રીની સહી અને સિક્કો</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // 4. Print Individual Student Progress Card (A4 Portrait)
  const handlePrintStudentCard = (targetResult?: CalculatedStudentResult) => {
    const res = targetResult || activeStudentResult;
    if (!res) {
      alert('કૃપા કરીને વિદ્યાર્થી પસંદ કરો.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('પ્રિન્ટ કરવા માટે પોપઅપ વિન્ડોને મંજૂરી આપો.');
      return;
    }

    const marksRows = res.subjectScores
      .map((sc, idx) => {
        let displayTotal = `${sc.total100}`;
        if (sc.siddhiMarksGiven > 0 && sc.krupaMarksGiven > 0) {
          displayTotal = `${sc.total100} + <span style="color:#047857;">${sc.siddhiMarksGiven}#</span> + <span style="color:#b45309;">${sc.krupaMarksGiven}*</span> = 33`;
        } else if (sc.siddhiMarksGiven > 0) {
          displayTotal = `${sc.total100} + <span style="color:#047857;">${sc.siddhiMarksGiven}#</span> = 33`;
        } else if (sc.krupaMarksGiven > 0) {
          displayTotal = `${sc.total100} + <span style="color:#b45309;">${sc.krupaMarksGiven}*</span> = 33`;
        }

        return `
        <tr>
          <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: left;">
            ${sc.subjectNameGu}
            <div style="font-size: 8pt; color: #555; font-weight: normal;">${sc.subjectNameEn}</div>
          </td>
          <!-- 1. Pratham 50M -> 10M -->
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">
            ${sc.prathamAbsent ? 'AB' : sc.prathamRaw !== null ? sc.prathamRaw : '-'}
            <div style="font-size: 8pt; color: #1e3a8a; font-weight: bold;">(${sc.prathamWeighted})</div>
          </td>
          <!-- 2. Dwitiya 50M -> 10M -->
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">
            ${sc.dwitiyaAbsent ? 'AB' : sc.dwitiyaRaw !== null ? sc.dwitiyaRaw : '-'}
            <div style="font-size: 8pt; color: #1e3a8a; font-weight: bold;">(${sc.dwitiyaWeighted})</div>
          </td>
          <!-- 3. Varshik 80M -> 60M -->
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">
            ${sc.varshikAbsent ? 'AB' : sc.varshikRaw !== null ? sc.varshikRaw : '-'}
            <div style="font-size: 8pt; color: #1e3a8a; font-weight: bold;">(${sc.varshikWeighted})</div>
          </td>
          <!-- 4. Internal 20M -->
          <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">
            ${sc.internalAbsent ? 'AB' : sc.internalRaw !== null ? sc.internalRaw : '-'}
          </td>
          <!-- 5. Total 100M -->
          <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: 800; font-size: 11pt; background: #f8fafc;">
            ${displayTotal}
          </td>
          <!-- 6. Grade -->
          <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: 800;">
            ${sc.grade}
          </td>
        </tr>
      `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${school.schoolName} - પ્રગતિ પત્રક (${res.student.studentName})</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body {
            font-family: 'Anek Gujarati', system-ui, sans-serif;
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 8px;
          }
          .border-frame {
            border: 2px solid #000;
            border-radius: 6px;
            padding: 16px 18px;
            min-height: 98%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .school-header-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 2px;
          }
          .school-logo-img {
            width: 46px;
            height: 46px;
            object-fit: contain;
            border-radius: 4px;
          }
          .school-title {
            font-size: 19pt;
            font-weight: 800;
            margin: 0;
            color: #1e3a8a;
            text-transform: uppercase;
          }
          .school-meta {
            font-size: 10pt;
            color: #334155;
            margin-top: 2px;
          }
          .card-badge {
            display: inline-block;
            background: #1e3a8a;
            color: white;
            font-size: 12pt;
            font-weight: 800;
            padding: 3px 20px;
            border-radius: 5px;
            margin-top: 6px;
          }
          .student-meta-box {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px 10px;
            background: #f8fafc;
            border: 1.5px solid #000;
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            font-size: 9.5pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
            margin-bottom: 10px;
          }
          th {
            border: 1px solid #000;
            background-color: #f1f5f9;
            padding: 5px;
            font-weight: 800;
            text-align: center;
          }
          .summary-card {
            border: 2px solid #000;
            background: #f8fafc;
            border-radius: 6px;
            padding: 10px 14px;
            margin-top: 8px;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            text-align: center;
          }
          .sum-val {
            font-size: 13pt;
            font-weight: 800;
            color: #1e3a8a;
            margin-top: 2px;
          }
          .sum-lbl {
            font-size: 8.5pt;
            color: #475569;
            font-weight: bold;
          }
          .grading-scale-info {
            margin-top: 8px;
            border: 1px dashed #64748b;
            padding: 5px 8px;
            border-radius: 5px;
            font-size: 7.5pt;
            color: #334155;
            display: flex;
            justify-content: space-between;
          }
          .signatures {
            margin-top: 35px;
            display: flex;
            justify-content: space-between;
            font-size: 9.5pt;
            font-weight: 700;
            padding: 0 15px;
          }
          .sig-line {
            border-top: 1.5px dashed #000;
            padding-top: 5px;
            width: 160px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="border-frame">
          <div>
            <!-- School Header -->
            <div class="header">
              <div class="school-header-row">
                ${school.logoUrl ? `<img src="${school.logoUrl}" alt="School Logo" class="school-logo-img" />` : ''}
                <h1 class="school-title">${school.schoolName}</h1>
              </div>
              <div class="school-meta">
                ${school.village ? school.village + ', ' : ''}${school.taluka ? school.taluka + ', ' : ''}${school.district} • DISE કોડ: <strong>${school.diseCode}</strong>
              </div>
              <div class="card-badge">
                વાર્ષિક પ્રગતિ પત્રક (ANNUAL PROGRESS REPORT) • ધોરણ ${selectedStandard} • શૈક્ષણિક વર્ષ ૨૦૨૬–૨૭
              </div>
            </div>

            <!-- Student Master Details -->
            <div class="student-meta-box">
              <div>G.R. નંબર: <strong>${res.student.grNumber || '-'}</strong></div>
              <div>રોલ નંબર: <strong>${res.student.rollNumber || '-'}</strong></div>
              <div>ધોરણ & વર્ગ: <strong>${selectedStandard} (${res.student.section || res.student.division || 'A'})</strong></div>
              <div style="grid-column: span 2;">વિદ્યાર્થીનું નામ: <strong>${res.student.studentName}</strong></div>
              <div>જન્મ તારીખ: <strong>${res.student.dob || '-'}</strong></div>
            </div>

            <!-- Marks Matrix Table -->
            <table>
              <thead>
                <tr>
                  <th style="width: 35px;">ક્રમ</th>
                  <th style="text-align: left;">વિષયનું નામ</th>
                  <th style="width: 85px;">
                    પ્રથમ કસોટી
                    <div style="font-size: 7pt; font-weight: normal;">(૫૦ → ૧૦)</div>
                  </th>
                  <th style="width: 85px;">
                    દ્વિતીય કસોટી
                    <div style="font-size: 7pt; font-weight: normal;">(૫૦ → ૧૦)</div>
                  </th>
                  <th style="width: 85px;">
                    વાર્ષિક કસોટી
                    <div style="font-size: 7pt; font-weight: normal;">(૮૦ → ૬૦)</div>
                  </th>
                  <th style="width: 75px;">
                    આંતરિક
                    <div style="font-size: 7pt; font-weight: normal;">(૨૦ માંથી)</div>
                  </th>
                  <th style="width: 100px;">
                    કુલ ગુણ
                    <div style="font-size: 7pt; font-weight: normal;">(૧૦૦ માંથી)</div>
                  </th>
                  <th style="width: 55px;">ગ્રેડ</th>
                </tr>
              </thead>
              <tbody>
                ${marksRows}
              </tbody>
            </table>

            <!-- Summary Results Card -->
            <div class="summary-card">
              <div>
                <div class="sum-lbl">કુલ મેળવેલ ગુણ</div>
                <div class="sum-val">${res.totalObtained} / ${res.totalMax}</div>
              </div>
              <div>
                <div class="sum-lbl">ટકાવારી (Percentage)</div>
                <div class="sum-val">${res.percentage}%</div>
              </div>
              <div>
                <div class="sum-lbl">એકંદર ગ્રેડ (Grade)</div>
                <div class="sum-val">${res.overallGrade}</div>
              </div>
              <div>
                <div class="sum-lbl">પરિણામ સ્થિતિ</div>
                <div class="sum-val" style="color: ${
                  res.resultStatus === 'PASS'
                    ? '#047857'
                    : res.resultStatus === 'PASS_WITH_SIDDHI'
                    ? '#059669'
                    : res.resultStatus === 'PASS_WITH_KRUPA'
                    ? '#b45309'
                    : '#b91c1c'
                }; font-size: 10pt;">
                  ${
                    res.resultStatus === 'PASS'
                      ? 'ઉત્તીર્ણ'
                      : res.resultStatus === 'PASS_WITH_SIDDHI'
                      ? `સિદ્ધિ (${res.totalSiddhiGiven}#)`
                      : res.resultStatus === 'PASS_WITH_KRUPA'
                      ? `કૃપા (${res.totalKrupaGiven}*)`
                      : 'સુધારણા જરૂરી'
                  }
                </div>
              </div>
              <div>
                <div class="sum-lbl">વર્ગમાં ક્રમાંક (Rank)</div>
                <div class="sum-val">${res.rankInClass ? `#${res.rankInClass}` : '-'}</div>
              </div>
            </div>

            <!-- Grade scale reference & Notes -->
            <div class="grading-scale-info">
              <span><strong>ગ્રેડ સ્કેલ:</strong> 91-100: A1 | 81-90: A2 | 71-80: B1 | 61-70: B2 | 51-60: C1 | 41-50: C2 | 33-40: D | 21-32: E1 (સુધારણા)</span>
              <span># = સિદ્ધિ ગુણ (રેન્ક પાત્ર) | * = કૃપા ગુણ (આચાર્ય ક્વોટા)</span>
            </div>
          </div>

          <!-- Signatures -->
          <div class="signatures">
            <div class="sig-line">વર્ગ શિક્ષકની સહી</div>
            <div class="sig-line">પરીક્ષા પ્રમુખશ્રીની સહી</div>
            <div class="sig-line">આચાર્યશ્રીની સહી અને સિક્કો</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-3xl border border-white/10 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-[#e4ded6] hover:text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 mt-1"
              title="પાછળના મેનુ પર જાઓ (Go Back)"
            >
              <ArrowLeft className="w-5 h-5 text-[#f59c73]" />
            </button>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#9d512d]/25 text-[#f59c73] border border-[#9d512d]/40 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ઓટોમેટેડ રિઝલ્ટ કેલ્ક્યુલેટર • GSEB વાર્ષિક પરિણામ ફોર્મ્યુલા</span>
              </div>
              <h2 className="text-2xl font-black text-[#e4ded6] tracking-tight">
                વાર્ષિક પરિણામ અને પ્રગતિ પત્રક કેન્દ્ર
              </h2>
              <p className="text-xs text-[#a99f91] mt-1 max-w-2xl leading-relaxed">
                પ્રથમ (10%), દ્વિતીય (10%), વાર્ષિક (60%) અને આંતરિક (20%) ગુણભાર મુજબ 100 ગુણમાં રૂપાંતર. ગુજરાત બોર્ડના સત્તાવાર નિયમો મુજબ સિદ્ધિ ગુણ (#) અને આચાર્યશ્રી કૃપા ગુણ (*) ની સચોટ ગણતરી.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRulesModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-card text-xs font-bold text-amber-300 hover:text-white border-amber-500/30 hover:border-amber-500 transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>સિદ્ધિ/કૃપા ગુણના નિયમો</span>
            </button>

            {/* Standard Selector */}
            <div className="flex items-center gap-2">
              {(['9', '10', '11'] as AllowedStandard[]).map((std) => (
                <button
                  key={std}
                  onClick={() => {
                    setSelectedStandard(std);
                    setSelectedStudentId('');
                  }}
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

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <div className="text-[11px] text-[#a99f91] font-bold">કુલ વિદ્યાર્થીઓ</div>
          <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">ધોરણ {selectedStandard}</div>
        </div>

        <div className="glass-card rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-[11px] text-emerald-400 font-bold">સીધા ઉત્તીર્ણ (Direct)</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats.directPassCount}</div>
          <div className="text-[10px] text-emerald-500 mt-0.5">કોઈ ગ્રેસ વગર પાસ</div>
        </div>

        <div className="glass-card rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
          <div className="text-[11px] text-teal-400 font-bold">સિદ્ધિ ગુણ (#)</div>
          <div className="text-2xl font-black text-teal-300 mt-1">{stats.siddhiCount}</div>
          <div className="text-[10px] text-teal-400 mt-0.5">રેન્ક માટે પાત્ર (1-15M)</div>
        </div>

        <div className="glass-card rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="text-[11px] text-amber-400 font-bold">કૃપા ગુણ (*)</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{stats.krupaCount}</div>
          <div className="text-[10px] text-amber-500 mt-0.5">આચાર્ય ક્વોટા (1-10M)</div>
        </div>

        <div className="glass-card rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="text-[11px] text-red-400 font-bold">સુધારણા જરૂરી</div>
          <div className="text-2xl font-black text-red-400 mt-1">{stats.failCount}</div>
          <div className="text-[10px] text-red-500 mt-0.5">પુનઃપરીક્ષા પાત્ર</div>
        </div>

        <div className="glass-card rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="text-[11px] text-blue-400 font-bold">પરિણામ ટકાવારી</div>
          <div className="text-2xl font-black text-blue-400 mt-1">{stats.passPct}%</div>
          <div className="text-[10px] text-blue-500 mt-0.5">સર્વોચ્ચ: {stats.highestPct}%</div>
        </div>
      </div>

      {/* Grade Distribution Pill Strip */}
      <div className="glass-card rounded-2xl border border-white/10 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-[#a99f91] flex items-center gap-1.5">
          <Award className="w-4 h-4 text-[#f59c73]" />
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
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : gr.startsWith('B')
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      : gr.startsWith('C') || gr === 'D'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'bg-red-500/15 border-red-500/30 text-red-400'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
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
        {/* Toggle between Gazette and Individual Progress Card */}
        <div className="flex gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setViewMode('gazette')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'gazette'
                ? 'bg-[#9d512d] text-white shadow'
                : 'text-[#a99f91] hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>સંકલિત પરિણામ ગેઝેટ (Class Gazette)</span>
          </button>

          <button
            onClick={() => setViewMode('progress_card')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'progress_card'
                ? 'bg-[#9d512d] text-white shadow'
                : 'text-[#a99f91] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>વ્યક્તિગત પ્રગતિ પત્રક (Progress Card)</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSendResultModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            title="વાલીઓને વ્યક્તિગત પરીક્ષા પરિણામ WhatsApp / SMS દ્વારા મોકલો"
          >
            <Send className="w-3.5 h-3.5" />
            <span>વાલીઓને પરિણામ મોકલો 🚀</span>
          </button>

          {onNavigateToMarks && (
            <button
              onClick={onNavigateToMarks}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-xs font-bold text-[#f59c73] hover:text-white transition-all cursor-pointer border-[#9d512d]/40"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>ગુણ દાખલ કરો (Mark Entry)</span>
            </button>
          )}

          {viewMode === 'gazette' ? (
            <>
              <button
                onClick={handleExportGazetteExcel}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-xs font-bold text-emerald-400 hover:text-white transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>એક્સેલ ડાઉનલોડ (.xlsx)</span>
              </button>
              <button
                onClick={handlePrintGazette}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9d512d] hover:bg-[#864424] text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>ગેઝેટ પ્રિન્ટ કરો (A4 Landscape)</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handlePrintStudentCard()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#9d512d] hover:bg-[#864424] text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>પ્રગતિ પત્રક પ્રિન્ટ (A4 Portrait)</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: GAZETTE (Class Master Marksheet Matrix) */}
      {viewMode === 'gazette' && (
        <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Table Search & Filter Bar */}
          <div className="p-4 bg-slate-900/80 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="નામ, રોલ નંબર અથવા G.R. નંબરથી શોધો..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f59c73]"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 mr-1 text-[11px]">સ્થિતિ:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-[#9d512d] text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                બધા ({classResults.length})
              </button>
              <button
                onClick={() => setStatusFilter('PASS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'PASS'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                સીધા પાસ ({stats.directPassCount})
              </button>
              <button
                onClick={() => setStatusFilter('PASS_WITH_SIDDHI')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'PASS_WITH_SIDDHI'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                સિદ્ધિ (#) ({stats.siddhiCount})
              </button>
              <button
                onClick={() => setStatusFilter('PASS_WITH_KRUPA')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'PASS_WITH_KRUPA'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                કૃપા (*) ({stats.krupaCount})
              </button>
              <button
                onClick={() => setStatusFilter('FAIL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'FAIL'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                સુધારણા ({stats.failCount})
              </button>
            </div>
          </div>

          {/* Mobile Horizontal Scroll Tip */}
          <div className="sm:hidden px-3.5 py-2 bg-slate-950/90 text-[11px] text-[#f59c73] flex items-center justify-between border-b border-white/5">
            <span className="font-semibold">📱 મોબાઇલ ટિપ: વિષયવાર ગુણ અને પરિણામ જોવા ડાબે-જમણે સ્ક્રોલ કરો</span>
            <span className="text-[10px] text-slate-400 font-mono">↔️ Swipe</span>
          </div>

          {/* Master Table */}
          <div className="overflow-x-auto mobile-table-scroll max-h-[620px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-[#a99f91] sticky top-0 z-10 shadow border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 text-center w-12">રોલ</th>
                  <th className="py-3 px-3 w-24">G.R. નં</th>
                  <th className="py-3 px-4 min-w-[160px]">વિદ્યાર્થીનું નામ</th>
                  {subjects.map((sub) => (
                    <th key={sub.id} className="py-3 px-3 text-center min-w-[75px]">
                      <div className="font-bold text-white">{sub.nameGu.split(' ')[0]}</div>
                      <div className="text-[10px] text-slate-500 font-normal">(૧૦૦ ગુણ)</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-24">કુલ ગુણ</th>
                  <th className="py-3 px-3 text-center w-16">ટકા</th>
                  <th className="py-3 px-3 text-center w-16">ગ્રેડ</th>
                  <th className="py-3 px-3 text-center w-32">પરિણામ</th>
                  <th className="py-3 px-3 text-center w-16">ક્રમ</th>
                  <th className="py-3 px-3 text-center w-16">ક્રિયા</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={subjects.length + 7} className="py-12 text-center text-slate-400">
                      કોઈ વિદ્યાર્થી મળ્યા નથી.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((r, idx) => (
                    <tr key={r.student.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 text-center font-bold text-white">
                        {r.student.rollNumber || idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#f59c73]">
                        {r.student.grNumber || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white">
                        {r.student.studentName}
                      </td>
                      {/* Each Subject Marks */}
                      {r.subjectScores.map((sc) => (
                        <td key={sc.subjectId} className="py-2 px-3 text-center">
                          <div className="font-extrabold text-sm text-white">
                            {sc.siddhiMarksGiven > 0 && sc.krupaMarksGiven > 0 ? (
                              <span>
                                {sc.total100}
                                <span className="text-teal-400 text-xs">+{sc.siddhiMarksGiven}#</span>
                                <span className="text-amber-400 text-xs">+{sc.krupaMarksGiven}*</span>
                              </span>
                            ) : sc.siddhiMarksGiven > 0 ? (
                              <span>
                                {sc.total100}
                                <span className="text-teal-400 text-xs">+{sc.siddhiMarksGiven}#</span>
                              </span>
                            ) : sc.krupaMarksGiven > 0 ? (
                              <span>
                                {sc.total100}
                                <span className="text-amber-400 text-xs">+{sc.krupaMarksGiven}*</span>
                              </span>
                            ) : (
                              <span className={sc.needsReExam ? 'text-red-400 font-bold' : ''}>
                                {sc.total100}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[10px] font-bold ${
                              sc.grade.startsWith('A')
                                ? 'text-emerald-400'
                                : sc.grade.startsWith('B')
                                ? 'text-blue-400'
                                : sc.grade.startsWith('C') || sc.grade === 'D'
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          >
                            {sc.grade}
                          </div>
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-center font-black text-white">
                        {r.totalObtained}/{r.totalMax}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-[#f59c73]">
                        {r.percentage}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {r.overallGrade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold">
                        {r.resultStatus === 'PASS' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            ઉત્તીર્ણ
                          </span>
                        ) : r.resultStatus === 'PASS_WITH_SIDDHI' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30" title="સિદ્ધિ ગુણ (રેન્ક પાત્ર)">
                            સિદ્ધિ ({r.totalSiddhiGiven}#)
                          </span>
                        ) : r.resultStatus === 'PASS_WITH_KRUPA' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30" title="કૃપા ગુણ (આચાર્ય ક્વોટા)">
                            કૃપા ({r.totalKrupaGiven}*)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                            સુધારણા ({r.failedSubjectsCount})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-300">
                        {r.rankInClass ? `#${r.rankInClass}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedStudentId(r.student.id);
                            setViewMode('progress_card');
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-[#9d512d] text-slate-300 hover:text-white transition-colors cursor-pointer"
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

          {/* Quick Legend at bottom of table */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <span><strong>સંકેતો:</strong></span>
              <span className="text-teal-400 font-bold"># = સિદ્ધિ ગુણ (33% થી ઉપરના ટકા દીઠ 1M, મહત્તમ 15M - રેન્ક પાત્ર)</span>
              <span className="text-amber-400 font-bold">* = કૃપા ગુણ (આચાર્યશ્રી ક્વોટા મહત્તમ 10M - રેન્ક અપાતો નથી)</span>
              <span className="text-slate-300">નિયમ: વિષયમાં લઘુત્તમ 25% ગુણ હોવા જરૂરી</span>
            </div>
            <span>કુલ ગુણમાં સિદ્ધિ/કૃપા ગુણ ઉમેરાતા નથી</span>
          </div>
        </div>
      )}

      {/* VIEW 2: INDIVIDUAL STUDENT PROGRESS REPORT CARD */}
      {viewMode === 'progress_card' && activeStudentResult && (
        <div className="space-y-4">
          {/* Student Selector Carousel Bar */}
          <div className="glass-card rounded-2xl border border-white/10 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#a99f91]">વિદ્યાર્થી પસંદ કરો:</span>
              <select
                value={activeStudentResult.student.id}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-[#f59c73]"
              >
                {classResults.map((r) => (
                  <option key={r.student.id} value={r.student.id}>
                    Roll {r.student.rollNumber || '-'} • {r.student.studentName} (GR: {r.student.grNumber || '-'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const currIdx = classResults.findIndex((r) => r.student.id === activeStudentResult.student.id);
                  if (currIdx > 0) {
                    setSelectedStudentId(classResults[currIdx - 1].student.id);
                  }
                }}
                disabled={classResults.findIndex((r) => r.student.id === activeStudentResult.student.id) === 0}
                className="p-2 rounded-xl glass-card text-white hover:text-[#f59c73] transition-colors cursor-pointer disabled:opacity-40"
                title="પાછલો વિદ્યાર્થી"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const currIdx = classResults.findIndex((r) => r.student.id === activeStudentResult.student.id);
                  if (currIdx < classResults.length - 1) {
                    setSelectedStudentId(classResults[currIdx + 1].student.id);
                  }
                }}
                disabled={classResults.findIndex((r) => r.student.id === activeStudentResult.student.id) === classResults.length - 1}
                className="p-2 rounded-xl glass-card text-white hover:text-[#f59c73] transition-colors cursor-pointer disabled:opacity-40"
                title="આગલો વિદ્યાર્થી"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Realistic Official Report Card Preview */}
          <div className="max-w-4xl mx-auto bg-white text-slate-900 p-8 rounded-2xl shadow-2xl border-2 border-slate-900 space-y-6">
            {/* School Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4">
              <h1 className="text-2xl font-black text-blue-900 tracking-wide uppercase">
                {school.schoolName}
              </h1>
              <div className="text-xs text-slate-600 mt-1 font-semibold">
                {school.village ? `${school.village}, ` : ''}{school.taluka ? `${school.taluka}, ` : ''}{school.district} • શાળા DISE કોડ: <strong>{school.diseCode}</strong>
              </div>
              <div className="inline-block mt-2 px-5 py-1 rounded bg-blue-900 text-white font-extrabold text-sm tracking-wide">
                વાર્ષિક પ્રગતિ પત્રક (ANNUAL PROGRESS REPORT) • ધોરણ {selectedStandard} • શૈક્ષણિક વર્ષ ૨૦૨૬–૨૭
              </div>
            </div>

            {/* Student Metadata Box */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-900 p-3.5 rounded-lg text-xs font-semibold">
              <div>
                G.R. નંબર: <strong className="text-blue-900 font-mono text-sm">{activeStudentResult.student.grNumber || '-'}</strong>
              </div>
              <div>
                રોલ નંબર: <strong className="text-blue-900 font-bold text-sm">{activeStudentResult.student.rollNumber || '-'}</strong>
              </div>
              <div>
                ધોરણ & વર્ગ: <strong>{selectedStandard} ({activeStudentResult.student.section || activeStudentResult.student.division || 'A'})</strong>
              </div>
              <div className="col-span-2">
                વિદ્યાર્થીનું નામ: <strong className="text-sm font-black text-slate-900">{activeStudentResult.student.studentName}</strong>
              </div>
              <div>
                જન્મ તારીખ: <strong>{activeStudentResult.student.dob || '-'}</strong>
              </div>
            </div>

            {/* Detailed 4-Component Examination Table */}
            <div className="overflow-x-auto border border-slate-900 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 border-b border-slate-900">
                    <th className="py-2.5 px-3 border-r border-slate-900 w-10 text-center">ક્રમ</th>
                    <th className="py-2.5 px-3 border-r border-slate-900">વિષયનું નામ</th>
                    <th className="py-2.5 px-2 border-r border-slate-900 text-center w-24">
                      પ્રથમ પરીક્ષા
                      <div className="text-[10px] text-slate-500 font-normal">(૫૦ માંથી → ૧૦)</div>
                    </th>
                    <th className="py-2.5 px-2 border-r border-slate-900 text-center w-24">
                      દ્વિતીય પરીક્ષા
                      <div className="text-[10px] text-slate-500 font-normal">(૫૦ માંથી → ૧૦)</div>
                    </th>
                    <th className="py-2.5 px-2 border-r border-slate-900 text-center w-24">
                      વાર્ષિક પરીક્ષા
                      <div className="text-[10px] text-slate-500 font-normal">(૮૦ માંથી → ૬૦)</div>
                    </th>
                    <th className="py-2.5 px-2 border-r border-slate-900 text-center w-20">
                      આંતરિક
                      <div className="text-[10px] text-slate-500 font-normal">(૨૦ માંથી)</div>
                    </th>
                    <th className="py-2.5 px-2 border-r border-slate-900 text-center w-28 bg-blue-50 font-black">
                      કુલ ગુણ
                      <div className="text-[10px] text-blue-900 font-normal">(૧૦૦ માંથી)</div>
                    </th>
                    <th className="py-2.5 px-2 text-center w-16 font-bold">ગ્રેડ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {activeStudentResult.subjectScores.map((sc, idx) => (
                    <tr key={sc.subjectId} className="hover:bg-slate-50">
                      <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-slate-300 font-bold">
                        {sc.subjectNameGu}
                        <div className="text-[10px] text-slate-500 font-normal">{sc.subjectNameEn}</div>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 text-center">
                        {sc.prathamAbsent ? 'AB' : sc.prathamRaw !== null ? sc.prathamRaw : '-'}
                        <div className="text-[10px] text-blue-900 font-bold">({sc.prathamWeighted})</div>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 text-center">
                        {sc.dwitiyaAbsent ? 'AB' : sc.dwitiyaRaw !== null ? sc.dwitiyaRaw : '-'}
                        <div className="text-[10px] text-blue-900 font-bold">({sc.dwitiyaWeighted})</div>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 text-center">
                        {sc.varshikAbsent ? 'AB' : sc.varshikRaw !== null ? sc.varshikRaw : '-'}
                        <div className="text-[10px] text-blue-900 font-bold">({sc.varshikWeighted})</div>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 text-center font-bold">
                        {sc.internalAbsent ? 'AB' : sc.internalRaw !== null ? sc.internalRaw : '-'}
                      </td>
                      <td className="py-2 px-2 border-r border-slate-300 text-center font-black text-sm bg-blue-50/50">
                        {sc.siddhiMarksGiven > 0 && sc.krupaMarksGiven > 0 ? (
                          <span>
                            {sc.total100} + <span className="text-teal-700 font-bold">{sc.siddhiMarksGiven}#</span> + <span className="text-amber-700 font-bold">{sc.krupaMarksGiven}*</span> = 33
                          </span>
                        ) : sc.siddhiMarksGiven > 0 ? (
                          <span>
                            {sc.total100} + <span className="text-teal-700 font-bold">{sc.siddhiMarksGiven}#</span> = 33
                          </span>
                        ) : sc.krupaMarksGiven > 0 ? (
                          <span>
                            {sc.total100} + <span className="text-amber-700 font-bold">{sc.krupaMarksGiven}*</span> = 33
                          </span>
                        ) : (
                          <span className={sc.needsReExam ? 'text-red-700' : ''}>{sc.total100}</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-xs text-blue-900">{sc.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Results Summary Box */}
            <div className="grid grid-cols-5 gap-3 border-2 border-slate-900 p-4 rounded-lg bg-slate-50 text-center">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">કુલ મેળવેલ ગુણ</div>
                <div className="text-xl font-black text-blue-900 mt-0.5">
                  {activeStudentResult.totalObtained} / {activeStudentResult.totalMax}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">ટકાવારી (%)</div>
                <div className="text-xl font-black text-blue-900 mt-0.5">
                  {activeStudentResult.percentage}%
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">એકંદર ગ્રેડ</div>
                <div className="text-xl font-black text-blue-900 mt-0.5">
                  {activeStudentResult.overallGrade}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">પરિણામ સ્થિતિ</div>
                <div
                  className={`text-xs font-black mt-1 ${
                    activeStudentResult.resultStatus === 'PASS'
                      ? 'text-emerald-700'
                      : activeStudentResult.resultStatus === 'PASS_WITH_SIDDHI'
                      ? 'text-teal-700'
                      : activeStudentResult.resultStatus === 'PASS_WITH_KRUPA'
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}
                >
                  {activeStudentResult.resultStatusGu}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">વર્ગમાં ક્રમાંક</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {activeStudentResult.rankInClass ? `#${activeStudentResult.rankInClass}` : '-'}
                </div>
              </div>
            </div>

            {/* Notes & Grade scale */}
            <div className="border border-dashed border-slate-400 p-2.5 rounded text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span><strong>ગ્રેડ માપદંડ:</strong> 91-100: A1 | 81-90: A2 | 71-80: B1 | 61-70: B2 | 51-60: C1 | 41-50: C2 | 33-40: D | 21-32: E1</span>
                <span><strong>પાસ ગુણ:</strong> ૩૩%</span>
              </div>
              <div className="text-[10px] text-slate-500">
                • <strong># (સિદ્ધિ ગુણ):</strong> એકંદરે ૩૩% ઉપરના ટકા દીઠ ૧ ગુણ (મહત્તમ ૧૫ ગુણ) • રેન્ક પાત્ર.
                <br />
                • <strong>* (કૃપા ગુણ):</strong> આચાર્યશ્રી દ્વારા વધુમાં વધુ ૧૦ ગુણ સુધી • રેન્ક અપાતો નથી.
                <br />
                • શરત: જે વિષયમાં ઓછામાં ઓછા ૨૫% ગુણ મેળવેલ હોય તેમાં જ સિદ્ધિ/કૃપા ગુણ મળવાપાત્ર છે.
              </div>
            </div>

            {/* Signatures */}
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

      {/* GSEB Official Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-2xl w-full p-6 text-white space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">GSEB પરિણામ, સિદ્ધિ અને કૃપા ગુણના નિયમો</h3>
                  <p className="text-xs text-slate-400">ગુજરાત માધ્યમિક અને ઉચ્ચતર માધ્યમિક શિક્ષણ બોર્ડ (ધોરણ ૯ અને ૧૧)</p>
                </div>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-300 max-h-[460px] overflow-y-auto pr-2">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <h4 className="font-bold text-[#f59c73] text-sm mb-1.5">૧. વાર્ષિક પરિણામ ગુણભાર (Weightage Formula)</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong>પ્રથમ સત્રાંત પરીક્ષા (૫૦ ગુણ):</strong> ૧૦% ગુણભાર (મેળવેલ ગુણ / ૫)</li>
                  <li><strong>દ્વિતીય સત્રાંત પરીક્ષા (૫૦ ગુણ):</strong> ૧૦% ગુણભાર (મેળવેલ ગુણ / ૫)</li>
                  <li><strong>વાર્ષિક પરીક્ષા (૮૦ ગુણ):</strong> ૬૦% ગુણભાર (મેળવેલ ગુણ / ૮૦ × ૬૦)</li>
                  <li><strong>આંતરિક મૂલ્યાંકન (૨૦ ગુણ):</strong> ૨૦% ગુણભાર (મેળવેલ ગુણ સીધા ઉમેરાય)</li>
                  <li><strong>વાર્ષિક કુલ ગુણ:</strong> ૧૦ + ૧૦ + ૬૦ + ૨૦ = ૧૦૦ ગુણ</li>
                </ul>
              </div>

              <div className="bg-teal-950/40 p-3.5 rounded-xl border border-teal-500/30">
                <h4 className="font-bold text-teal-300 text-sm mb-1.5">૨. સિદ્ધિ ગુણ (Siddhi Marks - #) ના નિયમો</h4>
                <ul className="list-disc list-inside space-y-1 text-teal-100">
                  <li>જો વિદ્યાર્થીને એકંદરે ૩૩% થી વધુ ગુણ મળ્યા હોય, તો ૩૩% થી ઉપરના <strong>દરેક ટકા દીઠ ૧ ગુણ</strong>, વધુમાં વધુ <strong>૧૫ ગુણની મર્યાદામાં</strong> સિદ્ધિ ગુણ મળે છે.</li>
                  <li>સૂત્ર: <code className="bg-black/40 px-1.5 py-0.5 rounded text-teal-300">Siddhi Pool = Min(15, Floor(Overall Percentage - 33))</code></li>
                  <li><strong>રેન્ક પાત્રતા:</strong> સિદ્ધિ ગુણ મેળવનાર વિદ્યાર્થીઓ વર્ગમાં <strong>રેન્ક (Rank) મેળવવા માટે પાત્ર ગણાય છે</strong>.</li>
                  <li>સિદ્ધિ ગુણ પરિણામ પત્રકમાં <strong>#</strong> ચિહ્ન સાથે અલગથી દર્શાવાય છે.</li>
                </ul>
              </div>

              <div className="bg-amber-950/40 p-3.5 rounded-xl border border-amber-500/30">
                <h4 className="font-bold text-amber-300 text-sm mb-1.5">૩. કૃપા ગુણ (Grace Marks - *) ના નિયમો</h4>
                <ul className="list-disc list-inside space-y-1 text-amber-100">
                  <li>સિદ્ધિ ગુણ વાપર્યા પછી પણ જો વિદ્યાર્થી કોઈ વિષયમાં નાપાસ થતો હોય, તો આચાર્યશ્રી દ્વારા <strong>કુલ ૧૦ ગુણની મર્યાદામાં</strong> કૃપા ગુણ આપી શકાય છે.</li>
                  <li><strong>રેન્ક અપાત્રતા:</strong> કૃપા ગુણ મેળવનાર વિદ્યાર્થીઓ વર્ગમાં <strong>રેન્ક (Rank) મેળવવા માટે પાત્ર રહેતા નથી</strong> (રેન્ક સ્થાને '-' દર્શાવાય છે).</li>
                  <li>કૃપા ગુણ પરિણામ પત્રકમાં <strong>*</strong> ચિહ્ન સાથે અલગથી દર્શાવાય છે.</li>
                </ul>
              </div>

              <div className="bg-red-950/40 p-3.5 rounded-xl border border-red-500/30">
                <h4 className="font-bold text-red-300 text-sm mb-1.5">૪. ૨૫% લઘુત્તમ શરત અને પુનઃપરીક્ષા (Re-examination)</h4>
                <ul className="list-disc list-inside space-y-1 text-red-100">
                  <li>સિદ્ધિ ગુણ કે કૃપા ગુણ મેળવવા માટે વિદ્યાર્થીએ સંબંધિત વિષયમાં <strong>ઓછામાં ઓછા ૨૫% ગુણ (૨૫ ગુણ)</strong> મેળવેલા હોવા જરૂરી છે. ૨૫ થી ઓછા ગુણ હોય તો સિદ્ધિ કે કૃપા ગુણ આપી શકાતા નથી.</li>
                  <li>સિદ્ધિ અને કૃપા ગુણ બંને વિદ્યાર્થીના કુલ ગુણના સરવાળામાં ઉમેરાતા નથી.</li>
                  <li>ગ્રેસિંગ પછી પણ પાસ ન થનાર વિદ્યાર્થીએ શાળા કક્ષાએ પુનઃપરીક્ષા (પૂરક પરીક્ષા) આપવાની રહેશે.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-5 py-2 rounded-xl bg-[#9d512d] hover:bg-[#864424] text-white text-xs font-bold transition-all cursor-pointer"
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
          initialStandard={selectedStandard}
        />
      )}
    </div>
  );
};
