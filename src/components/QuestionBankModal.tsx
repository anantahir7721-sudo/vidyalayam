import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Check,
  CheckCircle2,
  Trash2,
  Filter,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { MCQQuestion, QuestionBankItem } from '../types';
import { getQuestionBank, bulkAddToQuestionBank } from '../services/onlineExamService';

interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  currentStandard: string;
  currentSubject: string;
  onSelectQuestions: (questions: MCQQuestion[]) => void;
  currentExamQuestions?: MCQQuestion[];
}

export const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  currentStandard,
  currentSubject,
  onSelectQuestions,
  currentExamQuestions = [],
}) => {
  const [bankItems, setBankItems] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<string>(currentStandard || 'all');
  const [selectedSubject, setSelectedSubject] = useState<string>(currentSubject || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSavingToBank, setIsSavingToBank] = useState(false);
  const [bankNotice, setBankNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && schoolId) {
      loadBank();
    }
  }, [isOpen, schoolId, selectedStandard, selectedSubject]);

  const loadBank = async () => {
    setLoading(true);
    try {
      const items = await getQuestionBank(
        schoolId,
        selectedStandard === 'all' ? undefined : selectedStandard,
        selectedSubject === 'all' ? undefined : selectedSubject
      );
      setBankItems(items);
    } catch (e) {
      console.error('Error loading question bank:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleImportSelected = () => {
    const itemsToImport = bankItems.filter((it) => selectedIds.has(it.id));
    const converted: MCQQuestion[] = itemsToImport.map((it, idx) => ({
      id: `imported_qb_${Date.now()}_${idx}`,
      schoolId,
      questionNumber: idx + 1,
      questionText: it.questionText,
      optionA: it.optionA,
      optionB: it.optionB,
      optionC: it.optionC,
      optionD: it.optionD,
      correctAnswer: it.correctAnswer,
      marks: it.marks || 1,
      imageUrl: it.imageUrl || '',
      aiConfidence: 'high',
      needsReview: false,
      topic: it.topic,
      subject: it.subject,
      standard: it.standard,
    }));

    onSelectQuestions(converted);
    onClose();
  };

  const handleSaveCurrentQuestionsToBank = async () => {
    if (currentExamQuestions.length === 0) return;
    setIsSavingToBank(true);
    try {
      const formatted = currentExamQuestions.map((q) => ({
        standard: currentStandard,
        subject: currentSubject,
        topic: q.topic || '',
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: (q.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
        marks: q.marks || 1,
        imageUrl: q.imageUrl || '',
      }));
      const count = await bulkAddToQuestionBank(schoolId, formatted);
      setBankNotice(`${count} પ્રશ્નો સફળતાપૂર્વક પ્રશ્ન બેંકમાં ઉમેરાયા.`);
      await loadBank();
    } catch (err: any) {
      setBankNotice('પ્રશ્ન બેંકમાં સાચવવામાં ભૂલ થઈ.');
    } finally {
      setIsSavingToBank(false);
    }
  };

  const filteredItems = bankItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.questionText.toLowerCase().includes(q) ||
      (item.topic && item.topic.toLowerCase().includes(q)) ||
      item.subject.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#121921] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col text-[#e4ded6]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                📚 પ્રશ્ન બેંક (Reusable Question Bank)
              </h3>
              <p className="text-xs text-slate-400">
                ધોરણ અને વિષય મુજબ તૈયાર પ્રશ્નો સાચવો અને કોઈપણ નવી પરીક્ષામાં સીધા વાપરો
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar & Actions */}
        <div className="p-4 border-b border-white/10 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="પ્રશ્ન શોધો..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Standard Filter */}
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
            >
              <option value="all">બધા ધોરણ</option>
              <option value="9">ધોરણ 9</option>
              <option value="10">ધોરણ 10</option>
              <option value="11">ધોરણ 11</option>
              <option value="12">ધોરણ 12</option>
            </select>

            {/* Subject Filter */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white focus:outline-none"
            >
              <option value="all">બધા વિષય</option>
              <option value="Computer">કમ્પ્યુટર (Computer)</option>
              <option value="PT">પી.ટી. (P.T.)</option>
              <option value="Udyog">ઉદ્યોગ (Udyog)</option>
              <option value="Chitrakala">ચિત્રકામ (Chitrakala)</option>
              <option value="GK">સામાન્ય જ્ઞાન (GK)</option>
              <option value="Quiz">સામાન્ય ક્વિઝ (Quiz)</option>
            </select>
          </div>

          {currentExamQuestions.length > 0 && (
            <button
              type="button"
              onClick={handleSaveCurrentQuestionsToBank}
              disabled={isSavingToBank}
              className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              ચાલુ પેપરના પ્રશ્નો બેંકમાં સેવ કરો ({currentExamQuestions.length})
            </button>
          )}
        </div>

        {bankNotice && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-between">
            <span>{bankNotice}</span>
            <button onClick={() => setBankNotice(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">પ્રશ્ન બેંક લોડ થઈ રહી છે...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs space-y-2">
              <BookOpen className="w-10 h-10 mx-auto opacity-30" />
              <div>હજુ સુધી આ વિષય/ધોરણ માટે પ્રશ્ન બેંકમાં કોઈ પ્રશ્નો સેવ નથી.</div>
              <div className="text-slate-400">
                પરીક્ષા બનાવતી વખતે પ્રશ્નો ઉમેરીને "બેંકમાં સેવ કરો" બટન દબાવો.
              </div>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isChecked = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-teal-950/30 border-teal-500/60 ring-1 ring-teal-500/40'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isChecked
                            ? 'bg-teal-500 border-teal-500 text-slate-950'
                            : 'border-white/20 bg-slate-800'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-white leading-relaxed">
                          {item.questionText}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300">
                            ધો. {item.standard}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300">
                            {item.subject}
                          </span>
                          {item.topic && (
                            <span className="text-[10px] text-slate-400">વિષયાંગ: {item.topic}</span>
                          )}
                          <span className="text-[10px] text-slate-400">ગુણ: {item.marks}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mt-2 pt-2 border-t border-white/5">
                    {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                      const isAns = item.correctAnswer === opt;
                      const val = item[`option${opt}` as keyof QuestionBankItem];
                      return (
                        <div
                          key={opt}
                          className={`px-2 py-1 rounded truncate ${
                            isAns
                              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                              : 'text-slate-400 bg-white/[0.02]'
                          }`}
                        >
                          <span className="font-bold mr-1">({opt})</span> {val}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            પસંદ કરેલ પ્રશ્નો: <strong className="text-teal-400 font-bold">{selectedIds.size}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
            >
              બંધ કરો
            </button>
            <button
              type="button"
              onClick={handleImportSelected}
              disabled={selectedIds.size === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold shadow-lg disabled:opacity-40 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              પરીક્ષામાં ઉમેરો ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
