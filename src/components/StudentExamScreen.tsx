import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
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
      <div className="min-h-screen bg-[#090c10] text-[#e4ded6] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <div className="font-bold text-sm text-white">ઓનલાઇન પરીક્ષા લોડ થઈ રહી છે...</div>
        <p className="text-xs text-slate-400 mt-1">સર્વર સમય અને પ્રશ્નો ચકાસવામાં આવી રહ્યા છે</p>
      </div>
    );
  }

  if (error && !submissionResult) {
    return (
      <div className="min-h-screen bg-[#090c10] text-[#e4ded6] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#121921] border border-rose-500/30 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">પરીક્ષા શરૂ થઈ શકી નથી</h3>
          <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={onExit}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
          >
            પાછા ડેશબોર્ડ પર જાઓ
          </button>
        </div>
      </div>
    );
  }

  // Submission Completed Result Screen
  if (submissionResult) {
    return (
      <div className="min-h-screen bg-[#090c10] text-[#e4ded6] flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full p-6 sm:p-8 rounded-3xl bg-[#121921] border border-white/10 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">પરીક્ષા સફળતાપૂર્વક સબમિટ થઈ ગઈ છે!</h2>
            <p className="text-xs text-slate-400">{exam?.title}</p>
          </div>

          {submissionResult.showResult && submissionResult.result ? (
            /* Immediate Result Card */
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-3">
              <div className="text-xs text-slate-400">તમારું પરિણામ (Your Result)</div>
              <div className="text-3xl font-extrabold text-emerald-400">
                {submissionResult.result.score} / {submissionResult.result.totalMarks}
              </div>
              <div className="text-sm font-bold text-slate-200">
                ટકાવારી: {submissionResult.result.percentage}%
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300">
                  સાચા જવાબો: <strong>{submissionResult.result.correctCount}</strong>
                </div>
                <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/20 text-rose-300">
                  ખોટા જવાબો: <strong>{submissionResult.result.incorrectCount}</strong>
                </div>
              </div>
            </div>
          ) : (
            /* Later Result Notice */
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-center space-y-1">
              <div className="font-bold">પરિણામની સૂચના:</div>
              <div>પરિણામ શાળા દ્વારા જાહેર કરવામાં આવ્યા બાદ તમારા સ્ટુડન્ટ પોર્ટલ પર દેખાશે.</div>
            </div>
          )}

          <button
            type="button"
            onClick={onExit}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 hover:brightness-110 transition-all"
          >
            ડેશબોર્ડ પર પાછા જાઓ
          </button>
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
    <div className="min-h-screen bg-[#090c10] text-[#e4ded6] flex flex-col font-['Anek_Gujarati'] select-none">
      {/* Top Authoritative Exam Bar with School Branding & Timer */}
      <header className="sticky top-0 z-30 bg-[#121921]/95 border-b border-white/10 backdrop-blur-md shadow-md">
        {/* Upper School Branding Strip */}
        <div className="border-b border-white/5 bg-black/20 px-3 sm:px-4 py-1.5">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {schoolLogo ? (
                <img
                  src={schoolLogo}
                  alt={schoolName}
                  className="w-5 h-5 rounded-md object-contain bg-white/10 shrink-0"
                />
              ) : (
                <span className="text-sm">🏫</span>
              )}
              <span className="font-bold text-white truncate">{schoolName}</span>
              {diseCode && (
                <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-400 font-mono">
                  DISE: {diseCode}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-300 shrink-0">
              વિદ્યાર્થી: <strong className="text-emerald-400">{session.student.studentName}</strong> (ધોરણ: {session.student.standard})
            </div>
          </div>
        </div>

        {/* Lower Active Exam & Authoritative Timer Strip */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            {/* Left: Exam Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                📝
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-bold text-white truncate">{exam?.title}</h1>
                <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                  <span className="text-slate-300 font-semibold">{exam?.subject}</span>
                  <span>•</span>
                  <span>પ્રશ્ન {currentIndex + 1} / {questions.length}</span>
                </div>
              </div>
            </div>

            {/* Right: Authoritative Timer & Save status */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Sync Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
                {saveStatus === 'saving' ? (
                  <span className="text-amber-400 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> સાચવી રહ્યું છે...
                  </span>
                ) : saveStatus === 'offline' ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <WifiOff className="w-3.5 h-3.5" /> ઑફલાઇન
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> સાચવેલ
                  </span>
                )}
              </div>

              {/* Prominent Live Exam Countdown Timer */}
              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono font-bold text-xs sm:text-sm transition-all shadow-md ${
                  isTimeCritical
                    ? 'bg-rose-500/25 border-rose-500 text-rose-300 animate-pulse shadow-rose-950/50'
                    : 'bg-slate-900/90 border-emerald-500/40 text-emerald-400 shadow-emerald-950/30'
                }`}
                title="પરીક્ષા પૂર્ણ થવાનો બાકી સમય"
              >
                <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-rose-400 animate-spin' : 'text-emerald-400'}`} />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[9px] text-slate-400 font-sans tracking-wide">બાકી સમય</span>
                  <span className="text-sm font-black tracking-wider">{formatTime(remainingSeconds)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
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
            <div className="p-5 sm:p-7 rounded-3xl bg-[#121921] border border-white/10 shadow-xl space-y-5">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    પ્રશ્ન {currentIndex + 1} / {questions.length}
                  </span>
                  <span className="text-slate-400">ગુણ: {currentQ.marks || 1}</span>
                </div>

                {answers[currentQ.id] && (
                  <button
                    type="button"
                    onClick={() => handleClearOption(currentQ.id)}
                    className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    પસંદગી સાફ કરો
                  </button>
                )}
              </div>

              {/* Question Text */}
              <div className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                {currentQ.questionText}
              </div>

              {/* Optional Figure / Image */}
              {currentQ.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-white/10 max-h-64 bg-black/40 flex items-center justify-center p-2">
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
                      className={`w-full min-h-[52px] p-3.5 sm:p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all text-xs sm:text-sm font-medium ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/20 border-emerald-500 ring-2 ring-emerald-500/50 text-white shadow-lg shadow-emerald-950/30'
                          : 'bg-slate-900/80 border-white/10 text-slate-200 hover:bg-slate-800 hover:border-white/20'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl font-bold text-xs shrink-0 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-extrabold shadow'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {opt}
                      </span>
                      <span className="flex-1 leading-normal">{optText}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mr-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls: Prev, Next */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                  પાછળનો પ્રશ્ન (Previous)
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentIndex === questions.length - 1}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-30 shadow"
                >
                  આગળનો પ્રશ્ન (Next)
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right / Sidebar: Question Palette & Progress */}
        <aside className="w-full md:w-72 shrink-0 p-4 sm:p-5 rounded-3xl bg-[#121921] border border-white/10 space-y-4">
          <div className="text-xs font-bold text-white flex items-center justify-between">
            <span>પ્રશ્ન પત્રક (Question Palette)</span>
            <span className="text-slate-400 text-[11px] font-normal">
              કુલ: {questions.length}
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
              <div className="font-bold text-sm">{answeredCount}</div>
              <div className="text-[10px] text-slate-400">જવાબ આપેલ</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
              <div className="font-bold text-sm">{unansweredCount}</div>
              <div className="text-[10px] text-slate-400">બાકી પ્રશ્નો</div>
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
                  className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 font-extrabold shadow-md'
                      : isAnswered
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Color Legend */}
          <div className="pt-3 border-t border-white/10 space-y-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-600" />
              <span>જવાબ આપેલ (Answered)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-amber-500" />
              <span>ચાલુ પ્રશ્ન (Current Question)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-slate-800 border border-white/20" />
              <span>બાકી પ્રશ્ન (Unanswered)</span>
            </div>
          </div>
        </aside>
      </main>

      {/* Manual Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#121921] border border-white/10 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">શું તમે પરીક્ષા સબમિટ કરવા માંગો છો?</h3>
              <p className="text-xs text-slate-400">
                તમે {questions.length} માંથી <strong>{answeredCount}</strong> પ્રશ્નોના જવાબો આપ્યા છે.
                {unansweredCount > 0 && (
                  <span className="text-rose-400 block mt-1">
                    ચેતવણી: હજુ {unansweredCount} પ્રશ્નો બાકી છે!
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold"
              >
                પરીક્ષા ચાલુ રાખો
              </button>
              <button
                type="button"
                onClick={handleManualSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 disabled:opacity-50"
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
