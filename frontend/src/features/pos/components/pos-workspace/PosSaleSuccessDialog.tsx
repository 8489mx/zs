import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { formatCurrency } from '@/lib/format';
import { formatSalePaymentText, paymentLabel } from '@/lib/pos-printing/shared';
import type { AppSettings, Customer, Sale } from '@/types/domain';

interface PosSaleSuccessDialogProps {
  open: boolean;
  sale: Sale | null;
  customer?: Customer | null;
  settings?: Partial<AppSettings> | null;
  onClose: () => void;
  onNewSale: () => void;
  onPrintReceipt: () => void;
  onPrintDualReceipt?: () => void;
  onPrintA4: () => void;
  onPrintKitchen?: () => void;
  onPrintBoth?: () => void;
}

function normalizeWhatsappPhone(phone: string) {
  return phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
}

function buildWhatsappMessage(sale: Sale, settings?: Partial<AppSettings> | null) {
  const storeName = settings?.storeName || settings?.brandName || '';
  const invoiceNo = sale.docNo || sale.id || '';
  return [
    storeName ? `*${storeName}*` : '',
    `فاتورة رقم: ${invoiceNo}`,
    `التاريخ: ${sale.date ? new Date(sale.date).toLocaleString('ar-EG') : new Date().toLocaleString('ar-EG')}`,
    `الإجمالي: ${formatCurrency(Number(sale.total || 0))}`,
    'شكرا لتعاملكم معنا',
  ].filter(Boolean).join('\n');
}

export function PosSaleSuccessDialog({
  open,
  sale,
  customer,
  settings,
  onClose,
  onNewSale,
  onPrintReceipt,
  onPrintDualReceipt,
  onPrintA4,
  onPrintKitchen,
  onPrintBoth,
}: PosSaleSuccessDialogProps) {
  const [printError, setPrintError] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const customerPhone = String(customer?.phone || '').trim();
  const showManualPhone = !customerPhone;
  const isDeliveryOrder = sale?.orderType === 'delivery';
  const hasDeliveryRep = Boolean(sale?.deliveryRepId || (sale as any)?.delivery_rep_id);
  const repName = (sale as any)?.deliveryRepName || (sale as any)?.delivery_rep_name;
  const collectionStatus = (sale as any)?.collectionStatus || (sale as any)?.collection_status;

  const changeAmount = Number(sale?.changeAmount || 0);
  const tenderedAmount = Number(sale?.tenderedAmount || 0);
  const paidAmount = Number(sale?.paidAmount || 0);
  const total = Number(sale?.total || 0);
  const deliveryFee = Number((sale as any)?.deliveryFee || (sale as any)?.delivery_fee || 0);
  const remainingDebt = Math.max(0, total - paidAmount);
  const isFullyPaid = paidAmount + 0.009 >= total;
  const isCreditSale = sale?.paymentType === 'credit';
  const isCreditOrPartial = isCreditSale || (remainingDebt > 0.009 && !isDeliveryOrder);

  const isDeliveryCreditSale = isDeliveryOrder && isCreditSale;
  const isDeliveryCod = isDeliveryOrder && hasDeliveryRep && !isDeliveryCreditSale && (collectionStatus === 'cod' || !isFullyPaid);

  const paymentMethodLabel = isDeliveryCod
    ? `دليفري — تحصيل مع المندوب${repName ? ` (${repName})` : ''}`
    : isDeliveryOrder
      ? `دليفري — ${formatSalePaymentText(sale?.paymentType, sale?.paymentChannel, sale?.paidAmount, sale?.total)}`
      : formatSalePaymentText(sale?.paymentType, sale?.paymentChannel, sale?.paidAmount, sale?.total);

  function safePrint(printAction: () => void) {
    setPrintError('');
    try {
      printAction();
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : 'تعذرت الطباعة. حاول مرة أخرى.');
    }
  }

  const openWhatsapp = useCallback((phone: string) => {
    if (!sale) return;
    setWhatsappError('');
    const normalizedPhone = normalizeWhatsappPhone(phone);
    if (!normalizedPhone) {
      setWhatsappError('أدخل رقم الهاتف لإرسال الفاتورة');
      return;
    }
    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(buildWhatsappMessage(sale, settings))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [sale, settings]);

  const triggerWhatsapp = useCallback(() => {
    if (customerPhone) {
      openWhatsapp(customerPhone);
      return;
    }
    openWhatsapp(manualPhone);
  }, [customerPhone, manualPhone, openWhatsapp]);

  useEffect(() => {
    if (!open || !sale) return undefined;

    // Auto-kick cash drawer on cash sale in Electron desktop mode
    const isCashPayment = sale.paymentType === 'cash' || sale.paymentChannel === 'cash' || !sale.paymentType;
    if (isCashPayment && typeof window !== 'undefined' && (window as any).electronPrinter?.kickCashDrawer) {
      (window as any).electronPrinter.kickCashDrawer(settings?.posElectronCashierPrinter).catch(() => {});
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleShortcut = (event: KeyboardEvent) => {
      if (!['F2', 'F3', 'F8', 'F10', 'Escape'].includes(event.key)) return;

      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'F2') {
        safePrint(onPrintReceipt);
        return;
      }
      if (event.key === 'F3') {
        onNewSale();
        return;
      }
      if (event.key === 'F8') {
        triggerWhatsapp();
        return;
      }
      if (event.key === 'F10') {
        safePrint(onPrintA4);
        return;
      }
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleShortcut, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleShortcut, true);
    };
  }, [onClose, onNewSale, onPrintA4, onPrintReceipt, open, sale, triggerWhatsapp]);

  if (!open || !sale || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="dialog-overlay pos-sale-success-modal-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      }}
    >
      <section
        className="pos-sale-success-modal-shell pos-sale-success-dialog"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="تم البيع بنجاح"
        style={{
          position: 'relative',
          width: 'min(760px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          borderRadius: 8,
          border: '1px solid rgba(148, 163, 184, 0.26)',
          background: '#ffffff',
          boxShadow: '0 28px 70px rgba(15, 23, 42, 0.28)',
          padding: 18,
        }}
      >
        <div className="pos-sale-success-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '9999px',
                display: 'inline-block'
              }}>
                عملية مكتملة
              </span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>تم البيع بنجاح</h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>استخدم الاختصارات لتنفيذ الإجراء بسرعة</p>
          </div>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 800,
            color: '#0f172a',
            fontFamily: 'monospace'
          }}>
            #{sale.docNo || sale.id}
          </div>
        </div>

        <div className="pos-sale-success-metrics">
          <span><b>رقم الفاتورة</b>{sale.docNo || sale.id}</span>
          <span><b>الإجمالي</b><strong style={{ color: '#0f172a' }}>{formatCurrency(Number(sale.total || 0))}</strong></span>
          <span><b>طريقة الدفع</b>{paymentMethodLabel}</span>
          {isDeliveryOrder ? (
            isDeliveryCod ? (
              <>
                {paidAmount > 0 && <span><b>المدفوع مقدماً</b>{formatCurrency(paidAmount)}</span>}
                <span><b>المطلوب تحصيله</b><strong style={{ color: '#d97706' }}>{formatCurrency(remainingDebt)}</strong> (مع المندوب)</span>
                <span><b>حالة التحصيل</b><strong style={{ color: '#d97706' }}>عهدة مع المندوب</strong></span>
                {repName && <span><b>المندوب</b>{repName} (تحصيل وتسليم)</span>}
              </>
            ) : isDeliveryCreditSale ? (
              <>
                {paidAmount > 0 && <span><b>المدفوع مقدماً</b>{formatCurrency(paidAmount)}</span>}
                <span><b>المتبقي على العميل</b><strong style={{ color: '#dc2626' }}>{formatCurrency(remainingDebt)}</strong></span>
                <span><b>حالة الفاتورة</b><strong style={{ color: '#d97706' }}>{paidAmount === 0 ? 'آجل بالكامل على حساب العميل' : 'سداد جزئي (متبقي آجل)'}</strong></span>
                {repName && <span><b>المندوب</b>{repName} (تسليم فقط — الحساب مسجل على العميل)</span>}
                {deliveryFee > 0 && (
                  <span style={{ gridColumn: '1 / -1', background: '#fffbeb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fef3c7', color: '#92400e' }}>
                    <b>تسوية المندوب:</b> تم صرف {formatCurrency(deliveryFee)} نقداً من الدرج لأجرة التوصيل
                  </span>
                )}
              </>
            ) : (
              <>
                {paidAmount > 0 && <span><b>المدفوع</b>{formatCurrency(paidAmount)}</span>}
                <span><b>حالة التحصيل</b><strong style={{ color: '#16a34a' }}>مدفوع مسبقاً بالكامل</strong></span>
                {repName && <span><b>المندوب</b>{repName} (تسليم فقط)</span>}
                {deliveryFee > 0 && (
                  <span style={{ gridColumn: '1 / -1', background: '#fffbeb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fef3c7', color: '#92400e' }}>
                    <b>تسوية المندوب:</b> تم صرف {formatCurrency(deliveryFee)} نقداً من الدرج لأجرة التوصيل
                  </span>
                )}
              </>
            )
          ) : isCreditOrPartial ? (
            <>
              <span><b>المدفوع</b>{formatCurrency(paidAmount)}</span>
              <span><b>المتبقي على العميل</b><strong style={{ color: '#dc2626' }}>{formatCurrency(remainingDebt)}</strong></span>
              <span><b>حالة الفاتورة</b><strong style={{ color: '#d97706' }}>{paidAmount === 0 ? 'آجل بالكامل على حساب العميل' : 'سداد جزئي (متبقي آجل)'}</strong></span>
            </>
          ) : (
            <>
              {tenderedAmount > 0 && <span><b>المستلم نقديًا</b>{formatCurrency(tenderedAmount)}</span>}
              {changeAmount > 0.009 ? (
                <span><b>الباقي للعميل</b><strong style={{ color: '#16a34a' }}>{formatCurrency(changeAmount)}</strong></span>
              ) : (
                <span><b>حالة الفاتورة</b><strong style={{ color: '#16a34a' }}>مدفوعة بالكامل</strong></span>
              )}
            </>
          )}
          <span><b>العميل</b>{sale.customerName || customer?.name || (isDeliveryOrder ? 'عميل دليفري' : 'عميل نقدي')}</span>
          {Array.isArray(sale.payments) && sale.payments.length > 1 && (
            <span style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <b>تفاصيل المدفوعات:</b>{' '}
              {sale.payments.map((p) => `${paymentLabel(p.paymentChannel)}: ${formatCurrency(Number(p.amount || 0))}`).join(' + ')}
            </span>
          )}
        </div>

        {printError ? <div className="pos-sale-success-error">{printError}</div> : null}
        {whatsappError ? <div className="pos-sale-success-error">{whatsappError}</div> : null}

        <div className="pos-sale-success-actions-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
          {/* Primary Operations Row */}
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <Button
              type="button"
              onClick={() => safePrint(onPrintReceipt)}
              style={{
                flex: 1.5,
                minHeight: '42px',
                fontSize: '13px',
                fontWeight: 800,
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px'
              }}
            >
              طباعة ريسيت العميل F2
            </Button>
            {(isDeliveryOrder || onPrintDualReceipt) && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => safePrint(onPrintDualReceipt || onPrintReceipt)}
                style={{
                  flex: 1.2,
                  minHeight: '42px',
                  fontWeight: 800,
                  fontSize: '13px',
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px'
                }}
              >
                طباعة نسختين (عميل + محل)
              </Button>
            )}
            <Button
              type="button"
              variant="success"
              onClick={onNewSale}
              style={{
                flex: 1.5,
                minHeight: '42px',
                fontSize: '13px',
                fontWeight: 800,
                borderRadius: '8px'
              }}
            >
              بيع جديد F3
            </Button>
          </div>

          {/* Kitchen Print Row if Enabled */}
          {settings?.posKitchenPrinterEnabled && onPrintKitchen && (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <Button type="button" onClick={() => safePrint(onPrintKitchen)} style={{ flex: 1, minHeight: '38px', borderRadius: '8px' }}>
                طباعة للمطبخ
              </Button>
              {onPrintBoth && (
                <Button type="button" onClick={() => safePrint(onPrintBoth)} style={{ flex: 1, minHeight: '38px', borderRadius: '8px' }}>
                  طباعة الريسيت والمطبخ
                </Button>
              )}
            </div>
          )}

          {/* Secondary Fast Actions Row */}
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={triggerWhatsapp}
              style={{
                flex: 1,
                minHeight: '38px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#15803d',
                background: '#f0fdf4',
                borderColor: '#bbf7d0',
                borderRadius: '8px'
              }}
            >
              إرسال واتساب F8
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => safePrint(onPrintA4)}
              style={{
                flex: 1,
                minHeight: '38px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                background: '#f8fafc',
                borderColor: '#e2e8f0',
                borderRadius: '8px'
              }}
            >
              طباعة A4 F10
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              style={{
                flex: 0.8,
                minHeight: '38px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#64748b',
                background: '#f1f5f9',
                borderColor: '#cbd5e1',
                borderRadius: '8px'
              }}
            >
              إغلاق Esc
            </Button>
          </div>
        </div>

        {showManualPhone ? (
          <div className="pos-sale-success-whatsapp" style={{ marginTop: '12px' }}>
            <Field label="رقم الهاتف">
              <input
                value={manualPhone}
                onChange={(event) => setManualPhone(event.target.value)}
                placeholder="أدخل رقم الهاتف لإرسال الفاتورة"
              />
            </Field>
            <Button type="button" variant="secondary" onClick={() => openWhatsapp(manualPhone)}>إرسال مرة واحدة F8</Button>
          </div>
        ) : null}
      </section>
    </div>,
    document.body
  );
}
