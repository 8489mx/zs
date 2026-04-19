import { useCallback } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import type { Category, Supplier } from '@/types/domain';

export interface PurchaseQuickCreateDraft {
  name: string;
  barcode: string;
  categoryId: string;
  supplierId: string;
  unitName: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  minStock: number;
}

interface PurchaseQuickCreateDialogProps {
  open: boolean;
  draft: PurchaseQuickCreateDraft;
  categories: Category[];
  suppliers: Supplier[];
  isPending: boolean;
  error?: unknown;
  onClose: () => void;
  onDraftChange: (next: PurchaseQuickCreateDraft) => void;
  onSubmit: () => void;
}

export function PurchaseQuickCreateDialog({
  open,
  draft,
  categories,
  suppliers,
  isPending,
  error,
  onClose,
  onDraftChange,
  onSubmit,
}: PurchaseQuickCreateDialogProps) {
  const handleClose = useCallback(() => {
    if (isPending) return;
    onClose();
  }, [isPending, onClose]);

  return (
    <DialogShell open={open} onClose={handleClose} width="min(760px, 100%)" zIndex={95} ariaLabel="إضافة صنف جديد من صفحة المشتريات">
      <Card
        title="إضافة صنف جديد"
        description="أضف الحد الأدنى من بيانات الصنف ثم ارجعه مباشرة إلى فاتورة الشراء الحالية."
        className="dialog-card"
      >
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="form-grid">
            <Field label="اسم الصنف">
              <input
                value={draft.name}
                onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
                disabled={isPending}
                data-autofocus
              />
            </Field>
            <Field label="الكود / الباركود">
              <input
                value={draft.barcode}
                onChange={(event) => onDraftChange({ ...draft, barcode: event.target.value })}
                disabled={isPending}
                placeholder="اختياري"
              />
            </Field>
            <Field label="المجموعة">
              <select value={draft.categoryId} onChange={(event) => onDraftChange({ ...draft, categoryId: event.target.value })} disabled={isPending}>
                <option value="">بدون مجموعة</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>
            <Field label="المورد">
              <select value={draft.supplierId} onChange={(event) => onDraftChange({ ...draft, supplierId: event.target.value })} disabled={isPending}>
                <option value="">بدون مورد</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </Field>
            <Field label="الوحدة الأساسية">
              <input
                value={draft.unitName}
                onChange={(event) => onDraftChange({ ...draft, unitName: event.target.value })}
                disabled={isPending}
                placeholder="قطعة"
              />
            </Field>
            <Field label="سعر الشراء">
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.costPrice}
                onChange={(event) => onDraftChange({ ...draft, costPrice: Number(event.target.value || 0) })}
                disabled={isPending}
              />
            </Field>
            <Field label="سعر البيع">
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.retailPrice}
                onChange={(event) => onDraftChange({ ...draft, retailPrice: Number(event.target.value || 0) })}
                disabled={isPending}
              />
            </Field>
            <Field label="سعر الجملة">
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.wholesalePrice}
                onChange={(event) => onDraftChange({ ...draft, wholesalePrice: Number(event.target.value || 0) })}
                disabled={isPending}
              />
            </Field>
            <Field label="الحد الأدنى">
              <input
                type="number"
                min="0"
                step="1"
                value={draft.minStock}
                onChange={(event) => onDraftChange({ ...draft, minStock: Number(event.target.value || 0) })}
                disabled={isPending}
              />
            </Field>
          </div>

          <MutationFeedback isError={Boolean(error)} error={error} errorFallback="تعذر إنشاء الصنف الجديد من صفحة المشتريات." />

          <div className="actions sticky-form-actions">
            <SubmitButton type="submit" disabled={isPending} idleText="حفظ الصنف وإضافته" pendingText="جارٍ إنشاء الصنف..." />
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>إغلاق</Button>
          </div>
        </form>
      </Card>
    </DialogShell>
  );
}
