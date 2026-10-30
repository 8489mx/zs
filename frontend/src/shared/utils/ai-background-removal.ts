/**
 * Professional AI Client-side Background Removal (WebAssembly / WebWorker)
 * 100% Client-side execution in merchant's browser (Mobile & Desktop).
 * 0% server CPU / RAM load.
 *
 * Quantized model weights cached in browser IndexedDB for lifetime offline usage.
 */

export interface AiRemovalProgress {
  key: string;
  current: number;
  total: number;
  percent: number;
}

export type ProgressCallback = (progress: AiRemovalProgress) => void;

let aiModulePromise: Promise<any> | null = null;
let isModelPreloaded = false;

export async function getAiRemovalModule() {
  if (!aiModulePromise) {
    // Dynamic ESM import from CDN, zero impact on app shell startup bundle (PERFORMANCE_CONSTITUTION)
    const cdnUrl = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.8/+esm';
    aiModulePromise = (new Function('url', 'return import(url)')(cdnUrl) as Promise<any>);
  }
  return aiModulePromise;
}

export async function preloadAiModel(onProgress?: ProgressCallback): Promise<boolean> {
  try {
    const mod = await getAiRemovalModule();
    if (mod.preload) {
      await mod.preload({
        model: 'small',
        device: 'gpu',
        proxyToWorker: true,
        progress: (key: string, current: number, total: number) => {
          if (onProgress && total > 0) {
            onProgress({
              key,
              current,
              total,
              percent: Math.round((current / total) * 100)
            });
          }
        }
      });
    }
    isModelPreloaded = true;
    return true;
  } catch (err) {
    console.warn('AI Background model preload warning:', err);
    return false;
  }
}

export function isAiModelReady(): boolean {
  return isModelPreloaded;
}

export async function removeBackgroundWithAi(
  imageSource: string | Blob | File | HTMLImageElement,
  onProgress?: ProgressCallback
): Promise<Blob> {
  // 1. Normalize any input (relative URL, data URL, ImageElement, or File) into a verified binary Blob
  let resolvedBlob: Blob;

  if (imageSource instanceof Blob) {
    resolvedBlob = imageSource;
  } else if (typeof imageSource === 'string') {
    if (imageSource.startsWith('data:')) {
      const res = await fetch(imageSource);
      resolvedBlob = await res.blob();
    } else {
      // Resolve relative path against current browser origin (prevents CDN 404 text/html resolution)
      const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const absoluteUrl = imageSource.startsWith('http://') || imageSource.startsWith('https://')
        ? imageSource
        : new URL(imageSource, baseOrigin).href;

      try {
        const res = await fetch(absoluteUrl, { credentials: 'same-origin' });
        const fetchedBlob = await res.blob();
        if (fetchedBlob.type && !fetchedBlob.type.startsWith('image/')) {
          throw new Error(`استجاب السيرفر بنوع غير صالح: ${fetchedBlob.type}`);
        }
        resolvedBlob = fetchedBlob;
      } catch {
        // Fallback: draw through an HTMLImageElement to bypass any CORS / header quirks
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(true);
          img.onerror = () => reject(new Error('تعذر تحميل صورة الصنف من الرابط المحدد'));
          img.src = absoluteUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('فشل إنشاء محرك معالجة الصورة');
        ctx.drawImage(img, 0, 0);
        resolvedBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('فشل تحويل الصورة إلى بايتات'))), 'image/png');
        });
      }
    }
  } else if (typeof (imageSource as any)?.src === 'string') {
    // HTMLImageElement
    const img = imageSource as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('فشل إنشاء محرك معالجة الصورة');
    ctx.drawImage(img, 0, 0);
    resolvedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('فشل تحويل الصورة إلى بايتات'))), 'image/png');
    });
  } else {
    throw new Error('نوع مدخل الصورة غير مدعوم');
  }

  const mod = await getAiRemovalModule();
  const blob: Blob = await mod.removeBackground(resolvedBlob, {
    model: 'small',
    device: 'gpu',
    proxyToWorker: true,
    output: {
      format: 'image/webp',
      quality: 0.85
    },
    progress: (key: string, current: number, total: number) => {
      if (onProgress && total > 0) {
        onProgress({
          key,
          current,
          total,
          percent: Math.round((current / total) * 100)
        });
      }
    }
  });
  // Comprehensive Post-processing:
  // 1. Alpha Noise Floor & Studio Remnants Despeckle
  // 2. Connected Component Isolated Island Pruning (eliminates floating specks in the air)
  // 3. Smart Auto-Trim Bounding Box (crops empty borders so product fills 90% of card)
  try {
    const imgBitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = imgBitmap.width;
    canvas.height = imgBitmap.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(imgBitmap, 0, 0);
      const width = canvas.width;
      const height = canvas.height;
      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;
      const totalPixels = width * height;

      // Pass 1: Annihilate faint alpha dust (< 45) and semi-transparent studio haze
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3];
        if (a === 0) continue;
        if (a < 45) {
          d[i + 3] = 0;
          continue;
        }
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const chroma = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
        const lum = (r * 2 + g * 3 + b) / 6;

        // Studio white backdrop residue: high luminance + neutral chroma + semi-transparent
        if (a < 120 && lum >= 195 && chroma <= 14) {
          d[i + 3] = 0;
        }
      }

      // Pass 2: Prune small disconnected islands (specks in the air)
      const visited = new Uint8Array(totalPixels);
      const queue = new Int32Array(totalPixels);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (visited[idx] || d[idx * 4 + 3] === 0) continue;

          let head = 0;
          let tail = 0;
          queue[tail++] = idx;
          visited[idx] = 1;

          while (head < tail) {
            const curr = queue[head++];
            const cx = curr % width;
            const cy = (curr / width) | 0;

            const n1 = cx > 0 ? curr - 1 : -1;
            const n2 = cx < width - 1 ? curr + 1 : -1;
            const n3 = cy > 0 ? curr - width : -1;
            const n4 = cy < height - 1 ? curr + width : -1;

            if (n1 !== -1 && !visited[n1] && d[n1 * 4 + 3] > 0) {
              visited[n1] = 1;
              queue[tail++] = n1;
            }
            if (n2 !== -1 && !visited[n2] && d[n2 * 4 + 3] > 0) {
              visited[n2] = 1;
              queue[tail++] = n2;
            }
            if (n3 !== -1 && !visited[n3] && d[n3 * 4 + 3] > 0) {
              visited[n3] = 1;
              queue[tail++] = n3;
            }
            if (n4 !== -1 && !visited[n4] && d[n4 * 4 + 3] > 0) {
              visited[n4] = 1;
              queue[tail++] = n4;
            }
          }

          // If component has fewer than 220 pixels, it is floating dust/speckles! Prune it completely!
          if (tail < 220) {
            for (let k = 0; k < tail; k++) {
              d[queue[k] * 4 + 3] = 0;
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Pass 3: Smart Auto-Trim (crop empty transparent borders)
      let minX = width, minY = height, maxX = -1, maxY = -1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (d[(y * width + x) * 4 + 3] > 20) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX >= minX && maxY >= minY) {
        const prodW = maxX - minX + 1;
        const prodH = maxY - minY + 1;
        const pad = Math.max(8, Math.round(Math.max(prodW, prodH) * 0.04));
        const cropX = Math.max(0, minX - pad);
        const cropY = Math.max(0, minY - pad);
        const cropW = Math.min(width - cropX, prodW + pad * 2);
        const cropH = Math.min(height - cropY, prodH + pad * 2);

        if (cropW < width * 0.95 || cropH < height * 0.95) {
          const trimmedCanvas = document.createElement('canvas');
          trimmedCanvas.width = cropW;
          trimmedCanvas.height = cropH;
          const trimmedCtx = trimmedCanvas.getContext('2d');
          if (trimmedCtx) {
            trimmedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            return await new Promise<Blob>((resolve) => {
              trimmedCanvas.toBlob((b) => resolve(b || blob), 'image/webp', 0.90);
            });
          }
        }
      }

      return await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || blob), 'image/webp', 0.90);
      });
    }
  } catch (err) {
    console.warn('Post-processing despeckle/trim warning:', err);
  }
  return blob;
}
