import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck, Clock, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { requestNotificationPermission, sendNotification } from '../utils/notificationUtils';

interface FirstLaunchPermissionModalProps {
  schoolName?: string;
  onComplete?: () => void;
}

export const FirstLaunchPermissionModal: React.FC<FirstLaunchPermissionModalProps> = ({
  schoolName = 'વિદ્યાલયમ',
  onComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    try {
      const alreadyHandled = localStorage.getItem('vidyalayam_first_launch_done');
      if (!alreadyHandled) {
        // Small delay to let the app finish rendering smoothly
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {}
  }, []);

  const handleAllowPermissions = async () => {
    setIsProcessing(true);
    try {
      const result = await requestNotificationPermission();
      localStorage.setItem('vidyalayam_first_launch_done', 'true');
      if (result === 'granted') {
        await sendNotification(
          '🎉 વિદ્યાલયમમાં આપનું હાર્દિક સ્વાગત છે!',
          `${schoolName} ની તમામ જરૂરી સૂચનાઓ સક્રિય થઈ ગઈ છે.`,
          'general'
        );
      }
      setIsOpen(false);
      onComplete?.();
    } catch (e) {
      localStorage.setItem('vidyalayam_first_launch_done', 'true');
      setIsOpen(false);
      onComplete?.();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('vidyalayam_first_launch_done', 'true');
    } catch (e) {}
    setIsOpen(false);
    onComplete?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto p-3 sm:p-6 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md my-auto bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-7 text-center space-y-5 text-slate-800 dark:text-slate-100">
        
        {/* Animated Icon */}
        <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 ring-8 ring-amber-500/15 animate-bounce">
          <Bell className="w-8 h-8" />
        </div>

        {/* Title & Welcome */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold font-mono px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>પ્રથમ વખત સેટઅપ • First Launch</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            વિદ્યાલયમમાં આપનું સ્વાગત છે!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            મહત્વપૂર્ણ શાળા પરિપત્રો અને સમયસરની સૂચનાઓ માટે જરૂરી પરવાનગી આપો.
          </p>
        </div>

        {/* Highlights */}
        <div className="space-y-2.5 text-left bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-white/10 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>🌅 <strong>સવારે ૦૬:૦૦ વાગ્યે:</strong> દૈનિક તાજા સમાચાર & પ્રાર્થના</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 text-sky-500 shrink-0" />
            <span>☀️ <strong>બપોરે ૦૨:૦૦ વાગ્યે:</strong> ૨૦ પ્રશ્નોત્તરી & જાણવા જેવું</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>🌆 <strong>સાંજે ૦૬:૦૦ વાગ્યે:</strong> પરિપત્રો & આવતીકાલના એલર્ટ્સ</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
            <Award className="w-4 h-4 text-purple-500 shrink-0" />
            <span>⏳ <strong>પરીક્ષા સૂચનાઓ:</strong> સમયપત્રક અને ૫ મિનિટ પહેલાં રિમાઇન્ડર</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleAllowPermissions}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-600/25 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isProcessing ? 'પરવાનગી મેળવી રહ્યું છે...' : 'તમામ જરૂરી પરવાનગી આપો (Allow)'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors font-medium cursor-pointer"
          >
            પછીથી (Later)
          </button>
        </div>

        <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>આપની માહિતી ૧૦૦% સુરક્ષિત અને ગુપ્ત રહે છે</span>
        </div>
      </div>
    </div>
  );
};
