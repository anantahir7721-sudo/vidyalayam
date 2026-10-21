import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { downloadPdfFile, sharePdfFile, downloadOrSharePdf } from './printAndPdfUtils';
import {
  DailyNewsBulletin,
  DailyJanvaJevuBulletin,
  DailySuvicharBulletin,
  DailyInterestingFactsBulletin,
  DailyAbhivyaktiBulletin,
  DailyAbhivyaktiIdea,
} from '../types';
import { toGujaratiDigits } from '../services/dailyKnowledgeService';

export interface ShareOptions {
  schoolName: string;
  diseCode?: string;
  district?: string;
  mode?: 'share' | 'download';
}

export interface ShareResult {
  success: boolean;
  method: 'native_share' | 'whatsapp_web' | 'downloaded' | 'android_native_share' | 'android_native_download' | 'browser_download' | string;
  fileName: string;
  message?: string;
}

// Universal safe Gujarati font stack - user requested Anek Gujarati only
export const GUJARATI_FONT_FAMILY =
  "'Anek Gujarati', 'Gujarati Sangam MN', 'Shruti', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/**
 * Standard html2canvas options to guarantee ZERO scroll shifting, perfect 1:1 scale, and crisp font rendering.
 * Forces scrollX: 0, scrollY: 0, x: 0, y: 0 to prevent the notorious scrolled-down downward displacement bug.
 */
const HTML2CANVAS_PDF_OPTIONS = {
  scale: 2,
  useCORS: true,
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
  onclone: (clonedDoc: Document) => {
    const el = clonedDoc.getElementById('vidyalayam_pdf_render_container');
    if (el) {
      el.style.position = 'absolute';
      el.style.top = '0px';
      el.style.left = '0px';
      el.style.margin = '0px';
    }
  },
};

/**
 * Ensures browser fonts are loaded before capturing via html2canvas.
 * This completely prevents scrambled/crooked/misaligned fonts ("ada avda font/dont").
 */
async function waitForFontsToRender(): Promise<void> {
  try {
    if (document.fonts) {
      await Promise.allSettled([
        document.fonts.load('300 14px "Anek Gujarati"'),
        document.fonts.load('400 14px "Anek Gujarati"'),
        document.fonts.load('500 14px "Anek Gujarati"'),
        document.fonts.load('600 14px "Anek Gujarati"'),
        document.fonts.load('700 14px "Anek Gujarati"'),
        document.fonts.load('800 14px "Anek Gujarati"'),
      ]);
      if (document.fonts.ready) {
        await document.fonts.ready;
      }
    }
  } catch (e) {
    // Ignore font loading errors and proceed
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
 * Generates an SVG Data URI for small numeral/symbol badges.
 * Rendering via an <img> tag completely bypasses html2canvas flexbox baseline &
 * vertical-align bugs, ensuring 100% mathematical horizontal and vertical centering!
 */
export function createNumberBadgeDataUri(
  text: string,
  bgColor: string,
  textColor = '#ffffff',
  size = 24,
  borderRadius = 6
): string {
  const safeText = escapeXml(text);
  const half = size / 2;
  const fontSize = Math.round(size * 0.48);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${borderRadius}" ry="${borderRadius}" fill="${bgColor}" />
    <text x="${half}" y="${half}" text-anchor="middle" dominant-baseline="central" fill="${textColor}" font-family="'Anek Gujarati', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" font-weight="800">${safeText}</text>
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
 * Helper to download/share Blob securely on Web and Android APK
 */
function downloadBlob(blob: Blob, filename: string) {
  downloadOrSharePdf(blob, filename);
}

/**
 * 1-PAGE A4 DAILY NEWS PDF:
 * Strict user requirements:
 * - EXACTLY 1 PAGE
 * - ONLY Headlines and Context (Summary)
 * - NO category/region tags ("Kachchh", "Gujarat", "India", "World", etc.)
 * - Clean School Header, Date, Shloka/Suvichar, and 10 points
 * - Clean, non-distorted fonts and formatting
 */
export async function shareDailyNewsAsPdf(
  bulletin: DailyNewsBulletin,
  options: ShareOptions
): Promise<ShareResult> {
  const schoolName = options.schoolName || 'શાળા શૈક્ષણિક પોર્ટલ';
  const hasCustomSchool = options.schoolName && options.schoolName !== 'શાળા શૈક્ષણિક પોર્ટલ';
  const cleanSchool = hasCustomSchool
    ? options.schoolName.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_')
    : '';
  const fileName = cleanSchool
    ? `${cleanSchool}_આજના_મુખ્ય_સમાચાર_${bulletin.dateKey}.pdf`
    : `આજના_મુખ્ય_સમાચાર_${bulletin.dateKey}.pdf`;

  await waitForFontsToRender();

  // Standard A4 dimensions at 96 DPI: 794px width x 1120px height
  const container = document.createElement('div');
  container.id = 'vidyalayam_pdf_render_container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.width = '794px';
  container.style.height = '1120px';
  container.style.maxHeight = '1120px';
  container.style.overflow = 'hidden';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = GUJARATI_FONT_FAMILY;
  container.style.letterSpacing = '0px';
  container.style.lineHeight = '1.3';
  container.style.padding = '18px 22px';
  container.style.boxSizing = 'border-box';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';
  container.style.textRendering = 'geometricPrecision';
  (container.style as any).webkitFontSmoothing = 'antialiased';

  container.innerHTML = `
    <div style="border: 2px solid #9d512d; border-radius: 10px; padding: 14px 18px; background: #ffffff; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- School Header -->
      <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
        <h1 style="font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 3px 0; line-height: 1.25; font-family: ${GUJARATI_FONT_FAMILY};">
          ${schoolName}
        </h1>
        <div style="font-size: 11px; color: #64748b; font-weight: 600; line-height: 1.3; font-family: ${GUJARATI_FONT_FAMILY};">
          ${options.diseCode ? `DISE કોડ: ${options.diseCode} • ` : ''}${options.district ? `${options.district} જિલ્લો, ગુજરાત • ` : ''}દૈનિક સમાચાર બુલેટિન
        </div>
      </div>

      <!-- Title & Date Strip (Table layout ensures 100% mathematical vertical centering in html2canvas) -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; background: #9d512d; border-radius: 6px; margin-bottom: 8px;">
        <tr>
          <td style="padding: 7px 12px; vertical-align: middle; text-align: left;">
            <div style="font-size: 13.5px; font-weight: 800; color: #ffffff; line-height: 1.25; font-family: ${GUJARATI_FONT_FAMILY}; margin: 0; padding: 0;">
              📰 આજના મુખ્ય ૧૦ સમાચાર (Daily News Bulletin)
            </div>
          </td>
          <td style="padding: 7px 12px; vertical-align: middle; text-align: right; white-space: nowrap; width: 1%;">
            <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #ffffff; background: rgba(0,0,0,0.25); padding: 3px 9px; border-radius: 4px; line-height: 1.2; font-family: ${GUJARATI_FONT_FAMILY};">
              ${bulletin.editionDate} • સવારે ૫:૦૦ વાગ્યાની આવૃત્તિ
            </span>
          </td>
        </tr>
      </table>

      <!-- Morning Prayer Shloka / Suvichar -->
      ${
        bulletin.morningPrayerShloka
          ? `
        <div style="background: #fdfaf6; border-left: 3.5px solid #9d512d; padding: 6px 10px; margin-bottom: 8px; border-radius: 4px; line-height: 1.35; box-sizing: border-box;">
          <span style="font-size: 10.5px; font-weight: 800; color: #9d512d; font-family: ${GUJARATI_FONT_FAMILY};">✨ પ્રાર્થના મંત્ર / સુવિચાર: </span>
          <span style="font-size: 11.5px; font-weight: 600; color: #334155; font-style: italic; font-family: ${GUJARATI_FONT_FAMILY};">
            ${bulletin.morningPrayerShloka}
          </span>
        </div>
      `
          : ''
      }

      <!-- 10 News Items: ONLY Headlines and Context (Summary), NO Category/Region Tags -->
      <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; justify-content: center; margin: 4px 0;">
        ${bulletin.items
          .slice(0, 10)
          .map((item, idx) => {
            return `
            <div style="padding: 4px 10px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; display: table; width: 100%; min-height: 48px;">
              <div style="display: table-row;">
                <div style="display: table-cell; vertical-align: middle; width: 24px; padding-right: 10px;">
                  <img
                    src="${createNumberBadgeDataUri(toGujaratiDigits(idx + 1), '#9d512d', '#ffffff', 24, 6)}"
                    width="24"
                    height="24"
                    style="width: 24px; height: 24px; display: block;"
                    alt="${idx + 1}"
                  />
                </div>
                <div style="display: table-cell; vertical-align: middle;">
                  <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.3; margin: 0 0 2px 0; font-family: ${GUJARATI_FONT_FAMILY};">
                    ${item.location ? `<span style="color: #9d512d; font-weight: 800;">[📍 ${item.location}] </span>` : ''}${item.headline}
                  </div>
                  <div style="font-size: 9.5px; color: #475569; line-height: 1.3; margin: 0; font-family: ${GUJARATI_FONT_FAMILY};">
                    ${item.summary}
                  </div>
                </div>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>

      <!-- Footer Note -->
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #64748b; line-height: 1.2; font-family: ${GUJARATI_FONT_FAMILY};">
        <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • શાળા પ્રાર્થના સંમેલન સેવા</span>
        <span>${bulletin.editionDate}</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, HTML2CANVAS_PDF_OPTIONS);

    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Exactly 1 single page
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    const pdfBlob = pdf.output('blob');

    // 1. If explicit download mode was requested, save directly to Downloads without WhatsApp prompt
    if (options.mode === 'download') {
      await downloadPdfFile(pdfBlob, fileName);
      return { success: true, method: 'downloaded', fileName };
    }

    // 2. Share mode: Try native file share or WhatsApp
    const shareText = `📰 *${schoolName}*\nઆજના મુખ્ય ૧૦ સમાચાર (${bulletin.editionDate})\nપીડીએફ ફાઇલ મોકલેલ છે.`;
    const shareRes = await sharePdfFile(pdfBlob, fileName, `${schoolName} — આજના સમાચાર (${bulletin.editionDate})`, shareText);
    if (shareRes.success) {
      return { success: true, method: shareRes.method, fileName };
    }

    // WhatsApp text link fallback
    const sampleHighlights = bulletin.items.slice(0, 3).map((item) => `• ${item.headline}`).join('\n');
    const waText = encodeURIComponent(
      `📰 *${schoolName}*\n` +
      `*આજના ૧૦ મુખ્ય સમાચાર* (${bulletin.editionDate})\n\n` +
      `${sampleHighlights}\n\n` +
      `📎 *નોંધ:* આ બુલેટિનની 1-Page PDF ફાઇલ આપના ડિવાઇસમાં *"${fileName}"* નામથી સેવ થઈ ગઈ છે. આપ તેને ગ્રૂપમાં મોકલી શકો છો.\n` +
      `✨ સૌજન્ય: વિદ્યાલયમ શૈક્ષણિક પોર્ટલ`
    );
    window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
    return { success: true, method: 'whatsapp_web', fileName };
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    console.error('Error generating news PDF:', err);
    throw err;
  }
}

/**
 * 1-PAGE A4 DAILY JANVA JEVU PDF:
 * Strict user requirements:
 * - EXACTLY 1 PAGE
 * - QUESTION then ANSWER
 * - ANSWER MUST BE STRICTLY 1 SINGLE WORD (ખાલી એક શબ્દ જ, બીજું કંઈ નહિ)
 * - Questions with 1-word answer only
 * - 2-Column Balanced Grid so 20 questions fit cleanly with ZERO overlapping / jumbling ("ada avda")
 * - School Name, Date, Suvichar, 20 questions
 */
export async function shareDailyJanvaJevuAsPdf(
  bulletin: DailyJanvaJevuBulletin,
  options: ShareOptions
): Promise<ShareResult> {
  const schoolName = options.schoolName || 'શાળા શૈક્ષણિક પોર્ટલ';
  const hasCustomSchool = options.schoolName && options.schoolName !== 'શાળા શૈક્ષણિક પોર્ટલ';
  const cleanSchool = hasCustomSchool
    ? options.schoolName.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_')
    : '';
  const fileName = cleanSchool
    ? `${cleanSchool}_દૈનિક_પ્રશ્નોત્તરી_${bulletin.dateKey}.pdf`
    : `દૈનિક_પ્રશ્નોત્તરી_${bulletin.dateKey}.pdf`;

  // Helper to extract strictly 1 clean single word from answer
  const cleanOneWord = (ans: string): string => {
    if (!ans) return '';
    let clean = ans.replace(/\(.*?\)/g, '').trim();
    clean = clean.replace(/^જવાબ[:\s]*/i, '').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    return words[0] || clean;
  };

  await waitForFontsToRender();

  // Split into 2 columns of 10 items for balanced layout
  const col1 = bulletin.questions.slice(0, 10);
  const col2 = bulletin.questions.slice(10, 20);

  // Standard A4 dimensions at 96 DPI: 794px width x 1120px height
  const container = document.createElement('div');
  container.id = 'vidyalayam_pdf_render_container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.width = '794px';
  container.style.height = '1120px';
  container.style.maxHeight = '1120px';
  container.style.overflow = 'hidden';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = GUJARATI_FONT_FAMILY;
  container.style.letterSpacing = '0px';
  container.style.lineHeight = '1.3';
  container.style.padding = '18px 22px';
  container.style.boxSizing = 'border-box';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';
  container.style.textRendering = 'geometricPrecision';
  (container.style as any).webkitFontSmoothing = 'antialiased';

  const suvicharText =
    bulletin.suvichar ||
    'પરિશ્રમ એ જ સાચો પારસમણિ છે, જે સામાન્ય માનવીને પણ અસાધારણ સફળતા અપાવે છે.';

  const renderColumnItems = (items: typeof bulletin.questions, startIdx: number) => {
    return items
      .map((q, i) => {
        const idx = startIdx + i;
        const singleWordAnswer = cleanOneWord(q.answer);
        return `
        <div style="padding: 4px 8px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 7px; box-sizing: border-box; display: table; width: 100%; min-height: 39px;">
          <div style="display: table-row;">
            <div style="display: table-cell; vertical-align: middle; width: 22px; padding-right: 8px;">
              <img
                src="${createNumberBadgeDataUri(toGujaratiDigits(idx + 1), '#1e293b', '#ffffff', 22, 5)}"
                width="22"
                height="22"
                style="width: 22px; height: 22px; display: block;"
                alt="${idx + 1}"
              />
            </div>
            <div style="display: table-cell; vertical-align: middle;">
              <div style="font-size: 10.5px; font-weight: 700; color: #0f172a; line-height: 1.32; margin: 0 0 2px 0; font-family: ${GUJARATI_FONT_FAMILY};">
                ${q.question}
              </div>
              <div>
                <span style="display: inline-block; font-size: 9.5px; font-weight: 800; background: #dcfce7; color: #166534; padding: 1.5px 7px; border-radius: 3px; border: 1px solid #86efac; line-height: 1.25; font-family: ${GUJARATI_FONT_FAMILY};">
                  જવાબ: ${singleWordAnswer}
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  };

  container.innerHTML = `
    <div style="border: 2px solid #9d512d; border-radius: 10px; padding: 14px 18px; background: #ffffff; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- School Header -->
      <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
        <h1 style="font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 3px 0; line-height: 1.25; font-family: ${GUJARATI_FONT_FAMILY};">
          ${schoolName}
        </h1>
        <div style="font-size: 11px; color: #64748b; font-weight: 600; line-height: 1.3; font-family: ${GUJARATI_FONT_FAMILY};">
          ${options.diseCode ? `DISE કોડ: ${options.diseCode} • ` : ''}${options.district ? `${options.district} જિલ્લો, ગુજરાત • ` : ''}સામાન્ય જ્ઞાન બુલેટિન
        </div>
      </div>

      <!-- Title & Date Strip (Table layout ensures 100% mathematical vertical centering in html2canvas) -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; background: #1e293b; color: #ffffff; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #f59c73;">
        <tr>
          <td style="padding: 7px 12px; vertical-align: middle; text-align: left;">
            <div style="font-size: 13.5px; font-weight: 800; color: #ffffff; line-height: 1.25; font-family: ${GUJARATI_FONT_FAMILY}; margin: 0; padding: 0;">
              💡 આજનું જાણવા જેવું (૨૦ પ્રશ્નોત્તરી — એક શબ્દમાં જવાબ)
            </div>
          </td>
          <td style="padding: 7px 12px; vertical-align: middle; text-align: right; white-space: nowrap; width: 1%;">
            <span style="display: inline-block; font-size: 11.5px; font-weight: 700; color: #f59c73; line-height: 1.2; font-family: ${GUJARATI_FONT_FAMILY};">
              ${bulletin.editionDate} • બપોરે ૧:૦૦ વાગ્યાની આવૃત્તિ
            </span>
          </td>
        </tr>
      </table>

      <!-- Suvichar Strip -->
      <div style="background: #fdfaf6; border-left: 3.5px solid #f59c73; padding: 6px 10px; margin-bottom: 8px; border-radius: 4px; line-height: 1.35; box-sizing: border-box;">
        <span style="font-size: 10.5px; font-weight: 800; color: #9d512d; font-family: ${GUJARATI_FONT_FAMILY};">✨ આજનો સુવિચાર: </span>
        <span style="font-size: 11px; font-weight: 600; color: #1e293b; font-family: ${GUJARATI_FONT_FAMILY};">
          "${suvicharText}"
        </span>
      </div>

      <!-- 20 Questions: Clean 2-Column Side-by-Side Layout (1-10 on Left, 11-20 on Right) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex: 1; align-items: center; margin: 2px 0;">
        <div style="display: flex; flex-direction: column; gap: 5px; height: 100%; justify-content: center;">
          ${renderColumnItems(col1, 0)}
        </div>
        <div style="display: flex; flex-direction: column; gap: 5px; height: 100%; justify-content: center;">
          ${renderColumnItems(col2, 10)}
        </div>
      </div>

      <!-- Footer Note -->
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #64748b; line-height: 1.2; font-family: ${GUJARATI_FONT_FAMILY};">
        <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • સામાન્ય જ્ઞાન સેવા</span>
        <span>${bulletin.editionDate}</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, HTML2CANVAS_PDF_OPTIONS);

    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Exactly 1 single page
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    const pdfBlob = pdf.output('blob');

    // 1. If explicit download mode was requested, save directly to Downloads without WhatsApp prompt
    if (options.mode === 'download') {
      await downloadPdfFile(pdfBlob, fileName);
      return { success: true, method: 'downloaded', fileName };
    }

    // 2. Share mode: Try native file share or WhatsApp
    const shareText = `💡 *${schoolName}*\nઆજનું જાણવા જેવું — ૨૦ પ્રશ્નોત્તરી (${bulletin.editionDate})\nપીડીએફ ફાઇલ મોકલેલ છે.`;
    const shareRes = await sharePdfFile(pdfBlob, fileName, `${schoolName} — આજનું જાણવા જેવું (${bulletin.editionDate})`, shareText);
    if (shareRes.success) {
      return { success: true, method: shareRes.method, fileName };
    }

    // Fallback WhatsApp
    const waText = encodeURIComponent(
      `💡 *${schoolName}*\n` +
      `*આજનું જાણવા જેવું* (${bulletin.editionDate})\n\n` +
      `✨ *આજનો સુવિચાર:* "${suvicharText}"\n\n` +
      `📎 *નોંધ:* આ બુલેટિનની 1-Page PDF ફાઇલ આપના ડિવાઇસમાં *"${fileName}"* નામથી સેવ થઈ ગઈ છે. આપ તેને ગ્રૂપમાં મોકલી શકો છો.\n` +
      `✨ સૌજન્ય: વિદ્યાલયમ શૈક્ષણિક પોર્ટલ`
    );
    window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
    return { success: true, method: 'whatsapp_web', fileName };
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    console.error('Error generating janva jevu PDF:', err);
    throw err;
  }
}

/**
 * 1-PAGE A4 DAILY SUVICHAR PDF:
 * Strict user requirement:
 * - Heading: "Ajno suvichar"
 * - Great moral thought
 * - Short explanation (ટૂંકી સમજૂતી)
 * - Real-life example (ઉદાહરણ)
 * - School Name, Date, District, DISE Code
 * - Exactly 1 A4 Page with elegant formatting and no scrambled fonts
 */
export async function shareDailySuvicharAsPdf(
  bulletin: DailySuvicharBulletin,
  options: ShareOptions
): Promise<ShareResult> {
  const schoolName = options.schoolName || 'શાળા શૈક્ષણિક પોર્ટલ';
  const hasCustomSchool = options.schoolName && options.schoolName !== 'શાળા શૈક્ષણિક પોર્ટલ';
  const cleanSchool = hasCustomSchool
    ? options.schoolName.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_')
    : '';
  const fileName = cleanSchool
    ? `${cleanSchool}_આજનો_સુવિચાર_${bulletin.dateKey}.pdf`
    : `આજનો_સુવિચાર_${bulletin.dateKey}.pdf`;

  await waitForFontsToRender();

  const { thought, authorOrSource, explanation, example, moralValue, keyPoints } = bulletin.suvichar;

  // Calculate total characters to dynamically and intelligently size fonts
  const totalTextLength =
    (thought?.length || 0) +
    (explanation?.length || 0) +
    (example?.length || 0) +
    (keyPoints ? keyPoints.join('').length : 0);

  // Dynamic layout calculations so fonts are large, legible, and fill the A4 page without awkward whitespace
  let bodyFontSize = '15px';
  let bodyLineHeight = '1.65';
  let thoughtFontSize = '23px';
  let cardPadding = '14px 18px';
  let cardGap = '11px';
  let headingFontSize = '15.5px';

  if (totalTextLength > 1200) {
    bodyFontSize = '13.2px';
    bodyLineHeight = '1.52';
    thoughtFontSize = '19.5px';
    cardPadding = '10px 14px';
    cardGap = '8px';
    headingFontSize = '14px';
  } else if (totalTextLength > 950) {
    bodyFontSize = '14px';
    bodyLineHeight = '1.58';
    thoughtFontSize = '21px';
    cardPadding = '12px 16px';
    cardGap = '9px';
    headingFontSize = '14.5px';
  } else if (totalTextLength > 700) {
    bodyFontSize = '14.8px';
    bodyLineHeight = '1.64';
    thoughtFontSize = '23px';
    cardPadding = '14px 18px';
    cardGap = '10px';
    headingFontSize = '15.5px';
  } else {
    // Shorter text: larger fonts and generous line height to fill the page beautifully
    bodyFontSize = '16px';
    bodyLineHeight = '1.7';
    thoughtFontSize = '25px';
    cardPadding = '16px 20px';
    cardGap = '13px';
    headingFontSize = '16.5px';
  }

  // Standard A4 dimensions at 96 DPI: 794px width x 1120px height
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.width = '794px';
  container.style.height = '1120px';
  container.style.maxHeight = '1120px';
  container.style.overflow = 'hidden';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = GUJARATI_FONT_FAMILY;
  container.style.letterSpacing = '0px';
  container.style.lineHeight = '1.4';
  container.style.padding = '18px 20px';
  container.style.boxSizing = 'border-box';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';

  container.innerHTML = `
    <div style="border: 3px double #9d512d; outline: 1px solid #d97706; border-radius: 14px; padding: 14px 18px; background: #ffffff; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- School Header -->
      <div style="text-align: center; border-bottom: 2.5px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 4px;">
        <h1 style="font-size: 24px; font-weight: 900; color: #1e293b; margin: 0 0 3px 0; line-height: 1.25; font-family: ${GUJARATI_FONT_FAMILY}; letter-spacing: -0.2px;">
          ${schoolName}
        </h1>
        <div style="font-size: 12.5px; color: #64748b; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
          ${options.diseCode ? `<span>DISE કોડ: <strong style="color: #334155;">${options.diseCode}</strong></span> • ` : ''}
          ${options.district ? `<span>${options.district} જિલ્લો, ગુજરાત</span> • ` : ''}
          <span style="color: #9d512d; font-weight: 800;">શાળા પ્રાર્થના સંમેલન & પ્રેરણા વાણી</span>
        </div>
      </div>

      <!-- Title & Date Strip (Table layout ensures 100% mathematical vertical centering in html2canvas) -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; background: linear-gradient(135deg, #9d512d 0%, #c05d2c 50%, #7e3618 100%); color: #ffffff; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 2px 4px rgba(157, 81, 45, 0.15);">
        <tr>
          <td style="padding: 8px 14px; vertical-align: middle; text-align: left;">
            <div style="font-size: 15px; font-weight: 900; letter-spacing: 0.3px; color: #ffffff; line-height: 1.25; font-family: ${GUJARATI_FONT_FAMILY};">
              ✨ આજનો સુવિચાર અને સંસ્કાર વાણી (Assembly Speech Script)
            </div>
          </td>
          <td style="padding: 8px 14px; vertical-align: middle; text-align: right; white-space: nowrap; width: 1%;">
            <span style="display: inline-block; font-size: 12px; font-weight: 800; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.25); padding: 3px 10px; border-radius: 5px; color: #ffffff; line-height: 1.2; font-family: ${GUJARATI_FONT_FAMILY};">
              📅 ${bulletin.editionDate}
            </span>
          </td>
        </tr>
      </table>

      <!-- Main Thought Card (Prominent & Inspiring) -->
      <div style="background: #fffcf9; border: 2px solid #f59c73; border-radius: 12px; padding: 12px 18px; text-align: center; margin-bottom: 8px; box-shadow: 0 2px 6px rgba(245, 156, 115, 0.12); display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
        <div style="font-size: 26px; color: #9d512d; line-height: 0.7; margin-bottom: 3px; font-family: Georgia, serif;">❝</div>
        <div style="font-size: ${thoughtFontSize}; font-weight: 900; color: #0f172a; line-height: 1.42; font-family: ${GUJARATI_FONT_FAMILY}; letter-spacing: 0.1px; text-align: center;">
          ${thought}
        </div>
        <div style="font-size: 26px; color: #9d512d; line-height: 0.7; margin-top: 3px; font-family: Georgia, serif;">❞</div>
        ${
          authorOrSource
            ? `
          <div style="margin-top: 4px; font-size: 14px; font-weight: 800; color: #9d512d; font-family: ${GUJARATI_FONT_FAMILY};">
            — ${authorOrSource}
          </div>
        `
            : ''
        }
      </div>

      <!-- Assembly Guide Pill -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; margin-bottom: 8px;">
        <tr>
          <td style="padding: 5px 12px; vertical-align: middle; text-align: left; font-size: 11px; color: #92400e; font-weight: 700; font-family: ${GUJARATI_FONT_FAMILY};">
            🎙️ શાળા પ્રાર્થના સભા માર્ગદર્શિકા: શિક્ષક અથવા વિદ્યાર્થી દ્વારા ૨ થી ૩ મિનિટ વક્તવ્ય માટે તૈયાર સામગ્રી
          </td>
          <td style="padding: 5px 12px; vertical-align: middle; text-align: right; white-space: nowrap; width: 1%;">
            <span style="display: inline-block; background: #fde047; color: #78350f; padding: 2px 7px; border-radius: 4px; font-weight: 800; font-size: 10.5px; line-height: 1.2; font-family: ${GUJARATI_FONT_FAMILY};">⏱️ સમય: ૨-૩ મિનિટ</span>
          </td>
        </tr>
      </table>

      <!-- Detailed Explanation & Example Section (Comfortably and Fully filling the Page) -->
      <div style="display: flex; flex-direction: column; gap: ${cardGap}; flex: 1; justify-content: center; margin-bottom: 8px;">
        
        <!-- Detailed Explanation (વિસ્તૃત સમજૂતી) -->
        <div style="background: #f8fbff; border: 1.5px solid #bfdbfe; border-left: 5px solid #2563eb; border-radius: 8px; padding: ${cardPadding}; flex: 1; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box;">
          <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 5px; border-bottom: 1px solid #dbeafe; padding-bottom: 3px;">
            <tr>
              <td style="vertical-align: middle; text-align: left;">
                <div style="font-size: ${headingFontSize}; font-weight: 900; color: #1d4ed8; font-family: ${GUJARATI_FONT_FAMILY};">
                  📖 વિસ્તૃત સમજૂતી (Speech Explanation):
                </div>
              </td>
              <td style="vertical-align: middle; text-align: right; white-space: nowrap; width: 1%;">
                <span style="display: inline-block; font-size: 10.5px; font-weight: 800; background: #dbeafe; color: #1e40af; padding: 2px 7px; border-radius: 4px; font-family: ${GUJARATI_FONT_FAMILY};">
                  વક્તવ્ય સમય: ~૧.૫ મિનિટ
                </span>
              </td>
            </tr>
          </table>
          <div style="font-size: ${bodyFontSize}; color: #1e293b; line-height: ${bodyLineHeight}; font-weight: 500; text-align: justify; font-family: ${GUJARATI_FONT_FAMILY};">
            ${explanation}
          </div>
        </div>

        <!-- Real-Life Example & Inspiring Story (વ્યવહારિક ઉદાહરણ અને પ્રેરણા પ્રસંગ) -->
        <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-left: 5px solid #059669; border-radius: 8px; padding: ${cardPadding}; flex: 1; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box;">
          <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 5px; border-bottom: 1px solid #dcfce7; padding-bottom: 3px;">
            <tr>
              <td style="vertical-align: middle; text-align: left;">
                <div style="font-size: ${headingFontSize}; font-weight: 900; color: #047857; font-family: ${GUJARATI_FONT_FAMILY};">
                  🌟 વ્યવહારિક ઉદાહરણ અને પ્રેરણા પ્રસંગ (Real-Life Example & Story):
                </div>
              </td>
              <td style="vertical-align: middle; text-align: right; white-space: nowrap; width: 1%;">
                <span style="display: inline-block; font-size: 10.5px; font-weight: 800; background: #dcfce7; color: #065f46; padding: 2px 7px; border-radius: 4px; font-family: ${GUJARATI_FONT_FAMILY};">
                  વક્તવ્ય સમય: ~૧ થી ૧.૫ મિનિટ
                </span>
              </td>
            </tr>
          </table>
          <div style="font-size: ${bodyFontSize}; color: #1e293b; line-height: ${bodyLineHeight}; font-weight: 500; text-align: justify; font-family: ${GUJARATI_FONT_FAMILY};">
            ${example}
          </div>
        </div>

        ${
          keyPoints && keyPoints.length > 0
            ? `
          <!-- Assembly Speech Highlights (સભામાં બોલવાના ૩ મુખ્ય મુદ્દા) -->
          <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-left: 5px solid #7c3aed; border-radius: 8px; padding: 8px 14px;">
            <div style="font-size: 12.5px; font-weight: 900; color: #6d28d9; margin-bottom: 4px; font-family: ${GUJARATI_FONT_FAMILY};">
              🎤 સભા વક્તવ્યના મુખ્ય ૩ સૂત્રો (Speech Highlights):
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
              ${keyPoints
                .map(
                  (pt, idx) => `
                <div style="background: #ffffff; border: 1px solid #ddd6fe; border-radius: 6px; padding: 4px 8px; font-size: 11.5px; color: #4c1d95; font-weight: 700; line-height: 1.35; font-family: ${GUJARATI_FONT_FAMILY}; display: flex; align-items: flex-start; gap: 4px;">
                  <span style="color: #7c3aed; font-weight: 900;">•</span>
                  <span>${pt}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Moral Value Badge Banner (Table layout ensures 100% mathematical vertical centering in html2canvas) -->
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px;">
          <tr>
            <td style="padding: 7px 14px; vertical-align: middle; text-align: left;">
              <span style="font-size: 12.5px; font-weight: 900; color: #92400e; font-family: ${GUJARATI_FONT_FAMILY};">🎯 આજનું પાયાનું સંસ્કાર મૂલ્ય: </span>
              <span style="display: inline-block; font-size: 13.5px; font-weight: 900; background: #fde047; color: #78350f; padding: 2px 12px; border-radius: 5px; font-family: ${GUJARATI_FONT_FAMILY}; border: 1px solid #facc15; line-height: 1.25; vertical-align: middle;">
                ${moralValue}
              </span>
            </td>
            <td style="padding: 7px 14px; vertical-align: middle; text-align: right; white-space: nowrap; width: 1%;">
              <span style="font-size: 11px; color: #78350f; font-weight: 700; font-family: ${GUJARATI_FONT_FAMILY};">
                વિદ્યાર્થીઓએ જીવનમાં ઉતારવા યોગ્ય પવિત્ર વિચાર
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Footer Note -->
      <div style="padding-top: 6px; border-top: 1.5px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #64748b; font-weight: 600;">
        <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • શાળા સંસ્કાર વાણી શ્રેણી (Daily Moral Values Series)</span>
        <span>${bulletin.editionDate}</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, HTML2CANVAS_PDF_OPTIONS);

    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Exactly 1 single page
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    const pdfBlob = pdf.output('blob');

    // 1. If explicit download mode was requested, save directly to Downloads without WhatsApp prompt
    if (options.mode === 'download') {
      await downloadPdfFile(pdfBlob, fileName);
      return { success: true, method: 'downloaded', fileName };
    }

    // 2. Share mode: Try native file share or WhatsApp
    const shareText = `✨ *${schoolName}*\nઆજનો સુવિચાર (${bulletin.editionDate})\n"${thought}"\nપીડીએફ ફાઇલ મોકલેલ છે.`;
    const shareRes = await sharePdfFile(pdfBlob, fileName, `${schoolName} — આજનો સુવિચાર (${bulletin.editionDate})`, shareText);
    if (shareRes.success) {
      return { success: true, method: shareRes.method, fileName };
    }

    // Fallback WhatsApp
    const waText = encodeURIComponent(
      `✨ *${schoolName}*\n` +
      `*આજનો સુવિચાર* (${bulletin.editionDate})\n\n` +
      `❝ *${thought}* ❞\n` +
      (authorOrSource ? `— ${authorOrSource}\n\n` : '\n') +
      `📖 *વિસ્તૃત સમજૂતી:* ${explanation}\n\n` +
      `🌟 *ઉદાહરણ:* ${example}\n\n` +
      `🎯 *જીવનમૂલ્ય:* ${moralValue}\n\n` +
      `📎 *નોંધ:* આ સુવિચાર અને ૨-૩ મિનિટ વક્તવ્યની 1-Page PDF ફાઇલ આપના ડિવાઇસમાં *"${fileName}"* નામથી સેવ થઈ ગઈ છે.\n` +
      `✨ સૌજન્ય: વિદ્યાલયમ શૈક્ષણિક પોર્ટલ`
    );
    window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
    return { success: true, method: 'whatsapp_web', fileName };
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    console.error('Error generating suvichar PDF:', err);
    throw err;
  }
}

/**
 * 1-PAGE A4 DAILY INTERESTING FACTS (12 FACTS) PDF
 * For Std 9 to 12
 */
export async function shareDailyInterestingFactsAsPdf(
  bulletin: DailyInterestingFactsBulletin,
  options: ShareOptions
): Promise<ShareResult> {
  const schoolName = options.schoolName || 'શાળા શૈક્ષણિક પોર્ટલ';
  const hasCustomSchool = options.schoolName && options.schoolName !== 'શાળા શૈક્ષણિક પોર્ટલ';
  const cleanSchool = hasCustomSchool
    ? options.schoolName.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_')
    : '';
  const fileName = cleanSchool
    ? `${cleanSchool}_આજનું_જાણવા_જેવું_૧૨_તથ્યો_${bulletin.dateKey}.pdf`
    : `આજનું_જાણવા_જેવું_૧૨_તથ્યો_${bulletin.dateKey}.pdf`;

  await waitForFontsToRender();

  const container = document.createElement('div');
  container.id = 'vidyalayam_pdf_render_container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.width = '794px';
  container.style.height = '1120px';
  container.style.maxHeight = '1120px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = GUJARATI_FONT_FAMILY;
  container.style.boxSizing = 'border-box';
  container.style.padding = '18px 22px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';
  container.style.overflow = 'hidden';
  container.style.textRendering = 'geometricPrecision';
  (container.style as any).webkitFontSmoothing = 'antialiased';

  const factsHtml = bulletin.facts
    .slice(0, 12)
    .map((fact) => `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #f59e0b; border-radius:8px; padding:6px 9px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
        <table style="width:100%; border-collapse:collapse; margin-bottom:2px;">
          <tr>
            <td style="vertical-align:middle; width:20px; padding-right:5px;">
              <img
                src="${createNumberBadgeDataUri(toGujaratiDigits(fact.factNumber), '#fef3c7', '#92400e', 18, 4)}"
                width="18"
                height="18"
                style="width:18px; height:18px; display:block;"
                alt="${fact.factNumber}"
              />
            </td>
            <td style="vertical-align:middle; text-align:left;">
              <span style="font-size:8.5pt; font-weight:800; color:#0f172a; line-height:1.25; font-family:${GUJARATI_FONT_FAMILY};">${fact.title}</span>
            </td>
            <td style="vertical-align:middle; text-align:right; white-space:nowrap; width:1%;">
              <span style="font-size:7pt; color:#64748b; font-weight:600; line-height:1.2; font-family:${GUJARATI_FONT_FAMILY};">${fact.category}</span>
            </td>
          </tr>
        </table>
        <div style="font-size:7.5pt; color:#334155; line-height:1.32; margin-top:2px; font-family:${GUJARATI_FONT_FAMILY};">
          ${fact.fact}
        </div>
        ${fact.whyItMatters ? `<div style="font-size:6.8pt; color:#0284c7; font-style:italic; line-height:1.25; margin-top:2px; font-family:${GUJARATI_FONT_FAMILY};">💡 ${fact.whyItMatters}</div>` : ''}
      </div>
    `)
    .join('');

  container.innerHTML = `
    <div style="border: 2px solid #d97706; border-radius: 10px; padding: 14px 18px; background: #ffffff; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- School Header -->
      <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
        <h1 style="font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 3px 0; line-height: 1.25; font-family: ${GUJARATI_FONT_FAMILY};">
          ${schoolName}
        </h1>
        <div style="font-size: 11px; color: #64748b; font-weight: 600; line-height: 1.3; font-family: ${GUJARATI_FONT_FAMILY};">
          ${options.diseCode ? `DISE કોડ: ${options.diseCode} • ` : ''}${options.district ? `${options.district} જિલ્લો, ગુજરાત • ` : ''}સામાન્ય જ્ઞાન — વિશેષ તથ્યો (ધોરણ ૯ થી ૧૨)
        </div>
      </div>

      <!-- Title & Date Strip (Table layout ensures 100% mathematical vertical centering in html2canvas) -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; background: #b45309; color: #ffffff; border-radius: 6px; margin-bottom: 8px;">
        <tr>
          <td style="padding: 7px 12px; vertical-align: middle; text-align: left;">
            <div style="font-size: 13.5px; font-weight: 800; color: #ffffff; line-height: 1.25; font-family: ${GUJARATI_FONT_FAMILY}; margin: 0; padding: 0;">
              💡 આજનું જાણવા જેવું — ૧૨ રોમાંચક તથ્યો
            </div>
          </td>
          <td style="padding: 7px 12px; vertical-align: middle; text-align: right; white-space: nowrap; width: 1%;">
            <span style="display: inline-block; font-size: 11.5px; font-weight: 700; color: #ffffff; background: rgba(0,0,0,0.22); padding: 3px 9px; border-radius: 4px; line-height: 1.2; font-family: ${GUJARATI_FONT_FAMILY};">
              ${bulletin.editionDate} • બપોરે ૧:૦૦ વાગ્યાની આવૃત્તિ
            </span>
          </td>
        </tr>
      </table>

      <!-- 12 Facts Grid: 2 Columns of 6, perfectly balanced -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px; flex: 1; align-content: space-between; margin-bottom: 4px;">
        ${factsHtml}
      </div>

      <!-- Footer Note -->
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #64748b; line-height: 1.2; font-family: ${GUJARATI_FONT_FAMILY};">
        <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • રોજ બપોરે ૧:૦૦ વાગ્યે ઓટો-અપડેટ</span>
        <span>${bulletin.editionDate}</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, HTML2CANVAS_PDF_OPTIONS);
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);

    const pdfBlob = pdf.output('blob');

    // 1. If explicit download mode was requested, save directly to Downloads without WhatsApp prompt
    if (options.mode === 'download') {
      await downloadPdfFile(pdfBlob, fileName);
      return { success: true, method: 'downloaded', fileName };
    }

    if (navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], fileName, { type: 'application/pdf' })] })) {
      try {
        await navigator.share({
          files: [new File([pdfBlob], fileName, { type: 'application/pdf' })],
          title: `${schoolName} — આજનું જાણવા જેવું (૧૨ તથ્યો)`,
          text: `💡 *${schoolName}*\nઆજનું જાણવા જેવું (${bulletin.editionDate})\n૧૨ રોમાંચક તથ્યોની PDF ફાઇલ મોકલેલ છે.`,
        });
        return { success: true, method: 'native_share', fileName };
      } catch (e) {}
    }

    const waText = encodeURIComponent(
      `💡 *${schoolName}*\n*આજનું જાણવા જેવું — ૧૨ રોમાંચક તથ્યો* (${bulletin.editionDate})\n\n` +
      `📎 આ તથ્યોની PDF ફાઇલ આપના ડિવાઇસમાં *"${fileName}"* સેવ થઈ ગઈ છે.\n✨ સૌજન્ય: વિદ્યાલયમ`
    );
    window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
    return { success: true, method: 'whatsapp_web', fileName };
  } catch (err) {
    if (document.body.contains(container)) document.body.removeChild(container);
    throw err;
  }
}

/**
 * Direct PDF Download Helpers (Saves file to device Downloads without WhatsApp prompt)
 */
export async function downloadDailyNewsAsPdf(
  bulletin: DailyNewsBulletin,
  options: Omit<ShareOptions, 'mode'>
): Promise<ShareResult> {
  return shareDailyNewsAsPdf(bulletin, { ...options, mode: 'download' });
}

export async function downloadDailyJanvaJevuAsPdf(
  bulletin: DailyJanvaJevuBulletin,
  options: Omit<ShareOptions, 'mode'>
): Promise<ShareResult> {
  return shareDailyJanvaJevuAsPdf(bulletin, { ...options, mode: 'download' });
}

// Explicit Prashnotari Aliases for Crystal-Clear Code Understanding
export const shareDailyPrashnotariAsPdf = shareDailyJanvaJevuAsPdf;
export const downloadDailyPrashnotariAsPdf = downloadDailyJanvaJevuAsPdf;

export async function downloadDailySuvicharAsPdf(
  bulletin: DailySuvicharBulletin,
  options: Omit<ShareOptions, 'mode'>
): Promise<ShareResult> {
  return shareDailySuvicharAsPdf(bulletin, { ...options, mode: 'download' });
}

/**
 * 1-Page A4 Presentation Speech Slip Downloader & Sharer
 */
export async function sharePresentationAsPdf(
  presentation: {
    title: string;
    standard: string | number;
    subject: string;
    environment?: string;
    studentName?: string;
    openingSpeech?: string;
    topicIntroduction?: string;
    paragraph1?: string;
    paragraph2?: string;
    paragraph3?: string;
    detailedExplanation?: string;
    realLifeExample?: string;
    closingSpeech?: string;
  },
  options: ShareOptions
): Promise<ShareResult> {
  await waitForFontsToRender();

  const schoolName = options.schoolName || 'શ્રી વિદ્યાલય';
  const cleanSchool = schoolName.replace(/[\s/\\?%*:|"<>]/g, '_');
  const cleanTopic = (presentation.title || 'પ્રસ્તુતિ').replace(/[\s/\\?%*:|"<>]/g, '_');
  const fileName = `${cleanSchool}_પ્રસ્તુતિ_${cleanTopic}.pdf`;

  // Standard A4 dimensions at 96 DPI: 794px width x 1120px height
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.width = '794px';
  container.style.height = '1120px';
  container.style.maxHeight = '1120px';
  container.style.overflow = 'hidden';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = GUJARATI_FONT_FAMILY;
  container.style.padding = '18px 20px';
  container.style.boxSizing = 'border-box';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';

  const p1 = presentation.paragraph1 || presentation.topicIntroduction || '';
  const p2 = presentation.paragraph2 || presentation.detailedExplanation || '';
  const p3 = presentation.paragraph3 || presentation.realLifeExample || '';

  container.innerHTML = `
    <div style="border: 3px double #059669; border-radius: 14px; padding: 16px 20px; background: #ffffff; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- School Header -->
      <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
        <h1 style="font-size: 24px; font-weight: 900; color: #065f46; margin: 0 0 4px 0; font-family: ${GUJARATI_FONT_FAMILY};">
          ${schoolName}
        </h1>
        <div style="font-size: 13px; color: #475569; font-weight: 700;">
          શાળા વક્તવ્ય & પ્રસ્તુતિ સ્ક્રિપ્ટ (~૫ મિનિટ વક્તવ્ય)
        </div>
      </div>

      <!-- Topic Badge Strip -->
      <div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 10px; padding: 8px 14px; margin-top: 8px;">
        <div style="font-size: 16px; font-weight: 900; color: #065f46;">
          📌 વિષય: ${presentation.title}
        </div>
        <div style="font-size: 12px; color: #047857; font-weight: 700; margin-top: 3px; display: flex; gap: 12px;">
          <span>ધોરણ: ${presentation.standard}</span>
          <span>• વિષય: ${presentation.subject}</span>
          <span>• સેટિંગ: ${presentation.environment || 'પ્રાર્થના સભા'}</span>
          <span>• સમય: ~૫ મિનિટ</span>
          ${presentation.studentName ? `<span>• વક્તા: ${presentation.studentName}</span>` : ''}
        </div>
      </div>

      <!-- Part 1: Salutation -->
      <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 7px 12px; margin-top: 6px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; margin-bottom: 2px; font-family: ${GUJARATI_FONT_FAMILY};">
          ૧. આદરપૂર્વક સંબોધન (Opening Salutation)
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.4; font-family: ${GUJARATI_FONT_FAMILY};">
          "${presentation.openingSpeech || 'માનનીય આચાર્યશ્રી, વંદનીય ગુરુજનો અને મારા વહાલા વિદ્યાર્થી મિત્રો, સૌને મારા સાદર પ્રણામ.'}"
        </div>
      </div>

      <!-- Part 2: Topic Announcement (વિષય રજૂઆત) -->
      <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; border-left: 4.5px solid #2563eb; border-radius: 8px; padding: 7px 12px; margin-top: 5px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-size: 11px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; margin-bottom: 2px; font-family: ${GUJARATI_FONT_FAMILY};">
          ૨. વિષય રજૂઆત (Topic Announcement)
        </div>
        <div style="font-size: 12.5px; font-weight: 600; color: #1e293b; line-height: 1.4; font-family: ${GUJARATI_FONT_FAMILY};">
          "આજે હું આપ સૌની સમક્ષ ${presentation.standard || 'ધોરણ ૯'} ના ${presentation.subject || 'વિજ્ઞાન'} વિષયના અત્યંત મહત્વના અને રોચક ટોપિક <strong style="color: #1e40af;">"${presentation.title}"</strong> વિશે આત્મવિશ્વાસપૂર્વક સંપૂર્ણ રજૂઆત કરવા જઈ રહ્યો/રહી છું."
        </div>
      </div>

      <!-- Part 3: Main Detailed Presentation (~5 min speech) -->
      <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 9px 13px; margin-top: 5px; flex: 1; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 5px; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 3px;">
          <tr>
            <td style="vertical-align: middle; text-align: left; font-size: 12px; font-weight: 800; color: #047857; text-transform: uppercase; font-family: ${GUJARATI_FONT_FAMILY};">
              ૩. વિષયની સંપૂર્ણ અને સરળ રજૂઆત (~૫ મિનિટ વક્તવ્ય)
            </td>
            <td style="vertical-align: middle; text-align: right; white-space: nowrap; width: 1%;">
              <span style="display: inline-block; font-size: 9.5px; font-weight: 800; background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 4px; font-family: ${GUJARATI_FONT_FAMILY};">
                સમય: ~૫ મિનિટ
              </span>
            </td>
          </tr>
        </table>
        ${
          p1
            ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3.5px solid #059669; border-radius: 6px; padding: 5px 9px; margin-bottom: 4px;">
            <div style="font-size: 9.5px; font-weight: 800; color: #047857; margin-bottom: 1px; font-family: ${GUJARATI_FONT_FAMILY};">૧. પાયાની વિભાવના & સિદ્ધાંત:</div>
            <p style="font-size: 10.5px; line-height: 1.38; color: #1e293b; margin: 0; text-align: justify; font-family: ${GUJARATI_FONT_FAMILY};">${p1}</p>
          </div>
        `
            : ''
        }
        ${
          p2
            ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3.5px solid #2563eb; border-radius: 6px; padding: 5px 9px; margin-bottom: 4px;">
            <div style="font-size: 9.5px; font-weight: 800; color: #1d4ed8; margin-bottom: 1px; font-family: ${GUJARATI_FONT_FAMILY};">૨. વિગતવાર વિશ્લેષણ & સમજૂતી:</div>
            <p style="font-size: 10.5px; line-height: 1.38; color: #1e293b; margin: 0; text-align: justify; font-family: ${GUJARATI_FONT_FAMILY};">${p2}</p>
          </div>
        `
            : ''
        }
        ${
          p3
            ? `
          <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 3.5px solid #d97706; border-radius: 6px; padding: 5px 9px;">
            <div style="font-size: 9.5px; font-weight: 800; color: #b45309; margin-bottom: 1px; font-family: ${GUJARATI_FONT_FAMILY};">૩. ઉપસંહાર & વાસ્તવિક જોડાણ:</div>
            <p style="font-size: 10px; line-height: 1.36; color: #334155; margin: 0; text-align: justify; font-family: ${GUJARATI_FONT_FAMILY};">${p3}</p>
          </div>
        `
            : ''
        }
      </div>

      <!-- Part 4: Conclusion & Closing Speech -->
      <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 7px 12px; margin-top: 5px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-size: 11px; font-weight: 800; color: #15803d; text-transform: uppercase; margin-bottom: 2px; font-family: ${GUJARATI_FONT_FAMILY};">
          ૪. સમાપન & આભાર દર્શન (Closing Salutation)
        </div>
        <div style="font-size: 12.5px; font-weight: 700; color: #166534; line-height: 1.4; font-family: ${GUJARATI_FONT_FAMILY};">
          "${presentation.closingSpeech || 'આમ, આ ટોપિક આપણને રોજિંદા જીવનમાં પણ ખૂબ ઉપયોગી છે. મારી આ રજૂઆત શાંતિપૂર્વક અને સ્નેહપૂર્વક સાંભળવા બદલ આપ સૌનો હૃદયપૂર્વક આભાર વ્યક્ત કરું છું. અસ્તુ, ભારત માતા કી જય! જય હિન્દ!'}"
        </div>
      </div>

      <!-- Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #e2e8f0; padding-top: 5px; margin-top: 8px; font-size: 10px; color: #64748b; font-family: ${GUJARATI_FONT_FAMILY};">
        <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • GSEB અભ્યાસક્રમ પ્રસ્તુતિ</span>
        <span>A4 વક્તવ્ય સ્લિપ (~૫ મિનિટ સંપૂર્ણ પ્રસ્તુતિ)</span>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, HTML2CANVAS_PDF_OPTIONS);

    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    const pdfBlob = pdf.output('blob');

    if (options.mode === 'download') {
      await downloadPdfFile(pdfBlob, fileName);
      return { success: true, method: 'downloaded', fileName };
    }

    const shareText = `🎤 *${schoolName}*\nવક્તવ્ય પ્રસ્તુતિ: *${presentation.title}* (ધોરણ ${presentation.standard})\nPDF ફાઇલ મોકલેલ છે.`;
    const shareRes = await sharePdfFile(pdfBlob, fileName, `${schoolName} — ${presentation.title}`, shareText);
    return { success: true, method: shareRes.method, fileName };
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    throw err;
  }
}

export async function downloadPresentationAsPdf(
  presentation: any,
  options: Omit<ShareOptions, 'mode'>
): Promise<ShareResult> {
  return sharePresentationAsPdf(presentation, { ...options, mode: 'download' });
}

