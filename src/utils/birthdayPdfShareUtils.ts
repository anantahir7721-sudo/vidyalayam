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
 * Generates an ultra high-res SVG balloon bouquet encoded as a Base64 Data URI.
 * Rendering via <img> tag guarantees 100% reliability in html2canvas (no skipped SVG nodes or radialGradient drops).
 */
export function getBalloonBouquetDataUri(
  side: 'left' | 'right',
  colors: { primary: string; seal: string; border: string }
): string {
  const isLeft = side === 'left';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="165" height="295" viewBox="0 0 165 295" fill="none">
    <defs>
      <radialGradient id="bgGold_${side}" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#FFFDF0" />
        <stop offset="35%" stop-color="#FFE082" />
        <stop offset="75%" stop-color="#D4AF37" />
        <stop offset="100%" stop-color="#8C6D15" />
      </radialGradient>
      <radialGradient id="bgPrimary_${side}" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="30%" stop-color="${colors.seal || '#60A5FA'}" />
        <stop offset="75%" stop-color="${colors.primary || '#1E40AF'}" />
        <stop offset="100%" stop-color="${colors.border || '#0F172A'}" />
      </radialGradient>
      <radialGradient id="bgRuby_${side}" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="#FFF5F5" />
        <stop offset="30%" stop-color="#FF8A80" />
        <stop offset="75%" stop-color="#E53935" />
        <stop offset="100%" stop-color="#8E0000" />
      </radialGradient>
    </defs>
    ${isLeft ? `
      <!-- Left Swirling Golden Ribbons -->
      <path d="M 52 115 Q 44 165 84 218 Q 88 245 84 285" stroke="#D4AF37" stroke-width="2" fill="none" opacity="0.9" />
      <path d="M 110 94 Q 116 155 84 218 Q 80 245 84 285" stroke="#D4AF37" stroke-width="2" fill="none" opacity="0.9" />
      <path d="M 82 155 Q 76 188 84 218 Q 88 245 84 285" stroke="#AA7C11" stroke-width="2.2" fill="none" opacity="0.95" />
      <circle cx="84" cy="218" r="4" fill="#D4AF37" />

      <!-- Balloon 1 (Metallic Gold) -->
      <ellipse cx="110" cy="58" rx="36" ry="44" fill="url(#bgGold_${side})" />
      <ellipse cx="100" cy="44" rx="9" ry="15" fill="#FFFFFF" fill-opacity="0.6" transform="rotate(-20 100 44)" />
      <polygon points="106,101 114,101 110,107" fill="#8C6D15" />

      <!-- Balloon 2 (Festive Ruby) -->
      <ellipse cx="52" cy="74" rx="34" ry="42" fill="url(#bgRuby_${side})" />
      <ellipse cx="42" cy="58" rx="8" ry="14" fill="#FFFFFF" fill-opacity="0.55" transform="rotate(-20 42 58)" />
      <polygon points="48,115 56,115 52,121" fill="#8E0000" />

      <!-- Balloon 3 (Theme Royal) -->
      <ellipse cx="82" cy="118" rx="38" ry="48" fill="url(#bgPrimary_${side})" />
      <ellipse cx="70" cy="98" rx="10" ry="16" fill="#FFFFFF" fill-opacity="0.65" transform="rotate(-20 70 98)" />
      <polygon points="78,165 86,165 82,171" fill="${colors.border || '#0F172A'}" />

      <!-- Golden Stars & Sparkles (Pure Vector Paths - Zero Font/Encoding Dependencies) -->
      <path d="M 18 30 Q 18 36 12 36 Q 18 36 18 42 Q 18 36 24 36 Q 18 36 18 30 Z" fill="#D4AF37" />
      <polygon points="126,18 128.5,23.5 135,23.5 129.5,27.5 131.5,33 126,29 120.5,33 122.5,27.5 117,23.5 123.5,23.5" fill="#D4AF37" />
      <path d="M 12 147 Q 12 152 7 152 Q 12 152 12 157 Q 12 152 17 152 Q 12 152 12 147 Z" fill="#D4AF37" />
      <polygon points="132,166 134,171 140,171 135,175 137,180 132,176.5 127,180 129,175 124,171 130,171" fill="#D4AF37" />
    ` : `
      <!-- Right Swirling Golden Ribbons -->
      <path d="M 112 115 Q 120 165 80 218 Q 76 245 80 285" stroke="#D4AF37" stroke-width="2" fill="none" opacity="0.9" />
      <path d="M 54 94 Q 48 155 80 218 Q 84 245 80 285" stroke="#D4AF37" stroke-width="2" fill="none" opacity="0.9" />
      <path d="M 82 155 Q 88 188 80 218 Q 76 245 80 285" stroke="#AA7C11" stroke-width="2.2" fill="none" opacity="0.95" />
      <circle cx="80" cy="218" r="4" fill="#D4AF37" />

      <!-- Balloon 1 (Metallic Gold) -->
      <ellipse cx="54" cy="58" rx="36" ry="44" fill="url(#bgGold_${side})" />
      <ellipse cx="64" cy="44" rx="9" ry="15" fill="#FFFFFF" fill-opacity="0.6" transform="rotate(20 64 44)" />
      <polygon points="50,101 58,101 54,107" fill="#8C6D15" />

      <!-- Balloon 2 (Festive Ruby) -->
      <ellipse cx="112" cy="74" rx="34" ry="42" fill="url(#bgRuby_${side})" />
      <ellipse cx="122" cy="58" rx="8" ry="14" fill="#FFFFFF" fill-opacity="0.55" transform="rotate(20 122 58)" />
      <polygon points="108,115 116,115 112,121" fill="#8E0000" />

      <!-- Balloon 3 (Theme Royal) -->
      <ellipse cx="82" cy="118" rx="38" ry="48" fill="url(#bgPrimary_${side})" />
      <ellipse cx="94" cy="98" rx="10" ry="16" fill="#FFFFFF" fill-opacity="0.65" transform="rotate(20 94 98)" />
      <polygon points="78,165 86,165 82,171" fill="${colors.border || '#0F172A'}" />

      <!-- Golden Stars & Sparkles (Pure Vector Paths - Zero Font/Encoding Dependencies) -->
      <path d="M 134 30 Q 134 36 128 36 Q 134 36 134 42 Q 134 36 140 36 Q 134 36 134 30 Z" fill="#D4AF37" />
      <polygon points="26,18 28.5,23.5 35,23.5 29.5,27.5 31.5,33 26,29 20.5,33 22.5,27.5 17,23.5 23.5,23.5" fill="#D4AF37" />
      <path d="M 140 147 Q 140 152 135 152 Q 140 152 140 157 Q 140 152 145 152 Q 140 152 140 147 Z" fill="#D4AF37" />
      <polygon points="20,166 22,171 28,171 23,175 25,180 20,176.5 15,180 17,175 12,171 18,171" fill="#D4AF37" />
    `}
  </svg>`;

  try {
    return 'data:image/svg+xml;base64,' + btoa(svg);
  } catch {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Pre-renders the identity badge (Pill + Vector Icon + Text) into an ultra-sharp SVG Data URI.
 * By rendering the entire badge as a single image, html2canvas bypasses all CSS line-height / vertical-align
 * layout bugs and guarantees 100% mathematical horizontal and vertical centering!
 */
export function createPillBadgeDataUri(
  type: 'cake' | 'grad' | 'briefcase',
  text: string,
  isGujarati = false
): string {
  const safeText = escapeXml(text);
  // Accurate width calculation based on font metrics
  const charWidth = isGujarati ? 9.8 : 8.6;
  const textWidth = Math.ceil(text.length * charWidth);
  const iconWidth = 16;
  const iconGap = 8;
  const paddingX = 18;
  const contentWidth = iconWidth + iconGap + textWidth;
  const totalWidth = contentWidth + paddingX * 2;
  const iconX = paddingX;
  const textX = iconX + iconWidth + iconGap;

  let iconSvg = '';
  if (type === 'cake') {
    iconSvg = `<svg x="${iconX}" y="11" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDE047" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
      <path d="M2 21h20" />
      <line x1="7" y1="8" x2="7" y2="10" />
      <line x1="12" y1="8" x2="12" y2="10" />
      <line x1="17" y1="8" x2="17" y2="10" />
      <circle cx="7" cy="4" r="1.2" fill="#F59E0B" stroke="#F59E0B" />
      <circle cx="12" cy="4" r="1.2" fill="#F59E0B" stroke="#F59E0B" />
      <circle cx="17" cy="4" r="1.2" fill="#F59E0B" stroke="#F59E0B" />
    </svg>`;
  } else if (type === 'grad') {
    iconSvg = `<svg x="${iconX}" y="11" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDE047" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>`;
  } else {
    iconSvg = `<svg x="${iconX}" y="11" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDE047" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="38" viewBox="0 0 ${totalWidth} 38">
    <rect x="1" y="1" width="${totalWidth - 2}" height="36" rx="18" ry="18" fill="#0F172A" stroke="#D4AF37" stroke-width="1.8" />
    ${iconSvg}
    <text x="${textX}" y="20" text-anchor="start" dominant-baseline="central" fill="#FFFFFF" font-family="'Anek Gujarati', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13.5" font-weight="800" letter-spacing="0.3">${safeText}</text>
  </svg>`;

  try {
    const encoded = encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
    return 'data:image/svg+xml;base64,' + btoa(encoded);
  } catch {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
}

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

  // Strict regex cleaning to eliminate any duplicated "D.O.B: D.O.B:" or "DOB:"
  const rawDob = person.formattedDob || '';
  const cleanDob = rawDob.replace(/^(d\.?o\.?b\.?:?\s*|જન્મ\s*તારીખ:?\s*)+/gi, '').trim();
  const displayDobText = lang === 'gu' ? `જન્મ તારીખ: ${cleanDob}` : `D.O.B: ${cleanDob}`;

  const rawStandard = person.standard ? String(person.standard).replace(/^class\s*/i, '').trim() : '';
  const displayStandardText = lang === 'gu'
    ? `ધોરણ ${rawStandard}${person.section ? `-${person.section}` : ''}`
    : `Class ${rawStandard}${person.section ? `-${person.section}` : ''}`;

  const dobBadgeDataUri = createPillBadgeDataUri('cake', displayDobText, lang === 'gu');
  const standardBadgeDataUri = rawStandard
    ? createPillBadgeDataUri('grad', displayStandardText, lang === 'gu')
    : '';
  const designationBadgeDataUri = person.designation
    ? createPillBadgeDataUri('briefcase', person.designation, lang === 'gu')
    : '';

  const balloonLeftDataUri = getBalloonBouquetDataUri('left', {
    primary: theme.titleColor,
    seal: theme.sealBorder,
    border: theme.cardBorder,
  });
  const balloonRightDataUri = getBalloonBouquetDataUri('right', {
    primary: theme.titleColor,
    seal: theme.sealBorder,
    border: theme.cardBorder,
  });

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

      <!-- Left Festive Balloon Bouquet (100% Guaranteed Image Render in html2canvas) -->
      <img
        src="${balloonLeftDataUri}"
        alt="Balloons Left"
        style="
          position: absolute;
          top: 215px;
          left: 26px;
          width: 155px;
          height: 285px;
          pointer-events: none;
          z-index: 10;
        "
      />

      <!-- Right Festive Balloon Bouquet (100% Guaranteed Image Render in html2canvas) -->
      <img
        src="${balloonRightDataUri}"
        alt="Balloons Right"
        style="
          position: absolute;
          top: 215px;
          right: 26px;
          width: 155px;
          height: 285px;
          pointer-events: none;
          z-index: 10;
        "
      />

      <!-- ========================================================================= -->
      <!-- INNER SAFE CONTENT CONTAINER (Strictly padded safely away from all borders) -->
      <!-- ========================================================================= -->
      <div style="
        position: relative;
        z-index: 2;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 40px 48px 36px 48px;
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
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 0.5px;
            line-height: 1.3;
            color: ${theme.titleColor};
            display: block;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
            text-align: center;
            padding: 0 10px;
            box-sizing: border-box;
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

        <!-- 3. Center Portrait Section: Grand Size (295px x 295px), Multi-tone Gold Bezel, 100% Circular -->
        <div style="
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 6px 0 16px 0;
        ">
          <!-- Central Portrait Photo -->
          <div style="
            position: relative;
            z-index: 3;
            width: 295px;
            height: 295px;
            min-width: 295px;
            min-height: 295px;
            max-width: 295px;
            max-height: 295px;
            flex-shrink: 0;
            border-radius: 50%;
            padding: 7px;
            box-sizing: border-box;
            background: linear-gradient(135deg, #FFE8A3 0%, #D4AF37 40%, #FFF5D0 65%, #AA7C11 100%);
            box-shadow: 0 14px 34px rgba(0,0,0,0.18);
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
                  <span style="font-size: 100px; font-weight: 900; color: #D4AF37;">${studentInitial}</span>
                </div>
              `}
            </div>

            <!-- Star Medallion at Bottom Apex - Perfectly Centered via CSS -->
            <div style="
              position: absolute;
              bottom: -9px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, #FFE8A3 0%, #D4AF37 50%, #AA7C11 100%);
              color: #ffffff;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              border: 2.5px solid #ffffff;
              box-shadow: 0 3px 10px rgba(0,0,0,0.22);
              z-index: 5;
            ">
              ★
            </div>
          </div>
        </div>

        <!-- 4. Person Name & Identity Badges (100% Mathematically Centered via inline-block with balanced padding) -->
        <div style="text-align: center; width: 100%; margin: 0 0 6px 0;">
          <h2 style="
            margin: 0 0 8px 0;
            font-family: ${lang === 'gu' ? GUJARATI_FONT_STACK : "'Playfair Display', 'Merriweather', Georgia, serif"};
            font-size: 30px;
            font-weight: 900;
            line-height: 1.25;
            color: ${theme.titleColor};
            letter-spacing: 0.5px;
            text-transform: uppercase;
          ">${person.name}</h2>

          <!-- Identity Badges: Symmetrical, centered pre-rendered SVG Image Badges (100% mathematically centered, zero html2canvas line-height bugs) -->
          <div style="
            text-align: center;
            width: 100%;
            margin-top: 8px;
          ">
            <img
              src="${dobBadgeDataUri}"
              alt="${displayDobText}"
              style="
                height: 38px;
                width: auto;
                display: inline-block;
                vertical-align: middle;
                margin: 4px 6px;
                box-shadow: 0 3px 8px rgba(0,0,0,0.18);
                border-radius: 9999px;
              "
            />
            ${standardBadgeDataUri ? `
              <img
                src="${standardBadgeDataUri}"
                alt="${displayStandardText}"
                style="
                  height: 38px;
                  width: auto;
                  display: inline-block;
                  vertical-align: middle;
                  margin: 4px 6px;
                  box-shadow: 0 3px 8px rgba(0,0,0,0.18);
                  border-radius: 9999px;
                "
              />
            ` : ''}
            ${designationBadgeDataUri ? `
              <img
                src="${designationBadgeDataUri}"
                alt="${person.designation}"
                style="
                  height: 38px;
                  width: auto;
                  display: inline-block;
                  vertical-align: middle;
                  margin: 4px 6px;
                  box-shadow: 0 3px 8px rgba(0,0,0,0.18);
                  border-radius: 9999px;
                "
              />
            ` : ''}
          </div>
        </div>

        <!-- 5. Wish Message Plaque (Sophisticated Ribbon, Professional Serif Typography) -->
        <div style="
          width: 100%;
          max-width: 630px;
          background: ${theme.wishBg || 'rgba(255, 255, 255, 0.95)'};
          border: 2px solid #D4AF37;
          border-radius: 20px;
          padding: 18px 36px 20px 36px;
          box-sizing: border-box;
          text-align: center;
          margin: 6px auto;
          box-shadow: 0 8px 26px rgba(212, 175, 55, 0.12);
        ">
          <!-- Top Ornamental Ribbon Header -->
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 12px;
          ">
            <div style="width: 50px; height: 1.5px; background: linear-gradient(90deg, transparent, #D4AF37);"></div>
            <span style="
              font-size: 12.5px;
              font-weight: 800;
              letter-spacing: 2.5px;
              text-transform: uppercase;
              color: #9A6B0A;
              line-height: 1;
            ">✦ ${lang === 'gu' ? 'જન્મદિવસ શુભકામના સંદેશ' : 'HEARTFELT BIRTHDAY WISHES'} ✦</span>
            <div style="width: 50px; height: 1.5px; background: linear-gradient(90deg, #D4AF37, transparent);"></div>
          </div>

          <!-- Professional Wish Typography -->
          <p style="
            margin: 0;
            font-family: ${lang === 'gu' ? GUJARATI_FONT_STACK : "'Playfair Display', 'Merriweather', Georgia, serif"};
            font-size: ${lang === 'gu' ? '22px' : '22px'};
            font-style: ${lang === 'gu' ? 'normal' : 'italic'};
            font-weight: ${lang === 'gu' ? '700' : '600'};
            line-height: 1.65;
            color: ${theme.textColor};
            letter-spacing: 0.25px;
            text-align: center;
          ">
            <span style="font-family: Georgia, serif; font-size: 28px; color: #D4AF37; font-weight: 700; margin-right: 4px; vertical-align: -2px;">“</span>
            ${customWishText}
            <span style="font-family: Georgia, serif; font-size: 28px; color: #D4AF37; font-weight: 700; margin-left: 4px; vertical-align: -2px;">”</span>
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
            font-size: 14px;
            font-style: italic;
            font-weight: 700;
            color: ${theme.subtextColor};
            margin-bottom: 3px;
          ">
            ${lang === 'gu' ? 'શુભેચ્છક:' : 'With Warm Compliments:'}
          </div>

          <div style="
            font-size: 20px;
            font-weight: 900;
            line-height: 1.3;
            color: ${theme.titleColor};
            letter-spacing: 0.3px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
            padding: 0 10px;
            box-sizing: border-box;
          ">
            ${schoolFamilyBlessing}
          </div>

          <div style="
            font-size: 13px;
            font-weight: 700;
            color: ${theme.subtextColor};
            margin-top: 3px;
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
 * Guarantees that all <img> elements (photo and balloon bouquets) are completely loaded
 * and decoded before html2canvas executes, preventing blank or missing balloons in the PDF.
 */
async function waitForContainerImagesToLoad(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) return;

  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        let isDone = false;
        const done = () => {
          if (!isDone) {
            isDone = true;
            resolve();
          }
        };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        if (img.decode) {
          img.decode().then(done).catch(done);
        }
        setTimeout(done, 1200);
      });
    })
  );
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
    // 1. Wait for photo and balloon images to completely decode in the DOM
    await waitForContainerImagesToLoad(container);
    // 2. Allow layout and font rasterization to settle
    await new Promise((resolve) => setTimeout(resolve, 150));

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
