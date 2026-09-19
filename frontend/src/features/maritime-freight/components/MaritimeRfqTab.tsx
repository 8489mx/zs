import { MaritimeRfq } from '../api/maritime-freight.api';

interface MaritimeRfqTabProps {
  rfqs: MaritimeRfq[];
  loading: boolean;
  onOpenCreate?: () => void;
  onOpenRateCards?: () => void;
  onSelectRfqForMatrix: (rfq: MaritimeRfq) => void;
  onOpenAddBid: (rfq: MaritimeRfq) => void;
  onDispatchEmails: (rfq: MaritimeRfq) => void;
}

function getShortShippingLineName(fullName: string): string {
  if (!fullName) return '';
  return fullName.replace(/\s*\(.*?\).*/g, '').trim();
}

export function MaritimeRfqTab({
  rfqs,
  loading,
  onOpenCreate,
  onOpenRateCards,
  onSelectRfqForMatrix,
  onOpenAddBid,
  onDispatchEmails,
}: MaritimeRfqTabProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>مسودة</span>;
      case 'sent':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700 }}>مرسل للخطوط</span>;
      case 'bids_received':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', fontSize: '0.72rem', fontWeight: 700 }}>وصلت عروض أسعار</span>;
      case 'awarded':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 700 }}>تمت الترسية</span>;
      case 'cancelled':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700 }}>ملغي</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>{status}</span>;
    }
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      {/* Header الكارت الموحد */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
            طلبات تسعير الخطوط الملاحية (Carrier RFQs)
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            إرسال طلبات التسعير المجمعة للخطوط الملاحية والوكلاء ومقارنة العروض المستلمة
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
            {rfqs.length} طلب تسعير
          </span>
          {onOpenRateCards && (
            <button
              type="button"
              onClick={onOpenRateCards}
              style={{
                padding: '6px 12px',
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              تعرفات وعقود الأسعار
            </button>
          )}
          {onOpenCreate && (
            <button
              type="button"
              onClick={onOpenCreate}
              style={{
                padding: '6px 12px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + إنشاء طلب جديد
            </button>
          )}
        </div>
      </div>

      {/* جدول طلبات التسعير */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.80rem' }}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '23%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '10px 8px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>كود الطلب</th>
              <th style={{ padding: '10px 8px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>مسار الشحنة</th>
              <th style={{ padding: '10px 8px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>الحاويات والبضاعة</th>
              <th style={{ padding: '10px 8px', fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'center' }}>الشرط والسداد</th>
              <th style={{ padding: '10px 8px', fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'center' }}>العروض المستلمة</th>
              <th style={{ padding: '10px 8px', fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'center' }}>أفضل عرض</th>
              <th style={{ padding: '10px 8px', fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'center' }}>الحالة</th>
              <th style={{ padding: '10px 8px', fontSize: '0.76rem', textAlign: 'center', whiteSpace: 'nowrap' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  جاري تحميل طلبات التسعير الملاحية...
                </td>
              </tr>
            ) : rfqs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  لا توجد طلبات تسعير مسجلة بعد. انقر على "طلب تسعير جديد" لإرسال أول استفسار للخطوط الملاحية.
                </td>
              </tr>
            ) : (
              rfqs.map((rfq) => (
                <tr key={rfq.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 800, color: '#170e5e', fontSize: '0.78rem' }}>
                      {rfq.rfq_number}
                    </span>
                  </td>
                  <td style={{ padding: '8px 8px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                      {rfq.pol_code} ➔ {rfq.pod_code}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#475569', lineHeight: 1.35, marginTop: '2px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rfq.pol_name}>
                        {rfq.pol_name}
                      </div>
                      <div style={{ color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`إلى ${rfq.pod_name}`}>
                        إلى {rfq.pod_name}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '8px 8px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {rfq.container_count}x {rfq.container_type}{' '}
                      <span style={{ fontSize: '0.70rem', fontWeight: 500, color: '#64748b' }}>({rfq.cargo_mode})</span>
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rfq.commodity_description || 'عام'}>
                      {rfq.commodity_description || 'عام'}
                    </div>
                  </td>
                  <td style={{ padding: '8px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{rfq.incoterm}</div>
                    <div style={{ fontSize: '0.70rem', color: '#64748b', whiteSpace: 'nowrap' }}>{rfq.payment_term}</div>
                  </td>
                  <td style={{ padding: '8px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        background: rfq.bidsCount ? '#e0f2fe' : '#f1f5f9',
                        color: rfq.bidsCount ? '#0369a1' : '#64748b',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                      }}
                    >
                      {rfq.bidsCount || 0} عروض
                    </span>
                  </td>
                  <td style={{ padding: '8px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                    {rfq.bestBid ? (
                      <div
                        title={`${rfq.bestBid.shipping_line_name}${rfq.bestBid.free_days ? ` (${rfq.bestBid.free_days}d)` : ''}`}
                        style={{ minWidth: 0, textAlign: 'center' }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          ${Number(rfq.bestBid.total_freight_cost).toLocaleString()}
                        </div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: '#334155',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            direction: 'ltr',
                            textAlign: 'center',
                          }}
                        >
                          {getShortShippingLineName(rfq.bestBid.shipping_line_name)}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-block', textAlign: 'center' }}>بانتظار الرد</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 8px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {getStatusBadge(rfq.status)}
                  </td>
                  <td style={{ padding: '8px 4px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '96px 74px 92px',
                          gap: '6px',
                          alignItems: 'center',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectRfqForMatrix(rfq)}
                          title="مصفوفة مقارنة العروض"
                          style={{
                            width: '96px',
                            height: '28px',
                            padding: '0 4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxSizing: 'border-box',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          مصفوفة الأسعار
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenAddBid(rfq)}
                          title="تسجيل عرض سعر يدوي"
                          style={{
                            width: '74px',
                            height: '28px',
                            padding: '0 4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxSizing: 'border-box',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          + عرض سعر
                        </button>
                        <button
                          type="button"
                          onClick={() => onDispatchEmails(rfq)}
                          title="تحديد الخطوط وإرسال الإيميلات"
                          style={{
                            width: '92px',
                            height: '28px',
                            padding: '0 4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: rfq.status === 'draft' ? '#170e5e' : '#eff6ff',
                            color: rfq.status === 'draft' ? '#ffffff' : '#1e40af',
                            border: rfq.status === 'draft' ? '1px solid #170e5e' : '1px solid #bfdbfe',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxSizing: 'border-box',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          {rfq.status === 'draft' ? 'إرسال' : 'إرسال للخطوط'}
                        </button>
                      </div>
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
