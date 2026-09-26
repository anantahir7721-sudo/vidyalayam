import React, { useState } from 'react';
import { loginSchool, registerSchool, checkSchoolDiseExists } from '../services/authService';
import { loginAdmin } from '../services/adminService';
import { studentLogin } from '../services/onlineExamService';
import { School, StudentSession } from '../types';
import { compressSchoolLogo } from '../utils/imageUtils';
import {
  School as SchoolIcon,
  Shield,
  Lock,
  Hash,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Building2,
  Mail,
  Smartphone,
  UserCheck,
  ChevronRight,
  Clock,
  GraduationCap,
  Calendar,
  Upload,
  Image as ImageIcon,
  X,
  MessageSquare,
  Send,
  Copy,
  Check,
  KeyRound,
  HelpCircle,
  UserPlus,
  ArrowLeft,
  Sparkles,
  Flame,
} from 'lucide-react';
import { submitPasswordResetRequest } from '../services/adminService';
import {
  getSchoolApprovalWhatsApp,
  getForgotPasswordWhatsApp,
  ADMIN_WHATSAPP_LINK,
} from '../utils/whatsappUtils';
import { SetNewPasswordModal } from './SetNewPasswordModal';
import { VidyalayamLogo } from './VidyalayamLogo';
import { OnlineAdmissionPortal, getSchoolAdmissionStatus } from './OnlineAdmissionPortal';
import { getSchoolsForAdmissionDirectory } from '../services/firestoreService';

const GUJARAT_DISTRICTS = [
  'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
  'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka',
  'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch',
  'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
  'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
  'Tapi', 'Vadodara', 'Valsad'
];

interface AuthScreenProps {
  onSchoolAuthSuccess?: (school: School) => void;
  onAdminAuthSuccess?: () => void;
  onStudentAuthSuccess?: (session: StudentSession) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSchoolAuthSuccess,
  onAdminAuthSuccess,
  onStudentAuthSuccess,
}) => {
  // Top-level portal switch: School Login vs Student Login vs Admission vs Admin Login
  const [portalType, setPortalType] = useState<'school' | 'student' | 'admin' | 'admission'>('school');

  // Real-time check if any school currently has admissions open
  const [openAdmissionsCount, setOpenAdmissionsCount] = useState<number | null>(null);
  const [checkingAdmissions, setCheckingAdmissions] = useState<boolean>(true);

  React.useEffect(() => {
    let isMounted = true;
    getSchoolsForAdmissionDirectory()
      .then((schools) => {
        if (!isMounted) return;
        const openSchools = schools.filter(
          (s) => getSchoolAdmissionStatus(s).status === 'open'
        );
        setOpenAdmissionsCount(openSchools.length);
        setCheckingAdmissions(false);
      })
      .catch((err) => {
        console.warn('Admission status check error:', err);
        if (isMounted) {
          setOpenAdmissionsCount(0);
          setCheckingAdmissions(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const hasOpenAdmissions = (openAdmissionsCount ?? 0) > 0;

  // School sub-mode: Login vs Register
  const [schoolMode, setSchoolMode] = useState<'login' | 'register'>('login');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // School Form states
  const [diseCode, setDiseCode] = useState('');
  const [schoolPassword, setSchoolPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [district, setDistrict] = useState('Ahmedabad');
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [logoLoading, setLogoLoading] = useState(false);

  // School Registration DISE Uniqueness Verification State
  const [registerDiseChecking, setRegisterDiseChecking] = useState(false);
  const [registerDiseExists, setRegisterDiseExists] = useState(false);
  const [existingSchoolName, setExistingSchoolName] = useState<string | null>(null);

  const handleValidateRegisterDise = async (code: string) => {
    const clean = code.trim();
    if (!clean || clean.length < 5) {
      setRegisterDiseExists(false);
      setExistingSchoolName(null);
      return;
    }
    setRegisterDiseChecking(true);
    try {
      const res = await checkSchoolDiseExists(clean);
      setRegisterDiseExists(res.exists);
      setExistingSchoolName(res.schoolName || null);
      if (res.exists) {
        setError(`આ ડાયસ કોડ (${clean}) ધરાવતી શાળા${res.schoolName ? ` "${res.schoolName}"` : ''} પહેલેથી જ નોંધાયેલી છે. કૃપા કરીને લૉગિન કરો.`);
      }
    } catch (err) {
      console.warn('DISE uniqueness check failed:', err);
    } finally {
      setRegisterDiseChecking(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    setError(null);
    try {
      const compressed = await compressSchoolLogo(file);
      setSchoolLogo(compressed);
    } catch (err: any) {
      setError(err.message || 'લોગો અપલોડ કરવામાં ભૂલ આવી.');
    } finally {
      setLogoLoading(false);
    }
  };

  // Student Form states (DISE Code + DOB as Password + optional GR)
  const [studentDiseCode, setStudentDiseCode] = useState('');
  const [studentDob, setStudentDob] = useState('');
  const [studentGrNumber, setStudentGrNumber] = useState('');
  const [dobInputMode, setDobInputMode] = useState<'date' | 'text'>('date');
  const [showExtraStudentFields, setShowExtraStudentFields] = useState(false);

  // Admin Form states (No hardcoded credentials!)
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Forgot Password Modal states
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetDise, setResetDise] = useState('');
  const [resetSchoolName, setResetSchoolName] = useState('');
  const [resetContact, setResetContact] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetCopied, setResetCopied] = useState(false);

  // Temporary Password -> Set New Password flow states
  const [showSetNewPasswordModal, setShowSetNewPasswordModal] = useState(false);
  const [tempResetSchool, setTempResetSchool] = useState<School | null>(null);
  const [tempPasswordUsed, setTempPasswordUsed] = useState('');

  // Post-Registration Approval Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [registeredSchoolForApproval, setRegisteredSchoolForApproval] = useState<School | null>(null);
  const [approvalCopied, setApprovalCopied] = useState(false);

  // Handle School Login
  const handleSchoolLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanDise = diseCode.trim();
    if (!cleanDise) {
      setError('Please enter your School DISE Code.');
      return;
    }
    if (!schoolPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginSchool(cleanDise, schoolPassword);
      if (result.requiresPasswordReset) {
        setTempResetSchool(result.school);
        setTempPasswordUsed(schoolPassword.trim());
        setShowSetNewPasswordModal(true);
        return;
      }
      if (onSchoolAuthSuccess) {
        onSchoolAuthSuccess(result.school);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle School Registration (Sets status to 'pending')
  const handleSchoolRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanDise = diseCode.trim();
    const cleanName = schoolName.trim();

    if (!cleanName) {
      setError('Please provide the official School Name.');
      return;
    }
    if (!cleanDise) {
      setError('Please provide your 11-digit School DISE Code.');
      return;
    }
    if (schoolPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (schoolPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      // Pre-verify DISE code uniqueness before attempting registration
      const diseCheck = await checkSchoolDiseExists(cleanDise);
      if (diseCheck.exists) {
        setRegisterDiseExists(true);
        setExistingSchoolName(diseCheck.schoolName || null);
        setError(
          `આ ડાયસ કોડ (${cleanDise}) ધરાવતી શાળા${diseCheck.schoolName ? ` ("${diseCheck.schoolName}")` : ''} પહેલેથી જ સિસ્ટમમાં નોંધાયેલી છે. એક જ ડાયસ કોડ પર બીજી શાળા નોંધણી શક્ય નથી. કૃપા કરીને લૉગિન કરો.`
        );
        setLoading(false);
        return;
      }

      const { school } = await registerSchool({
        schoolName: cleanName,
        diseCode: cleanDise,
        district,
        password: schoolPassword,
        logoUrl: schoolLogo || undefined,
      });

      setRegisteredSchoolForApproval(school);
      setShowApprovalModal(true);
      setSuccessMessage(
        'શાળા નોંધણી સફળતાપૂર્વક સબમિટ થઈ ગઈ છે! કૃપા કરીને એડમિનને WhatsApp પર મેસેજ કરીને મંજૂરી મેળવો.'
      );
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check details and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin Login (Firebase Auth with Admin Mobile / ID + /admins/{uid} check)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanId = adminIdentifier.trim();
    if (!cleanId) {
      setError('Please enter your Admin Mobile / ID.');
      return;
    }
    if (!adminPassword) {
      setError('Please enter your Admin Password.');
      return;
    }

    setLoading(true);
    try {
      await loginAdmin(cleanId, adminPassword);
      setSuccessMessage('Administrator verified! Redirecting to Admin Dashboard...');
      if (onAdminAuthSuccess) {
        onAdminAuthSuccess();
      }
    } catch (err: any) {
      console.error('Admin Login failed:', err);
      let msg = err.message || 'Admin Login failed. Please verify your credentials.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        msg = 'Invalid Admin Mobile / ID or Password. Please check your credentials in Firebase.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Student Login (DISE Code + DOB as Password + optional GR Number)
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanDise = studentDiseCode.trim();
    const cleanDob = studentDob.trim();
    const cleanGr = studentGrNumber.trim();

    if (!cleanDise) {
      setError('કૃપા કરીને તમારો વિદ્યાર્થી DISE કોડ (Student DISE Code) દાખલ કરો.');
      return;
    }

    if (!cleanDob) {
      setError('કૃપા કરીને પાસવર્ડ તરીકે તમારી જન્મ તારીખ (Birthdate / Password) દાખલ કરો.');
      return;
    }

    setLoading(true);
    try {
      const session = await studentLogin({
        studentDiseCode: cleanDise,
        diseCode: cleanDise,
        dob: cleanDob,
        grNumber: cleanGr || undefined,
      });
      setSuccessMessage('વિદ્યાર્થી સફળતાપૂર્વક ચકાસાયેલ! પોર્ટલ ખુલી રહ્યું છે...');
      if (onStudentAuthSuccess) {
        onStudentAuthSuccess(session);
      }
    } catch (err: any) {
      console.error('Student Login failed:', err);
      setError(err.message || 'વિદ્યાર્થી લૉગિન નિષ્ફળ થયું. વિગતો ચકાસી ફરી પ્રયત્ન કરો.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-[#f8f6f2] dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header: Logo -> Name (only in english) -> by NRChad */}
        <div className="flex flex-col items-center text-center">
          {/* 1. Logo (Clean, unobstructed) */}
          <div className="relative">
            <VidyalayamLogo size={76} glow />
          </div>

          {/* 2. Name (only in english - original sans font) */}
          <h1 className="mt-3.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Vidyalayam
          </h1>

          {/* 3. by NRChad */}
          <p className="mt-0.5 text-xs sm:text-sm font-bold text-[#9d512d] dark:text-[#f59c73] tracking-wide">
            by NRChad
          </p>

          {/* Contextual portal description */}
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm px-4">
            {portalType === 'admin'
              ? 'રાજ્ય એડમિનિસ્ટ્રેટર લૉગિન • Role-Based System Security'
              : portalType === 'student'
              ? 'વિદ્યાર્થી પોર્ટલ • ઓનલાઇન પરીક્ષા, ગુણ & પરિણામ'
              : portalType === 'admission'
              ? 'ઓનલાઇન પ્રવેશ પોર્ટલ • શાળાઓમાં નવા વિદ્યાર્થીઓ માટે પ્રવેશ અરજી'
              : 'ગુજરાત રાજ્ય શાળા ગુણાંકન પોર્ટલ • Multi-School System'}
          </p>
        </div>
      </div>

      {portalType === 'admission' ? (
        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-4xl px-3 sm:px-4">
          <div className="glass-panel py-6 px-4 shadow-xl dark:shadow-2xl shadow-slate-900/10 dark:shadow-black/60 sm:rounded-3xl sm:px-8 border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#121921]/90 transition-colors">
            <OnlineAdmissionPortal onBackToLogin={() => setPortalType('school')} />
          </div>
        </div>
      ) : (
        <>
          {/* ============================================================ */}
          {/* SEPARATE HIGHLIGHTED ADMISSION BANNER                         */}
          {/* Separated from School/Student/Admin login tabs                */}
          {/* Highlighted in vivid, radiant colors if admission is open    */}
          {/* ============================================================ */}
          <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md px-3 sm:px-0">
            <button
              type="button"
              id="btn-admission-highlight-banner"
              onClick={() => {
                setPortalType('admission');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`w-full text-left rounded-2xl p-3.5 sm:p-4 transition-all duration-300 cursor-pointer shadow-lg relative overflow-hidden group ${
                hasOpenAdmissions
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:via-orange-600 hover:to-rose-700 text-white shadow-orange-500/30 border-2 border-amber-300 dark:border-amber-400/80 hover:scale-[1.02] active:scale-[0.99] ring-2 ring-orange-400/40'
                  : 'bg-white dark:bg-[#121921] hover:bg-amber-50/60 dark:hover:bg-[#16202c] text-slate-800 dark:text-[#e4ded6] border border-amber-500/30 dark:border-amber-500/20 hover:border-amber-500/60 shadow-md'
              }`}
            >
              {/* Dynamic glowing shimmer effect when admissions open */}
              {hasOpenAdmissions && (
                <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/20 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform" />
              )}

              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                      hasOpenAdmissions
                        ? 'bg-white text-orange-600 ring-2 ring-white/60 shadow-orange-950/20'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs sm:text-sm font-black tracking-tight ${
                          hasOpenAdmissions ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        નવા પ્રવેશ (Online Admissions)
                      </span>
                      {hasOpenAdmissions ? (
                        <span className="inline-flex items-center gap-1.5 bg-black/30 backdrop-blur-md text-yellow-200 font-extrabold text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full border border-yellow-300/50 shadow-xs animate-pulse">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-80"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                          </span>
                          <span>🔥 પ્રવેશ શરૂ છે! (OPEN)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 font-semibold text-[10px] px-2 py-0.5 rounded-full border border-amber-500/20">
                          {checkingAdmissions ? 'ચકાસી રહ્યું છે...' : 'ઓનલાઇન પોર્ટલ'}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] sm:text-xs mt-0.5 truncate ${
                        hasOpenAdmissions
                          ? 'text-amber-100 font-medium'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {hasOpenAdmissions
                        ? `${openAdmissionsCount} શાળાઓમાં પ્રવેશ ચાલુ છે • ઓનલાઇન અરજી કરવા ક્લિક કરો`
                        : 'ગુજરાત રાજ્યની શાળાઓમાં પ્રવેશ માહિતી અને ઓનલાઇન અરજી ફોર્મ'}
                    </p>
                  </div>
                </div>

                <div
                  className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-transform group-hover:translate-x-1 ${
                    hasOpenAdmissions
                      ? 'bg-white/20 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          </div>

          {/* PRIMARY LOGIN CARD: Only authenticated roles [ School ] [ Student ] [ Admin ] */}
          <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md px-3 sm:px-0">
            <div className="glass-panel py-8 px-4 shadow-xl dark:shadow-2xl shadow-slate-900/10 dark:shadow-black/60 sm:rounded-3xl sm:px-8 border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#121921]/90 transition-colors">
              {/* Clean 3-way authenticated roles: School, Student, Admin */}
              <div className="grid grid-cols-3 rounded-2xl bg-slate-100 dark:bg-[#090c10]/90 p-1.5 border border-slate-200 dark:border-white/10 mb-6 shadow-inner gap-1">
                <button
                  id="tab-portal-school"
                  type="button"
                  onClick={() => {
                    setPortalType('school');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                    portalType === 'school'
                      ? 'bg-[#9d512d] text-white shadow-lg'
                      : 'text-slate-600 dark:text-[#a99f91] hover:text-slate-900 dark:hover:text-[#e4ded6]'
                  }`}
                >
                  <SchoolIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>શાળા</span>
                </button>

                <button
                  id="tab-portal-student"
                  type="button"
                  onClick={() => {
                    setPortalType('student');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                    portalType === 'student'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                      : 'text-slate-600 dark:text-[#a99f91] hover:text-slate-900 dark:hover:text-[#e4ded6]'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>વિદ્યાર્થી</span>
                </button>

                <button
                  id="tab-portal-admin"
                  type="button"
                  onClick={() => {
                    setPortalType('admin');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                    portalType === 'admin'
                      ? 'bg-rose-700 text-white shadow-lg'
                      : 'text-slate-600 dark:text-[#a99f91] hover:text-slate-900 dark:hover:text-[#e4ded6]'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>એડમિન</span>
                </button>
              </div>

          {/* Error Message Box */}
          {error && (
            <div
              id="auth-error-banner"
              className="mb-5 rounded-lg bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800/80 p-3 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Success Message Box */}
          {successMessage && (
            <div
              id="auth-success-banner"
              className="mb-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION A: SCHOOL PORTAL (LOGIN & REGISTRATION)              */}
          {/* ============================================================ */}
          {portalType === 'school' && (
            <div>
              {/* School Sub-mode Switcher */}
              <div className="flex rounded-2xl bg-slate-100 dark:bg-[#090c10]/80 p-1 border border-slate-200 dark:border-white/10 mb-5">
                <button
                  id="tab-school-login"
                  type="button"
                  onClick={() => {
                    setSchoolMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    schoolMode === 'login'
                      ? 'bg-white dark:bg-[#202d38] text-slate-900 dark:text-[#e4ded6] border border-slate-200 dark:border-white/10 shadow-md'
                      : 'text-slate-600 dark:text-[#a99f91] hover:text-slate-900 dark:hover:text-[#e4ded6]'
                  }`}
                >
                  DISE Code Login
                </button>
                <button
                  id="tab-school-register"
                  type="button"
                  onClick={() => {
                    setSchoolMode('register');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    schoolMode === 'register'
                      ? 'bg-white dark:bg-[#202d38] text-slate-900 dark:text-[#e4ded6] border border-slate-200 dark:border-white/10 shadow-md'
                      : 'text-slate-600 dark:text-[#a99f91] hover:text-slate-900 dark:hover:text-[#e4ded6]'
                  }`}
                >
                  Register New School
                </button>
              </div>

              {/* School Login Form */}
              {schoolMode === 'login' && (
                <form onSubmit={handleSchoolLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6] mb-1.5">
                      School DISE Code (શાળા ડાયસ કોડ)
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a99f91]">
                        <Hash className="w-4 h-4" />
                      </div>
                      <input
                        id="input-login-dise"
                        type="text"
                        required
                        value={diseCode}
                        onChange={(e) => setDiseCode(e.target.value)}
                        placeholder="e.g. 24070500101"
                        className="glass-input block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-[#a99f91]/60"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-[#a99f91]">
                      Enter your official 11-digit Gujarat School DISE Code.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6] mb-1.5">
                      School Password (પાસવર્ડ)
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a99f91]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="input-login-password"
                        type="password"
                        required
                        value={schoolPassword}
                        onChange={(e) => setSchoolPassword(e.target.value)}
                        placeholder="••••••••"
                        className="glass-input block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-[#a99f91]/60"
                      />
                    </div>
                    <div className="flex justify-end mt-1.5">
                      <button
                        type="button"
                        id="btn-forgot-password"
                        onClick={() => {
                          setResetDise(diseCode);
                          setForgotPasswordOpen(true);
                          setResetSuccess(false);
                        }}
                        className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>પાસવર્ડ ભૂલી ગયા છો? (Forgot Password?)</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      id="btn-school-login-submit"
                      type="submit"
                      disabled={loading}
                      className="w-full btn-terracotta flex justify-center items-center py-3 px-4 rounded-2xl shadow-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Authenticating School...
                        </span>
                      ) : (
                        'Log In with DISE Code'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* School Registration Form */}
              {schoolMode === 'register' && (
                <form onSubmit={handleSchoolRegister} className="space-y-4">
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      નવી શાળા નોંધણી આપોઆપ <strong>Pending</strong> રહેશે અને એડમિન દ્વારા મંજૂર થયા પછી જ ગુણ ભરી શકાશે.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      School Name (શાળાનું નામ) *
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#a99f91]">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        id="input-register-name"
                        type="text"
                        required
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="e.g. Shree Sarvajanik High School"
                        className="glass-input block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-[#a99f91]/60"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6] mb-1.5 flex items-center justify-between">
                      <span>School DISE Code (શાળા ડાયસ કોડ) *</span>
                      {registerDiseChecking && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-normal">
                          <span className="w-2.5 h-2.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></span>
                          ચકાસી રહ્યું છે...
                        </span>
                      )}
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a99f91]">
                        <Hash className="w-4 h-4" />
                      </div>
                      <input
                        id="input-register-dise"
                        type="text"
                        required
                        value={diseCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDiseCode(val);
                          if (registerDiseExists) {
                            setRegisterDiseExists(false);
                            setExistingSchoolName(null);
                          }
                        }}
                        onBlur={(e) => handleValidateRegisterDise(e.target.value)}
                        placeholder="e.g. 24070500101"
                        className={`glass-input block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-[#a99f91]/60 ${
                          registerDiseExists
                            ? 'border-red-500 ring-2 ring-red-400/40 dark:border-red-500'
                            : ''
                        }`}
                      />
                    </div>

                    {/* Uniqueness Alert Banner if already exists */}
                    {registerDiseExists ? (
                      <div className="mt-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-xs text-red-800 dark:text-red-300 space-y-1.5 animate-fadeIn">
                        <div className="flex items-start gap-1.5 font-bold">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          <span>
                            આ ડાયસ કોડ ({diseCode.trim()}) ધરાવતી શાળા{existingSchoolName ? ` "${existingSchoolName}"` : ''} પહેલેથી જ સિસ્ટમમાં નોંધાયેલી છે!
                          </span>
                        </div>
                        <p className="text-[11px] text-red-700 dark:text-red-300 pl-5.5 leading-relaxed">
                          એક ડાયસ કોડ માત્ર એક જ શાળા માટે વાપરી શકાય છે. જો આ તમારી શાળા હોય, તો લૉગિન કરો.
                        </p>
                        <div className="pl-5.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSchoolMode('login');
                              setError(null);
                            }}
                            className="inline-flex items-center gap-1 font-bold text-red-700 dark:text-red-300 hover:text-red-900 underline cursor-pointer text-[11px]"
                          >
                            <span>આ ડાયસ કોડ સાથે સીધા લૉગિન કરવા અહીં ક્લિક કરો ➔</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-[#a99f91]">
                        દરેક શાળાનો ૧૧ અંકનો ડાયસ કોડ યુનિક હોવો જરૂરી છે (No duplicate registrations).
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6] mb-1.5">
                      Gujarat District (જિલ્લો) *
                    </label>
                    <select
                      id="select-register-district"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="glass-input block w-full px-3 py-2.5 rounded-xl text-sm"
                    >
                      {GUJARAT_DISTRICTS.map((d) => (
                        <option key={d} value={d} className="bg-white dark:bg-[#121921] text-slate-900 dark:text-[#e4ded6]">
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6] mb-1.5">
                      Password (પાસવર્ડ) *
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a99f91]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="input-register-password"
                        type="password"
                        required
                        minLength={6}
                        value={schoolPassword}
                        onChange={(e) => setSchoolPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="glass-input block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-[#a99f91]/60"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6] mb-1.5">
                      Confirm Password (પાસવર્ડ પુષ્ટિ કરો) *
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a99f91]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="input-register-confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type password"
                        className="glass-input block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-[#a99f91]/60"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6] mb-1.5 flex items-center justify-between">
                      <span>School Logo (શાળાનો લોગો)</span>
                      <span className="text-[11px] text-slate-500 dark:text-[#a99f91] font-normal">(વૈકલ્પિક / Optional)</span>
                    </label>
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      {schoolLogo ? (
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-white/20 bg-white dark:bg-white/10 shrink-0 flex items-center justify-center">
                          <img src={schoolLogo} alt="School Logo Preview" className="w-full h-full object-contain p-1" />
                          <button
                            type="button"
                            onClick={() => setSchoolLogo('')}
                            className="absolute -top-1 -right-1 p-1 rounded-full bg-rose-600 text-white shadow hover:bg-rose-500 cursor-pointer"
                            title="લોગો દૂર કરો"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 shrink-0 flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">લોગો</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer border border-slate-200 dark:border-white/15 transition-all">
                          <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{logoLoading ? 'પ્રોસેસિંગ...' : schoolLogo ? 'લોગો બદલો' : 'શાળાનો લોગો અપલોડ કરો'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            disabled={logoLoading}
                          />
                        </label>
                        <p className="text-[10px] text-slate-500 dark:text-[#a99f91] mt-1 truncate">
                          આ લોગો ID કાર્ડ, પરિણામ અને ઓનલાઇન પરીક્ષામાં દેખાશે.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      id="btn-register-submit"
                      type="submit"
                      disabled={loading || registerDiseChecking || registerDiseExists}
                      className="w-full btn-terracotta flex justify-center items-center py-3 px-4 rounded-2xl shadow-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Registering School...
                        </span>
                      ) : registerDiseChecking ? (
                        'Verifying DISE Code...'
                      ) : registerDiseExists ? (
                        'Cannot Register: Duplicate DISE Code'
                      ) : (
                        'Register School (Submit for Approval)'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION B: STUDENT PORTAL LOGIN (DISE CODE + BIRTHDATE PASSWORD) */}
          {/* ============================================================ */}
          {portalType === 'student' && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              {/* Simple Student Avatar Header */}
              <div className="flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-emerald-50/70 dark:bg-[#090c10]/60 border border-emerald-500/20">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/30 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-950/20 mb-2.5 overflow-hidden">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">વિદ્યાર્થી લૉગિન (Student Login)</h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  શાળાના ડેટાબેઝ મુજબ તમારો DISE કોડ અને જન્મ તારીખ (પાસવર્ડ) દાખલ કરો
                </p>
              </div>

              {/* Password info notice */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed">
                  <strong className="text-emerald-800 dark:text-emerald-300">સુરક્ષિત લૉગિન:</strong> વિદ્યાર્થીઓ ત્યારે જ લૉગિન કરી શકે છે જ્યારે તેમનો DISE કોડ અને જન્મ તારીખ (પાસવર્ડ) શાળાના ડેટા સાથે મેળ ખાશે.
                </p>
              </div>

              {/* 1. Student DISE Code Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6] mb-1.5">
                  વિદ્યાર્થીનો DISE કોડ (Student DISE Code) *
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500 dark:text-emerald-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input
                    id="input-student-dise"
                    type="text"
                    required
                    autoFocus
                    value={studentDiseCode}
                    onChange={(e) => setStudentDiseCode(e.target.value.trim())}
                    placeholder="દા.ત. 240104015021720076 (Child UID)"
                    className="glass-input block w-full pl-10 pr-3 py-3 rounded-xl text-sm placeholder-[#a99f91]/60 font-mono tracking-wide focus:border-emerald-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-[#a99f91]">
                  શાળા રેકોર્ડ / UDISE+ માં નોંધાયેલ ૧૮ આંકડાનો વિદ્યાર્થી DISE કોડ (Child UID)
                </p>
              </div>

              {/* 2. Birthdate as Password (Mandatory) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6] flex items-center gap-1.5">
                    <span>જન્મ તારીખ / પાસવર્ડ (Birthdate) *</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-normal">
                      Password
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setDobInputMode(dobInputMode === 'date' ? 'text' : 'date')}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors font-medium cursor-pointer"
                  >
                    {dobInputMode === 'date' ? '✎ DD/MM/YYYY લખો' : '📅 કેલેન્ડર વાપરો'}
                  </button>
                </div>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-500 dark:text-emerald-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="input-student-dob"
                    type={dobInputMode}
                    required
                    value={studentDob}
                    onChange={(e) => setStudentDob(e.target.value)}
                    placeholder={dobInputMode === 'date' ? undefined : 'DD/MM/YYYY (દા.ત. 15/08/2010)'}
                    className="glass-input block w-full pl-10 pr-3 py-3 rounded-xl text-sm placeholder-[#a99f91]/60 font-mono tracking-wide focus:border-emerald-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-[#a99f91]">
                  પાસવર્ડ તરીકે શાળાના રેકોર્ડ મુજબની જન્મ તારીખ (DD/MM/YYYY અથવા YYYY-MM-DD)
                </p>
              </div>

              {/* Optional GR Number (if multiple students have same DISE code) */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowExtraStudentFields(!showExtraStudentFields)}
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{showExtraStudentFields ? '▲ G.R. નંબર છુપાવો' : '▼ જો G.R. નંબર પણ આપવો હોય (વૈકલ્પિક)'}</span>
                </button>
              </div>

              {showExtraStudentFields && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#090c10]/40 border border-slate-200 dark:border-white/5 space-y-1 animate-fadeIn">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6] mb-1">
                    G.R. નંબર <span className="text-slate-500 dark:text-slate-400 font-normal">(જો શાળા તરફથી આપવામાં આવ્યો હોય)</span>
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a99f91]">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <input
                      id="input-student-gr"
                      type="text"
                      value={studentGrNumber}
                      onChange={(e) => setStudentGrNumber(e.target.value)}
                      placeholder="દા.ત. 124"
                      className="glass-input block w-full pl-10 pr-3 py-2 rounded-xl text-xs placeholder-[#a99f91]/60"
                    />
                  </div>
                </div>
              )}

              {/* Login Button */}
              <div className="pt-2">
                <button
                  id="btn-student-login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-2xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ચકાસણી થઈ રહી છે...
                    </span>
                  ) : (
                    'લૉગિન કરો (Verify & Login)'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* SECTION C: ADMIN LOGIN (ADMIN MOBILE / ID & PASSWORD)        */}
          {/* ============================================================ */}
          {portalType === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-[11px] text-red-800 dark:text-red-300 flex items-start gap-2">
                <Shield className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <span>
                  Admin Authentication uses Firebase Auth. Your UID must exist in the <strong>/admins</strong> collection with <strong>role: &quot;admin&quot;</strong>.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6] mb-1.5">
                  Admin Mobile / ID
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a99f91]">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <input
                    id="input-admin-identifier"
                    type="text"
                    required
                    value={adminIdentifier}
                    onChange={(e) => setAdminIdentifier(e.target.value)}
                    placeholder="Enter Admin Mobile / ID"
                    className="glass-input block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-[#a99f91]/60"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-[#a99f91]">
                  Enter your registered Admin Mobile Number or Admin ID.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-[#e4ded6]">
                    Admin Password
                  </label>
                </div>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#a99f91]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-admin-password"
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm placeholder-[#a99f91]/60"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-admin-login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-2xl shadow-lg text-sm font-bold text-white bg-rose-700 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Verifying Admin Authority...
                    </span>
                  ) : (
                    'Login'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Architecture note */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Multi-Role Security Architecture</span>
              </div>
              <p>
                • <strong>Role Authorization:</strong> Admin authority is checked server-side directly against <code>/admins/{'{uid}'}</code> in Firestore.
              </p>
              <p>
                • <strong>Zero Hardcoded Credentials:</strong> All authentication credentials reside exclusively in Firebase Authentication.
              </p>
            </div>
          </div>
        </div>
      </>
    )}

      {/* MODAL 1: Forgot Password Assistant */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 text-left relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              id="btn-close-forgot-password"
              onClick={() => {
                setForgotPasswordOpen(false);
                setResetSuccess(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">પાસવર્ડ સહાય / રીસેટ</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">એડમિનનો સંપર્ક કરી પાસવર્ડ બદલવાની વ્યવસ્થા</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              જો તમે તમારી શાળાનો પાસવર્ડ ભૂલી ગયા હોવ, તો નીચે તમારી શાળાની વિગતો ભરીને <strong>WhatsApp દ્વારા એડમિનનો સીધો સંપર્ક</strong> કરી શકો છો અથવા સિસ્ટમમાં વિનંતી નોંધાવી શકો છો.
            </p>

            {resetSuccess ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl p-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">વિનંતી સફળતાપૂર્વક નોંધાઈ ગઈ!</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  તમારી પાસવર્ડ રીસેટ વિનંતી એડમિન પોર્ટલમાં સબમિટ થઈ ગઈ છે. ઝડપી પ્રક્રિયા માટે કૃપા કરીને નીચે આપેલ બટનથી એડમિનને WhatsApp પર પણ મેસેજ કરો.
                </p>
                <a
                  href={
                    getForgotPasswordWhatsApp({
                      diseCode: resetDise,
                      schoolName: resetSchoolName,
                      contactNumber: resetContact,
                    }).url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp પર એડમિનને મેસેજ કરો</span>
                </a>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!resetDise.trim()) {
                    alert('કૃપા કરીને 11-અંકનો શાળા DISE કોડ દાખલ કરો.');
                    return;
                  }
                  setResetSubmitting(true);
                  try {
                    await submitPasswordResetRequest({
                      diseCode: resetDise.trim(),
                      schoolName: resetSchoolName.trim(),
                      contactNumber: resetContact.trim(),
                    });
                    setResetSuccess(true);
                  } catch (err: any) {
                    alert(err.message || 'વિનંતી સબમિટ કરવામાં ભૂલ આવી.');
                  } finally {
                    setResetSubmitting(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    શાળાનો 11-અંકનો DISE કોડ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-reset-dise"
                    type="text"
                    required
                    value={resetDise}
                    onChange={(e) => setResetDise(e.target.value)}
                    placeholder="દા.ત. 24070500101"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    શાળાનું નામ (School Name)
                  </label>
                  <input
                    id="input-reset-school-name"
                    type="text"
                    value={resetSchoolName}
                    onChange={(e) => setResetSchoolName(e.target.value)}
                    placeholder="તમારી શાળાનું નામ"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    સંપર્ક મોબાઈલ નંબર (Contact Number)
                  </label>
                  <input
                    id="input-reset-contact"
                    type="text"
                    value={resetContact}
                    onChange={(e) => setResetContact(e.target.value)}
                    placeholder="દા.ત. 9876543210"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Direct WhatsApp Action Box */}
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ઝડપી પાસવર્ડ સહાય (WhatsApp Direct)
                    </span>
                    <span className="text-[10px] text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                      તુરંત રીસેટ
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    નીચેના બટન પર ટેપ કરવાથી એડમિનનું WhatsApp ખુલશે જેમાં તમારો DISE કોડ અને પાસવર્ડ રીસેટ કરવાની વિનંતી આપોઆપ લખેલી હશે:
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      id="btn-whatsapp-forgot-password"
                      href={
                        getForgotPasswordWhatsApp({
                          diseCode: resetDise || 'DISE CODE',
                          schoolName: resetSchoolName,
                          contactNumber: resetContact,
                        }).url
                      }
                      onClick={() => {
                        const { message } = getForgotPasswordWhatsApp({
                          diseCode: resetDise || 'DISE CODE',
                          schoolName: resetSchoolName,
                          contactNumber: resetContact,
                        });
                        try {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(message);
                            setResetCopied(true);
                            setTimeout(() => setResetCopied(false), 3000);
                          }
                        } catch (e) {}
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                    >
                      <Send className="w-4 h-4" />
                      <span>WhatsApp પર એડમિનનો સંપર્ક કરો</span>
                    </a>

                    <button
                      type="button"
                      id="btn-copy-reset-msg"
                      onClick={() => {
                        const { message } = getForgotPasswordWhatsApp({
                          diseCode: resetDise || 'DISE CODE',
                          schoolName: resetSchoolName,
                          contactNumber: resetContact,
                        });
                        navigator.clipboard.writeText(message);
                        setResetCopied(true);
                        setTimeout(() => setResetCopied(false), 2500);
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      {resetCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                      <span>{resetCopied ? 'કોપી થયું!' : 'મેસેજ કોપી'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    રદ કરો (Cancel)
                  </button>
                  <button
                    id="btn-submit-reset-db"
                    type="submit"
                    disabled={resetSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    {resetSubmitting ? (
                      <span>સબમિટ થઈ રહ્યું છે...</span>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>સિસ્ટમમાં રીસેટ વિનંતી નોંધાવો</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Force Set New Password when School logs in with Temporary Password */}
      {showSetNewPasswordModal && tempResetSchool && (
        <SetNewPasswordModal
          isOpen={showSetNewPasswordModal}
          school={tempResetSchool}
          temporaryPasswordUsed={tempPasswordUsed}
          onSuccess={(updatedSchool) => {
            setShowSetNewPasswordModal(false);
            setSuccessMessage('નવો પાસવર્ડ સફળતાપૂર્વક સેટ થઈ ગયો છે! પોર્ટલમાં લૉગિન થઈ ગયા છો.');
            if (onSchoolAuthSuccess) {
              onSchoolAuthSuccess(updatedSchool);
            }
          }}
          onCancel={() => setShowSetNewPasswordModal(false)}
        />
      )}

      {/* MODAL 2: Post-Registration Admin Approval Request via WhatsApp */}
      {showApprovalModal && registeredSchoolForApproval && (
        <div className="fixed inset-0 z-50 bg-black/70 dark:bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] border border-emerald-300 dark:border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 text-left relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">શાળા નોંધણી સફળ થઈ છે!</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Approval માટે એડમિનનો સંપર્ક કરો</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{registeredSchoolForApproval.schoolName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>DISE: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{registeredSchoolForApproval.diseCode}</strong></span>
                <span>જિલ્લો: <strong className="text-slate-800 dark:text-slate-200">{registeredSchoolForApproval.district}</strong></span>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  એડમિનને WhatsApp પર મેસેજ મોકલો
                </span>
                <span className="text-[10px] text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                  ઝડપી Approval
                </span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                તમારી શાળાની નોંધણી થઈ ગઈ છે. એકાઉન્ટને મંજૂર (Approve) કરાવવા માટે નીચેના બટન પર ક્લિક કરો. તેનાથી એડમિન શ્રી (<strong>7203070830</strong>) નું WhatsApp શાળાની સંપૂર્ણ વિગતો સાથે ખુલી જશે, જ્યાં તમારે ફક્ત <strong>Send</strong> બટન જ દબાવવાનું રહેશે!
              </p>

              {/* Pre-typed message preview */}
              <div className="bg-slate-100 dark:bg-slate-950/90 rounded-xl p-3 border border-slate-200 dark:border-emerald-950 text-[10px] text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {
                  getSchoolApprovalWhatsApp({
                    schoolName: registeredSchoolForApproval.schoolName,
                    diseCode: registeredSchoolForApproval.diseCode,
                    district: registeredSchoolForApproval.district,
                    principalName: registeredSchoolForApproval.principalName,
                    contactNumber: registeredSchoolForApproval.contactPhone || registeredSchoolForApproval.principalPhone,
                  }).message
                }
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  id="btn-whatsapp-register-approval"
                  href={
                    getSchoolApprovalWhatsApp({
                      schoolName: registeredSchoolForApproval.schoolName,
                      diseCode: registeredSchoolForApproval.diseCode,
                      district: registeredSchoolForApproval.district,
                      principalName: registeredSchoolForApproval.principalName,
                      contactNumber: registeredSchoolForApproval.contactPhone || registeredSchoolForApproval.principalPhone,
                    }).url
                  }
                  onClick={() => {
                    const data = getSchoolApprovalWhatsApp({
                      schoolName: registeredSchoolForApproval.schoolName,
                      diseCode: registeredSchoolForApproval.diseCode,
                      district: registeredSchoolForApproval.district,
                      principalName: registeredSchoolForApproval.principalName,
                      contactNumber: registeredSchoolForApproval.contactPhone || registeredSchoolForApproval.principalPhone,
                    });
                    try {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(data.message);
                        setApprovalCopied(true);
                        setTimeout(() => setApprovalCopied(false), 3000);
                      }
                    } catch (e) {}
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/20"
                >
                  <Send className="w-4 h-4" />
                  <span>💬 એડમિન (7203070830) ને WhatsApp મોકલો</span>
                </a>

                <button
                  type="button"
                  id="btn-copy-approval-register-msg"
                  onClick={() => {
                    const { message } = getSchoolApprovalWhatsApp({
                      schoolName: registeredSchoolForApproval.schoolName,
                      diseCode: registeredSchoolForApproval.diseCode,
                      district: registeredSchoolForApproval.district,
                      principalName: registeredSchoolForApproval.principalName,
                      contactNumber: registeredSchoolForApproval.contactPhone || registeredSchoolForApproval.principalPhone,
                    });
                    navigator.clipboard.writeText(message);
                    setApprovalCopied(true);
                    setTimeout(() => setApprovalCopied(false), 2500);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {approvalCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                  <span>{approvalCopied ? 'કોપી થયો!' : 'મેસેજ કોપી કરો'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                id="btn-continue-to-portal"
                onClick={() => {
                  setShowApprovalModal(false);
                  if (onSchoolAuthSuccess) {
                    onSchoolAuthSuccess(registeredSchoolForApproval);
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                પોર્ટલ પર આગળ વધો (Continue to Portal) &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
