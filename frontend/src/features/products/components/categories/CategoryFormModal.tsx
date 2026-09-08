import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
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
    <DialogShell open={isOpen} onClose={onClose} width="440px">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '18px 24px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
        <div style={{ width: 4, height: 18, backgroundColor: 'var(--primary, #170c5c)', borderRadius: 2 }} />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{title}</h3>
      </div>
      <div className="form-grid single-col" style={{ padding: '24px' }}>
        <Field label="اسم القسم">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أدخل اسم القسم"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit();
            }}
          />
        </Field>
        {error && <div className="error-box">{error}</div>}
      </div>
      <div className="actions compact-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? 'جاري الحفظ...' : submitLabel}
        </Button>
      </div>
    </DialogShell>
  );
};
