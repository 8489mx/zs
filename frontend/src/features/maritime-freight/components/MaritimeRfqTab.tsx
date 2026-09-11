import { MaritimeRfq } from '../api/maritime-freight.api';

interface MaritimeRfqTabProps {
  rfqs: MaritimeRfq[];
  loading: boolean;
  onOpenCreate?: () => void;
  onSelectRfqForMatrix: (rfq: MaritimeRfq) => void;
  onOpenAddBid: (rfq: MaritimeRfq) => void;
  onDispatchEmails: (rfq: MaritimeRfq) => void;
}

export function MaritimeRfqTab({
  rfqs,
  loading,
  onOpenCreate,
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
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '12px 14px' }}>كود الطلب</th>
              <th style={{ padding: '12px 14px' }}>مسار الشحنة</th>
              <th style={{ padding: '12px 14px' }}>الحاويات والبضاعة</th>
              <th style={{ padding: '12px 14px' }}>الشرط والسداد</th>
              <th style={{ padding: '12px 14px' }}>العروض المستلمة</th>
              <th style={{ padding: '12px 14px' }}>أفضل عرض</th>
              <th style={{ padding: '12px 14px' }}>الحالة</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
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
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#170e5e' }}>
                    {rfq.rfq_number}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{rfq.pol_code} ➔ {rfq.pod_code}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{rfq.pol_name} إلى {rfq.pod_name}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div><strong>{rfq.container_count}x {rfq.container_type}</strong> ({rfq.cargo_mode})</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{rfq.commodity_description || 'عام'}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div>{rfq.incoterm}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{rfq.payment_term}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '2px 8px', background: rfq.bidsCount ? '#e0f2fe' : '#f1f5f9', color: rfq.bidsCount ? '#0369a1' : '#64748b', borderRadius: '10px', fontWeight: 700 }}>
                      {rfq.bidsCount || 0} عروض
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#15803d' }}>
                    {rfq.bestBid ? (
                      <div>
                        ${Number(rfq.bestBid.total_freight_cost).toLocaleString()}
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{rfq.bestBid.shipping_line_name} ({rfq.bestBid.free_days}d)</div>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>بانتظار الرد</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {getStatusBadge(rfq.status)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onSelectRfqForMatrix(rfq)}
                        title="مصفوفة مقارنة العروض"
                        style={{
                          padding: '5px 10px',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        مصفوفة الأسعار
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAddBid(rfq)}
                        title="تسجيل عرض سعر يدوي"
                        style={{
                          padding: '5px 8px',
                          background: '#f8fafc',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + عرض سعر
                      </button>
                      <button
                        type="button"
                        onClick={() => onDispatchEmails(rfq)}
                        title="تحديد الخطوط وإرسال الإيميلات"
                        style={{
                          padding: '5px 8px',
                          background: rfq.status === 'draft' ? '#170e5e' : '#eff6ff',
                          color: rfq.status === 'draft' ? '#ffffff' : '#1e40af',
                          border: rfq.status === 'draft' ? 'none' : '1px solid #bfdbfe',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {rfq.status === 'draft' ? 'إرسال' : 'إرسال للخطوط'}
                      </button>
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
