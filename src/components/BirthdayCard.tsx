import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Download,
  Share2,
  RefreshCw,
  Edit3,
  Check,
  User,
  Image as ImageIcon,
  Palette,
  Sparkles,
  Heart,
  Printer,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  BirthdayPerson,
  BIRTHDAY_WISHES_COLLECTION,
  STAFF_BIRTHDAY_WISHES,
  getLocalizedSchoolName,
} from '../services/birthdayService';
import { School, Staff } from '../types';
import { downloadPdfFile, printHtmlDocument } from '../utils/printAndPdfUtils';
import {
  downloadBirthdayCardPdf,
  printBirthdayCard,
  downloadBirthdayCardPng,
  getBalloonBouquetDataUri,
  createPillBadgeDataUri,
} from '../utils/birthdayPdfShareUtils';

export interface CardColorTheme {
  id: string;
  nameGu: string;
  nameEn: string;
  bgGradient: string;
  cardBorder: string;
  sealColor: string;
  sealBorder: string;
  textColor: string;
  titleColor: string;
  subtextColor: string;
  blossomPetals: string[];
  blossomCore: string;
  blossomCoreCenter: string;
  balloonStroke: string;
  balloonFill: string;
  frameBorder: string;
  frameGradient: string;
  regardsBorder: string;
  wishBg: string;
  wishBorder: string;
  badgeBg: string;
  badgeText: string;
}

export const BIRTHDAY_CARD_THEMES: CardColorTheme[] = [
  // 1. Classic Rose Blush & Gold
  {
    id: 'blush_rose',
    nameGu: 'ગુલાબી & રોઝ ગોલ્ડ',
    nameEn: 'Rose Blush & Gold',
    bgGradient: 'linear-gradient(180deg, #FFFDFD 0%, #FFF4F0 35%, #FDEEE9 70%, #FFF5F2 100%)',
    cardBorder: '#2C2727',
    sealColor: '#7C5C56',
    sealBorder: '#D8A798',
    textColor: '#2C2727',
    titleColor: '#2C2727',
    subtextColor: '#725C57',
    blossomPetals: ['#F4B5A5', '#F0A695'],
    blossomCore: '#4B3A35',
    blossomCoreCenter: '#7C5D53',
    balloonStroke: '#2C2727',
    balloonFill: '#FFFFFF',
    frameBorder: '#FFFFFF',
    frameGradient: 'from-[#F2C4B7] via-white to-[#E8B5A7]',
    regardsBorder: '#DFCDC7',
    wishBg: 'rgba(255, 248, 245, 0.85)',
    wishBorder: 'rgba(224, 169, 156, 0.5)',
    badgeBg: '#FBE9DF',
    badgeText: '#C45A2D',
  },
  // 2. Royal Champagne Gold
  {
    id: 'royal_gold',
    nameGu: 'શાહી સુવર્ણ ગોલ્ડ',
    nameEn: 'Royal Champagne Gold',
    bgGradient: 'linear-gradient(180deg, #FFFEFA 0%, #FFFBEF 35%, #FBF1DA 70%, #FDF7E7 100%)',
    cardBorder: '#362B16',
    sealColor: '#7E672E',
    sealBorder: '#DBC482',
    textColor: '#2D2412',
    titleColor: '#241B08',
    subtextColor: '#6D592C',
    blossomPetals: ['#F5DE99', '#E8CA72'],
    blossomCore: '#3E3113',
    blossomCoreCenter: '#7D6523',
    balloonStroke: '#362B16',
    balloonFill: '#FFFFFF',
    frameBorder: '#FFFFFF',
    frameGradient: 'from-[#F0DC9D] via-white to-[#E2C779]',
    regardsBorder: '#E2CF9B',
    wishBg: 'rgba(255, 252, 240, 0.85)',
    wishBorder: 'rgba(219, 196, 130, 0.5)',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
  },
  // 3. Royal Emerald & Sage
  {
    id: 'emerald_sage',
    nameGu: 'રોયલ એમેરાલ્ડ ગ્રીન',
    nameEn: 'Royal Emerald Sage',
    bgGradient: 'linear-gradient(180deg, #FCFFFD 0%, #F1FAF4 35%, #E3F5EA 70%, #EFF9F3 100%)',
    cardBorder: '#153322',
    sealColor: '#46785D',
    sealBorder: '#86BC9E',
    textColor: '#173322',
    titleColor: '#0F2418',
    subtextColor: '#3D6B51',
    blossomPetals: ['#A3DCC0', '#7FC7A2'],
    blossomCore: '#143523',
    blossomCoreCenter: '#2D5E42',
    balloonStroke: '#153322',
    balloonFill: '#FFFFFF',
    frameBorder: '#FFFFFF',
    frameGradient: 'from-[#A1DBC0] via-white to-[#7FC8A3]',
    regardsBorder: '#A6D5BD',
    wishBg: 'rgba(243, 252, 247, 0.85)',
    wishBorder: 'rgba(134, 188, 158, 0.5)',
    badgeBg: '#D1FAE5',
    badgeText: '#065F46',
  },
  // 4. Ocean Sapphire Azure
  {
    id: 'sapphire_azure',
    nameGu: 'શાહી આકાશી વાદળી',
    nameEn: 'Ocean Sapphire Azure',
    bgGradient: 'linear-gradient(180deg, #FBFEFF 0%, #F0F7FD 35%, #E0EFFB 70%, #ECF5FC 100%)',
    cardBorder: '#162842',
    sealColor: '#446E96',
    sealBorder: '#87B4DC',
    textColor: '#16273E',
    titleColor: '#0F1B2D',
    subtextColor: '#3A5F85',
    blossomPetals: ['#A4D0F3', '#7BB8E8'],
    blossomCore: '#152843',
    blossomCoreCenter: '#2E537B',
    balloonStroke: '#162842',
    balloonFill: '#FFFFFF',
    frameBorder: '#FFFFFF',
    frameGradient: 'from-[#A3CEF2] via-white to-[#7FB7E6]',
    regardsBorder: '#A8CCE9',
    wishBg: 'rgba(242, 248, 254, 0.85)',
    wishBorder: 'rgba(135, 180, 220, 0.5)',
    badgeBg: '#DBEAFE',
    badgeText: '#1E40AF',
  },
  // 5. Imperial Lavender Amethyst
  {
    id: 'amethyst_lilac',
    nameGu: 'શાહી લિલાક જાંબલી',
    nameEn: 'Imperial Lavender Lilac',
    bgGradient: 'linear-gradient(180deg, #FEFCFF 0%, #F9F3FD 35%, #EFE1F8 70%, #F7EEFC 100%)',
    cardBorder: '#321A43',
    sealColor: '#6E4487',
    sealBorder: '#BC96D4',
    textColor: '#2E183E',
    titleColor: '#200E2C',
    subtextColor: '#623B7A',
    blossomPetals: ['#D5B3EA', '#BF91DC'],
    blossomCore: '#311742',
    blossomCoreCenter: '#5C2B7B',
    balloonStroke: '#321A43',
    balloonFill: '#FFFFFF',
    frameBorder: '#FFFFFF',
    frameGradient: 'from-[#CFACEC] via-white to-[#B98CD7]',
    regardsBorder: '#CCA8E0',
    wishBg: 'rgba(250, 244, 254, 0.85)',
    wishBorder: 'rgba(188, 150, 212, 0.5)',
    badgeBg: '#F3E8FF',
    badgeText: '#6B21A8',
  },
  // 6. Sunset Peach Coral
  {
    id: 'sunset_coral',
    nameGu: 'સનસેટ પીચ કોરલ',
    nameEn: 'Sunset Peach Coral',
    bgGradient: 'linear-gradient(180deg, #FFFDFB 0%, #FFF4EB 35%, #FDE6D4 70%, #FFF2E5 100%)',
    cardBorder: '#3F2314',
    sealColor: '#8E5632',
    sealBorder: '#E2A379',
    textColor: '#3B2213',
    titleColor: '#2A160A',
    subtextColor: '#7D4E30',
    blossomPetals: ['#F7BD96', '#EF9F6B'],
    blossomCore: '#3D2010',
    blossomCoreCenter: '#80411B',
    balloonStroke: '#3F2314',
    balloonFill: '#FFFFFF',
    frameBorder: '#FFFFFF',
    frameGradient: 'from-[#F6BD98] via-white to-[#E99E6E]',
    regardsBorder: '#E7BA99',
    wishBg: 'rgba(255, 249, 243, 0.85)',
    wishBorder: 'rgba(226, 163, 121, 0.5)',
    badgeBg: '#FFEDD5',
    badgeText: '#9A3412',
  },
];

interface BirthdayCardProps {
  person: BirthdayPerson;
  school: School;
  staffList?: Staff[];
  onCustomPhotoChange?: (personId: string, photoDataUrl: string) => void;
  onWishChange?: (personId: string, newWish: string) => void;
  lang?: 'en' | 'gu';
  onLangToggle?: () => void;
}

export const BirthdayCard: React.FC<BirthdayCardProps> = ({
  person,
  school,
  staffList = [],
  onCustomPhotoChange,
  onWishChange,
  lang = 'en',
  onLangToggle,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [isEditingWish, setIsEditingWish] = useState(false);
  const [customWishText, setCustomWishText] = useState(person.wish);
  const [photoPreview, setPhotoPreview] = useState<string>(person.customPhotoUrl || person.photoUrl || '');
  const [photoFit, setPhotoFit] = useState<'cover' | 'contain'>('cover');
  const [copySuccess, setCopySuccess] = useState(false);

  // Deterministic color theme based on person ID + optional offset
  const initialThemeIndex = useMemo(() => {
    let hash = 0;
    const str = person.id || person.name || 'default';
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash % BIRTHDAY_CARD_THEMES.length;
  }, [person.id, person.name]);

  const [themeOffset, setThemeOffset] = useState(0);
  const currentTheme = BIRTHDAY_CARD_THEMES[(initialThemeIndex + themeOffset) % BIRTHDAY_CARD_THEMES.length];

  const balloonLeftDataUri = useMemo(() => {
    return getBalloonBouquetDataUri('left', {
      primary: currentTheme.titleColor,
      seal: currentTheme.sealBorder,
      border: currentTheme.cardBorder,
    });
  }, [currentTheme]);

  const balloonRightDataUri = useMemo(() => {
    return getBalloonBouquetDataUri('right', {
      primary: currentTheme.titleColor,
      seal: currentTheme.sealBorder,
      border: currentTheme.cardBorder,
    });
  }, [currentTheme]);

  // Sync state when selected person changes
  useEffect(() => {
    setPhotoPreview(person.customPhotoUrl || person.photoUrl || '');
    setThemeOffset(0);
  }, [person.id, person.customPhotoUrl, person.photoUrl]);

  // Synchronize wish text with selected language whenever lang or person changes
  useEffect(() => {
    const collection = person.type === 'staff' ? STAFF_BIRTHDAY_WISHES : BIRTHDAY_WISHES_COLLECTION;
    const currentWish = collection[person.wishIndex % collection.length];
    if (currentWish) {
      const localizedWish = lang === 'gu' ? currentWish.gu : currentWish.en;
      setCustomWishText(localizedWish);
    }
  }, [lang, person.id, person.wishIndex, person.type]);

  // Handle custom photo upload without any distortion or forced resizing
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preserve exact original image resolution and quality
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPhotoPreview(dataUrl);
        if (onCustomPhotoChange) {
          onCustomPhotoChange(person.id, dataUrl);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset to default photo uploaded in student info
  const handleResetToDefaultPhoto = () => {
    const defaultPhoto = person.photoUrl || '';
    setPhotoPreview(defaultPhoto);
    if (onCustomPhotoChange) {
      onCustomPhotoChange(person.id, '');
    }
  };

  // Cycle to a different wish from the curated library
  const handleCycleWish = () => {
    const collection = person.type === 'staff' ? STAFF_BIRTHDAY_WISHES : BIRTHDAY_WISHES_COLLECTION;
    const nextIndex = (person.wishIndex + 1) % collection.length;
    person.wishIndex = nextIndex;
    const nextText = lang === 'gu' ? collection[nextIndex].gu : collection[nextIndex].en;
    setCustomWishText(nextText);
    if (onWishChange) {
      onWishChange(person.id, nextText);
    }
  };

  // Cycle between 6 luxury color themes
  const handleCycleTheme = () => {
    setThemeOffset((prev) => (prev + 1) % BIRTHDAY_CARD_THEMES.length);
  };

  const handleSaveEditedWish = () => {
    setIsEditingWish(false);
    if (onWishChange) {
      onWishChange(person.id, customWishText);
    }
  };

  // Localized School Names & Locations
  const displaySchoolName = useMemo(() => {
    return getLocalizedSchoolName(school.schoolName, lang);
  }, [school.schoolName, lang]);

  const displayLocation = useMemo(() => {
    const village = school.village ? `${school.village}, ` : '';
    const district = school.district || '';
    if (lang === 'gu') {
      return `${village}${district ? `${district}` : 'ગુજરાત'}`;
    }
    return `${village}${district ? `${district}` : 'Gujarat'}`.toUpperCase();
  }, [school.village, school.district, lang]);

  // Prominent School Family Blessing Line
  const schoolFamilyBlessing = useMemo(() => {
    if (lang === 'gu') {
      return `${school.schoolName || 'શાળા'} પરિવાર`;
    }
    return `${displaySchoolName} Family`;
  }, [school.schoolName, displaySchoolName, lang]);

  // Clean DOB string and standard to eliminate any duplicate prefixes
  const cleanDob = useMemo(() => {
    return (person.formattedDob || '')
      .replace(/^(d\.?o\.?b\.?:?\s*|જન્મ\s*તારીખ:?\s*)+/gi, '')
      .trim();
  }, [person.formattedDob]);

  const rawStandard = useMemo(() => {
    return person.standard ? String(person.standard).replace(/^class\s*/i, '').trim() : '';
  }, [person.standard]);

  const displayDobText = useMemo(() => {
    return lang === 'gu' ? `જન્મ તારીખ: ${cleanDob}` : `D.O.B: ${cleanDob}`;
  }, [lang, cleanDob]);

  const displayStandardText = useMemo(() => {
    return lang === 'gu'
      ? `ધોરણ ${rawStandard}${person.section ? `-${person.section}` : ''}`
      : `Class ${rawStandard}${person.section ? `-${person.section}` : ''}`;
  }, [lang, rawStandard, person.section]);

  const dobBadgeDataUri = useMemo(() => {
    return createPillBadgeDataUri('cake', displayDobText, lang === 'gu');
  }, [displayDobText, lang]);

  const standardBadgeDataUri = useMemo(() => {
    return rawStandard ? createPillBadgeDataUri('grad', displayStandardText, lang === 'gu') : '';
  }, [rawStandard, displayStandardText, lang]);

  const designationBadgeDataUri = useMemo(() => {
    return person.designation ? createPillBadgeDataUri('briefcase', person.designation, lang === 'gu') : '';
  }, [person.designation, lang]);

  // Download Individual Birthday Card as High-Quality A4 Print PDF
  const handleDownloadPdf = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadStatus(lang === 'gu' ? 'A4 PDF બની રહ્યું છે...' : 'Preparing A4 PDF...');

    try {
      const res = await downloadBirthdayCardPdf({
        person,
        school,
        theme: currentTheme,
        customWishText,
        photoUrl: photoPreview,
        photoFit,
        lang,
      });

      if (res.success) {
        setDownloadStatus(lang === 'gu' ? '✅ A4 PDF સફળતાપૂર્વક ડાઉનલોડ થઈ ગઈ!' : '✅ A4 PDF Downloaded!');
      } else {
        setDownloadStatus(lang === 'gu' ? 'PDF બનાવવામાં ક્ષતિ આવી' : 'PDF Error');
      }
      setTimeout(() => setDownloadStatus(null), 3500);
    } catch (err) {
      console.error('Error downloading birthday card PDF:', err);
      setDownloadStatus(lang === 'gu' ? 'PDF બનાવવામાં ક્ષતિ આવી' : 'PDF Error');
      setTimeout(() => setDownloadStatus(null), 3500);
    } finally {
      setIsDownloading(false);
    }
  };

  // Print Birthday Card directly (supports Native Android APK PrintManager + Browser Print)
  const handlePrintCard = async () => {
    if (isPrinting || isDownloading) return;
    setIsPrinting(true);
    setDownloadStatus(lang === 'gu' ? 'પ્રિન્ટ તૈયાર થાય છે...' : 'Preparing Print...');

    try {
      await printBirthdayCard({
        person,
        school,
        theme: currentTheme,
        customWishText,
        photoUrl: photoPreview,
        photoFit,
        lang,
      });
      setDownloadStatus(lang === 'gu' ? '✅ પ્રિન્ટ સંવાદ ખૂલ્યો!' : '✅ Print Ready!');
      setTimeout(() => setDownloadStatus(null), 2500);
    } catch (err) {
      console.error('Error printing birthday card:', err);
      setDownloadStatus(lang === 'gu' ? 'પ્રિન્ટ ક્ષતિ' : 'Print Error');
      setTimeout(() => setDownloadStatus(null), 3000);
    } finally {
      setIsPrinting(false);
    }
  };

  // Download Individual Birthday Card as HD PNG Image
  const handleDownloadImage = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadStatus(lang === 'gu' ? 'ઇમેજ તૈયાર થાય છે...' : 'Preparing Image...');

    try {
      const res = await downloadBirthdayCardPng({
        person,
        school,
        theme: currentTheme,
        customWishText,
        photoUrl: photoPreview,
        photoFit,
        lang,
      });

      if (res.success) {
        setDownloadStatus(lang === 'gu' ? '✅ HD ઇમેજ સેવ થઈ ગઈ!' : '✅ HD Image Saved!');
      }
      setTimeout(() => setDownloadStatus(null), 2500);
    } catch (err) {
      console.error('Error saving birthday card image:', err);
      setDownloadStatus(lang === 'gu' ? 'ઇમેજ સેવ કરવામાં ક્ષતિ' : 'Image Save Error');
      setTimeout(() => setDownloadStatus(null), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  // Share to WhatsApp Group with pre-filled greeting text
  const handleShareWhatsApp = () => {
    const text =
      lang === 'gu'
        ? `🎉 *જન્મદિવસની હાર્દિક શુભકામનાઓ!* 🎂\n\nઆજે ${schoolFamilyBlessing} ના ${
            person.type === 'student' ? 'હોનહાર વિદ્યાર્થી' : 'આદરણીય સ્ટાફ સભ્ય'
          } *${person.name}* ${
            person.standard ? `(ધોરણ ${person.standard})` : person.designation ? `(${person.designation})` : ''
          } નો જન્મદિવસ છે!\n\n✨ *શુભેચ્છા સંદેશ:* "${customWishText}"\n\n💐 *શુભેચ્છક:* ${schoolFamilyBlessing}\n(આચાર્યશ્રી તથા સમસ્ત સ્ટાફ પરિવાર)`
        : `🎉 *HAPPY BIRTHDAY!* 🎂\n\nWishing our bright ${
            person.type === 'student' ? 'student' : 'staff member'
          } *${person.name}* ${
            person.standard ? `(Class ${person.standard})` : person.designation ? `(${person.designation})` : ''
          } a wonderful birthday!\n\n✨ *Message:* "${customWishText}"\n\n💐 *With Warm Compliments:* ${schoolFamilyBlessing}\n(Principal, Teachers & Entire School Staff)`;

    if (navigator.share) {
      navigator
        .share({
          title: `Birthday Wishes - ${person.name}`,
          text,
        })
        .catch(() => {
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
        });
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }

    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="w-full flex flex-col items-center overflow-x-hidden">
      {/* Hidden File Input for Custom Photo */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Action Toolbar above card */}
      <div className="w-full max-w-[480px] mb-3 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-2xl bg-white/95 dark:bg-[#121921] border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Change Color Theme */}
          <button
            type="button"
            onClick={handleCycleTheme}
            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="કાર્ડનો કલર અને થીમ બદલો (૬ રોયલ થીમ્સ)"
          >
            <Palette className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">{lang === 'gu' ? currentTheme.nameGu : currentTheme.nameEn}</span>
            <span className="sm:hidden">{lang === 'gu' ? 'થીમ' : 'Theme'}</span>
          </button>

          {/* Upload Custom Photo */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="કસ્ટમ ફોટો અપલોડ કરો (મૂળ આકાર અને ગુણવત્તા જળવાઈ રહેશે)"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{photoPreview ? (lang === 'gu' ? 'ફોટો બદલો' : 'Change') : (lang === 'gu' ? 'ફોટો' : 'Photo')}</span>
          </button>

          {/* Photo Fit Toggle (No Crop vs Fill Circle) */}
          {photoPreview && (
            <button
              type="button"
              onClick={() => setPhotoFit(photoFit === 'cover' ? 'contain' : 'cover')}
              className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-[11px] font-semibold transition-colors cursor-pointer"
              title={photoFit === 'cover' ? 'મૂળ આકાર રાખો (No crop)' : 'વર્તુળ ભરો (Fill circle)'}
            >
              {photoFit === 'cover' ? (lang === 'gu' ? 'મૂળ આકાર' : 'Original') : (lang === 'gu' ? 'વર્તુળ ભરો' : 'Fill')}
            </button>
          )}

          {/* Reset to Default Info Photo */}
          {person.customPhotoUrl && person.photoUrl && (
            <button
              type="button"
              onClick={handleResetToDefaultPhoto}
              className="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
              title="વિદ્યાર્થી માહિતીમાં રહેલો મૂળ ડિફોલ્ટ ફોટો વાપરો"
            >
              {lang === 'gu' ? 'ડિફોલ્ટ' : 'Default'}
            </button>
          )}

          {/* Cycle Wish */}
          <button
            type="button"
            onClick={handleCycleWish}
            className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="બીજી સુંદર શુભેચ્છા પસંદ કરો"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'gu' ? 'શુભેચ્છા' : 'Wish'}</span>
          </button>

          {/* Edit Wish */}
          <button
            type="button"
            onClick={() => setIsEditingWish(!isEditingWish)}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            title="સંદેશ એડિટ કરો"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Language Toggle: English <-> Gujarati */}
          {onLangToggle && (
            <button
              type="button"
              onClick={onLangToggle}
              className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              {lang === 'en' ? 'ગુજરાતી' : 'English'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* WhatsApp Share */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="વોટ્સએપ ગ્રૂપમાં શેર કરો"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copySuccess ? (lang === 'gu' ? 'શેર થયું!' : 'Shared!') : 'WhatsApp'}</span>
          </button>

          {/* HD PNG Download */}
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            title="HD ઇમેજ (PNG) સેવ કરો"
          >
            <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </button>

          {/* A4 Print PDF Download */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-[#C45A2D] hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="સંપૂર્ણ A4 પ્રિન્ટ PDF ડાઉનલોડ કરો"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? (lang === 'gu' ? 'તૈયાર થાય છે...' : 'Saving...') : 'A4 PDF'}</span>
          </button>

          {/* Direct Print Card Button */}
          <button
            type="button"
            onClick={handlePrintCard}
            disabled={isPrinting || isDownloading}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="કાર્ડ સીધું પ્રિન્ટ કરો (A4 Print)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isPrinting ? (lang === 'gu' ? 'પ્રિન્ટ...' : 'Printing...') : (lang === 'gu' ? 'પ્રિન્ટ' : 'Print')}</span>
          </button>
        </div>
      </div>

      {/* Download / Print Progress Toast */}
      {downloadStatus && (
        <div className="w-full max-w-[480px] mb-2 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-center text-xs font-bold text-amber-800 dark:text-amber-200 animate-in fade-in duration-150">
          {downloadStatus}
        </div>
      )}

      {/* Inline Wish Editor */}
      {isEditingWish && (
        <div className="w-full max-w-[480px] mb-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 shadow-md space-y-2 animate-in fade-in">
          <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <span>{lang === 'gu' ? 'શુભેચ્છા સંદેશ સંપાદિત કરો:' : 'Edit Birthday Wish:'}</span>
            <span className="text-[10px] text-amber-700 dark:text-amber-300">
              {lang === 'gu' ? 'તમારા મનપસંદ શબ્દો લખો' : 'Customize card message'}
            </span>
          </div>
          <textarea
            value={customWishText}
            onChange={(e) => setCustomWishText(e.target.value)}
            rows={3}
            className="w-full p-2.5 rounded-xl bg-white dark:bg-[#121921] border border-amber-300 dark:border-amber-500/40 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingWish(false)}
              className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              {lang === 'gu' ? 'રદ કરો' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSaveEditedWish}
              className="px-4 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{lang === 'gu' ? 'સાચવો' : 'Save'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* THE BIRTHDAY CARD CANVAS                                                  */}
      {/* 100% Responsive, Perfectly Centered on Mobile, Exact A4 Aspect Ratio      */}
      {/* ========================================================================= */}
      <div className="w-full max-w-[440px] px-2 sm:px-0 flex flex-col items-center mx-auto">
        {/* Mobile-Friendly A4 Print Preview Pill */}
        <div className="w-full mb-2.5 px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
          <span className="font-extrabold flex items-center gap-1.5 text-[11px] sm:text-xs">
            <span>📄</span>
            <span>{lang === 'gu' ? 'A4 રોયલ કાર્ડ પ્રીવ્યૂ' : 'Royal A4 Card Preview'}</span>
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
            {lang === 'gu' ? 'પ્રિન્ટ અને પીડીએફ રેડી' : 'Print & PDF Ready'}
          </span>
        </div>

        <div
          ref={cardRef}
          style={{
            background: currentTheme.bgGradient,
            borderColor: currentTheme.cardBorder,
            color: currentTheme.textColor,
          }}
          className="relative w-full aspect-[210/297] overflow-hidden rounded-[20px] sm:rounded-[24px] border-[3.5px] sm:border-[4px] shadow-2xl p-3 sm:p-5 flex flex-col justify-between select-none mx-auto transition-colors duration-300"
        >
          {/* 1. Middle Royal Gold Inset Accent Line */}
          <div
            className="absolute inset-[6px] sm:inset-[8px] rounded-[15px] sm:rounded-[18px] border-[1.5px] sm:border-[2px] border-[#D4AF37] pointer-events-none z-10"
          />

          {/* 2. Inner Royal Hairline Frame */}
          <div
            className="absolute inset-[10px] sm:inset-[12px] rounded-[11px] sm:rounded-[14px] border border-[#D4AF37]/50 pointer-events-none z-10"
          />

          {/* 3. 4 Symmetrical Pure CSS Royal Gold Corner Diamond Accents */}
          <div className="absolute top-[8px] left-[8px] w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#D4AF37] rotate-45 pointer-events-none z-20" />
          <div className="absolute top-[8px] right-[8px] w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#D4AF37] rotate-45 pointer-events-none z-20" />
          <div className="absolute bottom-[8px] right-[8px] w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#D4AF37] rotate-45 pointer-events-none z-20" />
          <div className="absolute bottom-[8px] left-[8px] w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#D4AF37] rotate-45 pointer-events-none z-20" />

          {/* Left Festive Balloon Bouquet (100% Guaranteed Image Render) */}
          <img
            src={balloonLeftDataUri}
            alt="Left Balloons"
            className="absolute top-[21%] sm:top-[22%] left-1 sm:left-2 pointer-events-none z-10 w-[62px] sm:w-[84px] h-auto opacity-95"
          />

          {/* Right Festive Balloon Bouquet (100% Guaranteed Image Render) */}
          <img
            src={balloonRightDataUri}
            alt="Right Balloons"
            className="absolute top-[21%] sm:top-[22%] right-1 sm:right-2 pointer-events-none z-10 w-[62px] sm:w-[84px] h-auto opacity-95"
          />

          {/* Top Header: School Name & Insignia */}
          <div className="relative z-10 w-full text-center pt-1.5 px-3">
            {/* Top Royal Crest Insignia */}
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <span className="text-[#D4AF37] text-[10px]">✦</span>
              <span className="text-[#D4AF37] text-xs font-bold">⚜</span>
              <span className="text-[#D4AF37] text-[10px]">✦</span>
            </div>

            <h2
              style={{
                fontFamily: lang === 'gu' ? "'Anek Gujarati', Georgia, serif" : 'Georgia, serif',
                letterSpacing: lang === 'gu' ? '0.01em' : '0.025em',
                color: currentTheme.titleColor,
              }}
              className="text-[13.5px] sm:text-[16px] font-black uppercase leading-snug drop-shadow-2xs max-w-[90%] mx-auto break-words text-center"
            >
              {displaySchoolName}
            </h2>
            {displayLocation && (
              <p
                style={{ color: currentTheme.subtextColor }}
                className="text-[9px] sm:text-[10.5px] font-extrabold tracking-widest uppercase mt-0.5 opacity-90 text-center"
              >
                {displayLocation}
              </p>
            )}

            {/* Ornamental Gold Divider */}
            <div
              className="w-32 sm:w-44 h-[1px] mx-auto mt-1"
              style={{ background: 'linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%)' }}
            />
          </div>

          {/* Happy Birthday Heading */}
          <div className="relative z-10 w-full text-center my-0.5 px-2">
            {lang === 'en' ? (
              <>
                <div
                  style={{ color: currentTheme.subtextColor }}
                  className="text-[11px] sm:text-[12.5px] font-extrabold tracking-[0.25em] uppercase leading-none opacity-85 text-center"
                >
                  ✦ happy ✦
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    lineHeight: '0.95',
                    color: currentTheme.titleColor,
                  }}
                  className="text-[34px] sm:text-[42px] font-bold italic tracking-tight drop-shadow-xs mt-0.5 text-center"
                >
                  Birthday
                </div>
              </>
            ) : (
              <>
                <div
                  style={{ color: currentTheme.subtextColor }}
                  className="text-[10.5px] sm:text-[12px] font-extrabold tracking-widest uppercase leading-none opacity-90 text-center"
                >
                  ✦ જન્મદિવસની ✦
                </div>
                <div
                  style={{
                    fontFamily: "'Anek Gujarati', Georgia, serif",
                    lineHeight: '1.15',
                    color: currentTheme.titleColor,
                  }}
                  className="text-[23px] sm:text-[28px] font-black tracking-tight drop-shadow-xs mt-0.5 text-center"
                >
                  હાર્દિક શુભકામનાઓ
                </div>
              </>
            )}
          </div>

          {/* Center Visual: Grand Proportional Round Portrait with Multi-layer Gold Rim */}
          <div className="relative z-10 flex items-center justify-center my-auto py-1">
            <div
              className="relative w-[165px] h-[165px] sm:w-[195px] sm:h-[195px] aspect-square shrink-0 rounded-full p-1.5 sm:p-2 bg-gradient-to-tr from-[#FFE8A3] via-[#D4AF37] to-[#AA7C11] shadow-xl z-20 flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-white border-[3px] sm:border-[4px] border-white shadow-inner flex items-center justify-center">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={person.name}
                    crossOrigin="anonymous"
                    className={`w-full h-full rounded-full aspect-square ${
                      photoFit === 'contain' ? 'object-contain bg-white p-1' : 'object-cover'
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-[#D4AF37]">
                    <span className="text-4xl sm:text-5xl font-black">
                      {person.name ? person.name.charAt(0) : '★'}
                    </span>
                  </div>
                )}
              </div>

              {/* Star Medallion Badge - Centered via CSS */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-[#FFE8A3] via-[#D4AF37] to-[#AA7C11] text-white flex items-center justify-center text-[11px] sm:text-xs font-bold border-1.5 border-white shadow-xs z-30">
                ★
              </div>
            </div>
          </div>

          {/* Student / Staff Name & Details (Verified Centered Badges) */}
          <div className="relative z-10 w-full text-center my-1 px-2">
            <h3
              style={{
                fontFamily: lang === 'gu' ? "'Anek Gujarati', Georgia, serif" : "'Playfair Display', Georgia, serif",
                letterSpacing: '0.01em',
                color: currentTheme.titleColor,
              }}
              className="text-[17px] sm:text-[21px] font-black leading-tight break-words max-w-full mx-auto text-center uppercase mb-1.5"
            >
              {person.name}
            </h3>

            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap text-center my-1.5">
              <img
                src={dobBadgeDataUri}
                alt={displayDobText}
                className="h-7 sm:h-8 w-auto inline-block shadow-sm rounded-full pointer-events-none"
              />
              {standardBadgeDataUri && (
                <img
                  src={standardBadgeDataUri}
                  alt={displayStandardText}
                  className="h-7 sm:h-8 w-auto inline-block shadow-sm rounded-full pointer-events-none"
                />
              )}
              {designationBadgeDataUri && (
                <img
                  src={designationBadgeDataUri}
                  alt={person.designation}
                  className="h-7 sm:h-8 w-auto inline-block shadow-sm rounded-full pointer-events-none"
                />
              )}
            </div>
          </div>

          {/* Sincere Birthday Wish Message (Professional Serif Typography) */}
          <div className="relative z-10 w-full text-center px-1 sm:px-2 my-auto">
            <div
              style={{
                background: currentTheme.wishBg || 'rgba(255, 255, 255, 0.95)',
                borderColor: '#D4AF37',
              }}
              className="p-3 sm:p-3.5 rounded-2xl border-[1.8px] shadow-sm max-w-full mx-auto"
            >
              {/* Ribbon Header with Centered Flourish */}
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <div className="w-6 sm:w-10 h-[1.5px] bg-gradient-to-r from-transparent to-[#D4AF37]" />
                <span className="text-[9.5px] sm:text-[11px] font-black tracking-widest uppercase text-amber-800 dark:text-amber-300">
                  ✦ {lang === 'gu' ? 'જન્મદિવસ શુભકામના સંદેશ' : 'HEARTFELT BIRTHDAY WISHES'} ✦
                </span>
                <div className="w-6 sm:w-10 h-[1.5px] bg-gradient-to-l from-transparent to-[#D4AF37]" />
              </div>

              <p
                style={{
                  fontFamily: lang === 'gu' ? "'Anek Gujarati', sans-serif" : "'Playfair Display', Georgia, serif",
                  lineHeight: '1.5',
                  color: currentTheme.textColor,
                }}
                className={`text-[12.5px] sm:text-[14px] ${lang === 'en' ? 'italic font-medium' : 'font-bold'} tracking-normal text-center`}
              >
                <span className="text-[#D4AF37] font-black mr-1 text-sm sm:text-base not-italic">“</span>
                {customWishText}
                <span className="text-[#D4AF37] font-black ml-1 text-sm sm:text-base not-italic">”</span>
              </p>
            </div>
          </div>

          {/* Footer: Prominent School Family Blessing */}
          <div
            style={{ borderColor: '#D4AF37' }}
            className="relative z-10 pt-1.5 border-t w-full text-center px-2 pb-0.5"
          >
            <div
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: currentTheme.subtextColor }}
              className="text-[10px] sm:text-[11px] font-bold italic mb-0.5 opacity-90 text-center"
            >
              {lang === 'gu' ? 'શુભેચ્છક:' : 'With Warm Compliments:'}
            </div>

            <div
              style={{ color: currentTheme.titleColor }}
              className="text-[12.5px] sm:text-[14.5px] font-black tracking-tight leading-snug drop-shadow-2xs text-center max-w-full mx-auto break-words"
            >
              {schoolFamilyBlessing}
            </div>

            <div
              style={{ color: currentTheme.subtextColor }}
              className="text-[8.5px] sm:text-[9.5px] font-bold opacity-80 mt-0.5 text-center"
            >
              {lang === 'gu'
                ? 'આચાર્યશ્રી, શિક્ષકગણ તથા સમસ્ત સ્ટાફ પરિવાર'
                : 'Principal, Teachers & Entire School Staff'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
