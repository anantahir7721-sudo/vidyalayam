import React, { useState } from 'react';
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
    { id: 'security', label: 'Firestore સુરક્ષા ઓડિટ', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  const isMoreActive = moreTabs.some((t) => t.id === activeTab);

  return (
    <header className="app-header bg-[#121921]/90 backdrop-blur-md border-b border-white/10 text-[#e4ded6] sticky top-0 z-40 shadow-xl transition-colors duration-200">
      {/* Top institutional strip */}
      <div className="top-strip bg-[#090c10]/95 px-4 py-1.5 border-b border-white/10 text-xs flex flex-wrap justify-between items-center text-[#a99f91] transition-colors duration-200">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#9d512d] animate-pulse"></span>
          <span className="font-semibold text-[#e4ded6]">Vidyalayam (વિદ્યાલયમ)</span>
          <span className="text-[#a99f91]/50">|</span>
          <span className="text-[#f59c73] font-medium">Created by NR Chad</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-[#202d38] text-[#e4ded6] border border-white/15 px-2.5 py-0.5 rounded-full text-[11px] font-mono">
            જનરલ સ્કૂલ મેનેજમેન્ટ સિસ્ટમ
          </span>
          <span className="text-[#a99f91] hidden md:inline">Cloud Firestore Database</span>
          <ThemeToggle compact className="ml-1" />
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('overview')}
            className="w-10 h-10 rounded-2xl bg-[#9d512d]/20 border border-[#9d512d]/40 flex items-center justify-center text-[#f59c73] shadow-md shrink-0 cursor-pointer"
            title="Dashboard Overview"
          >
            <SchoolIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-[#e4ded6]">
                Vidyalayam
              </h1>
              {school && (
                <span className="bg-[#202d38] text-[#e4ded6] border border-white/15 text-xs px-2.5 py-0.5 rounded-full font-mono font-medium truncate max-w-[220px]">
                  {school.schoolName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#f59c73] font-semibold tracking-wide">
              Created by NR Chad
            </p>
          </div>
        </div>

        {school ? (
          <div className="w-full lg:w-auto flex items-center justify-between sm:justify-end gap-2 overflow-x-auto pb-1 sm:pb-0">
            <nav className="flex items-center glass-card p-1 rounded-2xl border border-white/10 text-xs shrink-0">
              {mainTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMoreMenuOpen(false);
                    }}
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
              <div className="relative">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`px-2.5 py-2 rounded-xl font-bold transition-all touch-manipulation min-h-[38px] flex items-center gap-1 cursor-pointer ${
                    isMoreActive
                      ? 'bg-[#9d512d] text-white shadow-md'
                      : 'text-[#a99f91] hover:text-[#e4ded6] hover:bg-white/5'
                  }`}
                >
                  <span>વધુ</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {moreMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-2xl border border-white/20 p-2 shadow-2xl z-50 divide-y divide-white/5">
                    {moreTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMoreMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                          activeTab === tab.id
                            ? 'bg-[#9d512d] text-white'
                            : 'text-[#e4ded6] hover:bg-white/10'
                        }`}
                      >
                        <span className="text-[#f59c73]">{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            <ThemeToggle className="hidden sm:inline-flex shrink-0" />

            <button
              id="btn-sign-out"
              onClick={onLogout}
              className="flex items-center gap-1.5 glass-card hover:bg-rose-950/60 text-[#a99f91] hover:text-rose-300 border border-white/10 hover:border-rose-800/60 px-3 py-2 rounded-2xl text-xs font-semibold transition-all shrink-0 touch-manipulation min-h-[38px] cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        )}
      </div>
    </header>
  );
};
