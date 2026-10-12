import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Sparkles,
  ArrowUpCircle,
  Bell,
  KeyRound,
  Building,
  Monitor,
  Smartphone,
  Info,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { School } from '../types';
import { GitHubUpdateInfo, applyAppUpdate, getAppVersion } from '../services/appUpdateService';
import { VidyalayamLogo } from './VidyalayamLogo';
import { haptic } from '../utils/haptics';
import { useDeviceType } from '../utils/useDeviceType';

interface SettingsTabProps {
  school?: School | null;
  updateInfo?: GitHubUpdateInfo | null;
  onOpenChangePassword?: () => void;
  onOpenNotificationSettings?: () => void;
  onNavigateToProfile?: () => void;
  onBack?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  school,
  updateInfo,
  onOpenChangePassword,
  onOpenNotificationSettings,
  onNavigateToProfile,
  onBack,
}) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const device = useDeviceType();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelectMode = (mode: ThemeMode) => {
    haptic.light();
    setThemeMode(mode);
  };

  const handleManualCheckUpdate = async () => {
    setCheckingUpdate(true);
    haptic.medium();
    window.dispatchEvent(new CustomEvent('check-app-update', { detail: { manual: true } }));
    setTimeout(() => {
      setCheckingUpdate(false);
    }, 1500);
  };

  const handleApplyUpdate = async () => {
    if (!updateInfo) return;
    setIsUpdating(true);
    haptic.success();
    await applyAppUpdate(updateInfo.latestCommitSha);
  };

  const systemIsDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-[#E2E8F0] dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#C45A2D] to-[#9d512d] text-white shadow-md">
            <VidyalayamLogo size={36} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              સેટિંગ્સ & પસંદગીઓ (Settings)
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#a99f91] mt-0.5">
              થીમ, ડિસ્પ્લે મોડ, નોટિફિકેશન અને સિસ્ટમ અપડેટ્સ
            </p>
          </div>
        </div>

        {school && (
          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
              {school.schoolName}
            </span>
            <span className="text-[11px] text-[#C45A2D] dark:text-[#f59c73] font-mono">
              DISE: {school.diseCode}
            </span>
          </div>
        )}
      </div>

      {/* SECTION 1: THEME CUSTOMIZATION (LIGHT, DARK, AUTO) */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-[#E2E8F0] dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                એપ્લિકેશન થીમ (Theme Mode)
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#a99f91]">
                લાઇટ, ડાર્ક અથવા સિસ્ટમ મુજબ ઓટો થીમ પસંદ કરો
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-[#e4ded6]">
            હાલ સક્રિય: {themeMode === 'light' ? '☀️ લાઇટ' : themeMode === 'dark' ? '🌙 ડાર્ક' : '⚡ ઓટો (સિસ્ટમ)'}
          </span>
        </div>

        {/* 3 Interactive Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
          {/* Option 1: Light Theme */}
          <button
            type="button"
            onClick={() => handleSelectMode('light')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[130px] ${
              themeMode === 'light'
                ? 'bg-amber-50/80 border-[#C45A2D] shadow-md dark:bg-amber-950/20 ring-2 ring-[#C45A2D]/20'
                : 'bg-white dark:bg-[#121921] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
                <Sun className="w-5 h-5" />
              </div>
              {themeMode === 'light' && (
                <CheckCircle2 className="w-5 h-5 text-[#C45A2D]" />
              )}
            </div>
            <div className="mt-3">
              <div className="font-black text-sm text-slate-900 dark:text-white">
                લાઇટ થીમ (Light)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                દિવસના ઉપયોગ માટે તેજસ્વી અને સ્પષ્ટ વાઇટ ઇન્ટરફેસ
              </p>
            </div>
          </button>

          {/* Option 2: Dark Theme */}
          <button
            type="button"
            onClick={() => handleSelectMode('dark')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[130px] ${
              themeMode === 'dark'
                ? 'bg-slate-900/90 border-indigo-500 shadow-md text-white ring-2 ring-indigo-500/20'
                : 'bg-white dark:bg-[#121921] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-indigo-950/80 text-amber-300 border border-white/10">
                <Moon className="w-5 h-5" />
              </div>
              {themeMode === 'dark' && (
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              )}
            </div>
            <div className="mt-3">
              <div className="font-black text-sm text-slate-900 dark:text-white">
                ડાર્ક થીમ (Dark)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                રાત્રિના ઉપયોગ અને આંખોના આરામ માટે ડીપ ડાર્ક ઇન્ટરફેસ
              </p>
            </div>
          </button>

          {/* Option 3: Auto (System) */}
          <button
            type="button"
            onClick={() => handleSelectMode('auto')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[130px] ${
              themeMode === 'auto'
                ? 'bg-emerald-50/80 border-emerald-600 shadow-md dark:bg-emerald-950/20 ring-2 ring-emerald-600/20'
                : 'bg-white dark:bg-[#121921] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">
                <Laptop className="w-5 h-5" />
              </div>
              {themeMode === 'auto' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div className="mt-3">
              <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>ઓટો થીમ (Auto)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold uppercase">
                  સિસ્ટમ
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                ડિવાઇસના OS સેટિંગ મુજબ આપોઆપ થીમ બદલાશે (હાલ: {systemIsDark ? 'Dark' : 'Light'})
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* SECTION 2: APP UPDATE (SHOWN PROMINENTLY ONLY IF UPDATE AVAILABLE) */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-[#E2E8F0] dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                એપ્લિકેશન અપડેટ (App Updates)
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#a99f91]">
                GitHub રીપોઝીટરી અને APK નવી આવૃત્તિ વ્યવસ્થાપન
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualCheckUpdate}
            disabled={checkingUpdate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 cursor-pointer transition-all active:scale-95"
            title="અપડેટ તપાસો"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{checkingUpdate ? 'તપાસી રહ્યું છે...' : 'અપડેટ તપાસો'}</span>
          </button>
        </div>

        {updateInfo?.updateAvailable ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ArrowUpCircle className="w-6 h-6 text-amber-300 animate-bounce shrink-0" />
                <div>
                  <div className="font-black text-sm sm:text-base">
                    🚀 નવી એપ્લિકેશન અપડેટ ({updateInfo.latestVersion || 'લેટેસ્ટ'}) ઉપલબ્ધ છે!
                  </div>
                  <div className="text-xs text-emerald-100 mt-0.5">
                    નવા ફીચર્સ અને ઝડપી પર્ફોર્મન્સ સુધારાઓ સામેલ છે.
                  </div>
                </div>
              </div>
            </div>

            {updateInfo.latestCommitMessage && (
              <div className="p-2.5 rounded-xl bg-black/20 text-xs font-mono text-emerald-100 truncate">
                કમિટ: {updateInfo.latestCommitMessage}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleApplyUpdate}
                disabled={isUpdating}
                className="px-4 py-2 bg-white text-emerald-800 rounded-xl text-xs font-black hover:bg-slate-100 transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>{isUpdating ? 'અપડેટ થઈ રહ્યું છે...' : 'હમણાં જ અપડેટ કરો'}</span>
              </button>

              {updateInfo.apkDownloadUrl && (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('check-app-update', { detail: { manual: true } }));
                  }}
                  className="px-3 py-2 bg-black/30 hover:bg-black/40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  APK ઇન-ઍપ ડાઉનલોડ
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  વિદ્યાલયમ એપ અપ-ટુ-ડેટ છે
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  આપ લેટેસ્ટ વર્ઝન ({updateInfo?.currentVersion || getAppVersion()}) નો ઉપયોગ કરી રહ્યા છો.
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              {updateInfo?.currentVersion || getAppVersion()}
            </span>
          </div>
        )}
      </div>

      {/* SECTION 3: DISPLAY & DEVICE VIEW MODE */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-[#E2E8F0] dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              ડિસ્પ્લે / ડિવાઇસ મોડ (Device View)
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#a99f91]">
              સ્ક્રીન રીઝોલ્યુશન અને લેઆઉટ ઓપ્ટિમાઇઝેશન
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => device.setViewMode('mobile')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              device.viewMode === 'mobile'
                ? 'bg-[#C45A2D] text-white border-[#C45A2D] shadow-sm'
                : 'bg-white dark:bg-[#121921] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Smartphone className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold text-xs sm:text-sm">મોબાઇલ મોડ</div>
              <div className={`text-[11px] ${device.viewMode === 'mobile' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                મોબાઇલ ટચ અને કોમ્પેક્ટ લેઆઉટ
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => device.setViewMode('desktop')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
              device.viewMode === 'desktop'
                ? 'bg-[#C45A2D] text-white border-[#C45A2D] shadow-sm'
                : 'bg-white dark:bg-[#121921] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Monitor className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold text-xs sm:text-sm">ડેસ્કટોપ મોડ</div>
              <div className={`text-[11px] ${device.viewMode === 'desktop' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                મોનીટર / ટેબ્લેટ વાઇડ લેઆઉટ
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* SECTION 4: QUICK SHORTCUTS (NOTIFICATIONS, PASSWORD, PROFILE) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {onOpenNotificationSettings && (
          <button
            type="button"
            onClick={onOpenNotificationSettings}
            className="p-4 rounded-2xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 hover:border-amber-500/50 transition-all text-left cursor-pointer flex items-center gap-3 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">સૂચના સેટિંગ્સ</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">અલાર્મ & નોટિફિકેશન</div>
            </div>
          </button>
        )}

        {school && onOpenChangePassword && (
          <button
            type="button"
            onClick={onOpenChangePassword}
            className="p-4 rounded-2xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 hover:border-amber-500/50 transition-all text-left cursor-pointer flex items-center gap-3 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">પાસવર્ડ બદલો</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">શાળા લૉગિન સુરક્ષા</div>
            </div>
          </button>
        )}

        {school && onNavigateToProfile && (
          <button
            type="button"
            onClick={onNavigateToProfile}
            className="p-4 rounded-2xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 transition-all text-left cursor-pointer flex items-center gap-3 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">શાળા પ્રોફાઇલ</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">શાળાની મૂળ વિગતો</div>
            </div>
          </button>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-500 dark:text-[#a99f91] pt-4">
        <div className="font-bold text-slate-800 dark:text-slate-200">
          Vidyalayam (વિદ્યાલયમ) • Created by NR Chad
        </div>
        <div className="text-[11px] mt-0.5">
          ગુજરાત શિક્ષણ વિભાગ સંદર્ભ માનક એપ્લિકેશન • 100% સુરક્ષિત ક્લાઉડ સિંક
        </div>
      </div>
    </div>
  );
};
