import React, { useState, useMemo } from 'react';
import { School, Student, Staff, AllowedStandard } from '../types';
import { getStudentDiseCode, getStudentDiseInlineStyle } from '../utils/idCardPdf';
import {
  CreditCard,
  Printer,
  Users,
  UserCheck,
  ArrowLeft,
  Filter,
  CheckSquare,
  Square,
  QrCode,
} from 'lucide-react';

function parseDateForSort(dateStr?: string): number {
  if (!dateStr || !dateStr.trim()) return 9999999999999;
  const clean = dateStr.trim();
  const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const t = new Date(year, month, day).getTime();
    return isNaN(t) ? 9999999999999 : t;
  }
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

interface IdCardsManagerProps {
  school: School;
  students: Student[];
  staffList: Staff[];
  onBack: () => void;
}

export const IdCardsManager: React.FC<IdCardsManagerProps> = ({
  school,
  students,
  staffList,
  onBack,
}) => {
  const [cardType, setCardType] = useState<'students' | 'staff'>('students');
  const [selectedStandard, setSelectedStandard] = useState<string>('ALL');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [headerTheme, setHeaderTheme] = useState<'dark' | 'light'>('dark');
  const [logoContrast, setLogoContrast] = useState<'normal' | 'contrast'>('normal');

  // Filter students
  const filteredStudents = students.filter((st) => {
    const matchStd = selectedStandard === 'ALL' || String(st.standard) === String(selectedStandard);
    const matchDiv = selectedDivision === 'ALL' || (st.division && st.division === selectedDivision);
    return matchStd && matchDiv;
  });

  // Select all / Deselect all
  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  // Seniority-based sorting for staff: school joining date first; tie-breaker: older staff first (earlier birth date)
  const sortedStaffList = useMemo(() => {
    const list = [...staffList];
    list.sort((a, b) => {
      const dateA = a.schoolJoiningDate || a.joiningDate || a.serviceJoiningDate || '';
      const dateB = b.schoolJoiningDate || b.joiningDate || b.serviceJoiningDate || '';
      const timeA = parseDateForSort(dateA);
      const timeB = parseDateForSort(dateB);
      if (timeA !== timeB) return timeA - timeB;

      // Older age = earlier birthdate = smaller epoch milliseconds
      const timeDobA = parseDateForSort(a.dob);
      const timeDobB = parseDateForSort(b.dob);
      if (timeDobA !== timeDobB) return timeDobA - timeDobB;

      return (a.fullName || '').localeCompare(b.fullName || '', 'gu');
    });
    return list;
  }, [staffList]);

  const toggleSelectAllStaff = () => {
    if (selectedStaffIds.size === sortedStaffList.length) {
      setSelectedStaffIds(new Set());
    } else {
      setSelectedStaffIds(new Set(sortedStaffList.map((s) => s.id)));
    }
  };

  const toggleStaff = (id: string) => {
    const next = new Set(selectedStaffIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStaffIds(next);
  };

  // Cards to print
  const studentsToPrint = filteredStudents.filter(
    (s) => selectedStudentIds.size === 0 || selectedStudentIds.has(s.id)
  );

  const staffToPrint = sortedStaffList.filter(
    (s) => selectedStaffIds.size === 0 || selectedStaffIds.has(s.id)
  );

  // Format date cleanly as DD-MM-YYYY
  const formatDateGuj = (dateStr?: string) => {
    if (!dateStr || dateStr.trim() === '' || dateStr === '-') return '-';
    const clean = dateStr.trim();
    const match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (match) {
      const [, y, m, d] = match;
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    return clean;
  };

  // Dynamic font sizing helpers to ensure long names never cut or wrap
  const getNamePrintStyle = (name: string, basePt: number = 11.5) => {
    const len = (name || '').trim().length;
    if (len <= 16) return `font-size: ${basePt}pt; font-weight: 900; line-height: 1.45;`;
    if (len <= 21) return `font-size: ${(basePt * 0.92).toFixed(2)}pt; font-weight: 900; letter-spacing: -0.1px; line-height: 1.45;`;
    if (len <= 26) return `font-size: ${(basePt * 0.84).toFixed(2)}pt; font-weight: 800; letter-spacing: -0.15px; line-height: 1.45;`;
    if (len <= 32) return `font-size: ${(basePt * 0.77).toFixed(2)}pt; font-weight: 800; letter-spacing: -0.2px; line-height: 1.45;`;
    if (len <= 38) return `font-size: ${(basePt * 0.70).toFixed(2)}pt; font-weight: 800; letter-spacing: -0.25px; line-height: 1.45;`;
    return `font-size: ${(basePt * 0.64).toFixed(2)}pt; font-weight: 800; letter-spacing: -0.35px; line-height: 1.45;`;
  };

  const getSchoolTitlePrintStyle = (name: string) => {
    const len = (name || '').trim().length;
    // Scales dynamically so school name fills boldly across the entire header right to the end without wrapping or getting cut
    if (len <= 20) return 'font-size: 11.5pt; font-weight: 800; letter-spacing: 0.1px; line-height: 1.35; white-space: nowrap;';
    if (len <= 28) return 'font-size: 10.5pt; font-weight: 800; letter-spacing: 0px; line-height: 1.35; white-space: nowrap;';
    if (len <= 36) return 'font-size: 9.8pt; font-weight: 800; letter-spacing: -0.1px; line-height: 1.35; white-space: nowrap;';
    if (len <= 45) return 'font-size: 9.0pt; font-weight: 800; letter-spacing: -0.15px; line-height: 1.35; white-space: nowrap;';
    if (len <= 55) return 'font-size: 8.4pt; font-weight: 800; letter-spacing: -0.2px; line-height: 1.35; white-space: nowrap;';
    return 'font-size: 7.8pt; font-weight: 800; letter-spacing: -0.25px; line-height: 1.35; white-space: nowrap;';
  };

  const getPreviewNameFontSize = (name: string) => {
    const len = (name || '').trim().length;
    if (len <= 16) return 'text-[15.5px] font-black text-amber-200';
    if (len <= 22) return 'text-[14.5px] font-black text-amber-200';
    if (len <= 28) return 'text-[13.5px] font-extrabold text-amber-200';
    if (len <= 34) return 'text-[12px] font-bold text-amber-200';
    return 'text-[11px] font-bold text-amber-200';
  };

  // Trigger Print with A4 Card Layout
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print ID cards.');
      return;
    }

    const isLightHeader = headerTheme === 'light';
    const isContrastLogo = logoContrast === 'contrast';

    const cardsHtml =
      cardType === 'students'
        ? studentsToPrint
            .map((st) => {
              const studentDise = getStudentDiseCode(st);

              const parentName =
                st.fatherName && st.fatherName.trim()
                  ? st.fatherName.trim()
                  : st.motherName && st.motherName.trim()
                  ? st.motherName.trim()
                  : (() => {
                      const parts = (st.studentName || '').trim().split(/\s+/);
                      if (parts.length >= 3) {
                        return parts[1] + (parts[2] ? ' ' + parts[2] : '');
                      } else if (parts.length === 2) {
                        return parts[1];
                      }
                      return '-';
                    })();

              const studentAddress =
                (st.address && st.address.trim()) ||
                (school.village
                  ? school.village + (school.taluka ? ', ' + school.taluka : '')
                  : school.district || '-');

              return `
          <div class="id-card">
            <div class="card-header ${isLightHeader ? 'light-header' : ''}">
              <div class="header-logo-row">
                ${school.logoUrl ? `<img src="${school.logoUrl}" class="school-logo-img ${isContrastLogo ? 'logo-contrast' : ''}" alt="Logo" />` : ''}
                <div class="header-titles">
                  <div class="school-title" style="${getSchoolTitlePrintStyle(school.schoolName)}" title="${school.schoolName}">${school.schoolName}</div>
                  <div class="school-sub-row">
                    <span class="school-sub">DISE: ${school.diseCode} ${school.district ? `• ${school.district}` : ''}</span>
                    <span class="badge-tag">વિદ્યાર્થી ID Card</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-body">
              <div class="photo-col">
                <div class="photo-box">
                  ${
                    st.photoUrl
                      ? `<img src="${st.photoUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
                      : `<div class="avatar-initial">${st.studentName.charAt(0) || 'S'}</div>
                         <div class="photo-caption">PHOTO</div>`
                  }
                </div>
                <div class="gr-pill">G.R. ${st.grNumber || '-'}</div>
                ${st.bloodGroup ? `<div class="blood-pill">BLOOD ${st.bloodGroup}</div>` : ''}
              </div>
              <div class="details-box">
                <div class="name-field" style="${getNamePrintStyle(st.studentName, 11)}" title="${st.studentName}">${st.studentName}</div>
                <div class="field-row">
                  <span class="lbl">ધોરણ:</span>
                  <span class="val font-bold">${st.standard} ${st.section || st.division ? `(${st.section || st.division})` : ''}</span>
                  <span class="lbl" style="margin-left: 8px;">રોલ નં:</span>
                  <span class="val font-bold">${st.rollNumber || '-'}</span>
                </div>
                <div class="field-row">
                  <span class="lbl">વિદ્યાર્થી DISE:</span>
                  <span class="val mono-dise" style="${getStudentDiseInlineStyle(studentDise)}">${studentDise}</span>
                </div>
                <div class="field-row">
                  <span class="lbl">જન્મ તારીખ:</span>
                  <span class="val font-bold" style="font-size:6.3pt;">${st.dob || '-'}</span>
                  <span class="lbl" style="margin-left: 6px;">પ્રવેશ:</span>
                  <span class="val val-doa" style="color:#0284c7;font-weight:700;font-size:6.1pt;">${st.doa || '-'}</span>
                </div>
                <div class="field-row">
                  <span class="lbl">સંપર્ક:</span>
                  <span class="val font-bold">${st.contactNumber || '-'}</span>
                  ${st.caste ? `<span class="lbl" style="margin-left: 6px;">જાતિ:</span><span class="val font-bold">${st.caste}</span>` : ''}
                </div>
                <div class="field-row">
                  <span class="lbl">સરનામું:</span>
                  <span class="val" title="${studentAddress}" style="font-size:5.9pt;color:#475569;">${studentAddress}</span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <div class="validity">શૈક્ષણિક વર્ષ ૨૦૨૬–૨૭</div>
              <div class="sig-box">
                <div class="sig-line">આચાર્યશ્રી સહી & સિક્કો</div>
              </div>
            </div>
          </div>
        `;
            })
            .join('')
        : staffToPrint
            .map(
              (stf) => `
          <div class="id-card staff-card">
            <div class="card-header staff-header ${isLightHeader ? 'light-header' : ''}">
              <div class="header-logo-row">
                ${school.logoUrl ? `<img src="${school.logoUrl}" class="school-logo-img ${isContrastLogo ? 'logo-contrast' : ''}" alt="Logo" />` : ''}
                <div class="header-titles">
                  <div class="school-title" style="${getSchoolTitlePrintStyle(school.schoolName)}" title="${school.schoolName}">${school.schoolName}</div>
                  <div class="school-sub-row">
                    <span class="school-sub">DISE: ${school.diseCode} ${school.district ? `• ${school.district}` : ''}</span>
                    <span class="badge-tag staff-tag">સ્ટાફ ID Card</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-body">
              <div class="photo-col">
                <div class="photo-box">
                  ${
                    stf.photoUrl
                      ? `<img src="${stf.photoUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
                      : `<div class="avatar-initial staff-initial">${stf.fullName.charAt(0) || 'T'}</div>
                         <div class="photo-caption">PHOTO</div>`
                  }
                </div>
                ${stf.bloodGroup ? `<div class="blood-pill">BLOOD ${stf.bloodGroup}</div>` : ''}
                <div class="teacher-sign-box">
                  <div class="teacher-sign-line"></div>
                  <div class="teacher-sign-label">શિક્ષકની સહી</div>
                </div>
              </div>
              <div class="details-box">
                <div class="name-field staff-name" style="${getNamePrintStyle(stf.fullName, 10.5)}" title="${stf.fullName}">${stf.fullName}</div>
                <div class="field-row">
                  <span class="lbl">હોદ્દો:</span>
                  <span class="val font-bold" style="color:#78350f;">${stf.designation || 'શિક્ષક'}</span>
                  <span class="lbl" style="margin-left: 6px;">વિભાગ:</span>
                  <span class="val font-bold" style="color:#0f172a;">${stf.section || stf.vibhag || 'માધ્યમિક'}</span>
                </div>
                <div class="field-row">
                  <span class="lbl">વિષય:</span>
                  <span class="val font-bold" style="color:#0f172a;">${stf.subject || '-'}</span>
                  <span class="lbl" style="margin-left: 6px;">શિક્ષક કોડ:</span>
                  <span class="val font-bold" style="font-family: monospace; color: #78350f; font-size: 6.8pt;">${stf.teacherCode || '-'}</span>
                  ${stf.hrpnNumber ? `<span class="lbl" style="margin-left: 5px;">HRPN:</span><span class="val font-bold" style="font-family: monospace; color: #0369a1; font-size: 6.8pt;">${stf.hrpnNumber}</span>` : ''}
                </div>
                <div class="field-row">
                  <span class="lbl">જન્મ તારીખ:</span>
                  <span class="val font-bold" style="color:#0f172a;">${formatDateGuj(stf.dob)}</span>
                  ${stf.mobile ? `<span class="lbl" style="margin-left: 6px;">મોબાઇલ:</span><span class="val font-bold font-mono">${stf.mobile}</span>` : ''}
                </div>
                <div class="field-row">
                  <span class="lbl">ખાતામાં દાખલ:</span>
                  <span class="val font-bold" style="color:#0284c7;">${formatDateGuj(stf.serviceJoiningDate || stf.joiningDate)}</span>
                </div>
                <div class="field-row">
                  <span class="lbl">શાળામાં દાખલ:</span>
                  <span class="val font-bold" style="color:#0d9488;">${formatDateGuj(stf.schoolJoiningDate || stf.joiningDate)}</span>
                </div>
                <div class="field-row">
                  <span class="lbl">સરનામું:</span>
                  <span class="val" title="${stf.address || '-'}" style="font-size:5.8pt;color:#475569;max-width:48mm;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${stf.address || school.district || '-'}
                  </span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <div class="validity">શાળા સ્ટાફ રેકોર્ડ</div>
              <div class="sig-box">
                <div class="sig-line">આચાર્યશ્રી સહી & સિક્કો</div>
              </div>
            </div>
          </div>
        `
            )
            .join('');

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${school.schoolName} - ID Cards Print</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;500;600;700;800;900&family=Anek+Gujarati:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;500;600;700;800;900&family=Anek+Gujarati:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 8mm 6mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: 'Noto Sans Gujarati', 'Anek Gujarati', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            background: #fff;
            color: #0f172a;
            margin: 0;
            padding: 10px;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8mm 6mm;
            page-break-inside: auto;
            justify-items: center;
          }
          @media screen and (max-width: 768px) {
            .grid-container {
              grid-template-columns: 1fr;
              gap: 8mm;
              padding: 0;
            }
            .id-card {
              margin: 0 auto;
              max-width: 100%;
            }
          }
          @media print {
            .grid-container {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 8mm 6mm !important;
            }
          }
          .id-card {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            overflow: hidden;
            width: 86mm;
            height: 54mm;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            background: #ffffff;
            box-sizing: border-box;
          }
          .card-header {
            background: linear-gradient(135deg, #090d16 0%, #1e293b 100%);
            color: #ffffff;
            padding: 2.2mm 3.5mm 1.8mm 3.5mm;
            text-align: left;
            border-bottom: 2px solid #f59c73;
            box-sizing: border-box;
            width: 100%;
          }
          .card-header.light-header {
            background: #ffffff !important;
            border-bottom: 2px solid #e27d4e !important;
            color: #0f172a !important;
          }
          .card-header.light-header .school-title {
            color: #0f172a !important;
          }
          .card-header.light-header .school-sub {
            color: #475569 !important;
          }
          .card-header.light-header .badge-tag {
            background: #e27d4e !important;
            color: #ffffff !important;
          }
          .card-header.light-header .school-logo-img {
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
          .card-header.light-header .school-logo-img.logo-contrast {
            filter: brightness(0) !important; /* Pure black on white background */
          }
          .header-logo-row {
            display: flex;
            align-items: center;
            gap: 5.5px;
            width: 100%;
            background: transparent !important;
          }
          .school-logo-img {
            width: 10.5mm;
            height: 10.5mm;
            max-width: 10.5mm;
            max-height: 10.5mm;
            object-fit: contain;
            background: transparent !important;
            background-color: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            flex-shrink: 0;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            image-rendering: -webkit-optimize-contrast;
          }
          .school-logo-img.logo-contrast {
            filter: brightness(0) invert(1); /* Pure white on black background */
          }
          .header-titles {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .school-title {
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.35;
            color: #ffffff;
            letter-spacing: 0.05px;
            white-space: nowrap !important;
            overflow: hidden;
            text-overflow: clip;
            width: 100%;
            display: block;
          }
          .school-sub-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 1px;
            width: 100%;
          }
          .school-sub {
            font-size: 5.8pt;
            color: #cbd5e1;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .badge-tag {
            display: inline-block;
            background: #f59c73;
            color: #0f172a;
            font-size: 5.2pt;
            font-weight: 800;
            padding: 0.5px 5px;
            border-radius: 4px;
            letter-spacing: 0.2px;
            white-space: nowrap;
          }
          .staff-header {
            background: linear-gradient(135deg, #451a03 0%, #78350f 100%) !important;
            border-bottom: 2px solid #fbbf24 !important;
          }
          .staff-tag {
            background: #fde68a !important;
            color: #78350f !important;
          }
          .card-body {
            padding: 1.8mm 3.2mm 1.5mm 3.2mm;
            display: flex;
            gap: 6.5px;
            flex: 1;
            align-items: stretch;
            box-sizing: border-box;
            overflow: hidden;
          }
          .photo-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
            width: 19mm;
            gap: 1.5px;
          }
          .photo-box {
            width: 19mm;
            height: 22.5mm;
            border: 1px solid #94a3b8;
            border-radius: 4px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            overflow: hidden;
          }
          .staff-card .photo-box {
            border-color: #b45309;
          }
          .teacher-sign-box {
            width: 100%;
            text-align: center;
            margin-top: auto;
            padding-top: 1px;
          }
          .teacher-sign-line {
            width: 88%;
            border-bottom: 0.8px dashed #64748b;
            margin: 0 auto 1px auto;
          }
          .teacher-sign-label {
            font-size: 5pt;
            font-weight: 700;
            color: #475569;
            line-height: 1.35;
            white-space: nowrap;
          }
          .gr-pill {
            font-size: 5.5pt;
            font-weight: 800;
            background: #f1f5f9;
            color: #0f172a;
            border-radius: 2.5px;
            padding: 0.5px 2px;
            text-align: center;
            width: 100%;
            border: 0.8px solid #cbd5e1;
            font-family: monospace;
          }
          .blood-pill {
            font-size: 5.2pt;
            font-weight: 800;
            background: #fef2f2;
            color: #dc2626;
            border-radius: 2.5px;
            padding: 0.5px 2px;
            text-align: center;
            width: 100%;
            border: 0.8px solid #fecaca;
            font-family: inherit;
          }
          .avatar-initial {
            font-size: 14pt;
            font-weight: 800;
            color: #1e3a8a;
          }
          .staff-initial {
            color: #78350f !important;
          }
          .photo-caption {
            font-size: 5pt;
            color: #94a3b8;
            margin-top: 1px;
          }
          .details-box {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
            overflow: visible;
          }
          .name-field {
            font-size: 9.8pt;
            font-weight: 800;
            color: #0f172a;
            background: #f8fafc;
            border-left: 2.8px solid #e27d4e;
            border-bottom: 1px solid #cbd5e1;
            padding: 2.5px 5px 2px 5px;
            margin-bottom: 1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.45;
            border-radius: 0 4px 4px 0;
            box-sizing: border-box;
          }
          .staff-card .name-field {
            border-left: 2.8px solid #b45309;
            background: #fffbeb;
          }
          .field-row {
            font-size: 6.2pt;
            line-height: 1.48;
            display: flex;
            align-items: baseline;
            color: #334155;
            white-space: nowrap;
            padding: 0.5px 0;
          }
          .field-row .lbl {
            color: #64748b;
            margin-right: 3px;
            font-weight: 600;
            white-space: nowrap;
            flex-shrink: 0;
            line-height: 1.48;
          }
          .field-row .val {
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex-shrink: 0;
            line-height: 1.48;
            font-weight: 700;
          }
          .field-row .val.mono-dise {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
            font-weight: 800 !important;
            color: #0369a1 !important;
            letter-spacing: -0.35px !important;
            font-size: 5.7pt !important;
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: nowrap !important;
            max-width: 100% !important;
          }
          .field-row .val.val-doa {
            white-space: nowrap;
            letter-spacing: -0.2px;
          }
          .font-bold {
            font-weight: 700;
          }
          .text-red {
            color: #dc2626 !important;
          }
          .card-footer {
            background: #f8fafc;
            border-top: 1px solid #cbd5e1;
            padding: 1mm 3.5mm;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 6.2mm;
            box-sizing: border-box;
            margin-top: auto;
            flex-shrink: 0;
          }
          .validity {
            font-size: 5.8pt;
            color: #475569;
            font-weight: 600;
            line-height: 1;
          }
          .sig-box {
            text-align: right;
            line-height: 1;
          }
          .sig-line {
            font-size: 5.8pt;
            font-weight: 700;
            color: #1e293b;
            line-height: 1;
          }
          @media print {
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #0f172a;">A4 ID Card Grid Print</strong>
            <span style="color: #64748b; font-size: 12px; margin-left: 10px;">(8 cards per A4 page • Standard Badge Dimensions)</span>
          </div>
          <div>
            <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-right: 8px;">
              🖨️ Print ID Cards
            </button>
            <button onclick="window.close()" style="background: #64748b; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer;">
              Close
            </button>
          </div>
        </div>

        <div class="grid-container">
          ${cardsHtml}
        </div>

        <script>
          function fitNames() {
            var nameEls = document.querySelectorAll('.name-field');
            nameEls.forEach(function(el) {
              var parent = el.parentElement;
              if (!parent) return;
              var maxW = parent.getBoundingClientRect ? parent.getBoundingClientRect().width : parent.clientWidth;
              if (maxW <= 0) return;
              var curSize = parseFloat(window.getComputedStyle(el).fontSize) || 11;
              while (el.scrollWidth > maxW && curSize > 6.5) {
                curSize -= 0.2;
                el.style.fontSize = curSize + 'px';
                el.style.letterSpacing = '-0.25px';
              }
            });

            var schoolEls = document.querySelectorAll('.school-title');
            schoolEls.forEach(function(el) {
              var parent = el.parentElement;
              if (!parent) return;
              var maxW = parent.getBoundingClientRect ? parent.getBoundingClientRect().width : parent.clientWidth;
              if (maxW <= 0) return;
              var curSize = parseFloat(window.getComputedStyle(el).fontSize) || 12;
              while (el.scrollWidth > maxW && curSize > 7.5) {
                curSize -= 0.15;
                el.style.fontSize = curSize + 'px';
                el.style.letterSpacing = '-0.2px';
              }
            });
          }

          window.onload = function() {
            fitNames();
            setTimeout(function() {
              fitNames();
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
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl glass-card text-xs font-bold text-[#e4ded6] hover:text-white transition-colors cursor-pointer active:scale-95"
          title="પાછળના મેનુ પર જાઓ (Go Back)"
        >
          <ArrowLeft className="w-4 h-4 text-[#f59c73]" />
          <span>પાછળ જાઓ (Go Back)</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Header Background Toggle */}
          <button
            onClick={() => setHeaderTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass-card text-xs font-semibold text-[#e4ded6] hover:text-white transition-colors cursor-pointer border border-white/10"
            title="હેડર બેકગ્રાઉન્ડ બદલો (ડાર્ક / વ્હાઇટ)"
          >
            <span
              className="w-2.5 h-2.5 rounded-full border"
              style={{
                backgroundColor: headerTheme === 'dark' ? '#0f172a' : '#ffffff',
                borderColor: '#f59c73',
              }}
            ></span>
            <span>હેડર: {headerTheme === 'dark' ? 'ડાર્ક (Dark)' : 'વ્હાઇટ (White)'}</span>
          </button>

          {/* Logo Invert / Contrast Toggle */}
          <button
            onClick={() => setLogoContrast((c) => (c === 'normal' ? 'contrast' : 'normal'))}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass-card text-xs font-semibold text-[#e4ded6] hover:text-white transition-colors cursor-pointer border border-white/10"
            title="લોગો કલર (ડાર્ક બેકગ્રાઉન્ડમાં વ્હાઇટ અને વ્હાઇટ બેકગ્રાઉન્ડમાં બ્લેક)"
          >
            <span className="font-bold text-[10px] px-1 py-0.2 rounded bg-white/20 text-[#f59c73]">
              B/W
            </span>
            <span>
              લોગો: {logoContrast === 'contrast' ? 'કોન્ટ્રાસ્ટ (White/Black)' : 'મૂળ કલર (Normal)'}
            </span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#9d512d] hover:bg-[#b55e34] text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>
              A4 ગ્રીડ પ્રિન્ટ (Print{' '}
              {cardType === 'students' ? studentsToPrint.length : staffToPrint.length} Cards)
            </span>
          </button>
        </div>
      </div>

      {/* Mode Switcher: Students ID vs Staff ID */}
      <div className="glass-panel rounded-3xl border border-white/10 p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setCardType('students')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                cardType === 'students'
                  ? 'bg-[#9d512d] text-white shadow-lg'
                  : 'glass-card text-[#a99f91] hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>વિદ્યાર્થી ઓળખપત્ર (Students ID)</span>
            </button>

            <button
              onClick={() => setCardType('staff')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                cardType === 'staff'
                  ? 'bg-[#9d512d] text-white shadow-lg'
                  : 'glass-card text-[#a99f91] hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>સ્ટાફ ઓળખપત્ર (Staff ID)</span>
            </button>
          </div>

          {/* Student Filter Controls */}
          {cardType === 'students' && (
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#a99f91] font-semibold">ધોરણ:</label>
                <select
                  value={selectedStandard}
                  onChange={(e) => setSelectedStandard(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                >
                  <option value="ALL">તમામ ધોરણ (All)</option>
                  <option value="9">ધોરણ 9</option>
                  <option value="10">ધોરણ 10</option>
                  <option value="11">ધોરણ 11</option>
                  <option value="12">ધોરણ 12</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-[#a99f91] font-semibold">વર્ગ/વિભાગ:</label>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                >
                  <option value="ALL">તમામ વર્ગ</option>
                  <option value="A">વર્ગ A</option>
                  <option value="B">વર્ગ B</option>
                  <option value="C">વર્ગ C</option>
                  <option value="D">વર્ગ D</option>
                </select>
              </div>

              <button
                onClick={toggleSelectAllStudents}
                className="inline-flex items-center gap-1.5 text-xs text-[#f59c73] hover:underline font-bold ml-2 cursor-pointer"
              >
                {selectedStudentIds.size === filteredStudents.length ? (
                  <CheckSquare className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                <span>તમામ પસંદ કરો</span>
              </button>
            </div>
          )}

          {cardType === 'staff' && (
            <button
              onClick={toggleSelectAllStaff}
              className="inline-flex items-center gap-1.5 text-xs text-[#f59c73] hover:underline font-bold cursor-pointer"
            >
              {selectedStaffIds.size === staffList.length ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>તમામ સ્ટાફ પસંદ કરો ({staffList.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards Preview Grid */}
      <div className="glass-panel rounded-3xl border border-white/10 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[#e4ded6] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#f59c73]" />
            <span>
              {cardType === 'students' ? 'વિદ્યાર્થી ID કાર્ડ પ્રિવ્યૂ' : 'સ્ટાફ ID કાર્ડ પ્રિવ્યૂ'} (
              {cardType === 'students' ? studentsToPrint.length : staffToPrint.length} કાર્ડ્સ)
            </span>
          </h3>
          <span className="text-xs text-[#a99f91]">
            A4 પેજ પર 8 કાર્ડ એકસાથે પ્રિન્ટ માટે યોગ્ય
          </span>
        </div>

        {cardType === 'students' ? (
          filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#a99f91]">
              પસંદ કરેલ ફિલ્ટરમાં કોઈ વિદ્યાર્થી મળ્યા નથી.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((st) => {
                const isSelected =
                  selectedStudentIds.size === 0 || selectedStudentIds.has(st.id);
                return (
                  <div
                    key={st.id}
                    onClick={() => toggleStudent(st.id)}
                    className={`cursor-pointer rounded-2xl border transition-all overflow-hidden bg-[#101720] shadow-xl ${
                      isSelected
                        ? 'border-[#f59c73] ring-1 ring-[#f59c73]/50'
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {/* Card Header */}
                    <div
                      className={`p-2.5 border-b-2 transition-colors ${
                        headerTheme === 'dark'
                          ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-[#f59c73] text-white'
                          : 'bg-white border-[#e27d4e] text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {school.logoUrl && (
                          <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-transparent">
                            <img
                              src={school.logoUrl}
                              alt="Logo"
                              className={`w-full h-full object-contain ${
                                logoContrast === 'contrast'
                                  ? headerTheme === 'dark'
                                    ? 'brightness-0 invert'
                                    : 'brightness-0'
                                  : ''
                              }`}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div
                            className={`font-extrabold uppercase leading-normal whitespace-nowrap overflow-hidden text-ellipsis ${
                              headerTheme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}
                            style={{
                              fontSize:
                                school.schoolName.length > 50
                                  ? '12px'
                                  : school.schoolName.length > 35
                                  ? '13.5px'
                                  : school.schoolName.length > 24
                                  ? '15px'
                                  : '16.5px',
                              letterSpacing: school.schoolName.length > 40 ? '-0.15px' : '0.1px',
                            }}
                            title={school.schoolName}
                          >
                            {school.schoolName}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <span
                              className={`text-[10px] font-medium truncate ${
                                headerTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                              }`}
                            >
                              DISE: {school.diseCode} {school.district ? `• ${school.district}` : ''}
                            </span>
                            <span
                              className={`inline-block px-2 py-0.2 rounded text-[8.5px] font-extrabold tracking-wider whitespace-nowrap shrink-0 ${
                                headerTheme === 'dark'
                                  ? 'bg-[#f59c73] text-[#0f172a]'
                                  : 'bg-[#e27d4e] text-white'
                              }`}
                            >
                              વિદ્યાર્થી ID Card
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3 flex gap-3 items-center">
                      <div className="flex flex-col items-center shrink-0 gap-1">
                        <div className="w-18 h-22 rounded-xl bg-slate-800 border-2 border-slate-700 flex flex-col items-center justify-center shrink-0 overflow-hidden shadow-inner">
                          {st.photoUrl ? (
                            <img src={st.photoUrl} alt={st.studentName} className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <span className="text-2xl font-black text-[#f59c73]">
                                {st.studentName.charAt(0) || 'S'}
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold mt-0.5 tracking-wider">PHOTO</span>
                            </>
                          )}
                        </div>
                        <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-white/10 text-center w-full">
                          G.R. {st.grNumber || '-'}
                        </span>
                        {st.bloodGroup && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-center w-full">
                            {st.bloodGroup}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                        <div
                          className="whitespace-nowrap overflow-hidden leading-tight font-black text-amber-300 text-[15px] sm:text-base bg-white/5 px-2.5 py-1.5 rounded-lg border-l-3 border-[#f59c73]"
                          title={st.studentName}
                        >
                          {st.studentName}
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                          <div>
                            <span className="text-[#a99f91]">ધોરણ: </span>
                            <strong className="text-white font-bold">
                              {st.standard} {st.section || st.division ? `(${st.section || st.division})` : ''}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[#a99f91]">રોલ: </span>
                            <span className="text-white font-mono font-bold">{st.rollNumber || '-'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[#a99f91]">વિદ્યાર્થી DISE: </span>
                            <span className="text-cyan-300 font-mono font-bold tracking-tight text-[10.5px]">
                              {getStudentDiseCode(st)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#a99f91]">જન્મ: </span>
                            <span className="text-slate-200 font-mono text-[10px]">{st.dob || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[#a99f91]">પ્રવેશ: </span>
                            <span className="text-sky-300 font-mono text-[10px]">{st.doa || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[#a99f91]">સંપર્ક: </span>
                            <span className="text-emerald-400 font-mono text-[10px] font-semibold">{st.contactNumber || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[#a99f91]">જાતિ: </span>
                            <span className="text-slate-300 text-[10px]">{st.caste || '-'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[#a99f91]">સરનામું: </span>
                            <span className="text-slate-400 text-[10px] truncate">
                              {st.address || school.village || school.district || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 py-2 bg-black/40 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300 font-medium">
                      <span>શૈક્ષણિક વર્ષ ૨૦૨૬–૨૭</span>
                      <span className="font-bold text-white flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f59c73]"></span>
                        આચાર્યશ્રી સહી & સિક્કો
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : staffList.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#a99f91]">
            કોઈ સ્ટાફ સભ્ય ઉપલબ્ધ નથી. કૃપા કરીને પ્રથમ સ્ટાફ મેનેજરમાં જઈને સ્ટાફ ઉમેરો.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedStaffList.map((stf) => {
              const isSelected = selectedStaffIds.size === 0 || selectedStaffIds.has(stf.id);
              return (
                <div
                  key={stf.id}
                  onClick={() => toggleStaff(stf.id)}
                  className={`cursor-pointer rounded-2xl border transition-all overflow-hidden bg-[#101720] shadow-xl ${
                    isSelected
                      ? 'border-amber-400 ring-1 ring-amber-400/50'
                      : 'border-white/10 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`p-2.5 border-b-2 transition-colors ${
                      headerTheme === 'dark'
                        ? 'bg-gradient-to-r from-amber-950 via-[#78350f] to-amber-950 border-amber-400 text-white'
                        : 'bg-white border-amber-600 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {school.logoUrl && (
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-transparent">
                          <img
                            src={school.logoUrl}
                            alt="Logo"
                            className={`w-full h-full object-contain ${
                              logoContrast === 'contrast'
                                ? headerTheme === 'dark'
                                  ? 'brightness-0 invert'
                                  : 'brightness-0'
                                : ''
                            }`}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div
                          className={`font-extrabold uppercase leading-normal whitespace-nowrap overflow-hidden text-ellipsis ${
                            headerTheme === 'dark' ? 'text-white' : 'text-slate-900'
                          }`}
                          style={{
                            fontSize:
                              school.schoolName.length > 50
                                ? '12px'
                                : school.schoolName.length > 35
                                ? '13.5px'
                                : school.schoolName.length > 24
                                ? '15px'
                                : '16.5px',
                            letterSpacing: school.schoolName.length > 40 ? '-0.15px' : '0.1px',
                          }}
                          title={school.schoolName}
                        >
                          {school.schoolName}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <span
                            className={`text-[10px] font-medium truncate ${
                              headerTheme === 'dark' ? 'text-amber-200' : 'text-slate-600'
                            }`}
                          >
                            DISE: {school.diseCode} {school.district ? `• ${school.district}` : ''}
                          </span>
                          <span
                            className={`inline-block px-2 py-0.2 rounded text-[8.5px] font-extrabold tracking-wider whitespace-nowrap shrink-0 ${
                              headerTheme === 'dark'
                                ? 'bg-amber-300 text-[#78350f]'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            સ્ટાફ ID Card
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 flex gap-3 items-center">
                    <div className="flex flex-col items-center shrink-0 gap-1 w-20">
                      <div className="w-18 h-22 rounded-xl bg-amber-950/40 border-2 border-amber-700/50 overflow-hidden flex flex-col items-center justify-center shrink-0 shadow-inner">
                        {stf.photoUrl ? (
                          <img
                            src={stf.photoUrl}
                            alt={stf.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            <span className="text-2xl font-black text-amber-300">
                              {stf.fullName.charAt(0) || 'T'}
                            </span>
                            <span className="text-[8px] text-amber-200/70 font-bold mt-0.5 tracking-wider">PHOTO</span>
                          </>
                        )}
                      </div>
                      {stf.bloodGroup && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-center w-full">
                          {stf.bloodGroup}
                        </span>
                      )}
                      <div className="w-full text-center mt-0.5 border-t border-dashed border-amber-600/40 pt-1">
                        <span className="text-[8px] font-bold text-amber-200/90 tracking-tight">શિક્ષકની સહી</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                      <div
                        className="whitespace-nowrap overflow-hidden leading-[1.45] font-black text-[#fde68a] text-sm bg-white/5 px-2.5 py-1.5 rounded-lg border-l-3 border-amber-400"
                        title={stf.fullName}
                      >
                        {stf.fullName}
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] leading-[1.45]">
                        <div>
                          <span className="text-[#a99f91]">હોદ્દો: </span>
                          <strong className="text-amber-300 font-bold">{stf.designation || 'શિક્ષક'}</strong>
                        </div>
                        <div>
                          <span className="text-[#a99f91]">વિભાગ: </span>
                          <span className="text-amber-200 font-semibold">{stf.section || stf.vibhag || 'માધ્યમિક'}</span>
                        </div>
                        <div>
                          <span className="text-[#a99f91]">વિષય: </span>
                          <span className="text-white font-medium">{stf.subject || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#a99f91]">શિક્ષક કોડ: </span>
                          <span className="text-amber-200 font-mono font-bold">{stf.teacherCode || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#a99f91]">HRPN નં: </span>
                          <span className="text-cyan-300 font-mono font-bold">{stf.hrpnNumber || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#a99f91]">જન્મ તારીખ: </span>
                          <span className="text-white font-medium">{formatDateGuj(stf.dob)}</span>
                        </div>
                        <div>
                          <span className="text-[#a99f91]">મોબાઈલ: </span>
                          <span className="text-white font-mono">{stf.mobile || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#a99f91]">ખાતામાં દાખલ: </span>
                          <span className="text-sky-300 font-mono text-[10px] font-semibold">{formatDateGuj(stf.serviceJoiningDate || stf.joiningDate)}</span>
                        </div>
                        <div>
                          <span className="text-[#a99f91]">શાળામાં દાખલ: </span>
                          <span className="text-teal-300 font-mono text-[10px] font-semibold">{formatDateGuj(stf.schoolJoiningDate || stf.joiningDate)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[#a99f91]">સરનામું: </span>
                          <span className="text-slate-300 text-[10px] truncate" title={stf.address || school.district || '-'}>
                            {stf.address || school.district || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2 bg-black/40 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300 font-medium">
                    <span>શાળા સ્ટાફ રેકોર્ડ</span>
                    <span className="font-bold text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      આચાર્યશ્રી સહી & સિક્કો
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
