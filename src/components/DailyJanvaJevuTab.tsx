import React, { useState, useEffect, useMemo } from 'react';
import {
  Lightbulb,
  Calendar,
  Clock,
  Volume2,
  VolumeX,
  Printer,
  Sparkles,
  CheckCircle2,
  Copy,
  BookOpen,
  Award,
  Loader2,
  GraduationCap,
  Share2,
} from 'lucide-react';
import { DailyInterestingFactsBulletin, DailyInterestingFact } from '../types';
import { getDailyInterestingFactsBulletin, toGujaratiDigits } from '../services/dailyKnowledgeService';
import { shareDailyInterestingFactsAsPdf } from '../utils/dailyPdfShareUtils';
import { WhatsAppIcon } from './WhatsAppIcon';
import { voiceService } from '../services/voiceService';
import { useVoice } from '../context/VoiceContext';
import { VoiceGenderSelector } from './VoiceGenderSelector';

interface DailyJanvaJevuTabProps {
  schoolName?: string;
  diseCode?: string;
  district?: string;
  isSchoolView?: boolean;
}

export const DailyJanvaJevuTab: React.FC<DailyJanvaJevuTabProps> = ({
  schoolName,
  diseCode,
  district,
  isSchoolView = false,
}) => {
  const [bulletin, setBulletin] = useState<DailyInterestingFactsBulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const { isSpeaking, activeId, loadingId, playSpeech, stopSpeech } = useVoice();

  useEffect(() => {
    let isMounted = true;
    getDailyInterestingFactsBulletin()
      .then((data) => {
        if (isMounted) {
          setBulletin(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load daily interesting facts:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      voiceService.stop();
    };
  }, []);

  // Countdown timer to next 1:00 PM (13:00) update
  useEffect(() => {
    if (!bulletin?.nextUpdateTimeTimestamp) return;

    const updateCountdown = () => {
      const diff = bulletin.nextUpdateTimeTimestamp - Date.now();
      if (diff <= 0) {
        setTimeRemaining('હમણાં જ નવી આવૃત્તિ અપડેટ થઈ રહી છે...');
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

  const filteredFacts = useMemo(() => {
    if (!bulletin?.facts) return [];
    if (activeCategory === 'all') return bulletin.facts;
    return bulletin.facts.filter((f) => f.category.includes(activeCategory));
  }, [bulletin, activeCategory]);

  const handleToggleSpeak = (fact: DailyInterestingFact) => {
    if (activeId === fact.id && isSpeaking) {
      stopSpeech();
      return;
    }

    const cleanTitle = fact.title.replace(/^[૦-૯0-9]+[.\-)]\s*/, '').trim();
    const textToSpeak = `રોમાંચક તથ્ય: ${cleanTitle}. ${fact.fact}`;
    playSpeech(fact.id, textToSpeak);
  };

  const handleCopyBulletin = () => {
    if (!bulletin) return;
    const text =
      `💡 *વિદ્યાલયમ — આજનું જાણવા જેવું (રોજના ૧૨ રોમાંચક તથ્યો)* 💡\n` +
      `📅 *તારીખ:* ${bulletin.editionDate}\n` +
      `⏰ *સમય:* બપોરે ૧:૦૦ વાગ્યાની આવૃત્તિ (ધોરણ ૯ થી ૧૨ વિશેષ)\n` +
      `🏫 *શાળા:* ${schoolName || 'શાળા પોર્ટલ'}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      bulletin.facts
        .map(
          (f, idx) =>
            `*${toGujaratiDigits(idx + 1)}. ${f.title}*\n${f.fact}\n` +
            (f.whyItMatters ? `💡 _${f.whyItMatters}_\n` : '')
        )
        .join('\n') +
      `\n━━━━━━━━━━━━━━━━━━━━\n✨ *સૌજન્ય:* વિદ્યાલયમ શૈક્ષણિક પોર્ટલ`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSharePdfWhatsApp = async () => {
    if (!bulletin || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    setShareFeedback('૧૨ તથ્યોની PDF તૈયાર થઈ રહી છે...');

    try {
      const res = await shareDailyInterestingFactsAsPdf(bulletin, {
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

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse">
          <Lightbulb className="w-6 h-6 text-amber-500 dark:text-amber-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">આજનું જાણવા જેવું લોડ થઈ રહ્યું છે...</h3>
          <p className="text-xs text-slate-500 dark:text-[#a99f91]">બપોરે ૧:૦૦ વાગ્યાની આવૃત્તિ (૧૨ રોમાંચક તથ્યો) તૈયાર થઈ રહી છે</p>
        </div>
      </div>
    );
  }

  if (!bulletin) {
    return (
      <div className="p-8 text-center bg-white/90 dark:bg-[#121921] rounded-2xl border border-[#E2E8F0] dark:border-white/10 text-slate-800 dark:text-white">
        માહિતી ઉપલબ્ધ નથી. કૃપા કરીને થોડીવાર પછી ફરી પ્રયાસ કરો.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950 via-stone-900 to-slate-950 dark:from-[#1b1f18] dark:via-[#1f2820] dark:to-[#0f140e] border border-amber-700/40 dark:border-amber-500/20 p-5 sm:p-7 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                આજનું જાણવા જેવું (Interesting Facts)
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/10 text-white/90 border border-white/20 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                દરરોજ બપોરે ૧:૦૦ વાગ્યે ઓટો-અપડેટ
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                ધોરણ ૯ થી ૧૨ વિશેષ
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-amber-400" />
              રોજના ૧૨ રોમાંચક તથ્યો (12 Daily Facts)
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {bulletin.editionDate}
              </span>
              <span>•</span>
              <span>વિજ્ઞાન, ગણિત, અવકાશ અને કુદરતના અદ્ભુત રહસ્યો</span>
              <span>•</span>
              <span className="text-amber-300 font-medium">રોજ ૧૨ નવા તથ્યો</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSharePdfWhatsApp}
              disabled={isGeneratingPdf}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-900/40"
              title="૧૨ તથ્યોની 1-Page PDF વોટ્સએપ ગ્રૂપમાં શેર કરો"
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

            <button
              type="button"
              onClick={handleCopyBulletin}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
              }`}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'કોપી થઈ ગયું!' : 'શેર / કોપી'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#C45A2D] hover:bg-[#b04f25] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>પ્રિન્ટ</span>
            </button>
          </div>
        </div>

        {shareFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Daily Motto */}
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-amber-200">
            {bulletin.dailyMotto || 'જ્ઞાન એ જ સર્વોચ્ચ શક્તિ છે — રોજ ૧૨ નવા તથ્યો શીખીને તમારા જ્ઞાનની ક્ષિતિજ વિસ્તારો!'}
          </p>
        </div>
      </div>

      {/* Category Filter Pills and Voice Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-2xl bg-white/90 dark:bg-[#0c1218] border border-[#E2E8F0] dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:hover:text-white dark:hover:bg-white/10'
            }`}
          >
            તમામ ૧૨ તથ્યો
          </button>

          {['વિજ્ઞાન', 'અવકાશ', 'ગણિત', 'જીવવિજ્ઞાન', 'રસાયણ', 'ભૂગોળ', 'ટેકનોલોજી'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:hover:text-white dark:hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <VoiceGenderSelector compact />
      </div>

      {/* 12 Facts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFacts.map((fact) => {
          const isItemSpeaking = activeId === fact.id && isSpeaking;
          const isItemLoading = loadingId === fact.id;

          return (
            <div
              key={fact.id}
              className="relative rounded-2xl p-5 bg-white/90 dark:bg-[#121921] border border-[#E2E8F0] dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-500/40 transition-all duration-200 flex flex-col justify-between shadow-xs group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
                      {toGujaratiDigits(fact.factNumber)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:border-white/10">
                      {fact.category}
                    </span>
                    {fact.relatedClass && (
                      <span className="text-[9.5px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                        {fact.relatedClass}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSpeak(fact)}
                    disabled={isItemLoading}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      isItemSpeaking
                        ? 'bg-amber-600 text-white animate-pulse'
                        : isItemLoading
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-[#a99f91] dark:hover:text-white dark:hover:bg-white/10'
                    }`}
                    title="સાંભળો (Audio)"
                  >
                    {isItemLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    ) : isItemSpeaking ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-300 transition-colors leading-snug">
                  {fact.title}
                </h3>

                {/* Fact Body */}
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {fact.fact}
                </p>

                {/* Why It Matters for Std 9-12 */}
                {fact.whyItMatters && (
                  <div className="mt-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-500/20 text-sky-900 dark:text-sky-200 text-xs leading-relaxed flex items-start gap-2">
                    <span className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">💡</span>
                    <div>
                      <strong className="text-sky-800 dark:text-sky-300 font-bold block mb-0.5">ધોરણ ૯ થી ૧૨ ઉપયોગિતા:</strong>
                      <span>{fact.whyItMatters}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Info Footer */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0c1218] border border-[#E2E8F0] dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-[#a99f91] shadow-xs">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>દરરોજ બપોરે ૧:૦૦ વાગ્યે ૧૨ નવા રોમાંચક તથ્યો આપમેળે અપડેટ થાય છે.</span>
        </div>
        {timeRemaining && (
          <div className="font-mono text-amber-700 dark:text-amber-400 font-bold">
            આગામી અપડેટ: {timeRemaining}
          </div>
        )}
      </div>
    </div>
  );
};
