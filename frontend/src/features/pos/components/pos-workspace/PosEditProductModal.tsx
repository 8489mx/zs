import { DialogShell } from '@/shared/components/dialog-shell';
import { EditProductForm } from '@/features/products/components/EditProductForm';
import type { Product } from '@/types/domain';

export interface PosEditProductModalProps {
  isOpen: boolean;
  productId: string | null;
  initialProduct?: Product | null;
  onClose: () => void;
  onSuccess: (product: Product) => void;
}

export function PosEditProductModal({
  isOpen,
  productId,
  initialProduct,
  onClose,
  onSuccess,
}: PosEditProductModalProps) {
  if (!isOpen || !productId) return null;

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(1060px, 95vw)"
      ariaLabel="تعديل بيانات الصنف"
    >
      <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '90vh', boxSizing: 'border-box' }}>
        <EditProductForm
          productId={productId}
          initialProduct={initialProduct || undefined}
          mode="modal"
          onCancel={onClose}
          onSuccess={(product) => {
            onSuccess(product);
          }}
        />
      </div>
    </DialogShell>
  );
}


