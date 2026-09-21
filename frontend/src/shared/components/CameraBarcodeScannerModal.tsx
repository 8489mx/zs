import { lazy, Suspense, useEffect, useState } from 'react';
import type { CameraBarcodeScannerModalProps } from './CameraBarcodeScannerView';

// PERF-6 (ARCHITECTURE_INVARIANTS.md §2.6): html5-qrcode + zxing are ~335KB. This modal is imported by
// the app shell (MobileQuickActionSheet → PriceStockCheckerModal), so a static import put the scanner
// in the startup bundle of EVERY page. The real scanner lives in CameraBarcodeScannerView and is only
// fetched the first time a scanner is opened. Never import CameraBarcodeScannerView statically.
const CameraBarcodeScannerView = lazy(() =>
  import('./CameraBarcodeScannerView').then((module) => ({ default: module.CameraBarcodeScannerView })),
);

export type { CameraBarcodeScannerModalProps };

function ScannerLoadingFallback() {
  return (
    <div className="z-scanner-backdrop" role="dialog" aria-modal="true" aria-busy="true" dir="rtl">
      <div className="z-scanner-card">
        <div className="z-scanner-viewport-wrap">
          <div className="z-scanner-overlay-state">
            <div className="z-scanner-spinner" />
            <span className="z-scanner-state-text">جاري تشغيل الكاميرا...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CameraBarcodeScannerModal(props: CameraBarcodeScannerModalProps) {
  // Once opened, keep the view mounted (it renders null while closed) so its state — selected camera,
  // continuous-scan toggle — survives close/reopen exactly as before the lazy split.
  const [hasOpened, setHasOpened] = useState(props.isOpen);
  useEffect(() => {
    if (props.isOpen) setHasOpened(true);
  }, [props.isOpen]);

  if (!props.isOpen && !hasOpened) return null;

  return (
    <Suspense fallback={props.isOpen ? <ScannerLoadingFallback /> : null}>
      <CameraBarcodeScannerView {...props} />
    </Suspense>
  );
}
