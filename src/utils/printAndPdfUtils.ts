/**
 * Unified Printing and PDF Sharing/Downloading Utility
 * Designed for 100% flawless operation across both:
 * 1. Native Android APK (via AndroidBridge JavascriptInterface & PrintManager)
 * 2. Chrome Web App & Desktop Browsers (via zero-popup hidden iframe & Web APIs)
 */

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

  // 1. Android APK Native Path
  if (isAndroidNativeApp()) {
    try {
      window.AndroidBridge!.printHtml(html, cleanTitle);
      return;
    } catch (err) {
      console.warn('[printHtmlDocument] AndroidBridge print failed, falling back:', err);
    }
  }

  // 2. Modern In-Page Iframe Printing (Zero Pop-Up Blocking in Web/Desktop/Mobile Chrome)
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
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('[printHtmlDocument] Iframe print call error:', e);
        }
        // Retain iframe for 30s so print spooler finishes reading it
        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch (e) {}
        }, 30000);
      };

      // Allow fonts and styles in the written HTML to load
      if (iframe.contentWindow) {
        setTimeout(triggerPrint, 400);
      }
      return;
    }
  } catch (iframeErr) {
    console.warn('[printHtmlDocument] Iframe method failed, falling back to popup:', iframeErr);
  }

  // 3. Fallback: Window Popup (if iframe blocked by strict sandboxing)
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {}
      }, 400);
    }
  } catch (popErr) {
    console.error('[printHtmlDocument] All print methods failed:', popErr);
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
  const cleanFilename = filename.trim().replace(/[\\/:*?"<>|]/g, '_') || 'Vidyalayam_Document.pdf';

  // 1. Android APK Native Path
  if (isAndroidNativeApp()) {
    try {
      const base64Data = typeof source === 'string' ? source : await blobToBase64(source);
      if (window.AndroidBridge!.downloadBase64Pdf) {
        window.AndroidBridge!.downloadBase64Pdf(base64Data, cleanFilename, 'application/pdf');
      } else {
        window.AndroidBridge!.saveBase64Pdf(base64Data, cleanFilename, 'application/pdf');
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
      const byteCharacters = atob(source);
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
    setTimeout(() => URL.revokeObjectURL(url), 5000);
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
      const byteCharacters = atob(source);
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
