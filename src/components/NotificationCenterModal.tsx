import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  Calendar,
  Award,
  BookOpen,
  Sparkles,
  Shield,
  Trash2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { AppNotification } from '../types';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  schoolId?: string | null;
  title?: string;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  schoolId,
  title = 'સૂચના કેન્દ્ર (Notifications)',
  onNavigateTab,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'exams' | 'daily'>('all');

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'exams') return n.category.includes('exam');
    if (filter === 'daily') return n.category.includes('daily');
    return true;
  });

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(schoolId, notifications);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await markNotificationAsRead(schoolId, notif.id);
    }
    if (notif.actionUrl && onNavigateTab) {
      onNavigateTab(notif.actionUrl);
      onClose();
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'હમણાં જ';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} મિનિટ પહેલાં`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} કલાક પહેલાં`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} દિવસ પહેલાં`;
  };

  const getCategoryBadge = (category: string) => {
    if (category.includes('news')) return { label: 'દૈનિક સમાચાર', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
    if (category.includes('knowledge')) return { label: 'જાણવા જેવું', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' };
    if (category.includes('exam')) return { label: 'પરીક્ષા', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
    if (category.includes('admission')) return { label: 'પ્રવેશ', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
    if (category.includes('approval') || category.includes('reset')) return { label: 'વહીવટી', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' };
    return { label: 'સામાન્ય', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
  };

  return (
    <div className="fixed inset-0 z-[160] overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm shrink-0">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{title}</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                    {unreadCount} નવી
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                પરીક્ષા, પરિણામ, સમાચાર અને શાળાના મહત્વના સંદેશા
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

        {/* Filter Bar & Mark All Read */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-white/10 text-xs shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              તમામ ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              નવી ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('exams')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'exams'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              પરીક્ષા
            </button>
            <button
              type="button"
              onClick={() => setFilter('daily')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'daily'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              દૈનિક
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-amber-600 dark:text-amber-400 hover:underline font-bold text-[11px] cursor-pointer"
            >
              બધી વંચાઈ ગઈ
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                <Bell className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                હાલમાં કોઈ નવી સૂચના નથી
              </div>
              <div className="text-xs text-slate-400 max-w-xs mx-auto">
                જ્યારે શાળા અથવા શિક્ષકો દ્વારા નવી સૂચના, પરીક્ષા કે પરિણામ મુકાશે ત્યારે અહીં દેખાશે.
              </div>
            </div>
          ) : (
            filtered.map((item) => {
              const badge = getCategoryBadge(item.category);
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    !item.read
                      ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 shadow-xs'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-white/5 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badge.color}`}>
                        {badge.label}
                      </span>
                      {item.studentName && (
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {item.studentName} {item.standard ? `(ધોરણ ${item.standard})` : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>

                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-1.5 flex items-center gap-1.5">
                    {!item.read && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                    <span>{item.title}</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-xs text-slate-500 shrink-0">
          <span>કુલ {notifications.length} સૂચનાઓ</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            બંધ કરો
          </button>
        </div>
      </div>
    </div>
  );
};
