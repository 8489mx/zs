import React from 'react';
import { formatCurrency } from '@/lib/format';
import { CheckIcon } from '@/shared/components/icons/AppIcons';
import type { VatDeclarationData } from '@/features/sales/api/vat-declaration.api';

interface VatSummaryBoxProps {
  data: VatDeclarationData | undefined;
  country: 'EG' | 'SA';
  copiedKey: string | null;
  onCopy: (text: string | number, key: string) => void;
}

export const VatSummaryBox: React.FC<VatSummaryBoxProps> = ({
  data,
  country,
  copiedKey,
  onCopy,
}) => {
  return (
    <>
      <div
        style={{
          border: '2px solid #170e5e',
          borderRadius: '12px',
          padding: '20px',
          backgroundColor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
            {country === 'EG'
              ? 'ثالثاً: صافي الضريبة المستحقة للسداد (الخانة 15 في نموذج 10)'
              : 'ثالثاً: صافي ضريبة القيمة المضافة المستحقة للسداد / الاسترداد (ZATCA)'}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            معادلة الاحتساب الرسمية: ضريبة المخرجات ({formatCurrency(data?.output_tax.total_output_vat || 0)}) - ضريبة المدخلات ({formatCurrency(data?.input_tax.total_input_vat || 0)})
          </div>
        </div>

        <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
              {data?.summary.status === 'payable' ? 'صافي المبلغ الواجب سداده' : 'رصيد دائن للاسترداد / الترحيل'}
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: data?.summary.status === 'payable' ? '#166534' : '#1d4ed8',
              }}
            >
              {formatCurrency(Math.abs(data?.summary.net_vat_due || 0))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onCopy(Math.abs(data?.summary.net_vat_due || 0), 'net_vat')}
            style={{
              backgroundColor: '#170e5e',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {copiedKey === 'net_vat' ? (
              <>
                <CheckIcon size={14} color="#ffffff" />
                <span>تم النسخ</span>
              </>
            ) : (
              'نسخ الصافي'
            )}
          </button>
        </div>
      </div>

      {/* Official Signatures Box for A4 Print */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          textAlign: 'center',
          paddingTop: '20px',
          borderTop: '1px dashed #cbd5e1',
          marginTop: '20px',
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '40px' }}>
            المحاسب المسؤول / مدخل البيانات
          </div>
          <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', margin: '0 auto' }} />
        </div>

        <div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '40px' }}>
            المدير المالي / مراجع الحسابات
          </div>
          <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', margin: '0 auto' }} />
        </div>

        <div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '40px' }}>
            اعتماد صاحب المنشأة / المفوض
          </div>
          <div style={{ borderBottom: '1px solid #94a3b8', width: '180px', margin: '0 auto' }} />
        </div>
      </div>
    </>
  );
};
