import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calendar,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { haptic } from '../utils/haptics';
import { toGujaratiDigits } from '../services/dailyKnowledgeService';

export interface IosDatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  value?: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  title?: string;
  minDate?: string;
  maxDate?: string;
  quickYearsPresets?: boolean; // For DOB, shows -5, -10, -15 years
}

const GUJARATI_MONTHS = [
  { num: 1, name: 'જાન્યુઆરી (Jan)' },
  { num: 2, name: 'ફેબ્રુઆરી (Feb)' },
  { num: 3, name: 'માર્ચ (Mar)' },
  { num: 4, name: 'એપ્રિલ (Apr)' },
  { num: 5, name: 'મે (May)' },
  { num: 6, name: 'જૂન (Jun)' },
  { num: 7, name: 'જુલાઈ (Jul)' },
  { num: 8, name: 'ઓગસ્ટ (Aug)' },
  { num: 9, name: 'સપ્ટેમ્બર (Sep)' },
  { num: 10, name: 'ઓક્ટોબર (Oct)' },
  { num: 11, name: 'નવેમ્બર (Nov)' },
  { num: 12, name: 'ડિસેમ્બર (Dec)' },
];

const ITEM_HEIGHT = 44; // Height of each wheel item in px
const VISIBLE_ITEMS = 5; // Total visible rows (odd number, center is selected)

/**
 * Calculates max days in a specific month & year
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Individual Cupertino Drum Wheel Column with Mouse & Touch drag support
 */
interface WheelColumnProps {
  items: { label: string; value: number }[];
  selectedValue: number;
  onSelect: (value: number) => void;
  width?: string;
}

const CupertinoWheelColumn: React.FC<WheelColumnProps> = ({
  items,
  selectedValue,
  onSelect,
  width = 'w-full',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);
  const lastIndexRef = useRef<number>(-1);

  // Drag physics state
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startScrollTopRef = useRef(0);

  const selectedIndex = items.findIndex((item) => item.value === selectedValue);

  // Sync scroll position with selectedIndex
  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current && !isDraggingRef.current) {
      const targetTop = selectedIndex * ITEM_HEIGHT;
      if (Math.abs(containerRef.current.scrollTop - targetTop) > 2) {
        containerRef.current.scrollTo({
          top: targetTop,
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  // Handle user scroll and snap
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    isScrollingRef.current = true;

    const scrollTop = containerRef.current.scrollTop;
    const currentIndex = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, currentIndex));

    // Fire tactile micro-haptic tick when crossing items
    if (lastIndexRef.current !== clampedIndex) {
      lastIndexRef.current = clampedIndex;
      haptic.tick();
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (items[clampedIndex] && items[clampedIndex].value !== selectedValue) {
        onSelect(items[clampedIndex].value);
      }
      // Snap exactly to position
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: clampedIndex * ITEM_HEIGHT,
          behavior: 'smooth',
        });
      }
    }, 120);
  }, [items, selectedValue, onSelect]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startScrollTopRef.current = containerRef.current?.scrollTop || 0;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    containerRef.current.scrollTop = startScrollTopRef.current + deltaY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore
    }
    handleScroll();
  };

  const handleStep = (direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? selectedIndex - 1 : selectedIndex + 1;
    if (nextIndex >= 0 && nextIndex < items.length) {
      haptic.tick();
      onSelect(items[nextIndex].value);
    }
  };

  return (
    <div className={`relative flex flex-col items-center ${width} select-none`}>
      {/* Step up button */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => handleStep('up')}
        disabled={selectedIndex <= 0}
        className="w-full py-1 flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
        aria-label="Previous"
      >
        <ChevronUp className="w-4 h-4" />
      </button>

      {/* Drum cylinder container */}
      <div
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
        style={{ height: `${ITEM_HEIGHT * VISIBLE_ITEMS}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Top & bottom 3D fading masks for authentic iOS cylindrical illusion */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white via-white/80 to-transparent dark:from-[#1c1c1e] dark:via-[#1c1c1e]/80 pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-[#1c1c1e] dark:via-[#1c1c1e]/80 pointer-events-none z-10" />

        {/* Central Selection Highlight Glass Lens */}
        <div
          className="absolute inset-x-1.5 rounded-xl border-y border-stone-300 dark:border-white/20 bg-black/5 dark:bg-white/10 pointer-events-none z-0 shadow-inner"
          style={{
            top: `${ITEM_HEIGHT * 2}px`,
            height: `${ITEM_HEIGHT}px`,
          }}
        />

        {/* Scrollable list */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-auto no-scrollbar scroll-smooth"
          style={{
            paddingTop: `${ITEM_HEIGHT * 2}px`,
            paddingBottom: `${ITEM_HEIGHT * 2}px`,
          }}
        >
          {items.map((item, idx) => {
            const distance = Math.abs(idx - selectedIndex);
            const isSelected = distance === 0;

            // 3D perspective styling
            let opacity = 1;
            let scale = 1;
            if (distance === 1) {
              opacity = 0.55;
              scale = 0.92;
            } else if (distance >= 2) {
              opacity = 0.22;
              scale = 0.82;
            }

            return (
              <div
                key={item.value}
                onClick={() => {
                  haptic.tick();
                  onSelect(item.value);
                }}
                className={`flex items-center justify-center cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'font-bold text-stone-900 dark:text-white text-base tracking-wide'
                    : 'text-stone-600 dark:text-stone-400 text-sm font-medium'
                }`}
                style={{
                  height: `${ITEM_HEIGHT}px`,
                  opacity,
                  transform: `scale(${scale})`,
                }}
              >
                <span className="truncate px-2 text-center">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step down button */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => handleStep('down')}
        disabled={selectedIndex >= items.length - 1}
        className="w-full py-1 flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
        aria-label="Next"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
};

export const IosDatePickerModal: React.FC<IosDatePickerProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  title = 'તારીખ પસંદ કરો (Select Date)',
  minDate,
  maxDate,
  quickYearsPresets = true,
}) => {
  // Parse initial or current date
  const parseDate = (val?: string) => {
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const parts = val.split('-').map(Number);
      return { year: parts[0], month: parts[1], day: parts[2] };
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
  };

  const initial = parseDate(value);
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [selectedMonth, setSelectedMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);

  // Manual typing mode inside modal
  const [isManualEditing, setIsManualEditing] = useState(false);
  const [manualText, setManualText] = useState('');

  // Sync state when modal opens or value changes
  useEffect(() => {
    if (isOpen) {
      const current = parseDate(value);
      setSelectedYear(current.year);
      setSelectedMonth(current.month);
      setSelectedDay(current.day);
      setIsManualEditing(false);
      haptic.light();
    }
  }, [isOpen, value]);

  // Adjust day if selectedDay exceeds days in current month
  useEffect(() => {
    const maxDays = getDaysInMonth(selectedYear, selectedMonth);
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  }, [selectedYear, selectedMonth, selectedDay]);

  if (!isOpen) return null;

  // Generate wheel arrays
  const maxDays = getDaysInMonth(selectedYear, selectedMonth);
  const dayItems = Array.from({ length: maxDays }, (_, i) => ({
    label: `${toGujaratiDigits(i + 1)} (${String(i + 1).padStart(2, '0')})`,
    value: i + 1,
  }));

  const monthItems = GUJARATI_MONTHS.map((m) => ({
    label: `${toGujaratiDigits(m.num)} - ${m.name}`,
    value: m.num,
  }));

  // Year range: default 1945 to 2035
  const minYear = minDate ? parseInt(minDate.split('-')[0], 10) : 1945;
  const maxYear = maxDate ? parseInt(maxDate.split('-')[0], 10) : 2035;
  const yearItems = Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
    const yr = minYear + i;
    return {
      label: `${toGujaratiDigits(yr)} (${yr})`,
      value: yr,
    };
  });

  const formattedResult = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const displayFormattedGujarati = `${toGujaratiDigits(selectedDay)}/${toGujaratiDigits(selectedMonth)}/${toGujaratiDigits(selectedYear)}`;
  const displayStandardEnglish = `${String(selectedDay).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`;

  const handleConfirm = () => {
    haptic.success();
    onChange(formattedResult);
    onClose();
  };

  const handleCancel = () => {
    haptic.light();
    onClose();
  };

  const handleQuickPreset = (offsetYears: number, isToday = false) => {
    haptic.medium();
    const target = new Date();
    if (isToday) {
      setSelectedYear(target.getFullYear());
      setSelectedMonth(target.getMonth() + 1);
      setSelectedDay(target.getDate());
    } else {
      target.setFullYear(target.getFullYear() + offsetYears);
      setSelectedYear(target.getFullYear());
    }
  };

  const handleDecadeJump = (decadeStart: number) => {
    haptic.tick();
    setSelectedYear(decadeStart);
  };

  const handleManualTextChange = (text: string) => {
    // Auto-insert slashes
    const cleaned = text.replace(/[^\d/]/g, '');
    let formatted = cleaned;
    if (cleaned.length === 2 && !cleaned.includes('/')) {
      formatted = `${cleaned}/`;
    } else if (cleaned.length === 5 && cleaned.split('/').length === 2) {
      formatted = `${cleaned}/`;
    }
    setManualText(formatted);

    // If complete DD/MM/YYYY entered
    const match = formatted.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      if (m >= 1 && m <= 12 && y >= 1900 && y <= 2099) {
        const maxD = getDaysInMonth(y, m);
        if (d >= 1 && d <= maxD) {
          setSelectedYear(y);
          setSelectedMonth(m);
          setSelectedDay(d);
          haptic.success();
        }
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleCancel}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#E2E8F0] dark:border-white/10 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Grabber on mobile */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* iOS Navigation Header */}
        <div className="px-5 py-3 border-b border-[#E2E8F0] dark:border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-stone-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            રદ કરો (Cancel)
          </button>

          <div className="text-center">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-[#a99f91] uppercase tracking-wider">
              {title}
            </h3>
            {isManualEditing ? (
              <input
                type="text"
                autoFocus
                value={manualText}
                onChange={(e) => handleManualTextChange(e.target.value)}
                placeholder="DD/MM/YYYY"
                maxLength={10}
                className="w-28 text-center text-xs font-mono font-bold px-2 py-0.5 rounded border border-[#C45A2D] bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white"
              />
            ) : (
              <div
                onClick={() => {
                  haptic.light();
                  setManualText(displayStandardEnglish);
                  setIsManualEditing(true);
                }}
                className="text-sm font-black text-[#C45A2D] dark:text-[#f59c73] flex items-center justify-center gap-1 cursor-pointer hover:underline"
                title="તારીખ લખવા માટે ક્લિક કરો"
              >
                <span>{displayFormattedGujarati}</span>
                <Edit3 className="w-3 h-3 text-slate-400" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="text-sm font-bold text-[#C45A2D] dark:text-[#f59c73] hover:underline cursor-pointer"
          >
            પૂર્ણ (Done)
          </button>
        </div>

        {/* Cupertino 3-Wheel Drum Picker */}
        <div className="p-4 grid grid-cols-12 gap-1.5 items-center bg-slate-50/70 dark:bg-black/20">
          {/* Day Wheel */}
          <div className="col-span-3 sm:col-span-3">
            <div className="text-[10px] font-bold text-center text-slate-400 uppercase mb-1">
              દિવસ (Day)
            </div>
            <CupertinoWheelColumn
              items={dayItems}
              selectedValue={selectedDay}
              onSelect={setSelectedDay}
            />
          </div>

          {/* Month Wheel */}
          <div className="col-span-5 sm:col-span-5">
            <div className="text-[10px] font-bold text-center text-slate-400 uppercase mb-1">
              મહિનો (Month)
            </div>
            <CupertinoWheelColumn
              items={monthItems}
              selectedValue={selectedMonth}
              onSelect={setSelectedMonth}
            />
          </div>

          {/* Year Wheel */}
          <div className="col-span-4 sm:col-span-4">
            <div className="text-[10px] font-bold text-center text-slate-400 uppercase mb-1">
              વર્ષ (Year)
            </div>
            <CupertinoWheelColumn
              items={yearItems}
              selectedValue={selectedYear}
              onSelect={setSelectedYear}
            />
          </div>
        </div>

        {/* Decade Quick Jump Selector (Fast Year Scrolling) */}
        <div className="px-4 py-2 border-t border-[#E2E8F0] dark:border-white/10 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar bg-slate-100/70 dark:bg-black/40 text-[11px]">
          <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">દાયકો:</span>
          {[1970, 1980, 1990, 2000, 2010, 2020].map((dec) => {
            const isCurrentDecade = selectedYear >= dec && selectedYear < dec + 10;
            return (
              <button
                key={dec}
                type="button"
                onClick={() => handleDecadeJump(dec + 5)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  isCurrentDecade
                    ? 'bg-[#C45A2D] text-white shadow-xs dark:bg-[#9d512d]'
                    : 'bg-white dark:bg-white/10 text-slate-600 dark:text-stone-300 hover:bg-slate-200 dark:hover:bg-white/20'
                }`}
              >
                {dec}s
              </button>
            );
          })}
        </div>

        {/* Quick Presets / Shortcuts */}
        <div className="px-4 py-3 border-t border-[#E2E8F0] dark:border-white/10 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar bg-white dark:bg-[#1c1c1e]">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickPreset(0, true)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-[#C45A2D] hover:text-white text-slate-700 dark:text-stone-300 font-bold transition-all text-xs cursor-pointer"
            >
              આજે (Today)
            </button>

            {quickYearsPresets && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y - 5)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-stone-300 font-semibold transition-all text-xs cursor-pointer"
                  title="5 વર્ષ પાછળ"
                >
                  -૫ વર્ષ
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y - 10)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-stone-300 font-semibold transition-all text-xs cursor-pointer"
                  title="10 વર્ષ પાછળ (વિદ્યાર્થી DOB)"
                >
                  -૧૦ વર્ષ
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y - 15)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-stone-300 font-semibold transition-all text-xs cursor-pointer"
                  title="15 વર્ષ પાછળ"
                >
                  -૧૫ વર્ષ
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded-xl bg-[#C45A2D] hover:bg-[#A8481F] dark:bg-[#9d512d] dark:hover:bg-[#b55f37] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>પસંદ કરો</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * iPhone-like Universal Date Input Component
 * Supports both typing (writing) and clicking to open the authentic Cupertino drum picker
 */
export interface IosDateInputProps {
  value?: string; // YYYY-MM-DD
  onChange: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  id?: string;
  quickYearsPresets?: boolean;
}

export const IosDateInput: React.FC<IosDateInputProps> = ({
  value = '',
  onChange,
  name,
  placeholder = 'DD/MM/YYYY (દા.ત. 15/08/2012)',
  min,
  max,
  required = false,
  disabled = false,
  className = '',
  label,
  id,
  quickYearsPresets = true,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [typedText, setTypedText] = useState('');

  // Format date display for presentation
  const toDisplay = (val?: string) => {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return '';
    const parts = val.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Sync internal text with incoming value
  useEffect(() => {
    setTypedText(toDisplay(value));
  }, [value]);

  const handleOpenPicker = () => {
    if (disabled) return;
    haptic.light();
    setPickerOpen(true);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.light();
    setTypedText('');
    onChange({ target: { value: '', name } });
  };

  // When user writes/types the date directly
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow numbers and slashes
    const cleaned = raw.replace(/[^\d/]/g, '');
    let formatted = cleaned;

    // Auto add slash after day and month
    if (cleaned.length === 2 && !cleaned.includes('/')) {
      formatted = `${cleaned}/`;
    } else if (cleaned.length === 5 && cleaned.split('/').length === 2) {
      formatted = `${cleaned}/`;
    }

    setTypedText(formatted);

    // If valid DD/MM/YYYY
    const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const d = match[1];
      const m = match[2];
      const y = match[3];
      const dayNum = parseInt(d, 10);
      const monthNum = parseInt(m, 10);
      const yearNum = parseInt(y, 10);
      if (monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2099) {
        const maxD = getDaysInMonth(yearNum, monthNum);
        if (dayNum >= 1 && dayNum <= maxD) {
          haptic.tick();
          onChange({ target: { value: `${y}-${m}-${d}`, name } });
        }
      }
    } else if (formatted === '') {
      onChange({ target: { value: '', name } });
    }
  };

  return (
    <div className="relative w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
        >
          {label} {required && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}

      <div
        className={`group relative flex items-center justify-between transition-all ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        } ${className || 'w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white'}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleOpenPicker}
            disabled={disabled}
            className="text-[#C45A2D] dark:text-[#f59c73] hover:scale-110 transition-transform cursor-pointer shrink-0"
            title="iPhone કેલેન્ડર વ્હીલ ડ્રમ ખોલો"
          >
            <Calendar className="w-4 h-4" />
          </button>

          {/* User can directly write / type the date */}
          <input
            id={id}
            name={name}
            type="text"
            disabled={disabled}
            required={required}
            value={typedText}
            onChange={handleInputChange}
            onClick={() => {
              // If empty, open picker to assist
              if (!typedText) {
                handleOpenPicker();
              }
            }}
            placeholder={placeholder}
            maxLength={10}
            className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-mono text-xs sm:text-sm font-semibold placeholder:text-stone-400 dark:placeholder:text-stone-500 placeholder:font-sans placeholder:font-normal"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {typedText && !disabled && !required && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="તારીખ સાફ કરો"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Calendar picker trigger button */}
          <button
            type="button"
            onClick={handleOpenPicker}
            disabled={disabled}
            className="p-1 rounded-md text-slate-400 hover:text-[#C45A2D] dark:hover:text-[#f59c73] transition-colors cursor-pointer"
            title="કેલેન્ડર ખોલો"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iPhone Cupertino Drum Modal */}
      <IosDatePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={value}
        onChange={(newDate) => {
          onChange({ target: { value: newDate, name } });
        }}
        title={label || 'તારીખ પસંદ કરો'}
        minDate={min}
        maxDate={max}
        quickYearsPresets={quickYearsPresets}
      />
    </div>
  );
};
