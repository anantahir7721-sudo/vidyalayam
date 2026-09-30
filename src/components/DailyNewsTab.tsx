import React, { useState, useEffect, useMemo } from 'react';
import {
  Newspaper,
  Calendar,
  Clock,
  Printer,
  Sparkles,
  MapPin,
  Globe,
  Award,
  BookOpen,
  CheckCircle2,
  Copy,
  Flame,
  Info,
  Share2,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { DailyNewsBulletin, NewsItem, NewsCategory } from '../types';
import { getDailyNewsBulletin, toGujaratiDigits } from '../services/dailyKnowledgeService';
import { shareDailyNewsAsPdf } from '../utils/dailyPdfShareUtils';
import { WhatsAppIcon } from './WhatsAppIcon';

interface DailyNewsTabProps {
  schoolName?: string;
  diseCode?: string;
  district?: string;
  isSchoolView?: boolean;
}

export const DailyNewsTab: React.FC<DailyNewsTabProps> = ({
  schoolName,
  diseCode,
  district,
  isSchoolView = false,
}) => {
  const [bulletin, setBulletin] = useState<DailyNewsBulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshNews = async () => {
    setIsRefreshing(true);
    setShareFeedback('સવારે ૫:૦૦ વાગ્યાના તાજા લાઈવ સમાચાર મેળવાઈ રહ્યા છે...');
    try {
      const fresh = await getDailyNewsBulletin(new Date(), true);
      setBulletin(fresh);
      setShareFeedback('✅ તાજા લાઈવ સમાચાર સફળતાપૂર્વક અપડેટ થયા!');
    } catch (e) {
      console.error('Refresh error:', e);
      setShareFeedback('અપડેટ કરવામાં સમસ્યા આવી. ફરી પ્રયાસ કરો.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getDailyNewsBulletin()
      .then((data) => {
        if (isMounted) {
          setBulletin(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load daily news:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Countdown timer to next 5:00 AM update
  useEffect(() => {
    if (!bulletin?.nextUpdateTimeTimestamp) return;

    const updateCountdown = () => {
      const diff = bulletin.nextUpdateTimeTimestamp - Date.now();
      if (diff <= 0) {
        setTimeRemaining('હમણાં જ અપડેટ થઈ રહ્યું છે...');
        return;
      }
      const totalSecs = Math.floor(diff / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      setTimeRemaining(
        `${toGujaratiDigits(hours)} કલાક ${toGujaratiDigits(mins)} મિનિટ ${toGujaratiDigits(secs)} સેકન્ડ`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [bulletin]);

  const filteredItems = useMemo(() => {
    if (!bulletin?.items) return [];
    if (activeCategory === 'all') return bulletin.items;
    return bulletin.items.filter((item) => item.category === activeCategory);
  }, [bulletin, activeCategory]);

  const handleCopyBulletin = () => {
    if (!bulletin) return;
    const text = `📰 *${schoolName || 'શાળા દૈનિક સમાચાર'} — આજના ૧૦ મુખ્ય સમાચાર* 📰\n📅 *તારીખ:* ${bulletin.editionDate}\n⏰ *સમય:* સવારે ૫:૦૦ વાગ્યાની આવૃત્તિ\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      bulletin.items
        .map(
          (item, idx) =>
            `*${toGujaratiDigits(idx + 1)}. ${item.headline}*\n${item.summary}\n`
        )
        .join('\n') +
      `\n━━━━━━━━━━━━━━━━━━━━\n✨ સૌજન્ય: વિદ્યાલયમ શૈક્ષણિક પોર્ટલ`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Share as PDF: Creates PDF with School Name, Date, and 10 news points
  const handleSharePdfWhatsApp = async () => {
    if (!bulletin || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    setShareFeedback('સમાચાર PDF તૈયાર થઈ રહી છે...');

    try {
      const res = await shareDailyNewsAsPdf(bulletin, {
        schoolName: schoolName || 'શાળા શૈક્ષણિક પોર્ટલ',
        diseCode,
        district,
      });

      if (res.method === 'native_share') {
        setShareFeedback('WhatsApp પર શેરિંગ વિન્ડો ખૂલી ગઈ છે!');
      } else {
        setShareFeedback('PDF ડાઉનલોડ થઈ ગઈ છે અને WhatsApp ખૂલી ગયું છે!');
      }
    } catch (err) {
      console.error('PDF share error:', err);
      setShareFeedback('PDF બનાવવામાં સમસ્યા આવી. કૃપા કરીને પુનઃ પ્રયાસ કરો.');
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => setShareFeedback(null), 4000);
    }
  };

  const getCategoryBadgeClass = (category: NewsCategory) => {
    switch (category) {
      case 'kutch':
        return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30';
      case 'gujarat':
        return 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
      case 'india':
        return 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/30';
      case 'world':
        return 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30';
      case 'science_education':
        return 'bg-teal-500/10 text-teal-800 dark:text-teal-300 border-teal-500/30';
      case 'sports':
        return 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#FBE9DF] dark:bg-[#9d512d]/20 border border-[#C45A2D]/30 dark:border-[#9d512d]/40 flex items-center justify-center animate-pulse">
          <Newspaper className="w-6 h-6 text-[#C45A2D] dark:text-[#f59c73]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">આજના સમાચાર લોડ થઈ રહ્યા છે...</h3>
          <p className="text-xs text-slate-600 dark:text-[#a99f91]">સવારે ૫:૦૦ વાગ્યાની તાજી આવૃત્તિ તૈયાર થઈ રહી છે</p>
        </div>
      </div>
    );
  }

  if (!bulletin) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#121921] rounded-2xl border border-[#E2E8F0] dark:border-white/10 text-slate-900 dark:text-white">
        સમાચાર ઉપલબ્ધ નથી. કૃપા કરીને થોડીવાર પછી ફરી પ્રયાસ કરો.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#141d24] dark:via-[#1a2530] dark:to-[#0c1218] border border-[#E2E8F0] dark:border-white/10 p-5 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#C45A2D]/10 dark:bg-[#9d512d]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#FBE9DF] text-[#C45A2D] border border-[#C45A2D]/30 dark:bg-[#9d512d]/25 dark:text-[#f59c73] dark:border-[#9d512d]/40 flex items-center gap-1.5 shadow-sm">
                <Flame className="w-3.5 h-3.5" />
                આજના ૧૦ મુખ્ય સમાચાર
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/80 dark:bg-white/5 text-slate-700 dark:text-[#e4ded6] border border-[#E2E8F0] dark:border-white/10 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                દરરોજ સવારે ૫:૦૦ વાગ્યે ઓટો-અપડેટ
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Newspaper className="w-6 h-6 text-[#C45A2D] dark:text-[#f59c73]" />
              શાળા દૈનિક સમાચાર બુલેટિન (Daily News)
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-[#a99f91]">
              <span className="flex items-center gap-1.5 text-slate-900 dark:text-white font-semibold">
                <Calendar className="w-3.5 h-3.5 text-[#C45A2D] dark:text-[#f59c73]" />
                {bulletin.editionDate}
              </span>
              <span>•</span>
              <span>કચ્છ, ગુજરાત, ભારત અને વિશ્વના મહત્વના બનાવો</span>
              <span>•</span>
              <span className="text-[#C45A2D] dark:text-[#f59c73] font-medium">ધોરણ ૯ થી ૧૨ વિશેષ</span>
            </div>
          </div>

          {/* Action Buttons: WhatsApp Share PDF, Copy, Print */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* WhatsApp Share PDF Button */}
            <button
              type="button"
              onClick={handleSharePdfWhatsApp}
              disabled={isGeneratingPdf}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-900/40"
              title="શાળાના નામ સાથે આજના સમાચારની PDF વોટ્સએપ ગ્રૂપમાં શેર કરો"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>PDF બની રહી છે...</span>
                </>
              ) : (
                <>
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>WhatsApp PDF શેર</span>
                </>
              )}
            </button>

            {/* Refresh Live News Button */}
            <button
              type="button"
              onClick={handleRefreshNews}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-[#e4ded6] border border-[#E2E8F0] dark:border-white/15 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="૫:૦૦ વાગ્યાની તાજી આવૃત્તિ પુનઃ મેળવો"
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'મેળવાઈ રહ્યું છે...' : 'તાજા સમાચાર'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyBulletin}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-[#e4ded6] border border-[#E2E8F0] dark:border-white/15'
              }`}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'કોપી થઈ ગયું!' : 'શેર / કોપી'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold btn-terracotta text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>પ્રિન્ટ (સભા/બોર્ડ)</span>
            </button>
          </div>
        </div>

        {/* Feedback / Toast Notice */}
        {shareFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Morning Assembly Shloka & Cycle Countdown pill */}
        <div className="mt-5 pt-4 border-t border-[#E2E8F0] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 italic font-['Noto_Serif_Devanagari',serif]">
            <span className="text-[#C45A2D] dark:text-[#f59c73] not-italic font-bold">પ્રાર્થના મંત્ર / સુવિચાર:</span>
            <span>{bulletin.morningPrayerShloka}</span>
          </div>

          {timeRemaining && (
            <div className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-black/40 border border-[#E2E8F0] dark:border-white/10 text-[11px] text-slate-600 dark:text-[#a99f91] flex items-center gap-1.5 shrink-0">
              <Clock className="w-3 h-3 text-[#C45A2D] dark:text-[#f59c73]" />
              <span>આવતીકાલની આવૃત્તિ: <strong>{timeRemaining}</strong> માં</span>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'all', label: 'બધા ૧૦ સમાચાર (All)' },
          { id: 'kutch', label: '📍 કચ્છ વિશેષ' },
          { id: 'gujarat', label: '🦁 ગુજરાત' },
          { id: 'india', label: '🇮🇳 ભારત / રાષ્ટ્રીય' },
          { id: 'world', label: '🌍 વિશ્વ' },
          { id: 'science_education', label: '🔬 વિજ્ઞાન અને શિક્ષણ' },
          { id: 'sports', label: '🏆 રમતગમત' },
        ].map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'btn-terracotta text-white shadow-md'
                  : 'bg-white dark:bg-[#121921] hover:bg-slate-100 dark:hover:bg-[#1a2530] text-slate-700 dark:text-[#a99f91] hover:text-slate-900 dark:hover:text-white border border-[#E2E8F0] dark:border-white/10'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 10 News Items Grid / List: Headline + Short Summary only */}
      <div className="space-y-3.5">
        {filteredItems.map((item, idx) => {
          return (
            <div
              key={item.id}
              className="group rounded-2xl bg-white dark:bg-[#121921] hover:bg-slate-50 dark:hover:bg-[#151f2a] border border-[#E2E8F0] dark:border-white/10 hover:border-[#C45A2D]/40 dark:hover:border-[#9d512d]/40 transition-all p-4 sm:p-5 shadow-sm space-y-2.5 relative"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Point Number */}
                  <span className="w-7 h-7 rounded-xl bg-[#FBE9DF] border border-[#C45A2D]/30 text-[#C45A2D] dark:bg-[#9d512d]/20 dark:border-[#9d512d]/40 dark:text-[#f59c73] text-xs font-black flex items-center justify-center shrink-0">
                    {toGujaratiDigits(idx + 1)}
                  </span>

                  {/* Category Pill */}
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border uppercase tracking-wider ${getCategoryBadgeClass(
                      item.category
                    )}`}
                  >
                    {item.categoryLabel}
                  </span>
                </div>
              </div>

              {/* Main Headline */}
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-wide leading-snug">
                {item.headline}
              </h3>

              {/* Short 2-3 line summary */}
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#c9c3b8] leading-relaxed">
                {item.summary}
              </p>
            </div>
          );
        })}
      </div>

      {/* WhatsApp Group Share Banner card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-white dark:from-emerald-950/40 dark:via-[#121921] dark:to-[#121921] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center shrink-0">
            <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">શાળા અને ક્લાસ WhatsApp ગ્રૂપમાં PDF શેર કરો</h4>
            <p className="text-xs text-slate-600 dark:text-[#a99f91]">
              ક્લિક કરતાં જ શાળાના નામ અને તારીખ સાથે તૈયાર સુંદર PDF આપના મોબાઈલમાં સેવ થશે અને WhatsApp પર શેર થશે.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSharePdfWhatsApp}
          disabled={isGeneratingPdf}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-900/30 shrink-0"
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>PDF બની રહી છે...</span>
            </>
          ) : (
            <>
              <WhatsAppIcon className="w-4 h-4 text-white" />
              <span>WhatsApp PDF ડાઉનલોડ & શેર</span>
            </>
          )}
        </button>
      </div>

      {/* Assembly & Classroom Footer note */}
      <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-white/5 border border-[#E2E8F0] dark:border-white/10 text-center text-xs text-slate-600 dark:text-[#a99f91] space-y-1">
        <p className="font-semibold text-slate-900 dark:text-white">
          શાળા પ્રાર્થના સંમેલન (Morning Prayer Assembly) અને બુલેટિન બોર્ડ માટે ઉત્તમ
        </p>
        <p className="text-[11px]">
          સમાચાર દરરોજ સવારે ૫:૦૦ વાગ્યે આપમેળે નવી આવૃત્તિમાં અપડેટ થાય છે • ધોરણ ૯ થી ૧૨ના અભ્યાસક્રમ આધારિત
        </p>
      </div>
    </div>
  );
};
