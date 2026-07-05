import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { settingsApi } from '@/features/settings/api/settings.api';
import type { UpdateCheckResult } from '@/features/updates/hooks/useOfflineUpdateCheck';

interface OfflineUpdateBannerProps {
  update: UpdateCheckResult;
}

type InstallState = 'idle' | 'installing' | 'restarting' | 'error';

export function OfflineUpdateBanner({ update }: OfflineUpdateBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const triggerMutation = useMutation({
    mutationFn: settingsApi.offlineReleases.triggerUpdate,
    onMutate: () => {
      setInstallState('installing');
      setErrorMsg('');
    },
    onSuccess: () => {
      setInstallState('restarting');
      // After 8 seconds reload the page — by then the backend should be back up
      setTimeout(() => {
        window.location.reload();
      }, 8000);
    },
    onError: (err: any) => {
      setInstallState('error');
      setErrorMsg(err?.message || 'حدث خطأ عند تثبيت التحديث');
    },
  });

  if (!update.updateAvailable || dismissed) return null;

  return (
    <div className="offline-update-banner" role="alert" aria-live="polite" dir="rtl">
      <div className="offline-update-banner__icon" aria-hidden="true">
        {installState === 'restarting' ? '✅' : '🔔'}
      </div>

      <div className="offline-update-banner__body">
        {installState === 'idle' && (
          <>
            <strong className="offline-update-banner__title">
              يوجد تحديث جديد —{' '}
              <span className="offline-update-banner__version">v{update.latestVersion}</span>
            </strong>
            {update.changelog && (
              <p className="offline-update-banner__changelog">{update.changelog}</p>
            )}
          </>
        )}

        {installState === 'installing' && (
          <strong className="offline-update-banner__title">
            ⏳ جاري تحميل التحديث وتجهيزه... رجاءً لا تغلق التطبيق
          </strong>
        )}

        {installState === 'restarting' && (
          <>
            <strong className="offline-update-banner__title">
              ✅ تم تثبيت الإصدار{' '}
              <span className="offline-update-banner__version">v{update.latestVersion}</span>
            </strong>
            <p className="offline-update-banner__changelog">
              جاري إعادة تشغيل التطبيق تلقائياً... سيتم تحديث الصفحة بعد لحظات.
            </p>
          </>
        )}

        {installState === 'error' && (
          <>
            <strong className="offline-update-banner__title" style={{ color: '#fca5a5' }}>
              ❌ فشل التثبيت
            </strong>
            <p className="offline-update-banner__changelog" style={{ color: '#fca5a5' }}>
              {errorMsg}
            </p>
          </>
        )}
      </div>

      <div className="offline-update-banner__actions">
        {installState === 'idle' && (
          <button
            type="button"
            className="offline-update-banner__download-btn"
            onClick={() => triggerMutation.mutate()}
            aria-label={`تثبيت تحديث الإصدار ${update.latestVersion} تلقائياً`}
          >
            ⬇ تثبيت التحديث تلقائياً
          </button>
        )}

        {installState === 'installing' && (
          <span className="offline-update-banner__spinner" aria-hidden="true">⟳</span>
        )}

        {installState === 'restarting' && (
          <span className="offline-update-banner__countdown" aria-label="جاري إعادة التشغيل">
            ⟳ إعادة تشغيل...
          </span>
        )}

        {installState === 'error' && (
          <button
            type="button"
            className="offline-update-banner__download-btn"
            onClick={() => triggerMutation.mutate()}
          >
            إعادة المحاولة
          </button>
        )}

        {(installState === 'idle' || installState === 'error') && (
          <button
            type="button"
            className="offline-update-banner__dismiss"
            onClick={() => setDismissed(true)}
            aria-label="إغلاق إشعار التحديث"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
