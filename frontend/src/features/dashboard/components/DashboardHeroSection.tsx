import { FormSection } from '@/shared/components/form-section';
import { AnimatedValue } from '@/shared/components/animated-value';
import { DashboardMetricCard } from '@/features/dashboard/components/DashboardMetricCard';
import { formatInteger } from '@/features/dashboard/lib/dashboard-page.utils';

interface DashboardHeroSectionProps {
  todaySalesCount: number;
  todayPurchasesCount: number;
  activeOffers: number;
  todaySalesAmount: number;
  treasuryNet: number;
  netOperatingProfit: number;
}

export function DashboardHeroSection({
  todaySalesCount,
  todayPurchasesCount,
  activeOffers,
  todaySalesAmount,
  treasuryNet,
  netOperatingProfit,
}: DashboardHeroSectionProps) {
  return (
    <section className="dashboard-hero-grid dashboard-hero-grid-compact">
      <FormSection title="إحصائيات سريعة" className="dashboard-hero-card dashboard-hero-card-compact">
        <div className="dashboard-hero-copy dashboard-hero-copy-compact">
          <span className="dashboard-hero-kicker">أرقام اليوم</span>
          <h2>البيع والخزينة</h2>
          <p className="section-description">الأهم للمتابعة السريعة بدون اختصارات مكررة.</p>
        </div>

        <div className="dashboard-hero-chips dashboard-hero-chips-compact">
          <div className="dashboard-hero-chip">
            <span>فواتير البيع</span>
            <strong><AnimatedValue value={todaySalesCount} formatter={formatInteger} /></strong>
          </div>
          <div className="dashboard-hero-chip">
            <span>فواتير الشراء</span>
            <strong><AnimatedValue value={todayPurchasesCount} formatter={formatInteger} /></strong>
          </div>
          <div className="dashboard-hero-chip">
            <span>العروض النشطة</span>
            <strong><AnimatedValue value={activeOffers} formatter={formatInteger} /></strong>
          </div>
        </div>

        <div className="dashboard-hero-spotlight dashboard-hero-spotlight-compact">
          <DashboardMetricCard label="مبيعات اليوم" value={todaySalesAmount} helper="إجمالي البيع المسجل اليوم" tone="primary" />
          <DashboardMetricCard label="رصيد الخزينة" value={treasuryNet} helper="النقد المتاح حاليًا" tone={treasuryNet >= 0 ? 'success' : 'danger'} />
          <DashboardMetricCard label="الربح التشغيلي" value={netOperatingProfit} helper="بعد المصروفات الحالية" tone={netOperatingProfit >= 0 ? 'success' : 'warning'} />
        </div>
      </FormSection>
    </section>
  );
}
