import { useTranslation } from 'react-i18next';
import React from 'react';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { IconEdit } from '../PharmacyIcons';
import type { PharmacyShortage } from '../../types/pharmacy.types';

interface ShortagesTableProps {
  shortages: PharmacyShortage[];
  isLoading: boolean;
  onStatusChange: (id: number, status: string) => void;
  onEdit: (shortage: PharmacyShortage) => void;
}

export const ShortagesTable: React.FC<ShortagesTableProps> = ({
  shortages,
  isLoading,
  onStatusChange,
  onEdit,
}) => {
  const { t } = useTranslation();
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'right' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
            <th style={{ padding: '10px 14px' }}>{t('pharmacy.shortages.shortages_table.s0', "اسم الدواء الناقص")}</th>
            <th style={{ padding: '10px 14px' }}>{t('pharmacy.shortages.shortages_table.s1', "المادة الفعالة")}</th>
            <th style={{ padding: '10px 14px' }}>{t('pharmacy.shortages.shortages_table.s2', "الموزع المفضل")}</th>
            <th style={{ padding: '10px 14px' }}>{t('pharmacy.shortages.shortages_table.s3', "الكمية")}</th>
            <th style={{ padding: '10px 14px' }}>{t('pharmacy.shortages.shortages_table.s4', "الأولوية")}</th>
            <th style={{ padding: '10px 14px' }}>{t('pharmacy.shortages.shortages_table.s5', "الحالة")}</th>
            <th style={{ padding: '10px 14px', textAlign: 'center' }}>{t('pharmacy.shortages.shortages_table.s6', "الإجراءات")}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>{t('pharmacy.shortages.shortages_table.s7', "جاري التحميل...")}</td>
            </tr>
          ) : shortages.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>{t('pharmacy.shortages.shortages_table.s8', "لا توجد نواقص مسجلة")}</td>
            </tr>
          ) : (
            shortages.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px' }}>
                  <strong style={{ color: '#0f172a' }}>{s.product_name}</strong>
                  {s.customer_name && (
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {t('pharmacy.shortages.shortages_table.s9', "طالب الصنف:")} {s.customer_name} {s.customer_phone ? ('(' + s.customer_phone + ')') : ''}
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 14px', color: '#0f766e', fontWeight: 600 }}>
                  {s.active_ingredient || '—'}
                </td>
                <td style={{ padding: '10px 14px', color: '#475569' }}>
                  {s.suggested_distributor || t('pharmacy.shortages.shortages_table.s10', "أي موزع")}
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                  {s.requested_quantity} {t('pharmacy.shortages.shortages_table.s11', "علبة")}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: s.priority === 'urgent' ? '#fee2e2' : '#f1f5f9',
                      color: s.priority === 'urgent' ? '#b91c1c' : '#475569',
                      border: s.priority === 'urgent' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {s.priority === 'urgent' ? t('pharmacy.shortages.shortages_table.s12', "عاجل جداً") : s.priority === 'customer_request' ? t('pharmacy.shortages.shortages_table.s13', "طلب عميل") : t('pharmacy.shortages.shortages_table.s14', "عادي")}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ width: '130px' }}>
                    <CustomSelect
                      value={s.status}
                      onChange={(val) => onStatusChange(s.id, val)}
                      options={[
                        { value: 'needed', label: t('pharmacy.shortages.shortages_table.s15', "مطلوب") },
                        { value: 'ordered', label: t('pharmacy.shortages.shortages_table.s16', "تم الطلب") },
                        { value: 'received', label: t('pharmacy.shortages.shortages_table.s17', "تم الاستلام") },
                        { value: 'unavailable', label: t('pharmacy.shortages.shortages_table.s18', "غير متوفر بالسوق") },
                      ]}
                    />
                  </div>
                </td>

                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <Button
                    variant="secondary"
                    className="btn-sm"
                    onClick={() => onEdit(s)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <IconEdit size={14} />
                    <span>{t('pharmacy.shortages.shortages_table.s19', "تعديل")}</span>
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
