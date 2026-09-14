import { useCallback, useMemo } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
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

  const categoryOptions = useMemo(() => [
    { value: '', label: 'بدون مجموعة' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ], [categories]);

  const supplierOptions = useMemo(() => [
    { value: '', label: 'بدون مورد' },
    ...suppliers.map((s) => ({ value: s.id, label: s.name })),
  ], [suppliers]);

  return (
    <StandardDialog
      open={open}
      onClose={handleClose}
      title="إضافة صنف جديد"
      subtitle="أضف الحد الأدنى من بيانات الصنف ثم ارجعه مباشرة إلى فاتورة الشراء الحالية"
      maxWidth="760px"
      footerActions={
        <StandardDialogFooter
          onCancel={handleClose}
          cancelLabel="إغلاق"
          submitLabel={isPending ? 'جارٍ إنشاء الصنف...' : 'حفظ الصنف وإضافته'}
          isSubmitting={isPending}
          onSubmit={onSubmit}
        />
      }
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
            <CustomSelect
              value={draft.categoryId}
              onChange={(val) => onDraftChange({ ...draft, categoryId: String(val) })}
              options={categoryOptions}
              disabled={isPending}
              searchable
            />
          </Field>
          <Field label="المورد">
            <CustomSelect
              value={draft.supplierId}
              onChange={(val) => onDraftChange({ ...draft, supplierId: String(val) })}
              options={supplierOptions}
              disabled={isPending}
              searchable
            />
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
      </form>
    </StandardDialog>
  );
}
