import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Search,
  ChevronDown,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  X,
  HelpCircle,
  ArrowUpDown,
  Filter,
  Send,
  FileCheck2,
  FileText,
  FileQuestion,
  Printer,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { OnlineExam, MCQQuestion, ExamAttempt, Student, School } from '../types';
import { getExamQuestions, getExamAttempts } from '../services/onlineExamService';
import { SendExamResultModal } from './SendExamResultModal';
import { OnlineExamOmrModal } from './OnlineExamOmrModal';
import { OnlineExamQuestionPaperModal } from './OnlineExamQuestionPaperModal';

interface OnlineExamAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: OnlineExam;
  schoolId: string;
  allStudents: Student[];
  school?: School;
}

export const OnlineExamAnalyticsModal: React.FC<OnlineExamAnalyticsModalProps> = ({
  isOpen,
  onClose,
  exam,
  schoolId,
  allStudents,
  school,
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'questions'>('students');
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');
  const [sendResultModalOpen, setSendResultModalOpen] = useState(false);
  const [omrModalOpen, setOmrModalOpen] = useState(false);
  const [omrModalStudentId, setOmrModalStudentId] = useState<string>('ALL');
  const [omrModalMode, setOmrModalMode] = useState<'checked' | 'unchecked'>('checked');
  const [questionPaperModalOpen, setQuestionPaperModalOpen] = useState(false);
  const [questionPaperModalMode, setQuestionPaperModalMode] = useState<'without_answers' | 'with_answers'>('without_answers');
  const [showStatsMobile, setShowStatsMobile] = useState(false);

  useEffect(() => {
    if (isOpen && exam?.id) {
      loadData();
    }
  }, [isOpen, exam?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qs, ats] = await Promise.all([
        getExamQuestions(schoolId, exam.id),
        getExamAttempts(schoolId, exam.id),
      ]);
      setQuestions(qs);
      setAttempts(ats);
    } catch (err) {
      console.error('Error loading exam analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Eligible students in this standard
  const eligibleStudents = useMemo(() => {
    if (!exam.standard || exam.standard === 'all') return allStudents;
    return allStudents.filter((st) => String(st.standard) === String(exam.standard));
  }, [allStudents, exam.standard]);

  // Overall Metrics
  const stats = useMemo(() => {
    const totalEligible = eligibleStudents.length;
    const attemptedCount = attempts.length;
    const notAttemptedCount = Math.max(0, totalEligible - attemptedCount);

    if (attempts.length === 0) {
      return {
        totalEligible,
        attemptedCount: 0,
        notAttemptedCount,
        highestScore: 0,
        lowestScore: 0,
        avgScore: 0,
        avgPercentage: 0,
        passCount: 0,
        failCount: 0,
        passPct: 0,
      };
    }

    const scores = attempts.map((a) => a.score || 0);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const sumScore = scores.reduce((a, b) => a + b, 0);
    const avgScore = Math.round((sumScore / attempts.length) * 10) / 10;
    const avgPercentage =
      exam.totalMarks > 0 ? Math.round((avgScore / exam.totalMarks) * 1000) / 10 : 0;

    const passingMarks = exam.passingMarks || Math.ceil(exam.totalMarks * 0.35);
    const passCount = attempts.filter((a) => (a.score || 0) >= passingMarks).length;
    const failCount = attemptedCount - passCount;
    const passPct = Math.round((passCount / attemptedCount) * 1000) / 10;

    return {
      totalEligible,
      attemptedCount,
      notAttemptedCount,
      highestScore,
      lowestScore,
      avgScore,
      avgPercentage,
      passCount,
      failCount,
      passPct,
    };
  }, [eligibleStudents, attempts, exam.totalMarks, exam.passingMarks]);

  // Question-wise Performance Analytics
  const questionAnalytics = useMemo(() => {
    return questions.map((q, idx) => {
      let totalAttempts = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;

      const optCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };

      attempts.forEach((at) => {
        const studentAns = at.answers?.[q.id];
        if (!studentAns) {
          unansweredCount += 1;
        } else {
          totalAttempts += 1;
          const uAns = studentAns.toUpperCase();
          if (optCounts[uAns] !== undefined) {
            optCounts[uAns] += 1;
          }
          if (uAns === (q.correctAnswer || '').toUpperCase()) {
            correctCount += 1;
          } else {
            incorrectCount += 1;
          }
        }
      });

      const totalStudents = attempts.length;
      const correctPct =
        totalStudents > 0 ? Math.round((correctCount / totalStudents) * 1000) / 10 : 0;

      return {
        questionNumber: idx + 1,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        marks: q.marks || 1,
        totalAttempts,
        correctCount,
        incorrectCount,
        unansweredCount,
        correctPct,
        optCounts,
      };
    });
  }, [questions, attempts]);

  // Filtered Student Attempts
  const filteredAttempts = useMemo(() => {
    const passingMarks = exam.passingMarks || Math.ceil(exam.totalMarks * 0.35);

    return attempts.filter((at) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (at.studentName || '').toLowerCase().includes(q);
        const matchesGr = (at.grNumber || '').toLowerCase().includes(q);
        const matchesRoll = (at.rollNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesGr && !matchesRoll) return false;
      }

      // Status
      if (statusFilter === 'PASS') {
        return (at.score || 0) >= passingMarks;
      }
      if (statusFilter === 'FAIL') {
        return (at.score || 0) < passingMarks;
      }
      return true;
    });
  }, [attempts, searchQuery, statusFilter, exam.totalMarks, exam.passingMarks]);

  // Export to Excel
  const handleExportExcel = () => {
    const passingMarks = exam.passingMarks || Math.ceil(exam.totalMarks * 0.35);

    const rows = attempts.map((at, idx) => ({
      'અનું. નં': idx + 1,
      'વિદ્યાર્થીનું નામ': at.studentName,
      'રોલ નં': at.rollNumber || '-',
      'G.R. નં': at.grNumber || '-',
      ધોરણ: at.standard,
      'મેળવેલ ગુણ': at.score,
      'કુલ ગુણ': at.totalMarks || exam.totalMarks,
      ટકાવારી: `${at.percentage || 0}%`,
      'સાચા જવાબો': at.correctCount,
      'ખોટા જવાબો': at.incorrectCount,
      પરિણામ: (at.score || 0) >= passingMarks ? 'પાસ (PASS)' : 'સુધારણા જરૂરી (FAIL)',
      'સબમિશન સમય': at.submittedAt ? new Date(at.submittedAt).toLocaleString('gu-IN') : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `${exam.title.replace(/\s+/g, '_')}_Results.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-1 sm:p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[98dvh] sm:h-[92dvh] max-h-[98dvh] sm:max-h-[92dvh] bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-[#e4ded6] animate-fadeIn">
        {/* Header: Compact, responsive */}
        <div className="shrink-0 px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/90 flex flex-col gap-2">
          {/* Top Row: Title, Exam Info & Close Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    📊 પરિણામ અને એનાલિટિક્સ
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 truncate max-w-[130px] sm:max-w-none">
                    {exam.title}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  ધોરણ {exam.standard} • {exam.subject} • કુલ ગુણ: {exam.totalMarks} • {exam.questionsCount} પ્રશ્નો
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              title="બંધ કરો"
            >
              <X className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Action Toolbar: Smooth scroll, buttons never cut off */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 scrollbar-none flex-nowrap text-xs">
            <button
              type="button"
              onClick={() => {
                setOmrModalStudentId('ALL');
                setOmrModalMode('checked');
                setOmrModalOpen(true);
              }}
              disabled={attempts.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-xs shrink-0 whitespace-nowrap text-[11px] sm:text-xs"
              title="વિદ્યાર્થીઓની OMR ઉત્તરવહી ડાઉનલોડ / પ્રિન્ટ કરો"
            >
              <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
              <span>📄 OMR શીટ્સ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setQuestionPaperModalMode('without_answers');
                setQuestionPaperModalOpen(true);
              }}
              disabled={questions.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-xs shrink-0 whitespace-nowrap text-[11px] sm:text-xs"
              title="પ્રશ્નપત્ર ડાઉનલોડ / પ્રિન્ટ કરો"
            >
              <FileQuestion className="w-3.5 h-3.5 shrink-0" />
              <span>📝 પ્રશ્નપત્ર</span>
            </button>

            <button
              type="button"
              onClick={() => setSendResultModalOpen(true)}
              disabled={attempts.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-xs shrink-0 whitespace-nowrap text-[11px] sm:text-xs"
              title="૧-ક્લિકમાં વિદ્યાર્થીઓને એપ નોટિફિકેશન અથવા WhatsApp ગ્રૂપમાં રિઝલ્ટ મોકલો"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>🚀 ૧-ક્લિક પરિણામ મોકલો</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={attempts.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shrink-0 whitespace-nowrap text-[11px] sm:text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>Excel Export</span>
            </button>
          </div>
        </div>

        {/* Overview Stat Section: Compact strip on mobile with toggle; Full 6-cards on desktop */}
        <div className="shrink-0 bg-slate-100/90 dark:bg-slate-900/60 border-b border-slate-200 dark:border-white/10">
          {/* Mobile Strip View */}
          <div className="sm:hidden px-3 py-1.5 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                હાજર: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.attemptedCount}</strong>/{stats.totalEligible}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                સરેરાશ: <strong className="text-blue-600 dark:text-blue-400 font-bold">{stats.avgScore}</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                પાસ: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.passPct}%</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowStatsMobile(!showStatsMobile)}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer ml-1"
            >
              <span>{showStatsMobile ? 'ઓછું' : 'વિગત'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showStatsMobile ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Mobile Expanded 6 cards (only shown if user clicks 'વિગત') */}
          {showStatsMobile && (
            <div className="grid grid-cols-3 gap-1.5 p-2.5 sm:hidden text-xs border-t border-slate-200/80 dark:border-white/5 animate-fadeIn">
              <div className="p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">કુલ પાત્ર</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">{stats.totalEligible}</div>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">પરીક્ષા આપી</div>
                <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{stats.attemptedCount}</div>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">બાકી</div>
                <div className="text-sm font-extrabold text-amber-600 dark:text-amber-400">{stats.notAttemptedCount}</div>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">સૌથી વધુ</div>
                <div className="text-sm font-extrabold text-teal-700 dark:text-teal-300">{stats.highestScore}/{exam.totalMarks}</div>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">સરેરાશ ગુણ</div>
                <div className="text-sm font-extrabold text-blue-700 dark:text-blue-300">{stats.avgScore}</div>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">પાસ %</div>
                <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{stats.passPct}%</div>
              </div>
            </div>
          )}

          {/* Desktop View (6 full cards always visible on desktop) */}
          <div className="hidden sm:grid grid-cols-3 lg:grid-cols-6 gap-2.5 p-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] mb-0.5">કુલ પાત્ર વિદ્યાર્થી</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{stats.totalEligible}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] mb-0.5">પરીક્ષા આપી</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{stats.attemptedCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] mb-0.5">બાકી (Not Attempted)</div>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400">{stats.notAttemptedCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] mb-0.5">સૌથી વધુ ગુણ</div>
              <div className="text-base font-bold text-teal-700 dark:text-teal-300">{stats.highestScore} / {exam.totalMarks}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] mb-0.5">સરેરાશ ગુણ</div>
              <div className="text-base font-bold text-blue-700 dark:text-blue-300">{stats.avgScore} ({stats.avgPercentage}%)</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] mb-0.5">પાસ ટકાવારી</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{stats.passPct}%</div>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Search Bar: Compact bar pinned above results */}
        <div className="shrink-0 p-2 sm:p-3 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 p-0.5 border border-slate-300 dark:border-white/10 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">વિદ્યાર્થી પરિણામ ({attempts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'questions'
                  ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">પ્રશ્ન એનાલિટિક્સ ({questions.length})</span>
            </button>
          </div>

          {activeTab === 'students' && (
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto flex-1 max-w-md sm:justify-end">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="નામ / રોલ નં શોધો..."
                  className="w-full pl-7.5 pr-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer shrink-0"
              >
                <option value="ALL">બધા પરિણામ</option>
                <option value="PASS">માત્ર પાસ</option>
                <option value="FAIL">સુધારણા જરૂરી</option>
              </select>
            </div>
          )}
        </div>

        {/* Content Area: Single Large Unified Scroll Area giving 100% height to results */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2 sm:p-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">ડેટા લોડ થઈ રહ્યો છે...</div>
          ) : activeTab === 'students' ? (
            /* Student-wise Results */
            filteredAttempts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                હજુ સુધી કોઈ વિદ્યાર્થીએ આ પરીક્ષા સબમિટ કરી નથી.
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Mobile Optimized Cards View (md:hidden) */}
                <div className="block md:hidden space-y-2.5">
                  {filteredAttempts.map((at, idx) => {
                    const passingMarks = exam.passingMarks || Math.ceil(exam.totalMarks * 0.35);
                    const isPass = (at.score || 0) >= passingMarks;

                    return (
                      <div
                        key={at.id}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-xs space-y-2"
                      >
                        {/* Student Name & Result Badge: Clear & Full width, never cut off */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                                {at.studentName}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {at.rollNumber ? `રોલ: ${at.rollNumber} ` : ''}
                                {at.grNumber ? `• GR: ${at.grNumber}` : ''}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              isPass
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                                : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                            }`}
                          >
                            {isPass ? 'પાસ (PASS)' : 'સુધારણા જરૂરી'}
                          </span>
                        </div>

                        {/* Marks & Stats Strip */}
                        <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">મેળવેલ ગુણ:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{at.score}</strong> / {exam.totalMarks} ({at.percentage || 0}%)
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">જવાબો:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              <span className="text-emerald-600 font-bold">✓ {at.correctCount}</span> • <span className="text-rose-600 font-bold">✗ {at.incorrectCount}</span>
                            </span>
                          </div>
                        </div>

                        {/* OMR Action Buttons: 2-Column Equal Grid, Never Cut Off */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              setOmrModalStudentId(at.id);
                              setOmrModalMode('checked');
                              setOmrModalOpen(true);
                            }}
                            className="w-full py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                            title="તપાસેલ OMR શીટ ડાઉનલોડ / પ્રિન્ટ કરો"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>તપાસેલ OMR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOmrModalStudentId(at.id);
                              setOmrModalMode('unchecked');
                              setOmrModalOpen(true);
                            }}
                            className="w-full py-2 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                            title="અનચેક્ડ OMR શીટ ડાઉનલોડ / પ્રિન્ટ કરો"
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span>અનચેક્ડ OMR</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Desktop Table View (hidden md:block) with Sticky Student Name Column */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 text-[11px]">
                        <th className="p-3 w-10">#</th>
                        <th className="p-3 sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          વિદ્યાર્થીનું નામ
                        </th>
                        <th className="p-3">રોલ નં / GR</th>
                        <th className="p-3">મેળવેલ ગુણ</th>
                        <th className="p-3">ટકાવારી</th>
                        <th className="p-3">સાચા / ખોટા</th>
                        <th className="p-3">પરિણામ</th>
                        <th className="p-3">સબમિશન સમય</th>
                        <th className="p-3 text-right">OMR ઉત્તરવહી</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {filteredAttempts.map((at, idx) => {
                        const passingMarks = exam.passingMarks || Math.ceil(exam.totalMarks * 0.35);
                        const isPass = (at.score || 0) >= passingMarks;

                        return (
                          <tr key={at.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="p-3 text-slate-500">{idx + 1}</td>
                            <td className="p-3 font-semibold text-slate-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-[#121921] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                              {at.studentName}
                            </td>
                            <td className="p-3 text-slate-500 dark:text-slate-400">
                              {at.rollNumber ? `રોલ: ${at.rollNumber}` : ''} {at.grNumber ? `(GR: ${at.grNumber})` : ''}
                            </td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              <span className="text-emerald-600 dark:text-emerald-400 text-sm">{at.score}</span> / {exam.totalMarks}
                            </td>
                            <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{at.percentage || 0}%</td>
                            <td className="p-3">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{at.correctCount}</span> સાચા •{' '}
                              <span className="text-rose-600 dark:text-rose-400 font-bold">{at.incorrectCount}</span> ખોટા
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isPass
                                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                                    : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                                }`}
                              >
                                {isPass ? 'પાસ (PASS)' : 'સુધારણા જરૂરી'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 text-[11px]">
                              {at.submittedAt ? new Date(at.submittedAt).toLocaleTimeString('gu-IN') : '-'}
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOmrModalStudentId(at.id);
                                    setOmrModalMode('checked');
                                    setOmrModalOpen(true);
                                  }}
                                  title="આ વિદ્યાર્થીની તપાસેલ OMR શીટ (✓ / ✗ સાથે) ડાઉનલોડ / પ્રિન્ટ કરો"
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>તપાસેલ OMR</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOmrModalStudentId(at.id);
                                    setOmrModalMode('unchecked');
                                    setOmrModalOpen(true);
                                  }}
                                  title="આ વિદ્યાર્થીની અનચેક્ડ OMR શીટ (માત્ર સબમિટ જવાબો) ડાઉનલોડ / પ્રિન્ટ કરો"
                                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                  <span>અનચેક્ડ OMR</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            /* Question-wise Analytics */
            <div className="space-y-4">
              {questionAnalytics.map((qa) => {
                return (
                  <div
                    key={qa.questionNumber}
                    className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {qa.questionNumber}
                        </span>
                        <div>
                          <div className="font-semibold text-xs text-slate-900 dark:text-white">{qa.questionText}</div>
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                            સાચો જવાબ: ({qa.correctAnswer}) • ગુણ: {qa.marks}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{qa.correctPct}%</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">સાચો જવાબ આપનાર વિદ્યાર્થીઓ</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                        style={{ width: `${qa.correctPct}%` }}
                      />
                    </div>

                    {/* Options Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const count = qa.optCounts[opt] || 0;
                        const isCorrect = qa.correctAnswer === opt;
                        return (
                          <div
                            key={opt}
                            className={`p-2 rounded-lg border ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold'
                                : 'bg-white dark:bg-black/20 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span>વિકલ્પ ({opt})</span>
                              <span>{count} વિદ્યાર્થી</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Send Exam Result to Parents Modal */}
      {sendResultModalOpen && (
        <SendExamResultModal
          isOpen={sendResultModalOpen}
          onClose={() => setSendResultModalOpen(false)}
          school={school || ({ id: schoolId, schoolName: '' } as School)}
          students={allStudents}
          marks={[]}
          initialOnlineExam={exam}
          initialExamAttempts={attempts}
        />
      )}

      {/* Online Exam OMR Answer Sheet Modal */}
      {omrModalOpen && (
        <OnlineExamOmrModal
          isOpen={omrModalOpen}
          onClose={() => setOmrModalOpen(false)}
          exam={exam}
          questions={questions}
          attempts={attempts}
          school={school}
          initialStudentId={omrModalStudentId}
          initialMode={omrModalMode}
        />
      )}

      {/* Online Exam Question Paper Modal */}
      {questionPaperModalOpen && (
        <OnlineExamQuestionPaperModal
          isOpen={questionPaperModalOpen}
          onClose={() => setQuestionPaperModalOpen(false)}
          exam={exam}
          questions={questions}
          school={school}
          initialMode={questionPaperModalMode}
        />
      )}
    </div>
  );
};
