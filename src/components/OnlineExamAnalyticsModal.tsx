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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { OnlineExam, MCQQuestion, ExamAttempt, Student } from '../types';
import { getExamQuestions, getExamAttempts } from '../services/onlineExamService';

interface OnlineExamAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: OnlineExam;
  schoolId: string;
  allStudents: Student[];
}

export const OnlineExamAnalyticsModal: React.FC<OnlineExamAnalyticsModalProps> = ({
  isOpen,
  onClose,
  exam,
  schoolId,
  allStudents,
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'questions'>('students');
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#121921] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-[#e4ded6]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  📊 પરીક્ષા પરિણામ અને એનાલિટિક્સ (Results & Analytics)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                  {exam.title}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ધોરણ: {exam.standard} • વિષય: {exam.subject} • કુલ ગુણ: {exam.totalMarks} • પ્રશ્નો: {exam.questionsCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={attempts.length === 0}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel Export
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-slate-900/60 border-b border-white/10 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-slate-400 text-[11px] mb-1">કુલ પાત્ર વિદ્યાર્થી</div>
            <div className="text-lg font-bold text-white">{stats.totalEligible}</div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-slate-400 text-[11px] mb-1">પરીક્ષા આપી (Attempted)</div>
            <div className="text-lg font-bold text-emerald-400">{stats.attemptedCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-slate-400 text-[11px] mb-1">બાકી (Not Attempted)</div>
            <div className="text-lg font-bold text-amber-400">{stats.notAttemptedCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-slate-400 text-[11px] mb-1">સૌથી વધુ ગુણ (Highest)</div>
            <div className="text-lg font-bold text-teal-300">{stats.highestScore} / {exam.totalMarks}</div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-slate-400 text-[11px] mb-1">સરેરાશ ગુણ (Average)</div>
            <div className="text-lg font-bold text-blue-300">{stats.avgScore} ({stats.avgPercentage}%)</div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-slate-400 text-[11px] mb-1">પાસ ટકાવારી (Pass %)</div>
            <div className="text-lg font-bold text-emerald-400">{stats.passPct}%</div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="p-4 border-b border-white/10 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10">
            <button
              onClick={() => setActiveTab('students')}
              className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'students'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              વિદ્યાર્થી પરિણામ ({attempts.length})
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'questions'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              પ્રશ્ન-વાર એનાલિટિક્સ ({questions.length})
            </button>
          </div>

          {activeTab === 'students' && (
            <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="નામ / રોલ નં શોધો..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
              >
                <option value="ALL">બધા</option>
                <option value="PASS">માત્ર પાસ</option>
                <option value="FAIL">સુધારણા જરૂરી</option>
              </select>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">ડેટા લોડ થઈ રહ્યો છે...</div>
          ) : activeTab === 'students' ? (
            /* Student-wise Table */
            filteredAttempts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                હજુ સુધી કોઈ વિદ્યાર્થીએ આ પરીક્ષા સબમિટ કરી નથી.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 border-b border-white/10 text-[11px]">
                      <th className="p-3">#</th>
                      <th className="p-3">વિદ્યાર્થીનું નામ</th>
                      <th className="p-3">રોલ નં / GR</th>
                      <th className="p-3">મેળવેલ ગુણ</th>
                      <th className="p-3">ટકાવારી</th>
                      <th className="p-3">સાચા / ખોટા</th>
                      <th className="p-3">પરિણામ</th>
                      <th className="p-3">સબમિશન સમય</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredAttempts.map((at, idx) => {
                      const passingMarks = exam.passingMarks || Math.ceil(exam.totalMarks * 0.35);
                      const isPass = (at.score || 0) >= passingMarks;

                      return (
                        <tr key={at.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-semibold text-white">{at.studentName}</td>
                          <td className="p-3 text-slate-400">
                            {at.rollNumber ? `રોલ: ${at.rollNumber}` : ''} {at.grNumber ? `(GR: ${at.grNumber})` : ''}
                          </td>
                          <td className="p-3 font-bold text-white">
                            <span className="text-emerald-400 text-sm">{at.score}</span> / {exam.totalMarks}
                          </td>
                          <td className="p-3 font-semibold text-slate-300">{at.percentage || 0}%</td>
                          <td className="p-3">
                            <span className="text-emerald-400 font-bold">{at.correctCount}</span> સાચા •{' '}
                            <span className="text-rose-400 font-bold">{at.incorrectCount}</span> ખોટા
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isPass
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {isPass ? 'પાસ (PASS)' : 'સુધારણા જરૂરી'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {at.submittedAt ? new Date(at.submittedAt).toLocaleTimeString('gu-IN') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Question-wise Analytics */
            <div className="space-y-4">
              {questionAnalytics.map((qa) => {
                return (
                  <div
                    key={qa.questionNumber}
                    className="p-4 rounded-xl border border-white/10 bg-slate-900/60"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-md bg-white/10 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {qa.questionNumber}
                        </span>
                        <div>
                          <div className="font-semibold text-xs text-white">{qa.questionText}</div>
                          <div className="text-[11px] text-emerald-400 font-bold mt-1">
                            સાચો જવાબ: ({qa.correctAnswer}) • ગુણ: {qa.marks}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{qa.correctPct}%</div>
                        <div className="text-[10px] text-slate-400">સાચો જવાબ આપનાર વિદ્યાર્થીઓ</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
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
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-bold'
                                : 'bg-black/20 border-white/5 text-slate-400'
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

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
          >
            બંધ કરો
          </button>
        </div>
      </div>
    </div>
  );
};
