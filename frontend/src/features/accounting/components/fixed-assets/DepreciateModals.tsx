import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CalendarIcon, AlertCircleIcon } from '@/shared/components/icons/AppIcons';
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
      open={!!asset}
      onClose={onClose}
      title={`إهلاك الأصل: ${asset.name}`}
      subtitle="احتساب الإهلاك وتوليد قيد اليومية الآلي في شجرة الحسابات"
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          backgroundColor: '#eff6ff',
          borderRadius: '10px',
          padding: '12px 16px',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '12.5px',
          lineHeight: 1.6,
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
        }}>
          <AlertCircleIcon size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            سيقوم النظام بحساب الإهلاك للفترة المحددة وتوليد قيد يومية محاسبي آلي في شجرة الحسابات (من حـ/ مصروف الإهلاك إلى حـ/ مجمع الإهلاك).
          </span>
        </div>

        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            <CalendarIcon size={15} style={{ color: '#170e5e' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>فترة الإهلاك والبيان المحاسبي</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              عدد الشهور المطلوب إهلاكها <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={months}
              onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              ملاحظة أو بيان القيد (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: إهلاك شهر سبتمبر 2026"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      <StandardDialogFooter>
        <Button type="button" variant="secondary" onClick={onClose} style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}>
          إلغاء
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isPending}
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            padding: '8px 22px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'جاري التنفيذ والتسجيل...' : 'تأكيد وتوليد القيد'}
        </Button>
      </StandardDialogFooter>
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
      open={isOpen}
      onClose={onClose}
      title="إهلاك شهري شامل لجميع الأصول النشطة"
      subtitle={`فحص واحتساب الدورة لعدد (${activeCount}) أصل نشط وتحديث مجمع الإهلاك`}
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{
          backgroundColor: '#eff6ff',
          borderRadius: '10px',
          padding: '12px 16px',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '12.5px',
          lineHeight: 1.6,
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
        }}>
          <AlertCircleIcon size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            سيتم فحص كافة الأصول النشطة ({activeCount} أصل) واحتساب إهلاك الدورة وتوليد القيود المحاسبية وتحديث مجمع الإهلاك لكل أصل تلقائياً.
          </span>
        </div>

        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            <CalendarIcon size={15} style={{ color: '#170e5e' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>تحديد مدة دورة الإهلاك</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              عدد شهور الإهلاك <span style={{ color: '#e11d48' }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={months}
              onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      <StandardDialogFooter>
        <Button type="button" variant="secondary" onClick={onClose} style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}>
          إلغاء
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isPending}
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            padding: '8px 22px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'جاري المعالجة والترحيل...' : 'بدء الإهلاك الشامل'}
        </Button>
      </StandardDialogFooter>
    </StandardDialog>
  );
};
