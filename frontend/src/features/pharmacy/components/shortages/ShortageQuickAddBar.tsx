import React from 'react';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { IconPlus } from '../PharmacyIcons';
import { MAJOR_DISTRIBUTORS } from '../../constants/pharmacy.constants';

interface ShortageQuickAddBarProps {
  quickName: string;
  setQuickName: (n: string) => void;
  quickQty: number;
  setQuickQty: (q: number) => void;
  quickDist: string;
  setQuickDist: (d: string) => void;
  quickPriority: 'normal' | 'urgent' | 'customer_request';
  setQuickPriority: (p: 'normal' | 'urgent' | 'customer_request') => void;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const ShortageQuickAddBar: React.FC<ShortageQuickAddBarProps> = ({
  quickName,
  setQuickName,
  quickQty,
  setQuickQty,
  quickDist,
  setQuickDist,
  quickPriority,
  setQuickPriority,
  isPending,
  onSubmit,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '10px 14px',
        marginBottom: '14px',
        flexWrap: 'wrap',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 700, fontSize: '0.82rem' }}>
        <IconPlus size={15} color="var(--primary, #1e1b4b)" />
        <span>إضافة فورية للكشكول:</span>
      </div>

      <input
        type="text"
        required
        className="purchase-prototype-field-input"
        placeholder="اسم الدواء الناقص..."
        value={quickName}
        onChange={(e) => setQuickName(e.target.value)}
        style={{ flex: '1 1 200px', fontSize: '0.84rem' }}
      />

      <input
        type="number"
        min="1"
        className="purchase-prototype-field-input"
        placeholder="العدد"
        value={quickQty}
        onChange={(e) => setQuickQty(Number(e.target.value) || 1)}
        style={{ width: '70px', fontSize: '0.84rem', textAlign: 'center' }}
        title="الكمية المطلوبة بالعلب"
      />

      <div style={{ width: '150px' }}>
        <CustomSelect
          value={quickDist}
          onChange={(val) => setQuickDist(val)}
          options={MAJOR_DISTRIBUTORS.map((d) => ({ value: d, label: d }))}
        />
      </div>

      <div style={{ width: '130px' }}>
        <CustomSelect
          value={quickPriority}
          onChange={(val) => setQuickPriority(val as any)}
          options={[
            { value: 'normal', label: 'عادي' },
            { value: 'urgent', label: 'عاجل جداً' },
            { value: 'customer_request', label: 'طلب مريض' },
          ]}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={isPending || !quickName.trim()}
        style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
      >
        {isPending ? 'جاري الإضافة...' : '+ إدراج بالكشكول'}
      </Button>
    </form>
  );
};
