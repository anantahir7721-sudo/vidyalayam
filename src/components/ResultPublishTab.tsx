import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Award,
  BookOpen,
  Check,
  X,
  Share2,
} from 'lucide-react';
import { School, Student, MarkRecord, ExamReleaseConfig } from '../types';
import {
  getExamReleaseConfigs,
  subscribeExamReleaseConfigs,
  saveExamReleaseConfig,
  toggleSubjectReleaseStatus,
  toggleWholeExamReleaseStatus,
} from '../services/firestoreService';
import { notifyResultRelease } from '../services/notificationService';

export interface ResultPublishTabProps {
  school: School;
  students: Student[];
  marks: MarkRecord[];
  selectedStandard: string;
  onSelectStandard?: (std: string) => void;
  subjects: Array<{
    id: string;
    code?: string;
    nameGu: string;
    nameEn: string;
    isMainSubject?: boolean;
    isPrayogik?: boolean;
    hasPractical?: boolean;
  }>;
}

interface ExamOption {
  id: string;
  nameGu: string;
  nameEn: string;
  defaultMaxMarks: number;
}

export const ResultPublishTab: React.FC<ResultPublishTabProps> = ({
  school,
  students,
  marks,
  selectedStandard,
  onSelectStandard,
  subjects,
}) => {
  // Exams available for selection
  const examOptions: ExamOption[] = useMemo(() => {
    if (selectedStandard === '10') {
      return [
        { id: 'first_exam', nameGu: 'પ્રથમ પરીક્ષા', nameEn: 'First Exam (80M)', defaultMaxMarks: 80 },
        { id: 'second_exam', nameGu: 'પ્રિલિમ (દ્વિતીય) પરીક્ષા', nameEn: 'Preliminary Exam (80M)', defaultMaxMarks: 80 },
        { id: 'annual_exam', nameGu: 'વાર્ષિક / બોર્ડ આખરી પરિણામ', nameEn: 'Board Final Result (100M)', defaultMaxMarks: 100 },
      ];
    }
    return [
      { id: 'first_exam', nameGu: 'પ્રથમ પરીક્ષા', nameEn: 'First Exam (50M)', defaultMaxMarks: 50 },
      { id: 'second_exam', nameGu: 'દ્વિતીય પરીક્ષા', nameEn: 'Second Exam (50M)', defaultMaxMarks: 50 },
      { id: 'annual_exam', nameGu: 'વાર્ષિક પરીક્ષા', nameEn: 'Annual Exam (80M / 100M)', defaultMaxMarks: 80 },
    ];
  }, [selectedStandard]);

  const [selectedExamId, setSelectedExamId] = useState<string>('first_exam');
  const [releaseConfigs, setReleaseConfigs] = useState<ExamReleaseConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifyingSubjectId, setNotifyingSubjectId] = useState<string | null>(null);
  const [notifyingWholeExam, setNotifyingWholeExam] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Subscribe to real-time release configurations
  useEffect(() => {
    if (!school?.id) return;
    const unsub = subscribeExamReleaseConfigs(school.id, (configs) => {
      setReleaseConfigs(configs);
    });
    return () => unsub();
  }, [school?.id]);

  // Current Exam Definition
  const currentExam = useMemo(() => {
    return examOptions.find((e) => e.id === selectedExamId) || examOptions[0];
  }, [examOptions, selectedExamId]);

  // Current Release Config for selected standard & exam
  const currentConfigKey = `${selectedStandard}_${selectedExamId}`;
  const currentConfig = useMemo(() => {
    const found = releaseConfigs.find(
      (c) => c.standard === selectedStandard && c.examId === selectedExamId
    );
    if (found) return found;

    return {
      id: currentConfigKey,
      schoolId: school?.id || '',
      standard: selectedStandard,
      examId: selectedExamId,
      examName: currentExam.nameGu,
      isWholeExamReleased: false,
      releasedSubjectIds: [],
      subjectReleasedAt: {},
    } as ExamReleaseConfig;
  }, [releaseConfigs, selectedStandard, selectedExamId, currentConfigKey, school?.id, currentExam.nameGu]);

  // Filter students belonging to this standard
  const standardStudents = useMemo(() => {
    return students.filter((s) => {
      const std = String(s.standard || '').trim().replace(/^class\s*/i, '');
      return std === selectedStandard || std.startsWith(selectedStandard);
    });
  }, [students, selectedStandard]);

  // Count how many students have marks entered for each subject in this exam
  const subjectMarksStats = useMemo(() => {
    const stats: Record<string, number> = {};
    const stdStudentIds = new Set(standardStudents.map((s) => s.id));

    subjects.forEach((subj) => {
      let count = 0;
      marks.forEach((m) => {
        if (!stdStudentIds.has(m.studentId)) return;
        const sId = (m.subjectId || '').toLowerCase().trim();
        const mExId = ((m as any).examId || '').toLowerCase().trim();
        const mDocId = (m.id || '').toLowerCase().trim();

        const isSubMatch = sId === subj.id.toLowerCase().trim();
        const isExamMatch =
          mExId === selectedExamId ||
          mDocId.includes(`_${selectedExamId}_`) ||
          (selectedExamId === 'first_exam' && (mExId.includes('first') || mExId.includes('pratham'))) ||
          (selectedExamId === 'second_exam' && (mExId.includes('second') || mExId.includes('dwitiya') || mExId.includes('prelim'))) ||
          (selectedExamId === 'annual_exam' && (mExId.includes('annual') || mExId.includes('varshik') || mExId.includes('board')));

        if (isSubMatch && isExamMatch && m.totalObtained !== undefined && m.totalObtained !== null) {
          count++;
        }
      });
      stats[subj.id] = count;
    });

    return stats;
  }, [subjects, marks, standardStudents, selectedExamId]);

  // Auto-dismiss status message after 4 seconds
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  // Handler: Toggle whole exam release
  const handleToggleWholeExam = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const newStatus = !currentConfig.isWholeExamReleased;
      await toggleWholeExamReleaseStatus(
        school.id,
        selectedStandard,
        selectedExamId,
        currentExam.nameGu,
        newStatus
      );

      setStatusMessage({
        text: newStatus
          ? `✅ ${currentExam.nameGu} નું સમગ્ર પરિણામ સફળતાપૂર્વક જાહેર કરવામાં આવ્યું છે!`
          : `🔒 ${currentExam.nameGu} નું સમગ્ર પરિણામ અપ્રગટ (Draft) કરવામાં આવ્યું છે.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error toggling whole exam:', err);
      setStatusMessage({ text: 'પરિણામ સ્થિતિ અપડેટ કરવામાં સમસ્યા થઈ.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handler: Send Push Notification for Whole Exam
  const handleSendWholeExamNotification = async () => {
    if (!school?.id) return;
    if (standardStudents.length === 0) {
      setStatusMessage({ text: 'ધોરણમાં કોઈ વિદ્યાર્થીઓ મળ્યા નથી.', type: 'error' });
      return;
    }

    setNotifyingWholeExam(true);
    try {
      const count = await notifyResultRelease({
        schoolId: school.id,
        schoolName: school.schoolName || 'શાળા પોર્ટલ',
        standard: selectedStandard,
        examId: selectedExamId,
        examName: currentExam.nameGu,
        isWholeExam: true,
        students: standardStudents.map((s) => ({
          id: s.id,
          studentName: s.studentName,
          grNumber: s.grNumber,
        })),
      });

      setStatusMessage({
        text: `📢 ધોરણ ${selectedStandard} ના ${count || standardStudents.length} વિદ્યાર્થીઓને પુશ નોટિફિકેશન મોકલી દેવાયું!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error sending whole exam notification:', err);
      setStatusMessage({ text: 'નોટિફિકેશન મોકલવામાં ક્ષતિ થઈ.', type: 'error' });
    } finally {
      setNotifyingWholeExam(false);
    }
  };

  // Handler: Toggle individual subject release
  const handleToggleSubject = async (subjectId: string, subjectName: string) => {
    if (!school?.id) return;
    const isCurrentlyReleased = (currentConfig.releasedSubjectIds || []).includes(subjectId);
    const newStatus = !isCurrentlyReleased;

    try {
      await toggleSubjectReleaseStatus(
        school.id,
        selectedStandard,
        selectedExamId,
        currentExam.nameGu,
        subjectId,
        newStatus
      );

      setStatusMessage({
        text: newStatus
          ? `✅ "${subjectName}" ના ગુણ સફળતાપૂર્વક જાહેર કર્યા!`
          : `🔒 "${subjectName}" ના ગુણ અપ્રગટ કર્યા.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error toggling subject release:', err);
      setStatusMessage({ text: 'વિષય સ્થિતિ સાચવવામાં સમસ્યા થઈ.', type: 'error' });
    }
  };

  // Handler: Send Push Notification for Individual Subject
  const handleSendSubjectNotification = async (subjectId: string, subjectName: string) => {
    if (!school?.id) return;
    if (standardStudents.length === 0) {
      setStatusMessage({ text: 'ધોરણમાં કોઈ વિદ્યાર્થીઓ મળ્યા નથી.', type: 'error' });
      return;
    }

    setNotifyingSubjectId(subjectId);
    try {
      const count = await notifyResultRelease({
        schoolId: school.id,
        schoolName: school.schoolName || 'શાળા પોર્ટલ',
        standard: selectedStandard,
        examId: selectedExamId,
        examName: currentExam.nameGu,
        subjectName,
        isWholeExam: false,
        students: standardStudents.map((s) => ({
          id: s.id,
          studentName: s.studentName,
          grNumber: s.grNumber,
        })),
      });

      setStatusMessage({
        text: `📢 ધોરણ ${selectedStandard} ના છાત્રોને "${subjectName}" ના ગુણ અંગે પુશ નોટિફિકેશન મોકલાયું!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error sending subject notification:', err);
      setStatusMessage({ text: 'નોટિફિકેશન મોકલવામાં ક્ષતિ થઈ.', type: 'error' });
    } finally {
      setNotifyingSubjectId(null);
    }
  };

  // Handler: Bulk Release or Unrelease all subjects
  const handleBulkReleaseSubjects = async (releaseAll: boolean) => {
    if (!school?.id) return;
    setLoading(true);
    const now = new Date().toISOString();
    try {
      const releasedIds = releaseAll ? subjects.map((s) => s.id) : [];
      const subjectTimes: Record<string, string> = {};
      if (releaseAll) {
        subjects.forEach((s) => {
          subjectTimes[s.id] = now;
        });
      }

      const updated: ExamReleaseConfig = {
        ...currentConfig,
        releasedSubjectIds: releasedIds,
        subjectReleasedAt: releaseAll ? subjectTimes : {},
        updatedAt: now,
      };

      await saveExamReleaseConfig(school.id, updated);
      setStatusMessage({
        text: releaseAll
          ? `✅ તમામ ${subjects.length} વિષયોના ગુણ જાહેર કરવામાં આવ્યા!`
          : `🔒 તમામ વિષયોના ગુણ અપ્રગટ કર્યા.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error bulk releasing:', err);
      setStatusMessage({ text: 'વિષયો સાચવવામાં સમસ્યા થઈ.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const releasedCount = (currentConfig.releasedSubjectIds || []).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast Notification Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-md transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/50 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl space-y-3 border border-purple-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-bold">
              <Bell className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
              <span>વિદ્યાર્થી પોર્ટલ પરિણામ પ્રકાશન & પુશ નોટિફિકેશન સિસ્ટમ</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-wide text-white">
              સિલેક્ટિવ પરિણામ પ્રકાશન નિયંત્રણ (Result Publishing Control)
            </h2>
            <p className="text-xs text-purple-200/90 max-w-2xl leading-relaxed">
              શાળા કોઈપણ એક વિષયના ગુણ અથવા સમગ્ર પરીક્ષાનું પરિણામ જ્યારે ઈચ્છે ત્યારે જાહેર કરી શકે છે.
              જે વિષય જાહેર થશે તે જ વિદ્યાર્થી પોર્ટલમાં દેખાશે, બાકીના વિષયોમાં ડેશ (-) રહેશે.
              પરિણામ જાહેર થતાં જ વિદ્યાર્થીઓના ફોનમાં પુશ નોટિફિકેશન જશે અને ક્લિક કરતાં સીધા પરિણામ પેજ પર લઈ જશે.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 border border-white/15 text-center">
              <span className="text-[10px] uppercase text-purple-200 block font-bold">વિદ્યાર્થીઓ</span>
              <strong className="text-sm sm:text-base font-black text-white">{standardStudents.length}</strong>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 border border-white/15 text-center">
              <span className="text-[10px] uppercase text-purple-200 block font-bold">જાહેર વિષયો</span>
              <strong className="text-sm sm:text-base font-black text-emerald-400">{releasedCount} / {subjects.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Select Exam Strip */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">પરીક્ષા પસંદ કરો:</span>
          {examOptions.map((ex) => {
            const isSelected = selectedExamId === ex.id;
            const exCfg = releaseConfigs.find((c) => c.standard === selectedStandard && c.examId === ex.id);
            const isWholeLive = Boolean(exCfg?.isWholeExamReleased);
            const subCount = exCfg?.releasedSubjectIds?.length || 0;

            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => setSelectedExamId(ex.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#C45A2D] text-white shadow-sm ring-2 ring-[#C45A2D]/30'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5'
                }`}
              >
                <span>{ex.nameGu}</span>
                {isWholeLive ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500 text-white font-extrabold">
                    સમગ્ર જાહેર
                  </span>
                ) : subCount > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-blue-500 text-white font-bold">
                    {subCount} વિષય
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-300 dark:bg-white/15 text-slate-700 dark:text-slate-300">
                    અપ્રગટ
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          ધોરણ: <strong className="text-slate-900 dark:text-white font-bold">{selectedStandard}</strong>
        </div>
      </div>

      {/* Section 1: Whole Exam Release Card */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border-2 transition-all space-y-4 shadow-sm ${
          currentConfig.isWholeExamReleased
            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-500/50'
            : 'bg-white dark:bg-[#121921] border-slate-200 dark:border-white/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                ૧. સમગ્ર પરીક્ષા પરિણામ જાહેર કરો ({currentExam.nameGu})
              </span>
              {currentConfig.isWholeExamReleased ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-500/40 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  વિદ્યાર્થી પોર્ટલ પર લાઈવ (સત્તાવાર પરિણામ જાહેર)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-white/10 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  અપ્રગટ / ડ્રાફ્ટ (વિદ્યાર્થીઓને ટકાવારી/કુલ ગુણ દેખાશે નહીં)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              આ સ્વિચ ON કરવાથી વિદ્યાર્થીઓને તેમના લૉગિનમાં સમગ્ર પરીક્ષાનું આખરી પરિણામ, કુલ ગુણ, ટકાવારી (%), અને રેન્ક/ગ્રેડ દેખાશે.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle Switch */}
            <button
              type="button"
              disabled={loading}
              onClick={handleToggleWholeExam}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                currentConfig.isWholeExamReleased ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  currentConfig.isWholeExamReleased ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>

            {/* Direct Push Notify Button */}
            <button
              type="button"
              disabled={notifyingWholeExam || standardStudents.length === 0}
              onClick={handleSendWholeExamNotification}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {notifyingWholeExam ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>મોકલી રહ્યા છીએ...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>વિદ્યાર્થીઓને પુશ મોકલો</span>
                </>
              )}
            </button>
          </div>
        </div>

        {currentConfig.releasedAt && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-white/5">
            છેલ્લે જાહેર તારીખ: <strong className="text-slate-700 dark:text-slate-300">{new Date(currentConfig.releasedAt).toLocaleString('gu-IN')}</strong>
          </div>
        )}
      </div>

      {/* Section 2: Selective Subject-wise Release Grid */}
      <div className="space-y-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>૨. વિષય મુજબ પરિણામ પ્રકાશન (Selective Subject Marks Release)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 font-semibold">
                {releasedCount} / {subjects.length} સક્રિય
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              શાળા જે વિષય સક્રિય (ON) કરશે, વિદ્યાર્થી માત્ર તે વિષયના ગુણ જોઈ શકશે. બાકીના વિષયોમાં ડેશ (-) દેખાશે.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleBulkReleaseSubjects(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer"
            >
              બધા વિષયો જાહેર કરો
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleBulkReleaseSubjects(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
            >
              બધા અપ્રગટ કરો
            </button>
          </div>
        </div>

        {/* Subjects List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {subjects.map((subj) => {
            const isReleased = (currentConfig.releasedSubjectIds || []).includes(subj.id);
            const marksFilledCount = subjectMarksStats[subj.id] || 0;
            const isNotifying = notifyingSubjectId === subj.id;
            const releasedDate = currentConfig.subjectReleasedAt?.[subj.id];

            return (
              <div
                key={subj.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isReleased
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40 ring-1 ring-emerald-500/20'
                    : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      કોડ: {subj.code || '--'}
                    </span>

                    {isReleased ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        લાઈવ (જાહેર)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                        અપ્રગટ (બાકી)
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5 leading-snug">
                    {subj.nameGu}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {subj.nameEn}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-2">
                    <span>
                      ગુણ એન્ટ્રી:{' '}
                      <strong className={`font-mono ${marksFilledCount > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {marksFilledCount} / {standardStudents.length}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleSubject(subj.id, subj.nameGu)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isReleased
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isReleased ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>જાહેર થયેલ</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>જાહેર કરો</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Send Subject Push Notification Button */}
                  <button
                    type="button"
                    disabled={isNotifying || standardStudents.length === 0}
                    onClick={() => handleSendSubjectNotification(subj.id, subj.nameGu)}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-500/30 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    title={`ધોરણ ${selectedStandard} ના વિદ્યાર્થીઓને ${subj.nameGu} ના ગુણ અંગે નોટિફિકેશન મોકલો`}
                  >
                    {isNotifying ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="hidden sm:inline">પુશ નોટિફિકેશન</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
