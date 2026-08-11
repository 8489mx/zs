import { useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { useShipmentsQuery, type Shipment } from './api/shipments.api';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import { NewShipmentDialog } from './NewShipmentDialog';

export default function ShipmentsManager() {
  const { data, isLoading } = useShipmentsQuery();
  const navigate = useNavigate();
  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState(false);

  const stats = [
    { key: 'sea', label: 'حاويات في البحر', value: data?.stats?.sea || 0 },
    { key: 'customs', label: 'حاويات في الجمارك', value: data?.stats?.customs || 0 },
    { key: 'arrived', label: 'تم حساب تكلفتها', value: data?.stats?.arrived || 0 },
  ] as const;

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader 
          title="إدارة الحاويات والشحنات" 
          description="متابعة حركة الحاويات من الصين حتى الوصول للمخازن وحساب التكلفة."
          actions={
            <div className="actions compact-actions">
              <Button variant="primary" onClick={() => setIsNewShipmentOpen(true)}>إضافة حاوية جديدة</Button>
            </div>
          } 
        />
        <StatsGrid items={stats} />

        <FormSection 
          title="الحاويات النشطة" 
          description="قائمة بجميع الحاويات المسجلة بالنظام."
          actions={<span className="nav-pill">{data?.rows?.length || 0} حاويات</span>}
        >
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
              جاري التحميل...
            </div>
          ) : (
            <DataTable<Shipment>
              rows={data?.rows || []}
              rowKey={(row) => row.id}
              onRowClick={(row) => navigate(`/import-sales/shipments/${row.id}`)}
              columns={[
                { key: 'container_number', header: 'رقم الحاوية', cell: (row) => <strong>{row.container_number}</strong> },
                { key: 'status', header: 'الحالة', cell: (row) => {
                  const colors: Record<string, string> = {
                    'Pending': 'orange',
                    'In Customs': 'blue',
                    'Arrived': 'green'
                  };
                  return <span style={{ color: colors[row.status] || 'black' }}>{row.status === 'Pending' ? 'في البحر' : row.status === 'In Customs' ? 'في الجمارك' : 'تم الوصول'}</span>
                }},
                { key: 'arrival_date', header: 'تاريخ الوصول', cell: (row) => row.arrival_date || '-' },
                { key: 'shipping_cost_usd', header: 'تكلفة الشحن', cell: (row) => `$${Number(row.shipping_cost_usd).toFixed(2)}` },
                { key: 'customs_cost_egp', header: 'جمارك', cell: (row) => formatCurrency(Number(row.customs_cost_egp)) },
              ]}
            />
          )}
        </FormSection>
      </main>

      <NewShipmentDialog 
        open={isNewShipmentOpen} 
        onClose={() => setIsNewShipmentOpen(false)} 
      />
    </div>
  );
}
