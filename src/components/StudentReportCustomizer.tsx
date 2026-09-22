import React, { useState, useMemo } from 'react';
import { School, Student } from '../types';
import { getStudentDiseCode } from '../utils/idCardPdf';
import {
  FileText,
  Printer,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Filter,
  Users,
  Building2,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface StudentColumnDef {
  id: string;
  label: string;
  getValue: (s: Student, school: School, index: number) => string;
  defaultSelected: boolean;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
}

const ALL_STUDENT_COLUMNS: StudentColumnDef[] = [
  {
    id: 'sr',
    label: 'અ.નં.',
    getValue: (_s, _sch, idx) => String(idx + 1),
    defaultSelected: true,
    minWidth: '28px',
    align: 'center',
  },
  {
    id: 'grNumber',
    label: 'G.R. નં.',
    getValue: (s) => s.grNumber || '-',
    defaultSelected: true,
    minWidth: '45px',
    align: 'center',
  },
  {
    id: 'studentName',
    label: 'વિદ્યાર્થીનું પૂરું નામ',
    getValue: (s) => s.studentName || '-',
    defaultSelected: true,
    minWidth: '130px',
    align: 'left',
  },
  {
    id: 'standard',
    label: 'ધોરણ',
    getValue: (s) => String(s.standard || '-'),
    defaultSelected: true,
    minWidth: '35px',
    align: 'center',
  },
  {
    id: 'section',
    label: 'વર્ગ/વિભાગ',
    getValue: (s) => s.section || s.division || '-',
    defaultSelected: true,
    minWidth: '40px',
    align: 'center',
  },
  {
    id: 'rollNumber',
    label: 'રોલ નં.',
    getValue: (s) => s.rollNumber || '-',
    defaultSelected: true,
    minWidth: '35px',
    align: 'center',
  },
  {
    id: 'gender',
    label: 'જાતિ',
    getValue: (s) => (s.gender === 'Boy' ? 'કુમાર' : s.gender === 'Girl' ? 'કન્યા' : s.gender || '-'),
    defaultSelected: true,
    minWidth: '40px',
    align: 'center',
  },
  {
    id: 'caste',
    label: 'જ્ઞાતિ/કેટેગરી',
    getValue: (s) => s.caste || '-',
    defaultSelected: false,
    minWidth: '55px',
    align: 'center',
  },
  {
    id: 'dob',
    label: 'જન્મ તારીખ (DOB)',
    getValue: (s) => s.dob || '-',
    defaultSelected: true,
    minWidth: '60px',
    align: 'center',
  },
  {
    id: 'doa',
    label: 'પ્રવેશ તારીખ (DOA)',
    getValue: (s) => s.doa || '-',
    defaultSelected: false,
    minWidth: '60px',
    align: 'center',
  },
  {
    id: 'contactNumber',
    label: 'મોબાઇલ નં.',
    getValue: (s) => s.contactNumber || s.mobileNumber || '-',
    defaultSelected: true,
    minWidth: '65px',
    align: 'center',
  },
  {
    id: 'studentDise',
    label: 'વિદ્યાર્થી DISE / Child ID',
    getValue: (s) => getStudentDiseCode(s),
    defaultSelected: false,
    minWidth: '85px',
    align: 'center',
  },
  {
    id: 'fatherName',
    label: 'પિતાનું નામ',
    getValue: (s) => s.fatherName || '-',
    defaultSelected: false,
    minWidth: '90px',
    align: 'left',
  },
  {
    id: 'motherName',
    label: 'માતાનું નામ',
    getValue: (s) => s.motherName || '-',
    defaultSelected: false,
    minWidth: '80px',
    align: 'left',
  },
  {
    id: 'bloodGroup',
    label: 'બ્લડ ગ્રૂપ',
    getValue: (s) => s.bloodGroup || '-',
    defaultSelected: false,
    minWidth: '40px',
    align: 'center',
  },
  {
    id: 'aadhaarNo',
    label: 'આધાર નંબર',
    getValue: (s) => (s.aadhaarNo ? `XXXX-XXXX-${s.aadhaarNo.slice(-4)}` : '-'),
    defaultSelected: false,
    minWidth: '65px',
    align: 'center',
  },
  {
    id: 'address',
    label: 'સરનામું / રહેઠાણ',
    getValue: (s) => s.address || '-',
    defaultSelected: false,
    minWidth: '110px',
    align: 'left',
  },
];

interface StudentReportCustomizerProps {
  school: School;
  students: Student[];
}

export const StudentReportCustomizer: React.FC<StudentReportCustomizerProps> = ({
  school,
  students,
}) => {
  // Column Selection State
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(
    ALL_STUDENT_COLUMNS.filter((col) => col.defaultSelected).map((col) => col.id)
  );

  // Filters
  const [filterStandard, setFilterStandard] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [reportTitle, setReportTitle] = useState<string>('વિદ્યાર્થી યાદી પત્રક');
  const [paperOrientation, setPaperOrientation] = useState<'portrait' | 'landscape'>('auto');

  // Filter available sections
  const availableSections = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const sec = s.section || s.division;
      if (sec && sec.trim()) set.add(sec.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (filterStandard !== 'all' && String(s.standard) !== filterStandard) {
        return false;
      }
      if (filterGender !== 'all' && s.gender !== filterGender) {
        return false;
      }
      if (filterSection !== 'all') {
        const sec = s.section || s.division || '';
        if (sec !== filterSection) return false;
      }
      return true;
    });
  }, [students, filterStandard, filterGender, filterSection]);

  // Toggle Column Selection
  const toggleColumn = (id: string) => {
    setSelectedColumnIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) {
          alert('ઓછામાં ઓછી એક કોલમ પસંદ કરવી ફરજિયાત છે.');
          return prev;
        }
        return prev.filter((colId) => colId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAllColumns = () => {
    setSelectedColumnIds(ALL_STUDENT_COLUMNS.map((c) => c.id));
  };

  const selectEssentialColumns = () => {
    setSelectedColumnIds(ALL_STUDENT_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id));
  };

  // Active columns in ordered sequence
  const activeColumns = useMemo(() => {
    return ALL_STUDENT_COLUMNS.filter((col) => selectedColumnIds.includes(col.id));
  }, [selectedColumnIds]);

  // Determine paper orientation - defaults to portrait unless columns exceed 8
  const calculatedOrientation = useMemo(() => {
    if (paperOrientation !== 'auto') return paperOrientation;
    // Portrait easily accommodates standard 7-8 columns when width is 100% and font/padding are proportional
    return activeColumns.length > 8 ? 'landscape' : 'portrait';
  }, [paperOrientation, activeColumns.length]);

  // Print / PDF Download Handler
  const handlePrintPDF = () => {
    if (filteredStudents.length === 0) {
      alert('પસંદ કરેલ ફિલ્ટર મુજબ કોઈ વિદ્યાર્થી મળ્યા નથી.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('પ્રિન્ટ અથવા PDF ડાઉનલોડ કરવા માટે પોપ-અપ (Pop-up) ને મંજૂરી આપો.');
      return;
    }

    // Dynamic Font size based on column count & orientation
    const colCount = activeColumns.length;
    let tableFontSize = '8.5pt';
    let cellPadding = '4px 6px';

    if (calculatedOrientation === 'portrait') {
      if (colCount > 8) {
        tableFontSize = '7pt';
        cellPadding = '3px 4px';
      } else if (colCount > 6) {
        tableFontSize = '7.8pt';
        cellPadding = '3.5px 5px';
      } else {
        tableFontSize = '8.5pt';
        cellPadding = '4.5px 6.5px';
      }
    } else {
      // Landscape has more horizontal space
      if (colCount > 12) {
        tableFontSize = '7pt';
        cellPadding = '3px 4px';
      } else if (colCount > 9) {
        tableFontSize = '8pt';
        cellPadding = '3.5px 5px';
      } else {
        tableFontSize = '8.5pt';
        cellPadding = '4.5px 7px';
      }
    }

    // School Address String
    const addressStr = [
      school.address,
      school.village ? `મુ. ${school.village}` : null,
      school.taluka ? `તા. ${school.taluka}` : null,
      school.district ? `જી. ${school.district}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    // Filter summary line
    const filterInfo = [
      filterStandard !== 'all' ? `ધોરણ: ${filterStandard}` : 'તમામ ધોરણ',
      filterSection !== 'all' ? `વર્ગ: ${filterSection}` : null,
      filterGender !== 'all' ? `જાતિ: ${filterGender === 'Boy' ? 'કુમાર' : 'કન્યા'}` : null,
      `કુલ સંખ્યા: ${filteredStudents.length}`,
    ]
      .filter(Boolean)
      .join(' | ');

    // Generate Table HTML
    const tableHeaderHtml = `
      <thead>
        <tr>
          ${activeColumns
            .map(
              (col) => `
            <th style="min-width: ${col.minWidth || 'auto'}; text-align: ${col.align || 'left'};">
              ${col.label}
            </th>
          `
            )
            .join('')}
        </tr>
      </thead>
    `;

    const tableRowsHtml = filteredStudents
      .map((student, idx) => {
        const isEven = idx % 2 === 1;
        return `
          <tr class="${isEven ? 'even-row' : ''}">
            ${activeColumns
              .map((col) => {
                const val = col.getValue(student, school, idx);
                return `
                  <td style="text-align: ${col.align || 'left'};">
                    ${val}
                  </td>
                `;
              })
              .join('')}
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>Student Patrak - ${school.schoolName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 ${calculatedOrientation};
            margin: 6mm 6mm 8mm 6mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff;
            color: #0f172a;
            font-family: 'Anek Gujarati', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            line-height: 1.2;
            -webkit-font-smoothing: antialiased;
          }
          .page-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          
          /* Header Section - Top Aligned, Compact */
          .school-header {
            width: 100%;
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-top: 0;
            padding-bottom: 4px;
            margin-top: 0;
            margin-bottom: 6px;
          }
          .header-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          }
          .school-logo {
            width: 44px;
            height: 44px;
            max-width: 44px;
            max-height: 44px;
            object-fit: contain;
            background: transparent !important;
            border: none !important;
          }
          .school-title {
            font-size: 15pt;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
            margin: 0;
            line-height: 1.15;
            letter-spacing: 0.2px;
          }
          .school-meta {
            font-size: 8.5pt;
            color: #334155;
            margin-top: 2px;
            font-weight: 600;
          }
          .school-dise {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            padding: 1px 7px;
            border-radius: 4px;
            font-size: 8pt;
            font-weight: 700;
            margin-left: 6px;
          }
          .report-bar {
            margin-top: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9pt;
            font-weight: 600;
            color: #334155;
            background: #f1f5f9;
            padding: 5px 12px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
          }
          .report-main-title {
            font-size: 14pt;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.3px;
          }

          /* Table Styling - Centered Horizontally, Starts Right Below Header */
          .table-wrapper {
            width: 100%;
            margin: 0;
            padding: 0;
            display: block;
          }
          table {
            width: 100% !important;
            border-collapse: collapse;
            font-size: ${tableFontSize};
            margin: 0 auto;
            table-layout: auto;
          }
          th, td {
            border: 0.8px solid #475569;
            padding: ${cellPadding};
            vertical-align: middle;
            word-break: break-word;
          }
          th {
            background-color: #1e293b !important;
            color: #ffffff !important;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            -webkit-print-color-adjust: exact;
          }
          tr {
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          tr.even-row {
            background-color: #f8fafc !important;
          }

          /* Signature / Footer */
          .doc-footer {
            width: 100%;
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 8pt;
            color: #475569;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            width: 150px;
          }
          .sig-line {
            border-top: 1px solid #0f172a;
            padding-top: 4px;
            font-weight: 700;
            color: #0f172a;
          }

          /* Print controls */
          .no-print {
            background: #0f172a;
            color: white;
            padding: 10px 16px;
            margin-bottom: 12px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
          }
          .btn-print {
            background: #059669;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .btn-close {
            background: #475569;
            color: white;
            border: none;
            padding: 8px 14px;
            border-radius: 6px;
            cursor: pointer;
            margin-left: 8px;
          }
          @media print {
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <div>
            <strong>વિદ્યાર્થી યાદી પત્રક (Student Master Register)</strong>
            <span style="opacity: 0.8; margin-left: 8px;">• પેપર સેટિંગ: A4 ${calculatedOrientation.toUpperCase()}</span>
          </div>
          <div>
            <button class="btn-print" onclick="window.print()">
              🖨️ PDF ડાઉનલોડ / પ્રિન્ટ કરો (Save as PDF)
            </button>
            <button class="btn-close" onclick="window.close()">બંધ કરો</button>
          </div>
        </div>

        <div class="page-container">
          <!-- Institutional Header -->
          <div class="school-header">
            <div class="header-row">
              ${
                school.logoUrl
                  ? `<img src="${school.logoUrl}" alt="School Logo" class="school-logo" />`
                  : ''
              }
              <div>
                <h1 class="school-title">${school.schoolName}</h1>
                <div class="school-meta">
                  <span>${addressStr || school.district || 'ગુજરાત'}</span>
                  <span class="school-dise">DISE: ${school.diseCode || '-'}</span>
                </div>
              </div>
            </div>

            <div class="report-bar">
              <span class="report-main-title">${reportTitle}</span>
              <span>${filterInfo}</span>
              <span>તારીખ: ${new Date().toLocaleDateString('gu-IN')}</span>
            </div>
          </div>

          <!-- Centered Auto-Fitting Table -->
          <div class="table-wrapper">
            <table>
              ${tableHeaderHtml}
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Document Signatures -->
          <div class="doc-footer">
            <div>
              તૈયાર કરનાર સ્ટાફ સહી: __________________
            </div>
            <div class="sig-box">
              <div class="sig-line">આચાર્યશ્રી સહી & સિક્કો</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="glass-panel rounded-3xl border border-stone-200 dark:border-white/10 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#d8d0c5] dark:border-white/10">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#141d24] dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#9d512d] dark:text-[#f59c73]" />
            <span>૧. કસ્ટમ વિદ્યાર્થી યાદી પત્રક (Custom Student List PDF)</span>
          </h3>
          <p className="text-xs text-[#5c5243] dark:text-[#a99f91] mt-1">
            તમને જોઈતી ચોક્કસ કોલમ પસંદ કરો, ધોરણ/જાતિ ફિલ્ટર કરો અને A4 પેજમાં ફિટ થાય તેવી પરફેક્ટ PDF ડાઉનલોડ કરો.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>PDF ડાઉનલોડ / પ્રિન્ટ કરો ({filteredStudents.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#ede8e0]/60 dark:bg-white/[0.02] p-3.5 rounded-2xl border border-[#d8d0c5] dark:border-white/5">
        <div>
          <label className="block text-[11px] font-bold text-[#9d512d] dark:text-[#f59c73] mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>ધોરણ ફિલ્ટર:</span>
          </label>
          <select
            value={filterStandard}
            onChange={(e) => setFilterStandard(e.target.value)}
            className="w-full bg-white dark:bg-[#121921] border border-[#d8d0c5] dark:border-white/15 rounded-xl px-3 py-2 text-xs text-[#141d24] dark:text-white focus:outline-none focus:border-[#9d512d]"
          >
            <option value="all">તમામ ધોરણ (All Standards)</option>
            <option value="9">ધોરણ ૯ (Standard 9)</option>
            <option value="10">ધોરણ ૧૦ (Standard 10)</option>
            <option value="11">ધોરણ ૧૧ (Standard 11)</option>
            <option value="12">ધોરણ ૧૨ (Standard 12)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#9d512d] dark:text-[#f59c73] mb-1">વર્ગ / સેક્શન:</label>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="w-full bg-white dark:bg-[#121921] border border-[#d8d0c5] dark:border-white/15 rounded-xl px-3 py-2 text-xs text-[#141d24] dark:text-white focus:outline-none focus:border-[#9d512d]"
          >
            <option value="all">તમામ વર્ગ (All Sections)</option>
            {availableSections.map((sec) => (
              <option key={sec} value={sec}>
                વર્ગ {sec}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#9d512d] dark:text-[#f59c73] mb-1">જાતિ (Gender):</label>
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="w-full bg-white dark:bg-[#121921] border border-[#d8d0c5] dark:border-white/15 rounded-xl px-3 py-2 text-xs text-[#141d24] dark:text-white focus:outline-none focus:border-[#9d512d]"
          >
            <option value="all">બધા (Boys & Girls)</option>
            <option value="Boy">માત્ર કુમાર (Boys)</option>
            <option value="Girl">માત્ર કન્યા (Girls)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#9d512d] dark:text-[#f59c73] mb-1">પેપર ઓરિએન્ટેશન:</label>
          <select
            value={paperOrientation}
            onChange={(e) => setPaperOrientation(e.target.value as any)}
            className="w-full bg-white dark:bg-[#121921] border border-[#d8d0c5] dark:border-white/15 rounded-xl px-3 py-2 text-xs text-[#141d24] dark:text-white focus:outline-none focus:border-[#9d512d]"
          >
            <option value="auto">ઓટોમેટિક ({calculatedOrientation === 'landscape' ? 'લેન્ડસ્કેપ' : 'પોર્ટ્રેટ'})</option>
            <option value="portrait">પોર્ટ્રેટ (Portrait - ઊભું)</option>
            <option value="landscape">લેન્ડસ્કેપ (Landscape - આડું)</option>
          </select>
        </div>
      </div>

      {/* Column Selection Checklist */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#141d24] dark:text-white">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#9d512d] dark:text-[#f59c73]" />
            <span>PDF માં દર્શાવવા માટે કોલમ પસંદ કરો (Select Columns to Include):</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-500/30 ml-1 font-bold shadow-xs">
              {selectedColumnIds.length} / {ALL_STUDENT_COLUMNS.length} પસંદ
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={selectAllColumns}
              className="text-[#9d512d] dark:text-[#f59c73] hover:underline font-semibold cursor-pointer"
            >
              બધી પસંદ કરો
            </button>
            <span className="text-stone-400 dark:text-white/20">•</span>
            <button
              type="button"
              onClick={selectEssentialColumns}
              className="text-[#5c5243] dark:text-[#a99f91] hover:text-[#141d24] dark:hover:text-white font-semibold cursor-pointer"
            >
              મૂળભૂત (Default)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {ALL_STUDENT_COLUMNS.map((col) => {
            const isSelected = selectedColumnIds.includes(col.id);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggleColumn(col.id)}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#9d512d]/10 dark:bg-[#9d512d]/25 border-[#9d512d]/50 dark:border-[#f59c73]/60 text-[#141d24] dark:text-white shadow-xs font-semibold'
                    : 'bg-white/80 dark:bg-white/[0.02] border-[#d8d0c5] dark:border-white/10 text-[#5c5243] dark:text-[#a99f91] hover:border-[#9d512d]/30'
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-[#9d512d] dark:text-[#f59c73] shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-stone-400 dark:text-white/30 shrink-0" />
                )}
                <span className="truncate">{col.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#5c5243] dark:text-[#a99f91] mt-2">
          💡 <strong>નોંધ:</strong> ગમે તેટલી કોલમ પસંદ કરશો તો પણ PDF પેજના સેન્ટરમાં ટેબલ એકસરખી રીતે ફિટ થશે, અને વધુ વિદ્યાર્થીઓ હશે તો આપોઆપ પેજ વધતા જશે.
        </p>
      </div>

      {/* Live Table Preview */}
      <div className="pt-2 border-t border-[#d8d0c5] dark:border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#141d24] dark:text-[#e4ded6]">
            <Eye className="w-3.5 h-3.5 text-[#9d512d] dark:text-[#f59c73]" />
            <span>PDF પ્રિવ્યુ (પહેલા ૫ વિદ્યાર્થીઓ):</span>
          </div>
          <span className="text-[11px] text-[#5c5243] dark:text-[#a99f91]">
            કુલ {filteredStudents.length} વિદ્યાર્થીઓ પ્રિન્ટ થશે
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#d8d0c5] dark:border-white/10 bg-white/90 dark:bg-slate-950/60 max-h-56 shadow-xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#ede8e0] dark:bg-[#16202c] sticky top-0 text-[#9d512d] dark:text-[#f59c73] font-bold">
              <tr>
                {activeColumns.map((col) => (
                  <th key={col.id} className="p-2 border-b border-[#d8d0c5] dark:border-white/10 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d8d0c5]/40 dark:divide-white/5 text-[#141d24] dark:text-[#e4ded6]">
              {filteredStudents.slice(0, 5).map((st, idx) => (
                <tr key={st.id || idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  {activeColumns.map((col) => (
                    <td key={col.id} className="p-2 whitespace-nowrap text-[#141d24] dark:text-slate-300">
                      {col.getValue(st, school, idx)}
                    </td>
                  ))}
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td
                    colSpan={activeColumns.length}
                    className="p-4 text-center text-slate-500 dark:text-slate-400"
                  >
                    પસંદ કરેલ ફિલ્ટર મુજબ કોઈ વિદ્યાર્થી ઉપલબ્ધ નથી.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
