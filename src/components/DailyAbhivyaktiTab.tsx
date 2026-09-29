import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Music,
  Drama,
  Mic,
  Smile,
  Puzzle,
  BookOpen,
  UserCheck,
  Flame,
  Volume2,
  VolumeX,
  Copy,
  CheckCircle2,
  Loader2,
  Clock,
  Send,
  Eye,
  X,
  Printer,
  Calendar,
  Share2,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { DailyAbhivyaktiBulletin, DailyAbhivyaktiIdea } from '../types';
import { getDailyAbhivyaktiBulletin, toGujaratiDigits } from '../services/dailyKnowledgeService';
import { haptic } from '../utils/haptics';
import { WhatsAppIcon } from './WhatsAppIcon';

interface DailyAbhivyaktiTabProps {
  schoolName?: string;
  diseCode?: string;
  district?: string;
  isSchoolView?: boolean;
}

const TALENT_PRESETS = [
  { label: '🥁 સંગીત & ઢોલ વાદન', value: 'સંગીત અને ઢોલ વાદન (Music & Dhol Rhythm)' },
  { label: '🎭 એકપાત્રીય અભિનય', value: 'એકપાત્રીય અભિનય (Monologue / Acting)' },
  { label: '🎤 મિમિક્રી & સાઉન્ડ', value: 'મિમિક્રી અને વોઇસ મોડ્યુલેશન (Mimicry & Voice)' },
  { label: '🇮🇳 હિન્દી સંવાદો', value: 'જોશીલા હિન્દી સંવાદો અને વક્તવ્ય (Hindi Dialogues)' },
  { label: '🧩 સભા રમત (Game)', value: 'પ્રાર્થના સભા રમત (Interactive Assembly Mind Game)' },
  { label: '🧠 કોયડા & ઉખાણાં', value: 'વિચારો અને કહો: કોયડા અને ઉખાણાં (Riddles & Brain Teasers)' },
  { label: '📖 પ્રેરણાદાયી વાર્તા', value: '૫ મિનિટની પ્રેરણાદાયી વાર્તા (Inspiring Story)' },
  { label: '👑 મહાન પુરુષ જીવનપ્રસંગ', value: 'મહાન પુરુષોના જીવનમાંથી પ્રેરક પ્રસંગ (Great Leader Episode)' },
  { label: '💃 નૃત્ય & મુદ્રાઓ', value: 'ભારતીય નૃત્ય અને હસ્તમુદ્રાઓ (Dance Mudras & Expression)' },
  { label: '📜 કાવ્ય પઠન', value: 'લયબદ્ધ કાવ્ય પઠન (Rhythmic Poetry Recitation)' },
  { label: '🔬 વિજ્ઞાન ટ્રીક / ડેમો', value: '૫ મિનિટમાં રોચક વિજ્ઞાન પ્રયોગ (Curious Science Demo)' },
];

export const DailyAbhivyaktiTab: React.FC<DailyAbhivyaktiTabProps> = ({
  schoolName,
  diseCode,
  district,
  isSchoolView = false,
}) => {
  const [bulletin, setBulletin] = useState<DailyAbhivyaktiBulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeIdeaModal, setActiveIdeaModal] = useState<DailyAbhivyaktiIdea | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Prompt State
  const [aiInterestInput, setAiInterestInput] = useState('');
  const [selectedStandard, setSelectedStandard] = useState('10');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratedIdea, setAiGeneratedIdea] = useState<DailyAbhivyaktiIdea | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getDailyAbhivyaktiBulletin()
      .then((data) => {
        if (isMounted) {
          setBulletin(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load daily Abhivyakti:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const filteredIdeas = useMemo(() => {
    if (!bulletin?.ideas) return [];
    if (activeCategory === 'all') return bulletin.ideas;
    return bulletin.ideas.filter((idea) => idea.category === activeCategory);
  }, [bulletin, activeCategory]);

  const handleToggleSpeak = (idea: DailyAbhivyaktiIdea) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('તમારા બ્રાઉઝરમાં ઓડિયો સુવિધા ઉપલબ્ધ નથી.');
      return;
    }

    if (speakingId === idea.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const textToSpeak = `${idea.title}. ${idea.summary}. સ્ક્રિપ્ટ: ${idea.fullScript.slice(0, 300)}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'gu-IN';
    utterance.rate = 0.92;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(idea.id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyScript = (idea: DailyAbhivyaktiIdea) => {
    haptic.light();
    const text =
      `🎭 *વિદ્યાલયમ — પ્રાર્થના સભા અભિવ્યક્તિ (૫ મિનિટ સ્ક્રિપ્ટ)* 🎭\n` +
      `📌 *વિષય:* ${idea.title}\n` +
      `⏱️ *સમય:* ૫ મિનિટ | *વિભાગ:* ${idea.categoryLabel}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*૫ મિનિટ સમય વિભાજન:*\n` +
      (idea.timeBreakdown
        ? idea.timeBreakdown.map((t) => `• ${t.timeRange} : ${t.activity}`).join('\n')
        : '') +
      `\n\n*સંપૂર્ણ બોલવાની સ્ક્રિપ્ટ:*\n${idea.fullScript}\n\n` +
      `💡 *સ્ટેજ ટિપ્સ:* ${idea.deliveryTips}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n✨ *સૌજન્ય:* વિદ્યાલયમ શૈક્ષણિક પોર્ટલ`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(idea.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const handleShareWhatsApp = (idea: DailyAbhivyaktiIdea) => {
    haptic.light();
    const text = encodeURIComponent(
      `🎭 *પ્રાર્થના સભા અભિવ્યક્તિ:* ${idea.title}\n` +
      `⏱️ સમય: ૫ મિનિટ | ${idea.categoryLabel}\n\n` +
      `${idea.summary}\n\n` +
      `*બોલવાની સ્ક્રિપ્ટ:*\n${idea.fullScript.slice(0, 500)}...\n\n` +
      `✨ વિદ્યાલયમ શૈક્ષણિક પોર્ટલ`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // AI Generation Function
  const handleGenerateAiAbhivyakti = async (customPrompt?: string) => {
    const interest = customPrompt || aiInterestInput.trim();
    if (!interest) {
      alert('કૃપા કરીને તમારો રસ કે ટેલેન્ટ લખો (દા.ત. સંગીતમાં રસ છે, ઢોલ વગાડવું છે, મિમિક્રી કરવી છે...)');
      return;
    }

    haptic.medium();
    setIsAiGenerating(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/abhivyakti-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interest,
          standard: selectedStandard,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI અભિવ્યક્તિ બનાવવામાં ખામી આવી.');
      }

      setAiGeneratedIdea(data.data);
      setActiveIdeaModal(data.data);
      haptic.success();
    } catch (err: any) {
      console.error('AI generation error:', err);
      setAiError(err.message || 'AI સેવા હાલમાં વ્યસ્ત છે. કૃપા કરીને થોડીવાર પછી પ્રયાસ કરો.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center animate-pulse text-white">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">અભિવ્યક્તિ વિચારો લોડ થઈ રહ્યા છે...</h3>
          <p className="text-xs text-[#a99f91]">પ્રાર્થના સભા માટેની ૫ મિનિટની તૈયાર પ્રસ્તુતિઓ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1424] via-[#231733] to-[#0f0b17] border border-purple-500/25 p-5 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              શાળા પ્રાર્થના સંમેલન અભિવ્યક્તિ
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              બરાબર ૫ મિનિટ સ્ક્રિપ્ટ
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              🤖 Gemini AI સહાયક સજ્જ
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Drama className="w-7 h-7 text-purple-400" />
            અભિવ્યક્તિ (Abhivyakti) — સ્ટેજ પ્રેઝન્ટેશન & ટેલેન્ટ વિચારો
          </h2>

          <p className="text-xs sm:text-sm text-purple-200/80 max-w-3xl leading-relaxed">
            પ્રાર્થના સભામાં તમારી પ્રતિભા ખીલવો! સંગીત, ઢોલ વાદન, એકપાત્રીય અભિનય, મિમિક્રી, હિન્દી સંવાદો, કાવ્ય પઠન,
            રસપ્રદ રમતો અને કોયડાની ૫ મિનિટની સ્ટેજ-રેડી સ્ક્રિપ્ટ. તમે AI ને પૂછીને પણ તમારી રુચિ મુજબની પ્રસ્તુતિ બનાવી શકો છો!
          </p>
        </div>
      </div>

      {/* AI Interactive Abhivyakti Coach Box */}
      <div className="rounded-3xl bg-gradient-to-br from-[#131c26] via-[#162330] to-[#0c141d] border border-sky-500/30 p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center font-bold">
              ✨
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>અભિવ્યક્તિ AI માર્ગદર્શક (AI Talent Coach)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                  Gemini Flash
                </span>
              </h3>
              <p className="text-xs text-[#a99f91]">
                AI ને કહો કે તમને શેમાં રસ છે (દા.ત. "મને સંગીતમાં રસ છે", "મને ઢોલ વગાડવું છે", "મને મિમિક્રી કરવી છે")...
              </p>
            </div>
          </div>

          {/* Standard Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">ધોરણ:</span>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none cursor-pointer"
            >
              <option value="9">ધોરણ ૯</option>
              <option value="10">ધોરણ ૧૦</option>
              <option value="11">ધોરણ ૧૧</option>
              <option value="12">ધોરણ ૧૨</option>
            </select>
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={aiInterestInput}
              onChange={(e) => setAiInterestInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAiGenerating) {
                  handleGenerateAiAbhivyakti();
                }
              }}
              placeholder="દા.ત. મને સંગીત / ઢોલકમાં રસ છે, વિજ્ઞાનનો જાદુ કરવો છે, શહીદ ભગતસિંહ પર બોલવું છે..."
              className="w-full pl-4 pr-10 py-3 rounded-2xl bg-black/40 border border-sky-500/30 text-white placeholder-slate-400 text-xs sm:text-sm font-medium outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <button
            type="button"
            onClick={() => handleGenerateAiAbhivyakti()}
            disabled={isAiGenerating}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 active:scale-[0.98] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isAiGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI સ્ક્રિપ્ટ બનાવી રહ્યું છે...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>૫ મિનિટ સ્ક્રિપ્ટ બનાવો</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            ઝડપી પસંદગી (Quick Talent Suggestions):
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {TALENT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setAiInterestInput(preset.value);
                  handleGenerateAiAbhivyakti(preset.value);
                }}
                disabled={isAiGenerating}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-sky-500/20 hover:border-sky-500/40 border border-white/10 text-white/90 hover:text-sky-300 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Error Alert */}
        {aiError && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <span>⚠️ {aiError}</span>
          </div>
        )}
      </div>

      {/* Today's Featured 5-Minute Presentations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>આજની તૈયાર સભા પ્રસ્તુતિઓ (5-Minute Assembly Ready)</span>
            </h3>
            <p className="text-xs text-[#a99f91]">
              દરરોજ નવી નવી વિશિષ્ટ પ્રવૃત્તિઓ અને સ્ટેજ-રેડી સ્ક્રિપ્ટ્સ
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-[#a99f91] hover:text-white'
              }`}
            >
              તમામ
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('music_dhol')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'music_dhol'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-white/5 text-[#a99f91] hover:text-white'
              }`}
            >
              🥁 સંગીત & ઢોલ
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('ekpatriya_abhinay')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'ekpatriya_abhinay'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-white/5 text-[#a99f91] hover:text-white'
              }`}
            >
              🎭 એકપાત્રીય અભિનય
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('mimicry')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'mimicry'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-white/5 text-[#a99f91] hover:text-white'
              }`}
            >
              🎤 મિમિક્રી
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('ramat')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'ramat'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-white/5 text-[#a99f91] hover:text-white'
              }`}
            >
              🧩 રમતો & કોયડા
            </button>
          </div>
        </div>

        {/* Ideas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIdeas.map((idea) => {
            const isSpeaking = speakingId === idea.id;
            const isCopied = copiedId === idea.id;

            return (
              <div
                key={idea.id}
                className="relative rounded-2xl p-5 bg-[#121921] border border-white/10 hover:border-purple-500/40 transition-all duration-200 flex flex-col justify-between shadow-sm group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-xl font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {idea.categoryLabel}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSpeak(idea)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isSpeaking
                            ? 'bg-purple-600 text-white animate-pulse'
                            : 'text-[#a99f91] hover:text-white hover:bg-white/10'
                        }`}
                        title="સાંભળો"
                      >
                        {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyScript(idea)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'text-[#a99f91] hover:text-white hover:bg-white/10'
                        }`}
                        title="સ્ક્રિપ્ટ કોપી કરો"
                      >
                        {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors leading-snug">
                    {idea.title}
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {idea.summary}
                  </p>

                  {/* 5-Min Time Breakdown Preview */}
                  {idea.timeBreakdown && idea.timeBreakdown.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1 text-[11px]">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        ૫ મિનિટ સમય ફાળવણી:
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-slate-300">
                        {idea.timeBreakdown.slice(0, 2).map((t, idx) => (
                          <div key={idx} className="truncate">
                            <span className="font-mono text-purple-400 font-bold">{t.timeRange}:</span> {t.activity}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Full 5-Min Script Button */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>૫ મિનિટ તૈયાર સ્ક્રિપ્ટ</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      haptic.light();
                      setActiveIdeaModal(idea);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>સંપૂર્ણ સ્ક્રિપ્ટ જુઓ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Presentation Modal */}
      {activeIdeaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveIdeaModal(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] bg-[#121921] border border-white/20 rounded-3xl p-5 sm:p-7 text-white shadow-2xl overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <span className="text-xs px-2.5 py-1 rounded-xl font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {activeIdeaModal.categoryLabel}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                  {activeIdeaModal.title}
                </h3>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>⏱️ સમયાવધિ: ૫ મિનિટ</span>
                  <span>•</span>
                  <span>શ્રોતાઓ: {activeIdeaModal.targetAudience}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveIdeaModal(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 5-Min Time Breakdown Table */}
            {activeIdeaModal.timeBreakdown && activeIdeaModal.timeBreakdown.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>૫ મિનિટનું સ્ટેજ વિભાજન (Time Breakdown):</span>
                </div>
                <div className="space-y-1.5">
                  {activeIdeaModal.timeBreakdown.map((t, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                      <span className="w-20 shrink-0 font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded text-center">
                        {t.timeRange}
                      </span>
                      <span>{t.activity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Word-by-word Script */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                🗣️ સ્ટેજ પર બોલવાની શબ્દશઃ સ્ક્રિપ્ટ (Word-by-word Presentation Script):
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
                {activeIdeaModal.fullScript}
              </div>
            </div>

            {/* Delivery Tips & Body Language */}
            {activeIdeaModal.deliveryTips && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
                <strong className="text-emerald-300 font-bold block mb-1">
                  💡 સ્ટેજ રજૂઆત ટીપ્સ & હાવભાવ (Delivery Tips):
                </strong>
                <span>{activeIdeaModal.deliveryTips}</span>
              </div>
            )}

            {/* Props Required */}
            {activeIdeaModal.keyPropsOrRequirements && (
              <div className="text-xs text-slate-400">
                <strong>સાધન સામગ્રી:</strong> {activeIdeaModal.keyPropsOrRequirements}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleToggleSpeak(activeIdeaModal)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {speakingId === activeIdeaModal.id ? (
                  <>
                    <VolumeX className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span>અટકાવો</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-purple-400" />
                    <span>સાંભળો (Audio)</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyScript(activeIdeaModal)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  {copiedId === activeIdeaModal.id ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>કોપી થઈ ગયું!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>સ્ક્રિપ્ટ કોપી કરો</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(activeIdeaModal)}
                  className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
