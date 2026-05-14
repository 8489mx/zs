import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { formatCurrency } from '@/lib/format';
import { paymentLabel } from '@/features/pos/lib/pos-workspace.helpers';
import type { AppSettings, Customer, Sale } from '@/types/domain';

interface PosSaleSuccessDialogProps {
  open: boolean;
  sale: Sale | null;
  customer?: Customer | null;
  settings?: Partial<AppSettings> | null;
  onClose: () => void;
  onNewSale: () => void;
  onPrintReceipt: () => void;
  onPrintA4: () => void;
}

function normalizeWhatsappPhone(phone: string) {
  return phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
}

function buildWhatsappMessage(sale: Sale, settings?: Partial<AppSettings> | null) {
  const storeName = settings?.storeName || settings?.brandName || '';
  const invoiceNo = sale.docNo || sale.id || '';
  return [
    storeName ? `${storeName}` : '',
    `فاتورتك رقم ${invoiceNo}`,
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
  onPrintA4,
}: PosSaleSuccessDialogProps) {
  const [printError, setPrintError] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const viewInvoiceLinkRef = useRef<HTMLAnchorElement | null>(null);
  const customerPhone = String(customer?.phone || '').trim();
  const showManualPhone = !customerPhone;
  const changeOrRemain = Number(sale?.paymentType === 'credit' ? sale?.total || 0 : Math.max(0, Number(sale?.paidAmount || 0) - Number(sale?.total || 0)));
  const changeOrRemainLabel = sale?.paymentType === 'credit' ? 'المتبقي' : 'الباقي';

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
      if (!['F2', 'F3', 'F4', 'F8', 'F9', 'Escape'].includes(event.key)) return;

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
      if (event.key === 'F9') {
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

  if (!open || !sale) return null;

  return (
    <div
      className="pos-sale-success-modal-overlay"
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.36)',
      }}
    >
      <section
        className="pos-sale-success-modal-shell pos-sale-success-dialog"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="تم البيع بنجاح"
        style={{
          width: 'min(660px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          borderRadius: 24,
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
          <span><b>المدفوع</b>{formatCurrency(Number(sale.paidAmount || 0))}</span>
          <span><b>طريقة الدفع</b>{paymentLabel((sale.paymentType === 'credit' ? 'credit' : 'cash'), String(sale.paymentChannel || 'cash'))}</span>
          <span><b>{changeOrRemainLabel}</b>{formatCurrency(changeOrRemain)}</span>
          <span><b>العميل</b>{sale.customerName || customer?.name || 'عميل نقدي'}</span>
        </div>

        {printError ? <div className="pos-sale-success-error">{printError}</div> : null}
        {whatsappError ? <div className="pos-sale-success-error">{whatsappError}</div> : null}

        <div className="pos-sale-success-actions">
          <Button type="button" onClick={() => safePrint(onPrintReceipt)}>طباعة الريسيت F2</Button>
          <Button type="button" variant="success" onClick={onNewSale}>بيع جديد F3</Button>
          <Link ref={viewInvoiceLinkRef} to="/sales" className="btn btn-secondary">عرض الفاتورة F4</Link>
          <Button type="button" variant="secondary" onClick={triggerWhatsapp}>إرسال واتساب F8</Button>
          <Button type="button" variant="secondary" onClick={() => safePrint(onPrintA4)}>طباعة A4 F9</Button>
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
    </div>
  );
}
