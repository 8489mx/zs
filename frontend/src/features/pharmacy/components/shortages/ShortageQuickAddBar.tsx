import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        <span>{t('pharmacy.shortages.shortage_quick_add_bar.s0', "إضافة فورية للكشكول:")}</span>
      </div>

      <input
        type="text"
        required
        className="purchase-prototype-field-input"
        placeholder={t('pharmacy.shortages.shortage_quick_add_bar.s1', "اسم الدواء الناقص...")}
        value={quickName}
        onChange={(e) => setQuickName(e.target.value)}
        style={{ flex: '1 1 200px', fontSize: '0.84rem' }}
      />

      <input
        type="number"
        min="1"
        className="purchase-prototype-field-input"
        placeholder={t('pharmacy.shortages.shortage_quick_add_bar.s2', "العدد")}
        value={quickQty}
        onChange={(e) => setQuickQty(Number(e.target.value) || 1)}
        style={{ width: '70px', fontSize: '0.84rem', textAlign: 'center' }}
        title={t('pharmacy.shortages.shortage_quick_add_bar.s3', "الكمية المطلوبة بالعلب")}
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
            { value: 'normal', label: t('pharmacy.shortages.shortage_quick_add_bar.s4', "عادي") },
            { value: 'urgent', label: t('pharmacy.shortages.shortage_quick_add_bar.s5', "عاجل جداً") },
            { value: 'customer_request', label: t('pharmacy.shortages.shortage_quick_add_bar.s6', "طلب مريض") },
          ]}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={isPending || !quickName.trim()}
        style={{ whiteSpace: 'nowrap', padding: '6px 14px' }}
      >
        {isPending ? t('pharmacy.shortages.shortage_quick_add_bar.s7', "جاري الإضافة...") : t('pharmacy.shortages.shortage_quick_add_bar.s8', "+ إدراج بالكشكول")}
      </Button>
    </form>
  );
};
