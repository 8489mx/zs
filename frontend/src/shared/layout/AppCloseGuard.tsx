import React, { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/shared/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

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
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="z-[99999] max-w-[420px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <AlertTriangle className="h-6 w-6" />
            <AlertDialogTitle className="text-xl m-0 font-bold">تأكيد الإغلاق</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base text-slate-700 leading-relaxed font-medium">
            توجد بيانات قيد التعديل ولم تُحفظ (مثل فاتورة قيد الإنشاء).
            <br />
            هل أنت متأكد من رغبتك في إغلاق البرنامج؟ ستفقد أي تعديلات لم تقم بحفظها.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex-row gap-2 justify-end">
          <AlertDialogCancel onClick={handleCancelClose} className="mt-0 w-24">
            البقاء
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmClose} className="w-auto px-6 bg-red-600 hover:bg-red-700 text-white">
            مغادرة وإغلاق البرنامج
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
