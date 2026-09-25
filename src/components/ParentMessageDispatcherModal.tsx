import React, { useState, useMemo, useEffect } from 'react';
import { School, ParentMessageRecipient } from '../types';
import {
  X,
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Download,
  Share2,
  Edit2,
  Sparkles,
  Smartphone,
  CheckCheck,
  Save,
  Play,
  Pause,
  Square,
  Users,
  Radio,
  FileSpreadsheet,
  RotateCcw,
  ShieldCheck,
  Lock,
  ExternalLink,
} from 'lucide-react';
import {
  buildWhatsAppLink,
  buildSmsLink,
  exportParentMessagesToExcel,
  buildClassConsolidatedBroadcastMessage,
  buildGroupSmsLink,
  exportParentContactsVcf,
} from '../utils/parentMessageUtils';
import { saveParentMessageBroadcast } from '../services/firestoreService';

interface ParentMessageDispatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  broadcastType: 'exam_result' | 'general_notice';
  examTitle?: string;
  standard?: string;
  recipients: ParentMessageRecipient[];
  school: School;
  onRefresh?: () => void;
}

export const ParentMessageDispatcherModal: React.FC<ParentMessageDispatcherModalProps> = ({
  isOpen,
  onClose,
  title,
  broadcastType,
  examTitle,
  standard,
  recipients: initialRecipients,
  school,
  onRefresh,
}) => {
  // Three distinct dispatch options:
  // 1. 'auto_personal': Individual personal WhatsApp to each parent automatically (100% Private, child's marks only)
  // 2. 'group_notice': 1-Click WhatsApp Group Announcement with Secure Student Portal Link
  // 3. 'individual': Manual student-by-student preview & send
  const [dispatcherTab, setDispatcherTab] = useState<'auto_personal' | 'group_notice' | 'individual'>('auto_personal');

  const [recipients, setRecipients] = useState<ParentMessageRecipient[]>(initialRecipients);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [numbersCopied, setNumbersCopied] = useState(false);
  const [noticeCopied, setNoticeCopied] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'sent' | 'no_phone'>('all');

  // Consolidated Group Notice Message (Private: NO marks leaked to other parents)
  const defaultNoticeText = useMemo(() => {
    return buildClassConsolidatedBroadcastMessage(
      school,
      recipients,
      title || 'પરીક્ષા પરિણામ જાહેર',
      examTitle,
      standard
    );
  }, [school, recipients, title, examTitle, standard]);

  const [customNoticeText, setCustomNoticeText] = useState<string>('');
  const [isEditingNoticeText, setIsEditingNoticeText] = useState(false);
  const activeNoticeText = customNoticeText || defaultNoticeText;

  // Auto-Broadcast Personal Dispatcher Runner State
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoDelay, setAutoDelay] = useState<number>(2); // seconds between auto-sends
  const [autoCountdown, setAutoCountdown] = useState<number>(2);
  const [autoSuccess, setAutoSuccess] = useState(false);

  // Sync recipients if prop updates
  useEffect(() => {
    setRecipients(initialRecipients);
    setCurrentIndex(0);
    setHistorySaved(false);
    setAutoRunning(false);
    setAutoSuccess(false);
    setCustomNoticeText('');
  }, [initialRecipients]);

  // Derived Counts
  const sentCount = useMemo(() => {
    return recipients.filter((r) => r.status === 'sent').length;
  }, [recipients]);

  const noPhoneCount = useMemo(() => {
    return recipients.filter((r) => !r.parentPhone || r.status === 'no_phone').length;
  }, [recipients]);

  const pendingCount = recipients.length - sentCount;
  const progressPercent = recipients.length > 0 ? Math.round((sentCount / recipients.length) * 100) : 0;
  const currentRecipient = recipients[currentIndex] || recipients[0];

  const filteredList = useMemo(() => {
    if (filterMode === 'pending') return recipients.filter((r) => r.status !== 'sent');
    if (filterMode === 'sent') return recipients.filter((r) => r.status === 'sent');
    if (filterMode === 'no_phone') return recipients.filter((r) => !r.parentPhone || r.status === 'no_phone');
    return recipients;
  }, [recipients, filterMode]);

  // Next Pending student for 1-Tap Thumb Dispatcher
  const nextPendingRecipient = useMemo(() => {
    return recipients.find((r) => r.parentPhone && r.status !== 'sent') || null;
  }, [recipients]);

  // Open helper to safely navigate without popup blocking
  const triggerOpenLink = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mark single recipient as sent
  const handleMarkAsSentAndNext = (index: number) => {
    setRecipients((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          status: 'sent',
          sentAt: new Date().toISOString(),
        };
      }
      return next;
    });

    if (currentIndex < recipients.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Mark all students as sent
  const handleMarkAllAsSent = () => {
    const now = new Date().toISOString();
    setRecipients((prev) =>
      prev.map((r) => ({
        ...r,
        status: r.parentPhone ? 'sent' : 'no_phone',
        sentAt: r.parentPhone ? now : undefined,
      }))
    );
  };

  // Individual WhatsApp dispatch (Contains ONLY that student's marks!)
  const handleLaunchWhatsApp = (recipient: ParentMessageRecipient, index: number) => {
    if (!recipient.parentPhone) return;
    const url = buildWhatsAppLink(recipient.parentPhone, recipient.messageText);
    triggerOpenLink(url);
    handleMarkAsSentAndNext(index);
  };

  // Individual SMS dispatch (Contains ONLY that student's marks!)
  const handleLaunchSms = (recipient: ParentMessageRecipient, index: number) => {
    if (!recipient.parentPhone) return;
    const url = buildSmsLink(recipient.parentPhone, recipient.messageText);
    triggerOpenLink(url);
    handleMarkAsSentAndNext(index);
  };

  // Copy single message
  const handleCopySingle = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Copy all valid parent phone numbers
  const handleCopyAllPhoneNumbers = async () => {
    const validPhones = recipients
      .map((r) => r.parentPhone.replace(/\D/g, ''))
      .filter((p) => p.length >= 10)
      .map((p) => p.slice(-10));
    const unique = Array.from(new Set(validPhones));
    if (unique.length === 0) {
      setSaveError('કૉપી કરવા માટે કોઈ માન્ય મોબાઇલ નંબર મળ્યો નથી.');
      return;
    }
    try {
      await navigator.clipboard.writeText(unique.join(', '));
      setNumbersCopied(true);
      setSaveError(null);
      setTimeout(() => setNumbersCopied(false), 3000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // 1-CLICK CLASS GROUP NOTICE (Opens WhatsApp to share the official notice with private portal link)
  const handleShareGroupNoticeWhatsApp = async () => {
    const textToSend = activeNoticeText;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: title || 'વિદ્યાલયમ શાળા પરિણામ નોટિસ',
          text: textToSend,
        });
        handleMarkAllAsSent();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Native share failed, using WhatsApp link:', err);
      }
    }

    const url = `https://wa.me/?text=${encodeURIComponent(textToSend)}`;
    triggerOpenLink(url);
    handleMarkAllAsSent();
  };

  // 1-CLICK GROUP SMS
  const handleSendGroupSms = () => {
    const validPhones = recipients
      .map((r) => r.parentPhone)
      .filter((p) => p && p.trim().length >= 10);
    if (validPhones.length === 0) {
      setSaveError('કોઈ માન્ય મોબાઇલ નંબર મળ્યો નથી.');
      return;
    }
    const summaryText = `${school.schoolName || 'શાળા'}: ${title}. ${examTitle ? `પરીક્ષા: ${examTitle}.` : ''} વિગતવાર પરિણામ શાળા પોર્ટલ પર રોલ નંબર દ્વારા ઉપલબ્ધ છે.`;
    const url = buildGroupSmsLink(validPhones, summaryText);
    triggerOpenLink(url);
    handleMarkAllAsSent();
  };

  // Download VCF contacts file
  const handleDownloadVcf = () => {
    const ok = exportParentContactsVcf(
      recipients.map((r) => ({
        studentName: r.studentName,
        parentPhone: r.parentPhone,
        standard: r.standard,
        section: r.section,
        rollNumber: r.rollNumber,
      })),
      `${school.schoolName || 'શાળા'}_ધોરણ_${standard || 'વિદ્યાર્થી'}_વાલી_નંબરો`
    );
    if (!ok) {
      setSaveError('કોઈ માન્ય મોબાઇલ નંબર મળ્યો નથી.');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    exportParentMessagesToExcel(
      recipients.map((r) => ({
        studentName: r.studentName,
        standard: r.standard,
        section: r.section,
        rollNumber: r.rollNumber,
        grNumber: r.grNumber,
        parentName: r.parentName,
        parentPhone: r.parentPhone,
        messageText: r.messageText,
        status: r.status,
      })),
      `${school.schoolName}_Parent_Messages`
    );
  };

  // Update phone inline
  const handleSavePhone = (index: number) => {
    if (!tempPhone.trim()) return;
    setRecipients((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          parentPhone: tempPhone.trim(),
          status: 'pending',
        };
      }
      return next;
    });
    setIsEditingPhone(false);
    setTempPhone('');
  };

  // Save Broadcast Record to Firestore
  const handleSaveToHistory = async () => {
    if (!school?.id) return;
    setIsSavingHistory(true);
    try {
      await saveParentMessageBroadcast(school.id, {
        schoolId: school.id,
        broadcastType,
        title: title || 'વાલી મેસેજિંગ બ્રોડકાસ્ટ',
        examType: examTitle,
        standard,
        totalRecipients: recipients.length,
        sentCount,
        createdAt: new Date().toISOString(),
        previewMessage: activeNoticeText.slice(0, 160) || '',
      });
      setHistorySaved(true);
      setSaveError(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error saving broadcast history:', err);
      setSaveError('ઇતિહાસ સાચવવામાં સમસ્યા આવી. કૃપા કરીને ફરી પ્રયાસ કરો.');
    } finally {
      setIsSavingHistory(false);
    }
  };

  // Auto-Broadcast Sequence Runner Engine
  // Opens WhatsApp for each parent sequentially with ONLY their child's marks!
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (autoRunning) {
      const eligibleIndices = recipients
        .map((r, i) => (r.parentPhone && r.status !== 'sent' ? i : -1))
        .filter((i) => i !== -1);

      if (eligibleIndices.length === 0) {
        setAutoRunning(false);
        setAutoSuccess(true);
        handleSaveToHistory();
        return;
      }

      if (autoCountdown > 0) {
        timer = setTimeout(() => {
          setAutoCountdown((prev) => prev - 1);
        }, 1000);
      } else {
        const nextIndex = eligibleIndices[0];
        const target = recipients[nextIndex];
        if (target && target.parentPhone) {
          handleLaunchWhatsApp(target, nextIndex);
          setAutoCountdown(autoDelay);
        } else {
          setAutoRunning(false);
        }
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [autoRunning, autoCountdown, recipients, autoDelay]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden text-slate-100">
        
        {/* HEADER */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  {title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>૧૦૦% પ્રાઇવેટ (દરેક વાલીને ફક્ત પોતાના બાળકની વિગત)</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                કુલ <strong className="text-white font-mono">{recipients.length}</strong> વિદ્યાર્થીઓ • ધોરણ: <strong className="text-emerald-400">{standard || 'બધા'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              title="Excel ડાઉનલોડ"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={handleCopyAllPhoneNumbers}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              title="બધા વાલીઓના નંબરો કૉપી કરો"
            >
              {numbersCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Smartphone className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="hidden sm:inline">{numbersCopied ? 'નંબરો કૉપી!' : 'નંબરો કૉપી'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* THREE WORKFLOW TABS */}
        <div className="shrink-0 px-4 sm:px-6 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-xs w-full lg:w-auto overflow-x-auto">
            {/* TAB 1: Auto Personal Send */}
            <button
              type="button"
              onClick={() => {
                setDispatcherTab('auto_personal');
                setAutoRunning(false);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                dispatcherTab === 'auto_personal'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-300" />
              <span>⚡ ઓટો-પર્સનલ સેન્ડર (ખાનગી મેસેજ)</span>
            </button>

            {/* TAB 2: Group Announcement Notice */}
            <button
              type="button"
              onClick={() => {
                setDispatcherTab('group_notice');
                setAutoRunning(false);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                dispatcherTab === 'group_notice'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-cyan-300" />
              <span>📢 વાલી ગ્રૂપ સિક્યોર નોટિસ</span>
            </button>

            {/* TAB 3: Manual Individual View */}
            <button
              type="button"
              onClick={() => {
                setDispatcherTab('individual');
                setAutoRunning(false);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                dispatcherTab === 'individual'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-300" />
              <span>👤 એક-એક વિદ્યાર્થી ચકાસો</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">પ્રગતિ:</span>
              <strong className="text-emerald-400 font-mono text-sm">
                {sentCount} / {recipients.length}
              </strong>
              <span className="text-slate-500 font-mono">({progressPercent}%)</span>
            </div>

            <button
              type="button"
              disabled={isSavingHistory || historySaved}
              onClick={handleSaveToHistory}
              className="px-3 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {historySaved ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>ઇતિહાસ સેવ થયો</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-teal-400" />
                  <span>ઇતિહાસ સેવ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full bg-slate-800 h-1 shrink-0">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ERROR / NOTIFICATION BANNER */}
        {saveError && (
          <div className="shrink-0 px-6 py-2 bg-rose-500/15 border-b border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{saveError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="text-rose-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: ⚡ AUTO-PERSONAL SENDER (Every Parent Gets ONLY Their Child's Marks!) */}
        {/* ========================================================================= */}
        {dispatcherTab === 'auto_personal' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-900/60">
            
            {/* PRIVACY GUARANTEE BANNER */}
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-emerald-300">
                  ૧૦૦% પ્રાઇવેટ & સુરક્ષિત પર્સનલ મેસેજિંગ:
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  દરેક વાલીને <strong>ફક્ત અને ફક્ત એમના જ બાળકના ગુણ, ટકાવારી અને રિઝલ્ટ</strong> મળશે. કોઈપણ વાલી બીજા વિદ્યાર્થીના માર્ક્સ જોઈ શકશે નહીં.
                </p>
              </div>
            </div>

            {/* ZERO BACK-AND-FORTH 1-CLICK SHORTCUT BANNER */}
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h5 className="font-bold text-cyan-300">
                    વારંવાર WhatsApp ખોલીને Back ન જવું હોય તો? (૧-ક્લિક રીત)
                  </h5>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    વર્ગના WhatsApp ગ્રૂપમાં ફક્ત ૧ જ વાર સિક્યોર લિંક મોકલો. વાલીઓ લિંક પર ક્લિક કરી રોલ નંબર નાખીને ફક્ત પોતાના જ બાળકની માર્કશીટ જોઈ શકશે (૧૦૦% ખાનગી).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatcherTab('group_notice')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold whitespace-nowrap shadow-md cursor-pointer shrink-0 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>૧-ક્લિક ગ્રૂપ નોટિસ ખોલો ➡️</span>
              </button>
            </div>

            {/* AUTO RUNNER CONTROLLER CARD */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>⚡ બધા વાલીઓને આપમેળે પર્સનલ મેસેજ મોકલો (Auto-Dispatch Queue)</span>
                    {autoRunning && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    નીચેનું બટન દબાવતા સિસ્ટમ ક્રમશઃ દરેક વાલીનું WhatsApp ખોલશે જેમાં ફક્ત તેમના જ બાળકના માર્ક્સ તૈયાર હશે.
                  </p>
                </div>

                {/* Speed selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                    <span className="text-slate-400 px-1.5">સમય વિરામ:</span>
                    {[1, 2, 3].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setAutoDelay(sec)}
                        className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          autoDelay === sec
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {sec} સેકન્ડ
                      </button>
                    ))}
                  </div>

                  {!autoRunning ? (
                    <button
                      type="button"
                      disabled={pendingCount === 0}
                      onClick={() => {
                        setAutoRunning(true);
                        setAutoCountdown(autoDelay);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-40"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>ઓટો-સેન્ડ શરૂ કરો ({pendingCount} બાકી) 🚀</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAutoRunning(false)}
                      className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>વિરામ / થોભો</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live Auto-Send Status */}
              {autoRunning && nextPendingRecipient && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <span className="font-bold">આગામી વાલી:</span>
                    <strong className="text-white text-sm">{nextPendingRecipient.studentName}</strong>
                    <span className="font-mono text-emerald-400">({nextPendingRecipient.parentPhone})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-emerald-300 font-bold">
                      {autoCountdown} સેકન્ડમાં આપમેળે WhatsApp ખુલશે...
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const idx = recipients.findIndex((r) => r.studentId === nextPendingRecipient.studentId);
                        handleLaunchWhatsApp(nextPendingRecipient, idx);
                        setAutoCountdown(autoDelay);
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      તુરંત મોકલો ➡️
                    </button>
                  </div>
                </div>
              )}

              {autoSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>🎉 તમામ વાલીઓને તેમના બાળકના વ્યક્તિગત ગુણ સફળતાપૂર્વક મોકલાઈ ગયા છે!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoSuccess(false)}
                    className="text-emerald-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* ACTIVE STUDENT PERSONAL PREVIEW CARD */}
            {nextPendingRecipient && (
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      આગામી વાલીને જનાર પર્સનલ મેસેજનું પ્રિવ્યૂ (Sample Preview):
                    </h5>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    વિદ્યાર્થી: {nextPendingRecipient.studentName}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {nextPendingRecipient.messageText}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    વાલી નંબર: <strong className="font-mono text-white">{nextPendingRecipient.parentPhone || 'નંબર નથી'}</strong>
                  </span>
                  <span>
                    ગુણ વિગત: <strong className="text-emerald-400 font-mono">
                      {nextPendingRecipient.examScore ? `${nextPendingRecipient.examScore.obtainedMarks}/${nextPendingRecipient.examScore.totalMarks} (${nextPendingRecipient.examScore.percentage.toFixed(1)}%)` : 'પરિણામ ઉપલબ્ધ'}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 📢 CLASS WHATSAPP GROUP NOTICE (With Secure Student Portal Link) */}
        {/* ========================================================================= */}
        {dispatcherTab === 'group_notice' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-900/60">
            <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-cyan-950/70 via-slate-900 to-blue-950/60 border border-cyan-500/40 shadow-xl space-y-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>૧-ક્લિક સમગ્ર વર્ગ વાલી ગ્રૂપ શેરિંગ (Class Parents Group Notice)</span>
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  WhatsApp વાલી ગ્રૂપમાં સત્તાવાર પરિણામ નોટિસ ૧-ક્લિકથી મોકલો
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  આ મેસેજમાં કોઈપણ વિદ્યાર્થીના માર્ક્સ જાહેર દેખાશે <strong>નહીં</strong>. દરેક વાલીશ્રી લિંક પર ક્લિક કરી પોતાના બાળકના રોલ નંબર / G.R. નંબર દ્વારા <strong>ફક્ત પોતાના બાળકના જ ગુણ અને પ્રગતિપત્રક</strong> ખાનગી રીતે જોઈ શકશે.
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleShareGroupNoticeWhatsApp}
                  className="col-span-1 sm:col-span-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/60 transition-all cursor-pointer transform active:scale-98"
                >
                  <Share2 className="w-4 h-4" />
                  <span>🟢 WhatsApp વાલી ગ્રૂપમાં મોકલો (૧-ક્લિક) 🚀</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendGroupSms}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>📱 સામૂહિક SMS મોકલો</span>
                </button>
              </div>
            </div>

            {/* NOTICE PREVIEW BOX */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                    વાલી ગ્રૂપ સિક્યોર નોટિસ લખાણ (Group Notice Text)
                  </h5>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingNoticeText(!isEditingNoticeText)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-cyan-400" />
                    <span>{isEditingNoticeText ? 'પ્રિવ્યૂ જુઓ' : 'મેસેજ એડિટ કરો'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(activeNoticeText);
                      setNoticeCopied(true);
                      setTimeout(() => setNoticeCopied(false), 3000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {noticeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                    <span>{noticeCopied ? 'કૉપી થયું!' : 'લખાણ કૉપી'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadVcf}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    title="વાલીઓના નંબરો તમારા ફોનમાં સેવ કરો"
                  >
                    <Download className="w-3 h-3 text-emerald-400" />
                    <span>વાલી નંબરો (.VCF)</span>
                  </button>
                </div>
              </div>

              {isEditingNoticeText ? (
                <div className="space-y-2">
                  <textarea
                    rows={10}
                    value={activeNoticeText}
                    onChange={(e) => setCustomNoticeText(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-sans text-slate-100 focus:outline-none focus:border-cyan-500 leading-relaxed"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomNoticeText('')}
                      className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-white cursor-pointer"
                    >
                      ડિફોલ્ટ રીસેટ
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingNoticeText(false)}
                      className="px-3 py-1 rounded-lg bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 cursor-pointer"
                    >
                      સેવ કરો
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                  {activeNoticeText}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: 👤 MANUAL INDIVIDUAL VIEW (Browse, verify, or edit phone numbers) */}
        {/* ========================================================================= */}
        {dispatcherTab === 'individual' && (
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
            {/* LEFT: Featured Student Dispatch Card (7 cols) */}
            <div className="lg:col-span-7 p-4 sm:p-6 overflow-y-auto flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60 space-y-4">
              {currentRecipient ? (
                <div className="space-y-4">
                  {/* Student Identity Header */}
                  <div className="flex items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-base flex items-center justify-center font-mono shrink-0">
                        {currentIndex + 1}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white tracking-wide">
                          {currentRecipient.studentName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 flex-wrap">
                          <span className="font-semibold text-slate-300">
                            ધોરણ: {currentRecipient.standard}
                            {currentRecipient.section ? ` (${currentRecipient.section})` : ''}
                          </span>
                          {currentRecipient.rollNumber && (
                            <span>• રોલ નં: {currentRecipient.rollNumber}</span>
                          )}
                          {currentRecipient.grNumber && (
                            <span>• GR: {currentRecipient.grNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {currentRecipient.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>મોકલાયેલ</span>
                        </span>
                      ) : !currentRecipient.parentPhone ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>મોબાઇલ નથી</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5" />
                          <span>બાકી</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Parent Contact Details */}
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">વાલીનું નામ:</span>
                      <strong className="text-white font-medium">
                        {currentRecipient.parentName || 'વાલીશ્રી'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">મોબાઇલ નંબર (WhatsApp):</span>
                      {isEditingPhone ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="tel"
                            maxLength={10}
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                            placeholder="10 અંકનો નંબર"
                            className="w-32 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSavePhone(currentIndex)}
                            className="px-2 py-1 rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 cursor-pointer"
                          >
                            સેવ
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingPhone(false)}
                            className="px-1.5 py-1 rounded bg-slate-800 text-slate-400 text-xs hover:text-white cursor-pointer"
                          >
                            રદ
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              currentRecipient.parentPhone ? 'text-emerald-400' : 'text-red-400 italic'
                            }`}
                          >
                            {currentRecipient.parentPhone || 'નંબર ઉપલબ્ધ નથી'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTempPhone(currentRecipient.parentPhone || '');
                              setIsEditingPhone(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="નંબર બદલો"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Preview Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>આ બાળકના વાલીને જતો પર્સનલ મેસેજ:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopySingle(currentRecipient.messageText, currentIndex)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedIndex === currentIndex ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">કૉપી થયું!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>મેસેજ કૉપી</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                      {currentRecipient.messageText}
                    </div>
                  </div>

                  {/* Action Launch Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      disabled={!currentRecipient.parentPhone}
                      onClick={() => handleLaunchWhatsApp(currentRecipient, currentIndex)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-98"
                    >
                      <Send className="w-4 h-4" />
                      <span>WhatsApp પર મોકલો & આગળ (Next) ➡️</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!currentRecipient.parentPhone}
                        onClick={() => handleLaunchSms(currentRecipient, currentIndex)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                        <span>SMS મોકલો</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkAsSentAndNext(currentIndex)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>મોકલાયેલ માર્ક કરો</span>
                      </button>
                    </div>
                  </div>

                  {/* Navigation Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>અગાઉનો</span>
                    </button>

                    <span className="font-mono text-slate-400">
                      વિદ્યાર્થી {currentIndex + 1} / {recipients.length}
                    </span>

                    <button
                      type="button"
                      disabled={currentIndex >= recipients.length - 1}
                      onClick={() => setCurrentIndex((prev) => Math.min(recipients.length - 1, prev + 1))}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 cursor-pointer"
                    >
                      <span>આગામી</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  કોઈ વિદ્યાર્થી પસંદ થયેલ નથી.
                </div>
              )}
            </div>

            {/* RIGHT: All Students Queue List (5 cols) */}
            <div className="lg:col-span-5 p-4 flex flex-col overflow-hidden bg-slate-950/40">
              <div className="shrink-0 flex items-center justify-between gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-[11px] mb-3">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
                    filterMode === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  બધા ({recipients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('pending')}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
                    filterMode === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  બાકી ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('sent')}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
                    filterMode === 'sent' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  મોકલેલ ({sentCount})
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredList.map((rec) => {
                  const originalIndex = recipients.findIndex((r) => r.studentId === rec.studentId);
                  const isActive = originalIndex === currentIndex;

                  return (
                    <div
                      key={rec.studentId}
                      onClick={() => setCurrentIndex(originalIndex)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        isActive
                          ? 'bg-slate-800 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/40'
                          : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-500">
                            #{originalIndex + 1}
                          </span>
                          <h5 className="text-xs font-bold text-white truncate">
                            {rec.studentName}
                          </h5>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>ધો. {rec.standard}</span>
                          {rec.rollNumber && <span>| રોલ: {rec.rollNumber}</span>}
                          <span className={`font-mono ${rec.parentPhone ? 'text-slate-300' : 'text-red-400 italic'}`}>
                            • {rec.parentPhone || 'મોબાઇલ નથી'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {rec.status === 'sent' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : !rec.parentPhone ? (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-400/80" />
                        )}

                        {rec.parentPhone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLaunchWhatsApp(rec, originalIndex);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white transition-colors cursor-pointer ml-1"
                            title="WhatsApp મોકલો"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 1-TAP THUMB QUICK SEND BAR (Persistent bottom bar for rapid 1-tap dispatch) */}
        {nextPendingRecipient && (
          <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-t border-emerald-500/40 flex items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-2 text-xs truncate min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-slate-400 hidden sm:inline">આગામી વાલી:</span>
              <strong className="text-white font-bold truncate text-xs sm:text-sm">
                {nextPendingRecipient.studentName}
              </strong>
              <span className="font-mono text-emerald-400 text-xs shrink-0">
                ({nextPendingRecipient.parentPhone})
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const idx = recipients.findIndex((r) => r.studentId === nextPendingRecipient.studentId);
                handleLaunchWhatsApp(nextPendingRecipient, idx);
              }}
              className="shrink-0 py-2 sm:py-2.5 px-4 sm:px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/70 transition-transform active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>૧-ટેપ WhatsApp મોકલો & આગળ ➡️</span>
            </button>
          </div>
        )}

        {/* FOOTER */}
        <div className="shrink-0 px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {dispatcherTab === 'auto_personal'
                ? 'દરેક વાલીના ફોન પર ૧૦૦% પ્રાઇવેટ મેસેજ જશે જેમાં ફક્ત તેમના બાળકના જ ગુણ અને ટકાવારી હશે.'
                : dispatcherTab === 'group_notice'
                ? 'વાલી ગ્રૂપ નોટિસમાં કોઈ બાળકના ગુણ જાહેર થતા નથી. વાલી પોર્ટલ લિંક દ્વારા ખાનગી પરિણામ જોઈ શકે છે.'
                : 'વ્યક્તિગત મોડમાં તમે દરેક વિદ્યાર્થીના મોબાઈલ નંબર અને પરિણામની ચકાસણી કરી શકો છો.'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer transition-colors"
          >
            બંધ કરો
          </button>
        </div>
      </div>
    </div>
  );
};
