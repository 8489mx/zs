import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { Field } from '@/shared/ui/field';
import { WarehouseIcon, InfoIcon } from '@/shared/components/icons/AppIcons';

interface CategoryTransferWarehouseModalProps {
  category: { id: string | number; name: string } | null;
  locations: Array<{ id: string | number; name: string }>;
  fromLocationId: string;
  toLocationId: string;
  setFromLocationId: (id: string) => void;
  setToLocationId: (id: string) => void;
  isPending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: () => void;
}

export const CategoryTransferWarehouseModal: React.FC<CategoryTransferWarehouseModalProps> = ({
  category,
  locations,
  fromLocationId,
  toLocationId,
  setFromLocationId,
  setToLocationId,
  isPending,
  error,
  onClose,
  onSubmit,
}) => {
  if (!category) return null;

  const locationOptions = (locations || []).map((l) => ({
    value: String(l.id),
    label: l.name,
  }));

  const isSubmitDisabled =
    !fromLocationId || !toLocationId || fromLocationId === toLocationId || isPending;

  return (
    <StandardDialog
      open={true}
      onClose={onClose}
      title={`نقل أرصدة القسم: ${category.name}`}
      subtitle="تحويل ونقل كافة أرصدة منتجات هذا القسم من مخزن إلى مخزن آخر"
      maxWidth="520px"
      footerActions={
        <StandardDialogFooter
          onClose={onClose}
          onSubmit={onSubmit}
          submitLabel="تأكيد النقل المخزني"
          loadingText="جاري النقل..."
          isPending={isPending}
          disabled={isSubmitDisabled}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
        {/* البطاقة الرمادية 1: معلومات العملية */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <InfoIcon size={20} color="#1e40af" />
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: '2px', fontSize: '13px', color: '#0f172a' }}>
              مناقلة مجمعة لأرصدة القسم
            </strong>
            <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
              سيتم إنشاء إذن تحويل مخزني لكافة أرصدة منتجات قسم &ldquo;{category.name}&rdquo; من المخزن المصدر إلى المخزن الوجهة.
            </span>
          </div>
        </div>

        {/* البطاقة الرمادية 2: تحديد المخازن المصدر والوجهة */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <WarehouseIcon size={16} color="#170e5e" />
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#170e5e' }}>تحديد المخزن المصدر والوجهة</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="من مخزن (المصدر)">
              <CustomSelect
                options={locationOptions}
                value={fromLocationId}
                onChange={(val) => setFromLocationId(val)}
                placeholder="اختر المخزن المحول منه..."
                searchable
              />
            </Field>

            <Field label="إلى مخزن (الوجهة)">
              <CustomSelect
                options={locationOptions.filter((opt) => opt.value !== fromLocationId)}
                value={toLocationId}
                onChange={(val) => setToLocationId(val)}
                placeholder="اختر المخزن المحول إليه..."
                searchable
              />
            </Field>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              borderRadius: '8px',
              border: '1px solid #fee2e2',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </StandardDialog>
  );
};
