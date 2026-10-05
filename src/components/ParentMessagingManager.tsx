import React, { useState, useMemo, useEffect } from 'react';
import { School, Student, MarkRecord, AllowedStandard, ParentMessageRecipient, ParentBroadcastRecord } from '../types';
import {
  MessageSquare,
  Send,
  Users,
  Award,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Copy,
  Check,
  Search,
  ChevronRight,
  ChevronDown,
  Filter,
  History,
  Smartphone,
  Eye,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Layers,
  X,
} from 'lucide-react';
import {
  PRESET_NOTICE_TEMPLATES,
  NoticeTemplate,
  replaceSmartVariables,
} from '../utils/parentMessageUtils';
import { getParentMessageBroadcasts } from '../services/firestoreService';
import { createBulkStudentNotifications } from '../services/notificationService';
import { useTheme } from '../context/ThemeContext';
import { ParentMessageDispatcherModal } from './ParentMessageDispatcherModal';
import { SendExamResultModal } from './SendExamResultModal';

interface ParentMessagingManagerProps {
  school: School;
  students: Student[];
  marks: MarkRecord[];
  onBack: () => void;
  onRefresh?: () => void;
}

export const ParentMessagingManager: React.FC<ParentMessagingManagerProps> = ({
  school,
  students,
  marks,
  onBack,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'notice' | 'results' | 'history'>('notice');

  // Notice State
  const [selectedTemplate, setSelectedTemplate] = useState<NoticeTemplate>(PRESET_NOTICE_TEMPLATES[0]);
  const [noticeSubject, setNoticeSubject] = useState(PRESET_NOTICE_TEMPLATES[0].subject);
  const [noticeText, setNoticeText] = useState(PRESET_NOTICE_TEMPLATES[0].templateText);

  // Student selection for Notice
  const [filterStandard, setFilterStandard] = useState<'all' | AllowedStandard>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'has_phone' | 'no_phone'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [noticeError, setNoticeError] = useState<string | null>(null);

  // Dispatcher State
  const [dispatcherOpen, setDispatcherOpen] = useState(false);
  const [preparedRecipients, setPreparedRecipients] = useState<ParentMessageRecipient[]>([]);

  // Exam Result Modal State
  const [examResultModalOpen, setExamResultModalOpen] = useState(false);

  // Group WhatsApp Generator State
  const [groupShareModalOpen, setGroupShareModalOpen] = useState(false);
  const [groupMessageText, setGroupMessageText] = useState('');
  const [groupMessageCopied, setGroupMessageCopied] = useState(false);

  // In-App Notification Dispatch State
  const [isSendingInApp, setIsSendingInApp] = useState(false);
  const [inAppSuccessCount, setInAppSuccessCount] = useState<number | null>(null);

  const handleGenerateGroupMessage = () => {
    const selected = filteredStudents.filter((st) => selectedStudentIds.has(st.id));
    if (selected.length === 0) {
      setNoticeError('કૃપા કરીને ઓછામાં ઓછો એક વિદ્યાર્થી અથવા વર્ગ પસંદ કરો.');
      return;
    }

    const stdText = filterStandard === 'all' ? 'તમામ ધોરણ' : `ધોરણ ${filterStandard}`;
    const secText = filterSection === 'all' ? '' : ` વર્ગ: ${filterSection}`;
    const today = new Date().toLocaleDateString('gu-IN');

    // Clean placeholder notice text for general group sharing
    const cleanNotice = noticeText
      .replace(/{વિદ્યાર્થી_નામ}/g, 'વિદ્યાર્થીઓ')
      .replace(/{વાલી_નામ}/g, 'વાલીશ્રી')
      .replace(/{ધોરણ}/g, stdText)
      .replace(/{રોલ_નંબર}/g, '')
      .replace(/{જીઆર_નંબર}/g, '')
      .replace(/{શાળા_નામ}/g, school.schoolName || 'શાળા')
      .replace(/{તારીખ}/g, today);

    const msg = `📢 *શાળા સત્તાવાર સૂચના • ${school.schoolName}*
📌 *વિષય:* ${noticeSubject}
🎯 *વિભાગ:* ${stdText}${secText} (કુલ ${selected.length} વિદ્યાર્થીઓ)

${cleanNotice.trim()}

🗓️ *તારીખ:* ${today}
📱 *વિદ્યાલયમ શાળા પોર્ટલ*`;

    setGroupMessageText(msg);
    setGroupShareModalOpen(true);
  };

  const handleSendPersonalizedInApp = async () => {
    const selected = filteredStudents.filter((st) => selectedStudentIds.has(st.id));
    if (selected.length === 0) {
      setNoticeError('કૃપા કરીને ઓછામાં ઓછો એક વિદ્યાર્થી પસંદ કરો.');
      return;
    }

    setIsSendingInApp(true);
    setNoticeError(null);
    try {
      const records = selected.map((st) => {
        const personalizedMsg = replaceSmartVariables(noticeText, st, school);
        return {
          studentId: st.id,
          studentName: st.studentName,
          standard: String(st.standard).replace(/^class\s*/i, ''),
          title: `📢 ${noticeSubject}`,
          body: personalizedMsg,
          category: 'general_notice' as const,
        };
      });

      const count = await createBulkStudentNotifications(school.id, records);
      setInAppSuccessCount(count);
      setTimeout(() => setInAppSuccessCount(null), 4000);
    } catch (err: any) {
      console.error('Error sending in-app notifications:', err);
      setNoticeError('ઇન-એપ સૂચના મોકલવામાં સમસ્યા આવી.');
    } finally {
      setIsSendingInApp(false);
    }
  };

  // Broadcast History State
  const [historyList, setHistoryList] = useState<ParentBroadcastRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load history when tab is clicked
  useEffect(() => {
    if (activeTab === 'history' && school?.id) {
      loadHistory();
    }
  }, [activeTab, school?.id]);

  const loadHistory = async () => {
    if (!school?.id) return;
    setIsLoadingHistory(true);
    try {
      const records = await getParentMessageBroadcasts(school.id);
      setHistoryList(records);
    } catch (err) {
      console.error('Error fetching broadcast history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Available sections for chosen standard
  const availableSections = useMemo(() => {
    const set = new Set<string>();
    students.forEach((st) => {
      if (filterStandard === 'all' || String(st.standard).replace(/^class\s*/i, '') === filterStandard) {
        const sec = st.section || st.division;
        if (sec) set.add(sec);
      }
    });
    return Array.from(set).sort();
  }, [students, filterStandard]);

  // Filter students
  const filteredStudents = useMemo(() => {
    let list = students;
    if (filterStandard !== 'all') {
      list = list.filter((st) => String(st.standard).replace(/^class\s*/i, '') === filterStandard);
    }
    if (filterSection !== 'all') {
      list = list.filter((st) => (st.section || st.division) === filterSection);
    }
    if (phoneFilter === 'has_phone') {
      list = list.filter((st) => Boolean(st.contactNumber || st.mobileNumber));
    } else if (phoneFilter === 'no_phone') {
      list = list.filter((st) => !Boolean(st.contactNumber || st.mobileNumber));
    }
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
  }, [students, filterStandard, filterSection, phoneFilter, searchQuery]);

  // Auto-select all filtered students on filter change
  useEffect(() => {
    setSelectedStudentIds(new Set(filteredStudents.map((st) => st.id)));
  }, [filterStandard, filterSection, phoneFilter]);

  // Sample student for live preview
  const sampleStudent = useMemo(() => {
    const selected = filteredStudents.find((st) => selectedStudentIds.has(st.id));
    if (selected) return selected;
    return (
      filteredStudents[0] ||
      students[0] || {
        id: 'sample',
        schoolId: school.id,
        studentName: 'કુમાર રોહિત વિજયભાઈ સોલંકી',
        standard: '10',
        section: 'A',
        rollNumber: '15',
        grNumber: '1084',
        fatherName: 'વિજયભાઈ સોલંકી',
        contactNumber: '9876543210',
        createdAt: '',
      }
    );
  }, [filteredStudents, selectedStudentIds, students, school.id]);

  // Live preview message
  const previewMessage = useMemo(() => {
    return replaceSmartVariables(noticeText, sampleStudent, school);
  }, [noticeText, sampleStudent, school]);

  const { theme } = useTheme();
  const [previewThemeOverride, setPreviewThemeOverride] = useState<'auto' | 'light' | 'dark'>('auto');
  const [previewCopied, setPreviewCopied] = useState(false);

  const isLightWhatsApp = previewThemeOverride === 'light';

  const formattedCurrentTime = useMemo(() => {
    const d = new Date();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'બપોરે' : (hours >= 17 ? 'સાંજે' : 'સવારે');
    const h12 = hours % 12 || 12;
    const mPad = minutes < 10 ? `0${minutes}` : minutes;
    return `${ampm} ${h12}:${mPad}`;
  }, []);

  const handleCopyPreview = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(previewMessage);
      setPreviewCopied(true);
      setTimeout(() => setPreviewCopied(false), 2000);
    }
  };

  // Toggle selection
  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedStudentIds(new Set(filteredStudents.map((st) => st.id)));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  const handleSelectTemplate = (tmpl: NoticeTemplate) => {
    setSelectedTemplate(tmpl);
    setNoticeSubject(tmpl.subject);
    setNoticeText(tmpl.templateText);
  };

  // Launch Dispatcher for General Notice
  const handleLaunchNoticeDispatcher = () => {
    setNoticeError(null);
    const selected = filteredStudents.filter((st) => selectedStudentIds.has(st.id));
    if (selected.length === 0) {
      setNoticeError('કૃપા કરીને ઓછામાં ઓછો એક વિદ્યાર્થી પસંદ કરો.');
      return;
    }

    const recipients: ParentMessageRecipient[] = selected.map((st) => {
      const parentPhone = st.contactNumber || st.mobileNumber || '';
      const parentName = st.fatherName || st.motherName || 'વાલીશ્રી';
      const msg = replaceSmartVariables(noticeText, st, school);

      return {
        studentId: st.id,
        studentName: st.studentName,
        standard: String(st.standard).replace(/^class\s*/i, ''),
        section: st.section || st.division,
        rollNumber: st.rollNumber,
        grNumber: st.grNumber,
        parentName,
        parentPhone,
        messageText: msg,
        status: !parentPhone ? 'no_phone' : 'pending',
      };
    });

    setPreparedRecipients(recipients);
    setDispatcherOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md dark:shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="પાછળના મેનુ પર જાઓ (Go Back)"
              >
                <ArrowLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-wide">
                  વાલી સંચાર અને મેસેજિંગ કેન્દ્ર
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                  WhatsApp & SMS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                પરીક્ષાના પરિણામ અને સામાન્ય સૂચનાઓ એક જ ક્લિકથી દરેક વાલીના મોબાઇલ પર પર્સનલી પહોંચાડો
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExamResultModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/20 transition-all cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>પરીક્ષા પરિણામ મોકલો 🚀</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('notice')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'notice'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>વાલી સૂચના / કસ્ટમ મેસેજ (Notice)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('results');
              setExamResultModalOpen(true);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'results'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>પરીક્ષા પરિણામ મેસેજિંગ (Exam Results)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <History className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>મેસેજિંગ ઇતિહાસ (History)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: GENERAL NOTICE / CUSTOM MESSAGE */}
      {activeTab === 'notice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Template Selection & Message Editor (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Ready-made Gujarati Templates */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>તૈયાર નમૂના પસંદ કરો (Preset Templates):</span>
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">ક્લિક કરીને લખાણ ઓટો-ફિલ કરો</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {PRESET_NOTICE_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate.id === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                          : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{tmpl.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Editor */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1.5">
                  સૂચનાનો વિષય / શીર્ષક (Subject):
                </label>
                <input
                  type="text"
                  value={noticeSubject}
                  onChange={(e) => setNoticeSubject(e.target.value)}
                  placeholder="દા.ત. વાલી-શિક્ષક મિટિંગ અંગે સૂચના"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300">
                    મેસેજનું લખાણ (Message Body):
                  </label>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {noticeText.length} અક્ષરો
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  placeholder="અહીં વાલીઓને મોકલવાનો મેસેજ ટાઇપ કરો..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-900 dark:text-slate-200 leading-relaxed font-sans placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none shadow-xs"
                />
              </div>

              {/* Dynamic Variables Pill Cloud */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                  સ્માર્ટ વેરિએબલ (આ ટેગ્સ દરેક વિદ્યાર્થી મુજબ આપમેળે બદલાઈ જશે):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    '{વિદ્યાર્થી_નામ}',
                    '{વાલી_નામ}',
                    '{ધોરણ}',
                    '{રોલ_નંબર}',
                    '{જીઆર_નંબર}',
                    '{શાળા_નામ}',
                    '{તારીખ}',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNoticeText((prev) => prev + ` ${tag} `)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-teal-700 dark:text-teal-400 border border-slate-300 dark:border-teal-500/20 text-[11px] font-mono cursor-pointer transition-colors shadow-xs"
                      title="મેસેજમાં ઉમેરો"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Interactive WhatsApp Preview Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>વાલીના મોબાઇલ પર કેવો મેસેજ દેખાશે (Live Preview):</span>
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] self-start sm:self-auto">
                  <span className="text-slate-500 dark:text-slate-400">નમૂનો:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 truncate max-w-[200px]">
                    {sampleStudent.studentName}
                  </span>
                </div>
              </div>

              {/* Authentic WhatsApp Phone Screen Frame */}
              <div className="rounded-2xl overflow-hidden border border-[#d1c7b7] dark:border-[#202c33] shadow-md">
                {/* WhatsApp Top Header Bar */}
                <div className="px-3.5 py-2.5 bg-[#008069] dark:bg-[#1f2c34] text-white flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {sampleStudent.studentName.charAt(0) || 'વા'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white tracking-wide truncate flex items-center gap-1.5">
                        <span className="truncate">{school.schoolName || 'શાળા કાર્યાલય'}</span>
                        <span className="text-[9px] bg-white/25 px-1.5 py-0.2 rounded font-normal shrink-0">સત્તાવાર</span>
                      </div>
                      <div className="text-[10px] text-emerald-100 dark:text-slate-300 truncate">
                        પ્રતિ: વાલીશ્રી ({sampleStudent.studentName})
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPreview}
                    className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 active:scale-95 text-white text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    title="આ મેસેજ કૉપી કરો"
                  >
                    {previewCopied ? <Check className="w-3 h-3 text-emerald-200" /> : <Copy className="w-3 h-3 text-white" />}
                    <span>{previewCopied ? 'કૉપી થઈ ગયો!' : 'કૉપી'}</span>
                  </button>
                </div>

                {/* WhatsApp Chat Body Canvas */}
                <div
                  className={`p-3.5 sm:p-4 space-y-2.5 transition-colors ${
                    isLightWhatsApp
                      ? 'bg-[#efeae2]'
                      : 'bg-[#0b141a]'
                  }`}
                  style={{
                    backgroundImage: isLightWhatsApp
                      ? 'radial-gradient(#ded7cc 1.2px, transparent 1.2px)'
                      : 'radial-gradient(#1f2c34 1.2px, transparent 1.2px)',
                    backgroundSize: '16px 16px',
                  }}
                >
                  {/* Date Pill */}
                  <div className="text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide shadow-xs ${
                        isLightWhatsApp
                          ? 'bg-white/95 text-[#54656f] border border-[#e1d9ce]'
                          : 'bg-[#182229] text-[#8696a0] border border-[#222e35]'
                      }`}
                    >
                      આજે • Today
                    </span>
                  </div>

                  {/* Outgoing WhatsApp Chat Bubble */}
                  <div className="flex justify-end">
                    <div
                      className={`whatsapp-chat-bubble max-w-[96%] sm:max-w-[88%] rounded-2xl rounded-tr-xs p-3.5 shadow-sm text-xs leading-relaxed select-text space-y-2 ${
                        isLightWhatsApp
                          ? 'whatsapp-bubble-light bg-[#d9fdd3] border border-[#c4edbc]'
                          : 'whatsapp-bubble-dark bg-[#005c4b] border border-[#025a4a]'
                      }`}
                    >
                      {/* Message Content with Guaranteed Legible Color */}
                      <div
                        className="whitespace-pre-wrap font-sans text-xs leading-relaxed select-text"
                        style={{
                          color: isLightWhatsApp ? '#111b21' : '#e9edef',
                          fontWeight: 400,
                        }}
                      >
                        {previewMessage}
                      </div>

                      {/* Timestamp & Double Blue Read Tick */}
                      <div className="flex items-center justify-end gap-1 text-[10px] pt-0.5 select-none">
                        <span
                          style={{
                            color: isLightWhatsApp ? '#54656f' : '#8696a0',
                            fontWeight: 500,
                          }}
                        >
                          {formattedCurrentTime}
                        </span>
                        <span className="text-[#53bdeb] font-bold text-xs" title="વાંચાયેલ">
                          ✓✓
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Footer Info Bar */}
                <div
                  className={`px-3.5 py-2 border-t text-[11px] flex items-center justify-between flex-wrap gap-2 ${
                    isLightWhatsApp
                      ? 'bg-[#f0f2f5] border-[#d1c7b7] text-[#54656f]'
                      : 'bg-[#111b21] border-[#202c33] text-[#8696a0]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>WhatsApp મેસેજ પૂર્વાવલોકન ({isLightWhatsApp ? 'લાઇટ મોડ' : 'ડાર્ક મોડ'})</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewThemeOverride(isLightWhatsApp ? 'dark' : 'light')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isLightWhatsApp
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                    title="લાઇટ / ડાર્ક વ્યુ બદલો"
                  >
                    <span>{isLightWhatsApp ? '🌙 ડાર્ક મોડમાં જુઓ' : '☀️ લાઇટ મોડમાં જુઓ'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Student Selection & Dispatch Trigger (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>વિદ્યાર્થીઓની પસંદગી (Select Recipients):</span>
                </h3>
                <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                  {selectedStudentIds.size} / {filteredStudents.length}
                </span>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">ધોરણ:</label>
                  <select
                    value={filterStandard}
                    onChange={(e) => setFilterStandard(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">તમામ ધોરણ</option>
                    <option value="9">ધોરણ ૯</option>
                    <option value="10">ધોરણ ૧૦</option>
                    <option value="11">ધોરણ ૧૧</option>
                    <option value="12">ધોરણ ૧૨</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1 font-medium">વર્ગ/સેક્શન:</label>
                  <select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">બધા વર્ગ</option>
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        વર્ગ {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="નામ, રોલ નં અથવા GR થી શોધો..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Select All / Deselect All */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold cursor-pointer text-[11px]"
                >
                  બધા પસંદ કરો ({filteredStudents.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer text-[11px]"
                >
                  પસંદગી રદ કરો
                </button>
              </div>

              {/* Student Checklist */}
              <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                {filteredStudents.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    કોઈ વિદ્યાર્થી મળ્યા નથી.
                  </div>
                ) : (
                  filteredStudents.map((st) => {
                    const isSelected = selectedStudentIds.has(st.id);
                    const phone = st.contactNumber || st.mobileNumber;

                    return (
                      <div
                        key={st.id}
                        onClick={() => handleToggleStudent(st.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                          isSelected
                            ? 'bg-emerald-50/80 dark:bg-slate-800 border-emerald-500/60 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded accent-emerald-600 w-3.5 h-3.5 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate text-xs">
                              {st.studentName}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span>ધો. {st.standard}</span>
                              {st.rollNumber && <span>• રોલ: {st.rollNumber}</span>}
                              {st.grNumber && <span>• GR: {st.grNumber}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {phone ? (
                            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              {phone}
                            </span>
                          ) : (
                            <span className="text-[10px] text-red-500 dark:text-red-400 italic">
                              નંબર નથી
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Notice Error Banner */}
              {noticeError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{noticeError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNoticeError(null)}
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* In-App Success Banner */}
              {inAppSuccessCount !== null && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    સફળતાપૂર્વક {inAppSuccessCount} વિદ્યાર્થીઓને એમની વ્યક્તિગત માહિતી સાથેની ઇન-એપ સૂચના મોકલાઈ ગઈ!
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {/* 1. Personalized In-App Notification (Student-Specific) */}
                <button
                  type="button"
                  disabled={selectedStudentIds.size === 0 || !noticeText.trim() || isSendingInApp}
                  onClick={handleSendPersonalizedInApp}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isSendingInApp
                      ? 'સૂચનાઓ મોકલાઈ રહી છે...'
                      : `📲 દરેક વિદ્યાર્થીને વ્યક્તિગત ઇન-એપ સૂચના મોકલો (${selectedStudentIds.size})`}
                  </span>
                </button>

                {/* 2. WhatsApp Group Share Message Generator */}
                <button
                  type="button"
                  disabled={selectedStudentIds.size === 0 || !noticeText.trim()}
                  onClick={handleGenerateGroupMessage}
                  className="w-full py-2.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>📢 WhatsApp ગ્રૂપમાં શેર કરવા માટે મેસેજ બનાવો</span>
                </button>

                {/* 3. Optional 1-by-1 manual dispatcher */}
                <button
                  type="button"
                  onClick={handleLaunchNoticeDispatcher}
                  className="w-full py-1.5 text-center text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium cursor-pointer"
                >
                  વૈયક્તિક ૧-બાય-૧ મેસેજ મોડ ખોલો (વૈકલ્પિક)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BROADCAST HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>વાલી મેસેજિંગ ઇતિહાસ (Broadcast Log)</span>
            </h3>
            <button
              onClick={loadHistory}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              રિફ્રેશ કરો
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              ઇતિહાસ લોડ થઈ રહ્યો છે...
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              અત્યાર સુધી કોઈ મેસેજિંગ ઇતિહાસ નોંધાયેલ નથી. જ્યારે તમે વાલીઓને મેસેજ મોકલશો ત્યારે તેનો રેકોર્ડ અહીં દેખાશે.
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{rec.title}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                        {rec.broadcastType === 'exam_result' ? 'પરીક્ષા પરિણામ' : 'વાલી સૂચના'}
                      </span>
                    </div>
                    {rec.previewMessage && (
                      <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-2 italic">
                        "{rec.previewMessage}..."
                      </p>
                    )}
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>તારીખ: {new Date(rec.createdAt).toLocaleString('gu-IN')}</span>
                      {rec.standard && <span>• ધોરણ: {rec.standard}</span>}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        {rec.sentCount} / {rec.totalRecipients}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">સફળ મોકલાયેલ</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Exam Result Modal */}
      <SendExamResultModal
        isOpen={examResultModalOpen}
        onClose={() => setExamResultModalOpen(false)}
        school={school}
        students={students}
        marks={marks}
        onRefresh={onRefresh}
      />

      {/* MODAL 2: Parent Message Dispatcher Modal */}
      <ParentMessageDispatcherModal
        isOpen={dispatcherOpen}
        onClose={() => setDispatcherOpen(false)}
        title={noticeSubject || 'વાલી સૂચના'}
        broadcastType="general_notice"
        recipients={preparedRecipients}
        school={school}
        onRefresh={onRefresh}
      />

      {/* MODAL 3: WhatsApp Group Message Generator Modal */}
      {groupShareModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    WhatsApp ગ્રૂપ શેરિંગ મેસેજ
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    વર્ગ અથવા શાળાના WhatsApp ગ્રૂપમાં સીધો શેર કરો
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGroupShareModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  તૈયાર થયેલ મેસેજ (Message Text):
                </label>
                <textarea
                  rows={9}
                  value={groupMessageText}
                  onChange={(e) => setGroupMessageText(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-xs font-sans leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  આ મેસેજ તમારા વર્ગના વોટ્સએપ ગ્રૂપમાં શેર કરવા માટે એકદમ ટૂંકો, સ્પષ્ટ અને યોગ્ય ફોર્મેટમાં તૈયાર છે.
                </span>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(groupMessageText);
                  setGroupMessageCopied(true);
                  setTimeout(() => setGroupMessageCopied(false), 2500);
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {groupMessageCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{groupMessageCopied ? 'કૉપી થઈ ગયો!' : 'મેસેજ કૉપી કરો'}</span>
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(groupMessageText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp ગ્રૂપમાં શેર કરો</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
