import React, { useState, useMemo, useEffect } from 'react';
import { School, Student, MarkRecord, OnlineExam, ExamAttempt, AllowedStandard, ParentMessageRecipient } from '../types';
import {
  Award,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Sparkles,
  Search,
  Filter,
  Check,
  ChevronDown,
  X,
  FileSpreadsheet,
  AlertCircle,
  Smartphone,
  Eye,
} from 'lucide-react';
import {
  formatOfflineExamResultForParent,
  formatOnlineExamResultForParent,
} from '../utils/parentMessageUtils';
import { getOnlineExams, getExamAttempts } from '../services/onlineExamService';
import { ParentMessageDispatcherModal } from './ParentMessageDispatcherModal';

interface SendExamResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  students: Student[];
  marks: MarkRecord[];
  initialStandard?: AllowedStandard;
  initialOnlineExam?: OnlineExam;
  initialExamAttempts?: ExamAttempt[];
  onRefresh?: () => void;
}

export const SendExamResultModal: React.FC<SendExamResultModalProps> = ({
  isOpen,
  onClose,
  school,
  students,
  marks,
  initialStandard = '9',
  initialOnlineExam,
  initialExamAttempts,
  onRefresh,
}) => {
  // Mode: Offline Exam (Ekam Kasoti, Term, Annual) vs Online MCQ Exam
  const [examCategory, setExamCategory] = useState<'offline' | 'online'>(
    initialOnlineExam ? 'online' : 'offline'
  );

  // Offline Exam Filters
  const [selectedStandard, setSelectedStandard] = useState<AllowedStandard>(initialStandard);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [offlineExamType, setOfflineExamType] = useState<string>('પ્રથમ પરીક્ષા');
  const [offlineSubject, setOfflineSubject] = useState<string>('all'); // for ekam kasoti

  // Online Exam Filters
  const [onlineExams, setOnlineExams] = useState<OnlineExam[]>([]);
  const [selectedOnlineExamId, setSelectedOnlineExamId] = useState<string>(initialOnlineExam?.id || '');
  const [onlineAttempts, setOnlineAttempts] = useState<ExamAttempt[]>(initialExamAttempts || []);
  const [isLoadingOnline, setIsLoadingOnline] = useState(false);

  // Common Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'has_phone' | 'no_phone'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectionError, setSelectionError] = useState<string | null>(null);

  // Dispatcher Modal State
  const [dispatcherOpen, setDispatcherOpen] = useState(false);
  const [preparedRecipients, setPreparedRecipients] = useState<ParentMessageRecipient[]>([]);

  // Load online exams if category is online
  useEffect(() => {
    if (isOpen && school?.id && examCategory === 'online') {
      loadOnlineExamsList();
    }
  }, [isOpen, school?.id, examCategory]);

  const loadOnlineExamsList = async () => {
    if (!school?.id) return;
    setIsLoadingOnline(true);
    try {
      const list = await getOnlineExams(school.id);
      setOnlineExams(list);
      if (list.length > 0 && !selectedOnlineExamId) {
        setSelectedOnlineExamId(list[0].id);
      }
    } catch (err) {
      console.error('Error fetching online exams:', err);
    } finally {
      setIsLoadingOnline(false);
    }
  };

  // Load attempts for selected online exam
  useEffect(() => {
    if (examCategory === 'online' && selectedOnlineExamId && school?.id) {
      if (initialOnlineExam && initialOnlineExam.id === selectedOnlineExamId && initialExamAttempts) {
        setOnlineAttempts(initialExamAttempts);
      } else {
        loadExamAttempts(selectedOnlineExamId);
      }
    }
  }, [examCategory, selectedOnlineExamId, school?.id]);

  const loadExamAttempts = async (examId: string) => {
    if (!school?.id) return;
    setIsLoadingOnline(true);
    try {
      const atts = await getExamAttempts(school.id, examId);
      setOnlineAttempts(atts);
    } catch (err) {
      console.error('Error loading online exam attempts:', err);
    } finally {
      setIsLoadingOnline(false);
    }
  };

  // Active online exam object
  const activeOnlineExam = useMemo(() => {
    if (initialOnlineExam && initialOnlineExam.id === selectedOnlineExamId) return initialOnlineExam;
    return onlineExams.find((e) => e.id === selectedOnlineExamId) || null;
  }, [onlineExams, selectedOnlineExamId, initialOnlineExam]);

  // Available sections for current standard
  const availableSections = useMemo(() => {
    const set = new Set<string>();
    students.forEach((st) => {
      if (String(st.standard).replace(/^class\s*/i, '') === selectedStandard) {
        const sec = st.section || st.division;
        if (sec) set.add(sec);
      }
    });
    return Array.from(set).sort();
  }, [students, selectedStandard]);

  // Available offline exam types found in marks or standard defaults
  const availableOfflineExams = useMemo(() => {
    const list = [
      'એકમ કસોટી – 1',
      'એકમ કસોટી – 2',
      'એકમ કસોટી – 3',
      'એકમ કસોટી – 4',
      'એકમ કસોટી – 5',
      'પ્રથમ પરીક્ષા',
      'દ્વિતીય પરીક્ષા',
      'વાર્ષિક પરીક્ષા',
    ];
    // Collect any other custom ones from marks
    marks.forEach((m) => {
      if (m.examType && !list.includes(m.examType)) {
        list.push(m.examType);
      }
    });
    return list;
  }, [marks]);

  // Available subjects for selected offline exam
  const availableSubjectsForOffline = useMemo(() => {
    const subs = new Set<string>();
    marks.forEach((m) => {
      if (
        String(m.standard).replace(/^class\s*/i, '') === selectedStandard &&
        m.examType === offlineExamType
      ) {
        if (m.subjectName) subs.add(m.subjectName);
        if (m.subjects && m.subjects.length > 0) {
          m.subjects.forEach((s) => subs.add(s.subjectName));
        }
      }
    });
    return Array.from(subs).sort();
  }, [marks, selectedStandard, offlineExamType]);

  // Filter students based on standard, section, exam eligibility
  const eligibleStudents = useMemo(() => {
    let list = students;
    if (examCategory === 'offline') {
      list = list.filter((st) => String(st.standard).replace(/^class\s*/i, '') === selectedStandard);
      if (selectedSection !== 'all') {
        list = list.filter((st) => (st.section || st.division) === selectedSection);
      }
    } else {
      if (activeOnlineExam && activeOnlineExam.standard && activeOnlineExam.standard !== 'all') {
        list = list.filter(
          (st) => String(st.standard).replace(/^class\s*/i, '') === String(activeOnlineExam.standard).replace(/^class\s*/i, '')
        );
      }
    }

    // Phone status filter
    if (phoneFilter === 'has_phone') {
      list = list.filter((st) => Boolean(st.contactNumber || st.mobileNumber));
    } else if (phoneFilter === 'no_phone') {
      list = list.filter((st) => !Boolean(st.contactNumber || st.mobileNumber));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (st) =>
          st.studentName.toLowerCase().includes(q) ||
          (st.rollNumber && st.rollNumber.includes(q)) ||
          (st.grNumber && st.grNumber.toLowerCase().includes(q))
      );
    }

    return list;
  }, [students, examCategory, selectedStandard, selectedSection, activeOnlineExam, phoneFilter, searchQuery]);

  // Auto-select all eligible students when list changes
  useEffect(() => {
    const ids = new Set(eligibleStudents.map((st) => st.id));
    setSelectedStudentIds(ids);
  }, [eligibleStudents]);

  // Build marks/score summary for each eligible student
  const studentResultsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        obtainedMarks: number;
        totalMarks: number;
        percentage: number;
        grade?: string;
        statusText?: string;
        subjectsList?: Array<{ subjectName: string; marksObtained: number; maxMarks: number; grade?: string }>;
        onlineAttempt?: ExamAttempt;
        hasMarks: boolean;
      }
    >();

    if (examCategory === 'offline') {
      eligibleStudents.forEach((st) => {
        // Find mark record for this student and exam
        const studentMarks = marks.filter(
          (m) =>
            m.studentId === st.id &&
            m.examType === offlineExamType &&
            (offlineSubject === 'all' || m.subjectName === offlineSubject)
        );

        if (studentMarks.length > 0) {
          // If multi-subject exam (e.g. term or annual)
          const primaryRecord = studentMarks[0];
          if (primaryRecord.subjects && primaryRecord.subjects.length > 0) {
            const subsList = primaryRecord.subjects.map((s) => ({
              subjectName: s.subjectName,
              marksObtained: s.marksObtained,
              maxMarks: s.maxMarks,
              grade: s.grade,
            }));
            const obt = primaryRecord.totalObtained || subsList.reduce((a, b) => a + b.marksObtained, 0);
            const tot = primaryRecord.totalMax || subsList.reduce((a, b) => a + b.maxMarks, 0);
            const pct = tot > 0 ? (obt / tot) * 100 : 0;

            map.set(st.id, {
              obtainedMarks: obt,
              totalMarks: tot,
              percentage: pct,
              grade: primaryRecord.overallGrade,
              statusText: pct >= 35 ? 'ઉત્તીર્ણ (પાસ) 🏆' : 'સુધારણા જરૂરી',
              subjectsList: subsList,
              hasMarks: true,
            });
          } else {
            // Aggregate all single subject records if multiple
            let obt = 0;
            let tot = 0;
            const subsList: Array<{ subjectName: string; marksObtained: number; maxMarks: number; grade?: string }> = [];

            studentMarks.forEach((m) => {
              obt += m.totalObtained || 0;
              tot += m.totalMax || 0;
              subsList.push({
                subjectName: m.subjectName || 'વિષય',
                marksObtained: m.totalObtained || 0,
                maxMarks: m.totalMax || 25,
                grade: m.overallGrade,
              });
            });

            const pct = tot > 0 ? (obt / tot) * 100 : 0;
            map.set(st.id, {
              obtainedMarks: obt,
              totalMarks: tot,
              percentage: pct,
              statusText: pct >= 35 ? 'ઉત્તીર્ણ (પાસ) 🏆' : 'સુધારણા જરૂરી',
              subjectsList: subsList,
              hasMarks: true,
            });
          }
        } else {
          map.set(st.id, {
            obtainedMarks: 0,
            totalMarks: 0,
            percentage: 0,
            hasMarks: false,
            statusText: 'ગુણ ઉપલબ્ધ નથી',
          });
        }
      });
    } else {
      // Online Exam Attempt map
      eligibleStudents.forEach((st) => {
        const attempt = onlineAttempts.find(
          (a) => a.studentId === st.id || (st.diseCode && a.studentId === st.diseCode)
        );

        if (attempt && attempt.status === 'submitted') {
          const totMarks = activeOnlineExam?.totalMarks || attempt.totalMarks || 100;
          const passing = activeOnlineExam?.passingMarks || Math.round(totMarks * 0.35);
          const isPass = attempt.score >= passing;

          map.set(st.id, {
            obtainedMarks: attempt.score,
            totalMarks: totMarks,
            percentage: attempt.percentage || (attempt.score / totMarks) * 100,
            statusText: isPass ? 'ઉત્તીર્ણ (PASS) 🏆' : 'સુધારણા જરૂરી',
            onlineAttempt: attempt,
            hasMarks: true,
          });
        } else {
          map.set(st.id, {
            obtainedMarks: 0,
            totalMarks: activeOnlineExam?.totalMarks || 0,
            percentage: 0,
            hasMarks: false,
            statusText: 'કસોટી સબમિટ કરેલ નથી',
          });
        }
      });
    }

    return map;
  }, [eligibleStudents, examCategory, offlineExamType, offlineSubject, marks, onlineAttempts, activeOnlineExam]);

  if (!isOpen) return null;

  // Toggle selection
  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedStudentIds(new Set(eligibleStudents.map((st) => st.id)));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  // Launch Dispatcher Modal with personalized messages
  const handleOpenDispatcher = () => {
    setSelectionError(null);
    const selectedStudents = eligibleStudents.filter((st) => selectedStudentIds.has(st.id));
    if (selectedStudents.length === 0) {
      setSelectionError('કૃપા કરીને ઓછામાં ઓછો એક વિદ્યાર્થી પસંદ કરો.');
      return;
    }

    const recipients: ParentMessageRecipient[] = selectedStudents.map((st) => {
      const res = studentResultsMap.get(st.id);
      const parentPhone = st.contactNumber || st.mobileNumber || '';
      const parentName = st.fatherName || st.motherName || 'વાલીશ્રી';

      let msgText = '';
      if (examCategory === 'offline') {
        const examName =
          offlineSubject !== 'all' ? `${offlineExamType} (${offlineSubject})` : offlineExamType;

        msgText = formatOfflineExamResultForParent(school, st, examName, {
          obtainedMarks: res?.obtainedMarks || 0,
          totalMarks: res?.totalMarks || 0,
          percentage: res?.percentage || 0,
          grade: res?.grade,
          statusText: res?.statusText,
          subjectsList: res?.subjectsList,
        });
      } else {
        if (activeOnlineExam) {
          msgText = formatOnlineExamResultForParent(
            school,
            st,
            activeOnlineExam,
            res?.onlineAttempt
          );
        }
      }

      return {
        studentId: st.id,
        studentName: st.studentName,
        standard: String(st.standard).replace(/^class\s*/i, ''),
        section: st.section || st.division,
        rollNumber: st.rollNumber,
        grNumber: st.grNumber,
        parentName,
        parentPhone,
        messageText: msgText,
        status: !parentPhone ? 'no_phone' : 'pending',
        examScore: res?.hasMarks
          ? {
              obtainedMarks: res.obtainedMarks,
              totalMarks: res.totalMarks,
              percentage: res.percentage,
              grade: res.grade,
              statusText: res.statusText,
            }
          : undefined,
      };
    });

    setPreparedRecipients(recipients);
    setDispatcherOpen(true);
  };

  const selectedCount = selectedStudentIds.size;
  const examTitleForBroadcast =
    examCategory === 'offline'
      ? `${offlineExamType}${offlineSubject !== 'all' ? ` - ${offlineSubject}` : ''}`
      : activeOnlineExam?.title || 'ઓનલાઇન કસોટી';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
          {/* Header */}
          <div className="shrink-0 px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <span>વાલીઓને પરીક્ષા પરિણામ મોકલો</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    WhatsApp & SMS
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  પસંદ કરેલ પરીક્ષાના ગુણ અને પરિણામ દરેક વાલીના મોબાઈલ પર વ્યક્તિગત મેસેજ તરીકે મોકલો
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Exam Category Switcher (Offline vs Online Exam) */}
          <div className="shrink-0 px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center p-1 bg-slate-900 rounded-2xl border border-slate-800 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setExamCategory('offline')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  examCategory === 'offline'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>ઓફલાઇન પરીક્ષા (એકમ કસોટી / સત્રાંત / વાર્ષિક)</span>
              </button>

              <button
                type="button"
                onClick={() => setExamCategory('online')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  examCategory === 'online'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>ઓનલાઇન કસોટી (Online MCQ Exam)</span>
              </button>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              શાળા: <span className="text-slate-200 font-bold">{school.schoolName}</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="shrink-0 p-4 sm:px-6 bg-slate-900/90 border-b border-slate-800/80 space-y-3">
            {examCategory === 'offline' ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                {/* Standard */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    ધોરણ (Standard):
                  </label>
                  <select
                    value={selectedStandard}
                    onChange={(e) => setSelectedStandard(e.target.value as AllowedStandard)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="9">ધોરણ ૯ (Standard 9)</option>
                    <option value="10">ધોરણ ૧૦ (Standard 10)</option>
                    <option value="11">ધોરણ ૧૧ (Standard 11)</option>
                    <option value="12">ધોરણ ૧૨ (Standard 12)</option>
                  </select>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    વર્ગ (Section):
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">બધા વર્ગ (All Sections)</option>
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        વર્ગ {sec}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exam Type */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    પરીક્ષા (Exam):
                  </label>
                  <select
                    value={offlineExamType}
                    onChange={(e) => {
                      setOfflineExamType(e.target.value);
                      setOfflineSubject('all');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    {availableOfflineExams.map((ex) => (
                      <option key={ex} value={ex}>
                        {ex}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject filter (helpful for Ekam Kasoti) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    વિષય (Subject):
                  </label>
                  <select
                    value={offlineSubject}
                    onChange={(e) => setOfflineSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">તમામ વિષયો (All Subjects)</option>
                    {availableSubjectsForOffline.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* Online Exam Selector */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    ઓનલાઇન કસોટી પસંદ કરો:
                  </label>
                  <select
                    value={selectedOnlineExamId}
                    onChange={(e) => setSelectedOnlineExamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
                  >
                    {onlineExams.length === 0 ? (
                      <option value="">કોઈ ઓનલાઇન કસોટી ઉપલબ્ધ નથી</option>
                    ) : (
                      onlineExams.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.title} ({ex.subject} - ધોરણ {ex.standard || 'બધા'}) • {ex.totalMarks} ગુણ
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {activeOnlineExam && (
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{activeOnlineExam.title}</div>
                      <div className="text-slate-400 text-[11px]">
                        વિષય: {activeOnlineExam.subject} | કુલ ગુણ: {activeOnlineExam.totalMarks} |
                        સબમિટ કરેલ: {onlineAttempts.filter((a) => a.status === 'submitted').length}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                      {activeOnlineExam.status.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Search and Selection Helpers */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="વિદ્યાર્થી, રોલ નં અથવા GR થી શોધો..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <select
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none"
                >
                  <option value="all">બધા વિદ્યાર્થીઓ</option>
                  <option value="has_phone">માત્ર ફોન નંબર ધરાવતા</option>
                  <option value="no_phone">ફોન નંબર વિનાના</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                >
                  બધા પસંદ કરો ({eligibleStudents.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-semibold cursor-pointer"
                >
                  પસંદગી રદ
                </button>
              </div>
            </div>
          </div>

          {/* Student Table List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
            {eligibleStudents.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                પસંદ કરેલ ધોરણ અથવા ફિલ્ટરમાં કોઈ વિદ્યાર્થી મળ્યા નથી.
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="px-3 py-2 bg-slate-950/60 rounded-xl border border-slate-800 grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-400">
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCount === eligibleStudents.length && eligibleStudents.length > 0}
                      onChange={(e) => (e.target.checked ? handleSelectAll() : handleDeselectAll())}
                      className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <div className="col-span-4">વિદ્યાર્થીની વિગત</div>
                  <div className="col-span-3">વાલી મોબાઇલ નંબર</div>
                  <div className="col-span-4 text-right">પરીક્ષા પરિણામ / ગુણ</div>
                </div>

                {eligibleStudents.map((st) => {
                  const isSelected = selectedStudentIds.has(st.id);
                  const res = studentResultsMap.get(st.id);
                  const phone = st.contactNumber || st.mobileNumber;

                  return (
                    <div
                      key={st.id}
                      onClick={() => handleToggleStudent(st.id)}
                      className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer grid grid-cols-12 gap-2 items-center text-xs ${
                        isSelected
                          ? 'bg-slate-850 border-emerald-500/60 shadow-sm'
                          : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-850/60 text-slate-300'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent onClick
                          className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </div>

                      {/* Student info */}
                      <div className="col-span-4 min-w-0">
                        <div className="font-bold text-white truncate">{st.studentName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>ધો. {st.standard}</span>
                          {(st.section || st.division) && <span>({st.section || st.division})</span>}
                          {st.rollNumber && <span>• રોલ: {st.rollNumber}</span>}
                          {st.grNumber && <span>• GR: {st.grNumber}</span>}
                        </div>
                      </div>

                      {/* Parent Phone */}
                      <div className="col-span-3">
                        {phone ? (
                          <div className="flex items-center gap-1 text-slate-200 font-mono text-xs">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{phone}</span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold">
                            ⚠️ નંબર નથી
                          </span>
                        )}
                      </div>

                      {/* Marks Result Summary */}
                      <div className="col-span-4 text-right">
                        {res?.hasMarks ? (
                          <div>
                            <span className="font-bold text-emerald-400 font-mono text-xs">
                              {res.obtainedMarks} / {res.totalMarks}
                            </span>
                            <span className="text-slate-400 text-[11px] ml-1.5">
                              ({res.percentage.toFixed(1)}%)
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {res.statusText}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            {res?.statusText || 'ગુણ નથી'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selection Error Banner */}
          {selectionError && (
            <div className="shrink-0 px-6 py-2.5 bg-rose-500/15 border-t border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{selectionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectionError(null)}
                className="text-rose-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="shrink-0 px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-400">
              <span className="font-semibold text-slate-200">
                પસંદ કરેલ વિદ્યાર્થીઓ: <strong className="text-emerald-400 font-mono">{selectedCount}</strong> / {eligibleStudents.length}
              </span>
              <span>•</span>
              <span>
                પરીક્ષા: <strong className="text-white">{examTitleForBroadcast}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition-colors"
              >
                રદ કરો
              </button>

              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleOpenDispatcher}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>📢 સામૂહિક બ્રોડકાસ્ટ / મોકલો ({selectedCount}) 🚀</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dispatched Queue Modal */}
      <ParentMessageDispatcherModal
        isOpen={dispatcherOpen}
        onClose={() => setDispatcherOpen(false)}
        title={`${examTitleForBroadcast} પરિણામ`}
        broadcastType="exam_result"
        examTitle={examTitleForBroadcast}
        standard={selectedStandard}
        recipients={preparedRecipients}
        school={school}
        onRefresh={onRefresh}
      />
    </>
  );
};
