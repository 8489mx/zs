import { useState } from 'react';
import type { UpdateCheckResult } from '@/features/updates/hooks/useOfflineUpdateCheck';

interface OfflineUpdateBannerProps {
  update: UpdateCheckResult;
}

export function OfflineUpdateBanner({ update }: OfflineUpdateBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!update.hasUpdate || dismissed) return null;

  return (
    <div className="offline-update-banner" role="alert" aria-live="polite" dir="rtl">
      <div className="offline-update-banner__icon" aria-hidden="true">🔔</div>
      <div className="offline-update-banner__body">
        <strong className="offline-update-banner__title">
          يوجد تحديث جديد متاح — الإصدار{' '}
          <span className="offline-update-banner__version">v{update.latest}</span>
        </strong>
        {update.changelog && (
          <p className="offline-update-banner__changelog">{update.changelog}</p>
        )}
      </div>
      <div className="offline-update-banner__actions">
        {update.patchUrl && (
          <a
            href={update.patchUrl}
            target="_blank"
            rel="noreferrer"
            className="offline-update-banner__download-btn"
            aria-label={`تحميل تحديث الإصدار ${update.latest}`}
          >
            ⬇ تحميل التحديث
          </a>
        )}
        <button
          type="button"
          className="offline-update-banner__dismiss"
          onClick={() => setDismissed(true)}
          aria-label="إغلاق إشعار التحديث"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
