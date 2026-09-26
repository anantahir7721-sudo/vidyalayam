import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { StudentPortal } from './components/StudentPortal';
import { VidyalayamLoadingScreen } from './components/VidyalayamLoadingScreen';

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
import { Loader2 } from 'lucide-react';

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthRoleStatus>('loading');
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);
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

  // Active Navigation Tab History Stack (enables one-by-one seamless step back)
  const [tabHistory, setTabHistory] = useState<ActiveTabType[]>(['overview']);
  const activeTab: ActiveTabType = tabHistory[tabHistory.length - 1] || 'overview';
  const isInternalPopRef = useRef(false);

  // Synchronize with browser / mobile hardware Back Button (popstate)
  useEffect(() => {
    try {
      window.history.replaceState({ tab: 'overview' }, '');
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
      if (prev.length <= 1) return prev;
      try {
        isInternalPopRef.current = true;
        window.history.back();
      } catch (e) {}
      return prev.slice(0, -1);
    });
  }, []);

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

  // 0. Active Student Session: Render dedicated Student Portal
  if (studentSession) {
    return (
      <StudentPortal
        session={studentSession}
        onLogout={() => {
          clearStudentSession();
          setStudentSession(null);
        }}
      />
    );
  }

  // 1. Initial Auth Loading Screen & Role Verification
  if (authStatus === 'loading') {
    return <VidyalayamLoadingScreen />;
  }

  // 2. Unauthenticated: Show AuthScreen (School Login / Register or Admin Login or Student Login)
  if (authStatus === 'unauthenticated' || !user) {
    return (
      <div className="min-h-screen app-container flex flex-col">
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
        <footer className="bg-[#0e141b]/90 border-t border-white/10 py-4 text-center text-xs text-slate-400 space-y-1">
          <div className="font-bold text-white tracking-wide">
            Vidyalayam (વિદ્યાલયમ)
          </div>
          <div className="text-emerald-400 font-medium">
            Created by NR Chad
          </div>
          <div className="text-[11px] text-slate-500">
            General School Management System • Powered by Google Firebase
          </div>
        </footer>
      </div>
    );
  }

  // 3. Authenticated as System Administrator: Show Admin Dashboard
  if (authStatus === 'admin' || isAdmin) {
    return (
      <AdminDashboard
        adminEmail={user.email}
        onLogout={handleLogout}
      />
    );
  }

  // 4. Authenticated as a School
  if (school) {
    const status: SchoolStatus = school.status || 'approved';

    // Pending, Rejected, or Inactive status notice screens
    if (status !== 'approved') {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col">
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
        <Navbar
          school={school}
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={(tab) => navigateToTab(tab)}
          canGoBack={tabHistory.length > 1 || activeTab !== 'overview'}
          onBack={navigateBack}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-8">
          {dataLoading && (
            <div className="mb-4 glass-card border border-white/10 px-4 py-2 rounded-2xl text-xs text-emerald-400 flex items-center gap-2">
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
      </div>
    );
  }

  // 5. Authenticated user without Admin or School profile (Unrecognized user)
  return (
    <div className="min-h-screen bg-[#080b0f] text-[#e4ded6] flex flex-col">
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
      <footer className="bg-slate-950/90 border-t border-white/10 pt-4 pb-24 lg:pb-4 text-center text-xs text-slate-400 space-y-1">
        <div className="font-bold text-white tracking-wide">
          Vidyalayam (વિદ્યાલયમ)
        </div>
        <div className="text-emerald-400 font-medium">
          Created by NR Chad
        </div>
      </footer>
    </div>
  );
}
