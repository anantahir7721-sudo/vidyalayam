import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Edit3,
  Trash2,
  Eye,
  Filter,
  Search,
  Users,
  Sparkles,
  ArrowLeft,
  Timer,
  Layers,
  Award,
  AlertTriangle,
  RefreshCw,
  Copy,
} from 'lucide-react';
import {
  School,
  Student,
  OnlineExam,
  MCQQuestion,
  AllowedStandard,
  OnlineExamType,
  OnlineExamStatus,
} from '../types';
import {
  subscribeToOnlineExams,
  createOnlineExam,
  updateOnlineExam,
  deleteOnlineExam,
  getExamQuestions,
  getServerTime,
  findConflictingExam,
} from '../services/onlineExamService';
import { OnlineExamEditor } from './OnlineExamEditor';
import { OnlineExamAnalyticsModal } from './OnlineExamAnalyticsModal';
import { QuestionBankModal } from './QuestionBankModal';

interface OnlineExamManagerProps {
  school: School;
  students: Student[];
  onBack: () => void;
}

export const OnlineExamManager: React.FC<OnlineExamManagerProps> = ({
  school,
  students,
  onBack,
}) => {
  const [exams, setExams] = useState<OnlineExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OnlineExamType>('school_exam');
  const [selectedStandard, setSelectedStandard] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [serverTime, setServerTime] = useState<number>(Date.now());

  // Editor Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editingExam, setEditingExam] = useState<OnlineExam | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<MCQQuestion[]>([]);
  const [isCloneAsNew, setIsCloneAsNew] = useState(false);

  // Helper: check if exam is completed or its time has expired
  const isExamConcluded = (exam: OnlineExam) => {
    if (exam.status === 'completed') return true;
    if (exam.scheduledStartTimestamp && exam.durationMinutes) {
      const endTimestamp = exam.scheduledStartTimestamp + Number(exam.durationMinutes) * 60 * 1000;
      if (serverTime > endTimestamp) return true;
    }
    return false;
  };

  // Analytics Modal
  const [analyticsExam, setAnalyticsExam] = useState<OnlineExam | null>(null);

  // Question Bank Modal
  const [showQuestionBank, setShowQuestionBank] = useState(false);

  // Delete Confirmation Modal
  const [deleteTargetExam, setDeleteTargetExam] = useState<OnlineExam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Real-time listener for exams
  useEffect(() => {
    if (!school.id) return;
    setLoading(true);

    const unsubscribe = subscribeToOnlineExams(school.id, (loadedExams) => {
      setExams(loadedExams);
      setLoading(false);
    });

    // Sync server time
    getServerTime().then((st) => setServerTime(st));
    const timerInterval = setInterval(() => {
      setServerTime((prev) => prev + 1000);
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timerInterval);
    };
  }, [school.id]);

  // Filtered Exams
  const filteredExams = useMemo(() => {
    return exams.filter((ex) => {
      // Tab filter (School Exam vs Extra Exam)
      if (ex.examType !== activeTab) return false;

      // Standard filter
      if (selectedStandard !== 'all' && ex.standard !== selectedStandard && ex.standard !== 'all') {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && ex.status !== selectedStatus) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = ex.title.toLowerCase().includes(q);
        const matchesSubject = ex.subject.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubject) return false;
      }

      return true;
    });
  }, [exams, activeTab, selectedStandard, selectedStatus, searchQuery]);

  // Handle Create / Edit Save
  const handleSaveExam = async (examPayload: any, questions: MCQQuestion[]) => {
    const isCompleted = editingExam ? isExamConcluded(editingExam) : false;
    const shouldCreateNew = !editingExam || isCloneAsNew || isCompleted;

    // Validate time clash against other exams
    const conflict = findConflictingExam(
      exams,
      examPayload.scheduledDate,
      examPayload.scheduledStartTime,
      examPayload.durationMinutes,
      shouldCreateNew ? undefined : editingExam?.id,
      examPayload.standard
    );

    if (conflict) {
      const confDate = conflict.scheduledDate;
      const confTime = conflict.scheduledStartTime;
      const confTitle = conflict.title;
      const confStd = conflict.standard;
      throw new Error(
        `આ સમયે (તારીખ: ${confDate}, સમય: ${confTime}) પહેલેથી જ ધોરણ ${confStd} માટે '${confTitle}' પરીક્ષા નિર્ધારિત થયેલ છે. શાળા દ્વારા એક જ સમયે બે પરીક્ષાઓ રાખી શકાતી નથી. કૃપા કરીને અલગ તારીખ અથવા સમય પસંદ કરો.`
      );
    }

    if (!shouldCreateNew && editingExam) {
      // Update uncompleted/draft exam
      await updateOnlineExam(school.id, editingExam.id, examPayload, questions);
    } else {
      // Strictly create a new exam entry: 1 exam = 1 result. Completed exam results are preserved!
      await createOnlineExam(school.id, examPayload, questions);
    }
    setIsEditing(false);
    setEditingExam(null);
    setEditingQuestions([]);
    setIsCloneAsNew(false);
  };

  // Launch Editor for brand new exam
  const handleOpenCreate = () => {
    setEditingExam(null);
    setEditingQuestions([]);
    setIsCloneAsNew(false);
    setIsEditing(true);
  };

  // Launch Editor to retake / create new entry from existing exam (1 exam = 1 result)
  const handleOpenRetakeNew = async (exam: OnlineExam) => {
    const qs = await getExamQuestions(school.id, exam.id);
    setEditingExam(exam);
    setEditingQuestions(qs);
    setIsCloneAsNew(true);
    setIsEditing(true);
  };

  // Launch Editor for existing exam
  const handleOpenEdit = async (exam: OnlineExam) => {
    const qs = await getExamQuestions(school.id, exam.id);
    const concluded = isExamConcluded(exam);
    setEditingExam(exam);
    setEditingQuestions(qs);
    // If exam is already completed or ended, editing it MUST create a new entry to preserve student marks!
    setIsCloneAsNew(concluded);
    setIsEditing(true);
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetExam) return;
    setIsDeleting(true);
    try {
      await deleteOnlineExam(school.id, deleteTargetExam.id);
      setDeleteTargetExam(null);
    } catch (e) {
      console.error('Error deleting exam:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper for humanized countdown text
  const formatCountdown = (startTimestamp: number) => {
    const diffMs = startTimestamp - serverTime;
    if (diffMs <= 0) return 'શરૂ થઈ ગઈ છે';
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} દિવસ પછી`;
    if (hours > 0) return `${hours} કલાક ${mins % 60} મિનિટ પછી`;
    return `${mins} મિનિટ પછી`;
  };

  // If currently in Editor view, render OnlineExamEditor
  if (isEditing) {
    return (
      <OnlineExamEditor
        schoolId={school.id}
        existingExam={editingExam}
        existingQuestions={editingQuestions}
        allExams={exams}
        isCloneAsNew={isCloneAsNew}
        onSave={handleSaveExam}
        onCancel={() => {
          setIsEditing(false);
          setEditingExam(null);
          setEditingQuestions([]);
          setIsCloneAsNew(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-white/10 shadow-md dark:shadow-xl">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-wide">
                  📝 ઓનલાઇન MCQ પરીક્ષા વ્યવસ્થાપન (Online Exam Management)
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  શાળાકીય અને વધારાની MCQ પરીક્ષાઓનું આયોજન, પ્રશ્ન બેંક, AI આયાત અને પરિણામ એનાલિટિક્સ
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowQuestionBank(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-500/20 hover:bg-teal-100 dark:hover:bg-teal-500/30 border border-teal-300 dark:border-teal-500/40 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            પ્રશ્ન બેંક (Question Bank)
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-emerald-900/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            નવી પરીક્ષા બનાવો (Create Exam)
          </button>
        </div>
      </div>

      {/* Main Tabs: School Exams vs Extra Exams */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-sm">
        {/* Segmented Tab Controls */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('school_exam')}
            className={`py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'school_exam'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🏫 શાળાકીય પરીક્ષાઓ (School Exams)
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'school_exam' ? 'bg-black/30 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              {exams.filter((e) => e.examType === 'school_exam').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('extra_exam')}
            className={`py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'extra_exam'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🎯 એક્સ્ટ્રા / ક્વિઝ (Extra Exams & Quizzes)
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'extra_exam' ? 'bg-black/30 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              {exams.filter((e) => e.examType === 'extra_exam').length}
            </span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl justify-end">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="પરીક્ષા શોધો..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Standard Filter */}
          <select
            value={selectedStandard}
            onChange={(e) => setSelectedStandard(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">બધા ધોરણ</option>
            <option value="9">ધોરણ 9</option>
            <option value="10">ધોરણ 10</option>
            <option value="11">ધોરણ 11</option>
            <option value="12">ધોરણ 12</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">બધી સ્થિતિ</option>
            <option value="live">લાઈવ (Live)</option>
            <option value="scheduled">શેડ્યૂલ કરેલ (Scheduled)</option>
            <option value="completed">પૂર્ણ (Completed)</option>
            <option value="draft">ડ્રાફ્ટ (Draft)</option>
          </select>
        </div>
      </div>

      {/* Notice regarding Extra Exams */}
      {activeTab === 'extra_exam' && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
          <div className="text-amber-900 dark:text-amber-200">
            <strong className="font-bold text-amber-950 dark:text-amber-100">નોંધ (Extra Exams):</strong> સામાન્ય જ્ઞાન (GK), ક્વિઝ કે સ્પર્ધાત્મક કસોટીઓ સત્તાવાર શૈક્ષણિક પ્રગતિપત્રક (Official Marks/Results) થી સંપૂર્ણપણે સ્વતંત્ર છે. તમે કોઈપણ સમયે આ પરીક્ષાઓનું સંચાલન અથવા સફાઈ કરી શકો છો.
          </div>
        </div>
      )}

      {/* Exams Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
          <span>ઓનલાઇન પરીક્ષાઓ લોડ થઈ રહી છે...</span>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">કોઈ પરીક્ષા મળી નથી</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {activeTab === 'school_exam'
              ? 'કમ્પ્યુટર, પી.ટી., ચિત્રકામ કે ઉદ્યોગ વિષયો માટે નવી MCQ પરીક્ષા બનાવો.'
              : 'સામાન્ય જ્ઞાન કે ક્વિઝ સ્પર્ધા માટે નવી એક્સ્ટ્રા પરીક્ષા બનાવો.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingExam(null);
              setEditingQuestions([]);
              setIsEditing(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            હમણાં જ બનાવો
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam) => {
            const isLive =
              exam.status === 'live' ||
              (exam.status === 'scheduled' &&
                 exam.scheduledStartTimestamp &&
                 serverTime >= exam.scheduledStartTimestamp);

            return (
              <div
                key={exam.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg flex flex-col justify-between transition-all hover:border-emerald-500/40 group"
              >
                {/* Header: Subject badge & Status badge */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10">
                      ધોરણ {exam.standard} • {exam.subject}
                    </span>

                    {/* Status Badge */}
                    {isLive ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                        <span className="text-emerald-800 dark:text-emerald-300 font-bold">લાઈવ (Live)</span>
                      </span>
                    ) : exam.status === 'scheduled' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-700 dark:text-blue-300" />
                        <span className="text-blue-800 dark:text-blue-300 font-bold">શેડ્યૂલ</span>
                      </span>
                    ) : exam.status === 'completed' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
                        <span className="text-purple-800 dark:text-purple-300 font-bold">પૂર્ણ (Completed)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-500/30">
                        <span className="text-slate-700 dark:text-slate-300 font-bold">ડ્રાફ્ટ (Draft)</span>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                    {exam.title}
                  </h3>

                  {/* Countdown Notice if scheduled */}
                  {exam.status === 'scheduled' &&
                    exam.scheduledStartTimestamp &&
                    serverTime < exam.scheduledStartTimestamp && (
                      <div className="mb-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 shrink-0 text-blue-700 dark:text-blue-300" />
                        <span>શરૂ થવામાં: <strong className="text-blue-900 dark:text-blue-200">{formatCountdown(exam.scheduledStartTimestamp)}</strong></span>
                      </div>
                    )}

                  {/* Details: Date, Time, Duration, Questions */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-4 pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>તારીખ: <strong className="text-slate-800 dark:text-slate-300">{exam.scheduledDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>સમય: <strong className="text-slate-800 dark:text-slate-300">{exam.scheduledStartTime}</strong> ({exam.durationMinutes} મિનિટ)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span>પ્રશ્નો: <strong className="text-slate-800 dark:text-slate-300">{exam.questionsCount}</strong> • કુલ ગુણ: <strong className="text-emerald-600 dark:text-emerald-400">{exam.totalMarks}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Results / Analytics */}
                    <button
                      type="button"
                      onClick={() => setAnalyticsExam(exam)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="વિદ્યાર્થી પરિણામ અને પ્રશ્નવાર એનાલિટિક્સ"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold">પરિણામ</span>
                    </button>

                    {/* Edit or Retake New Entry */}
                    {isExamConcluded(exam) ? (
                      <button
                        type="button"
                        onClick={() => handleOpenRetakeNew(exam)}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25 text-cyan-900 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="આ પરીક્ષા ફરીથી લેવા માટે નવી એન્ટ્રી બનાવો (અગાઉનું પરિણામ સુરક્ષિત રહેશે)"
                      >
                        <Copy className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-300" />
                        <span className="text-cyan-900 dark:text-cyan-300 font-bold">ફરી પરીક્ષા / નવી એન્ટ્રી</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(exam)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5 transition-colors cursor-pointer"
                        title="પરીક્ષા સુધારો"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => setDeleteTargetExam(exam)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-white/5 dark:hover:bg-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-white/5 transition-colors cursor-pointer"
                    title="પરીક્ષા કાઢી નાખો"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Analytics Modal */}
      {analyticsExam && (
        <OnlineExamAnalyticsModal
          isOpen={Boolean(analyticsExam)}
          onClose={() => setAnalyticsExam(null)}
          exam={analyticsExam}
          schoolId={school.id}
          allStudents={students}
        />
      )}

      {/* Question Bank Modal */}
      <QuestionBankModal
        isOpen={showQuestionBank}
        onClose={() => setShowQuestionBank(false)}
        schoolId={school.id}
        currentStandard="all"
        currentSubject="all"
        onSelectQuestions={() => {}}
      />

      {/* Delete Confirmation Modal */}
      {deleteTargetExam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121921] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl text-[#e4ded6] max-h-[88dvh] overflow-y-auto my-auto animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">
                શું તમે આ પરીક્ષા કાઢી નાખવા માંગો છો?
              </h3>
              <p className="text-xs text-slate-400">
                "{deleteTargetExam.title}" અને તેના હેઠળના તમામ પ્રશ્નો તથા વિદ્યાર્થીઓના સબમિશન કાયમ માટે દૂર થશે.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetExam(null)}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold"
              >
                રદ કરો (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 disabled:opacity-50"
              >
                {isDeleting ? 'કાઢી રહ્યું છે...' : 'હા, કાઢી નાખો'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
