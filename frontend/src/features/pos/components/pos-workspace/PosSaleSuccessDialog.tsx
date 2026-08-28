import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { formatCurrency } from '@/lib/format';
import { formatSalePaymentText } from '@/lib/pos-printing/shared';
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
  const viewInvoiceLinkRef = useRef<HTMLAnchorElement | null>(null);
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

  // A delivery order is COD when courier collects money from customer (collectionStatus is cod OR unpaid non-credit delivery)
  const isDeliveryCod = isDeliveryOrder && hasDeliveryRep && (collectionStatus === 'cod' || (!isFullyPaid && !isCreditSale));

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleShortcut = (event: KeyboardEvent) => {
      if (!['F2', 'F3', 'F4', 'F8', 'F10', 'Escape'].includes(event.key)) return;

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
      if (event.key === 'F4') {
        viewInvoiceLinkRef.current?.click();
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
            <span>عملية مكتملة</span>
            <h3>تم البيع بنجاح</h3>
            <p>استخدم الاختصارات لتنفيذ الإجراء بسرعة</p>
          </div>
          <strong>{sale.docNo || sale.id}</strong>
        </div>

        <div className="pos-sale-success-metrics">
          <span><b>رقم الفاتورة</b>{sale.docNo || sale.id}</span>
          <span><b>الإجمالي</b>{formatCurrency(Number(sale.total || 0))}</span>
          <span><b>طريقة الدفع</b>{paymentMethodLabel}</span>
          {isDeliveryOrder ? (
            isDeliveryCod ? (
              <>
                <span><b>المطلوب تحصيله</b>{formatCurrency(total)} (مع المندوب)</span>
                <span><b>حالة التحصيل</b>عهدة مع المندوب</span>
                {repName && <span><b>المندوب</b>{repName}</span>}
              </>
            ) : (
              <>
                <span><b>حالة التحصيل</b><strong style={{ color: '#16a34a' }}>خالص بالكامل (مدفوع)</strong></span>
                <span><b>المطلوب من العميل</b>0.00 ج.م (خالص)</span>
                {repName && <span><b>المندوب</b>{repName} (تسليم فقط)</span>}
                {deliveryFee > 0 && (
                  <span style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                    <b>تسوية المندوب:</b> تم صرف {formatCurrency(deliveryFee)} نقداً من الدرج لأجرة التوصيل
                  </span>
                )}
              </>
            )
          ) : isCreditOrPartial ? (
            <>
              <span><b>المدفوع</b>{formatCurrency(paidAmount)}</span>
              <span><b>المتبقي على العميل</b><strong style={{ color: '#dc2626' }}>{formatCurrency(remainingDebt)}</strong></span>
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
        </div>

        {printError ? <div className="pos-sale-success-error">{printError}</div> : null}
        {whatsappError ? <div className="pos-sale-success-error">{whatsappError}</div> : null}

        <div className="pos-sale-success-actions">
          <Button type="button" onClick={() => safePrint(onPrintReceipt)}>طباعة ريسيت العميل F2</Button>
          {(isDeliveryOrder || onPrintDualReceipt) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => safePrint(onPrintDualReceipt || onPrintReceipt)}
              style={{ fontWeight: 800, background: '#f8fafc', color: '#0f172a', borderColor: '#cbd5e1' }}
            >
              طباعة نسختين (عميل + محل)
            </Button>
          )}
          {settings?.posKitchenPrinterEnabled && onPrintKitchen && (
            <>
              <Button type="button" onClick={() => safePrint(onPrintKitchen)}>طباعة للمطبخ</Button>
              {onPrintBoth && (
                <Button type="button" onClick={() => safePrint(onPrintBoth)}>طباعة الريسيت والمطبخ</Button>
              )}
            </>
          )}
          <Button type="button" variant="success" onClick={onNewSale}>بيع جديد F3</Button>
          <Link ref={viewInvoiceLinkRef} to="/sales" className="btn btn-secondary">عرض الفاتورة F4</Link>
          <Button type="button" variant="secondary" onClick={triggerWhatsapp}>إرسال واتساب F8</Button>
          <Button type="button" variant="secondary" onClick={() => safePrint(onPrintA4)}>طباعة A4 F10</Button>
          <Button type="button" variant="secondary" onClick={onClose}>إغلاق Esc</Button>
        </div>

        {showManualPhone ? (
          <div className="pos-sale-success-whatsapp">
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
