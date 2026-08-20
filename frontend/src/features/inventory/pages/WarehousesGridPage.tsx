import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Button } from '@/shared/ui/button';
import { useInventoryActionCatalog } from '@/features/inventory/hooks/useInventoryActionCatalog';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { formatCurrency } from '@/lib/format';

function formatLocationType(type?: string) {
  if (!type) return 'مخزن نشط';
  const map: Record<string, string> = {
    internal_warehouse: 'مخزن داخلي',
    store: 'محل / نقطة بيع',
    main: 'مخزن رئيسي',
    warehouse: 'مخزن',
    transit: 'مخزن ترانزيت',
    damaged: 'مخزن تالف',
  };
  return map[type] || type;
}

export function WarehousesGridPage() {
  const navigate = useNavigate();
  const { locationsQuery } = useInventoryActionCatalog();
  const locations = locationsQuery.data || [];

  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['inventory', 'advanced-overview'],
    queryFn: inventoryApi.advancedOverview,
  });

  const totalValue = overviewData?.totalGlobalValue || 0;
  const avgLocationValue = locations.length > 0 ? totalValue / locations.length : 0;
  const uniqueBranches = new Set(locations.map((loc) => loc.branchName || loc.branchId).filter(Boolean)).size;

  const stats = [
    { key: 'total_value', label: 'إجمالي قيمة المخزون (Landed Cost)', value: formatCurrency(totalValue) },
    { key: 'total_locations', label: 'إجمالي أماكن المخزون', value: locations.length },
    { key: 'unique_branches', label: 'الفروع التابعة', value: uniqueBranches || 1 },
    { key: 'avg_value', label: 'متوسط قيمة المخزن', value: formatCurrency(avgLocationValue) },
  ] as const;

  return (
    <main className="document-prototype-column" dir="rtl" style={{ paddingBottom: '32px' }}>
      <PageHeader 
        title="أماكن المخزون" 
        description="استعراض وتقسيم أماكن المخزون وعرض أرصدة الأصناف وقيمتها المالية" 
        actions={(
          <div className="actions compact-actions page-header-actions">
            <Button 
              variant="primary"
              onClick={() => navigate('/inventory/tree')}
            >
              🌳 شجرة أماكن المخزون المجمعة
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/inventory/warehouses-management')}
            >
              ⚙️ إدارة إعدادات المخازن
            </Button>
          </div>
        )}
      />

      <StatsGrid items={stats} className="stats-grid compact-grid grid-cols-4" />

      <FormSection title="قائمة أماكن المخزون">
        {locationsQuery.isLoading || isOverviewLoading ? (
          <div className="muted small" style={{ padding: 32, textAlign: 'center' }}>جاري تحميل المخازن...</div>
        ) : locations.length === 0 ? (
          <div className="muted small" style={{ padding: 32, textAlign: 'center' }}>لا توجد مخازن مسجلة حاليًا</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px', marginTop: '14px' }}>
            {locations.map((loc) => {
              const locInfo = overviewData?.locations?.find((l: any) => String(l.id) === String(loc.id));
              const locValue = locInfo?.totalValue || 0;
              const productCount = locInfo?.categories?.reduce((sum: number, c: any) => sum + (c.productCount || 0), 0) || 0;

              return (
                <div 
                  key={loc.id} 
                  className="surface-card hoverable-card"
                  style={{ 
                    padding: '20px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px',
                    border: '1px solid var(--border, #e2e8f0)',
                    borderRadius: '14px',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                    transition: 'all 0.2s ease-in-out',
                  }}
                  onClick={() => navigate(`/inventory/warehouses/${loc.id}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary, #170c5c)',
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                        <path d="M2 7h20"/>
                        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                      </svg>
                    </div>
                    <span style={{ 
                      fontSize: '11.5px', 
                      fontWeight: 700, 
                      padding: '4px 10px', 
                      borderRadius: '9999px', 
                      backgroundColor: '#ecfdf5', 
                      color: '#047857',
                      border: '1px solid #a7f3d0'
                    }}>
                      {formatLocationType(loc.locationType)}
                    </span>
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {loc.name}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {loc.branchName ? `الفرع: ${loc.branchName}` : loc.code ? `كود المخزن: ${loc.code}` : 'موقع تخزين رئيسي'}
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: 'auto', 
                    paddingTop: '14px', 
                    borderTop: '1px solid #f1f5f9', 
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    justifyContent: 'space-between' 
                  }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <span>📦 {productCount} {productCount === 1 ? 'صنف' : 'أصناف'}</span>
                      </span>
                      <strong style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary, #170c5c)' }}>
                        {formatCurrency(locValue)}
                      </strong>
                    </div>
                    <span style={{ fontSize: '12.5px', color: 'var(--primary, #170c5c)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      عرض الأصناف <span>←</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>
    </main>
  );
}
