import React, { useMemo, useState } from 'react';
import { School, Student } from '../types';
import {
  FileText,
  Printer,
  Download,
  Filter,
  CheckCircle2,
  PieChart,
  Users,
  Eye,
} from 'lucide-react';

interface StudentStatsReportProps {
  school: School;
  students: Student[];
}

interface StandardStats {
  standard: string;
  kumarOBC: number;
  kanyaOBC: number;
  kumarSC: number;
  kanyaSC: number;
  kumarST: number;
  kanyaST: number;
  kumarOthers: number;
  kanyaOthers: number;
  totalKumar: number;
  totalKanya: number;
  totalStudents: number;
}

// Categorize raw caste string into: 'OBC' | 'SC' | 'ST' | 'Others'
export const normalizeCategory = (casteStr?: string): 'OBC' | 'SC' | 'ST' | 'Others' => {
  if (!casteStr) return 'Others';
  const c = casteStr.trim().toUpperCase();

  // OBC / SEBC / Baxi Panch / સા.શૈ.પ.
  if (
    c.includes('OBC') ||
    c.includes('SEBC') ||
    c.includes('BAXI') ||
    c.includes('બક્ષી') ||
    c.includes('ઓબીસી') ||
    c.includes('એસઈબીસી') ||
    c.includes('સા.શૈ.પ') ||
    c.includes('સામાજિક')
  ) {
    return 'OBC';
  }

  // SC / Scheduled Caste / અનુસૂચિત જાતિ
  if (
    c === 'SC' ||
    c.startsWith('SC-') ||
    c.startsWith('SC ') ||
    c.includes('અનુસૂચિત જાતિ') ||
    c.includes('SCHEDULED CASTE') ||
    c.includes('દલિત')
  ) {
    return 'SC';
  }

  // ST / Scheduled Tribe / અનુસૂચિત જનજાતિ / આદિવાસી
  if (
    c === 'ST' ||
    c.startsWith('ST-') ||
    c.startsWith('ST ') ||
    c.includes('અનુસૂચિત જનજાતિ') ||
    c.includes('SCHEDULED TRIBE') ||
    c.includes('આદિવાસી') ||
    c.includes('જનજાતિ')
  ) {
    return 'ST';
  }

  // All other categories fall under 'Others' (General, Open, EWS, Minority, Unspecified, etc.)
  return 'Others';
};

export const StudentStatsReport: React.FC<StudentStatsReportProps> = ({ school, students }) => {
  const [paperOrientation, setPaperOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [showGrandTotalRow, setShowGrandTotalRow] = useState<boolean>(true);

  // Calculate stats for standard 9, 10, 11, 12 and any others present
  const { rows, grandTotals } = useMemo(() => {
    // List standards to track: default 9, 10, 11, 12
    const stdOrder = ['9', '10', '11', '12'];
    const stdSet = new Set<string>(stdOrder);

    students.forEach((s) => {
      if (s.standard) {
        stdSet.add(String(s.standard).trim());
      }
    });

    const sortedStandards = Array.from(stdSet).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    const computedRows: StandardStats[] = sortedStandards.map((std) => {
      const stdStudents = students.filter((s) => String(s.standard).trim() === std);

      let kumarOBC = 0;
      let kanyaOBC = 0;
      let kumarSC = 0;
      let kanyaSC = 0;
      let kumarST = 0;
      let kanyaST = 0;
      let kumarOthers = 0;
      let kanyaOthers = 0;

      stdStudents.forEach((s) => {
        const isBoy = s.gender === 'Boy';
        const cat = normalizeCategory(s.caste);

        if (cat === 'OBC') {
          if (isBoy) kumarOBC++;
          else kanyaOBC++;
        } else if (cat === 'SC') {
          if (isBoy) kumarSC++;
          else kanyaSC++;
        } else if (cat === 'ST') {
          if (isBoy) kumarST++;
          else kanyaST++;
        } else {
          // Others
          if (isBoy) kumarOthers++;
          else kanyaOthers++;
        }
      });

      const totalKumar = kumarOBC + kumarSC + kumarST + kumarOthers;
      const totalKanya = kanyaOBC + kanyaSC + kanyaST + kanyaOthers;
      const totalStudents = totalKumar + totalKanya;

      return {
        standard: std,
        kumarOBC,
        kanyaOBC,
        kumarSC,
        kanyaSC,
        kumarST,
        kanyaST,
        kumarOthers,
        kanyaOthers,
        totalKumar,
        totalKanya,
        totalStudents,
      };
    });

    // Grand totals
    const grandTotals: StandardStats = {
      standard: 'કુલ સરવાળો (Total)',
      kumarOBC: computedRows.reduce((sum, r) => sum + r.kumarOBC, 0),
      kanyaOBC: computedRows.reduce((sum, r) => sum + r.kanyaOBC, 0),
      kumarSC: computedRows.reduce((sum, r) => sum + r.kumarSC, 0),
      kanyaSC: computedRows.reduce((sum, r) => sum + r.kanyaSC, 0),
      kumarST: computedRows.reduce((sum, r) => sum + r.kumarST, 0),
      kanyaST: computedRows.reduce((sum, r) => sum + r.kanyaST, 0),
      kumarOthers: computedRows.reduce((sum, r) => sum + r.kumarOthers, 0),
      kanyaOthers: computedRows.reduce((sum, r) => sum + r.kanyaOthers, 0),
      totalKumar: computedRows.reduce((sum, r) => sum + r.totalKumar, 0),
      totalKanya: computedRows.reduce((sum, r) => sum + r.totalKanya, 0),
      totalStudents: computedRows.reduce((sum, r) => sum + r.totalStudents, 0),
    };

    return { rows: computedRows, grandTotals };
  }, [students]);

  // Overall counts for summary cards
  const totalOBC = grandTotals.kumarOBC + grandTotals.kanyaOBC;
  const totalSC = grandTotals.kumarSC + grandTotals.kanyaSC;
  const totalST = grandTotals.kumarST + grandTotals.kanyaST;
  const totalOthers = grandTotals.kumarOthers + grandTotals.kanyaOthers;

  // Print / PDF download handler
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('કૃપા કરીને પ્રિન્ટ વિન્ડો ખોલવા માટે તમારા બ્રાઉઝરમાં પોપ-અપ (Pop-up) મંજૂર કરો.');
      return;
    }

    const addressStr = [school.address, school.village, school.taluka, school.district]
      .filter(Boolean)
      .join(', ');

    // Document Title sets the default downloaded PDF filename in modern browsers
    const docTitle = `Dhoranvar Jativar Vidyarthi Sankhya Patrak - ${school.schoolName}`;

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${docTitle}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 ${paperOrientation};
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

          /* Top Institutional Header */
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
            background: #f1f5f9;
            padding: 5px 12px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
            font-size: 9pt;
            font-weight: 600;
            color: #334155;
          }
          .report-main-title {
            font-size: 13.5pt;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.3px;
          }

          /* Table Layout - Full width & Top Aligned */
          .table-wrapper {
            width: 100%;
            margin-top: 6px;
            display: block;
          }
          table {
            width: 100% !important;
            border-collapse: collapse;
            font-size: 9pt;
            margin: 0 auto;
          }
          th, td {
            border: 0.8px solid #475569;
            padding: 5px 6px;
            vertical-align: middle;
            text-align: center;
          }
          th {
            background-color: #1e293b !important;
            color: #ffffff !important;
            font-weight: 700;
            font-size: 8.5pt;
          }
          th.sub-head {
            background-color: #334155 !important;
            font-size: 8pt;
            font-weight: 600;
          }
          .cat-obc {
            background-color: #eff6ff;
          }
          .cat-sc {
            background-color: #f0fdf4;
          }
          .cat-st {
            background-color: #fefce8;
          }
          .cat-others {
            background-color: #faf5ff;
          }
          .cat-total {
            background-color: #f1f5f9;
            font-weight: 700;
          }
          tr.total-row td {
            background-color: #e2e8f0 !important;
            font-weight: 800 !important;
            font-size: 9.5pt !important;
            border-top: 2px solid #0f172a !important;
          }
          .std-cell {
            font-weight: 700;
            background-color: #f8fafc;
          }

          /* Category Summary Cards at Bottom of Report */
          .summary-cards-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin-top: 14px;
          }
          .sum-card {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            border-radius: 4px;
            text-align: center;
            background: #f8fafc;
          }
          .sum-card-title {
            font-size: 7.5pt;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
          }
          .sum-card-val {
            font-size: 13pt;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          .sum-card-sub {
            font-size: 7pt;
            color: #64748b;
            margin-top: 1px;
          }

          /* Footer / Signatures */
          .doc-footer {
            width: 100%;
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 9pt;
            font-weight: 600;
            color: #334155;
          }
          .sig-box {
            text-align: center;
          }
          .sig-line {
            border-top: 1.5px solid #0f172a;
            padding-top: 4px;
            width: 170px;
            font-weight: 700;
          }

          /* Screen Toolbar (Hidden on Print) */
          .no-print {
            background: #0f172a;
            color: #ffffff;
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11pt;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .btn-print {
            background: #10b981;
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 10pt;
            cursor: pointer;
            margin-right: 8px;
          }
          .btn-close {
            background: #475569;
            color: #ffffff;
            border: none;
            padding: 8px 14px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 10pt;
            cursor: pointer;
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
            <strong>ધોરણવાર & જાતિવાર વિદ્યાર્થી સંખ્યા પત્રક (Category-wise Student Strength)</strong>
            <span style="opacity: 0.8; margin-left: 8px;">• પેપર: A4 ${paperOrientation.toUpperCase()}</span>
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
              ${school.logoUrl ? `<img src="${school.logoUrl}" alt="School Logo" class="school-logo" />` : ''}
              <div>
                <h1 class="school-title">${school.schoolName}</h1>
                <div class="school-meta">
                  <span>${addressStr || school.district || 'ગુજરાત'}</span>
                  <span class="school-dise">DISE: ${school.diseCode || '-'}</span>
                </div>
              </div>
            </div>

            <div class="report-bar">
              <span class="report-main-title">ધોરણવાર અને જાતિવાર વિદ્યાર્થી સંખ્યા પત્રક (Student Strength Report)</span>
              <span>તારીખ: ${new Date().toLocaleDateString('gu-IN')}</span>
            </div>
          </div>

          <!-- Main Comprehensive Matrix Table -->
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th rowspan="2" style="width: 50px;">ક્રમ</th>
                  <th rowspan="2" style="width: 85px;">ધોરણ (Standard)</th>
                  <th colspan="2" class="cat-obc" style="color: #0369a1 !important; background: #e0f2fe !important;">OBC / SEBC</th>
                  <th colspan="2" class="cat-sc" style="color: #15803d !important; background: #dcfce7 !important;">SC (અનુ. જાતિ)</th>
                  <th colspan="2" class="cat-st" style="color: #a16207 !important; background: #fef9c3 !important;">ST (અનુ. જનજાતિ)</th>
                  <th colspan="2" class="cat-others" style="color: #7e22ce !important; background: #f3e8ff !important;">Others (અન્ય/સામાન્ય)</th>
                  <th colspan="3" class="cat-total" style="color: #0f172a !important; background: #e2e8f0 !important;">કુલ વિદ્યાર્થીઓ (Total)</th>
                </tr>
                <tr>
                  <!-- OBC -->
                  <th class="sub-head" style="width: 48px;">કુમાર</th>
                  <th class="sub-head" style="width: 48px;">કન્યા</th>
                  <!-- SC -->
                  <th class="sub-head" style="width: 48px;">કુમાર</th>
                  <th class="sub-head" style="width: 48px;">કન્યા</th>
                  <!-- ST -->
                  <th class="sub-head" style="width: 48px;">કુમાર</th>
                  <th class="sub-head" style="width: 48px;">કન્યા</th>
                  <!-- Others -->
                  <th class="sub-head" style="width: 48px;">કુમાર</th>
                  <th class="sub-head" style="width: 48px;">કન્યા</th>
                  <!-- Totals -->
                  <th class="sub-head" style="width: 55px; background: #cbd5e1 !important; color: #0f172a !important;">કુમાર</th>
                  <th class="sub-head" style="width: 55px; background: #cbd5e1 !important; color: #0f172a !important;">કન્યા</th>
                  <th class="sub-head" style="width: 65px; background: #94a3b8 !important; color: #0f172a !important; font-weight: 800;">કુલ</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map((r, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td class="std-cell">ધોરણ ${r.standard}</td>
                      <td>${r.kumarOBC || 0}</td>
                      <td>${r.kanyaOBC || 0}</td>
                      <td>${r.kumarSC || 0}</td>
                      <td>${r.kanyaSC || 0}</td>
                      <td>${r.kumarST || 0}</td>
                      <td>${r.kanyaST || 0}</td>
                      <td>${r.kumarOthers || 0}</td>
                      <td>${r.kanyaOthers || 0}</td>
                      <td style="font-weight: 700; background-color: #f8fafc;">${r.totalKumar}</td>
                      <td style="font-weight: 700; background-color: #f8fafc;">${r.totalKanya}</td>
                      <td style="font-weight: 800; background-color: #f1f5f9; color: #0f172a;">${r.totalStudents}</td>
                    </tr>
                  `)
                  .join('')}

                ${
                  showGrandTotalRow
                    ? `
                  <tr class="total-row">
                    <td colspan="2" style="text-align: center;">કુલ સરવાળો (Grand Total)</td>
                    <td>${grandTotals.kumarOBC}</td>
                    <td>${grandTotals.kanyaOBC}</td>
                    <td>${grandTotals.kumarSC}</td>
                    <td>${grandTotals.kanyaSC}</td>
                    <td>${grandTotals.kumarST}</td>
                    <td>${grandTotals.kanyaST}</td>
                    <td>${grandTotals.kumarOthers}</td>
                    <td>${grandTotals.kanyaOthers}</td>
                    <td>${grandTotals.totalKumar}</td>
                    <td>${grandTotals.totalKanya}</td>
                    <td style="color: #0f172a;">${grandTotals.totalStudents}</td>
                  </tr>
                `
                    : ''
                }
              </tbody>
            </table>
          </div>

          <!-- Category Grand Breakdown Boxes -->
          <div class="summary-cards-grid">
            <div class="sum-card" style="border-top: 3px solid #0284c7;">
              <div class="sum-card-title">OBC / SEBC</div>
              <div class="sum-card-val">${totalOBC}</div>
              <div class="sum-card-sub">કુમાર: ${grandTotals.kumarOBC} | કન્યા: ${grandTotals.kanyaOBC}</div>
            </div>
            <div class="sum-card" style="border-top: 3px solid #16a34a;">
              <div class="sum-card-title">SC (અનુ. જાતિ)</div>
              <div class="sum-card-val">${totalSC}</div>
              <div class="sum-card-sub">કુમાર: ${grandTotals.kumarSC} | કન્યા: ${grandTotals.kanyaSC}</div>
            </div>
            <div class="sum-card" style="border-top: 3px solid #ca8a04;">
              <div class="sum-card-title">ST (અનુ. જનજાતિ)</div>
              <div class="sum-card-val">${totalST}</div>
              <div class="sum-card-sub">કુમાર: ${grandTotals.kumarST} | કન્યા: ${grandTotals.kanyaST}</div>
            </div>
            <div class="sum-card" style="border-top: 3px solid #9333ea;">
              <div class="sum-card-title">Others (અન્ય)</div>
              <div class="sum-card-val">${totalOthers}</div>
              <div class="sum-card-sub">કુમાર: ${grandTotals.kumarOthers} | કન્યા: ${grandTotals.kanyaOthers}</div>
            </div>
            <div class="sum-card" style="border-top: 3px solid #0f172a; background: #f1f5f9;">
              <div class="sum-card-title">કુલ વિદ્યાર્થી સંખ્યા</div>
              <div class="sum-card-val">${grandTotals.totalStudents}</div>
              <div class="sum-card-sub">કુમાર: ${grandTotals.totalKumar} | કન્યા: ${grandTotals.totalKanya}</div>
            </div>
          </div>

          <!-- Signatures -->
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
    <div className="glass-panel rounded-3xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#f59c73]" />
            <span>૩. ધોરણવાર અને જાતિવાર વિદ્યાર્થી સંખ્યા પત્રક (Student Strength PDF)</span>
          </h3>
          <p className="text-xs text-[#a99f91] mt-1">
            ધોરણ ૯ થી ૧૨ ના કુમાર-કન્યા તેમજ OBC, SC, ST અને Others મુજબનું સત્તાવાર સંખ્યા પત્રક.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>PDF ડાઉનલોડ / પ્રિન્ટ કરો (Save as PDF)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Preview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wide">
            OBC / SEBC
          </div>
          <div className="text-2xl font-black text-white font-mono mt-1">{totalOBC}</div>
          <div className="text-[10px] text-[#a99f91] mt-0.5">
            કુમાર: {grandTotals.kumarOBC} • કન્યા: {grandTotals.kanyaOBC}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
            SC (અનુ. જાતિ)
          </div>
          <div className="text-2xl font-black text-white font-mono mt-1">{totalSC}</div>
          <div className="text-[10px] text-[#a99f91] mt-0.5">
            કુમાર: {grandTotals.kumarSC} • કન્યા: {grandTotals.kanyaSC}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
            ST (અનુ. જનજાતિ)
          </div>
          <div className="text-2xl font-black text-white font-mono mt-1">{totalST}</div>
          <div className="text-[10px] text-[#a99f91] mt-0.5">
            કુમાર: {grandTotals.kumarST} • કન્યા: {grandTotals.kanyaST}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wide">
            Others (સામાન્ય/અન્ય)
          </div>
          <div className="text-2xl font-black text-white font-mono mt-1">{totalOthers}</div>
          <div className="text-[10px] text-[#a99f91] mt-0.5">
            કુમાર: {grandTotals.kumarOthers} • કન્યા: {grandTotals.kanyaOthers}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#f59c73]/10 border border-[#f59c73]/25 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-[#f59c73] uppercase tracking-wide">
            કુલ વિદ્યાર્થીઓ
          </div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {grandTotals.totalStudents}
          </div>
          <div className="text-[10px] text-[#a99f91] mt-0.5">
            કુમાર: {grandTotals.totalKumar} • કન્યા: {grandTotals.totalKanya}
          </div>
        </div>
      </div>

      {/* Configuration Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-[#e4ded6]">
        <div className="flex items-center gap-2">
          <span className="text-[#a99f91]">પેપર ઓરિએન્ટેશન:</span>
          <button
            type="button"
            onClick={() => setPaperOrientation('landscape')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              paperOrientation === 'landscape'
                ? 'bg-[#9d512d] text-white shadow-md'
                : 'bg-white/5 text-[#a99f91] hover:text-white'
            }`}
          >
            લેન્ડસ્કેપ (Landscape - પહોળું)
          </button>
          <button
            type="button"
            onClick={() => setPaperOrientation('portrait')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              paperOrientation === 'portrait'
                ? 'bg-[#9d512d] text-white shadow-md'
                : 'bg-white/5 text-[#a99f91] hover:text-white'
            }`}
          >
            પોર્ટ્રેટ (Portrait - ઊભું)
          </button>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showGrandTotalRow}
            onChange={(e) => setShowGrandTotalRow(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-black/40 border-white/20 cursor-pointer"
          />
          <span>કુલ સરવાળો (Grand Total) દર્શાવો</span>
        </label>
      </div>

      {/* Interactive Table Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#a99f91]">
          <span className="font-bold text-[#e4ded6] flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-[#f59c73]" />
            લાઈવ પૂર્વાવલોકન (Live Table Preview)
          </span>
          <span>નોંધ: OBC, SC, ST સિવાયના તમામ વિદ્યાર્થીઓ 'Others' કેટેગરીમાં ગણવામાં આવેલ છે.</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-inner">
          <table className="w-full text-xs text-left text-[#e4ded6]">
            <thead>
              <tr className="bg-[#1e293b] text-white text-center text-[11px]">
                <th rowSpan={2} className="py-2.5 px-3 border-r border-white/10 w-12">
                  ક્રમ
                </th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-white/10">
                  ધોરણ
                </th>
                <th colSpan={2} className="py-1.5 px-2 bg-blue-900/60 border-r border-white/10">
                  OBC / SEBC
                </th>
                <th colSpan={2} className="py-1.5 px-2 bg-emerald-900/60 border-r border-white/10">
                  SC (અનુ. જાતિ)
                </th>
                <th colSpan={2} className="py-1.5 px-2 bg-amber-900/60 border-r border-white/10">
                  ST (અનુ. જનજાતિ)
                </th>
                <th colSpan={2} className="py-1.5 px-2 bg-purple-900/60 border-r border-white/10">
                  Others (અન્ય)
                </th>
                <th colSpan={3} className="py-1.5 px-2 bg-slate-800 text-[#f59c73]">
                  કુલ સરવાળો
                </th>
              </tr>
              <tr className="bg-slate-800 text-center text-[10px] text-white/80">
                <th className="py-1 px-2 border-r border-white/10 bg-blue-950/40">કુમાર</th>
                <th className="py-1 px-2 border-r border-white/10 bg-blue-950/40">કન્યા</th>
                <th className="py-1 px-2 border-r border-white/10 bg-emerald-950/40">કુમાર</th>
                <th className="py-1 px-2 border-r border-white/10 bg-emerald-950/40">કન્યા</th>
                <th className="py-1 px-2 border-r border-white/10 bg-amber-950/40">કુમાર</th>
                <th className="py-1 px-2 border-r border-white/10 bg-amber-950/40">કન્યા</th>
                <th className="py-1 px-2 border-r border-white/10 bg-purple-950/40">કુમાર</th>
                <th className="py-1 px-2 border-r border-white/10 bg-purple-950/40">કન્યા</th>
                <th className="py-1 px-2 border-r border-white/10 text-white font-bold">કુમાર</th>
                <th className="py-1 px-2 border-r border-white/10 text-white font-bold">કન્યા</th>
                <th className="py-1 px-2 text-[#f59c73] font-bold">કુલ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-center font-mono">
              {rows.map((r, idx) => (
                <tr key={r.standard} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3 border-r border-white/5 text-[#a99f91]">{idx + 1}</td>
                  <td className="py-2.5 px-3 border-r border-white/5 font-bold text-white font-sans">
                    ધોરણ {r.standard}
                  </td>
                  <td className="py-2 px-2 border-r border-white/5">{r.kumarOBC}</td>
                  <td className="py-2 px-2 border-r border-white/5">{r.kanyaOBC}</td>
                  <td className="py-2 px-2 border-r border-white/5">{r.kumarSC}</td>
                  <td className="py-2 px-2 border-r border-white/5">{r.kanyaSC}</td>
                  <td className="py-2 px-2 border-r border-white/5">{r.kumarST}</td>
                  <td className="py-2 px-2 border-r border-white/5">{r.kanyaST}</td>
                  <td className="py-2 px-2 border-r border-white/5">{r.kumarOthers}</td>
                  <td className="py-2 px-2 border-r border-white/5">{r.kanyaOthers}</td>
                  <td className="py-2 px-2 border-r border-white/5 font-bold text-white">
                    {r.totalKumar}
                  </td>
                  <td className="py-2 px-2 border-r border-white/5 font-bold text-white">
                    {r.totalKanya}
                  </td>
                  <td className="py-2 px-2 font-black text-[#f59c73] bg-white/[0.02]">
                    {r.totalStudents}
                  </td>
                </tr>
              ))}

              {showGrandTotalRow && (
                <tr className="bg-white/10 font-bold text-white border-t-2 border-white/20">
                  <td colSpan={2} className="py-3 px-3 font-sans text-center text-[#f59c73]">
                    કુલ સરવાળો (Grand Total)
                  </td>
                  <td className="py-2 px-2 border-r border-white/10">{grandTotals.kumarOBC}</td>
                  <td className="py-2 px-2 border-r border-white/10">{grandTotals.kanyaOBC}</td>
                  <td className="py-2 px-2 border-r border-white/10">{grandTotals.kumarSC}</td>
                  <td className="py-2 px-2 border-r border-white/10">{grandTotals.kanyaSC}</td>
                  <td className="py-2 px-2 border-r border-white/10">{grandTotals.kumarST}</td>
                  <td className="py-2 px-2 border-r border-white/10">{grandTotals.kanyaST}</td>
                  <td className="py-2 px-2 border-r border-white/10">{grandTotals.kumarOthers}</td>
                  <td className="py-2 px-2 border-r border-white/10">{grandTotals.kanyaOthers}</td>
                  <td className="py-2 px-2 border-r border-white/10 text-emerald-400">
                    {grandTotals.totalKumar}
                  </td>
                  <td className="py-2 px-2 border-r border-white/10 text-emerald-400">
                    {grandTotals.totalKanya}
                  </td>
                  <td className="py-2 px-2 text-[#f59c73] font-black text-sm">
                    {grandTotals.totalStudents}
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
