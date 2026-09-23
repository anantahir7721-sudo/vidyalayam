import React, { useState } from 'react';
import { School } from '../types';
import { resetSchoolPasswordWithTemp } from '../services/authService';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

interface SetNewPasswordModalProps {
  isOpen: boolean;
  school: School;
  temporaryPasswordUsed: string;
  onSuccess: (updatedSchool: School) => void;
  onCancel?: () => void;
}

export const SetNewPasswordModal: React.FC<SetNewPasswordModalProps> = ({
  isOpen,
  school,
  temporaryPasswordUsed,
  onSuccess,
  onCancel,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('નવો પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('નવો પાસવર્ડ અને પુષ્ટિ પાસવર્ડ મેળ ખાતા નથી.');
      return;
    }
    if (newPassword === temporaryPasswordUsed) {
      setError('નવો પાસવર્ડ ટેમ્પરરી પાસવર્ડથી અલગ હોવો જોઈએ.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetSchoolPasswordWithTemp({
        schoolId: school.id,
        diseCode: school.diseCode,
        temporaryPassword: temporaryPasswordUsed,
        newPassword,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess(res.school);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'નવો પાસવર્ડ સેટ કરવામાં ભૂલ આવી.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 text-left relative animate-fadeIn">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                કાયમી નવો પાસવર્ડ સેટ કરો
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                ફરજિયાત
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              શાળા: <span className="font-semibold text-slate-800 dark:text-slate-200">{school.schoolName}</span> (DISE: {school.diseCode})
            </p>
          </div>
        </div>

        {/* Notice Info Box */}
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <p className="font-semibold flex items-center gap-1.5 mb-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            ટેમ્પરરી પાસવર્ડ ચકાસાઈ ગયો છે!
          </p>
          તમે એડમિન દ્વારા આપેલા ટેમ્પરરી પાસવર્ડથી લોગિન કર્યું છે. સુરક્ષા માટે કૃપા કરીને તમારો કાયમી નવો પાસવર્ડ બે વાર દાખલ કરીને સેટ કરો.
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">નવો પાસવર્ડ સેટ થઈ ગયો છે! પોર્ટલમાં લઈ જઈ રહ્યા છીએ...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              નવો પાસવર્ડ (New Password) *
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ઓછામાં ઓછા 6 અક્ષર"
                className="glass-input block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              નવો પાસવર્ડ ફરી લખો (Confirm New Password) *
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="નવો પાસવર્ડ પુષ્ટિ કરો"
                className="glass-input block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                રદ કરો
              </button>
            )}
            <button
              type="submit"
              disabled={loading || success}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  સેવ થઈ રહ્યું છે...
                </span>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>પાસવર્ડ સેટ કરો અને લૉગિન થાઓ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
