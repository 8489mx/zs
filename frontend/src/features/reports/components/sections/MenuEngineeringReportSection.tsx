import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, type MenuEngineeringItem } from '@/features/reports/api/reports.api';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/shared/ui/button';
import { FilterIcon } from '@/shared/components/icons/AppIcons';

interface MenuEngineeringReportSectionProps {
  from?: string;
  to?: string;
}

export function MenuEngineeringReportSection({ from, to }: MenuEngineeringReportSectionProps) {
  const { t } = useTranslation();
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', 'menu-engineering', from, to],
    queryFn: () => reportsApi.menuEngineering({ from, to }),
    staleTime: 60_000,
  });

  const summary = data?.summary;
  const items = data?.items || [];

  const filteredItems = useMemo(() => {
    return items.filter((item: MenuEngineeringItem) => {
      if (selectedQuadrant === 'all') return true;
      return item.quadrant === selectedQuadrant;
    });
  }, [items, selectedQuadrant]);

  const getQuadrantBadge = (quadrant: MenuEngineeringItem['quadrant']) => {
    switch (quadrant) {
      case 'star':
        return {
          bg: '#eef2ff',
          color: '#1e1b4b',
          border: '1px solid #c7d2fe',
          label: 'نجم (Star)',
        };
      case 'plowhorse':
        return {
          bg: '#f1f5f9',
          color: '#334155',
          border: '1px solid #cbd5e1',
          label: 'حصان جر (Plowhorse)',
        };
      case 'puzzle':
        return {
          bg: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fde68a',
          label: 'لغز (Puzzle)',
        };
      case 'dog':
        return {
          bg: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca',
          label: 'صنف خاسر (Dog)',
        };
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
        {t('reports.sections.menu_engineering_report_section.s0', "جاري تحليل مصفوفة ربحية وشعبية أصناف المنيو...")}
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: '#dc2626' }}>
        <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600 }}>{t('reports.sections.menu_engineering_report_section.s1', "تعذر تحميل تقرير هندسة المنيو.")}</p>
        <Button variant="secondary" onClick={() => void refetch()}>
          {t('reports.sections.menu_engineering_report_section.s2', "إعادة المحاولة")}
        </Button>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* KPI Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>{t('reports.sections.menu_engineering_report_section.s3', "أصناف القائمة")}</div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{summary?.totalItems || 0}</div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{summary?.totalUnitsSold || 0} {t('reports.sections.menu_engineering_report_section.s4', "مباع")}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>{t('reports.sections.menu_engineering_report_section.s5', "نسبة تكلفة الطعام")}</div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: (summary?.overallFoodCostPercentage || 0) > 35 ? '#b91c1c' : '#16a34a' }}>
            {summary?.overallFoodCostPercentage || 0}%
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{t('reports.sections.menu_engineering_report_section.s6', "المعيار: 28% - 35%")}</div>
        </div>

        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', color: '#4338ca', fontWeight: 700, marginBottom: '2px' }}>{t('reports.sections.menu_engineering_report_section.s7', "النجوم (Stars)")}</div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#1e1b4b' }}>{summary?.starCount || 0}</div>
          <div style={{ fontSize: '10px', color: '#6366f1' }}>{t('reports.sections.menu_engineering_report_section.s8', "أعلى ربح + أعلى بيع")}</div>
        </div>

        <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', color: '#334155', fontWeight: 700, marginBottom: '2px' }}>{t('reports.sections.menu_engineering_report_section.s9', "أحصنة الجر (Plowhorses)")}</div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#334155' }}>{summary?.plowhorseCount || 0}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>{t('reports.sections.menu_engineering_report_section.s10', "أعلى بيع + ربح متواضع")}</div>
        </div>

        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 700, marginBottom: '2px' }}>{t('reports.sections.menu_engineering_report_section.s11', "الألغاز (Puzzles)")}</div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#92400e' }}>{summary?.puzzleCount || 0}</div>
          <div style={{ fontSize: '10px', color: '#d97706' }}>{t('reports.sections.menu_engineering_report_section.s12', "أعلى ربح + بيع قليل")}</div>
        </div>

        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 700, marginBottom: '2px' }}>{t('reports.sections.menu_engineering_report_section.s13', "الخاسرة (Dogs)")}</div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#991b1b' }}>{summary?.dogCount || 0}</div>
          <div style={{ fontSize: '10px', color: '#ef4444' }}>{t('reports.sections.menu_engineering_report_section.s14', "مرشحة للإلغاء")}</div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', color: '#0f172a', fontWeight: 700, marginBottom: '2px' }}>{t('reports.sections.menu_engineering_report_section.s15', "العائد المحتمل")}</div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#16a34a' }}>
            {formatCurrency(summary?.potentialProfitUplift || 0)}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>{t('reports.sections.menu_engineering_report_section.s16', "عند تحسين التسعير")}</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <FilterIcon size={14} /> {t('reports.sections.menu_engineering_report_section.s17', "تصفية:")}
        </span>
        <button
          type="button"
          onClick={() => setSelectedQuadrant('all')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: `1px solid ${selectedQuadrant === 'all' ? '#170e5e' : '#cbd5e1'}`,
            background: selectedQuadrant === 'all' ? '#170e5e' : '#ffffff',
            color: selectedQuadrant === 'all' ? '#ffffff' : '#334155',
          }}
        >
          {t('reports.sections.menu_engineering_report_section.s18', "الكل (")}{items.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedQuadrant('star')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: `1px solid ${selectedQuadrant === 'star' ? '#170e5e' : '#cbd5e1'}`,
            background: selectedQuadrant === 'star' ? '#170e5e' : '#ffffff',
            color: selectedQuadrant === 'star' ? '#ffffff' : '#334155',
          }}
        >
          {t('reports.sections.menu_engineering_report_section.s19', "النجوم (")}{summary?.starCount || 0})
        </button>
        <button
          type="button"
          onClick={() => setSelectedQuadrant('puzzle')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: `1px solid ${selectedQuadrant === 'puzzle' ? '#170e5e' : '#cbd5e1'}`,
            background: selectedQuadrant === 'puzzle' ? '#170e5e' : '#ffffff',
            color: selectedQuadrant === 'puzzle' ? '#ffffff' : '#334155',
          }}
        >
          {t('reports.sections.menu_engineering_report_section.s20', "الألغاز (")}{summary?.puzzleCount || 0})
        </button>
        <button
          type="button"
          onClick={() => setSelectedQuadrant('plowhorse')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: `1px solid ${selectedQuadrant === 'plowhorse' ? '#170e5e' : '#cbd5e1'}`,
            background: selectedQuadrant === 'plowhorse' ? '#170e5e' : '#ffffff',
            color: selectedQuadrant === 'plowhorse' ? '#ffffff' : '#334155',
          }}
        >
          {t('reports.sections.menu_engineering_report_section.s21', "أحصنة الجر (")}{summary?.plowhorseCount || 0})
        </button>
        <button
          type="button"
          onClick={() => setSelectedQuadrant('dog')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            border: `1px solid ${selectedQuadrant === 'dog' ? '#170e5e' : '#cbd5e1'}`,
            background: selectedQuadrant === 'dog' ? '#170e5e' : '#ffffff',
            color: selectedQuadrant === 'dog' ? '#ffffff' : '#334155',
          }}
        >
          {t('reports.sections.menu_engineering_report_section.s22', "الخاسرة (")}{summary?.dogCount || 0})
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11.5px', fontWeight: 700 }}>
                <th style={{ padding: '9px 12px' }}>{t('reports.sections.menu_engineering_report_section.s23', "الصنف")}</th>
                <th style={{ padding: '9px 12px' }}>{t('reports.sections.menu_engineering_report_section.s24', "التصنيف")}</th>
                <th style={{ padding: '9px 12px' }}>{t('reports.sections.menu_engineering_report_section.s25', "المربع")}</th>
                <th style={{ padding: '9px 12px' }}>{t('reports.sections.menu_engineering_report_section.s26', "الكمية")}</th>
                <th style={{ padding: '9px 12px' }}>{t('reports.sections.menu_engineering_report_section.s27', "سعر البيع")}</th>
                <th style={{ padding: '9px 12px' }}>{t('reports.sections.menu_engineering_report_section.s28', "التكلفة")}</th>
                <th style={{ padding: '9px 12px' }}>{t('reports.sections.menu_engineering_report_section.s29', "هامش الوحدة")}</th>
                <th style={{ padding: '9px 12px' }}>{t('reports.sections.menu_engineering_report_section.s30', "إجمالي الربح")}</th>
                <th style={{ padding: '9px 12px' }}>{t('reports.sections.menu_engineering_report_section.s31', "تكلفة الطعام %")}</th>
                <th style={{ padding: '9px 12px' }}>{t('reports.sections.menu_engineering_report_section.s32', "التوجيه الاستراتيجي")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    {t('reports.sections.menu_engineering_report_section.s33', "لا توجد أصناف مسجلة في هذا المربع")}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const badge = getQuadrantBadge(item.quadrant);
                  return (
                    <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{item.productName}</td>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{item.categoryName}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          border: badge.border,
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{item.qtySold}</td>
                      <td style={{ padding: '9px 12px' }}>{formatCurrency(item.unitPrice)}</td>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{formatCurrency(item.unitCost)}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: item.unitMargin > 0 ? '#16a34a' : '#dc2626' }}>
                        {formatCurrency(item.unitMargin)}
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(item.totalMargin)}
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: item.foodCostPercentage > 35 ? '#b91c1c' : '#16a34a' }}>
                        {item.foodCostPercentage}%
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: '11px', color: '#334155', maxWidth: '280px' }}>
                        {item.recommendation}
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
