import React, { useState } from 'react';
import { Calendar, Check, X, Printer, Sparkles, Clock } from 'lucide-react';

interface PrintDatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  initialDate: string;
  examScheduledDate?: string;
  onConfirm: (dateToPrint: string) => void;
  actionType?: 'print' | 'download';
}

export const PrintDatePromptModal: React.FC<PrintDatePromptModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = 'પેપર / OMR પર છાપવા માટે તારીખ પસંદ કરો',
  initialDate,
  examScheduledDate,
  onConfirm,
  actionType = 'print',
}) => {
  // Format today's date in DD-MM-YYYY and YYYY-MM-DD
  const getTodayFormatted = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const [dateInput, setDateInput] = useState<string>(() => {
    if (initialDate && initialDate.trim()) return initialDate.trim();
    if (examScheduledDate && examScheduledDate.trim()) return examScheduledDate.trim();
    return getTodayFormatted();
  });

  if (!isOpen) return null;

  const handleSetToday = () => {
    setDateInput(getTodayFormatted());
  };

  const handleSetExamDate = () => {
    if (examScheduledDate && examScheduledDate.trim()) {
      setDateInput(examScheduledDate.trim());
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDate = dateInput.trim() || getTodayFormatted();
    onConfirm(finalDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-800 dark:text-[#e4ded6]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              પેપર / OMR પર છપાનારી તારીખ (Print Date):
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                placeholder="દા.ત. 29-10-2026 અથવા 29/10/2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-inner"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              અહીં તમે જે તારીખ લખશો તે જ તારીખ હેડરમાં દેખાશે (પરીક્ષા લીધેલ મૂળ તારીખ નહીં દેખાય).
            </p>
          </div>

          {/* Quick Date Shortcuts */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">ઝડપી પસંદગી:</span>
            <button
              type="button"
              onClick={handleSetToday}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-transparent flex items-center gap-1"
            >
              <Clock className="w-3 h-3 text-amber-500" />
              <span>આજની તારીખ ({getTodayFormatted()})</span>
            </button>

            {examScheduledDate && (
              <button
                type="button"
                onClick={handleSetExamDate}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-transparent"
              >
                <span>પરીક્ષા તારીખ ({examScheduledDate})</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
            >
              રદ કરો
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 active:scale-95 text-white text-xs font-bold shadow-md shadow-amber-900/20 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {actionType === 'print' ? (
                <>
                  <Printer className="w-4 h-4" />
                  <span>આ તારીખ સાથે પ્રિન્ટ / PDF કરો</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>આ તારીખ સાથે ડાઉનલોડ કરો</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
