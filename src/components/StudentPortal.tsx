import React, { useState, useEffect } from 'react';
import {
  User,
  BookOpen,
  Award,
  Calendar,
  Clock,
  LogOut,
  FileText,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Layers,
  HelpCircle,
  Phone,
  MapPin,
  Heart,
  FileCheck,
  RefreshCw,
  ExternalLink,
  History,
} from 'lucide-react';
import { StudentSession, OnlineExam, MarkRecord } from '../types';
import {
  fetchStudentExams,
  fetchStudentMarks,
  getServerTime,
  clearStudentSession,
} from '../services/onlineExamService';
import { StudentExamScreen } from './StudentExamScreen';
import { calculateClassResults } from '../utils/resultFormulaUtils';

interface StudentPortalProps {
  session: StudentSession;
  onLogout: () => void;
}

type StudentTab = 'upcoming_exams' | 'marks' | 'result' | 'idcard' | 'profile' | 'history';

export const StudentPortal: React.FC<StudentPortalProps> = ({ session, onLogout }) => {
  const [activeTab, setActiveTab] = useState<StudentTab>('upcoming_exams');
  const [exams, setExams] = useState<any[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverTime, setServerTime] = useState<number>(Date.now());
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  const student = session.student;
  const school = session.school || {
    id: session.schoolId || '',
    schoolName: session.schoolName || 'શાળા પોર્ટલ',
    diseCode: session.diseCode || '',
    logoUrl: session.schoolLogo || '',
  };

  // Load Exams and Marks
  const loadPortalData = async () => {
    setLoading(true);
    try {
      const [examData, marksData, time] = await Promise.all([
        fetchStudentExams(session.sessionToken).catch(() => ({ exams: [] })),
        fetchStudentMarks(session.sessionToken).catch(() => ({ marks: [] })),
        getServerTime().catch(() => Date.now()),
      ]);

      setExams(examData.exams || []);
      setMarks(marksData.marks || []);
      setServerTime(time);
    } catch (e) {
      console.error('Error loading student data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();

    const interval = setInterval(() => {
      setServerTime((prev) => prev + 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Compute calculated GSEB result for this student using the official calculation engine
  const calculatedResult = React.useMemo(() => {
    if (!student || marks.length === 0) return null;
    try {
      const allRes = calculateClassResults([student], marks, student.standard as any);
      return allRes.find((r) => r.student.id === student.id) || null;
    } catch (e) {
      console.error('Error calculating student result:', e);
      return null;
    }
  }, [student, marks]);

  // Handle Logout
  const handleSignOut = () => {
    clearStudentSession();
    onLogout();
  };

  // If inside an active exam screen, render StudentExamScreen
  if (activeExamId) {
    return (
      <StudentExamScreen
        session={session}
        examId={activeExamId}
        onExit={() => {
          setActiveExamId(null);
          loadPortalData();
        }}
      />
    );
  }

  // Filter Upcoming / Live exams vs History exams (all exams without arbitrary type separation)
  const upcomingExams = exams
    .filter((e) => !e.attempt || e.attempt.status !== 'submitted')
    .sort((a, b) => {
      const aIsScheduled = a.scheduledStartTimestamp && serverTime < a.scheduledStartTimestamp;
      const bIsScheduled = b.scheduledStartTimestamp && serverTime < b.scheduledStartTimestamp;
      if (!aIsScheduled && bIsScheduled) return -1;
      if (aIsScheduled && !bIsScheduled) return 1;
      return (a.scheduledStartTimestamp || 0) - (b.scheduledStartTimestamp || 0);
    });
  const historyExams = exams.filter((e) => e.attempt && e.attempt.status === 'submitted');

  // Format countdown string
  const getCountdownLabel = (startTimestamp: number) => {
    const diff = startTimestamp - serverTime;
    if (diff <= 0) return 'શરૂ થઈ ગઈ છે';
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (days > 0) return `પરીક્ષા શરૂ થવામાં ${days} દિવસ બાકી છે`;
    if (hrs > 0) return `પરીક્ષા શરૂ થવામાં ${hrs} કલાક ${mins % 60} મિનિટ બાકી છે`;
    return `પરીક્ષા શરૂ થવામાં ${mins} મિનિટ બાકી છે`;
  };

  return (
    <div className="min-h-screen bg-[#090c10] text-[#e4ded6] font-['Anek_Gujarati']">
      {/* Top Glassmorphic Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#121921]/90 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Brand & School info with School Logo */}
          <div className="flex items-center gap-3">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={school.schoolName}
                className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1 border border-white/10 shadow-md shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-md shrink-0">
                🎓
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  {school.schoolName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  DISE: {school.diseCode}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                વિદ્યાર્થી પોર્ટલ (Student Portal)
              </div>
            </div>
          </div>

          {/* Student Profile snippet & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-white">{student.studentName}</div>
              <div className="text-[11px] text-slate-400">
                ધોરણ: {student.standard} {student.section ? `(${student.section})` : ''} • રોલ: {student.rollNumber || '-'} • GR: {student.grNumber || '-'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">લૉગ આઉટ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Glass Student Card with Photo Support */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900/90 via-[#141d24] to-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.studentName}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-lg shadow-emerald-950/40 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg border border-white/20 shrink-0">
                {student.studentName.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                નમસ્તે, {student.studentName} 👋
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-semibold">
                  ધોરણ {student.standard} {student.section ? `(${student.section})` : ''}
                </span>
                <span>G.R. નં: <strong className="text-white">{student.grNumber || '-'}</strong></span>
                <span>•</span>
                <span>રોલ નં: <strong className="text-white">{student.rollNumber || '-'}</strong></span>
                <span>•</span>
                <span>જન્મ તારીખ: <strong className="text-white">{student.dob || '-'}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('idcard')}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              મારું ID Card
            </button>
            <button
              onClick={() => setActiveTab('result')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow cursor-pointer"
            >
              <Award className="w-4 h-4" />
              પ્રગતિપત્રક (Result)
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Direct Upcoming Exams, No Exam Type Tabs) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'upcoming_exams', label: '📝 આગામી પરીક્ષાઓ (Upcoming Exams)', count: upcomingExams.length },
            { id: 'marks', label: '📊 મારા ગુણ (My Marks)' },
            { id: 'result', label: '📄 પ્રગતિપત્રક (My Result)' },
            { id: 'idcard', label: '🪪 ID Card' },
            { id: 'profile', label: '👤 પ્રોફાઇલ (Profile)' },
            { id: 'history', label: '📜 પરીક્ષા ઇતિહાસ (History)', count: historyExams.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as StudentTab)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/40'
                    : 'bg-[#121921] border border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Pane */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <span>તમારી વિગતો લોડ થઈ રહી છે...</span>
          </div>
        ) : activeTab === 'upcoming_exams' ? (
          /* Upcoming & Live Exams List View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  આગામી અને ચાલુ પરીક્ષાઓ (Upcoming & Live Exams)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  તમારા ધોરણ {student.standard} માટે નિર્ધારિત પરીક્ષાઓ
                </p>
              </div>
              <button
                type="button"
                onClick={loadPortalData}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> રિફ્રેશ કરો
              </button>
            </div>

            {upcomingExams.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[#121921] border border-white/10 space-y-3">
                <BookOpen className="w-12 h-12 mx-auto text-emerald-500 opacity-60" />
                <div className="font-bold text-base text-white">હાલમાં કોઈ આગામી પરીક્ષા બાકી નથી</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  તમારી બધી પરીક્ષાઓ પૂર્ણ થઈ ચૂકી છે અથવા તમારી શાળા દ્વારા નવી પરીક્ષાનું આયોજન કરવામાં આવશે ત્યારે તે અહીં સીધી દર્શાવાશે.
                </p>
                {historyExams.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <History className="w-4 h-4 text-purple-400" />
                      પૂર્ણ કરેલ પરીક્ષાઓનો ઇતિહાસ જુઓ ({historyExams.length})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingExams.map((ex) => {
                  const attempt = ex.attempt;
                  const hasSubmitted = attempt && attempt.status === 'submitted';
                  const isScheduled =
                    ex.scheduledStartTimestamp && serverTime < ex.scheduledStartTimestamp;
                  const isLive = !isScheduled && !hasSubmitted;

                  return (
                    <div
                      key={ex.id}
                      className={`p-5 rounded-3xl bg-[#121921] border transition-all flex flex-col justify-between space-y-4 shadow-lg ${
                        isLive
                          ? 'border-emerald-500/50 shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div>
                        {/* Header: Subject & Status */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white/10 text-slate-200">
                            {ex.subject} • ધોરણ {ex.standard}
                          </span>

                          {isLive ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              પરીક્ષા ચાલુ છે (Live Now)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              આગામી (Upcoming)
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-sm sm:text-base text-white mb-2">
                          {ex.title}
                        </h4>

                        {/* Exam Details */}
                        <div className="space-y-1.5 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>તારીખ: <strong className="text-slate-200">{ex.scheduledDate}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>સમય: <strong className="text-slate-200">{ex.scheduledStartTime}</strong> ({ex.durationMinutes} મિનિટ)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="w-3.5 h-3.5 text-slate-500" />
                            <span>કુલ ગુણ: <strong className="text-emerald-400">{ex.totalMarks}</strong> • પ્રશ્નો: {ex.questionsCount}</span>
                          </div>
                        </div>

                        {/* Countdown if scheduled */}
                        {isScheduled && ex.scheduledStartTimestamp && (
                          <div className="mt-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                            <span>{getCountdownLabel(ex.scheduledStartTimestamp)}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div>
                        {isLive ? (
                          <button
                            type="button"
                            onClick={() => setActiveExamId(ex.id)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                          >
                            <span>પરીક્ષા આપો (Start Exam)</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-500 text-xs font-semibold cursor-not-allowed"
                          >
                            નિયત સમયે શરૂ થશે ({ex.scheduledStartTime})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'marks' ? (
          /* My Marks View */
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">મારા પરીક્ષા ગુણ (My Subject Marks)</h3>
            {marks.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[#121921] border border-white/10 space-y-2">
                <Award className="w-10 h-10 mx-auto text-slate-500 opacity-40" />
                <div className="font-bold text-sm text-white">ગુણ હજુ ઉપલબ્ધ નથી</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  ગુણ હજુ શાળા દ્વારા ઉપલબ્ધ કરાવવામાં આવ્યા નથી. વર્ગશિક્ષક દ્વારા ગુણ એન્ટ્રી થયા બાદ અહીં દેખાશે.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {marks.map((rec) => (
                  <div key={rec.id} className="p-5 rounded-3xl bg-[#121921] border border-white/10 shadow-lg space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                      <span className="font-bold text-white text-sm">
                        {rec.examType === 'first_term'
                          ? 'પ્રથમ સત્ર પરીક્ષા (First Term)'
                          : rec.examType === 'second_term'
                          ? 'દ્વિતીય સત્ર પરીક્ષા (Second Term)'
                          : rec.examType === 'annual'
                          ? 'વાર્ષિક પરીક્ષા (Annual Exam)'
                          : 'એકમ કસોટી (Ekam Kasoti)'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold">
                        કુલ: {rec.totalObtained} / {rec.totalMax}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                      {rec.subjects?.map((sub, sIdx) => (
                        <div key={sIdx} className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                          <div className="text-slate-400 text-[11px] truncate">{sub.subjectName}</div>
                          <div className="font-bold text-white text-sm mt-0.5">
                            <span className="text-emerald-400">{sub.obtained}</span> / {sub.total}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'result' ? (
          /* My Progress Card / Result View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">વાર્ષિક પ્રગતિપત્રક (GSEB Progress Card)</h3>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                પ્રિન્ટ / PDF ડાઉનલોડ
              </button>
            </div>

            {calculatedResult ? (
              <div className="p-6 sm:p-8 rounded-3xl bg-[#121921] border border-white/10 shadow-2xl space-y-6 print:border-none print:shadow-none print:p-0">
                {/* School Header on mark sheet */}
                <div className="text-center pb-4 border-b border-white/10 space-y-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wide">
                    {school.schoolName}
                  </h2>
                  <p className="text-xs text-slate-400">
                    DISE કોડ: {school.diseCode} • જિલ્લો: {school.district || '-'}
                  </p>
                  <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mt-1">
                    વાર્ષિક પરિણામ પત્રક (Progress Card) • ધોરણ {student.standard}
                  </div>
                </div>

                {/* Student Info Box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-900 border border-white/10 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">વિદ્યાર્થીનું નામ:</span>
                    <strong className="text-white">{student.studentName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">G.R. નંબર:</span>
                    <strong className="text-white">{student.grNumber || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">રોલ નંબર:</span>
                    <strong className="text-white">{student.rollNumber || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">જન્મ તારીખ:</span>
                    <strong className="text-white">{student.dob || '-'}</strong>
                  </div>
                </div>

                {/* Subjects Table */}
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-white/10 text-[11px]">
                        <th className="p-3">વિષય</th>
                        <th className="p-3 text-center">પ્રથમ સત્ર (50)</th>
                        <th className="p-3 text-center">દ્વિતીય સત્ર (50)</th>
                        <th className="p-3 text-center">વાર્ષિક (100)</th>
                        <th className="p-3 text-center">ગ્રેડ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {calculatedResult.subjects.map((sub, sIdx) => (
                        <tr key={sIdx} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-semibold text-white">{sub.subjectName}</td>
                          <td className="p-3 text-center text-slate-300">{sub.firstTermConverted ?? '-'}</td>
                          <td className="p-3 text-center text-slate-300">{sub.secondTermConverted ?? '-'}</td>
                          <td className="p-3 text-center font-bold text-white">{sub.finalHundredMarks ?? '-'}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-white/10 text-emerald-300">
                              {sub.grade || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Final Result Status & Total */}
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-300">વાર્ષિક પરિણામ:</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {calculatedResult.resultStatus === 'PASS'
                        ? 'ઉત્તીર્ણ (PASS)'
                        : calculatedResult.resultStatus === 'PASS_WITH_SIDDHI'
                        ? 'સિદ્ધિ ગુણ સાથે ઉત્તીર્ણ (PASS WITH SIDDHI)'
                        : calculatedResult.resultStatus === 'PASS_WITH_KRUPA'
                        ? 'કૃપા ગુણ સાથે ઉત્તીર્ણ (PASS WITH KRUPA)'
                        : 'સુધારણા જરૂરી (NEEDS IMPROVEMENT)'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-300">કુલ ગુણ / ટકાવારી:</div>
                    <div className="text-lg font-bold text-white">
                      {calculatedResult.totalObtainedMarks} / {calculatedResult.totalMaxMarks} ({calculatedResult.overallPercentage}%)
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-[#121921] border border-white/10 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-500 opacity-40" />
                <div className="font-bold text-sm text-white">પરિણામ હજુ તૈયાર નથી</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  શાળા દ્વારા વાર્ષિક ગુણ નોંધાયા બાદ અહીં તમારું સત્તાવાર પરિણામ પત્રક જોવા મળશે.
                </p>
              </div>
            )}
          </div>
        ) : activeTab === 'idcard' ? (
          /* ID Card View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">મારું ઓળખપત્ર (Student ID Card)</h3>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                ID Card પ્રિન્ટ કરો
              </button>
            </div>

            <div className="flex justify-center p-4">
              {/* ID Card Box (Classic 86mm x 54mm portrait style) */}
              <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#141d24] to-[#0d1318] border-2 border-emerald-500/40 p-6 shadow-2xl space-y-4 relative overflow-hidden">
                {/* Header with School Name & Logo */}
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 -mx-6 -mt-6 p-3 border-b-2 border-emerald-500 flex items-center gap-2.5">
                  {school.logoUrl && (
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-transparent">
                      <img
                        src={school.logoUrl}
                        alt={school.schoolName}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <h4
                      className="font-black text-white uppercase tracking-wide leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{
                        fontSize:
                          school.schoolName.length > 45
                            ? '10.5px'
                            : school.schoolName.length > 30
                            ? '12px'
                            : school.schoolName.length > 20
                            ? '13.5px'
                            : '15px',
                        letterSpacing: school.schoolName.length > 35 ? '-0.2px' : '0.1px',
                      }}
                      title={school.schoolName}
                    >
                      {school.schoolName}
                    </h4>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[10px] text-emerald-300 font-medium truncate">
                        DISE: {school.diseCode} {school.district ? `• ${school.district}` : ''}
                      </p>
                      <span className="inline-block px-2 py-0.2 rounded text-[8.5px] font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wider shrink-0 whitespace-nowrap">
                        વિદ્યાર્થી ID Card
                      </span>
                    </div>
                  </div>
                </div>

                {/* Photo & Name */}
                <div className="space-y-2 pt-1 text-center">
                  <div className="w-24 h-24 rounded-2xl mx-auto overflow-hidden border-2 border-emerald-400/60 bg-slate-800 flex items-center justify-center shadow-lg">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt={student.studentName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black text-emerald-400">{student.studentName.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-base font-black text-white tracking-wide">{student.studentName}</div>
                    <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                      ધોરણ: {student.standard} {student.section ? `(${student.section})` : ''} • રોલ નં: {student.rollNumber || '-'}
                    </div>
                  </div>
                </div>

                {/* Details Table */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-left text-[11px] space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">G.R. નંબર:</span>
                    <strong className="text-amber-300 font-mono">{student.grNumber || '-'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">વિદ્યાર્થી DISE કોડ:</span>
                    <strong className="text-cyan-300 font-mono font-bold">
                      {student.diseCode || student.studentStateCode || student.studentId || '-'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">જન્મ તારીખ (DOB):</span>
                    <strong className="text-white font-mono">{student.dob || '-'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">બ્લડ ગ્રુપ:</span>
                    {student.bloodGroup ? (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-[10px]">
                        {student.bloodGroup}
                      </span>
                    ) : (
                      <strong className="text-white">-</strong>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">વાલીનો સંપર્ક:</span>
                    <strong className="text-emerald-400 font-mono">{student.contactNumber || '-'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">સરનામું:</span>
                    <strong className="text-slate-300 truncate max-w-[180px]">
                      {student.address || school.village || school.district || '-'}
                    </strong>
                  </div>
                </div>

                {/* Principal Signature Area */}
                <div className="pt-2 flex justify-between items-end text-[10px] text-slate-400 border-t border-white/5">
                  <div>વિદ્યાર્થી સહી</div>
                  <div className="font-bold text-white flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    આચાર્યશ્રી સહી & સિક્કો
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'profile' ? (
          /* Read-Only Profile View */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>સુરક્ષા નિયમ:</strong> આ પ્રોફાઇલ ફક્ત વાંચવા માટે છે. વિગતોમાં કોઈપણ ફેરફાર અથવા સુધારા માટે કૃપા કરીને તમારી શાળાના વર્ગશિક્ષક અથવા આચાર્યશ્રીનો સંપર્ક કરવો.
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#121921] border border-white/10 shadow-xl space-y-6">
              <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3">
                વિદ્યાર્થી વ્યક્તિગત વિગતો (Student Personal Details)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 text-[11px] block">પૂરું નામ:</span>
                  <strong className="text-white text-sm">{student.studentName}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 text-[11px] block">ધોરણ અને વર્ગ:</span>
                  <strong className="text-white text-sm">ધોરણ {student.standard} {student.section ? `(${student.section})` : ''}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 text-[11px] block">G.R. નંબર:</span>
                  <strong className="text-white text-sm">{student.grNumber || '-'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 text-[11px] block">રોલ નંબર:</span>
                  <strong className="text-white text-sm">{student.rollNumber || '-'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 text-[11px] block">જન્મ તારીખ (DOB):</span>
                  <strong className="text-white text-sm">{student.dob || '-'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 text-[11px] block">જાતિ (Gender):</span>
                  <strong className="text-white text-sm">{student.gender || '-'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 text-[11px] block">પિતાનું નામ:</span>
                  <strong className="text-white text-sm">{student.fatherName || '-'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 text-[11px] block">માતાનું નામ:</span>
                  <strong className="text-white text-sm">{student.motherName || '-'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 text-[11px] block">બ્લડ ગ્રુપ:</span>
                  <strong className="text-white text-sm">{student.bloodGroup || '-'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                  <span className="text-slate-400 text-[11px] block">મોબાઇલ / સંપર્ક:</span>
                  <strong className="text-white text-sm">{student.contactNumber || '-'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-white/5 sm:col-span-2">
                  <span className="text-slate-400 text-[11px] block">સરનામું:</span>
                  <strong className="text-white text-sm">{student.address || '-'}</strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Exam History View */
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">પરીક્ષા ઇતિહાસ (Exam Attempt History)</h3>
            {historyExams.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[#121921] border border-white/10 space-y-2">
                <FileCheck className="w-10 h-10 mx-auto text-slate-500 opacity-40" />
                <div className="font-bold text-sm text-white">હજુ કોઈ પરીક્ષા આપેલ નથી</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  તમે જે ઓનલાઇન પરીક્ષાઓ સબમિટ કરશો તેનો સંપૂર્ણ ઇતિહાસ અહીં સાચવવામાં આવશે.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyExams.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-4 rounded-2xl bg-[#121921] border border-white/10 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300">
                          {ex.subject}
                        </span>
                        <h4 className="font-bold text-sm text-white">{ex.title}</h4>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        તારીખ: {ex.scheduledDate} • સમયગાળો: {ex.durationMinutes} મિનિટ
                      </div>
                    </div>

                    <div className="text-right">
                      {ex.attempt?.score !== undefined ? (
                        <div className="font-bold text-emerald-400 text-sm">
                          {ex.attempt.score} / {ex.attempt.totalMarks} ({ex.attempt.percentage}%)
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">સબમિટ કરેલ</div>
                      )}
                      <span className="text-[10px] text-slate-500">
                        {ex.attempt?.submittedAt ? new Date(ex.attempt.submittedAt).toLocaleTimeString('gu-IN') : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
