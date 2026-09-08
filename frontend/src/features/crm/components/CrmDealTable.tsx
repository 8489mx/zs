import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDateOnly } from '@/lib/format';
import type { CrmDeal } from '../api/crm.api';
import { STAGES, PRIORITIES } from './CrmConstants';

interface CrmDealTableProps {
  deals: CrmDeal[];
  onSelectDeal: (dealId: number) => void;
}

export function CrmDealTable({ deals, onSelectDeal }: CrmDealTableProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>عنوان الفرصة</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>العميل / الشركة</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>المرحلة</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>القيمة المتوقعة</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>الاحتمالية</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>الأولوية</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>تاريخ الإغلاق</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>إجراءات</th>
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
                    {stageConfig?.label || deal.stage}
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
                    {priorityConfig.label}
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
                    عرض التفاصيل
                  </Button>
                </td>
              </tr>
            );
          })}

          {deals.length === 0 && (
            <tr>
              <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                لا توجد فرص بيعية مطابقة للبحث
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}