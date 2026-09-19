import React, { useState, useEffect, useMemo } from 'react';
import { School, SchoolStatus } from '../types';
import {
  subscribeToSchools,
  updateSchoolStatus,
  getAllSchools,
} from '../services/adminService';
import { logoutSchool } from '../services/authService';
import {
  Shield,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  LogOut,
  Hash,
  MapPin,
  Calendar,
  Eye,
  AlertCircle,
  Check,
  X,
  UserCheck,
  UserX,
  PowerOff,
  Power,
  ChevronRight,
} from 'lucide-react';

interface AdminDashboardProps {
  adminEmail?: string | null;
  onLogout: () => void;
}

interface ConfirmActionModalState {
  isOpen: boolean;
  school: School | null;
  action: 'reject' | 'deactivate';
  targetStatus: SchoolStatus;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminEmail,
  onLogout,
}) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SchoolStatus>('all');

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<ConfirmActionModalState>({
    isOpen: false,
    school: null,
    action: 'reject',
    targetStatus: 'rejected',
  });

  // Display Admin Identifier without internal domain suffix if present
  const displayAdminId = useMemo(() => {
    if (!adminEmail) return 'Administrator';
    if (adminEmail.endsWith('@gujarat-schools.internal')) {
      const local = adminEmail.replace('@gujarat-schools.internal', '');
      return local.startsWith('admin_') ? local.replace('admin_', '') : local;
    }
    return adminEmail;
  }, [adminEmail]);

  // Real-time synchronization of all schools
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToSchools((updatedSchools) => {
      setSchools(updatedSchools);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const list = await getAllSchools();
      setSchools(list);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to refresh schools.' });
    } finally {
      setLoading(false);
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = schools.length;
    const pending = schools.filter((s) => s.status === 'pending').length;
    const approved = schools.filter((s) => s.status === 'approved' || !s.status).length;
    const rejected = schools.filter((s) => s.status === 'rejected').length;
    const inactive = schools.filter((s) => s.status === 'inactive').length;
    return { total, pending, approved, rejected, inactive };
  }, [schools]);

  // Pending schools list
  const pendingSchools = useMemo(() => {
    return schools.filter((s) => s.status === 'pending');
  }, [schools]);

  // Filtered schools for MANAGE SCHOOLS section
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      // Status filter
      if (statusFilter !== 'all') {
        const currentStatus = s.status || 'approved';
        if (currentStatus !== statusFilter) return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        s.schoolName?.toLowerCase().includes(query) ||
        s.diseCode?.toLowerCase().includes(query) ||
        s.district?.toLowerCase().includes(query) ||
        s.id?.toLowerCase().includes(query)
      );
    });
  }, [schools, statusFilter, searchQuery]);

  // Direct status update (for Approve and Activate)
  const handleDirectStatusChange = async (schoolId: string, newStatus: SchoolStatus, schoolName: string) => {
    setActionInProgress(schoolId);
    setFeedback(null);
    try {
      await updateSchoolStatus(schoolId, newStatus);
      const actionLabel =
        newStatus === 'approved'
          ? 'Approved (મંજૂર)'
          : newStatus === 'inactive'
          ? 'Deactivated (નિષ્ક્રિય)'
          : newStatus === 'rejected'
          ? 'Rejected (અસ્વીકાર)'
          : 'Activated (સક્રિય)';
      setFeedback({
        type: 'success',
        message: `School "${schoolName}" has been successfully updated to ${actionLabel}.`,
      });
    } catch (err: any) {
      console.error('Error changing school status:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update school status.',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Open confirmation modal for sensitive actions (Reject, Deactivate)
  const openConfirmModal = (school: School, action: 'reject' | 'deactivate') => {
    setConfirmModal({
      isOpen: true,
      school,
      action,
      targetStatus: action === 'reject' ? 'rejected' : 'inactive',
    });
  };

  // Execute confirmed action from modal
  const handleExecuteConfirmedAction = async () => {
    if (!confirmModal.school) return;
    const { school, targetStatus } = confirmModal;
    setConfirmModal({ isOpen: false, school: null, action: 'reject', targetStatus: 'rejected' });
    await handleDirectStatusChange(school.id, targetStatus, school.schoolName);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Admin Header Bar */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">
                  Vidyalayam — Admin Dashboard
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-950/80 border border-red-800/80 text-red-400 uppercase tracking-wide">
                  Master Control
                </span>
              </div>
              <p className="text-[11px] text-emerald-400 font-semibold">
                Created by NR Chad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {adminEmail && (
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-300">Admin: {displayAdminId}</div>
                <div className="text-[10px] text-slate-500 font-mono">Role: System Admin</div>
              </div>
            )}

            <button
              id="btn-admin-refresh"
              onClick={handleManualRefresh}
              disabled={loading}
              title="Refresh Schools"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              id="btn-admin-logout"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Feedback Banner */}
        {feedback && (
          <div
            id="admin-feedback-banner"
            className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : 'bg-red-950/80 border-red-800 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. Summary Cards */}
        <section aria-label="School Registration Metrics">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Total Schools */}
            <div
              id="card-total-schools"
              className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Schools</span>
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{metrics.total}</div>
              <div className="text-[11px] text-slate-400 mt-1">Total registered schools</div>
            </div>

            {/* Pending Schools (High Priority) */}
            <div
              id="card-pending-schools"
              className={`rounded-2xl p-4 shadow-sm border transition-all ${
                metrics.pending > 0
                  ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/40'
                  : 'bg-slate-800/90 border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                  Pending
                </span>
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400">{metrics.pending}</div>
              <div className="text-[11px] text-amber-300/80 mt-1">
                {metrics.pending > 0 ? 'Requires Admin Review' : 'All requests processed'}
              </div>
            </div>

            {/* Approved Schools */}
            <div
              id="card-approved-schools"
              className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Approved
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">{metrics.approved}</div>
              <div className="text-[11px] text-slate-400 mt-1">Active full access</div>
            </div>

            {/* Rejected Schools */}
            <div
              id="card-rejected-schools"
              className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  Rejected
                </span>
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-red-400">{metrics.rejected}</div>
              <div className="text-[11px] text-slate-400 mt-1">Access denied</div>
            </div>

            {/* Inactive Schools */}
            <div
              id="card-inactive-schools"
              className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Inactive
                </span>
                <PowerOff className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-300">{metrics.inactive}</div>
              <div className="text-[11px] text-slate-400 mt-1">Temporarily suspended</div>
            </div>
          </div>
        </section>

        {/* 2. PENDING SCHOOL REGISTRATIONS */}
        <section
          id="section-pending-schools"
          className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-5 shadow-sm space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wide">
                  PENDING SCHOOL REGISTRATIONS
                </h2>
                <p className="text-xs text-slate-400">
                  Review new school signup requests. Approve to grant access or Reject to deny.
                </p>
              </div>
            </div>
            {pendingSchools.length > 0 && (
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {pendingSchools.length} Action{pendingSchools.length > 1 ? 's' : ''} Needed
              </span>
            )}
          </div>

          {pendingSchools.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-1" />
              <p className="text-sm font-semibold text-slate-200">
                No pending school registrations.
              </p>
              <p className="text-xs text-slate-500">
                All school requests have been reviewed and approved or processed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-700 font-semibold">
                    <th className="py-3 px-3">School Name</th>
                    <th className="py-3 px-3">DISE Code</th>
                    <th className="py-3 px-3">District</th>
                    <th className="py-3 px-3">Registration Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {pendingSchools.map((school) => {
                    const isBusy = actionInProgress === school.id;
                    const dateFormatted = school.createdAt
                      ? new Date(school.createdAt).toLocaleDateString('gu-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A';

                    return (
                      <tr
                        key={school.id}
                        className="hover:bg-slate-700/40 transition-colors bg-amber-950/10"
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold text-white text-sm">{school.schoolName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">UID: {school.id}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                            {school.diseCode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{school.district}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending Approval</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              id={`btn-approve-${school.id}`}
                              disabled={isBusy}
                              onClick={() =>
                                handleDirectStatusChange(school.id, 'approved', school.schoolName)
                              }
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
                              title="Approve this school registration"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>APPROVE</span>
                            </button>
                            <button
                              id={`btn-reject-${school.id}`}
                              disabled={isBusy}
                              onClick={() => openConfirmModal(school, 'reject')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-700/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                              title="Reject this school registration"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>REJECT</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 3. MANAGE SCHOOLS */}
        <section
          id="section-manage-schools"
          className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-5 shadow-sm space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wide">
                MANAGE SCHOOLS
              </h2>
              <p className="text-xs text-slate-400">
                View all registered schools, search by DISE code or name, and manage access statuses.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Showing <strong className="text-white">{filteredSchools.length}</strong> of{' '}
              <strong className="text-white">{schools.length}</strong> schools
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="input-search-schools"
                type="text"
                placeholder="Search by School Name, DISE Code, or District..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 overflow-x-auto">
              {(['all', 'pending', 'approved', 'rejected', 'inactive'] as const).map((filterVal) => {
                const isActive = statusFilter === filterVal;
                const label =
                  filterVal === 'all'
                    ? 'All'
                    : filterVal === 'pending'
                    ? 'Pending'
                    : filterVal === 'approved'
                    ? 'Approved'
                    : filterVal === 'rejected'
                    ? 'Rejected'
                    : 'Inactive';

                return (
                  <button
                    key={filterVal}
                    id={`filter-status-${filterVal}`}
                    type="button"
                    onClick={() => setStatusFilter(filterVal)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schools Table */}
          {filteredSchools.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <Building2 className="w-8 h-8 mx-auto text-slate-500" />
              <p className="text-sm font-semibold text-slate-300">No schools match your search or filter.</p>
              <p className="text-xs text-slate-500">Try clearing the search query or changing the status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-700 font-semibold">
                    <th className="py-3 px-3">School Name</th>
                    <th className="py-3 px-3">School DISE Code</th>
                    <th className="py-3 px-3">District</th>
                    <th className="py-3 px-3">School ID / UID</th>
                    <th className="py-3 px-3">Registration Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredSchools.map((school) => {
                    const status: SchoolStatus = school.status || 'approved';
                    const isBusy = actionInProgress === school.id;
                    const dateFormatted = school.createdAt
                      ? new Date(school.createdAt).toLocaleDateString('gu-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Legacy';

                    return (
                      <tr key={school.id} className="hover:bg-slate-700/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white text-sm">{school.schoolName}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                            {school.diseCode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{school.district}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400 max-w-[130px] truncate" title={school.id}>
                          {school.id}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-3">
                          {status === 'approved' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved</span>
                            </span>
                          )}
                          {status === 'pending' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                          {status === 'rejected' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {status === 'inactive' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-700 text-slate-300 border border-slate-600 inline-flex items-center gap-1">
                              <PowerOff className="w-3 h-3" />
                              <span>Inactive</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* APPROVE action */}
                            {status !== 'approved' && (
                              <button
                                id={`btn-manage-approve-${school.id}`}
                                disabled={isBusy}
                                onClick={() =>
                                  handleDirectStatusChange(school.id, 'approved', school.schoolName)
                                }
                                className="px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                                title="Approve School"
                              >
                                APPROVE
                              </button>
                            )}

                            {/* REJECT action */}
                            {status === 'pending' && (
                              <button
                                id={`btn-manage-reject-${school.id}`}
                                disabled={isBusy}
                                onClick={() => openConfirmModal(school, 'reject')}
                                className="px-2.5 py-1 bg-red-700/80 hover:bg-red-600 text-white rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                                title="Reject School"
                              >
                                REJECT
                              </button>
                            )}

                            {/* DEACTIVATE action (for currently approved schools) */}
                            {status === 'approved' && (
                              <button
                                id={`btn-manage-deactivate-${school.id}`}
                                disabled={isBusy}
                                onClick={() => openConfirmModal(school, 'deactivate')}
                                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                                title="Deactivate School Access"
                              >
                                DEACTIVATE
                              </button>
                            )}

                            {/* ACTIVATE action (for inactive or rejected schools) */}
                            {(status === 'inactive' || status === 'rejected') && (
                              <button
                                id={`btn-manage-activate-${school.id}`}
                                disabled={isBusy}
                                onClick={() =>
                                  handleDirectStatusChange(school.id, 'approved', school.schoolName)
                                }
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                                title="Re-activate School Access"
                              >
                                ACTIVATE
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Confirmation Modal for Sensitive Actions (Reject / Deactivate) */}
      {confirmModal.isOpen && confirmModal.school && (
        <div
          id="modal-confirm-action"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  confirmModal.action === 'reject'
                    ? 'bg-red-950/80 border border-red-800 text-red-400'
                    : 'bg-amber-950/80 border border-amber-800 text-amber-400'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Confirm {confirmModal.action === 'reject' ? 'Rejection' : 'Deactivation'}
                </h3>
                <p className="text-xs text-slate-400">
                  {confirmModal.action === 'reject'
                    ? 'Are you sure you want to reject this school registration?'
                    : 'Are you sure you want to deactivate this school?'}
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-300">
                School: <strong className="text-white">{confirmModal.school.schoolName}</strong>
              </div>
              <div className="text-slate-400">
                DISE Code: <span className="font-mono text-emerald-400">{confirmModal.school.diseCode}</span> • District:{' '}
                {confirmModal.school.district}
              </div>
              <div className="text-slate-500 font-mono text-[10px]">ID: {confirmModal.school.id}</div>
            </div>

            <p className="text-xs text-slate-400">
              {confirmModal.action === 'reject'
                ? 'The school will be notified with "તમારી School registration reject કરવામાં આવી છે. Admin નો સંપર્ક કરો." and will not be able to log in to enter marks.'
                : 'Teachers from this school will receive "તમારી School ID હાલમાં inactive છે. Admin નો સંપર્ક કરો." until you re-activate them.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="btn-modal-cancel"
                type="button"
                onClick={() =>
                  setConfirmModal({
                    isOpen: false,
                    school: null,
                    action: 'reject',
                    targetStatus: 'rejected',
                  })
                }
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-modal-confirm"
                type="button"
                onClick={handleExecuteConfirmedAction}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors shadow-sm ${
                  confirmModal.action === 'reject'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                Confirm {confirmModal.action === 'reject' ? 'Reject' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-950/90 border-t border-white/10 py-5 text-center text-xs text-slate-400 space-y-1 mt-auto">
        <div className="font-bold text-white tracking-wide">
          Vidyalayam (વિદ્યાલયમ)
        </div>
        <div className="text-emerald-400 font-medium">
          Created by NR Chad
        </div>
        <div className="text-[11px] text-slate-500">
          Admin Portal • Master Review and School Security Verification
        </div>
      </footer>
    </div>
  );
};
