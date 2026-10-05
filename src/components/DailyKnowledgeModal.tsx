import React, { useState, useEffect } from 'react';
import {
  X,
  Newspaper,
  Lightbulb,
  Sparkles,
  HelpCircle,
  Drama,
  Presentation,
} from 'lucide-react';
import { School } from '../types';
import { DailyNewsTab } from './DailyNewsTab';
import { DailyJanvaJevuTab } from './DailyJanvaJevuTab';
import { DailyPrashnotariTab } from './DailyPrashnotariTab';
import { DailyAbhivyaktiTab } from './DailyAbhivyaktiTab';
import { DailySuvicharTab } from './DailySuvicharTab';
import { DailyPresentationTab } from './DailyPresentationTab';

interface DailyKnowledgeModalProps {
  school: School;
  isOpen: boolean;
  onClose: () => void;
  onSchoolUpdated?: (updated: Partial<School>) => void;
  initialTab?: 'news' | 'prashnotari' | 'janva_jevu' | 'abhivyakti' | 'suvichar' | 'presentation';
}

export const DailyKnowledgeModal: React.FC<DailyKnowledgeModalProps> = ({
  school,
  isOpen,
  onClose,
  initialTab = 'news',
}) => {
  const [activeTab, setActiveTab] = useState<
    'news' | 'prashnotari' | 'janva_jevu' | 'abhivyakti' | 'suvichar' | 'presentation'
  >(initialTab);

  // Presentation ON/OFF state (persisted in localStorage)
  const [isPresentationEnabled, setIsPresentationEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vidyalayam_presentation_enabled');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const togglePresentation = () => {
    setIsPresentationEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vidyalayam_presentation_enabled', String(next));
      } catch {}
      if (!next && activeTab === 'presentation') {
        setActiveTab('news');
      }
      return next;
    });
  };

  useEffect(() => {
    if (isOpen && initialTab) {
      if (initialTab === 'presentation' && !isPresentationEnabled) {
        setActiveTab('news');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab, isPresentationEnabled]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-[#090c10] border border-[#E2E8F0] dark:border-white/15 shadow-2xl text-slate-800 dark:text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b border-[#E2E8F0] dark:border-white/10 bg-slate-50 dark:bg-[#121921] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FBE9DF] dark:bg-[#9d512d]/25 border border-[#C45A2D]/30 dark:border-[#9d512d]/40 flex items-center justify-center text-[#C45A2D] dark:text-[#f59c73] shrink-0">
              {activeTab === 'news' ? (
                <Newspaper className="w-5 h-5" />
              ) : activeTab === 'prashnotari' ? (
                <HelpCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              ) : activeTab === 'janva_jevu' ? (
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : activeTab === 'abhivyakti' ? (
                <Drama className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              ) : activeTab === 'presentation' ? (
                <Presentation className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>શાળા પ્રાર્થના સંમેલન & વિદ્યાર્થી જ્ઞાન</span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#a99f91]">
                <span>{school.schoolName}</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  દૈનિક સંસ્કાર & જ્ઞાન ધારા
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Presentation On/Off Switch in Header */}
            <button
              type="button"
              onClick={togglePresentation}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isPresentationEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/10'
              }`}
              title="પ્રેઝન્ટેશન ટેબ ચાલુ અથવા બંધ કરો"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>પ્રેઝન્ટેશન: {isPresentationEnabled ? 'ચાલુ (ON)' : 'બંધ (OFF)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-[#e4ded6] transition-colors cursor-pointer"
              title="બંધ કરો (Close)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation in Modal */}
        <div className="px-3 sm:px-5 pt-2.5 bg-slate-100/60 dark:bg-[#0c1218] border-b border-[#E2E8F0] dark:border-white/10 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'news'
                ? 'border-[#C45A2D] text-[#C45A2D] dark:border-[#9d512d] dark:text-[#f59c73]'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span>આજના સમાચાર (News)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prashnotari')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'prashnotari'
                ? 'border-sky-600 text-sky-700 dark:border-sky-500 dark:text-sky-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>પ્રશ્નોત્તરી (Q&A)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('janva_jevu')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'janva_jevu'
                ? 'border-amber-600 text-amber-700 dark:border-amber-500 dark:text-amber-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>જાણવા જેવું (12 Facts)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('abhivyakti')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'abhivyakti'
                ? 'border-purple-600 text-purple-700 dark:border-purple-500 dark:text-purple-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <Drama className="w-4 h-4" />
            <span>અભિવ્યક્તિ (Ideas)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suvichar')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'suvichar'
                ? 'border-[#C45A2D] text-[#C45A2D] dark:border-[#9d512d] dark:text-[#f59c73]'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>સુવિચાર (Values)</span>
          </button>

          {/* Presentation Tab (Shown when enabled, or with indicator if disabled) */}
          {isPresentationEnabled ? (
            <button
              type="button"
              onClick={() => setActiveTab('presentation')}
              className={`px-3 sm:px-4 py-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'presentation'
                  ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-[#a99f91] dark:hover:text-white'
              }`}
            >
              <Presentation className="w-4 h-4" />
              <span>🎤 પ્રેઝન્ટેશન (AI Presentation)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={togglePresentation}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap opacity-60 hover:opacity-100"
              title="પ્રેઝન્ટેશન ટેબ ચાલુ કરો"
            >
              <span>+ પ્રેઝન્ટેશન ચાલુ કરો</span>
            </button>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 mobile-table-scroll">
          {activeTab === 'news' && (
            <DailyNewsTab
              schoolName={school.schoolName}
              diseCode={school.diseCode}
              district={school.district}
              isSchoolView
            />
          )}

          {activeTab === 'prashnotari' && (
            <DailyPrashnotariTab
              schoolName={school.schoolName}
              diseCode={school.diseCode}
              district={school.district}
              isSchoolView
            />
          )}

          {activeTab === 'janva_jevu' && (
            <DailyJanvaJevuTab
              schoolName={school.schoolName}
              diseCode={school.diseCode}
              district={school.district}
              isSchoolView
            />
          )}

          {activeTab === 'abhivyakti' && (
            <DailyAbhivyaktiTab
              schoolName={school.schoolName}
              diseCode={school.diseCode}
              district={school.district}
              isSchoolView
            />
          )}

          {activeTab === 'suvichar' && (
            <DailySuvicharTab
              schoolName={school.schoolName}
              diseCode={school.diseCode}
              district={school.district}
              isSchoolView
            />
          )}

          {activeTab === 'presentation' && isPresentationEnabled && (
            <DailyPresentationTab
              schoolName={school.schoolName}
              diseCode={school.diseCode}
              district={school.district}
              isSchoolView
              onToggleEnabled={togglePresentation}
            />
          )}
        </div>
      </div>
    </div>
  );
};
