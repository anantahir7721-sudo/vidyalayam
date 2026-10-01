import React, { useState, useMemo } from 'react';
import {
  Presentation,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Copy,
  Printer,
  Search,
  PenTool,
  Clock,
  Layers,
  HelpCircle,
  Lightbulb,
  GraduationCap,
  Loader2,
  Bookmark,
  Share2,
  RotateCcw,
  Eye,
  FileText,
} from 'lucide-react';
import {
  GSEB_STANDARDS,
  GSEB_SUBJECTS,
  GsebSubject,
  PresentationScriptData,
  generateCurriculumPresentationScript,
} from '../data/presentationCurriculumData';

interface DailyPresentationTabProps {
  schoolName?: string;
  diseCode?: string;
  district?: string;
  isSchoolView?: boolean;
}

export const DailyPresentationTab: React.FC<DailyPresentationTabProps> = ({
  schoolName,
  diseCode,
}) => {
  // Form controls
  const [selectedStandard, setSelectedStandard] = useState<number>(9);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('science');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [duration, setDuration] = useState<string>('3-5 મિનિટ');
  const [environment, setEnvironment] = useState<string>('સભા & વર્ગખંડ');
  const [studentName, setStudentName] = useState<string>('');
  const [topicError, setTopicError] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [presentation, setPresentation] = useState<PresentationScriptData | null>(() => {
    // Default initial presentation for Std 9 Science
    return generateCurriculumPresentationScript(
      9,
      'વિજ્ઞાન (Science)',
      'દ્રવ્યની ત્રણ ભૌતિક અવસ્થાઓ: ઘન, પ્રવાહી અને વાયુની સરખામણી',
      '3-5 મિનિટ',
      'સભા & વર્ગખંડ',
      'વિદ્યાર્થી'
    );
  });

  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'script' | 'blackboard' | 'full'>('full');
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

  // Generate Presentation (via AI endpoint or fallback)
  const handleGenerate = async (topicToUse?: string) => {
    const finalTopic = (topicToUse || customTopic).trim();
    if (!finalTopic) {
      setTopicError('કૃપા કરીને રજૂઆત માટેનો વિષય (Topic) પસંદ કરો અથવા નીચે આપેલ સૂચિમાંથી ક્લિક કરો.');
      return;
    }

    setTopicError(null);
    setIsGenerating(true);
    setCopied(false);

    try {
      const res = await fetch('/api/generate-presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standard: `ધોરણ ${selectedStandard}`,
          subject: currentSubject.name,
          topic: finalTopic,
          duration,
          environment,
          studentName: studentName.trim() || 'વિદ્યાર્થી',
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

    // Fallback template
    const fallback = generateCurriculumPresentationScript(
      selectedStandard,
      currentSubject.name,
      finalTopic,
      duration,
      environment,
      studentName.trim() || 'વિદ્યાર્થી'
    );
    setPresentation(fallback);
    setIsGenerating(false);
  };

  // Copy full script
  const handleCopyScript = () => {
    if (!presentation) return;

    let fullText = `📚 વિદ્યાર્થી પ્રેઝન્ટેશન સ્ક્રિપ્ટ (GSEB)\n`;
    fullText += `વિષય: ${presentation.subject} | ${presentation.standard}\n`;
    fullText += `ટોપિક: ${presentation.title}\n`;
    fullText += `સમયગાળો: ${presentation.duration} | સ્થળ: ${presentation.environment}\n\n`;
    fullText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    fullText += `🎤 શરૂઆત & નમસ્કાર:\n${presentation.hook}\n\n`;
    fullText += `📖 પરિચય & વ્યાખ્યા:\n${presentation.introduction}\n\n`;

    if (presentation.blackboardWork?.useBlackboard) {
      fullText += `✏️ બ્લેકબોર્ડ કાર્ય:\n`;
      fullText += `• મુખ્ય શીર્ષક: ${presentation.blackboardWork.boardTitle}\n`;
      fullText += `• ડાબી બાજુ મુદ્દા: ${presentation.blackboardWork.leftSection.join(', ')}\n`;
      fullText += `• આકૃતિ/ડાયાગ્રામ: ${presentation.blackboardWork.diagramDescription}\n`;
      fullText += `• જમણી બાજુ સૂત્ર/તારણ: ${presentation.blackboardWork.rightSection.join(', ')}\n\n`;
    }

    fullText += `🗣️ મુદ્દાવાર સમજુતી:\n`;
    presentation.presentationSteps.forEach((s) => {
      fullText += `${s.subHeading}\n${s.spokenScript}\n[હાવભાવ: ${s.actionInstruction}]\n\n`;
    });

    fullText += `💡 વાસ્તવિક જીવનનું ઉદાહરણ:\n${presentation.realLifeExample}\n\n`;

    if (presentation.audienceQuestions?.length) {
      fullText += `❓ શ્રોતાઓને પૂછવાના પ્રશ્નો:\n`;
      presentation.audienceQuestions.forEach((q, idx) => {
        fullText += `${idx + 1}. ${q.question}\n(જવાબ: ${q.expectedAnswer})\n`;
      });
      fullText += `\n`;
    }

    fullText += `🏁 આભાર & ઉપસંહાર:\n${presentation.conclusion}\n`;
    if (schoolName) fullText += `\nશાળા: ${schoolName}`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Print presentation cue card
  const handlePrint = () => {
    window.print();
  };

  const textSizeClass =
    fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md border border-white/30 text-white">
              <Presentation className="w-3.5 h-3.5" />
              <span>વિદ્યાર્થી પ્રેઝન્ટેશન સહાયક (GSEB પાઠ્યપુસ્તક આધારિત)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              વર્ગખંડ & સભા પ્રેઝન્ટેશન સ્ક્રિપ્ટ જનરેટર
            </h1>
            <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
              વિદ્યાર્થીઓ પોતાના ધોરણ અને વિષયમાંથી કોઈપણ પ્રકરણનો મુદ્દો પસંદ કરી સ્ટેપ-બાય-સ્ટેપ
              બોલવાની સંપૂર્ણ સ્ક્રિપ્ટ, બ્લેકબોર્ડ કાર્ય અને વાસ્તવિક ઉદાહરણો સાથે તૈયાર કરી શકે છે.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-2xl bg-black/20 border border-white/20 backdrop-blur-md text-right text-xs">
              <div className="text-emerald-200 text-[10px] font-semibold">ગુજરાત બોર્ડ ધોરણ ૯ થી ૧૨ (GSEB)</div>
              <div className="font-bold text-white">૧૦૦% પાઠ્યપુસ્તક આધારિત</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel: Standard, Subject & Topic Search */}
      <div className="bg-white dark:bg-[#0c1218] border border-[#E2E8F0] dark:border-white/10 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>૧. ધોરણ, વિષય અને પ્રકરણ પસંદ કરો</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            GSEB Textbook Aligned
          </span>
        </div>

        {/* Standard Selector Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>ધોરણ પસંદ કરો (Select Standard):</span>
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {GSEB_STANDARDS.map((std) => (
              <button
                key={std.value}
                type="button"
                onClick={() => handleStandardChange(std.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedStandard === std.value
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {std.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Selector Buttons */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>વિષય પસંદ કરો (Select Subject):</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {availableSubjects.map((sub) => {
              const isActive = selectedSubjectId === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs'
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

        {/* Popular Chapter Topics Suggestions */}
        {suggestedTopics.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>પ્રચલિત પાઠ્યપુસ્તક ટોપિક્સ (ક્લિક કરી તરત પસંદ કરો):</span>
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
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-800/80 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                >
                  {item.hasBlackboard && <span>✏️</span>}
                  <span>{item.topic}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Topic Search / Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              રજૂઆતનો વિષય / મુદ્દો (Topic to Present):
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="દા.ત. પ્રકાશનું પરાવર્તન, પાચનતંત્ર, પાયથાગોરસ પ્રમેય, સૂર્યમંડળ..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerate();
                }}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {topicError && (
              <p className="text-xs text-rose-500 font-bold mt-1 animate-pulse">
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
              placeholder="દા.ત. દર્શન પટેલ"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Options Bar: Duration & Setting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>સમયગાળો:</span>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="bg-slate-100 dark:bg-white/10 border-none rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
              >
                <option value="2-3 મિનિટ">૨-૩ મિનિટ (સંક્ષિપ્ત વક્તવ્ય)</option>
                <option value="3-5 મિનિટ">૩-૫ મિનિટ (વર્ગખંડ સમજુતી)</option>
                <option value="7-10 મિનિટ">૭-૧૦ મિનિટ (વિસ્તૃત પ્રેઝન્ટેશન)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>સ્થળ:</span>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="bg-slate-100 dark:bg-white/10 border-none rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
              >
                <option value="સભા & વર્ગખંડ">સભા & વર્ગખંડ (Assembly / Class)</option>
                <option value="પ્રાર્થના સંમેલન">પ્રાર્થના સંમેલન (Morning Assembly)</option>
                <option value="વિજ્ઞાન મેળો & પ્રદર્શન">વિજ્ઞાન મેળો & પ્રદર્શન (Science Fair)</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => handleGenerate()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>સ્ક્રિપ્ટ તૈયાર થઈ રહી છે...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>AI પ્રેઝન્ટેશન સ્ક્રિપ્ટ બનાવો</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Script & Blackboard Work Presentation Card */}
      {presentation && (
        <div className="bg-white dark:bg-[#0c1218] border border-[#E2E8F0] dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-md space-y-6">
          {/* Script Card Header & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {presentation.standard}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  {presentation.subject}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  ⏱️ {presentation.duration}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1.5">
                {presentation.title}
              </h2>
            </div>

            {/* Actions & View Controls */}
            <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
              {/* View Tabs */}
              <div className="flex items-center bg-slate-100 dark:bg-white/10 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('full')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    viewMode === 'full'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  સંપૂર્ણ
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('blackboard')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'blackboard'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <PenTool className="w-3 h-3" />
                  <span>બ્લેકબોર્ડ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('script')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === 'script'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>સ્ક્રિપ્ટ</span>
                </button>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center bg-slate-100 dark:bg-white/10 p-1 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => setFontSize('sm')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${fontSize === 'sm' ? 'bg-white dark:bg-slate-800 font-black' : ''}`}
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('md')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${fontSize === 'md' ? 'bg-white dark:bg-slate-800 font-black' : ''}`}
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('lg')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${fontSize === 'lg' ? 'bg-white dark:bg-slate-800 font-black' : ''}`}
                >
                  A+
                </button>
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopyScript}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="સ્ક્રિપ્ટ કોપી કરો"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Print Button */}
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

          {/* Section: Opening & Hook */}
          {(viewMode === 'full' || viewMode === 'script') && (
            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                <span>🎤 ૧. આકર્ષક શરૂઆત & નમસ્કાર (Opening Speech)</span>
              </div>
              <p className={`font-medium text-slate-900 dark:text-emerald-50 leading-relaxed ${textSizeClass}`}>
                "{presentation.hook}"
              </p>
            </div>
          )}

          {/* Section: Introduction */}
          {(viewMode === 'full' || viewMode === 'script') && (
            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>૨. વિષય પરિચય & મહત્વ (Introduction)</span>
              </div>
              <p className={`text-slate-800 dark:text-slate-200 leading-relaxed ${textSizeClass}`}>
                {presentation.introduction}
              </p>
            </div>
          )}

          {/* Section: Realistic Blackboard Work Plan (બ્લેકબોર્ડ કાર્ય) */}
          {(viewMode === 'full' || viewMode === 'blackboard') && presentation.blackboardWork && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                  <PenTool className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>૩. બ્લેકબોર્ડ વર્ક પ્લાન (Blackboard Usage Inclusion)</span>
                </div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  વિદ્યાર્થી માટે બોર્ડ માર્ગદર્શન
                </span>
              </div>

              {/* Virtual Blackboard Display */}
              <div className="relative rounded-2xl p-5 sm:p-6 bg-[#1a2e22] text-[#e8f5e9] border-8 border-[#3e2723] shadow-2xl font-sans space-y-4">
                {/* Board Top Center Title in Chalk Font Style */}
                <div className="text-center border-b border-emerald-500/40 pb-3">
                  <div className="text-[10px] tracking-widest uppercase text-emerald-300/80 font-mono">
                    CHALKBOARD WORK
                  </div>
                  <h3 className="text-base sm:text-xl font-bold tracking-wide text-yellow-200 drop-shadow-sm">
                    {presentation.blackboardWork.boardTitle}
                  </h3>
                </div>

                {/* 3 Columns / Grid Layout on Blackboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {/* Left Column: Key Points */}
                  <div className="bg-emerald-950/50 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
                    <div className="text-xs font-bold text-yellow-300 border-b border-emerald-500/30 pb-1 flex items-center gap-1.5">
                      <span>📌 મુખ્ય મુદ્દાઓ (Left Section)</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-emerald-100">
                      {presentation.blackboardWork.leftSection.map((pt, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-yellow-300 font-mono">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Center Column: Diagram / Drawing */}
                  <div className="bg-emerald-950/50 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
                    <div className="text-xs font-bold text-yellow-300 border-b border-emerald-500/30 pb-1 flex items-center gap-1.5">
                      <span>🎨 રેખાચિત્ર / ડાયાગ્રામ (Center Diagram)</span>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-dashed border-emerald-400/40 text-center text-xs text-emerald-200 leading-relaxed">
                      {presentation.blackboardWork.diagramDescription}
                    </div>
                  </div>

                  {/* Right Column: Formulas & Rules */}
                  <div className="bg-emerald-950/50 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
                    <div className="text-xs font-bold text-yellow-300 border-b border-emerald-500/30 pb-1 flex items-center gap-1.5">
                      <span>📐 સૂત્રો / તારણો (Right Section)</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-emerald-100">
                      {presentation.blackboardWork.rightSection.map((pt, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-300 font-mono">✓</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Chalk Dust / Blackboard Tip */}
                <div className="pt-2 border-t border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-200/90 italic">
                  <Lightbulb className="w-4 h-4 text-yellow-300 shrink-0" />
                  <span>
                    <strong>શિક્ષકની સલાહ:</strong> {presentation.blackboardWork.teacherTip}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section: Step-by-Step Spoken Script with Action Directions */}
          {(viewMode === 'full' || viewMode === 'script') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <Presentation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>૪. વિદ્યાર્થીએ શું બોલવું - તબક્કાવાર સ્ક્રિપ્ટ (Step-by-Step Speech)</span>
              </div>

              <div className="space-y-3">
                {presentation.presentationSteps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-xs text-emerald-700 dark:text-emerald-400">
                        {step.subHeading}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <span>🎭 હાવભાવ/એક્શન:</span>
                        <span>{step.actionInstruction}</span>
                      </span>
                    </div>

                    <p className={`text-slate-800 dark:text-slate-200 leading-relaxed ${textSizeClass}`}>
                      {step.spokenScript}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Real Life Example */}
          {(viewMode === 'full' || viewMode === 'script') && (
            <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <span>૫. રોજિંદા જીવનનું વાસ્તવિક ઉદાહરણ (Real-Life Connection)</span>
              </div>
              <p className={`text-slate-800 dark:text-amber-100 leading-relaxed ${textSizeClass}`}>
                {presentation.realLifeExample}
              </p>
            </div>
          )}

          {/* Section: Interactive Audience Questions */}
          {(viewMode === 'full' || viewMode === 'script') &&
            presentation.audienceQuestions?.length > 0 && (
              <div className="bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold text-xs uppercase tracking-wider">
                  <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                  <span>૬. શ્રોતાઓને પૂછવાના પ્રશ્નો (Interactive Audience Q&A)</span>
                </div>

                <div className="space-y-2">
                  {presentation.audienceQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white dark:bg-white/5 border border-sky-200/60 dark:border-sky-800/30 text-xs space-y-1"
                    >
                      <div className="font-bold text-slate-900 dark:text-white flex items-start gap-1.5">
                        <span className="text-sky-600 font-mono">પ્રશ્ન {idx + 1}:</span>
                        <span>{q.question}</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 text-[11px] pl-5 italic">
                        અપેક્ષિત ઉત્તર: {q.expectedAnswer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Section: Conclusion & Closing */}
          {(viewMode === 'full' || viewMode === 'script') && (
            <div className="bg-slate-100 dark:bg-white/10 rounded-2xl p-4 sm:p-5 space-y-2 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                <span>🏁 ૭. આભારવિધિ અને પ્રેરણાદાયી અંત (Conclusion & Closing)</span>
              </div>
              <p className={`font-semibold text-slate-900 dark:text-white leading-relaxed ${textSizeClass}`}>
                "{presentation.conclusion}"
              </p>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              સ્ક્રિપ્ટ કોપી કરી અથવા પ્રિન્ટ કાઢી સ્ટેજ કે વર્ગખંડમાં રજૂ કરો.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyScript}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
