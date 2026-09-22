import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  X,
  Eye,
  Check,
  HelpCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { MCQQuestion } from '../types';
import { extractQuestionsWithAI } from '../services/onlineExamService';

interface AiQuestionImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (questions: MCQQuestion[]) => void;
  standard: string;
  subject: string;
}

// Client-side image compression for mobile camera photos
async function optimizeImageForAi(file: File): Promise<{ base64: string; mimeType: string }> {
  if (file.type === 'application/pdf') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result as string, mimeType: file.type });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 1800;
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ base64: e.target?.result as string, mimeType: file.type });
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({ base64: compressedDataUrl, mimeType: 'image/jpeg' });
      };
      img.onerror = () => {
        resolve({ base64: e.target?.result as string, mimeType: file.type });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ base64: '', mimeType: file.type });
    };
    reader.readAsDataURL(file);
  });
}

export const AiQuestionImporterModal: React.FC<AiQuestionImporterModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
  standard,
  subject,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [optimizedPayload, setOptimizedPayload] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Review step state
  const [reviewMode, setReviewMode] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<MCQQuestion[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Support Images and PDFs
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('કૃપા કરીને માત્ર ફોટો (JPG, PNG) અથવા PDF ફાઇલ પસંદ કરો.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('ફાઇલ સાઇઝ 20MB કરતાં વધુ ન હોવી જોઈએ.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    try {
      const opt = await optimizeImageForAi(file);
      setPreviewDataUrl(opt.base64);
      setOptimizedPayload(opt);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        setPreviewDataUrl(res);
        setOptimizedPayload({ base64: res, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartExtraction = async () => {
    setError(null);
    if (activeInputTab === 'paste' && !inputText.trim()) {
      setError('કૃપા કરીને પ્રશ્નોની વિગતો અથવા પેપર પેસ્ટ કરો.');
      return;
    }
    if (activeInputTab === 'upload' && !previewDataUrl) {
      setError('કૃપા કરીને પ્રશ્નપત્રનો ફોટો અથવા PDF અપલોડ કરો.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('AI દ્વારા પ્રશ્નો વાંચવામાં આવી રહ્યા છે...');
    try {
      const payload: { text?: string; fileBase64?: string; mimeType?: string } = {};

      if (activeInputTab === 'paste') {
        payload.text = inputText.trim();
      } else if (optimizedPayload) {
        payload.fileBase64 = optimizedPayload.base64;
        payload.mimeType = optimizedPayload.mimeType;
      } else if (previewDataUrl && selectedFile) {
        payload.fileBase64 = previewDataUrl;
        payload.mimeType = selectedFile.type;
      }

      const res = await extractQuestionsWithAI(payload, (status) => {
        setStatusMessage(status);
      });

      if (res.questions && res.questions.length > 0) {
        setExtractedQuestions(res.questions);
        setReviewMode(true);
      } else {
        setError('દસ્તાવેજમાંથી કોઈ MCQ પ્રશ્નો ઓળખી શકાયા નથી. કૃપા કરીને સ્પષ્ટ છબી અથવા ટેક્સ્ટ આપો.');
      }
    } catch (err: any) {
      let msg = err.message || 'AI એક્સટ્રેક્શન નિષ્ફળ રહ્યું.';
      try {
        if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('"message"')) {
          const parsed = JSON.parse(msg);
          if (parsed?.error?.message) msg = parsed.error.message;
        }
      } catch (_) {}

      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        msg = 'Google AI સર્વર પર હાલમાં ભારે ટ્રાફિક (High Demand) છે. કૃપા કરીને નીચે આપેલા "🔄 ફરી પ્રયાસ કરો" બટન પર ક્લિક કરો.';
      }
      setError(msg);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleUpdateQuestion = (id: string, field: keyof MCQQuestion, val: any) => {
    setExtractedQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const updated = { ...q, [field]: val };
          if (field === 'correctAnswer' && val) {
            updated.needsReview = false;
            updated.reviewNotes = '';
          }
          return updated;
        }
        return q;
      })
    );
  };

  const handleDeleteQuestion = (id: string) => {
    setExtractedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleAddManualQuestion = () => {
    const newQ: MCQQuestion = {
      id: `manual_${Date.now()}`,
      schoolId: '',
      questionNumber: extractedQuestions.length + 1,
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: '',
      marks: 1,
      aiConfidence: 'high',
      needsReview: true,
      reviewNotes: 'મેન્યુઅલી ઉમેરેલ પ્રશ્ન',
    };
    setExtractedQuestions((prev) => [...prev, newQ]);
    setEditingQuestionId(newQ.id);
  };

  const handleFinalConfirmImport = () => {
    // Check if all questions have a valid correct answer
    const missingAnswers = extractedQuestions.filter((q) => !q.correctAnswer);
    if (missingAnswers.length > 0) {
      setError(
        `કૃપા કરીને પ્રશ્ન નં ${missingAnswers
          .map((q) => q.questionNumber)
          .join(', ')} માટે સાચો જવાબ (Correct Answer) પસંદ કરો.`
      );
      return;
    }

    onImportQuestions(extractedQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[86dvh] sm:max-h-[90dvh] flex flex-col text-slate-800 dark:text-[#e4ded6] animate-fadeIn">
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-gradient-to-br dark:from-amber-500/20 dark:to-orange-600/30 border border-amber-300 dark:border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                  🤖 AI પ્રશ્ન આયાતકાર (AI MCQ Importer)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                  Gemini Multimodal
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ગુજરાતી / હિન્દી / અંગ્રેજી / સંસ્કૃત પ્રશ્નપત્ર, ફોટો, સ્કેન અથવા હસ્તલિખિત નોટ્સમાંથી આપમેળે MCQs અલગ તારવો
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-[13px] leading-snug">{error}</p>
                  <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-1">
                    ટિપ: જો Google સર્વર પર ભારે ટ્રાફિક હોય, તો થોડી સેકન્ડ પછી અહીંથી સીધું ફરી પ્રયાસ કરી શકો છો.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStartExtraction}
                disabled={isProcessing}
                className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>🔄 ફરી પ્રયાસ કરો (Retry)</span>
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5 shadow-sm animate-pulse">
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
              <span className="font-medium">{statusMessage || 'AI દ્વારા પ્રશ્નોનું વિશ્લેષણ થઈ રહ્યું છે...'}</span>
            </div>
          )}

          {!reviewMode ? (
            /* Upload / Paste Step */
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900/80 p-1 border border-slate-200 dark:border-white/10 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setActiveInputTab('upload')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeInputTab === 'upload'
                      ? 'bg-[#e27d4e] text-white shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  ફોટો / સ્કેન / PDF અપલોડ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('paste')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeInputTab === 'paste'
                      ? 'bg-[#e27d4e] text-white shadow'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  લખાણ પેસ્ટ કરો (Text Paste)
                </button>
              </div>

              {activeInputTab === 'upload' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  {/* Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-amber-500/60 dark:border-white/20 dark:hover:border-amber-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-50 hover:bg-amber-50/50 dark:bg-white/[0.02] dark:hover:bg-amber-500/[0.02] flex flex-col items-center justify-center min-h-[260px] group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                      પ્રશ્નપત્ર પસંદ કરો અથવા અહીં ખેંચો (Drag & Drop)
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-3">
                      મોબાઇલ કેમેરાનો ફોટો, ઝેરોક્ષ / સ્કેન કોપી, પ્રિન્ટેડ પેપર અથવા PDF સ્વીકાર્ય છે
                    </p>
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      સપોર્ટેડ: JPG, PNG, PDF (Max 15MB)
                    </span>
                  </div>

                  {/* Preview of uploaded image/file */}
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 p-4 min-h-[260px] flex flex-col justify-center items-center">
                    {previewDataUrl ? (
                      selectedFile?.type === 'application/pdf' ? (
                        <div className="text-center p-6 space-y-3">
                          <FileText className="w-16 h-16 text-rose-500 dark:text-rose-400 mx-auto" />
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedFile.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">PDF દસ્તાવેજ સફળતાપૂર્વક લોડ થયો છે.</div>
                        </div>
                      ) : (
                        <div className="w-full flex flex-col items-center">
                          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center justify-between w-full">
                            <span>અસલ ફોટો પૂર્વાવલોકન:</span>
                            <span className="text-[11px] text-amber-600 dark:text-amber-400">{selectedFile?.name}</span>
                          </div>
                          <div className="max-h-64 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 w-full bg-slate-100 dark:bg-black/40 flex items-center justify-center">
                            <img
                              src={previewDataUrl}
                              alt="Source preview"
                              className="max-h-64 object-contain"
                            />
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="text-center text-slate-400 dark:text-slate-500 text-xs py-8">
                        <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        અપલોડ કર્યા બાદ મૂળ પૂર્વાવલોકન અહીં દેખાશે
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    પ્રશ્નો અને વિકલ્પોનું લખાણ પેસ્ટ કરો:
                  </label>
                  <textarea
                    rows={10}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="દા.ત.&#10;૧. ગુજરાતની રાજધાની કઈ છે?&#10;(A) અમદાવાદ  (B) ગાંધીનગર  (C) સુરત  (D) વડોદરા&#10;જવાબ: B&#10;&#10;૨. ભારતના રાષ્ટ્રધ્વજમાં કેટલા રંગો છે?&#10;(A) ૨  (B) ૩  (C) ૪  (D) ૫"
                    className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-amber-500 text-xs leading-relaxed font-mono"
                  />
                </div>
              )}

              {/* Safety notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-xs text-amber-900 dark:text-amber-300/90 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">વિશ્વાસપાત્ર પ્રક્રિયા નિયમ:</div>
                  <div>
                    AI પોતાની મરજીથી સાચા જવાબો બનાવશે નહીં. જો પેપરમાં સાચો જવાબ સ્પષ્ટ દર્શાવેલ હશે તો જ તે લેવામાં આવશે, અન્યથા તમને જાતે સાચો જવાબ પસંદ કરવા માટે રજૂ કરાશે.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Review & Edit Screen */
            <div className="space-y-6">
              {/* Review Header Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>તારવેલા પ્રશ્નોની ચકાસણી (Review Questions)</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#e27d4e]/20 text-[#e27d4e] dark:text-[#f59c73] border border-[#e27d4e]/30">
                      કુલ પ્રશ્નો: {extractedQuestions.length}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    પરીક્ષામાં ઉમેરતા પહેલાં દરેક પ્રશ્ન, વિકલ્પો અને સાચા જવાબની ચકાસણી કરો
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddManualQuestion}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    નવો પ્રશ્ન ઉમેરો
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewMode(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    ફરી સ્કેન કરો
                  </button>
                </div>
              </div>

              {/* Two-column view: Original Source (if available) + Questions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left: Original Preview (Sticky on desktop) */}
                {previewDataUrl && (
                  <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-xl p-3 max-h-[550px] overflow-y-auto">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      મૂળ દસ્તાવેજ (Original Source)
                    </div>
                    {selectedFile?.type === 'application/pdf' ? (
                      <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                        <FileText className="w-10 h-10 text-rose-500 dark:text-rose-400 mx-auto mb-2" />
                        {selectedFile.name}
                      </div>
                    ) : (
                      <img
                        src={previewDataUrl}
                        alt="Original paper"
                        className="w-full rounded-lg border border-slate-200 dark:border-white/10 object-contain shadow-md"
                      />
                    )}
                  </div>
                )}

                {/* Right: Extracted Questions Cards */}
                <div className={previewDataUrl ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
                  {extractedQuestions.map((q, idx) => {
                    const hasAnswer = Boolean(q.correctAnswer);
                    const isHigh = q.aiConfidence === 'high';
                    const isMedium = q.aiConfidence === 'medium';

                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border transition-all ${
                          !hasAnswer
                            ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40'
                            : q.needsReview
                            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40'
                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {/* Top Question Row: Number, Confidence, Marks, Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-white/10">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 font-bold text-xs flex items-center justify-center text-slate-800 dark:text-white">
                              {idx + 1}
                            </span>
                            {/* Confidence Indicator */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                isHigh
                                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                                  : isMedium
                                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isHigh ? 'bg-emerald-500 dark:bg-emerald-400' : isMedium ? 'bg-amber-500 dark:bg-amber-400' : 'bg-rose-500 dark:bg-rose-400'
                                }`}
                              />
                              {isHigh
                                ? '🟢 High Confidence'
                                : isMedium
                                ? '🟡 Needs Review'
                                : '🔴 Low Confidence'}
                            </span>

                            {!hasAnswer && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-500/30 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-500/40 animate-pulse">
                                સાચો જવાબ પસંદ કરો
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <span>ગુણ:</span>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={q.marks || 1}
                                onChange={(e) =>
                                  handleUpdateQuestion(q.id, 'marks', parseInt(e.target.value) || 1)
                                }
                                className="w-12 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-300 dark:border-white/10 text-center font-bold text-slate-900 dark:text-white text-xs"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="પ્રશ્ન કાઢી નાખો"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Question Text (Editable) */}
                        <div className="mb-3">
                          <textarea
                            rows={2}
                            value={q.questionText}
                            onChange={(e) => handleUpdateQuestion(q.id, 'questionText', e.target.value)}
                            placeholder="પ્રશ્ન લખાણ..."
                            className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Options A, B, C, D (Editable) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                          {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                            const fieldName = `option${optKey}` as keyof MCQQuestion;
                            const isSelected = q.correctAnswer === optKey;

                            return (
                              <div
                                key={optKey}
                                className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all ${
                                  isSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/60 ring-1 ring-emerald-500/30'
                                    : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuestion(q.id, 'correctAnswer', optKey)}
                                  className={`w-7 h-7 rounded-md font-bold text-xs shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white shadow-md'
                                      : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20'
                                  }`}
                                  title="સાચા જવાબ તરીકે સેટ કરો"
                                >
                                  {optKey}
                                </button>
                                <input
                                  type="text"
                                  value={(q[fieldName] as string) || ''}
                                  onChange={(e) => handleUpdateQuestion(q.id, fieldName, e.target.value)}
                                  placeholder={`વિકલ્પ (${optKey})`}
                                  className="flex-1 bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                />
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mr-1" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Review Notes / Status Banner */}
                        {q.reviewNotes && (
                          <div className="text-[11px] text-amber-800 dark:text-amber-300/80 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-amber-200 dark:border-transparent">
                            <HelpCircle className="w-3 h-3 shrink-0" />
                            <span>{q.reviewNotes}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          {!reviewMode ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                રદ કરો (Cancel)
              </button>
              <button
                type="button"
                onClick={handleStartExtraction}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-lg shadow-orange-950/20 hover:brightness-110 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{statusMessage || 'AI પ્રશ્નો તારવી રહ્યું છે...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    AI દ્વારા MCQs અલગ તારવો
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                તારવેલા પ્રશ્નો: <strong className="text-slate-900 dark:text-white">{extractedQuestions.length}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewMode(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  પાછા જાઓ
                </button>
                <button
                  type="button"
                  onClick={handleFinalConfirmImport}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-950/20 hover:brightness-110 flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  પરીક્ષામાં પ્રશ્નો આયાત કરો ({extractedQuestions.length})
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
