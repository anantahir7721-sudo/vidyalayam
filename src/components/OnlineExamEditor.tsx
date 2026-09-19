import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  ArrowLeft,
  X,
  HelpCircle,
  Layers,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import {
  OnlineExam,
  MCQQuestion,
  AllowedStandard,
  OnlineExamType,
  OnlineExamStatus,
  ResultVisibilityType,
} from '../types';
import { findConflictingExam } from '../services/onlineExamService';
import { AiQuestionImporterModal } from './AiQuestionImporterModal';
import { QuestionBankModal } from './QuestionBankModal';

interface OnlineExamEditorProps {
  schoolId: string;
  existingExam?: OnlineExam | null;
  existingQuestions?: MCQQuestion[];
  allExams?: OnlineExam[];
  onSave: (examData: any, questions: MCQQuestion[]) => Promise<void>;
  onCancel: () => void;
}

export const OnlineExamEditor: React.FC<OnlineExamEditorProps> = ({
  schoolId,
  existingExam,
  existingQuestions = [],
  allExams = [],
  onSave,
  onCancel,
}) => {
  // Form State
  const [examType, setExamType] = useState<OnlineExamType>(
    existingExam?.examType || 'school_exam'
  );
  const [standard, setStandard] = useState<string>(existingExam?.standard || '9');
  const [subject, setSubject] = useState<string>(existingExam?.subject || 'Computer');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [title, setTitle] = useState<string>(existingExam?.title || '');
  const [instructions, setInstructions] = useState<string>(
    existingExam?.instructions ||
      '૧. દરેક પ્રશ્ન માટે ૧ ગુણ રહેશે.\n૨. સમય પૂર્ણ થતાં પરીક્ષા આપમેળે સબમિટ થઈ જશે.\n૩. બધા પ્રશ્નોના જવાબો આપવા ફરજિયાત છે.'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    existingExam?.durationMinutes || 30
  );

  // Date and Time
  const todayStr = new Date().toISOString().split('T')[0];
  const [scheduledDate, setScheduledDate] = useState<string>(
    existingExam?.scheduledDate || todayStr
  );
  const [scheduledStartTime, setScheduledStartTime] = useState<string>(
    existingExam?.scheduledStartTime || '10:00'
  );

  const [status, setStatus] = useState<OnlineExamStatus>(
    existingExam?.status || 'scheduled'
  );
  const [resultVisibility, setResultVisibility] = useState<ResultVisibilityType>(
    existingExam?.resultVisibility || 'immediate'
  );
  const [randomizeQuestions, setRandomizeQuestions] = useState<boolean>(
    existingExam?.randomizeQuestions || false
  );

  // Questions List
  const [questions, setQuestions] = useState<MCQQuestion[]>(
    existingQuestions.length > 0
      ? existingQuestions
      : [
          {
            id: `q_init_1`,
            schoolId,
            questionNumber: 1,
            questionText: '',
            optionA: '',
            optionB: '',
            optionC: '',
            optionD: '',
            correctAnswer: 'A',
            marks: 1,
            aiConfidence: 'high',
            needsReview: false,
          },
        ]
  );

  // Modals
  const [showAiModal, setShowAiModal] = useState(false);
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for scheduling conflict: prevent 2 exams from being set at the same time
  const activeConflict = useMemo(() => {
    if (!allExams || allExams.length === 0) return null;
    return findConflictingExam(
      allExams,
      scheduledDate,
      scheduledStartTime,
      durationMinutes,
      existingExam?.id,
      standard
    );
  }, [allExams, scheduledDate, scheduledStartTime, durationMinutes, existingExam?.id, standard]);

  // Preset subjects for School Exams vs Extra Exams
  const schoolExamSubjects = ['Computer', 'PT', 'Udyog', 'Chitrakala', 'Music', 'Other'];
  const extraExamSubjects = [
    'GK (સામાન્ય જ્ઞાન)',
    'Quiz (ક્વિઝ)',
    'Practice Test',
    'Talent Hunt',
    'Science Quiz',
    'Other',
  ];

  const handleAddQuestion = () => {
    const newQ: MCQQuestion = {
      id: `q_manual_${Date.now()}_${questions.length + 1}`,
      schoolId,
      questionNumber: questions.length + 1,
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      marks: 1,
      aiConfidence: 'high',
      needsReview: false,
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (index: number, field: keyof MCQQuestion, val: any) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      setError('ઓછામાં ઓછો એક પ્રશ્ન હોવો આવશ્યક છે.');
      return;
    }
    setQuestions((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
    });
  };

  const handleDuplicateQuestion = (index: number) => {
    const target = questions[index];
    const dup: MCQQuestion = {
      ...target,
      id: `q_dup_${Date.now()}`,
      questionNumber: index + 2,
    };
    const next = [...questions];
    next.splice(index + 1, 0, dup);
    setQuestions(next.map((q, idx) => ({ ...q, questionNumber: idx + 1 })));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const next = [...questions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;

    setQuestions(next.map((q, idx) => ({ ...q, questionNumber: idx + 1 })));
  };

  // AI Import callback
  const handleAiQuestionsImported = (imported: MCQQuestion[]) => {
    // If the first question was blank, replace it
    const isFirstBlank =
      questions.length === 1 && !questions[0].questionText.trim();

    const baseQuestions = isFirstBlank ? [] : questions;
    const merged = [
      ...baseQuestions,
      ...imported.map((q, idx) => ({
        ...q,
        schoolId,
        questionNumber: baseQuestions.length + idx + 1,
      })),
    ];
    setQuestions(merged);
  };

  // Question Bank import callback
  const handleQuestionBankImported = (imported: MCQQuestion[]) => {
    const isFirstBlank =
      questions.length === 1 && !questions[0].questionText.trim();
    const baseQuestions = isFirstBlank ? [] : questions;
    const merged = [
      ...baseQuestions,
      ...imported.map((q, idx) => ({
        ...q,
        schoolId,
        questionNumber: baseQuestions.length + idx + 1,
      })),
    ];
    setQuestions(merged);
  };

  const validateAndSubmit = async (forcedStatus?: OnlineExamStatus) => {
    setError(null);
    const finalSubject = subject === 'Other' ? customSubject.trim() : subject;

    if (!title.trim()) {
      setError('કૃપા કરીને પરીક્ષાનું નામ દાખલ કરો.');
      return;
    }
    if (!finalSubject) {
      setError('કૃપા કરીને વિષય પસંદ કરો અથવા દાખલ કરો.');
      return;
    }
    if (questions.length === 0) {
      setError('ઓછામાં ઓછો એક પ્રશ્ન ઉમેરવો જરૂરી છે.');
      return;
    }

    // Check time conflict - prevent 2 exams at the same time
    if (activeConflict) {
      setError(
        `સમય સંઘર્ષ (Time Conflict): આ સમયે (તારીખ: ${activeConflict.scheduledDate}, સમય: ${activeConflict.scheduledStartTime}) પહેલેથી જ ધોરણ ${activeConflict.standard} ની '${activeConflict.title}' પરીક્ષા સેટ થયેલ છે. શાળા દ્વારા એક જ સમયે ૨ પરીક્ષાઓ રાખી શકાતી નથી. કૃપા કરીને અન્ય સમય અથવા તારીખ પસંદ કરો.`
      );
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setError(`પ્રશ્ન નં ${i + 1} નું લખાણ ખાલી છે.`);
        return;
      }
      if (!q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
        setError(`પ્રશ્ન નં ${i + 1} માં બધા વિકલ્પો (A, B, C, D) ભરવા ફરજિયાત છે.`);
        return;
      }
      if (!q.correctAnswer) {
        setError(`પ્રશ્ન નં ${i + 1} નો સાચો જવાબ (Correct Answer) પસંદ કરવો ફરજિયાત છે.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const finalStatus = forcedStatus || status;
      const examPayload = {
        examType,
        standard,
        subject: finalSubject,
        title: title.trim(),
        instructions: instructions.trim(),
        durationMinutes: Number(durationMinutes) || 30,
        scheduledDate,
        scheduledStartTime,
        status: finalStatus,
        resultVisibility,
        randomizeQuestions,
      };

      await onSave(examPayload, questions);
    } catch (err: any) {
      setError(err.message || 'પરીક્ષા સાચવવામાં નિષ્ફળતા.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              {existingExam ? '✏️ પરીક્ષા સંપાદન (Edit Online Exam)' : '📝 નવી ઓનલાઇન પરીક્ષા બનાવો (Create Exam)'}
            </h2>
            <p className="text-xs text-slate-400">
              MCQ પ્રશ્નો, સમયપત્રક અને પરિણામ નિયમો ગોઠવો
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Eye className="w-4 h-4 text-amber-400" />
            પૂર્વાવલોકન (Preview)
          </button>

          <button
            type="button"
            onClick={() => validateAndSubmit('draft')}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            ડ્રાફ્ટ સાચવો (Draft)
          </button>

          <button
            type="button"
            onClick={() => validateAndSubmit()}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 hover:brightness-110 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? 'સાચવી રહ્યું છે...' : 'પરીક્ષા શેડ્યૂલ કરો / પબ્લિશ કરો'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Left Settings Form, Right Questions List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Exam Details & Schedule (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Exam Type & Basic Info */}
          <div className="p-5 rounded-2xl bg-[#121921] border border-white/10 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              પરીક્ષા પ્રકાર અને વિગતો
            </h3>

            {/* Exam Type Segmented Switch */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                પરીક્ષા પ્રકાર (Exam Type):
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setExamType('school_exam');
                    setSubject('Computer');
                  }}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    examType === 'school_exam'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🏫 શાળા સ્તર (School Exam)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExamType('extra_exam');
                    setSubject('GK (સામાન્ય જ્ઞાન)');
                  }}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    examType === 'extra_exam'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🎯 એક્સ્ટ્રા / ક્વિઝ (Extra)
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {examType === 'school_exam'
                  ? 'કમ્પ્યુટર, પી.ટી., ચિત્રકામ, ઉદ્યોગ વગેરે શાળાકીય વિષયો માટે'
                  : 'સામાન્ય જ્ઞાન (GK), સ્પર્ધા, ક્વિઝ વગેરે વધારાની પરીક્ષાઓ માટે (અલગ સેવ થશે)'}
              </p>
            </div>

            {/* Standard */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                ધોરણ (Standard):
              </label>
              <select
                value={standard}
                onChange={(e) => setStandard(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="9">ધોરણ 9</option>
                <option value="10">ધોરણ 10</option>
                <option value="11">ધોરણ 11</option>
                <option value="12">ધોરણ 12</option>
                <option value="all">બધા ધોરણ (All Standards)</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                વિષય (Subject):
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 mb-2"
              >
                {(examType === 'school_exam' ? schoolExamSubjects : extraExamSubjects).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
              {subject === 'Other' && (
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="કસ્ટમ વિષયનું નામ લખો..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                પરીક્ષાનું નામ (Exam Name):
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="દા.ત. ધોરણ ૯ કમ્પ્યુટર પ્રથમ સત્ર કસોટી"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                પરીક્ષા સૂચનાઓ (Instructions):
              </label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Card 2: Schedule & Timing */}
          <div className="p-5 rounded-2xl bg-[#121921] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                સમયપત્રક અને અવધિ (Timing & Schedule)
              </h3>
            </div>

            {/* Live Conflict Alert Banner */}
            {activeConflict && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-pulse">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-300">
                    ⚠️ સમય સંઘર્ષ (Time Conflict Detected)
                  </div>
                  <div className="text-[11px] text-rose-200/90 mt-0.5">
                    આ સમયે (તારીખ: {activeConflict.scheduledDate}, સમય: {activeConflict.scheduledStartTime}) પહેલેથી જ ધોરણ {activeConflict.standard} માટે <strong>'{activeConflict.title}'</strong> પરીક્ષા સેટ થયેલ છે. શાળા દ્વારા એક જ સમયે બે પરીક્ષાઓ રાખી શકાતી નથી.
                  </div>
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                પરીક્ષા તારીખ (Date):
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                શરૂ થવાનો ચોક્કસ સમય (Exact Start Time):
              </label>
              <input
                type="time"
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-teal-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                આ સમય પહેલાં વિદ્યાર્થીઓને લાઈવ કાઉન્ટડાઉન દેખાશે, અને સમય થતાં જ પરીક્ષા આપમેળે શરૂ થશે.
              </p>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                સમયગાળો મિનિટમાં (Duration):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={180}
                  step={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                  className="w-24 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold text-center focus:outline-none focus:border-teal-500"
                />
                <span className="text-xs text-slate-400">મિનિટ ({durationMinutes} Min)</span>
              </div>
            </div>

            {/* Status & Result Visibility */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  પરીક્ષા સ્થિતિ (Status):
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="scheduled">શેડ્યૂલ કરેલ (Scheduled)</option>
                  <option value="live">લાઈવ (Live Now)</option>
                  <option value="draft">ડ્રાફ્ટ (Draft)</option>
                  <option value="completed">પૂર્ણ (Completed)</option>
                  <option value="cancelled">રદ કરેલ (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  પરિણામ પ્રદર્શન (Result Visibility):
                </label>
                <select
                  value={resultVisibility}
                  onChange={(e) => setResultVisibility(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="immediate">તરત જ દર્શાવો (Show Immediately on Submit)</option>
                  <option value="later">શાળા જાહેર કરે ત્યારે (Publish Later)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="randQ"
                  checked={randomizeQuestions}
                  onChange={(e) => setRandomizeQuestions(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 bg-slate-900 border-white/10"
                />
                <label htmlFor="randQ" className="text-xs text-slate-300 cursor-pointer">
                  દરેક વિદ્યાર્થી માટે પ્રશ્નોનો ક્રમ બદલો (Randomize Questions)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Questions Builder (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Action Ribbon: Total Marks, Add Question, AI Import, Question Bank */}
          <div className="p-4 rounded-2xl bg-[#121921] border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center border border-emerald-500/30">
                {questions.length}
              </span>
              <div>
                <div className="text-xs font-bold text-white">કુલ પ્રશ્નો: {questions.length}</div>
                <div className="text-[11px] text-slate-400">કુલ ગુણ: <strong className="text-emerald-400 font-bold">{totalMarks}</strong></div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-600/20 hover:from-amber-500/30 hover:to-orange-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                🤖 AI પ્રશ્ન આયાત (AI Import)
              </button>

              <button
                type="button"
                onClick={() => setShowQuestionBankModal(true)}
                className="px-3 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                પ્રશ્ન બેંક (Question Bank)
              </button>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow"
              >
                <Plus className="w-4 h-4" />
                પ્રશ્ન ઉમેરો
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4">
            {questions.map((q, idx) => {
              return (
                <div
                  key={q.id || idx}
                  className="p-5 rounded-2xl bg-[#121921] border border-white/10 shadow-md transition-all hover:border-white/20"
                >
                  {/* Top Bar of question card */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white">પ્રશ્ન {idx + 1}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Marks */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
                        <span>ગુણ:</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={q.marks || 1}
                          onChange={(e) =>
                            handleUpdateQuestion(idx, 'marks', parseInt(e.target.value) || 1)
                          }
                          className="w-12 px-2 py-1 bg-slate-900 rounded-lg border border-white/10 text-center font-bold text-white text-xs"
                        />
                      </div>

                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30"
                        title="ઉપર ખસેડો"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(idx, 'down')}
                        disabled={idx === questions.length - 1}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30"
                        title="નીચે ખસેડો"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateQuestion(idx)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                        title="ડુપ્લિકેટ કરો"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(idx)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                        title="કાઢી નાખો"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      પ્રશ્ન લખાણ (Question):
                    </label>
                    <textarea
                      rows={2}
                      value={q.questionText}
                      onChange={(e) => handleUpdateQuestion(idx, 'questionText', e.target.value)}
                      placeholder="પ્રશ્નનું લખાણ લખો..."
                      className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Options A, B, C, D */}
                  <div className="space-y-2 mb-3">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      વિકલ્પો અને સાચો જવાબ પસંદ કરો (Options & Correct Answer):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const optKey = `option${opt}` as keyof MCQQuestion;
                        const isCorrect = q.correctAnswer === opt;

                        return (
                          <div
                            key={opt}
                            className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${
                              isCorrect
                                ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/50'
                                : 'bg-slate-900 border-white/10'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleUpdateQuestion(idx, 'correctAnswer', opt)}
                              className={`w-8 h-8 rounded-lg font-bold text-xs shrink-0 flex items-center justify-center transition-all ${
                                isCorrect
                                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
                              }`}
                              title={`વિકલ્પ (${opt}) ને સાચો જવાબ તરીકે પસંદ કરો`}
                            >
                              {opt}
                            </button>
                            <input
                              type="text"
                              value={(q[optKey] as string) || ''}
                              onChange={(e) => handleUpdateQuestion(idx, optKey, e.target.value)}
                              placeholder={`વિકલ્પ (${opt})`}
                              className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none placeholder:text-slate-600"
                            />
                            {isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mr-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Add Question button */}
          <div className="p-4 text-center">
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold inline-flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              નવો પ્રશ્ન ઉમેરો (Add Question)
            </button>
          </div>
        </div>
      </div>

      {/* AI Importer Modal */}
      <AiQuestionImporterModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onImportQuestions={handleAiQuestionsImported}
        standard={standard}
        subject={subject}
      />

      {/* Question Bank Modal */}
      <QuestionBankModal
        isOpen={showQuestionBankModal}
        onClose={() => setShowQuestionBankModal(false)}
        schoolId={schoolId}
        currentStandard={standard}
        currentSubject={subject}
        onSelectQuestions={handleQuestionBankImported}
        currentExamQuestions={questions}
      />

      {/* Interactive Exam Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-[#121921] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col text-[#e4ded6]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                  વિદ્યાર્થી પૂર્વાવલોકન (Student Preview)
                </span>
                <h3 className="text-base font-bold text-white mt-1">{title || 'પરીક્ષાનું નામ'}</h3>
                <p className="text-xs text-slate-400">
                  ધોરણ: {standard} • વિષય: {subject} • સમય: {durationMinutes} મિનિટ • કુલ ગુણ: {totalMarks}
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions preview */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {questions.map((q, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-white/10">
                  <div className="text-xs font-bold text-white mb-2">
                    પ્રશ્ન {idx + 1}. {q.questionText || 'પ્રશ્ન લખાણ...'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                      <div
                        key={opt}
                        className={`p-2 rounded-lg border ${
                          q.correctAnswer === opt
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-semibold'
                            : 'bg-black/20 border-white/5 text-slate-300'
                        }`}
                      >
                        <span className="font-bold mr-1.5">({opt})</span>
                        {q[`option${opt}` as keyof MCQQuestion] || '-'}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Preview Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-900 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                સંપાદન ચાલુ રાખો (Edit Exam)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  validateAndSubmit();
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                પરીક્ષા પબ્લિશ કરો (Publish Exam)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
