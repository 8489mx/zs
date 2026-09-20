import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { maritimeApi, ShippingLine } from '../api/maritime-freight.api';

interface PartnerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  partner?: ShippingLine | null;
  defaultType?: 'shipping_line' | 'overseas_agent' | 'airline' | 'trucking';
}

const TRADE_LANE_OPTIONS = [
  { id: 'far_east', label: 'الصين والشرق الأقصى (Far East & China)' },
  { id: 'europe_med', label: 'أوروبا والمتوسط (Europe & Med)' },
  { id: 'arabian_gulf', label: 'الخليج والبحر الأحمر (Gulf & Red Sea)' },
  { id: 'indian_sub', label: 'شبه القارة الهندية (Indian Sub)' },
  { id: 'americas', label: 'الأمريكتين (Americas)' },
  { id: 'africa', label: 'أفريقيا (Africa)' },
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
  { code: 'ES', name: 'إسبانيا' },
  { code: 'FR', name: 'فرنسا' },
  { code: 'GB', name: 'المملكة المتحدة' },
  { code: 'JP', name: 'اليابان' },
  { code: 'KR', name: 'كوريا الجنوبية' },
  { code: 'SG', name: 'سنغافورة' },
  { code: 'MY', name: 'ماليزيا' },
  { code: 'VN', name: 'فيتنام' },
  { code: 'OTHER', name: 'دولة أخرى' },
];

export function PartnerFormModal({
  open,
  onClose,
  onSaved,
  partner,
  defaultType = 'shipping_line',
}: PartnerFormModalProps) {
  const [carrierType, setCarrierType] = useState<'shipping_line' | 'overseas_agent' | 'airline' | 'trucking'>(defaultType);
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
      width="min(980px, 96vw)"
      minHeight="auto"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitText={isEditing ? 'تحديث البيانات' : 'حفظ الشريك في الدليل'}
          isSubmitting={isSubmitting}
        />
      }
    >
      <style>{`
        .partner-compact-modal .field {
          margin-bottom: 0 !important;
          gap: 2px !important;
        }
        .partner-compact-modal .field span {
          font-size: 0.72rem !important;
          font-weight: 600 !important;
          color: #475569 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .partner-compact-modal input {
          height: 29px !important;
          font-size: 0.78rem !important;
          border-radius: 6px !important;
          padding: 0 8px !important;
          border: 1px solid #cbd5e1 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          outline: none !important;
        }
        .partner-compact-modal input:focus {
          border-color: #170e5e !important;
          box-shadow: 0 0 0 1px #170e5e !important;
        }
        .partner-compact-modal .custom-combobox,
        .partner-compact-modal .custom-select-trigger {
          min-height: 29px !important;
          height: 29px !important;
          font-size: 0.78rem !important;
          padding: 0 8px !important;
          border-radius: 6px !important;
        }
      `}</style>

      <div className="partner-compact-modal" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} dir="rtl">
        {errorMsg && (
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* 1. نوع الشريك - تبديل مدمج ناعم */}
        {!isEditing && (
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setCarrierType('shipping_line');
                setCountryName('مصر');
                setCountryCode('EG');
              }}
              style={{
                flex: 1,
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                background: carrierType === 'shipping_line' ? '#170e5e' : 'transparent',
                color: carrierType === 'shipping_line' ? '#ffffff' : '#475569',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <AppIcons.Ship size={14} />
              <span>خط ملاحي / توكيل معتمد (Shipping Line)</span>
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
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                background: carrierType === 'overseas_agent' ? '#170e5e' : 'transparent',
                color: carrierType === 'overseas_agent' ? '#ffffff' : '#475569',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <AppIcons.Users size={14} />
              <span>وكيل شحن خارجي بالخارج (Overseas Forwarding Agent)</span>
            </button>
          </div>
        )}

        {/* 2. الصف الأول: الهوية الأساسية ومسؤول الاتصال */}
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1.4fr 1.4fr 1.2fr', gap: '8px' }}>
          <Field label={carrierType === 'shipping_line' ? 'كود الخط (SCAC) *' : 'كود الوكيل *'}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isEditing}
              placeholder={carrierType === 'shipping_line' ? 'مثال: MAEU' : 'مثال: AGT-SHA01'}
            />
          </Field>

          <Field label="الاسم الرسمي بالعربية *">
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={carrierType === 'shipping_line' ? 'ميرسك لاين - توكيل مصر' : 'شنغهاي العالمية للوجستيات'}
            />
          </Field>

          <Field label="الاسم بالإنجليزية (Commercial Name)">
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Maersk Line Egypt / Shanghai Logistics"
            />
          </Field>

          <Field label="مسؤول الاتصال (Contact Person)">
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="David Wang / م. أحمد سالم"
            />
          </Field>
        </div>

        {/* 3. الصف الثاني: الدولة والموقع والخدمات والموانئ */}
        <div style={{ display: 'grid', gridTemplateColumns: '130px 120px 1.1fr 1.3fr 1.4fr', gap: '8px' }}>
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
              placeholder="الصين، مصر..."
            />
          </Field>

          <Field label="المدينة / المركز اللوجستي">
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="شنغهاي، إسطنبول، الإسكندرية..."
            />
          </Field>

          <Field label="الخدمات المتاحة (Services)">
            <input
              type="text"
              value={servicesOffered}
              onChange={(e) => setServicesOffered(e.target.value)}
              placeholder="FCL, LCL, Door, Clearance, Inland"
            />
          </Field>

          <Field label="الموانئ المدعومة (UN/LOCODEs)">
            <input
              type="text"
              value={supportedPorts}
              onChange={(e) => setSupportedPorts(e.target.value)}
              placeholder="CNSHA, CNNGB, EGALY, EGPSD"
            />
          </Field>
        </div>

        {/* 4. بطاقة التواصل والبريد الإلكتروني للربط مع الأتمتة */}
        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: '0.76rem', color: '#170e5e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AppIcons.Mail size={13} />
            <span>عناوين البريد الإلكتروني للربط مع الأتمتة وأرقام التواصل (Email Desks & Communication)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
            <Field label="إيميل طلبات التسعير (RFQ Rates Email) *">
              <input
                type="email"
                value={rfqEmail}
                onChange={(e) => setRfqEmail(e.target.value)}
                placeholder="rates@carrier.com أو quotes@agent.cn"
              />
            </Field>

            <Field label="إيميل الحجوزات والعمليات (Booking / Operations Email)">
              <input
                type="email"
                value={bookingEmail}
                onChange={(e) => setBookingEmail(e.target.value)}
                placeholder="booking@carrier.com"
              />
            </Field>

            <Field label="البريد العام / الدعم الفني (General Support)">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@partner.com"
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '6px' }}>
            <Field label="رقم الهاتف المباشر (Direct Phone)">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+86 21 6888 1234"
              />
            </Field>

            <Field label="رقم الواتساب (WhatsApp)">
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+86 138 0000 0000"
              />
            </Field>

            <Field label="معرف وي شات (WeChat ID)">
              <input
                type="text"
                value={wechat}
                onChange={(e) => setWechat(e.target.value)}
                placeholder="wx_agent_china"
              />
            </Field>
          </div>
        </div>

        {/* 5. الممرات الملاحية المغطاة (3 أعمدة × صفين) */}
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.76rem', color: '#170e5e', marginBottom: '5px' }}>
            الممرات الملاحية وقطاعات التسعير المغطاة (Trade Lanes)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {TRADE_LANE_OPTIONS.map((lane) => {
              const checked = selectedTradeLanes.includes(lane.id);
              return (
                <label
                  key={lane.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: checked ? '1px solid #170e5e' : '1px solid #e2e8f0',
                    background: checked ? '#eef2ff' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: checked ? 700 : 500,
                    color: checked ? '#170e5e' : '#334155',
                    userSelect: 'none',
                    boxSizing: 'border-box',
                    height: '26px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleTradeLane(lane.id)}
                    style={{ accentColor: '#170e5e', cursor: 'pointer', margin: 0 }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lane.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 6. ملاحظات وشروط خاصة */}
        <div>
          <Field label="شروط واتفاقيات خاصة أو ملاحظات (Special Terms / Notes)">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مواعيد دوام مكتب الصين، شروط سداد النولون، اتفاقيات أسعار خاصة..."
            />
          </Field>
        </div>
      </div>
    </StandardDialog>
  );
}
