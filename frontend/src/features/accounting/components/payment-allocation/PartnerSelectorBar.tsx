import { useTranslation } from 'react-i18next';
import React from 'react';

interface Partner {
  id: number;
  name: string;
  phone?: string;
}

interface PartnerSelectorBarProps {
  partnerType: 'customer' | 'supplier';
  setPartnerType: (type: 'customer' | 'supplier') => void;
  partnerId: number | null;
  setPartnerId: (id: number | null) => void;
  partners: Partner[];
  loadingPartners: boolean;
}

export const PartnerSelectorBar: React.FC<PartnerSelectorBarProps> = ({
  partnerType,
  setPartnerType,
  partnerId,
  setPartnerId,
  partners,
  loadingPartners,
}) => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'center' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
            {t('accounting.payment_allocation.partner_selector_bar.s0', "نوع الشريك")}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setPartnerType('customer')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: partnerType === 'customer' ? '#170e5e' : '#f8fafc',
                borderColor: partnerType === 'customer' ? '#170e5e' : '#cbd5e1',
                color: partnerType === 'customer' ? '#ffffff' : '#334155',
              }}
            >
              {t('accounting.payment_allocation.partner_selector_bar.s1', "عملاء (فواتير المبيعات)")}
            </button>
            <button
              type="button"
              onClick={() => setPartnerType('supplier')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: partnerType === 'supplier' ? '#170e5e' : '#f8fafc',
                borderColor: partnerType === 'supplier' ? '#170e5e' : '#cbd5e1',
                color: partnerType === 'supplier' ? '#ffffff' : '#334155',
              }}
            >
              {t('accounting.payment_allocation.partner_selector_bar.s2', "موردين (فواتير المشتريات)")}
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
            {t('accounting.payment_allocation.partner_selector_bar.s3', "اختر")} {partnerType === 'customer' ? t('accounting.payment_allocation.partner_selector_bar.s4', "العميل") : t('accounting.payment_allocation.partner_selector_bar.s5', "المورد")}
          </label>
          <select
            value={partnerId || ''}
            onChange={(e) => setPartnerId(e.target.value ? Number(e.target.value) : null)}
            disabled={loadingPartners}
            style={{
              width: '100%',
              maxWidth: '450px',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              outline: 'none',
            }}
          >
            <option value="">{t('accounting.payment_allocation.partner_selector_bar.s6', "-- اختر")} {partnerType === 'customer' ? t('accounting.payment_allocation.partner_selector_bar.s7', "العميل") : t('accounting.payment_allocation.partner_selector_bar.s8', "المورد")} {t('accounting.payment_allocation.partner_selector_bar.s9', "لعرض فواتيره وسنداته --")}</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.phone ? `(${p.phone})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
