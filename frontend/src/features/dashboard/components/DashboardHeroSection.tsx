import { NavLink } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { AnimatedValue } from '@/shared/components/animated-value';
import { DashboardMetricCard } from '@/features/dashboard/components/DashboardMetricCard';
import { dashboardQuickLinks, formatInteger } from '@/features/dashboard/lib/dashboard-page.utils';

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
    <section className="dashboard-hero-grid">
      <Card className="dashboard-hero-card">
        <div className="dashboard-hero-copy">
          <div>
            <span className="dashboard-hero-kicker">صورة اليوم</span>
            <h2>البيع والخزينة والمخزون أمامك مباشرة</h2>
            <p className="section-description">كل الأرقام الأساسية في الشاشة نفسها حتى يقدر صاحب المحل أو الكاشير يأخذ قرارًا سريعًا.</p>
          </div>
          <div className="dashboard-hero-chips">
            <div className="dashboard-hero-chip">
              <span>فواتير البيع اليوم</span>
              <strong><AnimatedValue value={todaySalesCount} formatter={formatInteger} /></strong>
            </div>
            <div className="dashboard-hero-chip">
              <span>فواتير الشراء اليوم</span>
              <strong><AnimatedValue value={todayPurchasesCount} formatter={formatInteger} /></strong>
            </div>
            <div className="dashboard-hero-chip">
              <span>العروض النشطة</span>
              <strong><AnimatedValue value={activeOffers} formatter={formatInteger} /></strong>
            </div>
          </div>
        </div>
        <div className="dashboard-hero-spotlight">
          <DashboardMetricCard label="مبيعات اليوم" value={todaySalesAmount} helper="إجمالي البيع المسجل اليوم" tone="primary" />
          <DashboardMetricCard label="رصيد الخزينة" value={treasuryNet} helper="النقد المتاح حاليًا" tone={treasuryNet >= 0 ? 'success' : 'danger'} />
          <DashboardMetricCard label="الربح التشغيلي" value={netOperatingProfit} helper="بعد المصروفات الحالية" tone={netOperatingProfit >= 0 ? 'success' : 'warning'} />
        </div>
      </Card>

      <Card title="اختصارات سريعة" className="dashboard-premium-card dashboard-side-card">
        <div className="dashboard-actions-grid dashboard-actions-grid-premium">
          {dashboardQuickLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className="dashboard-action-link">
              <strong>{link.label}</strong>
              <div className="muted small">{link.hint}</div>
            </NavLink>
          ))}
        </div>
      </Card>
    </section>
  );
}
