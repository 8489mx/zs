import React from 'react';
import { formatCurrency } from '@/lib/format';
import { CheckIcon } from '@/shared/components/icons/AppIcons';
import type { VatDeclarationData } from '@/features/sales/api/vat-declaration.api';

interface VatSalesTableProps {
  data: VatDeclarationData | undefined;
  country: 'EG' | 'SA';
  copiedKey: string | null;
  onCopy: (text: string | number, key: string) => void;
}

export const VatSalesTable: React.FC<VatSalesTableProps> = ({
  data,
  country,
  copiedKey,
  onCopy,
}) => {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', color: '#1e293b', fontSize: '14px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
        <span>أولاً: المبيعات والمخرجات (Sales & Output Tax)</span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>ضريبة المبيعات المستحقة</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b', fontSize: '12px' }}>
            <th style={{ padding: '8px 12px', width: '50px' }}>البند</th>
            <th style={{ padding: '8px 12px' }}>البيان والتوصيف الرسمي</th>
            <th style={{ padding: '8px 12px', width: '160px' }}>القيمة الصافية (الوعاء)</th>
            <th style={{ padding: '8px 12px', width: '140px' }}>الضريبة المستحقة</th>
            <th style={{ padding: '8px 12px', width: '70px', textAlign: 'center' }}>نسخ</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>1</td>
            <td style={{ padding: '10px 12px' }}>
              التوريدات والسلع الخاضعة للنسبة الأساسية ({data?.period.standard_rate_percent || (country === 'SA' ? 15 : 14)}%)
            </td>
            <td style={{ padding: '10px 12px', fontWeight: '600' }}>
              {formatCurrency(data?.output_tax.standard_rated_base || 0)}
            </td>
            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#166534' }}>
              {formatCurrency(data?.output_tax.standard_rated_tax || 0)}
            </td>
            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => onCopy(data?.output_tax.standard_rated_tax || 0, 'out_std')}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '2px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {copiedKey === 'out_std' ? <CheckIcon size={12} color="#166534" /> : 'نسخ'}
              </button>
            </td>
          </tr>

          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>2</td>
            <td style={{ padding: '10px 12px' }}>
              الصادرات أو التوريدات الخاضعة للنسبة الصفرية (0%)
            </td>
            <td style={{ padding: '10px 12px' }}>
              {formatCurrency(data?.output_tax.zero_rated_base || 0)}
            </td>
            <td style={{ padding: '10px 12px', color: '#64748b' }}>0.00</td>
            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => onCopy(data?.output_tax.zero_rated_base || 0, 'out_zero')}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '2px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {copiedKey === 'out_zero' ? <CheckIcon size={12} color="#166534" /> : 'نسخ'}
              </button>
            </td>
          </tr>

          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>3</td>
            <td style={{ padding: '10px 12px' }}>
              التوريدات والسلع المعفاة من الضريبة
            </td>
            <td style={{ padding: '10px 12px' }}>
              {formatCurrency(data?.output_tax.exempt_base || 0)}
            </td>
            <td style={{ padding: '10px 12px', color: '#64748b' }}>0.00</td>
            <td style={{ padding: '10px 12px', textAlign: 'center' }}>-</td>
          </tr>

          <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#fff7ed' }}>
            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>4</td>
            <td style={{ padding: '10px 12px' }}>
              مردودات المبيعات وإشعارات الخصم الدائنة (يُخصم من الضريبة)
            </td>
            <td style={{ padding: '10px 12px', color: '#9a3412' }}>
              -{formatCurrency(data?.output_tax.returns_base || 0)}
            </td>
            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#9a3412' }}>
              -{formatCurrency(data?.output_tax.returns_tax || 0)}
            </td>
            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => onCopy(data?.output_tax.returns_tax || 0, 'out_ret')}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '2px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {copiedKey === 'out_ret' ? <CheckIcon size={12} color="#166534" /> : 'نسخ'}
              </button>
            </td>
          </tr>

          {/* Total Output Tax */}
          <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
            <td colSpan={2} style={{ padding: '12px', color: '#0f172a' }}>
              إجمالي ضريبة المخرجات الخاضعة للتوريد (أ)
            </td>
            <td style={{ padding: '12px' }}>
              {formatCurrency(data?.output_tax.total_sales_base || 0)}
            </td>
            <td style={{ padding: '12px', fontSize: '15px', color: '#166534' }}>
              {formatCurrency(data?.output_tax.total_output_vat || 0)}
            </td>
            <td style={{ padding: '12px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => onCopy(data?.output_tax.total_output_vat || 0, 'out_tot')}
                style={{ background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '11px', padding: '3px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {copiedKey === 'out_tot' ? <CheckIcon size={12} color="#ffffff" /> : 'نسخ'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
