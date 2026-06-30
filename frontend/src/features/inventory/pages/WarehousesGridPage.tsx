import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { useInventoryActionCatalog } from '@/features/inventory/hooks/useInventoryActionCatalog';

export function WarehousesGridPage() {
  const navigate = useNavigate();
  const { locationsQuery } = useInventoryActionCatalog();
  const locations = locationsQuery.data || [];

  return (
    <main className="document-prototype-column">
      <PageHeader 
        title="المخازن" 
        description="استعراض وتقسيم المخازن وعرض أرصدة الأصناف" 
      />

      <FormSection title="قائمة المخازن">
        {locationsQuery.isLoading ? (
          <div className="muted small" style={{ padding: 20, textAlign: 'center' }}>جاري التحميل...</div>
        ) : locations.length === 0 ? (
          <div className="muted small" style={{ padding: 20, textAlign: 'center' }}>لا توجد مخازن متاحة</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', padding: '16px' }}>
            {locations.map((loc) => (
              <div 
                key={loc.id} 
                className="surface-card hoverable-card"
                style={{ 
                  padding: '24px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  backgroundColor: 'var(--surface-color)'
                }}
                onClick={() => navigate(`/inventory/warehouses/${loc.id}`)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, color: 'var(--primary-color)' }}>
                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                  <path d="M2 7h20"/>
                  <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
                </svg>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{loc.name}</h3>
              </div>
            ))}
          </div>
        )}
      </FormSection>
    </main>
  );
}
