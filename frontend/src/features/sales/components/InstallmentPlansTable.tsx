import { useTranslation } from 'react-i18next';
import React from 'react';
import { formatCurrency } from '@/lib/format';
import { InstallmentPlanItem } from '@/features/sales/api/installments.api';
import { installmentStatusBadges } from './InstallmentsScheduleTable';

interface InstallmentPlansTableProps {
  isLoading: boolean;
  plans: InstallmentPlanItem[];
  onViewDetails: (plan: InstallmentPlanItem) => void;
}

export const InstallmentPlansTable: React.FC<InstallmentPlansTableProps> = ({
  isLoading,
  plans,
  onViewDetails,
}) => {
  const { t } = useTranslation();
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
            <th style={{ padding: '12px 16px' }}>{t('sales.installment_plans_table.s0', "رقم العقد")}</th>
            <th style={{ padding: '12px 16px' }}>{t('sales.installment_plans_table.s1', "العميل")}</th>
            <th style={{ padding: '12px 16px' }}>{t('sales.installment_plans_table.s2', "إجمالي الفاتورة")}</th>
            <th style={{ padding: '12px 16px' }}>{t('sales.installment_plans_table.s3', "المقدم")}</th>
            <th style={{ padding: '12px 16px' }}>{t('sales.installment_plans_table.s4', "الممول + الفائدة")}</th>
            <th style={{ padding: '12px 16px' }}>{t('sales.installment_plans_table.s5', "الأقساط")}</th>
            <th style={{ padding: '12px 16px' }}>{t('sales.installment_plans_table.s6', "نسبة السداد")}</th>
            <th style={{ padding: '12px 16px' }}>{t('sales.installment_plans_table.s7', "الحالة")}</th>
            <th style={{ padding: '12px 16px', textAlign: 'center' }}>{t('sales.installment_plans_table.s8', "تفاصيل")}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                {t('sales.installment_plans_table.s9', "جاري تحميل خطط التقسيط...")}
              </td>
            </tr>
          ) : plans.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                {t('sales.installment_plans_table.s10', "لا توجد خطط تقسيط مسجلة")}
              </td>
            </tr>
          ) : (
            plans.map((plan) => {
              const badge = installmentStatusBadges[plan.status] || installmentStatusBadges.active;
              const percent = plan.progress_percent || 0;

              return (
                <tr key={plan.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                    {plan.plan_number}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{plan.customer_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{plan.customer_phone}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                    {formatCurrency(plan.total_amount)}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {formatCurrency(plan.down_payment)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>
                      {formatCurrency(plan.total_with_interest)}
                    </div>
                    {Number(plan.interest_rate_percent) > 0 && (
                      <div style={{ fontSize: '11px', color: '#d97706' }}>
                        {t('sales.installment_plans_table.s11', "فائدة")} {plan.interest_rate_percent}% ({formatCurrency(plan.interest_amount)})
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div>{plan.installment_count} {t('sales.installment_plans_table.s12', "شهور")}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {formatCurrency(plan.monthly_amount)} {t('sales.installment_plans_table.s13', "/ شهر")}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', minWidth: '140px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${percent}%`,
                            backgroundColor: percent >= 100 ? '#16a34a' : '#2563eb',
                            height: '100%',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>
                        {percent}%
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {t('sales.installment_plans_table.s14', "المسدد:")} {formatCurrency(plan.paid_amount || 0)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => onViewDetails(plan)}
                      style={{
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {t('sales.installment_plans_table.s15', "عرض الجدول")}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
