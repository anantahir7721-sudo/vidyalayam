import React, { useState, useMemo, useEffect } from 'react';
import { School, Staff } from '../types';
import {
  FileText,
  Printer,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Filter,
  UserCheck,
  Building2,
  Eye,
  Users,
  Search,
  Calendar,
  MessageSquare,
} from 'lucide-react';

function parseDateForSort(dateStr?: string): number {
  if (!dateStr || !dateStr.trim()) return 9999999999999;
  const clean = dateStr.trim();
  // Check DD-MM-YYYY or DD/MM/YYYY
  const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const t = new Date(year, month, day).getTime();
    return isNaN(t) ? 9999999999999 : t;
  }
  // Check YYYY-MM-DD
  const ymd = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    const t = new Date(year, month, day).getTime();
    return isNaN(t) ? 9999999999999 : t;
  }
  const t = new Date(clean).getTime();
  return isNaN(t) ? 9999999999999 : t;
}

interface StaffColumnDef {
  id: string;
  label: string;
  getValue: (st: Staff, school: School, index: number) => string;
  defaultSelected: boolean;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
}

const ALL_STAFF_COLUMNS: StaffColumnDef[] = [
  {
    id: 'sr',
    label: 'અ.નં.',
    getValue: (_s, _sch, idx) => String(idx + 1),
    defaultSelected: true,
    minWidth: '28px',
    align: 'center',
  },
  {
    id: 'fullName',
    label: 'કર્મચારીનું પૂરું નામ',
    getValue: (st) => st.fullName || '-',
    defaultSelected: true,
    minWidth: '130px',
    align: 'left',
  },
  {
    id: 'designation',
    label: 'હોદ્દો (Designation)',
    getValue: (st) => st.designation || '-',
    defaultSelected: true,
    minWidth: '85px',
    align: 'left',
  },
  {
    id: 'section',
    label: 'વિભાગ (Section)',
    getValue: (st) => st.section || st.vibhag || 'માધ્યમિક',
    defaultSelected: true,
    minWidth: '75px',
    align: 'center',
  },
  {
    id: 'teacherCode',
    label: 'શિક્ષક કોડ (Teacher Code)',
    getValue: (st) => st.teacherCode || '-',
    defaultSelected: true,
    minWidth: '70px',
    align: 'center',
  },
  {
    id: 'hrpnNumber',
    label: 'HRPN નંબર',
    getValue: (st) => st.hrpnNumber || '-',
    defaultSelected: false,
    minWidth: '70px',
    align: 'center',
  },
  {
    id: 'subject',
    label: 'મુખ્ય વિષય',
    getValue: (st) => st.subject || '-',
    defaultSelected: true,
    minWidth: '70px',
    align: 'left',
  },
  {
    id: 'qualification',
    label: 'શૈક્ષણિક લાયકાત',
    getValue: (st) => st.qualification || '-',
    defaultSelected: true,
    minWidth: '80px',
    align: 'left',
  },
  {
    id: 'mobile',
    label: 'મોબાઇલ નંબર',
    getValue: (st) => st.mobile || '-',
    defaultSelected: true,
    minWidth: '65px',
    align: 'center',
  },
  {
    id: 'email',
    label: 'ઇમેઇલ એડ્રેસ',
    getValue: (st) => st.email || '-',
    defaultSelected: false,
    minWidth: '110px',
    align: 'left',
  },
  {
    id: 'dob',
    label: 'જન્મ તારીખ (DOB)',
    getValue: (st) => st.dob || '-',
    defaultSelected: true,
    minWidth: '60px',
    align: 'center',
  },
  {
    id: 'serviceJoiningDate',
    label: 'ખાતામાં દાખલ તારીખ',
    getValue: (st) => st.serviceJoiningDate || st.joiningDate || '-',
    defaultSelected: true,
    minWidth: '68px',
    align: 'center',
  },
  {
    id: 'schoolJoiningDate',
    label: 'આ શાળામાં દાખલ તારીખ',
    getValue: (st) => st.schoolJoiningDate || st.joiningDate || '-',
    defaultSelected: true,
    minWidth: '68px',
    align: 'center',
  },
  {
    id: 'aadhaarNumber',
    label: 'આધાર કાર્ડ નં.',
    getValue: (st) => st.aadhaarNumber ? st.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3') : '-',
    defaultSelected: true,
    minWidth: '78px',
    align: 'center',
  },
  {
    id: 'bankAccountNo',
    label: 'બેંક ખાતા નં.',
    getValue: (st) => st.bankAccountNo || '-',
    defaultSelected: true,
    minWidth: '85px',
    align: 'center',
  },
  {
    id: 'bankIfsc',
    label: 'IFSC કોડ',
    getValue: (st) => st.bankIfsc || '-',
    defaultSelected: true,
    minWidth: '68px',
    align: 'center',
  },
  {
    id: 'bankName',
    label: 'બેંકનું નામ / શાખા',
    getValue: (st) => st.bankName ? (st.bankBranch ? `${st.bankName} (${st.bankBranch})` : st.bankName) : '-',
    defaultSelected: false,
    minWidth: '95px',
    align: 'left',
  },
  {
    id: 'panNumber',
    label: 'PAN કાર્ડ નં.',
    getValue: (st) => st.panNumber || '-',
    defaultSelected: false,
    minWidth: '68px',
    align: 'center',
  },
  {
    id: 'bloodGroup',
    label: 'બ્લડ ગ્રૂપ',
    getValue: (st) => st.bloodGroup || '-',
    defaultSelected: false,
    minWidth: '40px',
    align: 'center',
  },
  {
    id: 'address',
    label: 'રહેઠાણનું સરનામું',
    getValue: (st) => st.address || '-',
    defaultSelected: false,
    minWidth: '110px',
    align: 'left',
  },
];

interface StaffReportCustomizerProps {
  school: School;
  staffList: Staff[];
}

export const StaffReportCustomizer: React.FC<StaffReportCustomizerProps> = ({
  school,
  staffList,
}) => {
  // Column selection state
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(
    ALL_STAFF_COLUMNS.filter((col) => col.defaultSelected).map((col) => col.id)
  );

  // Staff members selection state - by default all staff are selected
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(() =>
    staffList.map((s) => s.id)
  );

  // Update selection when staffList changes
  useEffect(() => {
    setSelectedStaffIds(staffList.map((s) => s.id));
  }, [staffList]);

  // Filters
  const [filterDesignation, setFilterDesignation] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const [reportTitle, setReportTitle] = useState<string>('શાળા સ્ટાફ પત્રક (Staff Master Register)');
  const [paperOrientation, setPaperOrientation] = useState<'portrait' | 'landscape'>('auto');

  // Available designations
  const availableDesignations = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.designation && s.designation.trim()) set.add(s.designation.trim());
    });
    return Array.from(set).sort();
  }, [staffList]);

  // 1. Sort staff: Earliest joiners in this school first.
  // CRITICAL REQUIREMENT: If school joining date is identical, check DOB (older age / earlier birth date comes first!)
  const sortedStaff = useMemo(() => {
    const list = [...staffList];
    list.sort((a, b) => {
      const dateA = a.schoolJoiningDate || a.joiningDate || a.serviceJoiningDate || '';
      const dateB = b.schoolJoiningDate || b.joiningDate || b.serviceJoiningDate || '';
      const timeA = parseDateForSort(dateA);
      const timeB = parseDateForSort(dateB);
      if (timeA !== timeB) return timeA - timeB;

      // Tie-breaker: Same joining date -> sort by DOB (Date of Birth).
      // Older person has an earlier DOB (smaller epoch timestamp), so timeDobA - timeDobB places older staff first!
      const timeDobA = parseDateForSort(a.dob);
      const timeDobB = parseDateForSort(b.dob);
      if (timeDobA !== timeDobB) return timeDobA - timeDobB;

      // Fallback tie-break by Gujarati alphabetical name
      return (a.fullName || '').localeCompare(b.fullName || '', 'gu');
    });
    return list;
  }, [staffList]);

  // 2. Filtered staff list by designation and vibhag (section)
  const filteredStaff = useMemo(() => {
    return sortedStaff.filter((s) => {
      if (filterDesignation !== 'all' && s.designation !== filterDesignation) {
        return false;
      }
      if (filterSection !== 'all') {
        const staffSec = s.section || s.vibhag || 'માધ્યમિક';
        if (staffSec !== filterSection) return false;
      }
      return true;
    });
  }, [sortedStaff, filterDesignation, filterSection]);

  // 3. Search filtered staff list for the selector UI
  const displayStaffList = useMemo(() => {
    if (!staffSearchQuery.trim()) return filteredStaff;
    const q = staffSearchQuery.trim().toLowerCase();
    return filteredStaff.filter(
      (s) =>
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.designation || '').toLowerCase().includes(q) ||
        (s.subject || '').toLowerCase().includes(q) ||
        (s.teacherCode || '').toLowerCase().includes(q) ||
        (s.section || s.vibhag || '').toLowerCase().includes(q) ||
        (s.mobile || '').includes(q)
    );
  }, [filteredStaff, staffSearchQuery]);

  // 4. Final staff members to be printed in PDF / preview (only selected ones)
  const staffToPrint = useMemo(() => {
    return filteredStaff.filter((s) => selectedStaffIds.includes(s.id));
  }, [filteredStaff, selectedStaffIds]);

  // Toggle single staff selection
  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all visible filtered staff
  const selectAllStaff = () => {
    const visibleIds = filteredStaff.map((s) => s.id);
    setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  // Deselect all visible filtered staff
  const deselectAllStaff = () => {
    const visibleIds = new Set(filteredStaff.map((s) => s.id));
    setSelectedStaffIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  // Toggle column selection
  const toggleColumn = (id: string) => {
    setSelectedColumnIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) {
          alert('ઓછામાં ઓછી એક કોલમ પસંદ કરવી જરૂરી છે.');
          return prev;
        }
        return prev.filter((c) => c !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAllColumns = () => {
    setSelectedColumnIds(ALL_STAFF_COLUMNS.map((c) => c.id));
  };

  const selectDefaultColumns = () => {
    setSelectedColumnIds(ALL_STAFF_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id));
  };

  // Active columns in order
  const activeColumns = useMemo(() => {
    return ALL_STAFF_COLUMNS.filter((col) => selectedColumnIds.includes(col.id));
  }, [selectedColumnIds]);

  // Orientation - default portrait unless more than 8 columns
  const calculatedOrientation = useMemo(() => {
    if (paperOrientation !== 'auto') return paperOrientation;
    return activeColumns.length > 8 ? 'landscape' : 'portrait';
  }, [paperOrientation, activeColumns.length]);

  // Print / PDF generation
  const handlePrintPDF = () => {
    if (staffToPrint.length === 0) {
      alert('કૃપા કરીને સ્ટાફ પત્રક PDF માટે ઓછામાં ઓછો ૧ સ્ટાફ સભ્ય પસંદ કરો.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('પ્રિન્ટ અથવા PDF ડાઉનલોડ કરવા માટે પોપ-અપ (Pop-up) ને મંજૂરી આપો.');
      return;
    }

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
      if (colCount > 10) {
        tableFontSize = '7pt';
        cellPadding = '3px 4px';
      } else if (colCount > 8) {
        tableFontSize = '8pt';
        cellPadding = '3.5px 5px';
      } else {
        tableFontSize = '8.5pt';
        cellPadding = '4.5px 7px';
      }
    }

    const addressStr = [
      school.address,
      school.village ? `મુ. ${school.village}` : null,
      school.taluka ? `તા. ${school.taluka}` : null,
      school.district ? `જી. ${school.district}` : null,
    ]
      .filter(Boolean)
      .join(', ');

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

    const tableRowsHtml = staffToPrint
      .map((staff, idx) => {
        const isEven = idx % 2 === 1;
        return `
          <tr class="${isEven ? 'even-row' : ''}">
            ${activeColumns
              .map((col) => {
                const val = col.getValue(staff, school, idx);
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
        <title>Staff Patrak - ${school.schoolName}</title>
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

          /* Footer / Signatures */
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
            <strong>શાળા સ્ટાફ પત્રક (Staff Master Register)</strong>
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
              <span>કુલ સ્ટાફ: ${staffToPrint.length}</span>
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
              તૈયાર કરનાર ક્લાર્ક/સ્ટાફ: __________________
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
    <div className="glass-panel rounded-3xl border border-[#d8d0c5] dark:border-white/10 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#d8d0c5] dark:border-white/10">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#141d24] dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#9d512d] dark:text-amber-400" />
            <span>૨. શાળા સ્ટાફ પત્રક PDF (Staff Master Register PDF)</span>
          </h3>
          <p className="text-xs text-[#635848] dark:text-[#a99f91] mt-1">
            શિક્ષકો અને વહીવટી કર્મચારીઓની તમામ વિગતો સાથેનું સત્તાવાર સ્ટાફ પત્રક PDF માં ડાઉનલોડ કરો. (હાજર તારીખ મુજબ ક્રમબદ્ધ)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {staffToPrint.some((s) => s.mobile) && (
            <button
              type="button"
              onClick={() => {
                const withMobile = staffToPrint.filter((s) => s.mobile && s.mobile.replace(/\D/g, ''));
                if (withMobile.length === 0) {
                  alert('પસંદ કરેલા સ્ટાફમાંથી કોઈનો મોબાઇલ નંબર નથી.');
                  return;
                }
                const st = withMobile[0];
                const clean = st.mobile!.replace(/\D/g, '');
                const norm = clean.length === 10 ? `91${clean}` : clean;
                const joinDate = st.schoolJoiningDate || st.joiningDate || st.serviceJoiningDate || '';
                const msg = `નમસ્તે ${st.fullName} સર/મેડમ,\nશાળા: ${school.schoolName}\nહોદ્દો: ${st.designation || 'સ્ટાફ'}\nશાળા હાજર તારીખ: ${joinDate || '-'}\n\nવિદ્યાલયમ શાળા પોર્ટલ સ્ટાફ પત્રક માહિતી ચકાસણી બાબત.`;
                window.open(`https://wa.me/${norm}?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
              title="પસંદ કરેલ સ્ટાફને WhatsApp પર ઓટો-ટાઈપ કરેલ મેસેજ મોકલો"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp મેસેજ ({staffToPrint.filter((s) => s.mobile).length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#9d512d] to-amber-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-amber-950/20 transition-all cursor-pointer touch-manipulation"
          >
            <Printer className="w-4 h-4" />
            <span>સ્ટાફ પત્રક PDF ડાઉનલોડ ({staffToPrint.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#ede8e0]/60 dark:bg-white/[0.02] p-3.5 rounded-2xl border border-[#d8d0c5] dark:border-white/5">
        <div>
          <label className="block text-[11px] font-bold text-[#9d512d] dark:text-amber-300 mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>વિભાગ (Section / Vibhag):</span>
          </label>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="w-full bg-white dark:bg-[#121921] border border-[#d8d0c5] dark:border-white/15 rounded-xl px-3 py-2 text-xs text-[#141d24] dark:text-white focus:outline-none focus:border-[#9d512d]"
          >
            <option value="all">તમામ વિભાગ (All Sections)</option>
            <option value="માધ્યમિક">માધ્યમિક (Secondary)</option>
            <option value="ઉચ્ચતર માધ્યમિક">ઉચ્ચતર માધ્યમિક (Higher Secondary)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#9d512d] dark:text-amber-300 mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>હોદ્દો (Designation) ફિલ્ટર:</span>
          </label>
          <select
            value={filterDesignation}
            onChange={(e) => setFilterDesignation(e.target.value)}
            className="w-full bg-white dark:bg-[#121921] border border-[#d8d0c5] dark:border-white/15 rounded-xl px-3 py-2 text-xs text-[#141d24] dark:text-white focus:outline-none focus:border-[#9d512d]"
          >
            <option value="all">તમામ હોદ્દા (All Designations)</option>
            {availableDesignations.map((desig) => (
              <option key={desig} value={desig}>
                {desig}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#9d512d] dark:text-amber-300 mb-1">પત્રકનું શીર્ષક:</label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="w-full bg-white dark:bg-[#121921] border border-[#d8d0c5] dark:border-white/15 rounded-xl px-3 py-2 text-xs text-[#141d24] dark:text-white focus:outline-none focus:border-[#9d512d]"
            placeholder="દા.ત. શાળા સ્ટાફ પત્રક ૨૦૨૬-૨૭"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#9d512d] dark:text-amber-300 mb-1">પેપર ઓરિએન્ટેશન:</label>
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

      {/* Staff Selection Section (Who to include in PDF) */}
      <div className="bg-[#ede8e0]/40 dark:bg-white/[0.02] p-4 rounded-2xl border border-[#d8d0c5] dark:border-white/5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#141d24] dark:text-white">
            <Users className="w-4 h-4 text-[#9d512d] dark:text-amber-400" />
            <span>PDF માં સમાવિષ્ટ સ્ટાફ સભ્યો પસંદ કરો (Select Staff for PDF):</span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-200 border border-amber-300/80 dark:border-amber-500/30 font-bold shadow-xs">
              {staffToPrint.length} / {filteredStaff.length} પસંદ
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={selectAllStaff}
              className="text-[#9d512d] dark:text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              બધા પસંદ કરો
            </button>
            <span className="text-stone-400 dark:text-white/20">•</span>
            <button
              type="button"
              onClick={deselectAllStaff}
              className="text-[#635848] dark:text-[#a99f91] hover:text-[#141d24] dark:hover:text-white font-semibold cursor-pointer"
            >
              બધા રદ કરો
            </button>
          </div>
        </div>

        {/* Staff Quick Search Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={staffSearchQuery}
            onChange={(e) => setStaffSearchQuery(e.target.value)}
            placeholder="સ્ટાફનું નામ, વિષય, હોદ્દો, વિભાગ અથવા મોબાઇલ નંબર શોધો..."
            className="w-full bg-white dark:bg-[#121921] border border-[#d8d0c5] dark:border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#141d24] dark:text-white focus:outline-none focus:border-[#9d512d]"
          />
        </div>

        {/* Staff Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
          {displayStaffList.map((st, idx) => {
            const isSelected = selectedStaffIds.includes(st.id);
            const joinDate = st.schoolJoiningDate || st.joiningDate || st.serviceJoiningDate || '';
            const staffSection = st.section || st.vibhag || 'માધ્યમિક';
            return (
              <button
                key={st.id || idx}
                type="button"
                onClick={() => toggleStaffSelection(st.id)}
                className={`flex items-start gap-2.5 p-2 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#9d512d]/10 dark:bg-amber-950/40 border-[#9d512d]/50 dark:border-amber-500/60 text-[#141d24] dark:text-white shadow-sm'
                    : 'bg-white/80 dark:bg-white/[0.02] border-[#d8d0c5] dark:border-white/10 text-[#635848] dark:text-[#a99f91] hover:border-[#9d512d]/40'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#9d512d] dark:text-amber-400" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-400 dark:text-white/30" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="font-bold truncate text-[#141d24] dark:text-white">
                      {idx + 1}. {st.fullName || 'નામ ઉપલબ્ધ નથી'}
                    </div>
                    {st.mobile ? (
                      <span
                        role="button"
                        title={`${st.fullName} ને WhatsApp ઓટો-મેસેજ મોકલો`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const clean = st.mobile!.replace(/\D/g, '');
                          const norm = clean.length === 10 ? `91${clean}` : clean;
                          const msg = `નમસ્તે ${st.fullName} સર/મેડમ,\nશાળા: ${school.schoolName}\nહોદ્દો: ${st.designation || 'સ્ટાફ'}\nવિભાગ: ${staffSection}\nશાળા હાજર તારીખ: ${joinDate || '-'}\n\nવિદ્યાલયમ શાળા પોર્ટલ સ્ટાફ પત્રક માહિતી ચકાસણી બાબત.`;
                          window.open(`https://wa.me/${norm}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="shrink-0 p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-[#635848] dark:text-[#a99f91] truncate flex items-center justify-between gap-1 mt-0.5">
                    <span className="truncate">{st.designation || 'શિક્ષક'}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 shrink-0">
                      {staffSection}
                    </span>
                  </div>
                  {joinDate ? (
                    <div className="text-[10px] text-[#9d512d] dark:text-amber-300/90 font-mono mt-0.5 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5 shrink-0" />
                      <span>હાજર: {joinDate}</span>
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
          {displayStaffList.length === 0 && (
            <div className="col-span-full py-4 text-center text-xs text-[#635848] dark:text-stone-400">
              કોઈ સ્ટાફ સભ્ય મળ્યા નથી.
            </div>
          )}
        </div>
      </div>

      {/* Column Selection */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#141d24] dark:text-white">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#9d512d] dark:text-amber-300" />
            <span>સ્ટાફ પત્રકમાં સમાવિષ્ટ કોલમો (Select Staff Columns):</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-200 border border-amber-300/80 dark:border-amber-500/30 ml-1 font-bold shadow-xs">
              {selectedColumnIds.length} / {ALL_STAFF_COLUMNS.length} પસંદ
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={selectAllColumns}
              className="text-[#9d512d] dark:text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              બધી પસંદ કરો
            </button>
            <span className="text-stone-400 dark:text-white/20">•</span>
            <button
              type="button"
              onClick={selectDefaultColumns}
              className="text-[#635848] dark:text-[#a99f91] hover:text-[#141d24] dark:hover:text-white font-semibold cursor-pointer"
            >
              મૂળભૂત (Default)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {ALL_STAFF_COLUMNS.map((col) => {
            const isSelected = selectedColumnIds.includes(col.id);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggleColumn(col.id)}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#9d512d]/10 dark:bg-amber-950/40 border-[#9d512d]/50 dark:border-amber-500/60 text-[#141d24] dark:text-white shadow-sm'
                    : 'bg-white/80 dark:bg-white/[0.02] border-[#d8d0c5] dark:border-white/10 text-[#635848] dark:text-[#a99f91] hover:border-[#9d512d]/40'
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-[#9d512d] dark:text-amber-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-stone-400 dark:text-white/30 shrink-0" />
                )}
                <span className="truncate">{col.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#635848] dark:text-[#a99f91] mt-2">
          💡 <strong>નોંધ:</strong> શાળામાં વહેલા હાજર થયેલા શિક્ષકો પ્રથમ ક્રમે આપોઆપ સોર્ટ થઈ જશે. શાળાનું નામ, સરનામું અને DISE કોડ હેડરમાં આપોઆપ આવી જશે.
        </p>
      </div>

      {/* Preview */}
      <div className="pt-2 border-t border-[#d8d0c5] dark:border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#141d24] dark:text-[#e4ded6]">
            <Eye className="w-3.5 h-3.5 text-[#9d512d] dark:text-amber-400" />
            <span>સ્ટાફ પત્રક પ્રિવ્યુ (પહેલા ૫ પસંદ કરેલ કર્મચારીઓ):</span>
          </div>
          <span className="text-[11px] text-[#635848] dark:text-[#a99f91]">
            કુલ {staffToPrint.length} કર્મચારીઓ પ્રિન્ટ થશે
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#d8d0c5] dark:border-white/10 bg-white dark:bg-slate-950/60 max-h-56 shadow-inner">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#ede8e0] dark:bg-[#16202c] sticky top-0 text-[#9d512d] dark:text-amber-400 font-bold border-b border-[#d8d0c5] dark:border-white/10">
              <tr>
                {activeColumns.map((col) => (
                  <th key={col.id} className="p-2 border-b border-[#d8d0c5] dark:border-white/10 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d8d0c5]/50 dark:divide-white/5 text-[#141d24] dark:text-[#e4ded6]">
              {staffToPrint.slice(0, 5).map((st, idx) => (
                <tr key={st.id || idx} className="hover:bg-black/5 dark:hover:bg-white/[0.02]">
                  {activeColumns.map((col) => (
                    <td key={col.id} className="p-2 whitespace-nowrap text-[#141d24] dark:text-slate-300">
                      {col.getValue(st, school, idx)}
                    </td>
                  ))}
                </tr>
              ))}
              {staffToPrint.length === 0 && (
                <tr>
                  <td
                    colSpan={activeColumns.length}
                    className="p-4 text-center text-stone-500 dark:text-slate-400"
                  >
                    કોઈ સ્ટાફ સભ્ય પસંદ કરેલ નથી. ઉપરથી સ્ટાફ સભ્યો પસંદ કરો.
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
