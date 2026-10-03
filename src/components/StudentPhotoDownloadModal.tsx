import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  RefreshCw,
  Sparkles,
  Users,
  Camera,
  Layers,
  ChevronDown,
  Info,
  Check,
} from 'lucide-react';
import { Student } from '../types';
import {
  generateStudentPhotosZip,
  triggerBlobDownload,
  PhotoZipProgress,
  PhotoZipResult,
} from '../utils/studentPhotoZipUtils';

interface StudentPhotoDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  schoolName: string;
  diseCode?: string;
  initialStandard?: string;
}

export const StudentPhotoDownloadModal: React.FC<StudentPhotoDownloadModalProps> = ({
  isOpen,
  onClose,
  students,
  schoolName,
  diseCode,
  initialStandard = 'ALL',
}) => {
  // Filter states
  const [selectedStandard, setSelectedStandard] = useState<string>(initialStandard || 'ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [namingScheme, setNamingScheme] = useState<'name_only' | 'roll_name' | 'gr_name'>('name_only');
  const [organizeFolders, setOrganizeFolders] = useState<boolean>(true);
  const [showMissingList, setShowMissingList] = useState<boolean>(false);

  // Generation & Progress states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<PhotoZipProgress | null>(null);
  const [result, setResult] = useState<PhotoZipResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extract all distinct standards present in students list
  const availableStandards = useMemo(() => {
    const stdSet = new Set<string>();
    students.forEach((st) => {
      if (st.standard !== undefined && st.standard !== null && String(st.standard).trim()) {
        stdSet.add(String(st.standard).trim());
      }
    });

    // Sort numerically
    return Array.from(stdSet).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [students]);

  // Extract distinct sections for the selected standard
  const availableSections = useMemo(() => {
    const secSet = new Set<string>();
    students.forEach((st) => {
      if (selectedStandard === 'ALL' || String(st.standard).trim() === selectedStandard.trim()) {
        const sec = (st.section || st.division || '').trim().toUpperCase();
        if (sec) secSet.add(sec);
      }
    });
    return Array.from(secSet).sort();
  }, [students, selectedStandard]);

  // Filter students matching the modal's current selection
  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      if (selectedStandard !== 'ALL' && String(st.standard).trim() !== selectedStandard.trim()) {
        return false;
      }
      if (selectedSection !== 'ALL') {
        const sec = (st.section || st.division || '').trim().toUpperCase();
        if (sec !== selectedSection.trim().toUpperCase()) return false;
      }
      return true;
    });
  }, [students, selectedStandard, selectedSection]);

  // Counts of students with and without photos
  const studentsWithPhoto = useMemo(() => {
    return filteredStudents.filter((st) => !!st.photoUrl && st.photoUrl.trim().length > 10);
  }, [filteredStudents]);

  const studentsWithoutPhoto = useMemo(() => {
    return filteredStudents.filter((st) => !st.photoUrl || st.photoUrl.trim().length <= 10);
  }, [filteredStudents]);

  // Handle standard pill click
  const handleStandardSelect = (std: string) => {
    setSelectedStandard(std);
    setSelectedSection('ALL');
    setResult(null);
    setErrorMsg(null);
  };

  // Start ZIP generation and download
  const handleStartDownload = async () => {
    if (studentsWithPhoto.length === 0) {
      setErrorMsg('પસંદ કરેલ ધોરણમાં કોઈપણ વિદ્યાર્થીનો ફોટો અપલોડ થયેલ નથી.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResult(null);
    setProgress({
      current: 0,
      total: studentsWithPhoto.length,
      currentStudentName: 'તૈયારી થઈ રહી છે...',
      percent: 0,
      status: 'processing',
    });

    try {
      const res = await generateStudentPhotosZip(
        students,
        schoolName,
        {
          standard: selectedStandard,
          section: selectedSection,
          namingScheme,
          organizeByFolder: organizeFolders,
          targetWidth: 100, // exact 100 px Width as requested
          targetHeight: 120, // exact 120 px Height as requested
        },
        (p) => {
          setProgress(p);
        }
      );

      setResult(res);
      setIsProcessing(false);

      // Trigger instant automatic download
      triggerBlobDownload(res.zipBlob, res.fileName);
    } catch (err: any) {
      console.error('ZIP generation error:', err);
      setIsProcessing(false);
      setErrorMsg(err.message || 'ફોટો ઝિપ બનાવવામાં ભૂલ આવી.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92dvh] overflow-y-auto my-auto text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  વિદ્યાર્થી ફોટો ડાઉનલોડ (ZIP Archive)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  100×120 px
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  5 KB – 20 KB
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ધોરણ વાઇઝ વિદ્યાર્થીઓના ફોટા ZIP માં ડાઉનલોડ કરો
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dimension & Format Highlight Card */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              📐
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-2 flex-wrap">
                <span>પરિમાણ: 100 px (પહોળાઈ) × 120 px (ઊંચાઈ)</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-300 font-black">• સાઇઝ: 5 KB થી 20 KB</span>
              </div>
              <div className="text-indigo-700 dark:text-indigo-300 text-[11px]">
                ફાઇલ નામ: <strong>વિદ્યાર્થીનું નામ</strong> (દા.ત. <code className="bg-white/80 dark:bg-black/40 px-1 py-0.5 rounded font-mono">દર્શન પટેલ.jpg</code>)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white/70 dark:bg-slate-900/60 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <FolderArchive className="w-3.5 h-3.5 text-indigo-600" />
            <span>.ZIP આર્કાઇવ</span>
          </div>
        </div>

        {/* 1. Standard Selector (ધોરણ પસંદ કરો) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>૧. ધોરણ પસંદ કરો (Select Standard):</span>
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              {selectedStandard === 'ALL' ? 'બધા ધોરણ' : `ધોરણ ${selectedStandard}`}
            </span>
          </label>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => handleStandardSelect('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedStandard === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              બધા ધોરણ ({students.length})
            </button>

            {availableStandards.map((std) => {
              const stdCount = students.filter((s) => String(s.standard).trim() === std).length;
              const isSelected = selectedStandard === std;
              return (
                <button
                  key={std}
                  type="button"
                  onClick={() => handleStandardSelect(std)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  ધોરણ {std} ({stdCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Section Selector (વર્ગ પસંદ કરો - જો ઉપલબ્ધ હોય) */}
        {availableSections.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              વર્ગ / સેક્શન (Section Filter):
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedSection('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedSection === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                તમામ વર્ગ
              </button>
              {availableSections.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSection(sec)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedSection === sec
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  વર્ગ {sec}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              કુલ વિદ્યાર્થીઓ
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {filteredStudents.length}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              ફોટો ઉપલબ્ધ (ZIP માં)
            </div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>{studentsWithPhoto.length}</span>
            </div>
          </div>

          <div
            onClick={() => setShowMissingList(!showMissingList)}
            className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-center cursor-pointer hover:border-amber-300 transition-colors"
            title="ફોટો વગરના વિદ્યાર્થીઓની યાદી જુઓ"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1">
              <span>ફોટો બાકી</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showMissingList ? 'rotate-180' : ''}`} />
            </div>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {studentsWithoutPhoto.length}
            </div>
          </div>
        </div>

        {/* Missing Photos Accordion List */}
        {showMissingList && studentsWithoutPhoto.length > 0 && (
          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs">
            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <span>⚠️ નીચેના {studentsWithoutPhoto.length} વિદ્યાર્થીઓના ફોટો અપલોડ કરવાના બાકી છે:</span>
              <button
                type="button"
                onClick={() => setShowMissingList(false)}
                className="text-amber-700 hover:text-amber-950 dark:hover:text-white"
              >
                બંધ કરો
              </button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-[11px]">
              {studentsWithoutPhoto.map((st, idx) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-800/40"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {idx + 1}. {st.studentName}
                  </span>
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
                    <span>ધોરણ {st.standard}</span>
                    {st.rollNumber && <span>રોલ: {st.rollNumber}</span>}
                    {st.grNumber && <span>GR: {st.grNumber}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sample Photo Preview Strip (Formatted to exact 100x120 aspect ratio) */}
        {studentsWithPhoto.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>ફોટો ફોર્મેટ નમૂનો (100px × 120px):</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {studentsWithPhoto.length} ફોટા તૈયાર
              </span>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar p-2 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
              {studentsWithPhoto.slice(0, 6).map((st) => (
                <div key={st.id} className="flex flex-col items-center shrink-0 space-y-1">
                  <div className="w-[50px] h-[60px] sm:w-[60px] sm:h-[72px] rounded-lg overflow-hidden border-2 border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 shadow-xs relative">
                    <img
                      src={st.photoUrl}
                      alt={st.studentName}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <span className="text-[9.5px] font-semibold text-slate-700 dark:text-slate-300 max-w-[70px] truncate text-center" title={st.studentName}>
                    {st.studentName}
                  </span>
                </div>
              ))}
              {studentsWithPhoto.length > 6 && (
                <div className="w-[50px] h-[60px] sm:w-[60px] sm:h-[72px] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">
                  <span>+{studentsWithPhoto.length - 6}</span>
                  <span className="text-[8px]">વધુ</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Naming Scheme Options */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>ફોટો ફાઇલ નામ વિકલ્પ (Filename Format):</span>
            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">.jpg</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setNamingScheme('name_only')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                namingScheme === 'name_only'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 font-bold text-indigo-950 dark:text-indigo-200 ring-1 ring-indigo-500/20 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>માત્ર વિદ્યાર્થીનું નામ</span>
                {namingScheme === 'name_only' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
              <div className="text-[10.5px] text-slate-500 font-mono mt-0.5 truncate">
                દર્શન પટેલ.jpg
              </div>
            </button>

            <button
              type="button"
              onClick={() => setNamingScheme('roll_name')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                namingScheme === 'roll_name'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 font-bold text-indigo-950 dark:text-indigo-200 ring-1 ring-indigo-500/20 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>રોલ નં + નામ</span>
                {namingScheme === 'roll_name' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
              <div className="text-[10.5px] text-slate-500 font-mono mt-0.5 truncate">
                12_દર્શન પટેલ.jpg
              </div>
            </button>

            <button
              type="button"
              onClick={() => setNamingScheme('gr_name')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                namingScheme === 'gr_name'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 font-bold text-indigo-950 dark:text-indigo-200 ring-1 ring-indigo-500/20 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>GR નં + નામ</span>
                {namingScheme === 'gr_name' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
              <div className="text-[10.5px] text-slate-500 font-mono mt-0.5 truncate">
                GR_102_દર્શન પટેલ.jpg
              </div>
            </button>
          </div>

          {/* Folder organize checkbox if ALL standards */}
          {selectedStandard === 'ALL' && (
            <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={organizeFolders}
                onChange={(e) => setOrganizeFolders(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>ઝિપ ફાઇલમાં દરેક ધોરણના અલગ અલગ ફોલ્ડર બનાવો (દા.ત. ધોરણ_9/, ધોરણ_10/)</span>
            </label>
          )}
        </div>

        {/* Progress Bar (during processing) */}
        {isProcessing && progress && (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-200">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>{progress.currentStudentName}</span>
              </div>
              <span className="font-mono">{progress.percent}%</span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-200 rounded-full"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>ફોટો રીસાઇઝ (100×120 px) થઈ રહ્યા છે...</span>
              <span>
                {progress.current} / {progress.total} ફોટા
              </span>
            </div>
          </div>
        )}

        {/* Success Result Card */}
        {result && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{result.photosIncluded} વિદ્યાર્થીઓના ફોટા સફળતાપૂર્વક ZIP માં પેક થઈ ગયા છે!</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              ફાઇલનું નામ: <strong className="font-mono text-slate-900 dark:text-white">{result.fileName}</strong>
            </p>

            <button
              type="button"
              onClick={() => triggerBlobDownload(result.zipBlob, result.fileName)}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ફરીથી ડાઉનલોડ કરો (Re-download)</span>
            </button>
          </div>
        )}

        {/* Error Display */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            બંધ કરો
          </button>

          <button
            type="button"
            disabled={isProcessing || studentsWithPhoto.length === 0}
            onClick={handleStartDownload}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>ઝિપ તૈયાર થઈ રહી છે...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  {selectedStandard === 'ALL'
                    ? `બધા ફોટા ZIP ડાઉનલોડ કરો (${studentsWithPhoto.length})`
                    : `ધોરણ ${selectedStandard} ના ફોટા ZIP ડાઉનલોડ કરો (${studentsWithPhoto.length})`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
