import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DailyNewsBulletin, DailyJanvaJevuBulletin, DailySuvicharBulletin } from '../types';
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

// Universal safe Gujarati font stack
const GUJARATI_FONT_FAMILY =
  "'Anek Gujarati', 'Noto Sans Gujarati', 'Gujarati Sangam MN', 'Shruti', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/**
 * Ensures browser fonts are loaded before capturing via html2canvas.
 * This completely prevents scrambled/crooked/misaligned fonts ("ada avda font/dont").
 */
async function waitForFontsToRender(): Promise<void> {
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
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
  const cleanSchool = schoolName.replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
  const fileName = `${cleanSchool}_Samachar_${bulletin.dateKey}.pdf`;

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
        <div style="font-size: 11px; color: #64748b; font-weight: 600;">
          ${options.diseCode ? `DISE કોડ: ${options.diseCode} • ` : ''}${options.district ? `${options.district} જિલ્લો, ગુજરાત • ` : ''}દૈનિક સમાચાર બુલેટિન
        </div>
      </div>

      <!-- Title & Date Strip -->
      <div style="background: #9d512d; color: #ffffff; border-radius: 6px; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-size: 13.5px; font-weight: 800; font-family: ${GUJARATI_FONT_FAMILY};">
          📰 આજના મુખ્ય ૧૦ સમાચાર (Daily News Bulletin)
        </div>
        <div style="font-size: 11.5px; font-weight: 700; background: rgba(0,0,0,0.22); padding: 3px 9px; border-radius: 4px;">
          ${bulletin.editionDate} • સવારે ૫:૦૦ વાગ્યાની આવૃત્તિ
        </div>
      </div>

      <!-- Morning Prayer Shloka / Suvichar -->
      ${
        bulletin.morningPrayerShloka
          ? `
        <div style="background: #fdfaf6; border-left: 3.5px solid #9d512d; padding: 6px 10px; margin-bottom: 8px; border-radius: 4px;">
          <span style="font-size: 10.5px; font-weight: 800; color: #9d512d;">✨ પ્રાર્થના મંત્ર / સુવિચાર: </span>
          <span style="font-size: 11.5px; font-weight: 600; color: #334155; font-style: italic; font-family: ${GUJARATI_FONT_FAMILY};">
            ${bulletin.morningPrayerShloka}
          </span>
        </div>
      `
          : ''
      }

      <!-- 10 News Items: ONLY Headlines and Context (Summary), NO Category/Region Tags -->
      <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; justify-content: space-around;">
        ${bulletin.items
          .slice(0, 10)
          .map((item, idx) => {
            return `
            <div style="padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
              <div style="display: flex; align-items: flex-start; gap: 8px;">
                <span style="font-size: 11px; font-weight: 800; background: #9d512d; color: #ffffff; min-width: 19px; height: 19px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; shrink-0; margin-top: 1px;">
                  ${toGujaratiDigits(idx + 1)}
                </span>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.35; margin-bottom: 2px; font-family: ${GUJARATI_FONT_FAMILY};">
                    ${item.headline}
                  </div>
                  <div style="font-size: 10.5px; color: #475569; line-height: 1.4; font-family: ${GUJARATI_FONT_FAMILY};">
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
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #64748b;">
        <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • શાળા પ્રાર્થના સંમેલન સેવા</span>
        <span>${bulletin.editionDate}</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

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
  const cleanSchool = schoolName.replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
  const fileName = `${cleanSchool}_Janva_Jevu_${bulletin.dateKey}.pdf`;

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
        <div style="padding: 5px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box;">
          <div style="display: flex; align-items: flex-start; gap: 6px;">
            <span style="font-size: 10px; font-weight: 800; background: #1e293b; color: #ffffff; min-width: 17px; height: 17px; display: inline-flex; align-items: center; justify-content: center; border-radius: 3px; shrink-0; margin-top: 1px;">
              ${toGujaratiDigits(idx + 1)}
            </span>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 10.5px; font-weight: 700; color: #0f172a; line-height: 1.3; margin-bottom: 3px; font-family: ${GUJARATI_FONT_FAMILY};">
                ${q.question}
              </div>
              <div style="display: inline-block; font-size: 10px; font-weight: 800; background: #dcfce7; color: #166534; padding: 1.5px 6px; border-radius: 4px; border: 1px solid #86efac; font-family: ${GUJARATI_FONT_FAMILY};">
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
        <div style="font-size: 11px; color: #64748b; font-weight: 600;">
          ${options.diseCode ? `DISE કોડ: ${options.diseCode} • ` : ''}${options.district ? `${options.district} જિલ્લો, ગુજરાત • ` : ''}સામાન્ય જ્ઞાન બુલેટિન
        </div>
      </div>

      <!-- Title & Date Strip -->
      <div style="background: #1e293b; color: #ffffff; border-radius: 6px; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-left: 4px solid #f59c73;">
        <div style="font-size: 13.5px; font-weight: 800; font-family: ${GUJARATI_FONT_FAMILY};">
          💡 આજનું જાણવા જેવું (૨૦ પ્રશ્નોત્તરી — એક શબ્દમાં જવાબ)
        </div>
        <div style="font-size: 11.5px; font-weight: 700; color: #f59c73;">
          ${bulletin.editionDate} • બપોરે ૧:૦૦ વાગ્યાની આવૃત્તિ
        </div>
      </div>

      <!-- Suvichar Strip -->
      <div style="background: #fdfaf6; border-left: 3.5px solid #f59c73; padding: 6px 10px; margin-bottom: 8px; border-radius: 4px;">
        <span style="font-size: 10.5px; font-weight: 800; color: #9d512d;">✨ આજનો સુવિચાર: </span>
        <span style="font-size: 11px; font-weight: 600; color: #1e293b; font-family: ${GUJARATI_FONT_FAMILY};">
          "${suvicharText}"
        </span>
      </div>

      <!-- 20 Questions: Clean 2-Column Side-by-Side Layout (1-10 on Left, 11-20 on Right) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex: 1; align-items: stretch;">
        <div style="display: flex; flex-direction: column; gap: 4.5px; justify-content: space-between;">
          ${renderColumnItems(col1, 0)}
        </div>
        <div style="display: flex; flex-direction: column; gap: 4.5px; justify-content: space-between;">
          ${renderColumnItems(col2, 10)}
        </div>
      </div>

      <!-- Footer Note -->
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #64748b;">
        <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • સામાન્ય જ્ઞાન સેવા</span>
        <span>${bulletin.editionDate}</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

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
  const cleanSchool = schoolName.replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
  const fileName = `${cleanSchool}_Suvichar_${bulletin.dateKey}.pdf`;

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
  container.style.lineHeight = '1.4';
  container.style.padding = '24px 28px';
  container.style.boxSizing = 'border-box';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.justifyContent = 'space-between';

  const { thought, authorOrSource, explanation, example, moralValue } = bulletin.suvichar;

  container.innerHTML = `
    <div style="border: 3px double #9d512d; border-radius: 12px; padding: 24px 28px; background: #ffffff; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- School Header -->
      <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">
        <h1 style="font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; line-height: 1.25; font-family: ${GUJARATI_FONT_FAMILY};">
          ${schoolName}
        </h1>
        <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">
          ${options.diseCode ? `DISE કોડ: ${options.diseCode} • ` : ''}${options.district ? `${options.district} જિલ્લો, ગુજરાત • ` : ''}શાળા પ્રાર્થના સંમેલન & પ્રેરણા વાણી
        </div>
      </div>

      <!-- Title & Date Strip -->
      <div style="background: linear-gradient(135deg, #9d512d, #b55f37); color: #ffffff; border-radius: 8px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; margin: 14px 0;">
        <div style="font-size: 16px; font-weight: 800; letter-spacing: 0.3px; font-family: ${GUJARATI_FONT_FAMILY};">
          ✨ આજનો સુવિચાર (Ajno Suvichar)
        </div>
        <div style="font-size: 12px; font-weight: 700; background: rgba(0,0,0,0.25); padding: 3px 10px; border-radius: 5px;">
          ${bulletin.editionDate}
        </div>
      </div>

      <!-- Main Thought Card -->
      <div style="background: #fdfaf6; border: 2px solid #f59c73; border-radius: 12px; padding: 22px 24px; text-align: center; margin: 12px 0;">
        <div style="font-size: 32px; color: #9d512d; line-height: 1; margin-bottom: 4px;">❝</div>
        <div style="font-size: 20px; font-weight: 800; color: #1e293b; line-height: 1.5; font-family: ${GUJARATI_FONT_FAMILY};">
          ${thought}
        </div>
        <div style="font-size: 32px; color: #9d512d; line-height: 1; margin-top: 4px;">❞</div>
        ${
          authorOrSource
            ? `
          <div style="margin-top: 10px; font-size: 13px; font-weight: 700; color: #9d512d; font-family: ${GUJARATI_FONT_FAMILY};">
            — ${authorOrSource}
          </div>
        `
            : ''
        }
      </div>

      <!-- Explanations & Examples Section -->
      <div style="display: flex; flex-direction: column; gap: 14px; margin: 10px 0;">
        <!-- Short Explanation -->
        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 12px 16px;">
          <div style="font-size: 12.5px; font-weight: 800; color: #1d4ed8; margin-bottom: 4px; font-family: ${GUJARATI_FONT_FAMILY};">
            📖 ટૂંકી સમજૂતી (Explanation):
          </div>
          <div style="font-size: 12px; color: #334155; line-height: 1.5; font-family: ${GUJARATI_FONT_FAMILY};">
            ${explanation}
          </div>
        </div>

        <!-- Practical Example -->
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 6px; padding: 12px 16px;">
          <div style="font-size: 12.5px; font-weight: 800; color: #047857; margin-bottom: 4px; font-family: ${GUJARATI_FONT_FAMILY};">
            🌟 વ્યવહારિક ઉદાહરણ (Real-Life Example):
          </div>
          <div style="font-size: 12px; color: #1e293b; line-height: 1.5; font-family: ${GUJARATI_FONT_FAMILY};">
            ${example}
          </div>
        </div>

        <!-- Moral Value Badge -->
        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11.5px; font-weight: 800; color: #b45309;">🎯 આજનું પાયાનું જીવનમૂલ્ય:</span>
          <span style="font-size: 12px; font-weight: 800; background: #fde68a; color: #78350f; padding: 2px 10px; border-radius: 6px; font-family: ${GUJARATI_FONT_FAMILY};">
            ${moralValue}
          </span>
        </div>
      </div>

      <!-- Inspirational Assembly Message -->
      <div style="text-align: center; padding: 8px; color: #64748b; font-size: 11px; font-style: italic; font-family: ${GUJARATI_FONT_FAMILY};">
        "વિદ્યાર્થીઓ માટે આજના દિવસે મનન કરવા અને જીવનમાં ઉતારવા યોગ્ય પવિત્ર વિચાર."
      </div>

      <!-- Footer Note -->
      <div style="padding-top: 10px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b;">
        <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • પ્રેરણા વાણી શ્રેણી</span>
        <span>${bulletin.editionDate}</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

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
      `📖 *ટૂંકી સમજૂતી:* ${explanation}\n` +
      `🌟 *ઉદાહરણ:* ${example}\n` +
      `🎯 *જીવનમૂલ્ય:* ${moralValue}\n\n` +
      `📎 *નોંધ:* આ સુવિચારની 1-Page PDF ફાઇલ આપના ડિવાઇસમાં *"${fileName}"* નામથી સેવ થઈ ગઈ છે.\n` +
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
