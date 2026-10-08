import React, { useState, useMemo } from 'react';
import {
  Presentation,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Copy,
  Printer,
  Search,
  Clock,
  HelpCircle,
  Lightbulb,
  GraduationCap,
  Loader2,
  School,
  Users,
  FlaskConical,
  Volume2,
  FileText,
  ListOrdered,
} from 'lucide-react';
import {
  GSEB_STANDARDS,
  GSEB_SUBJECTS,
  generateCurriculumPresentationScript,
} from '../data/presentationCurriculumData';
import { apiUrl } from '../utils/apiConfig';

export type PresentationScriptData = ReturnType<typeof generateCurriculumPresentationScript>;

interface DailyPresentationTabProps {
  schoolName?: string;
  diseCode?: string;
  district?: string;
  isSchoolView?: boolean;
  onToggleEnabled?: () => void;
}

export const DailyPresentationTab: React.FC<DailyPresentationTabProps> = ({
  schoolName,
}) => {
  // Form state
  const [selectedStandard, setSelectedStandard] = useState<number>(9);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('science');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [environment, setEnvironment] = useState<'પ્રાર્થના સંમેલન / સભા' | 'વર્ગખંડ પ્રસ્તુતિ'>('પ્રાર્થના સંમેલન / સભા');
  const [studentName, setStudentName] = useState<string>('');
  const [topicError, setTopicError] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [presentation, setPresentation] = useState<PresentationScriptData>(() => {
    return generateCurriculumPresentationScript(
      9,
      'વિજ્ઞાન (Science)',
      'દ્રવ્યની ત્રણ ભૌતિક અવસ્થાઓ: ઘન, પ્રવાહી અને વાયુની સરખામણી',
      '૫ મિનિટ (સંપૂર્ણ રજૂઆત)',
      'પ્રાર્થના સંમેલન / સભા',
      'વિદ્યાર્થી'
    );
  });

  const [copied, setCopied] = useState<boolean>(false);
  const [viewTab, setViewTab] = useState<'speech' | 'summary'>('speech');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');

  // Filter available subjects based on selected standard
  const availableSubjects = useMemo(() => {
    return GSEB_SUBJECTS.filter((sub) => sub.standards.includes(selectedStandard));
  }, [selectedStandard]);

  // Current selected subject object
  const currentSubject = useMemo(() => {
    return (
      availableSubjects.find((s) => s.id === selectedSubjectId) ||
      availableSubjects[0] ||
      GSEB_SUBJECTS[0]
    );
  }, [availableSubjects, selectedSubjectId]);

  // Popular topics for the current standard and subject
  const suggestedTopics = useMemo(() => {
    return currentSubject.popularTopics.filter(
      (t) => t.standard === selectedStandard
    );
  }, [currentSubject, selectedStandard]);

  // Handle Standard Change
  const handleStandardChange = (std: number) => {
    setSelectedStandard(std);
    const validSubs = GSEB_SUBJECTS.filter((s) => s.standards.includes(std));
    if (!validSubs.some((s) => s.id === selectedSubjectId) && validSubs.length > 0) {
      setSelectedSubjectId(validSubs[0].id);
    }
  };

  // Generate Presentation (AI endpoint or instant curriculum fallback)
  const handleGenerate = async (topicToUse?: string, envToUse?: 'પ્રાર્થના સંમેલન / સભા' | 'વર્ગખંડ પ્રસ્તુતિ') => {
    const finalTopic = (topicToUse || customTopic).trim();
    if (!finalTopic) {
      setTopicError('કૃપા કરીને રજૂઆત માટેનો વિષય (Topic) પસંદ કરો અથવા નીચે આપેલ સૂચિમાંથી ક્લિક કરો.');
      return;
    }

    const finalEnv = envToUse || environment;
    const finalStudentName = studentName.trim() || 'વિદ્યાર્થી';

    setTopicError(null);
    setIsGenerating(true);
    setCopied(false);

    try {
      const res = await fetch(apiUrl('/api/generate-presentation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standard: `ધોરણ ${selectedStandard}`,
          subject: currentSubject.name,
          topic: finalTopic,
          duration: '૫ મિનિટ (સંપૂર્ણ રજૂઆત)',
          environment: finalEnv,
          studentName: finalStudentName,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setPresentation(json.data);
          setIsGenerating(false);
          return;
        }
      }
    } catch (e) {
      console.warn('API call failed, falling back to curriculum script:', e);
    }

    // High quality offline fallback
    const fallback = generateCurriculumPresentationScript(
      selectedStandard,
      currentSubject.name,
      finalTopic,
      '૫ મિનિટ (સંપૂર્ણ રજૂઆત)',
      finalEnv,
      finalStudentName
    );
    setPresentation(fallback);
    setIsGenerating(false);
  };

  // Switch environment and regenerate if topic exists
  const handleEnvironmentSwitch = (newEnv: 'પ્રાર્થના સંમેલન / સભા' | 'વર્ગખંડ પ્રસ્તુતિ') => {
    setEnvironment(newEnv);
    if (presentation?.title) {
      handleGenerate(presentation.title, newEnv);
    }
  };

  // Copy full clean spoken speech for student
  const handleCopyScript = () => {
    if (!presentation) return;

    let fullText = `🎤 વિદ્યાર્થી ૫ મિનિટ સ્પીચ પ્રેઝન્ટેશન\n`;
    fullText += `શાળા: ${schoolName || 'ગુજરાત માધ્યમિક શાળા'}\n`;
    fullText += `ધોરણ: ${presentation.standard} | વિષય: ${presentation.subject}\n`;
    fullText += `વિષય/મુદ્દો: ${presentation.title}\n`;
    fullText += `સ્થળ: ${presentation.environment} | સમયગાળો: ૫ મિનિટ\n`;
    fullText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    fullText += `૧. પ્રારંભિક સંબોધન & શરૂઆત:\n${presentation.openingSpeech || presentation.hook || ''}\n\n`;
    fullText += `૨. વિષય પરિચય & સાદી વ્યાખ્યા:\n${presentation.topicIntroduction || presentation.introduction || ''}\n\n`;
    fullText += `૩. વિષયની ઊંડાણપૂર્વક સમજુતી (૫ મિનિટ બોલવાનું મુખ્ય લખાણ):\n${presentation.detailedExplanation || ''}\n\n`;
    fullText += `૪. રોજિંદા જીવન સાથેનું સચોટ જોડાણ (ઉદાહરણોની સમજૂતી):\n${presentation.realLifeExample || ''}\n\n`;

    if (presentation.detailedExamples && presentation.detailedExamples.length > 0) {
      presentation.detailedExamples.forEach((ex) => {
        fullText += `• ${ex.title}\n  - પરિસ્થિતિ: ${ex.context}\n  - વૈજ્ઞાનિક સમજૂતી: ${ex.scientificReason}\n`;
        if (ex.speechQuote) fullText += `  - બોલવાની રીત: ${ex.speechQuote}\n`;
      });
      fullText += `\n`;
    }

    if (presentation.practicalActivity?.hasActivity && presentation.practicalActivity.title) {
      fullText += `૫. GSEB પાઠ્યપુસ્તક પ્રાયોગિક પ્રવૃત્તિ & ડેમો:\n• પ્રવૃત્તિ: ${presentation.practicalActivity.title}`;
      if (presentation.practicalActivity.textbookRef) {
        fullText += ` (${presentation.practicalActivity.textbookRef})`;
      }
      fullText += `\n`;
      if (presentation.practicalActivity.materials?.length) {
        fullText += `• સાધન સામગ્રી: ${presentation.practicalActivity.materials.join(', ')}\n`;
      }
      if (presentation.practicalActivity.procedure?.length) {
        fullText += `• પદ્ધતિ:\n  ${presentation.practicalActivity.procedure.join('\n  ')}\n`;
      }
      if (presentation.practicalActivity.observation) {
        fullText += `• પ્રત્યક્ષ અવલોકન: ${presentation.practicalActivity.observation}\n`;
      }
      if (presentation.practicalActivity.conclusion) {
        fullText += `• વૈજ્ઞાનિક તારણ: ${presentation.practicalActivity.conclusion}\n`;
      }
      if (presentation.practicalActivity.stageDemoTip) {
        fullText += `• સ્ટેજ ડેમો ટિપ: ${presentation.practicalActivity.stageDemoTip}\n`;
      }
      if (presentation.practicalActivity.description) {
        fullText += `• વક્તવ્ય લખાણ: ${presentation.practicalActivity.description}\n`;
      }
      fullText += `\n`;
    }

    if (presentation.audienceQuestion?.question) {
      fullText += `૬. શ્રોતાઓ માટે સવાલ:\n• સવાલ: ${presentation.audienceQuestion.question}\n• અપેક્ષિત ઉત્તર: ${presentation.audienceQuestion.expectedAnswer}\n\n`;
    }

    fullText += `૭. સમાપન & આભારવિધિ:\n${presentation.closingSpeech || presentation.conclusion || ''}\n\n`;

    if (presentation.keyPointsToRemember?.length) {
      fullText += `📌 યાદ રાખવાના મુખ્ય મુદ્દા:\n`;
      presentation.keyPointsToRemember.forEach((pt) => {
        fullText += `• ${pt}\n`;
      });
    }

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const textSizeClass =
    fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg leading-relaxed' : 'text-base leading-relaxed';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md border border-white/30 text-white">
              <Presentation className="w-3.5 h-3.5" />
              <span>વિદ્યાર્થી ૫ મિનિટ પ્રેઝન્ટેશન સહાયક</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              સરળ અને પ્રભાવશાળી વક્તવ્ય સ્ક્રિપ્ટ
            </h1>
            <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
              ધોરણ ૯ થી ૧૨ ના વિદ્યાર્થીઓ પ્રાર્થના સભા કે વર્ગખંડમાં ૫ મિનિટ સુધી અસ્ખલિત, સરળ શબ્દોમાં
              બોલી શકે તે માટે પૂરતું અને યોગ્ય લખાણ અહીં એક જ ક્લિકમાં તૈયાર થાય છે.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-2xl bg-black/20 border border-white/20 backdrop-blur-md text-right text-xs">
              <div className="text-emerald-200 text-[10px] font-semibold">GSEB પાઠ્યપુસ્તક આધારિત</div>
              <div className="font-bold text-white">ધોરણ ૯ થી ૧૨ • સરળ ગુજરાતી</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel: Standard, Subject, Venue & Topic */}
      <div className="bg-white dark:bg-[#0c1218] border border-[#E2E8F0] dark:border-white/10 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>૧. ધોરણ, વિષય અને સ્થળ પસંદ કરો</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            સરળ અને બોલવા માટે યોગ્ય લખાણ
          </span>
        </div>

        {/* 1. Standard Selector Buttons */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            ધોરણ પસંદ કરો (Select Standard):
          </label>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {GSEB_STANDARDS.map((std) => (
              <button
                key={std.value}
                type="button"
                onClick={() => handleStandardChange(std.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedStandard === std.value
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {std.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Subject Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>વિષય પસંદ કરો (Select Subject):</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {availableSubjects.map((sub) => {
              const isActive = selectedSubjectId === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs ring-1 ring-emerald-500/30'
                      : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg shrink-0">{sub.icon}</span>
                  <div className="truncate text-xs font-bold">{sub.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Venue / Environment Selection (Prayer Hall vs Classroom) */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>રજૂઆત ક્યાં કરવાની છે? (Select Presentation Setting):</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleEnvironmentSwitch('પ્રાર્થના સંમેલન / સભા')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                environment === 'પ્રાર્થના સંમેલન / સભા'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <School className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🏛️ પ્રાર્થના સભા (Morning Assembly)</span>
                  {environment === 'પ્રાર્થના સંમેલન / સભા' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold">પસંદ કરેલ</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  સમગ્ર શાળા, આચાર્યશ્રી, શિક્ષકો અને તમામ વિદ્યાર્થીઓ સામે સ્ટેજ પર પ્રભાવશાળી વક્તવ્ય.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleEnvironmentSwitch('વર્ગખંડ પ્રસ્તુતિ')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                environment === 'વર્ગખંડ પ્રસ્તુતિ'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🏫 વર્ગખંડ પ્રસ્તુતિ (Classroom)</span>
                  {environment === 'વર્ગખંડ પ્રસ્તુતિ' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-extrabold">પસંદ કરેલ</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  વિષય શિક્ષક અને ક્લાસરૂમના સહપાઠી મિત્રો સમક્ષ સમજૂતી અને સંવાદ સાથે રજૂઆત.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 4. Popular Chapter Topics Suggestions */}
        {suggestedTopics.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>પાઠ્યપુસ્તકના પ્રચલિત ટોપિક્સ (એક ક્લિકમાં પસંદ કરો):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {suggestedTopics.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCustomTopic(item.topic);
                    handleGenerate(item.topic);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-800/80 transition-all cursor-pointer whitespace-nowrap"
                >
                  {item.topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Custom Topic & Student Name */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              રજૂઆતનો વિષય / મુદ્દો (Topic to Present):
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="દા.ત. દ્રવ્યની ત્રણ ભૌતિક અવસ્થાઓ, ટિંડલ અસર, મુક્ત પતન, પ્રકાશ સંશ્લેષણ..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerate();
                }}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {topicError && (
              <p className="text-xs text-rose-500 font-bold mt-1">
                {topicError}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              વિદ્યાર્થીનું નામ (વૈકલ્પિક):
            </label>
            <input
              type="text"
              placeholder="દા.ત. અજય પટેલ"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/10 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>૫ મિનિટ અસ્ખલિત બોલવા માટે યોગ્ય લખાણ તૈયાર થશે.</span>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => handleGenerate()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>સ્ક્રિપ્ટ તૈયાર થઈ રહી છે...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>૫ મિનિટ વક્તવ્ય સ્ક્રિપ્ટ બનાવો</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated 5-Minute Speech Presentation Card */}
      {presentation && (
        <div className="bg-white dark:bg-[#0c1218] border border-[#E2E8F0] dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-md space-y-6">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {presentation.standard}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  {presentation.subject}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {presentation.environment === 'પ્રાર્થના સંમેલન / સભા' ? '🏛️ પ્રાર્થના સભા' : '🏫 વર્ગખંડ'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  ⏱️ ૫ મિનિટ વક્તવ્ય
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                {presentation.title}
              </h2>
            </div>

            {/* Quick Actions & Controls */}
            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
              {/* Tab Selector: Full Speech vs Key Summary */}
              <div className="flex items-center bg-slate-100 dark:bg-white/10 p-1 rounded-xl text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setViewTab('speech')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewTab === 'speech'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>બોલવાની સ્ક્રિપ્ટ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab('summary')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewTab === 'summary'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>મુખ્ય મુદ્દાઓ</span>
                </button>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center bg-slate-100 dark:bg-white/10 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => setFontSize('sm')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === 'sm' ? 'bg-white dark:bg-slate-800 font-black text-emerald-600' : ''}`}
                  title="નાના ફોન્ટ"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('md')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === 'md' ? 'bg-white dark:bg-slate-800 font-black text-emerald-600' : ''}`}
                  title="સામાન્ય ફોન્ટ"
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('lg')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${fontSize === 'lg' ? 'bg-white dark:bg-slate-800 font-black text-emerald-600' : ''}`}
                  title="મોટા ફોન્ટ"
                >
                  A+
                </button>
              </div>

              {/* Copy Script */}
              <button
                type="button"
                onClick={handleCopyScript}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="સંપૂર્ણ સ્ક્રિપ્ટ કોપી કરો"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Print Script */}
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="પ્રિન્ટ સ્લિપ"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* VIEW TAB 1: Complete Flowing Spoken Speech for Student (બોલવાનું સંપૂર્ણ લખાણ) */}
          {viewTab === 'speech' && (
            <div className="space-y-5">
              {/* Section 1: Opening Salutation & Greeting */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>૧. આદરપૂર્વક સંબોધન & શરૂઆત (Opening Speech)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    આશરે ૪૫ સેકન્ડ
                  </span>
                </div>
                <p className={`font-semibold text-slate-900 dark:text-emerald-50 ${textSizeClass}`}>
                  "{presentation.openingSpeech || presentation.hook}"
                </p>
              </div>

              {/* Section 2: Topic Introduction & Definition in Simple Words */}
              <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>૨. વિષય પરિચય & સાદી વ્યાખ્યા (Introduction & Core Meaning)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                    આશરે ૧ મિનિટ
                  </span>
                </div>
                <p className={`text-slate-800 dark:text-blue-50 ${textSizeClass}`}>
                  {presentation.topicIntroduction || presentation.introduction}
                </p>
              </div>

              {/* Section 3: Detailed 5-Minute Spoken Script (બોલવા માટેનું મુખ્ય લખાણ) */}
              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                    <Presentation className="w-3.5 h-3.5 text-emerald-600" />
                    <span>૩. વિષયની ઊંડાણપૂર્વક સરળ સમજૂતી (Detailed 5-Minute Speech Body)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    આશરે ૨ થી ૨.૫ મિનિટ
                  </span>
                </div>
                <div className={`text-slate-800 dark:text-slate-200 whitespace-pre-line space-y-3 font-medium ${textSizeClass}`}>
                  {presentation.detailedExplanation}
                </div>
              </div>

              {/* Section 4: Relatable Everyday Life Example (રોજિંદા જીવન સાથે જોડાણ) */}
              <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    <span>૪. રોજિંદા જીવન સાથેનું સચોટ જોડાણ (Relatable Everyday Examples)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                    આશરે ૪૫ સેકન્ડ
                  </span>
                </div>
                
                {/* Flowing spoken speech for student */}
                <p className={`text-slate-800 dark:text-amber-50 leading-relaxed font-medium ${textSizeClass}`}>
                  {presentation.realLifeExample}
                </p>

                {/* Structured Breakdown Cards for each Concrete Example */}
                {presentation.detailedExamples && presentation.detailedExamples.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-amber-200/60 dark:border-amber-800/30">
                    <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                      💡 ઉદાહરણોની ઊંડાણપૂર્વક સમજૂતી (Detailed Explanation):
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {presentation.detailedExamples.map((ex, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-amber-200/80 dark:border-amber-800/50 shadow-2xs space-y-1.5"
                        >
                          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-amber-100 flex items-center gap-1.5">
                            <span>{ex.title}</span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                            <span className="font-bold text-amber-800 dark:text-amber-300">પરિસ્થિતિ: </span>
                            {ex.context}
                          </div>
                          <div className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">વૈજ્ઞાનિક કારણ: </span>
                            {ex.scientificReason}
                          </div>
                          {ex.speechQuote && (
                            <div className="text-[11px] font-medium text-amber-800 dark:text-amber-200/90 italic bg-amber-50/80 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200/60 dark:border-amber-800/30">
                              🗣️ સ્ટેજ પર બોલવાની રીત: {ex.speechQuote}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Practical Demo & Activity (GSEB પાઠ્યપુસ્તક પ્રાયોગિક પ્રવૃત્તિ) */}
              {presentation.practicalActivity?.hasActivity && presentation.practicalActivity.title && (
                <div className="bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300 font-bold text-xs uppercase tracking-wider">
                      <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                      <span>૫. GSEB પાઠ્યપુસ્તક પ્રાયોગિક પ્રવૃત્તિ & વર્ગખંડ ડેમો</span>
                    </div>
                    {presentation.practicalActivity.textbookRef && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                        📖 {presentation.practicalActivity.textbookRef}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="font-black text-sm sm:text-base text-purple-950 dark:text-purple-100">
                      {presentation.practicalActivity.title}
                    </div>

                    {/* Materials Tags */}
                    {presentation.practicalActivity.materials && presentation.practicalActivity.materials.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300">
                          📦 જરૂરી સાધન સામગ્રી:
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {presentation.practicalActivity.materials.map((mat, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800/50 shadow-2xs"
                            >
                              • {mat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Procedure Steps */}
                    {presentation.practicalActivity.procedure && presentation.practicalActivity.procedure.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300">
                          📋 કરવાની સ્ટેપ-બાય-સ્ટેપ પદ્ધતિ:
                        </span>
                        <div className="space-y-1">
                          {presentation.practicalActivity.procedure.map((step, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-purple-100 dark:border-purple-900/30 flex items-start gap-2"
                            >
                              <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-black text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="leading-snug pt-0.5">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observation & Conclusion Split */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {presentation.practicalActivity.observation && (
                        <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-1">
                          <div className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                            <span>👁️ પ્રત્યક્ષ અવલોકન (Observation):</span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-amber-50 leading-relaxed font-medium">
                            {presentation.practicalActivity.observation}
                          </p>
                        </div>
                      )}

                      {presentation.practicalActivity.conclusion && (
                        <div className="p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                          <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                            <span>🎯 વૈજ્ઞાનિક તારણ (Conclusion):</span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-emerald-50 leading-relaxed font-medium">
                            {presentation.practicalActivity.conclusion}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Stage Demo Tip */}
                    {presentation.practicalActivity.stageDemoTip && (
                      <div className="p-2.5 rounded-xl bg-purple-100/70 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700/60 text-xs text-purple-950 dark:text-purple-100 flex items-start gap-2">
                        <span className="text-base shrink-0">⚡</span>
                        <div className="leading-relaxed">
                          <strong className="text-purple-900 dark:text-purple-200">સ્ટેજ ડેમો ટિપ: </strong>
                          {presentation.practicalActivity.stageDemoTip}
                        </div>
                      </div>
                    )}

                    {/* Spoken Speech Explanation for Student */}
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300">
                        🗣️ વિદ્યાર્થી આ પ્રવૃત્તિ સ્ટેજ પર બોલીને કેવી રીતે સમજાવશે:
                      </span>
                      <p className={`text-slate-800 dark:text-purple-100 leading-relaxed font-medium mt-1 ${textSizeClass}`}>
                        {presentation.practicalActivity.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 6: Audience Question (શ્રોતાઓ માટે પ્રશ્ન) */}
              {presentation.audienceQuestion?.question && (
                <div className="bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 rounded-2xl p-4 sm:p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-900 dark:text-sky-300 font-bold text-xs uppercase tracking-wider">
                      <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                      <span>૬. શ્રોતાઓ માટે એક સવાલ (Audience Interaction Question)</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 dark:bg-sky-900/60 dark:text-sky-200">
                      ધ્યાન આકર્ષણ
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className={`font-bold text-slate-900 dark:text-white ${textSizeClass}`}>
                      "{presentation.audienceQuestion.question}"
                    </div>
                    <div className="text-xs text-sky-700 dark:text-sky-300 font-medium italic">
                      👉 અપેક્ષિત ઉત્તર: {presentation.audienceQuestion.expectedAnswer}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 7: Conclusion & Thank You */}
              <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                    <span>🏁 ૭. સમાપન અને આભારવિધિ (Closing & Thank You)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300">
                    આશરે ૩૦ સેકન્ડ
                  </span>
                </div>
                <p className={`font-semibold text-slate-900 dark:text-emerald-50 ${textSizeClass}`}>
                  "{presentation.closingSpeech || presentation.conclusion}"
                </p>
              </div>
            </div>
          )}

          {/* VIEW TAB 2: Key Points / Summary Card (યાદ રાખવાના મુખ્ય મુદ્દા) */}
          {viewTab === 'summary' && (
            <div className="space-y-4">
              <div className="bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
                    <ListOrdered className="w-4 h-4 text-indigo-600" />
                    <span>સ્ટેજ પર બોલતી વખતે ધ્યાનમાં રાખવાના ૪ મુખ્ય મુદ્દાઓ</span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    ઝડપી પુનરાવર્તન
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  {presentation.keyPointsToRemember?.map((pt, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3 shadow-2xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <p className={`font-semibold text-slate-800 dark:text-slate-200 ${textSizeClass}`}>
                        {pt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blackboard Note for Classroom Setting */}
              {presentation.environment === 'વર્ગખંડ પ્રસ્તુતિ' && (
                <div className="p-4 rounded-2xl bg-[#1a2e22] text-[#e8f5e9] border-4 border-[#3e2723] space-y-2 font-sans">
                  <div className="text-center border-b border-emerald-500/40 pb-2">
                    <span className="text-[10px] tracking-widest text-emerald-300 font-mono">
                      BLACKBOARD HINT (વર્ગખંડ બોર્ડ કાર્ય)
                    </span>
                    <h4 className="text-sm font-bold text-yellow-200 mt-0.5">
                      {presentation.title}
                    </h4>
                  </div>
                  <p className="text-xs text-emerald-100 leading-relaxed text-center">
                    બોર્ડની મધ્યમાં વિષયનું નામ લખો અને બોલતી વખતે ૧ કે ૨ મુખ્ય મુદ્દા ચોકથી નોંધો.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Bottom Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              વિદ્યાર્થી આ સ્ક્રિપ્ટ વાંચીને અથવા પ્રિન્ટ કાઢીને સરળતાથી ૫ મિનિટ સુધી બોલી શકે છે.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyScript}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'કોપી થઈ ગયું!' : 'સ્ક્રિપ્ટ કોપી કરો'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>પ્રિન્ટ / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
