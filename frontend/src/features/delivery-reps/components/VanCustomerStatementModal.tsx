import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { StandardDialog } from '@/shared/components/StandardDialog';
import {
  PrinterIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  SendIcon,
  CopyIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { cleanWhatsAppPhone } from '@/lib/whatsapp';
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
  const { t } = useTranslation();
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

  const buildStatementText = () => {
    if (!data) return '';
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
    return lines.join('\n');
  };

  const handleCopyStatementText = () => {
    try {
      const text = buildStatementText();
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        toast.success('تم نسخ كشف الحساب بنجاح للحافظة');
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast.success('تم نسخ كشف الحساب بنجاح للحافظة');
      }
    } catch {
      toast.error('تعذر نسخ كشف الحساب');
    }
  };

  const handleWhatsAppShare = () => {
    if (!data) return;
    const text = buildStatementText();
    const cleanPhone = cleanWhatsAppPhone(data.customer.phone || '');

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
    toast.info('تم فتح تطبيق الواتساب لمشاركة كشف الحساب');
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={
        <span style={{ fontSize: 'clamp(13px, 3.8vw, 15px)', fontWeight: 800, color: '#0f172a' }}>
          {t('delivery_reps.van_customer_statement_modal.s0', "كشف حساب عميل")}
        </span>
      }
      subtitle={data?.customer ? `العميل: ${data.customer.name}` : customerName || t('delivery_reps.van_customer_statement_modal.s1', "جاري التحميل...")}
      badge={t('delivery_reps.van_customer_statement_modal.s2', "تدقيق الذمم")}
      width="min(520px, 96vw)"
      minHeight="auto"
      compact
      footer={
        <div
          dir="rtl"
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            onClick={handleWhatsAppShare}
            disabled={loading || !data}
            style={{
              flex: '1.2 1 0',
              minWidth: 0,
              height: '36px',
              fontSize: '12px',
              fontWeight: 700,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
              boxShadow: '0 1px 3px rgba(22, 163, 74, 0.25)',
            }}
          >
            <SendIcon size={13} color="#ffffff" style={{ flexShrink: 0 }} />
            <span>{t('delivery_reps.van_customer_statement_modal.s3', "واتساب")}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyStatementText}
            disabled={loading || !data}
            style={{
              flex: '0.8 1 0',
              minWidth: 0,
              height: '36px',
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
            }}
            title={t('delivery_reps.van_customer_statement_modal.s4', "نسخ كشف الحساب للحافظة")}
          >
            <CopyIcon size={13} color="#475569" style={{ flexShrink: 0 }} />
            <span>{t('delivery_reps.van_customer_statement_modal.s5', "نسخ")}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintThermal}
            disabled={loading || !data}
            style={{
              flex: '1.2 1 0',
              minWidth: 0,
              height: '36px',
              fontSize: '12px',
              fontWeight: 700,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
              boxShadow: '0 1px 3px rgba(23, 14, 94, 0.25)',
            }}
          >
            <PrinterIcon size={14} color="#ffffff" style={{ flexShrink: 0 }} />
            <span>{t('delivery_reps.van_customer_statement_modal.s6', "طباعة (80 مم)")}</span>
          </button>
        </div>
      }
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: '13px' }}>
            <RefreshCwIcon size={22} color="#170e5e" className="animate-spin" />
            <div style={{ marginTop: '6px', fontWeight: 700 }}>{t('delivery_reps.van_customer_statement_modal.s7', "جاري استخراج كشف الحساب وتدقيق الذمم...")}</div>
          </div>
        ) : error || !data ? (
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12px' }}>
            {error || t('delivery_reps.van_customer_statement_modal.s8', "تعذر تحميل كشف الحساب")}
          </div>
        ) : (
          <>
            {/* Overdue Warning Alert */}
            {data.overdueAnalysis?.hasOverdueInvoices && (
              <div
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#991b1b',
                  fontSize: '11px',
                  fontWeight: 700,
                  lineHeight: '1.3',
                }}
              >
                <AlertTriangleIcon size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>
                  {t('delivery_reps.van_customer_statement_modal.s9', "تنبيه: فواتير متأخرة منذ (")}{data.overdueAnalysis.oldestOverdueDays}{t('delivery_reps.van_customer_statement_modal.s10', ") يوماً بإجمالي (")}{Number(data.overdueAnalysis.totalOverdueAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} <CurrencySymbol />).
                </span>
              </div>
            )}

            {/* Ultra-Compact Financial KPI Cards (3 in 1 Row) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '6px',
                width: '100%',
              }}
            >
              {/* Card 1: Balance */}
              <div
                style={{
                  padding: '6px 4px',
                  borderRadius: '8px',
                  backgroundColor: data.customer.balance > 0 ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${data.customer.balance > 0 ? '#fecaca' : '#bbf7d0'}`,
                  textAlign: 'center',
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: '10px', color: data.customer.balance > 0 ? '#991b1b' : '#166534', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {t('delivery_reps.van_customer_statement_modal.s11', "الرصيد المستحق")}
                </div>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: data.customer.balance > 0 ? '#b91c1c' : '#059669',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={`${Number(data.customer.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`}
                >
                  {Number(data.customer.balance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}{' '}
                  <span style={{ fontSize: '9px' }}>{t('delivery_reps.van_customer_statement_modal.s12', "ج.م")}</span>
                </div>
              </div>

              {/* Card 2: Credit Limit */}
              <div
                style={{
                  padding: '6px 4px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {t('delivery_reps.van_customer_statement_modal.s13', "سقف الائتمان")}
                </div>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={data.customer.creditLimit > 0 ? `${Number(data.customer.creditLimit).toLocaleString('en-US')} ج.م` : t('delivery_reps.van_customer_statement_modal.s14', "غير محدد")}
                >
                  {data.customer.creditLimit > 0
                    ? `${Number(data.customer.creditLimit).toLocaleString('en-US', { maximumFractionDigits: 0 })} `
                    : '—'}
                  {data.customer.creditLimit > 0 && <span style={{ fontSize: '9px', color: '#64748b' }}>{t('delivery_reps.van_customer_statement_modal.s15', "ج.م")}</span>}
                </div>
              </div>

              {/* Card 3: Allowed Days */}
              <div
                style={{
                  padding: '6px 4px',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {t('delivery_reps.van_customer_statement_modal.s16', "فترة السماح")}
                </div>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {data.customer.allowedCreditDays} <span style={{ fontSize: '9.5px', color: '#64748b' }}>{t('delivery_reps.van_customer_statement_modal.s17', "يوم")}</span>
                </div>
              </div>
            </div>

            {/* Returnable Packaging / Empties Ledger if exists */}
            {data.packagingBalance?.length > 0 && (
              <div style={{ padding: '5px 8px', borderRadius: '6px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '10.5px' }}>
                <span style={{ fontWeight: 800, color: '#166534', marginLeft: '6px' }}>{t('delivery_reps.van_customer_statement_modal.s18', "عهدة الفوارغ:")}</span>
                <span style={{ color: '#15803d', fontWeight: 600 }}>
                  {data.packagingBalance.map((p: any) => `${p.packageType}: ${p.netOwedToCompany}`).join(' • ')}
                </span>
              </div>
            )}

            {/* Recent Sales Table */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                {t('delivery_reps.van_customer_statement_modal.s19', "آخر الفواتير (")}{data.recentSales?.length || 0}):
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff', maxHeight: '140px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', textAlign: 'right', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '42%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '28%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '4px 6px', fontWeight: 700 }}>{t('delivery_reps.van_customer_statement_modal.s20', "الفاتورة / التاريخ")}</th>
                      <th style={{ padding: '4px 6px', fontWeight: 700 }}>{t('delivery_reps.van_customer_statement_modal.s21', "الإجمالي / المسدد")}</th>
                      <th style={{ padding: '4px 6px', fontWeight: 700, textAlign: 'left' }}>{t('delivery_reps.van_customer_statement_modal.s22', "المتبقي")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data.recentSales || data.recentSales.length === 0) ? (
                      <tr><td colSpan={3} style={{ padding: '8px', textAlign: 'center', color: '#94a3b8' }}>{t('delivery_reps.van_customer_statement_modal.s23', "لا توجد فواتير سابقة")}</td></tr>
                    ) : (
                      data.recentSales.map((s: any) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 6px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {s.docNo}
                            </div>
                            <div style={{ fontSize: '9px', color: '#64748b' }}>
                              {s.saleDate ? s.saleDate.slice(0, 10) : '—'} • {s.paymentType === 'credit' ? t('delivery_reps.van_customer_statement_modal.s24', "آجل") : t('delivery_reps.van_customer_statement_modal.s25', "نقدي")}
                            </div>
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <div style={{ fontWeight: 600, color: '#334155' }}>
                              {Number(s.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '9px', color: '#059669' }}>
                              {t('delivery_reps.van_customer_statement_modal.s26', "مسدد:")} {Number(s.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'left' }}>
                            <div style={{ fontWeight: 800, color: s.remaining > 0 ? '#b91c1c' : '#059669', fontSize: '11px' }}>
                              {Number(s.remaining || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
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
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                {t('delivery_reps.van_customer_statement_modal.s27', "آخر التحصيلات (")}{data.recentCollections?.length || 0}):
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff', maxHeight: '140px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', textAlign: 'right', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '42%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '4px 6px', fontWeight: 700 }}>{t('delivery_reps.van_customer_statement_modal.s28', "السند / التاريخ")}</th>
                      <th style={{ padding: '4px 6px', fontWeight: 700, textAlign: 'center' }}>{t('delivery_reps.van_customer_statement_modal.s29', "طريقة السداد")}</th>
                      <th style={{ padding: '4px 6px', fontWeight: 700, textAlign: 'left' }}>{t('delivery_reps.van_customer_statement_modal.s30', "المبلغ")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data.recentCollections || data.recentCollections.length === 0) ? (
                      <tr><td colSpan={3} style={{ padding: '8px', textAlign: 'center', color: '#94a3b8' }}>{t('delivery_reps.van_customer_statement_modal.s31', "لا توجد تحصيلات سابقة")}</td></tr>
                    ) : (
                      data.recentCollections.map((c: any) => {
                        const methodLabel =
                          c.paymentMethod === 'cash' ? t('delivery_reps.van_customer_statement_modal.s32', "نقدي") :
                          c.paymentMethod === 'instapay' ? t('delivery_reps.van_customer_statement_modal.s33', "إنستاباي") :
                          c.paymentMethod === 'vodafone_cash' ? t('delivery_reps.van_customer_statement_modal.s34', "فودافون") :
                          c.paymentMethod === 'bank_transfer' ? t('delivery_reps.van_customer_statement_modal.s35', "تحويل") :
                          c.paymentMethod;

                        return (
                          <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 6px' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.receiptNumber}
                              </div>
                              <div style={{ fontSize: '9px', color: '#64748b' }}>
                                {c.paymentDate ? c.paymentDate.slice(0, 10) : '—'}
                              </div>
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: c.paymentMethod === 'cash' ? '#f1f5f9' : '#eff6ff',
                                  color: c.paymentMethod === 'cash' ? '#334155' : '#1d4ed8',
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                }}
                              >
                                {methodLabel}
                              </span>
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'left' }}>
                              <span style={{ fontWeight: 800, color: '#059669', fontSize: '11px' }}>
                                {Number(c.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>{' '}
                              <span style={{ fontSize: '9px', color: '#64748b' }}>{t('delivery_reps.van_customer_statement_modal.s36', "ج.م")}</span>
                            </td>
                          </tr>
                        );
                      })
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
