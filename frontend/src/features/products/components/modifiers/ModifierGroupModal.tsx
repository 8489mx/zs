import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
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

const SELECTION_TYPE_OPTIONS = [
  { value: 'single', label: 'اختيار أحادي (Radio - خيار واحد فقط)' },
  { value: 'multiple', label: 'اختيار متعدد (Checkbox - أكثر من خيار)' },
];

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
      open={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={editingGroup ? 'تعديل مجموعة الإضافات والخيارات' : 'إضافة مجموعة خيارات جديدة'}
      subtitle="تحديد نوع الاختيار، قواعد الإلزام، والخيارات الإضافية وأسعارها"
      maxWidth="680px"
      footerActions={
        <StandardDialogFooter
          cancelText="إلغاء"
          onCancel={onClose}
          submitText={editingGroup ? 'حفظ التعديلات' : 'حفظ المجموعة والخيارات'}
          onSubmit={onSave}
          isSubmitting={saving}
          submitDisabled={saving || !formName.trim()}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} dir="rtl">
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

        {/* 1. بيانات المجموعة وقواعد الاختيار */}
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Layers size={15} />
            <span>1. بيانات المجموعة والقواعد (Group Details & Rules)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <Field label="اسم المجموعة بالعربية *">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثال: درجة الطهي، الصوصات، إضافات إكسترا..."
              />
            </Field>

            <Field label="الاسم بالإنجليزية (اختياري)">
              <input
                type="text"
                value={formNameEn}
                onChange={(e) => setFormNameEn(e.target.value)}
                placeholder="e.g. Cooking Level, Sauces..."
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', alignItems: 'flex-end' }}>
            <Field label="نوع الاختيار *">
              <CustomSelect
                value={formSelectionType}
                options={SELECTION_TYPE_OPTIONS}
                onChange={(val) => setFormSelectionType(val as 'single' | 'multiple')}
              />
            </Field>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={formIsMandatory}
                  onChange={(e) => setFormIsMandatory(e.target.checked)}
                />
                <span>اختيار إلزامي قبل إضافة الصنف للسلة</span>
              </label>
            </div>
          </div>
        </div>

        {/* 2. قائمة الخيارات والإضافات */}
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
              <AppIcons.Package size={15} />
              <span>2. قائمة الخيارات والإضافات (Options & Prices)</span>
            </div>
            <button
              type="button"
              onClick={onAddOptionRow}
              style={{
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid #170e5e',
                backgroundColor: '#ffffff',
                color: '#170e5e',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + إضافة خيار
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {formOptions.map((opt, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr auto auto', gap: '8px', alignItems: 'center' }}>
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
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px', color: '#64748b' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(opt.isDefault)}
                    onChange={(e) => onOptionChange(idx, 'isDefault', e.target.checked)}
                  />
                  <span>افتراضي</span>
                </label>
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
                  title="حذف الخيار"
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
