import { useEffect } from 'react';
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
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) {
        // Only close on Esc if not typing inside input or if desired
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="dialog-overlay pos-new-product-modal-overlay"
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="dialog-shell pos-new-product-dialog-shell"
        role="dialog"
        aria-modal="true"
        aria-label="إضافة صنف جديد"
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
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
      </div>
    </div>
  );
}
