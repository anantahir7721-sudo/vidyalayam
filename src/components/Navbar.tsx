import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { School } from '../types';
import {
  ArrowLeft,
  School as SchoolIcon,
  LogOut,
  ShieldCheck,
  Award,
  BookOpen,
  Users,
  UserCheck,
  CreditCard,
  FileText,
  Building,
  BarChart3,
  ChevronDown,
  LayoutDashboard,
  Menu,
  X,
  Sparkles,
  ClipboardList,
  KeyRound,
  MessageSquare,
  UserPlus,
  Smartphone,
  Monitor,
  RotateCcw,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ChangePasswordModal } from './ChangePasswordModal';
import { VidyalayamLogo } from './VidyalayamLogo';
import { useDeviceType } from '../utils/useDeviceType';

export type ActiveTabType =
  | 'overview'
  | 'students'
  | 'admissions'
  | 'staff'
  | 'marks'
  | 'exams'
  | 'online_exams'
  | 'results'
  | 'parent_messaging'
  | 'idcards'
  | 'certificates'
  | 'reports'
  | 'profile'
  | 'subjects'
  | 'security';

interface NavbarProps {
  school: School | null;
  onLogout: () => void;
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  canGoBack?: boolean;
  onBack?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  school,
  onLogout,
  activeTab,
  setActiveTab,
  canGoBack = false,
  onBack,
}) => {
  const device = useDeviceType();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const moreMenuBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuDropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const updateDropdownCoords = () => {
    if (moreMenuBtnRef.current) {
      const rect = moreMenuBtnRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    }
  };

  const handleToggleMoreMenu = () => {
    if (!moreMenuOpen) {
      updateDropdownCoords();
      setMoreMenuOpen(true);
    } else {
      setMoreMenuOpen(false);
    }
  };

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        moreMenuBtnRef.current &&
        !moreMenuBtnRef.current.contains(target) &&
        moreMenuDropdownRef.current &&
        !moreMenuDropdownRef.current.contains(target)
      ) {
        setMoreMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreMenuOpen(false);
        setMobileDrawerOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (moreMenuOpen) {
        updateDropdownCoords();
      }
    };

    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreMenuOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  const mainTabs: { id: ActiveTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'ડેશબોર્ડ', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'students', label: 'વિદ્યાર્થીઓ', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'admissions', label: 'નવા પ્રવેશ', icon: <UserPlus className="w-3.5 h-3.5 text-blue-500" /> },
    { id: 'staff', label: 'સ્ટાફ', icon: <UserCheck className="w-3.5 h-3.5" /> },
    { id: 'exams', label: 'પરીક્ષાઓ & કસોટી', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'online_exams', label: '📝 ઓનલાઇન MCQ', icon: <FileText className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'results', label: 'પરિણામ', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'parent_messaging', label: 'વાલી સંચાર', icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> },
    { id: 'idcards', label: 'ID Cards', icon: <CreditCard className="w-3.5 h-3.5" /> },
  ];

  const moreTabs: { id: ActiveTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'certificates', label: 'બોનાફાઈડ / પ્રમાણપત્ર', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'reports', label: 'શાળા અહેવાલો / Excel', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'profile', label: 'શાળા પ્રોફાઇલ', icon: <Building className="w-3.5 h-3.5" /> },
    { id: 'subjects', label: 'વિષય વ્યવસ્થાપન', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  const allTabs = [...mainTabs, ...moreTabs];
  const isMoreActive = moreTabs.some((t) => t.id === activeTab);

  const handleSelectTab = (tabId: ActiveTabType) => {
    setActiveTab(tabId);
    setMoreMenuOpen(false);
    setMobileDrawerOpen(false);
  };

  return (
    <header className="app-header bg-[#f7f5f0] dark:bg-[#121921] border-b border-[#d8d0c5] dark:border-white/10 text-[#141d24] dark:text-[#e4ded6] sticky top-0 z-40 shadow-xl transition-colors duration-200">
      {/* Top institutional strip */}
      <div className="top-strip bg-[#ede8e0]/95 dark:bg-[#090c10]/95 px-3 sm:px-4 py-1.5 border-b border-[#d8d0c5] dark:border-white/10 text-xs flex justify-between items-center text-[#635848] dark:text-[#a99f91] transition-colors duration-200">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#9d512d] animate-pulse"></span>
          <span className="font-bold text-[#141d24] dark:text-[#e4ded6] text-[11px] sm:text-xs">Vidyalayam</span>
          <span className="text-[#635848]/40 dark:text-[#a99f91]/40 hidden sm:inline">•</span>
          <span className="text-[#9d512d] dark:text-[#f59c73] font-semibold text-[10px] sm:text-xs hidden sm:inline">by NRChad</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Active device indicator & manual toggle */}
          <button
            type="button"
            onClick={() => {
              const next =
                device.viewMode === 'mobile'
                  ? 'desktop'
                  : device.viewMode === 'desktop'
                  ? 'auto'
                  : device.isMobile
                  ? 'desktop'
                  : 'mobile';
              device.setViewMode(next);
            }}
            className="inline-flex items-center gap-1 bg-white/80 dark:bg-[#202d38] text-[#141d24] dark:text-[#e4ded6] border border-[#d8d0c5] dark:border-white/15 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold shadow-xs cursor-pointer hover:border-[#9d512d] transition-all"
            title={`મોડ: ${device.effectiveType === 'mobile' ? 'મોબાઇલ ઓપ્ટિમાઇઝ્ડ' : 'ડેસ્કટોપ મોડ'} (${device.viewMode === 'auto' ? 'ઓટો ડિવાઇસ' : 'મેન્યુઅલ'}). ક્લિક કરીને બદલો.`}
          >
            {device.effectiveType === 'mobile' ? (
              <>
                <Smartphone className="w-3 h-3 text-[#9d512d] dark:text-[#f59c73]" />
                <span>મોબાઇલ</span>
              </>
            ) : (
              <>
                <Monitor className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>ડેસ્કટોપ</span>
              </>
            )}
            {device.viewMode !== 'auto' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#9d512d] animate-pulse"></span>
            )}
          </button>

          <span className="bg-white dark:bg-[#202d38] text-[#141d24] dark:text-[#e4ded6] border border-[#d8d0c5] dark:border-white/15 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono shadow-xs hidden xs:inline">
            ગુજરાત શાળાઓ
          </span>
          <ThemeToggle compact className="ml-1" />
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & School info */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={() => handleSelectTab('overview')}
            className="shrink-0 cursor-pointer transition-transform hover:scale-105"
            title="Dashboard Overview"
          >
            <VidyalayamLogo size={38} glow />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base lg:text-lg font-black tracking-tight text-[#141d24] dark:text-[#e4ded6] truncate">
                Vidyalayam
              </h1>
              {school && (
                <span className="bg-white dark:bg-[#202d38] text-[#141d24] dark:text-[#e4ded6] border border-[#d8d0c5] dark:border-white/15 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono font-medium truncate max-w-[130px] sm:max-w-[200px] shadow-xs">
                  {school.schoolName}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#9d512d] dark:text-[#f59c73] font-semibold tracking-wide truncate">
              Created by NR Chad
            </p>
          </div>
        </div>

        {school ? (
          <>
            {/* Desktop Navigation Menu (Visible on lg screens >= 1024px) */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {canGoBack && onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/80 dark:bg-white/5 hover:bg-[#ede8e0] dark:hover:bg-white/10 text-[#141d24] dark:text-[#e4ded6] border border-[#d8d0c5] dark:border-white/10 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 touch-manipulation min-h-[38px]"
                  title="પાછળના મેનુ પર જાઓ (Go Back)"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#9d512d] dark:text-[#f59c73]" />
                  <span>પાછળ</span>
                </button>
              )}

              <nav className="flex items-center bg-[#ede8e0]/80 dark:bg-white/5 p-1 rounded-2xl border border-[#d8d0c5] dark:border-white/10 text-xs shrink-0">
                {mainTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleSelectTab(tab.id)}
                      className={`px-2.5 py-2 rounded-xl font-bold transition-all touch-manipulation min-h-[38px] flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-[#9d512d] text-white shadow-md'
                          : 'text-[#635848] dark:text-[#a99f91] hover:text-[#141d24] dark:hover:text-[#e4ded6] hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                      {tab.id === 'admissions' && school?.admissionSettings?.isOpen && (
                        <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-pulse shadow-xs">
                          OPEN
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* More Dropdown */}
                <div className="relative inline-block">
                  <button
                    ref={moreMenuBtnRef}
                    type="button"
                    onClick={handleToggleMoreMenu}
                    aria-expanded={moreMenuOpen}
                    className={`px-2.5 py-2 rounded-xl font-bold transition-all touch-manipulation min-h-[38px] flex items-center gap-1 cursor-pointer ${
                      isMoreActive
                        ? 'bg-[#9d512d] text-white shadow-md'
                        : 'text-[#635848] dark:text-[#a99f91] hover:text-[#141d24] dark:hover:text-[#e4ded6] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>વધુ</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        moreMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {moreMenuOpen &&
                    createPortal(
                      <div
                        ref={moreMenuDropdownRef}
                        style={{
                          position: 'fixed',
                          top: `${dropdownCoords.top}px`,
                          right: `${dropdownCoords.right}px`,
                          zIndex: 99999,
                        }}
                        className="w-64 bg-white dark:bg-[#16202c] rounded-2xl border border-[#d8d0c5] dark:border-white/20 p-2 shadow-2xl divide-y divide-[#d8d0c5]/60 dark:divide-white/10 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                      >
                        <div className="px-3 py-1.5 text-[11px] font-bold text-[#9d512d] dark:text-[#f59c73] uppercase tracking-wider flex items-center justify-between">
                          <span>વધુ વિકલ્પો (More Options)</span>
                          <span className="text-[10px] text-stone-400 font-normal">ESC બંધ કરવા</span>
                        </div>
                        <div className="pt-1 space-y-1">
                          {moreTabs.map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                setMoreMenuOpen(false);
                                handleSelectTab(tab.id);
                              }}
                              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                                activeTab === tab.id
                                  ? 'bg-[#9d512d] text-white shadow-md'
                                  : 'text-[#141d24] dark:text-[#e4ded6] hover:bg-[#ede8e0] dark:hover:bg-white/10'
                              }`}
                            >
                              <span className={`${activeTab === tab.id ? 'text-white' : 'text-[#9d512d] dark:text-[#f59c73]'}`}>
                                {tab.icon}
                              </span>
                              <span className="truncate">{tab.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>,
                      document.body
                    )}
                </div>
              </nav>

              {school && (
                <button
                  id="btn-nav-change-password"
                  onClick={() => setChangePasswordOpen(true)}
                  className="flex items-center gap-1.5 bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-400/40 dark:border-amber-500/30 px-3 py-2 rounded-2xl text-xs font-semibold transition-all shrink-0 touch-manipulation min-h-[38px] cursor-pointer shadow-xs"
                  title="શાળા પાસવર્ડ બદલો (Change Password)"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden 2xl:inline">પાસવર્ડ</span>
                </button>
              )}

              <button
                id="btn-sign-out"
                onClick={onLogout}
                className="flex items-center gap-1.5 bg-white/80 dark:bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/60 text-[#635848] dark:text-[#a99f91] hover:text-rose-600 dark:hover:text-rose-300 border border-[#d8d0c5] dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-800/60 px-3 py-2 rounded-2xl text-xs font-semibold transition-all shrink-0 touch-manipulation min-h-[38px] cursor-pointer shadow-xs"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>

            {/* Mobile / Tablet Header Controls (Visible on < lg screens) */}
            <div className="flex lg:hidden items-center gap-1 sm:gap-1.5 shrink-0">
              {canGoBack && onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#ede8e0] hover:bg-[#dfd7cc] dark:bg-white/10 dark:hover:bg-white/15 text-[#141d24] dark:text-[#e4ded6] border border-[#d8d0c5] dark:border-white/15 transition-all cursor-pointer touch-manipulation min-h-[36px] active:scale-95 shadow-xs shrink-0"
                  title="પાછળના મેનુ પર જાઓ (Go Back)"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#9d512d] dark:text-[#f59c73]" />
                  <span className="text-[11px] sm:text-xs">પાછળ</span>
                </button>
              )}

              {/* Quick Students button on tablets only (>= sm) */}
              <button
                type="button"
                onClick={() => handleSelectTab('students')}
                className={`hidden sm:flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer touch-manipulation min-h-[36px] ${
                  activeTab === 'students'
                    ? 'bg-[#9d512d] text-white border-[#9d512d] shadow-sm'
                    : 'bg-white dark:bg-white/5 hover:bg-[#ede8e0] dark:hover:bg-white/10 text-[#141d24] dark:text-white border-[#d8d0c5] dark:border-white/15'
                }`}
                title="વિદ્યાર્થીઓ"
              >
                <Users className={`w-3.5 h-3.5 ${activeTab === 'students' ? 'text-white' : 'text-[#9d512d] dark:text-[#f59c73]'}`} />
                <span className="text-[11px] sm:text-xs">વિદ્યાર્થીઓ</span>
              </button>

              {/* Mobile Drawer Menu Button */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen((prev) => !prev)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer touch-manipulation min-h-[36px] ${
                  mobileDrawerOpen
                    ? 'bg-[#9d512d] text-white border-[#f59c73]/40 shadow-lg'
                    : 'bg-white dark:bg-white/5 hover:bg-[#ede8e0] dark:hover:bg-white/10 text-[#141d24] dark:text-white border-[#d8d0c5] dark:border-white/15'
                }`}
                aria-label="Navigation Menu"
              >
                {mobileDrawerOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4 text-[#9d512d] dark:text-[#f59c73]" />
                )}
                <span className="text-[11px] sm:text-xs">મેનુ</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-[#635848] dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 border border-[#d8d0c5] dark:border-white/15 transition-all cursor-pointer touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center shadow-xs shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        )}
      </div>

      {/* Mobile Full-Screen Navigation Drawer via Portal to document.body */}
      {school && mobileDrawerOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="lg:hidden fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex flex-col justify-end sm:justify-center animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileDrawerOpen(false);
          }}
        >
          <div className="w-full h-full max-h-[100dvh] bg-[#f7f5f0] dark:bg-[#0c1219] text-[#141d24] dark:text-[#e4ded6] flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header with Close Button */}
            <div className="bg-[#ede8e0] dark:bg-[#121921] border-b border-[#d8d0c5] dark:border-white/15 px-4 py-3 flex items-center justify-between shrink-0 shadow-lg">
              <div className="flex items-center gap-3 min-w-0">
                <VidyalayamLogo size={36} />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#141d24] dark:text-white truncate">{school.schoolName}</div>
                  <div className="text-xs text-[#9d512d] dark:text-[#f59c73] font-mono mt-0.5">
                    DISE: {school.diseCode} {school.district ? `• ${school.district}` : ''}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-[#141d24] dark:text-white text-xs font-bold transition-colors cursor-pointer touch-manipulation border border-[#d8d0c5] dark:border-transparent"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
                <span>બંધ કરો</span>
              </button>
            </div>

            {/* Drawer Menu Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12 bg-[#f7f5f0] dark:bg-[#0c1219]">
              {/* Device Mode Switcher */}
              <div className="p-3 rounded-2xl bg-white dark:bg-white/[0.04] border border-[#d8d0c5] dark:border-white/10 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#9d512d] dark:text-[#f59c73] uppercase tracking-wider text-[11px]">
                    ડિસ્પ્લે / ડિવાઇસ મોડ (Device View)
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {device.screenWidth}px ({device.deviceType})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-black/40">
                  <button
                    type="button"
                    onClick={() => device.setViewMode('mobile')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      device.viewMode === 'mobile'
                        ? 'bg-[#9d512d] text-white shadow-sm'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>મોબાઇલ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => device.setViewMode('desktop')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      device.viewMode === 'desktop'
                        ? 'bg-[#9d512d] text-white shadow-sm'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>ડેસ્કટોપ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => device.setViewMode('auto')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      device.viewMode === 'auto'
                        ? 'bg-[#9d512d] text-white shadow-sm'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ઓટો</span>
                  </button>
                </div>
              </div>
              {/* Quick Profile Access */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.04] border border-[#d8d0c5] dark:border-white/10 flex items-center justify-between shadow-xs">
                <div className="min-w-0">
                  <div className="text-xs text-[#635848] dark:text-[#a99f91]">સક્રિય શાળા પ્રોફાઇલ</div>
                  <div className="text-sm font-bold text-[#141d24] dark:text-white truncate">{school.schoolName}</div>
                </div>
                <button
                  onClick={() => handleSelectTab('profile')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#9d512d] hover:bg-[#b55e34] text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  પ્રોફાઇલ જુઓ
                </button>
              </div>

              {/* Main Tabs Group */}
              <div>
                <div className="text-[11px] font-bold text-[#9d512d] dark:text-[#f59c73] uppercase tracking-wider px-1 mb-2">
                  મુખ્ય વિભાગો (Core Modules)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mainTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleSelectTab(tab.id)}
                        className={`w-full px-4 py-3 rounded-2xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer min-h-[48px] border shadow-xs ${
                          isActive
                            ? 'bg-[#9d512d] text-white border-[#f59c73]/60 shadow-lg'
                            : 'bg-white dark:bg-white/5 hover:bg-[#ede8e0] dark:hover:bg-white/10 text-[#141d24] dark:text-slate-200 border-[#d8d0c5] dark:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`p-2 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'bg-[#ede8e0] dark:bg-white/5 text-[#9d512d] dark:text-[#f59c73]'}`}>
                            {tab.icon}
                          </span>
                          <span className="text-sm font-semibold">{tab.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {tab.id === 'admissions' && school?.admissionSettings?.isOpen && (
                            <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-xs">
                              OPEN
                            </span>
                          )}
                          {isActive && <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* School Tools & Reports Group */}
              <div>
                <div className="text-[11px] font-bold text-[#635848] dark:text-[#a99f91] uppercase tracking-wider px-1 mb-2">
                  શાળા સાધનો & અહેવાલો (Tools & Reports)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {moreTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleSelectTab(tab.id)}
                        className={`w-full px-4 py-3 rounded-2xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer min-h-[48px] border shadow-xs ${
                          isActive
                            ? 'bg-[#9d512d] text-white border-[#f59c73]/60 shadow-lg'
                            : 'bg-white dark:bg-white/5 hover:bg-[#ede8e0] dark:hover:bg-white/10 text-[#141d24] dark:text-slate-200 border-[#d8d0c5] dark:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`p-2 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'bg-[#ede8e0] dark:bg-white/5 text-[#9d512d] dark:text-[#f59c73]'}`}>
                            {tab.icon}
                          </span>
                          <span className="text-sm font-semibold">{tab.label}</span>
                        </div>
                        {isActive && <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Drawer Logout & Close Actions */}
              <div className="pt-3 border-t border-[#d8d0c5] dark:border-white/10 space-y-2">
                {school && (
                  <button
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setChangePasswordOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px] shadow-xs"
                  >
                    <KeyRound className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>શાળા પાસવર્ડ બદલો (Change Password)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onLogout();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-950 dark:text-rose-200 border-2 border-rose-300 dark:border-rose-500/30 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px] shadow-xs"
                >
                  <LogOut className="w-4 h-4 text-rose-800 dark:text-rose-300 shrink-0" />
                  <span className="text-rose-950 dark:text-rose-200 font-extrabold">શાળા લોગ આઉટ કરો (Logout)</span>
                </button>

                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full py-3 px-4 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-[#141d24] dark:text-slate-300 border border-[#d8d0c5] dark:border-white/10 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
                >
                  <X className="w-4 h-4" />
                  <span>મેનુ બંધ કરો (Close)</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Convenient Bottom Navigation Bar via Portal to document.body */}
      {school && !mobileDrawerOpen && typeof document !== 'undefined' && createPortal(
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#0e141c]/95 backdrop-blur-lg border-t border-[#d8d0c5] dark:border-white/10 py-1.5 px-3 flex items-center justify-around shadow-2xl safe-area-pb transition-colors duration-200">
          <button
            onClick={() => handleSelectTab('overview')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview' ? 'text-[#9d512d] dark:text-white font-bold' : 'text-[#635848] hover:text-[#141d24] dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'overview' ? 'bg-[#9d512d] text-white shadow-sm' : 'bg-transparent'}`}>
              <SchoolIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px]">ડેશબોર્ડ</span>
          </button>

          <button
            onClick={() => handleSelectTab('students')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'students' ? 'text-[#9d512d] dark:text-white font-bold' : 'text-[#635848] hover:text-[#141d24] dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'students' ? 'bg-[#9d512d] text-white shadow-sm' : 'bg-transparent'}`}>
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px]">વિદ્યાર્થીઓ</span>
          </button>

          <button
            onClick={() => handleSelectTab('staff')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'staff' ? 'text-[#9d512d] dark:text-white font-bold' : 'text-[#635848] hover:text-[#141d24] dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'staff' ? 'bg-[#9d512d] text-white shadow-sm' : 'bg-transparent'}`}>
              <UserCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px]">સ્ટાફ</span>
          </button>

          <button
            onClick={() => handleSelectTab('exams')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'exams' ? 'text-[#9d512d] dark:text-white font-bold' : 'text-[#635848] hover:text-[#141d24] dark:text-[#a99f91] dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'exams' ? 'bg-[#9d512d] text-white shadow-sm' : 'bg-transparent'}`}>
              <ClipboardList className="w-4 h-4" />
            </div>
            <span className="text-[10px]">પરીક્ષા</span>
          </button>

          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[#9d512d] dark:text-[#f59c73] hover:text-[#141d24] dark:hover:text-white transition-all cursor-pointer"
          >
            <div className="p-1 rounded-lg bg-[#ede8e0] dark:bg-white/5 border border-[#d8d0c5] dark:border-white/10">
              <Menu className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold">મેનુ</span>
          </button>
        </div>,
        document.body
      )}

      {/* School Change Password Modal */}
      {school && changePasswordOpen && (
        <ChangePasswordModal
          isOpen={changePasswordOpen}
          onClose={() => setChangePasswordOpen(false)}
          school={school}
        />
      )}
    </header>
  );
};
