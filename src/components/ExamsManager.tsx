import React, { useState } from 'react';
import { School, Student, MarkRecord, AllowedStandard } from '../types';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';
import { MarksManager } from './MarksManager';
import { TermExamMarksManager } from './TermExamMarksManager';

interface ExamsManagerProps {
  school: School;
  students: Student[];
  marks: MarkRecord[];
  onBack: () => void;
  onRefresh?: () => void;
  onNavigateToResults?: () => void;
  initialSubView?: 'overview' | 'ekam_kasoti' | 'term_exams';
}

interface ExamCard {
  id: string;
  subViewTarget: 'ekam_kasoti' | 'term_exams';
  titleGujarati: string;
  titleEnglish: string;
  maxMarks: number;
  weightage: string;
  description: string;
  term: string;
  badgeColor: string;
}

export const ExamsManager: React.FC<ExamsManagerProps> = ({
  school,
  students,
  marks,
  onBack,
  onRefresh = () => {},
  onNavigateToResults,
  initialSubView = 'overview',
}) => {
  const [subView, setSubView] = useState<'overview' | 'ekam_kasoti' | 'term_exams'>(initialSubView);
  const [selectedStandard, setSelectedStandard] = useState<AllowedStandard>('9');

  const EXAMS: ExamCard[] = [
    {
      id: 'ekam_kasoti_1',
      subViewTarget: 'ekam_kasoti',
      titleGujarati: 'એકમ કસોટી – ૧',
      titleEnglish: 'Unit Test - 1 (Ekam Kasoti)',
      maxMarks: 25,
      weightage: 'નિયમિત મૂલ્યાંકન',
      description: 'પ્રશ્નવાર ગુણ, કસ્ટમ વિષયો, GSEB ફોર્મેટ અને A4 સત્તાવાર ગુણપત્રક પ્રિન્ટ.',
      term: 'પ્રથમ સત્ર (First Term)',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'pratham_pariksha',
      subViewTarget: 'term_exams',
      titleGujarati: 'પ્રથમ સત્રાંત પરીક્ષા',
      titleEnglish: 'First Terminal Examination',
      maxMarks: 50,
      weightage: '૧૦% ગુણભાર (વાર્ષિક)',
      description: 'પ્રથમ સત્રની સંપૂર્ણ સત્રાંત પરીક્ષા, તમામ વિષયોના ૫૦ ગુણમાંથી ગુણાંકન.',
      term: 'પ્રથમ સત્ર (ઓક્ટોબર/નવેમ્બર)',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    {
      id: 'dwitiya_pariksha',
      subViewTarget: 'term_exams',
      titleGujarati: 'દ્વિતીય સત્રાંત પરીક્ષા / પ્રિલિમ',
      titleEnglish: 'Second Terminal / Prelim Exam',
      maxMarks: 50,
      weightage: '૧૦% ગુણભાર (વાર્ષિક)',
      description: 'દ્વિતીય સત્રાંત કસોટી અને બોર્ડ ધોરણો માટે પ્રિલિમિનરી પરીક્ષા.',
      term: 'દ્વિતીય સત્ર (જાન્યુઆરી/ફેબ્રુઆરી)',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    {
      id: 'varshik_pariksha',
      subViewTarget: 'term_exams',
      titleGujarati: 'વાર્ષિક પરીક્ષા',
      titleEnglish: 'Annual Examination',
      maxMarks: 80,
      weightage: '૬૦% ગુણભાર + ૨૦% આંતરિક = ૧૦૦',
      description: 'વાર્ષિક પરિણામ તૈયાર કરવા માટેની આખરી પરીક્ષા (ધોરણ ૯ અને ૧૧ માટે GSEB પદ્ધતિ).',
      term: 'વાર્ષિક સત્ર (માર્ચ/એપ્રિલ)',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    },
  ];

  // Count marks entered for this school
  const ekamKasotiMarksCount = marks.filter((m) => m.examType.includes('એકમ કસોટી')).length;
  const termMarksCount = marks.filter((m) => !m.examType.includes('એકમ કસોટી')).length;

  const handleBack = () => {
    if (subView !== 'overview') {
      setSubView('overview');
    } else {
      onBack();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl glass-card text-xs font-bold text-[#e4ded6] hover:text-white transition-colors cursor-pointer active:scale-95"
          title={subView !== 'overview' ? 'પરીક્ષાઓની ઝાંખી પર પાછા જાઓ' : 'પાછળના મેનુ પર જાઓ'}
        >
          <ArrowLeft className="w-4 h-4 text-[#f59c73]" />
          <span>{subView !== 'overview' ? 'પરીક્ષાઓની ઝાંખી પર પાછા જાઓ' : 'પાછળ જાઓ (Go Back)'}</span>
        </button>

        {/* Sub-view switcher tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg text-xs">
          <button
            onClick={() => setSubView('overview')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              subView === 'overview'
                ? 'bg-[#9d512d] text-white shadow-md'
                : 'text-[#a99f91] hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>પરીક્ષાઓની ઝાંખી (Overview)</span>
          </button>

          <button
            onClick={() => setSubView('ekam_kasoti')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              subView === 'ekam_kasoti'
                ? 'bg-[#9d512d] text-white shadow-md'
                : 'text-[#a99f91] hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>એકમ કસોટી – ૧ (૨૫ ગુણ)</span>
          </button>

          <button
            onClick={() => setSubView('term_exams')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              subView === 'term_exams'
                ? 'bg-[#9d512d] text-white shadow-md'
                : 'text-[#a99f91] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>સત્રાંત / વાર્ષિક પરીક્ષાઓ</span>
          </button>
        </div>

        {onNavigateToResults && (
          <button
            onClick={onNavigateToResults}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>વાર્ષિક પરિણામ જુઓ (Results)</span>
          </button>
        )}
      </div>

      {/* SUB-VIEW 1: OVERVIEW & EXAM CARDS */}
      {subView === 'overview' && (
        <div className="space-y-6">
          {/* Hero Banner */}
          <div className="glass-panel rounded-3xl border border-white/10 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#9d512d]/25 text-[#f59c73] border border-[#9d512d]/40 mb-2">
                  <Award className="w-3.5 h-3.5" />
                  <span>પરીક્ષા & મૂલ્યાંકન સંચાલન (GSEB Standard)</span>
                </div>
                <h2 className="text-2xl font-black text-[#e4ded6] tracking-tight">
                  શાળા પરીક્ષાઓ અને એકમ કસોટી કેન્દ્ર
                </h2>
                <p className="text-xs text-[#a99f91] mt-1">
                  શૈક્ષણિક વર્ષ ૨૦૨૬–૨૭ • એકમ કસોટી (૨૫ ગુણ), પ્રથમ સત્રાંત (૫૦ ગુણ), દ્વિતીય સત્રાંત (૫૦ ગુણ) અને વાર્ષિક (૮૦ ગુણ) ગુણ નોંધણી.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="glass-card border border-white/10 px-4 py-2 rounded-2xl text-center">
                  <div className="text-[10px] text-[#a99f91] font-bold">એકમ કસોટી રેકોર્ડ્સ</div>
                  <div className="text-lg font-black text-emerald-400">{ekamKasotiMarksCount}</div>
                </div>
                <div className="glass-card border border-white/10 px-4 py-2 rounded-2xl text-center">
                  <div className="text-[10px] text-[#a99f91] font-bold">સત્રાંત પરીક્ષા એન્ટ્રી</div>
                  <div className="text-lg font-black text-blue-400">{termMarksCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Official GSEB Exam Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {EXAMS.map((exam) => {
              const isEkam = exam.id === 'ekam_kasoti_1';

              return (
                <div
                  key={exam.id}
                  className="glass-card rounded-3xl border border-white/10 p-6 shadow-xl flex flex-col justify-between hover:border-white/20 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${exam.badgeColor}`}>
                          {exam.term}
                        </span>
                        <h3 className="text-lg font-black text-[#e4ded6] mt-2">
                          {exam.titleGujarati}
                        </h3>
                        <div className="text-xs text-[#a99f91] font-medium">
                          {exam.titleEnglish}
                        </div>
                      </div>

                      <div className="glass-card px-3 py-1.5 rounded-xl text-center shrink-0 border border-white/10">
                        <div className="text-[10px] uppercase text-[#a99f91] font-semibold">કુલ ગુણ</div>
                        <div className="text-base font-black text-[#f59c73]">{exam.maxMarks}</div>
                      </div>
                    </div>

                    <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                      <span className="text-[#f59c73]">ગુણભાર:</span> {exam.weightage}
                    </div>

                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {exam.description}
                    </p>

                    {isEkam && (
                      <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                        <span>નોંધાયેલ એકમ કસોટી રેકોર્ડ્સ:</span>
                        <strong className="font-mono text-sm">{ekamKasotiMarksCount}</strong>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-[#a99f91]">
                      ધોરણ ૯ થી ૧૨
                    </span>

                    <button
                      onClick={() => setSubView(exam.subViewTarget)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow transition-all cursor-pointer ${
                        isEkam
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : 'bg-[#9d512d] hover:bg-[#b55e34]'
                      }`}
                    >
                      <span>ગુણ દાખલ કરો (Enter Marks)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: EKAM KASOTI - 1 (25 MARKS QUESTION-WISE) */}
      {subView === 'ekam_kasoti' && (
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>એકમ કસોટી – ૧ (Unit Test - 25 Marks) • પ્રશ્નવાર ગુણાંકન પત્રક</span>
            </div>
            <button
              onClick={() => setSubView('overview')}
              className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
            >
              ← પરીક્ષાઓની ઝાંખી પર પાછા જાઓ
            </button>
          </div>

          <MarksManager
            school={school}
            students={students}
            marks={marks}
            onRefresh={onRefresh}
            defaultSystem="ekam_kasoti"
          />
        </div>
      )}

      {/* SUB-VIEW 3: TERM & ANNUAL EXAMS (50/50/80/20 MARKS) */}
      {subView === 'term_exams' && (
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-300 font-bold">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>સત્રાંત અને વાર્ષિક પરીક્ષાઓ (Pratham 50, Dwitiya 50, Varshik 80, Internal 20)</span>
            </div>
            <button
              onClick={() => setSubView('overview')}
              className="text-xs font-bold text-blue-400 hover:underline cursor-pointer"
            >
              ← પરીક્ષાઓની ઝાંખી પર પાછા જાઓ
            </button>
          </div>

          <TermExamMarksManager
            school={school}
            students={students}
            marks={marks}
            onRefresh={onRefresh}
            defaultStandard={selectedStandard}
          />
        </div>
      )}
    </div>
  );
};
