import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon } from '@/shared/components/icons/AppIcons';
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

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(540px, 95vw)"
      ariaLabel={isEditing ? 'تعديل مركز تكلفة' : 'إضافة مركز تكلفة جديد'}
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">
              {isEditing ? 'تعديل مركز تكلفة' : 'إضافة مركز تكلفة جديد'}
            </h3>
            <p className="standard-dialog-subtitle">
              تحديد كود واسم المركز والبعد التحليلي والموازنة التقديرية
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="standard-dialog-close-btn"
            aria-label="إغلاق"
          >
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                كود المركز *
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
                اسم مركز التكلفة *
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
              <select
                value={formData.dimension}
                onChange={(e) => onChange({ ...formData, dimension: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              >
                {Object.entries(COST_CENTER_DIMENSIONS).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                المركز الأب (إن وجد)
              </label>
              <select
                value={formData.parentId}
                onChange={(e) => onChange({ ...formData, parentId: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
              >
                <option value="">بدون مركز أب (رئيسي جذر)</option>
                {availableParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              الموازنة التقديرية (اختياري - ج.م)
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
              value={formData.description}
              onChange={(e) => onChange({ ...formData, description: e.target.value })}
              placeholder="ملاحظات توضيحية حول طبيعة المركز..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', minHeight: '60px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => onChange({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              مركز تكلفة نشط ومتاح للقيود والعمليات
            </label>
          </div>

          <div className="standard-dialog-footer">
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: '#170e5e', color: '#ffffff', fontWeight: 700 }}
            >
              {isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث المركز' : 'إضافة المركز'}
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
}
