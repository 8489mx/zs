/**
 * Image input guards before decode (Memory protection & early rejection)
 * Protects client-side memory from OOM crashes when processing oversized files.
 */

export const MAX_PRODUCT_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_PIXELS = 25_000_000;

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Probe image dimensions by reading only the first 128KB header slice.
 * Fail-open: returns null on unparsable formats or read failures, never throws.
 */
export async function probeImageDimensions(file: Blob): Promise<ImageDimensions | null> {
  try {
    const slice = file.slice(0, 128 * 1024);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    if (bytes.length < 16) return null;

    // 1. PNG probe
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      if (bytes.length >= 24) {
        const width = view.getUint32(16, false);
        const height = view.getUint32(20, false);
        if (width > 0 && height > 0) return { width, height };
      }
      return null;
    }

    // 2. JPEG probe
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      while (offset + 4 <= bytes.length) {
        if (bytes[offset] !== 0xff) return null;

        const marker = (bytes[offset] << 8) | bytes[offset + 1];

        // Standalone markers without length: RST0-RST7, SOI, EOI
        if ((marker >= 0xffd0 && marker <= 0xffd9) || marker === 0xff01) {
          offset += 2;
          continue;
        }

        // Start of Scan: entropy-coded data follows, SOF must precede SOS
        if (marker === 0xffda) {
          return null;
        }

        const segLength = view.getUint16(offset + 2, false);
        if (segLength < 2) return null;

        // SOF0 (Baseline) or SOF2 (Progressive)
        if (marker === 0xffc0 || marker === 0xffc2) {
          if (offset + 9 <= bytes.length) {
            const height = view.getUint16(offset + 5, false);
            const width = view.getUint16(offset + 7, false);
            if (width > 0 && height > 0) return { width, height };
          }
          return null;
        }

        offset += 2 + segLength;
      }
      return null;
    }

    // 3. WebP probe
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 && // RIFF
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50 // WEBP
    ) {
      // Chunk header at offset 12: 4 bytes tag
      const tag = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

      if (tag === 'VP8X') {
        if (bytes.length >= 30) {
          const width = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1;
          const height = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1;
          if (width > 0 && height > 0) return { width, height };
        }
        return null;
      }

      if (tag === 'VP8 ') {
        if (bytes.length >= 30) {
          const width = bytes[26] | ((bytes[27] & 0x3f) << 8);
          const height = bytes[28] | ((bytes[29] & 0x3f) << 8);
          if (width > 0 && height > 0) return { width, height };
        }
        return null;
      }

      if (tag === 'VP8L') {
        if (bytes.length >= 25) {
          const width = (bytes[21] | ((bytes[22] & 0x3f) << 8)) + 1;
          const height = (((bytes[22] >> 6) | (bytes[23] << 2) | ((bytes[24] & 0x0f) << 10))) + 1;
          if (width > 0 && height > 0) return { width, height };
        }
        return null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Assert that a file/blob stays within allowed byte and pixel bounds before decode.
 * Throws explicit user-friendly Arabic errors upon breach.
 */
export async function assertImageInputWithinLimits(file: Blob): Promise<void> {
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error('حجم الصورة كبير جدا (أكثر من 20 ميجابايت). يرجى اختيار صورة أصغر أو ضغطها قبل الرفع.');
  }

  const dimensions = await probeImageDimensions(file);
  if (dimensions && dimensions.width * dimensions.height > MAX_PRODUCT_IMAGE_PIXELS) {
    throw new Error('أبعاد الصورة كبيرة جدا. يرجى اختيار صورة أبعادها أصغر قبل الرفع.');
  }
}
