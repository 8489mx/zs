import React, { useEffect, useState } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import {
  PrinterIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ShareIcon,
  RefreshCwIcon,
  FileTextIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { vanSalesApi } from '../api/van-sales.api';

export interface VanCustomerStatementModalProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName?: string;
  storeName?: string;
}

export const VanCustomerStatementModal: React.FC<VanCustomerStatementModalProps> = ({
  open,
  onClose,
  customerId,
  customerName,
  storeName = 'Z-Systems Distribution',
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatement = async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await vanSalesApi.getCustomerFieldStatement(customerId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل كشف حساب العميل');
      toast.error('تعذر جلب كشف الحساب الميداني للعميل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && customerId) {
      fetchStatement();
    } else {
      setData(null);
    }
  }, [open, customerId]);

  if (!open) return null;

  const handlePrintThermal = () => {
    if (!data) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كشف حساب عميل ميداني - ${data.customer.name}</title>
        <style>
          @page { size: 80mm auto; margin: 2mm; }
          body { font-family: 'Courier New', monospace, sans-serif; font-size: 11px; margin: 0; padding: 4px; color: #000; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
          .title { font-size: 14px; font-weight: bold; margin: 2px 0; }
          .subtitle { font-size: 10px; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
          .bold { font-weight: bold; }
          .highlight { font-size: 13px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 4px 0; }
          th, td { text-align: right; padding: 2px 0; }
          th { border-bottom: 1px solid #000; }
          .signature-box { margin-top: 16px; border-top: 1px dashed #000; padding-top: 6px; text-align: center; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${storeName}</div>
          <div class="subtitle">كشف حساب عميل ميداني ومطابقة رصيد</div>
          <div>التاريخ: ${dateStr} - ${timeStr}</div>
        </div>

        <div class="row"><span class="bold">العميل:</span><span>${data.customer.name}</span></div>
        ${data.customer.phone ? `<div class="row"><span>الهاتف:</span><span>${data.customer.phone}</span></div>` : ''}
        ${data.customer.address ? `<div class="row"><span>العنوان:</span><span>${data.customer.address}</span></div>` : ''}

        <div class="divider"></div>

        <div class="row highlight">
          <span>الرصيد الحالي المستحق:</span>
          <span>${data.customer.balance.toFixed(2)} ج.م</span>
        </div>
        ${data.customer.creditLimit > 0 ? `<div class="row"><span>سقف الائتمان:</span><span>${data.customer.creditLimit.toFixed(2)} ج.م</span></div>` : ''}
        ${data.overdueAnalysis?.hasOverdueInvoices ? `
          <div class="row" style="color: #000; font-weight: bold;">
            <span>فواتير متأخرة (${data.overdueAnalysis.oldestOverdueDays} يوم):</span>
            <span>${data.overdueAnalysis.totalOverdueAmount.toFixed(2)} ج.م</span>
          </div>
        ` : ''}

        ${data.packagingBalance?.length > 0 ? `
          <div class="divider"></div>
          <div class="bold" style="margin-bottom: 3px;">أمانات الفوارغ المتبقية:</div>
          ${data.packagingBalance.map((p: any) => `
            <div class="row"><span>${p.packageType}:</span><span>${p.netOwedToCompany} وحدة</span></div>
          `).join('')}
        ` : ''}

        <div class="divider"></div>
        <div class="bold">آخر الحركات والفواتير:</div>
        <table>
          <thead>
            <tr><th>المستند</th><th>التاريخ</th><th>القيمة</th><th>المتبقي</th></tr>
          </thead>
          <tbody>
            ${(data.recentSales || []).map((s: any) => `
              <tr>
                <td>${s.docNo}</td>
                <td>${s.saleDate ? s.saleDate.slice(0, 10) : '—'}</td>
                <td>${s.total.toFixed(2)}</td>
                <td>${s.remaining.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="divider"></div>
        <div class="bold">آخر التحصيلات وسندات القبض:</div>
        <table>
          <thead>
            <tr><th>السند</th><th>التاريخ</th><th>المبلغ</th><th>طريقة السداد</th></tr>
          </thead>
          <tbody>
            ${(data.recentCollections || []).map((c: any) => `
              <tr>
                <td>${c.receiptNumber}</td>
                <td>${c.paymentDate ? c.paymentDate.slice(0, 10) : '—'}</td>
                <td>${c.amount.toFixed(2)}</td>
                <td>${c.paymentMethod === 'cash' ? 'نقدي' : c.paymentMethod}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="signature-box">
          <div>أقر أنا المستلم بصحة الرصيد الموضح أعلاه</div>
          <div style="margin-top: 14px;">توقيع العميل / الختم: ........................</div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=380,height=600');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 250);
      toast.success('تم إرسال كشف الحساب لطابعة الإيصالات الحرارية (80 مم)');
    }
  };

  const handleWhatsAppShare = () => {
    if (!data) return;
    const phone = data.customer.phone ? data.customer.phone.replace(/[^0-9]/g, '') : '';
    const cleanPhone = phone.startsWith('0') ? '2' + phone : phone;

    const lines = [
      `*كشف حساب ومطابقة رصيد عميل*`,
      `المنشأة: ${storeName}`,
      `العميل: ${data.customer.name}`,
      `---------------------------------`,
      `*الرصيد الحالي المستحق:* ${data.customer.balance.toFixed(2)} ج.م`,
    ];

    if (data.customer.creditLimit > 0) {
      lines.push(`سقف الائتمان المعتمد: ${data.customer.creditLimit.toFixed(2)} ج.م`);
    }

    if (data.overdueAnalysis?.hasOverdueInvoices) {
      lines.push(`تنبيه مديونية متأخرة: ${data.overdueAnalysis.totalOverdueAmount.toFixed(2)} ج.م (منذ ${data.overdueAnalysis.oldestOverdueDays} يوماً)`);
    }

    if (data.packagingBalance?.length > 0) {
      lines.push(`---------------------------------`);
      lines.push(`*أمانات الفوارغ بالعهدة:*`);
      data.packagingBalance.forEach((p: any) => {
        lines.push(`• ${p.packageType}: ${p.netOwedToCompany} وحدة`);
      });
    }

    if (data.recentSales?.length > 0) {
      lines.push(`---------------------------------`);
      lines.push(`*آخر فواتير مسجلة:*`);
      data.recentSales.slice(0, 3).forEach((s: any) => {
        lines.push(`• فاتورة ${s.docNo} (${s.saleDate ? s.saleDate.slice(0, 10) : ''}): إجمالي ${s.total.toFixed(2)} ج.م - متبقي ${s.remaining.toFixed(2)} ج.م`);
      });
    }

    if (data.recentCollections?.length > 0) {
      lines.push(`---------------------------------`);
      lines.push(`*آخر سندات قبض:*`);
      data.recentCollections.slice(0, 3).forEach((c: any) => {
        lines.push(`• سند ${c.receiptNumber} (${c.paymentDate ? c.paymentDate.slice(0, 10) : ''}): تم سداد ${c.amount.toFixed(2)} ج.م`);
      });
    }

    lines.push(`---------------------------------`);
    lines.push(`تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}`);

    const text = encodeURIComponent(lines.join('\n'));
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
    toast.info('تم فتح تطبيق الواتساب لمشاركة كشف الحساب');
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="كشف حساب عميل ميداني ومطابقة رصيد"
      subtitle={data?.customer ? `العميل: ${data.customer.name}` : customerName || 'جاري التحميل...'}
      badge="تدقيق الذمم والحسابات"
      width="min(580px, 96vw)"
      minHeight="460px"
      footer={
        <div
          dir="rtl"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            style={{
              minHeight: '38px',
              fontSize: '12.5px',
              fontWeight: 700,
              padding: '0 14px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
            }}
          >
            إغلاق
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              type="button"
              onClick={handleWhatsAppShare}
              disabled={loading || !data}
              style={{
                minHeight: '38px',
                fontSize: '12.5px',
                fontWeight: 700,
                padding: '0 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                border: 'none',
              }}
            >
              <ShareIcon size={14} color="#ffffff" />
              <span>إرسال واتساب</span>
            </Button>

            <Button
              type="button"
              onClick={handlePrintThermal}
              disabled={loading || !data}
              style={{
                minHeight: '38px',
                fontSize: '12.5px',
                fontWeight: 700,
                padding: '0 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
              }}
            >
              <PrinterIcon size={14} color="#ffffff" />
              <span>طباعة إيصال (80 مم)</span>
            </Button>
          </div>
        </div>
      }
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b', fontSize: '13px' }}>
            <RefreshCwIcon size={24} color="#170e5e" className="animate-spin" />
            <div style={{ marginTop: '8px', fontWeight: 700 }}>جاري استخراج كشف الحساب وتدقيق الذمم...</div>
          </div>
        ) : error || !data ? (
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px' }}>
            {error || 'تعذر تحميل كشف الحساب'}
          </div>
        ) : (
          <>
            {/* Overdue Warning Alert */}
            {data.overdueAnalysis?.hasOverdueInvoices && (
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#991b1b',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <AlertTriangleIcon size={16} color="#dc2626" />
                <span>
                  تنبيه رقابي: يوجد على هذا العميل فواتير متأخرة مستحقة السداد منذ ({data.overdueAnalysis.oldestOverdueDays}) يوماً بإجمالي ({data.overdueAnalysis.totalOverdueAmount.toFixed(2)} <CurrencySymbol />). يتطلب السداد قبل البيع الآجل الجديد.
                </span>
              </div>
            )}

            {/* Financial Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              <div style={{ padding: '9px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>الرصيد الحالي المستحق</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: data.customer.balance > 0 ? '#b91c1c' : '#059669', marginTop: '2px' }}>
                  {data.customer.balance.toFixed(2)} <CurrencySymbol />
                </div>
              </div>

              <div style={{ padding: '9px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>سقف الائتمان</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {data.customer.creditLimit > 0 ? `${data.customer.creditLimit.toFixed(2)}` : 'غير محدد'} <CurrencySymbol />
                </div>
              </div>

              <div style={{ padding: '9px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>فترة السماح المعتمدة</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {data.customer.allowedCreditDays} يوم
                </div>
              </div>
            </div>

            {/* Returnable Packaging / Empties Ledger if exists */}
            {data.packagingBalance?.length > 0 && (
              <div style={{ padding: '9px 11px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#166534', marginBottom: '4px' }}>
                  أمانات الفوارغ والحاويات المتبقية:
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: '#15803d', fontWeight: 700 }}>
                  {data.packagingBalance.map((p: any) => (
                    <span key={p.packageType}>
                      {p.packageType}: <strong>{p.netOwedToCompany} وحدة</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sales Table */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '5px' }}>
                آخر الفواتير المسجلة ({data.recentSales?.length || 0}):
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '6px 8px' }}>رقم الفاتورة</th>
                      <th style={{ padding: '6px 8px' }}>التاريخ</th>
                      <th style={{ padding: '6px 8px' }}>الإجمالي</th>
                      <th style={{ padding: '6px 8px' }}>المسدد</th>
                      <th style={{ padding: '6px 8px' }}>المتبقي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data.recentSales || data.recentSales.length === 0) ? (
                      <tr><td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>لا توجد فواتير سابقة</td></tr>
                    ) : (
                      data.recentSales.map((s: any) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0f172a' }}>{s.docNo}</td>
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>{s.saleDate ? s.saleDate.slice(0, 10) : '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{s.total.toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', color: '#059669' }}>{s.paidAmount.toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 800, color: s.remaining > 0 ? '#b91c1c' : '#059669' }}>
                            {s.remaining.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Collections Table */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '5px' }}>
                آخر سندات التحصيل ({data.recentCollections?.length || 0}):
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '6px 8px' }}>رقم السند</th>
                      <th style={{ padding: '6px 8px' }}>التاريخ</th>
                      <th style={{ padding: '6px 8px' }}>المبلغ</th>
                      <th style={{ padding: '6px 8px' }}>طريقة الدفع</th>
                      <th style={{ padding: '6px 8px' }}>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data.recentCollections || data.recentCollections.length === 0) ? (
                      <tr><td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>لا توجد تحصيلات سابقة</td></tr>
                    ) : (
                      data.recentCollections.map((c: any) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0f172a' }}>{c.receiptNumber}</td>
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>{c.paymentDate ? c.paymentDate.slice(0, 10) : '—'}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 800, color: '#059669' }}>{c.amount.toFixed(2)} <CurrencySymbol /></td>
                          <td style={{ padding: '6px 8px' }}>{c.paymentMethod === 'cash' ? 'نقدي' : c.paymentMethod}</td>
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>{c.notes || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </StandardDialog>
  );
};
