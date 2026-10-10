import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Navbar, ActiveTabType } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { SchoolStatusScreen } from './components/SchoolStatusScreen';
import { DashboardOverview } from './components/DashboardOverview';
import { StudentsManager } from './components/StudentsManager';
import { MarksManager } from './components/MarksManager';
import { SubjectManager } from './components/SubjectManager';
import { SecurityAuditor } from './components/SecurityAuditor';
import { StaffManager } from './components/StaffManager';
import { IdCardsManager } from './components/IdCardsManager';
import { CertificatesManager } from './components/CertificatesManager';
import { ExamsManager } from './components/ExamsManager';
import { ResultsManager } from './components/ResultsManager';
import { ParentMessagingManager } from './components/ParentMessagingManager';
import { ReportsManager } from './components/ReportsManager';
import { SchoolProfileManager } from './components/SchoolProfileManager';
import { OnlineExamManager } from './components/OnlineExamManager';
import { AdmissionManager } from './components/AdmissionManager';
import { SchoolNoticeBoardTab } from './components/SchoolNoticeBoardTab';
import { StudentPortal } from './components/StudentPortal';
import { VidyalayamLoadingScreen } from './components/VidyalayamLoadingScreen';
import { FirstLaunchPermissionModal } from './components/FirstLaunchPermissionModal';
import { runScheduledNotificationCheck } from './services/notificationService';
import { checkForGitHubUpdate, applyAppUpdate, GitHubUpdateInfo } from './services/appUpdateService';
import { School, Student, MarkRecord, Staff, SchoolStatus, StudentSession } from './types';
import { checkIsAdmin } from './services/adminService';
import {
  subscribeToAuth,
  logoutSchool,
  subscribeToSchoolProfile,
  getSchoolByUid,
  AuthRoleStatus,
} from './services/authService';
import {
  subscribeToStudents,
  subscribeToMarks,
  getStudents,
  getMarks,
} from './services/firestoreService';
import { subscribeToStaff } from './services/staffService';
import {
  getStoredStudentSession,
  clearStudentSession,
} from './services/onlineExamService';
import { Loader2, WifiOff, CheckCircle2, ArrowUpCircle, X } from 'lucide-react';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  right: number;
  left: number;
}

interface SafeAreaPlugin {
  getSafeAreaInsets(): Promise<{ insets: SafeAreaInsets }>;
  getStatusBarHeight?(): Promise<{ height: number }>;
  addListener?(
    eventName: 'safeAreaChanged',
    listenerFunc: (data: { insets: SafeAreaInsets }) => void
  ): Promise<{ remove: () => void }>;
}

const SafeArea = registerPlugin<SafeAreaPlugin>('SafeArea');

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthRoleStatus>('loading');
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);

  // Dynamically detect and apply real system status bar height using Capacitor SafeArea plugin
  useEffect(() => {
    let removeListener: (() => void) | null = null;
    let isMounted = true;

    const applyStatusBarHeight = (heightPx: number) => {
      if (typeof document === 'undefined') return;
      if (typeof heightPx === 'number' && !isNaN(heightPx) && heightPx > 0) {
        document.documentElement.style.setProperty('--system-status-bar-height', `${heightPx}px`);
      }
    };

    const detectStatusBarHeight = async () => {
      let detectedTop = 0;

      // 1. Query Capacitor SafeArea plugin
      try {
        if (Capacitor.isPluginAvailable('SafeArea')) {
          const res = await SafeArea.getSafeAreaInsets();
          if (res?.insets?.top && res.insets.top > 0) {
            detectedTop = res.insets.top;
          }
        }
      } catch (err) {}

      // 2. Query Native Android Bridge interface (injected via BridgeActivity in WebView)
      if (detectedTop === 0) {
        try {
          const androidBridge = (window as any).AndroidBridge;
          if (androidBridge && typeof androidBridge.getStatusBarHeight === 'function') {
            const bridgeH = Number(androidBridge.getStatusBarHeight());
            if (!isNaN(bridgeH) && bridgeH > 0) {
              detectedTop = bridgeH;
            }
          }
        } catch (err) {}
      }

      // 3. Fallback for mobile devices and notches
      if (detectedTop === 0) {
        try {
          const isNative = Capacitor.isNativePlatform() || (window as any).AndroidBridge !== undefined;
          const isMobileDevice =
            window.innerWidth < 768 ||
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

          if (isNative || isMobileDevice) {
            const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
            detectedTop = isIos ? 44 : 36;
          }
        } catch (err) {}
      }

      if (isMounted && detectedTop > 0) {
        applyStatusBarHeight(detectedTop);
      }
    };

    // Immediate detection on mount
    detectStatusBarHeight();

    // Listen for real-time status bar / safe area changes (device orientation, window resizing, notch posture)
    try {
      if (Capacitor.isPluginAvailable('SafeArea') && typeof SafeArea.addListener === 'function') {
        SafeArea.addListener('safeAreaChanged', (data: { insets: SafeAreaInsets }) => {
          if (isMounted && data?.insets?.top !== undefined && data.insets.top > 0) {
            applyStatusBarHeight(data.insets.top);
          }
        }).then((handle) => {
          if (!isMounted) {
            handle?.remove?.();
          } else {
            removeListener = () => handle?.remove?.();
          }
        }).catch(() => {});
      }
    } catch (err) {}

    // Listen to resize and orientation changes
    const handleViewportChange = () => {
      detectStatusBarHeight();
    };

    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('orientationchange', handleViewportChange, { passive: true });

    return () => {
      isMounted = false;
      if (removeListener) {
        removeListener();
      }
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, []);

  // Minimum splash display duration for smooth meditative animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [school, setSchool] = useState<School | null>(null);
  const [statusRefreshing, setStatusRefreshing] = useState(false);

  // Student Portal State
  const [studentSession, setStudentSession] = useState<StudentSession | null>(() =>
    getStoredStudentSession()
  );

  // Active School Data
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Active Navigation Tab History Stack with LocalStorage persistence to survive network reloads
  const [tabHistory, setTabHistory] = useState<ActiveTabType[]>(() => {
    try {
      const savedHistory = localStorage.getItem('vidyalayam_tab_history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as ActiveTabType[];
        }
      }
      const lastTab = localStorage.getItem('vidyalayam_last_active_tab') as ActiveTabType;
      if (lastTab && lastTab !== 'overview') {
        return ['overview', lastTab];
      }
    } catch (e) {
      console.warn('Could not restore tabHistory from localStorage:', e);
    }
    return ['overview'];
  });
  const activeTab: ActiveTabType = tabHistory[tabHistory.length - 1] || 'overview';
  const isInternalPopRef = useRef(false);

  // Network connectivity status
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showOnlineRestored, setShowOnlineRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineRestored(true);
      const timer = setTimeout(() => setShowOnlineRestored(false), 3500);
      return () => clearTimeout(timer);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Automated 06:00 AM, 02:00 PM, 06:00 PM Scheduled Notifications Engine
  useEffect(() => {
    runScheduledNotificationCheck();
    const schedInterval = setInterval(() => {
      runScheduledNotificationCheck();
    }, 30000);
    return () => clearInterval(schedInterval);
  }, []);

  // Check for updates pushed to GitHub
  const [appUpdate, setAppUpdate] = useState<GitHubUpdateInfo | null>(null);
  const [dismissUpdateBanner, setDismissUpdateBanner] = useState(false);

  useEffect(() => {
    checkForGitHubUpdate().then((info) => {
      if (info && info.updateAvailable) {
        setAppUpdate(info);
      }
    });
  }, []);

  // Persist tabHistory and activeTab across browser and app reloads
  useEffect(() => {
    try {
      localStorage.setItem('vidyalayam_tab_history', JSON.stringify(tabHistory));
      const current = tabHistory[tabHistory.length - 1] || 'overview';
      localStorage.setItem('vidyalayam_last_active_tab', current);
    } catch (e) {}
  }, [tabHistory]);

  // Synchronize with browser / mobile hardware Back Button (popstate)
  useEffect(() => {
    try {
      const current = tabHistory[tabHistory.length - 1] || 'overview';
      window.history.replaceState({ tab: current }, '');
    } catch (e) {
      // ignore in environments where history API might be restricted
    }

    const handlePopState = (event: PopStateEvent) => {
      if (isInternalPopRef.current) {
        isInternalPopRef.current = false;
        return;
      }
      setTabHistory((prev) => {
        if (prev.length > 1) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToTab = useCallback((newTab: ActiveTabType, replace = false) => {
    setTabHistory((prev) => {
      const current = prev[prev.length - 1];
      if (current === newTab) return prev; // Do not push consecutive duplicate tabs

      if (newTab === 'overview') {
        try {
          window.history.replaceState({ tab: 'overview' }, '');
        } catch (e) {}
        return ['overview'];
      }

      if (replace) {
        const next = [...prev.slice(0, -1), newTab];
        try {
          window.history.replaceState({ tab: newTab }, '');
        } catch (e) {}
        return next;
      }

      const next = [...prev, newTab];
      try {
        window.history.pushState({ tab: newTab }, '');
      } catch (e) {}
      return next;
    });
  }, []);

  const navigateBack = useCallback(() => {
    setTabHistory((prev) => {
      if (prev.length <= 1) {
        return ['overview'];
      }
      try {
        isInternalPopRef.current = true;
        window.history.back();
      } catch (e) {}
      const next = prev.slice(0, -1);
      return next.length > 0 ? next : ['overview'];
    });
  }, []);

  // Expose native back button handler for Android hardware back and edge swipe
  useEffect(() => {
    (window as any).__handleNativeBack = () => {
      const current = tabHistory[tabHistory.length - 1] || 'overview';
      if (current !== 'overview' || tabHistory.length > 1) {
        navigateBack();
        return true;
      }
      return false;
    };
    return () => {
      delete (window as any).__handleNativeBack;
    };
  }, [tabHistory, navigateBack]);

  // Listen for Firebase Auth state changes and determine Admin vs School role
  useEffect(() => {
    const unsubscribe = subscribeToAuth(({ status, user: fbUser, isAdmin: userIsAdmin, school: schoolProfile }) => {
      setAuthStatus(status);
      if (fbUser) {
        setUser({ uid: fbUser.uid, email: fbUser.email });
        setIsAdmin(userIsAdmin);
        setSchool(schoolProfile);
      } else {
        setUser(null);
        setIsAdmin(false);
        setSchool(null);
        setStudents([]);
        setMarks([]);
        setStaffList([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for current school's document
  // Enables instant access unlock as soon as an Admin approves the school
  useEffect(() => {
    if (!school?.id || isAdmin) return;

    const unsubProfile = subscribeToSchoolProfile(school.id, (updatedProfile) => {
      if (updatedProfile) {
        setSchool(updatedProfile);
      }
    });

    return () => unsubProfile();
  }, [school?.id, isAdmin]);

  // Real-time synchronization of school records (Students, Marks, Staff)
  const isSchoolApproved = school && (school.status === 'approved' || !school.status);

  useEffect(() => {
    if (!isSchoolApproved || !school) {
      setStudents([]);
      setMarks([]);
      setStaffList([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    let studentsLoaded = false;
    let marksLoaded = false;

    const unsubStudents = subscribeToStudents(school.id, (fetchedStudents) => {
      setStudents(fetchedStudents);
      studentsLoaded = true;
      if (marksLoaded) {
        setDataLoading(false);
      }
    });

    const unsubMarks = subscribeToMarks(school.id, (fetchedMarks) => {
      setMarks(fetchedMarks);
      marksLoaded = true;
      if (studentsLoaded) {
        setDataLoading(false);
      }
    });

    const unsubStaff = subscribeToStaff(school.id, (fetchedStaff) => {
      setStaffList(fetchedStaff);
    });

    return () => {
      unsubStudents();
      unsubMarks();
      unsubStaff();
    };
  }, [school?.id, isSchoolApproved]);

  // Manual fallback refresh for school data
  const loadSchoolData = useCallback(async () => {
    if (!school) return;
    setDataLoading(true);
    try {
      const [fetchedStudents, fetchedMarks] = await Promise.all([
        getStudents(school.id),
        getMarks(school.id),
      ]);
      setStudents(fetchedStudents);
      setMarks(fetchedMarks);
    } catch (err) {
      console.error('Error manually refreshing school data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [school]);

  // Manual refresh button on pending screen
  const handleRefreshStatus = async () => {
    if (!user?.uid) return;
    setStatusRefreshing(true);
    try {
      const freshSchool = await getSchoolByUid(user.uid);
      if (freshSchool) {
        setSchool(freshSchool);
      }
    } catch (err) {
      console.error('Error refreshing school approval status:', err);
    } finally {
      setStatusRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      try {
        localStorage.removeItem('vidyalayam_tab_history');
        localStorage.setItem('vidyalayam_last_active_tab', 'overview');
      } catch (e) {}
      setAuthStatus('loading');
      await logoutSchool();
      setUser(null);
      setIsAdmin(false);
      setSchool(null);
      setAuthStatus('unauthenticated');
    } catch (err) {
      console.error('Logout error:', err);
      setAuthStatus('unauthenticated');
    }
  };

  const handleSchoolAuthSuccess = (newSchool: School) => {
    setSchool(newSchool);
    setIsAdmin(false);
    setAuthStatus('school');
  };

  const handleAdminAuthSuccess = () => {
    setIsAdmin(true);
    setSchool(null);
    setAuthStatus('admin');
  };

  // Common App Update Banner Component
  const renderUpdateBanner = () => {
    if (!appUpdate?.updateAvailable || dismissUpdateBanner) return null;
    return (
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md shrink-0 z-50">
        <div className="flex items-center gap-2">
          <ArrowUpCircle className="w-4 h-4 shrink-0" />
          <span>🚀 નવી એપ અપડેટ GitHub પર ઉપલબ્ધ છે! ({appUpdate.latestCommitMessage || 'નવી સુવિધાઓ'})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyAppUpdate(appUpdate.latestCommitSha)}
            className="px-3 py-1 bg-white text-emerald-800 rounded-lg text-[11px] font-black hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
          >
            અપડેટ કરો
          </button>
          <button
            type="button"
            onClick={() => setDismissUpdateBanner(true)}
            className="p-1 hover:bg-white/20 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // 0. Active Student Session: Render dedicated Student Portal
  if (studentSession) {
    return (
      <>
        {renderUpdateBanner()}
        <StudentPortal
          session={studentSession}
          onLogout={() => {
            clearStudentSession();
            setStudentSession(null);
          }}
        />
        <FirstLaunchPermissionModal schoolName={studentSession.schoolName} />
      </>
    );
  }

  // 1. Initial Auth Loading Screen & Role Verification + Splash Animation
  if (authStatus === 'loading' || !minSplashElapsed) {
    return <VidyalayamLoadingScreen />;
  }

  // 2. Unauthenticated: Show AuthScreen (School Login / Register or Admin Login or Student Login)
  if (authStatus === 'unauthenticated' || !user) {
    return (
      <div className="min-h-screen app-container flex flex-col">
        {renderUpdateBanner()}
        <Navbar
          school={null}
          onLogout={() => {}}
          activeTab="overview"
          setActiveTab={() => {}}
        />
        <main className="flex-1 flex flex-col justify-center">
          <AuthScreen
            onSchoolAuthSuccess={handleSchoolAuthSuccess}
            onAdminAuthSuccess={handleAdminAuthSuccess}
            onStudentAuthSuccess={(sess) => setStudentSession(sess)}
          />
        </main>
        <footer className="bg-white/95 dark:bg-[#0e141b]/90 border-t border-slate-200 dark:border-white/10 py-4 text-center text-xs text-slate-600 dark:text-slate-400 space-y-1 transition-colors">
          <div className="font-bold text-slate-900 dark:text-white tracking-wide">
            Vidyalayam (વિદ્યાલયમ)
          </div>
          <div className="text-emerald-600 dark:text-emerald-400 font-medium">
            Created by NR Chad
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            General School Management System • Powered by Google Firebase
          </div>
        </footer>
        <FirstLaunchPermissionModal />
      </div>
    );
  }

  // 3. Authenticated as System Administrator: Show Admin Dashboard
  if (authStatus === 'admin' || isAdmin) {
    return (
      <>
        {renderUpdateBanner()}
        <AdminDashboard
          adminEmail={user.email}
          onLogout={handleLogout}
        />
        <FirstLaunchPermissionModal />
      </>
    );
  }

  // 4. Authenticated as a School
  if (school) {
    const status: SchoolStatus = school.status || 'approved';

    // Pending, Rejected, or Inactive status notice screens
    if (status !== 'approved') {
      return (
        <div className="min-h-screen bg-[#F5F7FA] dark:bg-slate-900 text-slate-900 dark:text-white flex flex-col transition-colors">
          <Navbar
            school={school}
            onLogout={handleLogout}
            activeTab="overview"
            setActiveTab={() => {}}
          />
          <main className="flex-1 flex flex-col justify-center">
            <SchoolStatusScreen
              school={school}
              status={status}
              onLogout={handleLogout}
              onRefresh={handleRefreshStatus}
              refreshing={statusRefreshing}
            />
          </main>
          <footer className="bg-white/90 dark:bg-slate-950/90 border-t border-slate-200 dark:border-white/10 pt-4 pb-24 lg:pb-4 text-center text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white tracking-wide">
              Vidyalayam (વિદ્યાલયમ)
            </div>
            <div className="text-emerald-600 dark:text-emerald-400 font-medium">
              Created by NR Chad
            </div>
          </footer>
        </div>
      );
    }

    // Status is 'approved': Render the full General School Management Application!
    return (
      <div className="min-h-screen app-container flex flex-col">
        {renderUpdateBanner()}
        <Navbar
          school={school}
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={(tab) => navigateToTab(tab)}
          canGoBack={activeTab !== 'overview'}
          onBack={navigateBack}
        />

        {/* Seamless Network Status Notification */}
        {!isOnline && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 animate-in fade-in duration-200">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>ઇન્ટરનેટ કનેક્શન મળતું નથી (ઑફલાઇન મોડ) • આપનું કામ સાચવેલું છે, નેટવર્ક આવતાં આપોઆપ સિંક થશે.</span>
          </div>
        )}
        {showOnlineRestored && isOnline && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>ઇન્ટરનેટ કનેક્શન પુનઃસ્થાપિત થયું છે • વિદ્યાલયમ ઓનલાઇન છે.</span>
          </div>
        )}

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-8">
          {dataLoading && (
            <div className="mb-4 glass-card border border-[#E2E8F0] dark:border-white/10 px-4 py-2 rounded-2xl text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing records with Cloud Firestore...</span>
            </div>
          )}

          {activeTab === 'overview' && (
            <DashboardOverview
              school={school}
              students={students}
              marks={marks}
              staffList={staffList}
              onNavigate={(tab) => navigateToTab(tab)}
              onStudentUpdated={() => loadSchoolData()}
              onSchoolUpdated={(updated) =>
                setSchool((prev) => (prev ? { ...prev, ...updated } : prev))
              }
            />
          )}

          {activeTab === 'notice_board' && (
            <SchoolNoticeBoardTab
              schoolName={school.schoolName}
              diseCode={school.diseCode}
              district={school.district}
              taluka={(school as any).taluka}
              onBack={navigateBack}
            />
          )}

          {activeTab === 'students' && (
            <StudentsManager
              school={school}
              schoolId={school.id}
              students={students}
              onRefresh={loadSchoolData}
              onBack={navigateBack}
            />
          )}

          {activeTab === 'admissions' && (
            <AdmissionManager
              school={school}
              onBack={navigateBack}
              onRefresh={loadSchoolData}
              onNavigateToStudents={() => navigateToTab('students')}
            />
          )}

          {activeTab === 'staff' && (
            <StaffManager
              schoolId={school.id}
              school={school}
              onBack={navigateBack}
              onGenerateIdCard={() => navigateToTab('idcards')}
            />
          )}

          {activeTab === 'marks' && (
            <ExamsManager
              school={school}
              students={students}
              marks={marks}
              onBack={navigateBack}
              onRefresh={loadSchoolData}
              onNavigateToResults={() => navigateToTab('results')}
              initialSubView="ekam_kasoti"
            />
          )}

          {activeTab === 'exams' && (
            <ExamsManager
              school={school}
              students={students}
              marks={marks}
              onBack={navigateBack}
              onRefresh={loadSchoolData}
              onNavigateToResults={() => navigateToTab('results')}
              initialSubView="overview"
            />
          )}

          {activeTab === 'online_exams' && (
            <OnlineExamManager
              school={school}
              students={students}
              onBack={navigateBack}
            />
          )}

          {activeTab === 'results' && (
            <ResultsManager
              school={school}
              students={students}
              marks={marks}
              onBack={navigateBack}
              onNavigateToMarks={() => navigateToTab('exams')}
            />
          )}

          {activeTab === 'parent_messaging' && (
            <ParentMessagingManager
              school={school}
              students={students}
              marks={marks}
              onBack={navigateBack}
              onRefresh={loadSchoolData}
            />
          )}

          {activeTab === 'idcards' && (
            <IdCardsManager
              school={school}
              students={students}
              staffList={staffList}
              onBack={navigateBack}
            />
          )}

          {activeTab === 'certificates' && (
            <CertificatesManager
              school={school}
              students={students}
              onBack={navigateBack}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsManager
              school={school}
              students={students}
              marks={marks}
              staffList={staffList}
              onBack={navigateBack}
            />
          )}

          {activeTab === 'profile' && (
            <SchoolProfileManager
              school={school}
              onProfileUpdated={(updated) => setSchool((prev) => prev ? { ...prev, ...updated } : prev)}
              onBack={navigateBack}
            />
          )}

          {activeTab === 'subjects' && (
            <SubjectManager
              school={school}
              onBack={navigateBack}
            />
          )}

          {activeTab === 'security' && (
            <SecurityAuditor
              school={school}
              onBack={navigateBack}
            />
          )}
        </main>

        <footer className="bg-white/90 dark:bg-[#0e141b]/90 border-t border-slate-200 dark:border-white/10 pt-5 pb-24 lg:pb-6 text-center text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="font-bold text-slate-900 dark:text-white tracking-wide">
            Vidyalayam (વિદ્યાલયમ)
          </div>
          <div className="text-emerald-600 dark:text-emerald-400 font-medium">
            Created by NR Chad
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            General School Management System • Gujarat Education Department Reference Standard
          </div>
        </footer>
        <FirstLaunchPermissionModal schoolName={school.schoolName} />
      </div>
    );
  }

  // 5. Authenticated user without Admin or School profile (Unrecognized user)
  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#080b0f] text-slate-900 dark:text-[#e4ded6] flex flex-col transition-colors">
      <Navbar
        school={null}
        onLogout={handleLogout}
        activeTab="overview"
        setActiveTab={() => {}}
      />
      <main className="flex-1 flex flex-col justify-center">
        <SchoolStatusScreen
          school={null}
          status="unrecognized"
          userUid={user?.uid}
          userEmail={user?.email}
          onLogout={handleLogout}
          onRefresh={async () => {
            if (!user?.uid) return;
            const isAdm = await checkIsAdmin(user.uid);
            if (isAdm) {
              setIsAdmin(true);
              setAuthStatus('admin');
            }
          }}
        />
      </main>
      <footer className="bg-white/90 dark:bg-slate-950/90 border-t border-[#E2E8F0] dark:border-white/10 pt-4 pb-24 lg:pb-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <div className="font-bold text-slate-900 dark:text-white tracking-wide">
          Vidyalayam (વિદ્યાલયમ)
        </div>
        <div className="text-emerald-600 dark:text-emerald-400 font-medium">
          Created by NR Chad
        </div>
      </footer>
    </div>
  );
}
