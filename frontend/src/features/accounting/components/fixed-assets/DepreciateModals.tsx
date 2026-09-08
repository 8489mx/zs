import React from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import type { FixedAsset } from '@/features/accounting/api/accounting.api';

interface DepreciateAssetModalProps {
  asset: FixedAsset | null;
  months: number;
  setMonths: (m: number) => void;
  note: string;
  setNote: (n: string) => void;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const DepreciateAssetModal: React.FC<DepreciateAssetModalProps> = ({
  asset,
  months,
  setMonths,
  note,
  setNote,
  isPending,
  onClose,
  onSubmit,
}) => {
  if (!asset) return null;

  return (
    <StandardDialog
      isOpen={!!asset}
      onClose={onClose}
      title={`إهلاك الأصل: ${asset.name}`}
      maxWidth="500px"
    >
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
        سيقوم النظام بحساب الإهلاك للفترة المحددة وتوليد قيد يومية محاسبي آلي في شجرة الحسابات (من حـ/ مصروف الإهلاك إلى حـ/ مجمع الإهلاك).
      </p>

      <div style={{ marginBottom: '14px' }}>
        <Field label="عدد الشهور المطلوب إهلاكها">
          <input
            type="number"
            min="1"
            max="120"
            value={months}
            onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <Field label="ملاحظة أو بيان القيد (اختياري)">
          <input
            type="text"
            placeholder="مثال: إهلاك شهر سبتمبر 2026"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <Button type="button" variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          disabled={isPending}
          style={{ background: '#170e5e', color: '#fff' }}
        >
          {isPending ? 'جاري التنفيذ والتسجيل...' : 'تأكيد وتوليد القيد'}
        </Button>
      </div>
    </StandardDialog>
  );
};

interface BatchDepreciateModalProps {
  isOpen: boolean;
  activeCount: number;
  months: number;
  setMonths: (m: number) => void;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const BatchDepreciateModal: React.FC<BatchDepreciateModalProps> = ({
  isOpen,
  activeCount,
  months,
  setMonths,
  isPending,
  onClose,
  onSubmit,
}) => {
  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="إهلاك شهري شامل لجميع الأصول النشطة"
      maxWidth="500px"
    >
      <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px', lineHeight: 1.6 }}>
        سيتم فحص كافة الأصول النشطة ({activeCount} أصل) واحتساب إهلاك الدورة وتوليد القيود المحاسبية وتحديث مجمع الإهلاك لكل أصل تلقائياً.
      </p>

      <div style={{ marginBottom: '16px' }}>
        <Field label="عدد شهور الإهلاك">
          <input
            type="number"
            min="1"
            max="12"
            value={months}
            onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          />
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <Button type="button" variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          disabled={isPending}
          style={{ background: '#170e5e', color: '#fff', fontWeight: 700 }}
        >
          {isPending ? 'جاري المعالجة والترحيل...' : 'بدء الإهلاك الشامل'}
        </Button>
      </div>
    </StandardDialog>
  );
};
