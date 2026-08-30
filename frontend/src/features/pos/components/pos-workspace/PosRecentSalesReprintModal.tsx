import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { DialogShell } from '@/shared/components/dialog-shell';
import { formatCurrency } from '@/lib/format';
import { formatDateTime, formatSalePaymentText } from '@/lib/pos-printing/shared';
import { printPostedSaleReceipt } from '@/lib/pos-printing';
import { salesApi } from '@/features/sales/api/sales.api';
import type { AppSettings, Sale } from '@/types/domain';

interface PosRecentSalesReprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastSale: Sale | null;
  settings?: Partial<AppSettings> | null;
  cashierName?: string;
  onReprintLastSale: () => void;
}

export function PosRecentSalesReprintModal({
  isOpen,
  onClose,
  lastSale,
  settings,
  cashierName = '—',
  onReprintLastSale,
}: PosRecentSalesReprintModalProps) {
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecentSales = useCallback(async () => {
    try {
      setLoading(true);
      const res = await salesApi.listPage({ pageSize: 5 });
      setRecentSales(Array.isArray(res?.rows) ? res.rows : []);
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchRecentSales();
    }
  }, [isOpen, fetchRecentSales]);

  function handlePrintSale(saleToPrint: Sale, pageSize: 'receipt' | 'a4' = 'receipt') {
    try {
      printPostedSaleReceipt(saleToPrint, {
        pageSize,
        settings: settings || null,
        cashierName,
      });
      setFeedbackMessage(`تم إرسال الفاتورة #${saleToPrint.docNo || saleToPrint.id} للطباعة (${pageSize === 'receipt' ? 'ريسيت' : 'A4'})`);
      setTimeout(() => setFeedbackMessage(''), 3500);
    } catch (e: any) {
      setFeedbackMessage(`تعذرت الطباعة: ${e.message || 'خطأ غير متوقع'}`);
    }
  }

  function handleReprintLast() {
    if (lastSale) {
      handlePrintSale(lastSale, settings?.paperSize === 'a4' ? 'a4' : 'receipt');
    } else {
      onReprintLastSale();
    }
  }

  // Keyboard shortcut listener for F9 and Escape inside the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F9') {
        event.preventDefault();
        event.stopPropagation();
        handleReprintLast();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, lastSale, settings]);

  if (!isOpen) return null;

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(860px, calc(100vw - 32px))"
      zIndex={90}
      ariaLabel="إعادة طباعة الفواتير"
      shellClassName="pos-recent-reprint-dialog-shell"
    >
      <Card
        title="🖨️ إعادة طباعة الفواتير"
        className="dialog-card pos-recent-reprint-card"
        style={{
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: '18px 20px',
          direction: 'rtl',
        }}
      >
        {/* Header summary & shortcut hint */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              إعادة طباعة الفواتير والريسيت
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
              اضغط <b>F9</b> مرة أخرى لطباعة آخر فاتورة مباشرة، أو اختر من آخر 5 فواتير بالأسفل
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose} style={{ minHeight: '32px', fontSize: '12px' }}>
            إغلاق (Esc)
          </Button>
        </div>

        {feedbackMessage ? (
          <div style={{
            background: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>✓</span>
            <span>{feedbackMessage}</span>
          </div>
        ) : null}

        {/* Action 1: Top Hero Banner for Fast Last Sale Reprint (F9) */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ background: '#3b82f6', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                اختصار سريع F9
              </span>
              <span style={{ fontSize: '15px', fontWeight: 800 }}>طباعة آخر فاتورة تم إتمامها</span>
            </div>
            {lastSale ? (
              <div style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span>رقم: <b>#{lastSale.docNo || lastSale.id}</b></span>
                <span>•</span>
                <span>العميل: <b>{lastSale.customerName || 'عميل نقدي'}</b></span>
                <span>•</span>
                <span>الإجمالي: <b style={{ color: '#38bdf8' }}>{formatCurrency(Number(lastSale.total || 0))}</b></span>
                <span>•</span>
                <span>{formatSalePaymentText(lastSale.paymentType, lastSale.paymentChannel, lastSale.paidAmount, lastSale.total)}</span>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                لا توجد فاتورة أخيرة في الجلسة الحالية
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleReprintLast}
            disabled={!lastSale}
            style={{
              minHeight: '44px',
              padding: '0 20px',
              fontSize: '14px',
              fontWeight: 800,
              background: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
            }}
          >
            🖨️ طباعة آخر فاتورة (F9)
          </Button>
        </div>

        {/* Action 2: Recent 5 Sales List */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#334155' }}>
              📋 آخر 5 فواتير مبيعات (لإعادة طباعة ريسيت العميل عند طلبه):
            </h4>
            {loading ? (
              <span style={{ fontSize: '11px', color: '#64748b' }}>جاري التحديث...</span>
            ) : (
              <button
                type="button"
                onClick={() => void fetchRecentSales()}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
              >
                ↻ تحديث القائمة
              </button>
            )}
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#ffffff',
          }}>
            {loading && recentSales.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                جاري تحميل آخر الفواتير...
              </div>
            ) : recentSales.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                لا توجد فواتير مبيعات سابقة مسجلة.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1px', background: '#e2e8f0' }}>
                {recentSales.map((saleItem, index) => {
                  const isTopLast = lastSale && (saleItem.id === lastSale.id || saleItem.docNo === lastSale.docNo);
                  return (
                    <div
                      key={saleItem.id || saleItem.docNo || index}
                      style={{
                        background: isTopLast ? '#f0f9ff' : '#ffffff',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      {/* Sale info */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '14px',
                            color: '#0f172a',
                            background: '#f1f5f9',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}>
                            #{saleItem.docNo || saleItem.id}
                          </span>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: saleItem.paymentType === 'credit' ? '#fef2f2' : '#f0fdf4',
                            color: saleItem.paymentType === 'credit' ? '#dc2626' : '#16a34a',
                            border: `1px solid ${saleItem.paymentType === 'credit' ? '#fecaca' : '#bbf7d0'}`,
                          }}>
                            {formatSalePaymentText(saleItem.paymentType, saleItem.paymentChannel, saleItem.paidAmount, saleItem.total, saleItem.orderType)}
                          </span>

                          {saleItem.orderType === 'delivery' && (
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8' }}>
                              دليفري
                            </span>
                          )}

                          {isTopLast && (
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#dbeafe', color: '#1e40af' }}>
                              آخر فاتورة
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          <span>العميل: <strong style={{ color: '#334155' }}>{saleItem.customerName || 'عميل نقدي'}</strong></span>
                          <span>•</span>
                          <span>الوقت: <b>{formatDateTime(saleItem.date || saleItem.createdAt)}</b></span>
                          {saleItem.items && (
                            <>
                              <span>•</span>
                              <span>الأصناف: <b>{saleItem.items.length} صنف</b></span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Total and Print actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ textAlign: 'left', minWidth: '100px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>السعر النهائي</span>
                          <strong style={{ fontSize: '16px', color: '#0f172a', fontWeight: 900 }}>
                            {formatCurrency(Number(saleItem.total || 0))}
                          </strong>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Button
                            type="button"
                            variant="primary"
                            onClick={() => handlePrintSale(saleItem, 'receipt')}
                            style={{
                              minHeight: '36px',
                              padding: '0 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              borderRadius: '6px',
                            }}
                          >
                            🖨️ طباعة ريسيت
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handlePrintSale(saleItem, 'a4')}
                            title="طباعة فاتورة A4"
                            style={{
                              minHeight: '36px',
                              padding: '0 10px',
                              fontSize: '12px',
                              borderRadius: '6px',
                            }}
                          >
                            A4
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Card>
    </DialogShell>
  );
}
