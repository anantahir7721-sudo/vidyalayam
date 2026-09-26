import React from 'react';
import { School, Student, MarkRecord, Staff } from '../types';
import {
  Users,
  Award,
  ShieldCheck,
  Building,
  ArrowRight,
  Sparkles,
  Calendar,
  CheckCircle,
  BookOpen,
  UserCheck,
  CreditCard,
  FileText,
  FileSpreadsheet,
  Settings,
  GraduationCap,
  BarChart3,
  Phone,
  Mail,
  MapPin,
  Clock,
  Layers,
  Edit3,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import { ActiveTabType } from './Navbar';
import { VidyalayamLogo } from './VidyalayamLogo';
import { UniversalStudentSearch } from './UniversalStudentSearch';

interface DashboardOverviewProps {
  school: School;
  students: Student[];
  marks: MarkRecord[];
  staffList?: Staff[];
  onNavigate: (tab: ActiveTabType) => void;
  onStudentUpdated?: (updated: Student) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  school,
  students,
  marks,
  staffList = [],
  onNavigate,
  onStudentUpdated,
}) => {
  // Statistics calculations
  const std9Count = students.filter((s) => String(s.standard) === '9').length;
  const std10Count = students.filter((s) => String(s.standard) === '10').length;
  const std11Count = students.filter((s) => String(s.standard) === '11').length;
  const std12Count = students.filter((s) => String(s.standard) === '12').length;

  const isBoy = (g?: string) => {
    if (!g) return false;
    const str = String(g).trim().toLowerCase();
    return str === 'boy' || str === 'male' || str === 'm' || str === 'કુમાર' || str === 'પુરુષ' || str === 'છોકરો';
  };

  const isGirl = (g?: string) => {
    if (!g) return false;
    const str = String(g).trim().toLowerCase();
    return str === 'girl' || str === 'female' || str === 'f' || str === 'કન્યા' || str === 'સ્ત્રી' || str === 'છોકરી';
  };

  const boysCount = students.filter((s) => isBoy(s.gender)).length;
  const girlsCount = students.filter((s) => isGirl(s.gender)).length;

  const teachingStaffCount = staffList.filter(
    (st) =>
      st.category === 'teaching' ||
      !st.category ||
      st.designation?.toLowerCase().includes('teacher') ||
      st.designation?.includes('શિક્ષક')
  ).length;
  const nonTeachingStaffCount = staffList.filter(
    (st) =>
      st.category === 'non_teaching' ||
      st.designation?.toLowerCase().includes('peon') ||
      st.designation?.toLowerCase().includes('clerk')
  ).length;

  const ekamKasotiCount = marks.filter((m) => m.examType.includes('એકમ કસોટી')).length;
  const termExamsCount = marks.filter((m) => !m.examType.includes('એકમ કસોટી')).length;

  // Unified modules (No duplicates: Ekam Kasoti & Term Exams unified under 'exams')
  const modules = [
    {
      id: 'students' as ActiveTabType,
      title: 'વિદ્યાર્થી સંચાલન (Students)',
      desc: 'ધોરણ ૯ થી ૧૨ ના તમામ વિદ્યાર્થીઓની નોંધણી, રોલ નં, GR નં, જાતિવાર વિગતો, જન્મતારીખ અને Excel Import/Export.',
      icon: <Users className="w-5 h-5 text-blue-400" />,
      badge: `${students.length} વિદ્યાર્થી`,
      color: 'hover:border-blue-500/40',
      actionText: 'વિદ્યાર્થીઓ જુઓ',
    },
    {
      id: 'admissions' as ActiveTabType,
      title: 'ઓનલાઇન પ્રવેશ સંચાલન (Admissions Portal)',
      desc: 'શાળા પ્રવેશ પ્રક્રિયા શરૂ/બંધ કરો, તારીખ ગાળો નક્કી કરો, વાલીઓની ઓનલાઇન અરજીઓ ચકાસો અને સીધા વિદ્યાર્થી તરીકે એડમિટ કરો.',
      icon: <UserPlus className="w-5 h-5 text-indigo-400" />,
      badge: 'ઓનલાઇન પ્રવેશ',
      color: 'hover:border-indigo-500/40',
      actionText: 'પ્રવેશ અરજીઓ જુઓ',
    },
    {
      id: 'staff' as ActiveTabType,
      title: 'શિક્ષક અને સ્ટાફ (Staff Manager)',
      desc: 'આચાર્યશ્રી, શિક્ષકો અને કર્મચારીઓની યાદી, શૈક્ષણિક લાયકાત, વિષય, હોદ્દો, સંપર્ક અને A4 સ્ટાફ યાદી.',
      icon: <UserCheck className="w-5 h-5 text-amber-400" />,
      badge: `${staffList.length} સ્ટાફ સભ્યો`,
      color: 'hover:border-amber-500/40',
      actionText: 'સ્ટાફ સંચાલન',
    },
    {
      id: 'exams' as ActiveTabType,
      title: 'પરીક્ષાઓ અને એકમ કસોટી (Exams Center)',
      desc: 'એકમ કસોટી – ૧ (૨૫ ગુણ પ્રશ્નવાર), પ્રથમ સત્રાંત (૫૦), દ્વિતીય સત્રાંત (૫૦) અને વાર્ષિક પરીક્ષા (૮૦) ગુણાંકન.',
      icon: <GraduationCap className="w-5 h-5 text-emerald-400" />,
      badge: '૪ સત્તાવાર કસોટીઓ',
      color: 'hover:border-emerald-500/40',
      actionText: 'પરીક્ષાઓ & કસોટી',
    },
    {
      id: 'online_exams' as ActiveTabType,
      title: '📝 ઓનલાઇન MCQ પરીક્ષા કેન્દ્ર (Online Exam Center)',
      desc: 'શાળાકીય અને એક્સ્ટ્રા MCQ પરીક્ષાઓ, ઓટો-ઇવેલ્યુએશન, AI પ્રશ્ન આયાત, પ્રશ્ન બેંક અને પરિણામ એનાલિટિક્સ.',
      icon: <FileText className="w-5 h-5 text-teal-400" />,
      badge: 'MCQs & AI Importer',
      color: 'hover:border-teal-500/40',
      actionText: 'ઓનલાઇન કસોટી',
    },
    {
      id: 'results' as ActiveTabType,
      title: 'વાર્ષિક પરિણામ અને પ્રગતિ પત્રક (Results)',
      desc: 'GSEB પરિપત્ર મુજબ પરિણામ ગેઝેટ, સિદ્ધિ ગુણ (#), કૃપા ગુણ (*) ના નિયમો અને સત્તાવાર A4 પ્રગતિ પત્રક.',
      icon: <FileSpreadsheet className="w-5 h-5 text-rose-400" />,
      badge: 'GSEB નિયમો & ગેઝેટ',
      color: 'hover:border-rose-500/40',
      actionText: 'પરિણામ ગેઝેટ',
    },
    {
      id: 'parent_messaging' as ActiveTabType,
      title: 'વાલી સંચાર & મેસેજિંગ (Parent Messaging)',
      desc: 'પરીક્ષાનું પરિણામ એક બટનથી દરેક વિદ્યાર્થીના વાલીના મોબાઇલમાં WhatsApp / SMS દ્વારા મોકલો. સામાન્ય સૂચનાઓ અને પરિપત્રોનું પર્સનલ બ્રોડકાસ્ટ.',
      icon: <MessageSquare className="w-5 h-5 text-emerald-400" />,
      badge: 'WhatsApp & SMS',
      color: 'hover:border-emerald-500/40',
      actionText: 'વાલીઓને મેસેજ મોકલો',
    },
    {
      id: 'idcards' as ActiveTabType,
      title: 'ઓળખપત્ર જનરેટર (ID Cards Generator)',
      desc: 'વિદ્યાર્થીઓ અને સ્ટાફ સભ્યો માટે આકર્ષક રંગીન ઓળખપત્ર, QR/બારકોડ અને A4 પેજ પર ૮ કાર્ડ્સ પ્રિન્ટ.',
      icon: <CreditCard className="w-5 h-5 text-cyan-400" />,
      badge: 'A4 8-Grid Print',
      color: 'hover:border-cyan-500/40',
      actionText: 'ID Cards પ્રિન્ટ',
    },
    {
      id: 'certificates' as ActiveTabType,
      title: 'બોનાફાઈડ અને પ્રમાણપત્ર (Certificates)',
      desc: 'સત્તાવાર બોનાફાઈડ પ્રમાણપત્ર, ચારિત્ર્ય પ્રમાણપત્ર અને શાળા છોડ્યાનું પ્રમાણપત્ર સત્તાવાર પ્રિન્ટ.',
      icon: <FileText className="w-5 h-5 text-indigo-400" />,
      badge: 'સત્તાવાર દસ્તાવેજ',
      color: 'hover:border-indigo-500/40',
      actionText: 'પ્રમાણપત્ર કાઢો',
    },
    {
      id: 'reports' as ActiveTabType,
      title: 'શાળા અહેવાલો અને એક્સેલ (School Reports)',
      desc: 'સમગ્ર શાળાનો માસ્ટર ડેટા, વિદ્યાર્થીઓની યાદી અને પરીક્ષા પરિણામો ૧-ક્લિકમાં Excel માં એક્સપોર્ટ કરો.',
      icon: <BarChart3 className="w-5 h-5 text-teal-400" />,
      badge: '૧-ક્લિક એક્સપોર્ટ',
      color: 'hover:border-teal-500/40',
      actionText: 'Excel રિપોર્ટસ',
    },
    {
      id: 'subjects' as ActiveTabType,
      title: 'વિષય વ્યવસ્થાપન (Subject Management)',
      desc: 'ધોરણ ૯ થી ૧૨ માટે GSEB માન્ય વિષયો, વિષય કોડ અને શાળા કક્ષાના કસ્ટમ વિષયો ગોઠવો.',
      icon: <BookOpen className="w-5 h-5 text-orange-400" />,
      badge: 'ધોરણ ૯–૧૨ વિષયો',
      color: 'hover:border-orange-500/40',
      actionText: 'વિષયો ગોઠવો',
    },
    {
      id: 'profile' as ActiveTabType,
      title: 'શાળા પ્રોફાઇલ અને સેટિંગ્સ (School Profile)',
      desc: 'શાળાનું નામ, DISE કોડ, સરનામું, આચાર્યશ્રીની વિગત, સંપર્ક નંબર, ઈમેલ અને સંસ્થાકીય માહિતી.',
      icon: <Building className="w-5 h-5 text-[#f59c73]" />,
      badge: 'પ્રોફાઇલ સેટિંગ',
      color: 'hover:border-[#f59c73]/40',
      actionText: 'પ્રોફાઇલ જુઓ',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* =========================================================================
          STARTING SECTION: SCHOOL BASIC INFORMATION (શાળાની મૂળભૂત માહિતી)
          ========================================================================= */}
      <section className="glass-panel rounded-2xl sm:rounded-3xl border border-white/10 p-4 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 sm:gap-6">
          {/* Main Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-[#9d512d]/15 text-[#7a3b1a] border border-[#9d512d]/30 dark:bg-[#9d512d]/25 dark:text-[#f59c73] dark:border-[#9d512d]/40 inline-flex items-center gap-1.5 shadow-xs">
                <Building className="w-3.5 h-3.5 text-[#9d512d] dark:text-[#f59c73]" />
                <span>શાળા માહિતી</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-stone-100 text-stone-800 border border-stone-200 dark:bg-white/5 dark:border-white/10 dark:text-[#e4ded6]">
                DISE: {school.diseCode}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 shadow-xs">
                માન્ય શાળા • સક્રિય
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900 dark:text-[#e4ded6] tracking-tight leading-snug">
              {school.schoolName}
            </h1>

            {/* Address & Meta details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 text-xs pt-1">
              <div className="flex items-start gap-2 text-stone-700 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-[#9d512d] dark:text-[#f59c73] shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-500 dark:text-[#a99f91] block text-[10px] uppercase font-bold">સરનામું & જિલ્લો</span>
                  <span>{school.address || `${school.district} જિલ્લો, ગુજરાત`}</span>
                  {school.pincode && <span className="font-mono ml-1">({school.pincode})</span>}
                </div>
              </div>

              <div className="flex items-start gap-2 text-stone-700 dark:text-slate-300">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-500 dark:text-[#a99f91] block text-[10px] uppercase font-bold">આચાર્યશ્રી</span>
                  <span className="font-bold text-stone-900 dark:text-[#e4ded6]">{school.principalName || 'નોંધાયેલ નથી'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-stone-700 dark:text-slate-300">
                <Phone className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-500 dark:text-[#a99f91] block text-[10px] uppercase font-bold">સંપર્ક / મોબાઈલ</span>
                  {school.contactPhone || school.principalPhone || (school as any).contactNumber ? (
                    <span className="font-mono text-[#e4ded6] font-semibold">
                      {school.contactPhone || school.principalPhone || (school as any).contactNumber}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate('profile')}
                      className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5 font-medium hover:underline cursor-pointer group"
                      title="શાળા પ્રોફાઇલમાં સંપર્ક નંબર ઉમેરો"
                    >
                      <span className="text-slate-400">ઉપલબ્ધ નથી</span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold group-hover:bg-emerald-500/30">
                        + ઉમેરો
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#a99f91] block text-[10px] uppercase font-bold">સત્તાવાર ઈમેલ</span>
                  {school.contactEmail || (school as any).email ? (
                    <span className="font-mono text-[#e4ded6] font-semibold truncate block max-w-[200px]">
                      {school.contactEmail || (school as any).email}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigate('profile')}
                      className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1.5 font-medium hover:underline cursor-pointer group"
                      title="શાળા પ્રોફાઇલમાં ઈમેલ ઉમેરો"
                    >
                      <span className="text-slate-400">ઉપલબ્ધ નથી</span>
                      <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full font-bold group-hover:bg-purple-500/30">
                        + ઉમેરો
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-300">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#a99f91] block text-[10px] uppercase font-bold">શિક્ષણ માધ્યમ & બોર્ડ</span>
                  <span className="font-bold">ગુજરાતી માધ્યમ • GSEB</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-[#f59c73] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#a99f91] block text-[10px] uppercase font-bold">શૈક્ષણિક વર્ષ</span>
                  <span className="font-bold text-[#f59c73] font-mono">૨૦૨૬–૨૭</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Button for School Profile */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={() => onNavigate('profile')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl glass-card hover:border-[#9d512d]/60 text-xs font-bold text-[#e4ded6] hover:text-white transition-all cursor-pointer shadow"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#f59c73]" />
              <span>પ્રોફાઇલ સંપાદન</span>
            </button>
            <div className="glass-card px-3.5 py-2 rounded-2xl flex items-center gap-2.5 border border-white/10 hidden sm:flex">
              <VidyalayamLogo size={28} />
              <div>
                <span className="text-[10px] uppercase text-[#a99f91] block font-semibold">સિસ્ટમ</span>
                <span className="text-xs font-bold text-[#f59c73]">Vidyalayam v2.5</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            UNIVERSAL STUDENT SEARCH (યુનિવર્સલ વિદ્યાર્થી શોધ)
            Placed under profile info and above/around vidyarthi sankhya
            ========================================================================= */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <UniversalStudentSearch
            students={students}
            school={school}
            onNavigate={onNavigate}
            onStudentUpdated={onStudentUpdated}
          />
        </div>

        {/* =========================================================================
            DETAILED STATISTICAL STRIP (વિદ્યાર્થી સંખ્યા, સ્ટાફ સંખ્યા વગેરે)
            ========================================================================= */}
        <div className="mt-5 pt-5 sm:mt-6 sm:pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: વિદ્યાર્થી સંખ્યા */}
          <div className="glass-card rounded-2xl border border-white/10 p-4 shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#a99f91] uppercase tracking-wider">
                  વિદ્યાર્થી સંખ્યા
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#e4ded6] font-mono">{students.length}</span>
                <span className="text-xs text-[#a99f91] font-semibold">કુલ વિદ્યાર્થીઓ</span>
              </div>

              {/* Standard breakdown */}
              <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[10px] font-mono">
                <div className="p-1 rounded bg-white/5">
                  <div className="text-[#a99f91]">ધો.૯</div>
                  <div className="font-bold text-[#e4ded6]">{std9Count}</div>
                </div>
                <div className="p-1 rounded bg-white/5">
                  <div className="text-[#a99f91]">ધો.૧૦</div>
                  <div className="font-bold text-[#e4ded6]">{std10Count}</div>
                </div>
                <div className="p-1 rounded bg-white/5">
                  <div className="text-[#a99f91]">ધો.૧૧</div>
                  <div className="font-bold text-[#e4ded6]">{std11Count}</div>
                </div>
                <div className="p-1 rounded bg-white/5">
                  <div className="text-[#a99f91]">ધો.૧૨</div>
                  <div className="font-bold text-[#e4ded6]">{std12Count}</div>
                </div>
              </div>

              {/* Gender ratio */}
              <div className="mt-2 text-[11px] text-slate-300 flex items-center justify-between px-1">
                <span>કુમાર: <strong className="text-blue-400">{boysCount}</strong></span>
                <span>કન્યા: <strong className="text-rose-400">{girlsCount}</strong></span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('students')}
              className="mt-3 pt-2 border-t border-white/5 text-xs text-[#f59c73] hover:underline font-bold flex items-center justify-between cursor-pointer"
            >
              <span>વિદ્યાર્થીઓ જુઓ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: સ્ટાફ સંખ્યા */}
          <div className="glass-card rounded-2xl border border-white/10 p-4 shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#a99f91] uppercase tracking-wider">
                  સ્ટાફ સંખ્યા
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#e4ded6] font-mono">{staffList.length}</span>
                <span className="text-xs text-[#a99f91] font-semibold">કુલ સ્ટાફ</span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-1.5 rounded bg-white/5">
                  <span className="text-[#a99f91]">શૈક્ષણિક સ્ટાફ (શિક્ષકો):</span>
                  <span className="font-bold font-mono text-[#e4ded6]">{teachingStaffCount}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-white/5">
                  <span className="text-[#a99f91]">બિન-શૈક્ષણિક સ્ટાફ:</span>
                  <span className="font-bold font-mono text-[#e4ded6]">{nonTeachingStaffCount}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('staff')}
              className="mt-3 pt-2 border-t border-white/5 text-xs text-[#f59c73] hover:underline font-bold flex items-center justify-between cursor-pointer"
            >
              <span>સ્ટાફ મેનેજર ખોલો</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: પરીક્ષાઓ અને ગુણ */}
          <div className="glass-card rounded-2xl border border-white/10 p-4 shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#a99f91] uppercase tracking-wider">
                  પરીક્ષા & ગુણ સ્થિતિ
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#e4ded6] font-mono">{marks.length}</span>
                <span className="text-xs text-[#a99f91] font-semibold">કુલ ગુણ રેકોર્ડ્સ</span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-1.5 rounded bg-emerald-500/10 text-emerald-300">
                  <span>એકમ કસોટી – ૧:</span>
                  <span className="font-bold font-mono">{ekamKasotiCount}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-blue-500/10 text-blue-300">
                  <span>સત્રાંત / વાર્ષિક:</span>
                  <span className="font-bold font-mono">{termExamsCount}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('exams')}
              className="mt-3 pt-2 border-t border-white/5 text-xs text-[#f59c73] hover:underline font-bold flex items-center justify-between cursor-pointer"
            >
              <span>પરીક્ષાઓ કેન્દ્ર ખોલો</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: પરિણામ અને સુરક્ષા */}
          <div className="glass-card rounded-2xl border border-white/10 p-4 shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#a99f91] uppercase tracking-wider">
                  પરિણામ & સુરક્ષા
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2 text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>GSEB Excel Source of Truth</span>
              </div>

              <div className="mt-2 text-xs text-slate-300 leading-relaxed">
                સિદ્ધિ ગુણ (<span className="text-[#f59c73] font-bold">#</span>) અને કૃપા ગુણ (<span className="text-amber-400 font-bold">*</span>) ની ગણતરી સાથે વાર્ષિક પરિણામ તૈયાર.
              </div>

              <div className="mt-2 text-[11px] text-teal-300 flex items-center gap-1">
                <span>Cloud Firestore: ૧૦૦% આઇસોલેટેડ</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('results')}
              className="mt-3 pt-2 border-t border-white/5 text-xs text-[#f59c73] hover:underline font-bold flex items-center justify-between cursor-pointer"
            >
              <span>પરિણામ પત્રક જુઓ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MODULES SECTION: બધા મોડ્યુલ્સ (All School Modules)
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#e4ded6] tracking-tight">
              શાળા વ્યવસ્થાપન મોડ્યુલ્સ (School Modules)
            </h2>
            <p className="text-xs text-[#a99f91] mt-0.5">
              તમામ દૈનિક અને શૈક્ષણિક કામગીરી માટે સુવ્યવસ્થિત મોડ્યુલ્સ
            </p>
          </div>
          <span className="text-xs font-semibold text-[#f59c73] hidden sm:inline">
            Created by NR Chad
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {modules.map((mod) => (
            <div
              key={mod.id}
              onClick={() => onNavigate(mod.id)}
              className={`glass-panel rounded-3xl border border-white/10 p-5 shadow-lg flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 ${mod.color}`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    {mod.icon}
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#f59c73]">
                    {mod.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#e4ded6] mb-1.5">
                  {mod.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {mod.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-[#f59c73]">
                <span>{mod.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
