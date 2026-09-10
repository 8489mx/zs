import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid, type StatsGridItem } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import {
  forexApi,
  CurrencyItem,
  ForexRevaluationPreview,
  ForexRevaluationRun,
} from '../api/forex.api';
import { CheckIcon, ShieldAlertIcon, ClockIcon } from '@/shared/components/icons/AppIcons';

export const AccountingForexRevaluationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard');

  // Wizard state
  const [periodDate, setPeriodDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [closingRate, setClosingRate] = useState<string>('50.00');
  const [previewData, setPreviewData] = useState<ForexRevaluationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // 1. Fetch currencies
  const { data: currenciesData } = useQuery({
    queryKey: ['forex-currencies'],
    queryFn: forexApi.listCurrencies,
  });

  const currencies: CurrencyItem[] = currenciesData?.currencies || [];

  // 2. Fetch past runs
  const { data: pastRuns = [], isLoading: isRunsLoading } = useQuery({
    queryKey: ['forex-runs'],
    queryFn: forexApi.listRuns,
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      setPreviewError('');
      return await forexApi.previewRevaluation({
        periodDate,
        currencyCode: selectedCurrency,
        closingRate: Number(closingRate),
      });
    },
    onSuccess: (data) => {
      setPreviewData(data);
    },
    onError: (err: any) => {
      setPreviewError(err?.message || 'فشلت عملية معاينة إعادة التقييم.');
      setPreviewData(null);
    },
  });

  // Execute mutation
  const executeMutation = useMutation({
    mutationFn: async () => {
      return await forexApi.executeRevaluation({
        periodDate,
        currencyCode: selectedCurrency,
        closingRate: Number(closingRate),
        notes,
      });
    },
    onSuccess: (res) => {
      alert(`تم بنجاح ترحيل قيد تسوية فروق تقييم العملة برقم: ${res.journalEntryNo || 'معتمد'}!`);
      queryClient.invalidateQueries({ queryKey: ['forex-runs'] });
      queryClient.invalidateQueries({ queryKey: ['forex-currencies'] });
      setPreviewData(null);
      setActiveTab('history');
    },
    onError: (err: any) => {
      alert(err?.message || 'فشل اعتماد قيد إعادة التقييم.');
    },
  });

  const stats: StatsGridItem[] = [
    {
      key: 'base-currency',
      label: 'العملة الأساسية للنظام',
      value: 'الجنيه المصري (EGP)',
    },
    {
      key: 'active-currencies',
      label: 'العملات الأجنبية النشطة',
      value: currencies.filter((c) => !c.isBase).length,
    },
    {
      key: 'past-runs',
      label: 'جلسات إعادة التقييم المنفذة',
      value: pastRuns.length,
    },
    {
      key: 'standard',
      label: 'معيار المحاسبة الدولي المطبق',
      value: 'IAS 21 / معيار مصري 13',
    },
  ];

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <PageHeader
        title="إعادة تقييم العملات الأجنبية وفروق الصرف (FX Revaluation - IAS 21)"
        description="حساب أرباح وخسائر فروق أسعار الصرف غير المحققة وإثبات القيود المحاسبية الآلية في نهاية الفترات المالية."
      />

      <StatsGrid items={stats} />

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '10px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('wizard')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'wizard' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'wizard' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: 'var(--font-body)',
            cursor: 'pointer',
          }}
        >
          معالج إعادة التقييم وقيد التسوية
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'history' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'history' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: 'var(--font-body)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ClockIcon size={14} />
          سجل الحركات السابقة ({pastRuns.length})
        </button>
      </div>

      {activeTab === 'wizard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Currencies Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--font-section-title)', color: '#0f172a' }}>
                أسعار الصرف الحالية المسجلة في النظام:
              </span>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                سعر الأساس 1.00 ج.م
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {currencies.map((c) => (
                <div
                  key={c.code}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: c.isBase ? '#f8fafc' : '#f0fdf4',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</span>
                    <div style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>{c.code} {c.symbol}</div>
                  </div>
                  <strong style={{ fontSize: 'var(--font-body)', color: '#170e5e' }}>
                    {Number(c.exchangeRate).toFixed(2)} ج.م
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Wizard Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              معالج إعادة التقييم المالي (IAS 21 Revaluation Routine)
            </h3>

            {previewError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: 'var(--font-body)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldAlertIcon size={16} />
                <span>{previewError}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#334155' }}>
                  تاريخ نهاية الفترة المالية:
                </label>
                <input
                  type="date"
                  value={periodDate}
                  onChange={(e) => setPeriodDate(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#334155' }}>
                  العملة المراد تقييمها:
                </label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => {
                    setSelectedCurrency(e.target.value);
                    const found = currencies.find((c) => c.code === e.target.value);
                    if (found) setClosingRate(String(found.exchangeRate));
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: 'var(--font-body)',
                    outline: 'none',
                  }}
                >
                  {currencies
                    .filter((c) => !c.isBase)
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#334155' }}>
                  سعر الصرف الإقفالي (سعر البنك المركزي):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.01"
                    value={closingRate}
                    onChange={(e) => setClosingRate(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: 'var(--font-body)',
                      fontWeight: 700,
                      outline: 'none',
                      width: '100%',
                    }}
                  />
                  <span style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#64748b' }}>ج.م</span>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
                style={{ height: '40px', padding: '0 20px' }}
              >
                {previewMutation.isPending ? 'جاري الفحص المحاسبي...' : 'معاينة فروق التقييم'}
              </Button>
            </div>

            {/* Preview Results Table */}
            {previewData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderRadius: '8px',
                    backgroundColor: previewData.netUnrealizedGainLoss >= 0 ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${previewData.netUnrealizedGainLoss >= 0 ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>صافي الأثر المالي (قائمة الدخل):</span>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 'var(--font-page-title)',
                        color: previewData.netUnrealizedGainLoss >= 0 ? '#15803d' : '#991b1b',
                      }}
                    >
                      {previewData.netUnrealizedGainLoss >= 0 ? 'أرباح فروق عملة محققة: +' : 'خسائر فروق عملة: '}
                      {Math.abs(previewData.netUnrealizedGainLoss).toLocaleString('ar-EG')} ج.م
                    </div>
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>إجمالي الرصيد الأجنبي المعني:</span>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-section-title)', color: '#0f172a' }}>
                      {previewData.totalForeignBalance.toLocaleString('ar-EG')} {previewData.currencyCode}
                    </div>
                  </div>
                </div>

                {/* Lines Table */}
                <div
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الحساب / الخزينة</th>
                        <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الرصيد بالعملة الأجنبية</th>
                        <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', color: '#475569' }}>القيمة الدفترية السابقة</th>
                        <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', color: '#475569' }}>القيمة المقومة الجديدة</th>
                        <th style={{ padding: '10px 14px', fontSize: 'var(--font-table-head)', color: '#475569' }}>فارق التقييم (الأرباح/الخسائر)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.lines.map((l, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                            {l.accountName} ({l.accountCode})
                          </td>
                          <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                            {l.foreignBalance.toLocaleString('ar-EG')} {previewData.currencyCode}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>
                            {l.bookLocalValue.toLocaleString('ar-EG')} ج.م
                          </td>
                          <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 600 }}>
                            {l.revaluedLocalValue.toLocaleString('ar-EG')} ج.م
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span
                              style={{
                                fontWeight: 700,
                                color: l.unrealizedDifference >= 0 ? '#15803d' : '#dc2626',
                              }}
                            >
                              {l.unrealizedDifference >= 0 ? '+' : ''}
                              {l.unrealizedDifference.toLocaleString('ar-EG')} ج.م
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Posting Action */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  <input
                    type="text"
                    placeholder="ملاحظات قيد اليومية (اختياري)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: 'var(--font-body)',
                      width: '380px',
                    }}
                  />

                  <Button
                    variant="primary"
                    onClick={() => executeMutation.mutate()}
                    disabled={executeMutation.isPending}
                    style={{ padding: '0 24px' }}
                  >
                    <CheckIcon size={16} />
                    {executeMutation.isPending ? 'جاري ترحيل القيد...' : 'اعتماد وترحيل قيد فروق التقييم الآلي'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>تاريخ الفترة</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>العملة</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>سعر الصرف الإقفالي</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>إجمالي الرصيد الأجنبي</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>صافي الأثر المالي</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>رقم قيد اليومية</th>
                <th style={{ padding: '12px 16px', fontSize: 'var(--font-table-head)', color: '#475569' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {isRunsLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    جاري تحميل السجل...
                  </td>
                </tr>
              ) : pastRuns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    لا توجد أي جلسات إعادة تقييم مسجلة بعد.
                  </td>
                </tr>
              ) : (
                pastRuns.map((r: ForexRevaluationRun) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {new Date(r.period_date).toLocaleDateString('ar-EG')}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#170e5e' }}>
                      {r.currency_code}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {Number(r.closing_exchange_rate).toFixed(2)} ج.م
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {Number(r.foreign_balance_total).toLocaleString('ar-EG')} {r.currency_code}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: Number(r.unrealized_gain_loss) >= 0 ? '#15803d' : '#dc2626',
                        }}
                      >
                        {Number(r.unrealized_gain_loss) >= 0 ? '+' : ''}
                        {Number(r.unrealized_gain_loss).toLocaleString('ar-EG')} ج.م
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2563eb' }}>
                      {r.journal_entry_no || `قيد #${r.journal_entry_id || '-'}`}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          fontSize: 'var(--font-badge)',
                          fontWeight: 600,
                        }}
                      >
                        معتمد ومرحل
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
