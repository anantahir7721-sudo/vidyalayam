import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Bell,
  CheckCircle2,
  AlertCircle,
  Settings,
  Send,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Calendar,
  BookOpen,
  Award,
} from 'lucide-react';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  openNotificationSettings,
  sendNotification,
  isNativeAndroid,
} from '../utils/notificationUtils';
import { apiUrl } from '../utils/apiConfig';

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
  const [testSent, setTestSent] = useState(false);
  const [isNative, setIsNative] = useState(false);

  // Preference toggles (saved to localStorage)
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('vidyalayam_notification_prefs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      dailyBulletin: true,
      examAlerts: true,
      attendanceAlerts: true,
      systemUpdates: true,
    };
  });

  useEffect(() => {
    if (isOpen) {
      setIsNative(isNativeAndroid());
      checkNotificationPermission().then((status) => {
        setPermission(status);
      });
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      sendNotification(
        'વિદ્યાલયમ • સૂચનાઓ સક્રિય થઈ',
        `${schoolName} માટે સૂચનાઓ સફળતાપૂર્વક ચાલુ કરવામાં આવી છે.`,
        'general'
      );
    }
  };

  const [activeTestKey, setActiveTestKey] = useState<string | null>(null);

  const handleSendNewsNotification = async () => {
    setActiveTestKey('news');
    try {
      const res = await fetch(apiUrl('/api/daily-news'));
      if (res.ok) {
        const json = await res.json();
        const topItem = json?.bulletin?.items?.[0];
        if (topItem) {
          await sendNotification(
            `📰 દૈનિક તાજા સમાચાર • દિવ્ય ભાસ્કર`,
            `${topItem.headline} (સ્ત્રોત: દિવ્ય ભાસ્કર & ગુજરાત લાઈવ)`,
            'daily'
          );
          setTimeout(() => setActiveTestKey(null), 3000);
          return;
        }
      }
    } catch (e) {}

    await sendNotification(
      `📰 દૈનિક તાજા સમાચાર • દિવ્ય ભાસ્કર`,
      'ગુજરાત શિક્ષણ અને વહીવટી વિભાગના મહત્વપૂર્ણ આજના તાજા સમાચાર.',
      'daily'
    );
    setTimeout(() => setActiveTestKey(null), 3000);
  };

  const handleSendCircularNotification = async () => {
    setActiveTestKey('circular');
    await sendNotification(
      `📜 સત્તાવાર GSEB / GCERT પરિપત્ર એલર્ટ`,
      'ધોરણ ૧૦ & ૧૨ બોર્ડ પરીક્ષા આવેદન પત્રો અને એકમ કસોટી (PAT) સત્તાવાર માર્ગદર્શિકા પ્રસિદ્ધ (gseb.org).',
      'general'
    );
    setTimeout(() => setActiveTestKey(null), 3000);
  };

  const handleSendThoughtNotification = async () => {
    setActiveTestKey('thought');
    await sendNotification(
      `✨ આજનો પ્રેરક સુવિચાર & સંકલ્પ`,
      'વિદ્યા વિનયેન શોભતે — શિક્ષણ અને સંસ્કાર દ્વારા રાષ્ટ્ર નિર્માણ. આપનો દિવસ શુભ રહે!',
      'general'
    );
    setTimeout(() => setActiveTestKey(null), 3000);
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto overscroll-contain animate-in fade-in duration-150"
      style={{
        paddingTop: 'max(1rem, calc(var(--system-status-bar-height, 0px) + 0.75rem))',
        paddingBottom: 'max(1rem, calc(var(--system-nav-bar-height, 0px) + 0.75rem))',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-lg m-auto max-h-[min(88vh,calc(100dvh-var(--system-status-bar-height,0px)-2rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-settings-title"
      >
        {/* Header - Fixed & safe from clipping */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3
                  id="notification-settings-title"
                  className="text-sm sm:text-base font-bold text-slate-900 dark:text-white"
                >
                  સૂચના સેટિંગ્સ
                </h3>
                <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 shrink-0">
                  {isNative ? 'Native Android' : 'Web App'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                શાળા પરિપત્રો, દૈનિક પ્રાર્થના અને પરીક્ષા એલર્ટ્સ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            aria-label="બંધ કરો"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable with min-h-0 so it NEVER overflows or cuts off */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Permission Status Banner */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              permission === 'granted'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
              {permission === 'granted' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm">
                  {permission === 'granted'
                    ? 'સૂચના પરવાનગી સક્રિય છે (Enabled)'
                    : 'સૂચના પરવાનગી જરૂરી છે (Action Required)'}
                </div>
                <div className="text-[11px] sm:text-xs opacity-90 mt-0.5 leading-relaxed">
                  {permission === 'granted'
                    ? 'આપના ફોનમાં તમામ તાત્કાલિક શાળા એલર્ટ્સ પહોંચશે.'
                    : 'મહત્વના પરિપત્રો અને સૂચનાઓ મેળવવા માટે પરવાનગી આપો.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {permission !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  પરવાનગી આપો
                </button>
              ) : null}

              <button
                type="button"
                onClick={openNotificationSettings}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-xs cursor-pointer"
                title="ફોનના સિસ્ટમ સેટિંગ્સ ખોલો"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Useful Quick Action Notification Triggers */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5 sm:space-y-3">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>ઉપયોગી નોટિફિકેશન મોકલો (Useful School Alerts)</span>
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                નીચેનામાંથી કોઈપણ બટન પર ક્લિક કરીને તુરંત તમારા ફોનમાં ઉપયોગી માહિતી મેળવો:
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleSendNewsNotification}
                disabled={activeTestKey !== null}
                className="p-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 text-center shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{activeTestKey === 'news' ? 'મોકલી દીધા!' : 'દિવ્ય ભાસ્કર સમાચાર'}</span>
                </div>
                <span className="text-[10px] font-normal opacity-90 truncate max-w-full">આજના તાજા લાઈવ સમાચાર</span>
              </button>

              <button
                type="button"
                onClick={handleSendCircularNotification}
                disabled={activeTestKey !== null}
                className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 text-center shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{activeTestKey === 'circular' ? 'મોકલી દીધો!' : 'GSEB બોર્ડ પરિપત્ર'}</span>
                </div>
                <span className="text-[10px] font-normal opacity-90 truncate max-w-full">સત્તાવાર પરિપત્ર એલર્ટ</span>
              </button>

              <button
                type="button"
                onClick={handleSendThoughtNotification}
                disabled={activeTestKey !== null}
                className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 text-center shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{activeTestKey === 'thought' ? 'મોકલી દીધો!' : 'આજનો સુવિચાર'}</span>
                </div>
                <span className="text-[10px] font-normal opacity-90 truncate max-w-full">શાળા પ્રાર્થના & સંકલ્પ</span>
              </button>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="space-y-3">
            <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              સૂચનાના પ્રકાર (Notification Categories)
            </h4>

            <div className="space-y-2">
              {/* Daily Morning Bulletin */}
              <label className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      દૈનિક સવારની પ્રાર્થના & સમાચાર
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      આજના સમાચાર, સુવિચાર અને સામાન્ય જ્ઞાન તૈયાર થતાં નોટિફિકેશન
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.dailyBulletin}
                  onChange={() => handleTogglePref('dailyBulletin')}
                  className="w-4 h-4 rounded text-terracotta accent-[#9d512d] focus:ring-amber-500 cursor-pointer shrink-0"
                />
              </label>

              {/* Exam & Results */}
              <label className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      પરીક્ષા, એકમ કસોટી & પરિણામ
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      પરીક્ષા સમયપત્રક, ગુણ એન્ટ્રી અને પરિણામ પ્રગતિ પત્રક અપડેટ્સ
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.examAlerts}
                  onChange={() => handleTogglePref('examAlerts')}
                  className="w-4 h-4 rounded text-terracotta accent-[#9d512d] focus:ring-amber-500 cursor-pointer shrink-0"
                />
              </label>

              {/* Attendance & Records */}
              <label className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      વિદ્યાર્થી અને સ્ટાફ પત્રક રીમાઇન્ડર
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      મહિનાના પત્રકો, હાજરી અને આઈડી કાર્ડ તૈયાર કરવાની યાદી
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.attendanceAlerts}
                  onChange={() => handleTogglePref('attendanceAlerts')}
                  className="w-4 h-4 rounded text-terracotta accent-[#9d512d] focus:ring-amber-500 cursor-pointer shrink-0"
                />
              </label>
            </div>
          </div>

          {/* Android Channel Info */}
          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
            <Smartphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="leading-tight">
              ચેનલ: <strong>વિદ્યાલયમ સૂચનાઓ (Android 13+ High Priority)</strong>
            </span>
          </div>
        </div>

        {/* Footer - Fixed at bottom & never cut off */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            સેટિંગ્સ આપોઆપ સાચવવામાં આવે છે
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer ml-auto text-center"
          >
            સાચવો & બંધ કરો
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
