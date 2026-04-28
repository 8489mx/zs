import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { formatCurrency } from '@/lib/format';
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
  const customerPhone = String(customer?.phone || '').trim();
  const showManualPhone = !customerPhone;
  const changeOrRemain = Number(sale?.paymentType === 'credit' ? sale?.total || 0 : Math.max(0, Number(sale?.paidAmount || 0) - Number(sale?.total || 0)));
  const changeOrRemainLabel = sale?.paymentType === 'credit' ? 'المتبقي' : 'الباقي';
  const whatsappHref = useMemo(() => {
    if (!sale || !customerPhone) return '';
    const phone = normalizeWhatsappPhone(customerPhone);
    if (!phone) return '';
    return `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsappMessage(sale, settings))}`;
  }, [customerPhone, sale, settings]);

  if (!sale) return null;
  const currentSale = sale;

  function safePrint(printAction: () => void) {
    setPrintError('');
    try {
      printAction();
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : 'تعذرت الطباعة. حاول مرة أخرى.');
    }
  }

  function openWhatsapp(phone: string) {
    setWhatsappError('');
    const normalizedPhone = normalizeWhatsappPhone(phone);
    if (!normalizedPhone) {
      setWhatsappError('أدخل رقم الهاتف لإرسال الفاتورة');
      return;
    }
    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(buildWhatsappMessage(currentSale, settings))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <DialogShell open={open} onClose={onClose} width="min(560px, 100%)" zIndex={90} ariaLabel="تم البيع بنجاح" closeOnBackdrop={false}>
      <div className="pos-sale-success-dialog" dir="rtl">
        <div className="pos-sale-success-head">
          <div>
            <span>عملية مكتملة</span>
            <h3>تم البيع بنجاح</h3>
            <p>F2 طباعة الريسيت</p>
          </div>
          <strong>{sale.docNo || sale.id}</strong>
        </div>

        <div className="pos-sale-success-metrics">
          <span><b>رقم الفاتورة</b>{sale.docNo || sale.id}</span>
          <span><b>الإجمالي</b>{formatCurrency(Number(sale.total || 0))}</span>
          <span><b>المدفوع</b>{formatCurrency(Number(sale.paidAmount || 0))}</span>
          <span><b>{changeOrRemainLabel}</b>{formatCurrency(changeOrRemain)}</span>
          <span><b>العميل</b>{sale.customerName || customer?.name || 'عميل نقدي'}</span>
        </div>

        {printError ? <div className="pos-sale-success-error">{printError}</div> : null}
        {whatsappError ? <div className="pos-sale-success-error">{whatsappError}</div> : null}

        <div className="pos-sale-success-actions">
          <Button type="button" onClick={() => safePrint(onPrintReceipt)}>طباعة الريسيت</Button>
          <Button type="button" variant="secondary" onClick={() => safePrint(onPrintA4)}>طباعة A4</Button>
          {customerPhone ? (
            <a className="btn btn-secondary" href={whatsappHref} target="_blank" rel="noreferrer">إرسال واتساب</a>
          ) : (
            <Button type="button" variant="secondary" onClick={() => {
              setWhatsappError('لا يوجد رقم هاتف لهذا العميل');
            }}>
              إرسال واتساب
            </Button>
          )}
          <Link to="/sales" className="btn btn-secondary">عرض الفاتورة</Link>
          <Button type="button" variant="success" onClick={onNewSale}>بيع جديد</Button>
          <Button type="button" variant="secondary" onClick={onClose}>إغلاق</Button>
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
            <Button type="button" variant="secondary" onClick={() => openWhatsapp(manualPhone)}>إرسال مرة واحدة</Button>
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}
