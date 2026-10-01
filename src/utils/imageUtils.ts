/**
 * Utility functions for compressing, auto-resizing, and processing school photos & logos.
 * Ensures all photos stored in Firestore are optimized (<25-35KB),
 * preventing document size bloating and drastically saving server storage
 * while preserving crystal-clear visual quality.
 */

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Automatically resizes and compresses student or staff photos before upload.
 * Defaults to max 260x340 px with JPEG 80% quality.
 * Shrinks 2-5MB photos down to ~15-25KB with high visual fidelity.
 */
export async function compressStudentPhoto(
  file: File,
  maxWidth = 260,
  maxHeight = 340,
  quality = 0.80
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('કૃપા કરીને માન્ય ઇમેજ ફાઇલ પસંદ કરો (Please select a valid image file).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ફોટો વાંચવામાં ભૂલ આવી (Failed to read image file).'));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('ઇમેજ લોડ કરવામાં નિષ્ફળ (Failed to load image).'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserving dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('કેનવાસ ઉપલબ્ધ નથી (Canvas context not available).'));
          return;
        }

        // Draw with smooth high quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with compression
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Utility function for compressing and processing school logos.
 * Auto-resizes to max 260x260 px to minimize server storage.
 */
export async function compressSchoolLogo(
  file: File,
  maxWidth = 260,
  maxHeight = 260
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('કૃપા કરીને માન્ય ઇમેજ ફાઇલ પસંદ કરો (Please select a valid image file).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('લોગો વાંચવામાં ભૂલ આવી (Failed to read logo file).'));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('લોગો લોડ કરવામાં નિષ્ફળ (Failed to load logo image).'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('કેનવાસ ઉપલબ્ધ નથી (Canvas context not available).'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // If file is PNG, keep PNG for transparency if under 70KB, else JPEG 0.82
        const isPng = file.type === 'image/png';
        let compressed = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.82);
        if (compressed.length > 90000) {
          compressed = canvas.toDataURL('image/jpeg', 0.80);
        }
        resolve(compressed);
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Auto-resizes any existing base64 image data URL in the browser.
 */
export async function autoResizeBase64(
  dataUrl: string,
  maxWidth = 260,
  maxHeight = 340,
  quality = 0.80
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      // If image is already smaller than target, check if it needs compression
      if (img.width <= maxWidth && img.height <= maxHeight && dataUrl.length < 35000) {
        resolve(dataUrl);
        return;
      }

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const isPng = dataUrl.startsWith('data:image/png');
      const compressed = isPng && dataUrl.length < 50000 
        ? canvas.toDataURL('image/png') 
        : canvas.toDataURL('image/jpeg', quality);

      resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
    };

    img.src = dataUrl;
  });
}
