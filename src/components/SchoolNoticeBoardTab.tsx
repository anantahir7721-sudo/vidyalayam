import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  MapPin,
  Calendar,
  RefreshCw,
  Copy,
  Printer,
  CheckCircle2,
  Search,
  ExternalLink,
  ChevronRight,
  FileText,
  Trophy,
  Microscope,
  CloudSun,
  Share2,
  Clock,
  ArrowLeft,
  X,
  Award,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import {
  SchoolNoticeBoardData,
  SchoolNoticeItem,
  NoticeCategory,
  GUJARAT_DISTRICT_TALUKAS,
  getTalukasForDistrict,
  cleanLocationName,
  generateCuratedSchoolNotices,
} from '../data/schoolNoticeBoardData';
import { sendNotification } from '../utils/notificationUtils';
import { createAppNotification } from '../services/notificationService';
import { apiUrl } from '../utils/apiConfig';

interface SchoolNoticeBoardTabProps {
  schoolName?: string;
  diseCode?: string;
  district?: string;
  taluka?: string;
  isSchoolView?: boolean;
  schoolId?: string;
  onBack?: () => void;
}

export const SchoolNoticeBoardTab: React.FC<SchoolNoticeBoardTabProps> = ({
  schoolName = 'શ્રી સ્વામિનારાયણ હાઇસ્કૂલ, અંજાર',
  district = 'Kutch',
  taluka = 'અંજાર (Anjar)',
  onBack,
}) => {
  // Local state for taluka and district filters
  const [selectedDistrict, setSelectedDistrict] = useState<string>(district || 'Kutch');
  const [selectedTaluka, setSelectedTaluka] = useState<string>(() => {
    if (taluka) return taluka;
    const cleanD = cleanLocationName(district || 'Kutch');
    if (cleanD.includes('કચ્છ') || cleanD.toLowerCase().includes('kutch')) {
      return 'અંજાર (Anjar)';
    }
    const defaultList = getTalukasForDistrict(district || 'Kutch');
    return defaultList?.[0] || 'અંજાર (Anjar)';
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [modalCopied, setModalCopied] = useState<boolean>(false);
  const [selectedNoticeForModal, setSelectedNoticeForModal] = useState<SchoolNoticeItem | null>(null);

  // In-App Notification Dispatch Modal State
  const [notifyNoticeModal, setNotifyNoticeModal] = useState<SchoolNoticeItem | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<'all' | '9' | '10' | '11' | '12'>('all');
  const [customNotifyTitle, setCustomNotifyTitle] = useState('');
  const [customNotifyBody, setCustomNotifyBody] = useState('');
  const [isDispatchingNotice, setIsDispatchingNotice] = useState(false);
  const [noticeDispatchFeedback, setNoticeDispatchFeedback] = useState<string | null>(null);

  const handleOpenNotifyNoticeModal = (item: SchoolNoticeItem) => {
    setNotifyNoticeModal(item);
    setCustomNotifyTitle(`📢 શાળા સત્તાવાર નોટિસ: ${item.title}`);
    setCustomNotifyBody(item.summary || item.details?.[0] || '');
    setNoticeDispatchFeedback(null);
  };

  const handleDispatchNoticeInApp = async () => {
    if (!notifyNoticeModal) return;
    setIsDispatchingNotice(true);
    setNoticeDispatchFeedback(null);
    try {
      const targetLabel = notifyTarget === 'all' ? 'સમગ્ર શાળા' : `ધોરણ ${notifyTarget}`;
      let resolvedSchoolId = schoolId;
      if (!resolvedSchoolId) {
        try {
          const stored = localStorage.getItem('vidyalayam_school');
          if (stored) resolvedSchoolId = JSON.parse(stored).id;
        } catch {}
      }

      const titleToSend = customNotifyTitle.trim() || `📢 શાળા સત્તાવાર નોટિસ: ${notifyNoticeModal.title}`;
      const bodyToSend = customNotifyBody.trim() || notifyNoticeModal.summary;

      await createAppNotification({
        title: titleToSend,
        body: `${bodyToSend.slice(0, 300)} (વિભાગ: ${targetLabel})`,
        category: 'general_notice',
        targetType: notifyTarget === 'all' ? 'all' : 'standard',
        targetId: notifyTarget === 'all' ? 'all' : notifyTarget,
        standard: notifyTarget === 'all' ? undefined : notifyTarget,
        schoolId: resolvedSchoolId,
      });

      setNoticeDispatchFeedback(`✅ નોટિસ સફળતાપૂર્વક ${targetLabel} ના તમામ વિદ્યાર્થીઓ અને વાલીઓની એપ પર મોકલાઈ ગઈ!`);
      setTimeout(() => {
        setNotifyNoticeModal(null);
        setNoticeDispatchFeedback(null);
      }, 2500);
    } catch (e) {
      console.warn('Dispatch notice error:', e);
      setNoticeDispatchFeedback('નોટિફિકેશન મોકલવામાં સમસ્યા આવી.');
    } finally {
      setIsDispatchingNotice(false);
    }
  };

  // Notice board data state
  const [noticeData, setNoticeData] = useState<SchoolNoticeBoardData>(() => {
    return generateCuratedSchoolNotices(schoolName, selectedDistrict, selectedTaluka);
  });

  // Available talukas based on selected district
  const availableTalukas = useMemo(() => {
    return getTalukasForDistrict(selectedDistrict);
  }, [selectedDistrict]);

  // Fetch or refresh notices via AI Search Grounding
  const fetchNotices = async (dist = selectedDistrict, tal = selectedTaluka) => {
    setIsLoading(true);
    setCopied(false);

    try {
      const res = await fetch(apiUrl('/api/ai/school-notice-board'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          district: dist,
          taluka: tal,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setNoticeData(json.data);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('API call to /api/ai/school-notice-board failed, using curated fallback:', err);
    }

    // High fidelity curated fallback
    const fallback = generateCuratedSchoolNotices(schoolName, dist, tal);
    setNoticeData(fallback);
    setIsLoading(false);
  };

  // Initial load
  useEffect(() => {
    fetchNotices(selectedDistrict, selectedTaluka);
  }, []);

  // Handle District Change
  const handleDistrictChange = (newDist: string) => {
    setSelectedDistrict(newDist);
    const talukas = getTalukasForDistrict(newDist);
    const newTal = talukas[0] || `${newDist} મુખ્ય મથક`;
    setSelectedTaluka(newTal);
    fetchNotices(newDist, newTal);
  };

  // Handle Taluka Change
  const handleTalukaChange = (newTal: string) => {
    setSelectedTaluka(newTal);
    fetchNotices(selectedDistrict, newTal);
  };

  // Filter notices by category and search query
  const filteredNotices = useMemo(() => {
    return noticeData.notices.filter((notice) => {
      // Category filter
      if (activeCategory === 'taluka') {
        const matchTaluka = notice.scope.includes(cleanLocationName(selectedTaluka)) || notice.category === 'taluka';
        if (!matchTaluka) return false;
      } else if (activeCategory === 'district' && notice.category !== 'district') {
        return false;
      } else if (activeCategory === 'science' && notice.category !== 'science_event') {
        return false;
      } else if (activeCategory === 'sports' && notice.category !== 'sports_cultural') {
        return false;
      } else if (activeCategory === 'circular' && notice.category !== 'circular') {
        return false;
      } else if (activeCategory === 'scholarship' && notice.category !== 'scholarship') {
        return false;
      }

      // Search text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = notice.title.toLowerCase().includes(q);
        const matchesSummary = notice.summary.toLowerCase().includes(q);
        const matchesScope = notice.scope.toLowerCase().includes(q);
        const matchesAuthority = notice.sourceAuthority.toLowerCase().includes(q);
        const matchesLetter = (notice.letterNumber || '').toLowerCase().includes(q);
        return matchesTitle || matchesSummary || matchesScope || matchesAuthority || matchesLetter;
      }

      return true;
    });
  }, [noticeData.notices, activeCategory, searchQuery, selectedTaluka]);

  // Copy full bulletin to clipboard (WhatsApp-ready formatting)
  const handleCopyBulletin = () => {
    let text = `📢 *${noticeData.noticeBulletinTitle}*\n`;
    text += `📅 તારીખ: ${noticeData.bulletinDate} | અપડેટ: ${noticeData.lastUpdatedTime}\n`;
    text += `🏫 શાળા: ${noticeData.schoolName}\n`;
    text += `📍 વિસ્તાર: ${noticeData.taluka} • ${noticeData.district}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    filteredNotices.forEach((n, idx) => {
      text += `*${idx + 1}. 📌 ${n.title}*\n`;
      text += `   • તારીખ: ${n.publishedDate} [${n.recencyBadge}]\n`;
      if (n.letterNumber) text += `   • સંદર્ભ: ${n.letterNumber}\n`;
      text += `   • વિભાગ: ${n.categoryLabel} | સ્થળ: ${n.scope}\n`;
      text += `   • વિગત: ${n.summary}\n`;
      if (n.keyPoints && n.keyPoints.length > 0) {
        n.keyPoints.forEach((kp) => {
          text += `     - ${kp}\n`;
        });
      }
      if (n.actionRequired) {
        text += `   👉 નોંધ: ${n.actionRequired}\n`;
      }
      if (n.validUntil) {
        text += `   ⏳ મુદત: ${n.validUntil}\n`;
      }
      if (n.sourceAuthority) {
        text += `   🏛️ સત્તામંડળ: ${n.sourceAuthority}\n`;
      }
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `શાળા નોટિસ બોર્ડ • ${noticeData.schoolName}\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for category badge color & icon
  const getCategoryTheme = (cat: NoticeCategory) => {
    switch (cat) {
      case 'science_event':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
          icon: <Microscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          pin: 'bg-emerald-500',
        };
      case 'district':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
          icon: <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          pin: 'bg-blue-500',
        };
      case 'circular':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
          icon: <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          pin: 'bg-amber-500',
        };
      case 'sports_cultural':
        return {
          bg: 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
          icon: <Trophy className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
          pin: 'bg-orange-500',
        };
      case 'scholarship':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
          icon: <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
          pin: 'bg-purple-500',
        };
      case 'weather_alert':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
          icon: <CloudSun className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
          pin: 'bg-sky-500',
        };
      case 'education_dept':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
          icon: <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          pin: 'bg-indigo-500',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-800 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700',
          icon: <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
          pin: 'bg-amber-500',
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Location Bar */}
      <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/5 border border-amber-300/40 dark:border-amber-500/20 shadow-md relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2.5 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 transition-colors shadow-xs cursor-pointer"
                title="પાછા જાઓ"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>📢 શાળા નોટિસ બોર્ડ</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-sans hidden sm:inline">
                  (School Notice Board)
                </span>
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                પરિપત્રો, બોર્ડ સૂચનાઓ, વિજ્ઞાન મેળો, શિષ્યવૃત્તિ અને શૈક્ષણિક જાહેરાતો
              </p>
            </div>
          </div>

          {/* Bulletin Date & Time Stamp */}
          <div className="bg-white/80 dark:bg-[#121921]/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-200 dark:border-white/10 text-xs shrink-0 shadow-sm flex items-center gap-3">
            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                નોટિસ બોર્ડ તારીખ
              </div>
              <div className="font-black text-slate-900 dark:text-white">
                {noticeData.bulletinDate} • {noticeData.lastUpdatedTime}
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Location Selection Bar */}
        <div className="pt-3 border-t border-amber-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          {/* Location Selectors: District & Taluka */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              <span>વિસ્તાર:</span>
            </span>

            {/* District Dropdown */}
            <div className="flex items-center gap-1 bg-white/90 dark:bg-[#121921] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
              <span className="text-slate-500 font-medium">જિલ્લો:</span>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-900 dark:text-white font-bold focus:outline-none cursor-pointer"
              >
                {Object.keys(GUJARAT_DISTRICT_TALUKAS).map((dist) => (
                  <option key={dist} value={dist}>
                    {cleanLocationName(dist)} ({dist})
                  </option>
                ))}
              </select>
            </div>

            {/* Taluka Dropdown */}
            <div className="flex items-center gap-1 bg-white/90 dark:bg-[#121921] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
              <span className="text-slate-500 font-medium">તાલુકો:</span>
              <select
                value={selectedTaluka}
                onChange={(e) => handleTalukaChange(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-900 dark:text-white font-bold focus:outline-none cursor-pointer"
              >
                {availableTalukas.map((tal) => (
                  <option key={tal} value={tal}>
                    {tal}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons: Refresh, Copy WhatsApp, Print */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => fetchNotices(selectedDistrict, selectedTaluka)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'શોધ થઈ રહી છે...' : 'તાજી માહિતી અપડેટ'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyBulletin}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="નોટિસ બોર્ડ કોપી કરો (WhatsApp)"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'કોપી થઈ ગયું!' : 'નોટિસ બોર્ડ કોપી'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="A4 પ્રિન્ટ"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>પ્રિન્ટ</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips & Search Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: '🌟 તમામ નોટિસ', count: noticeData.notices.length },
              { id: 'taluka', label: `📍 ${cleanLocationName(selectedTaluka)} વિશેષ` },
              { id: 'district', label: `🏛️ ${cleanLocationName(selectedDistrict)} DEO` },
              { id: 'science', label: '🔬 વિજ્ઞાન મેળો' },
              { id: 'circular', label: '📜 પરિપત્રો' },
              { id: 'scholarship', label: '🎓 શિષ્યવૃત્તિ' },
              { id: 'sports', label: '🏆 રમતગમત' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white/90 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="પરિપત્ર, વિષય કે તારીખ શોધો..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Notice Board Bulletin Board Section */}
      <div className="relative rounded-3xl p-4 sm:p-6 bg-[#fbf8f3] dark:bg-[#0c1218] border-2 border-amber-200 dark:border-white/10 shadow-inner">
        {/* Authentic Verification Notice Banner */}
        <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 flex-wrap shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="font-black text-emerald-950 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                <span>૧૦૦% સત્તાવાર પ્રમાણિત માહિતી (Authentic Official Circulars Only)</span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                અહીં માત્ર ગુજરાત સરકારના શિક્ષણ વિભાગ, GSEB, GCERT અને સત્તાવાર શિક્ષણ બોર્ડ દ્વારા પ્રમાણિત પરિપત્રો જ પ્રદર્શિત થાય છે. કોઈપણ કાલ્પનિક કે અપ્રમાણિત માહિતી અહીં દર્શાવવામાં આવતી નથી.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-xs shrink-0">
            ✓ સરકાર દ્વારા માન્ય
          </span>
        </div>

        {/* Notice Board Header Bar */}
        <div className="flex items-center justify-between mb-5 px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              📌 શાળા સૂચના ફલક
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold">
              {cleanLocationName(selectedTaluka)} • {cleanLocationName(selectedDistrict)}
            </span>
            <span>•</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">
              {filteredNotices.length} નોટિસ
            </span>
          </div>
        </div>

        {/* Notices Grid */}
        {filteredNotices.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-white/5 border border-dashed border-amber-300 dark:border-white/10 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto opacity-70" />
            <div className="font-bold text-sm text-slate-800 dark:text-white">કોઈ નોટિસ મળી નથી</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              કૃપા કરીને અલગ કેટેગરી પસંદ કરો અથવા 'તાજી માહિતી અપડેટ' પર ક્લિક કરો.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredNotices.map((notice) => {
              const theme = getCategoryTheme(notice.category);
              return (
                <div
                  key={notice.id}
                  className="relative group p-5 rounded-2xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between space-y-3.5"
                >
                  {/* Pin Graphic on Top Center */}
                  <div className="absolute -top-2.5 left-6 flex items-center justify-center">
                    <span
                      className={`w-5 h-5 rounded-full ${theme.pin} text-white text-[10px] font-black flex items-center justify-center shadow-md border-2 border-white dark:border-[#121921]`}
                    >
                      📌
                    </span>
                  </div>

                  {/* Header: Date Banner & Recency Indicator */}
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap border-b border-slate-100 dark:border-white/5 pb-2.5">
                    {/* Clear Published Date */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>તારીખ: {notice.publishedDate}</span>
                    </div>

                    {/* Recency / Freshness Badge */}
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        notice.urgency === 'high'
                          ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {notice.recencyBadge}
                    </span>
                  </div>

                  {/* Circular Ref & Category Tags */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${theme.bg}`}
                    >
                      {theme.icon}
                      <span>{notice.categoryLabel}</span>
                    </span>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      📍 {notice.scope}
                    </span>

                    {notice.isVerifiedOfficial && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>સત્તાવાર પ્રમાણિત</span>
                      </span>
                    )}
                  </div>

                  {/* Official Letter Number (if present) */}
                  {notice.letterNumber && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-white/5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{notice.letterNumber}</span>
                    </div>
                  )}

                  {/* Notice Title */}
                  <h3
                    onClick={() => setSelectedNoticeForModal(notice)}
                    className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    {notice.title}
                  </h3>

                  {/* Notice Summary */}
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    {notice.summary}
                  </p>

                  {/* Bullet Key Points */}
                  {notice.keyPoints && notice.keyPoints.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 space-y-1.5 text-xs">
                      <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                        મુખ્ય મુદ્દાઓ:
                      </div>
                      <ul className="space-y-1">
                        {notice.keyPoints.map((point, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-1.5 text-slate-800 dark:text-slate-200">
                            <span className="text-amber-600 font-mono shrink-0">•</span>
                            <span className="leading-snug">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Footer Meta: Action, Valid Until & Issuing Authority */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2">
                    {/* Action Required */}
                    {notice.actionRequired && (
                      <div className="text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                        <span className="shrink-0">👉 નોંધ:</span>
                        <span className="leading-snug">{notice.actionRequired}</span>
                      </div>
                    )}

                    {/* Deadline if present */}
                    {notice.validUntil && (
                      <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>{notice.validUntil}</span>
                      </div>
                    )}

                    {/* Official Portal Verification & Issuing Authority */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate max-w-[200px] font-medium" title={notice.sourceAuthority}>
                          🏛️ {notice.sourceAuthority || 'શિક્ષણ વિભાગ'}
                        </span>
                        {notice.officialUrl && (
                          <a
                            href={notice.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-400 hover:underline bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800"
                            title="સત્તાવાર સરકારી પોર્ટલ પર ચકાસો"
                          >
                            <span>સત્તાવાર પોર્ટલ</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNotifyNoticeModal(notice);
                          }}
                          className="p-1 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs"
                          title="આ નોટિસને વિદ્યાર્થીઓની એપ પર મોકલો"
                        >
                          <Bell className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>એપ પર નોટિફાય</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedNoticeForModal(notice)}
                          className="text-amber-700 dark:text-amber-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer text-xs"
                        >
                          <span>સંપૂર્ણ વિગત</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Web Grounding Sources (if available from Google Search Grounding) */}
        {noticeData.groundingSources && noticeData.groundingSources.length > 0 && (
          <div className="mt-6 pt-4 border-t border-amber-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
              <span>સંદર્ભ સ્ત્રોતો:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {noticeData.groundingSources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1"
                >
                  <span>{source.title}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal for Selected Notice */}
      {selectedNoticeForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedNoticeForModal(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#121921] border border-amber-300 dark:border-white/15 p-6 shadow-2xl text-slate-800 dark:text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    {selectedNoticeForModal.categoryLabel}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    📍 {selectedNoticeForModal.scope}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-2 leading-snug">
                  {selectedNoticeForModal.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNoticeForModal(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Seal / Meta Banner */}
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>પ્રકાશિત તારીખ: {selectedNoticeForModal.publishedDate}</span>
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {selectedNoticeForModal.recencyBadge}
                </span>
              </div>
              {selectedNoticeForModal.letterNumber && (
                <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {selectedNoticeForModal.letterNumber}
                </div>
              )}
              <div className="text-slate-600 dark:text-slate-400">
                🏛️ સત્તામંડળ: <strong>{selectedNoticeForModal.sourceAuthority}</strong> ({selectedNoticeForModal.officialSourceType})
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">સંપૂર્ણ વિગત:</h4>
              <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {selectedNoticeForModal.summary}
              </p>
            </div>

            {/* Key Points */}
            {selectedNoticeForModal.keyPoints && selectedNoticeForModal.keyPoints.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  મુખ્ય મુદ્દાઓ:
                </h4>
                <ul className="space-y-1.5">
                  {selectedNoticeForModal.keyPoints.map((kp, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-800 dark:text-slate-200 text-xs">
                      <span className="text-amber-600 font-bold shrink-0">•</span>
                      <span>{kp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Item & Deadline */}
            <div className="space-y-2 text-xs">
              {selectedNoticeForModal.actionRequired && (
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200 font-bold">
                  👉 સૂચના: {selectedNoticeForModal.actionRequired}
                </div>
              )}

              {selectedNoticeForModal.validUntil && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{selectedNoticeForModal.validUntil}</span>
                </div>
              )}
            </div>

            {/* Modal Actions: WhatsApp Share (No window.alert) & Close */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const noticeToNotify = selectedNoticeForModal;
                    setSelectedNoticeForModal(null);
                    if (noticeToNotify) handleOpenNotifyNoticeModal(noticeToNotify);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  title="વિદ્યાર્થીઓ અને વાલીઓની એપ પર સીધી નોટિફિકેશન મોકલો"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>વિદ્યાર્થીઓની એપ પર નોટિફાય કરો</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const n = selectedNoticeForModal;
                    let t = `📌 *${n.title}*\n`;
                    t += `📅 તારીખ: ${n.publishedDate} [${n.recencyBadge}]\n`;
                    if (n.letterNumber) t += `📜 ${n.letterNumber}\n`;
                    t += `🏛️ સત્તામંડળ: ${n.sourceAuthority}\n`;
                    t += `📍 વિસ્તાર: ${n.scope}\n\n`;
                    t += `${n.summary}\n\n`;
                    if (n.actionRequired) t += `👉 નોંધ: ${n.actionRequired}\n`;
                    if (n.validUntil) t += `⏳ મુદત: ${n.validUntil}\n`;
                    t += `\n${n.sourceAuthority}`;
                    navigator.clipboard.writeText(t);
                    setModalCopied(true);
                    setTimeout(() => setModalCopied(false), 2500);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
                >
                  {modalCopied ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
                  <span>{modalCopied ? 'કોપી થઈ ગયું!' : 'WhatsApp માટે કોપી'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNoticeForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-xs cursor-pointer"
              >
                બંધ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target In-App Notification Dispatch Modal */}
      {notifyNoticeModal && (
        <div
          className="fixed inset-0 z-[170] overflow-y-auto p-3 sm:p-6 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setNotifyNoticeModal(null)}
        >
          <div
            className="relative w-full max-w-lg my-auto rounded-3xl bg-white dark:bg-[#121921] border border-amber-300 dark:border-white/15 p-5 sm:p-6 shadow-2xl text-slate-800 dark:text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    વિદ્યાર્થીઓની એપ પર ઇન-એપ નોટિફિકેશન
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ઇન્સ્ટોલ કરેલ એપ પર સીધી નોટિફિકેશન પહોંચશે
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotifyNoticeModal(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notice info & Editable Message Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  સૂચનાનું શીર્ષક (Notification Title):
                </label>
                <input
                  type="text"
                  value={customNotifyTitle}
                  onChange={(e) => setCustomNotifyTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  placeholder="સૂચનાનું શીર્ષક..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  વિગતવાર સંદેશ (Notification Message Body):
                </label>
                <textarea
                  value={customNotifyBody}
                  onChange={(e) => setCustomNotifyBody(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed"
                  placeholder="વિદ્યાર્થીઓ અને વાલીઓને દેખાતો મેસેજ..."
                />
              </div>
            </div>

            {/* Target Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                કોને નોટિફિકેશન મોકલવી છે? (Target Recipients):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'all', label: '🏫 સમગ્ર શાળા' },
                  { id: '9', label: '📚 ધોરણ ૯' },
                  { id: '10', label: '📚 ધોરણ ૧૦' },
                  { id: '11', label: '📚 ધોરણ ૧૧' },
                  { id: '12', label: '📚 ધોરણ ૧૨' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNotifyTarget(item.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      notifyTarget === item.id
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback message */}
            {noticeDispatchFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{noticeDispatchFeedback}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setNotifyNoticeModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                રદ કરો
              </button>
              <button
                type="button"
                onClick={handleDispatchNoticeInApp}
                disabled={isDispatchingNotice}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{isDispatchingNotice ? 'મોકલાઈ રહ્યું છે...' : 'નોટિફિકેશન મોકલો'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
