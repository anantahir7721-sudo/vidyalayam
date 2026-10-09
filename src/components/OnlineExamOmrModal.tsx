import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileCheck2,
  FileText,
  Users,
  User,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Download,
  Sparkles,
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
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[92vh] bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-[#e4ded6]">
        
        {/* Top Header */}
        <div className="shrink-0 p-3 sm:p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  📄 OMR ઉત્તરવહી ડાઉનલોડ અને પ્રિન્ટ (OMR Answer Sheet)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  {exam.title}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ધોરણ: {exam.standard} • પ્રશ્નો: {questions.length} • કુલ વિદ્યાર્થીઓ: {attempts.length} • ૧ પેજ પર ૧ વિદ્યાર્થીની શીટ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={attempts.length === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-40"
              title="પ્રિન્ટર પર પ્રિન્ટ કાઢો અથવા PDF તરીકે સેવ કરો"
            >
              <Printer className="w-4 h-4" />
              <span>પ્રિન્ટ / PDF ડાઉનલોડ ({targetCount})</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Control Bar: Mode Toggle & Student Selector */}
        <div className="shrink-0 p-3 sm:px-4 bg-slate-100/90 dark:bg-slate-900/60 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 hidden sm:inline">પ્રકાર:</span>
            <div className="flex rounded-xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-white/10">
              <button
                type="button"
                onClick={() => setMode('checked')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'checked'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>તપાસેલ OMR શીટ (Checked)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('unchecked')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'unchecked'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>અનચેક્ડ OMR શીટ (Unchecked)</span>
              </button>
            </div>
          </div>

          {/* Student Selector */}
          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <span className="font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">વિદ્યાર્થી:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full max-w-[280px] px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">
                👥 બધા વિદ્યાર્થીઓ ({attempts.length}) — પ્રત્યેક ૧ પેજ
              </option>
              {attempts.map((at, idx) => (
                <option key={at.id} value={at.id}>
                  {idx + 1}. {at.studentName} (રોલ: {at.rollNumber || '-'}, ગુણ: {at.score}/{exam.totalMarks})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode Feature Explanation Banner */}
        <div className="shrink-0 px-4 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            {mode === 'checked' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span>
                  <strong>તપાસેલ OMR શીટ (Checked):</strong> દરેક પ્રશ્નમાં સાચા (✓) / ખોટા (✗) માર્ક્સ, ખોટા પ્રશ્નમાં સાચો જવાબ, કુલ ગુણ, મેળવેલ ગુણ અને ટકાવારી લખેલા રહેશે.
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                <span>
                  <strong>અનચેક્ડ OMR શીટ (Unchecked):</strong> માત્ર વિદ્યાર્થીએ પસંદ કરેલા જવાબો જ OMR વર્તુળમાં ભરેલા દેખાશે. મૂલ્યાંકન ખાનું ખાલી રહેશે.
                </span>
              </>
            )}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 hidden md:inline">
            A4 સાઇઝ પર 1 પેજ પ્રતિ વિદ્યાર્થી સેટ થયેલ છે
          </span>
        </div>

        {/* Live Interactive Preview Container */}
        <div className="flex-1 overflow-hidden relative bg-slate-200/70 dark:bg-[#0b0f14] p-2 sm:p-4 flex items-center justify-center">
          {attempts.length === 0 ? (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 max-w-md">
              <HelpCircle className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">કોઈ પ્રયત્ન નોંધાયો નથી</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                હજુ સુધી કોઈ વિદ્યાર્થીએ આ ઓનલાઇન કસોટી સબમિટ કરી નથી.
              </p>
            </div>
          ) : (
            <div className="w-full h-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden border border-slate-300 dark:border-white/10">
              <iframe
                title="OMR Answer Sheet Preview"
                srcDoc={htmlContent}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          )}
        </div>

        {/* Bottom Bar Info & Action */}
        <div className="shrink-0 p-3 sm:px-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              પ્રિન્ટ ડાયલોગમાં <strong>"Destination"</strong> માં <strong>"Save as PDF"</strong> પસંદ કરીને PDF ફાઈલ પણ ડાઉનલોડ કરી શકાય છે.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={attempts.length === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
              <span>પ્રિન્ટ / PDF ડાઉનલોડ ({targetCount})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
