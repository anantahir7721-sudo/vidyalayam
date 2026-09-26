import React, { useState, useEffect, useMemo } from 'react';
import {
  School,
  AdmissionApplication,
  SchoolAdmissionSettings,
} from '../types';
import {
  getSchoolsForAdmissionDirectory,
  submitAdmissionApplication,
} from '../services/firestoreService';
import { compressStudentPhoto } from '../utils/imageUtils';
import {
  Building2,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Users,
  Camera,
  X,
  Upload,
  Clock,
  Printer,
  ChevronRight,
  Sparkles,
  Info,
  ShieldCheck,
  Heart,
  Activity,
  Award,
} from 'lucide-react';

interface OnlineAdmissionPortalProps {
  onBackToLogin: () => void;
}

const GUJARAT_DISTRICTS = [
  'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
  'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka',
  'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch',
  'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
  'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
  'Tapi', 'Vadodara', 'Valsad'
];

const BLOOD_GROUPS = [
  "Don't Know (ખબર નથી)",
  'A+',
  'A-',
  'B+',
  'B-',
  'O+',
  'O-',
  'AB+',
  'AB-',
];

const CATEGORIES = [
  { id: 'OBC', label: 'OBC (બક્ષીપંચ / SEBC)' },
  { id: 'SC', label: 'SC (અનુસૂચિત જાતિ)' },
  { id: 'ST', label: 'ST (અનુસૂચિત જનજાતિ)' },
  { id: 'Others', label: 'Others (જનરલ / ઈડબલ્યુએસ / અન્ય)' },
];

/**
 * Checks if school has currently open admissions, closed, or scheduled
 */
export function getSchoolAdmissionStatus(school: School): {
  status: 'open' | 'closed' | 'scheduled';
  label: string;
  badgeClass: string;
  canApply: boolean;
  scheduledTimeText?: string;
} {
  const settings = school.admissionSettings;
  if (!settings || settings.isOpen === false || settings.mode === 'closed') {
    return {
      status: 'closed',
      label: 'Admissions Closed (પ્રવેશ બંધ છે)',
      badgeClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-500/30',
      canApply: false,
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  if (settings.mode === 'date_range') {
    if (settings.startDate && today < settings.startDate) {
      const parts = settings.startDate.split('-');
      const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : settings.startDate;
      return {
        status: 'scheduled',
        label: `Admissions will be open on ${formatted}`,
        scheduledTimeText: formatted,
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
        canApply: false,
      };
    }
    if (settings.endDate && today > settings.endDate) {
      return {
        status: 'closed',
        label: 'Admissions Closed (પ્રવેશ સમયસીમા પૂર્ણ)',
        badgeClass: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-500/30',
        canApply: false,
      };
    }
    return {
      status: 'open',
      label: settings.endDate
        ? `Admissions Open (તા. ${settings.endDate.split('-')[2]}/${settings.endDate.split('-')[1]} સુધી)`
        : 'Admissions Open (પ્રવેશ શરૂ છે)',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
      canApply: true,
    };
  }

  // mode === 'open'
  return {
    status: 'open',
    label: 'Admissions Open (પ્રવેશ શરૂ છે)',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    canApply: true,
  };
}

export const OnlineAdmissionPortal: React.FC<OnlineAdmissionPortalProps> = ({
  onBackToLogin,
}) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');

  // Modals state
  const [contactSchool, setContactSchool] = useState<School | null>(null);
  const [applyingSchool, setApplyingSchool] = useState<School | null>(null);

  // Form submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = useState<{
    id: string;
    studentName: string;
    standard: string;
    schoolName: string;
    diseCode: string;
    contactNumber: string;
    createdAt: string;
  } | null>(null);

  // Admission Form Fields
  const [formData, setFormData] = useState({
    photoUrl: '',
    admissionStandard: '9',
    studentName: '',
    childUid: '',
    dob: '',
    motherName: '',
    gender: 'Boy',
    bloodGroup: "Don't Know (ખબર નથી)",
    category: 'OBC',
    contactNumber: '',
    address: '',
    previousYearTotalDays: '220',
    previousYearPresentDays: '',
    previousYearPercentage: '',
    height: '',
    weight: '',
  });

  // Load schools on mount
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      const list = await getSchoolsForAdmissionDirectory();
      if (isMounted) {
        setSchools(list);
        setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter schools
  const filteredSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return schools.filter((s) => {
      const matchDistrict = selectedDistrict === 'ALL' || s.district?.toLowerCase() === selectedDistrict.toLowerCase();
      if (!matchDistrict) return false;

      if (!q) return true;
      return (
        s.schoolName?.toLowerCase().includes(q) ||
        s.diseCode?.includes(q) ||
        s.district?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
      );
    });
  }, [schools, searchQuery, selectedDistrict]);

  // Handle Photo upload with automatic compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressStudentPhoto(file);
      setFormData((prev) => ({ ...prev, photoUrl: compressed }));
    } catch (err: any) {
      alert(err.message || 'ઇમેજ પ્રોસેસ કરવામાં ભૂલ આવી.');
    }
  };

  // Submit Admission Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingSchool) return;

    setFormError(null);

    // Validation
    const cleanName = formData.studentName.trim();
    const cleanUid = formData.childUid.trim();
    const cleanDob = formData.dob.trim();
    const cleanMobile = formData.contactNumber.replace(/\D/g, '');

    if (!cleanName) {
      setFormError('કૃપા કરીને શાળા છોડ્યાના પ્રમાણપત્ર (LC) મુજબ વિદ્યાર્થીનું પૂરું નામ દાખલ કરો.');
      return;
    }
    if (!cleanUid) {
      setFormError('વિદ્યાર્થી ચાઇલ્ડ UID (Child UID) દાખલ કરવી જરૂરી છે.');
      return;
    }
    if (!cleanDob) {
      setFormError('જન્મ તારીખ દાખલ કરવી જરૂરી છે.');
      return;
    }
    if (cleanMobile.length !== 10) {
      setFormError('વાલીનો મોબાઈલ નંબર બરાબર ૧૦ અંકનો હોવો જરૂરી છે.');
      return;
    }

    setSubmitting(true);
    try {
      const applicationId = await submitAdmissionApplication(applyingSchool.id, {
        schoolId: applyingSchool.id,
        schoolDiseCode: applyingSchool.diseCode || '',
        schoolName: applyingSchool.schoolName || '',
        studentName: cleanName,
        photoUrl: formData.photoUrl || undefined,
        admissionStandard: formData.admissionStandard,
        childUid: cleanUid,
        dob: cleanDob,
        motherName: formData.motherName.trim(),
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        category: formData.category,
        contactNumber: cleanMobile,
        address: formData.address.trim(),
        previousYearTotalDays: formData.previousYearTotalDays.trim() || undefined,
        previousYearPresentDays: formData.previousYearPresentDays.trim() || undefined,
        previousYearPercentage: formData.previousYearPercentage.trim() || undefined,
        height: formData.height.trim() || undefined,
        weight: formData.weight.trim() || undefined,
      });

      // Receipt data
      setSubmittedReceipt({
        id: applicationId,
        studentName: cleanName,
        standard: formData.admissionStandard,
        schoolName: applyingSchool.schoolName,
        diseCode: applyingSchool.diseCode,
        contactNumber: cleanMobile,
        createdAt: new Date().toLocaleDateString('gu-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      // Reset form
      setApplyingSchool(null);
      setFormData({
        photoUrl: '',
        admissionStandard: '9',
        studentName: '',
        childUid: '',
        dob: '',
        motherName: '',
        gender: 'Boy',
        bloodGroup: "Don't Know (ખબર નથી)",
        category: 'OBC',
        contactNumber: '',
        address: '',
        previousYearTotalDays: '220',
        previousYearPresentDays: '',
        previousYearPercentage: '',
        height: '',
        weight: '',
      });
    } catch (err: any) {
      console.error('Error submitting application:', err);
      setFormError(err.message || 'અરજી સબમિટ કરવામાં ભૂલ આવી. કૃપા કરીને પુનઃ પ્રયત્ન કરો.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn py-2 sm:py-4">
      {/* Top Navigation Strip */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-[#e4ded6] tracking-tight">
              ઓનલાઇન પ્રવેશ પોર્ટલ (School Admissions)
            </h2>
            <p className="text-xs text-stone-500 dark:text-[#a99f91]">
              ગુજરાતની કોઈપણ માન્ય શાળા શોધો અને પ્રવેશ માટે ઓનલાઇન અરજી કરો
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToLogin}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-700 dark:text-[#e4ded6] border border-stone-200 dark:border-white/10 transition-all cursor-pointer"
        >
          ← લૉગિન પેજ પર જાઓ
        </button>
      </div>

      {/* Search and District Filter Bar */}
      <div className="glass-card rounded-2xl border border-stone-200 dark:border-white/10 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-[#a99f91]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="શાળાનું નામ અથવા ૧૧ અંકનો DISE કોડ લખીને શોધો..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-xs sm:text-sm text-stone-900 dark:text-[#e4ded6] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#9d512d]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* District Select */}
          <div className="sm:col-span-4">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#1a232d] border border-stone-300 dark:border-white/10 text-xs sm:text-sm text-stone-900 dark:text-[#e4ded6] focus:outline-none focus:ring-2 focus:ring-[#9d512d]"
            >
              <option value="ALL">તમામ જિલ્લા (All Districts)</option>
              {GUJARAT_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d} જિલ્લો
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info Strip */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-[#a99f91] pt-1 border-t border-stone-200 dark:border-white/10 px-1">
          <span>
            કુલ <strong>{filteredSchools.length}</strong> શાળાઓ ઉપલબ્ધ
          </span>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
            💡 પસંદગીની શાળા સામે આપેલ &quot;પ્રવેશ ફોર્મ&quot; બટન પર ક્લિક કરો
          </span>
        </div>
      </div>

      {/* Schools List */}
      {loading ? (
        <div className="text-center py-12 space-y-2">
          <div className="w-8 h-8 border-2 border-[#9d512d] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-500 dark:text-[#a99f91]">શાળાઓની યાદી લોડ થઈ રહી છે...</p>
        </div>
      ) : filteredSchools.length === 0 ? (
        <div className="glass-card rounded-2xl border border-dashed border-stone-300 dark:border-white/15 p-8 text-center space-y-2">
          <Building2 className="w-8 h-8 text-stone-400 mx-auto" />
          <h3 className="text-sm font-bold text-stone-800 dark:text-[#e4ded6]">કોઈ શાળા મળી નથી</h3>
          <p className="text-xs text-stone-500 dark:text-[#a99f91]">
            કૃપા કરીને શાળાનું નામ, ડાયસ કોડ અથવા જિલ્લો બદલીને પુનઃ પ્રયત્ન કરો.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredSchools.map((school) => {
            const statusInfo = getSchoolAdmissionStatus(school);

            return (
              <div
                key={school.id}
                className="glass-card rounded-2xl border border-stone-200 dark:border-white/10 p-4 sm:p-5 hover:border-[#9d512d]/40 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* School Details */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800 dark:bg-white/10 dark:text-[#e4ded6] border border-stone-200 dark:border-white/10">
                      DISE: {school.diseCode}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                      {school.district} જિલ્લો
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-[#e4ded6] tracking-tight">
                    {school.schoolName}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-[#a99f91] flex-wrap">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#9d512d] dark:text-[#f59c73] shrink-0" />
                      <span>{school.address || `${school.district}, ગુજરાત`}</span>
                    </div>
                    {school.principalName && (
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>આચાર્ય: {school.principalName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2 Buttons as specifically requested: [ Admission Form | School Contact ] */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-stone-200 dark:border-white/10">
                  {/* BUTTON 1: ADMISSION FORM */}
                  {statusInfo.canApply ? (
                    <button
                      type="button"
                      onClick={() => {
                        setApplyingSchool(school);
                        setFormError(null);
                      }}
                      className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#9d512d] hover:bg-[#864424] text-white shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <FileText className="w-4 h-4" />
                      <span>પ્રવેશ ફોર્મ (Admission Form)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        alert(
                          statusInfo.status === 'scheduled'
                            ? `આ શાળામાં ${statusInfo.label}. કૃપા કરીને તે તારીખે પુનઃ પ્રયત્ન કરો.`
                            : 'આ શાળામાં હાલમાં પ્રવેશ પ્રક્રિયા બંધ છે. વધુ માહિતી માટે શાળા સંપર્ક કરો.'
                        );
                      }}
                      className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-stone-200 text-stone-500 dark:bg-white/10 dark:text-stone-500 cursor-not-allowed"
                      title={statusInfo.label}
                    >
                      <FileText className="w-4 h-4" />
                      <span>{statusInfo.status === 'scheduled' ? 'પ્રવેશ ટૂંક સમયમાં' : 'પ્રવેશ બંધ છે'}</span>
                    </button>
                  )}

                  {/* BUTTON 2: SCHOOL CONTACT */}
                  <button
                    type="button"
                    onClick={() => setContactSchool(school)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-800 dark:text-[#e4ded6] border border-stone-200 dark:border-white/10 transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>શાળા સંપર્ક</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: SCHOOL CONTACT DETAILS
          ========================================================================= */}
      {contactSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-white/20 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#9d512d]/15 text-[#9d512d] dark:text-[#f59c73]">
                  DISE: {contactSchool.diseCode}
                </span>
                <h3 className="text-lg font-bold text-stone-900 dark:text-[#e4ded6] mt-1">
                  {contactSchool.schoolName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setContactSchool(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs divide-y divide-stone-200 dark:divide-white/10">
              <div className="pt-2 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#9d512d] shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">સરનામું & જિલ્લો</span>
                  <span className="text-stone-800 dark:text-[#e4ded6] font-medium">
                    {contactSchool.address || `${contactSchool.district}, ગુજરાત`}
                  </span>
                </div>
              </div>

              {contactSchool.principalName && (
                <div className="pt-2 flex items-start gap-2.5">
                  <User className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">આચાર્યશ્રી</span>
                    <span className="text-stone-800 dark:text-[#e4ded6] font-bold">
                      {contactSchool.principalName}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">સંપર્ક નંબર</span>
                  {contactSchool.contactPhone || contactSchool.principalPhone ? (
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={`tel:${contactSchool.contactPhone || contactSchool.principalPhone}`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{contactSchool.contactPhone || contactSchool.principalPhone}</span>
                      </a>
                    </div>
                  ) : (
                    <span className="text-stone-500">મોબાઈલ નંબર ઉપલબ્ધ નથી</span>
                  )}
                </div>
              </div>

              {contactSchool.contactEmail && (
                <div className="pt-2 flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">સત્તાવાર ઈમેલ</span>
                    <a
                      href={`mailto:${contactSchool.contactEmail}`}
                      className="text-blue-500 hover:underline font-mono"
                    >
                      {contactSchool.contactEmail}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setContactSchool(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-800 dark:text-[#e4ded6] transition-all"
              >
                બંધ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: COMPLETE ADMISSION FORM
          ========================================================================= */}
      {applyingSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-white/20 p-5 sm:p-7 shadow-2xl my-auto animate-scaleUp max-h-[90vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-200 dark:border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#9d512d]/15 text-[#9d512d] dark:text-[#f59c73]">
                  DISE: {applyingSchool.diseCode} • {applyingSchool.district}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-[#e4ded6] mt-1">
                  પ્રવેશ અરજી ફોર્મ (Admission Application)
                </h3>
                <p className="text-xs text-stone-600 dark:text-[#a99f91]">
                  શાળા: <strong>{applyingSchool.schoolName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyingSchool(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/30 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Photo & Admission Standard Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-3.5 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10">
                {/* Photo Upload with auto compression */}
                <div className="sm:col-span-5 flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-2xl bg-stone-200 dark:bg-white/10 border-2 border-dashed border-stone-300 dark:border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Student"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-6 h-6 text-stone-400" />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-800 dark:text-[#e4ded6]">
                      વિદ્યાર્થી ફોટો (Photo)
                    </label>
                    <span className="text-[10px] text-stone-500 dark:text-[#a99f91] block">
                      આપમેળે કમ્પ્રેસ થશે (ઓછી સાઈઝ)
                    </span>
                    <label className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#9d512d] text-white hover:bg-[#864424] cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>{formData.photoUrl ? 'ફોટો બદલો' : 'અપલોડ કરો'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Admission Standard */}
                <div className="sm:col-span-7">
                  <label className="block font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                    ક્યા ધોરણમાં પ્રવેશ લેવાનો છે? (Admission Standard) *
                  </label>
                  <select
                    value={formData.admissionStandard}
                    onChange={(e) => setFormData({ ...formData, admissionStandard: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1a232d] border border-stone-300 dark:border-white/15 text-stone-900 dark:text-[#e4ded6] font-bold"
                  >
                    <option value="9">ધોરણ ૯ (Standard 9)</option>
                    <option value="10">ધોરણ ૧૦ (Standard 10)</option>
                    <option value="11">ધોરણ ૧૧ (Standard 11)</option>
                    <option value="12">ધોરણ ૧૨ (Standard 12)</option>
                  </select>
                </div>
              </div>

              {/* Student Name (As in LC) */}
              <div>
                <label className="block font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                  વિદ્યાર્થીનું પૂરું નામ (Name - as written in LC) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="દા.ત. પટેલ રાહુલકુમાર હિતેશભાઈ (શાળા છોડ્યાના પ્રમાણપત્ર મુજબ)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] text-sm focus:ring-2 focus:ring-[#9d512d]"
                />
                <span className="text-[10px] text-stone-500 dark:text-[#a99f91] mt-0.5 block">
                  * શાળા છોડ્યાના પ્રમાણપત્ર (LC) મુજબ જ ચોક્કસ નામ લખવું
                </span>
              </div>

              {/* Child UID & Birthdate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                    ચાઈલ્ડ યુનિક ID (Child UID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.childUid}
                    onChange={(e) => setFormData({ ...formData, childUid: e.target.value })}
                    placeholder="૧૮ અંકનો Child UID / UDISE કોડ"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] font-mono focus:ring-2 focus:ring-[#9d512d]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                    જન્મ તારીખ (Birthdate) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] font-mono focus:ring-2 focus:ring-[#9d512d]"
                  />
                </div>
              </div>

              {/* Mother Name & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                    માતાનું નામ (Mata nu Naam)
                  </label>
                  <input
                    type="text"
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    placeholder="માતાનું પૂરું નામ"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                    જાતિ (Gender) *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1a232d] border border-stone-300 dark:border-white/15 text-stone-900 dark:text-[#e4ded6]"
                  >
                    <option value="Boy">કુમાર (Boy)</option>
                    <option value="Girl">કન્યા (Girl)</option>
                    <option value="Other">અન્ય (Other)</option>
                  </select>
                </div>
              </div>

              {/* Blood Group & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                    બ્લડ ગ્રૂપ (Blood Group)
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1a232d] border border-stone-300 dark:border-white/15 text-stone-900 dark:text-[#e4ded6]"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                    કેટેગરી / જ્ઞાતિ (Category) *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1a232d] border border-stone-300 dark:border-white/15 text-stone-900 dark:text-[#e4ded6]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vaalina Nambar (Only 10 digits) & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                    વાલીનો મોબાઈલ નંબર (Vaalina Nambar) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="૧૦ અંકનો મોબાઈલ નંબર"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] font-mono font-bold focus:ring-2 focus:ring-[#9d512d]"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">માત્ર ૧૦ અંક લખવા</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                    રહેઠાણનું સરનામું (Address)
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="ગામ, સોસાયટી, તાલુકો, જિલ્લો"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                  />
                </div>
              </div>

              {/* Gaya varshna Hajar divas: __ mathi __ & Gaya varshna Taka */}
              <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 space-y-2">
                <span className="font-bold text-amber-900 dark:text-amber-300 block text-xs">
                  શૈક્ષણિક વિગતો (Academic & Attendance Info):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      ગત વર્ષના હાજર દિવસ (Hajar Divas: __ માંથી ___)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="365"
                        placeholder="હાજર દિવસ"
                        value={formData.previousYearPresentDays}
                        onChange={(e) => setFormData({ ...formData, previousYearPresentDays: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] font-mono"
                      />
                      <span className="text-stone-500 font-bold">માંથી</span>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        placeholder="કુલ દિવસ"
                        value={formData.previousYearTotalDays}
                        onChange={(e) => setFormData({ ...formData, previousYearTotalDays: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      ગત વર્ષના ટકા (Gaya Varshna Taka)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="દા.ત. 78.50%"
                      value={formData.previousYearPercentage}
                      onChange={(e) => setFormData({ ...formData, previousYearPercentage: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Height & Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    ઊંચાઈ (Height in cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="50"
                    max="220"
                    placeholder="દા.ત. 145 સે.મી."
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    વજન (Weight in kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="15"
                    max="150"
                    placeholder="દા.ત. 40 કિ.ગ્રા."
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setApplyingSchool(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/10 text-stone-800 dark:text-[#e4ded6]"
                >
                  રદ કરો
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#9d512d] hover:bg-[#864424] text-white shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>અરજી સબમિટ થઈ રહી છે...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>અરજી સબમિટ કરો (Submit Application)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: APPLICATION SUBMISSION RECEIPT
          ========================================================================= */}
      {submittedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-emerald-500/30 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-stone-900 dark:text-[#e4ded6]">
                પ્રવેશ અરજી સફળતાપૂર્વક સબમિટ થઈ ગઈ છે!
              </h3>
              <p className="text-xs text-stone-500 dark:text-[#a99f91]">
                આપનું પ્રવેશ ફોર્મ સંબંધિત શાળાને ચકાસણી માટે મોકલી દેવામાં આવ્યું છે.
              </p>
            </div>

            {/* Receipt Card */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-200 dark:border-white/10">
                <span className="text-stone-500">અરજી નંબર (Application ID):</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{submittedReceipt.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200 dark:border-white/10">
                <span className="text-stone-500">વિદ્યાર્થીનું નામ:</span>
                <span className="font-bold text-stone-900 dark:text-[#e4ded6]">{submittedReceipt.studentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200 dark:border-white/10">
                <span className="text-stone-500">પ્રવેશ ધોરણ:</span>
                <span className="font-bold text-[#9d512d] dark:text-[#f59c73]">ધોરણ {submittedReceipt.standard}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200 dark:border-white/10">
                <span className="text-stone-500">શાળાનું નામ:</span>
                <span className="font-bold text-stone-900 dark:text-[#e4ded6] text-right max-w-[200px] truncate">{submittedReceipt.schoolName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200 dark:border-white/10">
                <span className="text-stone-500">DISE કોડ:</span>
                <span className="font-mono font-bold">{submittedReceipt.diseCode}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-500">અરજી તારીખ:</span>
                <span className="font-mono">{submittedReceipt.createdAt}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                શાળા દ્વારા આપની અરજી માન્ય રાખવામાં આવશે ત્યારે આપના નોંધાયેલ નંબર ({submittedReceipt.contactNumber}) પર સંપર્ક કરવામાં આવશે.
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/10 text-stone-800 dark:text-[#e4ded6] inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>રસીદ પ્રિન્ટ કરો</span>
              </button>

              <button
                type="button"
                onClick={() => setSubmittedReceipt(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>સમજાઈ ગયું (Close)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
