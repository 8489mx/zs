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
        actions={(
          <div className="actions compact-actions page-header-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/inventory/tree')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 7l8 4 8-4-8-4z"/><path d="M4 11l8 4 8-4"/><path d="M4 15l8 4 8-4"/></svg>
              الإدارة من خلال شجرة المخازن المجمعة
            </button>
            <button className="btn" onClick={() => navigate('/inventory/warehouses-management')}>إدارة إعدادات المخازن</button>
          </div>
        )}
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
                  gap: '16px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: 'var(--surface-color)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => navigate(`/inventory/warehouses/${loc.id}`)}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.borderColor = 'var(--primary-color)'; 
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.borderColor = 'var(--border-color)'; 
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                }}
              >
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--blue-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--blue-600)' }}>
                    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                    <path d="M2 7h20"/>
                    <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{loc.name}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }}></span>
                    مخزن نشط
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </FormSection>
    </main>
  );
}
