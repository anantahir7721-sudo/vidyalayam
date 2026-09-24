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
  Layers,
  X,
} from 'lucide-react';
import {
  PRESET_NOTICE_TEMPLATES,
  NoticeTemplate,
  replaceSmartVariables,
} from '../utils/parentMessageUtils';
import { getParentMessageBroadcasts } from '../services/firestoreService';
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                  વાલી સંચાર અને મેસેજિંગ કેન્દ્ર
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  WhatsApp & SMS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                પરીક્ષાના પરિણામ અને સામાન્ય સૂચનાઓ એક જ ક્લિકથી દરેક વાલીના મોબાઇલ પર પર્સનલી પહોંચાડો
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExamResultModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>પરીક્ષા પરિણામ મોકલો 🚀</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('notice')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'notice'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>વાલી સૂચના / કસ્ટમ મેસેજ (Notice)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('results');
              setExamResultModalOpen(true);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'results'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>પરીક્ષા પરિણામ મેસેજિંગ (Exam Results)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4 text-cyan-400" />
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>તૈયાર નમૂના પસંદ કરો (Preset Templates):</span>
                </h3>
                <span className="text-[11px] text-slate-400">ક્લિક કરીને લખાણ ઓટો-ફિલ કરો</span>
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
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{tmpl.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Editor */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  સૂચનાનો વિષય / શીર્ષક (Subject):
                </label>
                <input
                  type="text"
                  value={noticeSubject}
                  onChange={(e) => setNoticeSubject(e.target.value)}
                  placeholder="દા.ત. વાલી-શિક્ષક મિટિંગ અંગે સૂચના"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    મેસેજનું લખાણ (Message Body):
                  </label>
                  <span className="text-[11px] text-emerald-400">
                    {noticeText.length} અક્ષરો
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  placeholder="અહીં વાલીઓને મોકલવાનો મેસેજ ટાઇપ કરો..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 leading-relaxed font-sans placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none shadow-inner"
                />
              </div>

              {/* Dynamic Variables Pill Cloud */}
              <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 block">
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
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-400 border border-teal-500/20 text-[11px] font-mono cursor-pointer transition-colors"
                      title="મેસેજમાં ઉમેરો"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Interactive WhatsApp Preview Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>વાલીના મોબાઇલ પર કેવો મેસેજ દેખાશે (Live Preview):</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  નમૂનો: {sampleStudent.studentName}
                </span>
              </div>

              <div className="bg-[#0b141a] rounded-2xl p-4 border border-[#202c33] shadow-inner space-y-2">
                <div className="bg-[#005c4b] text-slate-100 rounded-2xl p-3.5 text-xs whitespace-pre-wrap leading-relaxed shadow max-h-56 overflow-y-auto">
                  {previewMessage}
                </div>
                <div className="text-[10px] text-slate-500 text-right">
                  WhatsApp મેસેજ પૂર્વાવલોકન
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Student Selection & Dispatch Trigger (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>વિદ્યાર્થીઓની પસંદગી (Select Recipients):</span>
                </h3>
                <span className="font-mono text-xs text-emerald-400 font-bold">
                  {selectedStudentIds.size} / {filteredStudents.length}
                </span>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">ધોરણ:</label>
                  <select
                    value={filterStandard}
                    onChange={(e) => setFilterStandard(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all">તમામ ધોરણ</option>
                    <option value="9">ધોરણ ૯</option>
                    <option value="10">ધોરણ ૧૦</option>
                    <option value="11">ધોરણ ૧૧</option>
                    <option value="12">ધોરણ ૧૨</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">વર્ગ/સેક્શન:</label>
                  <select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
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
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="નામ, રોલ નં અથવા GR થી શોધો..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Select All / Deselect All */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer text-[11px]"
                >
                  બધા પસંદ કરો ({filteredStudents.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-slate-400 hover:text-slate-300 font-semibold cursor-pointer text-[11px]"
                >
                  પસંદગી રદ કરો
                </button>
              </div>

              {/* Student Checklist */}
              <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                {filteredStudents.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
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
                            ? 'bg-slate-850 border-emerald-500/60 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate text-xs">
                              {st.studentName}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span>ધો. {st.standard}</span>
                              {st.rollNumber && <span>• રોલ: {st.rollNumber}</span>}
                              {st.grNumber && <span>• GR: {st.grNumber}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {phone ? (
                            <span className="font-mono text-[11px] text-slate-300">
                              {phone}
                            </span>
                          ) : (
                            <span className="text-[10px] text-red-400 italic">
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
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{noticeError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNoticeError(null)}
                    className="text-rose-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Primary Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={selectedStudentIds.size === 0 || !noticeText.trim()}
                  onClick={handleLaunchNoticeDispatcher}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>📢 સામૂહિક બ્રોડકાસ્ટ / મોકલો ({selectedStudentIds.size}) 🚀</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BROADCAST HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              <span>વાલી મેસેજિંગ ઇતિહાસ (Broadcast Log)</span>
            </h3>
            <button
              onClick={loadHistory}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              રિફ્રેશ કરો
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-16 text-center text-slate-500 text-xs">
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
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{rec.title}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {rec.broadcastType === 'exam_result' ? 'પરીક્ષા પરિણામ' : 'વાલી સૂચના'}
                      </span>
                    </div>
                    {rec.previewMessage && (
                      <p className="text-slate-400 text-xs line-clamp-2 italic">
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
                      <div className="font-bold text-emerald-400 font-mono text-sm">
                        {rec.sentCount} / {rec.totalRecipients}
                      </div>
                      <div className="text-[10px] text-slate-400">સફળ મોકલાયેલ</div>
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
    </div>
  );
};
