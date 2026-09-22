import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Trash2,
  Printer,
  Edit3,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Landmark,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { School, Staff } from '../types';
import { updateStaff } from '../services/staffService';
import { compressStudentPhoto } from '../utils/imageUtils';

interface StaffProfileModalProps {
  staff: Staff;
  schoolId: string;
  school?: School | null;
  isOpen: boolean;
  onClose: () => void;
  onStaffUpdated?: (updatedStaff: Staff) => void;
  onEditStaff?: (staff: Staff) => void;
  onGenerateIdCard?: (staff: Staff) => void;
}

export const StaffProfileModal: React.FC<StaffProfileModalProps> = ({
  staff,
  schoolId,
  school,
  isOpen,
  onClose,
  onStaffUpdated,
  onEditStaff,
  onGenerateIdCard,
}) => {
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3500);
  };

  // Direct Photo Upload & Save
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setPhotoUploading(true);
      setError(null);
      const compressed = await compressStudentPhoto(file, 320, 400, 0.82);

      await updateStaff(schoolId, staff.id, { photoUrl: compressed });
      const updated = { ...staff, photoUrl: compressed };
      onStaffUpdated?.(updated);
      showSuccess('સ્ટાફ ફોટો સફળતાપૂર્વક અપડેટ થયો.');
    } catch (err: any) {
      console.error('Staff photo upload error:', err);
      showError(err.message || 'ફોટો પ્રોસેસ કરવામાં ભૂલ આવી.');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  // Direct Remove Photo
  const handleRemovePhoto = async () => {
    if (!window.confirm('શું તમે સ્ટાફનો ફોટો દૂર કરવા માંગો છો?')) return;

    try {
      setPhotoUploading(true);
      await updateStaff(schoolId, staff.id, { photoUrl: '' });
      const updated = { ...staff, photoUrl: '' };
      onStaffUpdated?.(updated);
      showSuccess('સ્ટાફ ફોટો દૂર કરવામાં આવ્યો.');
    } catch (err: any) {
      console.error('Error removing photo:', err);
      showError('ફોટો દૂર કરવામાં ભૂલ આવી.');
    } finally {
      setPhotoUploading(false);
    }
  };

  // Print Staff Profile / Bio-data
  const handlePrintProfile = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('પ્રિન્ટ વિન્ડો ખોલવા માટે કૃપા કરીને પોપ-અપ પરવાનગી આપો.');
      return;
    }

    const schoolName = school?.schoolName || 'શાળા નામ';
    const diseCode = school?.diseCode || '';
    const district = school?.district || '';
    const address = school?.address || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="utf-8" />
        <title>${staff.fullName} - સ્ટાફ બાયોડેટા / પ્રોફાઇલ</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #1a202c;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #2d3748;
            padding: 20px;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #2d3748;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .school-name {
            font-size: 20px;
            font-weight: bold;
            color: #1a365d;
            margin-bottom: 4px;
          }
          .school-info {
            font-size: 13px;
            color: #4a5568;
          }
          .doc-title {
            font-size: 16px;
            font-weight: bold;
            margin-top: 8px;
            text-decoration: underline;
            color: #2b6cb0;
          }
          .top-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
            gap: 20px;
          }
          .summary-info {
            flex: 1;
          }
          .photo-box {
            width: 120px;
            height: 145px;
            border: 1.5px solid #4a5568;
            border-radius: 4px;
            overflow: hidden;
            background: #f7fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .photo-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .photo-placeholder {
            font-size: 11px;
            color: #a0aec0;
            padding: 10px;
          }
          .section-heading {
            font-size: 13px;
            font-weight: bold;
            background: #edf2f7;
            padding: 6px 10px;
            border-left: 4px solid #2b6cb0;
            margin-top: 14px;
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 10px;
          }
          table th, table td {
            border: 1px solid #cbd5e0;
            padding: 7px 10px;
            text-align: left;
          }
          table th {
            background-color: #f7fafc;
            width: 32%;
            color: #4a5568;
            font-weight: 600;
          }
          table td {
            color: #1a202c;
            font-weight: 500;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            padding: 0 20px;
          }
          .sign-block {
            text-align: center;
            border-top: 1px solid #718096;
            width: 200px;
            padding-top: 8px;
            font-size: 12px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="school-name">${schoolName}</div>
            <div class="school-info">
              ${address ? address + ' • ' : ''}DISE કોડ: <strong>${diseCode}</strong> ${district ? '• જિલ્લો: ' + district : ''}
            </div>
            <div class="doc-title">શિક્ષક / સ્ટાફ સભ્ય વ્યક્તિગત વિગત પત્રક (Bio-Data)</div>
          </div>

          <div class="top-section">
            <div class="summary-info">
              <table>
                <tr>
                  <th>પૂરું નામ</th>
                  <td><strong>${staff.fullName}</strong></td>
                </tr>
                <tr>
                  <th>હોદ્દો / પદ</th>
                  <td>${staff.designation} (${staff.category === 'non_teaching' ? 'બિન-શૈક્ષણિક' : 'શૈક્ષણિક'})</td>
                </tr>
                <tr>
                  <th>વિભાગ (Section)</th>
                  <td><strong>${staff.section || staff.vibhag || 'માધ્યમિક'}</strong></td>
                </tr>
                <tr>
                  <th>શિક્ષક કોડ (Teacher Code)</th>
                  <td><strong>${staff.teacherCode || '-'}</strong></td>
                </tr>
                <tr>
                  <th>HRPN નંબર</th>
                  <td><strong>${staff.hrpnNumber || '-'}</strong></td>
                </tr>
              </table>
            </div>

            <div class="photo-box">
              ${
                staff.photoUrl
                  ? `<img src="${staff.photoUrl}" alt="Photo" />`
                  : `<div class="photo-placeholder">પાસપોર્ટ સાઇઝ ફોટો</div>`
              }
            </div>
          </div>

          <div class="section-heading">૧. શૈક્ષણિક અને સેવા વિગતો</div>
          <table>
            <tr>
              <th>મુખ્ય વિષય</th>
              <td>${staff.subject || '-'}</td>
              <th>શૈક્ષણિક લાયકાત</th>
              <td>${staff.qualification || '-'}</td>
            </tr>
            <tr>
              <th>જન્મ તારીખ</th>
              <td>${staff.dob || '-'}</td>
              <th>બ્લડ ગ્રુપ</th>
              <td>${staff.bloodGroup || '-'}</td>
            </tr>
            <tr>
              <th>ખાતામાં દાખલ તારીખ</th>
              <td>${staff.serviceJoiningDate || staff.joiningDate || '-'}</td>
              <th>આ શાળામાં દાખલ તારીખ</th>
              <td>${staff.schoolJoiningDate || staff.joiningDate || '-'}</td>
            </tr>
          </table>

          <div class="section-heading">૨. ઓળખ અને સંપર્ક વિગતો</div>
          <table>
            <tr>
              <th>મોબાઈલ નંબર</th>
              <td>${staff.mobile || '-'}</td>
              <th>ઈમેલ એડ્રેસ</th>
              <td>${staff.email || '-'}</td>
            </tr>
            <tr>
              <th>આધાર કાર્ડ નંબર</th>
              <td>${staff.aadhaarNumber ? 'XXXX-XXXX-' + staff.aadhaarNumber.slice(-4) : '-'}</td>
              <th>PAN કાર્ડ નંબર</th>
              <td>${staff.panNumber || '-'}</td>
            </tr>
            <tr>
              <th>સરનામું</th>
              <td colspan="3">${staff.address || '-'}</td>
            </tr>
          </table>

          <div class="section-heading">૩. બેંક ખાતાની વિગતો</div>
          <table>
            <tr>
              <th>બેંકનું નામ</th>
              <td>${staff.bankName || '-'}</td>
              <th>શાખા (Branch)</th>
              <td>${staff.bankBranch || '-'}</td>
            </tr>
            <tr>
              <th>બેંક ખાતા નંબર</th>
              <td>${staff.bankAccountNo || '-'}</td>
              <th>IFSC કોડ</th>
              <td>${staff.bankIfsc || '-'}</td>
            </tr>
          </table>

          <div class="signatures">
            <div class="sign-block">
              સ્ટાફ સભ્યની સહી
            </div>
            <div class="sign-block">
              આચાર્યશ્રીની સહી અને સિક્કો
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-white/20 shadow-2xl my-auto text-[#e4ded6] max-h-[86dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 p-4 sm:p-6 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9d512d]/25 border border-[#9d512d]/40 flex items-center justify-center text-[#f59c73] shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">સ્ટાફ પ્રોફાઇલ (Staff Profile)</h3>
              <p className="text-xs text-[#a99f91]">શિક્ષક / સ્ટાફ સભ્ય સંપૂર્ણ વિગત અને ફોટો</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Notifications */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

        {/* Hero Card: Photo & Key Badges */}
        <div className="bg-black/35 rounded-2xl border border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Photo Container with Direct Actions */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative group">
              <div className="w-28 h-36 rounded-2xl border-2 border-[#9d512d]/50 bg-black/60 overflow-hidden flex items-center justify-center shadow-xl">
                {photoUploading ? (
                  <div className="flex flex-col items-center gap-1.5 text-xs text-[#f59c73]">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>સેવિંગ...</span>
                  </div>
                ) : staff.photoUrl ? (
                  <img
                    src={staff.photoUrl}
                    alt={staff.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-[#8e8579]">
                    <Camera className="w-8 h-8 text-[#f59c73]" />
                    <span className="text-[10px] font-medium">ફોટો નથી</span>
                  </div>
                )}
              </div>

              {staff.photoUrl && !photoUploading && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-2 -right-2 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg transition-transform hover:scale-110 cursor-pointer"
                  title="ફોટો દૂર કરો"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Photo Action Buttons */}
            <input
              type="file"
              ref={photoInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="px-3 py-1.5 rounded-xl bg-[#9d512d] hover:bg-[#b55e34] text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{staff.photoUrl ? 'ફોટો બદલો' : 'ફોટો રાખો'}</span>
            </button>
          </div>

          {/* Core Info & Badges */}
          <div className="flex-1 text-center sm:text-left space-y-3 w-full">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {staff.fullName}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#9d512d]/30 text-[#f59c73] border border-[#9d512d]/50">
                  {staff.designation}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  વિભાગ: {staff.section || staff.vibhag || 'માધ્યમિક'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    staff.category === 'non_teaching'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {staff.category === 'non_teaching' ? 'બિન-શૈક્ષણિક સ્ટાફ' : 'શૈક્ષણિક સ્ટાફ'}
                </span>
                {staff.bloodGroup && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    રક્ત જૂથ: {staff.bloodGroup}
                  </span>
                )}
              </div>
            </div>

            {/* Teacher Code & HRPN Number Highlight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="text-[10px] text-[#8e8579] font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>શિક્ષક કોડ (Teacher Code)</span>
                </div>
                <div className="text-sm font-bold text-white font-mono mt-0.5">
                  {staff.teacherCode || '-'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="text-[10px] text-[#8e8579] font-medium flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3 text-cyan-400" />
                  <span>HRPN નંબર</span>
                </div>
                <div className="text-sm font-bold text-white font-mono mt-0.5">
                  {staff.hrpnNumber || '-'}
                </div>
              </div>
            </div>

            {/* Quick Contact buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              {staff.mobile && (() => {
                const cleanMobile = staff.mobile.replace(/\D/g, '');
                const normalizedMobile = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
                const staffMsg = `નમસ્તે ${staff.fullName} સર/મેડમ,\nશાળા: ${school?.schoolName || 'શાળા'}\nહોદ્દો: ${staff.designation || 'સ્ટાફ'}\nવિદ્યાલયમ (Vidyalayam) પોર્ટલ પરથી આપનો સંપર્ક કરવામાં આવ્યો છે.`;
                const waUrl = `https://wa.me/${normalizedMobile}?text=${encodeURIComponent(staffMsg)}`;
                return (
                  <>
                    <a
                      href={`tel:${staff.mobile}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#e4ded6] border border-white/10"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{staff.mobile}</span>
                    </a>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
                      title="WhatsApp પર ઓટો-ટાઈપ મેસેજ સાથે ચેટ શરૂ કરો"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp મેસેજ</span>
                    </a>
                  </>
                );
              })()}
              {staff.email && (
                <a
                  href={`mailto:${staff.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#e4ded6] border border-white/10"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span className="truncate max-w-[180px]">{staff.email}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Sections Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Academic & Service */}
          <div className="p-4 rounded-2xl bg-black/25 border border-white/10 space-y-2.5">
            <h4 className="text-xs font-bold text-[#f59c73] uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>૧. શૈક્ષણિક & સેવા વિગતો</span>
            </h4>

            <div className="space-y-2 text-xs divide-y divide-white/5">
              <div className="flex justify-between py-1">
                <span className="text-[#8e8579]">વિભાગ (Section):</span>
                <span className="text-white font-bold text-amber-300">{staff.section || staff.vibhag || 'માધ્યમિક'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8e8579]">મુખ્ય વિષય:</span>
                <span className="text-white font-medium">{staff.subject || '-'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8e8579]">શૈક્ષણિક લાયકાત:</span>
                <span className="text-white font-medium">{staff.qualification || '-'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8e8579]">જન્મ તારીખ:</span>
                <span className="text-white font-medium">{staff.dob || '-'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8e8579]">ખાતામાં દાખલ તારીખ:</span>
                <span className="text-white font-medium">{staff.serviceJoiningDate || staff.joiningDate || '-'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8e8579]">આ શાળામાં દાખલ તારીખ:</span>
                <span className="text-white font-medium">{staff.schoolJoiningDate || staff.joiningDate || '-'}</span>
              </div>
            </div>
          </div>

          {/* 2. Identity & Bank Details */}
          <div className="p-4 rounded-2xl bg-black/25 border border-white/10 space-y-2.5">
            <h4 className="text-xs font-bold text-[#f59c73] uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" />
              <span>૨. ઓળખ & બેંક વિગતો</span>
            </h4>

            <div className="space-y-2 text-xs divide-y divide-white/5">
              <div className="flex justify-between py-1">
                <span className="text-[#8e8579]">આધાર કાર્ડ નં.:</span>
                <span className="text-white font-mono font-medium">
                  {staff.aadhaarNumber ? `XXXX-XXXX-${staff.aadhaarNumber.slice(-4)}` : '-'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8e8579]">PAN કાર્ડ નં.:</span>
                <span className="text-white font-mono font-medium">{staff.panNumber || '-'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8e8579]">બેંકનું નામ:</span>
                <span className="text-white font-medium">{staff.bankName || '-'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8e8579]">ખાતા નંબર:</span>
                <span className="text-white font-mono font-medium">{staff.bankAccountNo || '-'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8e8579]">IFSC / શાખા:</span>
                <span className="text-white font-mono font-medium">
                  {staff.bankIfsc || '-'} {staff.bankBranch ? `(${staff.bankBranch})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Address */}
          {staff.address && (
            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-black/25 border border-white/10 flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-[#f59c73] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#8e8579] font-medium block">રહેઠાણનું સરનામું:</span>
                <span className="text-white font-medium mt-0.5 block">{staff.address}</span>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Modal Actions Footer (Pinned at bottom) */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-white/10 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintProfile}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#f59c73]" />
              <span>પ્રોફાઇલ પ્રિન્ટ / બાયોડેટા</span>
            </button>

            {onGenerateIdCard && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGenerateIdCard(staff);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#9d512d]/30 hover:bg-[#9d512d]/50 text-[#f59c73] border border-[#9d512d]/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>ID Card બનાવો</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEditStaff && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditStaff(staff);
                }}
                className="px-4 py-2 rounded-xl bg-[#9d512d] hover:bg-[#b55e34] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>વિગત સુધારો</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-all cursor-pointer"
            >
              બંધ કરો
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
