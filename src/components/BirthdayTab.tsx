import React, { useState, useEffect, useRef } from 'react';
import {
  Cake,
  Calendar,
  Sparkles,
  Download,
  Share2,
  Users,
  UserCheck,
  ChevronRight,
  Clock,
  Printer,
  FileText,
  Search,
  Filter,
  Heart,
  PartyPopper,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  BirthdayPerson,
  getTodayBirthdays,
  getUpcomingBirthdays,
  checkAndDispatchBirthdayNotification,
} from '../services/birthdayService';
import { BirthdayCard } from './BirthdayCard';
import { School, Student, Staff } from '../types';

interface BirthdayTabProps {
  school: School;
  students: Student[];
  staff: Staff[];
}

export const BirthdayTab: React.FC<BirthdayTabProps> = ({ school, students, staff }) => {
  const [lang, setLang] = useState<'en' | 'gu'>('en');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const todayDateKey = React.useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Restore today's custom photos from local storage
  const [customPhotos, setCustomPhotos] = useState<Record<string, string>>(() => {
    try {
      if (typeof window !== 'undefined' && school?.id) {
        const stored = localStorage.getItem(`vidyalayam_bday_photos_${school.id}_${todayDateKey}`);
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return {};
  });

  // Restore today's edited custom wishes from local storage
  const [customWishes, setCustomWishes] = useState<Record<string, string>>(() => {
    try {
      if (typeof window !== 'undefined' && school?.id) {
        const stored = localStorage.getItem(`vidyalayam_bday_wishes_${school.id}_${todayDateKey}`);
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return {};
  });

  // Automatically delete past days' temporary birthday photos and wishes (strictly 1-day life)
  useEffect(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('vidyalayam_bday_photos_') || key.startsWith('vidyalayam_bday_wishes_'))) {
          if (!key.endsWith(todayDateKey)) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch {}
  }, [todayDateKey]);

  // Persist custom photos for today
  useEffect(() => {
    try {
      if (school?.id && Object.keys(customPhotos).length > 0) {
        localStorage.setItem(`vidyalayam_bday_photos_${school.id}_${todayDateKey}`, JSON.stringify(customPhotos));
      }
    } catch {}
  }, [customPhotos, school?.id, todayDateKey]);

  // Persist custom wishes for today
  useEffect(() => {
    try {
      if (school?.id && Object.keys(customWishes).length > 0) {
        localStorage.setItem(`vidyalayam_bday_wishes_${school.id}_${todayDateKey}`, JSON.stringify(customWishes));
      }
    } catch {}
  }, [customWishes, school?.id, todayDateKey]);

  const [isGeneratingAllPdf, setIsGeneratingAllPdf] = useState(false);
  const [showAssemblyModal, setShowAssemblyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Hidden container for multi-card batch PDF generation
  const batchContainerRef = useRef<HTMLDivElement>(null);

  // Trigger automated notification dispatch for today's birthdays on load
  useEffect(() => {
    if (school && school.id) {
      checkAndDispatchBirthdayNotification(school, students, staff).catch(() => {});
    }
  }, [school, students, staff]);

  // Compute Today's and Upcoming Birthdays
  const todayBirthdays = React.useMemo(() => {
    const list = getTodayBirthdays(students, staff, new Date(), lang);
    return list.map((p) => ({
      ...p,
      customPhotoUrl: customPhotos[p.id] || p.customPhotoUrl,
      wish: customWishes[p.id] || p.wish,
    }));
  }, [students, staff, lang, customPhotos, customWishes]);

  const upcomingBirthdays = React.useMemo(() => {
    return getUpcomingBirthdays(students, staff, 5, new Date(), lang);
  }, [students, staff, lang]);

  // Set default selected person to the first one in today's birthdays or upcoming
  useEffect(() => {
    if (todayBirthdays.length > 0 && !selectedPersonId) {
      setSelectedPersonId(todayBirthdays[0].id);
    } else if (todayBirthdays.length === 0 && upcomingBirthdays.length > 0 && !selectedPersonId) {
      setSelectedPersonId(upcomingBirthdays[0].id);
    }
  }, [todayBirthdays, upcomingBirthdays, selectedPersonId]);

  // Handle custom photo change
  const handleCustomPhotoChange = (personId: string, photoDataUrl: string) => {
    setCustomPhotos((prev) => {
      const updated = { ...prev };
      if (!photoDataUrl) {
        delete updated[personId];
      } else {
        updated[personId] = photoDataUrl;
      }
      return updated;
    });

    // Also save to server for 1-day retention if online
    if (photoDataUrl) {
      try {
        fetch('/api/birthday/temp-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: school.id,
            personId,
            photoDataUrl,
          }),
        }).catch(() => {});
      } catch {}
    }
  };

  // Handle wish text change
  const handleWishChange = (personId: string, newWish: string) => {
    setCustomWishes((prev) => ({ ...prev, [personId]: newWish }));
  };

  // Find currently active person for single preview
  const activePerson = React.useMemo(() => {
    return (
      todayBirthdays.find((p) => p.id === selectedPersonId) ||
      upcomingBirthdays.find((p) => p.id === selectedPersonId) ||
      todayBirthdays[0] ||
      upcomingBirthdays[0] ||
      null
    );
  }, [selectedPersonId, todayBirthdays, upcomingBirthdays]);

  // Batch Export: Download All Today's Cards in a Single Multi-Page PDF (Exact A4 300 DPI)
  const handleDownloadAllCardsInOnePdf = async () => {
    if (todayBirthdays.length === 0 || isGeneratingAllPdf) return;
    setIsGeneratingAllPdf(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < todayBirthdays.length; i++) {
        const person = todayBirthdays[i];
        const cardElement = document.getElementById(`batch_card_${person.id}`);
        if (!cardElement) continue;

        const canvas = await html2canvas(cardElement, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#FFFFFF',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.96);
        const margin = 8;
        const targetWidth = pdfWidth - margin * 2;
        const targetHeight = (canvas.height * targetWidth) / canvas.width;

        let renderHeight = targetHeight;
        let renderWidth = targetWidth;
        if (renderHeight > pdfHeight - margin * 2) {
          renderHeight = pdfHeight - margin * 2;
          renderWidth = (canvas.width * renderHeight) / canvas.height;
        }

        const x = (pdfWidth - renderWidth) / 2;
        const y = (pdfHeight - renderHeight) / 2;

        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', x, y, renderWidth, renderHeight, undefined, 'FAST');
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const schoolClean = (school.schoolName || 'School').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`All_Birthday_Cards_${schoolClean}_${todayStr}_A4.pdf`);
    } catch (err) {
      console.error('Error generating consolidated birthday PDF:', err);
    } finally {
      setIsGeneratingAllPdf(false);
    }
  };

  // WhatsApp Broadcast for All Today's Birthdays
  const handleShareAllWhatsApp = () => {
    if (todayBirthdays.length === 0) return;
    const schoolName = school.schoolName || 'શાળા';
    let text = '';
    if (lang === 'gu') {
      text = `🎉 *શાળા પરિવાર તરફથી આજના જન્મદિનની હાર્દિક શુભકામનાઓ!* 🎂\n\n`;
      text += `શ્રી ${schoolName} પરિવાર તરફથી આજના તમામ જન્મદિવસ મુબારક:\n\n`;
      todayBirthdays.forEach((p, idx) => {
        text += `${idx + 1}. *${p.name}* ${
          p.standard ? `(ધોરણ ${p.standard})` : p.designation ? `(${p.designation})` : ''
        }\n   ✨ "${p.wish}"\n\n`;
      });
      text += `💐 *શુભેચ્છક:* ${schoolName} પરિવાર\n(આચાર્યશ્રી તથા સમસ્ત સ્ટાફ પરિવાર)`;
    } else {
      text = `🎉 *HAPPY BIRTHDAY FROM THE SCHOOL FAMILY!* 🎂\n\n`;
      text += `Warm birthday wishes from the ${schoolName} Family:\n\n`;
      todayBirthdays.forEach((p, idx) => {
        text += `${idx + 1}. *${p.name}* ${
          p.standard ? `(Class ${p.standard})` : p.designation ? `(${p.designation})` : ''
        }\n   ✨ "${p.wish}"\n\n`;
      });
      text += `💐 *With Warm Compliments:* ${schoolName} Family\n(Principal, Teachers & Entire School Staff)`;
    }

    if (navigator.share) {
      navigator.share({ title: `Today's Birthdays - ${schoolName}`, text }).catch(() => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
      });
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 opacity-15 pointer-events-none flex items-center pr-6">
          <PartyPopper className="w-64 h-64" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>વિદ્યાલયમ બર્થડે સેલિબ્રેશન હબ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              🎂 જન્મદિવસ શુભકામના & કાર્ડ કેન્દ્ર
            </h1>
            <p className="text-white/90 text-xs sm:text-sm max-w-xl leading-relaxed">
              વિદ્યાર્થીઓ અને સ્ટાફના જન્મદિવસ પર સુંદર શુભેચ્છા કાર્ડ ઓટો-જનરેટ કરો, કસ્ટમ ફોટો અપલોડ કરો, એક ક્લિકમાં PDF ડાઉનલોડ કરો અને WhatsApp ગ્રૂપમાં શેર કરો.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {todayBirthdays.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadAllCardsInOnePdf}
                  disabled={isGeneratingAllPdf}
                  className="px-4 py-2.5 rounded-2xl bg-white text-rose-600 hover:bg-rose-50 text-xs font-bold shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title="બધા વિદ્યાર્થીઓના કાર્ડ એક જ સળંગ PDF માં ડાઉનલોડ કરો"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingAllPdf ? 'PDF બની રહ્યું છે...' : 'બધા કાર્ડ એક જ PDF માં'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareAllWhatsApp}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>બધા માટે WhatsApp લિસ્ટ</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowAssemblyModal(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              title="પ્રાર્થના સભામાં વાંચવા માટેનું લિસ્ટ"
            >
              <Printer className="w-4 h-4" />
              <span>પ્રાર્થના સભા સ્લિપ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left side Active Card, Right side Selector & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: The Interactive Birthday Card Preview (Lg: 7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {activePerson ? (
            <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              {/* Person Switcher Pill Tabs if multiple today */}
              {todayBirthdays.length > 1 && (
                <div className="w-full max-w-[500px] mb-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    આજના જન્મદિવસ ({todayBirthdays.length}):
                  </span>
                  {todayBirthdays.map((p) => {
                    const isSelected = selectedPersonId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPersonId(p.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        }`}
                      >
                        <span>{p.name.split(' ')[0]}</span>
                        {p.standard && <span className="text-[10px] opacity-80">(ધો. {p.standard})</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Render Selected Birthday Card */}
              <BirthdayCard
                key={`${activePerson.id}_${activePerson.wishIndex}_${lang}`}
                person={activePerson}
                school={school}
                staffList={staff}
                onCustomPhotoChange={handleCustomPhotoChange}
                onWishChange={handleWishChange}
                lang={lang}
                onLangToggle={() => setLang(lang === 'en' ? 'gu' : 'en')}
              />
            </div>
          ) : (
            <div className="w-full p-12 text-center rounded-3xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/20 text-pink-500 flex items-center justify-center mx-auto">
                <Cake className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                આજે કોઈ વિદ્યાર્થી કે સ્ટાફનો જન્મદિવસ નથી
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                આજના દિવસે શાળામાં કોઈનો જન્મદિવસ નોંધાયેલ નથી. જમણી બાજુ આગામી ૫ દિવસમાં આવતા જન્મદિવસો તપાસો અને તેમના માટે અગાઉથી કાર્ડ તૈયાર કરી શકો છો!
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Today's List + Next 5 Days Upcoming (Lg: 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 1: Today's Birthdays List */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <Cake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    આજના જન્મદિવસ ({todayBirthdays.length})
                  </h3>
                  <p className="text-[10px] text-slate-500">આજે ઉજવણી કરવા યોગ્ય સભ્યો</p>
                </div>
              </div>

              {todayBirthdays.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 animate-pulse">
                  આજે લાઈવ 🎉
                </span>
              )}
            </div>

            {todayBirthdays.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                આજે કોઈ જન્મદિવસ નથી.
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {todayBirthdays.map((p) => {
                  const isSelected = selectedPersonId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPersonId(p.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/40 ring-1 ring-rose-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-white dark:border-white/20 shadow-xs">
                          {p.photoUrl || customPhotos[p.id] ? (
                            <img
                              src={customPhotos[p.id] || p.photoUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-rose-100 text-rose-600 font-bold text-xs">
                              {p.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {p.name}
                          </h4>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                            {p.standard && <span>ધોરણ {p.standard}</span>}
                            {p.designation && <span>{p.designation}</span>}
                            {p.age && <span>• {p.age} વર્ષ પૂર્ણ</span>}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500 text-white">
                          કાર્ડ જુઓ
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Next 5 Days Upcoming Birthdays */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    આગામી ૫ દિવસના જન્મદિવસ ({upcomingBirthdays.length})
                  </h3>
                  <p className="text-[10px] text-slate-500">અગાઉથી તૈયારી અને આયોજન માટે</p>
                </div>
              </div>
            </div>

            {upcomingBirthdays.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                આગામી ૫ દિવસમાં કોઈ જન્મદિવસ નથી.
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {upcomingBirthdays.map((p) => {
                  const isSelected = selectedPersonId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPersonId(p.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/40 ring-1 ring-amber-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-white dark:border-white/20 shadow-xs">
                          {p.photoUrl || customPhotos[p.id] ? (
                            <img
                              src={customPhotos[p.id] || p.photoUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-amber-100 text-amber-700 font-bold text-xs">
                              {p.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {p.name}
                          </h4>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                            <span>{p.formattedDob}</span>
                            {p.standard && <span>• ધોરણ {p.standard}</span>}
                            {p.designation && <span>• {p.designation}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            p.daysUntil === 1
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {p.relativeLabel}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Batch Container for Rendering all Cards into Multi-page PDF */}
      <div
        ref={batchContainerRef}
        style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}
      >
        {todayBirthdays.map((person) => (
          <div key={`batch_wrap_${person.id}`} id={`batch_card_${person.id}`} style={{ width: '480px' }}>
            <BirthdayCard
              person={person}
              school={school}
              staffList={staff}
              lang={lang}
            />
          </div>
        ))}
      </div>

      {/* Morning Assembly Announcement Slip Modal */}
      {showAssemblyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  પ્રાર્થના સભા ઘોષણા સ્લિપ (Morning Assembly Slip)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAssemblyModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕ બંધ કરો
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="font-bold text-center border-b border-amber-200 dark:border-amber-500/20 pb-2">
                {school.schoolName} • દૈનિક પ્રાર્થના સભા અભિનંદન
              </div>
              <div className="text-[11px] text-center text-slate-600 dark:text-slate-400">
                તારીખ: {new Date().toLocaleDateString('gu-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>

              {todayBirthdays.length === 0 ? (
                <div className="py-4 text-center text-slate-500">
                  આજે કોઈ વિદ્યાર્થી કે સ્ટાફનો જન્મદિવસ નથી.
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    નીચે મુજબના વિદ્યાર્થીઓ/સ્ટાફને મંચ પર બોલાવીને હાર્દિક શુભકામના પાઠવો:
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 font-medium">
                    {todayBirthdays.map((p, i) => (
                      <li key={i} className="text-slate-900 dark:text-white font-bold">
                        {p.name} {p.standard ? `- ધોરણ ${p.standard}` : p.designation ? `- ${p.designation}` : ''}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>પ્રિન્ટ સ્લિપ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
