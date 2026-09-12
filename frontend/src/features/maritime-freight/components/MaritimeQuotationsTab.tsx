import { useNavigate } from 'react-router-dom';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { MaritimeQuotation } from '../api/maritime-freight.api';
import { toast } from '@/shared/components/system-alert';

interface MaritimeQuotationsTabProps {
  quotations: MaritimeQuotation[];
  loading: boolean;
  onConvertToJob: (quote: MaritimeQuotation) => void;
  onUpdateStatus: (id: string, status: 'approved' | 'rejected' | 'sent') => void;
}

export function MaritimeQuotationsTab({
  quotations,
  loading,
  onConvertToJob,
  onUpdateStatus,
}: MaritimeQuotationsTabProps) {
  const navigate = useNavigate();
  const { currencySymbol } = useSystemCurrency();
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>مسودة</span>;
      case 'sent':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#eff6ff', color: '#1e40af', fontSize: '0.72rem', fontWeight: 700 }}>مرسل للعميل</span>;
      case 'approved':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#ecfdf5', color: '#047857', fontSize: '0.72rem', fontWeight: 700 }}>معتمد من العميل</span>;
      case 'rejected':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700 }}>مرفوض</span>;
      case 'converted_to_job':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#f3e8ff', color: '#7e22ce', fontSize: '0.72rem', fontWeight: 700 }}>تحول لأمر تشغيل</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>{status}</span>;
    }
  };

  const handleShareWhatsApp = (quote: MaritimeQuotation) => {
    if (!quote.customer_phone) {
      toast.warning('لا يوجد رقم هاتف مسجل لهذا العميل');
      return;
    }
    const cleanPhone = quote.customer_phone.replace(/[^0-9]/g, '');
    const message = `مرحباً ${quote.customer_name}، نرسل لكم عرض سعر الشحن البحري:\n` +
      `كود العرض: ${quote.quotation_number}\n` +
      `السعر الإجمالي: $${Number(quote.final_total).toLocaleString()} (${Number(quote.final_total_local).toLocaleString()} ${currencySymbol} تقريباً)\n` +
      `طريقة السداد: ${quote.payment_term}\nشكراً لاختياركم خدماتنا!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      {/* Header الكارت الموحد */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
            عروض أسعار العملاء (Client Quotations)
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            إدارة عروض الأسعار الصادرة للعملاء متضمنة الهامش الربحي وتحويل العروض المعتمدة لأوامر تشغيل
          </p>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
          {quotations.length} عرض سعر
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.825rem', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '135px' }} />
            <col style={{ minWidth: '180px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '275px' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>رقم العرض</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>العميل وبيانات التواصل</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>التكلفة الأساسية</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>الهامش الربحي</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>السعر النهائي للعميل</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>الحالة</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  جاري تحميل عروض الأسعار...
                </td>
              </tr>
            ) : quotations.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  لا توجد عروض أسعار مسجلة بعد. يمكنك إنشاء عرض سعر من مصفوفة مقارنة عروض الخطوط الملاحية.
                </td>
              </tr>
            ) : (
              quotations.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#170e5e', textAlign: 'center', verticalAlign: 'middle' }}>
                    {q.quotation_number}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{q.customer_name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{q.customer_phone || q.customer_email || 'بدون بيانات تواصل'}</div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 600 }}>
                    ${Number(q.base_cost).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#15803d', fontWeight: 700, textAlign: 'center', verticalAlign: 'middle' }}>
                    {q.margin_type === 'percentage' ? `${Number(q.margin_value)}%` : `+$${Number(q.margin_value).toLocaleString()}`}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#170e5e' }}>
                      ${Number(q.final_total).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      ≈ {Number(q.final_total_local).toLocaleString()} <CurrencySymbol />
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', justifyContent: 'center' }}>
                      {getStatusBadge(q.status)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div
                      style={{
                        display: 'inline-grid',
                        gridTemplateColumns: '115px 64px 64px',
                        gap: '6px',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* العمود 1: إجراء التشغيل الرئيسي */}
                      {q.status === 'converted_to_job' ? (
                        <button
                          type="button"
                          onClick={() => navigate('/maritime/jobs')}
                          title="الانتقال لملف أمر التشغيل في الشحن"
                          style={{
                            width: '115px',
                            height: '28px',
                            padding: '0 6px',
                            background: '#f3e8ff',
                            color: '#7e22ce',
                            border: '1px solid #d8b4fe',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          عرض أمر التشغيل
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onConvertToJob(q)}
                          title="تعميد عرض السعر وفتح ملف الشحنة"
                          style={{
                            width: '115px',
                            height: '28px',
                            padding: '0 6px',
                            background: '#170e5e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 3px rgba(23, 14, 94, 0.2)',
                          }}
                        >
                          تحويل لأمر تشغيل
                        </button>
                      )}

                      {/* العمود 2: زر واتساب */}
                      {q.customer_phone ? (
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(q)}
                          title="مشاركة عرض السعر عبر واتساب"
                          style={{
                            width: '64px',
                            height: '28px',
                            padding: '0 6px',
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 3px rgba(22, 163, 74, 0.2)',
                          }}
                        >
                          واتساب
                        </button>
                      ) : (
                        <div style={{ width: '64px', height: '28px' }} />
                      )}

                      {/* العمود 3: زر الاعتماد */}
                      {q.status === 'draft' ? (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(q.id, 'approved')}
                          title="اعتماد من العميل"
                          style={{
                            width: '64px',
                            height: '28px',
                            padding: '0 6px',
                            background: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          اعتماد
                        </button>
                      ) : (
                        <div style={{ width: '64px', height: '28px' }} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
