import { useState, useId } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { restaurantAdvancedFnbApi } from '@/features/pos';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/components/system-alert';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import {
  CreditCardIcon,
  CheckShieldIcon,
  ReceiptIcon,
  XIcon,
  UtensilsIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/shared/components/icons/AppIcons';

interface TableBillModalProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  tableNumber: string;
}

export function TableBillModal({ open, onClose, slug, tableNumber }: TableBillModalProps) {
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [paymentSuccessData, setPaymentSuccessData] = useState<any | null>(null);

  // Table Post-Payment Rating & Rescue Alert States
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState<string>('food_quality');
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [isRatingSubmitted, setIsRatingSubmitted] = useState<boolean>(false);
  const [isRescueTriggered, setIsRescueTriggered] = useState<boolean>(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);

  const billQuery = useQuery({
    queryKey: ['table-bill', slug, tableNumber],
    queryFn: () => storefrontApi.getTableBill(slug, tableNumber),
    enabled: open && Boolean(slug) && Boolean(tableNumber),
    staleTime: 5_000,
  });

  const payMutation = useMutation({
    mutationFn: () =>
      storefrontApi.payTableBill(slug, tableNumber, {
        tipAmount,
        paymentMethod: 'card',
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
      }),
    onSuccess: (data) => {
      setPaymentSuccessData(data);
      toast.success(data.message || 'تم سداد حساب الطاولة بنجاح!');
      billQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر استكمال عملية سداد الحساب إلكترونياً');
    },
  });

  const bill = billQuery.data;
  const currencySymbol = bill?.currency || getGlobalCurrencySymbol();

  const handleSelectTipPreset = (amount: number) => {
    setTipAmount(amount);
    setCustomTip('');
  };

  const handleCustomTipChange = (val: string) => {
    setCustomTip(val);
    const parsed = Math.max(0, Number(val) || 0);
    setTipAmount(parsed);
  };

  const finalTotal = Math.round(((bill?.total || 0) + tipAmount) * 100) / 100;
  const titleId = useId();

  const handleSelectRating = async (stars: number) => {
    setSelectedRating(stars);
    if (stars >= 3) {
      setIsSubmittingRating(true);
      try {
        await restaurantAdvancedFnbApi.recordTableRating({
          tableNumber,
          rating: stars,
          feedbackCategory: 'general',
        });
        setIsRatingSubmitted(true);
        toast.success('شكراً جزيلاً لتقييمك الرائع!');
      } catch {
        // quiet
      } finally {
        setIsSubmittingRating(false);
      }
    }
  };

  const handleSubmitRescueFeedback = async () => {
    if (!selectedRating) return;
    setIsSubmittingRating(true);
    try {
      const res = await restaurantAdvancedFnbApi.recordTableRating({
        tableNumber,
        rating: selectedRating,
        feedbackCategory,
        notes: feedbackNotes.trim() || undefined,
      });
      setIsRatingSubmitted(true);
      if (res.isRescueAlertTriggered) {
        setIsRescueTriggered(true);
      }
      toast.success(res.message);
    } catch {
      toast.error('تعذر إرسال التقييم');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(560px, 95vw)"
      ariaLabel="فاتورة وسداد حساب الطاولة"
    >
      <div style={{ padding: '20px 24px', direction: 'rtl', fontFamily: 'inherit' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ReceiptIcon size={18} color="#170e5e" />
            </div>
            <div>
              <h3 id={titleId} style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                شيك وحساب طاولة ({tableNumber})
              </h3>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                مراجعة تفاصيل الطلبات والسداد الإلكتروني المباشر بالبطاقة
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <XIcon size={16} color="#64748b" />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ marginTop: '16px', minHeight: '260px' }}>
          {billQuery.isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '260px',
                gap: '12px',
                color: '#64748b',
              }}
            >
              <div className="system-loading-spinner" style={{ width: 28, height: 28 }} />
              <div style={{ fontSize: '13px', fontWeight: 600 }}>جاري استرجاع شيك الطاولة...</div>
            </div>
          ) : paymentSuccessData ? (
            /* Success State */
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircleIcon size={32} color="#15803d" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 900, color: '#15803d' }}>
                  تم سداد حساب الطاولة بنجاح!
                </h4>
                <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
                  تم تسجيل سداد الطاولة إلكترونياً وتحديث شاشة الكاشير والصالة فورياً.
                </div>
              </div>

              <div
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontSize: '12.5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>رقم الطاولة:</span>
                  <strong>طاولة ({tableNumber})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>المبلغ المسدد:</span>
                  <strong style={{ color: '#170e5e', fontSize: '14px' }}>
                    {paymentSuccessData.totalPaid} {currencySymbol}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>مرجع العملية:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {paymentSuccessData.paymentReference}
                  </span>
                </div>
              </div>

              {/* Post-Payment Experience Rating & Rescue Alert Card */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#ffffff',
                  border: isRescueTriggered ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  boxSizing: 'border-box',
                }}
              >
                {!isRatingSubmitted ? (
                  <>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: '8px' }}>
                      كيف تقيم تجربتك معنا اليوم؟
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleSelectRating(num)}
                          disabled={isSubmittingRating}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            border: selectedRating === num ? '2px solid #170e5e' : '1px solid #cbd5e1',
                            backgroundColor: selectedRating === num ? '#170e5e' : '#f8fafc',
                            color: selectedRating === num ? '#ffffff' : '#0f172a',
                            fontSize: '15px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    {/* Negative Rating Form (1 or 2 stars) */}
                    {selectedRating !== null && selectedRating <= 2 && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                        <div style={{ fontSize: '11.5px', color: '#991b1b', fontWeight: 700, marginBottom: '6px' }}>
                          نعتذر عن عدم رضاك! ما هو سبب الملاحظة لنقوم بحله فوراً؟
                        </div>
                        <select
                          value={feedbackCategory}
                          onChange={(e) => setFeedbackCategory(e.target.value)}
                          style={{
                            width: '100%',
                            height: '32px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            padding: '0 8px',
                            fontSize: '11.5px',
                            marginBottom: '6px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <option value="food_quality">جودة وحرارة الطعام</option>
                          <option value="service_speed">سرعة الخدمة والويتر</option>
                          <option value="order_accuracy">دقة أصناف الطلب</option>
                          <option value="cleanliness">النظافة والأجواء</option>
                        </select>
                        <input
                          type="text"
                          value={feedbackNotes}
                          onChange={(e) => setFeedbackNotes(e.target.value)}
                          placeholder="ملاحظة سريعة للمدير (اختياري)"
                          style={{
                            width: '100%',
                            height: '32px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            padding: '0 8px',
                            fontSize: '11.5px',
                            marginBottom: '8px',
                            boxSizing: 'border-box',
                          }}
                        />
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleSubmitRescueFeedback}
                          disabled={isSubmittingRating}
                          style={{
                            width: '100%',
                            height: '34px',
                            backgroundColor: '#dc2626',
                            fontSize: '12px',
                            fontWeight: 800,
                          }}
                        >
                          {isSubmittingRating ? 'جارٍ إرسال التنبيه...' : 'إرسال التنبيه الفوري لمدير الصالة'}
                        </Button>
                      </div>
                    )}
                  </>
                ) : isRescueTriggered ? (
                  <div style={{ textAlign: 'center', color: '#991b1b' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 900, fontSize: '13px', marginBottom: '4px' }}>
                      <AlertTriangleIcon size={16} color="#dc2626" />
                      <span>تم استدعاء مدير الصالة بنجاح</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      نعتذر بشدة عن أي إزعاج! مدير الصالة في طريقه لطاولتك الآن لتدارك الأمر شخصياً.
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#166534' }}>
                    <div style={{ fontWeight: 900, fontSize: '13px', marginBottom: '2px' }}>
                      شكراً لتقييمك الرائع!
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      سعدنا بخدمتك ونتطلع لزيارتك القادمة دائماً.
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                onClick={onClose}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  background: '#170e5e',
                  height: '40px',
                  fontWeight: 800,
                }}
              >
                إغلاق والعودة للقائمة
              </Button>
            </div>
          ) : !bill?.hasActiveBill ? (
            /* Empty State */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '260px',
                textAlign: 'center',
                gap: '12px',
                padding: '20px',
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UtensilsIcon size={24} color="#94a3b8" />
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#1e293b' }}>
                لا يوجد شيك مفتوح حالياً لطاولة ({tableNumber})
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '320px', lineHeight: 1.6 }}>
                يمكنك تصفح قائمة الطعام وطلب الوجبات مباشرة من هاتفك، أو استدعاء الويتر لخدمتك.
              </div>
              <Button
                variant="secondary"
                onClick={onClose}
                style={{ marginTop: '8px', fontSize: '12px' }}
              >
                العودة لتصفح المنيو
              </Button>
            </div>
          ) : bill.isPaidOnline ? (
            /* Already Paid */
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircleIcon size={28} color="#15803d" />
              </div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#15803d' }}>
                تم سداد حساب هذه الطاولة إلكترونياً
              </h4>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                المبلغ المسدد: {bill.paidOnlineAmount || bill.total} {currencySymbol}
              </div>
              <Button variant="secondary" onClick={onClose} style={{ marginTop: '12px' }}>
                إغلاق
              </Button>
            </div>
          ) : (
            /* Active Bill Presentation & Payment */
            <div>
              {/* Items List */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '8px' }}>
                  الطلبات المسجلة على الطاولة:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bill.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12.5px',
                        paddingBottom: '6px',
                        borderBottom: idx < (bill.items?.length || 0) - 1 ? '1px dashed #e2e8f0' : 'none',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</span>
                        <span style={{ color: '#64748b', marginRight: '6px', fontSize: '11px' }}>
                          × {item.qty}
                        </span>
                      </div>
                      <span style={{ fontWeight: 800, color: '#1e293b' }}>
                        {item.total} {currencySymbol}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Summary */}
              <div
                style={{
                  marginTop: '14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>المجموع الفرعي:</span>
                  <span>{bill.subtotal} {currencySymbol}</span>
                </div>
                {Boolean(bill.discount && bill.discount > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                    <span>الخصم:</span>
                    <span>-{bill.discount} {currencySymbol}</span>
                  </div>
                )}
                {Boolean(bill.serviceCharge && bill.serviceCharge > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>رسوم الخدمة:</span>
                    <span>+{bill.serviceCharge} {currencySymbol}</span>
                  </div>
                )}
                {Boolean(bill.tax && bill.tax > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>ضريبة القيمة المضافة:</span>
                    <span>+{bill.tax} {currencySymbol}</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 900,
                    fontSize: '14px',
                    color: '#0f172a',
                    paddingTop: '6px',
                    borderTop: '1px solid #e2e8f0',
                    marginTop: '2px',
                  }}
                >
                  <span>إجمالي الحساب:</span>
                  <span style={{ color: '#170e5e' }}>{bill.total} {currencySymbol}</span>
                </div>
              </div>

              {/* Tip & Gratuity Selector */}
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  إكرامية لطاقم الخدمة (اختياري):
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {[0, 5, 10, 20].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectTipPreset(preset)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        border: tipAmount === preset && !customTip ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                        background: tipAmount === preset && !customTip ? '#eef2ff' : '#ffffff',
                        color: tipAmount === preset && !customTip ? '#170e5e' : '#475569',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {preset === 0 ? 'بدون' : `+${preset} ${currencySymbol}`}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0"
                    placeholder="مبلغ مخصص"
                    value={customTip}
                    onChange={(e) => handleCustomTipChange(e.target.value)}
                    style={{
                      width: '95px',
                      height: '28px',
                      fontSize: '11.5px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      textAlign: 'center',
                    }}
                  />
                </div>
              </div>

              {/* Guest name optional */}
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                    اسم الضيف (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="الاسم"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    style={{
                      width: '100%',
                      height: '32px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                    رقم الهاتف للإشعار (اختياري)
                  </label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    style={{
                      width: '100%',
                      height: '32px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Final CTA Button */}
              <div style={{ marginTop: '18px' }}>
                <Button
                  variant="primary"
                  onClick={() => payMutation.mutate()}
                  disabled={payMutation.isPending || !bill.total || bill.total <= 0}
                  style={{
                    width: '100%',
                    height: '42px',
                    background: '#15803d',
                    fontSize: '13.5px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <CreditCardIcon size={16} color="#ffffff" />
                  <span>
                    {payMutation.isPending
                      ? 'جارٍ تأكيد السداد...'
                      : `سداد الحساب الآن بالبطاقة • ${finalTotal} ${currencySymbol}`}
                  </span>
                </Button>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    color: '#64748b',
                    marginTop: '6px',
                  }}
                >
                  <CheckShieldIcon size={12} color="#15803d" />
                  <span>دفع آمن ومشفر 100% متوافق مع الفاتورة الإلكترونية</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
