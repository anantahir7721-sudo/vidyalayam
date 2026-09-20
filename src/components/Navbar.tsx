import React, { useState, useEffect, useRef } from 'react';
import { School } from '../types';
import {
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
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export type ActiveTabType =
  | 'overview'
  | 'students'
  | 'staff'
  | 'marks'
  | 'exams'
  | 'online_exams'
  | 'results'
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
}

export const Navbar: React.FC<NavbarProps> = ({
  school,
  onLogout,
  activeTab,
  setActiveTab,
}) => {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreMenuOpen(false);
        setMobileDrawerOpen(false);
      }
    };

    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
    { id: 'staff', label: 'સ્ટાફ', icon: <UserCheck className="w-3.5 h-3.5" /> },
    { id: 'exams', label: 'પરીક્ષાઓ & કસોટી', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'online_exams', label: '📝 ઓનલાઇન MCQ', icon: <FileText className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'results', label: 'પરિણામ', icon: <Award className="w-3.5 h-3.5" /> },
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
    <header className="app-header bg-[#121921]/95 backdrop-blur-md border-b border-white/10 text-[#e4ded6] sticky top-0 z-40 shadow-xl transition-colors duration-200">
      {/* Top institutional strip */}
      <div className="top-strip bg-[#090c10]/95 px-3 sm:px-4 py-1.5 border-b border-white/10 text-xs flex justify-between items-center text-[#a99f91] transition-colors duration-200">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#9d512d] animate-pulse"></span>
          <span className="font-semibold text-[#e4ded6] text-[11px] sm:text-xs">Vidyalayam (વિદ્યાલયમ)</span>
          <span className="text-[#a99f91]/40 hidden sm:inline">|</span>
          <span className="text-[#f59c73] font-medium text-[10px] sm:text-xs hidden sm:inline">Created by NR Chad</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="bg-[#202d38] text-[#e4ded6] border border-white/15 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono">
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
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#9d512d]/20 border border-[#9d512d]/40 flex items-center justify-center text-[#f59c73] shadow-md shrink-0 cursor-pointer"
            title="Dashboard Overview"
          >
            <SchoolIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base lg:text-lg font-black tracking-tight text-[#e4ded6] truncate">
                Vidyalayam
              </h1>
              {school && (
                <span className="bg-[#202d38] text-[#e4ded6] border border-white/15 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono font-medium truncate max-w-[130px] sm:max-w-[200px]">
                  {school.schoolName}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#f59c73] font-semibold tracking-wide truncate">
              Created by NR Chad
            </p>
          </div>
        </div>

        {school ? (
          <>
            {/* Desktop Navigation Menu (Visible on lg screens) */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <nav className="flex items-center glass-card p-1 rounded-2xl border border-white/10 text-xs shrink-0">
                {mainTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleSelectTab(tab.id)}
                      className={`px-2.5 py-2 rounded-xl font-bold transition-all touch-manipulation min-h-[38px] flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-[#9d512d] text-white shadow-md'
                          : 'text-[#a99f91] hover:text-[#e4ded6] hover:bg-white/5'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}

                {/* More Dropdown */}
                <div ref={moreMenuRef} className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => setMoreMenuOpen((prev) => !prev)}
                    aria-expanded={moreMenuOpen}
                    className={`px-2.5 py-2 rounded-xl font-bold transition-all touch-manipulation min-h-[38px] flex items-center gap-1 cursor-pointer ${
                      isMoreActive
                        ? 'bg-[#9d512d] text-white shadow-md'
                        : 'text-[#a99f91] hover:text-[#e4ded6] hover:bg-white/5'
                    }`}
                  >
                    <span>વધુ</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        moreMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {moreMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-60 bg-[#16202c] dark:bg-[#121921] rounded-2xl border border-white/20 p-2 shadow-2xl z-[100] divide-y divide-white/10 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                      <div className="px-3 py-1.5 text-[11px] font-bold text-[#f59c73] uppercase tracking-wider flex items-center justify-between">
                        <span>વધુ વિકલ્પો (More Options)</span>
                        <span className="text-[10px] text-slate-400 font-normal">ESC બંધ કરવા</span>
                      </div>
                      <div className="pt-1 space-y-1">
                        {moreTabs.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleSelectTab(tab.id)}
                            className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                              activeTab === tab.id
                                ? 'bg-[#9d512d] text-white shadow-md'
                                : 'text-[#e4ded6] hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span className={`${activeTab === tab.id ? 'text-white' : 'text-[#f59c73]'}`}>
                              {tab.icon}
                            </span>
                            <span className="truncate">{tab.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </nav>

              <button
                id="btn-sign-out"
                onClick={onLogout}
                className="flex items-center gap-1.5 glass-card hover:bg-rose-950/60 text-[#a99f91] hover:text-rose-300 border border-white/10 hover:border-rose-800/60 px-3 py-2 rounded-2xl text-xs font-semibold transition-all shrink-0 touch-manipulation min-h-[38px] cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>

            {/* Mobile / Tablet Header Controls (Visible on < lg) */}
            <div className="flex lg:hidden items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => setMobileDrawerOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer touch-manipulation min-h-[40px] ${
                  mobileDrawerOpen
                    ? 'bg-[#9d512d] text-white border-[#f59c73]/40 shadow-lg'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/15'
                }`}
                aria-label="Navigation Menu"
              >
                {mobileDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4 text-[#f59c73]" />}
                <span className="hidden sm:inline">મેનુ</span>
              </button>

              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-white/15 transition-all cursor-pointer touch-manipulation min-h-[40px] flex items-center justify-center"
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

      {/* Mobile Horizontal Quick-Scroll Bar (For fast 1-tap switching on phones) */}
      {school && (
        <div className="lg:hidden border-t border-white/10 bg-[#0c1218]/90 px-2 py-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          <div ref={scrollContainerRef} className="flex items-center gap-1.5 min-w-max">
            {allTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all touch-manipulation cursor-pointer border ${
                    isActive
                      ? 'bg-[#9d512d] text-white border-[#f59c73]/50 shadow-md scale-[1.02]'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-[#f59c73]'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Full-Screen Mobile Drawer / Navigation Sheet */}
      {school && mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 top-[88px] z-50 bg-black/80 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
          <div className="flex-1 bg-[#101720] border-t border-white/15 overflow-y-auto p-4 space-y-4">
            {/* School Profile Card */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{school.schoolName}</div>
                <div className="text-xs text-[#f59c73] font-mono mt-0.5">DISE: {school.diseCode}</div>
              </div>
              <button
                onClick={() => handleSelectTab('profile')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white border border-white/15 cursor-pointer"
              >
                પ્રોફાઇલ
              </button>
            </div>

            {/* Main Tabs Group */}
            <div>
              <div className="text-[11px] font-bold text-[#f59c73] uppercase tracking-wider px-1 mb-2">
                મુખ્ય વિભાગો (Core Sections)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {mainTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleSelectTab(tab.id)}
                      className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer min-h-[46px] border ${
                        isActive
                          ? 'bg-[#9d512d] text-white border-[#f59c73]/60 shadow-lg'
                          : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`p-1.5 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-[#f59c73]'}`}>
                          {tab.icon}
                        </span>
                        <span className="text-sm font-semibold">{tab.label}</span>
                      </div>
                      {isActive && <span className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* School Tools & Reports Group */}
            <div>
              <div className="text-[11px] font-bold text-[#a99f91] uppercase tracking-wider px-1 mb-2">
                શાળા સાધનો & અહેવાલો (Tools & Reports)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {moreTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleSelectTab(tab.id)}
                      className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer min-h-[46px] border ${
                        isActive
                          ? 'bg-[#9d512d] text-white border-[#f59c73]/60 shadow-lg'
                          : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`p-1.5 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-[#f59c73]'}`}>
                          {tab.icon}
                        </span>
                        <span className="text-sm font-semibold">{tab.label}</span>
                      </div>
                      {isActive && <span className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Drawer Logout */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onLogout();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[46px]"
              >
                <LogOut className="w-4 h-4" />
                <span>શાળા લોગ આઉટ કરો (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
