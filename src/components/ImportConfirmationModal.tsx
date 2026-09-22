import React, { useState, useMemo } from 'react';
import { StudentFieldChange } from '../utils/excelUtils';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  Search,
  ArrowRight,
  Loader2,
  FileSpreadsheet,
  Info,
  Check,
  Building,
} from 'lucide-react';

export interface UpdatedStudentInfo {
  name: string;
  grNumber?: string;
  standard: string;
  section?: string;
  rollNumber?: string;
  diseCode?: string;
  changes?: StudentFieldChange[];
}

export interface NewStudentInfo {
  name: string;
  grNumber?: string;
  standard: string;
  section?: string;
  rollNumber?: string;
  diseCode?: string;
}

interface ImportConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting: boolean;
  sourceTitle?: string;
  fileName?: string;
  newEntries: NewStudentInfo[];
  updatedEntries: UpdatedStudentInfo[];
  invalidCount?: number;
}

export const ImportConfirmationModal: React.FC<ImportConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  sourceTitle = 'એક્સેલ આયાત',
  fileName,
  newEntries,
  updatedEntries,
  invalidCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'updates' | 'new'>('updates');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyShowWithChanges, setOnlyShowWithChanges] = useState(false);

  // Filter updated entries
  const filteredUpdates = useMemo(() => {
    return updatedEntries.filter((item) => {
      if (onlyShowWithChanges && (!item.changes || item.changes.length === 0)) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchGr = item.grNumber ? item.grNumber.toLowerCase().includes(q) : false;
      const matchStd = item.standard ? String(item.standard).includes(q) : false;
      return matchName || matchGr || matchStd;
    });
  }, [updatedEntries, searchQuery, onlyShowWithChanges]);

  // Filter new entries
  const filteredNew = useMemo(() => {
    if (!searchQuery.trim()) return newEntries;
    const q = searchQuery.trim().toLowerCase();
    return newEntries.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchGr = item.grNumber ? item.grNumber.toLowerCase().includes(q) : false;
      const matchStd = item.standard ? String(item.standard).includes(q) : false;
      return matchName || matchGr || matchStd;
    });
  }, [newEntries, searchQuery]);

  const totalEntriesWithChanges = useMemo(() => {
    return updatedEntries.filter((u) => u.changes && u.changes.length > 0).length;
  }, [updatedEntries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[105] bg-black/70 dark:bg-black/85 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-4xl w-full max-h-[86dvh] sm:max-h-[90dvh] flex flex-col text-slate-800 dark:text-white my-auto overflow-hidden">
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {sourceTitle}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {fileName ? `ફાઇલ: ${fileName}` : 'ડેટાબેઝ પુષ્ટિ'}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>આયાત પુષ્ટિ (Confirm Import &amp; Updates)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              હાલના ડેટાબેઝ સાથે સરખામણી પૂર્ણ થઈ છે. પહેલેથી સેવ વિદ્યાર્થીઓની નવી એન્ટ્રી નહીં થાય પરંતુ તેમની વિગતો અપડેટ થશે.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Counter Summary Cards */}
        <div className="p-4 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* New Entries Card */}
          <div
            onClick={() => setActiveTab('new')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'new'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-500/80 dark:text-white shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                નવી એન્ટ્રીઓ (New Students)
              </span>
              <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {newEntries.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              આ વિદ્યાર્થીઓ શાળા રેકોર્ડમાં નવા નોંધાશે.
            </p>
          </div>

          {/* Updates Card */}
          <div
            onClick={() => setActiveTab('updates')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'updates'
                ? 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/50 dark:border-blue-500/80 dark:text-white shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                માહિતી અપડેટ થશે (Updates)
              </span>
              <span className="text-lg font-bold font-mono text-blue-700 dark:text-blue-400">
                {updatedEntries.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              પહેલેથી સેવ છે — નવી એન્ટ્રી નહીં બને, વિગતો સુધરશે ({totalEntriesWithChanges} માં ફેરફાર).
            </p>
          </div>

          {/* Skipped / Invalid Card */}
          <div className="p-3 rounded-xl border bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                ક્ષતિ / અમાન્ય (Skipped)
              </span>
              <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                {invalidCount}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              અધૂરી અથવા ક્ષતિવાળી પંક્તિઓ આપમેળે રદ રહેશે.
            </p>
          </div>
        </div>

        {/* Tab Selection and Search */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('updates')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'updates'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              <span>અપડેટ થનાર વિદ્યાર્થીઓ ({updatedEntries.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <UserPlus className="w-3 h-3" />
              <span>નવા વિદ્યાર્થીઓ ({newEntries.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'updates' && updatedEntries.length > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={onlyShowWithChanges}
                  onChange={(e) => setOnlyShowWithChanges(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>માત્ર ફેરફારવાળા ({totalEntriesWithChanges})</span>
              </label>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="નામ કે GR નંબર શોધો..."
                className="w-40 sm:w-56 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[50vh] bg-slate-50/50 dark:bg-transparent">
          {/* TAB 1: UPDATES TAB */}
          {activeTab === 'updates' && (
            <div>
              {filteredUpdates.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                  {updatedEntries.length === 0
                    ? 'કોઈ વિદ્યાર્થી પહેલેથી સેવ નથી (તમામ વિદ્યાર્થીઓ નવા છે).'
                    : 'શોધ મુજબ કોઈ વિદ્યાર્થી મળ્યો નથી.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredUpdates.map((item, idx) => {
                    const hasChanges = item.changes && item.changes.length > 0;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border transition-all ${
                          hasChanges
                            ? 'bg-white dark:bg-slate-950/80 border-blue-200 dark:border-blue-900/80 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/80'
                            : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {/* Student Row Top */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800/80">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</span>
                            {item.grNumber && (
                              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-slate-800 text-amber-800 dark:text-amber-300 font-mono text-[11px] border border-amber-200 dark:border-slate-700 font-semibold">
                                G.R. #{item.grNumber}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] border border-emerald-200 dark:border-emerald-800">
                              ધોરણ {item.standard} {item.section ? `(${item.section})` : ''}
                            </span>
                            {item.rollNumber && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                રોલ નં: {item.rollNumber}
                              </span>
                            )}
                          </div>

                          <div>
                            {hasChanges ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700 inline-flex items-center gap-1">
                                <RefreshCw className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                {item.changes!.length} વિગતો અપડેટ થશે
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 inline-flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                વિગતો સમાન છે
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Student Field Changes Breakdown */}
                        <div className="pt-2">
                          {hasChanges ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {item.changes!.map((ch, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-blue-900/50 text-[11px]"
                                >
                                  <div className="text-slate-500 dark:text-slate-400 font-medium mb-1 flex items-center justify-between">
                                    <span>{ch.fieldLabel}</span>
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">ફેરફાર</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="line-through text-red-600/80 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/40">
                                      {ch.oldValue || '(ખાલી)'}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                                    <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                      {ch.newValue}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                              આ વિદ્યાર્થીની એક્સેલ ફાઇલની તમામ વિગતો ડેટાબેઝ સાથે સંપૂર્ણ મેળ ખાય છે. કોઈ ફેરફારની જરૂર નથી.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NEW ENTRIES TAB */}
          {activeTab === 'new' && (
            <div>
              {filteredNew.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                  {newEntries.length === 0
                    ? 'કોઈ નવો વિદ્યાર્થી ઉમેરવા માટે નથી (તમામ વિદ્યાર્થીઓ પહેલેથી સેવ છે).'
                    : 'શોધ મુજબ કોઈ નવો વિદ્યાર્થી મળ્યો નથી.'}
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">વિદ્યાર્થીનું નામ</th>
                        <th className="p-2.5">G.R. નંબર</th>
                        <th className="p-2.5">ધોરણ / વર્ગ</th>
                        <th className="p-2.5">રોલ નં</th>
                        <th className="p-2.5">સ્થિતિ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredNew.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                          <td className="p-2.5 text-slate-500 dark:text-slate-400 font-mono">#{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                          <td className="p-2.5 font-mono text-amber-700 dark:text-amber-300 font-semibold">
                            {s.grNumber || '-'}
                          </td>
                          <td className="p-2.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                            ધોરણ {s.standard} {s.section ? `(${s.section})` : ''}
                          </td>
                          <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300">{s.rollNumber || '-'}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1">
                              <UserPlus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              નવી એન્ટ્રી
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left">
            કુલ <strong className="text-slate-900 dark:text-white">{newEntries.length + updatedEntries.length}</strong> માન્ય વિદ્યાર્થીઓ ({newEntries.length} નવી એન્ટ્રી + {updatedEntries.length} અપડેટ).
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              રદ કરો
            </button>
            <button
              type="button"
              disabled={isSubmitting || (newEntries.length === 0 && updatedEntries.length === 0)}
              onClick={onConfirm}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50 shadow-lg cursor-pointer transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span className="text-white">ડેટાબેઝમાં સાચવી રહ્યું છે...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span className="text-white">
                    હા, પુષ્ટિ કરો અને સાચવો ({newEntries.length + updatedEntries.length} વિદ્યાર્થીઓ)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
