import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { RepTargetMetrics } from '../api/van-sales.api';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckShieldIcon,
} from '@/shared/components/icons/AppIcons';

export interface VanLiveTargetBoosterWidgetProps {
  metrics?: RepTargetMetrics;
  compact?: boolean;
}

export const VanLiveTargetBoosterWidget: React.FC<VanLiveTargetBoosterWidgetProps> = ({
  metrics,
  compact = false,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(!compact);

  if (!metrics || !metrics.targetAmount || metrics.targetAmount <= 0) {
    return null;
  }

  const rate = Math.min(100, Math.max(0, Number(metrics.achievementRate || 0)));
  const isAchieved = Boolean(metrics.isTargetAchieved || rate >= 100);
  const earnedCommission = Number(metrics.totalCommissionEarned || 0);

  return (
    <div
      dir="rtl"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        marginBottom: '10px',
      }}
    >
      {/* Header Row */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              backgroundColor: '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckShieldIcon size={15} color="#170e5e" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                {t('delivery_reps.van_live_target_booster_widget.s0', "عداد التارجت والعمولة الحية")}
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '1px 6px',
                  borderRadius: '4px',
                }}
              >
                {metrics.periodMonth}
              </span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#64748b' }}>
              {t('delivery_reps.van_live_target_booster_widget.s1', "مبيعات الشهر:")} {metrics.actualSalesMTD.toLocaleString('ar-EG')} {t('delivery_reps.van_live_target_booster_widget.s2', "ج.م من أصل")} {metrics.targetAmount.toLocaleString('ar-EG')} {t('delivery_reps.van_live_target_booster_widget.s3', "ج.م")}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: isAchieved ? '#dcfce7' : '#e0e7ff',
              color: isAchieved ? '#15803d' : '#3730a3',
            }}
          >
            {rate.toFixed(1)}% {isAchieved ? t('delivery_reps.van_live_target_booster_widget.s4', "تم الإنجاز!") : ''}
          </div>

          <button
            type="button"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#64748b' }}
          >
            {isExpanded ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginTop: '8px', marginBottom: '4px' }}>
        <div
          style={{
            width: '100%',
            height: '7px',
            backgroundColor: '#e2e8f0',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${rate}%`,
              height: '100%',
              backgroundColor: isAchieved ? '#10b981' : '#170e5e',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              textAlign: 'center',
            }}
          >
            {/* Box 1: Remaining */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px 4px',
              }}
            >
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>{t('delivery_reps.van_live_target_booster_widget.s5', "المتبقي للهدف")}</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: isAchieved ? '#15803d' : '#0f172a',
                }}
              >
                {isAchieved ? t('delivery_reps.van_live_target_booster_widget.s6', "محقق بالكامل") : `${metrics.remainingTarget.toLocaleString('ar-EG')} ج.م`}
              </span>
            </div>

            {/* Box 2: Required Daily */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '6px 4px',
              }}
            >
              <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                {t('delivery_reps.van_live_target_booster_widget.s7', "المطلوب يومياً (")}{metrics.remainingWorkingDays} {t('delivery_reps.van_live_target_booster_widget.s8', "يوم عمل)")}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e' }}>
                {metrics.remainingWorkingDays > 0 ? `${metrics.requiredDailyTarget.toLocaleString('ar-EG')} ج.م` : t('delivery_reps.van_live_target_booster_widget.s9', "0 ج.م")}
              </span>
            </div>

            {/* Box 3: Live Commission Earned */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '6px 4px',
              }}
            >
              <span style={{ fontSize: '10px', color: '#166534', display: 'block' }}>{t('delivery_reps.van_live_target_booster_widget.s10', "العمولة المستحقة الحية")}</span>
              <span style={{ fontSize: '12.5px', fontWeight: 900, color: '#15803d' }}>
                {earnedCommission > 0 ? `${earnedCommission.toLocaleString('ar-EG')} ج.م` : '—'}
              </span>
            </div>
          </div>

          {/* Today Strip */}
          {(Number(metrics.todaySales || 0) > 0 || Number(metrics.todayCollections || 0) > 0) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                padding: '4px 8px',
                marginTop: '6px',
                fontSize: '10.5px',
                color: '#475569',
              }}
            >
              <span>
                {t('delivery_reps.van_live_target_booster_widget.s11', "مبيعات رحلة اليوم:")} <strong>{Number(metrics.todaySales || 0).toLocaleString('ar-EG')} {t('delivery_reps.van_live_target_booster_widget.s12', "ج.م")}</strong>
              </span>
              <span>
                {t('delivery_reps.van_live_target_booster_widget.s13', "تحصيلات رحلة اليوم:")} <strong>{Number(metrics.todayCollections || 0).toLocaleString('ar-EG')} {t('delivery_reps.van_live_target_booster_widget.s14', "ج.م")}</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
