import { useState, useRef } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { ContractingBoqItem } from '../contracting.types';
import { getTextDirection } from '@/lib/arabic-normalization';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface ClientQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  clientName?: string;
  items: ContractingBoqItem[];
  currency?: string;
}

export function ClientQuotationModal({
  isOpen,
  onClose,
  projectName = 'مشروع مقاولات',
  clientName = 'العميل الموقر',
  items,
  currency: currencyProp,
}: ClientQuotationModalProps) {
  const { currencySymbol } = useSystemCurrency(currencyProp);
  const currency = currencyProp || currencySymbol;
  const printRef = useRef<HTMLDivElement>(null);

  // Tax & Social Insurance controls
  const [includeVat, setIncludeVat] = useState(false);
  const [vatPercent, setVatPercent] = useState<number>(14);
  const [includeSocialInsurance, setIncludeSocialInsurance] = useState(true);
  const [socialInsurancePercent, setSocialInsurancePercent] = useState<number>(2.16); // 2.16% standard construction
  const [includeOfficeMargin, setIncludeOfficeMargin] = useState(true);
  const [officeMarginPercent, setOfficeMarginPercent] = useState<number>(5.0); // 5% contractor office & supervision

  const baseContractValue = items.reduce(
    (sum, item) => sum + Number(item.revisedQty || item.contractQty) * Number(item.unitPrice),
    0
  );

  const socialInsuranceAmount = includeSocialInsurance ? (baseContractValue * socialInsurancePercent) / 100 : 0;
  const officeMarginAmount = includeOfficeMargin ? (baseContractValue * officeMarginPercent) / 100 : 0;
  const subtotalBeforeVat = baseContractValue + socialInsuranceAmount + officeMarginAmount;
  const vatAmount = includeVat ? (subtotalBeforeVat * vatPercent) / 100 : 0;
  const finalTotalAmount = subtotalBeforeVat + vatAmount;

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>عرض سعر رسمي - ${projectName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 24px; color: #0f172a; margin: 0; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #170e5e; padding-bottom: 12px; margin-bottom: 20px; }
            .company-title { font-size: 20px; font-weight: bold; color: #170e5e; }
            .doc-title { font-size: 16px; font-weight: 700; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #170e5e; color: #ffffff; padding: 8px 10px; font-size: 12px; border: 1px solid #cbd5e1; }
            td { padding: 8px 10px; font-size: 12px; border: 1px solid #cbd5e1; }
            .total-box { margin-top: 16px; padding: 12px; background-color: #f1f5f9; border: 1px solid #cbd5e1; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShareWhatsApp = () => {
    const textLines = [
      `*عرض سعر رسمي للمقايضة والأعمال التنفيذية*`,
      `*المشروع:* ${projectName}`,
      `*العميل:* ${clientName}`,
      `---------------------------------`,
      `*قيمة الأعمال الأساسية:* ${baseContractValue.toLocaleString()} ${currency}`,
      includeSocialInsurance ? `*تأمينات اجتماعية على العملية (${socialInsurancePercent}%):* ${socialInsuranceAmount.toLocaleString()} ${currency}` : '',
      includeOfficeMargin ? `*مصاريف إشراف ومكتب المقاولات (${officeMarginPercent}%):* ${officeMarginAmount.toLocaleString()} ${currency}` : '',
      includeVat ? `*ضريبة القيمة المضافة (${vatPercent}%):* ${vatAmount.toLocaleString()} ${currency}` : `*الأسعار غير شاملة القيمة المضافة*`,
      `---------------------------------`,
      `*الإجمالي النهائي المطلوب:* ${finalTotalAmount.toLocaleString()} ${currency}`,
      `\nللاطلاع على تفاصيل البنود والمواصفات تم إرفاق نسخة العرض الرسمية.`,
    ].filter(Boolean);

    const fullMessage = encodeURIComponent(textLines.join('\n'));
    window.open(`https://wa.me/?text=${fullMessage}`, '_blank');
  };

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="عرض سعر مالي رسمي للمالك والضرائب والتأمينات"
      subtitle="احتساب القيمة المضافة، وتأمينات المقاولة الاجتماعية، ومصاريف الإشراف مع إمكانية الإرسال عبر واتساب والطباعة"
      width="min(1000px, 95vw)"
      minHeight="min(600px, 85vh)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 'var(--font-body)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#15803d',
                color: '#ffffff',
                fontSize: 'var(--font-body)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <AppIcons.Share2 size={16} />
              <span>إرسال عبر واتساب (WhatsApp)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                fontSize: 'var(--font-body)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <AppIcons.Printer size={16} />
              <span>طباعة وتصدير PDF</span>
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
        {/* Controls Card for VAT, Social Insurance & Office Margin */}
        <div
          style={{
            padding: '14px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          {/* Social Insurance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)' }}>
              <input
                type="checkbox"
                checked={includeSocialInsurance}
                onChange={(e) => setIncludeSocialInsurance(e.target.checked)}
              />
              <span>تأمينات العملية الاجتماعية</span>
            </label>
            {includeSocialInsurance && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  step="0.01"
                  value={socialInsurancePercent}
                  onChange={(e) => setSocialInsurancePercent(parseFloat(e.target.value) || 0)}
                  style={{ width: '80px', height: '32px', padding: '0 6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>% (2.16% مباني / 3.6% تشطيب)</span>
              </div>
            )}
          </div>

          {/* Office Supervision Margin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)' }}>
              <input
                type="checkbox"
                checked={includeOfficeMargin}
                onChange={(e) => setIncludeOfficeMargin(e.target.checked)}
              />
              <span>مصاريف مكتب المقاولات والإشراف</span>
            </label>
            {includeOfficeMargin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  step="0.1"
                  value={officeMarginPercent}
                  onChange={(e) => setOfficeMarginPercent(parseFloat(e.target.value) || 0)}
                  style={{ width: '80px', height: '32px', padding: '0 6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>% أتعاب إشراف وضريبة أرباح</span>
              </div>
            )}
          </div>

          {/* VAT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, color: '#170e5e', fontSize: 'var(--font-body)' }}>
              <input
                type="checkbox"
                checked={includeVat}
                onChange={(e) => setIncludeVat(e.target.checked)}
              />
              <span>إضافة ضريبة القيمة المضافة (VAT)</span>
            </label>
            {includeVat && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  step="0.5"
                  value={vatPercent}
                  onChange={(e) => setVatPercent(parseFloat(e.target.value) || 0)}
                  style={{ width: '80px', height: '32px', padding: '0 6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
                <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>% القيمة المضافة (14%)</span>
              </div>
            )}
          </div>
        </div>

        {/* Printable Quotation Document Container */}
        <div
          ref={printRef}
          style={{
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}
          dir="rtl"
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #170e5e',
              paddingBottom: '12px',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#170e5e' }}>
                شركة المقاولات العامة والإنشاءات المتكاملة
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--font-subtitle)', color: '#64748b' }}>
                قسم العطاءات والمناقصات والمكتب الفني
              </p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#eef2ff',
                  color: '#170e5e',
                  fontWeight: 700,
                  fontSize: 'var(--font-badge)',
                }}
              >
                عرض سعر رسمي
              </span>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                التاريخ: {new Date().toLocaleDateString('ar-EG')}
              </p>
            </div>
          </div>

          {/* Project & Client Details */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              backgroundColor: '#f8fafc',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>اسم المشروع:</span>
              <strong style={{ display: 'block', fontSize: 'var(--font-body)', color: '#0f172a' }}>{projectName}</strong>
            </div>
            <div>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>الجهة المالكة / العميل:</span>
              <strong style={{ display: 'block', fontSize: 'var(--font-body)', color: '#0f172a' }}>{clientName}</strong>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '340px', overflowY: 'auto', marginBottom: '16px', backgroundColor: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ backgroundColor: '#170e5e', color: '#ffffff' }}>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)' }}>م</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)' }}>كود البند</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)' }}>بيان الأعمال والمواصفات</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)' }}>الوحدة</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)' }}>الكمية</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)' }}>سعر الفئة</th>
                  <th style={{ padding: '8px 10px', fontSize: 'var(--font-table-head)' }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const qty = Number(item.revisedQty || item.contractQty);
                  const total = qty * Number(item.unitPrice);
                  const dir = getTextDirection(item.description);
                  const isRtl = dir === 'rtl';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', fontWeight: 600 }}>{item.itemCode}</td>
                      <td
                        dir={dir}
                        className="text-justify spec-description"
                        style={{
                          padding: '8px 10px',
                          fontSize: 'var(--font-body)',
                          color: '#1e293b',
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                          textAlignLast: isRtl ? 'right' : 'left',
                          lineHeight: 1.55,
                          wordBreak: 'break-word',
                          direction: dir,
                        }}
                      >
                        {item.description}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)' }}>{item.unit}</td>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)' }}>{qty.toLocaleString()}</td>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', fontWeight: 600 }}>
                        {Number(item.unitPrice).toLocaleString()} {currency}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
                        {total.toLocaleString()} {currency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Summary Box */}
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-body)', color: '#475569' }}>
              <span>إجمالي قيمة الأعمال التنفيذية الأساسية:</span>
              <strong style={{ color: '#0f172a' }}>{baseContractValue.toLocaleString()} {currency}</strong>
            </div>

            {includeSocialInsurance && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-body)', color: '#475569' }}>
                <span>تأمينات اجتماعية على العملية ({socialInsurancePercent}%):</span>
                <strong style={{ color: '#0f172a' }}>{socialInsuranceAmount.toLocaleString()} {currency}</strong>
              </div>
            )}

            {includeOfficeMargin && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-body)', color: '#475569' }}>
                <span>مصاريف مكتب المقاولات والإشراف الهندسي ({officeMarginPercent}%):</span>
                <strong style={{ color: '#0f172a' }}>{officeMarginAmount.toLocaleString()} {currency}</strong>
              </div>
            )}

            {includeVat && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-body)', color: '#475569' }}>
                <span>ضريبة القيمة المضافة ({vatPercent}%):</span>
                <strong style={{ color: '#0f172a' }}>{vatAmount.toLocaleString()} {currency}</strong>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '2px solid #170e5e',
                paddingTop: '8px',
                marginTop: '4px',
                fontSize: 'var(--font-section-title)',
              }}
            >
              <strong style={{ color: '#170e5e' }}>إجمالي قيمة العرض المالي النهائي:</strong>
              <strong style={{ color: '#170e5e', fontSize: '1.3rem' }}>
                {finalTotalAmount.toLocaleString()} {currency}
              </strong>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div style={{ marginTop: '20px', padding: '12px', borderRadius: '8px', backgroundColor: '#fafafa', border: '1px solid #eeeeee' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 'var(--font-subtitle)', fontWeight: 700, color: '#1e293b' }}>
              الشروط والمحددات التعاقدية العامة:
            </h4>
            <ul style={{ margin: 0, paddingInlineStart: '20px', fontSize: 'var(--font-micro)', color: '#64748b', lineHeight: 1.6 }}>
              <li>الأسعار الموضحة أعلاه شاملة كافة مصاريف التوريد والمصنعيات والمعدات والإشراف الهندسي طبقاً لأصول الصناعة.</li>
              <li>الدفعة المقدمة المقترحة 10% تُخصم بنسب متساوية من المستخلصات الجارية.</li>
              <li>نسبة ضمان الأعمال (التأمين المحتجز) 5% تُصرف بعد مرور عام من تاريخ الاستلام الابتدائي للمشروع.</li>
              <li>مدة سريان هذا العرض 30 يوماً من تاريخ صدوره.</li>
            </ul>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center', minWidth: '160px' }}>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>إعداد المكتب الفني</span>
              <div style={{ marginTop: '24px', borderBottom: '1px dashed #cbd5e1' }} />
            </div>
            <div style={{ textAlign: 'center', minWidth: '160px' }}>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>اعتماد المدير التنفيذي</span>
              <div style={{ marginTop: '24px', borderBottom: '1px dashed #cbd5e1' }} />
            </div>
            <div style={{ textAlign: 'center', minWidth: '160px' }}>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>موافقة واعتماد المالك</span>
              <div style={{ marginTop: '24px', borderBottom: '1px dashed #cbd5e1' }} />
            </div>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
