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
    aiModulePromise = import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.8/+esm');
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
  // Alpha Noise Floor Despeckle: clean any faint stray dust (alpha < 35)
  try {
    const imgBitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = imgBitmap.width;
    canvas.height = imgBitmap.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(imgBitmap, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 35) d[i + 3] = 0;
      }
      ctx.putImageData(imgData, 0, 0);
      return await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || blob), 'image/webp', 0.88);
      });
    }
  } catch {
    // Graceful fallback to original blob
  }
  return blob;
}
