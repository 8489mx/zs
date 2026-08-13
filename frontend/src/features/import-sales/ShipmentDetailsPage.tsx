import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { 
  useShipmentDetailsQuery, 
  useUpdateShipmentCostsMutation, 
  useUpdateShipmentItemMutation,
  useApplyPricesMutation,
  type ShipmentItem 
} from './api/shipments.api';
import { formatCurrency } from '@/lib/format';
import { useState, useEffect } from 'react';
import { AddShipmentItemDialog } from './AddShipmentItemDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';

function ItemRowInputs({ item, shipmentId, arrivalRate, pricingRate }: { item: ShipmentItem, shipmentId: string, arrivalRate: number, pricingRate: number }) {
  const updateMutation = useUpdateShipmentItemMutation(shipmentId);
  const [receivedQty, setReceivedQty] = useState(item.received_quantity || '');
  const [retailMargin, setRetailMargin] = useState(item.target_retail_margin || '');
  const [wholesaleMargin, setWholesaleMargin] = useState(item.target_wholesale_margin || '');

  useEffect(() => {
    setReceivedQty(item.received_quantity || '');
    setRetailMargin(item.target_retail_margin || '');
    setWholesaleMargin(item.target_wholesale_margin || '');
  }, [item.received_quantity, item.target_retail_margin, item.target_wholesale_margin]);

  const handleBlur = (field: 'receivedQuantity' | 'targetRetailMargin' | 'targetWholesaleMargin' | 'shortageHandlingMethod', value: string) => {
    updateMutation.mutate({ 
      itemId: item.id, 
      dto: { [field]: field === 'shortageHandlingMethod' ? value : (value ? Number(value) : undefined) } 
    });
  };

  const unitUsd = Number(item.factory_unit_price_usd) || 0;
  const landedCost = Number(item.landed_cost_egp) || 0;
  const pricingCostEgp = landedCost + (unitUsd * (pricingRate - arrivalRate));
  
  const suggestedWholesale = pricingCostEgp * (1 + (Number(wholesaleMargin) || 0) / 100);
  const suggestedRetail = pricingCostEgp * (1 + (Number(retailMargin) || 0) / 100);
  
  return (
    <div style={{ display: 'contents' }}>
      <td style={{ padding: '0.5rem' }}>
        <input 
          type="number" 
          className="input" 
          style={{ width: '100px', padding: '0.2rem' }} 
          value={receivedQty}
          placeholder={String(item.quantity)}
          onChange={e => setReceivedQty(e.target.value)}
          onBlur={e => handleBlur('receivedQuantity', e.target.value)}
        />
        {Number(receivedQty) > 0 && Number(receivedQty) < item.quantity && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            <label style={{ display: 'block', color: 'var(--slate-500)', marginBottom: '0.2rem' }}>معالجة النواقص:</label>
            <select 
              className="input" 
              style={{ width: '100%', padding: '0.2rem', fontSize: '0.85rem' }}
              value={item.shortage_handling_method || 'capitalize'}
              onChange={e => handleBlur('shortageHandlingMethod', e.target.value)}
            >
              <option value="capitalize">تحميل على الباقي (رسملة)</option>
              <option value="expense">تسجيل كخسارة</option>
            </select>
          </div>
        )}
      </td>
      <td style={{ padding: '0.5rem' }}>
        <input 
          type="number" 
          className="input" 
          style={{ width: '80px', padding: '0.2rem' }}
          value={wholesaleMargin}
          placeholder="%"
          onChange={e => setWholesaleMargin(e.target.value)}
          onBlur={e => handleBlur('targetWholesaleMargin', e.target.value)}
        />
      </td>
      <td style={{ padding: '0.5rem' }}>
        <input 
          type="number" 
          className="input" 
          style={{ width: '80px', padding: '0.2rem' }}
          value={retailMargin}
          placeholder="%"
          onChange={e => setRetailMargin(e.target.value)}
          onBlur={e => handleBlur('targetRetailMargin', e.target.value)}
        />
      </td>
      <td style={{ padding: '0.5rem' }}>
        <strong style={{ color: 'var(--green-700)', display: 'block' }}>
          {formatCurrency(suggestedWholesale)}
        </strong>
      </td>
      <td style={{ padding: '0.5rem' }}>
        <strong style={{ color: 'var(--green-700)', display: 'block' }}>
          {formatCurrency(suggestedRetail)}
        </strong>
      </td>
    </div>
  );
}

export default function ShipmentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useShipmentDetailsQuery(id!);
  
  const [shippingCost, setShippingCost] = useState('');
  const [shippingAcc, setShippingAcc] = useState('');
  
  const [customsCost, setCustomsCost] = useState('');
  const [customsAcc, setCustomsAcc] = useState('');

  const [transportCost, setTransportCost] = useState('');
  const [transportAcc, setTransportAcc] = useState('');

  const [exchangeRate, setExchangeRate] = useState('');
  const [pricingExchangeRate, setPricingExchangeRate] = useState('');
  const [status, setStatus] = useState<string>('');
  
  // Dates
  const [shippedDate, setShippedDate] = useState('');
  const [etaDate, setEtaDate] = useState('');
  const [clearanceDate, setClearanceDate] = useState('');

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  
  const [globalRetailMargin, setGlobalRetailMargin] = useState('');
  const [globalWholesaleMargin, setGlobalWholesaleMargin] = useState('');
  
  const updateCostsMutation = useUpdateShipmentCostsMutation(id!);
  const applyPricesMutation = useApplyPricesMutation(id!);
  const updateItemMutation = useUpdateShipmentItemMutation(id!);

  useEffect(() => {
    if (data) {
      setShippedDate(data.shipped_date ? data.shipped_date.split('T')[0] : '');
      const eta = data.eta_date || data.arrival_date;
      setEtaDate(eta ? eta.split('T')[0] : '');
      setClearanceDate(data.clearance_date ? data.clearance_date.split('T')[0] : '');
    }
  }, [data]);

  // Fetch accounts for treasury dropdown (assuming generic endpoint, fallback to basic input if fails)
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => http<any>('/api/accounting/accounts').catch(() => ({ accounts: [] })),
  });
  const treasuryAccounts = (accountsData?.accounts || (Array.isArray(accountsData) ? accountsData : [])).filter((a: any) => a.accountGroup === 'current_assets' || a.isCashBank);

  if (isLoading) return <div style={{ padding: '2rem' }}>جاري التحميل...</div>;
  if (!data) return <div style={{ padding: '2rem' }}>الحاوية غير موجودة</div>;

  const handleUpdateCosts = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCostsMutation.mutateAsync({
      shippingCostUsd: shippingCost ? Number(shippingCost) : undefined,
      shippingAccountId: shippingAcc || undefined,
      customsCostEgp: customsCost ? Number(customsCost) : undefined,
      customsAccountId: customsAcc || undefined,
      internalTransportCostEgp: transportCost ? Number(transportCost) : undefined,
      transportAccountId: transportAcc || undefined,
      exchangeRateAtArrival: exchangeRate ? Number(exchangeRate) : undefined,
      pricingExchangeRate: pricingExchangeRate ? Number(pricingExchangeRate) : undefined,
      status: status ? status : undefined,
      shippedDate: shippedDate || undefined,
      etaDate: etaDate || undefined,
      clearanceDate: clearanceDate || undefined,
    });
    setShippingCost('');
    setCustomsCost('');
    setTransportCost('');
    setExchangeRate('');
    setPricingExchangeRate('');
    setShippingAcc('');
    setCustomsAcc('');
    setTransportAcc('');
  };

  const handleApplyGlobalMargins = async () => {
    if (!globalRetailMargin && !globalWholesaleMargin) return;
    
    // We update each item individually
    const promises = data.items.map((item: any) => 
      updateItemMutation.mutateAsync({
        itemId: item.id,
        dto: {
          targetRetailMargin: globalRetailMargin ? Number(globalRetailMargin) : undefined,
          targetWholesaleMargin: globalWholesaleMargin ? Number(globalWholesaleMargin) : undefined,
        }
      })
    );
    await Promise.all(promises);
    await queryClient.invalidateQueries({ queryKey: ['import-shipments', id] });
    setTimeout(() => {
      alert('تم تطبيق الهوامش على جميع الأصناف بنجاح (تحتاج إلى تطبيق واعتماد الأسعار للمخزن لتفعيلها)');
    }, 100);
  };

  const handleApplyPrices = async () => {
    if (confirm('هل أنت متأكد من تطبيق الأسعار المقترحة على المنتجات في المخزن؟')) {
      const res = await applyPricesMutation.mutateAsync();
      alert(`تم تحديث أسعار ${res.updatedCount} صنف بنجاح.`);
    }
  };

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader 
          title={`حاوية رقم: ${data.container_number}`} 
          description={
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <span>الحالة: <strong>{data.status}</strong></span>
              <span>المصنع: <strong>{data.supplier_name || 'غير محدد'}</strong></span>
              <span>بوليصة الشحن (B/L): <strong>{data.bill_of_lading || 'غير محدد'}</strong></span>
            </div>
          }
          actions={
            <div className="actions compact-actions">
              <Button variant="secondary" onClick={() => navigate('/import-sales/shipments')}>عودة للقائمة</Button>
            </div>
          } 
        />

        <FormSection title="تفاصيل وتكاليف الحاوية (مؤثرة على سعر المنتج)">
          <form onSubmit={handleUpdateCosts} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem' }}>
            
            {/* Timeline */}
            <div className="form-group">
              <label>تاريخ الشحن (من المصنع)</label>
              <input type="date" className="input" value={shippedDate} onChange={e => setShippedDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>تاريخ الوصول المتوقع للميناء (ETA)</label>
              <input type="date" className="input" value={etaDate} onChange={e => setEtaDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>تاريخ التخليص الجمركي</label>
              <input type="date" className="input" value={clearanceDate} onChange={e => setClearanceDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>سعر صرف الدولار الجمركي/الفعلي</label>
              <input type="number" step="0.01" className="input" placeholder={`الحالي: ${data.exchange_rate_at_arrival || ''}`} value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
            </div>
            
            <div className="form-group">
              <label>سعر دولار التسعير</label>
              <input type="number" step="0.01" className="input" placeholder={`الحالي: ${data.pricing_exchange_rate || data.exchange_rate_at_arrival || ''}`} value={pricingExchangeRate} onChange={e => setPricingExchangeRate(e.target.value)} />
            </div>

            <hr style={{ gridColumn: 'span 2' }} />

            {/* Costs */}
            <div className="form-group">
              <label>تكلفة الشحن البحري (بالدولار)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" step="0.01" className="input" placeholder={`الحالي: $${data.shipping_cost_usd}`} value={shippingCost} onChange={e => setShippingCost(e.target.value)} />
                <select className="input" value={shippingAcc} onChange={e => setShippingAcc(e.target.value)}>
                  <option value="">دفع من الخزنة؟</option>
                  {treasuryAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.nameAr || a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>الجمارك ومصاريف التخليص (بالجنيه)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" step="0.01" className="input" placeholder={`الحالي: ${data.customs_cost_egp} ج`} value={customsCost} onChange={e => setCustomsCost(e.target.value)} />
                <select className="input" value={customsAcc} onChange={e => setCustomsAcc(e.target.value)}>
                  <option value="">دفع من الخزنة؟</option>
                  {treasuryAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.nameAr || a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>نقل داخلي ونثريات (بالجنيه)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" step="0.01" className="input" placeholder={`الحالي: ${data.internal_transport_cost_egp} ج`} value={transportCost} onChange={e => setTransportCost(e.target.value)} />
                <select className="input" value={transportAcc} onChange={e => setTransportAcc(e.target.value)}>
                  <option value="">دفع من الخزنة؟</option>
                  {treasuryAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.nameAr || a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>تغيير حالة الحاوية</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">لا تغيير (الحالية: {data.status})</option>
                <option value="Pending">في البحر (Pending)</option>
                <option value="In Customs">في الجمارك (In Customs)</option>
                <option value="Arrived">تم الوصول (Arrived) - سيتم إضافة الكميات للمخزون</option>
              </select>
            </div>

            <div className="actions" style={{ gridColumn: 'span 2' }}>
              <Button type="submit" variant="primary" disabled={updateCostsMutation.isPending}>تحديث البيانات والتكاليف وإعادة الحساب</Button>
            </div>
          </form>
        </FormSection>

        <FormSection 
          title="أصناف الحاوية وتحديد أسعار البيع" 
          description="جميع المنتجات التي تم استلامها داخل هذه الحاوية. يمكنك تعديل الكمية المستلمة فعلياً وهامش الربح."
          actions={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" onClick={handleApplyPrices} disabled={applyPricesMutation.isPending}>
                تطبيق واعتماد الأسعار للمخزن
              </Button>
              <Button variant="secondary" onClick={() => setIsAddItemOpen(true)}>إضافة صنف +</Button>
            </div>
          }
        >
          <div style={{ padding: '1rem', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>هامش الجملة الموحد %</label>
              <input type="number" className="input" value={globalWholesaleMargin} onChange={e => setGlobalWholesaleMargin(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>هامش القطاعي الموحد %</label>
              <input type="number" className="input" value={globalRetailMargin} onChange={e => setGlobalRetailMargin(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={handleApplyGlobalMargins}>تطبيق على كل الأصناف</Button>
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>الصنف</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>الكمية بالبوليصة</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>سعر الشراء ($)</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>التكلفة النهائية (Landed)</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>الكمية المستلمة (النواقص)</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>هامش الجملة %</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>هامش القطاعي %</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>سعر الجملة المقترح</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>سعر القطاعي المقترح</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--gray-200)' }}>
                    <td style={{ padding: '0.5rem' }}><strong>{item.product_name || item.product_id}</strong></td>
                    <td style={{ padding: '0.5rem' }}>{item.quantity}</td>
                    <td style={{ padding: '0.5rem' }}>${Number(item.factory_unit_price_usd).toFixed(2)}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <strong style={{ color: 'var(--green-700)' }}>
                        {formatCurrency(Number(item.landed_cost_egp))}
                      </strong>
                    </td>
                    <ItemRowInputs 
                      item={item} 
                      shipmentId={id!} 
                      arrivalRate={Number(data.exchange_rate_at_arrival) || 1} 
                      pricingRate={Number(data.pricing_exchange_rate) || Number(data.exchange_rate_at_arrival) || 1} 
                    />
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>لا توجد أصناف</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
