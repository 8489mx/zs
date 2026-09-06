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

interface GccShipmentModalProps {
  order: OnlineOrderRecord;
  onClose: () => void;
  onSuccess?: (result: GccShipmentResult) => void;
}

export function GccShipmentModal({ order, onClose, onSuccess }: GccShipmentModalProps) {
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
    `طلب متجر #${order.orderNumber} (${order.items?.map((i) => i.name).join('، ') || 'منتجات متنوعة'})`.slice(0, 100)
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
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '620px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.7rem' }}>🚚</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                شحن خليجي (أرامكس / سمسا إكسبريس)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                طلب رقم #{order.orderNumber} • العميل: {order.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontWeight: 'bold',
            }}
          >
            ✕
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
                <div style={{ fontSize: '2.5rem' }}>📦</div>
                <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#166534' }}>
                  {successResult
                    ? 'تم حجز وإصدار بوليصة الشحن بنجاح!'
                    : 'هذا الطلب مرتبط ببوليصة شحن مسجلة'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#15803d' }}>
                  الناقل:{' '}
                  <strong>
                    {(successResult?.carrier || existingCarrier) === 'aramex'
                      ? 'أرامكس (Aramex Express)'
                      : 'سمسا إكسبريس (SMSA Express)'}
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
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>رقم التتبع والشهادة (AWB)</div>
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
                    }}
                  >
                    {copySuccess ? '✓ تم النسخ' : '📋 نسخ الرقم'}
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
                    }}
                  >
                    🖨️ طباعة البوليصة (AWB 4×6)
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
                    متابعة في موقع الناقل ↗
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
                    حالة الشحنة الحالية (التتبع المباشر)
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
                    {trackingQuery.isFetching ? 'جاري التحديث...' : '🔄 تحديث الحالة'}
                  </button>
                </div>

                {trackingQuery.isLoading ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '13px' }}>
                    جاري جلب تفاصيل التتبع...
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
                      الحالة: {trackingQuery.data.currentStatus}
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
                          <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
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
                    تم إنشاء البوليصة وتأكيدها. في انتظار الاستلام من المندوب.
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
                  اختر شركة الشحن الخليجية:
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
                      <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '13px' }}>أرامكس (Aramex)</span>
                      <span style={{ fontSize: '18px' }}>🔴</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      تغطية شاملة للمملكة، الإمارات، الكويت، وقطر
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
                      <span style={{ fontWeight: 800, color: '#ea580c', fontSize: '13px' }}>سمسا إكسبريس (SMSA)</span>
                      <span style={{ fontSize: '18px' }}>🟠</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      الناقل الأوسع انتشاراً داخل كافة محافظات وقرى السعودية
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
                  <span style={{ fontWeight: 700, color: isPaidOnline ? '#065f46' : '#92400e' }}>
                    {isPaidOnline ? '💳 مسدد إلكترونياً بالكامل (تاب / سترايب)' : '💵 دفع عند الاستلام (COD)'}
                  </span>
                  <span style={{ margin: '0 6px', color: '#94a3b8' }}>•</span>
                  <span style={{ color: '#64748b' }}>إجمالي الفاتورة: {formatCurrency(order.totalAmount)}</span>
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
                  {isPaidOnline ? 'تحصيل صفر COD' : `المطلوب تحصيله: ${formatCurrency(codAmount)}`}
                </span>
              </div>

              {/* Recipient Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    اسم العميل المستلم *
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
                    رقم الهاتف المحمول *
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
                    الدولة
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
                    <option value="SA">المملكة العربية السعودية (SA)</option>
                    <option value="AE">الإمارات العربية المتحدة (AE)</option>
                    <option value="KW">دولة الكويت (KW)</option>
                    <option value="QA">دولة قطر (QA)</option>
                    <option value="BH">مملكة البحرين (BH)</option>
                    <option value="OM">سلطنة عمان (OM)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    المدينة / الحي *
                  </label>
                  <input
                    type="text"
                    value={receiverCity}
                    onChange={(e) => setReceiverCity(e.target.value)}
                    placeholder="مثال: الرياض، جدة، الدمام، دبي..."
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
                  العنوان التفصيلي (الشارع، رقم المبنى) *
                </label>
                <input
                  type="text"
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  placeholder="مثال: حي النرجس، شارع عثمان بن عفان، مبنى 14"
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
                    الوزن الإجمالي (كجم)
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
                    عدد الطرود (Pieces)
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
                    مبلغ التحصيل عند الاستلام
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
                  وصف الشحنة والمحتويات
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
                  ملاحظات للمندوب والتوصيل
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: الاتصال قبل الوصول بنصف ساعة"
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
                  }}
                >
                  ⚠️ حدث خطأ أثناء إنشاء الشحنة: {(shipMutation.error as any)?.message || 'يرجى مراجعة إعدادات الشحن وبيانات العنوان'}
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
              إغلاق
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
                إلغاء
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
                  <span>جاري حجز البوليصة والربط مع {carrier === 'aramex' ? 'أرامكس' : 'سمسا'}...</span>
                ) : (
                  <span>
                    تأكيد وإصدار بوليصة {carrier === 'aramex' ? 'أرامكس' : 'سمسا'} 🚀
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
