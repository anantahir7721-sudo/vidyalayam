import React, { useState, useEffect } from 'react';
import { AllowedStandard, StandardSubject, SubjectSection, School } from '../types';
import {
  getCustomSubjects,
  subscribeToCustomSubjects,
  addCustomSubject,
  updateCustomSubject,
  deleteCustomSubject,
} from '../services/subjectService';
import { EKAM_KASOTI_SUBJECTS, SubjectConfig } from '../data/ekamKasotiConfig';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  Check,
  Award,
} from 'lucide-react';

interface SubjectManagerProps {
  school: School;
}

const STANDARDS_LIST: Array<{ id: AllowedStandard; label: string; subLabel: string }> = [
  { id: '9', label: 'ધોરણ 9', subLabel: 'Class 9' },
  { id: '10', label: 'ધોરણ 10', subLabel: 'Class 10' },
  { id: '11', label: 'ધોરણ 11', subLabel: 'Class 11' },
  { id: '12', label: 'ધોરણ 12', subLabel: 'Class 12' },
];

export const SubjectManager: React.FC<SubjectManagerProps> = ({ school }) => {
  const [selectedStandard, setSelectedStandard] = useState<AllowedStandard>('9');
  const [customSubjects, setCustomSubjects] = useState<StandardSubject[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form States for Add/Edit
  const [subjectName, setSubjectName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [sections, setSections] = useState<Array<{ name: string; maxMarks: string }>>([
    { name: 'વિભાગ A (Section A)', maxMarks: '10' },
    { name: 'વિભાગ B (Section B)', maxMarks: '' },
  ]);
  const [editingSubject, setEditingSubject] = useState<StandardSubject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<StandardSubject | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Real-time synchronization of custom subjects for the active standard
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToCustomSubjects(school.id, selectedStandard, (list) => {
      setCustomSubjects(list);
      setLoading(false);
    });
    return () => unsub();
  }, [school.id, selectedStandard]);

  // Official installed papers for this standard
  const installedSubjects: SubjectConfig[] = EKAM_KASOTI_SUBJECTS[selectedStandard] || [];

  // Reset form
  const resetForm = () => {
    setSubjectName('');
    setEnglishName('');
    setSections([
      { name: 'વિભાગ A (Section A)', maxMarks: '10' },
      { name: 'વિભાગ B (Section B)', maxMarks: '' },
    ]);
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingSubject(null);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (subj: StandardSubject) => {
    setEditingSubject(subj);
    setSubjectName(subj.subjectName);
    setEnglishName(subj.englishName || '');
    setSections(
      subj.sections.map((sec) => ({
        name: sec.name,
        maxMarks: typeof sec.maxMarks === 'number' ? String(sec.maxMarks) : '',
      }))
    );
    setErrorMessage(null);
    setIsEditModalOpen(true);
  };

  // Add a section row in modal
  const handleAddSectionRow = () => {
    const nextChar = String.fromCharCode(65 + sections.length);
    setSections((prev) => [...prev, { name: `વિભાગ ${nextChar} (Section ${nextChar})`, maxMarks: '' }]);
  };

  // Remove section row in modal
  const handleRemoveSectionRow = (idx: number) => {
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handle section row change
  const handleSectionChange = (idx: number, field: 'name' | 'maxMarks', val: string) => {
    setSections((prev) =>
      prev.map((sec, i) => (i === idx ? { ...sec, [field]: val } : sec))
    );
  };

  // Save new subject
  const handleSaveNewSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = subjectName.trim();
    if (!cleanName) {
      setErrorMessage('કૃપા કરીને વિષયનું નામ લખો (Subject name is required).');
      return;
    }

    const cleanSections = sections.map((s) => {
      const trimmed = s.name.trim();
      const parsedMarks = s.maxMarks.trim() === '' ? null : Number(s.maxMarks.trim());
      return {
        name: trimmed || 'વિભાગ',
        maxMarks: parsedMarks !== null && !isNaN(parsedMarks) ? parsedMarks : null,
      };
    });

    if (cleanSections.length === 0) {
      setErrorMessage('ઓછામાં ઓછો ૧ વિભાગ જરૂરી છે (At least 1 section is required).');
      return;
    }

    setSubmitting(true);
    try {
      await addCustomSubject(school.id, selectedStandard, {
        subjectName: cleanName,
        englishName: englishName.trim() || undefined,
        sections: cleanSections,
      });

      setSuccessMessage(`ધોરણ ${selectedStandard} માં '${cleanName}' વિષય સફળતાપૂર્વક ઉમેરાયો!`);
      setTimeout(() => {
        setIsAddModalOpen(false);
        resetForm();
      }, 1000);
    } catch (err: any) {
      console.error('Error adding subject:', err);
      setErrorMessage(err.message || 'વિષય ઉમેરવામાં ભૂલ થઈ. કૃપા કરીને ફરી પ્રયાસ કરો.');
    } finally {
      setSubmitting(false);
    }
  };

  // Update existing subject
  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    setErrorMessage(null);

    const cleanName = subjectName.trim();
    if (!cleanName) {
      setErrorMessage('કૃપા કરીને વિષયનું નામ લખો.');
      return;
    }

    const cleanSections: SubjectSection[] = sections.map((s, idx) => {
      const trimmed = s.name.trim();
      const parsedMarks = s.maxMarks.trim() === '' ? null : Number(s.maxMarks.trim());
      return {
        id: editingSubject.sections[idx]?.id || `sec_${Date.now()}_${idx}`,
        name: trimmed || 'વિભાગ',
        label: trimmed || 'વિભાગ',
        maxMarks: parsedMarks !== null && !isNaN(parsedMarks) ? parsedMarks : null,
      };
    });

    setSubmitting(true);
    try {
      await updateCustomSubject(school.id, selectedStandard, editingSubject.id, {
        subjectName: cleanName,
        englishName: englishName.trim() || undefined,
        sections: cleanSections,
      });

      setSuccessMessage('વિષય અને વિભાગો સફળતાપૂર્વક અપડેટ થયા!');
      setTimeout(() => {
        setIsEditModalOpen(false);
        resetForm();
      }, 800);
    } catch (err: any) {
      console.error('Error updating subject:', err);
      setErrorMessage(err.message || 'વિષય અપડેટ કરવામાં ભૂલ થઈ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete subject confirmation
  const handleConfirmDelete = async () => {
    if (!deletingSubject) return;
    setSubmitting(true);
    try {
      await deleteCustomSubject(school.id, selectedStandard, deletingSubject.id);
      setIsDeleteModalOpen(false);
      setDeletingSubject(null);
    } catch (err: any) {
      console.error('Error deleting subject:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - iOS Style Glass Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>વિષય અને વિભાગ સંચાલન (Subject & Section Management)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              ધોરણ વાર વિષય વ્યવસ્થાપન
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              દરેક ધોરણ માટે અલગ વિષયો અને તેમના વિભાગો (Sections) તથા મહત્તમ ગુણ નિયત કરો. એક ધોરણમાં ઉમેરેલ વિષય બીજા ધોરણમાં દેખાશે નહીં.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl btn-terracotta font-semibold text-sm shadow-lg shadow-[#9d512d]/25 active:scale-[0.98] transition-all min-h-[48px] shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>નવો વિષય ઉમેરો (Add Subject)</span>
          </button>
        </div>
      </div>

      {/* iOS Segmented Control for Standards */}
      <div className="glass-pill p-1.5 rounded-2xl flex flex-wrap gap-1.5 border border-white/10 shadow-sm max-w-xl">
        {STANDARDS_LIST.map((std) => {
          const isActive = selectedStandard === std.id;
          return (
            <button
              key={std.id}
              type="button"
              onClick={() => setSelectedStandard(std.id)}
              className={`flex-1 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                isActive
                  ? 'bg-[#9d512d] text-white shadow-md'
                  : 'text-[#a99f91] hover:text-[#e4ded6] hover:bg-white/5'
              }`}
            >
              <span>{std.label}</span>
              <span className="text-[11px] opacity-75 hidden sm:inline">({std.subLabel})</span>
            </button>
          );
        })}
      </div>

      {/* Subjects Overview Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">
            ધોરણ {selectedStandard} ના ઉપલબ્ધ વિષયો ({installedSubjects.length + customSubjects.length})
          </span>
          <span className="text-slate-400">
            {installedSubjects.length} નિયત પેપર + {customSubjects.length} શાળા ઉમેરેલ
          </span>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Official GSEB Installed Papers for this standard */}
          {installedSubjects.map((sub) => (
            <div
              key={sub.id}
              className="glass-card rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white">{sub.name}</h4>
                      <div className="text-xs text-slate-400">{sub.englishName}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shrink-0">
                    GSEB નિયત પેપર
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    પ્રશ્ન / વિભાગ માળખું (Sections):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {sub.questions.map((q) => (
                      <div
                        key={q.id}
                        className="bg-slate-950/60 rounded-lg p-2 border border-white/5 text-center text-xs"
                      >
                        <div className="font-semibold text-slate-200 truncate">{q.label}</div>
                        <div className="text-[10px] text-emerald-400 font-mono font-medium">
                          {typeof q.maxMarks === 'number' ? `${q.maxMarks} ગુણ` : 'નિયત નથી'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>કુલ ગુણ: <strong className="text-emerald-400 font-bold">{sub.totalMarks || 25}</strong></span>
                <span className="text-[11px] text-slate-500">ગુરુત્તમ સુરક્ષા (Protected)</span>
              </div>
            </div>
          ))}

          {/* Custom School-Added Subjects for this standard */}
          {customSubjects.map((sub) => (
            <div
              key={sub.id}
              className="glass-card rounded-2xl p-5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white">{sub.subjectName}</h4>
                      {sub.englishName && (
                        <div className="text-xs text-slate-400">{sub.englishName}</div>
                      )}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shrink-0">
                    શાળા વિષય (Custom)
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    વિભાગો અને મહત્તમ ગુણ (Sections & Max Marks):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {sub.sections.map((sec, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/60 rounded-lg p-2 border border-white/5 text-center text-xs"
                      >
                        <div className="font-semibold text-slate-200 truncate">{sec.name}</div>
                        <div className="text-[10px] font-mono font-medium">
                          {typeof sec.maxMarks === 'number' ? (
                            <span className="text-emerald-400">{sec.maxMarks} ગુણ</span>
                          ) : (
                            <span className="text-amber-400/90">(નિયત નથી / Blank)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  કુલ ગુણ: <strong className="text-emerald-400 font-bold">{sub.totalMarks ? `${sub.totalMarks} ગુણ` : 'નિયત નથી'}</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(sub)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    title="વિષય અને વિભાગ ગુણ એડિટ કરો"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingSubject(sub);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    title="વિષય ડિલીટ કરો"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State when no subjects exist */}
        {installedSubjects.length === 0 && customSubjects.length === 0 && (
          <div className="glass-card rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-semibold text-white">ધોરણ {selectedStandard} માં કોઈ વિષય મળ્યો નથી</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              આ ધોરણ માટે નવો વિષય અને તેના વિભાગો ઉમેરવા માટે ઉપર આપેલા &apos;નવો વિષય ઉમેરો&apos; બટન પર ક્લિક કરો.
            </p>
          </div>
        )}
      </div>

      {/* ADD SUBJECT MODAL (iOS Style Glass Dialog) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-5 sm:p-6 border border-white/15 shadow-2xl max-h-[86dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden my-auto animate-fadeIn">
            <div className="shrink-0 flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">ધોરણ {selectedStandard} માં નવો વિષય ઉમેરો</h3>
                <p className="text-xs text-slate-400">વિષયનું નામ અને વિભાગો (Sections) દાખલ કરો</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSubject} className="flex-1 flex flex-col justify-between overflow-hidden mt-3">
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Standard display */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  પસંદ કરેલ ધોરણ (Selected Standard)
                </label>
                <div className="glass-input px-3.5 py-2.5 rounded-xl text-sm font-semibold text-emerald-300 bg-slate-900/60">
                  ધોરણ {selectedStandard} (Class {selectedStandard})
                </div>
              </div>

              {/* Subject Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  વિષયનું નામ (ગુજરાતીમાં) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="દા.ત. સંસ્કૃત, હિન્દી, ચિત્રકામ, વગેરે"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              {/* English Name (optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  English Name <span className="text-slate-500 font-normal">(વૈકલ્પિક)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sanskrit, Hindi, Physical Education"
                  value={englishName}
                  onChange={(e) => setEnglishName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              {/* Sections Builder */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>વિભાગો (Sections) અને મહત્તમ ગુણ (Max Marks)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSectionRow}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 py-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>વિભાગ ઉમેરો</span>
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>મહત્તમ ગુણ વૈકલ્પિક છે:</strong> જો તમે મહત્તમ ગુણ ખાલી રાખશો, તો તેને ૦ ગણવામાં નહીં આવે. તમે પાછળથી ગમે ત્યારે ગુણદાખલ અથવા ફેરફાર કરી શકશો.
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sections.map((sec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="વિભાગનું નામ (Section Name)"
                        value={sec.name}
                        onChange={(e) => handleSectionChange(idx, 'name', e.target.value)}
                        className="flex-1 glass-input px-3 py-2 rounded-xl text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="ગુણ (ખાલી = અનિશ્ચિત)"
                        value={sec.maxMarks}
                        onChange={(e) => handleSectionChange(idx, 'maxMarks', e.target.value)}
                        className="w-28 glass-input px-3 py-2 rounded-xl text-xs text-center font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSectionRow(idx)}
                        disabled={sections.length <= 1}
                        className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 pt-3 border-t border-white/10 flex items-center justify-end gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors min-h-[44px] cursor-pointer"
                >
                  રદ કરો (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-xs shadow-md active:scale-[0.98] transition-all min-h-[44px] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'સેવ થઈ રહ્યું છે...' : 'વિષય સેવ કરો (Save Subject)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUBJECT MODAL */}
      {isEditModalOpen && editingSubject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-5 sm:p-6 border border-white/15 shadow-2xl max-h-[86dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden my-auto animate-fadeIn">
            <div className="shrink-0 flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">વિષય & વિભાગ ગુણ એડિટ કરો</h3>
                <p className="text-xs text-slate-400">ધોરણ {selectedStandard} — {editingSubject.subjectName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubject} className="flex-1 flex flex-col justify-between overflow-hidden mt-3">
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  વિષયનું નામ (Subject Name)
                </label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  English Name
                </label>
                <input
                  type="text"
                  value={englishName}
                  onChange={(e) => setEnglishName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              {/* Sections Builder */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>વિભાગો (Sections) અને મહત્તમ ગુણ (Max Marks)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSectionRow}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 py-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>વિભાગ ઉમેરો</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sections.map((sec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="વિભાગનું નામ"
                        value={sec.name}
                        onChange={(e) => handleSectionChange(idx, 'name', e.target.value)}
                        className="flex-1 glass-input px-3 py-2 rounded-xl text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="મહત્તમ ગુણ"
                        value={sec.maxMarks}
                        onChange={(e) => handleSectionChange(idx, 'maxMarks', e.target.value)}
                        className="w-28 glass-input px-3 py-2 rounded-xl text-xs text-center font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSectionRow(idx)}
                        disabled={sections.length <= 1}
                        className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              </div>

              <div className="shrink-0 pt-3 border-t border-white/10 flex items-center justify-end gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs min-h-[44px] cursor-pointer"
                >
                  રદ કરો
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md min-h-[44px] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'અપડેટ થઈ રહ્યું છે...' : 'અપડેટ કરો'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && deletingSubject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-3xl p-5 sm:p-6 border border-white/15 shadow-2xl space-y-4 max-h-[88dvh] overflow-y-auto animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">વિષય ડિલીટ કરવાની પુષ્ટિ</h3>
              <p className="text-xs text-slate-300">
                શું તમે ખરેખર ધોરણ {selectedStandard} માંથી &apos;<strong className="text-white">{deletingSubject.subjectName}</strong>&apos; વિષય ડિલીટ કરવા માંગો છો?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs min-h-[44px]"
              >
                રદ કરો
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-md min-h-[44px] disabled:opacity-50"
              >
                {submitting ? 'ડિલીટ થઈ રહ્યું છે...' : 'હા, ડિલીટ કરો'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
