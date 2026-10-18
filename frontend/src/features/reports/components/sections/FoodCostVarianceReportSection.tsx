import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, type FoodCostVarianceItem } from '@/features/reports/api/reports.api';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/shared/ui/button';

interface FoodCostVarianceReportSectionProps {
  from?: string;
  to?: string;
}

export function FoodCostVarianceReportSection({ from, to }: FoodCostVarianceReportSectionProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', 'food-cost-variance', from, to],
    queryFn: () => reportsApi.foodCostVariance({ from, to }),
    staleTime: 60_000,
  });

  const items = data?.items || [];
  const summary = data?.summary || {
    totalTheoreticalCost: 0,
    totalActualCost: 0,
    totalWasteCost: 0,
    totalVarianceCost: 0,
    overallVariancePct: 0,
  };

  const filteredItems = useMemo(() => {
    return items.filter((item: FoodCostVarianceItem) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          item.productName.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, filter, search]);

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
        {t('reports.sections.food_cost_variance_report_section.s0', "جاري تحليل الاستهلاك النظري والفعلي للمكونات والهدر...")}
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: '#dc2626' }}>
        <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600 }}>{t('reports.sections.food_cost_variance_report_section.s1', "تعذر تحميل تقرير انحراف استهلاك الأغذية للمطاعم.")}</p>
        <Button variant="secondary" onClick={() => void refetch()}>
          {t('reports.sections.food_cost_variance_report_section.s2', "إعادة المحاولة")}
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* 1. KPI Cards Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
        }}
      >
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
            {t('reports.sections.food_cost_variance_report_section.s3', "الاستهلاك النظري (المفترض من المبيعات)")}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
            {formatCurrency(summary.totalTheoreticalCost)}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {t('reports.sections.food_cost_variance_report_section.s4', "بناءً على مقادير الوجبات والإضافات المباعة")}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
            {t('reports.sections.food_cost_variance_report_section.s5', "الاستهلاك الفعلي المنصرف")}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#170e5e' }}>
            {formatCurrency(summary.totalActualCost)}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {t('reports.sections.food_cost_variance_report_section.s6', "المسحوب فعلياً من المخزن والمستودع")}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
            {t('reports.sections.food_cost_variance_report_section.s7', "الهدر المسجل (تالف وتحضير)")}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#d97706' }}>
            {formatCurrency(summary.totalWasteCost)}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {t('reports.sections.food_cost_variance_report_section.s8', "الموثق رسمياً عبر شاشة هدر المطعم")}
          </div>
        </div>

        <div
          style={{
            background: summary.totalVarianceCost > 0 ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${summary.totalVarianceCost > 0 ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: '10px',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: '12px', color: summary.totalVarianceCost > 0 ? '#991b1b' : '#166534', fontWeight: 700, marginBottom: '6px' }}>
            {t('reports.sections.food_cost_variance_report_section.s9', "الفارق غير المبرر (عجز / انحراف)")}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: summary.totalVarianceCost > 0 ? '#b91c1c' : '#15803d' }}>
            {formatCurrency(summary.totalVarianceCost)}
          </div>
          <div style={{ fontSize: '11px', color: summary.totalVarianceCost > 0 ? '#dc2626' : '#16a34a', marginTop: '4px', fontWeight: 600 }}>
            {t('reports.sections.food_cost_variance_report_section.s10', "نسبة الانحراف:")} {summary.overallVariancePct}%
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder={t('reports.sections.food_cost_variance_report_section.s11', "بحث باسم المادة الخام أو الكود...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              width: '240px',
            }}
          />

          <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '3px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            {[
              { key: 'all', label: t('reports.sections.food_cost_variance_report_section.s12', "الكل") },
              { key: 'critical', label: t('reports.sections.food_cost_variance_report_section.s13', "عجز حرج (> 5%)") },
              { key: 'warning', label: t('reports.sections.food_cost_variance_report_section.s14', "تحذير (2% - 5%)") },
              { key: 'normal', label: t('reports.sections.food_cost_variance_report_section.s15', "مطابق (≤ 2%)") },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: filter === tab.key ? '#170e5e' : 'transparent',
                  color: filter === tab.key ? '#ffffff' : '#64748b',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
          {t('reports.sections.food_cost_variance_report_section.s16', "عرض")} {filteredItems.length} {t('reports.sections.food_cost_variance_report_section.s17', "مادة خام من أصل")} {items.length}
        </div>
      </div>

      {/* 3. Detailed Variance Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('reports.sections.food_cost_variance_report_section.s18', "المادة الخام / المكون")}</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('reports.sections.food_cost_variance_report_section.s19', "سعر التكلفة")}</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('reports.sections.food_cost_variance_report_section.s20', "الاستهلاك النظري")}</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('reports.sections.food_cost_variance_report_section.s21', "تكلفة النظري")}</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('reports.sections.food_cost_variance_report_section.s22', "الهدر المسجل")}</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('reports.sections.food_cost_variance_report_section.s23', "الاستهلاك الفعلي")}</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('reports.sections.food_cost_variance_report_section.s24', "كمية الفارق")}</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('reports.sections.food_cost_variance_report_section.s25', "تكلفة الفارق")}</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('reports.sections.food_cost_variance_report_section.s26', "نسبة الانحراف")}</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>{t('reports.sections.food_cost_variance_report_section.s27', "الحالة الرقابية")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    {t('reports.sections.food_cost_variance_report_section.s28', "لا توجد مواد خام مسجلة تطابق محددات البحث الحالية.")}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isCritical = item.status === 'critical';
                  const isWarning = item.status === 'warning';
                  return (
                    <tr
                      key={item.productId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isCritical ? '#fffbfa' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.productName}</div>
                        {item.sku && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{t('reports.sections.food_cost_variance_report_section.s29', "كود:")} {item.sku}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        {formatCurrency(item.costPrice)} / {item.unitName}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {item.theoreticalQty} {item.unitName}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        {formatCurrency(item.theoreticalCost)}
                      </td>
                      <td style={{ padding: '10px 14px', color: item.wasteQty > 0 ? '#d97706' : '#94a3b8', fontWeight: item.wasteQty > 0 ? 600 : 400 }}>
                        {item.wasteQty > 0 ? `${item.wasteQty} ${item.unitName}` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#170e5e' }}>
                        {item.actualQty} {item.unitName}
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          fontWeight: 700,
                          color: item.varianceQty > 0 ? '#dc2626' : item.varianceQty < 0 ? '#2563eb' : '#16a34a',
                        }}
                      >
                        {item.varianceQty > 0 ? `+${item.varianceQty}` : item.varianceQty} {item.unitName}
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          fontWeight: 800,
                          color: item.varianceCost > 0 ? '#dc2626' : item.varianceCost < 0 ? '#2563eb' : '#16a34a',
                        }}
                      >
                        {item.varianceCost > 0 ? `+${formatCurrency(item.varianceCost)}` : formatCurrency(item.varianceCost)}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                        {item.variancePct > 0 ? `+${item.variancePct}%` : `${item.variancePct}%`}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: isCritical ? '#fee2e2' : isWarning ? '#fef3c7' : '#dcfce7',
                            color: isCritical ? '#991b1b' : isWarning ? '#92400e' : '#166534',
                          }}
                        >
                          {isCritical ? t('reports.sections.food_cost_variance_report_section.s30', "عجز غير مبرر") : isWarning ? t('reports.sections.food_cost_variance_report_section.s31', "انحراف طفيف") : t('reports.sections.food_cost_variance_report_section.s32', "مطابق للوصفة")}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
