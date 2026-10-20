/**
 * Unified Birthday Card PDF Generation & Printing Utility
 * 
 * Works flawlessly across:
 * 1. Native Android APK (via AndroidBridge JavascriptInterface & PrintManager)
 * 2. Mobile & Desktop Web Browsers (Chrome, Edge, Safari, Firefox)
 * 
 * Guarantees:
 * - Exact 1-Page A4 Portrait Dimensions (794px x 1120px at 96 DPI, 210mm x 297mm)
 * - Safe font rendering (Anek Gujarati + Playfair Display)
 * - Resilient photo loading (converts to base64 or falls back to initials to prevent canvas tainting)
 * - Zero dependency on problematic SVG textPath or CSS mix-blend-mode
 * - Zero scroll displacement bug
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { School } from '../types';
import { BirthdayPerson } from '../services/birthdayService';
import { CardColorTheme, BIRTHDAY_CARD_THEMES } from '../components/BirthdayCard';
import { downloadPdfFile, printHtmlDocument, isAndroidNativeApp } from './printAndPdfUtils';
import { toGujaratiDigits } from '../services/dailyKnowledgeService';

export interface BirthdayCardPrintOptions {
  person: BirthdayPerson;
  school: School;
  theme: CardColorTheme;
  customWishText: string;
  photoUrl?: string;
  photoFit?: 'cover' | 'contain';
  lang?: 'en' | 'gu';
}

const GUJARATI_FONT_STACK =
  "'Anek Gujarati', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/**
 * Ensure Gujarati and serif fonts are preloaded before canvas rendering
 */
async function waitForFontsToRender(): Promise<void> {
  try {
    if (document.fonts) {
      await Promise.allSettled([
        document.fonts.load('400 16px "Anek Gujarati"'),
        document.fonts.load('700 16px "Anek Gujarati"'),
        document.fonts.load('800 16px "Anek Gujarati"'),
        document.fonts.load('900 16px "Anek Gujarati"'),
        document.fonts.load('italic 700 36px "Playfair Display"'),
      ]);
      if (document.fonts.ready) {
        await document.fonts.ready;
      }
    }
  } catch {
    // proceed safely
  }
}

/**
 * Safely converts an image URL to a local DataURL to guarantee
 * html2canvas never fails with CORS or Canvas Tainted error.
 */
async function safeGetImageDataUrl(url?: string): Promise<string | null> {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // If already a DataURL or local blob URL, return directly
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  try {
    // Attempt fetch with CORS
    const response = await fetch(trimmed, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    // If CORS is rejected by browser, return null so we can render clean fallback initials
    return null;
  }
}

/**
 * Standard html2canvas options for pixel-perfect A4 capture
 */
const HTML2CANVAS_BIRTHDAY_OPTIONS = {
  scale: 2, // 300 DPI equivalent on A4
  useCORS: true,
  allowTaint: true,
  logging: false,
  backgroundColor: '#ffffff',
  scrollX: 0,
  scrollY: 0,
  x: 0,
  y: 0,
  width: 794,
  height: 1120,
  windowWidth: 794,
  windowHeight: 1120,
};

/**
 * Constructs clean, high-resolution HTML for the Birthday Card
 * Designed specifically for 794px x 1120px A4 geometry.
 */
function buildBirthdayCardA4Html(
  options: BirthdayCardPrintOptions,
  photoDataUrl: string | null
): string {
  const { person, school, theme, customWishText, photoFit = 'cover', lang = 'gu' } = options;

  const displaySchoolName = school.schoolName || (lang === 'gu' ? 'શ્રી પ્રાથમિક શાળા' : 'Primary School');
  const displayLocation = [school.taluka, school.district].filter(Boolean).join(', ');

  const schoolFamilyBlessing =
    lang === 'gu'
      ? `${school.schoolName || 'શાળા'} પરિવાર`
      : `${displaySchoolName} Family`;

  const detailsLine = [
    person.formattedDob,
    person.standard ? (lang === 'gu' ? `ધોરણ ${person.standard}${person.section ? `-${person.section}` : ''}` : `Class ${person.standard}`) : null,
    person.designation ? person.designation : null,
  ].filter(Boolean).join(' • ');

  const studentInitial = person.name ? person.name.charAt(0).toUpperCase() : '★';

  return `
    <div style="
      width: 794px;
      height: 1120px;
      max-height: 1120px;
      box-sizing: border-box;
      background: ${theme.bgGradient};
      color: ${theme.textColor};
      border: 12px solid ${theme.cardBorder};
      border-radius: 28px;
      padding: 34px 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
      font-family: ${GUJARATI_FONT_STACK};
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    ">
      <!-- Decorative Inner Dashed Border -->
      <div style="
        position: absolute;
        top: 14px;
        left: 14px;
        right: 14px;
        bottom: 14px;
        border: 2px dashed ${theme.sealBorder};
        border-radius: 20px;
        opacity: 0.65;
        pointer-events: none;
      "></div>

      <!-- Left Festive Balloon Accent -->
      <div style="position: absolute; top: 480px; left: 24px; opacity: 0.85; pointer-events: none;">
        <svg width="60" height="120" viewBox="0 0 50 110" fill="none" stroke="${theme.balloonStroke}" stroke-width="2" stroke-linecap="round">
          <ellipse cx="25" cy="30" rx="20" ry="26" fill="${theme.balloonFill}" fill-opacity="0.5" />
          <path d="M 23 56 L 27 56 L 25 60 Z" fill="${theme.balloonStroke}" />
          <path d="M 25 60 Q 28 80 20 95 Q 16 104 22 110" fill="none" />
        </svg>
      </div>

      <!-- Right Festive Balloon Accent -->
      <div style="position: absolute; top: 320px; right: 24px; opacity: 0.85; pointer-events: none;">
        <svg width="60" height="120" viewBox="0 0 50 110" fill="none" stroke="${theme.balloonStroke}" stroke-width="2" stroke-linecap="round">
          <ellipse cx="25" cy="30" rx="20" ry="26" fill="${theme.balloonFill}" fill-opacity="0.5" />
          <path d="M 23 56 L 27 56 L 25 60 Z" fill="${theme.balloonStroke}" />
          <path d="M 25 60 Q 18 78 28 92 Q 32 102 24 110" fill="none" />
        </svg>
      </div>

      <!-- Header: School Name & Location -->
      <div style="text-align: center; width: 100%; position: relative; z-index: 2; padding-top: 6px;">
        <h1 style="
          margin: 0;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          line-height: 1.25;
          color: ${theme.titleColor};
        ">${displaySchoolName}</h1>
        ${displayLocation ? `
          <div style="
            font-size: 13.5px;
            font-weight: 700;
            color: ${theme.subtextColor};
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-top: 4px;
            opacity: 0.95;
          ">${displayLocation}</div>
        ` : ''}
      </div>

      <!-- Birthday Salutation Header -->
      <div style="text-align: center; width: 100%; position: relative; z-index: 2; margin-top: 4px;">
        ${lang === 'en' ? `
          <div style="
            font-size: 22px;
            font-weight: 600;
            letter-spacing: 6px;
            text-transform: uppercase;
            color: ${theme.subtextColor};
            margin-bottom: 2px;
          ">HAPPY</div>
          <div style="
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 72px;
            font-style: italic;
            font-weight: 700;
            line-height: 1;
            color: ${theme.titleColor};
            letter-spacing: -1px;
          ">Birthday</div>
        ` : `
          <div style="
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: ${theme.subtextColor};
            margin-bottom: 2px;
          ">જન્મદિવસની</div>
          <div style="
            font-size: 46px;
            font-weight: 900;
            line-height: 1.15;
            color: ${theme.titleColor};
            letter-spacing: -0.5px;
          ">હાર્દિક શુભકામનાઓ</div>
        `}
      </div>

      <!-- Center Portrait Section -->
      <div style="
        position: relative;
        z-index: 2;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 12px 0;
      ">
        <!-- Circular Medallion Outer Rings -->
        <div style="
          position: absolute;
          width: 270px;
          height: 270px;
          border-radius: 50%;
          border: 3px solid ${theme.sealBorder};
          opacity: 0.45;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 250px;
            height: 250px;
            border-radius: 50%;
            border: 1.5px dashed ${theme.sealBorder};
          "></div>
        </div>

        <!-- Left Floral Blossom -->
        <div style="position: absolute; left: 160px; pointer-events: none; z-index: 4;">
          <svg width="86" height="86" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="22" r="14" fill="${theme.blossomPetals[0]}" fill-opacity="0.9" />
            <circle cx="50" cy="78" r="14" fill="${theme.blossomPetals[0]}" fill-opacity="0.9" />
            <circle cx="22" cy="50" r="14" fill="${theme.blossomPetals[0]}" fill-opacity="0.9" />
            <circle cx="78" cy="50" r="14" fill="${theme.blossomPetals[0]}" fill-opacity="0.9" />
            <circle cx="30" cy="30" r="14" fill="${theme.blossomPetals[1]}" fill-opacity="0.95" />
            <circle cx="70" cy="30" r="14" fill="${theme.blossomPetals[1]}" fill-opacity="0.95" />
            <circle cx="30" cy="70" r="14" fill="${theme.blossomPetals[1]}" fill-opacity="0.95" />
            <circle cx="70" cy="70" r="14" fill="${theme.blossomPetals[1]}" fill-opacity="0.95" />
            <circle cx="50" cy="50" r="12" fill="${theme.blossomCore}" />
            <circle cx="50" cy="50" r="7" fill="${theme.blossomCoreCenter}" />
          </svg>
        </div>

        <!-- Right Floral Blossom -->
        <div style="position: absolute; right: 160px; pointer-events: none; z-index: 4;">
          <svg width="86" height="86" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="22" r="14" fill="${theme.blossomPetals[0]}" fill-opacity="0.9" />
            <circle cx="50" cy="78" r="14" fill="${theme.blossomPetals[0]}" fill-opacity="0.9" />
            <circle cx="22" cy="50" r="14" fill="${theme.blossomPetals[0]}" fill-opacity="0.9" />
            <circle cx="78" cy="50" r="14" fill="${theme.blossomPetals[0]}" fill-opacity="0.9" />
            <circle cx="30" cy="30" r="14" fill="${theme.blossomPetals[1]}" fill-opacity="0.95" />
            <circle cx="70" cy="30" r="14" fill="${theme.blossomPetals[1]}" fill-opacity="0.95" />
            <circle cx="30" cy="70" r="14" fill="${theme.blossomPetals[1]}" fill-opacity="0.95" />
            <circle cx="70" cy="70" r="14" fill="${theme.blossomPetals[1]}" fill-opacity="0.95" />
            <circle cx="50" cy="50" r="12" fill="${theme.blossomCore}" />
            <circle cx="50" cy="50" r="7" fill="${theme.blossomCoreCenter}" />
          </svg>
        </div>

        <!-- Central Portrait Photo -->
        <div style="
          position: relative;
          z-index: 3;
          width: 190px;
          height: 190px;
          border-radius: 50%;
          padding: 6px;
          background: linear-gradient(180deg, #F9E2A8 0%, #FFFFFF 50%, #D8A860 100%);
          box-shadow: 0 10px 25px rgba(0,0,0,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 100%;
            height: 100%;
            border-radius: 50%;
            overflow: hidden;
            background: #ffffff;
            border: 3px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${photoDataUrl ? `
              <img
                src="${photoDataUrl}"
                alt="${person.name}"
                style="
                  width: 100%;
                  height: 100%;
                  border-radius: 50%;
                  object-fit: ${photoFit};
                  display: block;
                "
              />
            ` : `
              <div style="
                width: 100%;
                height: 100%;
                background: #F1F5F9;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #64748B;
              ">
                <span style="font-size: 64px; font-weight: 800; color: ${theme.sealColor};">${studentInitial}</span>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Person Name & Details -->
      <div style="text-align: center; width: 100%; position: relative; z-index: 2;">
        <h2 style="
          margin: 0;
          font-size: 30px;
          font-weight: 900;
          line-height: 1.2;
          color: ${theme.titleColor};
          letter-spacing: 0.2px;
        ">${person.name}</h2>
        <div style="
          font-size: 15px;
          font-weight: 800;
          color: ${theme.subtextColor};
          margin-top: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        ">
          <span>${detailsLine}</span>
        </div>
      </div>

      <!-- Wish Message Box -->
      <div style="
        position: relative;
        z-index: 2;
        width: 100%;
        max-width: 650px;
        background: ${theme.wishBg};
        border: 2px solid ${theme.wishBorder};
        border-radius: 20px;
        padding: 18px 26px;
        box-sizing: border-box;
        text-align: center;
        margin: 10px 0;
      ">
        <p style="
          margin: 0;
          font-size: 15.5px;
          font-weight: 700;
          line-height: 1.6;
          color: ${theme.textColor};
          letter-spacing: 0.2px;
        ">${customWishText}</p>
      </div>

      <!-- Regards & School Family Blessing Footer -->
      <div style="
        position: relative;
        z-index: 2;
        width: 100%;
        text-align: center;
        border-top: 1.5px solid ${theme.regardsBorder};
        padding-top: 14px;
        margin-bottom: 4px;
      ">
        <div style="
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 15px;
          font-style: italic;
          font-weight: 700;
          color: ${theme.subtextColor};
          margin-bottom: 4px;
        ">
          ${lang === 'gu' ? 'શુભેચ્છક:' : 'With Warm Compliments:'}
        </div>

        <div style="
          font-size: 20px;
          font-weight: 900;
          line-height: 1.25;
          color: ${theme.titleColor};
        ">
          ${schoolFamilyBlessing}
        </div>

        <div style="
          font-size: 13.5px;
          font-weight: 700;
          color: ${theme.subtextColor};
          margin-top: 3px;
          opacity: 0.9;
        ">
          ${lang === 'gu' ? 'આચાર્યશ્રી, શિક્ષકગણ તથા સમસ્ત સ્ટાફ પરિવાર' : 'Principal, Teachers & Entire Staff'}
        </div>
      </div>
    </div>
  `;
}

/**
 * Capture an individual Birthday Card into a high-res Canvas
 */
async function renderCardToCanvas(options: BirthdayCardPrintOptions): Promise<HTMLCanvasElement> {
  await waitForFontsToRender();
  const photoDataUrl = await safeGetImageDataUrl(options.photoUrl);

  const container = document.createElement('div');
  container.id = 'vidyalayam_birthday_pdf_container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-99999';
  container.style.pointerEvents = 'none';
  container.style.width = '794px';
  container.style.height = '1120px';
  container.style.overflow = 'hidden';
  container.style.backgroundColor = '#ffffff';

  container.innerHTML = buildBirthdayCardA4Html(options, photoDataUrl);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, HTML2CANVAS_BIRTHDAY_OPTIONS);
    return canvas;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Generate a pristine A4 PDF Blob for a Birthday Card
 */
export async function generateBirthdayCardPdfBlob(
  options: BirthdayCardPrintOptions
): Promise<Blob> {
  const canvas = await renderCardToCanvas(options);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  // Exactly 1 full A4 page, edge-to-edge
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  return pdf.output('blob');
}

/**
 * Download Individual Birthday Card as High-Quality A4 Print PDF
 * 
 * Works across:
 * - Native Android APK: Saves to Downloads/Vidyalayam folder and registers in Android Downloads history
 * - Web Browsers: Standard direct file download
 */
export async function downloadBirthdayCardPdf(
  options: BirthdayCardPrintOptions
): Promise<{ success: boolean; method: string; filename: string }> {
  const cleanName = (options.person.name || 'Student').replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
  const filename = `Birthday_Card_${cleanName}_A4.pdf`;

  const pdfBlob = await generateBirthdayCardPdfBlob(options);
  const result = await downloadPdfFile(pdfBlob, filename);
  return { ...result, filename };
}

/**
 * Print Individual Birthday Card Directly (A4 Print)
 * 
 * Works across:
 * - Native Android APK: Triggers native Android PrintManager sheet ("Save as PDF" / Wireless Printer)
 * - Web Browsers: Triggers clean offscreen iframe print dialog without popup blocker issues
 */
export async function printBirthdayCard(
  options: BirthdayCardPrintOptions
): Promise<void> {
  const canvas = await renderCardToCanvas(options);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const cleanName = (options.person.name || 'Student').replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');

  const printHtml = `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="utf-8" />
  <title>${options.person.name} — Birthday Card</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
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
    .card-print-page {
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
    }
    .card-print-img {
      width: 100%;
      max-width: 210mm;
      height: 100%;
      max-height: 297mm;
      object-fit: contain;
      display: block;
      margin: auto;
    }
  </style>
</head>
<body>
  <div class="card-print-page">
    <img src="${imgData}" class="card-print-img" alt="${options.person.name}" />
  </div>
</body>
</html>`;

  printHtmlDocument(printHtml, `Birthday_Card_${cleanName}`);
}

/**
 * Download Individual Birthday Card as HD PNG Image
 */
export async function downloadBirthdayCardPng(
  options: BirthdayCardPrintOptions
): Promise<{ success: boolean; filename: string }> {
  const canvas = await renderCardToCanvas(options);
  const dataUrl = canvas.toDataURL('image/png');
  const cleanName = (options.person.name || 'Student').replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
  const filename = `Birthday_Card_${cleanName}_HD.png`;

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { success: true, filename };
}

/**
 * Batch Export: Download All Today's Cards into a single consolidated Multi-Page A4 PDF
 */
export async function downloadAllBirthdayCardsPdf(
  optionsList: BirthdayCardPrintOptions[],
  schoolName: string = 'School'
): Promise<{ success: boolean; method: string; filename: string }> {
  if (optionsList.length === 0) {
    return { success: false, method: 'no_cards', filename: '' };
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < optionsList.length; i++) {
    const opts = optionsList[i];
    const canvas = await renderCardToCanvas(opts);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const cleanSchool = schoolName.replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
  const filename = `All_Birthday_Cards_${cleanSchool}_${todayStr}_A4.pdf`;

  const pdfBlob = pdf.output('blob');
  const result = await downloadPdfFile(pdfBlob, filename);
  return { ...result, filename };
}

/**
 * Batch Print: Print All Today's Cards in a Single Operation
 */
export async function printAllBirthdayCards(
  optionsList: BirthdayCardPrintOptions[],
  schoolName: string = 'શાળા'
): Promise<void> {
  if (optionsList.length === 0) return;

  const cardImages: { imgData: string; name: string }[] = [];

  for (const opts of optionsList) {
    const canvas = await renderCardToCanvas(opts);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    cardImages.push({ imgData, name: opts.person.name });
  }

  const cleanSchool = schoolName.replace(/[\\/:*?"<>|]/g, '_');
  const printHtml = `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="utf-8" />
  <title>All Birthday Cards — ${cleanSchool}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .print-card-page {
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      page-break-after: always;
      break-after: page;
    }
    .print-card-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .card-print-img {
      width: 100%;
      max-width: 210mm;
      height: 100%;
      max-height: 297mm;
      object-fit: contain;
      display: block;
      margin: auto;
    }
  </style>
</head>
<body>
  ${cardImages
    .map(
      (card) => `
    <div class="print-card-page">
      <img src="${card.imgData}" class="card-print-img" alt="${card.name}" />
    </div>
  `
    )
    .join('')}
</body>
</html>`;

  printHtmlDocument(printHtml, `All_Birthday_Cards_${cleanSchool}`);
}
