import React, { useState, useEffect } from 'react';
import {
  X,
  Newspaper,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { School } from '../types';
import { DailyNewsTab } from './DailyNewsTab';
import { DailyJanvaJevuTab } from './DailyJanvaJevuTab';
import { DailySuvicharTab } from './DailySuvicharTab';

interface DailyKnowledgeModalProps {
  school: School;
  isOpen: boolean;
  onClose: () => void;
  onSchoolUpdated?: (updated: Partial<School>) => void;
  initialTab?: 'news' | 'janva_jevu' | 'suvichar';
}

export const DailyKnowledgeModal: React.FC<DailyKnowledgeModalProps> = ({
  school,
  isOpen,
  onClose,
  initialTab = 'news',
}) => {
  const [activeTab, setActiveTab] = useState<'news' | 'janva_jevu' | 'suvichar'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#090c10] border border-white/15 shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#121921] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9d512d]/25 border border-[#9d512d]/40 flex items-center justify-center text-[#f59c73]">
              {activeTab === 'news' ? (
                <Newspaper className="w-5 h-5" />
              ) : activeTab === 'janva_jevu' ? (
                <Lightbulb className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>શાળા પ્રાર્થના સંમેલન & વિદ્યાર્થી પોર્ટલ જ્ઞાન</span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#a99f91]">
                <span>{school.schoolName}</span>
                {/* Clear status badge showing student visibility */}
                {activeTab === 'news' && (
                  school.dailyNewsEnabled === false ? (
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                      વિદ્યાર્થીઓ માટે: બંધ (OFF)
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      વિદ્યાર્થીઓ માટે: ચાલુ (ON)
                    </span>
                  )
                )}
                {activeTab === 'janva_jevu' && (
                  school.dailyJanvaJevuEnabled === false ? (
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                      વિદ્યાર્થીઓ માટે: બંધ (OFF)
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      વિદ્યાર્થીઓ માટે: ચાલુ (ON)
                    </span>
                  )
                )}
                {activeTab === 'suvichar' && (
                  school.dailySuvicharEnabled === false ? (
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                      વિદ્યાર્થીઓ માટે: બંધ (OFF)
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      વિદ્યાર્થીઓ માટે: ચાલુ (ON)
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#e4ded6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation in Modal */}
        <div className="px-5 pt-3 bg-[#0c1218] border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'news'
                ? 'border-[#9d512d] text-[#f59c73]'
                : 'border-transparent text-[#a99f91] hover:text-white'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span>આજના સમાચાર (Daily News)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('janva_jevu')}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'janva_jevu'
                ? 'border-[#9d512d] text-[#f59c73]'
                : 'border-transparent text-[#a99f91] hover:text-white'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>આજનું જાણવા જેવું (Daily GK)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suvichar')}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'suvichar'
                ? 'border-[#9d512d] text-[#f59c73]'
                : 'border-transparent text-[#a99f91] hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>આજનો સુવિચાર (Daily Suvichar)</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 mobile-table-scroll">
          {activeTab === 'news' && (
            <DailyNewsTab
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

          {activeTab === 'suvichar' && (
            <DailySuvicharTab
              schoolName={school.schoolName}
              diseCode={school.diseCode}
              district={school.district}
              isSchoolView
            />
          )}
        </div>
      </div>
    </div>
  );
};
