import React, { useState } from 'react';
import { School, Student, MarkRecord, Staff } from '../types';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Printer,
  ArrowLeft,
  Users,
  Award,
  UserCheck,
  TrendingUp,
  BarChart3,
  Download,
} from 'lucide-react';

interface ReportsManagerProps {
  school: School;
  students: Student[];
  marks: MarkRecord[];
  staffList: Staff[];
  onBack: () => void;
}

export const ReportsManager: React.FC<ReportsManagerProps> = ({
  school,
  students,
  marks,
  staffList,
  onBack,
}) => {
  const [reportType, setReportType] = useState<'students' | 'marks' | 'staff'>('students');

  // Breakdown by standard
  const stdCounts = {
    '9': students.filter((s) => String(s.standard) === '9').length,
    '10': students.filter((s) => String(s.standard) === '10').length,
    '11': students.filter((s) => String(s.standard) === '11').length,
    '12': students.filter((s) => String(s.standard) === '12').length,
  };

  const boysCount = students.filter((s) => s.gender === 'Boy').length;
  const girlsCount = students.filter((s) => s.gender === 'Girl').length;
  const otherCount = students.length - boysCount - girlsCount;

  // Export Students Master Excel
  const exportStudentsExcel = () => {
    if (students.length === 0) {
      alert('કોઈ વિદ્યાર્થી ડેટા ઉપલબ્ધ નથી.');
      return;
    }

    const rows = students.map((s, idx) => ({
      'ક્રમ': idx + 1,
      'શાળા DISE કોડ': s.diseCode || school.diseCode || '-',
      'G.R. નંબર': s.grNumber || '-',
      'વિદ્યાર્થીનું નામ (GR મુજબ)': s.studentName,
      'ધોરણ': s.standard,
      'વર્ગ / વિભાગ': s.section || s.division || '-',
      'રોલ નંબર': s.rollNumber || '-',
      'જન્મ તારીખ (DOB)': s.dob || '-',
      'પ્રવેશ તારીખ (DOA)': s.doa || '-',
      'જાતિ (Gender)': s.gender || '-',
      'જ્ઞાતિ / કેટેગરી (Caste)': s.caste || '-',
      'બ્લડ ગ્રૂપ (Blood Group)': s.bloodGroup || '-',
      'મોબાઈલ નંબર': s.contactNumber || s.mobileNumber || '-',
      'પિતાનું નામ': s.fatherName || '-',
      'પિતાનો વ્યવસાય': s.fatherOccupation || '-',
      'માતાનું નામ': s.motherName || '-',
      'માતાનો વ્યવસાય': s.motherOccupation || '-',
      'જન્મ સ્થળ': s.placeOfBirth || '-',
      'રહેઠાણનું સરનામું': s.address || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `${school.schoolName}_Students_Master.xlsx`);
  };

  // Export Marks Master Excel
  const exportMarksExcel = () => {
    if (marks.length === 0) {
      alert('કોઈ ગુણ ડેટા ઉપલબ્ધ નથી.');
      return;
    }

    const rows = marks.map((m, idx) => ({
      'ક્રમ': idx + 1,
      'વિદ્યાર્થીનું નામ': m.studentName,
      'ધોરણ': m.standard,
      'પરીક્ષા પ્રકાર': m.examType,
      'વિષય': m.subjectName || '-',
      'મેળવેલ ગુણ': m.totalObtained,
      'કુલ ગુણ': m.totalMax,
      'ટકા (%)': m.totalMax > 0 ? ((m.totalObtained / m.totalMax) * 100).toFixed(1) : '-',
      'ગ્રેડ': m.overallGrade || '-',
      'શૈક્ષણિક વર્ષ': m.academicYear,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');
    XLSX.writeFile(wb, `${school.schoolName}_Marks_Master.xlsx`);
  };

  // Print A4 Summary Report
  const handlePrintSummary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print report.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${school.schoolName} - શાળા સામાન્ય અહેવાલ</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: 'Anek Gujarati', 'Plus Jakarta Sans', system-ui, sans-serif;
            color: #0f172a;
            background: #fff;
            padding: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .school-header-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 4px;
          }
          .school-logo {
            width: 50px;
            height: 50px;
            object-fit: contain;
            border-radius: 6px;
          }
          .school-title {
            font-size: 20pt;
            font-weight: 800;
            text-transform: uppercase;
            color: #1e3a8a;
            margin: 0;
          }
          .report-title {
            font-size: 13pt;
            font-weight: 700;
            margin-top: 6px;
            color: #334155;
          }
          .stat-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 25px;
          }
          .stat-box {
            border: 1px solid #cbd5e1;
            padding: 12px;
            text-align: center;
            border-radius: 6px;
            background: #f8fafc;
          }
          .stat-val {
            font-size: 18pt;
            font-weight: 800;
            color: #1e3a8a;
          }
          .stat-lbl {
            font-size: 9pt;
            color: #64748b;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
          }
          th, td {
            border: 1px solid #94a3b8;
            padding: 8px 12px;
            font-size: 10.5pt;
          }
          th {
            background-color: #f1f5f9;
            font-weight: bold;
            text-align: left;
          }
          .footer-credit {
            margin-top: 40px;
            text-align: center;
            font-size: 9pt;
            color: #64748b;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
          }
          @media print {
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px 16px; margin-bottom: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <strong>A4 શાળા સામાન્ય અહેવાલ પ્રિન્ટ</strong>
          <div>
            <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-right: 8px;">
              🖨️ Print Report
            </button>
            <button onclick="window.close()" style="background: #64748b; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer;">
              Close
            </button>
          </div>
        </div>

        <div class="header">
          <div class="school-header-row">
            ${school.logoUrl ? `<img src="${school.logoUrl}" alt="School Logo" class="school-logo" />` : ''}
            <h1 class="school-title">${school.schoolName}</h1>
          </div>
          <div style="font-size: 10pt; color: #475569; margin-top: 4px;">
            ${school.district} • DISE: ${school.diseCode}
          </div>
          <div class="report-title">શાળા સામાન્ય અહેવાલ (General School Summary Report)</div>
          <div style="font-size: 9pt; color: #64748b; margin-top: 3px;">તારીખ: ${new Date().toLocaleDateString('gu-IN')}</div>
        </div>

        <div class="stat-grid">
          <div class="stat-box">
            <div class="stat-val">${students.length}</div>
            <div class="stat-lbl">કુલ વિદ્યાર્થીઓ</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${staffList.length}</div>
            <div class="stat-lbl">કુલ શિક્ષક/સ્ટાફ</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${marks.length}</div>
            <div class="stat-lbl">નોંધાયેલ પરીક્ષાઓ</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">4</div>
            <div class="stat-lbl">સક્રિય ધોરણો (9-12)</div>
          </div>
        </div>

        <h3 style="font-size: 12pt; margin-bottom: 8px;">૧. ધોરણવાર વિદ્યાર્થી સંખ્યા (Standard Breakdown)</h3>
        <table>
          <thead>
            <tr>
              <th>ધોરણ</th>
              <th style="text-align: center;">વિદ્યાર્થી સંખ્યા</th>
              <th style="text-align: center;">ટકાવારી (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ધોરણ ૯ (Standard 9)</td>
              <td style="text-align: center; font-weight: bold;">${stdCounts['9']}</td>
              <td style="text-align: center;">${students.length > 0 ? ((stdCounts['9'] / students.length) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td>ધોરણ ૧૦ (Standard 10)</td>
              <td style="text-align: center; font-weight: bold;">${stdCounts['10']}</td>
              <td style="text-align: center;">${students.length > 0 ? ((stdCounts['10'] / students.length) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td>ધોરણ ૧૧ (Standard 11)</td>
              <td style="text-align: center; font-weight: bold;">${stdCounts['11']}</td>
              <td style="text-align: center;">${students.length > 0 ? ((stdCounts['11'] / students.length) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td>ધોરણ ૧૨ (Standard 12)</td>
              <td style="text-align: center; font-weight: bold;">${stdCounts['12']}</td>
              <td style="text-align: center;">${students.length > 0 ? ((stdCounts['12'] / students.length) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr style="background: #f8fafc; font-weight: bold;">
              <td>કુલ સરવાળો (Total)</td>
              <td style="text-align: center;">${students.length}</td>
              <td style="text-align: center;">100%</td>
            </tr>
          </tbody>
        </table>

        <h3 style="font-size: 12pt; margin-bottom: 8px;">૨. જાતિવાર વિતરણ (Gender Distribution)</h3>
        <table>
          <thead>
            <tr>
              <th>વિગત</th>
              <th style="text-align: center;">સંખ્યા</th>
              <th style="text-align: center;">ટકાવારી (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>કુમાર (Boys)</td>
              <td style="text-align: center; font-weight: bold;">${boysCount}</td>
              <td style="text-align: center;">${students.length > 0 ? ((boysCount / students.length) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td>કન્યા (Girls)</td>
              <td style="text-align: center; font-weight: bold;">${girlsCount}</td>
              <td style="text-align: center;">${students.length > 0 ? ((girlsCount / students.length) * 100).toFixed(1) : 0}%</td>
            </tr>
          </tbody>
        </table>

        <div class="footer-credit">
          Vidyalayam • Created by NR Chad • General School Management System
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 450);
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
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl glass-card text-xs font-bold text-[#e4ded6] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#f59c73]" />
          <span>ડેશબોર્ડ પર પાછા જાઓ (Back to Dashboard)</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintSummary}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9d512d] hover:bg-[#b55e34] text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>A4 અહેવાલ પ્રિન્ટ (Print A4 Report)</span>
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card rounded-3xl border border-white/10 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#a99f91] uppercase">કુલ વિદ્યાર્થીઓ</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white font-mono">{students.length}</div>
          <div className="text-[11px] text-[#a99f91] mt-1">
            કુમાર: {boysCount} • કન્યા: {girlsCount}
          </div>
        </div>

        <div className="glass-card rounded-3xl border border-white/10 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#a99f91] uppercase">શિક્ષક / સ્ટાફ</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white font-mono">{staffList.length}</div>
          <div className="text-[11px] text-[#a99f91] mt-1">
            શિક્ષકો અને વહીવટી સ્ટાફ
          </div>
        </div>

        <div className="glass-card rounded-3xl border border-white/10 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#a99f91] uppercase">પરીક્ષા ગુણ રેકોર્ડ્સ</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white font-mono">{marks.length}</div>
          <div className="text-[11px] text-[#a99f91] mt-1">
            એકમ કસોટી અને સત્રાંત કસોટીઓ
          </div>
        </div>

        <div className="glass-card rounded-3xl border border-white/10 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#a99f91] uppercase">સક્રિય ધોરણો</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white font-mono">૪ ધોરણ</div>
          <div className="text-[11px] text-[#a99f91] mt-1">
            ધોરણ ૯, ૧૦, ૧૧, ૧૨
          </div>
        </div>
      </div>

      {/* Excel Export Hub */}
      <div className="glass-panel rounded-3xl border border-white/10 p-6 shadow-xl">
        <h3 className="text-base font-bold text-[#e4ded6] flex items-center gap-2 mb-2">
          <FileSpreadsheet className="w-4 h-4 text-[#f59c73]" />
          <span>Excel ડેટા નિકાસ કેન્દ્ર (Export to Excel)</span>
        </h3>
        <p className="text-xs text-[#a99f91] mb-6">
          સંપૂર્ણ ડેટાબેઝનું બેકઅપ અથવા વિશ્લેષણ માટે .xlsx ફાઇલો એક ક્લિકમાં ડાઉનલોડ કરો.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={exportStudentsExcel}
            className="glass-card rounded-2xl border border-white/10 p-4 text-left hover:border-white/20 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="text-xs font-bold text-[#e4ded6]">વિદ્યાર્થી માસ્ટર યાદી</div>
              <div className="text-[11px] text-[#a99f91] mt-1">
                તમામ {students.length} વિદ્યાર્થીઓના નામ, ધોરણ, રોલ નં, GR નં, સંપર્ક.
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 text-xs text-[#f59c73] font-bold">
              <Download className="w-3.5 h-3.5" />
              <span>Students.xlsx</span>
            </div>
          </button>

          <button
            onClick={exportMarksExcel}
            className="glass-card rounded-2xl border border-white/10 p-4 text-left hover:border-white/20 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="text-xs font-bold text-[#e4ded6]">પરીક્ષા ગુણ પત્રક ડેટા</div>
              <div className="text-[11px] text-[#a99f91] mt-1">
                તમામ {marks.length} ગુણ રેકોર્ડ્સ, વિષયવાર ગુણ અને ટકાવારી.
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 text-xs text-[#f59c73] font-bold">
              <Download className="w-3.5 h-3.5" />
              <span>Marks.xlsx</span>
            </div>
          </button>

          <div className="glass-card rounded-2xl border border-white/10 p-4 text-left flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[#e4ded6]">શાળા પ્રોફાઇલ અને સ્ટાફ</div>
              <div className="text-[11px] text-[#a99f91] mt-1">
                {staffList.length} સ્ટાફ સભ્યો, લાયકાત અને વિષય ફાળવણી.
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-xs text-[#a99f91]">
              સ્ટાફ પેજ પરથી Excel ઉપલબ્ધ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
