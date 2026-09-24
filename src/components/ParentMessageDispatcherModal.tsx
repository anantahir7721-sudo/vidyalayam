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
  ExternalLink,
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
  BookOpen,
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
  // Main Tab: 'broadcast' (All at once in 1-click) vs 'individual' (Student by student carousel)
  const [dispatcherTab, setDispatcherTab] = useState<'broadcast' | 'individual'>('broadcast');

  const [recipients, setRecipients] = useState<ParentMessageRecipient[]>(initialRecipients);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [numbersCopied, setNumbersCopied] = useState(false);
  const [broadcastCopied, setBroadcastCopied] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'sent' | 'no_phone'>('all');

  // Consolidated Broadcast Message State (for 1-click Broadcast)
  const defaultBroadcastText = useMemo(() => {
    return buildClassConsolidatedBroadcastMessage(
      school,
      recipients,
      title || 'પરીક્ષા પરિણામ જાહેર',
      examTitle,
      standard
    );
  }, [school, recipients, title, examTitle, standard]);

  const [customBroadcastText, setCustomBroadcastText] = useState<string>('');
  const [isEditingBroadcastText, setIsEditingBroadcastText] = useState(false);
  const activeBroadcastText = customBroadcastText || defaultBroadcastText;

  // Auto-Broadcast Sequence Runner State
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoDelay, setAutoDelay] = useState<number>(3); // seconds between auto-sends
  const [autoCountdown, setAutoCountdown] = useState<number>(3);
  const [autoSuccess, setAutoSuccess] = useState(false);

  // Sync recipients if prop updates
  useEffect(() => {
    setRecipients(initialRecipients);
    setCurrentIndex(0);
    setHistorySaved(false);
    setAutoRunning(false);
    setAutoSuccess(false);
    setCustomBroadcastText('');
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

  // Mark all students as sent (used after 1-click broadcast)
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

  // Individual WhatsApp dispatch
  const handleLaunchWhatsApp = (recipient: ParentMessageRecipient, index: number) => {
    if (!recipient.parentPhone) return;
    const url = buildWhatsAppLink(recipient.parentPhone, recipient.messageText);
    triggerOpenLink(url);
    handleMarkAsSentAndNext(index);
  };

  // Individual SMS dispatch
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

  // Copy all individual messages
  const handleCopyAll = async () => {
    try {
      const allText = recipients
        .map((r, i) => `--- [${i + 1}] ${r.studentName} (${r.parentPhone || 'નંબર નથી'}) ---\n${r.messageText}\n`)
        .join('\n\n');
      await navigator.clipboard.writeText(allText);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 3000);
    } catch (err) {
      console.error('Copy all failed:', err);
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

  // 1-CLICK BROADCAST: Native Share / WhatsApp Group Dispatch
  const handleShareConsolidatedWhatsApp = async () => {
    const textToSend = activeBroadcastText;

    // Mobile / Modern Browser Web Share API (opens native WhatsApp share sheet directly)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: title || 'વિદ્યાલયમ શાળા પરિણામ બ્રોડકાસ્ટ',
          text: textToSend,
        });
        handleMarkAllAsSent();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
        console.warn('Native share failed, using WhatsApp link:', err);
      }
    }

    // Direct WhatsApp link (opens WhatsApp Web or App directly to pick recipient / group / broadcast)
    const url = `https://wa.me/?text=${encodeURIComponent(textToSend)}`;
    triggerOpenLink(url);
    handleMarkAllAsSent();
  };

  // 1-CLICK GROUP SMS: Opens native SMS app with all parents prefilled
  const handleSendGroupSms = () => {
    const validPhones = recipients
      .map((r) => r.parentPhone)
      .filter((p) => p && p.trim().length >= 10);
    if (validPhones.length === 0) {
      setSaveError('કોઈ માન્ય મોબાઇલ નંબર મળ્યો નથી.');
      return;
    }
    const summaryText = `${school.schoolName || 'શાળા'}: ${title}. ${examTitle ? `પરીક્ષા: ${examTitle}.` : ''} વિગતવાર પરિણામ જાહેર થયેલ છે.`;
    const url = buildGroupSmsLink(validPhones, summaryText);
    triggerOpenLink(url);
    handleMarkAllAsSent();
  };

  // Download VCF contacts file for WhatsApp Broadcast creation
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

  // Copy Broadcast Text
  const handleCopyBroadcastText = async () => {
    try {
      await navigator.clipboard.writeText(activeBroadcastText);
      setBroadcastCopied(true);
      setTimeout(() => setBroadcastCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy broadcast text:', err);
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
        previewMessage: activeBroadcastText.slice(0, 160) || '',
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

  // Next Pending student for Auto Runner display
  const nextPendingRecipient = useMemo(() => {
    return recipients.find((r) => r.parentPhone && r.status !== 'sent') || null;
  }, [recipients]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-slate-100">
        
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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {broadcastType === 'exam_result' ? 'પરીક્ષા પરિણામ' : 'વાલી સૂચના'}
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

        {/* PRIMARY DISPATCH MODE SELECTOR TABS */}
        <div className="shrink-0 px-4 sm:px-6 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setDispatcherTab('broadcast');
                setAutoRunning(false);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold transition-all cursor-pointer ${
                dispatcherTab === 'broadcast'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-300" />
              <span>📢 ૧-ક્લિક સામૂહિક બ્રોડકાસ્ટ (All at Once)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDispatcherTab('individual');
                setAutoRunning(false);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold transition-all cursor-pointer ${
                dispatcherTab === 'individual'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-cyan-300" />
              <span>👤 એક-એક વ્યક્તિગત મોકલો (One-by-One)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-between sm:justify-end">
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
                  <span>ઇતિહાસ સેવ કરો</span>
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

        {/* TAB 1: ALL-AT-ONCE BROADCAST (User's Primary Request) */}
        {dispatcherTab === 'broadcast' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-900/60">
            
            {/* HERO 1-CLICK BROADCAST BANNER */}
            <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-teal-950/60 border border-emerald-500/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>૧-ક્લિક સામૂહિક શેરિંગ • 1-Click Multi Broadcast</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-white tracking-wide">
                    WhatsApp ગ્રૂપ અથવા બ્રોડકાસ્ટ લિસ્ટમાં એકસાથે મોકલો
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    નીચેના બટન પર ક્લિક કરતા આપનું WhatsApp ખુલશે અને આપ આપના વર્ગના વાલી ગ્રૂપ (Parents Group) અથવા WhatsApp Broadcast List માં તમામ <strong className="text-emerald-400">{recipients.length} વિદ્યાર્થીઓનું</strong> સંપૂર્ણ પરિણામ ૧ સેકન્ડમાં એકસાથે શેર કરી શકશો.
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <span className="text-xs text-slate-400">કુલ વાલીઓ:</span>
                  <span className="px-3 py-1 rounded-xl bg-slate-800 font-mono font-bold text-emerald-400 text-sm border border-slate-700">
                    {recipients.length} વિદ્યાર્થીઓ
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS ROW FOR 1-CLICK BROADCAST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {/* 1. Main WhatsApp Broadcast Share Button */}
                <button
                  type="button"
                  onClick={handleShareConsolidatedWhatsApp}
                  className="col-span-1 sm:col-span-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer transform active:scale-98"
                >
                  <Share2 className="w-4 h-4" />
                  <span>🟢 WhatsApp પર સામૂહિક મોકલો (૧-ક્લિક) 🚀</span>
                </button>

                {/* 2. Group SMS Button */}
                <button
                  type="button"
                  onClick={handleSendGroupSms}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                  title="બધા વાલીઓના નંબરો સાથે સામૂહિક SMS મોકલો"
                >
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>📱 સામૂહિક SMS મોકલો</span>
                </button>

                {/* 3. Mark All Sent Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleMarkAllAsSent();
                    handleSaveToHistory();
                  }}
                  className="py-3 px-4 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500/40 transition-all cursor-pointer"
                  title="બધા વિદ્યાર્થીઓને મોકલેલ તરીકે માર્ક કરો"
                >
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span>✅ બધાને મોકલેલ માર્ક કરો</span>
                </button>
              </div>
            </div>

            {/* AUTO-BROADCAST SEQUENCE RUNNER CARD */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <RotateCcw className={`w-5 h-5 ${autoRunning ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>⚡ ઓટો-બ્રોડકાસ્ટ રનર (Continuous Personal Auto-Send)</span>
                      {autoRunning && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </h5>
                    <p className="text-xs text-slate-400">
                      જો દરેક વાલીને વ્યક્તિગત પરિણામ મોકલવું હોય પરંતુ વારંવાર ક્લિક ન કરવું હોય, તો ઓટો-રનર આપોઆપ ક્રમશઃ દરેક વાલીનું WhatsApp ખોલી આપશે.
                    </p>
                  </div>
                </div>

                {/* Auto Runner Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                    <span className="text-slate-400 px-1.5">સ્પીડ:</span>
                    {[2, 3, 5].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setAutoDelay(sec)}
                        className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          autoDelay === sec
                            ? 'bg-cyan-500 text-slate-950'
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
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>ઓટો-સેન્ડ શરૂ કરો ({pendingCount} બાકી)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAutoRunning(false)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>વિરામ / બંધ કરો</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Running Status Banner */}
              {autoRunning && nextPendingRecipient && (
                <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <span className="font-bold">આગામી વાલી:</span>
                    <strong className="text-white">{nextPendingRecipient.studentName}</strong>
                    <span className="font-mono text-cyan-400">({nextPendingRecipient.parentPhone})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-cyan-300 font-bold">
                      {autoCountdown} સેકન્ડમાં આપોઆપ ખુલશે...
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const idx = recipients.findIndex((r) => r.studentId === nextPendingRecipient.studentId);
                        handleLaunchWhatsApp(nextPendingRecipient, idx);
                        setAutoCountdown(autoDelay);
                      }}
                      className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                    >
                      તુરંત ખોલો ➡️
                    </button>
                  </div>
                </div>
              )}

              {autoSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>🎉 તમામ પાત્ર વાલીઓને ઓટો-બ્રોડકાસ્ટ દ્વારા મેસેજ મોકલાઈ ગયા છે!</span>
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

            {/* BROADCAST MESSAGE PREVIEW & EDIT BOX */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                    સામૂહિક બ્રોડકાસ્ટ લખાણ (Class Result Broadcast Message)
                  </h5>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingBroadcastText(!isEditingBroadcastText)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-cyan-400" />
                    <span>{isEditingBroadcastText ? 'પ્રિવ્યૂ જુઓ' : 'મેસેજ એડિટ કરો'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyBroadcastText}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {broadcastCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                    <span>{broadcastCopied ? 'કૉપી થઈ ગયું!' : 'લખાણ કૉપી'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadVcf}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    title="WhatsApp Broadcast List માટે વાલીઓના કોન્ટેક્ટ્સ ડાઉનલોડ કરો"
                  >
                    <Download className="w-3 h-3 text-emerald-400" />
                    <span>વાલી કોન્ટેક્ટ્સ (.VCF)</span>
                  </button>
                </div>
              </div>

              {isEditingBroadcastText ? (
                <div className="space-y-2">
                  <textarea
                    rows={12}
                    value={activeBroadcastText}
                    onChange={(e) => setCustomBroadcastText(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-sans text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed"
                    placeholder="અહીં આપનો કસ્ટમ બ્રોડકાસ્ટ મેસેજ ટાઇપ કરો..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomBroadcastText('')}
                      className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-white cursor-pointer"
                    >
                      ડિફોલ્ટ રીસેટ કરો
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingBroadcastText(false)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 cursor-pointer"
                    >
                      સાચવો (Save)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed selection:bg-emerald-500/30">
                  {activeBroadcastText}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>
                  💡 <strong>ટિપ:</strong> આ મેસેજમાં તમામ વિદ્યાર્થીઓના રોલ નંબર, ગુણ અને પરિણામ સમાવિષ્ટ છે.
                </span>
                <span>
                  કુલ અક્ષરો: <strong className="font-mono text-white">{activeBroadcastText.length}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ONE-BY-ONE INDIVIDUAL DISPATCHER (Student by Student Carousel) */}
        {dispatcherTab === 'individual' && (
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
            {/* LEFT: Featured Student Dispatch Card (7 cols) */}
            <div className="lg:col-span-7 p-4 sm:p-6 overflow-y-auto flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60 space-y-4">
              {currentRecipient ? (
                <div className="space-y-4">
                  {/* Top Notice: Shortcut to Broadcast */}
                  <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-300">
                    <span>💡 બધાને એકસાથે મોકલવા માટે ઉપર આપેલ <strong>"સામૂહિક બ્રોડકાસ્ટ"</strong> ટેબ વાપરો.</span>
                    <button
                      type="button"
                      onClick={() => setDispatcherTab('broadcast')}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] cursor-pointer"
                    >
                      બ્રોડકાસ્ટ પર જાઓ ➡️
                    </button>
                  </div>

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
                        <span>વાલીને જતો પર્સનલાઇઝ્ડ મેસેજ:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopySingle(currentRecipient.messageText, currentIndex)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedIndex === currentIndex ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">કૉપી થઈ ગયું!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>મેસેજ કૉપી</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed selection:bg-emerald-500/30">
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
                      <span>અગાઉનો (Previous)</span>
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
                      <span>આગામી (Next)</span>
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
              {/* List Filter Tabs */}
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

        {/* BOTTOM STATUS FOOTER */}
        <div className="shrink-0 px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>
              {dispatcherTab === 'broadcast'
                ? 'સામૂહિક બ્રોડકાસ્ટ મોડ: ૧-ક્લિકથી સંપૂર્ણ પરિણામ વર્ગના વાલી WhatsApp ગ્રૂપ અથવા બ્રોડકાસ્ટ લિસ્ટમાં મોકલાશે.'
                : 'વ્યક્તિગત મોડ: દરેક વાલીને પર્સનલ માર્ક્સ સાથે અલગથી સંદેશો મોકલાશે.'}
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
