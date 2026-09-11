import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { ComboboxSelect } from '@/shared/ui/ComboboxSelect';
import { maritimeApi, ShippingPort } from '../api/maritime-freight.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface CreateInquiryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (newInquiry: any) => void;
}

export function CreateInquiryModal({ open, onClose, onCreated }: CreateInquiryModalProps) {
  const [ports, setPorts] = useState<ShippingPort[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
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
    cbm: 0,
    cargoReadyDate: '',
    targetDeliveryDate: '',
    targetFreeDays: 14,
    paymentTerm: 'prepaid' as 'prepaid' | 'collect',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      maritimeApi.getPorts().then(setPorts).catch(() => {});
    }
  }, [open]);

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
      setErrorMsg('يرجى تحديد ميناء الشحن وميناء المقصد');
      return;
    }
    if (!formData.commodityDescription.trim()) {
      setErrorMsg('يرجى إدخال توصيف البضاعة');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = await maritimeApi.createInquiry(formData);
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
      subtitle="نقطة الانطلاق لتسجيل طلب العميل وتمريره لاحقاً لاستقصاء أسعار الخطوط بنقرة واحدة"
      width="min(860px, 95vw)"
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {errorMsg && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}

        {/* 1. بيانات العميل */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#170e5e', fontWeight: 700, fontSize: '0.9rem' }}>
            <AppIcons.Users size={18} />
            <span>1. بيانات العميل أو المستورد (Customer Profile)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <Field label="اسم العميل أو الشركة *">
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="مثال: شركة الأفق للاستيراد والتصدير"
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="رقم الهاتف أو الواتساب">
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="01012345678"
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="البريد الإلكتروني للعميل">
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                placeholder="client@alofok.com"
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>
          </div>
        </div>

        {/* 2. مسار الشحن والموانئ */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#170e5e', fontWeight: 700, fontSize: '0.9rem' }}>
            <AppIcons.Ship size={18} />
            <span>2. مسار الشحن والموانئ المستهدفة (Route & Ports)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="اتجاه الشحنة *">
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value as any })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                <option value="import">شحن وارد (Import - إلى الموانئ المحلية)</option>
                <option value="export">شحن صادر (Export - إلى الموانئ الدولية)</option>
                <option value="cross_trade">شحن وسيط (Cross-Trade - بين دولتين خارجيتين)</option>
              </select>
            </Field>

            <Field label="شرط التسليم الدولي (Incoterm) *">
              <select
                value={formData.incoterm}
                onChange={(e) => setFormData({ ...formData, incoterm: e.target.value })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                <option value="FOB">FOB - تسليم على ظهر السفينة (Free on Board)</option>
                <option value="EXW">EXW - تسليم أرض المصنع (Ex Works)</option>
                <option value="CFR">CFR - التكلفة والنولون (Cost & Freight)</option>
                <option value="CIF">CIF - التكلفة والتأمين والنولون (Cost, Insurance & Freight)</option>
                <option value="DDP">DDP - تسليم خالص الرسوم الجمركية (Delivered Duty Paid)</option>
                <option value="DAP">DAP - تسليم في المكان المعين (Delivered at Place)</option>
              </select>
            </Field>

            <Field label="ميناء الشحن والتحميل (POL) *">
              <ComboboxSelect
                value={formData.polCode}
                onChange={handlePolChange}
                options={ports.map((p) => ({
                  id: p.code,
                  label: `${p.name_ar} - ${p.country_name} (${p.code})`,
                }))}
                placeholder="ابحث عن ميناء الشحن أو الكود..."
              />
            </Field>

            <Field label="ميناء التفريغ والمقصد (POD) *">
              <ComboboxSelect
                value={formData.podCode}
                onChange={handlePodChange}
                options={ports.map((p) => ({
                  id: p.code,
                  label: `${p.name_ar} - ${p.country_name} (${p.code})`,
                }))}
                placeholder="ابحث عن ميناء التفريغ أو الكود..."
              />
            </Field>
          </div>
        </div>

        {/* 3. مواصفات البضاعة والحاويات */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#170e5e', fontWeight: 700, fontSize: '0.9rem' }}>
            <AppIcons.Container size={18} />
            <span>3. مواصفات البضاعة وتجهيز الحاويات (Cargo & Equipment)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <Field label="نمط الشحن *">
              <select
                value={formData.cargoMode}
                onChange={(e) => setFormData({ ...formData, cargoMode: e.target.value })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                <option value="FCL">FCL - حمولة حاوية كاملة</option>
                <option value="LCL">LCL - حمولة مجزأة</option>
              </select>
            </Field>

            <Field label="نوع الحاوية *">
              <select
                value={formData.containerType}
                onChange={(e) => setFormData({ ...formData, containerType: e.target.value })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              >
                <option value="40HC">40' High Cube (40HC)</option>
                <option value="20GP">20' Standard Dry (20GP)</option>
                <option value="40GP">40' Standard Dry (40GP)</option>
                <option value="40RF">40' Reefer مبرد</option>
                <option value="20RF">20' Reefer مبرد</option>
                <option value="45HC">45' High Cube</option>
                <option value="OpenTop">Open Top</option>
                <option value="FlatRack">Flat Rack</option>
              </select>
            </Field>

            <Field label="عدد الحاويات *">
              <input
                type="number"
                min={1}
                value={formData.containerCount}
                onChange={(e) => setFormData({ ...formData, containerCount: parseInt(e.target.value, 10) || 1 })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="فترة السماح المطلوبة (يوم)">
              <input
                type="number"
                min={7}
                value={formData.targetFreeDays}
                onChange={(e) => setFormData({ ...formData, targetFreeDays: parseInt(e.target.value, 10) || 14 })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="الوزن القائم التقديري (كجم)">
              <input
                type="number"
                min={0}
                value={formData.grossWeightKg}
                onChange={(e) => setFormData({ ...formData, grossWeightKg: parseFloat(e.target.value) || 0 })}
                placeholder="22000"
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>

            <Field label="الحجم الكلي (CBM)">
              <input
                type="number"
                min={0}
                step="0.1"
                value={formData.cbm}
                onChange={(e) => setFormData({ ...formData, cbm: parseFloat(e.target.value) || 0 })}
                placeholder="68"
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>
          </div>

          <div style={{ marginTop: '12px' }}>
            <Field label="توصيف البضاعة والصنف (Commodity) *">
              <input
                type="text"
                value={formData.commodityDescription}
                onChange={(e) => setFormData({ ...formData, commodityDescription: e.target.value })}
                placeholder="مثال: أدوات ومعدات كهربائية، قطع غيار، أقمشة ومنسوجات، مواد غذائية..."
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </Field>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
