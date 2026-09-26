import React, { useState, useEffect, useMemo } from 'react';
import {
  School,
  Student,
  AdmissionApplication,
  SchoolAdmissionSettings,
} from '../types';
import {
  subscribeToAdmissionApplications,
  updateSchoolAdmissionSettings,
  updateAdmissionApplication,
  acceptAdmissionApplication,
  rejectAdmissionApplication,
  deleteAdmissionApplication,
} from '../services/firestoreService';
import {
  UserPlus,
  Settings,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  MessageSquare,
  Clock,
  Calendar,
  User,
  MapPin,
  Heart,
  Save,
  Trash2,
  Edit3,
  X,
  FileSpreadsheet,
  Download,
  Info,
  ChevronRight,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { getSchoolApprovalWhatsApp } from '../utils/whatsappUtils';

interface AdmissionManagerProps {
  school: School;
  onBack: () => void;
  onRefresh: () => void;
  onNavigateToStudents?: () => void;
}

export const AdmissionManager: React.FC<AdmissionManagerProps> = ({
  school,
  onBack,
  onRefresh,
  onNavigateToStudents,
}) => {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [hasEndDate, setHasEndDate] = useState<boolean>(Boolean(school.admissionSettings?.endDate));
  const [settingsForm, setSettingsForm] = useState<SchoolAdmissionSettings>({
    isOpen: school.admissionSettings?.isOpen ?? true,
    mode: school.admissionSettings?.mode ?? 'open',
    startDate: school.admissionSettings?.startDate ?? '',
    endDate: school.admissionSettings?.endDate ?? '',
    instructions: school.admissionSettings?.instructions ?? '',
    allowedStandards: school.admissionSettings?.allowedStandards ?? ['9', '10', '11', '12'],
  });

  const handleOpenSettings = () => {
    const isDateRange = school.admissionSettings?.mode === 'date_range';
    const existingEnd = school.admissionSettings?.endDate;
    setSettingsForm({
      isOpen: school.admissionSettings?.isOpen ?? true,
      mode: school.admissionSettings?.mode ?? 'open',
      startDate: school.admissionSettings?.startDate ?? '',
      endDate: existingEnd ?? '',
      instructions: school.admissionSettings?.instructions ?? '',
      allowedStandards: school.admissionSettings?.allowedStandards ?? ['9', '10', '11', '12'],
    });
    setHasEndDate(Boolean(existingEnd && existingEnd.trim() !== ''));
    setShowSettingsModal(true);
  };

  // Filter and Search
  const [activeStatusTab, setActiveStatusTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedStandard, setSelectedStandard] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [acceptingApp, setAcceptingApp] = useState<AdmissionApplication | null>(null);
  const [admissionDate, setAdmissionDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [acceptingLoading, setAcceptingLoading] = useState(false);

  const [editingApp, setEditingApp] = useState<AdmissionApplication | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [rejectingApp, setRejectingApp] = useState<AdmissionApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectingLoading, setRejectingLoading] = useState(false);

  // Success toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Subscribe to real-time admission applications
  useEffect(() => {
    const unsub = subscribeToAdmissionApplications(school.id, (apps) => {
      setApplications(apps);
      setLoading(false);
    });
    return () => unsub();
  }, [school.id]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (activeStatusTab !== 'all' && app.status !== activeStatusTab) {
        return false;
      }
      // Standard filter
      if (selectedStandard !== 'ALL' && String(app.admissionStandard) !== selectedStandard) {
        return false;
      }
      // Search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        app.studentName.toLowerCase().includes(q) ||
        app.childUid?.toLowerCase().includes(q) ||
        app.contactNumber?.includes(q) ||
        app.motherName?.toLowerCase().includes(q) ||
        app.address?.toLowerCase().includes(q)
      );
    });
  }, [applications, activeStatusTab, selectedStandard, searchQuery]);

  // Counts
  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    // If date_range mode
    if (settingsForm.mode === 'date_range') {
      if (!settingsForm.startDate) {
        alert('કૃપા કરીને પ્રવેશ શરૂ થવાની તારીખ (Start Date) પસંદ કરો.');
        return;
      }
      if (hasEndDate) {
        if (!settingsForm.endDate) {
          alert('કૃપા કરીને પ્રવેશ પૂર્ણ થવાની અંતિમ તારીખ (End Date) પસંદ કરો અથવા "ના (અંતિમ તારીખ નથી રાખવી)" વિકલ્પ પસંદ કરો.');
          return;
        }
        if (settingsForm.endDate < settingsForm.startDate) {
          alert('અંતિમ તારીખ (End Date) શરૂઆતની તારીખ (Start Date) કરતાં આગળની ન હોઈ શકે.');
          return;
        }
      }
    }

    setSavingSettings(true);
    try {
      const finalForm: SchoolAdmissionSettings = {
        ...settingsForm,
        endDate: settingsForm.mode === 'date_range' && hasEndDate ? (settingsForm.endDate || '') : '',
      };
      await updateSchoolAdmissionSettings(school.id, finalForm);
      showToast('શાળા પ્રવેશ સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવ્યા!');
      setShowSettingsModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'સેટિંગ્સ સેવ કરવામાં ભૂલ આવી.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Accept Admission
  const handleConfirmAccept = async () => {
    if (!acceptingApp) return;
    if (!admissionDate) {
      alert('કૃપા કરીને પ્રવેશ તારીખ પસંદ કરો.');
      return;
    }

    setAcceptingLoading(true);
    try {
      const newStudent = await acceptAdmissionApplication(school.id, acceptingApp, admissionDate);
      showToast(`વિદ્યાર્થી "${newStudent.studentName}" ને ધોરણ ${newStudent.standard} માં સફળતાપૂર્વક પ્રવેશ આપવામાં આવ્યો!`);
      setAcceptingApp(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'પ્રવેશ મંજૂર કરવામાં ભૂલ આવી.');
    } finally {
      setAcceptingLoading(false);
    }
  };

  // Handle Reject Admission
  const handleConfirmReject = async () => {
    if (!rejectingApp) return;
    setRejectingLoading(true);
    try {
      await rejectAdmissionApplication(school.id, rejectingApp.id, rejectionReason);
      showToast('અરજી નામંજૂર કરવામાં આવી.');
      setRejectingApp(null);
      setRejectionReason('');
    } catch (err: any) {
      alert(err.message || 'અરજી નામંજૂર કરવામાં ભૂલ આવી.');
    } finally {
      setRejectingLoading(false);
    }
  };

  // Handle Delete Application
  const handleDeleteApp = async (appId: string) => {
    if (!confirm('શું તમે ખરેખર આ પ્રવેશ અરજી કાયમ માટે કાઢી નાખવા માંગો છો?')) return;
    try {
      await deleteAdmissionApplication(school.id, appId);
      showToast('અરજી કાઢી નાખવામાં આવી.');
    } catch (err: any) {
      alert(err.message || 'અરજી કાઢી નાખવામાં ભૂલ આવી.');
    }
  };

  // Handle Save Edited Application
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;
    setSavingEdit(true);
    try {
      await updateAdmissionApplication(school.id, editingApp.id, editingApp);
      showToast('વિદ્યાર્થીની વિગતો સફળતાપૂર્વક સુધારાઈ ગઈ!');
      setEditingApp(null);
    } catch (err: any) {
      alert(err.message || 'સુધારો સેવ કરવામાં ભૂલ આવી.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-[#e4ded6] hover:bg-stone-200 cursor-pointer"
            title="પાછા જાઓ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-[#e4ded6] tracking-tight">
                ઓનલાઇન પ્રવેશ વ્યવસ્થાપન (School Admissions)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                {pendingCount} નવી અરજીઓ
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-[#a99f91] mt-0.5">
              શાળા માટે ઓનલાઇન પ્રવેશ પ્રક્રિયા શરૂ/બંધ કરો, વાલીઓની અરજીઓ ચકાસો અને સીધા વિદ્યાર્થી તરીકે એડમિટ કરો
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenSettings}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#9d512d] hover:bg-[#864424] text-white shadow-sm transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>પ્રવેશ સેટિંગ્સ & સમયગાળો</span>
          </button>

          {onNavigateToStudents && (
            <button
              type="button"
              onClick={onNavigateToStudents}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-800 dark:text-[#e4ded6] border border-stone-200 dark:border-white/10 transition-all cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>વિદ્યાર્થી સંચાલન</span>
            </button>
          )}
        </div>
      </div>

      {/* Admission Status Banner */}
      <div className="p-4 rounded-2xl glass-card border border-stone-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#9d512d]/15 text-[#9d512d] dark:text-[#f59c73] flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-stone-900 dark:text-[#e4ded6] block">
              પ્રવેશ સ્થિતિ:{' '}
              <span className={school.admissionSettings?.isOpen ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-red-500 font-extrabold'}>
                {school.admissionSettings?.isOpen ? 'સક્રિય (ચાલુ છે)' : 'બંધ છે'}
              </span>
            </span>
            <span className="text-stone-500 dark:text-[#a99f91]">
              મોડ:{' '}
              {school.admissionSettings?.mode === 'date_range'
                ? school.admissionSettings.endDate
                  ? `તારીખ ગાળો (તા. ${school.admissionSettings.startDate || 'કોઈપણ'} થી તા. ${school.admissionSettings.endDate} સુધી)`
                  : `શરૂઆત તા. ${school.admissionSettings.startDate || 'આજ'} થી (શાળા જાતે બંધ કરે ત્યાં સુધી ચાલુ રહેશે)`
                : school.admissionSettings?.mode === 'open'
                ? 'કાયમી ખુલ્લું (શાળા જાતે બંધ ન કરે ત્યાં સુધી)'
                : 'પ્રવેશ બંધ છે'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenSettings}
          className="text-[#9d512d] dark:text-[#f59c73] hover:underline font-bold inline-flex items-center gap-1 self-start sm:self-center cursor-pointer"
        >
          <span>બદલો</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter and Status Tabs */}
      <div className="space-y-3">
        {/* Status Tabs */}
        <div className="flex rounded-2xl bg-stone-100 dark:bg-white/5 p-1 border border-stone-200 dark:border-white/10 max-w-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveStatusTab('pending')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeStatusTab === 'pending'
                ? 'bg-white dark:bg-[#202d38] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-stone-600 dark:text-[#a99f91]'
            }`}
          >
            <span>બાકી અરજીઓ</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStatusTab('approved')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeStatusTab === 'approved'
                ? 'bg-white dark:bg-[#202d38] text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-stone-600 dark:text-[#a99f91]'
            }`}
          >
            <span>મંજૂર થયેલ</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStatusTab('rejected')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeStatusTab === 'rejected'
                ? 'bg-white dark:bg-[#202d38] text-red-600 dark:text-red-400 shadow-sm'
                : 'text-stone-600 dark:text-[#a99f91]'
            }`}
          >
            <span>નામંજૂર</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300">
              {rejectedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStatusTab('all')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeStatusTab === 'all'
                ? 'bg-white dark:bg-[#202d38] text-stone-900 dark:text-[#e4ded6] shadow-sm'
                : 'text-stone-600 dark:text-[#a99f91]'
            }`}
          >
            <span>બધી ({applications.length})</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="નામ, Child UID અથવા મોબાઈલ શોધો..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-stone-500 font-bold uppercase text-[11px]">ધોરણ:</span>
            {['ALL', '9', '10', '11', '12'].map((std) => (
              <button
                key={std}
                type="button"
                onClick={() => setSelectedStandard(std)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedStandard === std
                    ? 'bg-[#9d512d] text-white'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-[#a99f91] border border-stone-200 dark:border-white/10'
                }`}
              >
                {std === 'ALL' ? 'બધા' : `ધો.${std}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="text-center py-12 space-y-2">
          <div className="w-8 h-8 border-2 border-[#9d512d] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-500">અરજીઓ લોડ થઈ રહી છે...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="glass-card rounded-3xl border border-dashed border-stone-300 dark:border-white/15 p-10 text-center space-y-2">
          <UserPlus className="w-10 h-10 text-stone-400 mx-auto" />
          <h3 className="text-sm font-bold text-stone-800 dark:text-[#e4ded6]">કોઈ પ્રવેશ અરજીઓ મળી નથી</h3>
          <p className="text-xs text-stone-500 dark:text-[#a99f91]">
            વાલીઓ જ્યારે લૉગિન પેજ પરથી ઓનલાઇન પ્રવેશ ફોર્મ સબમિટ કરશે ત્યારે તેમની અરજીઓ અહીં દેખાશે.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((app) => {
            const isApproved = app.status === 'approved';
            const isRejected = app.status === 'rejected';
            const isPending = app.status === 'pending';

            return (
              <div
                key={app.id}
                className="glass-card rounded-2xl border border-stone-200 dark:border-white/10 p-4 sm:p-5 hover:border-[#9d512d]/40 transition-all shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Student Basic details */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Photo or Initials */}
                  <div className="relative shrink-0">
                    {app.photoUrl ? (
                      <img
                        src={app.photoUrl}
                        alt={app.studentName}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-[#9d512d]/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-white/10 flex items-center justify-center font-bold text-stone-700 dark:text-[#e4ded6] border border-stone-200 dark:border-white/15">
                        {app.studentName.charAt(0) || 'S'}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                      {app.admissionStandard}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-stone-900 dark:text-[#e4ded6] truncate">
                        {app.studentName}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                        ધોરણ {app.admissionStandard} માં પ્રવેશ
                      </span>
                      {isApproved && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                          ✓ મંજૂર (DOA: {app.admissionDate})
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300">
                          ✕ નામંજૂર
                        </span>
                      )}
                    </div>

                    {/* Meta badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-600 dark:text-[#a99f91]">
                      <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10">
                        UID: {app.childUid}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10">
                        જન્મ: {app.dob}
                      </span>
                      {app.gender && (
                        <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10">
                          {app.gender}
                        </span>
                      )}
                      {app.category && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 font-bold">
                          {app.category}
                        </span>
                      )}
                      {app.bloodGroup && (
                        <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/20">
                          {app.bloodGroup}
                        </span>
                      )}
                    </div>

                    {/* Academic & Physical info row */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-stone-600 dark:text-[#a99f91]">
                      {app.previousYearTotalDays && app.previousYearPresentDays && (
                        <span className="bg-stone-50 dark:bg-white/5 px-2 py-0.5 rounded border border-stone-200 dark:border-white/10">
                          હાજરી: <strong>{app.previousYearPresentDays} / {app.previousYearTotalDays} દિવસ</strong>
                        </span>
                      )}
                      {app.previousYearPercentage && (
                        <span className="bg-stone-50 dark:bg-white/5 px-2 py-0.5 rounded border border-stone-200 dark:border-white/10 font-bold text-blue-600 dark:text-blue-400">
                          ગત વર્ષ ટકા: {app.previousYearPercentage}%
                        </span>
                      )}
                      {(app.height || app.weight) && (
                        <span className="bg-stone-50 dark:bg-white/5 px-2 py-0.5 rounded border border-stone-200 dark:border-white/10">
                          ઊંચાઈ: {app.height || '-'} cm • વજન: {app.weight || '-'} kg
                        </span>
                      )}
                      {app.motherName && (
                        <span>માતા: {app.motherName}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center flex-wrap justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-200 dark:border-white/10">
                  {/* Phone and WhatsApp */}
                  {app.contactNumber && (
                    <div className="flex items-center gap-1 mr-1">
                      <a
                        href={`tel:${app.contactNumber}`}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-emerald-600 dark:text-emerald-400"
                        title={`કૉલ કરો (${app.contactNumber})`}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <a
                        href={`https://wa.me/91${app.contactNumber}?text=${encodeURIComponent(`નમસ્તે વાલીશ્રી, ${school.schoolName} તરફથી વિદ્યાર્થી ${app.studentName} ના પ્રવેશ ફોર્મ સંદર્ભે સંપર્ક.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-[#25D366]"
                        title="WhatsApp સંદેશ મોકલો"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    </div>
                  )}

                  {/* Edit details */}
                  <button
                    type="button"
                    onClick={() => setEditingApp({ ...app })}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-800 dark:text-[#e4ded6] inline-flex items-center gap-1 cursor-pointer"
                    title="વિગતો સુધારો"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>સંપાદિત</span>
                  </button>

                  {/* Accept Admission Button (Primary feature requested) */}
                  {isPending && (
                    <button
                      type="button"
                      onClick={() => {
                        setAcceptingApp(app);
                        setAdmissionDate(new Date().toISOString().slice(0, 10));
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>પ્રવેશ મંજૂર કરો (Accept)</span>
                    </button>
                  )}

                  {/* Reject Button */}
                  {isPending && (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingApp(app);
                        setRejectionReason('');
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-800 dark:text-red-300 cursor-pointer"
                    >
                      નામંજૂર
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteApp(app.id)}
                    className="p-2 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                    title="અરજી કાઢી નાખો"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ACCEPT ADMISSION WITH ADMISSION DATE POPUP (As Requested)
          ========================================================================= */}
      {acceptingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-emerald-500/40 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  પ્રવેશ મંજૂરી (Admit Student)
                </span>
                <h3 className="text-lg font-black text-stone-900 dark:text-[#e4ded6] mt-1">
                  વિદ્યાર્થી પ્રવેશ કન્ફર્મ કરો
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAcceptingApp(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Preview Box */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">વિદ્યાર્થીનું નામ:</span>
                <span className="font-bold text-stone-900 dark:text-[#e4ded6]">{acceptingApp.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">પ્રવેશ ધોરણ:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">ધોરણ {acceptingApp.admissionStandard}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Child UID:</span>
                <span className="font-mono font-bold">{acceptingApp.childUid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">જન્મ તારીખ:</span>
                <span>{acceptingApp.dob}</span>
              </div>
            </div>

            {/* ADMISSION DATE INPUT (Essential feature requested by user) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-800 dark:text-[#e4ded6]">
                પ્રવેશ તારીખ (Admission Date - DOA) *
              </label>
              <input
                type="date"
                required
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] font-mono font-bold focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <span className="text-[11px] text-stone-500 dark:text-[#a99f91] block">
                * આ તારીખ સાથે વિદ્યાર્થી શાળાના વિદ્યાર્થી લિસ્ટમાં ઉમેરાઈ જશે.
              </span>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 text-xs">
              ℹ️ વિદ્યાર્થીના રોલ નંબર, GR નંબર અને વર્ગ પછીથી વિદ્યાર્થી મેનેજર માંથી આપી શકાશે.
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAcceptingApp(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/10 text-stone-800 dark:text-[#e4ded6]"
              >
                રદ કરો
              </button>

              <button
                type="button"
                onClick={handleConfirmAccept}
                disabled={acceptingLoading}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {acceptingLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>પ્રવેશ અપાઈ રહ્યો છે...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>હા, પ્રવેશ કન્ફર્મ કરો</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: SCHOOL ADMISSION SETTINGS & DATE RANGE (As Requested)
          ========================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/20 p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-stone-900 dark:text-[#e4ded6]">
                  પ્રવેશ પ્રક્રિયા સેટિંગ્સ (Admission Settings)
                </h3>
                <p className="text-xs text-stone-500 dark:text-[#a99f91]">
                  શાળા માટે ઓનલાઇન પ્રવેશ પ્રક્રિયા ક્યારે શરૂ કરવી તે નક્કી કરો
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              {/* Toggle Enable / Disable */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10">
                <div>
                  <span className="font-bold text-stone-900 dark:text-[#e4ded6] block text-sm">
                    ઓનલાઇન પ્રવેશ ચાલુ રાખો (Enable Admissions)
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-[#a99f91]">
                    બંધ કરવાથી લૉગિન પેજ પર પ્રવેશ ફોર્મ સબમિટ થઈ શકશે નહીં
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.isOpen}
                    onChange={(e) => setSettingsForm({ ...settingsForm, isOpen: e.target.value === 'true' || e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-white/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[#9d512d]"></div>
                </label>
              </div>

              {/* Mode selector */}
              <div className="space-y-2">
                <label className="block font-bold text-stone-800 dark:text-[#e4ded6]">
                  પ્રવેશ મોડ (Admission Mode):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, mode: 'open', isOpen: true })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      settingsForm.mode === 'open' && settingsForm.isOpen
                        ? 'border-[#9d512d] bg-[#9d512d]/10 text-[#9d512d] dark:text-[#f59c73] font-bold'
                        : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-[#e4ded6]'
                    }`}
                  >
                    <span className="block font-bold">કાયમી ખુલ્લું</span>
                    <span className="text-[10px] opacity-75">શાળા જાતે બંધ ન કરે ત્યાં સુધી</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, mode: 'date_range', isOpen: true })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      settingsForm.mode === 'date_range' && settingsForm.isOpen
                        ? 'border-[#9d512d] bg-[#9d512d]/10 text-[#9d512d] dark:text-[#f59c73] font-bold'
                        : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-[#e4ded6]'
                    }`}
                  >
                    <span className="block font-bold">તારીખ ગાળો</span>
                    <span className="text-[10px] opacity-75">X તારીખથી Y તારીખ સુધી</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, mode: 'closed', isOpen: false })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      !settingsForm.isOpen || settingsForm.mode === 'closed'
                        ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold'
                        : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-[#e4ded6]'
                    }`}
                  >
                    <span className="block font-bold">બંધ રાખો</span>
                    <span className="text-[10px] opacity-75">પ્રવેશ બંધ છે</span>
                  </button>
                </div>
              </div>

              {/* Date range inputs if date_range selected */}
              {settingsForm.mode === 'date_range' && (
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                      પ્રવેશ શરૂ થવાની તારીખ (Admission Start Date):
                    </label>
                    <input
                      type="date"
                      required
                      value={settingsForm.startDate}
                      onChange={(e) => setSettingsForm({ ...settingsForm, startDate: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#1a232d] border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6] font-medium"
                    />
                    <span className="text-[10.5px] text-stone-500 dark:text-[#a99f91] mt-1 block">
                      આ તારીખથી વિદ્યાર્થીઓ અને વાલીઓ ઓનલાઇન પ્રવેશ ફોર્મ ભરી શકશે.
                    </span>
                  </div>

                  {/* Question: Do you want to set an End Date? */}
                  <div className="pt-3 border-t border-stone-200 dark:border-white/10 space-y-2.5">
                    <label className="block font-bold text-stone-800 dark:text-[#e4ded6] text-xs">
                      તમારે પ્રવેશની અંતિમ તારીખ (End Date) રાખવી છે?
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setHasEndDate(false);
                          setSettingsForm({ ...settingsForm, endDate: '' });
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          !hasEndDate
                            ? 'border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                            : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-[#e4ded6] hover:bg-stone-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">ના (અંતિમ તારીખ નથી રાખવી)</span>
                          {!hasEndDate && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-stone-500 dark:text-[#a99f91] leading-relaxed">
                          શાળા જાતે બંધ કરે ત્યાં સુધી પ્રવેશ ચાલુ રહેશે.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHasEndDate(true)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          hasEndDate
                            ? 'border-[#9d512d] bg-[#9d512d]/10 text-[#9d512d] dark:text-[#f59c73] ring-1 ring-[#9d512d]/30'
                            : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-[#e4ded6] hover:bg-stone-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">હા (અંતિમ તારીખ રાખવી છે)</span>
                          {hasEndDate && <CheckCircle2 className="w-4 h-4 text-[#9d512d] dark:text-[#f59c73]" />}
                        </div>
                        <p className="text-[10px] text-stone-500 dark:text-[#a99f91] leading-relaxed">
                          નક્કી કરેલ અંતિમ તારીખ પછી પ્રવેશ આપોઆપ બંધ થશે.
                        </p>
                      </button>
                    </div>

                    {/* Show End Date picker only if hasEndDate is TRUE */}
                    {hasEndDate ? (
                      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 space-y-1.5 animate-fadeIn">
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-300">
                          અંતિમ તારીખ પસંદ કરો (End Date):
                        </label>
                        <input
                          type="date"
                          required={hasEndDate}
                          min={settingsForm.startDate || undefined}
                          value={settingsForm.endDate}
                          onChange={(e) => setSettingsForm({ ...settingsForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1a232d] border border-amber-300 dark:border-amber-500/30 text-stone-900 dark:text-[#e4ded6] font-medium"
                        />
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 block">
                          આ તારીખ પૂર્ણ થતાં જ પોર્ટલ પર 'Admissions Closed' દર્શાવાશે.
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          અંતિમ તારીખ સેટ નથી. <strong>શાળા જ્યાં સુધી પોર્ટલ જાતે બંધ ન કરે ત્યાં સુધી પ્રવેશ ખુલ્લો રહેશે.</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Instructions for parents */}
              <div>
                <label className="block font-bold text-stone-800 dark:text-[#e4ded6] mb-1">
                  વાલીઓ માટે સૂચના (Instructions for Parents - Optional):
                </label>
                <textarea
                  rows={2}
                  value={settingsForm.instructions}
                  onChange={(e) => setSettingsForm({ ...settingsForm, instructions: e.target.value })}
                  placeholder="દા.ત. પ્રવેશ ફોર્મ ભર્યા પછી શાળાનો રૂબરૂ સંપર્ક કરવો અથવા જરૂરી દસ્તાવેજ સાથે રાખવા..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/10 text-stone-800 dark:text-[#e4ded6]"
                >
                  રદ કરો
                </button>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#9d512d] hover:bg-[#864424] text-white shadow-md inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSettings ? 'સેવ થઈ રહ્યું છે...' : 'સેટિંગ્સ સાચવો'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: EDIT APPLICATION DETAILS
          ========================================================================= */}
      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="glass-panel w-full max-w-xl rounded-3xl border border-white/20 p-6 shadow-2xl my-auto animate-scaleUp max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b border-stone-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-black text-stone-900 dark:text-[#e4ded6]">
                  અરજી વિગતો સુધારો (Edit Details)
                </h3>
                <p className="text-xs text-stone-500">
                  વિદ્યાર્થી: {editingApp.studentName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">વિદ્યાર્થીનું નામ (LC મુજબ):</label>
                <input
                  type="text"
                  required
                  value={editingApp.studentName}
                  onChange={(e) => setEditingApp({ ...editingApp, studentName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">પ્રવેશ ધોરણ:</label>
                  <select
                    value={editingApp.admissionStandard}
                    onChange={(e) => setEditingApp({ ...editingApp, admissionStandard: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1a232d] border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                  >
                    <option value="9">ધોરણ ૯</option>
                    <option value="10">ધોરણ ૧૦</option>
                    <option value="11">ધોરણ ૧૧</option>
                    <option value="12">ધોરણ ૧૨</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Child UID:</label>
                  <input
                    type="text"
                    required
                    value={editingApp.childUid}
                    onChange={(e) => setEditingApp({ ...editingApp, childUid: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 font-mono text-stone-900 dark:text-[#e4ded6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">જન્મ તારીખ:</label>
                  <input
                    type="date"
                    required
                    value={editingApp.dob}
                    onChange={(e) => setEditingApp({ ...editingApp, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">વાલીનો મોબાઈલ:</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editingApp.contactNumber}
                    onChange={(e) => setEditingApp({ ...editingApp, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 font-mono font-bold text-stone-900 dark:text-[#e4ded6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">કેટેગરી:</label>
                  <select
                    value={editingApp.category}
                    onChange={(e) => setEditingApp({ ...editingApp, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1a232d] border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                  >
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">બ્લડ ગ્રૂપ:</label>
                  <input
                    type="text"
                    value={editingApp.bloodGroup}
                    onChange={(e) => setEditingApp({ ...editingApp, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">ગત વર્ષ ટકા (%):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingApp.previousYearPercentage || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, previousYearPercentage: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">ગત વર્ષ હાજર દિવસ (હાજર / કુલ):</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="હાજર"
                      value={editingApp.previousYearPresentDays || ''}
                      onChange={(e) => setEditingApp({ ...editingApp, previousYearPresentDays: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      placeholder="કુલ"
                      value={editingApp.previousYearTotalDays || ''}
                      onChange={(e) => setEditingApp({ ...editingApp, previousYearTotalDays: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">ઊંચાઈ & વજન (cm / kg):</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="ઊંચાઈ"
                      value={editingApp.height || ''}
                      onChange={(e) => setEditingApp({ ...editingApp, height: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      placeholder="વજન"
                      value={editingApp.weight || ''}
                      onChange={(e) => setEditingApp({ ...editingApp, weight: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">સરનામું:</label>
                <input
                  type="text"
                  value={editingApp.address}
                  onChange={(e) => setEditingApp({ ...editingApp, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-[#e4ded6]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/10 text-stone-800 dark:text-[#e4ded6]"
                >
                  રદ કરો
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#9d512d] hover:bg-[#864424] text-white shadow-md cursor-pointer inline-flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingEdit ? 'સાચવી રહ્યા છીએ...' : 'સુધારો સાચવો'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: REJECT APPLICATION WITH REASON
          ========================================================================= */}
      {rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-red-500/40 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-red-600 dark:text-red-400">
                  અરજી નામંજૂર કરો
                </h3>
                <p className="text-xs text-stone-500">
                  વિદ્યાર્થી: {rejectingApp.studentName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingApp(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold">નામંજૂર કરવાનું કારણ (Rejection Reason - Optional):</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="દા.ત. બેઠકો પૂર્ણ થઈ ગયેલ છે / જરૂરી દસ્તાવેજ ખૂટે છે..."
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-stone-300 dark:border-white/10"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingApp(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 dark:bg-white/10"
              >
                રદ કરો
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectingLoading}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md inline-flex items-center justify-center gap-1"
              >
                <XCircle className="w-4 h-4" />
                <span>{rejectingLoading ? 'પ્રક્રિયા...' : 'નામંજૂર કન્ફર્મ કરો'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
