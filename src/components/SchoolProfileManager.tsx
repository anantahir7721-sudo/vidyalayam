import React, { useState, useRef } from 'react';
import { School } from '../types';
import { updateSchoolProfile } from '../services/firestoreService';
import { compressSchoolLogo } from '../utils/imageUtils';
import { LogoCropModal } from './LogoCropModal';
import {
  Building2,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  BookOpen,
  ArrowLeft,
  Calendar,
  Upload,
  Image as ImageIcon,
  Trash2,
  Crop,
  KeyRound,
} from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';

interface SchoolProfileManagerProps {
  school: School;
  onBack: () => void;
  onProfileUpdated?: (updated: Partial<School>) => void;
}

export const SchoolProfileManager: React.FC<SchoolProfileManagerProps> = ({
  school,
  onBack,
  onProfileUpdated,
}) => {
  const [formData, setFormData] = useState({
    schoolName: school.schoolName || '',
    district: school.district || '',
    address: school.address || '',
    village: school.village || '',
    taluka: school.taluka || '',
    schoolType: school.schoolType || 'માધ્યમિક અને ઉચ્ચતર માધ્યમિક',
    medium: school.medium || 'ગુજરાતી',
    principalName: school.principalName || '',
    principalPhone: school.principalPhone || '',
    contactEmail: school.contactEmail || (school as any).email || '',
    contactPhone: school.contactPhone || (school as any).contactNumber || '',
    establishedYear: school.establishedYear || '',
    logoUrl: school.logoUrl || '',
  });

  const [saving, setSaving] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password Change Modal State
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Logo Crop Modal States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSourceImage, setCropSourceImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('કૃપા કરીને માન્ય ઇમેજ ફાઇલ પસંદ કરો (Please select a valid image file).');
      return;
    }

    setLogoLoading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCropSourceImage(result);
      setCropModalOpen(true);
      setLogoLoading(false);
      // Reset input value so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setErrorMsg('ઇમેજ વાંચવામાં ભૂલ આવી. કૃપા કરીને ફરી પ્રયાસ કરો.');
      setLogoLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBase64: string) => {
    setFormData((prev) => ({ ...prev, logoUrl: croppedBase64 }));
    setSuccessMsg('લોગો ક્રોપ થઈ ગયો છે! શાળા પ્રોફાઇલ સેવ કરવાનું ભૂલતા નહીં.');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const dataToSave = {
        ...formData,
        contactNumber: formData.contactPhone,
        email: formData.contactEmail,
      };
      await updateSchoolProfile(school.id, dataToSave as any);
      setSuccessMsg('શાળા પ્રોફાઇલ સફળતાપૂર્વક સાચવવામાં આવી છે! (School profile updated successfully)');
      if (onProfileUpdated) {
        onProfileUpdated(dataToSave as any);
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Error updating school profile:', err);
      setErrorMsg(err.message || 'પ્રોફાઇલ સાચવતી વખતે ભૂલ આવી. કૃપા કરીને ફરી પ્રયાસ કરો.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl glass-card text-xs font-bold text-[#e4ded6] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#f59c73]" />
          <span>ડેશબોર્ડ પર પાછા જાઓ (Back to Dashboard)</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#a99f91]">
          <Building2 className="w-4 h-4 text-[#f59c73]" />
          <span>શાળા પ્રોફાઇલ સંચાલન • Vidyalayam</span>
        </div>
      </div>

      {/* Main Glass Panel */}
      <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#9d512d]/25 text-[#f59c73] border border-[#9d512d]/40 mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>સત્તાવાર શાળા માહિતી (Official School Profile)</span>
            </div>
            <h2 className="text-2xl font-black text-[#e4ded6] tracking-tight">
              {formData.schoolName || school.schoolName}
            </h2>
            <p className="text-xs text-[#a99f91] mt-1">
              શાળાની સામાન્ય અને સંપર્ક વિગતો અહીંથી અપડેટ કરો.
            </p>
          </div>

          {/* DISE Code Read-Only Badge */}
          <div className="glass-card border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#a99f91] flex items-center gap-1">
                <span>DISE કોડ (Read-Only)</span>
              </div>
              <div className="text-sm font-mono font-black text-[#e4ded6] tracking-wider">
                {school.diseCode}
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="mt-6 space-y-6">
          {/* Section 0: School Logo */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {formData.logoUrl ? (
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border border-white/20 shrink-0 p-1 flex items-center justify-center shadow-lg bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:8px_8px]">
                    <img
                      src={formData.logoUrl}
                      alt="School Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 shrink-0 flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                    <span className="text-[10px] text-slate-400 mt-1 font-medium">લોગો નથી</span>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>શાળાનો સત્તાવાર લોગો (School Logo)</span>
                    {formData.logoUrl && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        અપલોડેડ
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    આ લોગો વિદ્યાર્થી ID કાર્ડ, પરિણામ પત્રકો, A4 પ્રિન્ટ અને ઓનલાઇન પરીક્ષા સ્ક્રીન પર શાળાના નામ સાથે દેખાશે.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCropSourceImage(formData.logoUrl);
                      setCropModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-sm"
                    title="લોગો ક્રોપ / સાઇઝ ગોઠવો"
                  >
                    <Crop className="w-4 h-4" />
                    <span>ક્રોપ & સાઇઝ ફિટ કરો</span>
                  </button>
                )}

                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-md cursor-pointer transition-all">
                  <Upload className="w-4 h-4" />
                  <span>{logoLoading ? 'પ્રોસેસિંગ...' : formData.logoUrl ? 'લોગો બદલો' : 'નવો લોગો અપલોડ કરો'}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={logoLoading}
                  />
                </label>

                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="લોગો હટાવો"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">હટાવો</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Basic Information */}
          <div>
            <h3 className="text-sm font-bold text-[#e4ded6] flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-[#f59c73]" />
              <span>મૂળભૂત માહિતી (Basic Information)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  શાળાનું નામ (School Name) *
                </label>
                <input
                  type="text"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  જિલ્લો (District) *
                </label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  તાલુકો (Taluka)
                </label>
                <input
                  type="text"
                  name="taluka"
                  placeholder="દા.ત. નવસારી, પાટણ"
                  value={formData.taluka}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  ગામ / શહેર (Village / City)
                </label>
                <input
                  type="text"
                  name="village"
                  placeholder="ગામ અથવા શહેરનું નામ"
                  value={formData.village}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  શાળાનો પ્રકાર (School Type)
                </label>
                <select
                  name="schoolType"
                  value={formData.schoolType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                >
                  <option value="માધ્યમિક અને ઉચ્ચતર માધ્યમિક">માધ્યમિક અને ઉચ્ચતર માધ્યમિક (Std 9 - 12)</option>
                  <option value="માધ્યમિક">માધ્યમિક (Std 9 - 10)</option>
                  <option value="ઉચ્ચતર માધ્યમિક">ઉચ્ચતર માધ્યમિક (Std 11 - 12)</option>
                  <option value="પ્રાથમિક">પ્રાથમિક (Std 1 - 8)</option>
                  <option value="સંયુક્ત શાળા">સંયુક્ત શાળા (K-12)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  શિક્ષણનું માધ્યમ (Medium of Instruction)
                </label>
                <select
                  name="medium"
                  value={formData.medium}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                >
                  <option value="ગુજરાતી">ગુજરાતી (Gujarati)</option>
                  <option value="અંગ્રેજી">અંગ્રેજી (English)</option>
                  <option value="હિન્દી">હિન્દી (Hindi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  સ્થાપના વર્ષ (Established Year)
                </label>
                <input
                  type="text"
                  name="establishedYear"
                  placeholder="દા.ત. 1995"
                  value={formData.establishedYear}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  સરનામું (School Address)
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="શાળાનું પૂરું સરનામું, પિન કોડ સાથે"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Principal & Contact Information */}
          <div className="pt-6 border-t border-white/10">
            <h3 className="text-sm font-bold text-[#e4ded6] flex items-center gap-2 mb-4">
              <UserCheck className="w-4 h-4 text-[#f59c73]" />
              <span>આચાર્ય અને સંપર્ક વિગત (Principal & Contact Info)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  આચાર્યશ્રીનું નામ (Principal Name)
                </label>
                <input
                  type="text"
                  name="principalName"
                  placeholder="આચાર્યશ્રીનું પૂરું નામ"
                  value={formData.principalName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  આચાર્યશ્રી મોબાઈલ (Principal Mobile)
                </label>
                <input
                  type="tel"
                  name="principalPhone"
                  placeholder="10 અંકનો મોબાઈલ નંબર"
                  value={formData.principalPhone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  શાળાનો ઈમેલ (School Email)
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  placeholder="school@example.com"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                  શાળા લેન્ડલાઈન / ફોન (School Phone)
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  placeholder="ઓફિસ ફોન નંબર"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Security & Password Management Section */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>સુરક્ષા અને પાસવર્ડ વ્યવસ્થાપન</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">સુરક્ષિત</span>
                  </h3>
                  <p className="text-xs text-[#a99f91]">
                    શાળા લોગિન માટે તમારો વર્તમાન પાસવર્ડ બદલો અને એકાઉન્ટને સુરક્ષિત રાખો.
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-open-change-password"
                onClick={() => setChangePasswordOpen(true)}
                className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/40 border border-amber-500/50 text-amber-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>નવો પાસવર્ડ બદલો (Change Password)</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#a99f91] hover:text-white transition-colors"
            >
              રદ કરો (Cancel)
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#9d512d] hover:bg-[#b55e34] text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'સાચવી રહ્યું છે...' : 'માહિતી સાચવો (Save Profile)'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Interactive Logo Cropper & Sizing Modal */}
      {cropModalOpen && (
        <LogoCropModal
          isOpen={cropModalOpen}
          imageSrc={cropSourceImage}
          schoolName={formData.schoolName || school.schoolName}
          onClose={() => setCropModalOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* School Change Password Modal */}
      {changePasswordOpen && (
        <ChangePasswordModal
          isOpen={changePasswordOpen}
          onClose={() => setChangePasswordOpen(false)}
          school={school}
        />
      )}
    </div>
  );
};
