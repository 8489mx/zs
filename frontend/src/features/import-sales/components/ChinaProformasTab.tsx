import React, { useState } from 'react';
import {
  useProformaInvoicesQuery,
  useGenerateInternationalPoMutation,
} from '../api/shipments.api';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { formatCurrency } from '@/lib/format';
import {
  FileTextIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  DownloadIcon,
  SlidersIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

export function ChinaProformasTab() {
  const { data: proformas = [], isLoading, refetch } = useProformaInvoicesQuery();
  const generatePoMutation = useGenerateInternationalPoMutation('');

  const [generatedPoResult, setGeneratedPoResult] = useState<any | null>(null);

  const handleGeneratePo = async (piId: string) => {
    try {
      const res = await generatePoMutation.mutateAsync();
      setGeneratedPoResult(res);
      toast.success('تم توليد أمر الشراء الدولي (IPO) وتثبيت المواصفات الفنية والشروط التعاقدية');
      refetch();
    } catch (err: any) {
      toast.error('فشل إصدار أمر الشراء: ' + (err.message || 'خطأ'));
    }
  };

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
            الفواتير المبدئية وأوامر الشراء الدولية (Proforma Invoices & International PO)
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            إدارة الفواتير المبدئية PI وتوليد أوامر الشراء الرسمية المعتمدة طبقاً لمعايير الغرفة التجارية الدولية (ICC)
          </p>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>رقم الفاتورة (PI No)</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>المصنع / المورد</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>إجمالي القيمة بالعملة الأجنبية</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>المسدد فعلياً بالحوالات</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>حالة السداد</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>أمر الشراء الدولي (PO)</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {proformas.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  لا توجد فواتير مبدئية مسجلة حالياً
                </td>
              </tr>
            ) : (
              proformas.map((pi: any) => {
                const total = Number(pi.total_amount_foreign || 0);
                const paid = Number(pi.paid_amount_foreign || 0);
                return (
                  <tr key={pi.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#170e5e', fontFamily: 'monospace' }}>
                      {pi.pi_number}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{pi.supplier_name || `مورد #${pi.supplier_id}`}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0369a1' }}>
                      ${total.toLocaleString()} {pi.currency || 'USD'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#15803d' }}>
                      ${paid.toLocaleString()} {pi.currency || 'USD'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor:
                            pi.payment_status === 'paid'
                              ? '#dcfce7'
                              : pi.payment_status === 'partial'
                              ? '#e0f2fe'
                              : '#fee2e2',
                          color:
                            pi.payment_status === 'paid'
                              ? '#166534'
                              : pi.payment_status === 'partial'
                              ? '#0369a1'
                              : '#b91c1c',
                        }}
                      >
                        {pi.payment_status === 'paid'
                          ? 'مسددة بالكامل'
                          : pi.payment_status === 'partial'
                          ? 'مسددة جزئياً'
                          : 'غير مسددة'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {pi.po_number ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#170e5e' }}>{pi.po_number}</span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>لم يصدر بعد</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {!pi.po_number ? (
                        <button
                          type="button"
                          onClick={() => handleGeneratePo(pi.id)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#170e5e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          توليد أمر الشراء (PO)
                        </button>
                      ) : (
                        <span style={{ fontSize: 11.5, color: '#15803d', fontWeight: 700 }}>أمر شراء معتمد</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PO Success Result Dialog */}
      {generatedPoResult && (
        <StandardDialog
          isOpen={!!generatedPoResult}
          onClose={() => setGeneratedPoResult(null)}
          title={`أمر الشراء الدولي المعتمد: ${generatedPoResult.poNumber}`}
          subtitle="تم تثبيت بنود الاتفاق التعاقدي مع المصنع الصيني بنجاح"
          width="600px"
          compact
        >
          <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontWeight: 800, fontSize: 14 }}>
                <CheckCircleIcon size={18} />
                تم توليد وتثبيت أمر الشراء الدولي بنجاح
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                <div><strong>رقم الوثيقة:</strong> <span style={{ fontFamily: 'monospace' }}>{generatedPoResult.poNumber}</span></div>
                <div><strong>الحالة:</strong> معتمد وجاهز للطباعة والإرسال للمصنع</div>
                <div><strong>الشروط المثبتة:</strong> سداد دفعة مقدمة 30% مع ربط الفحص الميداني بالعينة القياسية المعتمدة</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setGeneratedPoResult(null)}
                style={{ padding: '7px 16px', backgroundColor: '#170e5e', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
