import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bostaApi, BostaShipmentResult } from '../api/bosta.api';
import { OnlineOrderRecord } from '../types/storefront.types';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/shared/ui/button';

interface BostaShipmentModalProps {
  order: OnlineOrderRecord;
  onClose: () => void;
  onSuccess?: (result: BostaShipmentResult) => void;
}

export function BostaShipmentModal({ order, onClose, onSuccess }: BostaShipmentModalProps) {
  const queryClient = useQueryClient();

  const isPaidOnline = order.paymentStatus === 'paid';
  const defaultCod = isPaidOnline ? 0 : Number(order.totalAmount || 0);

  const [receiverName, setReceiverName] = useState(order.customerName || '');
  const [receiverPhone, setReceiverPhone] = useState(order.customerPhone || '');
  const [receiverAddress, setReceiverAddress] = useState(order.customerAddress || '');
  const [receiverCity, setReceiverCity] = useState(order.deliveryZoneName || 'القاهرة');
  const itemsCount = order.items?.length || 1;
  const [description, setDescription] = useState(
    `طلب متجر #${order.orderNumber} (${order.items?.map((i) => i.name).join('، ') || 'أصناف متنوعة'})`.slice(0, 100)
  );
  const [codAmount, setCodAmount] = useState<number>(defaultCod);
  const [notes, setNotes] = useState(order.customerNotes || '');
  const [successResult, setSuccessResult] = useState<BostaShipmentResult | null>(null);

  const shipMutation = useMutation({
    mutationFn: () =>
      bostaApi.shipOrder(order.id, {
        specs: {
          itemsCount,
          description,
          packageType: 'Parcel',
          size: 'SMALL',
        },
        cod: codAmount,
        notes,
        receiverAddress,
        receiverCity,
      }),
    onSuccess: (res) => {
      setSuccessResult(res);
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders'] });
      if (onSuccess) onSuccess(res);
    },
  });

  const handlePrintAwb = (deliveryId: string) => {
    window.open(`/api/bosta/awb/${deliveryId}`, '_blank');
  };

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
          maxWidth: '560px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
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
            <span style={{ fontSize: '1.6rem' }}>📦</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                شحن الطلب عبر بوسطة (Bosta Express)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                طلب رقم #{order.orderNumber} • العميل: {order.customerName}
              </p>
            </div>
          </div>
          <button
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
          {successResult ? (
            /* Success State */
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '3rem' }}>🎉</span>
              <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#166534' }}>
                تم إنشاء وتوثيق شحنة بوسطة بنجاح!
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#15803d' }}>
                {successResult.message}
              </p>

              <div
                style={{
                  background: '#ffffff',
                  border: '2px dashed #86efac',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  width: '100%',
                  marginTop: '8px',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>رقم التتبع (Airway Bill)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '1px' }}>
                  #{successResult.trackingNumber}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '12px' }}>
                <Button
                  onClick={() => handlePrintAwb(successResult.deliveryId)}
                  style={{
                    flex: 1,
                    background: '#170e5e',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '10px',
                    borderRadius: '8px',
                  }}
                >
                  🖨️ طباعة بوليصة الشحن (AWB)
                </Button>
                <Button
                  variant="secondary"
                  onClick={onClose}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px' }}
                >
                  إغلاق النافذة
                </Button>
              </div>
            </div>
          ) : (
            /* Form State */
            <>
              {/* Payment status notice */}
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
                    {isPaidOnline ? '💳 مسدد إلكترونياً بالكامل' : '💵 دفع عند الاستلام (COD)'}
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

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    اسم المستلم
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
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    رقم الهاتف
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
                      fontSize: '0.88rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    عنوان التسليم التفصيلي
                  </label>
                  <input
                    type="text"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    placeholder="الشارع، رقم العمارة، الشقة..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    المحافظة / المدينة
                  </label>
                  <input
                    type="text"
                    value={receiverCity}
                    onChange={(e) => setReceiverCity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    مبلغ التحصيل (COD)
                  </label>
                  <input
                    type="number"
                    value={codAmount}
                    onChange={(e) => setCodAmount(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    وصف محتويات الشحنة
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
                      fontSize: '0.88rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  ملاحظات لمندوب بوسطة
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: يرجى الاتصال قبل الوصول بنصف ساعة..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
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
                    fontSize: '0.82rem',
                    color: '#991b1b',
                  }}
                >
                  ⚠️ {(shipMutation.error as any)?.message || 'تعذر إنشاء الشحنة في بوسطة.'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!successResult && (
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#ffffff',
            }}
          >
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={shipMutation.isPending}
              style={{ padding: '8px 16px', borderRadius: '8px' }}
            >
              إلغاء
            </Button>
            <Button
              onClick={() => shipMutation.mutate()}
              disabled={shipMutation.isPending || !receiverName || !receiverPhone}
              style={{
                background: '#170e5e',
                color: '#ffffff',
                fontWeight: 700,
                padding: '8px 20px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {shipMutation.isPending ? 'جاري إنشاء الشحنة...' : '🚀 إنشاء شحنة بوسطة وتوليد البوليصة'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
