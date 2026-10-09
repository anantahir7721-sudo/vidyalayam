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
  Lightbulb,
  School,
  Users,
  Volume2,
  Download,
  Loader2,
  Share2,
} from 'lucide-react';
import {
  GSEB_STANDARDS,
  GSEB_SUBJECTS,
  generateCurriculumPresentationScript,
} from '../data/presentationCurriculumData';
import { directGeneratePresentation } from '../services/directGeminiService';
import {
  downloadPresentationAsPdf,
  sharePresentationAsPdf,
} from '../utils/dailyPdfShareUtils';
import { printHtmlDocument } from '../utils/printAndPdfUtils';
import { WhatsAppIcon } from './WhatsAppIcon';

interface DailyPresentationTabProps {
  schoolName?: string;
  diseCode?: string;
  district?: string;
  isSchoolView?: boolean;
  onToggleEnabled?: () => void;
}

export const DailyPresentationTab: React.FC<DailyPresentationTabProps> = ({
  schoolName,
  diseCode,
  district,
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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [isSharingPdf, setIsSharingPdf] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Initial Presentation Script
  const [presentation, setPresentation] = useState<any>(() => {
    return generateCurriculumPresentationScript(
      9,
      'વિજ્ઞાન (Science)',
      'દ્રવ્યની ત્રણ ભૌતિક અવસ્થાઓ: ઘન, પ્રવાહી અને વાયુની સરખામણી',
      '૨-૩ મિનિટ (સરળ રજૂઆત)',
      'પ્રાર્થના સંમેલન / સભા',
      'વિદ્યાર્થી'
    );
  });

  const [copied, setCopied] = useState<boolean>(false);
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

  // Suggested topics for the current standard and subject
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

  // Generate Short Presentation
  const handleGenerate = async (topicToUse?: string, envToUse?: 'પ્રાર્થના સંમેલન / સભા' | 'વર્ગખંડ પ્રસ્તુતિ') => {
    const finalTopic = (topicToUse || customTopic).trim();
    const finalEnv = envToUse || environment;
    const finalStudentName = studentName.trim() || 'વિદ્યાર્થી';

    if (!finalTopic) {
      setTopicError('કૃપા કરીને રજૂઆતનો વિષય દાખલ કરો અથવા નીચે આપેલા સૂચવેલા ટોપિકમાંથી પસંદ કરો.');
      return;
    }
    setTopicError(null);
    setIsGenerating(true);

    try {
      const aiResult = await directGeneratePresentation({
        standard: `ધોરણ ${selectedStandard}`,
        subject: currentSubject.name,
        topic: finalTopic,
        environment: finalEnv,
        studentName: finalStudentName,
      });

      if (aiResult && (aiResult.title || aiResult.openingSpeech)) {
        setPresentation(aiResult);
        setIsGenerating(false);
        return;
      }
    } catch (err) {
      console.warn('Direct AI generation error, using textbook curriculum fallback:', err);
    }

    // High quality textbook fallback
    const fallback = generateCurriculumPresentationScript(
      selectedStandard,
      currentSubject.name,
      finalTopic,
      '૨-૩ મિનિટ (સરળ રજૂઆત)',
      finalEnv,
      finalStudentName
    );
    setPresentation(fallback);
    setIsGenerating(false);
  };

  const handleEnvironmentSwitch = (newEnv: 'પ્રાર્થના સંમેલન / સભા' | 'વર્ગખંડ પ્રસ્તુતિ') => {
    setEnvironment(newEnv);
    if (presentation?.title) {
      handleGenerate(presentation.title, newEnv);
    }
  };

  // Helper to ensure presentation is strictly 1-2 short, crystal-clear paragraphs
  // with greeting, topic, theory and real-life everyday example seamlessly integrated
  const { paragraph1, paragraph2 } = useMemo(() => {
    if (!presentation) return { paragraph1: '', paragraph2: '' };

    // 1. Direct AI generated clean paragraphs
    if (presentation.paragraph1 && presentation.paragraph2) {
      return {
        paragraph1: presentation.paragraph1.trim(),
        paragraph2: presentation.paragraph2.trim(),
      };
    }

    // 2. Synthesize Paragraph 1: Core Concept / Theory (Short & simple)
    let p1 = presentation.paragraph1 || presentation.topicIntroduction || presentation.introduction || '';
    if (!p1 && presentation.detailedExplanation) {
      p1 = presentation.detailedExplanation;
    }

    p1 = p1
      .replace(/\b[૧૨૩૪૫૬૭૮૯૦\d]+[\.\)]\s*/g, '')
      .replace(/\([A-Da-d]\)\s*/g, '')
      .replace(/^(A|B|C|D)[\.\)]\s*/gm, '')
      .replace(/મુખ્ય સિદ્ધાંત:?/gi, '')
      .replace(/પાઠ્યપુસ્તક અનુસાર:?/gi, '')
      .trim();

    const p1Sentences = p1.split(/(?<=[.!?।])\s+/).filter(Boolean);
    if (p1Sentences.length > 4) {
      p1 = p1Sentences.slice(0, 4).join(' ');
    }

    // 3. Synthesize Paragraph 2: Everyday Life Comparison & Concrete Example
    let p2 = presentation.paragraph2 || presentation.realLifeExample || '';
    if (!p2 && presentation.detailedExplanation && presentation.detailedExplanation.length > p1.length) {
      p2 = presentation.detailedExplanation.substring(p1.length).trim();
    }

    p2 = p2
      .replace(/\b[૧૨૩૪૫૬૭૮૯૦\d]+[\.\)]\s*/g, '')
      .replace(/\([A-Da-d]\)\s*/g, '')
      .replace(/રોજિંદા જીવનમાં ઉદાહરણ:?/gi, '')
      .replace(/વાસ્તવિક ઉદાહરણ:?/gi, '')
      .trim();

    const p2Sentences = p2.split(/(?<=[.!?।])\s+/).filter(Boolean);
    if (p2Sentences.length > 4) {
      p2 = p2Sentences.slice(0, 4).join(' ');
    }

    if (p2 && !p2.includes('ઉદાહરણ') && !p2.includes('જીવન')) {
      p2 = `આ સિદ્ધાંતને આપણા રોજિંદા જીવન સાથે સરખાવીએ તો, ${p2}`;
    }

    return { paragraph1: p1, paragraph2: p2 };
  }, [presentation]);

  // Full clean speech text strictly following user's structure:
  // 1. Sambodhan
  // 2. Topic
  // 3. 1-2 Paragraphs containing all info and everyday life examples
  // 4. Closing
  const fullSpeechText = useMemo(() => {
    if (!presentation) return '';
    const isPrayer = String(presentation.environment).includes('પ્રાર્થના') || String(presentation.environment).includes('સભા');
    
    const defaultOpening = isPrayer
      ? 'માનનીય આચાર્યશ્રી, વંદનીય ગુરુજનો અને મારા વહાલા વિદ્યાર્થી મિત્રો, સૌને મારા સાદર પ્રણામ.'
      : 'આદરણીય શિક્ષકશ્રી અને મારા વહાલા સહપાઠી મિત્રો, સૌને મારા નમસ્કાર.';

    const opening = presentation.openingSpeech || defaultOpening;
    const topicIntro = `આજે હું આપ સૌની સમક્ષ ${presentation.standard || `ધોરણ ${selectedStandard}`} ના ${presentation.subject || currentSubject.name} વિષયના મહત્વના ટોપિક "${presentation.title}" વિશે સરળ રજૂઆત કરવા જઈ રહ્યો/રહી છું.`;
    const closing = presentation.closingSpeech || 'મારી આ રજૂઆત શાંતિપૂર્વક સાંભળવા બદલ આપ સૌનો ખૂબ ખૂબ આભાર. અસ્તુ, જય હિન્દ!';

    return `🎤 વિદ્યાર્થી વક્તવ્ય પ્રસ્તુતિ\nશાળા: ${schoolName || 'શ્રી વિદ્યાલય'}\nધોરણ: ${presentation.standard} | વિષય: ${presentation.subject}\nટોપિક: ${presentation.title}\nસ્થળ: ${presentation.environment || 'પ્રાર્થના સભા'}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n૧. સંબોધન:\n"${opening}"\n\n૨. વિષય રજૂઆત:\n${topicIntro}\n\n૩. વિગતવાર સરળ સમજૂતી (૧-૨ ફકરામાં):\n${paragraph1}\n\n${paragraph2}\n\n૪. સમાપન:\n"${closing}"`;
  }, [presentation, paragraph1, paragraph2, schoolName, selectedStandard, currentSubject]);

  // Copy full clean spoken speech
  const handleCopyScript = () => {
    if (!fullSpeechText) return;
    navigator.clipboard?.writeText(fullSpeechText);
    setCopied(true);
    setFeedbackMessage('✅ વક્તવ્ય સ્ક્રિપ્ટ કોપી થઈ ગઈ છે!');
    setTimeout(() => {
      setCopied(false);
      setFeedbackMessage(null);
    }, 3000);
  };

  // Direct 1-Page PDF Download to Device Downloads Folder
  const handleDownloadPdf = async () => {
    if (!presentation || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setFeedbackMessage('વક્તવ્ય PDF ડાઉનલોડ થઈ રહી છે...');

    try {
      await downloadPresentationAsPdf(
        {
          title: presentation.title,
          standard: presentation.standard || `ધોરણ ${selectedStandard}`,
          subject: presentation.subject || currentSubject.name,
          environment: presentation.environment || environment,
          studentName: studentName || 'વિદ્યાર્થી',
          openingSpeech: presentation.openingSpeech,
          topicIntroduction: presentation.topicIntroduction,
          paragraph1,
          paragraph2,
          closingSpeech: presentation.closingSpeech,
        },
        {
          schoolName: schoolName || 'શ્રી વિદ્યાલય',
          diseCode,
          district,
        }
      );
      setFeedbackMessage('✅ વક્તવ્ય PDF સફળતાપૂર્વક ડિવાઇસના Downloads ફોલ્ડરમાં સેવ થઈ ગઈ!');
    } catch (err) {
      console.error('PDF download error:', err);
      setFeedbackMessage('PDF ડાઉનલોડ કરવામાં સમસ્યા આવી.');
    } finally {
      setIsDownloadingPdf(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // WhatsApp Share as PDF
  const handleShareWhatsApp = async () => {
    if (!presentation || isSharingPdf) return;
    setIsSharingPdf(true);
    setFeedbackMessage('WhatsApp શેરિંગ તૈયાર થઈ રહ્યું છે...');

    try {
      await sharePresentationAsPdf(
        {
          title: presentation.title,
          standard: presentation.standard || `ધોરણ ${selectedStandard}`,
          subject: presentation.subject || currentSubject.name,
          environment: presentation.environment || environment,
          studentName: studentName || 'વિદ્યાર્થી',
          openingSpeech: presentation.openingSpeech,
          topicIntroduction: presentation.topicIntroduction,
          paragraph1,
          paragraph2,
          closingSpeech: presentation.closingSpeech,
        },
        {
          schoolName: schoolName || 'શ્રી વિદ્યાલય',
          diseCode,
          district,
        }
      );
      setFeedbackMessage('✅ WhatsApp પર PDF મોકલવામાં આવી!');
    } catch (err) {
      console.error('PDF share error:', err);
      setFeedbackMessage('WhatsApp શેર કરવામાં સમસ્યા આવી.');
    } finally {
      setIsSharingPdf(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Print 1-Page Presentation Slip
  const handlePrint = () => {
    if (!presentation) return;
    const isPrayer = String(presentation.environment).includes('પ્રાર્થના') || String(presentation.environment).includes('સભા');
    const opening = presentation.openingSpeech || (isPrayer ? 'માનનીય આચાર્યશ્રી, વંદનીય ગુરુજનો અને મારા વહાલા વિદ્યાર્થી મિત્રો, સૌને મારા સાદર પ્રણામ.' : 'આદરણીય શિક્ષકશ્રી અને મારા વહાલા સહપાઠી મિત્રો, સૌને મારા નમસ્કાર.');
    const closing = presentation.closingSpeech || 'મારી આ રજૂઆત શાંતિપૂર્વક સાંભળવા બદલ આપ સૌનો ખૂબ ખૂબ આભાર. અસ્તુ, જય હિન્દ!';

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${presentation.title} - વક્તવ્ય સ્લિપ</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Anek Gujarati', 'Noto Sans Gujarati', sans-serif; color: #0f172a; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 12px; }
          .title-box { background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
          .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; }
          .card-title { font-size: 13px; font-weight: bold; color: #047857; margin-bottom: 4px; }
          .para { margin-bottom: 10px; text-align: justify; font-size: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin:0; font-size: 22px; color: #065f46;">${schoolName || 'શ્રી વિદ્યાલય'}</h1>
          <p style="margin:4px 0 0; font-size: 13px; color: #64748b;">વિદ્યાર્થી વક્તવ્ય પ્રસ્તુતિ સ્લિપ</p>
        </div>
        <div class="title-box">
          <h2 style="margin:0; font-size: 18px; color: #065f46;">📌 વિષય: ${presentation.title}</h2>
          <div style="font-size: 13px; color: #047857; margin-top: 4px;">
            ધોરણ: ${presentation.standard} • વિષય: ${presentation.subject} • સ્થળ: ${presentation.environment}
          </div>
        </div>
        <div class="card" style="background: #f8fafc;">
          <div class="card-title">૧. આદરપૂર્વક સંબોધન:</div>
          <p style="margin:0; font-size: 15px; font-weight: bold;">"${opening}"</p>
        </div>
        <div class="card">
          <div class="card-title">૨. સરળ વિષય સમજૂતી (૧-૨ ફકરામાં):</div>
          <div class="para">${paragraph1}</div>
          <div class="para">${paragraph2}</div>
        </div>
        <div class="card" style="background: #f0fdf4;">
          <div class="card-title">૩. સમાપન:</div>
          <p style="margin:0; font-size: 15px; font-weight: bold; color: #166534;">"${closing}"</p>
        </div>
      </body>
      </html>
    `;
    printHtmlDocument(html, `${presentation.title}_Speech_Slip`);
  };

  const textSizeClass =
    fontSize === 'sm'
      ? 'text-xs sm:text-sm leading-relaxed'
      : fontSize === 'lg'
      ? 'text-base sm:text-lg leading-loose'
      : 'text-sm sm:text-base leading-relaxed';

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-950 dark:from-[#0d1f18] dark:via-[#112920] dark:to-[#08140f] border border-emerald-700/40 dark:border-emerald-500/20 p-5 sm:p-7 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 flex items-center gap-1.5 shadow-sm">
                <Presentation className="w-3.5 h-3.5 text-emerald-400" />
                ટૂંકી અને સરળ વિદ્યાર્થી પ્રસ્તુતિ (Short Presentation)
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/10 text-white/90 border border-white/20 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-300" />
                ૧-૨ ફકરામાં સચોટ મુદ્દો
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              શાળા દૈનિક વક્તવ્ય & રજૂઆત સ્ક્રિપ્ટ
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-200/90">
              <span>સંબોધન • ટોપિક • ૧-૨ ફકરામાં સરળ માહિતી • રોજિંદા જીવન સાથે ઉદાહરણ • સમાપન</span>
            </div>
          </div>

          {/* Quick Stats or Environment indicator */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-3 backdrop-blur-md self-start md:self-auto text-xs space-y-1">
            <div className="text-emerald-300 font-bold">🎯 મુખ્ય વિશેષતા:</div>
            <div className="text-white/90 leading-snug">વિદ્યાર્થી સ્ટેજ પર કોઈપણ જટિલતા વગર સરળતાથી રજૂ કરી શકે તેવું સહજ લખાણ.</div>
          </div>
        </div>
      </div>

      {/* Control & Selector Panel */}
      <div className="bg-white dark:bg-[#121921] border border-[#E2E8F0] dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 text-slate-800 dark:text-[#e4ded6]">
        {/* 1. Standards Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>ધોરણ પસંદ કરો (Select Standard):</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GSEB_STANDARDS.map((std) => (
              <button
                key={std.value}
                type="button"
                onClick={() => handleStandardChange(std.value)}
                className={`p-2.5 rounded-2xl border text-center font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  selectedStandard === std.value
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-900/20'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                {std.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Subjects Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/30'
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
                  આચાર્યશ્રી, શિક્ષકો અને સમગ્ર શાળા સામે સ્ટેજ પર રજૂઆત.
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
                  વિષય શિક્ષક અને વર્ગના સહપાઠી મિત્રો સમક્ષ રજૂઆત.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 4. Suggested Chapter Topics */}
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
                placeholder="દા.ત. ન્યૂટનનો ગતિનો નિયમ, ટિંડલ અસર, આર્કીમીડીઝનો સિદ્ધાંત..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerate();
                }}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {topicError && (
              <p className="text-xs text-rose-500 font-bold mt-1">{topicError}</p>
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
            <span>૧-૨ ફકરામાં રોજિંદા જીવનના ઉદાહરણ સાથે ટૂંકું લખાણ તૈયાર થશે.</span>
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
                <span>ટૂંકી વક્તવ્ય સ્ક્રિપ્ટ બનાવો</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* User Feedback Toast */}
      {feedbackMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center animate-fadeIn">
          {feedbackMessage}
        </div>
      )}

      {/* Generated Short Presentation Card */}
      {presentation && (
        <div className="bg-white dark:bg-[#0c1218] border border-[#E2E8F0] dark:border-white/10 rounded-3xl p-5 sm:p-7 shadow-md space-y-6">
          {/* Card Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {presentation.standard || `ધોરણ ${selectedStandard}`}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  {presentation.subject || currentSubject.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {presentation.environment === 'પ્રાર્થના સંમેલન / સભા' ? '🏛️ પ્રાર્થના સભા' : '🏫 વર્ગખંડ'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  ⏱️ ૧-૨ ફકરા (ટૂંકી સ્ક્રિપ્ટ)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                {presentation.title}
              </h2>
            </div>

            {/* Action Buttons: Direct PDF Download, WhatsApp Share, Copy, Print */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Direct PDF Download Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                title="આ વક્તવ્યની 1-Page PDF ફાઇલ સીધી ડિવાઇસના Downloads ફોલ્ડરમાં સાચવો"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ડાઉનલોડ...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>PDF ડાઉનલોડ</span>
                  </>
                )}
              </button>

              {/* WhatsApp Share PDF Button */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={isSharingPdf}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                title="આ વક્તવ્યની PDF વોટ્સએપ પર મોકલો"
              >
                {isSharingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>શેરિંગ...</span>
                  </>
                ) : (
                  <>
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>WhatsApp શેર</span>
                  </>
                )}
              </button>

              {/* Copy Script Button */}
              <button
                type="button"
                onClick={handleCopyScript}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200'
                }`}
                title="સંપૂર્ણ સ્ક્રિપ્ટ કોપી કરો"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'કોપી થયું!' : 'કોપી'}</span>
              </button>

              {/* Print Script Slip Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="A4 વક્તવ્ય સ્લિપ પ્રિન્ટ કરો"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Font Size Adjuster */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/5 pb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              વિદ્યાર્થી આ સ્ક્રિપ્ટ સરળતાથી સ્ટેજ પર બોલી શકે છે.
            </span>
            <div className="flex items-center gap-1">
              <span>ફોન્ટ:</span>
              <button
                type="button"
                onClick={() => setFontSize('sm')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${fontSize === 'sm' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-white/10'}`}
              >
                નાના
              </button>
              <button
                type="button"
                onClick={() => setFontSize('md')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${fontSize === 'md' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-white/10'}`}
              >
                મધ્યમ
              </button>
              <button
                type="button"
                onClick={() => setFontSize('lg')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${fontSize === 'lg' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-white/10'}`}
              >
                મોટા
              </button>
            </div>
          </div>

          {/* EXACT SHORT STRUCTURE:
              1. સંબોધન (Opening Salutation)
              2. ટોપિક પરિચય (Topic Announcement)
              3. ૧ કે ૨ ફકરામાં સરળ માહિતી (રોજિંદા જીવન સાથે સરખામણી & ઉદાહરણ સહિત)
              4. સમાપન (Closing)
          */}
          <div className="space-y-4">
            {/* Step 1: સંબોધન (Opening Salutation) */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 sm:p-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs uppercase tracking-wider">
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  <span>૧. આદરપૂર્વક સંબોધન (Opening Speech)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  આશરે ૨૦ સેકન્ડ
                </span>
              </div>
              <p className={`font-bold text-slate-900 dark:text-emerald-100 ${textSizeClass}`}>
                "{presentation.openingSpeech || (String(presentation.environment).includes('પ્રાર્થના') ? 'માનનીય આચાર્યશ્રી, વંદનીય ગુરુજનો અને મારા વહાલા વિદ્યાર્થી મિત્રો, સૌને મારા સાદર પ્રણામ.' : 'આદરણીય શિક્ષકશ્રી અને મારા વહાલા સહપાઠી મિત્રો, સૌને મારા નમસ્કાર.')}"
              </p>
            </div>

            {/* Step 2: ટોપિક પરિચય (Topic Announcement) */}
            <div className="bg-blue-50/80 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-4 sm:p-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-extrabold text-xs uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>૨. વિષય રજૂઆત (Topic Announcement)</span>
                </div>
              </div>
              <p className={`font-semibold text-slate-800 dark:text-blue-100 ${textSizeClass}`}>
                "આજે હું આપ સૌની સમક્ષ {presentation.standard || `ધોરણ ${selectedStandard}`} ના {presentation.subject || currentSubject.name} વિષયના અત્યંત મહત્વના અને રોચક ટોપિક <strong className="text-blue-900 dark:text-white underline">"{presentation.title}"</strong> વિશે ટૂંકી અને સરળ રજૂઆત કરવા જઈ રહ્યો/રહી છું."
              </p>
            </div>

            {/* Step 3: ૧ કે ૨ ફકરામાં સંપૂર્ણ માહિતી (સાથે રોજિંદા જીવન સાથેનું સરખામણીભર્યું ઉદાહરણ) */}
            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-xs uppercase tracking-wider">
                  <Presentation className="w-4 h-4 text-emerald-600" />
                  <span>૩. વિષયની સરળ સમજૂતી & રોજિંદા જીવનનું વાસ્તવિક ઉદાહરણ (૧-૨ ફકરામાં)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  આશરે ૧ થી ૨ મિનિટ
                </span>
              </div>

              {/* Paragraph 1: Core Concept / Theory */}
              {paragraph1 && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-2xs space-y-1">
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    મુખ્ય સિદ્ધાંત / પાઠ્યપુસ્તક સમજૂતી:
                  </div>
                  <p className={`text-slate-800 dark:text-slate-200 font-medium ${textSizeClass}`}>
                    {paragraph1}
                  </p>
                </div>
              )}

              {/* Paragraph 2: Real-Life Comparison & Application */}
              {paragraph2 && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 shadow-2xs space-y-1">
                  <div className="text-[11px] font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    <span>રોજિંદા જીવન સાથે જોડાણ & ઉદાહરણ:</span>
                  </div>
                  <p className={`text-slate-800 dark:text-amber-100 font-medium whitespace-pre-line ${textSizeClass}`}>
                    {paragraph2}
                  </p>
                </div>
              )}
            </div>

            {/* Step 4: સમાપન & આભારવિધિ (Closing Salutation) */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 sm:p-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs uppercase tracking-wider">
                  <span>૪. સમાપન & આભાર દર્શન (Closing Salutation)</span>
                </div>
              </div>
              <p className={`font-bold text-emerald-900 dark:text-emerald-200 ${textSizeClass}`}>
                "{presentation.closingSpeech || 'આમ, આ ટોપિક આપણને રોજિંદા જીવનમાં પણ ખૂબ ઉપયોગી છે. મારી આ રજૂઆત શાંતિપૂર્વક અને સ્નેહપૂર્વક સાંભળવા બદલ આપ સૌનો હૃદયપૂર્વક આભાર વ્યક્ત કરું છું. અસ્તુ, ભારત માતા કી જય! જય હિન્દ!'}"
              </p>
            </div>
          </div>

          {/* Quick Print / Download Bottom Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10 flex-wrap gap-2 text-xs text-slate-500">
            <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • સરળ, સચોટ અને GSEB પાઠ્યપુસ્તક આધારિત રજૂઆત</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF સ્લિપ ડાઉનલોડ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
