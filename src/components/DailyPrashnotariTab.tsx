import React, { useState, useEffect, useMemo } from 'react';
import {
  HelpCircle,
  Calendar,
  Clock,
  Volume2,
  VolumeX,
  Printer,
  Eye,
  EyeOff,
  CheckCircle2,
  Copy,
  Star,
  BookOpen,
  Award,
  Loader2,
  Quote,
} from 'lucide-react';
import { DailyPrashnotariBulletin, PrashnotariQuestion } from '../types';
import { getDailyPrashnotariBulletin, toGujaratiDigits } from '../services/dailyKnowledgeService';
import { shareDailyJanvaJevuAsPdf } from '../utils/dailyPdfShareUtils';
import { WhatsAppIcon } from './WhatsAppIcon';

interface DailyPrashnotariTabProps {
  schoolName?: string;
  diseCode?: string;
  district?: string;
  isSchoolView?: boolean;
}

export const DailyPrashnotariTab: React.FC<DailyPrashnotariTabProps> = ({
  schoolName,
  diseCode,
  district,
  isSchoolView = false,
}) => {
  const [bulletin, setBulletin] = useState<DailyPrashnotariBulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [studyMode, setStudyMode] = useState<'study' | 'test'>('study');
  const [revealedAnswers, setRevealedAnswers] = useState<{ [qId: string]: boolean }>({});
  const [copied, setCopied] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getDailyPrashnotariBulletin()
      .then((data) => {
        if (isMounted) {
          setBulletin(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load daily Prashnotari:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
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

  const filteredQuestions = useMemo(() => {
    if (!bulletin?.questions) return [];
    if (activeFilter === 'all') return bulletin.questions;
    if (activeFilter === 'weekly_core') {
      return bulletin.questions.filter((q) => q.isWeeklyCoreRevision);
    }
    return bulletin.questions.filter((q) => q.subject.includes(activeFilter));
  }, [bulletin, activeFilter]);

  const toggleReveal = (qId: string) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleRevealAll = (reveal: boolean) => {
    if (!bulletin?.questions) return;
    const nextState: { [qId: string]: boolean } = {};
    bulletin.questions.forEach((q) => {
      nextState[q.id] = reveal;
    });
    setRevealedAnswers(nextState);
  };

  const handleToggleSpeak = (q: PrashnotariQuestion) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('તમારા બ્રાઉઝરમાં ઓડિયો સુવિધા ઉપલબ્ધ નથી.');
      return;
    }

    if (speakingId === q.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const textToSpeak = `પ્રશ્ન: ${q.question}. જવાબ: ${q.answer}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'gu-IN';
    utterance.rate = 0.95;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(q.id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyBulletin = () => {
    if (!bulletin) return;
    const suvichar = bulletin.suvichar || 'વિદ્યા દદાતિ વિનયં, વિનયાદ્યાતિ પાત્રતામ્ ।';
    const text = `❓ *વિદ્યાલયમ — આજની પ્રશ્નોત્તરી (૨૦ સામાન્ય જ્ઞાન પ્રશ્નો)* ❓\n📅 *તારીખ:* ${bulletin.editionDate}\n⏰ *સમય:* બપોરે ૧:૦૦ વાગ્યાની આવૃત્તિ\n🏫 *શાળા:* ${schoolName || 'શાળા પોર્ટલ'}\n✨ *આજનો સુવિચાર:* "${suvichar}"\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      bulletin.questions
        .map(
          (q, idx) =>
            `*${toGujaratiDigits(idx + 1)}. પ્રશ્ન:* ${q.question}\n👉 *જવાબ:* ${q.answer}\n`
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
    setShareFeedback('પ્રશ્નોત્તરી PDF તૈયાર થઈ રહી છે...');

    try {
      const res = await shareDailyJanvaJevuAsPdf(bulletin, {
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

  const weeklyCoreCount = useMemo(() => {
    return bulletin?.questions.filter((q) => q.isWeeklyCoreRevision).length || 0;
  }, [bulletin]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center animate-pulse">
          <HelpCircle className="w-6 h-6 text-sky-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">આજની પ્રશ્નોત્તરી લોડ થઈ રહી છે...</h3>
          <p className="text-xs text-[#a99f91]">બપોરે ૧:૦૦ વાગ્યાની આવૃત્તિ (૨૦ પ્રશ્નોત્તરી) તૈયાર થઈ રહી છે</p>
        </div>
      </div>
    );
  }

  if (!bulletin) {
    return (
      <div className="p-8 text-center bg-[#121921] rounded-2xl border border-white/10 text-white">
        માહિતી ઉપલબ્ધ નથી. કૃપા કરીને થોડીવાર પછી ફરી પ્રયાસ કરો.
      </div>
    );
  }

  const suvichar = bulletin.suvichar || 'વિદ્યા દદાતિ વિનયં, વિનયાદ્યાતિ પાત્રતામ્ । પાત્રત્વાદ્ધનમાપ્નોતિ, ધનાદ્ધર્મં તતઃ સુખમ્ ॥';

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121c25] via-[#1a2632] to-[#0c131a] border border-white/10 p-5 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5 shadow-sm">
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                આજની પ્રશ્નોત્તરી (Daily Q&A Quiz)
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/5 text-[#e4ded6] border border-white/10 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                દરરોજ બપોરે ૧:૦૦ વાગ્યે ઓટો-અપડેટ
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-sky-400" />
              દૈનિક સામાન્ય જ્ઞાન — ૨૦ પ્રશ્નોત્તરી
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#a99f91]">
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                {bulletin.editionDate}
              </span>
              <span>•</span>
              <span>પાઠ્યપુસ્તક આધારિત પાયાનું સામાન્ય જ્ઞાન</span>
              <span>•</span>
              <span className="text-sky-300 font-medium">ધોરણ ૯ થી ૧૨ વિશેષ</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSharePdfWhatsApp}
              disabled={isGeneratingPdf}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-900/40"
              title="પ્રશ્નોત્તરીની PDF વોટ્સએપ ગ્રૂપમાં શેર કરો"
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

            {/* Study Mode vs Test Mode */}
            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStudyMode('study');
                  handleRevealAll(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  studyMode === 'study'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-[#a99f91] hover:text-white'
                }`}
              >
                અભ્યાસ મોડ
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudyMode('test');
                  handleRevealAll(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  studyMode === 'test'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-[#a99f91] hover:text-white'
                }`}
              >
                ટેસ્ટ મોડ (ક્વિઝ)
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyBulletin}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 hover:bg-white/15 text-[#e4ded6] border border-white/15'
              }`}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'કોપી થઈ ગયું!' : 'શેર / કોપી'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#9d512d] hover:bg-[#b55f37] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>પ્રિન્ટ</span>
            </button>
          </div>
        </div>

        {shareFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Suvichar Box */}
        <div className="mt-5 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0 text-sky-300">
            <Quote className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
              આજનો પ્રેરણાદાયી સુવિચાર
            </div>
            <p className="text-sm font-semibold text-white/95 italic leading-relaxed">
              "{suvichar}"
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Test Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#0c1218] border border-white/10">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-sky-600 text-white'
                : 'bg-white/5 text-[#a99f91] hover:text-white hover:bg-white/10'
            }`}
          >
            તમામ ૨૦ પ્રશ્નો
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('weekly_core')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'weekly_core'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>સાપ્તાહિક પુનરાવર્તન ({toGujaratiDigits(weeklyCoreCount)})</span>
          </button>

          {['વિજ્ઞાન', 'સામાજિક', 'ગણિત', 'ગુજરાતી', 'બંધારણ', 'ભૂગોળ'].map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setActiveFilter(subj)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === subj
                  ? 'bg-sky-600 text-white font-bold'
                  : 'bg-white/5 text-[#a99f91] hover:text-white hover:bg-white/10'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        {studyMode === 'test' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRevealAll(true)}
              className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>બધા જવાબો બતાવો</span>
            </button>
            <span className="text-white/20">|</span>
            <button
              type="button"
              onClick={() => handleRevealAll(false)}
              className="text-xs text-[#a99f91] hover:text-white font-medium flex items-center gap-1 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>બધા જવાબો છુપાવો</span>
            </button>
          </div>
        )}
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredQuestions.map((q) => {
          const isRevealed = studyMode === 'study' || revealedAnswers[q.id];
          const isSpeaking = speakingId === q.id;

          return (
            <div
              key={q.id}
              className={`relative rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between ${
                q.isWeeklyCoreRevision
                  ? 'bg-[#141b22] border-amber-500/30 hover:border-amber-500/60 shadow-md'
                  : 'bg-[#121921] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-sky-500/30">
                      {toGujaratiDigits(q.questionNumber)}
                    </span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full font-bold bg-white/5 text-[#a99f91] border border-white/10">
                      {q.subject}
                    </span>
                    {q.isWeeklyCoreRevision && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        સાપ્તાહિક પુનરાવર્તન
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSpeak(q)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      isSpeaking
                        ? 'bg-sky-600 text-white animate-pulse'
                        : 'text-[#a99f91] hover:text-white hover:bg-white/10'
                    }`}
                    title="સાંભળો (Audio Speech)"
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Question Text */}
                <h4 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                  {q.question}
                </h4>

                {/* Answer Area */}
                <div className="pt-2 border-t border-white/5">
                  {isRevealed ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1 animate-in fade-in duration-150">
                      <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>સાચો જવાબ:</span>
                      </div>
                      <div className="text-sm font-bold text-white">
                        {q.answer}
                      </div>
                      {q.explanation && (
                        <div className="text-xs text-[#a99f91] mt-1 pt-1 border-t border-white/5">
                          💡 {q.explanation}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleReveal(q.id)}
                      className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>જવાબ જોવા માટે અહીં ક્લિક કરો</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Info Footer */}
      <div className="p-4 rounded-2xl bg-[#0c1218] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#a99f91]">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-sky-400" />
          <span>દરરોજ બપોરે ૧:૦૦ વાગ્યે નવી આવૃત્તિ આપમેળે પ્રકાશિત થાય છે.</span>
        </div>
        {timeRemaining && (
          <div className="font-mono text-sky-400 font-bold">
            આગામી આવૃત્તિ: {timeRemaining}
          </div>
        )}
      </div>
    </div>
  );
};
