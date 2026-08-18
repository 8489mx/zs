import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { EmptyState } from '@/shared/ui/empty-state';
import { supplierBalanceScheduleApi } from '@/features/accounts/api/supplier-balance-schedule.api';
import { formatCurrency } from '@/lib/format';
import { SupplierBalanceScheduleCard } from '@/features/accounts/components/SupplierBalanceScheduleCard';
import type { Supplier } from '@/types/domain';

export function SupplierQuickPaymentDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const suppliersQuery = useQuery({
    queryKey: [...queryKeys.suppliers, 'debt-lookup'],
    queryFn: () => supplierBalanceScheduleApi.listSuppliersWithDebt(),
    enabled: isOpen,
  });

  const suppliers = useMemo(() => suppliersQuery.data || [], [suppliersQuery.data]);
  const selectedSupplier = useMemo(() => suppliers.find((supplier) => String(supplier.id) === selectedSupplierId) || null, [suppliers, selectedSupplierId]);

  function closeDialog() {
    setIsOpen(false);
    setSelectedSupplierId('');
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isOpen && (event.key === 'Escape' || event.key === 'Esc')) {
        // If an inner modal inside the card is open, let the inner modal handle Escape first
        const hasInnerModal = document.querySelector('.supplier-payment-dialog-overlay .dialog-overlay');
        if (hasInnerModal) {
          return;
        }
        event.preventDefault();
        closeDialog();
        return;
      }

      const key = String(event.key || '').toLowerCase();
      const isSupplierPaymentShortcut = event.ctrlKey
        && event.altKey
        && (event.code === 'KeyD' || key === 'd' || event.key === 'د');

      if (isSupplierPaymentShortcut) {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedSupplierId && suppliers.length === 1) {
      setSelectedSupplierId(String(suppliers[0].id));
    }
  }, [isOpen, selectedSupplierId, suppliers]);

  if (!isOpen) return null;

  return (
    <div
      className="dialog-overlay supplier-quick-payment-dialog-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
    >
      <div
        className="dialog-shell supplier-payment-dialog supplier-quick-payment-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="جدولة ودفع مستحقات الموردين"
      >
        <div className="dialog-card supplier-payment-dialog-card supplier-quick-payment-card">
          <div className="supplier-payment-dialog-header">
            <div>
              <h3>جدولة ودفع مستحقات الموردين</h3>
              <p className="muted">اختصار Ctrl + Alt + D — اختر المورد لجدولة مستحقاته أو تسديد دفعاته ومتابعة حسابه بسرعة.</p>
            </div>
            <button
              type="button"
              className="supplier-payment-dialog-close"
              onClick={closeDialog}
              aria-label="إغلاق النافذة"
            >
              ✕
            </button>
          </div>

          <div className="supplier-quick-payment-grid" style={{ marginBottom: 16 }}>
            <Field label="اختر المورد">
              <select
                value={selectedSupplierId}
                onChange={(event) => setSelectedSupplierId(event.target.value)}
                disabled={suppliersQuery.isLoading}
              >
                <option value="">-- اختر المورد المطلوب --</option>
                {suppliers.map((supplier: Supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} — {formatCurrency(Number(supplier.balance || 0))}
                  </option>
                ))}
              </select>
            </Field>
            {selectedSupplier ? (
              <div className="supplier-quick-payment-summary">
                <span>رصيد المورد الحالي</span>
                <strong>{formatCurrency(Number(selectedSupplier.balance || 0))}</strong>
              </div>
            ) : null}
          </div>

          {selectedSupplier ? (
            <div className="supplier-quick-payment-embedded-card">
              <SupplierBalanceScheduleCard supplier={selectedSupplier} />
            </div>
          ) : (
            <EmptyState
              title="لم يتم اختيار مورد"
              hint="اختر أحد الموردين من القائمة بالأعلى لعرض تفاصيل الجدولة، إنشاء جدول دفعات جديد، أو تسديد الدفعات المستحقة."
            />
          )}

          <div className="actions compact-actions supplier-payment-dialog-actions" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
            <Button type="button" variant="secondary" onClick={closeDialog}>إغلاق النافذة</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
