import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { useAuthStore } from '@/stores/auth-store';

export function AppCloseGuard() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Electron Desktop App Guard
    const electronRuntime = typeof window !== 'undefined' ? (window as any).electronRuntime : null;
    if (electronRuntime && typeof electronRuntime.onShowCustomCloseDialog === 'function') {
      const unsubscribe = electronRuntime.onShowCustomCloseDialog(() => {
        const user = useAuthStore.getState().user;
        // If logged out or on login page, close app immediately without prompt
        if (!user) {
          if (typeof electronRuntime.forceCloseApp === 'function') {
            electronRuntime.forceCloseApp();
          }
          return;
        }
        setIsOpen(true);
      });
      return () => {
        unsubscribe();
      };
    }
  }, []);

  const handleConfirmClose = () => {
    setIsOpen(false);
    const electronRuntime = typeof window !== 'undefined' ? (window as any).electronRuntime : null;
    if (electronRuntime && typeof electronRuntime.forceCloseApp === 'function') {
      electronRuntime.forceCloseApp();
    }
  };

  const handleCancelClose = () => {
    setIsOpen(false);
  };

  return (
    <ActionConfirmDialog
      open={isOpen}
      title={t('shared.layout.app_close_guard.s0', "تأكيد إغلاق المنظومة")}
      description={t('shared.layout.app_close_guard.s1', "هل أنت متأكد من رغبتك في إغلاق البرنامج ومغادرة الجلسة؟ قد تفقد أي بيانات أو فواتير قيد التعديل لم تقم بحفظها.")}
      confirmLabel={t('shared.layout.app_close_guard.s2', "إغلاق البرنامج ومغادرة")}
      cancelLabel={t('shared.layout.app_close_guard.s3', "البقاء في البرنامج")}
      confirmVariant="danger"
      onConfirm={handleConfirmClose}
      onCancel={handleCancelClose}
    />
  );
}
