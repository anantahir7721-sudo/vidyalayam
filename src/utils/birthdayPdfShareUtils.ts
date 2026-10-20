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

  const studentInitial = person.name ? person.name.charAt(0).toUpperCase() : '★';

  // Corner Victorian filigree SVG snippet for 4 corners (100% SVG path/circle, zero textPath)
  const cornerFiligree = (rotateDeg: number, top?: string, left?: string, right?: string, bottom?: string) => `
    <svg width="84" height="84" viewBox="0 0 100 100" fill="none" style="
      position: absolute;
      ${top ? `top: ${top};` : ''}
      ${left ? `left: ${left};` : ''}
      ${right ? `right: ${right};` : ''}
      ${bottom ? `bottom: ${bottom};` : ''}
      transform: rotate(${rotateDeg}deg);
      pointer-events: none;
      z-index: 10;
    ">
      <path d="M 8 8 L 82 8 M 8 8 L 8 82" stroke="#D4AF37" stroke-width="3" stroke-linecap="round"/>
      <path d="M 16 16 L 68 16 M 16 16 L 16 68" stroke="${theme.cardBorder}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M 16 16 C 36 10, 52 16, 64 12 C 48 24, 48 40, 64 54 C 48 44, 34 54, 28 68 C 22 52, 12 52, 12 66 C 14 50, 12 34, 16 16 Z" fill="#D4AF37" fill-opacity="0.35" stroke="#D4AF37" stroke-width="1.2"/>
      <circle cx="8" cy="8" r="4.5" fill="#D4AF37"/>
      <circle cx="16" cy="16" r="3" fill="${theme.cardBorder}"/>
      <circle cx="82" cy="8" r="3" fill="#D4AF37"/>
      <circle cx="8" cy="82" r="3" fill="#D4AF37"/>
      <circle cx="68" cy="16" r="2.5" fill="${theme.cardBorder}"/>
      <circle cx="16" cy="68" r="2.5" fill="${theme.cardBorder}"/>
    </svg>
  `;

  // Classical Victory Laurel Branch flanking the portrait
  const laurelBranch = (isFlipped: boolean) => `
    <svg width="68" height="155" viewBox="0 0 50 120" fill="none" style="
      transform: ${isFlipped ? 'scaleX(-1)' : 'none'};
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.12));
    ">
      <path d="M 38 116 C 28 85, 18 45, 34 8" stroke="#D4AF37" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M 34 14 C 26 10, 18 18, 24 26 C 30 23, 32 18, 34 14 Z" fill="#D4AF37" />
      <path d="M 31 34 C 20 28, 12 38, 20 46 C 26 43, 28 38, 31 34 Z" fill="#D4AF37" />
      <path d="M 37 31 C 45 27, 49 35, 43 41 C 39 39, 38 35, 37 31 Z" fill="#E5C158" />
      <path d="M 26 54 C 14 48, 6 58, 14 66 C 20 63, 23 58, 26 54 Z" fill="#D4AF37" />
      <path d="M 34 51 C 42 47, 47 55, 41 61 C 37 59, 36 55, 34 51 Z" fill="#E5C158" />
      <path d="M 23 74 C 10 68, 2 78, 10 86 C 16 83, 20 78, 23 74 Z" fill="#D4AF37" />
      <path d="M 32 71 C 41 67, 45 75, 39 81 C 35 79, 34 75, 32 71 Z" fill="#E5C158" />
      <path d="M 25 94 C 13 88, 6 98, 14 104 C 20 102, 23 97, 25 94 Z" fill="#D4AF37" />
      <path d="M 33 91 C 42 87, 46 95, 40 100 C 36 98, 35 94, 33 91 Z" fill="#E5C158" />
    </svg>
  `;

  return `
    <div style="
      width: 794px;
      height: 1120px;
      max-height: 1120px;
      box-sizing: border-box;
      background: ${theme.bgGradient};
      color: ${theme.textColor};
      padding: 24px;
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
      <!-- 1. Outer Royal Solid Frame -->
      <div style="
        position: absolute;
        top: 20px;
        left: 20px;
        right: 20px;
        bottom: 20px;
        border: 4px solid ${theme.cardBorder};
        border-radius: 20px;
        pointer-events: none;
        box-sizing: border-box;
      "></div>

      <!-- 2. Middle Royal Gold Inset Accent Line -->
      <div style="
        position: absolute;
        top: 27px;
        left: 27px;
        right: 27px;
        bottom: 27px;
        border: 2px solid #D4AF37;
        border-radius: 15px;
        pointer-events: none;
        box-sizing: border-box;
      "></div>

      <!-- 3. Inner Royal Delicate Hairline Frame -->
      <div style="
        position: absolute;
        top: 33px;
        left: 33px;
        right: 33px;
        bottom: 33px;
        border: 1px solid ${theme.sealBorder};
        border-radius: 11px;
        pointer-events: none;
        opacity: 0.75;
        box-sizing: border-box;
      "></div>

      <!-- 4 Victorian Royal Corner Filigrees -->
      ${cornerFiligree(0, '22px', '22px')}
      ${cornerFiligree(90, '22px', undefined, '22px')}
      ${cornerFiligree(180, undefined, undefined, '22px', '22px')}
      ${cornerFiligree(270, undefined, '22px', undefined, '22px')}

      <!-- Left Festive Gold-accented Balloon Accent -->
      <div style="position: absolute; top: 400px; left: 28px; opacity: 0.75; pointer-events: none;">
        <svg width="60" height="120" viewBox="0 0 50 110" fill="none" stroke="${theme.balloonStroke}" stroke-width="2" stroke-linecap="round">
          <ellipse cx="25" cy="30" rx="20" ry="26" fill="${theme.balloonFill}" fill-opacity="0.6" />
          <path d="M 23 56 L 27 56 L 25 60 Z" fill="${theme.balloonStroke}" />
          <path d="M 25 60 Q 30 80 20 96 Q 15 104 22 110" fill="none" stroke-width="1.6" />
        </svg>
      </div>

      <!-- Right Festive Gold-accented Balloon Accent -->
      <div style="position: absolute; top: 290px; right: 28px; opacity: 0.75; pointer-events: none;">
        <svg width="60" height="120" viewBox="0 0 50 110" fill="none" stroke="${theme.balloonStroke}" stroke-width="2" stroke-linecap="round">
          <ellipse cx="25" cy="30" rx="20" ry="26" fill="${theme.balloonFill}" fill-opacity="0.6" />
          <path d="M 23 56 L 27 56 L 25 60 Z" fill="${theme.balloonStroke}" />
          <path d="M 25 60 Q 18 78 28 94 Q 32 103 24 110" fill="none" stroke-width="1.6" />
        </svg>
      </div>

      <!-- Header: School Name & Location (Generous Top Clearance, No Printer Badge Clashing) -->
      <div style="text-align: center; width: 100%; position: relative; z-index: 2; padding-top: 14px;">
        <!-- Top Royal Insignia Crest -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 4px;
        ">
          <span style="color: #D4AF37; font-size: 15px;">✦</span>
          <span style="color: #D4AF37; font-size: 22px; line-height: 1;">⚜</span>
          <span style="color: #D4AF37; font-size: 15px;">✦</span>
        </div>

        <h1 style="
          margin: 0;
          font-size: 27px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          line-height: 1.25;
          color: ${theme.titleColor};
          display: block;
          max-width: 660px;
          margin-left: auto;
          margin-right: auto;
        ">${displaySchoolName}</h1>

        ${displayLocation ? `
          <div style="
            font-size: 13.5px;
            font-weight: 800;
            color: ${theme.subtextColor};
            letter-spacing: 2px;
            text-transform: uppercase;
            opacity: 0.95;
            margin-top: 3px;
          ">${displayLocation}</div>
        ` : ''}

        <!-- Ornamental Tapered Gold Divider Line -->
        <div style="
          width: 260px;
          height: 1.5px;
          background: linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%);
          margin: 7px auto 0 auto;
        "></div>
      </div>

      <!-- Birthday Salutation Header -->
      <div style="text-align: center; width: 100%; position: relative; z-index: 2; margin-top: 0px;">
        ${lang === 'en' ? `
          <div style="
            font-size: 17px;
            font-weight: 800;
            letter-spacing: 7px;
            text-transform: uppercase;
            color: ${theme.subtextColor};
            margin-bottom: 2px;
            opacity: 0.92;
          ">✦ HAPPY ✦</div>
          <div style="
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 64px;
            font-style: italic;
            font-weight: 700;
            line-height: 1;
            color: ${theme.titleColor};
            letter-spacing: -0.5px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.06);
          ">Birthday</div>
        ` : `
          <div style="
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: ${theme.subtextColor};
            margin-bottom: 2px;
            opacity: 0.92;
          ">✦ જન્મદિવસની ✦</div>
          <div style="
            font-size: 46px;
            font-weight: 900;
            line-height: 1.15;
            color: ${theme.titleColor};
            letter-spacing: -0.5px;
          ">હાર્દિક શુભકામનાઓ</div>
        `}
      </div>

      <!-- Center Portrait Section (Prominent, High-Resolution 320px with Royal Golden Bezel & Victory Laurels) -->
      <div style="
        position: relative;
        z-index: 2;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 6px 0;
      ">
        <!-- Left Classical Golden Victory Laurel Branch -->
        <div style="position: absolute; left: 140px; pointer-events: none; z-index: 4;">
          ${laurelBranch(false)}
        </div>

        <!-- Right Classical Golden Victory Laurel Branch -->
        <div style="position: absolute; right: 140px; pointer-events: none; z-index: 4;">
          ${laurelBranch(true)}
        </div>

        <!-- Central Portrait Photo (Large 320px Diameter with Multi-layer Gold Rim) -->
        <div style="
          position: relative;
          z-index: 3;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          padding: 8px;
          background: linear-gradient(135deg, #FFE8A3 0%, #D4AF37 35%, #FFF6D6 60%, #AA7C11 100%);
          box-shadow: 0 16px 36px rgba(0,0,0,0.22);
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
            border: 5px solid #ffffff;
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
                background: #F8FAFC;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #64748B;
              ">
                <span style="font-size: 105px; font-weight: 900; color: #D4AF37;">${studentInitial}</span>
              </div>
            `}
          </div>

          <!-- Star Medallion at Bottom Apex -->
          <div style="
            position: absolute;
            bottom: -8px;
            background: linear-gradient(135deg, #FFE8A3 0%, #D4AF37 50%, #AA7C11 100%);
            color: #ffffff;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 17px;
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            z-index: 5;
          ">
            ★
          </div>
        </div>
      </div>

      <!-- Person Name & Identity Badges -->
      <div style="text-align: center; width: 100%; position: relative; z-index: 2; margin-top: 4px;">
        <h2 style="
          margin: 0;
          font-size: 34px;
          font-weight: 900;
          line-height: 1.2;
          color: ${theme.titleColor};
          letter-spacing: 0.3px;
        ">${person.name}</h2>

        <!-- Identity Badges -->
        <div style="
          margin-top: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        ">
          <div style="
            background: ${theme.badgeBg};
            color: ${theme.badgeText};
            border: 1.5px solid #D4AF37;
            border-radius: 9999px;
            padding: 5px 20px;
            font-size: 14.5px;
            font-weight: 800;
            letter-spacing: 0.3px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          ">
            🎂 ${person.formattedDob}
          </div>
          ${person.standard ? `
            <div style="
              background: ${theme.badgeBg};
              color: ${theme.badgeText};
              border: 1.5px solid #D4AF37;
              border-radius: 9999px;
              padding: 5px 20px;
              font-size: 14.5px;
              font-weight: 800;
              box-shadow: 0 2px 6px rgba(0,0,0,0.04);
            ">
              🎓 ${lang === 'gu' ? `ધોરણ ${person.standard}${person.section ? `-${person.section}` : ''}` : `Class ${person.standard}`}
            </div>
          ` : ''}
          ${person.designation ? `
            <div style="
              background: ${theme.badgeBg};
              color: ${theme.badgeText};
              border: 1.5px solid #D4AF37;
              border-radius: 9999px;
              padding: 5px 20px;
              font-size: 14.5px;
              font-weight: 800;
              box-shadow: 0 2px 6px rgba(0,0,0,0.04);
            ">
              💼 ${person.designation}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Wish Message Plaque (Large, Bold 24px/22px Typography with Golden Accent Quotes) -->
      <div style="
        position: relative;
        z-index: 2;
        width: 100%;
        max-width: 690px;
        background: ${theme.wishBg || 'rgba(255, 255, 255, 0.94)'};
        border: 2px solid #D4AF37;
        border-radius: 22px;
        padding: 20px 34px 22px 34px;
        box-sizing: border-box;
        text-align: center;
        margin: 6px 0;
        box-shadow: 0 10px 28px rgba(0,0,0,0.06);
      ">
        <!-- Top Ornamental Ribbon Badge -->
        <div style="
          display: inline-block;
          background: ${theme.badgeBg};
          color: ${theme.badgeText};
          border: 1px solid #D4AF37;
          border-radius: 9999px;
          padding: 4px 18px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 10px;
        ">
          ✨ ${lang === 'gu' ? 'જન્મદિવસ શુભકામના સંદેશ' : 'HEARTFELT BIRTHDAY WISHES'} ✨
        </div>

        <p style="
          margin: 0;
          font-size: ${lang === 'gu' ? '24px' : '22px'};
          font-weight: 800;
          line-height: 1.65;
          color: ${theme.textColor};
          letter-spacing: 0.25px;
        ">
          <span style="color: #D4AF37; font-size: 32px; font-weight: 900; line-height: 0; vertical-align: -6px; margin-right: 6px;">❝</span>
          ${customWishText}
          <span style="color: #D4AF37; font-size: 32px; font-weight: 900; line-height: 0; vertical-align: -6px; margin-left: 6px;">❞</span>
        </p>
      </div>

      <!-- Regards & School Family Blessing Footer -->
      <div style="
        position: relative;
        z-index: 2;
        width: 100%;
        text-align: center;
        padding-top: 10px;
        margin-bottom: 6px;
      ">
        <!-- Tapered Gold Divider Line -->
        <div style="
          width: 320px;
          height: 1.5px;
          background: linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%);
          margin: 0 auto 10px auto;
        "></div>

        <div style="
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 15px;
          font-style: italic;
          font-weight: 700;
          color: ${theme.subtextColor};
          margin-bottom: 3px;
        ">
          ${lang === 'gu' ? 'શુભેચ્છક:' : 'With Warm Compliments:'}
        </div>

        <div style="
          font-size: 23px;
          font-weight: 900;
          line-height: 1.25;
          color: ${theme.titleColor};
          letter-spacing: 0.3px;
        ">
          ${schoolFamilyBlessing}
        </div>

        <div style="
          font-size: 14px;
          font-weight: 700;
          color: ${theme.subtextColor};
          margin-top: 3px;
          opacity: 0.92;
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
