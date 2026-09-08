import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { usePricingCenterPageController } from '@/features/pricing-center/hooks/usePricingCenterPageController';
import { PricingScopeFormulaSection } from '../components/PricingScopeFormulaSection';
import { PricingSimulationSection } from '../components/PricingSimulationSection';
import { PricingRunsHistorySection } from '../components/PricingRunsHistorySection';

export function PricingCenterPage() {
  const {
    applyMutation,
    applyPricingWave,
    canManagePricingCenter,
    categories,
    payload,
    preview,
    previewMutation,
    resetPricingCenter,
    runPreview,
    runs,
    setPayload,
    stats,
    statusMessage,
    suppliers,
    undoMutation,
    undoPricingRun,
  } = usePricingCenterPageController();

  const previewRows = preview?.rows || [];
  const summary = preview?.summary;

  const invBefore = Number(summary?.inventoryValueBefore || 0);
  const invAfter = Number(summary?.inventoryValueAfter || 0);
  const invDiff = invAfter - invBefore;

  const marginBefore = Number(summary?.stockMarginBefore || 0);
  const marginAfter = Number(summary?.stockMarginAfter || 0);
  const marginDiff = marginAfter - marginBefore;

  const matchedTotal = summary?.matchedCount || 0;
  const affectedTotal = summary?.affectedCount || 0;
  const skippedTotal = (summary?.skippedOfferCount || 0) + (summary?.skippedCustomerPriceCount || 0) + (summary?.skippedManualExceptionCount || 0);

  return (
    <div className="page-stack page-shell pricing-center-page" dir="rtl">
      <main className="document-prototype-column" style={{ maxWidth: '1280px', paddingBottom: '60px' }}>
        <PageHeader
          title="مركز التسعير الجماعي"
          badge={<span className="nav-pill">تعديل الأسعار</span>}
          actions={(
            <div className="actions compact-actions pricing-center-header-actions">
              <Button variant="secondary" onClick={resetPricingCenter}>إعادة الضبط</Button>
              <Button onClick={runPreview} disabled={previewMutation.isPending}>
                {previewMutation.isPending ? 'جاري المعاينة...' : 'معاينة الأثر'}
              </Button>
              <Button variant="primary" onClick={applyPricingWave} disabled={!canManagePricingCenter || applyMutation.isPending || !summary?.affectedCount}>
                {applyMutation.isPending ? 'جاري الاعتماد...' : 'اعتماد الموجة'}
              </Button>
            </div>
          )}
        />

        {/* Top 4 Clean KPI Metric Bar */}
        <div className="pricing-center-stats-grid">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="pricing-center-stat-card"
            >
              <span className="pricing-center-stat-label">{stat.label}</span>
              <strong className="pricing-center-stat-val">{stat.value}</strong>
            </div>
          ))}
        </div>

        {statusMessage ? (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            {statusMessage}
          </div>
        ) : null}

        {/* Setup Section */}
        <div className="pricing-center-top-grid">
          <PricingScopeFormulaSection
            payload={payload}
            setPayload={setPayload}
            suppliers={suppliers}
            categories={categories}
          />
        </div>

        {/* Simulation Section */}
        <PricingSimulationSection
          summary={summary}
          previewRows={previewRows}
          previewLoading={previewMutation.isPending}
          matchedTotal={matchedTotal}
          affectedTotal={affectedTotal}
          skippedTotal={skippedTotal}
          invBefore={invBefore}
          invAfter={invAfter}
          invDiff={invDiff}
          marginBefore={marginBefore}
          marginAfter={marginAfter}
          marginDiff={marginDiff}
        />

        {/* History Section */}
        <PricingRunsHistorySection
          runs={runs}
          canManage={canManagePricingCenter}
          onUndo={undoPricingRun}
          undoPending={undoMutation.isPending}
        />
      </main>
    </div>
  );
}

export default PricingCenterPage;
