import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileQuestion,
  FileText,
  KeyRound,
  Eye,
  Sparkles,
  Download,
  Calendar,
  Layers,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { OnlineExam, MCQQuestion, School } from '../types';
import {
  generateQuestionPaperHtml,
  QuestionPaperMode,
  QuestionPaperDensity,
} from '../utils/questionPaperUtils';
import { printHtmlDocument } from '../utils/printAndPdfUtils';
import { PrintDatePromptModal } from './PrintDatePromptModal';

interface OnlineExamQuestionPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: OnlineExam;
  questions: MCQQuestion[];
  school?: School;
  initialMode?: QuestionPaperMode;
}

export const OnlineExamQuestionPaperModal: React.FC<OnlineExamQuestionPaperModalProps> = ({
  isOpen,
  onClose,
  exam,
  questions,
  school,
  initialMode = 'without_answers',
}) => {
  // Helper to format today's date
  const getTodayFormatted = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const [mode, setMode] = useState<QuestionPaperMode>(initialMode);
  const [layoutDensity, setLayoutDensity] = useState<QuestionPaperDensity>('board_compact');
  const [customPrintDate, setCustomPrintDate] = useState<string>(() => {
    return exam.scheduledDate || getTodayFormatted();
  });

  // Prompt modal state for explicit confirmation before downloading
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'print' | 'html'>('print');

  React.useEffect(() => {
    if (isOpen) {
      if (initialMode) setMode(initialMode);
      setCustomPrintDate(exam.scheduledDate || getTodayFormatted());
    }
  }, [isOpen, initialMode, exam.scheduledDate]);

  const htmlContent = useMemo(() => {
    return generateQuestionPaperHtml({
      exam,
      questions,
      school,
      mode,
      customPrintDate,
      layoutDensity,
    });
  }, [exam, questions, school, mode, customPrintDate, layoutDensity]);

  const executePrint = (dateToUse?: string) => {
    const activeDate = dateToUse || customPrintDate;
    const modeLabel = mode === 'with_answers' ? 'Answer_Key' : 'Question_Paper';
    const cleanDate = activeDate.replace(/[^a-zA-Z0-9]/g, '_');
    const jobTitle = `${exam.title.replace(/\s+/g, '_')}_${modeLabel}_${cleanDate}`;
    
    // Regenerate with specific date if changed in prompt
    const finalHtml = generateQuestionPaperHtml({
      exam,
      questions,
      school,
      mode,
      customPrintDate: activeDate,
      layoutDensity,
    });
    printHtmlDocument(finalHtml, jobTitle);
  };

  const executeDownloadHtml = (dateToUse?: string) => {
    const activeDate = dateToUse || customPrintDate;
    const modeLabel = mode === 'with_answers' ? 'Answer_Key' : 'Question_Paper';
    const cleanDate = activeDate.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${exam.title.replace(/\s+/g, '_')}_${modeLabel}_${cleanDate}.html`;
    
    const finalHtml = generateQuestionPaperHtml({
      exam,
      questions,
      school,
      mode,
      customPrintDate: activeDate,
      layoutDensity,
    });
    const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRequestPrint = () => {
    setPendingAction('print');
    setIsPromptOpen(true);
  };

  const handleRequestDownloadHtml = () => {
    setPendingAction('html');
    setIsPromptOpen(true);
  };

  const handlePromptConfirm = (confirmedDate: string) => {
    setCustomPrintDate(confirmedDate);
    if (pendingAction === 'print') {
      executePrint(confirmedDate);
    } else {
      executeDownloadHtml(confirmedDate);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-1 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[96dvh] sm:h-[92dvh] bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-[#e4ded6]">
        
        {/* Top Header */}
        <div className="shrink-0 px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                <FileQuestion className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  📝 પ્રશ્નપત્ર ડાઉનલોડ & પ્રિન્ટ (Board Exam Paper)
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  {exam.title} • ધોરણ {exam.standard} • {questions.length} પ્રશ્નો • કુલ ગુણ: {exam.totalMarks}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleRequestPrint}
                className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold items-center gap-1.5 shadow-md shadow-amber-950/20 cursor-pointer transition-all"
                title="પ્રશ્નપત્ર પ્રિન્ટ કરો અથવા PDF સેવ કરો"
              >
                <Printer className="w-4 h-4" />
                <span>પ્રિન્ટ / PDF ડાઉનલોડ</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="બંધ કરો"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Controls Bar: Mode Toggle + Custom Print Date + 2-Column Density Selector */}
        <div className="shrink-0 p-2 sm:p-3 bg-slate-100/95 dark:bg-slate-900/70 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setMode('without_answers')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer text-xs ${
                mode === 'without_answers'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">જવાબ વિના (બ્લેન્ક પેપર)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('with_answers')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer text-xs ${
                mode === 'with_answers'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">જવાબ સાથે (Answer Key)</span>
            </button>
          </div>

          {/* Density Selector (~25 questions per page) */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setLayoutDensity('board_compact')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer text-xs ${
                layoutDensity === 'board_compact'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="૨-કૉલમ રિયલ બોર્ડ પેપર સ્ટાઇલ: ૧ પેજમાં ~૨૫ પ્રશ્નો સમાવેશ"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>બોર્ડ સ્ટાઇલ (~૨૫/પેજ)</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutDensity('standard')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer text-xs ${
                layoutDensity === 'standard'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>૧-કૉલમ સ્ટાન્ડર્ડ</span>
            </button>
          </div>

          {/* Custom Print Date Input */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-300 dark:border-white/10 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 shrink-0">પેપર તારીખ:</span>
            <input
              type="text"
              value={customPrintDate}
              onChange={(e) => setCustomPrintDate(e.target.value)}
              placeholder="તારીખ દાખલ કરો"
              className="w-24 sm:w-28 px-1.5 py-0.5 text-xs font-bold font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 rounded border border-slate-300 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={() => setCustomPrintDate(getTodayFormatted())}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="આજની તારીખ સેટ કરો"
            >
              આજ
            </button>
          </div>

        </div>

        {/* Live Interactive Preview Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain relative bg-slate-200/80 dark:bg-[#0b0f14] p-1.5 sm:p-4 flex flex-col items-center">
          <div className="w-full max-w-4xl min-h-[600px] h-full bg-white rounded-xl shadow-xl overflow-hidden border border-slate-300 dark:border-white/10 flex flex-col">
            <iframe
              title="Question Paper Preview"
              srcDoc={htmlContent}
              className="w-full h-full min-h-[600px] border-0 bg-white"
            />
          </div>
        </div>

        {/* Mobile & Desktop Bottom Bar */}
        <div className="shrink-0 p-2.5 sm:p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">
              પેપર પર તારીખ <strong>"{customPrintDate}"</strong> છપાશે. <strong>"Save as PDF"</strong> થી ડાઉનલોડ કરી શકાય છે.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRequestDownloadHtml}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
              title="HTML ફાઇલ ડાઉનલોડ કરો"
            >
              <Download className="w-3.5 h-3.5" />
              <span>HTML ડાઉનલોડ</span>
            </button>

            <button
              type="button"
              onClick={handleRequestPrint}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-950/20 text-xs sm:text-sm"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>પ્રિન્ટ / PDF ડાઉનલોડ</span>
            </button>
          </div>
        </div>

      </div>

      {/* Date Confirmation Prompt Modal */}
      <PrintDatePromptModal
        isOpen={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        title="પ્રશ્નપત્ર પર છાપવાની તારીખ"
        subtitle="તમે જે તારીખ અહીં નક્કી કરશો તે જ પ્રશ્નપત્રના હેડરમાં છપાશે."
        initialDate={customPrintDate}
        examScheduledDate={exam.scheduledDate}
        onConfirm={handlePromptConfirm}
        actionType={pendingAction === 'print' ? 'print' : 'download'}
      />
    </div>
  );
};
