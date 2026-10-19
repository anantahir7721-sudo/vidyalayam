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

  // Download Individual Birthday Card as High-Quality A4 Print PDF
  const handleDownloadPdf = async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    setDownloadStatus(lang === 'gu' ? 'PDF બની રહ્યું છે...' : 'Preparing PDF...');

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // Stable 300 DPI on A4 without crashing Android mobile RAM
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Standard A4 aspect ratio with 8mm margins
      const margin = 8;
      const targetWidth = pdfWidth - margin * 2;
      const targetHeight = (canvas.height * targetWidth) / canvas.width;

      let renderWidth = targetWidth;
      let renderHeight = targetHeight;
      if (renderHeight > pdfHeight - margin * 2) {
        renderHeight = pdfHeight - margin * 2;
        renderWidth = (canvas.width * renderHeight) / canvas.height;
      }

      const x = (pdfWidth - renderWidth) / 2;
      const y = (pdfHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'JPEG', x, y, renderWidth, renderHeight, undefined, 'FAST');
      const cleanName = person.name.replace(/[^a-zA-Z0-9]/g, '_') || 'Student';
      const filename = `Birthday_Card_${cleanName}_A4.pdf`;

      // Convert to Blob and download via Vidyalayam unified downloader (Native Android APK + Web)
      const pdfBlob = pdf.output('blob');
      await downloadPdfFile(pdfBlob, filename);
      setDownloadStatus(lang === 'gu' ? 'PDF ડાઉનલોડ સફળ!' : 'PDF Downloaded!');
      setTimeout(() => setDownloadStatus(null), 2500);
    } catch (err) {
      console.error('Error downloading birthday card PDF:', err);
      setDownloadStatus(lang === 'gu' ? 'PDF બનાવવામાં ક્ષતિ આવી' : 'PDF Error');
      setTimeout(() => setDownloadStatus(null), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  // Print Birthday Card directly (supports Native Android APK PrintManager + Browser Print)
  const handlePrintCard = async () => {
    if (!cardRef.current || isPrinting) return;
    setIsPrinting(true);
    setDownloadStatus(lang === 'gu' ? 'પ્રિન્ટ તૈયાર થાય છે...' : 'Preparing Print...');

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const cleanName = person.name.replace(/[^a-zA-Z0-9]/g, '_') || 'Student';

      const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${person.name} - Birthday Card</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .print-card-wrapper {
      width: 100%;
      max-width: 194mm;
      height: auto;
      max-height: 280mm;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: auto;
    }
    img {
      max-width: 100%;
      max-height: 278mm;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="print-card-wrapper">
    <img src="${imgData}" alt="Birthday Card" />
  </div>
</body>
</html>
      `;

      printHtmlDocument(printHtml, `Birthday_Card_${cleanName}`);
      setTimeout(() => setDownloadStatus(null), 1500);
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
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const cleanName = person.name.replace(/[^a-zA-Z0-9]/g, '_') || 'Student';
      const link = document.createElement('a');
      link.download = `Birthday_Card_${cleanName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error saving birthday card image:', err);
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
      {/* THE BIRTHDAY CARD CANVAS                                                  */}
      {/* 100% Responsive, Perfectly Centered on Mobile, Exact A4 Aspect Ratio      */}
      {/* ========================================================================= */}
      <div className="w-full max-w-[480px] px-1 sm:px-0 flex justify-center">
        <div
          ref={cardRef}
          style={{
            background: currentTheme.bgGradient,
            borderColor: currentTheme.cardBorder,
            color: currentTheme.textColor,
          }}
          className="relative w-full aspect-[210/297] min-h-[590px] sm:min-h-[665px] overflow-hidden rounded-[24px] sm:rounded-[28px] border-[4px] sm:border-[5px] shadow-2xl p-4 sm:p-6 flex flex-col justify-between select-none mx-auto transition-colors duration-300"
        >
          {/* Subtle Corner Vignette Overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30 mix-blend-multiply"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 15%, rgba(255, 255, 255, 0.7) 0%, transparent 60%),
                                radial-gradient(circle at 10% 85%, rgba(0, 0, 0, 0.05) 0%, transparent 45%),
                                radial-gradient(circle at 90% 85%, rgba(0, 0, 0, 0.05) 0%, transparent 45%)`,
            }}
          />

          {/* Left Decorative Festive Balloon Accent */}
          <div className="absolute top-[320px] left-3 sm:left-5 pointer-events-none opacity-80 z-10">
            <svg width="42" height="88" viewBox="0 0 50 110" fill="none" stroke={currentTheme.balloonStroke} strokeWidth="1.6" strokeLinecap="round">
              <ellipse cx="25" cy="30" rx="18" ry="24" fill={currentTheme.balloonFill} fillOpacity="0.4" />
              <path d="M 23 54 L 27 54 L 25 58 Z" fill={currentTheme.balloonStroke} />
              <path d="M 25 58 Q 28 75 22 88 Q 18 98 24 108" fill="none" />
            </svg>
          </div>

          {/* Right Decorative Festive Balloon Accent */}
          <div className="absolute top-[200px] right-3 sm:right-5 pointer-events-none opacity-80 z-10">
            <svg width="44" height="92" viewBox="0 0 50 110" fill="none" stroke={currentTheme.balloonStroke} strokeWidth="1.6" strokeLinecap="round">
              <ellipse cx="25" cy="30" rx="19" ry="25" fill={currentTheme.balloonFill} fillOpacity="0.4" />
              <path d="M 23 55 L 27 55 L 25 59 Z" fill={currentTheme.balloonStroke} />
              <path d="M 25 59 Q 20 72 27 86 Q 31 96 26 108" fill="none" />
            </svg>
          </div>

          {/* Top Header: School Name (Guaranteed 100% Horizontally Centered, No Clipping) */}
          <div className="relative z-10 w-full text-center pt-0.5 px-2">
            <h2
              style={{
                fontFamily: lang === 'gu' ? "'Anek Gujarati', Georgia, serif" : 'Georgia, serif',
                letterSpacing: lang === 'gu' ? '0.01em' : '0.025em',
              }}
              className="text-[14px] sm:text-[17px] md:text-[19px] font-black uppercase leading-snug drop-shadow-2xs max-w-full mx-auto break-words text-center"
            >
              {displaySchoolName}
            </h2>
            {displayLocation && (
              <p
                style={{ color: currentTheme.subtextColor }}
                className="text-[10px] sm:text-[11px] font-extrabold tracking-widest uppercase mt-0.5 opacity-90 text-center"
              >
                {displayLocation}
              </p>
            )}
          </div>

          {/* Happy Birthday Heading: Fully Localized in English or Gujarati */}
          <div className="relative z-10 w-full text-center -mt-1 px-2">
            {lang === 'en' ? (
              <>
                <div
                  style={{ color: currentTheme.subtextColor }}
                  className="text-[20px] sm:text-[23px] font-normal tracking-[0.2em] uppercase leading-none opacity-85 text-center"
                >
                  happy
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', 'Brush Script MT', 'Great Vibes', cursive, serif",
                    lineHeight: '0.95',
                    color: currentTheme.titleColor,
                  }}
                  className="text-[48px] sm:text-[56px] font-bold italic tracking-tight drop-shadow-xs mt-0.5 text-center"
                >
                  Birthday
                </div>
              </>
            ) : (
              <>
                <div
                  style={{ color: currentTheme.subtextColor }}
                  className="text-[15px] sm:text-[17px] font-extrabold tracking-widest uppercase leading-none opacity-90 text-center"
                >
                  જન્મદિવસની
                </div>
                <div
                  style={{
                    fontFamily: "'Anek Gujarati', 'Playfair Display', Georgia, serif",
                    lineHeight: '1.15',
                    color: currentTheme.titleColor,
                  }}
                  className="text-[30px] sm:text-[38px] font-black tracking-tight drop-shadow-xs mt-0.5 text-center"
                >
                  હાર્દિક શુભકામનાઓ
                </div>
              </>
            )}
          </div>

          {/* Center Visual: Circular Portrait with Seal & Soft Floral Blossoms */}
          <div className="relative z-10 flex items-center justify-center my-auto py-1">
            {/* Subtle Embossed Circular Seal Ring behind portrait */}
            <div
              className="absolute w-[185px] h-[185px] sm:w-[224px] sm:h-[224px] rounded-full border-[2px] sm:border-[2.5px] flex items-center justify-center pointer-events-none"
              style={{ borderColor: currentTheme.sealBorder, opacity: 0.4 }}
            >
              <div
                className="w-[172px] h-[172px] sm:w-[210px] sm:h-[210px] rounded-full border border-dashed"
                style={{ borderColor: currentTheme.sealBorder }}
              />
              {/* Curved circular seal text */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-70" viewBox="0 0 200 200">
                <path
                  id={`circlePath_${person.id}`}
                  d="M 100, 100 m -75, 0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0"
                  fill="none"
                />
                <text fontSize="10" fontWeight="bold" fill={currentTheme.sealColor} letterSpacing="2.5">
                  <textPath href={`#circlePath_${person.id}`} startOffset="50%" textAnchor="middle">
                    ★ {displaySchoolName?.toUpperCase() || 'VIDYALAYAM SCHOOL'} ★
                  </textPath>
                </text>
              </svg>
            </div>

            {/* Left Floral Blossom Accent */}
            <div className="absolute -left-2 sm:-left-3 pointer-events-none z-20">
              <svg width="68" height="68" viewBox="0 0 100 100" fill="none" className="sm:w-[78px] sm:h-[78px]">
                <circle cx="50" cy="22" r="14" fill={currentTheme.blossomPetals[0]} fillOpacity="0.85" />
                <circle cx="50" cy="78" r="14" fill={currentTheme.blossomPetals[0]} fillOpacity="0.85" />
                <circle cx="22" cy="50" r="14" fill={currentTheme.blossomPetals[0]} fillOpacity="0.85" />
                <circle cx="78" cy="50" r="14" fill={currentTheme.blossomPetals[0]} fillOpacity="0.85" />
                <circle cx="30" cy="30" r="14" fill={currentTheme.blossomPetals[1]} fillOpacity="0.9" />
                <circle cx="70" cy="30" r="14" fill={currentTheme.blossomPetals[1]} fillOpacity="0.9" />
                <circle cx="30" cy="70" r="14" fill={currentTheme.blossomPetals[1]} fillOpacity="0.9" />
                <circle cx="70" cy="70" r="14" fill={currentTheme.blossomPetals[1]} fillOpacity="0.9" />
                <circle cx="50" cy="50" r="11" fill={currentTheme.blossomCore} />
                <circle cx="50" cy="50" r="7" fill={currentTheme.blossomCoreCenter} />
              </svg>
            </div>

            {/* Right Floral Blossom Accent */}
            <div className="absolute -right-2 sm:-right-3 pointer-events-none z-20">
              <svg width="68" height="68" viewBox="0 0 100 100" fill="none" className="sm:w-[78px] sm:h-[78px]">
                <circle cx="50" cy="22" r="14" fill={currentTheme.blossomPetals[0]} fillOpacity="0.85" />
                <circle cx="50" cy="78" r="14" fill={currentTheme.blossomPetals[0]} fillOpacity="0.85" />
                <circle cx="22" cy="50" r="14" fill={currentTheme.blossomPetals[0]} fillOpacity="0.85" />
                <circle cx="78" cy="50" r="14" fill={currentTheme.blossomPetals[0]} fillOpacity="0.85" />
                <circle cx="30" cy="30" r="14" fill={currentTheme.blossomPetals[1]} fillOpacity="0.9" />
                <circle cx="70" cy="30" r="14" fill={currentTheme.blossomPetals[1]} fillOpacity="0.9" />
                <circle cx="30" cy="70" r="14" fill={currentTheme.blossomPetals[1]} fillOpacity="0.9" />
                <circle cx="70" cy="70" r="14" fill={currentTheme.blossomPetals[1]} fillOpacity="0.9" />
                <circle cx="50" cy="50" r="11" fill={currentTheme.blossomCore} />
                <circle cx="50" cy="50" r="7" fill={currentTheme.blossomCoreCenter} />
              </svg>
            </div>

            {/* Central Portrait Photo Frame */}
            <div
              className={`relative w-[136px] h-[136px] sm:w-[162px] sm:h-[162px] rounded-full p-1 sm:p-1.5 bg-gradient-to-b ${currentTheme.frameGradient} shadow-xl z-10 flex items-center justify-center`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-white/90 border-[2px] sm:border-[2.5px] border-white shadow-inner flex items-center justify-center">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={person.name}
                    crossOrigin="anonymous"
                    className={`w-full h-full rounded-full transition-all ${
                      photoFit === 'contain' ? 'object-contain bg-white p-1' : 'object-cover'
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-500">
                    <User className="w-14 h-14 sm:w-16 sm:h-16 stroke-1" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Student / Staff Name & Details (Guaranteed Centered, No Overflow) */}
          <div className="relative z-10 w-full text-center -mt-1 px-2">
            <h3
              style={{
                fontFamily: lang === 'gu' ? "'Anek Gujarati', Georgia, serif" : "'Playfair Display', Georgia, serif",
                letterSpacing: '0.01em',
                color: currentTheme.titleColor,
              }}
              className="text-[20px] sm:text-[23px] font-black leading-tight break-words max-w-full mx-auto text-center"
            >
              {person.name}
            </h3>

            <div
              style={{ color: currentTheme.subtextColor }}
              className="flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] font-bold mt-0.5 opacity-90 flex-wrap text-center"
            >
              <span>{person.formattedDob}</span>
              {person.standard && (
                <>
                  <span>•</span>
                  <span>
                    {lang === 'gu'
                      ? `ધોરણ ${person.standard}${person.section ? `-${person.section}` : ''}`
                      : `Class: ${person.standard}${person.section ? `-${person.section}` : ''}`}
                  </span>
                </>
              )}
              {person.designation && (
                <>
                  <span>•</span>
                  <span>{person.designation}</span>
                </>
              )}
            </div>
          </div>

          {/* Sincere Birthday Wish Message (With themed translucent container) */}
          <div className="relative z-10 w-full text-center px-1 sm:px-3 my-auto">
            <div
              style={{
                background: currentTheme.wishBg,
                borderColor: currentTheme.wishBorder,
              }}
              className="p-2 sm:p-2.5 rounded-2xl border backdrop-blur-xs shadow-2xs max-w-full mx-auto"
            >
              <p
                style={{
                  fontFamily: lang === 'gu' ? "'Anek Gujarati', sans-serif" : 'ui-sans-serif, system-ui, sans-serif',
                  lineHeight: '1.45',
                  color: currentTheme.textColor,
                }}
                className="text-[11.5px] sm:text-[12.5px] font-semibold tracking-normal text-center"
              >
                {customWishText}
              </p>
            </div>
          </div>

          {/* Footer: Prominent School Family Blessing (શુભેચ્છામાં [શાળાનું નામ] પરિવાર) */}
          <div
            style={{ borderColor: currentTheme.regardsBorder }}
            className="relative z-10 pt-2 border-t w-full text-center px-2"
          >
            <div
              style={{ fontFamily: "'Playfair Display', cursive, serif", color: currentTheme.subtextColor }}
              className="text-[12px] sm:text-[13px] font-bold italic mb-0.5 opacity-90 text-center"
            >
              {lang === 'gu' ? 'શુભેચ્છક:' : 'With Warm Compliments:'}
            </div>

            <div
              style={{ color: currentTheme.titleColor }}
              className="text-[13px] sm:text-[15px] font-black tracking-tight leading-snug drop-shadow-2xs text-center max-w-full mx-auto break-words"
            >
              {schoolFamilyBlessing}
            </div>

            <div
              style={{ color: currentTheme.subtextColor }}
              className="text-[10px] sm:text-[11px] font-bold opacity-80 mt-0.5 text-center"
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
