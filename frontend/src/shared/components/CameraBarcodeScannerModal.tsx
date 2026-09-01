import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import * as ZXingModule from 'html5-qrcode/third_party/zxing-js.umd.js';
import { triggerHaptic } from '@/shared/utils/haptics';
import { Button } from '@/shared/ui/button';

const ZXing: any = (ZXingModule as any).default || ZXingModule;

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  continuous?: boolean;
}

function playScanBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch {
    // Ignore audio errors
  }
  triggerHaptic('success');
}

/**
 * Fast histogram contrast stretching (Auto-Levels)
 * Normalizes low-contrast camera frames so gray/faded lines become sharp black & white.
 */
function applyAutoContrast(ctx: CanvasRenderingContext2D, width: number, height: number) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    let minL = 255;
    let maxL = 0;
    
    // Fast luminance sampling (every 16th pixel)
    for (let i = 0; i < data.length; i += 16) {
      const l = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
      if (l < minL) minL = l;
      if (l > maxL) maxL = l;
    }

    const range = maxL - minL;
    if (range > 25 && range < 225) {
      const scale = 255 / range;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, (data[i] - minL) * scale));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - minL) * scale));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - minL) * scale));
      }
      ctx.putImageData(imgData, 0, 0);
    }
  } catch {}
}

function decodeFrameWithZXing(canvas: HTMLCanvasElement): string | null {
  if (!ZXing || !ZXing.HTMLCanvasElementLuminanceSource) return null;

  try {
    const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
    
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      ZXing.BarcodeFormat.EAN_13,
      ZXing.BarcodeFormat.CODE_128,
      ZXing.BarcodeFormat.EAN_8,
      ZXing.BarcodeFormat.UPC_A,
      ZXing.BarcodeFormat.UPC_E,
      ZXing.BarcodeFormat.CODE_39,
      ZXing.BarcodeFormat.CODE_93,
      ZXing.BarcodeFormat.ITF,
      ZXing.BarcodeFormat.QR_CODE,
      ZXing.BarcodeFormat.DATA_MATRIX,
    ]);

    // 1. Primary: MultiFormatOneDReader with GlobalHistogramBinarizer (best for commodity EAN-13 lines)
    if (ZXing.MultiFormatOneDReader && ZXing.GlobalHistogramBinarizer) {
      try {
        const binarizer = new ZXing.GlobalHistogramBinarizer(luminanceSource);
        const bitmap = new ZXing.BinaryBitmap(binarizer);
        const oneDReader = new ZXing.MultiFormatOneDReader(hints);
        const result = oneDReader.decode(bitmap, hints);
        if (result && result.getText()) {
          return result.getText();
        }
      } catch {}
    }

    // 2. Secondary: MultiFormatReader with GlobalHistogramBinarizer
    if (ZXing.GlobalHistogramBinarizer) {
      try {
        const binarizer = new ZXing.GlobalHistogramBinarizer(luminanceSource);
        const bitmap = new ZXing.BinaryBitmap(binarizer);
        const reader = new ZXing.MultiFormatReader();
        reader.setHints(hints);
        const result = reader.decode(bitmap);
        if (result && result.getText()) {
          return result.getText();
        }
      } catch {}
    }

    // 3. Fallback: HybridBinarizer (for 2D QR / DataMatrix)
    if (ZXing.HybridBinarizer) {
      try {
        const binarizer = new ZXing.HybridBinarizer(luminanceSource);
        const bitmap = new ZXing.BinaryBitmap(binarizer);
        const reader = new ZXing.MultiFormatReader();
        reader.setHints(hints);
        const result = reader.decode(bitmap);
        if (result && result.getText()) {
          return result.getText();
        }
      } catch {}
    }

    // 4. Fallback: Inverted Luminance Source (for low-contrast or colored packaging)
    if (ZXing.InvertedLuminanceSource && ZXing.GlobalHistogramBinarizer) {
      try {
        const invertedSource = new ZXing.InvertedLuminanceSource(luminanceSource);
        const binarizer = new ZXing.GlobalHistogramBinarizer(invertedSource);
        const bitmap = new ZXing.BinaryBitmap(binarizer);
        const oneDReader = new ZXing.MultiFormatOneDReader(hints);
        const result = oneDReader.decode(bitmap, hints);
        if (result && result.getText()) {
          return result.getText();
        }
      } catch {}
    }
  } catch {}
  return null;
}

export function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'مسح باركود الصنف',
  continuous = false,
}: CameraBarcodeScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isContinuousMode, setIsContinuousMode] = useState(continuous);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerIdRef = useRef(`z-scanner-${Math.random().toString(36).substring(2, 9)}`);
  const isMountedRef = useRef(true);
  const lastScanTimeRef = useRef<number>(0);
  const nativeDetectorTimerRef = useRef<any>(null);

  const handleScanSuccess = useCallback((decodedText: string) => {
    const raw = String(decodedText || '').trim();
    if (!raw) return;

    const now = Date.now();
    // Debounce duplicate scans within 1.2 seconds
    if (now - lastScanTimeRef.current < 1200 && lastScanned === raw) {
      return;
    }
    lastScanTimeRef.current = now;
    setLastScanned(raw);
    playScanBeep();
    onScan(raw);

    if (!isContinuousMode) {
      setTimeout(() => {
        if (isMountedRef.current) onClose();
      }, 300);
    }
  }, [isContinuousMode, lastScanned, onClose, onScan]);

  const stopCurrentScanner = useCallback(async () => {
    if (nativeDetectorTimerRef.current) {
      clearInterval(nativeDetectorTimerRef.current);
      nativeDetectorTimerRef.current = null;
    }
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async (camIndex = 0) => {
    await stopCurrentScanner();
    setErrorMsg(null);
    setIsInitializing(true);
    setHasTorch(false);
    setIsTorchOn(false);

    const elementId = scannerIdRef.current;
    const scannerEl = document.getElementById(elementId);
    if (!scannerEl) {
      setIsInitializing(false);
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode(elementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerRef.current = html5QrCode;

      // Query available video devices and ensure REAR/BACK camera is always first!
      let cameras: Array<{ id: string; label: string }> = [];
      try {
        cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const rearCameras = cameras.filter((c) =>
            /back|rear|environment|main|primary|wide|خلف/i.test(c.label)
          );
          const frontCameras = cameras.filter((c) =>
            /front|user|selfie|face|أمام/i.test(c.label)
          );
          const otherCameras = cameras.filter(
            (c) => !rearCameras.includes(c) && !frontCameras.includes(c)
          );
          const sorted = [...rearCameras, ...otherCameras, ...frontCameras];
          cameras = sorted.length > 0 ? sorted : cameras;
          setAvailableCameras(cameras);
        }
      } catch (camErr) {
        console.warn('getCameras warning:', camErr);
      }

      const scanConfig: any = {
        fps: 15,
        videoConstraints: {
          facingMode: { ideal: 'environment' },
          width: { min: 1280, ideal: 1920, max: 1920 },
          height: { min: 720, ideal: 1080, max: 1080 },
          focusMode: { ideal: 'continuous' },
          advanced: [
            { focusMode: 'continuous' },
            { exposureMode: 'continuous' },
            { whiteBalanceMode: 'continuous' },
          ],
        },
        aspectRatio: 1.333333,
        disableFlip: true,
      };

      // Always default to REAR/BACK camera
      let cameraToUse: any = { facingMode: 'environment' };

      if (cameras && cameras.length > 0) {
        if (camIndex === 0) {
          const explicitBack = cameras.find((c) =>
            /back|rear|environment|main|wide|خلف/i.test(c.label)
          );
          if (explicitBack) {
            cameraToUse = explicitBack.id;
          } else {
            cameraToUse = { facingMode: 'environment' };
          }
        } else {
          const safeIdx = camIndex % cameras.length;
          cameraToUse = cameras[safeIdx].id;
        }
      }

      await html5QrCode.start(
        cameraToUse,
        scanConfig,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Frame scan error - ignore normal stream noise
        }
      );

      // Fast multi-scale background loop with Auto-Contrast Booster
      const offscreenCanvas = document.createElement('canvas');
      const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

      const centerCropCanvas = document.createElement('canvas');
      const centerCropCtx = centerCropCanvas.getContext('2d', { willReadFrequently: true });

      const tightCropCanvas = document.createElement('canvas');
      const tightCropCtx = tightCropCanvas.getContext('2d', { willReadFrequently: true });

      const videoEl = scannerEl.querySelector('video') as HTMLVideoElement;
      if (videoEl) {
        let detector: any = null;
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            detector = new (window as any).BarcodeDetector({
              formats: [
                'ean_13',
                'ean_8',
                'code_128',
                'code_39',
                'upc_a',
                'upc_e',
                'qr_code',
                'itf',
                'data_matrix',
              ],
            });
          } catch {}
        }

        let loopCounter = 0;
        nativeDetectorTimerRef.current = setInterval(async () => {
          if (!isMountedRef.current) return;
          try {
            if (videoEl.readyState >= 2) {
              loopCounter++;

              // 1. Hardware BarcodeDetector if available
              if (detector) {
                try {
                  const detected = await detector.detect(videoEl);
                  if (detected && detected.length > 0 && detected[0]?.rawValue) {
                    handleScanSuccess(detected[0].rawValue);
                    return;
                  }
                } catch {}
              }

              const vw = videoEl.videoWidth || 1280;
              const vh = videoEl.videoHeight || 720;

              // 2. Full Frame Pass (for large/normal barcodes)
              if (offscreenCanvas.width !== vw || offscreenCanvas.height !== vh) {
                offscreenCanvas.width = vw;
                offscreenCanvas.height = vh;
              }
              if (offscreenCtx) {
                offscreenCtx.drawImage(videoEl, 0, 0, vw, vh);
                let decoded = decodeFrameWithZXing(offscreenCanvas);
                if (decoded) {
                  handleScanSuccess(decoded);
                  return;
                }

                // Alternate Auto-Contrast pass every 2 cycles for low-light / faded barcodes
                if (loopCounter % 2 === 0) {
                  applyAutoContrast(offscreenCtx, vw, vh);
                  decoded = decodeFrameWithZXing(offscreenCanvas);
                  if (decoded) {
                    handleScanSuccess(decoded);
                    return;
                  }
                }
              }

              // 3. Medium Center Crop (65% area - for distance / handheld products)
              const cropW = Math.floor(vw * 0.65);
              const cropH = Math.floor(vh * 0.65);
              const cropX = Math.floor((vw - cropW) / 2);
              const cropY = Math.floor((vh - cropH) / 2);

              if (centerCropCanvas.width !== cropW || centerCropCanvas.height !== cropH) {
                centerCropCanvas.width = cropW;
                centerCropCanvas.height = cropH;
              }
              if (centerCropCtx) {
                centerCropCtx.drawImage(videoEl, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                let decodedZoom = decodeFrameWithZXing(centerCropCanvas);
                if (decodedZoom) {
                  handleScanSuccess(decodedZoom);
                  return;
                }

                if (loopCounter % 2 === 1) {
                  applyAutoContrast(centerCropCtx, cropW, cropH);
                  decodedZoom = decodeFrameWithZXing(centerCropCanvas);
                  if (decodedZoom) {
                    handleScanSuccess(decodedZoom);
                    return;
                  }
                }
              }

              // 4. Tight Center Crop (40% area - for tiny barcodes on small packaging)
              const tightW = Math.floor(vw * 0.40);
              const tightH = Math.floor(vh * 0.40);
              const tightX = Math.floor((vw - tightW) / 2);
              const tightY = Math.floor((vh - tightH) / 2);

              if (tightCropCanvas.width !== tightW || tightCropCanvas.height !== tightH) {
                tightCropCanvas.width = tightW;
                tightCropCanvas.height = tightH;
              }
              if (tightCropCtx) {
                tightCropCtx.drawImage(videoEl, tightX, tightY, tightW, tightH, 0, 0, tightW, tightH);
                const decodedTight = decodeFrameWithZXing(tightCropCanvas);
                if (decodedTight) {
                  handleScanSuccess(decodedTight);
                  return;
                }
              }
            }
          } catch {}
        }, 50);
      }

      if (isMountedRef.current) {
        setIsInitializing(false);
      }

      // Check for torch capability
      try {
        const track = (html5QrCode as any).getRunningTrackCapabilities?.() ||
          (html5QrCode as any).getRunningTrackCameraCapabilities?.();
        if (track?.torchFeature?.()?.isSupported?.() || track?.torch) {
          setHasTorch(true);
        }
      } catch {}
    } catch (err: any) {
      console.error('Camera scanner init error:', err);
      if (isMountedRef.current) {
        setIsInitializing(false);
        const errStr = String(err?.message || err || '');
        if (err?.name === 'NotAllowedError' || errStr.includes('Permission') || errStr.includes('NotAllowed')) {
          setErrorMsg('تم رفض إذن الكاميرا. يرجى تفعيل إذن الكاميرا من إعدادات المتصفح.');
        } else if (err?.name === 'NotFoundError' || errStr.includes('NotFound') || errStr.includes('DevicesNotFoundError')) {
          setErrorMsg('لم يتم العثور على كاميرا في هذا الجهاز. يمكنك إدخال الباركود يدوياً.');
        } else if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          setErrorMsg('يتطلب فتح الكاميرا في المتصفح تشغيل النظام عبر اتصال آمن (HTTPS) أو من localhost.');
        } else {
          setErrorMsg('تعذر فتح الكاميرا. يرجى التحقق من إعطاء الصلاحية أو استخدام الإدخال اليدوي.');
        }
      }
    }
  }, [handleScanSuccess, stopCurrentScanner]);

  const switchCamera = useCallback(async () => {
    if (availableCameras.length < 2) return;
    const nextIdx = (activeCameraIndex + 1) % availableCameras.length;
    setActiveCameraIndex(nextIdx);
    triggerHaptic('light');
    await startScanner(nextIdx);
  }, [activeCameraIndex, availableCameras.length, startScanner]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setIsTorchOn(nextState);
      triggerHaptic('light');
    } catch (e) {
      console.warn('Torch toggle not supported:', e);
    }
  }, [hasTorch, isTorchOn]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualBarcode.trim();
    if (!code) return;
    handleScanSuccess(code);
    setManualBarcode('');
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (!isOpen) return;

    const timer = setTimeout(() => {
      startScanner(activeCameraIndex);
    }, 150);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      void stopCurrentScanner();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="z-scanner-backdrop" role="dialog" aria-modal="true" dir="rtl">
      <div className="z-scanner-card">
        
        {/* Simple Light Header */}
        <div className="z-scanner-header">
          <div className="z-scanner-title-wrap">
            <h3 className="z-scanner-title">{title}</h3>
          </div>

          <div className="z-scanner-header-actions">
            {availableCameras.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                onClick={switchCamera}
                title="تبديل الكاميرا"
                style={{ padding: '4px 8px', fontSize: '0.8rem', minHeight: '30px' }}
              >
                🔄 تبديل
              </Button>
            )}

            {hasTorch && (
              <Button
                type="button"
                variant={isTorchOn ? 'primary' : 'secondary'}
                onClick={toggleTorch}
                title={isTorchOn ? 'إطفاء الفلاش' : 'تشغيل الفلاش'}
                style={{ padding: '4px 8px', fontSize: '0.8rem', minHeight: '30px' }}
              >
                💡 {isTorchOn ? 'إطفاء' : 'فلاش'}
              </Button>
            )}

            <button
              type="button"
              className="z-scanner-btn-close"
              onClick={onClose}
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewport Box */}
        <div className="z-scanner-viewport-wrap">
          <div id={scannerIdRef.current} className="z-scanner-video-feed" />

          {/* Simple Aiming Frame */}
          {!errorMsg && !isInitializing && (
            <div className="z-scanner-aim-frame">
              <div className="z-aim-box" />
            </div>
          )}

          {/* Loading Layer */}
          {isInitializing && !errorMsg && (
            <div className="z-scanner-overlay-state">
              <div className="z-scanner-spinner" />
              <span className="z-scanner-state-text">جاري تشغيل الكاميرا...</span>
            </div>
          )}

          {/* Clean Light Error View */}
          {errorMsg && (
            <div className="z-scanner-error-card">
              <div style={{ fontSize: '2rem', marginBottom: '4px' }}>📷</div>
              <strong style={{ fontSize: '0.92rem', color: '#991b1b', marginBottom: '4px' }}>تعذر الوصول إلى الكاميرا</strong>
              <p style={{ fontSize: '0.78rem', color: '#7f1d1d', margin: '0 0 12px 0', lineHeight: 1.5 }}>{errorMsg}</p>
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => startScanner(activeCameraIndex)}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  إعادة المحاولة
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowManualInput(true)}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  إدخال الباركود يدوياً
                </Button>
              </div>
            </div>
          )}

          {/* Success Toast Notification */}
          {lastScanned && (
            <div className="z-scanner-success-toast">
              <span style={{ fontWeight: 800 }}>✓ تم المسح:</span>
              <strong style={{ marginInlineStart: '4px' }}>{lastScanned}</strong>
            </div>
          )}
        </div>

        {/* Manual Barcode Input */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="z-scanner-manual-box">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="اكتب رقم الباركود هنا..."
              className="z-scanner-manual-input"
              autoFocus
            />
            <Button type="submit" variant="primary" disabled={!manualBarcode.trim()} style={{ padding: '0 14px', minHeight: '34px', fontSize: '0.825rem' }}>
              إضافة
            </Button>
          </form>
        )}

        {/* Simple Light Footer */}
        <div className="z-scanner-footer">
          <div className="z-scanner-footer-row">
            <span className="z-scanner-hint">
              وجّه الكاميرا نحو الباركود لقراءته تلقائياً
            </span>
            {!showManualInput && (
              <button
                type="button"
                className="z-scanner-text-link"
                onClick={() => setShowManualInput(true)}
              >
                إدخال يدوي
              </button>
            )}
          </div>

          <label className="z-scanner-continuous-switch">
            <input
              type="checkbox"
              checked={isContinuousMode}
              onChange={(e) => {
                triggerHaptic('light');
                setIsContinuousMode(e.target.checked);
              }}
            />
            <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>المسح المتتالي (إبقاء الكاميرا مفتوحة)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
