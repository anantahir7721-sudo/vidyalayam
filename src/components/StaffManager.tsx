import React, { useState, useEffect, useRef } from 'react';
import { School, Staff } from '../types';
import {
  subscribeToStaff,
  addStaff,
  updateStaff,
  deleteStaff,
} from '../services/staffService';
import * as XLSX from 'xlsx';
import {
  UserCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  FileSpreadsheet,
  ArrowLeft,
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Landmark,
  ShieldCheck,
  Building,
  Camera,
  Loader2,
} from 'lucide-react';
import { StaffProfileModal } from './StaffProfileModal';
import { compressStudentPhoto } from '../utils/imageUtils';

interface StaffManagerProps {
  schoolId: string;
  school?: School | null;
  onBack: () => void;
  onGenerateIdCard?: (staffMember: Staff) => void;
}

export const StaffManager: React.FC<StaffManagerProps> = ({
  schoolId,
  school,
  onBack,
  onGenerateIdCard,
}) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [designationFilter, setDesignationFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [viewingStaffProfile, setViewingStaffProfile] = useState<Staff | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const initialForm = {
    fullName: '',
    photoUrl: '',
    designation: 'શિક્ષણ સહાયક',
    category: 'teaching' as 'teaching' | 'non_teaching',
    subject: '',
    qualification: '',
    dob: '',
    serviceJoiningDate: '',
    schoolJoiningDate: '',
    teacherCode: '',
    hrpnNumber: '',
    mobile: '',
    email: '',
    address: '',
    bloodGroup: '',
    aadhaarNumber: '',
    panNumber: '',
    bankName: '',
    bankAccountNo: '',
    bankIfsc: '',
    bankBranch: '',
  };
  const [formData, setFormData] = useState(initialForm);

  // Subscribe to Staff from Firestore
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToStaff(schoolId, (list) => {
      setStaffList(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [schoolId]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      fullName: staff.fullName || '',
      photoUrl: staff.photoUrl || '',
      designation: staff.designation || 'શિક્ષણ સહાયક',
      category: staff.category || 'teaching',
      subject: staff.subject || '',
      qualification: staff.qualification || '',
      dob: staff.dob || '',
      serviceJoiningDate: staff.serviceJoiningDate || staff.joiningDate || '',
      schoolJoiningDate: staff.schoolJoiningDate || staff.joiningDate || '',
      teacherCode: staff.teacherCode || '',
      hrpnNumber: staff.hrpnNumber || '',
      mobile: staff.mobile || '',
      email: staff.email || '',
      address: staff.address || '',
      bloodGroup: staff.bloodGroup || '',
      aadhaarNumber: staff.aadhaarNumber || '',
      panNumber: staff.panNumber || '',
      bankName: staff.bankName || '',
      bankAccountNo: staff.bankAccountNo || '',
      bankIfsc: staff.bankIfsc || '',
      bankBranch: staff.bankBranch || '',
    });
    setIsModalOpen(true);
  };

  const handleFormPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhotoProcessing(true);
      const compressed = await compressStudentPhoto(file, 320, 400, 0.82);
      setFormData((prev) => ({ ...prev, photoUrl: compressed }));
      showToast('success', 'ફોટો તૈયાર થઈ ગયો.');
    } catch (err: any) {
      alert(err.message || 'ઇમેજ પ્રોસેસ કરવામાં ભૂલ આવી.');
    } finally {
      setPhotoProcessing(false);
      if (addPhotoInputRef.current) addPhotoInputRef.current.value = '';
    }
  };

  const handleDelete = async (staff: Staff) => {
    if (!window.confirm(`શું તમે ખરેખર ${staff.fullName} નો સ્ટાફ રેકોર્ડ કાઢી નાખવા માંગો છો?`)) {
      return;
    }

    try {
      await deleteStaff(schoolId, staff.id);
      showToast('success', `${staff.fullName} સફળતાપૂર્વક કાઢી નાખવામાં આવ્યા.`);
    } catch (err: any) {
      console.error('Error deleting staff:', err);
      showToast('error', 'સ્ટાફ કાઢી નાખવામાં ભૂલ આવી.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return;

    // Validate Aadhaar (if provided, must be 12 digits)
    if (formData.aadhaarNumber && !/^\d{12}$/.test(formData.aadhaarNumber.replace(/\s|-/g, ''))) {
      alert('કૃપા કરીને માન્ય ૧૨ અંકનો આધાર કાર્ડ નંબર દાખલ કરો.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        teacherCode: formData.teacherCode?.trim() || '',
        hrpnNumber: formData.hrpnNumber?.trim() || '',
        aadhaarNumber: formData.aadhaarNumber.replace(/\s|-/g, ''),
        // Keep joiningDate in sync for backwards compatibility
        joiningDate: formData.schoolJoiningDate || formData.serviceJoiningDate || '',
      };

      if (editingStaff) {
        await updateStaff(schoolId, editingStaff.id, payload);
        showToast('success', 'સ્ટાફ વિગત સફળતાપૂર્વક સુધારવામાં આવી.');
      } else {
        await addStaff(schoolId, payload);
        showToast('success', 'નવા સ્ટાફ સભ્ય સફળતાપૂર્વક ઉમેરાયા.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving staff:', err);
      showToast('error', 'સ્ટાફ સેવ કરવામાં ભૂલ આવી.');
    } finally {
      setSubmitting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (staffList.length === 0) {
      alert('કોઈ સ્ટાફ ડેટા ઉપલબ્ધ નથી.');
      return;
    }

    const rows = staffList.map((s, idx) => ({
      'ક્રમ': idx + 1,
      'પૂરું નામ': s.fullName,
      'હોદ્દો / પદ': s.designation,
      'સ્ટાફ પ્રકાર': s.category === 'non_teaching' ? 'બિન-શૈક્ષણિક' : 'શૈક્ષણિક',
      'શિક્ષક કોડ': s.teacherCode || '-',
      'HRPN નંબર': s.hrpnNumber || '-',
      'મુખ્ય વિષય': s.subject || '-',
      'લાયકાત': s.qualification || '-',
      'મોબાઈલ': s.mobile || '-',
      'ઈમેલ': s.email || '-',
      'જન્મ તારીખ': s.dob || '-',
      'ખાતામાં દાખલ તારીખ': s.serviceJoiningDate || s.joiningDate || '-',
      'આ શાળામાં દાખલ તારીખ': s.schoolJoiningDate || s.joiningDate || '-',
      'આધાર કાર્ડ નં.': s.aadhaarNumber || '-',
      'PAN કાર્ડ નં.': s.panNumber || '-',
      'બેંકનું નામ': s.bankName || '-',
      'બેંક ખાતા નં.': s.bankAccountNo || '-',
      'IFSC કોડ': s.bankIfsc || '-',
      'શાખા': s.bankBranch || '-',
      'સરનામું': s.address || '-',
      'બ્લડ ગ્રુપ': s.bloodGroup || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff_List');
    XLSX.writeFile(workbook, `School_Staff_List_${new Date().getFullYear()}.xlsx`);
  };

  // Filtered staff
  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.fullName.toLowerCase().includes(q) ||
      (s.subject && s.subject.toLowerCase().includes(q)) ||
      (s.teacherCode && s.teacherCode.toLowerCase().includes(q)) ||
      (s.hrpnNumber && s.hrpnNumber.toLowerCase().includes(q)) ||
      (s.mobile && s.mobile.includes(q)) ||
      (s.aadhaarNumber && s.aadhaarNumber.includes(q)) ||
      (s.bankAccountNo && s.bankAccountNo.includes(q));

    const matchesDesignation =
      designationFilter === 'ALL' ||
      (designationFilter === 'TEACHING' && s.category !== 'non_teaching') ||
      (designationFilter === 'NON_TEACHING' && s.category === 'non_teaching') ||
      s.designation.toLowerCase().includes(designationFilter.toLowerCase());

    return matchesSearch && matchesDesignation;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl glass-card text-xs font-bold text-[#e4ded6] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#f59c73]" />
          <span>ડેશબોર્ડ પર પાછા જાઓ (Back to Dashboard)</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel ડાઉનલોડ ({staffList.length})</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9d512d] hover:bg-[#b55e34] text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>નવા સ્ટાફ ઉમેરો (Add Staff)</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-3xl border border-white/10 p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a99f91]" />
            <input
              type="text"
              placeholder="નામ, વિષય અથવા ફોનથી શોધો..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs placeholder:text-[#a99f91] focus:outline-none focus:border-[#f59c73]"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs text-[#a99f91] font-semibold whitespace-nowrap">હોદ્દો:</label>
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
            >
              <option value="ALL">તમામ સ્ટાફ (All)</option>
              <optgroup label="શૈક્ષણિક સ્ટાફ (Teaching Staff)">
                <option value="આચાર્ય (વર્ગ–2)">આચાર્ય (વર્ગ–2)</option>
                <option value="આચાર્ય (ઇન્ચાર્જ)">આચાર્ય (ઇન્ચાર્જ)</option>
                <option value="શિક્ષણ સહાયક">શિક્ષણ સહાયક</option>
                <option value="મદદનીશ શિક્ષક">મદદનીશ શિક્ષક</option>
                <option value="Gyan Sahayak">Gyan Sahayak (જ્ઞાન સહાયક)</option>
                <option value="Para Teacher">Para Teacher (પેરા ટીચર)</option>
              </optgroup>
              <optgroup label="બિન-શૈક્ષણિક સ્ટાફ (Non-Teaching Staff)">
                <option value="ક્લાર્ક">ક્લાર્ક (Clerk)</option>
                <option value="પટાવાળા">પટાવાળા (Peon)</option>
                <option value="સફાઈ કર્મચારી">સફાઈ કર્મચારી (Sweeper)</option>
                <option value="ચોકીદાર">ચોકીદાર (Watchman/Guard)</option>
              </optgroup>
              <option value="Others">અન્ય (Others)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="text-center py-16 text-xs text-[#a99f91]">
          સ્ટાફ માહિતી લોડ થઈ રહી છે...
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="glass-panel rounded-3xl border border-white/10 p-12 text-center text-[#a99f91]">
          <UserCheck className="w-12 h-12 mx-auto text-[#f59c73] mb-3 opacity-60" />
          <h3 className="text-sm font-bold text-white mb-1">કોઈ સ્ટાફ સભ્ય મળ્યા નથી</h3>
          <p className="text-xs mb-4">
            {searchQuery ? 'શોધ પરિણામમાં કોઈ મેળ નથી આવ્યો.' : 'હજુ સુધી કોઈ સ્ટાફ સભ્ય ઉમેરવામાં આવ્યા નથી.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9d512d] hover:bg-[#b55e34] text-white text-xs font-bold shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>પ્રથમ સ્ટાફ સભ્ય ઉમેરો</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className="glass-card rounded-3xl border border-white/10 p-5 shadow-lg flex flex-col justify-between hover:border-white/20 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setViewingStaffProfile(staff)}
                      className="relative cursor-pointer group/avatar shrink-0"
                      title="પ્રોફાઇલ અને ફોટો જુઓ"
                    >
                      {staff.photoUrl ? (
                        <img
                          src={staff.photoUrl}
                          alt={staff.fullName}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-[#9d512d]/50 shadow bg-slate-900 group-hover/avatar:border-[#f59c73] transition-colors"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-[#9d512d]/25 border border-[#9d512d]/40 flex items-center justify-center text-[#f59c73] font-bold text-base shadow group-hover/avatar:border-[#f59c73] transition-colors">
                          {staff.fullName.charAt(0) || 'S'}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 p-0.5 bg-[#9d512d] text-white rounded-full border border-white/20 shadow">
                        <Camera className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <div>
                      <h4
                        onClick={() => setViewingStaffProfile(staff)}
                        className="font-bold text-sm text-[#e4ded6] leading-tight hover:text-white cursor-pointer transition-colors"
                      >
                        {staff.fullName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                          {staff.designation}
                        </span>
                        {staff.category === 'non_teaching' ? (
                          <span className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/20">
                            બિન-શૈક્ષણિક
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                            શૈક્ષણિક
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(staff)}
                      title="વિગત સુધારો"
                      className="p-1.5 rounded-lg text-[#a99f91] hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(staff)}
                      title="કાઢી નાખો"
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details list */}
                <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-xs text-[#a99f91]">
                  {staff.teacherCode && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>શિક્ષક કોડ: <strong className="text-white font-mono">{staff.teacherCode}</strong></span>
                    </div>
                  )}
                  {staff.hrpnNumber && (
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>HRPN નંબર: <strong className="text-white font-mono">{staff.hrpnNumber}</strong></span>
                    </div>
                  )}
                  {staff.subject && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-[#f59c73] shrink-0" />
                      <span>વિષય: <strong className="text-[#e4ded6]">{staff.subject}</strong></span>
                    </div>
                  )}
                  {staff.qualification && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-[#f59c73] shrink-0" />
                      <span>લાયકાત: <span className="text-[#e4ded6]">{staff.qualification}</span></span>
                    </div>
                  )}
                  {staff.mobile && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#f59c73] shrink-0" />
                      <a href={`tel:${staff.mobile}`} className="text-[#e4ded6] hover:underline">
                        {staff.mobile}
                      </a>
                    </div>
                  )}
                  {staff.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#f59c73] shrink-0" />
                      <span className="text-[#e4ded6] truncate">{staff.email}</span>
                    </div>
                  )}

                  {/* Joining Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/5">
                    {staff.serviceJoiningDate && (
                      <div className="flex flex-col text-[11px]">
                        <span className="text-[#8e8579]">ખાતામાં દાખલ:</span>
                        <span className="text-[#e4ded6] font-medium">{staff.serviceJoiningDate}</span>
                      </div>
                    )}
                    {(staff.schoolJoiningDate || staff.joiningDate) && (
                      <div className="flex flex-col text-[11px]">
                        <span className="text-[#8e8579]">શાળામાં દાખલ:</span>
                        <span className="text-[#e4ded6] font-medium">
                          {staff.schoolJoiningDate || staff.joiningDate}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bank and Aadhaar badges */}
                  {(staff.aadhaarNumber || staff.bankAccountNo) && (
                    <div className="pt-2 border-t border-white/5 space-y-1 text-[11px]">
                      {staff.aadhaarNumber && (
                        <div className="flex items-center gap-1.5 text-[#8e8579]">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>આધાર: <span className="text-[#e4ded6] font-mono">XXXX-XXXX-{staff.aadhaarNumber.slice(-4)}</span></span>
                        </div>
                      )}
                      {staff.bankAccountNo && (
                        <div className="flex items-center gap-1.5 text-[#8e8579]">
                          <Landmark className="w-3 h-3 text-[#f59c73]" />
                          <span>બેંક: <span className="text-[#e4ded6] font-mono">{staff.bankAccountNo}</span> {staff.bankIfsc ? `(${staff.bankIfsc})` : ''}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Profile & ID Card Actions */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  onClick={() => setViewingStaffProfile(staff)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#e4ded6] hover:text-white transition-colors cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#f59c73]" />
                  <span>પ્રોફાઇલ જુઓ</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#a99f91] hidden sm:inline">
                    {staff.bloodGroup ? `Blood: ${staff.bloodGroup}` : ''}
                  </span>
                  {onGenerateIdCard && (
                    <button
                      onClick={() => onGenerateIdCard(staff)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#9d512d]/20 hover:bg-[#9d512d]/30 text-xs font-bold text-[#f59c73] border border-[#9d512d]/30 transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>ID Card જુઓ</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-xl rounded-3xl border border-white/20 p-5 sm:p-6 shadow-2xl max-h-[86dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden my-auto animate-fadeIn">
            <div className="shrink-0 flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-[#e4ded6]">
                {editingStaff ? 'સ્ટાફ વિગત સુધારો' : 'નવા સ્ટાફ સભ્ય ઉમેરો'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#a99f91] hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden mt-3">
              <div className="flex-1 overflow-y-auto pr-1 space-y-5">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  સ્ટાફ પ્રકાર (Staff Category) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        category: 'teaching',
                        designation: 'શિક્ષણ સહાયક',
                      });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formData.category !== 'non_teaching'
                        ? 'bg-[#9d512d] text-white border-[#f59c73]'
                        : 'bg-black/20 text-[#a99f91] border-white/10 hover:border-white/20'
                    }`}
                  >
                    શૈક્ષણિક સ્ટાફ (Teaching)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        category: 'non_teaching',
                        designation: 'પટાવાળા',
                      });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formData.category === 'non_teaching'
                        ? 'bg-purple-700 text-white border-purple-400'
                        : 'bg-black/20 text-[#a99f91] border-white/10 hover:border-white/20'
                    }`}
                  >
                    બિન-શૈક્ષણિક સ્ટાફ (Non-Teaching)
                  </button>
                </div>
              </div>

              {/* Staff Photo Upload Block */}
              <div className="bg-black/30 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  <div className="w-24 h-28 rounded-2xl border-2 border-dashed border-[#9d512d]/60 bg-black/50 overflow-hidden flex items-center justify-center shadow-inner">
                    {photoProcessing ? (
                      <div className="flex flex-col items-center gap-1 text-[11px] text-[#f59c73]">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>કમ્પ્રેસિંગ...</span>
                      </div>
                    ) : formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#8e8579]">
                        <Camera className="w-7 h-7 text-[#f59c73]" />
                        <span className="text-[10px] font-medium">ફોટો નથી</span>
                      </div>
                    )}
                  </div>

                  {formData.photoUrl && !photoProcessing && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
                      className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md cursor-pointer transition-transform hover:scale-110"
                      title="ફોટો દૂર કરો"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <div className="text-xs font-bold text-[#e4ded6]">સ્ટાફ પાસપોર્ટ સાઇઝ ફોટો (Staff Photo)</div>
                    <div className="text-[11px] text-[#8e8579]">
                      શિક્ષક આઈડી કાર્ડ અને પ્રોફાઇલમાં છાપવા માટે (ઓટો-કમ્પ્રેસ થશે &lt; 50KB)
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <input
                      type="file"
                      ref={addPhotoInputRef}
                      onChange={handleFormPhotoChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => addPhotoInputRef.current?.click()}
                      disabled={photoProcessing}
                      className="px-3.5 py-1.5 rounded-xl bg-[#9d512d] hover:bg-[#b55e34] text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{formData.photoUrl ? 'ફોટો બદલો' : 'ફોટો પસંદ કરો'}</span>
                    </button>

                    {formData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-950/40 text-rose-300 border border-white/10 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>દૂર કરો</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Basic Details */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h4 className="text-xs font-bold text-[#f59c73] uppercase tracking-wider">મૂળભૂત વિગતો (Basic Details)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      પૂરું નામ (Full Name) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="દા.ત. પટેલ રમેશભાઈ કે."
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      હોદ્દો / પદ (Designation) *
                    </label>
                    <select
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    >
                      {formData.category === 'non_teaching' ? (
                        <>
                          <option value="પટાવાળા">પટાવાળા (Peon)</option>
                          <option value="ક્લાર્ક">ક્લાર્ક (Clerk)</option>
                          <option value="સફાઈ કર્મચારી">સફાઈ કર્મચારી (Sweeper)</option>
                          <option value="ચોકીદાર">ચોકીદાર (Watchman)</option>
                          <option value="લેબ સહાયક">લેબ સહાયક (Lab Assistant)</option>
                          <option value="Others">અન્ય (Others)</option>
                        </>
                      ) : (
                        <>
                          <option value="આચાર્ય (વર્ગ–2)">આચાર્ય (વર્ગ–2)</option>
                          <option value="આચાર્ય (ઇન્ચાર્જ)">આચાર્ય (ઇન્ચાર્જ)</option>
                          <option value="શિક્ષણ સહાયક">શિક્ષણ સહાયક</option>
                          <option value="મદદનીશ શિક્ષક">મદદનીશ શિક્ષક</option>
                          <option value="Gyan Sahayak">Gyan Sahayak (જ્ઞાન સહાયક)</option>
                          <option value="Para Teacher">Para Teacher (પેરા ટીચર)</option>
                          <option value="Others">અન્ય (Others)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      {formData.category === 'non_teaching' ? 'વિભાગ / કામગીરી' : 'મુખ્ય વિષય (Subject)'}
                    </label>
                    <input
                      type="text"
                      placeholder={formData.category === 'non_teaching' ? 'દા.ત. ઓફિસ કામગીરી, વહીવટ' : 'દા.ત. ગણિત, વિજ્ઞાન, ભાષા'}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      શૈક્ષણિક લાયકાત (Qualification)
                    </label>
                    <input
                      type="text"
                      placeholder="દા.ત. M.Sc., B.Ed. / ધોરણ 12 પાસ"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>

                  {/* Teacher Code and HRPN Number (Shaikshanik staff) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      શિક્ષક કોડ (Teacher Code)
                    </label>
                    <input
                      type="text"
                      placeholder="દા.ત. TC-1049 અથવા 12049"
                      value={formData.teacherCode}
                      onChange={(e) => setFormData({ ...formData, teacherCode: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#f59c73]"
                    />
                    <span className="text-[10px] text-[#8e8579] mt-0.5 block">શિક્ષક ઓળખ કોડ નંબર</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1 flex items-center justify-between">
                      <span>HRPN નંબર (HRPN Number)</span>
                      <span className="text-[10px] text-amber-400 font-normal">(ફરજિયાત નથી / Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="દા.ત. HRPN-89230 (વૈકલ્પિક)"
                      value={formData.hrpnNumber}
                      onChange={(e) => setFormData({ ...formData, hrpnNumber: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#f59c73]"
                    />
                    <span className="text-[10px] text-[#8e8579] mt-0.5 block">HRPN નંબર વૈકલ્પિક છે</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      જન્મ તારીખ (Date of Birth)
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>
                </div>
              </div>

              {/* Service & Joining Dates */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h4 className="text-xs font-bold text-[#f59c73] uppercase tracking-wider">સેવા / જોડાવાની તારીખો (Joining Dates)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      ખાતામાં દાખલ તારીખ *
                    </label>
                    <input
                      type="date"
                      value={formData.serviceJoiningDate}
                      onChange={(e) => setFormData({ ...formData, serviceJoiningDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    />
                    <span className="text-[10px] text-[#8e8579] mt-0.5 block">સરકારી ખાતામાં પ્રથમ નિમણૂક તારીખ</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      આ શાળામાં દાખલ તારીખ *
                    </label>
                    <input
                      type="date"
                      value={formData.schoolJoiningDate}
                      onChange={(e) => setFormData({ ...formData, schoolJoiningDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    />
                    <span className="text-[10px] text-[#8e8579] mt-0.5 block">હાજર શાળામાં હાજર થયા તારીખ</span>
                  </div>
                </div>
              </div>

              {/* Identity Details */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h4 className="text-xs font-bold text-[#f59c73] uppercase tracking-wider">ઓળખ વિગતો (Identity Details)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      આધાર કાર્ડ નંબર (12 અંક)
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="XXXX-XXXX-XXXX"
                      value={formData.aadhaarNumber}
                      onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      PAN કાર્ડ નંબર (10 અક્ષર)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="ABCDE1234F"
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs uppercase font-mono focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h4 className="text-xs font-bold text-[#f59c73] uppercase tracking-wider">બેંક ખાતાની વિગતો (Bank Details)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      બેંકનું નામ (Bank Name)
                    </label>
                    <input
                      type="text"
                      placeholder="દા.ત. SBI, BOB, HDFC"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      બેંક ખાતા નંબર (Account No.)
                    </label>
                    <input
                      type="text"
                      placeholder="ખાતા નંબર દાખલ કરો"
                      value={formData.bankAccountNo}
                      onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      IFSC કોડ (11 અક્ષર)
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="દા.ત. SBIN0001234"
                      value={formData.bankIfsc}
                      onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs uppercase font-mono focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      શાખા (Branch Name)
                    </label>
                    <input
                      type="text"
                      placeholder="દા.ત. રાજકોટ મુખ્ય શાખા"
                      value={formData.bankBranch}
                      onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>
                </div>
              </div>

              {/* Contact & Personal */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h4 className="text-xs font-bold text-[#f59c73] uppercase tracking-wider">સંપર્ક અને અંગત વિગતો (Contact & Personal)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      મોબાઈલ નંબર (Mobile)
                    </label>
                    <input
                      type="tel"
                      placeholder="10 અંકનો મોબાઈલ"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      ઈમેલ (Email)
                    </label>
                    <input
                      type="email"
                      placeholder="staff@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      બ્લડ ગ્રુપ (Blood Group)
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    >
                      <option value="">પસંદ કરો...</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                      સરનામું (Address)
                    </label>
                    <input
                      type="text"
                      placeholder="ગામ/શહેર, જિલ્લો, પિનકોડ"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                    />
                  </div>
                </div>
              </div>
              </div>

              <div className="shrink-0 pt-3 flex items-center justify-end gap-3 border-t border-white/10 mt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#a99f91] hover:text-white cursor-pointer"
                >
                  રદ કરો
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#9d512d] hover:bg-[#b55e34] text-white text-xs font-bold shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'સાચવી રહ્યું છે...' : editingStaff ? 'સુધારો સાચવો' : 'સ્ટાફ ઉમેરો'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Profile Modal */}
      {viewingStaffProfile && (
        <StaffProfileModal
          staff={viewingStaffProfile}
          schoolId={schoolId}
          school={school}
          isOpen={!!viewingStaffProfile}
          onClose={() => setViewingStaffProfile(null)}
          onStaffUpdated={(updatedStaff) => {
            setStaffList((prev) =>
              prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s))
            );
            setViewingStaffProfile(updatedStaff);
          }}
          onEditStaff={(stf) => {
            handleOpenEdit(stf);
          }}
          onGenerateIdCard={onGenerateIdCard}
        />
      )}
    </div>
  );
};
