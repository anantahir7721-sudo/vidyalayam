import React, { useState } from 'react';
import { 
  ArrowUpCircle, 
  Download, 
  RefreshCw, 
  Sparkles, 
  X, 
  CheckCircle2, 
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { GitHubUpdateInfo, applyAppUpdate, dismissUpdateInSession } from '../services/appUpdateService';
import { isAndroidNativeApp } from '../utils/printAndPdfUtils';

interface AppUpdateModalProps {
  updateInfo: GitHubUpdateInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  updateInfo,
  isOpen,
  onClose,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !updateInfo || !updateInfo.updateAvailable) {
    return null;
  }

  const isAndroid = isAndroidNativeApp() || /Android/i.test(navigator.userAgent);
  const apkDownloadUrl = updateInfo.apkDownloadUrl || `https://github.com/${updateInfo.repo}/releases/download/latest/app-debug.apk`;
  const commitUrl = updateInfo.htmlUrl || `https://github.com/${updateInfo.repo}/commit/${updateInfo.latestCommitSha}`;

  const handleWebUpdate = async () => {
    setIsUpdating(true);
    await applyAppUpdate(updateInfo.latestCommitSha);
  };

  const handleApkDownload = () => {
    window.open(apkDownloadUrl, '_system');
  };

  // Format date nicely
  const formattedDate = updateInfo.latestCommitDate
    ? new Date(updateInfo.latestCommitDate).toLocaleString('gu-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'તાજેતરમાં';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-[#111923] border border-emerald-500/30 dark:border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-[#e4ded6] transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Top Ambient Header */}
        <div className="relative px-5 pt-6 pb-4 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white overflow-hidden">
          {/* Subtle Background Glow Elements */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-400/20 rounded-full blur-xl -ml-10 -mb-10 pointer-events-none" />

          {/* Top Bar with Badge & Close Button */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-bold border border-white/20 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>વિદ્યાલયમ નવી આવૃત્તિ</span>
            </div>
            <button
              type="button"
              onClick={() => {
                dismissUpdateInSession(updateInfo.latestCommitSha);
                onClose();
              }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white/90 hover:text-white transition-all cursor-pointer"
              title="પછીથી"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Title & Visual Icon */}
          <div className="relative z-10 mt-3 flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-950/30">
              <ArrowUpCircle className="w-7 h-7 text-emerald-200" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>🚀 નવી એપ અપડેટ ઉપલબ્ધ છે!</span>
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5 leading-relaxed">
                વિદ્યાલયમ એપ્લિકેશનનું નવું અને સુધારેલું વર્ઝન ઉપલબ્ધ છે. નવી સુવિધાઓ મેળવવા માટે હમણાં જ અપડેટ કરો.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body: Clean User-Facing Information (No GitHub or Git details) */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[60vh] overflow-y-auto">
          {/* Update Features Highlights Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-500/20 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>આ અપડેટમાં સામેલ સુધારાઓ:</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/80 dark:bg-[#0c1219]/80 border border-slate-200/70 dark:border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">નવી સુવિધાઓ અને ઝડપી કામગીરી</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-normal">
                    રિપોર્ટિંગ, માર્કસ એન્ટ્રી અને વિદ્યાર્થી પોર્ટલમાં વધુ ઝડપી અનુભવ.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/80 dark:bg-[#0c1219]/80 border border-slate-200/70 dark:border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">PDF ડાઉનલોડ સિસ્ટમ અપડેટ</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-normal">
                    બધા રિપોર્ટ્સ અને પરિણામો સીધા Downloads/Vidyalayam ફોલ્ડરમાં સુરક્ષિત સેવ થાય છે.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/80 dark:bg-[#0c1219]/80 border border-slate-200/70 dark:border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">સુરક્ષા અને સ્થિરતા વધારો</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-normal">
                    ઓફલાઇન કામગીરી અને ઓટોમેટિક ડેટા સિંકમાં અદ્યતન સુધારાઓ.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Android APK Specific Notice */}
          {isAndroid && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <strong className="block font-bold">એન્ડ્રોઇડ એપ યુઝર્સ માટે:</strong>
                <span className="text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-snug block">
                  જો તમે ઇન્સ્ટોલ કરેલ APK વાપરી રહ્યા છો, તો નીચેથી નવી APK ડાઉનલોડ કરીને ઇન્સ્ટોલ કરી શકો છો. કોઈ પેકેજ કોન્ફ્લિક્ટ વગર સીધું અપડેટ થશે.
                </span>
              </div>
            </div>
          )}

          {/* Anti-Conflict Safety Guarantee */}
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 px-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>પરમેનન્ટ સહી અને કેશ-બસ્ટિંગ સુરક્ષા સાથે ૧૦૦% સુસંગત અપડેટ.</span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-[#0c1219]/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="order-2 sm:order-1 px-4 py-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer text-center"
          >
            પછીથી (Remind Later)
          </button>

          {isAndroid && (
            <button
              type="button"
              onClick={handleApkDownload}
              className="order-1 sm:order-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-600/30 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>નવી APK ડાઉનલોડ કરો</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleWebUpdate}
            disabled={isUpdating}
            className="order-1 sm:order-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'અપડેટ થઈ રહ્યું છે...' : 'હમણાં જ અપડેટ કરો'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
