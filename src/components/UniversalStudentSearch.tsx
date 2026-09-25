import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Phone,
  User,
  MessageSquare,
  X,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';
import { School, Student } from '../types';
import { StudentProfileModal } from './StudentProfileModal';
import { printStudentIdCards } from '../utils/idCardPdf';
import { ActiveTabType } from './Navbar';

interface UniversalStudentSearchProps {
  students: Student[];
  school: School;
  onNavigate?: (tab: ActiveTabType) => void;
  onStudentUpdated?: (updatedStudent: Student) => void;
}

// Convert Gujarati digits to English digits
const toEnglishDigits = (str: string) => {
  const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  return str.replace(/[૦-૯]/g, (d) => String(gujDigits.indexOf(d)));
};

// Convert English digits to Gujarati digits
const toGujaratiDigits = (str: string) => {
  const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  return str.replace(/[0-9]/g, (d) => gujDigits[parseInt(d, 10)]);
};

// Fast Levenshtein distance calculation for typo tolerance
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const m = a.length;
  const n = b.length;
  const dp: number[] = new Array(n + 1);

  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    const aChar = a.charCodeAt(i - 1);

    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      if (aChar === b.charCodeAt(j - 1)) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }

  return dp[n];
};

// Normalize Gujarati phonetics (converts ી->િ, ૂ->ુ, ષ/શ->સ, removes anusvara/nukta)
const normalizeGujaratiPhonetics = (str: string): string => {
  return str
    .replace(/ી/g, 'િ')
    .replace(/ૂ/g, 'ુ')
    .replace(/[ષશ]/g, 'સ')
    .replace(/ં/g, '')
    .replace(/઼/g, '');
};

// Normalize string for loose matching
const normalizeStr = (val?: any) => {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase();
};

const getClean10Phone = (phone?: string) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return (name.trim().charAt(0) || 'V').toUpperCase();
};

const isGirlGender = (gender?: string) => {
  if (!gender) return false;
  const g = gender.trim().toLowerCase();
  return g === 'girl' || g === 'female' || g === 'f' || g === 'કન્યા' || g === 'છોકરી' || g === 'સ્ત્રી';
};

interface SearchMatchItem {
  student: Student;
  score: number;
  fuzzyHint?: string;
  isFuzzy: boolean;
}

export const UniversalStudentSearch: React.FC<UniversalStudentSearchProps> = ({
  students,
  school,
  onNavigate,
  onStudentUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(5);

  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' or 'Ctrl+K' to quickly focus search, Escape to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Reset display limit to 5 whenever query changes
  useEffect(() => {
    setDisplayLimit(5);
  }, [searchQuery]);

  // Strict check: RESULTS SHOW ONLY WHEN AT LEAST 1 CHARACTER IS TYPED
  const trimmedQuery = searchQuery.trim();
  const isSearchActive = trimmedQuery.length >= 1;

  // Universal multi-token matching: High-Precision Two-Pass Search
  const searchResults: SearchMatchItem[] = useMemo(() => {
    if (!isSearchActive) return [];

    const queryEng = toEnglishDigits(trimmedQuery).toLowerCase();
    const tokens = queryEng.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];

    // =========================================================================
    // PASS 1: DIRECT EXACT & SUBSTRING MATCH (HIGH-PRECISION)
    // If ANY exact match exists (e.g. "Harsh"), return ONLY exact matches!
    // =========================================================================
    const exactMatches: SearchMatchItem[] = [];

    students.forEach((s) => {
      const stdStr = String(s.standard || '').replace(/^class\s*/i, '').trim();

      const combinedDetails = [
        s.studentName,
        s.rollNumber,
        toGujaratiDigits(String(s.rollNumber || '')),
        s.grNumber,
        toGujaratiDigits(String(s.grNumber || '')),
        `ધોરણ ${stdStr}`,
        `ધો. ${stdStr}`,
        `std ${stdStr}`,
        `class ${stdStr}`,
        stdStr,
        s.section,
        s.division,
        s.contactNumber,
        s.mobileNumber,
        s.fatherName,
        s.motherName,
        s.address,
        (s as any).village,
        (s as any).taluka,
        s.dob,
        s.doa,
        s.gender,
        s.caste,
        s.bloodGroup,
        s.diseCode,
        s.aadhaarNo,
        s.studentStateCode,
        s.studentId,
        s.placeOfBirth,
        s.fatherOccupation,
        s.motherOccupation,
      ]
        .map(normalizeStr)
        .join(' ');

      const combinedDetailsGuj = toGujaratiDigits(combinedDetails);
      const combinedDetailsNorm = normalizeGujaratiPhonetics(combinedDetails);

      const allTokensDirect = tokens.every((token) => {
        const tokenGuj = toGujaratiDigits(token);
        const tokenNorm = normalizeGujaratiPhonetics(token);
        return (
          combinedDetails.includes(token) ||
          combinedDetailsGuj.includes(tokenGuj) ||
          (tokenNorm.length >= 2 && combinedDetailsNorm.includes(tokenNorm))
        );
      });

      if (allTokensDirect) {
        let score = 100;
        // Boost priority if match is directly in student name
        if (tokens.every((t) => s.studentName.toLowerCase().includes(t))) {
          score = 200;
        }
        exactMatches.push({
          student: s,
          score,
          isFuzzy: false,
        });
      }
    });

    // If exact matches exist, RETURN ONLY EXACT MATCHES!
    // This stops irrelevant results from appearing when an exact match is present!
    if (exactMatches.length > 0) {
      return exactMatches.sort((a, b) => b.score - a.score);
    }

    // =========================================================================
    // PASS 2: TYPO-TOLERANT FALLBACK (ONLY IF ZERO EXACT MATCHES IN ENTIRE SCHOOL)
    // Only triggers when user actually mistyped (e.g. "Hars" or "Ptel" or "Solnki")!
    // =========================================================================
    const typoMatches: SearchMatchItem[] = [];

    students.forEach((s) => {
      const words = [
        s.studentName,
        s.fatherName,
        s.motherName,
        s.address,
        (s as any).village,
        s.caste,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .split(/[\s,.-]+/)
        .filter((w) => w.length >= 3);

      let allTokensFuzzyMatched = true;
      let matchedWordHint: string | undefined = undefined;
      let totalScore = 0;

      for (const token of tokens) {
        if (token.length < 3) {
          allTokensFuzzyMatched = false;
          break;
        }

        let tokenFound = false;
        // Strictly allow only 1 edit distance, and word length must be very close (+/- 1)
        const maxDist = token.length <= 5 ? 1 : 2;

        for (const word of words) {
          if (Math.abs(word.length - token.length) <= 1) {
            const dist = levenshtein(token, word);
            if (dist <= maxDist) {
              tokenFound = true;
              totalScore += (80 - dist * 15);
              matchedWordHint = word;
              break;
            }
          }
        }

        if (!tokenFound) {
          allTokensFuzzyMatched = false;
          break;
        }
      }

      if (allTokensFuzzyMatched && matchedWordHint) {
        typoMatches.push({
          student: s,
          score: totalScore,
          fuzzyHint: matchedWordHint,
          isFuzzy: true,
        });
      }
    });

    return typoMatches.sort((a, b) => b.score - a.score);
  }, [students, trimmedQuery, isSearchActive]);

  // Copy phone handler
  const handleCopyPhone = (studentId: string, phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(studentId);
    setTimeout(() => {
      setCopiedPhoneId(null);
    }, 2000);
  };

  // Build WhatsApp pre-filled link
  const buildWhatsAppLink = (student: Student, cleanPhone: string) => {
    if (!cleanPhone) return '#';
    const std = student.standard || '';
    const sec = student.section || student.division ? `-${student.section || student.division}` : '';
    const roll = student.rollNumber ? `, રોલ નં: ${student.rollNumber}` : '';
    const text = `નમસ્તે વાલીશ્રી, ${school.schoolName} તરફથી આપના પાલ્ય ${student.studentName} (ધોરણ ${std}${sec}${roll}) સંદર્ભે સંદેશ.`;
    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  // Helper to determine why a student matched if it's from a non-obvious secondary field
  const getMatchHighlight = (student: Student) => {
    const q = trimmedQuery.toLowerCase();
    if (!q) return null;

    if (student.fatherName && normalizeStr(student.fatherName).includes(q)) {
      return `પિતા: ${student.fatherName}`;
    }
    if (student.address && normalizeStr(student.address).includes(q)) {
      return `સરનામું: ${student.address}`;
    }
    if (student.bloodGroup && normalizeStr(student.bloodGroup).includes(q)) {
      return `બ્લડ ગ્રૂપ: ${student.bloodGroup}`;
    }
    if (student.dob && normalizeStr(student.dob).includes(q)) {
      return `જન્મ તારીખ: ${student.dob}`;
    }
    if (student.caste && normalizeStr(student.caste).includes(q)) {
      return `જાતિ/કેટેગરી: ${student.caste}`;
    }
    if (student.motherName && normalizeStr(student.motherName).includes(q)) {
      return `માતા: ${student.motherName}`;
    }
    if (student.aadhaarNo && normalizeStr(student.aadhaarNo).includes(q)) {
      return `આધાર: ${student.aadhaarNo}`;
    }
    return null;
  };

  const displayedResults = searchResults.slice(0, displayLimit);
  const hasMore = searchResults.length > displayLimit;

  return (
    <div className="space-y-3">
      {/* =========================================================================
          COMPACT SEARCH BAR ONLY (NO SURROUNDING LABELS/HEADERS/DESCRIPTIONS)
          Takes minimal vertical space as requested
          ========================================================================= */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-stone-400 dark:text-[#a99f91]">
          <Search className="w-4 h-4 text-[#9d512d] dark:text-[#f59c73]" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="વિદ્યાર્થી શોધો (નામ, રોલ નં, GR નં, ધોરણ, મોબાઈલ કે કોઈપણ વિગત લખો...)"
          className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-2xl bg-white/90 dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] placeholder-stone-400 dark:placeholder-stone-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#9d512d] focus:border-transparent transition-all shadow-xs"
        />

        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-white/10 text-stone-400 dark:text-[#a99f91] hover:text-stone-700 dark:hover:text-white transition-all cursor-pointer"
            title="શોધ સાફ કરો"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* =========================================================================
          RESULTS SECTION: ONLY SHOWN WHEN USER TYPES AT LEAST 1 LETTER
          High-Precision Results (No irrelevant fuzzy spam)
          ========================================================================= */}
      {isSearchActive && (
        <div className="space-y-2.5 animate-fadeIn pt-1">
          {/* Results Summary Bar */}
          <div className="flex items-center justify-between px-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-stone-800 dark:text-[#e4ded6]">
                શોધ પરિણામ:
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-mono font-bold">
                {searchResults.length} વિદ્યાર્થી મળ્યા
              </span>
              <span className="text-stone-500 dark:text-[#a99f91] truncate max-w-[180px]">
                &quot;{trimmedQuery}&quot;
              </span>
              {searchResults.some((r) => r.isFuzzy) && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  <Sparkles className="w-3 h-3" />
                  <span>સ્પેલિંગ સુધારણા</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>પરિણામ બંધ કરો</span>
            </button>
          </div>

          {/* Cards List */}
          {searchResults.length === 0 ? (
            <div className="glass-card rounded-2xl border border-dashed border-stone-300 dark:border-white/15 p-4 sm:p-5 text-center space-y-1">
              <p className="text-sm font-bold text-stone-800 dark:text-[#e4ded6]">
                &quot;{trimmedQuery}&quot; સાથે મેળ ખાતા કોઈ વિદ્યાર્થી મળ્યા નથી
              </p>
              <p className="text-xs text-stone-500 dark:text-[#a99f91]">
                નામ, રોલ નં, GR નં, ધોરણ અથવા મોબાઈલ બદલીને પુનઃ પ્રયત્ન કરો.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedResults.map(({ student: st, fuzzyHint, isFuzzy }) => {
                const rawPhone = st.contactNumber || st.mobileNumber || '';
                const cleanPhone = getClean10Phone(rawPhone);
                const isGirl = isGirlGender(st.gender);
                const extraHighlight = getMatchHighlight(st);
                const whatsAppLink = buildWhatsAppLink(st, cleanPhone);

                return (
                  <div
                    key={st.id}
                    className="glass-card rounded-2xl border border-stone-200 dark:border-white/10 p-3 sm:p-3.5 hover:border-[#9d512d]/50 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                  >
                    {/* LEFT / MAIN: Student Information */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Avatar with Standard Badge */}
                      <div className="relative shrink-0">
                        {st.photoUrl ? (
                          <img
                            src={st.photoUrl}
                            alt={st.studentName}
                            className="w-11 h-11 rounded-xl object-cover border-2 border-[#9d512d]/40 shadow-xs"
                          />
                        ) : (
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs border-2 shadow-xs ${
                              isGirl
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                                : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                            }`}
                          >
                            {getInitials(st.studentName)}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.2 rounded-full border shadow-xs ${
                            isGirl
                              ? 'bg-rose-600 text-white border-white dark:border-slate-900'
                              : 'bg-blue-600 text-white border-white dark:border-slate-900'
                          }`}
                          title={`ધોરણ ${st.standard}`}
                        >
                          {st.standard}
                        </span>
                      </div>

                      {/* Name & Chips */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            onClick={() => setSelectedStudentForProfile(st)}
                            className="text-sm sm:text-base font-bold text-stone-900 dark:text-[#e4ded6] hover:text-[#9d512d] dark:hover:text-[#f59c73] transition-colors truncate cursor-pointer"
                            title="પ્રોફાઇલ ખોલવા માટે ક્લિક કરો"
                          >
                            {st.studentName}
                          </h4>
                          {st.gender && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                isGirl
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20'
                                  : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20'
                              }`}
                            >
                              {st.gender}
                            </span>
                          )}
                        </div>

                        {/* Meta Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                          {/* Standard & Division */}
                          <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-800 dark:bg-white/5 dark:text-[#e4ded6] border border-stone-200 dark:border-white/10 font-bold">
                            ધોરણ {st.standard}
                            {st.section || st.division ? ` (${st.section || st.division})` : ''}
                          </span>

                          {/* Roll Number */}
                          {st.rollNumber && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-mono font-bold">
                              રોલ #{st.rollNumber}
                            </span>
                          )}

                          {/* GR Number */}
                          {st.grNumber && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-mono font-bold">
                              GR #{st.grNumber}
                            </span>
                          )}

                          {/* Contact Mobile */}
                          {cleanPhone ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-mono font-semibold">
                              <span>📞 {cleanPhone}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyPhone(st.id, cleanPhone, e)}
                                className="p-0.5 hover:text-emerald-600 dark:hover:text-emerald-200 cursor-pointer"
                                title="નંબર કૉપિ કરો"
                              >
                                {copiedPhoneId === st.id ? (
                                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3 opacity-70 hover:opacity-100" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 dark:bg-white/5 dark:text-stone-400 border border-stone-200 dark:border-white/10 text-[10px]">
                              મોબાઈલ નથી
                            </span>
                          )}

                          {/* Father Name (if available) */}
                          {st.fatherName && (
                            <span className="text-stone-600 dark:text-[#a99f91] hidden lg:inline truncate max-w-[160px]">
                              પિતા: {st.fatherName}
                            </span>
                          )}
                        </div>

                        {/* Fuzzy Match Hint when spelling was slightly off */}
                        {isFuzzy && fuzzyHint && (
                          <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>લગભગ મેળ: {fuzzyHint}</span>
                          </div>
                        )}

                        {/* Extra Detail Highlight if search matched a specific secondary field */}
                        {!isFuzzy && extraHighlight && (
                          <div className="mt-0.5 text-[10px] text-[#9d512d] dark:text-[#f59c73] font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>મેચ: {extraHighlight}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* =========================================================================
                        RIGHT SIDE OF NAME: 3 BUTTONS (CALL | PROFILE | WHATSAPP)
                        ========================================================================= */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-stone-200 dark:border-white/10 w-full md:w-auto justify-end">
                      {/* BUTTON 1: CALL */}
                      {cleanPhone ? (
                        <a
                          href={`tel:${cleanPhone}`}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer active:scale-95"
                          title={`વાલીને કૉલ કરો (${cleanPhone})`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>કૉલ</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            alert('આ વિદ્યાર્થીનો મોબાઈલ નંબર નોંધાયેલ નથી. "પ્રોફાઇલ" બટન દબાવીને નંબર ઉમેરો.');
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-200 text-stone-500 dark:bg-white/10 dark:text-stone-500 cursor-not-allowed"
                          title="મોબાઈલ નંબર નોંધાયેલ નથી"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>કૉલ</span>
                        </button>
                      )}

                      {/* BUTTON 2: PROFILE */}
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForProfile(st)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer active:scale-95"
                        title="વિદ્યાર્થીની સંપૂર્ણ પ્રોફાઇલ, વિગતો, ફોટો અને ID કાર્ડ જુઓ"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>પ્રોફાઇલ</span>
                      </button>

                      {/* BUTTON 3: THIRD PRACTICAL BUTTON -> WHATSAPP */}
                      {cleanPhone ? (
                        <a
                          href={whatsAppLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] text-white shadow-xs transition-all cursor-pointer active:scale-95"
                          title={`WhatsApp પર વાલીને સંદેશ મોકલો (${cleanPhone})`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>વોટ્સએપ</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            alert('આ વિદ્યાર્થીનો મોબાઈલ નંબર નોંધાયેલ નથી. "પ્રોફાઇલ" બટન દબાવીને નંબર ઉમેરો.');
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-200 text-stone-500 dark:bg-white/10 dark:text-stone-500 cursor-not-allowed"
                          title="WhatsApp માટે મોબાઈલ નંબર નોંધાયેલ નથી"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>વોટ્સએપ</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show More Button if more results */}
          {hasMore && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setDisplayLimit((prev) => prev + 10)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 text-stone-800 dark:text-[#e4ded6] border border-stone-200 dark:border-white/10 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <span>વધુ {searchResults.length - displayLimit} વિદ્યાર્થીઓ દર્શાવો</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          FULL STUDENT PROFILE MODAL INTEGRATION
          ========================================================================= */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          student={selectedStudentForProfile}
          school={school}
          isOpen={true}
          onClose={() => setSelectedStudentForProfile(null)}
          onStudentUpdated={(updated) => {
            setSelectedStudentForProfile(updated);
            if (onStudentUpdated) {
              onStudentUpdated(updated);
            }
          }}
          onGenerateIdCard={(st) => {
            printStudentIdCards(school, [st]);
          }}
        />
      )}
    </div>
  );
};
