import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { useShipmentDetailsQuery, useUpdateShipmentCostsMutation, type ShipmentItem } from './api/shipments.api';
import { formatCurrency } from '@/lib/format';
import { useState } from 'react';
import { AddShipmentItemDialog } from './AddShipmentItemDialog';

export default function ShipmentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useShipmentDetailsQuery(id!);
  
  const [shippingCost, setShippingCost] = useState('');
  const [customsCost, setCustomsCost] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [status, setStatus] = useState<string>('');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  
  const updateCostsMutation = useUpdateShipmentCostsMutation(id!);
  
  if (isLoading) return <div style={{ padding: '2rem' }}>جاري التحميل...</div>;
  if (!data) return <div style={{ padding: '2rem' }}>الحاوية غير موجودة</div>;

  const handleUpdateCosts = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCostsMutation.mutateAsync({
      shippingCostUsd: shippingCost ? Number(shippingCost) : undefined,
      customsCostEgp: customsCost ? Number(customsCost) : undefined,
      internalTransportCostEgp: transportCost ? Number(transportCost) : undefined,
      exchangeRateAtArrival: exchangeRate ? Number(exchangeRate) : undefined,
      status: status ? status : undefined,
    });
    setShippingCost('');
    setCustomsCost('');
    setTransportCost('');
    setExchangeRate('');
  };

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader 
          title={`حاوية رقم: ${data.container_number}`} 
          description={`تاريخ الوصول المتوقع: ${data.arrival_date || 'غير محدد'} | الحالة: ${data.status}`}
          actions={
            <div className="actions compact-actions">
              <Button variant="secondary" onClick={() => navigate('/import-sales/shipments')}>عودة للقائمة</Button>
            </div>
          } 
        />

        <FormSection title="تكاليف الحاوية (مؤثرة على سعر المنتج)">
          <form onSubmit={handleUpdateCosts} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem' }}>
            <div className="form-group">
              <label>تكلفة الشحن البحري (بالدولار)</label>
              <input type="number" step="0.01" className="input" placeholder={`الحالي: $${data.shipping_cost_usd}`} value={shippingCost} onChange={e => setShippingCost(e.target.value)} />
            </div>
            <div className="form-group">
              <label>الجمارك ومصاريف التخليص (بالجنيه)</label>
              <input type="number" step="0.01" className="input" placeholder={`الحالي: ${data.customs_cost_egp} ج`} value={customsCost} onChange={e => setCustomsCost(e.target.value)} />
            </div>
            <div className="form-group">
              <label>نقل داخلي ونثريات (بالجنيه)</label>
              <input type="number" step="0.01" className="input" placeholder={`الحالي: ${data.internal_transport_cost_egp} ج`} value={transportCost} onChange={e => setTransportCost(e.target.value)} />
            </div>
            <div className="form-group">
              <label>سعر صرف الدولار الجمركي/الفعلي</label>
              <input type="number" step="0.01" className="input" placeholder={`الحالي: ${data.exchange_rate_at_arrival}`} value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>تغيير حالة الحاوية</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">لا تغيير (الحالية: {data.status})</option>
                <option value="Pending">في البحر (Pending)</option>
                <option value="In Customs">في الجمارك (In Customs)</option>
                <option value="Arrived">تم الوصول (Arrived) - سيتم إضافة الكميات للمخزون</option>
              </select>
            </div>
            <div className="actions" style={{ gridColumn: 'span 2' }}>
              <Button type="submit" variant="primary" disabled={updateCostsMutation.isPending}>تحديث التكاليف وإعادة الحساب</Button>
            </div>
          </form>
        </FormSection>

        <FormSection 
          title="أصناف الحاوية (محتويات الشحنة)" 
          description="جميع المنتجات التي تم استلامها داخل هذه الحاوية."
          actions={<Button variant="secondary" onClick={() => setIsAddItemOpen(true)}>إضافة صنف +</Button>}
        >
          <DataTable<ShipmentItem>
            rows={data.items}
            rowKey={(row) => row.id}
            columns={[
              { key: 'product_name', header: 'الصنف', cell: (row) => <strong>{row.product_name || row.product_id}</strong> },
              { key: 'quantity', header: 'الكمية', cell: (row) => row.quantity },
              { key: 'factory_unit_price_usd', header: 'سعر الشراء (دولار)', cell: (row) => `$${Number(row.factory_unit_price_usd).toFixed(2)}` },
              { key: 'allocated_overhead_egp', header: 'نصيب الوحدة من المصاريف', cell: (row) => formatCurrency(Number(row.allocated_overhead_egp)) },
              { key: 'landed_cost_egp', header: 'التكلفة الفعلية (Landed Cost)', cell: (row) => <strong style={{ color: 'var(--green-700)' }}>{formatCurrency(Number(row.landed_cost_egp))}</strong> },
            ]}
          />
        </FormSection>
      </main>

      {isAddItemOpen && (
        <AddShipmentItemDialog 
          open={isAddItemOpen} 
          onClose={() => setIsAddItemOpen(false)} 
          shipmentId={id!} 
        />
      )}
    </div>
  );
}
