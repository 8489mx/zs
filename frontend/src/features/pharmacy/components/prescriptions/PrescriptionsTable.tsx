import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import React from 'react';
import { Button } from '@/shared/ui/button';
import { IconTag } from '../PharmacyIcons';
import type { PharmacyPrescription } from '../../types/pharmacy.types';

interface PrescriptionsTableProps {
  isLoading: boolean;
  prescriptions: PharmacyPrescription[];
  onPrintSticker: (rx: PharmacyPrescription) => void;
}

export const PrescriptionsTable: React.FC<PrescriptionsTableProps> = ({
  isLoading,
  prescriptions,
  onPrintSticker,
}) => {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'right' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
            <th style={{ padding: '10px 14px' }}>رقم الروشتة</th>
            <th style={{ padding: '10px 14px' }}>المريض / الطبيب</th>
            <th style={{ padding: '10px 14px' }}>جهة التأمين / الكود</th>
            <th style={{ padding: '10px 14px' }}>إجمالي الروشتة</th>
            <th style={{ padding: '10px 14px' }}>تحمل المريض (Co-pay)</th>
            <th style={{ padding: '10px 14px' }}>الحالة</th>
            <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td>
            </tr>
          ) : prescriptions.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>لا توجد روشتات مسجلة</td>
            </tr>
          ) : (
            prescriptions.map((rx: PharmacyPrescription) => (
              <tr key={rx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary, #1e1b4b)' }}>
                  {rx.prescription_no}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <strong style={{ color: '#0f172a' }}>{rx.customer_name}</strong>
                  {rx.customer_phone && <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{rx.customer_phone}</div>}
                  {rx.doctor_name && <div style={{ fontSize: '0.74rem', color: '#0284c7' }}>د. {rx.doctor_name} ({rx.doctor_specialty || 'طبيب'})</div>}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div>{rx.insurance_provider || 'كاش بدون تأمين'}</div>
                  {rx.approval_code && <div style={{ fontSize: '0.74rem', color: '#64748b' }}>موافقة: {rx.approval_code}</div>}
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                  {Number(rx.total_amount).toFixed(2)} <CurrencySymbol />
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <strong style={{ color: '#16a34a' }}>{Number(rx.patient_amount).toFixed(2)} <CurrencySymbol /></strong>
                  {Number(rx.patient_copay_percent) > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#64748b', marginRight: '4px' }}>
                      ({rx.patient_copay_percent}%)
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                    تم الصرف
                  </span>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <Button
                    variant="secondary"
                    className="btn-sm"
                    onClick={() => onPrintSticker(rx)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <IconTag size={14} />
                    <span>استيكر</span>
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
