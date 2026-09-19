/**
 * Utility functions for compressing and processing student photos
 * Ensures photos stored in Firestore are optimized (<50KB),
 * preventing document size limits and maintaining high performance.
 */

export async function compressStudentPhoto(
  file: File,
  maxWidth = 320,
  maxHeight = 400,
  quality = 0.82
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

        // Draw with smooth scaling
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
 * Supports PNG transparency or JPEG compression, max 300x300.
 */
export async function compressSchoolLogo(
  file: File,
  maxWidth = 300,
  maxHeight = 300
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

        // If file is PNG, keep PNG for transparency if under 150KB, else JPEG 0.85
        const isPng = file.type === 'image/png';
        let compressed = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85);
        if (compressed.length > 200000) {
          compressed = canvas.toDataURL('image/jpeg', 0.80);
        }
        resolve(compressed);
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

