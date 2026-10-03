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
  RefreshCw,
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

interface TalentPreset {
  label: string;
  value: string;
  group: 'all' | 'abhinay' | 'purush' | 'science' | 'hindi' | 'math_game' | 'kavya' | 'mimicry' | 'music';
}

const TALENT_PRESETS: TalentPreset[] = [
  // 🎭 એકપાત્રીય અભિનય (Monologues)
  { label: '🎭 જૂનું પાઠ્યપુસ્તક મોનોલોગ', value: 'એકપાત્રીય અભિનય: હું એક જૂનું પાઠ્યપુસ્તક બોલું છું', group: 'abhinay' },
  { label: '🎭 શહીદ ભગતસિંહ મોનોલોગ', value: 'એકપાત્રીય અભિનય: હું ક્રાંતિકારી શહીદ ભગતસિંહ બોલું છું', group: 'abhinay' },
  { label: '🎭 સૂકાતું વૃક્ષ મોનોલોગ', value: 'એકપાત્રીય અભિનય: હું એક સૂકાતું વૃક્ષ બોલું છું', group: 'abhinay' },
  { label: '🎭 સુકાતી નદીની વેદના', value: 'એકપાત્રીય અભિનય: હું એક સુકાતી નદી બોલું છું — મને બચાવો!', group: 'abhinay' },
  { label: '🎭 દીવાલ ઘડિયાળ: સમયનું મૂલ્ય', value: 'એકપાત્રીય અભિનય: હું એક દીવાલ ઘડિયાળ બોલું છું — સમયનું મૂલ્ય સમજો!', group: 'abhinay' },

  // 👑 મહાન વિભૂતિઓ (Great Personalities)
  { label: '👑 કલામ: મિસાઈલ મેન યાત્રા', value: 'મહાન પુરુષ: ડો. એ.પી.જે. અબ્દુલ કલામની પ્રેરણાદાયી જીવનયાત્રા', group: 'purush' },
  { label: '👑 સરદાર પટેલ લોખંડી સંકલ્પ', value: 'મહાન પુરુષ: સરદાર પટેલની સાદગી અને કર્તવ્યનિષ્ઠાનો કોર્ટરૂમ પ્રસંગ', group: 'purush' },
  { label: '👑 સાવિત્રીબાઈ ફુલે સ્ત્રી શિક્ષણ', value: 'મહાન નારી: સાવિત્રીબાઈ ફુલે — ભારતની પ્રથમ મહિલા શિક્ષિકાની સંઘર્ષગાથા', group: 'purush' },
  { label: '👑 ક્રાંતિવીર શ્યામજી કૃષ્ણ વર્મા', value: 'મહાન પુરુષ: માંડવી-કચ્છનું રત્ન — ક્રાંતિવીર શ્યામજી કૃષ્ણ વર્મા અને ઇન્ડિયા હાઉસ', group: 'purush' },
  { label: '👑 આંબેડકરની વાંચન ભૂખ', value: 'મહાન પુરુષ: બાબાસાહેબ આંબેડકરની વાંચન ભૂખ અને ૧૮ કલાક અભ્યાસ', group: 'purush' },
  { label: '👑 કૈલાશ સત્યાર્થી બાળપણ બચાવો', value: 'મહાન વિભૂતિ: નોબેલ શાંતિ વિજેતા કૈલાશ સત્યાર્થી અને બચપન બચાઓ આંદોલન', group: 'purush' },

  // 🔬 વિજ્ઞાન ડેમો (Science Demos)
  { label: '🔬 પ્રકાશનું વક્રીભવન ડેમો', value: 'વિજ્ઞાન ડેમો: કાચના ગ્લાસ અને પાણીમાં અદ્રશ્ય થતો સિક્કો', group: 'science' },
  { label: '🔬 વાતાવરણીય દબાણ ડેમો', value: 'અનોખું જ્ઞાન ડેમો: ગુરુત્વાકર્ષણને પડકારતો ઊંધો ગ્લાસ સાયન્સ મેજિક', group: 'science' },
  { label: '🔬 સ્થિર વિદ્યુતનો જાદુ', value: 'વિજ્ઞાન પ્રયોગ: પ્લાસ્ટિકની ફૂટપટ્ટીથી કાગળના ટુકડા ઊંચકવા', group: 'science' },
  { label: '🔬 ચંદ્રયાન-૩ અને ફુગ્ગા રોકેટ', value: 'વિજ્ઞાન ડેમો: ચંદ્રયાન-૩ અને ફુગ્ગા રોકેટ — ન્યૂટનનો ત્રીજો નિયમ', group: 'science' },
  { label: '🔬 પ્લાસ્ટિક vs કાપડની થેલી', value: 'વિજ્ઞાન ડેમો: પ્લાસ્ટિક મુક્ત શાળા — કાપડ vs પ્લાસ્ટિક પ્રયોગ', group: 'science' },

  // 🇮🇳 જોશીલા હિન્દી સંવાદો (Patriotic Hindi)
  { label: '🇮🇳 નેતાજી સુભાષચંદ્ર બોઝ', value: 'જોશીલા હિન્દી સંવાદો: તુમ મુઝે ખૂન દો, મૈં તુમ્હેં આઝાદી દૂંગા', group: 'hindi' },
  { label: '🇮🇳 સ્વામી વિવેકાનંદ શિકાગો ભાષણ', value: 'જોશીલા હિન્દી સંવાદો: સ્વામી વિવેકાનંદ કા શિકાગો ભાષણ — અમેરિકા કે ભાઇયો ઔર બહનો!', group: 'hindi' },
  { label: '🇮🇳 અટલ બિહારી વાજપેયી સંવાદો', value: 'રાષ્ટ્રપ્રેમ: અટલ બિહારી વાજપેયીજીના અમર હિન્દી સંવાદો', group: 'hindi' },
  { label: '🇮🇳 ચંદ્રશેખર આઝાદ સંવાદ', value: 'જોશીલા હિન્દી સંવાદો: ચંદ્રશેખર આઝાદ — આઝાદ હી રહે હૈં, આઝાદ હી રહેંગે', group: 'hindi' },

  // 🧩 ગણિત જાદુ & સભા રમતો (Math Magic & Games)
  { label: '🧠 ગણિત જાદુ: જન્મ તારીખ ટ્રીક', value: 'ગણિતનો જાદુ: તમારો જન્મ મહિનો અને ઉંમર હું કહી દઈશ', group: 'math_game' },
  { label: '🧠 ૯ ની અજાયબી વૈદિક ગુણાકાર', value: 'ગણિત જાદુ: ૯ ની અજાયબી અને વૈદિક મેથ્સની સુપર ફાસ્ટ ગુણાકાર ટ્રીક', group: 'math_game' },
  { label: '🧩 સભા રમત: સાયમન સેઝ', value: 'પ્રાર્થના સભા રમત: સાયમન સેઝ — શાળા સંસ્કાર ચેલેન્જ', group: 'math_game' },
  { label: '🧩 મગજ કસોટી: સૂર્ય-પૃથ્વી-ચંદ્ર', value: 'પ્રાર્થના સભા રમત: વિચારો અને વર્તો — મગજની કસોટી', group: 'math_game' },

  // 📜 કાવ્ય પઠન (Poetry Recitation)
  { label: '📜 કાવ્ય પઠન: ચારણ કન્યા', value: 'કાવ્ય પઠન: રાષ્ટ્રીય શાયર ઝવેરચંદ મેઘાણી રચિત ચારણ કન્યા', group: 'kavya' },
  { label: '📜 કાવ્ય પઠન: જ્યાં જ્યાં વસે એક ગુજરાતી', value: 'કાવ્ય પઠન: કવિ ખબરદાર રચિત જ્યાં જ્યાં વસે એક ગુજરાતી', group: 'kavya' },
  { label: '📜 કાવ્ય પઠન: હું એવો ગુજરાતી', value: 'કાવ્ય પઠન: કવિ વિનોદ જોશી રચિત હું એવો ગુજરાતી', group: 'kavya' },
  { label: '📜 કાવ્ય પઠન: ભોમિયા વિના મારે ભમવા તા', value: 'કાવ્ય પઠન: કવિ ઉમાશંકર જોશી રચિત ભોમિયા વિના મારે ભમવા તા ડુંગરા', group: 'kavya' },

  // 🎤 મિમિક્રી & વોઇસ આર્ટ (Mimicry & Voice Arts)
  { label: '🎤 પક્ષીઓનો કલરવ & અવાજ કલા', value: 'મિમિક્રી અને વોઇસ આર્ટ: પક્ષીઓનો કલરવ અને પ્રકૃતિની ભાષા', group: 'mimicry' },
  { label: '🎤 રેલવે અનાઉન્સમેન્ટ & કોમેન્ટરી', value: 'વોઇસ મેજિક અને મિમિક્રી: રેલવે સ્ટેશનથી ક્રિકેટ કોમેન્ટરી સુધી', group: 'mimicry' },
  { label: '🎤 ગીરના સાવજની ગર્જના', value: 'મિમિક્રી & વોઇસ આર્ટ: ગીરના સાવજની ગર્જના અને વન્યજીવ અવાજો', group: 'mimicry' },
  { label: '🎤 પરીક્ષાની આગલી રાત કોમિક મિમિક્રી', value: 'હાસ્ય વ્યંગ્ય મિમિક્રી: પરીક્ષાની આગલી રાત અને વિદ્યાર્થીની મનોસ્થિતિ', group: 'mimicry' },

  // 🥁 સંગીત, યોગ & સંસ્કૃતિ (Music & Yoga)
  { label: '🥁 ઢોલક અને તાળીઓનો તાલ', value: 'સંગીત અને ઢોલ વાદન: પ્રાર્થના સભામાં ઊર્જા અને લયનો જાદુ', group: 'music' },
  { label: '🥁 ઓમકાર નાદ & ભ્રામરી ગુંજન', value: 'સંગીત અને ધ્યાન: ઓમકાર નાદ અને ભ્રામરી પ્રાણાયામનો જાદુ', group: 'music' },
  { label: '🥁 સંત કબીર દોહા & નરસિંહ મહેતા', value: 'સંગીત અને ચિંતન: સંત કબીરના અમર દોહા અને નરસિંહ મહેતાની ભક્તિ', group: 'music' },
  { label: '🥁 સૂર્ય નમસ્કારના ૧૨ આસનો લાઈવ', value: 'શરીર સ્વાસ્થ્ય: સૂર્ય નમસ્કારના ૧૨ આસનો અને મંત્રોચ્ચાર લાઈવ પ્રસ્તુતિ', group: 'music' },
  { label: '🏜️ કચ્છ સંસ્કૃતિ & ધોળાવીરા', value: 'કચ્છ સંસ્કૃતિ અને વારસો: ધોળાવીરાથી ખાવડા — કચ્છડો બારે માસ', group: 'music' },
  { label: '📱 સ્માર્ટફોન vs રીલ્સનું વ્યસન', value: 'જીવન કૌશલ્ય: સ્માર્ટફોનનો સાચો ઉપયોગ vs રીલ્સનું વ્યસન', group: 'music' },
  { label: '📖 બહેરા દેડકાની પ્રેરક વાર્તા', value: 'પ્રેરક વાર્તા: બે દેડકા અને બહેરા દેડકાની અનોખી જીત', group: 'music' },
  { label: '🛡️ સાયબર સુરક્ષા & ૧૯૩૦ હેલ્પલાઇન', value: 'જીવન કૌશલ્ય: સાયબર સુરક્ષા — ઓનલાઇન ગેમ્સ અને ઓટીપી ફ્રોડથી સાવધાન!', group: 'music' },
  { label: '📖 શ્રવણકુમાર: માતા-પિતાનો આદર', value: 'જીવન મૂલ્ય વાર્તા: માતા-પિતાનો આદર — શ્રવણકુમારનો આધુનિક પાઠ', group: 'music' },
  { label: '📖 પુસ્તકો જ સાચા મિત્રો', value: 'પ્રેરક વક્તવ્ય: વાંચન એ વિચારનું પોષણ — પુસ્તક આપણો સાચો મિત્ર', group: 'music' },
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
  const [presetGroupFilter, setPresetGroupFilter] = useState<'all' | 'abhinay' | 'purush' | 'science' | 'hindi' | 'math_game' | 'kavya' | 'mimicry' | 'music'>('all');
  const [activeIdeaModal, setActiveIdeaModal] = useState<DailyAbhivyaktiIdea | null>(null);
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
    };
  }, []);

  const filteredIdeas = useMemo(() => {
    if (!bulletin?.ideas) return [];
    if (activeCategory === 'all') return bulletin.ideas;
    if (activeCategory === 'mahan_purush_varta') {
      return bulletin.ideas.filter((idea) => idea.category === 'mahan_purush' || idea.category === 'varta');
    }
    if (activeCategory === 'ramat_koyda') {
      return bulletin.ideas.filter((idea) => idea.category === 'ramat' || idea.category === 'koydo_ukhana');
    }
    return bulletin.ideas.filter((idea) => idea.category === activeCategory);
  }, [bulletin, activeCategory]);

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
      setAiError('કૃપા કરીને તમારો રસ કે ટેલેન્ટ લખો (દા.ત. સંગીતમાં રસ છે, વક્તૃત્વ, વિજ્ઞાન પ્રોજેક્ટ...)');
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
      let errorMsg = err.message || 'AI સેવા હાલમાં વ્યસ્ત છે. કૃપા કરીને થોડીવાર પછી પ્રયાસ કરો.';
      if (
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('resource_exhausted') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('Quota') ||
        errorMsg.includes('billing') ||
        errorMsg.includes('plan') ||
        errorMsg.includes('exceeded your current quota')
      ) {
        errorMsg = 'Google AI સર્વર વપરાશ મર્યાદા (Quota Limit) આવી છે. કૃપા કરીને થોડી સેકન્ડ રાહ જોઈને "🔄 ફરી પ્રયાસ કરો" બટન દબાવો.';
      }
      setAiError(errorMsg);
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
          <h3 className="text-base font-bold text-slate-900 dark:text-white">અભિવ્યક્તિ વિચારો લોડ થઈ રહ્યા છે...</h3>
          <p className="text-xs text-slate-500 dark:text-[#a99f91]">પ્રાર્થના સભા માટેની ૫ મિનિટની તૈયાર પ્રસ્તુતિઓ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 dark:from-[#1a1424] dark:via-[#231733] dark:to-[#0f0b17] border border-purple-700/40 dark:border-purple-500/25 p-5 sm:p-7 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              શાળા પ્રાર્થના સંમેલન અભિવ્યક્તિ
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              બરાબર ૫ મિનિટ સ્ક્રિપ્ટ
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              🤖 Gemini AI સહાયક સજ્જ
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Drama className="w-7 h-7 text-purple-400" />
            અભિવ્યક્તિ (Abhivyakti) — સ્ટેજ પ્રેઝન્ટેશન & ટેલેન્ટ વિચારો
          </h2>

          <p className="text-xs sm:text-sm text-purple-100/90 max-w-3xl leading-relaxed">
            પ્રાર્થના સભામાં તમારી પ્રતિભા ખીલવો! સંગીત, ઢોલ વાદન, એકપાત્રીય અભિનય, મિમિક્રી, હિન્દી સંવાદો, કાવ્ય પઠન,
            રસપ્રદ રમતો અને કોયડાની ૫ મિનિટની સ્ટેજ-રેડી સ્ક્રિપ્ટ. તમે AI ને પૂછીને પણ તમારી રુચિ મુજબની પ્રસ્તુતિ બનાવી શકો છો!
          </p>
        </div>
      </div>

      {/* AI Interactive Abhivyakti Coach Box */}
      <div className="rounded-3xl bg-gradient-to-br from-sky-950/80 via-slate-900 to-indigo-950 dark:from-[#131c26] dark:via-[#162330] dark:to-[#0c141d] border border-sky-600/40 dark:border-sky-500/30 p-5 sm:p-6 shadow-lg space-y-4 text-white">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-300 flex items-center justify-center font-bold">
              ✨
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>અભિવ્યક્તિ AI માર્ગદર્શક (AI Talent Coach)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 font-bold border border-sky-500/40">
                  Gemini Flash
                </span>
              </h3>
              <p className="text-xs text-sky-200/80">
                AI ને કહો કે તમને શેમાં રસ છે (દા.ત. "મને સંગીતમાં રસ છે", "મને ઢોલ વગાડવું છે", "મને મિમિક્રી કરવી છે")...
              </p>
            </div>
          </div>

          {/* Standard Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-300 font-medium">ધોરણ:</span>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="bg-black/40 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none cursor-pointer"
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
              className="w-full pl-4 pr-10 py-3 rounded-2xl bg-black/40 border border-sky-400/40 text-white placeholder-slate-300 text-xs sm:text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-500/30"
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
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
              <span>વિષય મુજબ ઝડપી સૂચનો (Topic Suggestions):</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px]">
              {[
                { id: 'all', label: 'બધા (૪૨+)' },
                { id: 'abhinay', label: '🎭 અભિનય' },
                { id: 'purush', label: '👑 વિભૂતિ' },
                { id: 'science', label: '🔬 સાયન્સ' },
                { id: 'hindi', label: '🇮🇳 હિન્દી' },
                { id: 'math_game', label: '🧩 ગણિત' },
                { id: 'kavya', label: '📜 કાવ્ય' },
                { id: 'mimicry', label: '🎤 મિમિક્રી' },
                { id: 'music', label: '🥁 સંગીત' },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setPresetGroupFilter(g.id as any)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    presetGroupFilter === g.id
                      ? 'bg-sky-400 text-slate-950 font-black'
                      : 'bg-white/10 hover:bg-white/20 text-slate-300'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1.5 flex-wrap max-h-32 overflow-y-auto">
            {TALENT_PRESETS.filter(
              (preset) => presetGroupFilter === 'all' || preset.group === presetGroupFilter
            ).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setAiInterestInput(preset.value);
                  handleGenerateAiAbhivyakti(preset.value);
                }}
                disabled={isAiGenerating}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-sky-500/25 hover:border-sky-400/50 border border-white/10 text-white/90 hover:text-sky-200 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Error Alert with Retry */}
        {aiError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <span>{aiError}</span>
            </div>
            <button
              type="button"
              onClick={() => handleGenerateAiAbhivyakti(aiInterestInput || 'શાળા સંસ્કાર')}
              disabled={isAiGenerating}
              className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
              <span>🔄 ફરી પ્રયાસ કરો (Retry)</span>
            </button>
          </div>
        )}
      </div>

      {/* Today's Featured 5-Minute Presentations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <span>આજની તૈયાર સભા પ્રસ્તુતિઓ (5-Minute Assembly Ready)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#a99f91]">
              દરરોજ નવી નવી વિશિષ્ટ પ્રવૃત્તિઓ અને સ્ટેજ-રેડી સ્ક્રિપ્ટ્સ
            </p>
          </div>

          {/* Category Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs w-full">
            <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === 'all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:hover:text-white'
                }`}
              >
                બધા વિષયો ({bulletin?.ideas?.length || 42})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('ekpatriya_abhinay')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === 'ekpatriya_abhinay'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:hover:text-white'
                }`}
              >
                🎭 એકપાત્રીય અભિનય
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('mahan_purush_varta')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === 'mahan_purush_varta'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:hover:text-white'
                }`}
              >
                📖 મહાન પુરુષ & વાર્તા
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('gyan_science')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === 'gyan_science'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:hover:text-white'
                }`}
              >
                🔬 સાયન્સ ડેમો
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('hindi_dialogue')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === 'hindi_dialogue'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:hover:text-white'
                }`}
              >
                🇮🇳 હિન્દી સંવાદો
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('ramat_koyda')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === 'ramat_koyda'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:hover:text-white'
                }`}
              >
                🧩 રમતો & કોયડા
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('kavya_pathan')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === 'kavya_pathan'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:hover:text-white'
                }`}
              >
                📜 કાવ્ય પઠન
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('music_dhol')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === 'music_dhol'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:hover:text-white'
                }`}
              >
                🥁 સંગીત & તાલ
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('mimicry')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === 'mimicry'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-[#a99f91] dark:hover:text-white'
                }`}
              >
                🎤 મિમિક્રી
              </button>
            </div>
          </div>

        {/* Ideas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIdeas.map((idea) => {
            const isCopied = copiedId === idea.id;

            return (
              <div
                key={idea.id}
                className="relative rounded-2xl p-5 bg-white/90 dark:bg-[#121921] border border-[#E2E8F0] dark:border-white/10 hover:border-purple-400 dark:hover:border-purple-500/40 transition-all duration-200 flex flex-col justify-between shadow-xs group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-xl font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30">
                      {idea.categoryLabel}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyScript(idea)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-[#a99f91] dark:hover:text-white dark:hover:bg-white/10'
                        }`}
                        title="સ્ક્રિપ્ટ કોપી કરો"
                      >
                        {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 group-hover:text-purple-700 dark:text-white dark:group-hover:text-purple-300 transition-colors leading-snug">
                    {idea.title}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {idea.summary}
                  </p>

                  {/* 5-Min Time Breakdown Preview */}
                  {idea.timeBreakdown && idea.timeBreakdown.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 space-y-1 text-[11px]">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        ૫ મિનિટ સમય ફાળવણી:
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-slate-700 dark:text-slate-300">
                        {idea.timeBreakdown.slice(0, 2).map((t, idx) => (
                          <div key={idx} className="truncate">
                            <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{t.timeRange}:</span> {t.activity}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Full 5-Min Script Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>૫ મિનિટ તૈયાર સ્ક્રિપ્ટ</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      haptic.light();
                      setActiveIdeaModal(idea);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-600/30 dark:hover:bg-purple-600 dark:text-purple-200 dark:hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
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
            className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/20 rounded-3xl p-5 sm:p-7 text-slate-800 dark:text-white shadow-2xl overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="space-y-1">
                <span className="text-xs px-2.5 py-1 rounded-xl font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40">
                  {activeIdeaModal.categoryLabel}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                  {activeIdeaModal.title}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>⏱️ સમયાવધિ: ૫ મિનિટ</span>
                  <span>•</span>
                  <span>શ્રોતાઓ: {activeIdeaModal.targetAudience}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveIdeaModal(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 5-Min Time Breakdown Table */}
            {activeIdeaModal.timeBreakdown && activeIdeaModal.timeBreakdown.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-2">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>૫ મિનિટનું સ્ટેજ વિભાજન (Time Breakdown):</span>
                </div>
                <div className="space-y-1.5">
                  {activeIdeaModal.timeBreakdown.map((t, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200">
                      <span className="w-20 shrink-0 font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10 px-2 py-0.5 rounded text-center">
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
              <div className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                🗣️ સ્ટેજ પર બોલવાની શબ્દશઃ સ્ક્રિપ્ટ (Word-by-word Presentation Script):
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-line select-text">
                {activeIdeaModal.fullScript}
              </div>
            </div>

            {/* Delivery Tips & Body Language */}
            {activeIdeaModal.deliveryTips && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                <strong className="text-emerald-700 dark:text-emerald-300 font-bold block mb-1">
                  💡 સ્ટેજ રજૂઆત ટીપ્સ & હાવભાવ (Delivery Tips):
                </strong>
                <span>{activeIdeaModal.deliveryTips}</span>
              </div>
            )}

            {/* Props Required */}
            {activeIdeaModal.keyPropsOrRequirements && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <strong>સાધન સામગ્રી:</strong> {activeIdeaModal.keyPropsOrRequirements}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
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
