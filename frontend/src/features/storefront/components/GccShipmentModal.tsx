import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  gccShippingApi,
  GccCarrier,
  GccShipmentResult,
} from '../api/gcc-shipping.api';
import { OnlineOrderRecord } from '../types/storefront.types';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import {
  TruckIcon,
  XIcon,
  PackageIcon,
  PrinterIcon,
  RefreshCwIcon,
  CheckIcon,
  CreditCardIcon,
  DollarSignIcon,
  AlertTriangleIcon,
  CopyIcon,
} from '@/shared/components/icons/AppIcons';

interface GccShipmentModalProps {
  order: OnlineOrderRecord;
  onClose: () => void;
  onSuccess?: (result: GccShipmentResult) => void;
}

export function GccShipmentModal({ order, onClose, onSuccess }: GccShipmentModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Check if order already has an existing GCC tracking number
  const existingTracking = order.gccTrackingNumber || order.gcc_tracking_number;
  const existingCarrier = (order.gccShippingCarrier || order.gcc_shipping_carrier || 'aramex') as GccCarrier;

  const isPaidOnline = order.paymentStatus === 'paid';
  const defaultCod = isPaidOnline ? 0 : Number(order.totalAmount || 0);

  // Form State
  const [carrier, setCarrier] = useState<GccCarrier>(existingCarrier);
  const [receiverName, setReceiverName] = useState(order.customerName || '');
  const [receiverPhone, setReceiverPhone] = useState(order.customerPhone || '');
  const [receiverAddress, setReceiverAddress] = useState(order.customerAddress || '');
  const [receiverCity, setReceiverCity] = useState(order.deliveryZoneName || 'الرياض');
  const [receiverCountry, setReceiverCountry] = useState('SA');
  const [weight, setWeight] = useState<number>(1.0);
  const [piecesCount, setPiecesCount] = useState<number>(1);
  const [description, setDescription] = useState(
    `طلب متجر #${order.orderNumber} (${order.items?.map((i: any) => i.name).join('، ') || 'منتجات متنوعة'})`.slice(0, 100)
  );
  const [codAmount, setCodAmount] = useState<number>(defaultCod);
  const [notes, setNotes] = useState(order.customerNotes || '');
  const [successResult, setSuccessResult] = useState<GccShipmentResult | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // If already shipped, fetch live tracking
  const activeTrackingNumber = successResult?.trackingNumber || existingTracking;

  const trackingQuery = useQuery({
    queryKey: ['gcc-shipping-tracking', activeTrackingNumber],
    queryFn: () => gccShippingApi.getTracking(activeTrackingNumber!),
    enabled: Boolean(activeTrackingNumber),
  });

  const shipMutation = useMutation({
    mutationFn: () =>
      gccShippingApi.shipOrder(order.id, {
        carrier,
        packageType: 'Parcel',
        weight: Number(weight) || 1.0,
        piecesCount: Number(piecesCount) || 1,
        description,
        codAmount: Number(codAmount) || 0,
        receiverName,
        receiverPhone,
        receiverAddress,
        receiverCity,
        receiverCountry,
        notes,
      }),
    onSuccess: (res) => {
      setSuccessResult(res);
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders'] });
      if (onSuccess) onSuccess(res);
    },
  });

  const handlePrintAwb = (trackingNumber: string) => {
    window.open(`/api/gcc-shipping/awb/${trackingNumber}`, '_blank');
  };

  const handleCopyTracking = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const isShipped = Boolean(activeTrackingNumber);

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="min(640px, 95vw)"
      ariaLabel={t('storefront.gcc_shipment_modal.s0', "شحن خليجي أرامكس وسمسا")}
    >
      <div
        dir="rtl"
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f0f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TruckIcon size={20} color="#170e5e" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#170e5e' }}>
                {t('storefront.gcc_shipment_modal.s1', "شحن خليجي (أرامكس / سمسا إكسبريس)")}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                {t('storefront.gcc_shipment_modal.s2', "طلب رقم #")}{order.orderNumber} {t('storefront.gcc_shipment_modal.s3', "• العميل:")} {order.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
            }}
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isShipped ? (
            /* Shipped / Success State */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PackageIcon size={32} color="#16a34a" />
                </div>
                <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#166534' }}>
                  {successResult
                    ? t('storefront.gcc_shipment_modal.s4', "تم حجز وإصدار بوليصة الشحن بنجاح!")
                    : t('storefront.gcc_shipment_modal.s5', "هذا الطلب مرتبط ببوليصة شحن مسجلة")}
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#15803d' }}>
                  {t('storefront.gcc_shipment_modal.s6', "الناقل:")}{' '}
                  <strong>
                    {(successResult?.carrier || existingCarrier) === 'aramex'
                      ? t('storefront.gcc_shipment_modal.s7', "أرامكس (Aramex Express)")
                      : t('storefront.gcc_shipment_modal.s8', "سمسا إكسبريس (SMSA Express)")}
                  </strong>
                </p>

                {/* Tracking Badge */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '2px dashed #86efac',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{t('storefront.gcc_shipment_modal.s9', "رقم التتبع والشهادة (AWB)")}</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '1px' }}>
                      #{activeTrackingNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyTracking(activeTrackingNumber!)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: copySuccess ? '#16a34a' : '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copySuccess ? (
                      <>
                        <CheckIcon size={14} color="#16a34a" />
                        <span>{t('storefront.gcc_shipment_modal.s10', "تم النسخ")}</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={14} />
                        <span>{t('storefront.gcc_shipment_modal.s11', "نسخ الرقم")}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Print and Official Track buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginTop: '6px' }}>
                  <Button
                    onClick={() => handlePrintAwb(activeTrackingNumber!)}
                    style={{
                      background: '#170e5e',
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <PrinterIcon size={16} />
                    <span>{t('storefront.gcc_shipment_modal.s12', "طباعة البوليصة (AWB 4×6)")}</span>
                  </Button>

                  <a
                    href={
                      trackingQuery.data?.officialTrackingUrl ||
                      ((successResult?.carrier || existingCarrier) === 'aramex'
                        ? `https://www.aramex.com/track/results?mode=0&ShipmentNumber=${activeTrackingNumber}`
                        : `https://www.smsaexpress.com/track?track=${activeTrackingNumber}`)
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontWeight: 700,
                      fontSize: '13px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    {t('storefront.gcc_shipment_modal.s13', "متابعة في موقع الناقل ↗")}
                  </a>
                </div>
              </div>

              {/* Tracking Timeline */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h5 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                    {t('storefront.gcc_shipment_modal.s14', "حالة الشحنة الحالية (التتبع المباشر)")}
                  </h5>
                  <button
                    type="button"
                    onClick={() => trackingQuery.refetch()}
                    disabled={trackingQuery.isFetching}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#170e5e',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCwIcon size={12} className={trackingQuery.isFetching ? 'animate-spin' : ''} />
                      <span>{trackingQuery.isFetching ? t('storefront.gcc_shipment_modal.s15', "جاري التحديث...") : t('storefront.gcc_shipment_modal.s16', "تحديث الحالة")}</span>
                    </span>
                  </button>
                </div>

                {trackingQuery.isLoading ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '13px' }}>
                    {t('storefront.gcc_shipment_modal.s17', "جاري جلب تفاصيل التتبع...")}
                  </div>
                ) : trackingQuery.data ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                      style={{
                        padding: '8px 12px',
                        background: '#e0e7ff',
                        borderRadius: '8px',
                        color: '#3730a3',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      {t('storefront.gcc_shipment_modal.s18', "الحالة:")} {trackingQuery.data.currentStatus}
                      {trackingQuery.data.destinationCity ? ` • الوجهة: ${trackingQuery.data.destinationCity}` : ''}
                    </div>

                    {/* History steps */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      {trackingQuery.data.history.map((ev, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '8px 10px',
                            background: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12.5px',
                          }}
                        >
                          <CheckIcon size={14} color="#16a34a" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{ev.state}</div>
                            {ev.description && <div style={{ color: '#64748b', fontSize: '11.5px' }}>{ev.description}</div>}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                            {new Date(ev.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px', color: '#64748b', fontSize: '13px' }}>
                    {t('storefront.gcc_shipment_modal.s19', "تم إنشاء البوليصة وتأكيدها. في انتظار الاستلام من المندوب.")}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Creation Form */
            <>
              {/* Carrier Selection Radio Cards */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                  {t('storefront.gcc_shipment_modal.s20', "اختر شركة الشحن الخليجية:")}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setCarrier('aramex')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: carrier === 'aramex' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: carrier === 'aramex' ? '#fef2f2' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '13px' }}>{t('storefront.gcc_shipment_modal.s21', "أرامكس (Aramex)")}</span>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {t('storefront.gcc_shipment_modal.s22', "تغطية شاملة للمملكة، الإمارات، الكويت، وقطر")}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCarrier('smsa')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: carrier === 'smsa' ? '2px solid #ea580c' : '1px solid #cbd5e1',
                      background: carrier === 'smsa' ? '#fff7ed' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'right',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#ea580c', fontSize: '13px' }}>{t('storefront.gcc_shipment_modal.s23', "سمسا إكسبريس (SMSA)")}</span>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ea580c', display: 'inline-block' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {t('storefront.gcc_shipment_modal.s24', "الناقل الأوسع انتشاراً داخل كافة محافظات وقرى السعودية")}
                    </span>
                  </button>
                </div>
              </div>

              {/* Payment Notice */}
              <div
                style={{
                  background: isPaidOnline ? '#ecfdf5' : '#fffbeb',
                  border: `1px solid ${isPaidOnline ? '#a7f3d0' : '#fde68a'}`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.84rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: isPaidOnline ? '#065f46' : '#92400e', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {isPaidOnline ? (
                      <>
                        <CreditCardIcon size={14} />
                        <span>{t('storefront.gcc_shipment_modal.s25', "مسدد إلكترونياً بالكامل (تاب / سترايب)")}</span>
                      </>
                    ) : (
                      <>
                        <DollarSignIcon size={14} />
                        <span>{t('storefront.gcc_shipment_modal.s26', "دفع عند الاستلام (COD)")}</span>
                      </>
                    )}
                  </span>
                  <span style={{ margin: '0 6px', color: '#94a3b8' }}>•</span>
                  <span style={{ color: '#64748b' }}>{t('storefront.gcc_shipment_modal.s27', "إجمالي الفاتورة:")} {formatCurrency(order.totalAmount)}</span>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: isPaidOnline ? '#d1fae5' : '#fef3c7',
                    color: isPaidOnline ? '#047857' : '#b45309',
                    fontWeight: 700,
                  }}
                >
                  {isPaidOnline ? t('storefront.gcc_shipment_modal.s28', "تحصيل صفر COD") : `المطلوب تحصيله: ${formatCurrency(codAmount)}`}
                </span>
              </div>

              {/* Recipient Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    {t('storefront.gcc_shipment_modal.s29', "اسم العميل المستلم *")}
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    {t('storefront.gcc_shipment_modal.s30', "رقم الهاتف المحمول *")}
                  </label>
                  <input
                    type="text"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    {t('storefront.gcc_shipment_modal.s31', "الدولة")}
                  </label>
                  <select
                    value={receiverCountry}
                    onChange={(e) => setReceiverCountry(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      background: '#ffffff',
                    }}
                  >
                    <option value="SA">{t('storefront.gcc_shipment_modal.s32', "المملكة العربية السعودية (SA)")}</option>
                    <option value="AE">{t('storefront.gcc_shipment_modal.s33', "الإمارات العربية المتحدة (AE)")}</option>
                    <option value="KW">{t('storefront.gcc_shipment_modal.s34', "دولة الكويت (KW)")}</option>
                    <option value="QA">{t('storefront.gcc_shipment_modal.s35', "دولة قطر (QA)")}</option>
                    <option value="BH">{t('storefront.gcc_shipment_modal.s36', "مملكة البحرين (BH)")}</option>
                    <option value="OM">{t('storefront.gcc_shipment_modal.s37', "سلطنة عمان (OM)")}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    {t('storefront.gcc_shipment_modal.s38', "المدينة / الحي *")}
                  </label>
                  <input
                    type="text"
                    value={receiverCity}
                    onChange={(e) => setReceiverCity(e.target.value)}
                    placeholder={t('storefront.gcc_shipment_modal.s39', "مثال: الرياض، جدة، الدمام، دبي...")}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  {t('storefront.gcc_shipment_modal.s40', "العنوان التفصيلي (الشارع، رقم المبنى) *")}
                </label>
                <input
                  type="text"
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  placeholder={t('storefront.gcc_shipment_modal.s41', "مثال: حي النرجس، شارع عثمان بن عفان، مبنى 14")}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* Parcel Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    {t('storefront.gcc_shipment_modal.s42', "الوزن الإجمالي (كجم)")}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value) || 1.0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    {t('storefront.gcc_shipment_modal.s43', "عدد الطرود (Pieces)")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={piecesCount}
                    onChange={(e) => setPiecesCount(parseInt(e.target.value, 10) || 1)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    {t('storefront.gcc_shipment_modal.s44', "مبلغ التحصيل عند الاستلام")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={codAmount}
                    onChange={(e) => setCodAmount(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  {t('storefront.gcc_shipment_modal.s45', "وصف الشحنة والمحتويات")}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  {t('storefront.gcc_shipment_modal.s46', "ملاحظات للمندوب والتوصيل")}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('storefront.gcc_shipment_modal.s47', "مثال: الاتصال قبل الوصول بنصف ساعة")}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
              </div>

              {shipMutation.isError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#991b1b',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertTriangleIcon size={16} />
                  <span>{t('storefront.gcc_shipment_modal.s48', "حدث خطأ أثناء إنشاء الشحنة:")} {(shipMutation.error as any)?.message || t('storefront.gcc_shipment_modal.s49', "يرجى مراجعة إعدادات الشحن وبيانات العنوان")}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            gap: '10px',
          }}
        >
          {isShipped ? (
            <Button
              onClick={onClose}
              style={{
                width: '100%',
                background: '#170e5e',
                color: '#ffffff',
                fontWeight: 700,
                padding: '10px',
                borderRadius: '8px',
              }}
            >
              {t('storefront.gcc_shipment_modal.s50', "إغلاق")}
            </Button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {t('storefront.gcc_shipment_modal.s51', "إلغاء")}
              </button>

              <button
                type="button"
                onClick={() => shipMutation.mutate()}
                disabled={shipMutation.isPending || !receiverName || !receiverPhone || !receiverAddress}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: carrier === 'aramex' ? '#dc2626' : '#ea580c',
                  color: '#ffffff',
                  fontWeight: 800,
                  cursor: shipMutation.isPending ? 'wait' : 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {shipMutation.isPending ? (
                  <span>{t('storefront.gcc_shipment_modal.s52', "جاري حجز البوليصة والربط مع")} {carrier === 'aramex' ? t('storefront.gcc_shipment_modal.s53', "أرامكس") : t('storefront.gcc_shipment_modal.s54', "سمسا")}...</span>
                ) : (
                  <span>
                    {t('storefront.gcc_shipment_modal.s55', "تأكيد وإصدار بوليصة")} {carrier === 'aramex' ? t('storefront.gcc_shipment_modal.s56', "أرامكس") : t('storefront.gcc_shipment_modal.s57', "سمسا")}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
