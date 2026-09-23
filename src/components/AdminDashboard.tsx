import React, { useState, useEffect, useMemo } from 'react';
import { School, SchoolStatus, PasswordResetRequest } from '../types';
import {
  subscribeToSchools,
  updateSchoolStatus,
  getAllSchools,
  subscribeToPasswordResetRequests,
  updatePasswordResetRequestStatus,
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
  KeyRound,
  MessageSquare,
  Phone,
  ExternalLink,
  Trash2,
  Send,
} from 'lucide-react';
import { AdminGenerateTempPasswordModal } from './AdminGenerateTempPasswordModal';
import { AdminDeleteSchoolModal } from './AdminDeleteSchoolModal';
import { getSchoolApprovalWhatsApp, launchWhatsAppWithMessage } from '../utils/whatsappUtils';
import { VidyalayamLogo } from './VidyalayamLogo';

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

  // Password Reset Requests
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [resetFilter, setResetFilter] = useState<'all' | 'pending' | 'resolved'>('pending');

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<ConfirmActionModalState>({
    isOpen: false,
    school: null,
    action: 'reject',
    targetStatus: 'rejected',
  });

  // Temporary Password & Delete School Modals
  const [tempPassModalSchool, setTempPassModalSchool] = useState<School | null>(null);
  const [deleteModalSchool, setDeleteModalSchool] = useState<School | null>(null);

  // Display Admin Identifier without internal domain suffix if present
  const displayAdminId = useMemo(() => {
    if (!adminEmail) return 'Administrator';
    if (adminEmail.endsWith('@gujarat-schools.internal')) {
      const local = adminEmail.replace('@gujarat-schools.internal', '');
      return local.startsWith('admin_') ? local.replace('admin_', '') : local;
    }
    return adminEmail;
  }, [adminEmail]);

  // Real-time synchronization of all schools & password reset requests
  useEffect(() => {
    setLoading(true);
    const unsubscribeSchools = subscribeToSchools((updatedSchools) => {
      setSchools(updatedSchools);
      setLoading(false);
    });

    const unsubscribeResetRequests = subscribeToPasswordResetRequests((requests) => {
      setResetRequests(requests);
    });

    return () => {
      unsubscribeSchools();
      unsubscribeResetRequests();
    };
  }, []);

  const handleResolveResetRequest = async (requestId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
      await updatePasswordResetRequestStatus(requestId, nextStatus as any);
      setFeedback({
        type: 'success',
        message: `Password reset request marked as ${nextStatus}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update reset request.',
      });
    }
  };

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

  const pendingResetsCount = useMemo(() => {
    return resetRequests.filter((r) => r.status === 'pending').length;
  }, [resetRequests]);

  const filteredResetRequests = useMemo(() => {
    return resetRequests.filter((r) => {
      if (resetFilter !== 'all' && r.status !== resetFilter) return false;
      return true;
    });
  }, [resetRequests, resetFilter]);

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
    <div className="min-h-screen bg-[#f7f5f0] text-[#141d24] dark:bg-slate-900 dark:text-white flex flex-col transition-colors">
      {/* Top Admin Header Bar */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <VidyalayamLogo size={42} glow />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Vidyalayam — Admin Dashboard
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/80 dark:border-red-800/80 dark:text-red-400 uppercase tracking-wide">
                  Master Control
                </span>
              </div>
              <p className="text-[11px] text-[#9d512d] dark:text-[#f59c73] font-bold">
                by NRChad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {adminEmail && (
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Admin: {displayAdminId}</div>
                <div className="text-[10px] text-slate-500 font-mono">Role: System Admin</div>
              </div>
            )}

            <button
              id="btn-admin-refresh"
              onClick={handleManualRefresh}
              disabled={loading}
              title="Refresh Schools"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''}`} />
            </button>

            <button
              id="btn-admin-logout"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Total Schools */}
            <div
              id="card-total-schools"
              className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Schools</span>
                <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{metrics.total}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Total registered schools</div>
            </div>

            {/* Pending Schools (High Priority) */}
            <div
              id="card-pending-schools"
              className={`rounded-2xl p-4 shadow-sm border transition-all ${
                metrics.pending > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/60 ring-1 ring-amber-400/40'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Pending
                </span>
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400">{metrics.pending}</div>
              <div className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1">
                {metrics.pending > 0 ? 'Requires Admin Review' : 'All requests processed'}
              </div>
            </div>

            {/* Approved Schools */}
            <div
              id="card-approved-schools"
              className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Approved
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{metrics.approved}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Active full access</div>
            </div>

            {/* Rejected Schools */}
            <div
              id="card-rejected-schools"
              className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-red-400">
                  Rejected
                </span>
                <XCircle className="w-4 h-4 text-rose-600 dark:text-red-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-red-400">{metrics.rejected}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Access denied</div>
            </div>

            {/* Inactive Schools */}
            <div
              id="card-inactive-schools"
              className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Inactive
                </span>
                <PowerOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-300">{metrics.inactive}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Temporarily suspended</div>
            </div>

            {/* Password Reset Requests */}
            <div
              id="card-reset-requests"
              className={`rounded-2xl p-4 shadow-sm border transition-all ${
                pendingResetsCount > 0
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-500/60 ring-1 ring-purple-400/40'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Password Resets
                </span>
                <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-700 dark:text-purple-400">{pendingResetsCount}</div>
              <div className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-1">
                {pendingResetsCount > 0 ? `${pendingResetsCount} Pending Request(s)` : 'No active requests'}
              </div>
            </div>
          </div>
        </section>

        {/* PASSWORD RESET ASSISTANCE SECTION */}
        <section
          id="section-password-resets"
          className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                    PASSWORD RESET REQUESTS (પાસવર્ડ રીસેટ વિનંતીઓ)
                  </h2>
                  {pendingResetsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40">
                      {pendingResetsCount} Pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage schools requesting password assistance. Contact via WhatsApp or mark resolved.
                </p>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              {(['pending', 'resolved', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setResetFilter(filter)}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors capitalize ${
                    resetFilter === filter
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {filteredResetRequests.length === 0 ? (
            <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
              {resetFilter === 'pending'
                ? 'કોઈ પેન્ડિંગ પાસવર્ડ રીસેટ વિનંતી નથી (No pending reset requests).'
                : 'કોઈ વિનંતી મળી નથી.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950/80 text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <th className="py-3 px-3">School / DISE Code</th>
                    <th className="py-3 px-3">Contact Mobile</th>
                    <th className="py-3 px-3">Requested At</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredResetRequests.map((req) => {
                    const cleanPhone = req.contactNumber ? req.contactNumber.replace(/\D/g, '') : '';
                    const dateFormatted = req.createdAt
                      ? new Date(req.createdAt).toLocaleDateString('gu-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A';

                    return (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {req.schoolName || 'Unknown School'}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                            <Hash className="w-3 h-3" />
                            <span>{req.diseCode}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {req.contactNumber ? (
                            <span className="font-mono text-slate-800 dark:text-slate-200">{req.contactNumber}</span>
                          ) : (
                            <span className="text-slate-500 italic">Not specified</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                              req.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                                : 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40'
                            }`}
                          >
                            {req.status === 'resolved' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Resolved</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>Pending Reset</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Temp Password Generator */}
                            <button
                              type="button"
                              onClick={() => {
                                const matching = schools.find((s) => s.diseCode === req.diseCode) || {
                                  id: req.diseCode,
                                  ownerUid: req.diseCode,
                                  diseCode: req.diseCode,
                                  schoolName: req.schoolName || req.diseCode,
                                  district: 'Gujarat',
                                  status: 'approved' as SchoolStatus,
                                  contactPhone: req.contactNumber,
                                };
                                setTempPassModalSchool(matching);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                              title="Generate Temporary Password for School"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>ટેમ્પરરી પાસવર્ડ</span>
                            </button>

                            {cleanPhone && (
                              <a
                                href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
                                  `નમસ્તે, વિદ્યાલયમ પોર્ટલ એડમિન તરફથી આપની શાળા (DISE: ${req.diseCode}) ની પાસવર્ડ રીસેટ વિનંતી અંગે સંપર્ક કરી રહ્યા છીએ.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                                title="Open WhatsApp Chat with School"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            <button
                              onClick={() => handleResolveResetRequest(req.id, req.status)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs ${
                                req.status === 'resolved'
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 dark:border-transparent'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{req.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}</span>
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

        {/* 2. PENDING SCHOOL REGISTRATIONS */}
        <section
          id="section-pending-schools"
          className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                  PENDING SCHOOL REGISTRATIONS
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review new school signup requests. Approve to grant access or Reject to deny.
                </p>
              </div>
            </div>
            {pendingSchools.length > 0 && (
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40">
                {pendingSchools.length} Action{pendingSchools.length > 1 ? 's' : ''} Needed
              </span>
            )}
          </div>

          {pendingSchools.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
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
                  <tr className="bg-slate-100 dark:bg-slate-950/80 text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <th className="py-3 px-3">School Name</th>
                    <th className="py-3 px-3">DISE Code</th>
                    <th className="py-3 px-3">District</th>
                    <th className="py-3 px-3">Registration Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
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
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors bg-amber-50/50 dark:bg-amber-950/10"
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{school.schoolName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">UID: {school.id}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-slate-700">
                            {school.diseCode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{school.district}</td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending Approval</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp to School */}
                            {school.contactPhone && (
                              <a
                                href={`https://wa.me/91${school.contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  `નમસ્તે, વિદ્યાલયમ એડમિન તરફથી આપની શાળા ${school.schoolName} (DISE: ${school.diseCode}) ના રજીસ્ટ્રેશન અંગે.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                title="Contact School on WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
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
                              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
                              title="Reject this school registration"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>REJECT</span>
                            </button>
                            <button
                              id={`btn-delete-pending-${school.id}`}
                              disabled={isBusy}
                              onClick={() => setDeleteModalSchool(school)}
                              className="flex items-center gap-1 px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 border border-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-800 dark:text-rose-200 dark:border-rose-700/60"
                              title="Delete School Completely"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
          className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                MANAGE SCHOOLS
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                View all registered schools, search by DISE code or name, and manage access statuses.
              </p>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Showing <strong className="text-slate-900 dark:text-white">{filteredSchools.length}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white">{schools.length}</strong> schools
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
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-[#9d512d] focus:border-[#9d512d]"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
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
                        ? 'bg-[#9d512d] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
            <div className="py-10 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <Building2 className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No schools match your search or filter.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Try clearing the search query or changing the status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950/80 text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <th className="py-3 px-3">School Name</th>
                    <th className="py-3 px-3">School DISE Code</th>
                    <th className="py-3 px-3">District</th>
                    <th className="py-3 px-3">School ID / UID</th>
                    <th className="py-3 px-3">Registration Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
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
                      <tr key={school.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{school.schoolName}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-slate-700">
                            {school.diseCode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{school.district}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 max-w-[130px] truncate" title={school.id}>
                          {school.id}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-3">
                          {status === 'approved' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved</span>
                            </span>
                          )}
                          {status === 'pending' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                          {status === 'rejected' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {status === 'inactive' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 inline-flex items-center gap-1">
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
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
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
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
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
                                className="btn-deactivate px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-700/90 dark:hover:bg-slate-600 dark:text-slate-200 dark:border-slate-600 rounded-md text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
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
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
                                title="Re-activate School Access"
                              >
                                ACTIVATE
                              </button>
                            )}

                            {/* Temporary Password button */}
                            <button
                              id={`btn-manage-temppass-${school.id}`}
                              disabled={isBusy}
                              type="button"
                              onClick={() => setTempPassModalSchool(school)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-xs"
                              title="શાળા માટે ટેમ્પરરી પાસવર્ડ સેટ કરો"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span className="hidden lg:inline">ટેમ્પરરી પાસવર્ડ</span>
                              <span className="lg:hidden">પાસવર્ડ</span>
                            </button>

                            {/* DELETE SCHOOL COMPLETELY button */}
                            <button
                              id={`btn-manage-delete-${school.id}`}
                              disabled={isBusy}
                              type="button"
                              onClick={() => setDeleteModalSchool(school)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-800 dark:text-rose-200 dark:border-rose-700/60 rounded-md text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-xs"
                              title="શાળા અને તમામ ડેટા સંપૂર્ણ ડિલીટ કરો"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span className="hidden lg:inline">સંપૂર્ણ ડિલીટ</span>
                              <span className="lg:hidden">ડિલીટ</span>
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
      </main>

      {/* Confirmation Modal for Sensitive Actions (Reject / Deactivate) */}
      {confirmModal.isOpen && confirmModal.school && (
        <div
          id="modal-confirm-action"
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88dvh] overflow-y-auto my-auto text-slate-900 dark:text-white">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  confirmModal.action === 'reject'
                    ? 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-red-950/80 dark:border-red-800 dark:text-red-400'
                    : 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-400'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Confirm {confirmModal.action === 'reject' ? 'Rejection' : 'Deactivation'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {confirmModal.action === 'reject'
                    ? 'Are you sure you want to reject this school registration?'
                    : 'Are you sure you want to deactivate this school?'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <div className="text-slate-800 dark:text-slate-300">
                School: <strong className="text-slate-950 dark:text-white">{confirmModal.school.schoolName}</strong>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                DISE Code: <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{confirmModal.school.diseCode}</span> • District:{' '}
                {confirmModal.school.district}
              </div>
              <div className="text-slate-500 font-mono text-[10px]">ID: {confirmModal.school.id}</div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-transparent rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-modal-confirm"
                type="button"
                onClick={handleExecuteConfirmedAction}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors shadow-sm ${
                  confirmModal.action === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                Confirm {confirmModal.action === 'reject' ? 'Reject' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Generate Temporary Password Modal */}
      {tempPassModalSchool && (
        <AdminGenerateTempPasswordModal
          isOpen={!!tempPassModalSchool}
          school={tempPassModalSchool}
          onClose={() => setTempPassModalSchool(null)}
          onSuccess={() => {
            setFeedback({
              type: 'success',
              message: `શાળા "${tempPassModalSchool.schoolName}" માટે ટેમ્પરરી પાસવર્ડ સફળતાપૂર્વક સેટ થઈ ગયો છે.`,
            });
          }}
        />
      )}

      {/* Admin Delete School Completely Modal */}
      {deleteModalSchool && (
        <AdminDeleteSchoolModal
          isOpen={!!deleteModalSchool}
          school={deleteModalSchool}
          onClose={() => setDeleteModalSchool(null)}
          onSuccess={() => {
            setFeedback({
              type: 'success',
              message: `શાળા "${deleteModalSchool.schoolName}" અને તેનો તમામ ડેટા સંપૂર્ણપણે ડિલીટ થઈ ગયો છે.`,
            });
          }}
        />
      )}

      <footer className="bg-white dark:bg-slate-950/90 border-t border-slate-200 dark:border-white/10 py-5 text-center text-xs text-slate-600 dark:text-slate-400 space-y-1 mt-auto">
        <div className="font-bold text-slate-900 dark:text-white tracking-wide">
          Vidyalayam (વિદ્યાલયમ)
        </div>
        <div className="text-[#9d512d] dark:text-[#f59c73] font-bold">
          by NRChad
        </div>
        <div className="text-[11px] text-slate-500">
          Admin Portal • Master Review and School Security Verification
        </div>
      </footer>
    </div>
  );
};
