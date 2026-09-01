import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { triggerHaptic } from '@/shared/utils/haptics';

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
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
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
  title = 'مسح الباركود',
  continuous = false,
}: CameraBarcodeScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isContinuousMode, setIsContinuousMode] = useState(continuous);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [scanSuccessAnim, setScanSuccessAnim] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerIdRef = useRef(`scanner-${Math.random().toString(36).substring(2, 9)}`);
  const lastScanTimeRef = useRef<number>(0);

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
    setScanSuccessAnim(true);
    playScanBeep();
    onScan(raw);

    setTimeout(() => {
      setScanSuccessAnim(false);
    }, 400);

    if (!isContinuousMode) {
      setTimeout(() => {
        onClose();
      }, 250);
    }
  }, [isContinuousMode, lastScanned, onClose, onScan]);

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

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setIsInitializing(true);
    setLastScanned(null);
    setIsTorchOn(false);

    const elementId = scannerIdRef.current;
    let html5QrCode: Html5Qrcode | null = null;

    const startCamera = async () => {
      try {
        html5QrCode = new Html5Qrcode(elementId, {
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
        });
        scannerRef.current = html5QrCode;

        // Full-frame scanning without restrictive qrbox crop
        // so barcodes anywhere in the camera view are captured instantly
        const config = {
          fps: 24,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => ({
            width: Math.floor(viewfinderWidth * 0.92),
            height: Math.floor(viewfinderHeight * 0.85),
          }),
        };

        const cameraConfig = {
          facingMode: 'environment',
          focusMode: 'continuous',
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        };

        await html5QrCode.start(
          cameraConfig,
          config,
          (decodedText: string) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Frame miss (normal)
          }
        );

        setIsInitializing(false);

        // Check torch support
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities() as any;
          if (capabilities && capabilities.torch) {
            setHasTorch(true);
          }
        } catch {
          // Torch not available
        }
      } catch (err: any) {
        console.error('Camera scanner init error:', err);
        setIsInitializing(false);
        if (err?.name === 'NotAllowedError' || String(err).includes('Permission')) {
          setErrorMsg('تم رفض إذن الكاميرا. يرجى السماح للمتصفح بالوصول إلى الكاميرا.');
        } else if (err?.name === 'NotFoundError' || String(err).includes('NotFound')) {
          setErrorMsg('لم يتم العثور على كاميرا في هذا الجهاز.');
        } else {
          setErrorMsg(err?.message || 'تعذر تشغيل الكاميرا. تأكد من إعطاء الصلاحية.');
        }
      }
    };

    const timer = setTimeout(() => {
      startCamera();
    }, 120);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .catch(() => {})
            .finally(() => {
              try {
                scannerRef.current?.clear();
              } catch {}
              scannerRef.current = null;
            });
        } else {
          try {
            scannerRef.current.clear();
          } catch {}
          scannerRef.current = null;
        }
      }
    };
  }, [isOpen, handleScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="z-scanner-backdrop" role="dialog" aria-modal="true" dir="rtl">
      <div className={`z-scanner-card ${scanSuccessAnim ? 'is-success-flash' : ''}`}>
        {/* Header */}
        <div className="z-scanner-header">
          <div className="z-scanner-title-wrap">
            <div className="z-scanner-logo-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <rect x="7" y="7" width="10" height="10" rx="1" />
              </svg>
            </div>
            <div className="z-scanner-titles">
              <h3 className="z-scanner-title">{title}</h3>
              <span className="z-scanner-sub">Z-ERP Smart Barcode Engine</span>
            </div>
          </div>

          <div className="z-scanner-header-actions">
            {hasTorch && (
              <button
                type="button"
                className={`z-scanner-btn-torch ${isTorchOn ? 'is-on' : ''}`}
                onClick={toggleTorch}
                title={isTorchOn ? 'إطفاء الفلاش' : 'تشغيل الفلاش'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isTorchOn ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </button>
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

        {/* Camera Viewport */}
        <div className="z-scanner-viewport-wrap">
          <div id={scannerIdRef.current} className="z-scanner-video-feed" />

          {/* Luxury Apple-style Aiming Frame Overlay */}
          {!errorMsg && (
            <div className="z-scanner-aim-frame">
              <div className="z-aim-corner top-right" />
              <div className="z-aim-corner top-left" />
              <div className="z-aim-corner bottom-right" />
              <div className="z-aim-corner bottom-left" />
              <div className="z-aim-center-line" />
            </div>
          )}

          {/* Loading Layer */}
          {isInitializing && !errorMsg && (
            <div className="z-scanner-overlay-state">
              <div className="z-scanner-spinner" />
              <span className="z-scanner-state-text">جاري تفعيل الكاميرا...</span>
            </div>
          )}

          {/* Error Layer */}
          {errorMsg && (
            <div className="z-scanner-overlay-state error">
              <div className="z-scanner-error-icon">⚠️</div>
              <p className="z-scanner-error-text">{errorMsg}</p>
              <button type="button" className="z-scanner-btn-dismiss" onClick={onClose}>
                إغلاق
              </button>
            </div>
          )}

          {/* Success Banner */}
          {lastScanned && (
            <div className="z-scanner-success-toast">
              <div className="z-success-icon">✓</div>
              <div className="z-success-text">
                <small>تم قراءة الباركود بنجاح</small>
                <strong>{lastScanned}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Controls */}
        <div className="z-scanner-footer">
          <p className="z-scanner-hint">
            وجّه الكاميرا نحو أي باركود في العبوة ليتم التعرف عليه فوراً
          </p>

          <label className="z-scanner-continuous-switch">
            <input
              type="checkbox"
              checked={isContinuousMode}
              onChange={(e) => {
                triggerHaptic('light');
                setIsContinuousMode(e.target.checked);
              }}
            />
            <span className="switch-slider" />
            <span className="switch-label">المسح المتتالي (إبقاء الكاميرا مفتوحة)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
