import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { ComboboxSelect } from '@/shared/ui/ComboboxSelect';
import { CustomSelect } from '@/shared/ui/custom-select';
import { maritimeApi, ShippingPort } from '../api/maritime-freight.api';
import { customersApi, Customer } from '@/features/customers/api/customers.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { useMaritime } from '../context/MaritimeContext';

interface CreateInquiryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (newInquiry: any) => void;
}

export function CreateInquiryModal({ open, onClose, onCreated }: CreateInquiryModalProps) {
  const { pipelineConfig } = useMaritime();
  const enableSeaFreight = pipelineConfig?.enableSeaFreight !== false;
  const enableAirFreight = pipelineConfig?.enableAirFreight !== false;
  const enableRoadFreight = pipelineConfig?.enableRoadFreight !== false;
  const activeModesCount = (enableSeaFreight ? 1 : 0) + (enableAirFreight ? 1 : 0) + (enableRoadFreight ? 1 : 0);

  const [ports, setPorts] = useState<ShippingPort[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    transportMode: (enableSeaFreight ? 'sea' : enableAirFreight ? 'air' : 'road') as 'sea' | 'air' | 'road',
    airCargoType: 'general',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    direction: 'import' as 'import' | 'export' | 'cross_trade',
    polCode: 'CNSHA',
    polName: 'ميناء شنغهاي - الصين',
    podCode: 'EGALY',
    podName: 'ميناء الإسكندرية - مصر',
    incoterm: 'FOB',
    cargoMode: 'FCL',
    containerType: '40HC',
    containerCount: 1,
    commodityDescription: '',
    cargoNature: 'general',
    grossWeightKg: 0,
    volumetricWeightKg: 0,
    chargeableWeightKg: 0,
    cbm: 0,
    packageCount: 1,
    cargoReadyDate: '',
    targetDeliveryDate: '',
    targetFreeDays: 14,
    paymentTerm: 'prepaid' as 'prepaid' | 'collect',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      maritimeApi.getPorts().then(setPorts).catch(() => {});
      customersApi.list().then((data) => {
        if (Array.isArray(data)) setCustomers(data);
      }).catch(() => {});

      if (!enableSeaFreight && formData.transportMode === 'sea') {
        if (enableAirFreight) handleModeChange('air');
        else if (enableRoadFreight) handleModeChange('road');
      } else if (!enableAirFreight && formData.transportMode === 'air') {
        if (enableSeaFreight) handleModeChange('sea');
        else if (enableRoadFreight) handleModeChange('road');
      } else if (!enableRoadFreight && formData.transportMode === 'road') {
        if (enableSeaFreight) handleModeChange('sea');
        else if (enableAirFreight) handleModeChange('air');
      }
    }
  }, [open, enableSeaFreight, enableAirFreight, enableRoadFreight]);

  const handleModeChange = (mode: 'sea' | 'air' | 'road') => {
    if (mode === 'air') {
      const vol = Math.round(Number(formData.cbm || 0) * 166.667 * 10) / 10;
      const chg = Math.max(Number(formData.grossWeightKg || 0), vol);
      setFormData((prev) => ({
        ...prev,
        transportMode: 'air',
        polCode: 'CAI',
        polName: 'مطار القاهرة الدولي لشحن البضائع (CAI)',
        podCode: 'DXB',
        podName: 'مطار دبي الدولي للشحن (DXB)',
        incoterm: 'FCA',
        volumetricWeightKg: vol,
        chargeableWeightKg: chg,
      }));
    } else if (mode === 'road') {
      setFormData((prev) => ({
        ...prev,
        transportMode: 'road',
        polCode: 'EGALY',
        polName: 'ميناء الإسكندرية الجاف',
        podCode: 'CAI',
        podName: 'المنطقة اللوجستية بالعاشر من رمضان',
        incoterm: 'CPT',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        transportMode: 'sea',
        polCode: 'CNSHA',
        polName: 'ميناء شنغهاي - الصين',
        podCode: 'EGALY',
        podName: 'ميناء الإسكندرية - مصر',
        incoterm: 'FOB',
      }));
    }
  };

  const handleCbmChange = (cbmVal: number) => {
    const vol = Math.round(cbmVal * 166.667 * 10) / 10;
    const chg = Math.max(Number(formData.grossWeightKg || 0), vol);
    setFormData((prev) => ({
      ...prev,
      cbm: cbmVal,
      volumetricWeightKg: vol,
      chargeableWeightKg: chg,
    }));
  };

  const handleGrossWeightChange = (grossVal: number) => {
    const vol = Number(formData.volumetricWeightKg || 0);
    const chg = Math.max(grossVal, vol);
    setFormData((prev) => ({
      ...prev,
      grossWeightKg: grossVal,
      chargeableWeightKg: chg,
    }));
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const selected = customers.find((c) => String(c.id) === customerId) as any;
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        customerName: selected.company_name || selected.name || prev.customerName,
        customerPhone: selected.phone || prev.customerPhone,
        customerEmail: selected.email || prev.customerEmail,
      }));
    }
  };

  const handlePolChange = (code: string) => {
    const p = ports.find((item) => item.code === code);
    setFormData({
      ...formData,
      polCode: code,
      polName: p ? `${p.name_ar} (${p.country_name})` : code,
    });
  };

  const handlePodChange = (code: string) => {
    const p = ports.find((item) => item.code === code);
    setFormData({
      ...formData,
      podCode: code,
      podName: p ? `${p.name_ar} (${p.country_name})` : code,
    });
  };

  const handleSubmit = async () => {
    if (!formData.customerName.trim()) {
      setErrorMsg('يرجى إدخال اسم العميل أو الشركة');
      return;
    }
    if (!formData.polCode || !formData.podCode) {
      setErrorMsg(formData.transportMode === 'air' ? 'يرجى تحديد مطار الإقلاع ومطار المقصد' : 'يرجى تحديد ميناء الشحن وميناء المقصد');
      return;
    }
    if (!formData.commodityDescription.trim()) {
      setErrorMsg('يرجى إدخال توصيف البضاعة');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const payload: any = {
        ...formData,
        grossWeightKg: Number(formData.grossWeightKg || 0),
        cbm: Number(formData.cbm || 0),
        volumetricWeightKg: Number(formData.volumetricWeightKg || 0),
        chargeableWeightKg: Number(formData.chargeableWeightKg || 0),
        packageCount: Number(formData.packageCount || 1),
      };
      const res = await maritimeApi.createInquiry(payload);
      onCreated(res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل تسجيل طلب الشحن');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="طلب شحن واستفسار عميل جديد (New Freight Inquiry)"
      subtitle="نقطة الانطلاق لتسجيل طلب العميل وتمريره لاحقاً لطلب عروض تسعير الخطوط بنقرة واحدة"
      width="min(980px, 96vw)"
      minHeight="auto"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitText="حفظ طلب الشحن"
          cancelText="إلغاء"
        />
      )}
    >
      <style>{`
        .inquiry-compact-modal .field {
          margin-bottom: 0 !important;
          gap: 3px !important;
        }
        .inquiry-compact-modal .field span {
          font-size: 0.74rem !important;
          font-weight: 600 !important;
          color: #334155 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .inquiry-compact-modal input {
          height: 33px !important;
          font-size: 0.8125rem !important;
          border-radius: 6px !important;
          padding: 0 10px !important;
        }
        .inquiry-compact-modal .custom-combobox,
        .inquiry-compact-modal .custom-select-trigger {
          min-height: 33px !important;
          height: 33px !important;
          font-size: 0.8125rem !important;
          border-radius: 6px !important;
        }
      `}</style>
      <div className="inquiry-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {errorMsg && (
          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.8rem' }}>
            {errorMsg}
          </div>
        )}

        {/* نمط وسيلة النقل: بحري / جوي / بري */}
        {activeModesCount > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '8px' }}>
            {enableSeaFreight && (
              <button
                type="button"
                onClick={() => handleModeChange('sea')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: formData.transportMode === 'sea' ? '#170e5e' : 'transparent',
                  color: formData.transportMode === 'sea' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Ship size={15} />
                <span>شحن بحري (Ocean Freight)</span>
              </button>
            )}
            {enableAirFreight && (
              <button
                type="button"
                onClick={() => handleModeChange('air')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: formData.transportMode === 'air' ? '#170e5e' : 'transparent',
                  color: formData.transportMode === 'air' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Plane size={15} />
                <span>شحن جوي (Air Freight / AWB)</span>
              </button>
            )}
            {enableRoadFreight && (
              <button
                type="button"
                onClick={() => handleModeChange('road')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: formData.transportMode === 'road' ? '#170e5e' : 'transparent',
                  color: formData.transportMode === 'road' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <AppIcons.Truck size={15} />
                <span>شحن بري (Road Freight)</span>
              </button>
            )}
          </div>
        )}

        {/* 1. بيانات العميل */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Users size={15} />
            <span>1. بيانات العميل أو المستورد (Customer Profile)</span>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <Field label="اختيار عميل مسجل من الدليل (Customer Lookup) - اختياري">
              <CustomSelect
                value={selectedCustomerId}
                onChange={handleCustomerChange}
                placeholder="اختر عميلاً مسجلاً لجلب بياناته تلقائياً أو أدخل البيانات يدوياً أدناه..."
                options={[
                  { value: '', label: '— إدخال يدوي / عميل جديد —' },
                  ...customers.map((c: any) => ({
                    value: String(c.id),
                    label: `${c.company_name ? `${c.company_name} - ` : ''}${c.name || 'عميل'}${c.phone ? ` (${c.phone})` : ''}`,
                  })),
                ]}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr', gap: '10px' }}>
            <Field label="اسم العميل أو الشركة *">
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="مثال: شركة الأفق للاستيراد والتصدير"
                style={{ width: '100%', border: '1px solid #cbd5e1' }}
              />
            </Field>

            <Field label="رقم الهاتف أو الواتساب">
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="01012345678"
                style={{ width: '100%', border: '1px solid #cbd5e1' }}
              />
            </Field>

            <Field label="البريد الإلكتروني للعميل">
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                placeholder="client@alofok.com"
                style={{ width: '100%', border: '1px solid #cbd5e1' }}
              />
            </Field>
          </div>
        </div>

        {/* 2. مسار الشحن والموانئ / المطارات */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            {formData.transportMode === 'air' ? <AppIcons.Plane size={15} /> : formData.transportMode === 'road' ? <AppIcons.Truck size={15} /> : <AppIcons.Ship size={15} />}
            <span>
              2. {formData.transportMode === 'air' ? 'مسار الشحن الجوي والمطارات (Route & Airports)' : formData.transportMode === 'road' ? 'مسار النقل البري والمحطات (Route & Terminals)' : 'مسار الشحن والموانئ المستهدفة (Route & Ports)'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1.6fr 1.6fr', gap: '10px' }}>
            <Field label="اتجاه الشحنة *">
              <CustomSelect
                value={formData.direction}
                onChange={(val) => setFormData({ ...formData, direction: val as any })}
                options={[
                  { value: 'import', label: 'شحن وارد (Import)' },
                  { value: 'export', label: 'شحن صادر (Export)' },
                  { value: 'cross_trade', label: 'شحن وسيط (Cross-Trade)' },
                ]}
              />
            </Field>

            <Field label="شرط التسليم (Incoterm) *">
              <CustomSelect
                value={formData.incoterm}
                onChange={(val) => setFormData({ ...formData, incoterm: val })}
                options={
                  formData.transportMode === 'air'
                    ? [
                        { value: 'FCA', label: 'FCA - تسليم للناقل الجوي' },
                        { value: 'CPT', label: 'CPT - النولون مدفوع حتى' },
                        { value: 'CIP', label: 'CIP - النولون والتأمين مدفوعان' },
                        { value: 'DAP', label: 'DAP - محل الوصول' },
                        { value: 'DDP', label: 'DDP - خالص الجمارك' },
                        { value: 'EXW', label: 'EXW - أرض المصنع' },
                      ]
                    : formData.transportMode === 'road'
                    ? [
                        { value: 'CPT', label: 'CPT - النولون مدفوع حتى' },
                        { value: 'CIP', label: 'CIP - النولون والتأمين' },
                        { value: 'FCA', label: 'FCA - تسليم للناقل' },
                        { value: 'DAP', label: 'DAP - محل الوصول' },
                        { value: 'DDP', label: 'DDP - خالص الجمارك' },
                        { value: 'EXW', label: 'EXW - أرض المصنع' },
                      ]
                    : [
                        { value: 'FOB', label: 'FOB - على ظهر السفينة' },
                        { value: 'EXW', label: 'EXW - أرض المصنع' },
                        { value: 'CFR', label: 'CFR - التكلفة والنولون' },
                        { value: 'CIF', label: 'CIF - شامل التأمين والنولون' },
                        { value: 'DDP', label: 'DDP - خالص الجمارك' },
                        { value: 'DAP', label: 'DAP - محل الوصول' },
                      ]
                }
              />
            </Field>

            <Field label={formData.transportMode === 'air' ? 'مطار الإقلاع والشحن *' : formData.transportMode === 'road' ? 'نقطة الانطلاق والتحميل *' : 'ميناء الشحن والتحميل (POL) *'}>
              <ComboboxSelect
                value={formData.polCode}
                onChange={handlePolChange}
                options={ports
                  .filter((p) => {
                    if (formData.transportMode === 'air') return p.port_type === 'air' || p.iata_code;
                    if (formData.transportMode === 'road') return p.port_type === 'road' || true;
                    return !p.port_type || p.port_type === 'sea';
                  })
                  .map((p) => ({
                    id: p.code,
                    label: `${p.name_ar} (${p.code})`,
                  }))}
                placeholder={formData.transportMode === 'air' ? 'ابحث عن مطار الإقلاع أو الكود...' : 'ابحث عن ميناء الشحن أو الكود...'}
              />
            </Field>

            <Field label={formData.transportMode === 'air' ? 'مطار الوصول والمقصد *' : formData.transportMode === 'road' ? 'نقطة الوصول والتسليم *' : 'ميناء التفريغ والمقصد (POD) *'}>
              <ComboboxSelect
                value={formData.podCode}
                onChange={handlePodChange}
                options={ports
                  .filter((p) => {
                    if (formData.transportMode === 'air') return p.port_type === 'air' || p.iata_code;
                    if (formData.transportMode === 'road') return p.port_type === 'road' || true;
                    return !p.port_type || p.port_type === 'sea';
                  })
                  .map((p) => ({
                    id: p.code,
                    label: `${p.name_ar} (${p.code})`,
                  }))}
                placeholder={formData.transportMode === 'air' ? 'ابحث عن مطار الوصول أو الكود...' : 'ابحث عن ميناء التفريغ أو الكود...'}
              />
            </Field>
          </div>
        </div>

        {/* 3. مواصفات البضاعة والحاويات / الشحن الجوي */}
        <div style={{ background: '#f8fafc', padding: '9px 13px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            {formData.transportMode === 'air' ? <AppIcons.Plane size={15} /> : <AppIcons.Container size={15} />}
            <span>
              3. {formData.transportMode === 'air' ? 'مواصفات البضاعة والشحن الجوي IATA (Air Cargo Specs)' : formData.transportMode === 'road' ? 'مواصفات البضاعة وتجهيز الشاحنات (Road Specs)' : 'مواصفات البضاعة وتجهيز الحاويات (Cargo & Equipment)'}
            </span>
          </div>

          {formData.transportMode === 'air' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr 1.1fr 1.1fr', gap: '10px', marginBottom: '8px' }}>
              <Field label="نوع البضاعة الجوية *">
                <CustomSelect
                  value={formData.airCargoType}
                  onChange={(val) => setFormData({ ...formData, airCargoType: val })}
                  options={[
                    { value: 'general', label: 'بضائع عامة (General Cargo)' },
                    { value: 'perishable', label: 'سريعة التلف (Perishable)' },
                    { value: 'dangerous_goods', label: 'بضائع خطرة (DG Cargo)' },
                    { value: 'pharma', label: 'أدوية ومستحضرات طبية (Pharma)' },
                    { value: 'valuable', label: 'بضائع ثمينة (Valuable)' },
                  ]}
                />
              </Field>

              <Field label="عدد الطرود *">
                <input
                  type="number"
                  min={1}
                  value={formData.packageCount}
                  onChange={(e) => setFormData({ ...formData, packageCount: parseInt(e.target.value, 10) || 1 })}
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="الوزن القائم (كجم) *">
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={formData.grossWeightKg || ''}
                  onChange={(e) => handleGrossWeightChange(parseFloat(e.target.value) || 0)}
                  placeholder="مثال: 450"
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="الحجم (CBM) *">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.cbm || ''}
                  onChange={(e) => handleCbmChange(parseFloat(e.target.value) || 0)}
                  placeholder="مثال: 3.2"
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="الوزن الحجمي (IATA)">
                <input
                  type="text"
                  readOnly
                  value={`${formData.volumetricWeightKg || 0} كجم`}
                  title="محسوب تلقائياً: 1 CBM = 166.67 كجم"
                  style={{ width: '100%', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}
                />
              </Field>

              <Field label="الوزن المحاسبي (Chargeable)">
                <input
                  type="text"
                  readOnly
                  value={`${formData.chargeableWeightKg || 0} كجم`}
                  title="الوزن الخاضع للتحصيل: الأكبر بين الوزن القائم والوزن الحجمي"
                  style={{ width: '100%', border: '1px solid #86efac', background: '#f0fdf4', color: '#15803d', fontWeight: 800 }}
                />
              </Field>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 0.8fr 0.9fr 1fr 0.9fr', gap: '10px', marginBottom: '8px' }}>
              <Field label={formData.transportMode === 'road' ? 'نوع النقل *' : 'نمط الشحن *'}>
                <CustomSelect
                  value={formData.cargoMode}
                  onChange={(val) => setFormData({ ...formData, cargoMode: val })}
                  options={
                    formData.transportMode === 'road'
                      ? [
                          { value: 'FTL', label: 'FTL - شاحنة كاملة' },
                          { value: 'LTL', label: 'LTL - حمولة جزئية' },
                        ]
                      : [
                          { value: 'FCL', label: 'FCL - حاوية كاملة' },
                          { value: 'LCL', label: 'LCL - شحن مجزأ' },
                        ]
                  }
                />
              </Field>

              <Field label={formData.transportMode === 'road' ? 'نوع الشاحنة *' : 'نوع الحاوية *'}>
                <CustomSelect
                  value={formData.containerType}
                  onChange={(val) => setFormData({ ...formData, containerType: val })}
                  options={
                    formData.transportMode === 'road'
                      ? [
                          { value: 'Curtain', label: 'تريلا ستارة (Curtain)' },
                          { value: 'Box', label: 'صندوق مغلق (Box)' },
                          { value: 'Reefer', label: 'شاحنة مبردة (Reefer)' },
                          { value: 'Flatbed', label: 'شاحنة مسطحة (Flatbed)' },
                        ]
                      : [
                          { value: '40HC', label: "40' High Cube (40HC)" },
                          { value: '20GP', label: "20' Dry (20GP)" },
                          { value: '40GP', label: "40' Dry (40GP)" },
                          { value: '40RF', label: "40' Reefer مبرد" },
                          { value: '20RF', label: "20' Reefer مبرد" },
                          { value: '45HC', label: "45' High Cube" },
                          { value: 'OpenTop', label: 'Open Top' },
                          { value: 'FlatRack', label: 'Flat Rack' },
                        ]
                  }
                />
              </Field>

              <Field label={formData.transportMode === 'road' ? 'عدد الشاحنات *' : 'عدد الحاويات *'}>
                <input
                  type="number"
                  min={1}
                  value={formData.containerCount}
                  onChange={(e) => setFormData({ ...formData, containerCount: parseInt(e.target.value, 10) || 1 })}
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="أيام السماح (يوم)">
                <input
                  type="number"
                  min={7}
                  value={formData.targetFreeDays}
                  onChange={(e) => setFormData({ ...formData, targetFreeDays: parseInt(e.target.value, 10) || 14 })}
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="الوزن القائم (كجم)">
                <input
                  type="number"
                  min={0}
                  value={formData.grossWeightKg}
                  onChange={(e) => setFormData({ ...formData, grossWeightKg: parseFloat(e.target.value) || 0 })}
                  placeholder="22000"
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>

              <Field label="الحجم (CBM)">
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={formData.cbm}
                  onChange={(e) => setFormData({ ...formData, cbm: parseFloat(e.target.value) || 0 })}
                  placeholder="68"
                  style={{ width: '100%', border: '1px solid #cbd5e1' }}
                />
              </Field>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            <Field label="توصيف البضاعة والصنف (Commodity) *">
              <input
                type="text"
                value={formData.commodityDescription}
                onChange={(e) => setFormData({ ...formData, commodityDescription: e.target.value })}
                placeholder="مثال: أدوات ومعدات كهربائية، قطع غيار، أقمشة ومنسوجات، مواد غذائية..."
                style={{ width: '100%', border: '1px solid #cbd5e1' }}
              />
            </Field>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
