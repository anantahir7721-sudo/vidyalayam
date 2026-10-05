import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  AlertCircle,
  Settings,
  Send,
  Sparkles,
  Calendar,
  BookOpen,
  Award,
  RefreshCw,
  GitBranch,
  ArrowUpCircle,
  Clock,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  openNotificationSettings,
  sendNotification,
  isNativeAndroid,
} from '../utils/notificationUtils';
import {
  checkForGitHubUpdate,
  getTargetGitHubRepo,
  setTargetGitHubRepo,
  applyAppUpdate,
  GitHubUpdateInfo,
} from '../services/appUpdateService';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  schoolName = 'વિદ્યાલયમ',
}) => {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default');
  const [isNative, setIsNative] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'categories' | 'updates'>('schedule');

  // Scheduled notification preferences
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('vidyalayam_notification_prefs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      dailyBulletin: true, // 6:00 AM News & Prayer
      afternoonKnowledge: true, // 2:00 PM Janva Jevu & Prashnotari
      eveningCircular: true, // 6:00 PM Evening circulars & Homework
      examAlerts: true, // Exam schedule & 5-min alert
      admissionAlerts: true, // Online admission status
      adminAlerts: true, // Admin & password reset notifications
    };
  });

  // GitHub App Update Checker State
  const [gitRepo, setGitRepo] = useState(getTargetGitHubRepo());
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<GitHubUpdateInfo | null>(null);
  const [updateCheckError, setUpdateCheckError] = useState<string | null>(null);

  // Test notification status
  const [activeTestKey, setActiveTestKey] = useState<string | null>(null);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsNative(isNativeAndroid());
      checkNotificationPermission().then((status) => {
        setPermission(status);
      });
      // Check update silently
      checkForGitHubUpdate().then((info) => {
        setUpdateResult(info);
      });
    }
  }, [isOpen]);

  const handleTogglePref = (key: keyof typeof prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      localStorage.setItem('vidyalayam_notification_prefs', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      await sendNotification(
        '🔔 વિદ્યાલયમ • સૂચનાઓ સક્રિય થઈ',
        `${schoolName} માટે દૈનિક ૬:૦૦ AM સમાચાર, ૨:૦૦ PM જ્ઞાન અને ૬:૦૦ PM સૂચનાઓ ચાલુ થઈ ગઈ છે.`,
        'general'
      );
    }
  };

  const handleCheckUpdateManual = async () => {
    setIsCheckingUpdate(true);
    setUpdateCheckError(null);
    try {
      setTargetGitHubRepo(gitRepo);
      const res = await checkForGitHubUpdate(true);
      setUpdateResult(res);
      if (!res.updateAvailable) {
        setTestSuccessMessage('તમારી એપ અદ્યતન (Latest Version) છે!');
        setTimeout(() => setTestSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setUpdateCheckError(err.message || 'અપડેટ ચકાસવામાં સમસ્યા આવી.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleSendTestNotification = async (type: 'news' | 'exam' | 'knowledge') => {
    setActiveTestKey(type);
    setTestSuccessMessage(null);

    if (type === 'news') {
      try {
        const res = await fetch('/api/daily-news');
        const json = await res.json();
        const topItem = json?.bulletin?.items?.[0];
        const title = topItem?.headline || 'આજના તાજા શૈક્ષણિક & જ્ઞાનવર્ધક સમાચાર';
        await sendNotification('📰 દૈનિક તાજા સમાચાર • ૦૬:૦૦ AM', `${title} (વિદ્યાલયમ)`, 'daily');
      } catch {
        await sendNotification(
          '📰 દૈનિક તાજા સમાચાર • ૦૬:૦૦ AM',
          'શિક્ષણ અને સામાન્ય જ્ઞાનના આજના મહત્વના દૈનિક સમાચાર તૈયાર છે.',
          'daily'
        );
      }
    } else if (type === 'exam') {
      await sendNotification(
        '⏳ પરીક્ષા રિમાઇન્ડર • ૫ મિનિટ બાકી',
        'ધોરણ ૧૦ ગણિત એકમ કસોટી ૫ મિનિટમાં શરૂ થવાની છે. સમયસર લોગિન રહો.',
        'exam'
      );
    } else {
      await sendNotification(
        '💡 દૈનિક જ્ઞાન & પ્રશ્નોત્તરી • ૦૨:૦૦ PM',
        'આજના ૨૦ પાઠ્યપુસ્તક પ્રશ્નો અને ૧૨ રોચક તથ્યો તૈયાર છે.',
        'daily'
      );
    }

    setTestSuccessMessage('નોટિફિકેશન સફળતાપૂર્વક મોકલાઈ ગઈ!');
    setTimeout(() => {
      setActiveTestKey(null);
      setTestSuccessMessage(null);
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>સૂચના અને અપડેટ સેટિંગ્સ</span>
                <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                  {isNative ? 'Android App' : 'Web Portal'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                દૈનિક સમયપત્રક (૬ AM, ૨ PM, ૬ PM) અને તાત્કાલિક સૂચનાઓ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 px-5 pt-2 gap-2 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'schedule'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>દૈનિક સમયપત્રક (Schedule)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'categories'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>પ્રકાર & એલર્ટ્સ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('updates')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'updates'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>એપ અપડેટ્સ</span>
            {updateResult?.updateAvailable && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>
        </div>

        {/* Content Body with clean scroll */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Permission Status Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              permission === 'granted'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {permission === 'granted' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm truncate">
                  {permission === 'granted'
                    ? 'સૂચના પરવાનગી સક્રિય છે (Enabled)'
                    : 'સૂચના પરવાનગી આપવી જરૂરી છે'}
                </div>
                <div className="text-[11px] opacity-85 truncate">
                  {permission === 'granted'
                    ? 'તમારા ફોનમાં શાળાના તમામ એલર્ટ્સ પહોંચશે.'
                    : 'સમયસર સૂચનાઓ માટે પરવાનગી આપો.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {permission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  પરવાનગી આપો
                </button>
              )}
              <button
                type="button"
                onClick={openNotificationSettings}
                className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-xs"
                title="ફોનના સેટિંગ્સ ખોલો"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TAB 1: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>સ્વચાલિત સમયપત્રક (Automatic Daily Schedules)</span>
                <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400">
                  IST સમય અનુસાર
                </span>
              </div>

              {/* 1. Morning 06:00 AM Slot */}
              <label className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>🌅 સવારે ૦૬:૦૦ વાગ્યે</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        સમાચાર & પ્રાર્થના
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      દૈનિક એકદમ તાજા સમાચાર, સવારની પ્રાર્થના, શ્લોક અને સુવિચાર સ્વચાલિત મોકલાય છે.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.dailyBulletin}
                  onChange={() => handleTogglePref('dailyBulletin')}
                  className="w-4 h-4 rounded mt-1 accent-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </label>

              {/* 2. Afternoon 02:00 PM Slot */}
              <label className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>☀️ બપોરે ૦૨:૦૦ વાગ્યે</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                        જાણવા જેવું & પ્રશ્નોત્તરી
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      વિદ્યાર્થીઓ માટે ૨૦ પાઠ્યપુસ્તક આધારિત પ્રશ્નોત્તરી અને ૧૨ રોચક સામાન્ય જ્ઞાન તથ્યો.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.afternoonKnowledge}
                  onChange={() => handleTogglePref('afternoonKnowledge')}
                  className="w-4 h-4 rounded mt-1 accent-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </label>

              {/* 3. Evening 06:00 PM Slot */}
              <label className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>🌆 સાંજે ૦૬:૦૦ વાગ્યે</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                        પરિપત્રો & પરીક્ષા એલર્ટ્સ
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      શાળા પરિપત્રો, આવતીકાલની કસોટી અને મહત્વના શૈક્ષણિક સૂચનો.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.eveningCircular}
                  onChange={() => handleTogglePref('eveningCircular')}
                  className="w-4 h-4 rounded mt-1 accent-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* TAB 2: CATEGORIES & EVENT ALERTS */}
          {activeTab === 'categories' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                શાળા અને વિદ્યાર્થી એલર્ટ્સ (Customized Alerts)
              </div>

              {/* Exam & 5-minute reminder */}
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      પરીક્ષા સમયપત્રક & ૫-મિનિટ રિમાઇન્ડર
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      નવી પરીક્ષા જાહેર થાય ત્યારે અને પરીક્ષા શરૂ થવાના ૫ મિનિટ પહેલાં સૂચના
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.examAlerts}
                  onChange={() => handleTogglePref('examAlerts')}
                  className="w-4 h-4 rounded accent-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </label>

              {/* Online Admission Alerts */}
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      ઓનલાઈન પ્રવેશ & મંજૂરી સૂચના
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      નવા પ્રવેશ ફોર્મ સબમિટ થતાં અને મંજૂર થતાં તાત્કાલિક એલર્ટ
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.admissionAlerts}
                  onChange={() => handleTogglePref('admissionAlerts')}
                  className="w-4 h-4 rounded accent-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </label>

              {/* Admin & Security Alerts */}
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      વહીવટી સૂચના & પાસવર્ડ રીસેટ
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      શાળા મંજૂરી અને પાસવર્ડ રીસેટ વિનંતીની સૂચના
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.adminAlerts}
                  onChange={() => handleTogglePref('adminAlerts')}
                  className="w-4 h-4 rounded accent-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* TAB 3: APP UPDATES (GITHUB) */}
          {activeTab === 'updates' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-amber-500" />
                    <span>GitHub રિપોઝિટરી સેટિંગ</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    વર્ઝન: {updateResult?.currentVersion || '1.0.0'}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    GitHub Repo (owner/repo):
                  </label>
                  <input
                    type="text"
                    value={gitRepo}
                    onChange={(e) => setGitRepo(e.target.value)}
                    placeholder="उदा. anantahir7721/vidyalayam"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCheckUpdateManual}
                  disabled={isCheckingUpdate}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdate ? 'GitHub પર તપાસી રહ્યું છે...' : 'અપડેટ તપાસો (Check for Updates)'}</span>
                </button>
              </div>

              {/* Update Available Banner */}
              {updateResult?.updateAvailable && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                    <ArrowUpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>🚀 નવી એપ અપડેટ GitHub પર ઉપલબ્ધ છે!</span>
                  </div>
                  {updateResult.latestCommitMessage && (
                    <div className="text-xs bg-emerald-500/10 p-2.5 rounded-xl font-mono text-emerald-800 dark:text-emerald-300">
                      "{updateResult.latestCommitMessage}"
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => applyAppUpdate(updateResult.latestCommitSha)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      હમણાં અપડેટ લાગુ કરો (Update & Reload)
                    </button>
                    {updateResult.htmlUrl && (
                      <a
                        href={updateResult.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 hover:bg-emerald-500/10 transition-colors"
                      >
                        <span>GitHub પર જુઓ</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {updateCheckError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
                  {updateCheckError}
                </div>
              )}
            </div>
          )}

          {/* Quick Test Triggers */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5">
            <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>નોટિફિકેશન ટેસ્ટ કરો (Quick Test)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSendTestNotification('news')}
                disabled={activeTestKey !== null}
                className="p-2 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-center transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <div className="text-xs font-bold">૦૬ AM સમાચાર</div>
                <div className="text-[10px] opacity-75">ટેસ્ટ મોકલો</div>
              </button>

              <button
                type="button"
                onClick={() => handleSendTestNotification('knowledge')}
                disabled={activeTestKey !== null}
                className="p-2 rounded-xl bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/30 text-sky-800 dark:text-sky-300 text-center transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <div className="text-xs font-bold">૦૨ PM જ્ઞાન</div>
                <div className="text-[10px] opacity-75">ટેસ્ટ મોકલો</div>
              </button>

              <button
                type="button"
                onClick={() => handleSendTestNotification('exam')}
                disabled={activeTestKey !== null}
                className="p-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-800 dark:text-purple-300 text-center transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <div className="text-xs font-bold">૫-મિનિટ એલર્ટ</div>
                <div className="text-[10px] opacity-75">ટેસ્ટ મોકલો</div>
              </button>
            </div>

            {testSuccessMessage && (
              <div className="text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                ✓ {testSuccessMessage}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-white/10 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            સાચવો & બંધ કરો
          </button>
        </div>
      </div>
    </div>
  );
};
