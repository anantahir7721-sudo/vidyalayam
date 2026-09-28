import React, { useState, useEffect, useMemo } from 'react';
import {
  Lightbulb,
  Calendar,
  Clock,
  Volume2,
  VolumeX,
  Printer,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  Copy,
  Star,
  BookOpen,
  HelpCircle,
  Award,
  Loader2,
  Quote,
} from 'lucide-react';
import { DailyJanvaJevuBulletin, JanvaJevuQuestion } from '../types';
import { getDailyJanvaJevuBulletin, toGujaratiDigits } from '../services/dailyKnowledgeService';
import { shareDailyJanvaJevuAsPdf } from '../utils/dailyPdfShareUtils';
import { WhatsAppIcon } from './WhatsAppIcon';

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
  const [bulletin, setBulletin] = useState<DailyJanvaJevuBulletin | null>(null);
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
    getDailyJanvaJevuBulletin()
      .then((data) => {
        if (isMounted) {
          setBulletin(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load daily Janva Jevu:', err);
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

  // Audio Speech Synthesis in Gujarati
  const handleToggleSpeak = (q: JanvaJevuQuestion) => {
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
    const text = `💡 *વિદ્યાલયમ — આજનું જાણવા જેવું અને સુવિચાર (૨૦ પ્રશ્નોત્તરી)* 💡\n📅 *તારીખ:* ${bulletin.editionDate}\n⏰ *સમય:* બપોરે ૧:૦૦ વાગ્યાની આવૃત્તિ\n🏫 *શાળા:* ${schoolName || 'શાળા પોર્ટલ'}\n✨ *આજનો સુવિચાર:* "${suvichar}"\n━━━━━━━━━━━━━━━━━━━━\n\n` +
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

  // WhatsApp Share as PDF: Creates PDF with School Name, Date, Suvichar, and 20 GK questions
  const handleSharePdfWhatsApp = async () => {
    if (!bulletin || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    setShareFeedback('જાણવા જેવું & સુવિચાર PDF તૈયાર થઈ રહી છે...');

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
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse">
          <Lightbulb className="w-6 h-6 text-amber-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">આજનું જાણવા જેવું લોડ થઈ રહ્યું છે...</h3>
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#18232c] via-[#1e2a36] to-[#0d141b] border border-white/10 p-5 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                આજનું જાણવા જેવું & સુવિચાર
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/5 text-[#e4ded6] border border-white/10 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                દરરોજ બપોરે ૧:૦૦ વાગ્યે ઓટો-અપડેટ
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-amber-400" />
              દૈનિક સામાન્ય જ્ઞાન — ૨૦ પ્રશ્નોત્તરી (GK Quiz)
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#a99f91]">
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {bulletin.editionDate}
              </span>
              <span>•</span>
              <span>પાઠ્યપુસ્તક આધારિત પાયાનું સામાન્ય જ્ઞાન</span>
              <span>•</span>
              <span className="text-amber-300 font-medium">ધોરણ ૯ થી ૧૨ વિશેષ</span>
            </div>
          </div>

          {/* Action Buttons: WhatsApp Share PDF, Study Mode, Copy, Print */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* WhatsApp Share PDF Button */}
            <button
              type="button"
              onClick={handleSharePdfWhatsApp}
              disabled={isGeneratingPdf}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-900/40"
              title="શાળાના નામ સાથે જાણવા જેવું અને સુવિચારની PDF વોટ્સએપ ગ્રૂપમાં શેર કરો"
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

            {/* Study Mode vs Test Mode Pill */}
            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStudyMode('study');
                  handleRevealAll(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  studyMode === 'study'
                    ? 'bg-[#9d512d] text-white shadow-sm'
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
                    ? 'bg-[#9d512d] text-white shadow-sm'
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
              <span>પ્રિન્ટ શીટ</span>
            </button>
          </div>
        </div>

        {/* Feedback / Toast Notice */}
        {shareFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Sacred Daily Suvichar Box (Thought of the Day) */}
        <div className="mt-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300">
            <Quote className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-400">
              ✨ આજનો સુવિચાર (Thought of the Day)
            </div>
            <p className="text-sm sm:text-base font-semibold text-white/95 leading-relaxed font-['Noto_Serif_Devanagari',serif]">
              "{suvichar}"
            </p>
          </div>
        </div>

        {/* Sub-strip: Next cycle countdown */}
        {timeRemaining && (
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>દરરોજ બપોરે ૧:૦૦ વાગ્યે નવી ૨૦ પ્રશ્નોની આવૃત્તિ આપમેળે તાજી થાય છે.</span>
            </div>

            <div className="px-3 py-1 rounded-xl bg-black/40 border border-white/10 text-[11px] text-[#a99f91] flex items-center gap-1.5 shrink-0">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>આજની/આવતીકાલની આવૃત્તિ: <strong>{timeRemaining}</strong> માં</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs & Test Mode Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'બધા ૨૦ પ્રશ્નો (All 20)' },
            { id: 'weekly_core', label: `⭐ સાપ્તાહિક પુનરાવર્તન (${toGujaratiDigits(weeklyCoreCount)})` },
            { id: 'બંધારણ', label: '📜 બંધારણ' },
            { id: 'વિજ્ઞાન', label: '🔬 વિજ્ઞાન' },
            { id: 'ભૂગોળ', label: '🗺️ ગુજરાત ભૂગોળ' },
            { id: 'ઇતિહાસ', label: '🏛️ ઇતિહાસ' },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-[#9d512d] text-white shadow-md'
                    : 'bg-[#121921] hover:bg-[#1a2530] text-[#a99f91] hover:text-white border border-white/10'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {studyMode === 'test' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleRevealAll(true)}
              className="text-[11px] font-bold text-[#f59c73] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3 h-3" /> બધા જવાબો જુઓ
            </button>
            <span className="text-white/20">•</span>
            <button
              type="button"
              onClick={() => handleRevealAll(false)}
              className="text-[11px] font-bold text-[#a99f91] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <EyeOff className="w-3 h-3" /> બધા છુપાવો
            </button>
          </div>
        )}
      </div>

      {/* 20 Questions List: Only Question and Single-Word Answer (per user request 2) */}
      <div className="space-y-3.5">
        {filteredQuestions.map((q, idx) => {
          const isSpeaking = speakingId === q.id;
          const isRevealed = studyMode === 'study' || !!revealedAnswers[q.id];

          return (
            <div
              key={q.id}
              className={`rounded-2xl border transition-all p-4 sm:p-5 shadow-sm space-y-3 relative ${
                q.isWeeklyCoreRevision
                  ? 'bg-[#131d27] border-[#f59c73]/30 hover:border-[#f59c73]/60'
                  : 'bg-[#121921] border-white/10 hover:border-white/20'
              }`}
            >
              {/* Question Header: Number, Subject Badge, Weekly Tag, Audio */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Question Number */}
                  <span className="w-7 h-7 rounded-xl bg-[#9d512d]/20 border border-[#9d512d]/40 text-[#f59c73] text-xs font-black flex items-center justify-center shrink-0">
                    {toGujaratiDigits(q.questionNumber || idx + 1)}
                  </span>

                  {/* Subject Tag */}
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-white/5 text-[#e4ded6] border border-white/10">
                    {q.subject}
                  </span>

                  {/* Weekly Core Revision Badge */}
                  {q.isWeeklyCoreRevision && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-300" />
                      સાપ્તાહિક પુનરાવર્તન
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {studyMode === 'test' && (
                    <button
                      type="button"
                      onClick={() => toggleReveal(q.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                        isRevealed
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                      }`}
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{isRevealed ? 'જવાબ છુપાવો' : 'જવાબ જુઓ'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleSpeak(q)}
                    title={isSpeaking ? 'ઓડિયો બંધ કરો' : 'સાંભળો (Audio)'}
                    className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isSpeaking
                        ? 'bg-[#9d512d] text-white border-[#9d512d] animate-pulse'
                        : 'bg-white/5 hover:bg-white/10 text-[#a99f91] hover:text-white border-white/10'
                    }`}
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-[#f59c73]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide leading-snug">
                પ્રશ્ન: {q.question}
              </h3>

              {/* Answer Box - Single word / short direct answer only */}
              {isRevealed ? (
                <div className="p-3 sm:p-3.5 rounded-xl bg-black/40 border border-emerald-500/30 flex items-center gap-2.5 animate-in fade-in duration-200">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black shrink-0">
                    જવાબ:
                  </span>
                  <p className="text-base sm:text-lg font-black text-emerald-300 tracking-wide">
                    {q.answer}
                  </p>
                </div>
              ) : (
                <div
                  onClick={() => toggleReveal(q.id)}
                  className="p-3 rounded-xl bg-black/30 border border-dashed border-white/15 text-center text-xs text-[#a99f91] hover:text-white cursor-pointer hover:border-[#9d512d]/50 transition-colors"
                >
                  💡 તમારા મનમાં ઉત્તર વિચારો અને જવાબ જોવા માટે <strong>"જવાબ જુઓ"</strong> પર ક્લિક કરો.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* WhatsApp Group Share Banner card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#121921] to-[#121921] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center shrink-0">
            <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">શાળા અને ક્લાસ WhatsApp ગ્રૂપમાં PDF શેર કરો</h4>
            <p className="text-xs text-[#a99f91]">
              આજનું જાણવા જેવું (૨૦ પ્રશ્નોત્તરી) અને સુવિચારની તૈયાર PDF આપના મોબાઈલમાં સેવ થશે અને WhatsApp પર શેર થશે.
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

      {/* Footer Note */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-[#a99f91] space-y-1">
        <p className="font-semibold text-white">
          સામાન્ય જ્ઞાન અને પાઠ્યપુસ્તક આધારિત ૨૦ દૈનિક પ્રશ્નોત્તરી
        </p>
        <p className="text-[11px]">
          દરરોજ બપોરે ૧:૦૦ વાગ્યે આપમેળે અપડેટ થાય છે • દર અઠવાડિયે ૩-૪ અગત્યના પાયાના પ્રશ્નોનું પુનરાવર્તન
        </p>
      </div>
    </div>
  );
};
