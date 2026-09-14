import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { FolderIcon } from '@/shared/components/icons/AppIcons';
import { Field } from '@/shared/ui/field';

interface CategoryFormModalProps {
  isOpen: boolean;
  title: string;
  name: string;
  setName: (val: string) => void;
  error?: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  title,
  name,
  setName,
  error,
  isPending,
  onClose,
  onSubmit,
  submitLabel,
}) => {
  if (!isOpen) return null;

  return (
    <StandardDialog
      open={isOpen}
      onClose={onClose}
      title={title}
      subtitle="إدارة وتعديل بيانات الأقسام والتصنيفات في المنظومة"
      maxWidth="480px"
      footerActions={
        <StandardDialogFooter
          onClose={onClose}
          onSubmit={onSubmit}
          submitLabel={submitLabel}
          loadingText="جاري الحفظ..."
          isPending={isPending}
          disabled={!name.trim()}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
        {/* البطاقة الرمادية 1: بيانات القسم الأساسية */}
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
            <FolderIcon size={16} color="#170e5e" />
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#170e5e' }}>بيانات القسم الأساسية</span>
          </div>

          <Field label="اسم القسم أو التصنيف">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مشروبات ساخنة، أدوات مكتبية..."
              autoFocus
              className="purchase-prototype-field-input"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) onSubmit();
              }}
            />
          </Field>
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
