import { useRef } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { ContractingBoqItem } from '../contracting.types';
import { getTextDirection } from '@/lib/arabic-normalization';

interface ClientQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  clientName?: string;
  items: ContractingBoqItem[];
}

export function ClientQuotationModal({
  isOpen,
  onClose,
  projectName = 'مشروع مقاولات',
  clientName = 'العميل الموقر',
  items,
}: ClientQuotationModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const totalContractValue = items.reduce(
    (sum, item) => sum + Number(item.revisedQty || item.contractQty) * Number(item.unitPrice),
    0
  );

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>عرض سعر مالي - ${projectName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 24px; color: #0f172a; margin: 0; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #170e5e; padding-bottom: 12px; margin-bottom: 20px; }
            .company-title { font-size: 20px; font-weight: bold; color: #170e5e; }
            .doc-title { font-size: 16px; font-weight: 700; color: #475569; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #170e5e; color: #ffffff; padding: 8px 10px; font-size: 12px; border: 1px solid #cbd5e1; }
            td { padding: 8px 10px; font-size: 12px; border: 1px solid #cbd5e1; }
            .total-box { margin-top: 16px; padding: 12px; background-color: #f1f5f9; border: 1px solid #cbd5e1; text-align: left; }
            .terms { margin-top: 24px; font-size: 11px; color: #475569; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
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

  return (
    <StandardDialog
      isOpen={isOpen}
      onClose={onClose}
      title="عرض سعر مالي رسمي للمالك (Client Quotation / Tender Proposal)"
      subtitle="وثيقة عرض سعر احترافية جاهزة للطباعة والتقديم للمالك مع الشروط والمواصفات"
      maxWidth="850px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
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
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'flex',
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
            <span>طباعة وتصدير عرض السعر</span>
          </button>
        </div>
      }
    >
      <div
        ref={printRef}
        style={{
          padding: '16px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
        dir="rtl"
      >
        {/* هيدر العرض */}
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
              شركة المقاولات العامة والإنشاءات
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--font-subtitle)', color: '#64748b' }}>
              قسم العطاءات والدراسات الفنية والمقايسات
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
              عرض سعر مالي
            </span>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--font-micro)', color: '#64748b' }}>
              التاريخ: {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>
        </div>

        {/* معلومات المشروع والعميل */}
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

        {/* جدول بنود العرض */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
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
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', fontWeight: 600 }}>{item.itemCode}</td>
                    {(() => {
                      const dir = getTextDirection(item.description);
                      const isRtl = dir === 'rtl';
                      return (
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
                      );
                    })()}
                    <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)' }}>{item.unit}</td>
                    <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)' }}>{qty.toLocaleString()}</td>
                    <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', fontWeight: 600 }}>
                      {Number(item.unitPrice).toLocaleString()} ر.س
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#170e5e' }}>
                      {total.toLocaleString()} ر.س
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* إجمالي العرض المالي */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
          }}
        >
          <span style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#334155' }}>
            إجمالي قيمة العرض المالي المقترح:
          </span>
          <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: '#170e5e' }}>
            {totalContractValue.toLocaleString()} ر.س
          </strong>
        </div>

        {/* الشروط والأحكام التعاقدية */}
        <div style={{ marginTop: '20px', padding: '12px', borderRadius: '8px', backgroundColor: '#fafafa', border: '1px solid #eeeeee' }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 'var(--font-subtitle)', fontWeight: 700, color: '#1e293b' }}>
            الشروط والمحددات التعاقدية العامة:
          </h4>
          <ul style={{ margin: 0, paddingInlineStart: '20px', fontSize: 'var(--font-micro)', color: '#64748b', lineHeight: 1.6 }}>
            <li>الأسعار الموضحة أعلاه شاملة كافة مصاريف التوريد والمصنعيات والمعدات والإشراف الهندسي طبقاً لأصول الصناعة.</li>
            <li>الدفعة المقدمة المقترحة 10% تُخصم بنسب متساوية من المستخلصات الدورية الجارية.</li>
            <li>نسبة ضمان الأعمال (التأمين المحتجز) 5% تُصرف بعد مرور عام من تاريخ الاستلام الابتدائي للمشروع.</li>
            <li>مدة سريان هذا العرض 30 يوماً من تاريخ صدوره.</li>
          </ul>
        </div>

        {/* التوقيعات والاعتماد */}
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
    </StandardDialog>
  );
}
