import { DialogShell } from '@/shared/components/dialog-shell';
import { NewProductForm } from '@/features/products/components/NewProductForm';
import type { Product } from '@/types/domain';

export interface PosNewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  initialBarcode?: string;
  onSuccess: (product: Product) => void;
}

export function PosNewProductModal({
  isOpen,
  onClose,
  initialName = '',
  initialBarcode = '',
  onSuccess,
}: PosNewProductModalProps) {
  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(960px, 95vw)"
      ariaLabel="إضافة صنف جديد"
    >
      <div style={{ padding: '8px 12px', overflowY: 'auto', maxHeight: '90vh' }}>
        <NewProductForm
          mode="modal"
          initialName={initialName}
          initialBarcode={initialBarcode}
          onCancel={onClose}
          onSuccess={(product) => {
            onSuccess(product);
          }}
        />
      </div>
    </DialogShell>
  );
}

