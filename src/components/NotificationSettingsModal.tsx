import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  AlertCircle,
  Settings,
  Send,
  Sparkles,
  Smartphone,
  Clock,
  BookOpen,
  Award,
  Check,
} from 'lucide-react';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  openNotificationSettings,
  sendNotification,
  isNativeAndroid,
} from '../utils/notificationUtils';
import {
  getNotificationSchedules,
  saveNotificationSchedules,
  triggerMorningNewsNotification,
  triggerAfternoonCircularNotification,
  triggerEveningQuizNotification,
  NotificationScheduleConfig,
} from '../utils/notificationScheduler';

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
  const [activeTestKey, setActiveTestKey] = useState<string | null>(null);

  // Automated notification schedules (6 AM, 2 PM, 6 PM)
  const [schedules, setSchedules] = useState<NotificationScheduleConfig>(() =>
    getNotificationSchedules()
  );

  // Preference toggles
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('vidyalayam_notification_prefs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      dailyBulletin: true,
      examAlerts: true,
      attendanceAlerts: true,
    };
  });

  useEffect(() => {
    if (isOpen) {
      setIsNative(isNativeAndroid());
      checkNotificationPermission().then((status) => {
        setPermission(status);
      });
      setSchedules(getNotificationSchedules());
    }
  }, [isOpen]);

  const handleToggleSchedule = (key: keyof NotificationScheduleConfig) => {
    const updated = { ...schedules, [key]: !schedules[key] };
    setSchedules(updated);
    saveNotificationSchedules(updated);
  };

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
        `${schoolName} માટે આપોઆપ દૈનિક સૂચનાઓ ચાલુ કરવામાં આવી છે.`,
        'general'
      );
    }
  };

  const handleTestMorningNews = async () => {
    setActiveTestKey('morning');
    await triggerMorningNewsNotification();
    setTimeout(() => setActiveTestKey(null), 3000);
  };

  const handleTestAfternoon = async () => {
    setActiveTestKey('afternoon');
    await triggerAfternoonCircularNotification();
    setTimeout(() => setActiveTestKey(null), 3000);
  };

  const handleTestEvening = async () => {
    setActiveTestKey('evening');
    await triggerEveningQuizNotification();
    setTimeout(() => setActiveTestKey(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center sm:items-center bg-black/80 backdrop-blur-md pt-[var(--safe-area-top)] pb-[var(--safe-area-bottom)] px-0 sm:px-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full sm:max-w-xl max-h-[92dvh] sm:max-h-[88vh] bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col text-slate-800 dark:text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-[#1a2430] border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>સૂચના સેટિંગ્સ & સમયપત્રક</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold">
                  {isNative ? 'Native Android' : 'Web App'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                દૈનિક સમાચાર, પરિપત્ર અને પ્રશ્નોત્તરી ઓટોમેશન
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - Smooth internal scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Permission Status Banner */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              permission === 'granted'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {permission === 'granted' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {permission === 'granted'
                    ? 'સૂચના પરવાનગી સક્રિય છે (Enabled)'
                    : 'સૂચના પરવાનગી જરૂરી છે (Action Required)'}
                </div>
                <div className="text-xs opacity-90 mt-0.5">
                  {permission === 'granted'
                    ? 'તમારા ફોનમાં નિયત સમયે ઓટોમેટિક સૂચનાઓ પહોંચશે.'
                    : 'સવારે ૬ વાગ્યે સમાચાર અને પરિપત્રો આપોઆપ મેળવવા પરવાનગી આપો.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {permission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  પરવાનગી આપો
                </button>
              )}

              <button
                type="button"
                onClick={openNotificationSettings}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-xs"
                title="ફોનના સિસ્ટમ સેટિંગ્સ ખોલો"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SECTION 1: AUTOMATED NOTIFICATION SCHEDULES (Requested by user) */}
          <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-white/[0.03] border border-amber-500/25 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  ઓટોમેટિક દૈનિક સમયપત્રક (Automatic Daily Schedules)
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              શાળા, શિક્ષકો અને વિદ્યાર્થીઓ માટે દિવસ દરમિયાન નિયત સમયે આપોઆપ નોટિફિકેશન મોકલાય છે:
            </p>

            <div className="space-y-2.5 pt-1">
              {/* 1. 06:00 AM Morning News Bulletin */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#16202c] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    🌅 6 AM
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        સવારે ૬:૦૦ વાગ્યે — દૈનિક તાજા સમાચાર
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold">
                        સવારની પ્રાર્થના
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      આજના ૧૦૦% તાજા શૈક્ષણિક & પ્રેરક સમાચાર અને સુવિચાર આપોઆપ પહોંચશે.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleTestMorningNews}
                    disabled={activeTestKey !== null}
                    className="px-2.5 py-1 rounded-lg bg-amber-600/10 hover:bg-amber-600/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-500/30 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{activeTestKey === 'morning' ? 'મોકલાઈ ગયું!' : 'ચકાસો'}</span>
                  </button>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedules.dailyMorningNews}
                      onChange={() => handleToggleSchedule('dailyMorningNews')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C45A2D]"></div>
                  </label>
                </div>
              </div>

              {/* 2. 02:00 PM Afternoon Circulars & Knowledge */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#16202c] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ☀️ 2 PM
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        બપોરે ૨:૦૦ વાગ્યે — શિક્ષણ પરિપત્ર & સામાન્ય જ્ઞાન
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 font-bold">
                        GSEB / GCERT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      બોર્ડ/શિક્ષણ વિભાગ પરિપત્રો અને સામાન્ય જ્ઞાનની નવીન વિગતો મળશે.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleTestAfternoon}
                    disabled={activeTestKey !== null}
                    className="px-2.5 py-1 rounded-lg bg-sky-600/10 hover:bg-sky-600/20 text-sky-700 dark:text-sky-300 text-[11px] font-bold border border-sky-500/30 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{activeTestKey === 'afternoon' ? 'મોકલાઈ ગયું!' : 'ચકાસો'}</span>
                  </button>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedules.afternoonCirculars}
                      onChange={() => handleToggleSchedule('afternoonCirculars')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C45A2D]"></div>
                  </label>
                </div>
              </div>

              {/* 3. 06:00 PM Evening Quiz & Revision */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#16202c] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    🌙 6 PM
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        સાંજે ૬:૦૦ વાગ્યે — દૈનિક પ્રશ્નોત્તરી & રિવિઝન
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-bold">
                        Daily Quiz
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      વિદ્યાર્થીઓ માટે આજના પ્રશ્નો, સંધ્યા ચિંતન અને બીજા દિવસની તૈયારી એલર્ટ.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleTestEvening}
                    disabled={activeTestKey !== null}
                    className="px-2.5 py-1 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 text-[11px] font-bold border border-purple-500/30 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{activeTestKey === 'evening' ? 'મોકલાઈ ગયું!' : 'ચકાસો'}</span>
                  </button>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedules.eveningQuiz}
                      onChange={() => handleToggleSchedule('eveningQuiz')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C45A2D]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ADDITIONAL NOTIFICATION PREFERENCES */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              અન્ય શાળા એલર્ટ્સ (Additional Alerts)
            </h4>

            <div className="space-y-2">
              {/* Exam & Results */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      પરીક્ષા, એકમ કસોટી & પરિણામ એલર્ટ્સ
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      પરીક્ષા સમયપત્રક, ગુણ એન્ટ્રી અને પરિણામ પ્રગતિ પત્રક અપડેટ્સ
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.examAlerts}
                  onChange={() => handleTogglePref('examAlerts')}
                  className="w-4 h-4 rounded text-terracotta accent-[#9d512d] focus:ring-amber-500 cursor-pointer"
                />
              </label>

              {/* Attendance & Records */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      વિદ્યાર્થી અને સ્ટાફ પત્રક રીમાઇન્ડર
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      માસિક પત્રકો, હાજરી અને આઈડી કાર્ડ તૈયાર કરવાની યાદી
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.attendanceAlerts}
                  onChange={() => handleTogglePref('attendanceAlerts')}
                  className="w-4 h-4 rounded text-terracotta accent-[#9d512d] focus:ring-amber-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Android Channel Info */}
          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
            <Smartphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              ચેનલ: <strong>વિદ્યાલયમ સૂચનાઓ (Android High Priority)</strong>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 dark:bg-[#1a2430] border-t border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden xs:inline">
            નિયત સમયે સૂચનાઓ આપોઆપ મોકલાશે
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full xs:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C45A2D] to-[#A8481F] hover:from-[#A8481F] hover:to-[#8B3813] text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>સાચવો & બંધ કરો</span>
          </button>
        </div>
      </div>
    </div>
  );
};
