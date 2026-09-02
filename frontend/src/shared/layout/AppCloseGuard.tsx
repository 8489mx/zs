import { useEffect, useState } from 'react';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';

export function AppCloseGuard() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Electron Desktop App Guard
    const electronRuntime = typeof window !== 'undefined' ? (window as any).electronRuntime : null;
    if (electronRuntime && typeof electronRuntime.onShowCustomCloseDialog === 'function') {
      const unsubscribe = electronRuntime.onShowCustomCloseDialog(() => {
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
      title="تأكيد إغلاق المنظومة"
      description="هل أنت متأكد من رغبتك في إغلاق البرنامج ومغادرة الجلسة؟ قد تفقد أي بيانات أو فواتير قيد التعديل لم تقم بحفظها."
      confirmLabel="إغلاق البرنامج ومغادرة"
      cancelLabel="البقاء في البرنامج"
      confirmVariant="danger"
      onConfirm={handleConfirmClose}
      onCancel={handleCancelClose}
    />
  );
}
