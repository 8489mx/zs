import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';

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

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="520px"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '18px 24px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
        <div style={{ width: 4, height: 18, backgroundColor: 'var(--primary, #170c5c)', borderRadius: 2 }} />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>نقل أرصدة القسم: {category.name}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
        <div style={{ padding: '14px 16px', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #dbeafe' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 5.072 10.5 5c1.333-.2 2.667-.2 4 0l.5.072m-4 13.856L10.5 19c1.333.2 2.667.2 4 0l.5-.072m-9.5-4.428L5 14c-.2-1.333-.2-2.667 0-4l.072-.5m13.856 4.5L19 14c.2-1.333.2-2.667 0-4l-.072-.5m-3.5 1.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
          <div>
            <strong style={{ display: 'block', marginBottom: '2px', fontSize: '13.5px' }}>نقل أرصدة قسم لمخزن آخر</strong>
            <span className="small" style={{ fontSize: '12px', color: '#3b82f6' }}>سيتم إنشاء مناقلة لكافة أرصدة منتجات هذا القسم إلى المخزن الوجهة.</span>
          </div>
        </div>
        <Field label="من المخزن">
          <select
            value={fromLocationId}
            onChange={(e) => setFromLocationId(e.target.value)}
            className="purchase-prototype-field-input"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <option value="">اختر المخزن المحول منه...</option>
            {locations?.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Field>
        <Field label="إلى المخزن">
          <select
            value={toLocationId}
            onChange={(e) => setToLocationId(e.target.value)}
            className="purchase-prototype-field-input"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <option value="">اختر المخزن المحول إليه...</option>
            {locations?.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Field>

        {error && <div className="error-message" style={{ color: 'var(--text-danger)', padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>{error}</div>}
      </div>
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#f8fafc' }}>
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button 
          variant="primary" 
          disabled={!fromLocationId || !toLocationId || fromLocationId === toLocationId || isPending}
          onClick={onSubmit}
        >
          {isPending ? 'جاري النقل...' : 'تأكيد النقل'}
        </Button>
      </div>
    </DialogShell>
  );
};
