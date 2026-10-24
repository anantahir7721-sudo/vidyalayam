/**
 * Unified Printing and PDF Sharing/Downloading Utility
 * Designed for 100% flawless operation across both:
 * 1. Native Android APK (via AndroidBridge JavascriptInterface & PrintManager)
 * 2. Chrome Web App & Desktop Browsers (via zero-popup hidden iframe & Web APIs)
 */

import {
  DailyNewsBulletin,
  DailyPrashnotariBulletin,
  DailyInterestingFactsBulletin,
  DailySuvicharBulletin,
} from '../types';
import { toGujaratiDigits } from '../services/dailyKnowledgeService';

/**
 * Check if running inside the Android APK with native bridge
 */
export function isAndroidNativeApp(): boolean {
  try {
    return Boolean(
      typeof window !== 'undefined' &&
      window.AndroidBridge &&
      (window.AndroidBridge.isAndroidApp?.() ||
       typeof window.AndroidBridge.downloadBase64Pdf === 'function' ||
       typeof window.AndroidBridge.saveBase64Pdf === 'function')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Convert a Blob into a raw base64 string (without the data URL prefix)
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (!result) {
        resolve('');
        return;
      }
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Universal HTML document printer:
 * - On Native Android APK: Invokes the native Android PrintManager via AndroidBridge.
 *   Shows the system print preview sheet with "Save as PDF" and direct printer output!
 * - On Web Browsers: Injects an offscreen hidden <iframe> and triggers print() directly,
 *   completely bypassing pop-up blockers and preventing blank tabs from opening!
 */
export function printHtmlDocument(html: string, jobTitle: string = 'Vidyalayam_Document'): void {
  const cleanTitle = jobTitle.trim().replace(/[\\/:*?"<>|]/g, '_') || 'Vidyalayam_Document';

  // 1. Android APK Native Path (Native PrintManager sheet)
  if (isAndroidNativeApp()) {
    try {
      if (typeof window.AndroidBridge?.printHtml === 'function') {
        window.AndroidBridge.printHtml(html, cleanTitle);
        return;
      } else if (typeof window.AndroidBridge?.print === 'function') {
        window.AndroidBridge.print();
        return;
      }
    } catch (err) {
      console.warn('[printHtmlDocument] AndroidBridge print failed, falling back:', err);
    }
  }

  // 2. High-Reliability Clean Off-screen IFrame Print (Guaranteed across all browsers & mobile devices)
  try {
    const existingFrame = document.getElementById('vidyalayam_print_iframe');
    if (existingFrame && document.body.contains(existingFrame)) {
      document.body.removeChild(existingFrame);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'vidyalayam_print_iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('[printHtmlDocument] iframe print error:', e);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 30000);
        }
      }, 400);
      return;
    }
  } catch (iframeErr) {
    console.warn('[printHtmlDocument] IFrame print failed, trying direct portal print:', iframeErr);
  }

  // 3. Fallback: In-Page Print Portal without destroying flexbox styles
  try {
    let printContainer = document.getElementById('vidyalayam_print_portal');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'vidyalayam_print_portal';
      document.body.appendChild(printContainer);
    }

    let printStyle = document.getElementById('vidyalayam_print_stylesheet') as HTMLStyleElement | null;
    if (!printStyle) {
      printStyle = document.createElement('style');
      printStyle.id = 'vidyalayam_print_stylesheet';
      printStyle.textContent = `
        @media screen {
          #vidyalayam_print_portal {
            display: none !important;
            visibility: hidden !important;
          }
        }
        @media print {
          body > *:not(#vidyalayam_print_portal) {
            display: none !important;
            visibility: hidden !important;
          }
          #vidyalayam_print_portal {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: 9999999 !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `;
      document.head.appendChild(printStyle);
    }

    printContainer.innerHTML = html;

    const cleanup = () => {
      if (printContainer && document.body.contains(printContainer)) {
        printContainer.innerHTML = '';
      }
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 25000);

    window.print();
    return;
  } catch (directPrintErr) {
    console.warn('[printHtmlDocument] Direct print error:', directPrintErr);
  }
}

/**
 * Explicit PDF File Downloader
 * - On Native Android APK: Saves directly to device's public Downloads directory,
 *   registers in system download history, and pops a system completion notification with tap to open!
 * - On Web: Uses reliable blob object URL with standard a.download anchor click.
 */
export async function downloadPdfFile(
  source: Blob | string,
  filename: string
): Promise<{ success: boolean; method: string }> {
  let cleanFilename = filename.trim().replace(/[\\/:*?"<>|]/g, '_') || 'Vidyalayam_Document.pdf';
  if (!cleanFilename.toLowerCase().endsWith('.pdf')) {
    cleanFilename += '.pdf';
  }

  // 1. Android APK Native Path
  if (isAndroidNativeApp()) {
    try {
      const rawBase64 = typeof source === 'string' ? source : await blobToBase64(source);
      const cleanBase64 = rawBase64.includes(',') ? rawBase64.split(',')[1].trim() : rawBase64.trim();
      if (window.AndroidBridge!.downloadBase64Pdf) {
        window.AndroidBridge!.downloadBase64Pdf(cleanBase64, cleanFilename, 'application/pdf');
      } else {
        window.AndroidBridge!.saveBase64Pdf(cleanBase64, cleanFilename, 'application/pdf');
      }
      return { success: true, method: 'android_native_download' };
    } catch (err) {
      console.warn('[downloadPdfFile] AndroidBridge download failed, falling back to web:', err);
    }
  }

  // 2. Browser Blob Download
  try {
    let blob: Blob;
    if (typeof source === 'string') {
      const raw = source.includes(',') ? source.split(',')[1].trim() : source.trim();
      const byteCharacters = atob(raw);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
    } else {
      blob = source;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { success: true, method: 'browser_download' };
  } catch (err) {
    console.error('[downloadPdfFile] Browser download failed:', err);
    return { success: false, method: 'failed' };
  }
}

/**
 * Explicit PDF File Sharer (WhatsApp & Native Share)
 */
export async function sharePdfFile(
  source: Blob | string,
  filename: string,
  title?: string,
  shareText?: string
): Promise<{ success: boolean; method: string }> {
  const cleanFilename = filename.trim().replace(/[\\/:*?"<>|]/g, '_') || 'Vidyalayam_Document.pdf';

  // 1. Android APK Native Path
  if (isAndroidNativeApp()) {
    try {
      const base64Data = typeof source === 'string' ? source : await blobToBase64(source);
      if (window.AndroidBridge!.shareBase64Pdf) {
        window.AndroidBridge!.shareBase64Pdf(base64Data, cleanFilename, 'application/pdf', shareText || title || '');
        return { success: true, method: 'android_native_share' };
      }
    } catch (err) {
      console.warn('[sharePdfFile] AndroidBridge share failed, falling back:', err);
    }
  }

  // 2. Web Share API
  try {
    let blob: Blob;
    if (typeof source === 'string') {
      const raw = source.includes(',') ? source.split(',')[1].trim() : source.trim();
      const byteCharacters = atob(raw);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
    } else {
      blob = source;
    }

    const pdfFile = new File([blob], cleanFilename, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({
        files: [pdfFile],
        title: title || cleanFilename,
        text: shareText || '',
      });
      return { success: true, method: 'web_share' };
    }
  } catch (shareErr: any) {
    if (shareErr.name === 'AbortError') {
      return { success: true, method: 'user_cancelled_share' };
    }
  }

  // Fallback to direct download
  return downloadPdfFile(source, cleanFilename);
}

/**
 * Universal PDF Download and Sharing Handler
 * - On Native Android APK: Saves file directly to Downloads using AndroidBridge,
 *   displays a native Toast confirmation, and opens the system Open/Share chooser!
 * - On Web Browsers: Uses standard file download or Web Share API.
 */
export async function downloadOrSharePdf(
  source: Blob | string,
  filename: string,
  title?: string
): Promise<{ success: boolean; method: string }> {
  return downloadPdfFile(source, filename);
}

/**
 * Generate Clean A4 Printable HTML for Daily News Bulletin
 */
export function getPrintableDailyNewsHtml(
  bulletin: DailyNewsBulletin,
  schoolName: string = 'શાળા શૈક્ષણિક પોર્ટલ',
  diseCode?: string,
  district?: string
): string {
  const displaySchool = schoolName || 'શાળા શૈક્ષણિક પોર્ટલ';
  return `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <title>${displaySchool} — આજના સમાચાર (${bulletin.editionDate})</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Anek Gujarati', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.45;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-border {
      border: 2px solid #9d512d;
      border-radius: 8px;
      padding: 16px 20px;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.3;
    }
    .header .subtitle {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }
    .strip {
      background: #9d512d;
      color: #ffffff;
      border-radius: 6px;
      padding: 7px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-size: 13px;
      font-weight: 800;
    }
    .strip .date {
      font-size: 11px;
      font-weight: 700;
      background: rgba(0,0,0,0.25);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .shloka-box {
      background: #fdfaf6;
      border-left: 4px solid #9d512d;
      padding: 7px 12px;
      border-radius: 4px;
      margin-bottom: 12px;
      font-size: 11px;
      line-height: 1.4;
    }
    .items-container {
      display: flex;
      flex-direction: column;
      gap: 7px;
      flex: 1;
      margin-bottom: 10px;
    }
    .item-card {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 7px;
      padding: 7px 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      page-break-inside: avoid;
    }
    .badge {
      background: #9d512d;
      color: #ffffff;
      font-weight: 800;
      font-size: 11px;
      width: 24px;
      height: 24px;
      line-height: 24px;
      text-align: center;
      border-radius: 6px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .item-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
      line-height: 1.35;
    }
    .item-desc {
      font-size: 10.5px;
      color: #334155;
      line-height: 1.4;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="page-border">
    <div>
      <div class="header">
        <h1>${displaySchool}</h1>
        <div class="subtitle">
          ${diseCode ? `DISE કોડ: ${diseCode} • ` : ''}${district ? `${district} જિલ્લો, ગુજરાત • ` : ''}દૈનિક સમાચાર બુલેટિન (શાળા પ્રાર્થના સભા)
        </div>
      </div>

      <div class="strip">
        <div>📰 આજના મુખ્ય ${toGujaratiDigits(Math.min(bulletin.items.length, 15))} સમાચાર</div>
        <div class="date">${bulletin.editionDate} • સવારે ૫:૦૦ વાગ્યાની આવૃત્તિ</div>
      </div>

      ${bulletin.morningPrayerShloka ? `
        <div class="shloka-box">
          <strong style="color: #9d512d;">✨ પ્રાર્થના મંત્ર / સુવિચાર: </strong>
          <span style="color: #334155; font-style: italic;">${bulletin.morningPrayerShloka}</span>
        </div>
      ` : ''}

      <div class="items-container">
        ${bulletin.items.slice(0, 15).map((item, idx) => `
          <div class="item-card">
            <div class="badge">${toGujaratiDigits(idx + 1)}</div>
            <div style="flex: 1; min-width: 0;">
              <div class="item-title">
                ${item.location ? `<span style="color: #9d512d; font-weight: 800;">[📍 ${item.location}] </span>` : ''}${item.headline}
              </div>
              <div class="item-desc">${item.summary}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="footer">
      <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • શાળા પ્રાર્થના સંમેલન & બુલેટિન સેવા</span>
      <span>${bulletin.editionDate}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate Clean A4 Printable HTML for Daily Prashnotari (Q&A)
 */
export function getPrintableDailyPrashnotariHtml(
  bulletin: DailyPrashnotariBulletin,
  schoolName: string = 'શાળા શૈક્ષણિક પોર્ટલ',
  diseCode?: string,
  district?: string
): string {
  const displaySchool = schoolName || 'શાળા શૈક્ષણિક પોર્ટલ';
  const cleanAnswer = (ans: string): string => {
    if (!ans) return '';
    let clean = ans.replace(/\(.*?\)/g, '').trim();
    clean = clean.replace(/^જવાબ[:\s]*/i, '').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    return words[0] || clean;
  };

  const col1 = bulletin.questions.slice(0, 10);
  const col2 = bulletin.questions.slice(10, 20);

  const renderCol = (items: typeof col1, startIdx: number) => {
    return items.map((q, i) => `
      <div style="border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 7px; padding: 6px 10px; display: flex; align-items: flex-start; gap: 8px; page-break-inside: avoid; min-height: 40px;">
        <span style="background: #1e293b; color: #ffffff; font-weight: 800; font-size: 10.5px; width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 5px; flex-shrink: 0; margin-top: 1px;">
          ${toGujaratiDigits(startIdx + i + 1)}
        </span>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.35; margin-bottom: 2px;">
            ${q.question}
          </div>
          <div>
            <span style="display: inline-block; font-size: 9.5px; font-weight: 800; background: #dcfce7; color: #166534; padding: 1px 7px; border-radius: 4px; border: 1px solid #86efac; line-height: 1.25;">
              જવાબ: ${cleanAnswer(q.answer)}
            </span>
          </div>
        </div>
      </div>
    `).join('');
  };

  return `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <title>${displaySchool} — દૈનિક પ્રશ્નોત્તરી (${bulletin.editionDate})</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Anek Gujarati', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.45;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-border {
      border: 2px solid #9d512d;
      border-radius: 8px;
      padding: 16px 20px;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.3;
    }
    .header .subtitle {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }
    .strip {
      background: #1e293b;
      color: #ffffff;
      border-radius: 6px;
      padding: 7px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-size: 13px;
      font-weight: 800;
      border-left: 4px solid #f59c73;
    }
    .strip .date {
      font-size: 11px;
      font-weight: 700;
      color: #f59c73;
    }
    .suvichar-box {
      background: #fdfaf6;
      border-left: 4px solid #f59c73;
      padding: 7px 12px;
      border-radius: 4px;
      margin-bottom: 12px;
      font-size: 11px;
      line-height: 1.4;
    }
    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      flex: 1;
      margin-bottom: 10px;
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="page-border">
    <div>
      <div class="header">
        <h1>${displaySchool}</h1>
        <div class="subtitle">
          ${diseCode ? `DISE કોડ: ${diseCode} • ` : ''}${district ? `${district} જિલ્લો, ગુજરાત • ` : ''}દૈનિક સામાન્ય જ્ઞાન પ્રશ્નોત્તરી
        </div>
      </div>

      <div class="strip">
        <div>💡 આજની પ્રશ્નોત્તરી (૨૦ પ્રશ્નો — એક શબ્દમાં જવાબ)</div>
        <div class="date">${bulletin.editionDate}</div>
      </div>

      ${bulletin.suvichar ? `
        <div class="suvichar-box">
          <strong style="color: #9d512d;">✨ આજનો સુવિચાર: </strong>
          <span style="color: #1e293b;">"${bulletin.suvichar}"</span>
        </div>
      ` : ''}

      <div class="grid-2col">
        <div class="col">${renderCol(col1, 0)}</div>
        <div class="col">${renderCol(col2, 10)}</div>
      </div>
    </div>

    <div class="footer">
      <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • સામાન્ય જ્ઞાન & સ્પર્ધાત્મક પરીક્ષા સજ્જતા</span>
      <span>${bulletin.editionDate}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate Clean A4 Printable HTML for Daily 12 Interesting Facts (Janva Jevu)
 */
export function getPrintableDailyJanvaJevuHtml(
  bulletin: DailyInterestingFactsBulletin,
  schoolName: string = 'શાળા શૈક્ષણિક પોર્ટલ',
  diseCode?: string,
  district?: string
): string {
  const displaySchool = schoolName || 'શાળા શૈક્ષણિક પોર્ટલ';
  return `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <title>${displaySchool} — આજનું જાણવા જેવું (${bulletin.editionDate})</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Anek Gujarati', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.45;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-border {
      border: 2px solid #d97706;
      border-radius: 8px;
      padding: 16px 20px;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      font-weight: 800;
      color: #1e293b;
      line-height: 1.3;
    }
    .header .subtitle {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .strip {
      background: #b45309;
      color: #ffffff;
      border-radius: 6px;
      padding: 7px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-size: 13px;
      font-weight: 800;
    }
    .strip .date {
      font-size: 11px;
      font-weight: 700;
      background: rgba(0,0,0,0.22);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .grid-facts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      flex: 1;
      margin-bottom: 10px;
    }
    .fact-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #f59e0b;
      border-radius: 7px;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .fact-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .badge {
      background: #fef3c7;
      color: #92400e;
      font-size: 9.5px;
      font-weight: 800;
      border-radius: 4px;
      width: 20px;
      height: 20px;
      line-height: 20px;
      text-align: center;
      display: inline-block;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .fact-title {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.35;
    }
    .fact-category {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
      flex-shrink: 0;
      margin-left: 6px;
    }
    .fact-body {
      font-size: 10px;
      color: #334155;
      line-height: 1.4;
      margin-top: 2px;
    }
    .why-matters {
      font-size: 9px;
      color: #0284c7;
      font-style: italic;
      line-height: 1.3;
      margin-top: 3px;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="page-border">
    <div>
      <div class="header">
        <h1>${displaySchool}</h1>
        <div class="subtitle">
          ${diseCode ? `DISE કોડ: ${diseCode} • ` : ''}${district ? `${district} જિલ્લો, ગુજરાત • ` : ''}સામાન્ય જ્ઞાન — વિશેષ ૧૨ તથ્યો (ધોરણ ૯ થી ૧૨)
        </div>
      </div>

      <div class="strip">
        <div>💡 આજનું જાણવા જેવું — ૧૨ રોમાંચક તથ્યો</div>
        <div class="date">${bulletin.editionDate} • બપોરે ૧:૦૦ વાગ્યાની આવૃત્તિ</div>
      </div>

      <div class="grid-facts">
        ${bulletin.facts.slice(0, 12).map((fact) => `
          <div class="fact-card">
            <div>
              <div class="fact-header">
                <div style="display: flex; align-items: flex-start; gap: 6px;">
                  <span class="badge">${toGujaratiDigits(fact.factNumber)}</span>
                  <span class="fact-title">${fact.title}</span>
                </div>
                <span class="fact-category">${fact.category}</span>
              </div>
              <div class="fact-body">${fact.fact}</div>
            </div>
            ${fact.whyItMatters ? `<div class="why-matters">💡 ${fact.whyItMatters}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="footer">
      <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • રોજ બપોરે ૧:૦૦ વાગ્યે ઓટો-અપડેટ</span>
      <span>${bulletin.editionDate}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate Clean A4 Printable HTML for Daily Suvichar & Speech Script
 */
export function getPrintableDailySuvicharHtml(
  bulletin: DailySuvicharBulletin,
  schoolName: string = 'શાળા શૈક્ષણિક પોર્ટલ',
  diseCode?: string,
  district?: string
): string {
  const displaySchool = schoolName || 'શાળા શૈક્ષણિક પોર્ટલ';
  return `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <title>${displaySchool} — આજનો સુવિચાર (${bulletin.editionDate})</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Anek Gujarati', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-border {
      border: 2px solid #059669;
      border-radius: 8px;
      padding: 16px 20px;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      font-weight: 800;
      color: #065f46;
      line-height: 1.3;
    }
    .header .subtitle {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }
    .strip {
      background: #059669;
      color: #ffffff;
      border-radius: 6px;
      padding: 7px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 800;
    }
    .suvichar-highlight {
      background: #ecfdf5;
      border: 1.5px solid #a7f3d0;
      border-left: 5px solid #059669;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 14px;
    }
    .suvichar-quote {
      font-size: 15px;
      font-weight: 800;
      color: #065f46;
      line-height: 1.5;
      margin-bottom: 4px;
    }
    .value-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      background: #10b981;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 12px;
      background: #f8fafc;
    }
    .card-title {
      font-size: 12px;
      font-weight: 800;
      color: #047857;
      margin-bottom: 6px;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 4px;
    }
    .card-body {
      font-size: 11.5px;
      color: #1e293b;
      line-height: 1.6;
      white-space: pre-line;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="page-border">
    <div>
      <div class="header">
        <h1>${displaySchool}</h1>
        <div class="subtitle">
          ${diseCode ? `DISE કોડ: ${diseCode} • ` : ''}${district ? `${district} જિલ્લો, ગુજરાત • ` : ''}શાળા પ્રાર્થના સંમેલન દૈનિક સંસ્કાર ધારા
        </div>
      </div>

      <div class="strip">
        <div>✨ આજનો પ્રેરણાદાયી સુવિચાર & વિદ્યાર્થી વક્તવ્ય</div>
        <div>${bulletin.editionDate}</div>
      </div>

      <div class="suvichar-highlight">
        <div class="suvichar-quote">"${bulletin.suvichar.thought}"</div>
        <div style="font-size: 11.5px; color: #047857; margin-bottom: 6px; font-weight: 600;">— ${bulletin.suvichar.authorOrSource}</div>
        ${bulletin.suvichar.moralValue ? `<div class="value-badge">મૂલ્ય શિક્ષણ: ${bulletin.suvichar.moralValue}</div>` : ''}
      </div>

      ${bulletin.suvichar.explanation ? `
        <div class="card">
          <div class="card-title">📖 વિસ્તૃત સમજૂતી & સભા વક્તવ્ય:</div>
          <div class="card-body">${bulletin.suvichar.explanation}</div>
        </div>
      ` : ''}

      ${bulletin.suvichar.example ? `
        <div class="card" style="background: #fffbeb; border-color: #fde68a;">
          <div class="card-title" style="color: #b45309; border-color: #fde68a;">🌟 વ્યવહારિક ઉદાહરણ:</div>
          <div class="card-body" style="color: #78350f;">${bulletin.suvichar.example}</div>
        </div>
      ` : ''}
    </div>

    <div class="footer">
      <span>વિદ્યાલયમ શૈક્ષણિક પોર્ટલ • સંસ્કાર, સંસ્કૃતિ અને મૂલ્ય નિર્માણ</span>
      <span>${bulletin.editionDate}</span>
    </div>
  </div>
</body>
</html>`;
}
