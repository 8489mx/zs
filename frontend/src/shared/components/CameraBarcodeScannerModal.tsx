import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  continuous?: boolean;
}

function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch {
    // Ignore audio error
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(50);
    } catch {
      // Ignore vibration error
    }
  }
}

export function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'مسح باركود بالكاميرا',
  continuous = false,
}: CameraBarcodeScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isContinuousMode, setIsContinuousMode] = useState(continuous);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerIdRef = useRef(`camera-scanner-${Math.random().toString(36).substring(2, 9)}`);
  const lastScanTimeRef = useRef<number>(0);

  const handleScanSuccess = useCallback((decodedText: string) => {
    const now = Date.now();
    // Debounce duplicate scans within 1.2 seconds
    if (now - lastScanTimeRef.current < 1200 && lastScanned === decodedText) {
      return;
    }
    lastScanTimeRef.current = now;
    setLastScanned(decodedText);
    playScanBeep();
    onScan(decodedText);

    if (!isContinuousMode) {
      onClose();
    }
  }, [isContinuousMode, lastScanned, onClose, onScan]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any]
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle not supported on this camera/browser', e);
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
          ],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minDim * 0.82),
              height: Math.floor(minDim * 0.55),
            };
          },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Frame scan miss (normal)
          }
        );

        setIsInitializing(false);

        // Check torch capabilities
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities() as any;
          if (capabilities && capabilities.torch) {
            setHasTorch(true);
          }
        } catch {
          // Torch not available
        }
      } catch (err: any) {
        console.error('Camera barcode scan error:', err);
        setIsInitializing(false);
        if (err?.name === 'NotAllowedError' || String(err).includes('Permission')) {
          setErrorMsg('تم رفض إذن الوصول للكاميرا. يرجى تفعيل صلاحية الكاميرا في إعدادات المتصفح.');
        } else if (err?.name === 'NotFoundError' || String(err).includes('NotFound')) {
          setErrorMsg('لم يتم العثور على كاميرا في هذا الجهاز.');
        } else {
          setErrorMsg(err?.message || 'تعذر تشغيل الكاميرا. يرجى التأكد من صلاحيات المتصفح.');
        }
      }
    };

    const timer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {}).finally(() => {
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
    <div className="camera-barcode-modal-backdrop" role="dialog" aria-modal="true" dir="rtl">
      <div className="camera-barcode-modal-container">
        {/* Header */}
        <div className="camera-barcode-modal-header">
          <div className="camera-barcode-modal-title-group">
            <div className="camera-barcode-modal-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>
            <h4>{title}</h4>
          </div>
          
          <div className="camera-barcode-modal-controls">
            {hasTorch && (
              <button
                type="button"
                className={`camera-barcode-torch-btn ${isTorchOn ? 'active' : ''}`}
                onClick={toggleTorch}
                title={isTorchOn ? 'إطفاء الفلاش' : 'تشغيل الفلاش'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </button>
            )}
            <button
              type="button"
              className="camera-barcode-close-btn"
              onClick={onClose}
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="camera-barcode-viewport-wrap">
          <div id={scannerIdRef.current} className="camera-barcode-video-target" />

          {/* Laser & Target Box Overlay */}
          {!errorMsg && (
            <div className="camera-barcode-overlay-target">
              <div className="camera-barcode-corner corner-tl" />
              <div className="camera-barcode-corner corner-tr" />
              <div className="camera-barcode-corner corner-bl" />
              <div className="camera-barcode-corner corner-br" />
              <div className="camera-barcode-laser" />
            </div>
          )}

          {/* Loading Indicator */}
          {isInitializing && !errorMsg && (
            <div className="camera-barcode-status-layer">
              <div className="camera-barcode-spinner" />
              <span>جاري فتح الكاميرا...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="camera-barcode-error-layer">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>{errorMsg}</p>
              <button type="button" className="camera-barcode-retry-btn" onClick={onClose}>
                إغلاق
              </button>
            </div>
          )}

          {/* Last Scanned Feedback Banner */}
          {lastScanned && (
            <div className="camera-barcode-success-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>تم قراءة الباركود: <strong>{lastScanned}</strong></span>
            </div>
          )}
        </div>

        {/* Footer info & options */}
        <div className="camera-barcode-modal-footer">
          <div className="camera-barcode-footer-tip">
            <span>وجه الكاميرا نحو الباركود ليتم قراءته تلقائياً</span>
          </div>

          <label className="camera-barcode-continuous-toggle">
            <input
              type="checkbox"
              checked={isContinuousMode}
              onChange={(e) => setIsContinuousMode(e.target.checked)}
            />
            <span>المسح المتتالي (إبقاء الكاميرا مفتوحة لإضافة عدة أصناف)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
