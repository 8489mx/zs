import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { hrApi } from '@/features/hr/api/hr.api';
import { Button } from '@/shared/ui/button';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface Props {
  employeeId: string;
  canViewSalary: boolean;
  canViewLoans: boolean;
}

type PeriodFilterMode = 'all' | 'current_month' | 'custom';

export function EmployeeFinancialStatement({ employeeId, canViewSalary, canViewLoans }: Props) {
  const { t } = useTranslation();
  const { currencyCode } = useSystemCurrency();
  const displayMoney = (amount: number): string => {
    const decimals = currencyCode === 'KWD' || currencyCode === 'OMR' ? 3 : 2;
    const numeric = new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    }).format(Number(amount) || 0);
    return currencyCode ? `${numeric} ${currencyCode}` : numeric;
  };
  const [filterMode, setFilterMode] = useState<PeriodFilterMode>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'monthly'>('transactions');

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const queryParams = useMemo(() => {
    if (filterMode === 'current_month') {
      return { month: currentMonthStr };
    }
    if (filterMode === 'custom' && from && to) {
      return { from, to };
    }
    return {};
  }, [filterMode, currentMonthStr, from, to]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['hr.financialStatement', employeeId, queryParams],
    queryFn: () => hrApi.financialStatement(employeeId, queryParams),
    enabled: Boolean(employeeId) && canViewSalary,
  });

  const summary = data?.summary || {
    totalGrossEarnings: 0,
    totalPaidSalaries: 0,
    totalWithdrawals: 0,
    totalRepayments: 0,
    remainingLoanDebt: 0,
    totalPenalties: 0,
    totalAllowances: 0,
    netFinancialBalance: 0,
    balanceStatus: 'settled',
  };

  const transactions = data?.transactions || [];
  const monthlyBreakdown = data?.monthlyBreakdown || [];

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'withdrawal':
        return { label: 'سلفة / مسحوب نقدي', bg: '#f8fafc', color: '#334155', border: '#e2e8f0' };
      case 'salary_payout':
        return { label: 'صرف راتب', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
      case 'salary_entitlement':
        return { label: 'استحقاق راتب', bg: '#f8fafc', color: '#0f172a', border: '#e2e8f0' };
      case 'loan_repayment':
        return { label: 'سداد سلفة نقدي', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
      case 'penalty':
        return { label: 'جزاء / خصم إداري', bg: '#fffbeb', color: '#92400e', border: '#fef3c7' };
      case 'allowance':
        return { label: 'مكافأة / بدل إضافي', bg: '#faf5ff', color: '#6b21a8', border: '#f3e8ff' };
      default:
        return { label: 'حركة مالية', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  if (!canViewSalary) {
    return (
      <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
        <p style={{ margin: 0 }}>{t('hr.financial_statement.no_permission', "السجل المالي الشامل يتطلب صلاحية عرض المرتبات. تابع السلف من شاشة السلف المخصصة.")}</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', marginTop: '16px' }} dir="rtl">
      {/* Header and Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '3px', height: '16px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {t('hr.financial_statement.title', "السجل المالي الشامل للموظف (كشف الحساب التراكمي)")}
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 11px', fontSize: '0.8rem', color: '#64748b' }}>
            {t('hr.financial_statement.subtitle', "تتبع دقيق وشامل لكافة المسحوبات النقدية من الكاشير، مقبوضات المرتبات، الاستحقاقات والجزاءات، وصافي الرصيد التراكمي.")}
          </p>
        </div>

        <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {canViewLoans ? <Button
            type="button"
            variant="secondary"
            onClick={() => window.dispatchEvent(new CustomEvent('open-quick-cash-advance'))}
            style={{ fontWeight: 700, fontSize: '0.8rem' }}
          >
            {t('hr.financial_statement.quick_cash_btn', "+ صرف سلفة سريعة من الكاشير")}
          </Button> : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.print()}
            style={{ fontWeight: 600, fontSize: '0.8rem' }}
          >
            {t('hr.financial_statement.print_btn', "طباعة كشف الحساب")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => refetch()}
            style={{ fontWeight: 600, fontSize: '0.8rem' }}
          >
            {t('hr.financial_statement.refresh_btn', "تحديث")}
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginLeft: '6px' }}>الفترة:</span>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: filterMode === 'all' ? '1px solid #170e5e' : '1px solid #cbd5e1',
              backgroundColor: filterMode === 'all' ? '#170e5e' : '#ffffff',
              color: filterMode === 'all' ? '#ffffff' : '#334155',
              cursor: 'pointer',
            }}
          >
            كل الحركات
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('current_month')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: filterMode === 'current_month' ? '1px solid #170e5e' : '1px solid #cbd5e1',
              backgroundColor: filterMode === 'current_month' ? '#170e5e' : '#ffffff',
              color: filterMode === 'current_month' ? '#ffffff' : '#334155',
              cursor: 'pointer',
            }}
          >
            الشهر الحالي ({currentMonthStr})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('custom')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: filterMode === 'custom' ? '1px solid #170e5e' : '1px solid #cbd5e1',
              backgroundColor: filterMode === 'custom' ? '#170e5e' : '#ffffff',
              color: filterMode === 'custom' ? '#ffffff' : '#334155',
              cursor: 'pointer',
            }}
          >
            تحديد فترة مخصصة
          </button>
        </div>

        {filterMode === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              من:
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </label>
            <label style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              إلى:
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </label>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          {t('common.loading', "جاري جرد وحساب السجل المالي للموظف...")}
        </div>
      ) : isError ? (
        <div className="error-box" style={{ margin: '20px 0' }}>
          {t('common.error_occurred', "تعذر تحميل كشف الحساب المالي للموظف.")}
        </div>
      ) : (
        <>
          {/* 5-Card Financial Position KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {/* Card 1: Gross Entitlements */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                إجمالي الاستحقاقات (الرواتب والبدلات)
              </span>
              <strong style={{ fontSize: '1.15rem', color: '#0f172a', display: 'block' }}>
                {displayMoney(summary.totalGrossEarnings)}
              </strong>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                شامل الأساسي والبدلات المعتمدة
              </span>
            </div>

            {/* Card 2: Actual Paid Salaries */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                المقبوض الفعلي (صافي القبض المستلم)
              </span>
              <strong style={{ fontSize: '1.15rem', color: '#1e293b', display: 'block' }}>
                {displayMoney(summary.totalPaidSalaries)}
              </strong>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                ما استلمه الموظف نقداً كمرتبات
              </span>
            </div>

            {/* Card 3: Total Withdrawals from Cashier */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                إجمالي المسحوبات والسلف (الكاشير)
              </span>
              <strong style={{ fontSize: '1.15rem', color: '#0f172a', display: 'block' }}>
                {displayMoney(summary.totalWithdrawals)}
              </strong>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                المتبقي كمديونية سلف قائمة: <strong style={{ color: '#0f172a' }}>{displayMoney(summary.remainingLoanDebt)}</strong>
              </span>
            </div>

            {/* Card 4: Penalties and Deductions */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                الجزاءات والخصومات الإدارية
              </span>
              <strong style={{ fontSize: '1.15rem', color: '#0f172a', display: 'block' }}>
                {displayMoney(summary.totalPenalties)}
              </strong>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                خصومات تأخير وغياب وجزاءات
              </span>
            </div>

            {/* Card 5: Net Balance (Final Position) */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#475569',
                display: 'block',
                marginBottom: '4px',
              }}>
                صافي المركز المالي للموظف
              </span>
              <strong style={{
                fontSize: '1.25rem',
                color: '#0f172a',
                display: 'block',
              }}>
                {displayMoney(Math.abs(summary.netFinancialBalance))}
              </strong>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '6px',
                marginTop: '4px',
                background: summary.balanceStatus === 'credit' ? '#f0fdf4' : summary.balanceStatus === 'debit' ? '#f8fafc' : '#f1f5f9',
                color: summary.balanceStatus === 'credit' ? '#166534' : summary.balanceStatus === 'debit' ? '#334155' : '#64748b',
                border: `1px solid ${summary.balanceStatus === 'credit' ? '#bbf7d0' : '#e2e8f0'}`,
              }}>
                {summary.balanceStatus === 'credit'
                  ? 'رصيد دائن للموظف (له مستحقات باقية)'
                  : summary.balanceStatus === 'debit'
                  ? 'رصيد مدين على الموظف (عليه مديونية ومسحوبات)'
                  : 'الحساب خالص ومتزن تماماً (0.00)'}
              </span>
            </div>
          </div>

          {/* Sub-Tabs: Transactions vs Monthly Breakdown */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '14px', paddingBottom: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveSubTab('transactions')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeSubTab === 'transactions' ? '2px solid #170e5e' : '2px solid transparent',
                color: activeSubTab === 'transactions' ? '#170e5e' : '#64748b',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              كشف الحركات التراكمي ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('monthly')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeSubTab === 'monthly' ? '2px solid #170e5e' : '2px solid transparent',
                color: activeSubTab === 'monthly' ? '#170e5e' : '#64748b',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              الملخص والمقارنة الشهرية ({monthlyBreakdown.length})
            </button>
          </div>

          {/* View 1: Transactions Table */}
          {activeSubTab === 'transactions' && (
            <div>
              {!transactions.length ? (
                <p className="muted" style={{ textAlign: 'center', padding: '30px' }}>
                  لا توجد حركات مالية مسجلة لهذا الموظف في الفترة المحددة.
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '130px' }}>التاريخ والوقت</th>
                        <th style={{ width: '150px' }}>نوع الحركة</th>
                        <th>البيان والتفاصيل</th>
                        <th style={{ width: '120px' }}>المسؤول / الكاشير</th>
                        <th style={{ width: '110px', textAlign: 'left' }}>مدين (مسحوب/قبض)</th>
                        <th style={{ width: '110px', textAlign: 'left' }}>دائن (استحقاق)</th>
                        <th style={{ width: '120px', textAlign: 'left' }}>الرصيد التراكمي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx: any) => {
                        const badge = getCategoryBadge(tx.category);
                        return (
                          <tr key={tx.id}>
                            <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                              {tx.timestamp ? tx.timestamp.slice(0, 16).replace('T', ' ') : tx.date}
                            </td>
                            <td>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                              }}>
                                {badge.label}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.8rem' }}>
                              <strong style={{ display: 'block', color: '#0f172a' }}>{tx.typeLabel}</strong>
                              <span style={{ color: '#64748b' }}>{tx.description}</span>
                              {tx.channel ? (
                                <span style={{ marginRight: '6px', fontSize: '0.7rem', color: '#475569', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                                  {tx.channel}
                                </span>
                              ) : null}
                            </td>
                            <td style={{ fontSize: '0.78rem', color: '#475569' }}>
                              {tx.actorName || '—'}
                            </td>
                            <td style={{ textAlign: 'left', fontWeight: tx.debit > 0 ? 600 : 400, color: tx.debit > 0 ? '#0f172a' : '#94a3b8', fontSize: '0.82rem' }}>
                              {tx.debit > 0 ? displayMoney(tx.debit) : '—'}
                            </td>
                            <td style={{ textAlign: 'left', fontWeight: tx.credit > 0 ? 600 : 400, color: tx.credit > 0 ? '#15803d' : '#94a3b8', fontSize: '0.82rem' }}>
                              {tx.credit > 0 ? displayMoney(tx.credit) : '—'}
                            </td>
                            <td style={{
                              textAlign: 'left',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              color: '#0f172a',
                            }}>
                              {displayMoney(Math.abs(tx.runningBalance))}
                              <span style={{
                                fontSize: '0.68rem',
                                display: 'inline-block',
                                marginTop: '2px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: tx.runningBalance > 0 ? '#f0fdf4' : tx.runningBalance < 0 ? '#f8fafc' : '#f1f5f9',
                                color: tx.runningBalance > 0 ? '#15803d' : tx.runningBalance < 0 ? '#475569' : '#64748b',
                                border: `1px solid ${tx.runningBalance > 0 ? '#bbf7d0' : '#e2e8f0'}`,
                                fontWeight: 600,
                              }}>
                                {tx.runningBalance > 0 ? 'دائن (له)' : tx.runningBalance < 0 ? 'مدين (عليه)' : 'خالص'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* View 2: Monthly Breakdown Table */}
          {activeSubTab === 'monthly' && (
            <div>
              {!monthlyBreakdown.length ? (
                <p className="muted" style={{ textAlign: 'center', padding: '30px' }}>
                  لا توجد بيانات شهرية مسجلة.
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الشهر</th>
                        <th style={{ textAlign: 'left' }}>استحقاق الشهر (Gross)</th>
                        <th style={{ textAlign: 'left' }}>المقبوض الفعلي (Paid)</th>
                        <th style={{ textAlign: 'left' }}>مسحوبات الكاشير</th>
                        <th style={{ textAlign: 'left' }}>سدادات السلف</th>
                        <th style={{ textAlign: 'left' }}>الجزاءات والخصومات</th>
                        <th style={{ textAlign: 'left' }}>صافي الشهر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyBreakdown.map((m: any) => (
                        <tr key={m.month}>
                          <td><strong>{m.month}</strong></td>
                          <td style={{ textAlign: 'left', color: '#15803d', fontWeight: 600 }}>{displayMoney(m.grossSalary)}</td>
                          <td style={{ textAlign: 'left', color: '#1e293b', fontWeight: 600 }}>{displayMoney(m.paidSalary)}</td>
                          <td style={{ textAlign: 'left', color: '#c2410c', fontWeight: 600 }}>{displayMoney(m.withdrawals)}</td>
                          <td style={{ textAlign: 'left', color: '#166534' }}>{displayMoney(m.repayments)}</td>
                          <td style={{ textAlign: 'left', color: '#dc2626' }}>{displayMoney(m.penalties)}</td>
                          <td style={{
                            textAlign: 'left',
                            fontWeight: 800,
                            color: m.netMonth > 0 ? '#15803d' : m.netMonth < 0 ? '#b91c1c' : '#475569',
                          }}>
                            {displayMoney(Math.abs(m.netMonth))}
                            <span style={{ fontSize: '0.68rem', display: 'block', color: '#64748b', fontWeight: 500 }}>
                              {m.netMonth > 0 ? 'فائض له' : m.netMonth < 0 ? 'عجز عليه' : 'متزن'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
