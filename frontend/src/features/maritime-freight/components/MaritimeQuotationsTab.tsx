import { useNavigate } from 'react-router-dom';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { MaritimeQuotation } from '../api/maritime-freight.api';
import { toast } from '@/shared/components/system-alert';
import { printFreightQuotation } from '../utils/maritime-documents';

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

  const getModeBadge = (mode?: string) => {
    if (mode === 'air') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
          <AppIcons.Plane size={10} />
          <span>شحن جوي</span>
        </span>
      );
    }
    if (mode === 'road') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
          <AppIcons.Truck size={10} />
          <span>شحن بري</span>
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
        <AppIcons.Ship size={10} />
        <span>شحن بحري</span>
      </span>
    );
  };

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
    const modeLabel = quote.transport_mode === 'air' ? 'الجوي' : quote.transport_mode === 'road' ? 'البري' : 'البحري';
    const message = `مرحباً ${quote.customer_name}، نرسل لكم عرض سعر الشحن ${modeLabel}:\n` +
      `كود العرض: ${quote.quotation_number}\n` +
      `السعر الإجمالي: $${Number(quote.final_total).toLocaleString()} (${Number(quote.final_total_local).toLocaleString()} ${currencySymbol} تقريباً)\n` +
      `طريقة السداد: ${quote.payment_term}\nشكراً لاختياركم خدماتنا!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const approvedCount = quotations.filter((q) => q.status === 'approved' || q.status === 'converted_to_job').length;
  const pendingCount = quotations.filter((q) => q.status === 'sent' || q.status === 'draft').length;
  const totalEstimatedVal = quotations.reduce((acc, q) => acc + Number(q.final_total || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* بطاقات المؤشرات اللوجستية لعروض الأسعار القياسية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>إجمالي عروض الأسعار</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
              {quotations.length} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>عرض</span>
            </div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
            <AppIcons.FileText size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>عروض معتمدة ومحولة</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
              {approvedCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>عرض</span>
            </div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
            <AppIcons.CheckCircle size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>عروض جارية وقيد المراجعة</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
              {pendingCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>عرض</span>
            </div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
            <AppIcons.Clock size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>إجمالي القيمة التقديرية</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
              ${totalEstimatedVal.toLocaleString()}
            </div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#faf5ff', border: '1px solid #f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 }}>
            <AppIcons.Coins size={18} />
          </div>
        </div>
      </div>

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
            <col style={{ width: '315px' }} />
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <span>{q.quotation_number}</span>
                      {getModeBadge(q.transport_mode)}
                    </div>
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
                        gridTemplateColumns: '105px 52px 52px 52px',
                        gap: '5px',
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
                            width: '105px',
                            height: '28px',
                            padding: '0 4px',
                            background: '#f3e8ff',
                            color: '#7e22ce',
                            border: '1px solid #d8b4fe',
                            borderRadius: '6px',
                            fontSize: '0.73rem',
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
                            width: '105px',
                            height: '28px',
                            padding: '0 4px',
                            background: '#170e5e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.73rem',
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

                      {/* العمود 2: زر طباعة عرض السعر الرسمي PDF */}
                      <button
                        type="button"
                        onClick={() => printFreightQuotation(q)}
                        title="طباعة عرض سعر شحن رسمي A4 معتمد"
                        style={{
                          width: '52px',
                          height: '28px',
                          padding: '0 4px',
                          background: '#ffffff',
                          color: '#170e5e',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        طباعة
                      </button>

                      {/* العمود 3: زر واتساب */}
                      {q.customer_phone ? (
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(q)}
                          title="مشاركة عرض السعر عبر واتساب"
                          style={{
                            width: '52px',
                            height: '28px',
                            padding: '0 4px',
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.73rem',
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
                        <div style={{ width: '52px', height: '28px' }} />
                      )}

                      {/* العمود 4: زر الاعتماد */}
                      {q.status === 'draft' ? (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(q.id, 'approved')}
                          title="اعتماد من العميل"
                          style={{
                            width: '52px',
                            height: '28px',
                            padding: '0 4px',
                            background: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            borderRadius: '6px',
                            fontSize: '0.73rem',
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
                        <div style={{ width: '52px', height: '28px' }} />
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
  </div>
);
}
