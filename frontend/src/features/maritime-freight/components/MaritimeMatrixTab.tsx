import { useState, useEffect } from 'react';
import { MaritimeRfq, MaritimeRfqBid, maritimeApi } from '../api/maritime-freight.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface MaritimeMatrixTabProps {
  rfqs: MaritimeRfq[];
  selectedRfqId: string | null;
  onSelectRfqId: (id: string) => void;
  onApproveBid: (rfq: MaritimeRfq, bid: MaritimeRfqBid) => void;
  onOpenAddBid: (rfq: MaritimeRfq) => void;
}

export function MaritimeMatrixTab({
  rfqs,
  selectedRfqId,
  onSelectRfqId,
  onApproveBid,
  onOpenAddBid,
}: MaritimeMatrixTabProps) {
  const activeRfqId = selectedRfqId || (rfqs.length > 0 ? String(rfqs[0].id) : null);
  const initialRfq = rfqs.find((r) => String(r.id) === String(activeRfqId)) || null;
  const [currentRfq, setCurrentRfq] = useState<MaritimeRfq | null>(initialRfq);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeRfqId) {
      const match = rfqs.find((r) => String(r.id) === String(activeRfqId));
      if (match && (!currentRfq || currentRfq.id !== match.id)) {
        setCurrentRfq(match);
      }
      setLoading(true);
      maritimeApi.getRfqById(activeRfqId)
        .then((data) => setCurrentRfq(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [activeRfqId, rfqs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* شريط اختيار طلب التسعير */}
      <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 700, color: '#170e5e', fontSize: '0.88rem' }}>طلب التسعير النشط:</span>
          <select
            value={activeRfqId || ''}
            onChange={(e) => onSelectRfqId(e.target.value)}
            style={{ minWidth: '320px', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem', fontWeight: 600 }}
          >
            {rfqs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.rfq_number} — {r.pol_code} إلى {r.pod_code} ({r.container_count}x {r.container_type})
              </option>
            ))}
          </select>
        </div>

        {currentRfq && (
          <button
            type="button"
            onClick={() => onOpenAddBid(currentRfq)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem',
              color: '#1e293b',
              cursor: 'pointer',
            }}
          >
            <AppIcons.Plus size={16} />
            <span>تسجيل عرض سعر يدوي</span>
          </button>
        )}
      </div>

      {/* تفاصيل مسار الطلب النشط بتصميم مؤسسي ناصع */}
      {currentRfq && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>كود الاستفسار الملاحي</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>{currentRfq.rfq_number}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>المسار والحاويات</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {currentRfq.pol_name} ({currentRfq.pol_code}) ➔ {currentRfq.pod_name} ({currentRfq.pod_code})
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '1px' }}>
              {currentRfq.container_count}x {currentRfq.container_type} | {currentRfq.commodity_description || 'عام'} | شرط: {currentRfq.incoterm}
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>أيام السماح المستهدفة</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
              {currentRfq.target_free_days} يوم
            </div>
          </div>
        </div>
      )}

      {/* شبكة كروت مقارنة الأسعار */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          جاري تجهيز مصفوفة المقارنة...
        </div>
      ) : !currentRfq?.bids || currentRfq.bids.length === 0 ? (
        <div style={{ background: '#ffffff', padding: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
          لم يتم استلام أي عروض أسعار لهذا الطلب حتى الآن. يمكنك النقر على زر "تسجيل عرض سعر يدوي" لإدخال عروض الوكلاء.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {currentRfq.bids.map((bid) => {
            const isBest = bid.isBestValue;
            const isAwarded = bid.is_awarded;

            return (
              <div
                key={bid.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: isAwarded ? '2px solid #22c55e' : isBest ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  boxShadow: isBest ? '0 4px 12px rgba(59, 130, 246, 0.12)' : 'none',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  position: 'relative',
                }}
              >
                {/* شارة الترسية أو أفضل قيمة */}
                {isAwarded ? (
                  <span style={{ position: 'absolute', top: '12px', left: '12px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                    العرض المعتمد
                  </span>
                ) : isBest ? (
                  <span style={{ position: 'absolute', top: '12px', left: '12px', background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                    أفضل قيمة (Best Value)
                  </span>
                ) : null}

                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#170e5e', paddingRight: '0' }}>
                    {bid.shipping_line_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    طريقة الاستلام: {bid.submission_channel === 'email_auto' ? 'بريد إلكتروني تلقائي' : 'تسجيل يدوي'}
                  </div>

                  {/* السعر الإجمالي البارز */}
                  <div style={{ marginTop: '14px', marginBottom: '14px', textAlign: 'center', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>إجمالي تكلفة الشحن والموانئ</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#170e5e', marginTop: '2px' }}>
                      ${Number(bid.total_freight_cost).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                      عملة التسعير: {bid.currency}
                    </div>
                  </div>

                  {/* تفاصيل التكاليف وأيام السماح */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>نولون بحري (OF):</span>
                      <strong>${Number(bid.ocean_freight).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>عوائد موانئ (THC):</span>
                      <strong>${Number(bid.thc_origin + bid.thc_destination).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>فترة السماح (Free Days):</span>
                      <strong style={{ color: bid.free_days >= 14 ? '#15803d' : '#b45309' }}>
                        {bid.free_days} يوم
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>مدة الإبحار (Transit):</span>
                      <strong>{bid.transit_time_days ? `${bid.transit_time_days} يوم` : 'غير محدد'}</strong>
                    </div>
                  </div>
                </div>

                {/* زر اعتماد السعر وتطبيق الهامش */}
                <button
                  type="button"
                  onClick={() => onApproveBid(currentRfq, bid)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: isAwarded ? '#15803d' : '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isAwarded ? 'تعديل عرض السعر' : 'اعتماد السعر وإصدار عرض للعميل ➔'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
