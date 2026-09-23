import React, { useState } from 'react';
import { School } from '../types';
import { deleteSchoolCompletely } from '../services/adminService';
import { Trash2, AlertTriangle, X, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AdminDeleteSchoolModalProps {
  isOpen: boolean;
  school: School | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminDeleteSchoolModal: React.FC<AdminDeleteSchoolModalProps> = ({
  isOpen,
  school,
  onClose,
  onSuccess,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !school) return null;

  const isConfirmed = confirmInput.trim() === school.diseCode.trim();

  const handleDelete = async () => {
    if (!isConfirmed) {
      setError(`પુષ્ટિ માટે શાળાનો DISE કોડ "${school.diseCode}" દાખલ કરો.`);
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteSchoolCompletely(school.id, school.diseCode);
      setSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccess(false);
        setConfirmInput('');
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'શાળા ડિલીટ કરવામાં નિષ્ફળ રહ્યા.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0f172a] border border-rose-200 dark:border-rose-900/50 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 text-left relative animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                શાળા સંપૂર્ણ ડિલીટ કરો
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                કાયમી અને અપરિવર્તનીય ક્રિયા (Irreversible)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>ચેતવણી: તમામ ડેટા નાશ પામશે!</span>
          </div>
          <p className="leading-relaxed">
            આ શાળા <strong>{school.schoolName}</strong> (DISE: <span className="font-mono">{school.diseCode}</span>) અને તેના:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1 text-rose-700 dark:text-rose-300">
            <li>તમામ વિદ્યાર્થીઓની માહિતી (Students)</li>
            <li>બધા ગુણ અને પરિણામો (Marks & Results)</li>
            <li>સ્ટાફની યાદી (Staff Members)</li>
            <li>ઑનલાઇન પરીક્ષાઓ અને પ્રશ્નો (Online Exams & Questions)</li>
            <li>વિદ્યાર્થીઓના પરીક્ષા પ્રયાસો (Exam Attempts)</li>
          </ul>
          <p className="font-semibold pt-1">
            આ બધું જ ડેટાબેઝમાંથી કાયમ માટે ડિલીટ થઈ જશે અને તેને પુનઃ પ્રાપ્ત કરી શકાશે નહીં.
          </p>
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">શાળા અને તેનો તમામ ડેટા સંપૂર્ણપણે ડિલીટ થઈ ગયો છે!</span>
          </div>
        )}

        {/* Confirmation Input */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            પુષ્ટિ માટે શાળાનો DISE કોડ <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{school.diseCode}</span> અહીં ટાઈપ કરો:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={school.diseCode}
            disabled={deleting || success}
            className="glass-input block w-full px-4 py-2.5 rounded-xl font-mono text-sm border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            રદ કરો
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || deleting || success}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            {deleting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ડિલીટ થઈ રહ્યું છે...
              </span>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>સંપૂર્ણ ડિલીટ કરો</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
