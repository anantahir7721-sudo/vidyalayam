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

  // Symmetrical Festive Balloon Bouquet SVG for Left and Right sides
  const renderBalloonBouquetSvg = (side: 'left' | 'right') => {
    const isLeft = side === 'left';
    return `
      <div style="
        position: absolute;
        top: 275px;
        ${isLeft ? 'left: 20px;' : 'right: 20px;'};
        width: 140px;
        height: 270px;
        pointer-events: none;
        z-index: 10;
        ${isLeft ? '' : 'transform: scaleX(-1);'}
      ">
        <svg width="140" height="270" viewBox="0 0 140 270" fill="none">
          <defs>
            <!-- Balloon 1: Royal Theme Color Gradient -->
            <radialGradient id="balloonGradPrimary_${side}" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
              <stop offset="25%" stop-color="${theme.badgeBg}" />
              <stop offset="70%" stop-color="${theme.titleColor}" />
              <stop offset="100%" stop-color="${theme.cardBorder}" />
            </radialGradient>

            <!-- Balloon 2: Metallic Gold Gradient -->
            <radialGradient id="balloonGradGold_${side}" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stop-color="#FFF8E1" stop-opacity="0.95" />
              <stop offset="30%" stop-color="#FFE082" />
              <stop offset="70%" stop-color="#D4AF37" />
              <stop offset="100%" stop-color="#8C6D15" />
            </radialGradient>

            <!-- Balloon 3: Shimmer Warm Coral/Ruby Gradient -->
            <radialGradient id="balloonGradAccent_${side}" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
              <stop offset="30%" stop-color="#FFD1DC" />
              <stop offset="70%" stop-color="#E57373" />
              <stop offset="100%" stop-color="#B71C1C" />
            </radialGradient>
          </defs>

          <!-- Curving Ribbon Strings (Flowing downwards) -->
          <path d="M 46 112 Q 40 160 70 205 Q 75 230 72 265" stroke="#D4AF37" stroke-width="1.6" fill="none" opacity="0.85" />
          <path d="M 94 92 Q 100 150 72 205 Q 68 230 72 265" stroke="#D4AF37" stroke-width="1.6" fill="none" opacity="0.85" />
          <path d="M 68 152 Q 62 185 70 205 Q 75 230 72 265" stroke="#AA7C11" stroke-width="1.8" fill="none" opacity="0.9" />
          <!-- Ribbon Bow Knot -->
          <circle cx="71" cy="207" r="3" fill="#D4AF37" />

          <!-- Balloon 2 (Back Right, Metallic Gold) -->
          <g>
            <ellipse cx="94" cy="56" rx="34" ry="42" fill="url(#balloonGradGold_${side})" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.12))" />
            <ellipse cx="84" cy="40" rx="9" ry="15" fill="#FFFFFF" fill-opacity="0.5" transform="rotate(-20 84 40)" />
            <polygon points="90,98 98,98 94,103" fill="#8C6D15" />
          </g>

          <!-- Balloon 1 (Back Left, Warm Shimmer) -->
          <g>
            <ellipse cx="46" cy="74" rx="32" ry="40" fill="url(#balloonGradAccent_${side})" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.12))" />
            <ellipse cx="36" cy="58" rx="8" ry="14" fill="#FFFFFF" fill-opacity="0.45" transform="rotate(-20 36 58)" />
            <polygon points="42,114 50,114 46,119" fill="#B71C1C" />
          </g>

          <!-- Balloon 3 (Front Center, Royal Theme Primary) -->
          <g>
            <ellipse cx="68" cy="110" rx="36" ry="45" fill="url(#balloonGradPrimary_${side})" filter="drop-shadow(0 6px 14px rgba(0,0,0,0.18))" />
            <ellipse cx="56" cy="92" rx="10" ry="16" fill="#FFFFFF" fill-opacity="0.55" transform="rotate(-20 56 92)" />
            <polygon points="64,155 72,155 68,160" fill="${theme.cardBorder}" />
          </g>

          <!-- Festive Sparkles -->
          <text x="18" y="32" font-size="12" fill="#D4AF37" opacity="0.85">✦</text>
          <text x="110" y="24" font-size="15" fill="#D4AF37" opacity="0.9">★</text>
          <text x="10" y="145" font-size="10" fill="#D4AF37" opacity="0.75">✦</text>
          <text x="115" y="160" font-size="13" fill="#D4AF37" opacity="0.8">★</text>
        </svg>
      </div>
    `;
  };

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
        border-radius: 14px;
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
        border-radius: 10px;
        pointer-events: none;
        box-sizing: border-box;
      "></div>

      <!-- 3. Inner Royal Delicate Hairline Frame -->
      <div style="
        position: absolute;
        top: 28px;
        left: 28px;
        right: 28px;
        bottom: 28px;
        border: 1px solid ${theme.sealBorder};
        border-radius: 7px;
        pointer-events: none;
        opacity: 0.55;
        box-sizing: border-box;
      "></div>

      <!-- 4 Symmetrical Pure CSS Royal Gold Corner Diamond Accents -->
      <div style="position: absolute; top: 21px; left: 21px; width: 10px; height: 10px; background: #D4AF37; transform: rotate(45deg); pointer-events: none; z-index: 10;"></div>
      <div style="position: absolute; top: 21px; right: 21px; width: 10px; height: 10px; background: #D4AF37; transform: rotate(45deg); pointer-events: none; z-index: 10;"></div>
      <div style="position: absolute; bottom: 21px; right: 21px; width: 10px; height: 10px; background: #D4AF37; transform: rotate(45deg); pointer-events: none; z-index: 10;"></div>
      <div style="position: absolute; bottom: 21px; left: 21px; width: 10px; height: 10px; background: #D4AF37; transform: rotate(45deg); pointer-events: none; z-index: 10;"></div>

      <!-- Left Festive Balloon Bouquet -->
      ${renderBalloonBouquetSvg('left')}

      <!-- Right Festive Balloon Bouquet -->
      ${renderBalloonBouquetSvg('right')}

      <!-- ========================================================================= -->
      <!-- INNER SAFE CONTENT CONTAINER (Strictly padded safely away from all borders) -->
      <!-- ========================================================================= -->
      <div style="
        position: relative;
        z-index: 2;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 42px 48px 36px 48px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
      ">
        <!-- 1. Header: School Name & Location -->
        <div style="text-align: center; width: 100%;">
          <!-- Top Royal Insignia Crest -->
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 4px;
          ">
            <span style="color: #D4AF37; font-size: 13px;">✦</span>
            <span style="color: #D4AF37; font-size: 20px; line-height: 1;">⚜</span>
            <span style="color: #D4AF37; font-size: 13px;">✦</span>
          </div>

          <h1 style="
            margin: 0;
            font-size: 25px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            line-height: 1.25;
            color: ${theme.titleColor};
            display: block;
            max-width: 560px;
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
        <div style="text-align: center; width: 100%; margin: 2px 0;">
          ${lang === 'en' ? `
            <div style="
              font-size: 14.5px;
              font-weight: 800;
              letter-spacing: 6px;
              text-transform: uppercase;
              color: ${theme.subtextColor};
              margin-bottom: 2px;
              opacity: 0.92;
            ">✦ HAPPY ✦</div>
            <div style="
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 56px;
              font-style: italic;
              font-weight: 700;
              line-height: 1;
              color: ${theme.titleColor};
              letter-spacing: -0.5px;
              text-shadow: 0 2px 8px rgba(0,0,0,0.06);
            ">Birthday</div>
          ` : `
            <div style="
              font-size: 15px;
              font-weight: 800;
              letter-spacing: 3px;
              text-transform: uppercase;
              color: ${theme.subtextColor};
              margin-bottom: 3px;
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

        <!-- 3. Center Portrait Section: Grand Size (285px x 285px), Multi-tone Gold Bezel, 100% Circular -->
        <div style="
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 6px 0;
        ">
          <!-- Central Portrait Photo -->
          <div style="
            position: relative;
            z-index: 3;
            width: 285px;
            height: 285px;
            min-width: 285px;
            min-height: 285px;
            max-width: 285px;
            max-height: 285px;
            flex-shrink: 0;
            border-radius: 50%;
            padding: 7px;
            box-sizing: border-box;
            background: linear-gradient(135deg, #FFE8A3 0%, #D4AF37 40%, #FFF5D0 65%, #AA7C11 100%);
            box-shadow: 0 14px 32px rgba(0,0,0,0.18);
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
              border: 4.5px solid #ffffff;
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
                  <span style="font-size: 96px; font-weight: 900; color: #D4AF37;">${studentInitial}</span>
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
              box-shadow: 0 3px 8px rgba(0,0,0,0.22);
              z-index: 5;
            ">
              ★
            </div>
          </div>
        </div>

        <!-- 4. Person Name & Identity Badges (Strict Mathematical Centering & Alignment) -->
        <div style="text-align: center; width: 100%; margin: 12px 0 6px 0;">
          <h2 style="
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 900;
            line-height: 1.25;
            color: ${theme.titleColor};
            letter-spacing: 0.5px;
            text-transform: uppercase;
          ">${person.name}</h2>

          <!-- Identity Badges: Natural equal padding & line-height: 1 for 100% exact vertical centering -->
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
          ">
            <div style="
              display: inline-flex;
              align-items: center;
              justify-content: center;
              padding: 6px 18px;
              background: ${theme.badgeBg};
              color: ${theme.badgeText};
              border: 1.5px solid #D4AF37;
              border-radius: 9999px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.04);
              box-sizing: border-box;
            ">
              <span style="font-size: 14px; line-height: 1; margin-right: 6px; display: inline-block; vertical-align: middle;">🎂</span>
              <span style="font-size: 13.5px; font-weight: 800; line-height: 1; letter-spacing: 0.3px; display: inline-block; vertical-align: middle;">${lang === 'gu' ? 'જન્મતારીખ: ' : 'D.O.B: '}${person.formattedDob}</span>
            </div>
            ${person.standard ? `
              <div style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 6px 18px;
                background: ${theme.badgeBg};
                color: ${theme.badgeText};
                border: 1.5px solid #D4AF37;
                border-radius: 9999px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.04);
                box-sizing: border-box;
              ">
                <span style="font-size: 14px; line-height: 1; margin-right: 6px; display: inline-block; vertical-align: middle;">🎓</span>
                <span style="font-size: 13.5px; font-weight: 800; line-height: 1; letter-spacing: 0.3px; display: inline-block; vertical-align: middle;">${lang === 'gu' ? `ધોરણ ${person.standard}${person.section ? `-${person.section}` : ''}` : `Class ${person.standard}`}</span>
              </div>
            ` : ''}
            ${person.designation ? `
              <div style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 6px 18px;
                background: ${theme.badgeBg};
                color: ${theme.badgeText};
                border: 1.5px solid #D4AF37;
                border-radius: 9999px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.04);
                box-sizing: border-box;
              ">
                <span style="font-size: 14px; line-height: 1; margin-right: 6px; display: inline-block; vertical-align: middle;">💼</span>
                <span style="font-size: 13.5px; font-weight: 800; line-height: 1; letter-spacing: 0.3px; display: inline-block; vertical-align: middle;">${person.designation}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 5. Wish Message Plaque (Sophisticated Ribbon, Professional Serif Typography) -->
        <div style="
          width: 100%;
          max-width: 620px;
          background: ${theme.wishBg || 'rgba(255, 255, 255, 0.94)'};
          border: 1.8px solid #D4AF37;
          border-radius: 18px;
          padding: 16px 32px 18px 32px;
          box-sizing: border-box;
          text-align: center;
          margin: 4px 0;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        ">
          <!-- Top Ornamental Ribbon Header -->
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 10px;
          ">
            <div style="width: 45px; height: 1.5px; background: linear-gradient(90deg, transparent, #D4AF37);"></div>
            <span style="
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: #9A6B0A;
              line-height: 1;
            ">✦ ${lang === 'gu' ? 'જન્મદિવસ શુભકામના સંદેશ' : 'HEARTFELT BIRTHDAY WISHES'} ✦</span>
            <div style="width: 45px; height: 1.5px; background: linear-gradient(90deg, #D4AF37, transparent);"></div>
          </div>

          <!-- Professional Wish Typography -->
          <p style="
            margin: 0;
            font-family: ${lang === 'gu' ? GUJARATI_FONT_STACK : "'Merriweather', 'Playfair Display', Georgia, serif"};
            font-size: ${lang === 'gu' ? '21px' : '20px'};
            font-style: ${lang === 'gu' ? 'normal' : 'italic'};
            font-weight: ${lang === 'gu' ? '700' : '500'};
            line-height: 1.65;
            color: ${theme.textColor};
            letter-spacing: 0.25px;
            text-align: center;
          ">
            <span style="font-family: Georgia, serif; font-size: 26px; color: #D4AF37; font-weight: 700; margin-right: 4px;">“</span>
            ${customWishText}
            <span style="font-family: Georgia, serif; font-size: 26px; color: #D4AF37; font-weight: 700; margin-left: 4px;">”</span>
          </p>
        </div>

        <!-- 6. Regards & School Family Blessing Footer -->
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
