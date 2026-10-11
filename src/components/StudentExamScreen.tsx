import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  Wifi,
  WifiOff,
  RotateCcw,
  Check,
  Award,
  ArrowLeft,
  ShieldCheck,
  Printer,
  FileText,
  Sparkles,
  Filter,
} from 'lucide-react';
import {
  startStudentExam,
  saveStudentAnswers,
  submitStudentExam,
  getServerTime,
} from '../services/onlineExamService';
import { StudentSession } from '../types';

interface StudentExamScreenProps {
  session: StudentSession;
  examId: string;
  onExit: () => void;
}

export const StudentExamScreen: React.FC<StudentExamScreenProps> = ({
  session,
  examId,
  onExit,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exam and Attempt data
  const [exam, setExam] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  // Navigation and answers
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved');

  // Authoritative Server Time & Countdown
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'wrong' | 'unanswered'>('all');

  // Auto-save debounce timer ref
  const saveTimeoutRef = useRef<any>(null);

  // 1. Initialize Exam
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setLoading(true);
        setError(null);

        const data = await startStudentExam(session.sessionToken, examId);
        if (!isMounted) return;

        setExam(data.exam);
        setAttempt(data.attempt);
        setQuestions(data.questions || []);
        setAnswers(data.attempt?.answers || {});

        if (data.isAlreadySubmitted) {
          setSubmissionResult({
            showResult: Boolean(data.showResult),
            result: data.result,
          });
          return;
        }

        // Compute authoritative remaining seconds
        const serverNow = data.serverTime || Date.now();
        const expiry = data.attempt?.expiresAt || serverNow + 30 * 60 * 1000;
        const diffSecs = Math.max(0, Math.floor((expiry - serverNow) / 1000));
        setRemainingSeconds(diffSecs);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'પરીક્ષા શરૂ કરવામાં સમસ્યા થઈ.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [session.sessionToken, examId]);

  // 2. Countdown Timer Loop
  useEffect(() => {
    if (loading || remainingSeconds <= 0 || submissionResult) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, remainingSeconds, submissionResult]);

  // Format seconds as MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 3. Option Selection & Auto-Save
  const handleSelectOption = (questionId: string, option: 'A' | 'B' | 'C' | 'D') => {
    if (submissionResult || isSubmitting) return;

    const updated = { ...answers, [questionId]: option };
    setAnswers(updated);
    setSaveStatus('saving');

    // Debounce save to server
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (attempt?.id) {
          await saveStudentAnswers(session.sessionToken, attempt.id, updated);
          setSaveStatus('saved');
        }
      } catch (err) {
        console.warn('Auto-save failed:', err);
        setSaveStatus('offline');
      }
    }, 400);
  };

  const handleClearOption = (questionId: string) => {
    const updated = { ...answers };
    delete updated[questionId];
    setAnswers(updated);
    if (attempt?.id) {
      saveStudentAnswers(session.sessionToken, attempt.id, updated).catch(() => {});
    }
  };

  // 4. Auto Submit when countdown expires
  const handleAutoSubmit = async () => {
    if (submissionResult || isSubmitting || !attempt?.id) return;
    setIsSubmitting(true);
    try {
      const res = await submitStudentExam(session.sessionToken, attempt.id, answers);
      setSubmissionResult(res);
    } catch (e: any) {
      console.error('Auto-submit error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Manual Submit
  const handleManualSubmit = async () => {
    if (isSubmitting || !attempt?.id) return;
    setIsSubmitting(true);
    try {
      const res = await submitStudentExam(session.sessionToken, attempt.id, answers);
      setSubmissionResult(res);
      setShowSubmitConfirm(false);
    } catch (e: any) {
      setError(e.message || 'સબમિશન નિષ્ફળ થયું.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Counts
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const currentQ = questions[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f6f2] dark:bg-[#090c10] text-slate-800 dark:text-[#e4ded6] flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-pulse mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <div className="font-bold text-sm text-slate-900 dark:text-white">ઓનલાઇન પરીક્ષા લોડ થઈ રહી છે...</div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">સર્વર સમય અને પ્રશ્નો ચકાસવામાં આવી રહ્યા છે</p>
      </div>
    );
  }

  if (error && !submissionResult) {
    return (
      <div className="min-h-screen bg-[#f8f6f2] dark:bg-[#090c10] text-slate-800 dark:text-[#e4ded6] flex flex-col items-center justify-center p-4 transition-colors">
        <div className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-[#121921] border border-rose-300 dark:border-rose-500/30 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">પરીક્ષા શરૂ થઈ શકી નથી</h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={onExit}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer"
          >
            પાછા ડેશબોર્ડ પર જાઓ
          </button>
        </div>
      </div>
    );
  }

  // Submission Completed Result Screen
  if (submissionResult) {
    const resData = submissionResult.result;
    const reviewQuestions: any[] = resData?.questions || questions.map((q) => {
      const sAns = (answers[q.id] || '').toUpperCase().trim();
      const cAns = (q.correctAnswer || '').toUpperCase().trim();
      const isAnswered = Boolean(sAns);
      const isCorrect = isAnswered && Boolean(cAns) && sAns === cAns;
      const isWrong = isAnswered && Boolean(cAns) && sAns !== cAns;
      const isUnanswered = !isAnswered;
      return {
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        marks: q.marks || 1,
        studentAnswer: sAns || null,
        correctAnswer: cAns,
        isCorrect,
        isWrong,
        isUnanswered,
        explanation: q.explanation,
        imageUrl: q.imageUrl,
      };
    });

    const correctQuestionsCount = resData?.correctCount ?? reviewQuestions.filter((q) => q.isCorrect).length;
    const wrongQuestionsCount = resData?.incorrectCount ?? reviewQuestions.filter((q) => q.isWrong).length;
    const unattemptedQuestionsCount = resData?.unansweredCount ?? reviewQuestions.filter((q) => q.isUnanswered).length;

    const filteredReviewQuestions = reviewQuestions.filter((q) => {
      if (reviewFilter === 'correct') return q.isCorrect;
      if (reviewFilter === 'wrong') return q.isWrong;
      if (reviewFilter === 'unanswered') return q.isUnanswered;
      return true;
    });

    return (
      <div className="min-h-screen bg-[#f8f6f2] dark:bg-[#090c10] text-slate-800 dark:text-[#e4ded6] flex flex-col items-center py-6 px-3 sm:px-6 transition-colors font-['Anek_Gujarati']">
        <div className="max-w-4xl w-full p-4 sm:p-8 rounded-3xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-2xl space-y-6">
          
          {/* Top Success Badge */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              પરીક્ષા સફળતાપૂર્વક સબમિટ થઈ ગઈ છે!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {exam?.title} • {session.student.studentName} (ધોરણ: {session.student.standard})
            </p>
          </div>

          {submissionResult.showResult && resData ? (
            <div className="space-y-6">
              {/* Summary Score Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-slate-50 to-teal-500/10 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/40 border border-emerald-300 dark:border-emerald-500/30 text-center space-y-3">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                  📊 તમારું ગુણપત્રક (Your Result)
                </span>
                <div className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400">
                  {resData.score} <span className="text-xl text-slate-400">/ {resData.totalMarks}</span>
                </div>
                <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                  ટકાવારી: <span className="text-emerald-700 dark:text-emerald-400">{resData.percentage}%</span>
                </div>

                {/* Quick 3-Metric Counter Grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-center">
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold mb-0.5">સાચા જવાબો</div>
                    <div className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                      ✓ {correctQuestionsCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 text-center">
                    <div className="text-[11px] text-rose-800 dark:text-rose-300 font-semibold mb-0.5">ખોટા જવાબો</div>
                    <div className="text-lg sm:text-xl font-extrabold text-rose-700 dark:text-rose-400">
                      ✗ {wrongQuestionsCount}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/30 text-center">
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold mb-0.5">બાકી રાખેલ</div>
                    <div className="text-lg sm:text-xl font-extrabold text-amber-700 dark:text-amber-400">
                      — {unattemptedQuestionsCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* DETAILED QUESTION-BY-QUESTION REVIEW SECTION */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>પ્રશ્નવાર ઉત્તરોની ચકાસણી (Question Review)</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      કયા પ્રશ્નો સાચા પડ્યા અને કયા ખોટા પડ્યા તેની વિગતવાર ચકાસણી નીચે મુજબ છે:
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 text-xs overflow-x-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setReviewFilter('all')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                        reviewFilter === 'all'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      બધા ({reviewQuestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('correct')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                        reviewFilter === 'correct'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      ✓ સાચા ({correctQuestionsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('wrong')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                        reviewFilter === 'wrong'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      }`}
                    >
                      ✗ ખોટા ({wrongQuestionsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('unanswered')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                        reviewFilter === 'unanswered'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                      }`}
                    >
                      — બાકી ({unattemptedQuestionsCount})
                    </button>
                  </div>
                </div>

                {/* Questions List */}
                {filteredReviewQuestions.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-white/5">
                    પસંદ કરેલ ફિલ્ટરમાં કોઈ પ્રશ્ન નથી.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReviewQuestions.map((q, idx) => {
                      const qNum = q.questionNumber || idx + 1;
                      const sAns = (q.studentAnswer || '').toUpperCase();
                      const cAns = (q.correctAnswer || '').toUpperCase();

                      return (
                        <div
                          key={q.id || idx}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all text-left space-y-3 ${
                            q.isCorrect
                              ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30'
                              : q.isWrong
                              ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30'
                              : 'bg-amber-50/20 dark:bg-amber-950/15 border-amber-300 dark:border-amber-500/30'
                          }`}
                        >
                          {/* Question Header & Status Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-bold flex items-center justify-center shrink-0">
                                {qNum}
                              </span>
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                ગુણ: {q.marks || 1}
                              </span>
                            </div>

                            {q.isCorrect ? (
                              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-1.5 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>સાચો જવાબ (+{q.marks || 1})</span>
                              </span>
                            ) : q.isWrong ? (
                              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 flex items-center gap-1.5 shrink-0">
                                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>ખોટો જવાબ (0)</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 flex items-center gap-1.5 shrink-0">
                                <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>અટેમ્પ્ટ કરેલ નથી (0)</span>
                              </span>
                            )}
                          </div>

                          {/* Question Text */}
                          <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                            {q.questionText}
                          </div>

                          {/* Optional Question Image */}
                          {q.imageUrl && (
                            <div className="max-w-md my-2 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                              <img src={q.imageUrl} alt={`પ્રશ્ન ${qNum}`} className="w-full object-contain max-h-56" />
                            </div>
                          )}

                          {/* 4 Options Grid with Right/Wrong Highlighting */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                            {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                              const optKey = `option${opt}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';
                              const optText = q[optKey] || '';
                              const isThisStudentAns = sAns === opt;
                              const isThisCorrectAns = cAns === opt;

                              let optCardClass =
                                'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200';
                              let badge = null;

                              if (isThisCorrectAns) {
                                optCardClass =
                                  'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500/40';
                                badge = (
                                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5 ml-auto">
                                    ✓ સાચો ઉત્તર
                                  </span>
                                );
                              } else if (isThisStudentAns && q.isWrong) {
                                optCardClass =
                                  'bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-100 ring-1 ring-rose-500/40';
                                badge = (
                                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-0.5 ml-auto">
                                    ✗ તમારો ઉત્તર
                                  </span>
                                );
                              }

                              return (
                                <div
                                  key={opt}
                                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${optCardClass}`}
                                >
                                  <span
                                    className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                      isThisCorrectAns
                                        ? 'bg-emerald-600 text-white'
                                        : isThisStudentAns && q.isWrong
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {opt}
                                  </span>
                                  <span className="font-medium flex-1 truncate">{optText}</span>
                                  {badge}
                                </div>
                              );
                            })}
                          </div>

                          {/* Explanation if available */}
                          {q.explanation && (
                            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-500/30 text-xs text-sky-900 dark:text-sky-200">
                              <strong>💡 સમજૂતી (Explanation):</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Later Result Notice */
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs text-center space-y-1">
              <div className="font-bold text-sm">પરિણામની સૂચના:</div>
              <div>પરિણામ શાળા દ્વારા જાહેર કરવામાં આવ્યા બાદ તમારા સ્ટુડન્ટ પોર્ટલ પર દેખાશે.</div>
            </div>
          )}

          {/* Action Button: Back to Dashboard */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onExit}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              ડેશબોર્ડ પર પાછા જાઓ (Back to Dashboard)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Exam Live Screen
  const isTimeCritical = remainingSeconds <= 300; // Last 5 minutes warning
  const schoolName = session.school?.schoolName || session.schoolName || 'શાળા પરીક્ષા';
  const schoolLogo = session.school?.logoUrl || session.schoolLogo;
  const diseCode = session.school?.diseCode || session.diseCode;

  return (
    <div className="min-h-screen bg-[#f8f6f2] dark:bg-[#090c10] text-slate-800 dark:text-[#e4ded6] flex flex-col font-['Anek_Gujarati'] select-none transition-colors">
      {/* Top Authoritative Exam Bar with School Branding & Timer */}
      <header className="app-header sticky top-0 z-30 bg-white/95 dark:bg-[#121921]/95 border-b border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm dark:shadow-md">
        {/* Upper School Branding Strip */}
        <div className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 px-3 sm:px-4 py-1.5">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {schoolLogo ? (
                <img
                  src={schoolLogo}
                  alt={schoolName}
                  className="w-5 h-5 rounded-md object-contain bg-white dark:bg-white/10 shrink-0 border border-slate-200 dark:border-white/10"
                />
              ) : (
                <span className="text-sm">🏫</span>
              )}
              <span className="font-bold text-slate-900 dark:text-white truncate">{schoolName}</span>
              {diseCode && (
                <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/5 text-[10px] text-slate-700 dark:text-slate-400 font-mono">
                  DISE: {diseCode}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 shrink-0">
              વિદ્યાર્થી: <strong className="text-emerald-700 dark:text-emerald-400">{session.student.studentName}</strong> (ધોરણ: {session.student.standard})
            </div>
          </div>
        </div>

        {/* Lower Active Exam & Authoritative Timer Strip */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            {/* Left: Exam Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                📝
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{exam?.title}</h1>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{exam?.subject}</span>
                  <span>•</span>
                  <span>પ્રશ્ન {currentIndex + 1} / {questions.length}</span>
                </div>
              </div>
            </div>

            {/* Right: Authoritative Timer & Save status */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Sync Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                {saveStatus === 'saving' ? (
                  <span className="text-amber-600 dark:text-amber-400 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> સાચવી રહ્યું છે...
                  </span>
                ) : saveStatus === 'offline' ? (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <WifiOff className="w-3.5 h-3.5" /> ઑફલાઇન
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> સાચવેલ
                  </span>
                )}
              </div>

              {/* Prominent Live Exam Countdown Timer */}
              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono font-bold text-xs sm:text-sm transition-all shadow-sm ${
                  isTimeCritical
                    ? 'bg-rose-100 dark:bg-rose-500/25 border-rose-300 dark:border-rose-500 text-rose-800 dark:text-rose-300 animate-pulse'
                    : 'bg-emerald-50 dark:bg-slate-900/90 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-400'
                }`}
                title="પરીક્ષા પૂર્ણ થવાનો બાકી સમય"
              >
                <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-rose-600 dark:text-rose-400 animate-spin' : 'text-emerald-600 dark:text-emerald-400'}`} />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-sans tracking-wide">બાકી સમય</span>
                  <span className="text-sm font-black tracking-wider">{formatTime(remainingSeconds)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>સબમિટ</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Exam Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col md:flex-row gap-5 items-start">
        {/* Left / Center: Active Question Display */}
        <div className="flex-1 w-full space-y-4">
          {currentQ ? (
            <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl space-y-5">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/30">
                    પ્રશ્ન {currentIndex + 1} / {questions.length}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">ગુણ: {currentQ.marks || 1}</span>
                </div>

                {answers[currentQ.id] && (
                  <button
                    type="button"
                    onClick={() => handleClearOption(currentQ.id)}
                    className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    પસંદગી સાફ કરો
                  </button>
                )}
              </div>

              {/* Question Text */}
              <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                {currentQ.questionText}
              </div>

              {/* Optional Figure / Image */}
              {currentQ.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-64 bg-slate-50 dark:bg-black/40 flex items-center justify-center p-2">
                  <img
                    src={currentQ.imageUrl}
                    alt="Question illustration"
                    className="max-h-60 object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Options A, B, C, D (Large Mobile Touch Targets >= 48px) */}
              <div className="space-y-3 pt-2">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                  const optText = currentQ[`option${opt}`];
                  const isSelected = answers[currentQ.id] === opt;

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, opt)}
                      className={`w-full min-h-[56px] p-3.5 sm:p-4 rounded-2xl border-2 text-left flex items-center gap-3.5 transition-all text-xs sm:text-sm cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/95 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/30 text-slate-900 dark:text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl font-bold text-xs shrink-0 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                            : 'bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300 font-bold'
                        }`}
                      >
                        {opt}
                      </span>
                      <span className={`flex-1 leading-normal ${isSelected ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
                        {optText}
                      </span>
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mr-1 shadow-xs">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-white/20 shrink-0 mr-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls: Prev, Next */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-30 cursor-pointer border border-slate-200 dark:border-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                  પાછળનો પ્રશ્ન (Previous)
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentIndex === questions.length - 1}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-30 shadow cursor-pointer"
                >
                  આગળનો પ્રશ્ન (Next)
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right / Sidebar: Question Palette & Progress */}
        <aside className="w-full md:w-72 shrink-0 p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-xl space-y-4">
          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>પ્રશ્ન પત્રક (Question Palette)</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-normal">
              કુલ: {questions.length}
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300">
              <div className="font-bold text-sm">{answeredCount}</div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">જવાબ આપેલ</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-300">
              <div className="font-bold text-sm">{unansweredCount}</div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">બાકી પ્રશ્નો</div>
            </div>
          </div>

          {/* Grid of question buttons */}
          <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]);
              const isCurrent = currentIndex === idx;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 font-extrabold shadow-md'
                      : isAnswered
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Color Legend */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
              <span>જવાબ આપેલ (Answered)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-bold">•</span>
              <span>ચાલુ પ્રશ્ન (Current Question)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/20" />
              <span>બાકી પ્રશ્ન (Unanswered)</span>
            </div>
          </div>
        </aside>
      </main>

      {/* Manual Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">શું તમે પરીક્ષા સબમિટ કરવા માંગો છો?</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                તમે {questions.length} માંથી <strong>{answeredCount}</strong> પ્રશ્નોના જવાબો આપ્યા છે.
                {unansweredCount > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 block mt-1">
                    ચેતવણી: હજુ {unansweredCount} પ્રશ્નો બાકી છે!
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer border border-slate-200 dark:border-transparent"
              >
                પરીક્ષા ચાલુ રાખો
              </button>
              <button
                type="button"
                onClick={handleManualSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'સબમિટ થઈ રહ્યું છે...' : 'હા, સબમિટ કરો'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
