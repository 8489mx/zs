import { useTranslation } from 'react-i18next';
import React from 'react';
import { formatCurrency } from '@/lib/format';
import type { ModifierGroup } from '@/shared/api/addons.api';

interface ModifierGroupCardProps {
  group: ModifierGroup;
  onEdit: (group: ModifierGroup) => void;
  onDelete: (id: number) => void;
}

export const ModifierGroupCard: React.FC<ModifierGroupCardProps> = ({
  group,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {group.name}
          </h3>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: group.selectionType === 'single' ? '#eff6ff' : '#f0fdf4',
                color: group.selectionType === 'single' ? '#1d4ed8' : '#166534',
              }}
            >
              {group.selectionType === 'single' ? t('products.modifiers.modifier_group_card.s0', "اختيار أحادي (Single)") : t('products.modifiers.modifier_group_card.s1', "اختيار متعدد (Multiple)")}
            </span>
            {group.isMandatory && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                }}
              >
                {t('products.modifiers.modifier_group_card.s2', "إلزامي")}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => onEdit(group)}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            {t('products.modifiers.modifier_group_card.s3', "تعديل")}
          </button>
          <button
            type="button"
            onClick={() => onDelete(group.id)}
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              fontSize: '12px',
              cursor: 'pointer',
              color: '#dc2626',
            }}
          >
            {t('products.modifiers.modifier_group_card.s4', "حذف")}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
          {t('products.modifiers.modifier_group_card.s5', "الخيارات المتاحة (")}{group.options?.length || 0}):
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {group.options?.map((opt) => (
            <div
              key={opt.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#f8fafc',
                fontSize: '12.5px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                  {opt.name} {opt.isDefault ? t('products.modifiers.modifier_group_card.s6', "(افتراضي)") : ''}
                </span>
                {opt.componentProductName && (
                  <span style={{ fontSize: '10.5px', color: '#6366f1', fontWeight: 600 }}>
                    {t('products.modifiers.modifier_group_card.s7', "خصم مخزني:")} {opt.consumptionQty || 1} {opt.unitName || t('products.modifiers.modifier_group_card.s8', "وحدة")} {t('products.modifiers.modifier_group_card.s9', "من [")}{opt.componentProductName}]
                  </span>
                )}
              </div>
              <span style={{ fontWeight: 700, color: Number(opt.price) > 0 ? '#059669' : '#64748b' }}>
                {Number(opt.price) > 0 ? `+${formatCurrency(opt.price)}` : t('products.modifiers.modifier_group_card.s10', "مجاناً")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
