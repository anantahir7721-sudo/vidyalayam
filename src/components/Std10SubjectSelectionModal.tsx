import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { Std10SubjectConfig } from '../utils/multiStandardResultCalculations';
import {
  X,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Users,
  Search,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export interface Std10SubjectSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  config: Std10SubjectConfig;
  onSave: (newConfig: Std10SubjectConfig) => void;
  getSeatNumber?: (studentId: string, roll?: string) => string;
}

export const Std10SubjectSelectionModal: React.FC<Std10SubjectSelectionModalProps> = ({
  isOpen,
  onClose,
  students,
  config,
  onSave,
  getSeatNumber,
}) => {
  // Local working copy of default choices
  const [defaultMaths, setDefaultMaths] = useState<'basic' | 'standard'>(config.defaultMaths || 'basic');
  const [defaultSecondLanguage, setDefaultSecondLanguage] = useState<'sanskrit' | 'hindi'>(
    config.defaultSecondLanguage || 'sanskrit'
  );
  const [defaultCoSubject, setDefaultCoSubject] = useState<'pt' | 'computer'>(
    config.defaultCoSubject || 'pt'
  );

  // Local working copy of overrides: studentId -> { maths, secondLanguage, coSubject }
  const [overrides, setOverrides] = useState<
    Record<string, { maths?: 'basic' | 'standard'; secondLanguage?: 'sanskrit' | 'hindi'; coSubject?: 'pt' | 'computer' }>
  >(() => {
    return { ...(config.studentOverrides || {}) };
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Sorted and filtered students
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const rA = parseInt(a.rollNumber || '9999', 10);
      const rB = parseInt(b.rollNumber || '9999', 10);
      return rA - rB;
    });
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return sortedStudents;
    const q = searchQuery.toLowerCase().trim();
    return sortedStudents.filter(
      (s) =>
        (s.studentName || '').toLowerCase().includes(q) ||
        (s.rollNumber || '').toLowerCase().includes(q) ||
        (s.grNumber || '').toLowerCase().includes(q)
    );
  }, [sortedStudents, searchQuery]);

  // Helper getters for effective choices for a student
  const getStudentMaths = (studentId: string): 'basic' | 'standard' => {
    return overrides[studentId]?.maths || defaultMaths;
  };

  const getStudentLang = (studentId: string): 'sanskrit' | 'hindi' => {
    return overrides[studentId]?.secondLanguage || defaultSecondLanguage;
  };

  const getStudentCoSub = (studentId: string): 'pt' | 'computer' => {
    return overrides[studentId]?.coSubject || defaultCoSubject;
  };

  // Set choice for an individual student
  const handleStudentMathsChange = (studentId: string, val: 'basic' | 'standard') => {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        maths: val,
      },
    }));
  };

  const handleStudentLangChange = (studentId: string, val: 'sanskrit' | 'hindi') => {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        secondLanguage: val,
      },
    }));
  };

  const handleStudentCoSubChange = (studentId: string, val: 'pt' | 'computer') => {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        coSubject: val,
      },
    }));
  };

  // Apply default setting to ALL students at once
  const handleApplyDefaultsToAll = () => {
    const updated: Record<string, { maths: 'basic' | 'standard'; secondLanguage: 'sanskrit' | 'hindi'; coSubject: 'pt' | 'computer' }> = {};
    students.forEach((s) => {
      updated[s.id] = {
        maths: defaultMaths,
        secondLanguage: defaultSecondLanguage,
        coSubject: defaultCoSubject,
      };
    });
    setOverrides(updated);
  };

  // Batch toggle all to basic maths
  const handleSetAllMaths = (val: 'basic' | 'standard') => {
    setDefaultMaths(val);
    setOverrides((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        next[s.id] = { ...next[s.id], maths: val };
      });
      return next;
    });
  };

  // Batch toggle all to sanskrit/hindi
  const handleSetAllLang = (val: 'sanskrit' | 'hindi') => {
    setDefaultSecondLanguage(val);
    setOverrides((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        next[s.id] = { ...next[s.id], secondLanguage: val };
      });
      return next;
    });
  };

  // Batch toggle all to pt/computer
  const handleSetAllCoSub = (val: 'pt' | 'computer') => {
    setDefaultCoSubject(val);
    setOverrides((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        next[s.id] = { ...next[s.id], coSubject: val };
      });
      return next;
    });
  };

  // Stats calculation
  const stats = useMemo(() => {
    let basicCount = 0;
    let standardCount = 0;
    let sanskritCount = 0;
    let hindiCount = 0;
    let ptCount = 0;
    let compCount = 0;

    students.forEach((s) => {
      const m = getStudentMaths(s.id);
      if (m === 'basic') basicCount++;
      else standardCount++;

      const l = getStudentLang(s.id);
      if (l === 'sanskrit') sanskritCount++;
      else hindiCount++;

      const c = getStudentCoSub(s.id);
      if (c === 'pt') ptCount++;
      else compCount++;
    });

    return { basicCount, standardCount, sanskritCount, hindiCount, ptCount, compCount };
  }, [students, overrides, defaultMaths, defaultSecondLanguage, defaultCoSubject]);

  const handleFinalSave = () => {
    onSave({
      defaultMaths,
      defaultSecondLanguage,
      defaultCoSubject,
      studentOverrides: overrides,
      isFinalized: true,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-orange-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#C45A2D] text-white shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  ધોરણ ૧૦: વૈકલ્પિક વિષયો પસંદગી પત્રક
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-[#C45A2D]/10 text-[#C45A2D] text-xs font-black uppercase tracking-wider">
                  GSEB SSC
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                ગુણ એન્ટ્રી કરતાં પહેલાં દરેક વિદ્યાર્થી માટે વિષય પસંદગી સાચવવી ફરજિયાત છે.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Instructions Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-amber-950 dark:text-amber-100">
                વિષય પસંદગી નિયમ (GSEB ધોરણ ૧૦):
              </div>
              <div className="mt-1 space-y-0.5 leading-relaxed text-slate-700 dark:text-slate-300">
                <span>૧. <strong>ગણિત</strong>: બેઝિક (કોડ ૧૮) અથવા સ્ટાન્ડર્ડ (કોડ ૧૨).</span><br />
                <span>૨. <strong>દ્વિતીય ભાષા</strong>: સંસ્કૃત (કોડ ૧૫) અથવા હિન્દી (કોડ ૧૪).</span><br />
                <span>૩. <strong>સહ-વિષય</strong>: શારીરિક શિક્ષણ (કોડ ૪૦) અથવા કમ્પ્યુટર અધ્યયન (કોડ ૪૨) - ૫૦ થી. + ૫૦ પ્રે. = ૧૦૦ ગુણ.</span><br />
                <span className="text-[#C45A2D] font-bold">વિષય પસંદગી સાચવ્યા (Save) પછી જ ગુણ એન્ટ્રી શરૂ કરી શકાશે.</span>
              </div>
            </div>
          </div>

          {/* Quick Whole-Class Default Setup Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C45A2D]" />
                <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                  સમગ્ર વર્ગ માટે ઝડપી સેટિંગ (Quick Class Default)
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplyDefaultsToAll}
                className="px-3 py-1.5 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>આ સેટિંગ તમામ વિદ્યાર્થીઓને લાગુ કરો</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Maths Default */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>ગણિત વિષય</span>
                  <span className="text-[10px] text-slate-500 font-normal">કોડ ૧૮ / ૧૨</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetAllMaths('basic')}
                    className={`py-2 px-2 rounded-lg font-black text-xs transition-all cursor-pointer text-center ${
                      defaultMaths === 'basic'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    બેઝિક (૧૮)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllMaths('standard')}
                    className={`py-2 px-2 rounded-lg font-black text-xs transition-all cursor-pointer text-center ${
                      defaultMaths === 'standard'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    સ્ટાન્ડર્ડ (૧૨)
                  </button>
                </div>
              </div>

              {/* Second Language Default */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>દ્વિતીય ભાષા</span>
                  <span className="text-[10px] text-slate-500 font-normal">કોડ ૧૫ / ૧૪</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetAllLang('sanskrit')}
                    className={`py-2 px-2 rounded-lg font-black text-xs transition-all cursor-pointer text-center ${
                      defaultSecondLanguage === 'sanskrit'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    સંસ્કૃત (૧૫)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllLang('hindi')}
                    className={`py-2 px-2 rounded-lg font-black text-xs transition-all cursor-pointer text-center ${
                      defaultSecondLanguage === 'hindi'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    હિન્દી (૧૪)
                  </button>
                </div>
              </div>

              {/* Co-Subject Default (PT vs Computer) */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>સહ-વિષય (પ્રાયોગિક)</span>
                  <span className="text-[10px] text-slate-500 font-normal">કોડ ૪૦ / ૪૨</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetAllCoSub('pt')}
                    className={`py-2 px-2 rounded-lg font-black text-xs transition-all cursor-pointer text-center ${
                      defaultCoSubject === 'pt'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    પી.ટી. (૪૦)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllCoSub('computer')}
                    className={`py-2 px-2 rounded-lg font-black text-xs transition-all cursor-pointer text-center ${
                      defaultCoSubject === 'computer'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    કમ્પ્યુટર (૪૨)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Current Counts Summary Strip */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-600 dark:text-slate-400">કુલ છાત્રો: {students.length}</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                ગણિત: બેઝિક <strong>{stats.basicCount}</strong> • સ્ટાન્ડર્ડ <strong>{stats.standardCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                ભાષા: સંસ્કૃત <strong>{stats.sanskritCount}</strong> • હિન્દી <strong>{stats.hindiCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                સહ-વિષય: પી.ટી. <strong>{stats.ptCount}</strong> • કમ્પ્યુટર <strong>{stats.compCount}</strong>
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="વિદ્યાર્થી શોધો..."
                className="pl-8 pr-3 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white w-48 sm:w-56"
              />
            </div>
          </div>

          {/* Student Table */}
          <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 sticky top-0 z-10 font-bold shadow-xs">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-12 border-b border-slate-200 dark:border-slate-700">રોલ</th>
                    <th className="py-2.5 px-2 text-center w-24 border-b border-slate-200 dark:border-slate-700">બેઠક નં.</th>
                    <th className="py-2.5 px-2 text-center w-16 border-b border-slate-200 dark:border-slate-700">G.R.</th>
                    <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700 min-w-[160px]">વિદ્યાર્થીનું નામ</th>
                    <th className="py-2.5 px-2 text-center border-b border-slate-200 dark:border-slate-700 min-w-[150px]">
                      ગણિત (બેઝિક/સ્ટાન્ડર્ડ)
                    </th>
                    <th className="py-2.5 px-2 text-center border-b border-slate-200 dark:border-slate-700 min-w-[150px]">
                      દ્વિતીય ભાષા (સંસ્કૃત/હિન્દી)
                    </th>
                    <th className="py-2.5 px-2 text-center border-b border-slate-200 dark:border-slate-700 min-w-[150px]">
                      સહ-વિષય (પી.ટી./કમ્પ્યુટર)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-bold">
                        કોઈ વિદ્યાર્થી મળ્યા નથી.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const curMaths = getStudentMaths(st.id);
                      const curLang = getStudentLang(st.id);
                      const curCoSub = getStudentCoSub(st.id);
                      const seatNo = getSeatNumber ? getSeatNumber(st.id, st.rollNumber) : (st as any).seatNumber || '-';

                      return (
                        <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {st.rollNumber || '-'}
                          </td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-[#C45A2D]">
                            {seatNo}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                            {st.grNumber || '-'}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                            <div>{st.studentName}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {st.gender === 'female' ? 'કન્યા' : 'કુમાર'} {st.section ? `• વર્ગ ${st.section}` : ''}
                            </div>
                          </td>

                          {/* Maths toggle */}
                          <td className="py-2 px-2 text-center">
                            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                              <button
                                type="button"
                                onClick={() => handleStudentMathsChange(st.id, 'basic')}
                                className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                                  curMaths === 'basic'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-700 dark:text-slate-300 hover:text-blue-600'
                                }`}
                              >
                                બેઝિક (૧૮)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStudentMathsChange(st.id, 'standard')}
                                className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                                  curMaths === 'standard'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-700 dark:text-slate-300 hover:text-blue-600'
                                }`}
                              >
                                સ્ટાન્ડર્ડ (૧૨)
                              </button>
                            </div>
                          </td>

                          {/* Second Language toggle */}
                          <td className="py-2 px-2 text-center">
                            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                              <button
                                type="button"
                                onClick={() => handleStudentLangChange(st.id, 'sanskrit')}
                                className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                                  curLang === 'sanskrit'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-700 dark:text-slate-300 hover:text-emerald-600'
                                }`}
                              >
                                સંસ્કૃત (૧૫)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStudentLangChange(st.id, 'hindi')}
                                className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                                  curLang === 'hindi'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-700 dark:text-slate-300 hover:text-emerald-600'
                                }`}
                              >
                                હિન્દી (૧૪)
                              </button>
                            </div>
                          </td>

                          {/* Co-Subject toggle */}
                          <td className="py-2 px-2 text-center">
                            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                              <button
                                type="button"
                                onClick={() => handleStudentCoSubChange(st.id, 'pt')}
                                className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                                  curCoSub === 'pt'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-slate-700 dark:text-slate-300 hover:text-purple-600'
                                }`}
                              >
                                પી.ટી. (૪૦)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStudentCoSubChange(st.id, 'computer')}
                                className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                                  curCoSub === 'computer'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-slate-700 dark:text-slate-300 hover:text-purple-600'
                                }`}
                              >
                                કમ્પ્યુટર (૪૨)
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>સાચવ્યા બાદ ગુણ એન્ટ્રી ટેબલ તુરંત અનલૉક થશે.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              બંધ કરો
            </button>
            <button
              type="button"
              onClick={handleFinalSave}
              className="px-5 py-2 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>વિષય પસંદગી સાચવો & ગુણ એન્ટ્રી અનલૉક કરો</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
