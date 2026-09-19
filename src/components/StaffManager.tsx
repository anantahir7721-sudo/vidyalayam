import React, { useState, useEffect } from 'react';
import { Staff } from '../types';
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
} from 'lucide-react';

interface StaffManagerProps {
  schoolId: string;
  onBack: () => void;
  onGenerateIdCard?: (staffMember: Staff) => void;
}

export const StaffManager: React.FC<StaffManagerProps> = ({
  schoolId,
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
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const initialForm = {
    fullName: '',
    designation: 'શિક્ષક (Teacher)',
    subject: '',
    qualification: '',
    dob: '',
    joiningDate: '',
    mobile: '',
    email: '',
    address: '',
    bloodGroup: '',
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
      designation: staff.designation || 'શિક્ષક (Teacher)',
      subject: staff.subject || '',
      qualification: staff.qualification || '',
      dob: staff.dob || '',
      joiningDate: staff.joiningDate || '',
      mobile: staff.mobile || '',
      email: staff.email || '',
      address: staff.address || '',
      bloodGroup: staff.bloodGroup || '',
    });
    setIsModalOpen(true);
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

    setSubmitting(true);
    try {
      if (editingStaff) {
        await updateStaff(schoolId, editingStaff.id, formData);
        showToast('success', 'સ્ટાફ વિગત સફળતાપૂર્વક સુધારવામાં આવી.');
      } else {
        await addStaff(schoolId, formData);
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
      'વિષય': s.subject || '-',
      'લાયકાત': s.qualification || '-',
      'મોબાઈલ': s.mobile || '-',
      'ઈમેલ': s.email || '-',
      'જન્મ તારીખ': s.dob || '-',
      'જોડાવાની તારીખ': s.joiningDate || '-',
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
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.subject && s.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.mobile && s.mobile.includes(searchQuery));

    const matchesDesignation =
      designationFilter === 'ALL' || s.designation.toLowerCase().includes(designationFilter.toLowerCase());

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
              className="w-full sm:w-48 px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
            >
              <option value="ALL">તમામ હોદ્દા (All)</option>
              <option value="આચાર્ય">આચાર્યશ્રી (Principal)</option>
              <option value="શિક્ષક">શિક્ષક (Teacher)</option>
              <option value="મદદનીશ">મદદનીશ શિક્ષક (Assistant)</option>
              <option value="ક્લાર્ક">ક્લાર્ક / વહીવટી (Clerk)</option>
              <option value="પટાવાળા">સહાયક કર્મચારી (Peon)</option>
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
                    <div className="w-12 h-12 rounded-2xl bg-[#9d512d]/25 border border-[#9d512d]/40 flex items-center justify-center text-[#f59c73] font-bold text-base shadow">
                      {staff.fullName.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#e4ded6]">{staff.fullName}</h4>
                      <span className="inline-block px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                        {staff.designation}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
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
                  {staff.joiningDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#f59c73] shrink-0" />
                      <span>જોડાવાની તારીખ: <span className="text-[#e4ded6]">{staff.joiningDate}</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* ID Card Action */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-[#a99f91]">
                  {staff.bloodGroup ? `Blood: ${staff.bloodGroup}` : ''}
                </span>
                {onGenerateIdCard && (
                  <button
                    onClick={() => onGenerateIdCard(staff)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#f59c73] transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>ID Card જુઓ</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-xl rounded-3xl border border-white/20 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-bold text-[#e4ded6]">
                {editingStaff ? 'સ્ટાફ વિગત સુધારો' : 'નવા સ્ટાફ સભ્ય ઉમેરો'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#a99f91] hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                    હોદ્દો / પદ (Designation) *
                  </label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                  >
                    <option value="આચાર્યશ્રી (Principal)">આચાર્યશ્રી (Principal)</option>
                    <option value="શિક્ષક (Teacher)">શિક્ષક (Teacher)</option>
                    <option value="મદદનીશ શિક્ષક (Assistant Teacher)">મદદનીશ શિક્ષક (Assistant Teacher)</option>
                    <option value="વિષય શિક્ષક (Subject Teacher)">વિષય શિક્ષક (Subject Teacher)</option>
                    <option value="મુખ્ય ક્લાર્ક (Head Clerk)">મુખ્ય ક્લાર્ક (Head Clerk)</option>
                    <option value="જુનિયર ક્લાર્ક (Junior Clerk)">જુનિયર ક્લાર્ક (Junior Clerk)</option>
                    <option value="લેબ સહાયક (Lab Assistant)">લેબ સહાયક (Lab Assistant)</option>
                    <option value="સહાયક કર્મચારી (Peon)">સહાયક કર્મચારી (Peon)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                    મુખ્ય વિષય (Subject Taught)
                  </label>
                  <input
                    type="text"
                    placeholder="દા.ત. ગણિત, વિજ્ઞાન, અંગ્રેજી"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                    શૈક્ષણિક લાયકાત (Qualification)
                  </label>
                  <input
                    type="text"
                    placeholder="દા.ત. M.Sc., B.Ed."
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                    મોબાઈલ નંબર (Mobile)
                  </label>
                  <input
                    type="tel"
                    placeholder="10 અંકનો મોબાઈલ"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                    ઈમેલ (Email)
                  </label>
                  <input
                    type="email"
                    placeholder="teacher@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                    જન્મ તારીખ (Date of Birth)
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                    શાળામાં જોડાવાની તારીખ (Joining Date)
                  </label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a99f91] mb-1">
                    બ્લડ ગ્રુપ (Blood Group)
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
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
                    placeholder="ગામ/શહેર, જિલ્લો"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#a99f91] hover:text-white"
                >
                  રદ કરો
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#9d512d] hover:bg-[#b55e34] text-white text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? 'સાચવી રહ્યું છે...' : editingStaff ? 'સુધારો સાચવો' : 'સ્ટાફ ઉમેરો'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
