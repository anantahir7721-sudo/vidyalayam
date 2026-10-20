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
    return null;
  }
}

/**
 * Loads an image from URL/DataURL and performs true center-crop to a 1:1 square
 * on an offscreen HTML5 Canvas.
 * This completely eliminates html2canvas stretching bugs with rectangular photos!
 */
async function getSquareCroppedImageDataUrl(
  url?: string,
  fit: 'cover' | 'contain' = 'cover',
  targetSize = 600
): Promise<string | null> {
  const rawDataUrl = await safeGetImageDataUrl(url);
  if (!rawDataUrl) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetSize, targetSize);

        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;

        if (fit === 'contain') {
          // Center contain with margin
          const scale = Math.min((targetSize * 0.9) / nw, (targetSize * 0.9) / nh);
          const drawW = nw * scale;
          const drawH = nh * scale;
          const dx = (targetSize - drawW) / 2;
          const dy = (targetSize - drawH) / 2;
          ctx.drawImage(img, dx, dy, drawW, drawH);
        } else {
          // True center-crop (cover): crops exact central square
          const minDim = Math.min(nw, nh);
          const sx = (nw - minDim) / 2;
          const sy = (nh - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
        }

        const squareDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(squareDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

/**
 * Standard html2canvas options for pixel-perfect A4 capture (Exact 794px x 1123px = 210mm x 297mm)
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
  height: 1123,
  windowWidth: 794,
  windowHeight: 1123,
};

/**
 * Constructs clean, high-resolution HTML for the Birthday Card
 * Designed specifically for 794px x 1123px exact A4 geometry with zero overflow and zero squashing.
 */
function buildBirthdayCardA4Html(
  options: BirthdayCardPrintOptions,
  photoDataUrl: string | null
): string {
  const { person, school, theme, customWishText, lang = 'gu' } = options;

  const displaySchoolName = school.schoolName || (lang === 'gu' ? 'શ્રી પ્રાથમિક શાળા' : 'Primary School');
  const displayLocation = [school.taluka, school.district].filter(Boolean).join(', ');

  const schoolFamilyBlessing =
    lang === 'gu'
      ? `${school.schoolName || 'શાળા'} પરિવાર`
      : `${displaySchoolName} Family`;

  const studentInitial = person.name ? person.name.charAt(0).toUpperCase() : '★';

  // Corner Victorian filigree SVG snippet for 4 corners (Clean 52px, safely inside borders without text overlap)
  const cornerFiligree = (rotateDeg: number, top?: string, left?: string, right?: string, bottom?: string) => `
    <svg width="54" height="54" viewBox="0 0 100 100" fill="none" style="
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
    </svg>
  `;

  // Classical Victory Laurel Branch flanking the portrait (52px x 120px)
  const laurelBranch = (isFlipped: boolean) => `
    <svg width="52" height="120" viewBox="0 0 50 120" fill="none" style="
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
      height: 1123px;
      max-height: 1123px;
      box-sizing: border-box;
      background: ${theme.bgGradient};
      color: ${theme.textColor};
      position: relative;
      overflow: hidden;
      font-family: ${GUJARATI_FONT_STACK};
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    ">
      <!-- 1. Outer Royal Solid Frame -->
      <div style="
        position: absolute;
        top: 18px;
        left: 18px;
        right: 18px;
        bottom: 18px;
        border: 3.5px solid ${theme.cardBorder};
        border-radius: 18px;
        pointer-events: none;
        box-sizing: border-box;
      "></div>

      <!-- 2. Middle Royal Gold Inset Accent Line -->
      <div style="
        position: absolute;
        top: 24px;
        left: 24px;
        right: 24px;
        bottom: 24px;
        border: 1.5px solid #D4AF37;
        border-radius: 14px;
        pointer-events: none;
        box-sizing: border-box;
      "></div>

      <!-- 3. Inner Royal Delicate Hairline Frame -->
      <div style="
        position: absolute;
        top: 30px;
        left: 30px;
        right: 30px;
        bottom: 30px;
        border: 1px solid ${theme.sealBorder};
        border-radius: 10px;
        pointer-events: none;
        opacity: 0.65;
        box-sizing: border-box;
      "></div>

      <!-- 4 Victorian Royal Corner Filigrees (Neatly tucked inside corners, zero text collision) -->
      ${cornerFiligree(0, '22px', '22px')}
      ${cornerFiligree(90, '22px', undefined, '22px')}
      ${cornerFiligree(180, undefined, undefined, '22px', '22px')}
      ${cornerFiligree(270, undefined, '22px', undefined, '22px')}

      <!-- Left Festive Gold-accented Balloon Accent -->
      <div style="position: absolute; top: 380px; left: 28px; opacity: 0.65; pointer-events: none;">
        <svg width="50" height="100" viewBox="0 0 50 110" fill="none" stroke="${theme.balloonStroke}" stroke-width="1.8" stroke-linecap="round">
          <ellipse cx="25" cy="30" rx="19" ry="25" fill="${theme.balloonFill}" fill-opacity="0.6" />
          <path d="M 23 55 L 27 55 L 25 59 Z" fill="${theme.balloonStroke}" />
          <path d="M 25 59 Q 30 78 20 94 Q 15 102 22 108" fill="none" stroke-width="1.5" />
        </svg>
      </div>

      <!-- Right Festive Gold-accented Balloon Accent -->
      <div style="position: absolute; top: 270px; right: 28px; opacity: 0.65; pointer-events: none;">
        <svg width="50" height="100" viewBox="0 0 50 110" fill="none" stroke="${theme.balloonStroke}" stroke-width="1.8" stroke-linecap="round">
          <ellipse cx="25" cy="30" rx="19" ry="25" fill="${theme.balloonFill}" fill-opacity="0.6" />
          <path d="M 23 55 L 27 55 L 25 59 Z" fill="${theme.balloonStroke}" />
          <path d="M 25 59 Q 18 76 28 92 Q 32 101 24 108" fill="none" stroke-width="1.5" />
        </svg>
      </div>

      <!-- ========================================================================= -->
      <!-- INNER SAFE CONTENT CONTAINER (Strictly padded safely away from all borders) -->
      <!-- ========================================================================= -->
      <div style="
        position: relative;
        z-index: 2;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 44px 50px 36px 50px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
      ">
        <!-- 1. Header: School Name & Location (Cleanly centered, never touches corner filigrees) -->
        <div style="text-align: center; width: 100%;">
          <!-- Top Royal Insignia Crest -->
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 3px;
          ">
            <span style="color: #D4AF37; font-size: 13px;">✦</span>
            <span style="color: #D4AF37; font-size: 18px; line-height: 1;">⚜</span>
            <span style="color: #D4AF37; font-size: 13px;">✦</span>
          </div>

          <h1 style="
            margin: 0;
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            line-height: 1.25;
            color: ${theme.titleColor};
            display: block;
            max-width: 530px;
            margin-left: auto;
            margin-right: auto;
            text-align: center;
          ">${displaySchoolName}</h1>

          ${displayLocation ? `
            <div style="
              font-size: 12.5px;
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
            width: 220px;
            height: 1.5px;
            background: linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%);
            margin: 6px auto 0 auto;
          "></div>
        </div>

        <!-- 2. Birthday Salutation Header -->
        <div style="text-align: center; width: 100%;">
          ${lang === 'en' ? `
            <div style="
              font-size: 15px;
              font-weight: 800;
              letter-spacing: 6px;
              text-transform: uppercase;
              color: ${theme.subtextColor};
              margin-bottom: 1px;
              opacity: 0.92;
            ">✦ HAPPY ✦</div>
            <div style="
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 54px;
              font-style: italic;
              font-weight: 700;
              line-height: 1;
              color: ${theme.titleColor};
              letter-spacing: -0.5px;
              text-shadow: 0 2px 8px rgba(0,0,0,0.06);
            ">Birthday</div>
          ` : `
            <div style="
              font-size: 16px;
              font-weight: 800;
              letter-spacing: 3px;
              text-transform: uppercase;
              color: ${theme.subtextColor};
              margin-bottom: 2px;
              opacity: 0.92;
            ">✦ જન્મદિવસની ✦</div>
            <div style="
              font-size: 38px;
              font-weight: 900;
              line-height: 1.15;
              color: ${theme.titleColor};
              letter-spacing: -0.5px;
            ">હાર્દિક શુભકામનાઓ</div>
          `}
        </div>

        <!-- 3. Center Portrait Section (Guaranteed 100% Round Circle, Never Squashed or Stretched) -->
        <div style="
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px 0;
        ">
          <!-- Left Classical Golden Victory Laurel Branch -->
          <div style="position: absolute; left: 205px; pointer-events: none; z-index: 4;">
            ${laurelBranch(false)}
          </div>

          <!-- Right Classical Golden Victory Laurel Branch -->
          <div style="position: absolute; right: 205px; pointer-events: none; z-index: 4;">
            ${laurelBranch(true)}
          </div>

          <!-- Central Portrait Photo (Strictly 236px x 236px, flex-shrink: 0, guaranteed circle) -->
          <div style="
            position: relative;
            z-index: 3;
            width: 236px;
            height: 236px;
            min-width: 236px;
            min-height: 236px;
            max-width: 236px;
            max-height: 236px;
            flex-shrink: 0;
            border-radius: 50%;
            padding: 6px;
            box-sizing: border-box;
            background: linear-gradient(135deg, #FFE8A3 0%, #D4AF37 35%, #FFF6D6 60%, #AA7C11 100%);
            box-shadow: 0 12px 28px rgba(0,0,0,0.18);
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
              border: 4px solid #ffffff;
              box-sizing: border-box;
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
                    display: block;
                  "
                />
              ` : `
                <div style="
                  width: 100%;
                  height: 100%;
                  background: #F8FAFC;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #64748B;
                ">
                  <span style="font-size: 80px; font-weight: 900; color: #D4AF37;">${studentInitial}</span>
                </div>
              `}
            </div>

            <!-- Star Medallion at Bottom Apex -->
            <div style="
              position: absolute;
              bottom: -6px;
              background: linear-gradient(135deg, #FFE8A3 0%, #D4AF37 50%, #AA7C11 100%);
              color: #ffffff;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 15px;
              border: 2px solid #ffffff;
              box-shadow: 0 3px 8px rgba(0,0,0,0.2);
              z-index: 5;
            ">
              ★
            </div>
          </div>
        </div>

        <!-- 4. Person Name & Identity Badges -->
        <div style="text-align: center; width: 100%; margin: 2px 0;">
          <h2 style="
            margin: 0;
            font-size: 28px;
            font-weight: 900;
            line-height: 1.2;
            color: ${theme.titleColor};
            letter-spacing: 0.5px;
          ">${person.name}</h2>

          <!-- Identity Badges -->
          <div style="
            margin-top: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
          ">
            <div style="
              background: ${theme.badgeBg};
              color: ${theme.badgeText};
              border: 1.5px solid #D4AF37;
              border-radius: 9999px;
              padding: 4px 16px;
              font-size: 13.5px;
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
                padding: 4px 16px;
                font-size: 13.5px;
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
                padding: 4px 16px;
                font-size: 13.5px;
                font-weight: 800;
                box-shadow: 0 2px 6px rgba(0,0,0,0.04);
              ">
                💼 ${person.designation}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 5. Wish Message Plaque (Large, Bold Typography, Well-spaced) -->
        <div style="
          width: 100%;
          max-width: 590px;
          background: ${theme.wishBg || 'rgba(255, 255, 255, 0.94)'};
          border: 1.8px solid #D4AF37;
          border-radius: 18px;
          padding: 14px 26px 16px 26px;
          box-sizing: border-box;
          text-align: center;
          margin: 4px 0;
          box-shadow: 0 8px 22px rgba(0,0,0,0.05);
        ">
          <!-- Top Ornamental Ribbon Badge -->
          <div style="
            display: inline-block;
            background: ${theme.badgeBg};
            color: ${theme.badgeText};
            border: 1px solid #D4AF37;
            border-radius: 9999px;
            padding: 3px 14px;
            font-size: 11.5px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 8px;
          ">
            ✨ ${lang === 'gu' ? 'જન્મદિવસ શુભકામના સંદેશ' : 'HEARTFELT BIRTHDAY WISHES'} ✨
          </div>

          <p style="
            margin: 0;
            font-size: ${lang === 'gu' ? '21px' : '19.5px'};
            font-weight: 800;
            line-height: 1.55;
            color: ${theme.textColor};
            letter-spacing: 0.2px;
          ">
            <span style="color: #D4AF37; font-size: 26px; font-weight: 900; line-height: 0; vertical-align: -4px; margin-right: 4px;">❝</span>
            ${customWishText}
            <span style="color: #D4AF37; font-size: 26px; font-weight: 900; line-height: 0; vertical-align: -4px; margin-left: 4px;">❞</span>
          </p>
        </div>

        <!-- 6. Regards & School Family Blessing Footer (Comfortably clear of bottom border) -->
        <div style="
          width: 100%;
          text-align: center;
          margin-top: 4px;
          padding-bottom: 4px;
        ">
          <!-- Tapered Gold Divider Line -->
          <div style="
            width: 240px;
            height: 1.5px;
            background: linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%);
            margin: 0 auto 8px auto;
          "></div>

          <div style="
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 13.5px;
            font-style: italic;
            font-weight: 700;
            color: ${theme.subtextColor};
            margin-bottom: 2px;
          ">
            ${lang === 'gu' ? 'શુભેચ્છક:' : 'With Warm Compliments:'}
          </div>

          <div style="
            font-size: 20px;
            font-weight: 900;
            line-height: 1.25;
            color: ${theme.titleColor};
            letter-spacing: 0.3px;
          ">
            ${schoolFamilyBlessing}
          </div>

          <div style="
            font-size: 12.5px;
            font-weight: 700;
            color: ${theme.subtextColor};
            margin-top: 2px;
            opacity: 0.92;
          ">
            ${lang === 'gu' ? 'આચાર્યશ્રી, શિક્ષકગણ તથા સમસ્ત સ્ટાફ પરિવાર' : 'Principal, Teachers & Entire Staff'}
          </div>
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
  // Guarantee photo is cropped to an exact 1:1 square on an offscreen canvas to avoid html2canvas stretching
  const photoDataUrl = await getSquareCroppedImageDataUrl(options.photoUrl, options.photoFit);

  const container = document.createElement('div');
  container.id = 'vidyalayam_birthday_pdf_container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-99999';
  container.style.pointerEvents = 'none';
  container.style.width = '794px';
  container.style.height = '1123px';
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
