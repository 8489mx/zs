import { useTranslation } from 'react-i18next';
import React from 'react';
import { formatCurrency } from '@/lib/format';
import { CheckIcon } from '@/shared/components/icons/AppIcons';
import type { VatDeclarationData } from '@/features/sales/api/vat-declaration.api';

interface VatPurchasesTableProps {
  data: VatDeclarationData | undefined;
  country: 'EG' | 'SA';
  copiedKey: string | null;
  onCopy: (text: string | number, key: string) => void;
}

export const VatPurchasesTable: React.FC<VatPurchasesTableProps> = ({
  data,
  country,
  copiedKey,
  onCopy,
}) => {
  const { t } = useTranslation();
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ backgroundColor: '#f1f5f9', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', color: '#1e293b', fontSize: '14px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
        <span>{t('sales.vat_declaration.vat_purchases_table.s0', "ثانياً: المشتريات والمدخلات (Purchases & Input Tax)")}</span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>{t('sales.vat_declaration.vat_purchases_table.s1', "الضريبة القابلة للخصم")}</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b', fontSize: '12px' }}>
            <th style={{ padding: '8px 12px', width: '50px' }}>{t('sales.vat_declaration.vat_purchases_table.s2', "البند")}</th>
            <th style={{ padding: '8px 12px' }}>{t('sales.vat_declaration.vat_purchases_table.s3', "البيان والتوصيف الرسمي")}</th>
            <th style={{ padding: '8px 12px', width: '160px' }}>{t('sales.vat_declaration.vat_purchases_table.s4', "القيمة الصافية (الوعاء)")}</th>
            <th style={{ padding: '8px 12px', width: '140px' }}>{t('sales.vat_declaration.vat_purchases_table.s5', "الضريبة القابلة للخصم")}</th>
            <th style={{ padding: '8px 12px', width: '70px', textAlign: 'center' }}>{t('sales.vat_declaration.vat_purchases_table.s6', "نسخ")}</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>5</td>
            <td style={{ padding: '10px 12px' }}>
              {t('sales.vat_declaration.vat_purchases_table.s7', "المشتريات المحلية الخاضعة للنسبة الأساسية (")}{data?.period.standard_rate_percent || (country === 'SA' ? 15 : 14)}%)
            </td>
            <td style={{ padding: '10px 12px', fontWeight: '600' }}>
              {formatCurrency(data?.input_tax.standard_rated_base || 0)}
            </td>
            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#0f172a' }}>
              {formatCurrency(data?.input_tax.standard_rated_tax || 0)}
            </td>
            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => onCopy(data?.input_tax.standard_rated_tax || 0, 'in_std')}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '2px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {copiedKey === 'in_std' ? <CheckIcon size={12} color="#166534" /> : t('sales.vat_declaration.vat_purchases_table.s8', "نسخ")}
              </button>
            </td>
          </tr>

          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>6</td>
            <td style={{ padding: '10px 12px' }}>
              {t('sales.vat_declaration.vat_purchases_table.s9', "المشتريات المعفاة أو غير الخاضعة للضريبة")}
            </td>
            <td style={{ padding: '10px 12px' }}>
              {formatCurrency(data?.input_tax.zero_rated_base || 0)}
            </td>
            <td style={{ padding: '10px 12px', color: '#64748b' }}>0.00</td>
            <td style={{ padding: '10px 12px', textAlign: 'center' }}>-</td>
          </tr>

          <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#fff7ed' }}>
            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>7</td>
            <td style={{ padding: '10px 12px' }}>
              {t('sales.vat_declaration.vat_purchases_table.s10', "مردودات المشتريات وإشعارات الإضافة (تُخصم من ضريبة المدخلات)")}
            </td>
            <td style={{ padding: '10px 12px', color: '#9a3412' }}>
              -{formatCurrency(data?.input_tax.returns_base || 0)}
            </td>
            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#9a3412' }}>
              -{formatCurrency(data?.input_tax.returns_tax || 0)}
            </td>
            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => onCopy(data?.input_tax.returns_tax || 0, 'in_ret')}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px', padding: '2px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {copiedKey === 'in_ret' ? <CheckIcon size={12} color="#166534" /> : t('sales.vat_declaration.vat_purchases_table.s11', "نسخ")}
              </button>
            </td>
          </tr>

          {/* Total Input Tax */}
          <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
            <td colSpan={2} style={{ padding: '12px', color: '#0f172a' }}>
              {t('sales.vat_declaration.vat_purchases_table.s12', "إجمالي ضريبة المدخلات المخصومة (ب)")}
            </td>
            <td style={{ padding: '12px' }}>
              {formatCurrency(data?.input_tax.total_purchases_base || 0)}
            </td>
            <td style={{ padding: '12px', fontSize: '15px', color: '#0f172a' }}>
              {formatCurrency(data?.input_tax.total_input_vat || 0)}
            </td>
            <td style={{ padding: '12px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => onCopy(data?.input_tax.total_input_vat || 0, 'in_tot')}
                style={{ background: '#170e5e', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '11px', padding: '3px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {copiedKey === 'in_tot' ? <CheckIcon size={12} color="#ffffff" /> : t('sales.vat_declaration.vat_purchases_table.s13', "نسخ")}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
