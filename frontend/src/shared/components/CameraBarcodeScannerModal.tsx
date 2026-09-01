import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { triggerHaptic } from '@/shared/utils/haptics';
import { Button } from '@/shared/ui/button';

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
        fps: 10,
        videoConstraints: {
          facingMode: { ideal: 'environment' },
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          focusMode: { ideal: 'continuous' },
          advanced: [{ focusMode: 'continuous' }],
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

      // Fast native BarcodeDetector background loop for instant recognition
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({
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

          const videoEl = scannerEl.querySelector('video');
          if (videoEl) {
            nativeDetectorTimerRef.current = setInterval(async () => {
              if (!isMountedRef.current) return;
              try {
                if (videoEl.readyState >= 2) {
                  const detected = await detector.detect(videoEl);
                  if (detected && detected.length > 0 && detected[0]?.rawValue) {
                    handleScanSuccess(detected[0].rawValue);
                  }
                }
              } catch {}
            }, 100);
          }
        } catch (e) {
          console.warn('Native BarcodeDetector setup skipped:', e);
        }
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
