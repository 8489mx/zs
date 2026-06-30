import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import type { StockTransfer } from '@/types/domain';

export function StockTransferSuccessDialog({
  transfer,
  open,
  onClose,
  onPrintA4,
  onPrintReceipt,
}: {
  transfer: StockTransfer | null;
  open: boolean;
  onClose: () => void;
  onPrintA4: () => void;
  onPrintReceipt: () => void;
}) {
  return (
    <DialogShell open={open} onClose={onClose} width="400px" ariaLabel="تم تحويل المخزون بنجاح">
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-emerald-600 mb-4">تم تحويل المخزون بنجاح</h2>

        <div className="flex flex-col gap-4 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </div>

          <p className="text-gray-600">
            تم إنشاء التحويل رقم <strong>{transfer?.docNo || transfer?.id}</strong>
          </p>
          <p className="text-gray-500 text-sm">
            يمكنك طباعة إيصال أو وثيقة A4 لمرافقة البضاعة.
          </p>

          <div className="flex flex-col gap-2 mt-4">
            <Button type="button" onClick={onPrintReceipt} className="w-full justify-center">
              طباعة ريسيت (Thermal)
            </Button>
            <Button type="button" variant="secondary" onClick={onPrintA4} className="w-full justify-center">
              طباعة وثيقة (A4)
            </Button>
            <button type="button" onClick={onClose} className="btn w-full justify-center mt-2 bg-transparent text-gray-600 hover:bg-gray-100 border-none shadow-none">
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
