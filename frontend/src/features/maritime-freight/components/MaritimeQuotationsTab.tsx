import { MaritimeQuotation } from '../api/maritime-freight.api';

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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>مسودة</span>;
      case 'sent':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700 }}>أرسل للعميل</span>;
      case 'approved':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 700 }}>معتمد من العميل ✓</span>;
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
      alert('لا يوجد رقم هاتف مسجل لهذا العميل');
      return;
    }
    const cleanPhone = quote.customer_phone.replace(/[^0-9]/g, '');
    const message = `مرحباً ${quote.customer_name}، نرسل لكم عرض سعر الشحن البحري:\n` +
      `كود العرض: ${quote.quotation_number}\n` +
      `السعر الإجمالي: $${Number(quote.final_total).toLocaleString()} (${Number(quote.final_total_local).toLocaleString()} ج.م تقريباً)\n` +
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
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '12px 14px' }}>رقم العرض</th>
              <th style={{ padding: '12px 14px' }}>العميل وبيانات التواصل</th>
              <th style={{ padding: '12px 14px' }}>التكلفة الأساسية</th>
              <th style={{ padding: '12px 14px' }}>الهامش الربحي</th>
              <th style={{ padding: '12px 14px' }}>السعر النهائي للعميل</th>
              <th style={{ padding: '12px 14px' }}>الحالة</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
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
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#170e5e' }}>
                    {q.quotation_number}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{q.customer_name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{q.customer_phone || q.customer_email || 'بدون بيانات تواصل'}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    ${Number(q.base_cost).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#15803d', fontWeight: 700 }}>
                    {q.margin_type === 'percentage' ? `${q.margin_value}%` : `+$${Number(q.margin_value).toLocaleString()}`}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#170e5e' }}>
                      ${Number(q.final_total).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      ≈ {Number(q.final_total_local).toLocaleString()} ج.م
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {getStatusBadge(q.status)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      {q.status !== 'converted_to_job' && (
                        <button
                          type="button"
                          onClick={() => onConvertToJob(q)}
                          style={{
                            padding: '5px 10px',
                            background: '#170e5e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          تحويل لأمر تشغيل
                        </button>
                      )}
                      {q.customer_phone && (
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(q)}
                          title="مشاركة عبر واتساب"
                          style={{
                            padding: '5px 8px',
                            background: '#22c55e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          واتساب
                        </button>
                      )}
                      {q.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(q.id, 'approved')}
                          title="اعتماد من العميل"
                          style={{
                            padding: '5px 8px',
                            background: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          اعتماد
                        </button>
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
