import { useEffect, useState } from 'react';
import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';

export function AppCloseGuard() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const electronRuntime = (window as any).electronRuntime;
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
    const electronRuntime = (window as any).electronRuntime;
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
      title="تأكيد الإغلاق"
      description="توجد بيانات قيد التعديل ولم تُحفظ (مثل فاتورة قيد الإنشاء). هل أنت متأكد من رغبتك في إغلاق البرنامج؟ ستفقد أي تعديلات لم تقم بحفظها."
      confirmLabel="مغادرة وإغلاق البرنامج"
      cancelLabel="البقاء"
      confirmVariant="danger"
      onConfirm={handleConfirmClose}
      onCancel={handleCancelClose}
    />
  );
}
