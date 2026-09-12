import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { maritimeApi, ShippingLine } from '../api/maritime-freight.api';

interface PartnerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  partner?: ShippingLine | null;
  defaultType?: 'shipping_line' | 'overseas_agent';
}

const TRADE_LANE_OPTIONS = [
  { id: 'far_east', label: 'الصين والشرق الأقصى (Far East & China)' },
  { id: 'europe_med', label: 'أوروبا والبحر المتوسط (Europe & Mediterranean)' },
  { id: 'arabian_gulf', label: 'الخليج العربي والبحر الأحمر (Arabian Gulf & Red Sea)' },
  { id: 'americas', label: 'الأمريكتين (North & South America)' },
  { id: 'africa', label: 'أفريقيا (Sub-Saharan Africa)' },
  { id: 'indian_sub', label: 'شبه القارة الهندية (Indian Subcontinent)' },
];

const POPULAR_COUNTRIES = [
  { code: 'CN', name: 'الصين' },
  { code: 'TR', name: 'تركيا' },
  { code: 'EG', name: 'مصر' },
  { code: 'SA', name: 'المملكة العربية السعودية' },
  { code: 'AE', name: 'الإمارات العربية المتحدة' },
  { code: 'DE', name: 'ألمانيا' },
  { code: 'IT', name: 'إيطاليا' },
  { code: 'IN', name: 'الهند' },
  { code: 'US', name: 'الولايات المتحدة الأمريكية' },
];

export function PartnerFormModal({
  open,
  onClose,
  onSaved,
  partner,
  defaultType = 'shipping_line',
}: PartnerFormModalProps) {
  const [carrierType, setCarrierType] = useState<'shipping_line' | 'overseas_agent'>(defaultType);
  const [code, setCode] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [countryName, setCountryName] = useState('الصين');
  const [countryCode, setCountryCode] = useState('CN');
  const [cityName, setCityName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [rfqEmail, setRfqEmail] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [wechat, setWechat] = useState('');
  const [selectedTradeLanes, setSelectedTradeLanes] = useState<string[]>(['far_east']);
  const [servicesOffered, setServicesOffered] = useState('');
  const [supportedPorts, setSupportedPorts] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEditing = Boolean(partner?.id);

  useEffect(() => {
    if (open) {
      if (partner) {
        setCarrierType(partner.carrier_type || 'shipping_line');
        setCode(partner.code || '');
        setNameAr(partner.name_ar || '');
        setNameEn(partner.name_en || '');
        setCountryName(partner.country_name || (partner.carrier_type === 'shipping_line' ? 'مصر' : 'الصين'));
        setCountryCode(partner.country_code || (partner.carrier_type === 'shipping_line' ? 'EG' : 'CN'));
        setCityName(partner.city_name || '');
        setContactPerson(partner.contact_person || '');
        setEmail(partner.email || '');
        setRfqEmail(partner.rfq_email || '');
        setBookingEmail(partner.booking_email || '');
        setPhone(partner.phone || '');
        setWhatsapp(partner.whatsapp || '');
        setWechat(partner.wechat || '');
        setSelectedTradeLanes(partner.trade_lanes ? partner.trade_lanes.split(',').map((s) => s.trim()) : ['far_east']);
        setServicesOffered(partner.services_offered || '');
        setSupportedPorts(partner.supported_ports || '');
        setNotes(partner.notes || '');
      } else {
        setCarrierType(defaultType);
        setCode(defaultType === 'shipping_line' ? '' : `AGT-${Date.now().toString().slice(-4)}`);
        setNameAr('');
        setNameEn('');
        setCountryName(defaultType === 'shipping_line' ? 'مصر' : 'الصين');
        setCountryCode(defaultType === 'shipping_line' ? 'EG' : 'CN');
        setCityName('');
        setContactPerson('');
        setEmail('');
        setRfqEmail('');
        setBookingEmail('');
        setPhone('');
        setWhatsapp('');
        setWechat('');
        setSelectedTradeLanes(['far_east']);
        setServicesOffered(defaultType === 'shipping_line' ? 'FCL, Reefer, Dry' : 'FOB, EXW, FCL, LCL, Customs Clearance');
        setSupportedPorts('');
        setNotes('');
      }
      setErrorMsg(null);
    }
  }, [open, partner, defaultType]);

  const handleToggleTradeLane = (laneId: string) => {
    if (selectedTradeLanes.includes(laneId)) {
      setSelectedTradeLanes(selectedTradeLanes.filter((l) => l !== laneId));
    } else {
      setSelectedTradeLanes([...selectedTradeLanes, laneId]);
    }
  };

  const handleCountrySelect = (cCode: string) => {
    setCountryCode(cCode);
    const found = POPULAR_COUNTRIES.find((c) => c.code === cCode);
    if (found) setCountryName(found.name);
  };

  const handleSubmit = async () => {
    if (!code.trim() || !nameAr.trim()) {
      setErrorMsg('يرجى كتابة كود واسم الجهة بالعربية');
      return;
    }
    if (!rfqEmail.trim() && !email.trim()) {
      setErrorMsg('يرجى إدخال بريد إلكتروني رسمي لتلقي عروض الأسعار (RFQ Email)');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const payload = {
        code: code.trim().toUpperCase(),
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || nameAr.trim(),
        carrierType,
        tradeLanes: selectedTradeLanes.join(','),
        countryName: countryName.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        cityName: cityName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim() || undefined,
        rfqEmail: rfqEmail.trim() || email.trim(),
        bookingEmail: bookingEmail.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        wechat: wechat.trim() || undefined,
        servicesOffered: servicesOffered.trim() || undefined,
        supportedPorts: supportedPorts.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (isEditing && partner) {
        await maritimeApi.updateShippingLine(partner.id, payload);
      } else {
        await maritimeApi.createShippingLine(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل حفظ بيانات الشريك');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={
        isEditing
          ? `تعديل بيانات: ${partner?.name_ar}`
          : carrierType === 'shipping_line'
          ? 'إضافة خط ملاحي / توكيل معتمد (New Shipping Line)'
          : 'إضافة وكيل شحن خارجي شريك (New Overseas Partner Agent)'
      }
      subtitle="إدارة جهات الاتصال ومكاتب تسعير الشحنات لربطها بالإرسال الآلي لطلبات التسعير"
      width="min(800px, 95vw)"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitText={isEditing ? 'تحديث البيانات' : 'حفظ الشريك في الدليل'}
          isSubmitting={isSubmitting}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* نوع الشريك */}
        {!isEditing && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setCarrierType('shipping_line');
                setCountryName('مصر');
                setCountryCode('EG');
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: carrierType === 'shipping_line' ? '2px solid #170e5e' : '1px solid #e2e8f0',
                background: carrierType === 'shipping_line' ? '#eef2ff' : '#ffffff',
                color: carrierType === 'shipping_line' ? '#170e5e' : '#475569',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              خط ملاحي / توكيل خط (Shipping Line)
            </button>
            <button
              type="button"
              onClick={() => {
                setCarrierType('overseas_agent');
                setCountryName('الصين');
                setCountryCode('CN');
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: carrierType === 'overseas_agent' ? '2px solid #170e5e' : '1px solid #e2e8f0',
                background: carrierType === 'overseas_agent' ? '#eef2ff' : '#ffffff',
                color: carrierType === 'overseas_agent' ? '#170e5e' : '#475569',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              وكيل شحن خارجي بالخارج (Overseas Forwarding Agent)
            </button>
          </div>
        )}

        {/* البيانات الأساسية */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <Field label={carrierType === 'shipping_line' ? 'كود الخط الملاحي (SCAC) *' : 'كود الوكيل الفريد *'}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isEditing}
              placeholder={carrierType === 'shipping_line' ? 'مثال: MAEU, MSKU, COSU' : 'مثال: AGT-SHA01'}
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
            />
          </Field>

          <Field label="الاسم الرسمي بالعربية *">
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={carrierType === 'shipping_line' ? 'ميرسك لاين - توكيل مصر' : 'شنغهاي العالمية للوجستيات'}
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
            />
          </Field>

          <Field label="الاسم بالإنجليزية (Commercial Name)">
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Maersk Line Egypt / Shanghai Logistics"
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
            />
          </Field>
        </div>

        {/* الموقع الجغرافي والدولة */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <Field label="الدولة (Country)">
            <CustomSelect
              value={countryCode}
              onChange={(val) => handleCountrySelect(val || 'CN')}
              options={POPULAR_COUNTRIES.map((c) => ({
                value: c.code,
                label: `${c.name} (${c.code})`,
              }))}
            />
          </Field>

          <Field label="اسم الدولة المخصص">
            <input
              type="text"
              value={countryName}
              onChange={(e) => setCountryName(e.target.value)}
              placeholder="الصين، تركيا، ألمانيا..."
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
            />
          </Field>

          <Field label="المدينة / المركز اللوجستي">
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="شنغهاي، نينغبو، إسطنبول، هامبورغ، الإسكندرية..."
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
            />
          </Field>

          <Field label="اسم مسؤول الاتصال (Contact Person)">
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="David Wang / م. أحمد سالم"
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
            />
          </Field>
        </div>

        {/* بيانات البريد والتواصل */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#170e5e', marginBottom: '10px' }}>
            عناوين البريد الإلكتروني للربط مع الأتمتة (Email Desks)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <Field label="إيميل طلبات التسعير (RFQ Rates Email) *">
              <input
                type="email"
                value={rfqEmail}
                onChange={(e) => setRfqEmail(e.target.value)}
                placeholder="rates@carrier.com أو quotes@agent.cn"
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
              />
            </Field>

            <Field label="إيميل الحجوزات (Booking / Operations Email)">
              <input
                type="email"
                value={bookingEmail}
                onChange={(e) => setBookingEmail(e.target.value)}
                placeholder="booking@carrier.com"
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
              />
            </Field>

            <Field label="البريد العام / الدعم الفني">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@partner.com"
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '10px' }}>
            <Field label="رقم الهاتف المباشر">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+86 21 6888 1234"
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
              />
            </Field>

            <Field label="رقم الواتساب (WhatsApp)">
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+86 138 0000 0000"
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
              />
            </Field>

            <Field label="معرف وي شات (WeChat ID)">
              <input
                type="text"
                value={wechat}
                onChange={(e) => setWechat(e.target.value)}
                placeholder="wx_agent_china"
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
              />
            </Field>
          </div>
        </div>

        {/* الممرات الملاحية المدعومة (Trade Lanes) */}
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#170e5e', marginBottom: '8px' }}>
            الممرات الملاحية وقطاعات التسعير المغطاة (Trade Lanes)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
            {TRADE_LANE_OPTIONS.map((lane) => {
              const checked = selectedTradeLanes.includes(lane.id);
              return (
                <label
                  key={lane.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: checked ? '1px solid #170e5e' : '1px solid #e2e8f0',
                    background: checked ? '#eef2ff' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: checked ? 700 : 500,
                    color: checked ? '#170e5e' : '#334155',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleTradeLane(lane.id)}
                    style={{ accentColor: '#170e5e' }}
                  />
                  <span>{lane.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* الخدمات المدعومة والملاحظات */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <Field label="الخدمات اللوجستية المتاحة (Services)">
            <input
              type="text"
              value={servicesOffered}
              onChange={(e) => setServicesOffered(e.target.value)}
              placeholder="FCL, LCL, Door Delivery, Customs Clearance, Inland Trucking"
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
            />
          </Field>

          <Field label="الموانئ الرئيسية المدعومة (UN/LOCODEs)">
            <input
              type="text"
              value={supportedPorts}
              onChange={(e) => setSupportedPorts(e.target.value)}
              placeholder="CNSHA, CNNGB, CNING, EGALY, EGPSD"
              style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
            />
          </Field>
        </div>

        <Field label="ملاحظات وشروط خاصة">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مواعيد دوام مكتب الصين، شروط سداد النولون، اتفاقيات أسعار خاصة..."
            style={{ width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '0.84rem' }}
          />
        </Field>
      </div>
    </StandardDialog>
  );
}
