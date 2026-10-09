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
} from 'lucide-react';
import { OnlineExam, MCQQuestion, School } from '../types';
import { generateQuestionPaperHtml, QuestionPaperMode } from '../utils/questionPaperUtils';
import { printHtmlDocument } from '../utils/printAndPdfUtils';

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
  const [mode, setMode] = useState<QuestionPaperMode>(initialMode);

  React.useEffect(() => {
    if (isOpen && initialMode) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const htmlContent = useMemo(() => {
    return generateQuestionPaperHtml({
      exam,
      questions,
      school,
      mode,
    });
  }, [exam, questions, school, mode]);

  const handlePrint = () => {
    const modeLabel = mode === 'with_answers' ? 'Answer_Key' : 'Question_Paper';
    const jobTitle = `${exam.title.replace(/\s+/g, '_')}_${modeLabel}`;
    printHtmlDocument(htmlContent, jobTitle);
  };

  const handleDownloadHtml = () => {
    const modeLabel = mode === 'with_answers' ? 'Answer_Key' : 'Question_Paper';
    const filename = `${exam.title.replace(/\s+/g, '_')}_${modeLabel}.html`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-1 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[96dvh] sm:h-[92dvh] bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-[#e4ded6]">
        
        {/* Top Header: Mobile Friendly */}
        <div className="shrink-0 px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                <FileQuestion className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  📝 પ્રશ્નપત્ર ડાઉનલોડ & પ્રિન્ટ
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  {exam.title} • ધોરણ {exam.standard} • {questions.length} પ્રશ્નો • કુલ ગુણ: {exam.totalMarks}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
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

        {/* Controls Bar: Mode Toggle */}
        <div className="shrink-0 p-2 sm:p-3 bg-slate-100/95 dark:bg-slate-900/70 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-white/10 w-full sm:w-auto">
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

          <div className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400">
            {mode === 'without_answers' ? (
              <span>📝 વિદ્યાર્થીઓ માટે પરીક્ષા આપવા હેતુ બ્લેન્ક પ્રશ્નપત્ર</span>
            ) : (
              <span>🔑 શિક્ષક અને મૂલ્યાંકન માટે સાચા જવાબો ટીક કરેલ ઉત્તરવહી</span>
            )}
          </div>
        </div>

        {/* Live Interactive Preview Container: Fully Scrollable on Touch */}
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
              પ્રિન્ટ ડાયલોગમાં <strong>"Save as PDF"</strong> પસંદ કરીને PDF ડાઉનલોડ કરી શકાય છે.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
              title="HTML ફાઇલ ડાઉનલોડ કરો"
            >
              <Download className="w-3.5 h-3.5" />
              <span>HTML ડાઉનલોડ</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-950/20 text-xs sm:text-sm"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>પ્રિન્ટ / PDF ડાઉનલોડ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
