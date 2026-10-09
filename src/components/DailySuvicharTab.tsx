import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Copy,
  CheckCircle2,
  BookOpen,
  RotateCw,
  Lightbulb,
  Award,
  Mic,
  Clock,
  ListChecks,
  Loader2,
  Download,
} from 'lucide-react';
import { DailySuvicharBulletin } from '../types';
import { getDailySuvicharBulletin } from '../services/dailyKnowledgeService';
import { shareDailySuvicharAsPdf, downloadDailySuvicharAsPdf } from '../utils/dailyPdfShareUtils';
import { WhatsAppIcon } from './WhatsAppIcon';

interface DailySuvicharTabProps {
  schoolName?: string;
  diseCode?: string;
  district?: string;
  isSchoolView?: boolean;
}

export const DailySuvicharTab: React.FC<DailySuvicharTabProps> = ({
  schoolName,
  diseCode,
  district,
  isSchoolView = false,
}) => {
  const [bulletin, setBulletin] = useState<DailySuvicharBulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [offsetIndex, setOffsetIndex] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getDailySuvicharBulletin(new Date(), offsetIndex)
      .then((data) => {
        if (isMounted) {
          setBulletin(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load daily suvichar:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [offsetIndex]);

  // Copy full suvichar and speech script
  const handleCopy = () => {
    if (!bulletin) return;
    const { thought, authorOrSource, explanation, example, moralValue, keyPoints } = bulletin.suvichar;
    
    let text =
      `✨ *${schoolName || 'શાળા સંસ્કાર વાણી'} — આજનો સુવિચાર* ✨\n` +
      `📅 *તારીખ:* ${bulletin.editionDate}\n` +
      `🎙️ *શાળા પ્રાર્થના સંમેલન વક્તવ્ય (૨-૩ મિનિટ)*\n\n` +
      `❝ *${thought}* ❞\n` +
      (authorOrSource ? `— *${authorOrSource}*\n\n` : '\n') +
      `📖 *વિસ્તૃત સમજૂતી (Explanation):*\n${explanation}\n\n` +
      `🌟 *વ્યવહારિક ઉદાહરણ (Real-Life Example):*\n${example}\n\n`;

    if (keyPoints && keyPoints.length > 0) {
      text += `🎤 *સભા વક્તવ્યના મુખ્ય મુદ્દા:*\n` + keyPoints.map((pt, i) => `${i + 1}. ${pt}`).join('\n') + `\n\n`;
    }

    text += `🎯 *જીવનમૂલ્ય:* ${moralValue}\n\n💫 સૌજન્ય: વિદ્યાલયમ શૈક્ષણિક પોર્ટલ`;

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Direct PDF Download
  const handleDownloadPdf = async () => {
    if (!bulletin || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setShareFeedback('સુવિચાર PDF ડાઉનલોડ થઈ રહી છે...');

    try {
      await downloadDailySuvicharAsPdf(bulletin, {
        schoolName: schoolName || 'શાળા શૈક્ષણિક પોર્ટલ',
        diseCode,
        district,
      });
      setShareFeedback('✅ સુવિચાર PDF સફળતાપૂર્વક ડિવાઇસના Downloads ફોલ્ડરમાં સેવ થઈ ગઈ!');
    } catch (err) {
      console.error('PDF Download Error:', err);
      setShareFeedback('❌ PDF ડાઉનલોડ કરવામાં સમસ્યા થઈ.');
    } finally {
      setIsDownloadingPdf(false);
      setTimeout(() => setShareFeedback(null), 4000);
    }
  };

  // WhatsApp 1-Page PDF Share
  const handleSharePdf = async () => {
    if (!bulletin || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setShareFeedback('1-Page સુવિચાર PDF બની રહી છે...');

    try {
      const res = await shareDailySuvicharAsPdf(bulletin, {
        schoolName: schoolName || 'શાળા શૈક્ષણિક પોર્ટલ',
        diseCode,
        district,
      });

      if (res.method === 'native_share') {
        setShareFeedback('✅ WhatsApp / શેર મેનૂમાં PDF મોકલવામાં આવી છે!');
      } else if (res.method === 'whatsapp_web') {
        setShareFeedback('✅ PDF ડાઉનલોડ થઈ ગઈ છે અને WhatsApp ખૂલી ગયું છે!');
      } else {
        setShareFeedback('✅ PDF ડિવાઇસમાં ડાઉનલોડ થઈ ગઈ છે!');
      }
    } catch (err) {
      console.error('PDF Share Error:', err);
      setShareFeedback('❌ PDF બનાવવામાં સમસ્યા થઈ. ફરી પ્રયાસ કરો.');
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => setShareFeedback(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#9d512d] animate-spin" />
        <p className="text-xs text-stone-500 font-bold">આજનો સુવિચાર અને વક્તવ્ય લોડ થઈ રહ્યું છે...</p>
      </div>
    );
  }

  if (!bulletin) {
    return (
      <div className="p-8 text-center text-stone-500">
        સુવિચાર ઉપલબ્ધ નથી. કૃપા કરીને થોડીવાર પછી ફરી પ્રયાસ કરો.
      </div>
    );
  }

  const { thought, authorOrSource, explanation, example, moralValue, keyPoints } = bulletin.suvichar;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner Card */}
      <div className="rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-[#9d512d] via-[#b55f37] to-[#7c3d1f] text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>શાળા પ્રાર્થના સંમેલન & પ્રેરણા વાણી</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              ✨ આજનો સુવિચાર (Ajno Suvichar)
            </h2>

            <div className="flex items-center gap-3 text-xs text-white/90 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-200" />
                {bulletin.editionDate}
              </span>
              <span className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-md text-[11px]">
                <Clock className="w-3 h-3 text-amber-300" />
                ૨ થી ૩ મિનિટ સભા વક્તવ્ય માટે તૈયાર
              </span>
              {schoolName && (
                <span>• {schoolName}</span>
              )}
            </div>
          </div>

          {/* Action Buttons: Download PDF, WhatsApp PDF & Next Thought */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 border border-white/20"
              title="સુવિચારની 1-Page PDF ફાઈલ ડિવાઇસના Downloads ફોલ્ડરમાં સાચવો"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ડાઉનલોડ થઈ રહી છે...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>PDF ડાઉનલોડ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSharePdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-75"
              title="1-Page PDF બનાવી WhatsApp ગ્રૂપમાં મોકલો"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>PDF બની રહી છે...</span>
                </>
              ) : (
                <>
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>WhatsApp PDF શેર</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
              title="સંપૂર્ણ વક્તવ્ય સ્ક્રિપ્ટ કોપી કરો"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>કોપી થઈ ગયું!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>કોપી વક્તવ્ય</span>
                </>
              )}
            </button>

            {isSchoolView && (
              <button
                type="button"
                onClick={() => setOffsetIndex((prev) => prev + 1)}
                className="px-3 py-2.5 rounded-2xl bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 font-bold text-xs flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-amber-300/30"
                title="બીજો નવો સુવિચાર જુઓ (Non-repeating)"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>બીજો સુવિચાર</span>
              </button>
            )}
          </div>
        </div>

        {/* Share Status Toast */}
        {shareFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-white/20 text-xs font-bold text-white flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}
      </div>

      {/* Main Suvichar Card */}
      <div className="glass-panel rounded-3xl border border-stone-200 dark:border-white/10 p-6 sm:p-8 shadow-xl relative overflow-hidden bg-white dark:bg-[#121921]">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="text-3xl sm:text-4xl text-[#9d512d] dark:text-[#f59c73] font-serif leading-none opacity-60">
            ❝
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900 dark:text-white leading-relaxed tracking-wide">
            {thought}
          </h1>

          <div className="text-3xl sm:text-4xl text-[#9d512d] dark:text-[#f59c73] font-serif leading-none opacity-60">
            ❞
          </div>

          {authorOrSource && (
            <div className="pt-2">
              <span className="inline-block px-4 py-1.5 rounded-full bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs font-bold text-[#9d512d] dark:text-[#f59c73]">
                — {authorOrSource}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Speech Guide Banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold">
        <Mic className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>શાળા પ્રાર્થના સંમેલનમાં શિક્ષક અથવા વિદ્યાર્થી દ્વારા ૨ થી ૩ મિનિટ વક્તવ્ય માટે નીચેની વિસ્તૃત સમજૂતી અને ઉદાહરણ બોલી શકાય છે:</span>
      </div>

      {/* Detailed Speech Sections: Explanation & Example */}
      <div className="space-y-4">
        {/* Detailed Explanation Card (૧.૫ થી ૨ મિનિટ બોલી શકાય તેવી સમજૂતી) */}
        <div className="glass-panel rounded-3xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 p-5 sm:p-7 space-y-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-black text-sm">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>📖 વિસ્તૃત સમજૂતી (Speech Explanation)</span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
              બોલવાનો સમય: ~૧.૫ મિનિટ
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-normal text-justify sm:text-left">
            {explanation}
          </p>
        </div>

        {/* Practical Example Card (૧ થી ૧.૫ મિનિટ બોલી શકાય તેવું જીવંત ઉદાહરણ) */}
        <div className="glass-panel rounded-3xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 sm:p-7 space-y-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-sm">
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span>🌟 વ્યવહારિક ઉદાહરણ અને પ્રેરણા પ્રસંગ (Real-Life Example)</span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
              બોલવાનો સમય: ~૧ મિનિટ
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-normal text-justify sm:text-left">
            {example}
          </p>
        </div>

        {/* Key Highlights / Talking Points for Assembly */}
        {keyPoints && keyPoints.length > 0 && (
          <div className="glass-panel rounded-3xl border border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20 p-5 sm:p-6 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-black text-sm">
              <ListChecks className="w-4 h-4 shrink-0" />
              <span>🎤 સભા વક્તવ્ય માટેના ૩ મુખ્ય સૂત્રો (Assembly Speech Highlights)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {keyPoints.map((point, index) => (
                <div
                  key={index}
                  className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-purple-200 dark:border-white/10 text-xs font-semibold text-stone-800 dark:text-stone-200 leading-relaxed shadow-xs flex items-start gap-2"
                >
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                    {index + 1}
                  </span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Core Life Value (જીવનમૂલ્ય) Banner */}
      <div className="glass-panel rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-800 dark:text-amber-200">
              આજનું પાયાનું સંસ્કાર મૂલ્ય
            </div>
            <div className="text-sm font-black text-stone-900 dark:text-white">
              {moralValue}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSharePdf}
          disabled={isGeneratingPdf}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          <span>WhatsApp PDF શેર કરો</span>
        </button>
      </div>

      {/* WhatsApp Share Banner at the bottom */}
      <div className="rounded-3xl p-5 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-emerald-950/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <WhatsAppIcon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">
              📲 શાળા કે વર્ગખંડ WhatsApp ગ્રૂપમાં PDF મોકલો
            </h4>
            <p className="text-xs text-stone-300">
              આજના સુવિચાર, ૨-૩ મિનિટ વક્તવ્ય સમજૂતી અને ઉદાહરણની સુંદર ૧-પાનાની PDF ડાઉનલોડ કરીને શેર કરો.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSharePdf}
          disabled={isGeneratingPdf}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-lg transition-all shrink-0 cursor-pointer"
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>તૈયાર થાય છે...</span>
            </>
          ) : (
            <>
              <WhatsAppIcon className="w-4 h-4" />
              <span>૧-ક્લિકમાં PDF શેર</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
