import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileCheck2,
  FileText,
  Users,
  Eye,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Download,
} from 'lucide-react';
import { OnlineExam, MCQQuestion, ExamAttempt, School } from '../types';
import { generateOmrSheetHtml, OmrSheetMode } from '../utils/omrSheetUtils';
import { printHtmlDocument } from '../utils/printAndPdfUtils';

interface OnlineExamOmrModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: OnlineExam;
  questions: MCQQuestion[];
  attempts: ExamAttempt[];
  school?: School;
  initialStudentId?: string;
  initialMode?: OmrSheetMode;
}

export const OnlineExamOmrModal: React.FC<OnlineExamOmrModalProps> = ({
  isOpen,
  onClose,
  exam,
  questions,
  attempts,
  school,
  initialStudentId = 'ALL',
  initialMode = 'checked',
}) => {
  const [mode, setMode] = useState<OmrSheetMode>(initialMode);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);

  // Sync initial student or mode when modal opens or initial props change
  React.useEffect(() => {
    if (isOpen) {
      if (initialStudentId) setSelectedStudentId(initialStudentId);
      if (initialMode) setMode(initialMode);
    }
  }, [isOpen, initialStudentId, initialMode]);

  // Generate the current HTML string for preview and printing
  const htmlContent = useMemo(() => {
    return generateOmrSheetHtml({
      exam,
      questions,
      attempts,
      school,
      mode,
      selectedAttemptId: selectedStudentId,
    });
  }, [exam, questions, attempts, school, mode, selectedStudentId]);

  const targetCount =
    selectedStudentId === 'ALL'
      ? attempts.length
      : attempts.filter((a) => a.id === selectedStudentId).length;

  const currentStudentName = useMemo(() => {
    if (selectedStudentId === 'ALL') return 'બધા વિદ્યાર્થીઓ';
    const found = attempts.find((a) => a.id === selectedStudentId);
    return found?.studentName || 'પસંદ કરેલ વિદ્યાર્થી';
  }, [selectedStudentId, attempts]);

  const handlePrint = () => {
    const modeLabel = mode === 'checked' ? 'Checked_OMR' : 'Unchecked_OMR';
    const studentLabel =
      selectedStudentId === 'ALL'
        ? 'All_Students'
        : currentStudentName.replace(/\s+/g, '_');
    const jobTitle = `${exam.title.replace(/\s+/g, '_')}_${modeLabel}_${studentLabel}`;
    printHtmlDocument(htmlContent, jobTitle);
  };

  const handleDownloadHtml = () => {
    const modeLabel = mode === 'checked' ? 'Checked_OMR' : 'Unchecked_OMR';
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-1 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[96dvh] sm:h-[92dvh] bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-[#e4ded6]">
        
        {/* Top Header: Fully Mobile Optimized with high tap targets */}
        <div className="shrink-0 px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                  <span>📄 OMR ઉત્તરવહી ડાઉનલોડ & પ્રિન્ટ</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  {exam.title} • ધોરણ {exam.standard} • {questions.length} પ્રશ્નો • ૧ પેજ/વિદ્યાર્થી
                </p>
              </div>
            </div>

            {/* Quick Action & Close Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                disabled={attempts.length === 0}
                className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-40 transition-all shrink-0"
                title="પ્રિન્ટર પર પ્રિન્ટ કાઢો અથવા PDF તરીકે સેવ કરો"
              >
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">પ્રિન્ટ / PDF</span>
                <span className="text-[10px] sm:text-xs">({targetCount})</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
                title="બંધ કરો"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Control Bar: Mode Toggle & Student Selector - Stacked cleanly on mobile */}
        <div className="shrink-0 p-2 sm:p-3 bg-slate-100/95 dark:bg-slate-900/70 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          
          {/* Mode Segmented Switch */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-white/10 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMode('checked')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer text-xs ${
                mode === 'checked'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">તપાસેલ (Checked)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('unchecked')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer text-xs ${
                mode === 'unchecked'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">અનચેક્ડ (Unchecked)</span>
            </button>
          </div>

          {/* Student Selector Dropdown */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap text-[11px] sm:text-xs shrink-0">વિદ્યાર્થી:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="flex-1 sm:w-64 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer truncate"
            >
              <option value="ALL">
                👥 બધા વિદ્યાર્થીઓ ({attempts.length}) — પ્રત્યેક ૧ પેજ
              </option>
              {attempts.map((at, idx) => (
                <option key={at.id} value={at.id}>
                  {idx + 1}. {at.studentName} (ગુણ: {at.score}/{exam.totalMarks})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Compact Mode Tip */}
        <div className="shrink-0 px-3 py-1 sm:py-1.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <span className={`w-2 h-2 rounded-full shrink-0 ${mode === 'checked' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
            <span className="truncate">
              {mode === 'checked'
                ? 'તપાસેલ: સાચા (✓) / ખોટા (✗) માર્ક્સ, સાચો જવાબ અને મેળવેલ ગુણ દર્શાવશે.'
                : 'અનચેક્ડ: માત્ર વિદ્યાર્થીએ ભરેલા જવાબો દેખાશે.'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 hidden md:inline ml-2">
            A4 સાઇઝ પર 1 પેજ પ્રતિ વિદ્યાર્થી
          </span>
        </div>

        {/* Live Interactive Preview Container: Fully Scrollable on Touch */}
        <div className="flex-1 overflow-y-auto overscroll-contain relative bg-slate-200/80 dark:bg-[#0b0f14] p-1.5 sm:p-4 flex flex-col items-center">
          {attempts.length === 0 ? (
            <div className="my-auto text-center p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 max-w-md shadow-sm">
              <HelpCircle className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">કોઈ પ્રયત્ન નોંધાયો નથી</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                હજુ સુધી કોઈ વિદ્યાર્થીએ આ ઓનલાઇન કસોટી સબમિટ કરી નથી.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-4xl h-full min-h-[320px] sm:min-h-[500px] bg-white rounded-xl shadow-xl overflow-hidden border border-slate-300 dark:border-white/10 flex flex-col">
              <iframe
                title="OMR Answer Sheet Preview"
                srcDoc={htmlContent}
                className="w-full h-full min-h-[320px] sm:min-h-[500px] border-0 bg-white"
              />
            </div>
          )}
        </div>

        {/* Mobile & Desktop Bottom Bar: Always Visible, Never Cut Off */}
        <div className="shrink-0 p-2 sm:p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/95 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">
              પ્રિન્ટ ડાયલોગમાં <strong>"Destination"</strong> માં <strong>"Save as PDF"</strong> રાખીને PDF સેવ કરી શકો છો.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs shrink-0"
              title="HTML ફાઇલ ડાઉનલોડ કરો"
            >
              <Download className="w-3.5 h-3.5" />
              <span>HTML ડાઉનલોડ</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={attempts.length === 0}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 shadow-md shadow-indigo-600/30 text-xs sm:text-sm shrink-0"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>પ્રિન્ટ / PDF ({targetCount})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
