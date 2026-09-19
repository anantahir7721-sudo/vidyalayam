import React, { useState, useRef } from 'react';
import {
  X,
  User,
  GraduationCap,
  Calendar,
  Phone,
  MapPin,
  Camera,
  Trash2,
  Printer,
  Edit3,
  Save,
  CreditCard,
  Heart,
  Briefcase,
  Layers,
  FileText,
  Building,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { School, Student } from '../types';
import { updateStudent } from '../services/firestoreService';
import { compressStudentPhoto } from '../utils/imageUtils';
import { printStudentIdCards } from '../utils/idCardPdf';
import { cleanAndNormalizeBloodGroup } from '../utils/bloodGroupUtils';

interface StudentProfileModalProps {
  student: Student;
  school: School;
  isOpen: boolean;
  onClose: () => void;
  onStudentUpdated: (updatedStudent: Student) => void;
  onGenerateIdCard?: (student: Student) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  school,
  isOpen,
  onClose,
  onStudentUpdated,
  onGenerateIdCard,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(student.photoUrl);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for editing
  const [formData, setFormData] = useState({
    studentName: student.studentName,
    standard: String(student.standard),
    diseCode: student.diseCode || school.diseCode || '',
    grNumber: student.grNumber || '',
    section: student.section || student.division || '',
    rollNumber: student.rollNumber || '',
    dob: student.dob || '',
    doa: student.doa || '',
    address: student.address || '',
    motherName: student.motherName || '',
    fatherName: student.fatherName || '',
    gender: student.gender || 'Boy',
    caste: student.caste || '',
    bloodGroup: cleanAndNormalizeBloodGroup(student.bloodGroup) || '',
    contactNumber: student.contactNumber || student.mobileNumber || '',
    fatherOccupation: student.fatherOccupation || '',
    motherOccupation: student.motherOccupation || '',
    placeOfBirth: student.placeOfBirth || '',
    aadhaarNo: student.aadhaarNo || '',
    academicYear: student.academicYear || '2026–27',
  });

  if (!isOpen) return null;

  // Calculate age if DOB exists
  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const diffMs = Date.now() - birthDate.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const currentAge = calculateAge(formData.dob || student.dob);

  // Handle Photo selection & compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      const compressedDataUrl = await compressStudentPhoto(file);
      setPhotoPreview(compressedDataUrl);

      // Persist immediately to Firestore
      await updateStudent(school.id, student.id, { photoUrl: compressedDataUrl });
      const updated: Student = { ...student, photoUrl: compressedDataUrl };
      onStudentUpdated(updated);
      setSuccessMsg('વિદ્યાર્થીનો ફોટો સફળતાપૂર્વક અપડેટ થયો (Photo updated successfully)');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'ફોટો અપલોડ કરવામાં નિષ્ફળતા મળી.');
    } finally {
      setLoading(false);
    }
  };

  // Remove photo
  const handleRemovePhoto = async () => {
    if (!confirm('શું તમે આ વિદ્યાર્થીનો ફોટો દૂર કરવા માંગો છો? (Remove photo?)')) return;
    try {
      setLoading(true);
      setError(null);
      await updateStudent(school.id, student.id, { photoUrl: '' });
      setPhotoPreview(undefined);
      const updated: Student = { ...student, photoUrl: undefined };
      onStudentUpdated(updated);
      setSuccessMsg('ફોટો દૂર કરવામાં આવ્યો છે.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'ફોટો દૂર કરવામાં ભૂલ આવી.');
    } finally {
      setLoading(false);
    }
  };

  // Save all edited fields
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName.trim()) {
      setError('વિદ્યાર્થીનું નામ (Name as in GR) જરૂરી છે.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        studentName: formData.studentName.trim(),
        standard: formData.standard.trim(),
        diseCode: formData.diseCode.trim() || undefined,
        grNumber: formData.grNumber.trim() || undefined,
        section: formData.section.trim() || undefined,
        division: formData.section.trim() || undefined,
        rollNumber: formData.rollNumber.trim() || undefined,
        dob: formData.dob.trim() || undefined,
        doa: formData.doa.trim() || undefined,
        address: formData.address.trim() || undefined,
        motherName: formData.motherName.trim() || undefined,
        fatherName: formData.fatherName.trim() || undefined,
        gender: formData.gender as any,
        caste: formData.caste.trim() || undefined,
        bloodGroup: formData.bloodGroup.trim() || undefined,
        contactNumber: formData.contactNumber.trim() || undefined,
        mobileNumber: formData.contactNumber.trim() || undefined,
        fatherOccupation: formData.fatherOccupation.trim() || undefined,
        motherOccupation: formData.motherOccupation.trim() || undefined,
        placeOfBirth: formData.placeOfBirth.trim() || undefined,
        aadhaarNo: formData.aadhaarNo.trim() || undefined,
        academicYear: formData.academicYear.trim() || undefined,
      };

      await updateStudent(school.id, student.id, payload);

      const updated: Student = {
        ...student,
        ...payload,
        photoUrl: photoPreview,
      };

      onStudentUpdated(updated);
      setIsEditing(false);
      setSuccessMsg('વિદ્યાર્થીની માહિતી સફળતાપૂર્વક સાચવવામાં આવી (Details saved successfully)');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'માહિતી સાચવવામાં ક્ષતિ આવી.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger Print Slip for Student Profile
  const handlePrintSlip = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${student.studentName} - Student Profile</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Anek Gujarati', sans-serif; color: #0f172a; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 800; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .badge-heading { background: #9d512d; color: white; display: inline-block; padding: 4px 14px; border-radius: 4px; font-weight: bold; margin-top: 6px; font-size: 13px; }
          .grid { display: flex; gap: 20px; margin-bottom: 20px; }
          .photo-box { width: 120px; height: 145px; border: 1.5px solid #64748b; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
          .photo-box img { width: 100%; height: 100%; object-fit: cover; }
          .info-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .info-table th, .info-table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 12px; }
          .info-table th { background: #f1f5f9; font-weight: 700; width: 25%; }
          .section-title { font-size: 14px; font-weight: 800; color: #9d512d; margin-top: 18px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${school.schoolName}</div>
          <div class="subtitle">${school.district || ''} • DISE: ${student.diseCode || school.diseCode || '-'}</div>
          <div class="badge-heading">વિદ્યાર્થી માસ્ટર પ્રોફાઈલ રેકોર્ડ (STUDENT PROFILE RECORD)</div>
        </div>

        <div class="grid">
          <div class="photo-box">
            ${
              photoPreview
                ? `<img src="${photoPreview}" alt="${student.studentName}" />`
                : '<div style="font-size:12px; color:#94a3b8; text-align:center;">PHOTO</div>'
            }
          </div>
          <div style="flex:1;">
            <table class="info-table">
              <tr><th>વિદ્યાર્થીનું નામ (Name):</th><td><strong>${student.studentName}</strong></td></tr>
              <tr><th>G.R. નંબર:</th><td><strong>${student.grNumber || '-'}</strong></td></tr>
              <tr><th>ધોરણ & વર્ગ (Std & Sec):</th><td>ધોરણ ${student.standard} ${student.section ? `(${student.section})` : ''}</td></tr>
              <tr><th>રોલ નંબર:</th><td>${student.rollNumber || '-'}</td></tr>
              <tr><th>શાળા DISE કોડ:</th><td>${student.diseCode || school.diseCode || '-'}</td></tr>
            </table>
          </div>
        </div>

        <div class="section-title">વ્યક્તિગત વિગતો (Personal Details)</div>
        <table class="info-table">
          <tr><th>જન્મ તારીખ (DOB):</th><td>${student.dob || '-'} ${currentAge ? `(ઉંમર: ${currentAge} વર્ષ)` : ''}</td><th>જાતિ (Gender):</th><td>${student.gender || '-'}</td></tr>
          <tr><th>બ્લડ ગ્રૂપ:</th><td>${student.bloodGroup || '-'}</td><th>જ્ઞાતિ / કેટેગરી:</th><td>${student.caste || '-'}</td></tr>
          <tr><th>જન્મ સ્થળ:</th><td>${student.placeOfBirth || '-'}</td><th>પ્રવેશ તારીખ (DOA):</th><td>${student.doa || '-'}</td></tr>
        </table>

        <div class="section-title">વાલી & પરિવારની વિગતો (Family Details)</div>
        <table class="info-table">
          <tr><th>પિતાનું નામ:</th><td>${student.fatherName || '-'}</td><th>પિતાનો વ્યવસાય:</th><td>${student.fatherOccupation || '-'}</td></tr>
          <tr><th>માતાનું નામ:</th><td>${student.motherName || '-'}</td><th>માતાનો વ્યવસાય:</th><td>${student.motherOccupation || '-'}</td></tr>
          <tr><th>સંપર્ક નંબર (Mobile):</th><td colspan="3">${student.contactNumber || student.mobileNumber || '-'}</td></tr>
        </table>

        <div class="section-title">સરનામું (Residential Address)</div>
        <table class="info-table">
          <tr><th>સરનામું:</th><td>${student.address || '-'}</td></tr>
        </table>

        <div class="footer">
          <div>તારીખ: ${new Date().toLocaleDateString('gu-IN')}</div>
          <div>વર્ગશિક્ષકની સહી</div>
          <div>આચાર્યશ્રી સહી & સિક્કો</div>
        </div>

        <script>
          window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => window.print(), 500);
          });
        </script>
      </body>
      </html>
    `;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col text-slate-100">
        {/* Top Header Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-slate-900/95 border-b border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-terracotta flex items-center justify-center font-bold text-white shadow-md shadow-terracotta/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{student.studentName}</span>
                {student.grNumber && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300">
                    GR: {student.grNumber}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                ધોરણ {student.standard} {student.section ? `• વર્ગ ${student.section}` : ''} • DISE:{' '}
                {student.diseCode || school.diseCode || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onGenerateIdCard) {
                  onGenerateIdCard(student);
                } else {
                  printStudentIdCards(school, [student]);
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-terracotta/20 border border-terracotta/40 text-amber-200 hover:bg-terracotta/30 transition-all flex items-center gap-1.5 shadow-sm"
              title="Generate Student ID Card"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <span>આઈડી કાર્ડ</span>
            </button>

            <button
              onClick={handlePrintSlip}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-all flex items-center gap-1.5"
              title="Print Profile Slip"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>સ્લિપ પ્રિન્ટ</span>
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isEditing
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'રદ કરો (Cancel)' : 'સુધારો (Edit)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Content Body */}
        <div className="p-6 space-y-6">
          {/* Top Hero: Photo + Quick Summary */}
          <div className="bg-slate-800/60 border border-white/5 rounded-xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Student Photo Section */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative group w-32 h-40 rounded-xl border-2 border-slate-700 bg-slate-900 overflow-hidden shadow-lg flex items-center justify-center cursor-pointer"
                onClick={() => photoPreview && setShowFullPhoto(true)}
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={student.studentName}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 gap-1">
                    <User className="w-12 h-12 text-slate-600" />
                    <span className="text-[11px] font-medium text-slate-400">ફોટો નથી</span>
                  </div>
                )}

                {/* Hover overlay for preview */}
                {photoPreview && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white font-medium">
                    ક્લિક કરી જુઓ
                  </div>
                )}
              </div>

              {/* Photo Actions */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <Camera className="w-3 h-3 text-amber-400" />
                  <span>{photoPreview ? 'બદલો' : 'અપલોડ'}</span>
                </button>

                {photoPreview && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRemovePhoto}
                    className="p-1 rounded-md text-red-400 hover:bg-red-950/40 border border-red-900/30 transition-colors"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Student Vital Tags */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <span className="text-xs font-semibold text-terracotta uppercase tracking-wider">
                  વિદ્યાર્થી ઓળખ & વિગતો
                </span>
                <h1 className="text-2xl font-bold text-white tracking-wide mt-0.5">
                  {student.studentName}
                </h1>
                <p className="text-sm text-slate-400 mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span>
                    શાળા:{' '}
                    <strong className="text-slate-200 font-medium">{school.schoolName}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    શાળા DISE:{' '}
                    <strong className="text-slate-200 font-mono">
                      {school.diseCode || '-'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    વિદ્યાર્થી DISE:{' '}
                    <strong className="text-cyan-300 font-mono">
                      {student.diseCode || student.studentStateCode || student.studentId || '-'}
                    </strong>
                  </span>
                </p>
              </div>

              {/* Quick Badges Row */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <div className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    ધોરણ:{' '}
                    <strong className="text-white">
                      {student.standard} {student.section ? `(${student.section})` : ''}
                    </strong>
                  </span>
                </div>

                <div className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    G.R. નં:{' '}
                    <strong className="text-white font-mono">{student.grNumber || '-'}</strong>
                  </span>
                </div>

                <div className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    રોલ નં:{' '}
                    <strong className="text-white font-mono">{student.rollNumber || '-'}</strong>
                  </span>
                </div>

                {cleanAndNormalizeBloodGroup(student.bloodGroup) && (
                  <div className="px-3 py-1 rounded-lg bg-red-950/40 border border-red-800/40 text-xs font-bold text-red-300 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                    <span>{cleanAndNormalizeBloodGroup(student.bloodGroup)}</span>
                  </div>
                )}

                {student.gender && (
                  <div className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs font-medium text-slate-300">
                    જાતિ: <strong className="text-white">{student.gender}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form or Display Mode */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* SECTION 1: IDENTIFICATION */}
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide flex items-center gap-2 mb-4">
                  <Building className="w-4 h-4" />
                  <span>1. ઓળખ વિગતો (Identification)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      વિદ્યાર્થીનું નામ (Name as in GR) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      G.R. નંબર (GR No.)
                    </label>
                    <input
                      type="text"
                      value={formData.grNumber}
                      onChange={(e) => setFormData({ ...formData, grNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      વિદ્યાર્થી DISE કોડ (૧૮ આંકડાનો Child UID)
                    </label>
                    <input
                      type="text"
                      placeholder="૧૮ આંકડાનો UDISE+ / Child UID દાખલ કરો"
                      value={formData.diseCode}
                      onChange={(e) => setFormData({ ...formData, diseCode: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-cyan-300 focus:outline-none focus:border-terracotta font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: ACADEMIC */}
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-2 mb-4">
                  <GraduationCap className="w-4 h-4" />
                  <span>2. શૈક્ષણિક વિગતો (Academic)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      ધોરણ (Standard) *
                    </label>
                    <select
                      value={formData.standard}
                      onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    >
                      <option value="9">ધોરણ 9</option>
                      <option value="10">ધોરણ 10</option>
                      <option value="11">ધોરણ 11</option>
                      <option value="12">ધોરણ 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      વર્ગ / સેક્શન (Section)
                    </label>
                    <input
                      type="text"
                      placeholder="દા.ત. A, B"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      રોલ નંબર (Roll No.)
                    </label>
                    <input
                      type="text"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      પ્રવેશ તારીખ (DOA)
                    </label>
                    <input
                      type="date"
                      value={formData.doa}
                      onChange={(e) => setFormData({ ...formData, doa: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: PERSONAL */}
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2 mb-4">
                  <User className="w-4 h-4" />
                  <span>3. વ્યક્તિગત વિગતો (Personal)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      જન્મ તારીખ (DOB)
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      જાતિ (Gender)
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    >
                      <option value="Boy">કુમાર (Boy)</option>
                      <option value="Girl">કન્યા (Girl)</option>
                      <option value="Other">અન્ય (Other)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      બ્લડ ગ્રૂપ (Blood Group)
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    >
                      <option value="">પસંદ કરો</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      જ્ઞાતિ / કેટેગરી (Caste)
                    </label>
                    <input
                      type="text"
                      placeholder="દા.ત. General, SEBC, SC, ST"
                      value={formData.caste}
                      onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      જન્મ સ્થળ (Place of Birth)
                    </label>
                    <input
                      type="text"
                      value={formData.placeOfBirth}
                      onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      આધાર / Student ID
                    </label>
                    <input
                      type="text"
                      value={formData.aadhaarNo}
                      onChange={(e) => setFormData({ ...formData, aadhaarNo: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: FAMILY & CONTACT */}
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide flex items-center gap-2 mb-4">
                  <Briefcase className="w-4 h-4" />
                  <span>4. પરિવાર & સંપર્ક (Family & Contact)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      પિતાનું નામ (Father Name)
                    </label>
                    <input
                      type="text"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      પિતાનો વ્યવસાય (Father Occupation)
                    </label>
                    <input
                      type="text"
                      value={formData.fatherOccupation}
                      onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      માતાનું નામ (Mother Name)
                    </label>
                    <input
                      type="text"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      માતાનો વ્યવસાય (Mother Occupation)
                    </label>
                    <input
                      type="text"
                      value={formData.motherOccupation}
                      onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      વાલી સંપર્ક નંબર / Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: ADDRESS */}
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-5">
                <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wide flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>5. રહેઠાણનું સરનામું (Address)</span>
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    સરનામું (Residential Address)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-terracotta resize-none"
                  />
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white bg-slate-800 border border-slate-700"
                >
                  રદ કરો
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-terracotta hover:bg-terracotta-hover shadow-lg shadow-terracotta/20 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'સાચવી રહ્યું છે...' : 'સાચવો (Save Changes)'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* VIEW DETAILS MODE */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Box 1: Identification & Academic */}
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-white/5 pb-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>શૈક્ષણિક & નોંધણી વિગતો</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">G.R. નંબર:</span>
                    <span className="font-mono font-bold text-white">{student.grNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">ધોરણ:</span>
                    <span className="font-bold text-white">ધોરણ {student.standard}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">વર્ગ / સેક્શન:</span>
                    <span className="font-bold text-white">
                      {student.section || student.division || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">રોલ નંબર:</span>
                    <span className="font-mono text-white">{student.rollNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">પ્રવેશ તારીખ (DOA):</span>
                    <span className="text-white">{student.doa || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">શાળા DISE કોડ (૧૧ આંકડા):</span>
                    <span className="font-mono text-white">
                      {school.diseCode || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">વિદ્યાર્થી DISE કોડ (૧૮ આંકડા):</span>
                    <span className="font-mono text-cyan-300 font-semibold">
                      {student.diseCode || student.studentStateCode || student.studentId || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 2: Personal Information */}
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-white/5 pb-2">
                  <User className="w-4 h-4" />
                  <span>વ્યક્તિગત માહિતી</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">જન્મ તારીખ (DOB):</span>
                    <span className="font-semibold text-white">
                      {student.dob || '-'} {currentAge ? `(${currentAge} વર્ષ)` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">જાતિ (Gender):</span>
                    <span className="font-semibold text-white">{student.gender || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">બ્લડ ગ્રૂપ:</span>
                    <span className="font-bold text-red-400">{student.bloodGroup || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">જ્ઞાતિ / કેટેગરી:</span>
                    <span className="text-white">{student.caste || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">જન્મ સ્થળ:</span>
                    <span className="text-white">{student.placeOfBirth || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Box 3: Family Details */}
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-white/5 pb-2">
                  <Briefcase className="w-4 h-4" />
                  <span>વાલી & પરિવાર વિગતો</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">પિતાનું નામ:</span>
                    <span className="font-semibold text-white">{student.fatherName || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">પિતાનો વ્યવસાય:</span>
                    <span className="text-white">{student.fatherOccupation || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">માતાનું નામ:</span>
                    <span className="font-semibold text-white">{student.motherName || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">માતાનો વ્યવસાય:</span>
                    <span className="text-white">{student.motherOccupation || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">સંપર્ક / Mobile:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {student.contactNumber || student.mobileNumber || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 4: Address */}
              <div className="bg-slate-800/40 border border-white/5 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider border-b border-white/5 pb-2">
                  <MapPin className="w-4 h-4" />
                  <span>રહેઠાણનું સરનામું</span>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-white/5 min-h-[90px]">
                  {student.address || 'સરનામું દાખલ કરેલ નથી.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 z-10 px-6 py-3 bg-slate-900/95 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
          <div>વિદ્યાર્થી ID: {student.id}</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            બંધ કરો (Close)
          </button>
        </div>
      </div>

      {/* Full Photo Modal Preview */}
      {showFullPhoto && photoPreview && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 cursor-pointer"
          onClick={() => setShowFullPhoto(false)}
        >
          <div className="relative max-w-sm max-h-[80vh] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
            <img src={photoPreview} alt={student.studentName} className="w-full h-auto object-contain" />
            <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white">
              <X className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
