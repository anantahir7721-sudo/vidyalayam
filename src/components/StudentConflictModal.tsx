import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Phone,
  Copy,
  Check,
  Building2,
  User,
  GraduationCap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { School, StudentUidConflict } from '../types';
import { getStudentTransferWhatsApp, normalizeWhatsAppNumber } from '../utils/whatsappUtils';

interface StudentConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict?: StudentUidConflict | null;
  batchConflicts?: StudentUidConflict[];
  currentSchool: School;
  onProceedWithRemaining?: () => void;
  remainingCount?: number;
}

export const StudentConflictModal: React.FC<StudentConflictModalProps> = ({
  isOpen,
  onClose,
  conflict,
  batchConflicts = [],
  currentSchool,
  onProceedWithRemaining,
  remainingCount = 0,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customPhones, setCustomPhones] = useState<Record<string, string>>({});
  const [showPreviewFor, setShowPreviewFor] = useState<string | null>(null);

  if (!isOpen) return null;

  const conflictsList: StudentUidConflict[] = conflict
    ? [conflict]
    : batchConflicts;

  if (conflictsList.length === 0) return null;

  const isMultiple = conflictsList.length > 1;

  const handleCopyMessage = async (c: StudentUidConflict) => {
    const overridePhone = customPhones[c.studentUid] || c.registeredSchool.principalPhone || c.registeredSchool.contactPhone;
    const { message } = getStudentTransferWhatsApp({
      studentName: c.studentName,
      studentUid: c.studentUid,
      standard: c.standard,
      grNumber: c.grNumber,
      registeredSchoolName: c.registeredSchool.schoolName,
      registeredSchoolDise: c.registeredSchool.diseCode,
      registeredPrincipalName: c.registeredSchool.principalName,
      registeredPrincipalPhone: overridePhone,
      currentSchoolName: currentSchool.schoolName,
      currentSchoolDise: currentSchool.diseCode,
      currentPrincipalName: currentSchool.principalName,
      currentContactPhone: currentSchool.principalPhone || currentSchool.contactPhone,
    });

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
        setCopiedId(c.studentUid);
        setTimeout(() => setCopiedId(null), 3000);
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const getWhatsAppLaunchData = (c: StudentUidConflict) => {
    const overridePhone = customPhones[c.studentUid] || c.registeredSchool.principalPhone || c.registeredSchool.contactPhone;
    return getStudentTransferWhatsApp({
      studentName: c.studentName,
      studentUid: c.studentUid,
      standard: c.standard,
      grNumber: c.grNumber,
      registeredSchoolName: c.registeredSchool.schoolName,
      registeredSchoolDise: c.registeredSchool.diseCode,
      registeredPrincipalName: c.registeredSchool.principalName,
      registeredPrincipalPhone: overridePhone,
      currentSchoolName: currentSchool.schoolName,
      currentSchoolDise: currentSchool.diseCode,
      currentPrincipalName: currentSchool.principalName,
      currentContactPhone: currentSchool.principalPhone || currentSchool.contactPhone,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-[#1e2430] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Top Accent Gradient Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 px-5 py-4 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/30 text-[11px] font-bold tracking-wide uppercase mb-1">
                <AlertTriangle className="w-3 h-3 text-amber-300" />
                <span>પ્રવેશ પ્રતિબંધિત (Admission Blocked)</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                {isMultiple
                  ? `${conflictsList.length} વિદ્યાર્થીઓ અન્ય શાળાઓમાં પહેલેથી જ નોંધાયેલ છે!`
                  : 'વિદ્યાર્થી અન્ય શાળામાં પહેલેથી જ નોંધાયેલ છે!'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="બંધ કરો"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Guidance Banner */}
        <div className="bg-amber-950/40 border-b border-amber-500/20 px-5 py-3 text-xs sm:text-sm text-amber-200/90 leading-relaxed">
          <p>
            ગુજરાત સરકાર અને વિદ્યાલયમ્ પોર્ટલના નિયમ મુજબ{' '}
            <strong className="text-amber-100 font-semibold">એક વિદ્યાર્થી (Child UID) એક જ શાળામાં નોંધાઈ શકે છે.</strong>{' '}
            આ વિદ્યાર્થીનું નામ જ્યાં સુધી જૂની શાળામાંથી કમી (Delete) ન થાય ત્યાં સુધી તેમને નવી શાળામાં ઉમેરી શકાતા નથી.
          </p>
        </div>

        {/* Content Body: List of Conflicting Students */}
        <div className="p-4 sm:p-5 max-h-[60vh] overflow-y-auto space-y-4">
          {conflictsList.map((c, index) => {
            const overridePhone = customPhones[c.studentUid] || '';
            const activePhone = overridePhone || c.registeredSchool.principalPhone || c.registeredSchool.contactPhone || '';
            const cleanPhone = normalizeWhatsAppNumber(activePhone);
            const waData = getWhatsAppLaunchData(c);
            const isPreviewOpen = showPreviewFor === c.studentUid;
            const isCopied = copiedId === c.studentUid;

            return (
              <div
                key={c.studentUid + index}
                className="bg-[#151922] border border-slate-700/70 rounded-xl p-4 sm:p-5 shadow-sm space-y-4"
              >
                {/* Student Info Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 flex items-center justify-center font-bold text-sm shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">વિદ્યાર્થીનું નામ</div>
                      <div className="text-sm sm:text-base font-bold text-white">
                        {c.studentName}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700">
                      ધોરણ: <strong className="text-white">{c.standard || '—'}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-cyan-950/60 text-cyan-300 font-mono font-semibold border border-cyan-800/50">
                      UID: {c.studentUid}
                    </span>
                    {c.grNumber && (
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700">
                        GR: {c.grNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Currently Registered School Details */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>હાલ નોંધાયેલ શાળાની વિગત (Currently Registered School)</span>
                  </div>

                  <div className="text-sm font-bold text-slate-100 flex flex-wrap items-center gap-2">
                    <span>{c.registeredSchool.schoolName}</span>
                    {c.registeredSchool.diseCode && (
                      <span className="text-xs font-mono font-normal text-slate-400">
                        (DISE: {c.registeredSchool.diseCode})
                      </span>
                    )}
                  </div>

                  {/* Location snippet if available */}
                  {(c.registeredSchool.village || c.registeredSchool.taluka || c.registeredSchool.district) && (
                    <div className="text-xs text-slate-400">
                      સ્થળ:{' '}
                      {[c.registeredSchool.village, c.registeredSchool.taluka, c.registeredSchool.district]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}

                  {/* Principal Info */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        આચાર્યશ્રી:{' '}
                        <strong className="text-white">
                          {c.registeredSchool.principalName || 'નોંધાયેલ નથી'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        મોબાઈલ:{' '}
                        <strong className="text-emerald-300 font-mono">
                          {activePhone || 'ઉપલબ્ધ નથી'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* If Principal phone is not registered, allow entering it manually */}
                {!c.registeredSchool.principalPhone && !c.registeredSchool.contactPhone && (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl space-y-1.5 text-xs">
                    <label className="block text-amber-300 font-medium">
                      આ શાળાનો આચાર્ય મોબાઇલ નંબર પ્રોફાઇલમાં નોંધાયેલ નથી. જો આપની પાસે હોય તો અહીં દાખલ કરો:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="10 અંકનો મોબાઇલ નંબર (દા.ત. 9876543210)"
                        value={customPhones[c.studentUid] || ''}
                        onChange={(e) =>
                          setCustomPhones({
                            ...customPhones,
                            [c.studentUid]: e.target.value.replace(/\D/g, ''),
                          })
                        }
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* WhatsApp Action Buttons & Pre-composed Message */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-2.5">
                  {/* WhatsApp Button */}
                  <a
                    href={waData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/40 transition-all cursor-pointer group"
                    title="આચાર્યશ્રીને સીધો WhatsApp મેસેજ મોકલો"
                  >
                    {/* Official WhatsApp SVG Icon */}
                    <svg
                      className="w-4 h-4 fill-current shrink-0"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.004.577 1.764.846 2.806.847h.005c3.182 0 5.767-2.587 5.768-5.766.001-3.182-2.585-5.769-5.768-5.769zm3.377 8.21c-.14.394-.814.728-1.124.774-.309.046-.71.066-2.046-.475-1.708-.69-2.812-2.434-2.898-2.548-.085-.114-.696-.925-.696-1.763 0-.839.44-1.251.597-1.423.157-.171.343-.214.457-.214.114 0 .229.001.329.006.105.006.246-.04.385.295.143.344.49 1.196.533 1.282.043.086.071.186.014.3-.057.115-.086.186-.171.286-.086.1-.18.223-.257.3-.086.086-.176.18-.076.352.1.171.444.733.953 1.186.655.584 1.208.765 1.379.851.172.086.272.072.372-.043.1-.115.429-.5.543-.672.115-.171.229-.143.386-.086.157.057 1.001.472 1.173.558.171.086.286.129.329.2.043.072.043.415-.097.809zM12 2C6.477 2 2 6.477 2 12c0 1.891.523 3.662 1.434 5.178L2 22l4.981-1.393A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                    </svg>
                    <span>આચાર્યશ્રીને WhatsApp કરો</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100" />
                  </a>

                  {/* Direct Call Button (if phone is available) */}
                  {cleanPhone && (
                    <a
                      href={`tel:${activePhone}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                      title="આચાર્યશ્રીને સીધો કૉલ કરો"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>કૉલ કરો</span>
                    </a>
                  )}

                  {/* Copy Message Button */}
                  <button
                    onClick={() => handleCopyMessage(c)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                    title="આખો સંદેશ કૉપી કરો"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">કૉપી થઈ ગયો!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>મેસેજ કૉપી</span>
                      </>
                    )}
                  </button>

                  {/* Toggle Message Preview Button */}
                  <button
                    onClick={() =>
                      setShowPreviewFor(isPreviewOpen ? null : c.studentUid)
                    }
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
                    title="સંદેશનું લખાણ જુઓ"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {isPreviewOpen ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Collapsible WhatsApp Message Preview */}
                {isPreviewOpen && (
                  <div className="p-3 bg-black/40 border border-slate-800 rounded-xl space-y-1 text-xs">
                    <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">
                      મોકલવામાં આવનાર WhatsApp સંદેશનું લખાણ:
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-slate-200 text-xs bg-slate-950/70 p-3 rounded-lg border border-slate-800 leading-relaxed select-all">
                      {waData.message}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Steps Explainer Footer */}
        <div className="bg-[#181d28] border-t border-slate-800 px-5 py-4 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-300">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
              ✓
            </div>
            <div>
              <span className="font-semibold text-white">પ્રક્રિયા (Process): </span>
              ઉપરોક્ત શાળાના આચાર્યશ્રી દ્વારા તેમના વિદ્યાલયમ્ પોર્ટલમાંથી આ વિદ્યાર્થીનું નામ ડિલીટ કરવામાં આવશે, ત્યારબાદ જ આપ આ વિદ્યાર્થીને આપની શાળામાં દાખલ કરી શકશો.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {isMultiple && onProceedWithRemaining && remainingCount > 0 ? (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onProceedWithRemaining}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                >
                  બાકીના {remainingCount} માન્ય વિદ્યાર્થીઓ ઉમેરો
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  આયાત રદ કરો
                </button>
              </div>
            ) : (
              <div className="w-full sm:w-auto ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer border border-slate-700"
                >
                  સમજાયું (બંધ કરો)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
