import React from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import type { ModifierGroup, ModifierOption } from '@/shared/api/addons.api';

interface ModifierGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingGroup: ModifierGroup | null;
  formName: string;
  setFormName: (v: string) => void;
  formNameEn: string;
  setFormNameEn: (v: string) => void;
  formSelectionType: 'single' | 'multiple';
  setFormSelectionType: (v: 'single' | 'multiple') => void;
  formIsMandatory: boolean;
  setFormIsMandatory: (v: boolean) => void;
  formOptions: ModifierOption[];
  onAddOptionRow: () => void;
  onRemoveOptionRow: (index: number) => void;
  onOptionChange: (index: number, field: keyof ModifierOption, value: any) => void;
  saving: boolean;
  modalFeedback: { text: string; error?: boolean } | null;
  onSave: () => void;
}

export const ModifierGroupModal: React.FC<ModifierGroupModalProps> = ({
  isOpen,
  onClose,
  editingGroup,
  formName,
  setFormName,
  formNameEn,
  setFormNameEn,
  formSelectionType,
  setFormSelectionType,
  formIsMandatory,
  setFormIsMandatory,
  formOptions,
  onAddOptionRow,
  onRemoveOptionRow,
  onOptionChange,
  saving,
  modalFeedback,
  onSave,
}) => {
  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={editingGroup ? 'تعديل مجموعة الإضافات والخيارات' : 'إضافة مجموعة خيارات جديدة'}
      subtitle="تحديد نوع الاختيار، قواعد الإلزام، والخيارات الإضافية وأسعارها"
      width="620px"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !formName.trim()}
            style={{
              padding: '8px 22px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ المجموعة والخيارات'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }} dir="rtl">
        {modalFeedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              backgroundColor: modalFeedback.error ? '#fef2f2' : '#f0fdf4',
              color: modalFeedback.error ? '#991b1b' : '#166534',
              border: `1px solid ${modalFeedback.error ? '#fecaca' : '#bbf7d0'}`,
            }}
          >
            {modalFeedback.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              اسم المجموعة بالعربية <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="مثال: درجة الطهي، الصوصات، إضافات إكسترا..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              الاسم بالإنجليزية (اختياري)
            </label>
            <input
              type="text"
              value={formNameEn}
              onChange={(e) => setFormNameEn(e.target.value)}
              placeholder="e.g. Cooking Level, Sauces..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              نوع الاختيار
            </label>
            <select
              value={formSelectionType}
              onChange={(e) => setFormSelectionType(e.target.value as any)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
            >
              <option value="single">اختيار أحادي (Radio - صنف واحد فقط)</option>
              <option value="multiple">اختيار متعدد (Multiple - أكثر من خيار)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '22px' }}>
            <input
              type="checkbox"
              id="mandatoryCheck"
              checked={formIsMandatory}
              onChange={(e) => setFormIsMandatory(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="mandatoryCheck" style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
              اختيار إلزامي قبل إضافة الصنف للسلة
            </label>
          </div>
        </div>

        {/* Options List Builder */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              قائمة الخيارات والإضافات في هذه المجموعة
            </label>
            <button
              type="button"
              onClick={onAddOptionRow}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid #170e5e',
                backgroundColor: '#f8fafc',
                color: '#170e5e',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + إضافة خيار
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
            {formOptions.map((opt, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={opt.name}
                  onChange={(e) => onOptionChange(idx, 'name', e.target.value)}
                  placeholder="اسم الخيار (مثل: جبنة إضافية)..."
                  style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={opt.price}
                  onChange={(e) => onOptionChange(idx, 'price', parseFloat(e.target.value) || 0)}
                  placeholder="السعر الإضافي..."
                  style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(opt.isDefault)}
                    onChange={(e) => onOptionChange(idx, 'isDefault', e.target.checked)}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>افتراضي</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveOptionRow(idx)}
                  disabled={formOptions.length <= 1}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    cursor: formOptions.length > 1 ? 'pointer' : 'not-allowed',
                    opacity: formOptions.length > 1 ? 1 : 0.4,
                  }}
                >
                  <AppIcons.Trash size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StandardDialog>
  );
};
