import { formatCurrency } from '@/lib/format';
import {
  LayersIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ScaleIcon,
} from '@/shared/components/icons/AppIcons';

interface CashDrawerStatsGridProps {
  totalItems: number;
  openShiftCount: number;
  openShiftLabel?: string;
  pendingReviewCount?: number;
  totalVariance: number;
  canViewSensitiveTotals?: boolean;
}

export function CashDrawerStatsGrid(props: CashDrawerStatsGridProps) {
  const canViewSensitiveTotals = props.canViewSensitiveTotals !== false;
  const isVarianceNegative = props.totalVariance < -0.009;

  return (
    <div className="cash-drawer-stats-grid">
      {/* Card 1: Total Shifts */}
      <div className="cash-drawer-stat-card">
        <div className="stat-info">
          <span className="stat-title">إجمالي الورديات</span>
          <div className="stat-value">
            {props.totalItems}
          </div>
          <span className="stat-sub">
            سجل الورديات الكامل
          </span>
        </div>
        <div className="stat-icon-wrap">
          <LayersIcon size={18} />
        </div>
      </div>

      {/* Card 2: Open / Active Shift */}
      <div className="cash-drawer-stat-card">
        <div className="stat-info">
          <span className="stat-title">الورديات المفتوحة</span>
          <div className="stat-value">
            {props.openShiftCount}
          </div>
          <span className="stat-sub">
            {props.openShiftLabel ? `كاشير: ${props.openShiftLabel}` : 'لا توجد ورديات نشطة'}
          </span>
        </div>
        <div className="stat-icon-wrap">
          <CheckCircleIcon size={18} />
        </div>
      </div>

      {/* Card 3: Pending Manager Review */}
      <div className="cash-drawer-stat-card">
        <div className="stat-info">
          <span className="stat-title">في انتظار المراجعة</span>
          <div className="stat-value">
            {props.pendingReviewCount ?? 0}
          </div>
          <span className="stat-sub">
            {(props.pendingReviewCount ?? 0) > 0 ? 'تتطلب اعتماد الإغلاق' : 'جميع الإغلاقات معتمدة'}
          </span>
        </div>
        <div className="stat-icon-wrap">
          <AlertTriangleIcon size={18} />
        </div>
      </div>

      {/* Card 4: Total Variance */}
      <div className="cash-drawer-stat-card">
        <div className="stat-info">
          <span className="stat-title">إجمالي الفروقات</span>
          <div className={`stat-value ${isVarianceNegative ? 'is-negative' : ''}`}>
            {canViewSensitiveTotals ? formatCurrency(props.totalVariance) : '—'}
          </div>
          <span className="stat-sub">
            {isVarianceNegative ? 'عجز إجمالي مسجل' : props.totalVariance > 0.009 ? 'زيادة إجمالية مسجلة' : 'الورديات متطابقة'}
          </span>
        </div>
        <div className="stat-icon-wrap">
          <ScaleIcon size={18} />
        </div>
      </div>
    </div>
  );
}
