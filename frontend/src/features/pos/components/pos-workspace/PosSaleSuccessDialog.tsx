import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { formatCurrency } from '@/lib/format';
import { formatSalePaymentText, paymentLabel } from '@/lib/pos-printing/shared';
import type { AppSettings, Customer, Sale } from '@/types/domain';
import { HardwareBridgeClient } from '@/features/pos/lib/hardware-bridge-client';

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
  const lastKickedSaleId = useRef<string>('');
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
  const deliveryFeeMode = (sale as any)?.deliveryFeeMode || (sale as any)?.delivery_fee_mode;
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

    // Auto-kick cash drawer on cash sale in Electron desktop mode or local Hardware Bridge
    const isCashPayment = sale.payments?.length
      ? sale.payments.some((payment) => payment.paymentChannel === 'cash' && Number(payment.amount) > 0)
      : sale.paymentChannel === 'cash' && Number(sale.paidAmount) > 0;
    const saleKey = String(sale.id || sale.docNo || '');
    if (sale.status === 'posted' && isCashPayment && saleKey && lastKickedSaleId.current !== saleKey) {
      lastKickedSaleId.current = saleKey;
      if (typeof window !== 'undefined' && (window as any).electronPrinter?.kickCashDrawer) {
        void (window as any).electronPrinter.kickCashDrawer(settings?.posElectronCashierPrinter).catch(() => {});
      } else {
        HardwareBridgeClient.isAvailable().then((avail) => {
          if (avail) {
            void HardwareBridgeClient.kickDrawer({ ip: (settings as any)?.posNetworkPrinterIp || '127.0.0.1' }).catch(() => {});
          }
        }).catch(() => {});
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleShortcut = (event: KeyboardEvent) => {
      if (!['F2', 'F3', 'F4', 'F8', 'F10', 'Escape'].includes(event.key)) return;

      // Do not intercept Alt+F4 (system window close)
      if (event.key === 'F4' && event.altKey) return;

      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'F2') {
        safePrint(onPrintReceipt);
        return;
      }
      if (event.key === 'F4') {
        safePrint(onPrintDualReceipt || onPrintReceipt);
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
  }, [onClose, onNewSale, onPrintA4, onPrintDualReceipt, onPrintReceipt, open, sale, triggerWhatsapp]);

  if (!open || !sale) return null;

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(760px, 95vw)"
      ariaLabel="تم البيع بنجاح"
      autoFocus={false}
    >
      <div
        className="pos-sale-success-modal-shell pos-sale-success-dialog"
        dir="rtl"
        style={{
          maxHeight: 'calc(90vh - 32px)',
          overflowY: 'auto',
          background: '#ffffff',
          padding: '12px 14px',
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
          <div
            className="pos-sale-success-docno-badge"
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 800,
              color: '#0f172a',
              fontFamily: 'monospace'
            }}
          >
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
                {deliveryFee > 0 && <span><b>أجرة التوصيل</b>{formatCurrency(deliveryFee)} (على حساب العميل)</span>}
              </>
            ) : (
              <>
                {paidAmount > 0 && <span><b>المدفوع</b>{formatCurrency(paidAmount)}</span>}
                <span><b>حالة التحصيل</b><strong style={{ color: '#16a34a' }}>مدفوع مسبقاً بالكامل</strong></span>
                {repName && <span><b>المندوب</b>{repName} (تسليم فقط)</span>}
                {deliveryFee > 0 && deliveryFeeMode !== 'store_fleet' && collectionStatus !== 'cod' && collectionStatus !== 'prepaid_by_rep' && (collectionStatus === 'prepaid_online' || sale?.paymentChannel === 'wallet' || sale?.paymentChannel === 'instapay') && (
                  <span style={{ gridColumn: '1 / -1', background: '#fffbeb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fef3c7', color: '#92400e' }}>
                    <b>تسوية المندوب:</b> تم صرف {formatCurrency(deliveryFee)} نقداً من الدرج لأجرة التوصيل (الطلب مسدد أونلاين بالكامل)
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
              {changeAmount > 0.009 && <span><b>الباقي للعميل</b><strong style={{ color: '#16a34a' }}>{formatCurrency(changeAmount)}</strong></span>}
              <span><b>حالة الفاتورة</b><strong style={{ color: '#16a34a' }}>مدفوعة بالكامل</strong></span>
              {((sale as any).terminalAuthCode || (sale as any).terminal_auth_code) && (
                <span style={{ gridColumn: '1 / -1', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '8px', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    <b>دفع شبكة إلكتروني معتمد:</b> {((sale as any).cardScheme === 'knet' ? 'كي نت (KNET)' : (sale as any).cardScheme === 'mada' ? 'مدى (Mada)' : ((sale as any).cardScheme || 'بطاقة مصرفية'))}
                    {((sale as any).cardLastFour || (sale as any).card_last_four) ? ` (**** ${((sale as any).cardLastFour || (sale as any).card_last_four)})` : ''}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                    تفويض: {((sale as any).terminalAuthCode || (sale as any).terminal_auth_code)}
                    {((sale as any).terminalRrn || (sale as any).terminal_rrn) ? ` | مرجع: ${((sale as any).terminalRrn || (sale as any).terminal_rrn)}` : ''}
                  </span>
                </span>
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

        <div className="pos-sale-success-actions-container" style={{ marginTop: '8px' }}>
          <div className="pos-sale-success-buttons-grid">
            <Button
              type="button"
              variant="success"
              onClick={onNewSale}
              className="pos-sale-success-btn-primary"
              style={{
                minHeight: '38px',
                fontSize: '13px',
                fontWeight: 800,
                borderRadius: '8px',
                padding: '4px 6px',
              }}
            >
              بيع جديد F3
            </Button>
            <Button
              type="button"
              onClick={() => safePrint(onPrintReceipt)}
              style={{
                minHeight: '36px',
                fontSize: '12px',
                fontWeight: 800,
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 6px',
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
                  minHeight: '36px',
                  fontWeight: 800,
                  fontSize: '12px',
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '3px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1.2,
                }}
              >
                <span>طباعة نسختين</span>
                {' '}
                <span style={{ fontSize: '10.5px', color: '#475569', fontWeight: 700 }}>(عميل + محل) F4</span>
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={triggerWhatsapp}
              style={{
                minHeight: '34px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#15803d',
                background: '#f0fdf4',
                borderColor: '#bbf7d0',
                borderRadius: '8px',
                padding: '4px 6px',
              }}
            >
              إرسال واتساب F8
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => safePrint(onPrintA4)}
              style={{
                minHeight: '34px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                background: '#f8fafc',
                borderColor: '#e2e8f0',
                borderRadius: '8px',
                padding: '4px 6px',
              }}
            >
              طباعة A4 F10
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="pos-sale-success-btn-close"
              style={{
                minHeight: '34px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#64748b',
                background: '#f1f5f9',
                borderColor: '#cbd5e1',
                borderRadius: '8px',
                padding: '4px 6px',
              }}
            >
              إغلاق Esc
            </Button>
          </div>

          {/* Kitchen Print Row if Enabled */}
          {settings?.posKitchenPrinterEnabled && onPrintKitchen && (
            <div className="pos-sale-success-kitchen-grid" style={{ display: 'grid', gridTemplateColumns: onPrintBoth ? '1fr 1fr' : '1fr', gap: '6px', width: '100%', marginTop: '4px' }}>
              <Button type="button" onClick={() => safePrint(onPrintKitchen)} style={{ minHeight: '36px', borderRadius: '8px', padding: '4px 6px', fontSize: '12px' }}>
                طباعة للمطبخ
              </Button>
              {onPrintBoth && (
                <Button type="button" onClick={() => safePrint(onPrintBoth)} style={{ minHeight: '36px', borderRadius: '8px', padding: '4px 6px', fontSize: '12px' }}>
                  طباعة الريسيت والمطبخ
                </Button>
              )}
            </div>
          )}
        </div>

        {showManualPhone ? (
          <div className="pos-sale-success-whatsapp" style={{ marginTop: '8px' }}>
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
      </div>
    </DialogShell>
  );
}
