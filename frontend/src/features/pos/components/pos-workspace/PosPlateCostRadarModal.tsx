import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RestaurantOperationsDialog } from './RestaurantOperationsDialog';
import { RefreshCwIcon, AlertTriangleIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { restaurantAdvancedFnbApi } from '@/features/pos/api/restaurant-advanced-fnb.api';
import { formatCurrency } from '@/lib/format';

interface PosPlateCostRadarModalProps {
  open: boolean;
  onClose: () => void;
  currency?: string;
  onBack?: () => void;
}

export function PosPlateCostRadarModal({
  open,
  onClose,
  currency = 'ج.م',
  onBack,
}: PosPlateCostRadarModalProps) {
  const { t } = useTranslation();
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);

  const { data: radarItems = [], refetch } = useQuery({
    queryKey: ['restaurant-plate-cost-radar'],
    queryFn: () => restaurantAdvancedFnbApi.getPlateCostRadar(),
    enabled: open,
  });

  const displayedItems = filterAlertsOnly
    ? radarItems.filter((i) => i.isAlert)
    : radarItems;

  const alertCount = radarItems.filter((i) => i.isAlert).length;

  return (
    <RestaurantOperationsDialog
      open={open}
      onClose={onClose}
      onBack={onBack}
      backText={t('pos.pos_workspace.pos_plate_cost_radar_modal.s0', "الرجوع لعمليات المطعم")}
      title={t('pos.pos_workspace.pos_plate_cost_radar_modal.s1', "رادار تذبذب تكلفة الأطباق وهوامش الربح (Plate Cost & Inflation Radar)")}
      subtitle={t('pos.pos_workspace.pos_plate_cost_radar_modal.s2', "رصد لحظي لتأثير ارتفاع أسعار الخامات والمشتريات على هامش ربح الوجبات مع اقتراح أسعار البيع المثالية")}
      badge={
        alertCount > 0 ? (
          <span
            style={{
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 7px',
              borderRadius: '999px',
            }}
          >
            {alertCount} {t('pos.pos_workspace.pos_plate_cost_radar_modal.s3', "وجبات حرجة")}
          </span>
        ) : undefined
      }
      footerNote={t('pos.pos_workspace.pos_plate_cost_radar_modal.s4', "الرادار يقيس التكلفة الحية من واقع آخر فواتير استلام المخزون وعقود الموردين.")}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* KPI Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s5', "إجمالي الوجبات المرصودة بالوصفات")}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
              {radarItems.length} {t('pos.pos_workspace.pos_plate_cost_radar_modal.s6', "أطباق ووجبات")}
            </div>
          </div>

          <div style={{ background: alertCount > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${alertCount > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: alertCount > 0 ? '#991b1b' : '#166534', fontWeight: 700 }}>
              {t('pos.pos_workspace.pos_plate_cost_radar_modal.s7', "أطباق تحت خطر تآكل الهامش (Alerts)")}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: alertCount > 0 ? '#dc2626' : '#16a34a', marginTop: '4px' }}>
              {alertCount} {t('pos.pos_workspace.pos_plate_cost_radar_modal.s8', "وجبة متأثرة بارتفاع الخامات")}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
              <input
                type="checkbox"
                checked={filterAlertsOnly}
                onChange={(e) => setFilterAlertsOnly(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <span>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s9', "إظهار الوجبات الحرجة فقط")}</span>
            </label>
            <button
              type="button"
              onClick={() => refetch()}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: 700,
              }}
            >
              <RefreshCwIcon size={13} />
              <span>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s10', "تحديث الرادار")}</span>
            </button>
          </div>
        </div>

        {/* Radar Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '9px 12px' }}>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s11', "اسم الوجبة / الطبق")}</th>
                  <th style={{ padding: '9px 12px' }}>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s12', "سعر البيع الحالي")}</th>
                  <th style={{ padding: '9px 12px' }}>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s13', "التكلفة المعيارية")}</th>
                  <th style={{ padding: '9px 12px' }}>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s14', "التكلفة الحية (الخامات)")}</th>
                  <th style={{ padding: '9px 12px' }}>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s15', "تضخم التكلفة")}</th>
                  <th style={{ padding: '9px 12px' }}>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s16', "هامش الربح الحالي")}</th>
                  <th style={{ padding: '9px 12px' }}>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s17', "السعر المقترح (هامش 65%)")}</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s18', "الحالة")}</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item, idx) => {
                  const isEroded = item.isAlert;

                  return (
                    <tr
                      key={item.productId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isEroded ? '#fffbeb' : idx % 2 === 0 ? '#fff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '9px 12px', fontWeight: 800, color: '#0f172a' }}>{item.productName}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>
                        {formatCurrency(item.sellingPrice, currency)}
                      </td>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>
                        {formatCurrency(item.standardCost, currency)}
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: isEroded ? '#b91c1c' : '#0f172a' }}>
                        {formatCurrency(item.liveCost, currency)}
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 800, color: item.costInflationPct > 0 ? '#dc2626' : '#16a34a' }}>
                        {item.costInflationPct > 0 ? `+${item.costInflationPct}%` : `${item.costInflationPct}%`}
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 800, color: item.currentMarginPct < 50 ? '#dc2626' : '#16a34a' }}>
                        {item.currentMarginPct}%
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 800, color: '#170e5e' }}>
                        {formatCurrency(item.suggestedPrice, currency)}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        {isEroded ? (
                          <span
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <AlertTriangleIcon size={12} />
                            <span>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s19', "تآكل الهامش")}</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircleIcon size={12} />
                            <span>{t('pos.pos_workspace.pos_plate_cost_radar_modal.s20', "آمن ومربح")}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {displayedItems.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      {t('pos.pos_workspace.pos_plate_cost_radar_modal.s21', "لا توجد أطباق متأثرة أو بيانات متوفرة حالياً")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </RestaurantOperationsDialog>
  );
}
