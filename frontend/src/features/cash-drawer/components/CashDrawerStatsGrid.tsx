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
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '12px',
      marginBottom: '12px',
    }}>
      {/* Card 1: Total Shifts */}
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>إجمالي الورديات</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', lineHeight: 1.2 }}>
            {props.totalItems}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
            سجل الورديات الكامل
          </span>
        </div>
        <div style={{
          background: '#f8fafc',
          color: '#64748b',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <LayersIcon size={20} />
        </div>
      </div>

      {/* Card 2: Open / Active Shift */}
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>الورديات المفتوحة</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', lineHeight: 1.2 }}>
            {props.openShiftCount}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
            {props.openShiftLabel ? `كاشير: ${props.openShiftLabel}` : 'لا توجد ورديات نشطة'}
          </span>
        </div>
        <div style={{
          background: '#f8fafc',
          color: '#64748b',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <CheckCircleIcon size={20} />
        </div>
      </div>

      {/* Card 3: Pending Manager Review */}
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>في انتظار المراجعة</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', lineHeight: 1.2 }}>
            {props.pendingReviewCount ?? 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
            {(props.pendingReviewCount ?? 0) > 0 ? 'تتطلب اعتماد الإغلاق' : 'جميع الإغلاقات معتمدة'}
          </span>
        </div>
        <div style={{
          background: '#f8fafc',
          color: '#64748b',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertTriangleIcon size={20} />
        </div>
      </div>

      {/* Card 4: Total Variance */}
      <div style={{
        background: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>إجمالي الفروقات</span>
          <div style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: isVarianceNegative ? '#dc2626' : '#0f172a',
            marginTop: '2px',
            lineHeight: 1.2
          }}>
            {canViewSensitiveTotals ? formatCurrency(props.totalVariance) : '—'}
          </div>
          <span style={{
            fontSize: '0.72rem',
            color: '#94a3b8',
            marginTop: '2px',
            display: 'block'
          }}>
            {isVarianceNegative ? 'عجز إجمالي مسجل' : props.totalVariance > 0.009 ? 'زيادة إجمالية مسجلة' : 'الورديات متطابقة'}
          </span>
        </div>
        <div style={{
          background: '#f8fafc',
          color: '#64748b',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ScaleIcon size={20} />
        </div>
      </div>
    </div>
  );
}
