import React from 'react';
import {
  HardDrive,
  X,
  Building2,
  Users,
  Award,
  BookOpen,
  GraduationCap,
  FileText,
  UserCheck,
  CheckCircle2,
  Database,
  BarChart3,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { SchoolStorageData } from '../types';

interface AdminSchoolStorageModalProps {
  storageData: SchoolStorageData | null;
  onClose: () => void;
}

export const AdminSchoolStorageModal: React.FC<AdminSchoolStorageModalProps> = ({
  storageData,
  onClose,
}) => {
  if (!storageData) return null;

  const {
    schoolName,
    diseCode,
    district,
    status,
    totalBytes,
    formattedStorage,
    totalDocs,
    percentageOfTotal,
    breakdown,
  } = storageData;

  const categories = [
    {
      title: 'વિદ્યાર્થી પ્રોફાઇલ & રજિસ્ટર (Students)',
      desc: 'નામ, GR નંબર, જન્મ તારીખ, વાલી માહિતી',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
      barColor: 'bg-blue-500',
      item: breakdown.students,
    },
    {
      title: 'પરીક્ષા ગુણ & મૂલ્યાંકન પત્રક (Marks)',
      desc: 'એકમ કસોટી, વાર્ષિક પરીક્ષા અને વિદ્યાર્થી ગુણ રેકોર્ડ્સ',
      icon: BarChart3,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
      barColor: 'bg-emerald-500',
      item: breakdown.marks,
    },
    {
      title: 'ઓનલાઇન પ્રશ્નપત્રો & ક્વિઝ (Exams & Questions)',
      desc: `${breakdown.exams.questionsCount || 0} પ્રશ્નો સાથે ઓનલાઇન ક્વિઝ બેંક`,
      icon: FileText,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
      barColor: 'bg-purple-500',
      item: breakdown.exams,
    },
    {
      title: 'શિક્ષકો & સ્ટાફ યાદી (Staff & Faculty)',
      desc: 'શાળાના શિક્ષકો, હોદ્દા અને સંપર્ક વિગતો',
      icon: UserCheck,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
      barColor: 'bg-amber-500',
      item: breakdown.staff,
    },
    {
      title: 'વિદ્યાર્થી પરીક્ષા પરિણામો (Exam Attempts)',
      desc: 'ઓનલાઇન ટેસ્ટ સબમિશન અને આપેલા જવાબો',
      icon: Layers,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900',
      barColor: 'bg-indigo-500',
      item: breakdown.examAttempts,
    },
    {
      title: 'પ્રમાણપત્રો & હોલટિકિટ્સ (Certificates)',
      desc: 'જનરેટ કરેલા ડિજિટલ સર્ટિફિકેટ્સ અને હોલટિકિટ્સ',
      icon: Award,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
      barColor: 'bg-rose-500',
      item: breakdown.certificates,
    },
    {
      title: 'શાળા વિષયો & પરિમાણો (Subjects)',
      desc: 'ધોરણ મુજબ રૂપરેખા અને વિષય માળખું',
      icon: BookOpen,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900',
      barColor: 'bg-sky-500',
      item: breakdown.subjects,
    },
    {
      title: 'શાળા મુખ્ય પ્રોફાઇલ & સેટિંગ્સ (Root Profile)',
      desc: 'શાળા નામ, DISE કોડ, લોગો, સરનામું અને સેટિંગ્સ',
      icon: Building2,
      color: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      barColor: 'bg-slate-500',
      item: {
        count: 1,
        bytes: breakdown.profile.bytes,
        formatted: breakdown.profile.formatted,
      },
    },
  ];

  return (
    <div
      id="modal-school-storage"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 dark:bg-black/85 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto my-auto text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/70 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {schoolName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700">
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <span>DISE: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{diseCode}</strong></span>
                <span>•</span>
                <span>જિલ્લો: <strong>{district}</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
              <span>કુલ સર્વર સ્ટોરેજ</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {formattedStorage}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {totalBytes.toLocaleString()} Bytes
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              <span>કુલ દસ્તાવેજો (Docs)</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {totalDocs.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              સર્વર રેકોર્ડ્સ સંગ્રહિત
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
              <span>સર્વર શેર હિસ્સો</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
              {percentageOfTotal}%
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              સમગ્ર સર્વર ડેટામાંથી
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#9d512d]" />
              <span>ડેટાબેઝ સબ-કલેક્શન મુજબ વિગત (Subcollection Breakdown)</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              Google Cloud Firestore
            </span>
          </div>

          <div className="space-y-2">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              const pct = totalBytes > 0 ? Math.round((cat.item.bytes / totalBytes) * 100) : 0;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all ${cat.bgColor}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg bg-white dark:bg-slate-800 ${cat.color} shrink-0 shadow-xs`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {cat.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {cat.desc}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white font-mono">
                        {cat.item.formatted}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {cat.item.count} રેકોર્ડ્સ ({pct}%)
                      </div>
                    </div>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${cat.barColor}`}
                      style={{ width: `${Math.max(pct, cat.item.bytes > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notice Info Box */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">સર્વર સ્ટોરેજ સુરક્ષા અને માપદંડ:</span>
            <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
              આ સ્ટોરેજ ગૂગલ ફાયરસ્ટોર ડેટાબેઝના દસ્તાવેજો, ફીલ્ડ્સ, વિદ્યાર્થી પરિણામો, વિષયો અને ઓનલાઇન પરીક્ષાઓના વાસ્તવિક બાઈટ્સ પરથી ગણવામાં આવ્યો છે. શાળા કોઈ વધારાનો અનિચ્છનીય ડેટા વાપરતી નથી.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            બંધ કરો (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
