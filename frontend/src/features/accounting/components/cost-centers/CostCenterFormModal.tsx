import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { LayersIcon, DollarSignIcon } from '@/shared/components/icons/AppIcons';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import type { CostCenterRecord } from '../../api/cost-centers.api';
import { COST_CENTER_DIMENSIONS } from './types';

interface CostCenterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: {
    code: string;
    name: string;
    dimension: string;
    budgetAmount: string | number;
    parentId: string;
    description: string;
    isActive: boolean;
  };
  onChange: (val: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  availableParents: CostCenterRecord[];
}

export function CostCenterFormModal({
  isOpen,
  onClose,
  isEditing,
  formData,
  onChange,
  onSubmit,
  isPending,
  availableParents,
}: CostCenterFormModalProps) {
  if (!isOpen) return null;

  const dimensionOptions = Object.entries(COST_CENTER_DIMENSIONS).map(([key, item]) => ({
    value: key,
    label: item.label,
  }));

  const parentOptions = [
    { value: '', label: 'بدون مركز أب (رئيسي جذر)' },
    ...availableParents.map((p) => ({
      value: String(p.id),
      label: `${p.name} (${p.code})`,
      hint: p.code,
    })),
  ];

  return (
    <StandardDialog
      open={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل مركز تكلفة' : 'إضافة مركز تكلفة جديد'}
      subtitle="تحديد كود واسم المركز والبعد التحليلي والموازنة التقديرية"
      size="md"
    >
      <form id="cost-center-form" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Card 1: Definition & Dimensions */}
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
            <LayersIcon size={15} style={{ color: '#170e5e' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>بيانات التعريف والتبويب</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                كود المركز <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => onChange({ ...formData, code: e.target.value })}
                placeholder="CC-001"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                اسم مركز التكلفة <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => onChange({ ...formData, name: e.target.value })}
                placeholder="مثال: فرع مدينة نصر، مشروع البرج..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                البُعد التحليلي
              </label>
              <CustomSelect
                value={formData.dimension}
                onChange={(val) => onChange({ ...formData, dimension: val })}
                options={dimensionOptions}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                المركز الأب (إن وجد)
              </label>
              <CustomSelect
                value={formData.parentId}
                onChange={(val) => onChange({ ...formData, parentId: val })}
                options={parentOptions}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Budget & Status */}
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
            <DollarSignIcon size={15} style={{ color: '#170e5e' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>الموازنة والحالة التشغيلية</span>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              الموازنة التقديرية (اختياري - {getGlobalCurrencySymbol()})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.budgetAmount}
              onChange={(e) => onChange({ ...formData, budgetAmount: e.target.value })}
              placeholder="0.00"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              الوصف أو الملاحظات
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => onChange({ ...formData, description: e.target.value })}
              placeholder="ملاحظات توضيحية حول طبيعة المركز..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => onChange({ ...formData, isActive: e.target.checked })}
              style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
            />
            <label htmlFor="isActive" style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              مركز تكلفة نشط ومتاح للقيود والعمليات
            </label>
          </div>
        </div>
      </form>

      <StandardDialogFooter>
        <Button variant="secondary" onClick={onClose} style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}>
          إلغاء
        </Button>
        <Button
          type="submit"
          form="cost-center-form"
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
          {isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث المركز' : 'إضافة المركز'}
        </Button>
      </StandardDialogFooter>
    </StandardDialog>
  );
}
