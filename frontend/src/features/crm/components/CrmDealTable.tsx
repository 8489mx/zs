import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDateOnly } from '@/lib/format';
import type { CrmDeal } from '../api/crm.api';
import { STAGES, PRIORITIES } from './CrmConstants';

interface CrmDealTableProps {
  deals: CrmDeal[];
  onSelectDeal: (dealId: number) => void;
}

export function CrmDealTable({ deals, onSelectDeal }: CrmDealTableProps) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'start' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('crm.crm_deal_table.s0', "عنوان الفرصة")}</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('crm.crm_deal_table.s1', "العميل / الشركة")}</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('crm.crm_deal_table.s2', "المرحلة")}</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('crm.crm_deal_table.s3', "القيمة المتوقعة")}</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('crm.crm_deal_table.s4', "الاحتمالية")}</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('crm.crm_deal_table.s5', "الأولوية")}</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>{t('crm.crm_deal_table.s6', "تاريخ الإغلاق")}</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>{t('crm.crm_deal_table.s7', "إجراءات")}</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => {
            const stageConfig = STAGES.find((s) => s.key === deal.stage);
            const priorityConfig = PRIORITIES[deal.priority] || PRIORITIES.medium;

            return (
              <tr
                key={deal.id}
                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                onClick={() => onSelectDeal(deal.id)}
              >
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#170e5e' }}>{deal.title}</td>
                <td style={{ padding: '12px 16px', color: '#475569' }}>
                  {deal.companyName || deal.contactName || '-'}
                  {deal.contactPhone && (
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{deal.contactPhone}</div>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: stageConfig?.bg || '#f1f5f9',
                      color: stageConfig?.color || '#475569',
                    }}
                  >
                    {t(`crm.stage.${deal.stage}`, stageConfig?.label || deal.stage)}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                  {formatCurrency(deal.expectedAmount)}
                </td>
                <td style={{ padding: '12px 16px' }}>{deal.probability}%</td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: priorityConfig.bg,
                      color: priorityConfig.color,
                    }}
                  >
                    {t(`crm.priority.${deal.priority}`, priorityConfig.label)}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>
                  {deal.expectedCloseDate ? formatDateOnly(deal.expectedCloseDate) : '-'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="secondary"
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                    onClick={() => onSelectDeal(deal.id)}
                  >
                    {t('crm.crm_deal_table.s8', "عرض التفاصيل")}
                  </Button>
                </td>
              </tr>
            );
          })}

          {deals.length === 0 && (
            <tr>
              <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                {t('crm.crm_deal_table.s9', "لا توجد فرص بيعية مطابقة للبحث")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}