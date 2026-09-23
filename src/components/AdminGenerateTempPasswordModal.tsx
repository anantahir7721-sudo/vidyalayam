import React, { useState, useEffect } from 'react';
import { School } from '../types';
import { setTemporaryPasswordForSchool } from '../services/adminService';
import { getTemporaryPasswordWhatsApp, launchWhatsAppWithMessage } from '../utils/whatsappUtils';
import { KeyRound, RefreshCw, Copy, Check, Send, X, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface AdminGenerateTempPasswordModalProps {
  isOpen: boolean;
  school: School | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function generateRandomTempPassword(): string {
  const prefix = 'Sch';
  const num = Math.floor(1000 + Math.random() * 9000);
  const chars = ['#', '@', '$', '!'];
  const sym = chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${sym}${num}`;
}

export const AdminGenerateTempPasswordModal: React.FC<AdminGenerateTempPasswordModalProps> = ({
  isOpen,
  school,
  onClose,
  onSuccess,
}) => {
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTempPassword(generateRandomTempPassword());
      setSavedSuccess(false);
      setError(null);
      setCopied(false);
    }
  }, [isOpen, school]);

  if (!isOpen || !school) return null;

  const schoolPhone = school.contactPhone || (school as any).contactNumber || school.principalPhone || '';

  const handleGenerateNew = () => {
    setTempPassword(generateRandomTempPassword());
  };

  const handleSave = async () => {
    if (!tempPassword || tempPassword.trim().length < 6) {
      setError('ટેમ્પરરી પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await setTemporaryPasswordForSchool(school.id, tempPassword.trim(), school.diseCode);
      setSavedSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'ટેમ્પરરી પાસવર્ડ સેટ કરવામાં નિષ્ફળ રહ્યા.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSendWhatsApp = () => {
    const wa = getTemporaryPasswordWhatsApp({
      schoolName: school.schoolName,
      diseCode: school.diseCode,
      temporaryPassword: tempPassword,
      recipientPhone: schoolPhone,
    });
    launchWhatsAppWithMessage(wa.url, wa.message);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 text-left relative animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ટેમ્પરરી પાસવર્ડ જનરેટ કરો
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                શાળા માટે અસ્થાયી સુરક્ષિત પાસવર્ડ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* School Info */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-1 text-xs">
          <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {school.schoolName}
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>DISE કોડ: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{school.diseCode}</strong></span>
            <span>જિલ્લો: <strong>{school.district || 'ગુજરાત'}</strong></span>
          </div>
          {schoolPhone && (
            <div className="text-slate-500 dark:text-slate-400">
              મોબાઈલ / વોટ્સએપ: <strong className="font-mono">{schoolPhone}</strong>
            </div>
          )}
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!savedSuccess ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  નવો ટેમ્પરરી પાસવર્ડ (Temporary Password) *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateNew}
                  className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>બીજો બનાવો</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="glass-input block w-full px-4 py-3 rounded-xl font-mono text-base font-bold text-center tracking-wider text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                શાળા આ પાસવર્ડથી લોગિન કરશે ત્યારે તેને નવો કાયમી પાસવર્ડ સેટ કરવા માટે આપમેળે પ્રોમ્પ્ટ મળશે.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                રદ કરો
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 !text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5 !text-white">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    સેવ થાય છે...
                  </span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 !text-white" />
                    <span className="!text-white font-bold">ટેમ્પરરી પાસવર્ડ સેટ કરો</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-2">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                ટેમ્પરરી પાસવર્ડ સફળતાપૂર્વક સેટ થઈ ગયો છે!
              </div>
              <div className="p-3 bg-white dark:bg-[#1e293b] rounded-xl border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-between">
                <span className="font-mono text-lg font-bold text-slate-900 dark:text-white tracking-widest">
                  {tempPassword}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'કોપી થયું!' : 'કોપી'}</span>
                </button>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                આ પાસવર્ડ શાળાના આચાર્યશ્રી / પ્રતિનિધિને મોકલી આપો.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>શાળાને WhatsApp મોકલો</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                પૂર્ણ કરો
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
