import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
}

export interface ShareResult {
  success: boolean;
  method: 'native_share' | 'whatsapp_web' | 'downloaded';
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

/**
 * Helper to download Blob securely
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
  container.style.lineHeight = '1.35';
  container.style.padding = '18px 22px';
  container.style.boxSizing = 'border-box';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';

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

      <!-- Title & Date Strip -->
      <div style="background: #9d512d; color: #ffffff; border-radius: 6px; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-size: 13.5px; font-weight: 800; line-height: 1.3; font-family: ${GUJARATI_FONT_FAMILY};">
          📰 આજના મુખ્ય ૧૦ સમાચાર (Daily News Bulletin)
        </div>
        <div style="font-size: 11.5px; font-weight: 700; background: rgba(0,0,0,0.22); padding: 3px 9px; border-radius: 4px; line-height: 1.2; font-family: ${GUJARATI_FONT_FAMILY};">
          ${bulletin.editionDate} • સવારે ૫:૦૦ વાગ્યાની આવૃત્તિ
        </div>
      </div>

      <!-- Morning Prayer Shloka / Suvichar -->
      ${
        bulletin.morningPrayerShloka
          ? `
        <div style="background: #fdfaf6; border-left: 3.5px solid #9d512d; padding: 6px 10px; margin-bottom: 8px; border-radius: 4px; line-height: 1.35;">
          <span style="font-size: 10.5px; font-weight: 800; color: #9d512d; font-family: ${GUJARATI_FONT_FAMILY};">✨ પ્રાર્થના મંત્ર / સુવિચાર: </span>
          <span style="font-size: 11.5px; font-weight: 600; color: #334155; font-style: italic; font-family: ${GUJARATI_FONT_FAMILY};">
            ${bulletin.morningPrayerShloka}
          </span>
        </div>
      `
          : ''
      }

      <!-- 10 News Items: ONLY Headlines and Context (Summary), NO Category/Region Tags -->
      <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; justify-content: space-between;">
        ${bulletin.items
          .slice(0, 10)
          .map((item, idx) => {
            return `
            <div style="padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box;">
              <div style="display: flex; align-items: flex-start; gap: 8px;">
                <span style="font-size: 11px; font-weight: 800; background: #9d512d; color: #ffffff; width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 4px; flex-shrink: 0; display: inline-block; vertical-align: top; margin-top: 1px; font-family: ${GUJARATI_FONT_FAMILY};">
                  ${toGujaratiDigits(idx + 1)}
                </span>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.35; margin: 0 0 2px 0; font-family: ${GUJARATI_FONT_FAMILY};">
                    ${item.headline}
                  </div>
                  <div style="font-size: 10.5px; color: #475569; line-height: 1.38; margin: 0; font-family: ${GUJARATI_FONT_FAMILY};">
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
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // Download to device
    downloadBlob(pdfBlob, fileName);

    // Native Share API (WhatsApp mobile)
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `${schoolName} — આજના સમાચાર (${bulletin.editionDate})`,
          text: `📰 *${schoolName}*\nઆજના મુખ્ય ૧૦ સમાચાર (${bulletin.editionDate})\nપીડીએફ ફાઇલ મોકલેલ છે.`,
        });
        return { success: true, method: 'native_share', fileName };
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return { success: true, method: 'downloaded', fileName };
        }
      }
    }

    // WhatsApp fallback
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
    ? `${cleanSchool}_આજનું_જાણવા_જેવું_${bulletin.dateKey}.pdf`
    : `આજનું_જાણવા_જેવું_${bulletin.dateKey}.pdf`;

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
  container.style.lineHeight = '1.35';
  container.style.padding = '18px 22px';
  container.style.boxSizing = 'border-box';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';

  const suvicharText =
    bulletin.suvichar ||
    'પરિશ્રમ એ જ સાચો પારસમણિ છે, જે સામાન્ય માનવીને પણ અસાધારણ સફળતા અપાવે છે.';

  const renderColumnItems = (items: typeof bulletin.questions, startIdx: number) => {
    return items
      .map((q, i) => {
        const idx = startIdx + i;
        const singleWordAnswer = cleanOneWord(q.answer);
        return `
        <div style="padding: 5px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box; flex: 1; display: flex; flex-direction: column; justify-content: center;">
          <div style="display: flex; align-items: flex-start; gap: 6px;">
            <span style="font-size: 10px; font-weight: 800; background: #1e293b; color: #ffffff; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 3px; flex-shrink: 0; display: inline-block; vertical-align: top; margin-top: 1px; font-family: ${GUJARATI_FONT_FAMILY};">
              ${toGujaratiDigits(idx + 1)}
            </span>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 10.5px; font-weight: 700; color: #0f172a; line-height: 1.3; margin: 0 0 3px 0; font-family: ${GUJARATI_FONT_FAMILY};">
                ${q.question}
              </div>
              <div style="display: inline-block; font-size: 10px; font-weight: 800; background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 4px; border: 1px solid #86efac; line-height: 1.25; vertical-align: middle; font-family: ${GUJARATI_FONT_FAMILY};">
                જવાબ: ${singleWordAnswer}
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

      <!-- Title & Date Strip -->
      <div style="background: #1e293b; color: #ffffff; border-radius: 6px; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-left: 4px solid #f59c73;">
        <div style="font-size: 13.5px; font-weight: 800; line-height: 1.3; font-family: ${GUJARATI_FONT_FAMILY};">
          💡 આજનું જાણવા જેવું (૨૦ પ્રશ્નોત્તરી — એક શબ્દમાં જવાબ)
        </div>
        <div style="font-size: 11.5px; font-weight: 700; color: #f59c73; line-height: 1.2; font-family: ${GUJARATI_FONT_FAMILY};">
          ${bulletin.editionDate} • બપોરે ૧:૦૦ વાગ્યાની આવૃત્તિ
        </div>
      </div>

      <!-- Suvichar Strip -->
      <div style="background: #fdfaf6; border-left: 3.5px solid #f59c73; padding: 6px 10px; margin-bottom: 8px; border-radius: 4px; line-height: 1.35;">
        <span style="font-size: 10.5px; font-weight: 800; color: #9d512d; font-family: ${GUJARATI_FONT_FAMILY};">✨ આજનો સુવિચાર: </span>
        <span style="font-size: 11px; font-weight: 600; color: #1e293b; font-family: ${GUJARATI_FONT_FAMILY};">
          "${suvicharText}"
        </span>
      </div>

      <!-- 20 Questions: Clean 2-Column Side-by-Side Layout (1-10 on Left, 11-20 on Right) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex: 1; align-items: stretch; margin-bottom: 4px;">
        <div style="display: flex; flex-direction: column; gap: 5px; height: 100%; justify-content: space-between;">
          ${renderColumnItems(col1, 0)}
        </div>
        <div style="display: flex; flex-direction: column; gap: 5px; height: 100%; justify-content: space-between;">
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
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // Download to device
    downloadBlob(pdfBlob, fileName);

    // Native Share API
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `${schoolName} — આજનું જાણવા જેવું (${bulletin.editionDate})`,
          text: `💡 *${schoolName}*\nઆજનું જાણવા જેવું — ૨૦ પ્રશ્નોત્તરી (${bulletin.editionDate})\nપીડીએફ ફાઇલ મોકલેલ છે.`,
        });
        return { success: true, method: 'native_share', fileName };
      } catch (shareErr: any) {
        if (shareErr.name !== 'AbortError') {
          console.warn('Native file share failed, falling back:', shareErr);
        }
        return { success: true, method: 'downloaded', fileName };
      }
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

      <!-- Title & Date Strip -->
      <div style="background: linear-gradient(135deg, #9d512d 0%, #c05d2c 50%, #7e3618 100%); color: #ffffff; border-radius: 8px; padding: 7px 14px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; box-shadow: 0 2px 4px rgba(157, 81, 45, 0.15);">
        <div style="font-size: 15px; font-weight: 900; letter-spacing: 0.3px; font-family: ${GUJARATI_FONT_FAMILY}; display: flex; align-items: center; gap: 6px;">
          <span>✨ આજનો સુવિચાર અને સંસ્કાર વાણી (Assembly Speech Script)</span>
        </div>
        <div style="font-size: 12px; font-weight: 800; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.25); padding: 3px 10px; border-radius: 5px;">
          📅 ${bulletin.editionDate}
        </div>
      </div>

      <!-- Main Thought Card (Prominent & Inspiring) -->
      <div style="background: #fffcf9; border: 2px solid #f59c73; border-radius: 12px; padding: 12px 18px; text-align: center; margin-bottom: 8px; box-shadow: 0 2px 6px rgba(245, 156, 115, 0.12);">
        <div style="font-size: 28px; color: #9d512d; line-height: 0.7; margin-bottom: 4px; font-family: Georgia, serif;">❝</div>
        <div style="font-size: ${thoughtFontSize}; font-weight: 900; color: #0f172a; line-height: 1.45; font-family: ${GUJARATI_FONT_FAMILY}; letter-spacing: 0.1px;">
          ${thought}
        </div>
        <div style="font-size: 28px; color: #9d512d; line-height: 0.7; margin-top: 4px; font-family: Georgia, serif;">❞</div>
        ${
          authorOrSource
            ? `
          <div style="margin-top: 4px; font-size: 14.5px; font-weight: 800; color: #9d512d; font-family: ${GUJARATI_FONT_FAMILY};">
            — ${authorOrSource}
          </div>
        `
            : ''
        }
      </div>

      <!-- Assembly Guide Pill -->
      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 4.5px 12px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #92400e; font-weight: 700;">
        <span>🎙️ શાળા પ્રાર્થના સભા માર્ગદર્શિકા: શિક્ષક અથવા વિદ્યાર્થી દ્વારા ૨ થી ૩ મિનિટ વક્તવ્ય માટે તૈયાર સામગ્રી</span>
        <span style="background: #fde047; color: #78350f; padding: 1px 7px; border-radius: 4px; font-weight: 800;">⏱️ સમય: ૨-૩ મિનિટ</span>
      </div>

      <!-- Detailed Explanation & Example Section (Comfortably and Fully filling the Page) -->
      <div style="display: flex; flex-direction: column; gap: ${cardGap}; flex: 1; justify-content: space-between; margin-bottom: 8px;">
        
        <!-- Detailed Explanation (વિસ્તૃત સમજૂતી) -->
        <div style="background: #f8fbff; border: 1.5px solid #bfdbfe; border-left: 5px solid #2563eb; border-radius: 8px; padding: ${cardPadding}; flex: 1; display: flex; flex-direction: column; justify-content: flex-start;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #dbeafe; padding-bottom: 4px;">
            <div style="font-size: ${headingFontSize}; font-weight: 900; color: #1d4ed8; font-family: ${GUJARATI_FONT_FAMILY}; display: flex; align-items: center; gap: 6px;">
              <span>📖 વિસ્તૃત સમજૂતી (Speech Explanation):</span>
            </div>
            <span style="font-size: 11px; font-weight: 800; background: #dbeafe; color: #1e40af; padding: 1.5px 8px; border-radius: 4px;">
              વક્તવ્ય સમય: ~૧.૫ મિનિટ
            </span>
          </div>
          <div style="font-size: ${bodyFontSize}; color: #1e293b; line-height: ${bodyLineHeight}; font-weight: 500; text-align: justify; font-family: ${GUJARATI_FONT_FAMILY};">
            ${explanation}
          </div>
        </div>

        <!-- Real-Life Example & Inspiring Story (વ્યવહારિક ઉદાહરણ અને પ્રેરણા પ્રસંગ) -->
        <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-left: 5px solid #059669; border-radius: 8px; padding: ${cardPadding}; flex: 1; display: flex; flex-direction: column; justify-content: flex-start;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #dcfce7; padding-bottom: 4px;">
            <div style="font-size: ${headingFontSize}; font-weight: 900; color: #047857; font-family: ${GUJARATI_FONT_FAMILY}; display: flex; align-items: center; gap: 6px;">
              <span>🌟 વ્યવહારિક ઉદાહરણ અને પ્રેરણા પ્રસંગ (Real-Life Example & Story):</span>
            </div>
            <span style="font-size: 11px; font-weight: 800; background: #dcfce7; color: #065f46; padding: 1.5px 8px; border-radius: 4px;">
              વક્તવ્ય સમય: ~૧ થી ૧.૫ મિનિટ
            </span>
          </div>
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

        <!-- Moral Value Badge Banner -->
        <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 7px 14px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12.5px; font-weight: 900; color: #92400e;">🎯 આજનું પાયાનું સંસ્કાર મૂલ્ય:</span>
            <span style="font-size: 13.5px; font-weight: 900; background: #fde047; color: #78350f; padding: 2px 12px; border-radius: 5px; font-family: ${GUJARATI_FONT_FAMILY}; border: 1px solid #facc15;">
              ${moralValue}
            </span>
          </div>
          <span style="font-size: 11px; color: #78350f; font-weight: 700; font-family: ${GUJARATI_FONT_FAMILY};">
            વિદ્યાર્થીઓએ જીવનમાં ઉતારવા યોગ્ય પવિત્ર વિચાર
          </span>
        </div>
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
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // Download to device
    downloadBlob(pdfBlob, fileName);

    // Native Share API
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `${schoolName} — આજનો સુવિચાર (${bulletin.editionDate})`,
          text: `✨ *${schoolName}*\nઆજનો સુવિચાર (${bulletin.editionDate})\n"${thought}"\nપીડીએફ ફાઇલ મોકલેલ છે.`,
        });
        return { success: true, method: 'native_share', fileName };
      } catch (shareErr: any) {
        if (shareErr.name !== 'AbortError') {
          console.warn('Native file share failed, falling back:', shareErr);
        }
        return { success: true, method: 'downloaded', fileName };
      }
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

  const factsHtml = bulletin.facts
    .slice(0, 12)
    .map((fact) => `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #f59e0b; border-radius:8px; padding:6px 9px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="background:#fef3c7; color:#92400e; font-size:8pt; font-weight:800; border-radius:4px; width:18px; height:18px; line-height:18px; text-align:center; display:inline-block; vertical-align:middle; font-family:${GUJARATI_FONT_FAMILY};">
              ${toGujaratiDigits(fact.factNumber)}
            </span>
            <span style="font-size:8.5pt; font-weight:800; color:#0f172a; line-height:1.25; font-family:${GUJARATI_FONT_FAMILY};">${fact.title}</span>
          </div>
          <span style="font-size:7pt; color:#64748b; font-weight:600; line-height:1.2; font-family:${GUJARATI_FONT_FAMILY};">${fact.category}</span>
        </div>
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

      <!-- Title & Date Strip -->
      <div style="background: #b45309; color: #ffffff; border-radius: 6px; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-size: 13.5px; font-weight: 800; line-height: 1.3; font-family: ${GUJARATI_FONT_FAMILY};">
          💡 આજનું જાણવા જેવું — ૧૨ રોમાંચક તથ્યો
        </div>
        <div style="font-size: 11.5px; font-weight: 700; background: rgba(0,0,0,0.22); padding: 3px 9px; border-radius: 4px; line-height: 1.2; font-family: ${GUJARATI_FONT_FAMILY};">
          ${bulletin.editionDate} • બપોરે ૧:૦૦ વાગ્યાની આવૃત્તિ
        </div>
      </div>

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
    downloadBlob(pdfBlob, fileName);

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
