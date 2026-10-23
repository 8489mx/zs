import { toast, systemConfirm } from '@/shared/components/system-alert';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { 
  useShipmentDetailsQuery, 
  useUpdateShipmentCostsMutation, 
  useUpdateShipmentItemMutation,
  useApplyPricesMutation,
  useCreateReceivingInspectionMutation,
  useRecordLateShipmentExpenseMutation,
  type ShipmentItem 
} from './api/shipments.api';
import { formatCurrency } from '@/lib/format';
import { useState, useEffect } from 'react';
import { AddShipmentItemDialog } from './AddShipmentItemDialog';
import { ContainerAutopsyModal } from './ContainerAutopsyModal';
import { ContainerPreordersModal } from './ContainerPreordersModal';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { referenceDataApi } from '@/services/reference-data.api';

function ItemRowInputs({ item, shipmentId, arrivalRate, pricingRate, isArrived }: { item: ShipmentItem, shipmentId: string, arrivalRate: number, pricingRate: number, isArrived?: boolean }) {
  const { t } = useTranslation();
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
  
  const suggestedWholesale = Math.round((pricingCostEgp * (1 + (Number(wholesaleMargin) || 0) / 100)) * 100) / 100;
  const suggestedRetail = Math.round((pricingCostEgp * (1 + (Number(retailMargin) || 0) / 100)) * 100) / 100;
  
  return (
    <div style={{ display: 'contents' }}>
      <td style={{ padding: '0.5rem' }}>
        <input 
          type="number" 
          className="input" 
          style={{ width: '100px', padding: '0.2rem' }} 
          value={receivedQty}
          placeholder={String(item.quantity)}
          disabled={isArrived}
          title={isArrived ? 'تم استلام الحاوية وترحيل المخزون نهائياً - مقفلة' : ''}
          onChange={e => setReceivedQty(e.target.value)}
          onBlur={e => handleBlur('receivedQuantity', e.target.value)}
        />
        {Number(receivedQty) > 0 && Number(receivedQty) < item.quantity && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            <label style={{ display: 'block', color: 'var(--slate-500)', marginBottom: '0.2rem' }}>{t('import_sales.shipment_details_page.s0', "معالجة النواقص:")}</label>
            <select 
              className="input" 
              style={{ width: '100%', padding: '0.2rem', fontSize: '0.85rem' }}
              value={item.shortage_handling_method || 'capitalize'}
              disabled={isArrived}
              onChange={e => handleBlur('shortageHandlingMethod', e.target.value)}
            >
              <option value="capitalize">{t('import_sales.shipment_details_page.s1', "تحميل على الباقي (رسملة)")}</option>
              <option value="expense">{t('import_sales.shipment_details_page.s2', "تسجيل كخسارة")}</option>
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
  const { t } = useTranslation();
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
  const [allocationMethod, setAllocationMethod] = useState<'value' | 'weight' | 'cbm' | ''>('');
  const [receiptLocationId, setReceiptLocationId] = useState<string>('');
  
  // Dates
  const [shippedDate, setShippedDate] = useState('');
  const [etaDate, setEtaDate] = useState('');
  const [clearanceDate, setClearanceDate] = useState('');

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAutopsyOpen, setIsAutopsyOpen] = useState(false);
  const [isPreordersOpen, setIsPreordersOpen] = useState(false);
  const [isGrnOpen, setIsGrnOpen] = useState(false);
  const [isLateExpenseOpen, setIsLateExpenseOpen] = useState(false);

  // GRN state
  const [grnInspectorName, setGrnInspectorName] = useState('');
  const [grnLocationId, setGrnLocationId] = useState('');
  const [grnNotes, setGrnNotes] = useState('');
  const [grnDamagedMap, setGrnDamagedMap] = useState<Record<string, number>>({});

  // Late Expense state
  const [lateExpenseType, setLateExpenseType] = useState('demurrage');
  const [lateAmountEgp, setLateAmountEgp] = useState('');
  const [lateTreatment, setLateTreatment] = useState<'capitalize' | 'expense'>('capitalize');
  const [lateTreasuryAccId, setLateTreasuryAccId] = useState('');
  const [lateDescription, setLateDescription] = useState('');
  
  const [globalRetailMargin, setGlobalRetailMargin] = useState('');
  const [globalWholesaleMargin, setGlobalWholesaleMargin] = useState('');
  
  const updateCostsMutation = useUpdateShipmentCostsMutation(id!);
  const applyPricesMutation = useApplyPricesMutation(id!);
  const updateItemMutation = useUpdateShipmentItemMutation(id!);
  const createGrnMutation = useCreateReceivingInspectionMutation();
  const recordLateExpenseMutation = useRecordLateShipmentExpenseMutation();

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
  const { data: warehouseLocations = [] } = useQuery({ queryKey: ['locations'], queryFn: referenceDataApi.locations });

  if (isLoading) {
    return (
      <div className="page-stack page-shell import-sales-page" dir="rtl">
        <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>{t('import_sales.shipment_details_page.s3', "جاري التحميل...")}</div>
        </main>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="page-stack page-shell import-sales-page" dir="rtl">
        <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>{t('import_sales.shipment_details_page.s4', "الحاوية غير موجودة")}</div>
        </main>
      </div>
    );
  }

  const handleUpdateCosts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'Arrived' && data.status !== 'Arrived') {
      if (!receiptLocationId) {
        toast.error('يجب تحديد مخزن استلام الحاوية الفعلي قبل الترحيل إلى المخزون');
        return;
      }
      const confirmed = await systemConfirm({
        title: 'تأكيد وصول الحاوية وترحيل المخزون واليومية العامة',
        message: 'تنبيه محاسبي ومخزني: تغيير الحالة إلى (تم الوصول Arrived) سيقوم بإدخال الأصناف فوراً إلى رصيد المخزن المحدد، حساب متوسط التكلفة المرجح، إنشاء سند استلام نهائي، وإثبات قيد التكلفة المحملة في اليومية العامة. لا يمكن تعديل الكميات بعد الترحيل إلا بتسوية جردية معتمدة. هل ترغب في المتابعة؟',
        confirmVariant: 'danger',
      });
      if (!confirmed) return;
    }
    await updateCostsMutation.mutateAsync({
      shippingCostUsd: shippingCost ? Number(shippingCost) : undefined,
      shippingAccountId: shippingAcc || undefined,
      customsCostEgp: customsCost ? Number(customsCost) : undefined,
      customsAccountId: customsAcc || undefined,
      internalTransportCostEgp: transportCost ? Number(transportCost) : undefined,
      transportAccountId: transportAcc || undefined,
      exchangeRateAtArrival: exchangeRate ? Number(exchangeRate) : undefined,
      costAllocationMethod: allocationMethod || undefined,
      pricingExchangeRate: pricingExchangeRate ? Number(pricingExchangeRate) : undefined,
      status: status ? status : undefined,
      receiptLocationId: status === 'Arrived' && receiptLocationId ? Number(receiptLocationId) : undefined,
      shippedDate: shippedDate || undefined,
      etaDate: etaDate || undefined,
      clearanceDate: clearanceDate || undefined,
    });
    setShippingCost('');
    setCustomsCost('');
    setTransportCost('');
    setExchangeRate('');
    setPricingExchangeRate('');
    setAllocationMethod('');
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
      toast.success('تم تطبيق الهوامش على جميع الأصناف بنجاح (تحتاج إلى تطبيق واعتماد الأسعار للمخزن لتفعيلها)');
    }, 100);
  };

  const handleApplyPrices = async () => {
    const confirmed = await systemConfirm({ title: 'اعتماد الأسعار', message: 'هل أنت متأكد من تطبيق الأسعار المقترحة على المنتجات في المخزن؟' }); if (confirmed) {
      const res = await applyPricesMutation.mutateAsync();
      toast.success(`تم تحديث أسعار ${res.updatedCount} صنف بنجاح.`);
    }
  };

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader 
          title={`حاوية رقم: ${data.container_number}`} 
          description={
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <span>{t('import_sales.shipment_details_page.s5', "الحالة:")} <strong>{data.status}</strong></span>
              <span>{t('import_sales.shipment_details_page.s6', "المصنع:")} <strong>{data.supplier_name || t('import_sales.shipment_details_page.s7', "غير محدد")}</strong></span>
              <span>{t('import_sales.shipment_details_page.s8', "بوليصة الشحن (B/L):")} <strong>{data.bill_of_lading || t('import_sales.shipment_details_page.s9', "غير محدد")}</strong></span>
              {(data as any).project_title && (
                <span>مشروع الاستيراد: <strong>{(data as any).project_no} - {(data as any).project_title}</strong></span>
              )}
              {(data as any).freight_type && (
                <span>الشحن: <strong>{(data as any).freight_type} ({(data as any).container_size || '40HQ'})</strong></span>
              )}
              {(data as any).port_of_loading && (
                <span>المسار: <strong>{(data as any).port_of_loading} &larr; {(data as any).port_of_discharge || 'Alexandria'}</strong></span>
              )}
              {data.inventory_receipt && (
                <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 4, fontWeight: 700, border: '1px solid #bbf7d0', fontSize: '0.78rem' }}>
                  سند استلام مخزني: #{data.inventory_receipt.id} (مرحل)
                </span>
              )}
              {data.inventory_receipt?.journal_entry_id && (
                <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 4, fontWeight: 700, border: '1px solid #c7d2fe', fontSize: '0.78rem' }}>
                  قيد اليومية العامة: #JE-{data.inventory_receipt.journal_entry_id}
                </span>
              )}
            </div>
          }
          actions={
            <div className="actions compact-actions">
              <Button variant="secondary" onClick={() => { setGrnLocationId(receiptLocationId || ''); setIsGrnOpen(true); }} style={{ borderColor: '#15803d', color: '#15803d', fontWeight: 600 }}>محضر فحص واستلام (GRN)</Button>
              {data.status === 'Arrived' && (
                <Button variant="secondary" onClick={() => setIsLateExpenseOpen(true)} style={{ borderColor: '#b45309', color: '#b45309', fontWeight: 600 }}>مصروف متأخر بعد الوصول</Button>
              )}
              <Button variant="secondary" onClick={() => setIsPreordersOpen(true)} style={{ borderColor: '#0284c7', color: '#0369a1', fontWeight: 600 }}>حجوزات البضاعة العايمة</Button>
              <Button variant="secondary" onClick={() => setIsAutopsyOpen(true)} style={{ borderColor: '#170e5e', color: '#170e5e', fontWeight: 700 }}>تشريح أرباح الحاوية (P&L)</Button>
              <Button variant="secondary" onClick={() => navigate('/import-sales/shipments')}>{t('import_sales.shipment_details_page.s10', "عودة للقائمة")}</Button>
            </div>
          } 
        />

        {(data as any).demurrageRisk?.isOverdue && (
          <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 16px', borderRadius: 10, color: '#b91c1c', fontWeight: 700, fontSize: '12.5px', marginBottom: 14 }}>
            تحذير تشغيلي: تجاوزت الحاوية فترة السماح للأرضيات بـ {(data as any).demurrageRisk.overdueDays} يوم! غرامات تأخير تقديرية: {(data as any).demurrageRisk.estimatedFeesEgp?.toLocaleString()} ج.م
          </div>
        )}
        {!(data as any).demurrageRisk?.isOverdue && (data as any).demurrageRisk?.daysRemaining !== null && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 16px', borderRadius: 10, color: '#166534', fontWeight: 600, fontSize: '12.5px', marginBottom: 14 }}>
            فترة سماح الأرضيات: متبقي {(data as any).demurrageRisk.daysRemaining} يوم قبل بدء احتساب غرامات التأخير اليومية
          </div>
        )}
        <FormSection title={t('import_sales.shipment_details_page.s11', "تفاصيل وتكاليف الحاوية (مؤثرة على سعر المنتج)")}>
          <form onSubmit={handleUpdateCosts} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem' }}>
            
            {/* Timeline */}
            <div className="form-group">
              <label>{t('import_sales.shipment_details_page.s12', "تاريخ الشحن (من المصنع)")}</label>
              <input type="date" className="input" value={shippedDate} onChange={e => setShippedDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('import_sales.shipment_details_page.s13', "تاريخ الوصول المتوقع للميناء (ETA)")}</label>
              <input type="date" className="input" value={etaDate} onChange={e => setEtaDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('import_sales.shipment_details_page.s14', "تاريخ التخليص الجمركي")}</label>
              <input type="date" className="input" value={clearanceDate} onChange={e => setClearanceDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('import_sales.shipment_details_page.s15', "سعر صرف الدولار الجمركي/الفعلي")}</label>
              <input type="number" step="0.01" className="input" placeholder={`الحالي: ${data.exchange_rate_at_arrival || ''}`} value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
            </div>
            
            <div className="form-group">
              <label>{t('import_sales.shipment_details_page.s16', "سعر دولار التسعير")}</label>
              <input type="number" step="0.01" className="input" placeholder={`الحالي: ${data.pricing_exchange_rate || data.exchange_rate_at_arrival || ''}`} value={pricingExchangeRate} onChange={e => setPricingExchangeRate(e.target.value)} />
            </div>

            <hr style={{ gridColumn: 'span 2' }} />

            {/* Costs */}
            <div className="form-group">
              <label>{t('import_sales.shipment_details_page.s17', "تكلفة الشحن البحري (بالدولار)")}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" step="0.01" className="input" placeholder={`الحالي: $${data.shipping_cost_usd}`} value={shippingCost} onChange={e => setShippingCost(e.target.value)} />
                <select className="input" value={shippingAcc} onChange={e => setShippingAcc(e.target.value)}>
                  <option value="">{t('import_sales.shipment_details_page.s18', "دفع من الخزنة؟")}</option>
                  {treasuryAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.nameAr || a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>{t('import_sales.shipment_details_page.s19', "الجمارك ومصاريف التخليص (بالجنيه)")}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" step="0.01" className="input" placeholder={`الحالي: ${data.customs_cost_egp} ج`} value={customsCost} onChange={e => setCustomsCost(e.target.value)} />
                <select className="input" value={customsAcc} onChange={e => setCustomsAcc(e.target.value)}>
                  <option value="">{t('import_sales.shipment_details_page.s20', "دفع من الخزنة؟")}</option>
                  {treasuryAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.nameAr || a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>{t('import_sales.shipment_details_page.s21', "نقل داخلي ونثريات (بالجنيه)")}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" step="0.01" className="input" placeholder={`الحالي: ${data.internal_transport_cost_egp} ج`} value={transportCost} onChange={e => setTransportCost(e.target.value)} />
                <select className="input" value={transportAcc} onChange={e => setTransportAcc(e.target.value)}>
                  <option value="">{t('import_sales.shipment_details_page.s22', "دفع من الخزنة؟")}</option>
                  {treasuryAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.nameAr || a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>{t('import_sales.shipment_details_page.s23', "تغيير حالة الحاوية")}</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">{t('import_sales.shipment_details_page.s24', "لا تغيير (الحالية:")} {data.status})</option>
                <option value="Pending">{t('import_sales.shipment_details_page.s25', "في البحر (Pending)")}</option>
                <option value="In Customs">{t('import_sales.shipment_details_page.s26', "في الجمارك (In Customs)")}</option>
                <option value="Arrived">{t('import_sales.shipment_details_page.s27', "تم الوصول (Arrived) - سيتم إضافة الكميات للمخزون")}</option>
              </select>
            </div>

            {data.status !== 'Arrived' && (
              <div className="form-group">
                <label>طريقة توزيع تكلفة الاستيراد</label>
                <select className="input" value={allocationMethod} onChange={e => setAllocationMethod(e.target.value as typeof allocationMethod)}>
                  <option value="">الحالية: {data.cost_allocation_method || 'value'}</option>
                  <option value="value">قيمة الصنف</option>
                  <option value="weight">الوزن</option>
                  <option value="cbm">الحجم CBM</option>
                </select>
              </div>
            )}
            {status === 'Arrived' && data.status !== 'Arrived' && (
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>مخزن استلام الحاوية (إلزامي عند الوصول)</label>
                <select className="input" required value={receiptLocationId} onChange={e => setReceiptLocationId(e.target.value)}>
                  <option value="">اختر مخزنًا فعليًا مسجلًا للشركة</option>
                  {warehouseLocations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name || loc.nameAr || `مخزن ${loc.id}`}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="actions" style={{ gridColumn: 'span 2' }}>
              <Button type="submit" variant="primary" disabled={updateCostsMutation.isPending}>{t('import_sales.shipment_details_page.s28', "تحديث البيانات والتكاليف وإعادة الحساب")}</Button>
            </div>
          </form>
        </FormSection>

        <FormSection 
          title={t('import_sales.shipment_details_page.s29', "أصناف الحاوية وتحديد أسعار البيع")} 
          description={t('import_sales.shipment_details_page.s30', "جميع المنتجات التي تم استلامها داخل هذه الحاوية. يمكنك تعديل الكمية المستلمة فعلياً وهامش الربح.")}
          actions={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" onClick={handleApplyPrices} disabled={applyPricesMutation.isPending}>
                {t('import_sales.shipment_details_page.s31', "تطبيق واعتماد الأسعار للمخزن")}
              </Button>
              <Button variant="secondary" onClick={() => setIsAddItemOpen(true)} disabled={data.status === 'Arrived'}>{t('import_sales.shipment_details_page.s32', "إضافة صنف +")}</Button>
            </div>
          }
        >
          <div style={{ padding: '1rem', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>{t('import_sales.shipment_details_page.s33', "هامش الجملة الموحد %")}</label>
              <input type="number" className="input" value={globalWholesaleMargin} onChange={e => setGlobalWholesaleMargin(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>{t('import_sales.shipment_details_page.s34', "هامش القطاعي الموحد %")}</label>
              <input type="number" className="input" value={globalRetailMargin} onChange={e => setGlobalRetailMargin(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={handleApplyGlobalMargins}>{t('import_sales.shipment_details_page.s35', "تطبيق على كل الأصناف")}</Button>
          </div>

          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>{t('import_sales.shipment_details_page.s36', "الصنف")}</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>{t('import_sales.shipment_details_page.s37', "الكمية بالبوليصة")}</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>{t('import_sales.shipment_details_page.s38', "سعر الشراء ($)")}</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>{t('import_sales.shipment_details_page.s39', "التكلفة النهائية (Landed)")}</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>{t('import_sales.shipment_details_page.s40', "الكمية المستلمة (النواقص)")}</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>{t('import_sales.shipment_details_page.s41', "هامش الجملة %")}</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>{t('import_sales.shipment_details_page.s42', "هامش القطاعي %")}</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>{t('import_sales.shipment_details_page.s43', "سعر الجملة المقترح")}</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--gray-300)' }}>{t('import_sales.shipment_details_page.s44', "سعر القطاعي المقترح")}</th>
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
                      isArrived={data.status === 'Arrived'}
                    />
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>{t('import_sales.shipment_details_page.s45', "لا توجد أصناف")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </FormSection>
      </main>

      {isAutopsyOpen && (
        <ContainerAutopsyModal isOpen={isAutopsyOpen} onClose={() => setIsAutopsyOpen(false)} shipmentId={id!} />
      )}
      {isPreordersOpen && (
        <ContainerPreordersModal isOpen={isPreordersOpen} onClose={() => setIsPreordersOpen(false)} shipment={data} />
      )}
      {isAddItemOpen && (
        <AddShipmentItemDialog 
          open={isAddItemOpen} 
          onClose={() => setIsAddItemOpen(false)} 
          shipmentId={id!} 
        />
      )}

      {isGrnOpen && (
        <StandardDialog
          isOpen={isGrnOpen}
          onClose={() => setIsGrnOpen(false)}
          title="محضر فحص واستلام مخزني (GRN / Receiving Inspection)"
          subtitle={`فحص كميات وجودة أصناف الحاوية ${data.container_number} وإثبات التوالف والنواقص`}
          width="min(880px, 95vw)"
          compact
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsGrnOpen(false)}>إلغاء</Button>
              <Button
                variant="primary"
                disabled={createGrnMutation.isPending}
                onClick={() => {
                  const itemsPayload = data.items.map((item: any) => {
                    const expectedQty = Number(item.quantity || 0);
                    const receivedQty = Number(item.received_quantity || item.quantity || 0);
                    const damagedQty = Number(grnDamagedMap[item.id] || 0);
                    const acceptedQty = Math.max(0, receivedQty - damagedQty);
                    return {
                      shipmentItemId: item.id,
                      productId: item.product_id,
                      expectedQty,
                      receivedQty,
                      acceptedQty,
                      damagedQty,
                      shortageQty: Math.max(0, expectedQty - receivedQty),
                    };
                  });
                  createGrnMutation.mutate(
                    {
                      shipmentId: id!,
                      projectId: (data as any).project_id || undefined,
                      warehouseLocationId: grnLocationId ? Number(grnLocationId) : undefined,
                      inspectorName: grnInspectorName || undefined,
                      overallStatus: 'approved',
                      notes: grnNotes || undefined,
                      items: itemsPayload,
                    },
                    {
                      onSuccess: (res: any) => {
                        toast.success(`تم اعتماد محضر الفحص والاستلام رقم ${res?.grn_number || ''} بنجاح`);
                        setIsGrnOpen(false);
                      },
                      onError: (err: any) => toast.error(err?.message || 'تعذر حفظ محضر الفحص والاستلام'),
                    },
                  );
                }}
              >
                {createGrnMutation.isPending ? 'جاري الاعتماد...' : 'اعتماد محضر الفحص والاستلام'}
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>اسم مسؤول الفحص / أمين المخزن</label>
                <input className="input" style={{ width: '100%' }} value={grnInspectorName} onChange={e => setGrnInspectorName(e.target.value)} placeholder="مثال: م. أحمد محمود" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>مخزن الاستلام</label>
                <select className="input" style={{ width: '100%' }} value={grnLocationId} onChange={e => setGrnLocationId(e.target.value)}>
                  <option value="">-- اختر المخزن --</option>
                  {warehouseLocations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name || loc.nameAr || `مخزن ${loc.id}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>ملاحظات عامة على حالة الحاوية والأختام</label>
                <input className="input" style={{ width: '100%' }} value={grnNotes} onChange={e => setGrnNotes(e.target.value)} placeholder="حالة الرصاص الجمركي والتغليف..." />
              </div>
            </div>

            <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className="table" style={{ width: '100%', textAlign: 'right', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '8px 10px' }}>الصنف</th>
                    <th style={{ padding: '8px 10px' }}>كمية البوليصة</th>
                    <th style={{ padding: '8px 10px' }}>المستلم الفعلي</th>
                    <th style={{ padding: '8px 10px' }}>العجز (Shortage)</th>
                    <th style={{ padding: '8px 10px' }}>التالف (Damaged)</th>
                    <th style={{ padding: '8px 10px' }}>الصالح المقبول</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: any) => {
                    const expected = Number(item.quantity || 0);
                    const received = Number(item.received_quantity || item.quantity || 0);
                    const shortage = Math.max(0, expected - received);
                    const damaged = Number(grnDamagedMap[item.id] || 0);
                    const accepted = Math.max(0, received - damaged);
                    return (
                      <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{item.product_name || item.product_id}</td>
                        <td style={{ padding: '8px 10px' }}>{expected}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0369a1' }}>{received}</td>
                        <td style={{ padding: '8px 10px', color: shortage > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>{shortage}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="number"
                            min={0}
                            max={received}
                            className="input"
                            style={{ width: '80px', height: '30px', padding: '0 6px' }}
                            value={grnDamagedMap[item.id] ?? 0}
                            onChange={e => setGrnDamagedMap(prev => ({ ...prev, [item.id]: Math.max(0, Number(e.target.value) || 0) }))}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#15803d' }}>{accepted}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </StandardDialog>
      )}

      {isLateExpenseOpen && (
        <StandardDialog
          isOpen={isLateExpenseOpen}
          onClose={() => setIsLateExpenseOpen(false)}
          title="تسجيل مصروف متأخر بعد الوصول (Post-Arrival Late Expense)"
          subtitle="توزيع ذكي للمصروفات المتأخرة بين الرصيد المتبقي بالمخزن (Lot WAC) والبضاعة المباعة (COGS)"
          width="min(620px, 95vw)"
          compact
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsLateExpenseOpen(false)}>إلغاء</Button>
              <Button
                variant="primary"
                disabled={recordLateExpenseMutation.isPending}
                onClick={() => {
                  const amt = Number(lateAmountEgp);
                  if (!amt || amt <= 0) {
                    toast.error('يرجى إدخال قيمة المصروف بالجنيه');
                    return;
                  }
                  recordLateExpenseMutation.mutate(
                    {
                      shipmentId: id!,
                      dto: {
                        expenseType: lateExpenseType,
                        amountEgp: amt,
                        treatment: lateTreatment,
                        treasuryAccountId: lateTreasuryAccId ? Number(lateTreasuryAccId) : undefined,
                        description: lateDescription || undefined,
                      },
                    },
                    {
                      onSuccess: (res: any) => {
                        toast.success(`تم تسجيل المصروف المتأخر بنجاح (مُرسمل للمخزون: ${formatCurrency(res?.capitalizedToInventoryEgp || 0)} | محمل على COGS: ${formatCurrency(res?.expensedToCogsEgp || 0)})`);
                        setIsLateExpenseOpen(false);
                        setLateAmountEgp('');
                        setLateDescription('');
                      },
                      onError: (err: any) => toast.error(err?.message || 'تعذر تسجيل المصروف المتأخر'),
                    },
                  );
                }}
              >
                {recordLateExpenseMutation.isPending ? 'جاري الترحيل...' : 'تسجيل وترحيل القيد المحاسبي'}
              </Button>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>نوع المصروف المتأخر</label>
              <select className="input" style={{ width: '100%' }} value={lateExpenseType} onChange={e => setLateExpenseType(e.target.value)}>
                <option value="demurrage">غرامات تأخير وأرضيات (Demurrage)</option>
                <option value="customs_diff">فروق تسوية جمركية لاحقة</option>
                <option value="transport">نقل ومشال إضافي</option>
                <option value="other">مصروفات استيراد أخرى</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>المبلغ (ج.م) *</label>
              <input type="number" step="0.01" className="input" style={{ width: '100%' }} value={lateAmountEgp} onChange={e => setLateAmountEgp(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>المعالجة المحاسبية</label>
              <select className="input" style={{ width: '100%' }} value={lateTreatment} onChange={e => setLateTreatment(e.target.value as 'capitalize' | 'expense')}>
                <option value="capitalize">رسملة تناسبية (تعلية المتبقي بالمخزن + COGS للمباع)</option>
                <option value="expense">تحميل كامل مباشر على تكلفة المبيعات (COGS)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>حساب السداد (الخزينة / البنك)</label>
              <select className="input" style={{ width: '100%' }} value={lateTreasuryAccId} onChange={e => setLateTreasuryAccId(e.target.value)}>
                <option value="">-- الخزينة الافتراضية --</option>
                {treasuryAccounts.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.nameAr || a.name}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>البيان والتفاصيل</label>
              <input className="input" style={{ width: '100%' }} value={lateDescription} onChange={e => setLateDescription(e.target.value)} placeholder="رقم الإيصال أو سبب المصروف المتأخر..." />
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
