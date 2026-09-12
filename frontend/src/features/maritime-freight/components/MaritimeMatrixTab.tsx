import { useState, useEffect } from 'react';
import { MaritimeRfq, MaritimeRfqBid, maritimeApi } from '../api/maritime-freight.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';

interface MaritimeMatrixTabProps {
  rfqs: MaritimeRfq[];
  selectedRfqId: string | null;
  onSelectRfqId: (id: string) => void;
  onApproveBid: (rfq: MaritimeRfq, bid: MaritimeRfqBid) => void;
  onOpenAddBid: (rfq: MaritimeRfq) => void;
  onSyncEmails?: () => void;
  syncing?: boolean;
}

export function MaritimeMatrixTab({
  rfqs,
  selectedRfqId,
  onSelectRfqId,
  onApproveBid,
  onOpenAddBid,
  onSyncEmails,
  syncing = false,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px', maxWidth: '520px' }}>
          <span style={{ fontWeight: 700, color: '#170e5e', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>طلب التسعير النشط:</span>
          <div style={{ flex: 1 }}>
            <CustomSelect
              value={activeRfqId || ''}
              onChange={(val) => onSelectRfqId(val)}
              placeholder="اختر طلب التسعير..."
              options={rfqs.map((r) => ({
                value: String(r.id),
                label: `${r.rfq_number} — ${r.pol_code} إلى ${r.pod_code} (${r.container_count}x ${r.container_type})`,
              }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onSyncEmails && (
            <button
              type="button"
              disabled={syncing}
              onClick={onSyncEmails}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#1e40af',
                cursor: syncing ? 'not-allowed' : 'pointer',
                opacity: syncing ? 0.7 : 1,
              }}
              title="سحب وفحص الإيميلات الواردة من الخطوط وقراءتها آلياً"
            >
              <AppIcons.RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{syncing ? 'جاري فحص الإيميلات...' : 'مزامنة الردود الواردة (Sync Bids)'}</span>
            </button>
          )}

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
      </div>

      {/* تفاصيل مسار الطلب النشط بتصميم مؤسسي ناصع */}
      {currentRfq && (() => {
        const getCutOffInfo = () => {
          if (!currentRfq.cut_off_deadline) return null;
          const diffMs = new Date(currentRfq.cut_off_deadline).getTime() - Date.now();
          if (diffMs <= 0) {
            return {
              expired: true,
              text: 'انتهت مهلة المزايدة (جاهز للترسية)',
              bg: '#fef3c7',
              color: '#92400e',
              border: '#fde68a',
            };
          }
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          return {
            expired: false,
            text: `متبقي ${hours > 0 ? `${hours} س و ` : ''}${minutes} دقيقة على غلق المزايدة`,
            bg: hours <= 2 ? '#fef2f2' : '#f0fdf4',
            color: hours <= 2 ? '#991b1b' : '#166534',
            border: hours <= 2 ? '#fecaca' : '#bbf7d0',
          };
        };

        const cutOffInfo = getCutOffInfo();

        return (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>كود الاستفسار الملاحي</div>
                  {currentRfq.urgency_level === 'urgent' && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                      عاجل (Spot 6h)
                    </span>
                  )}
                  {currentRfq.auto_awarded && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                      تمت الترسية آلياً
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>{currentRfq.rfq_number}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>المسار والحاويات</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {currentRfq.pol_name} ({currentRfq.pol_code}) ← {currentRfq.pod_name} ({currentRfq.pod_code})
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '1px' }}>
                  {currentRfq.container_count}x {currentRfq.container_type} | {currentRfq.commodity_description || 'عام'} | شرط: {currentRfq.incoterm}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {cutOffInfo && (
                  <div style={{ textAlign: 'center', padding: '6px 14px', borderRadius: '8px', background: cutOffInfo.bg, border: `1px solid ${cutOffInfo.border}`, color: cutOffInfo.color }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600 }}>مؤقت مهلة عروض الأسعار</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, marginTop: '2px' }}>{cutOffInfo.text}</div>
                  </div>
                )}

                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>أيام السماح المستهدفة</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                    {currentRfq.target_free_days} يوم
                  </div>
                </div>
              </div>
            </div>

            {currentRfq.target_rate_max && (
              <div style={{ fontSize: '0.75rem', color: '#475569', background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 700, color: '#170e5e' }}>شرط الترسية المبكرة:</span>
                <span>سقف السعر المستهدف ${Number(currentRfq.target_rate_max).toLocaleString()} مع ${currentRfq.target_free_days} يوم سماح (يتم اعتماد أي خط يحقق هذا الشرط فوراً).</span>
              </div>
            )}
          </div>
        );
      })()}

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
                    طريقة الاستلام: {bid.submission_channel === 'email_auto' ? 'بريد إلكتروني تلقائي' : bid.submission_channel === 'carrier_portal' ? 'بوابة الخطوط الإلكترونية' : 'تسجيل يدوي'}
                  </div>

                  {/* السعر الإجمالي البارز */}
                  <div style={{ marginTop: '14px', marginBottom: '14px', textAlign: 'center', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>إجمالي تكلفة الشحن والموانئ</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#170e5e', marginTop: '2px' }}>
                      ${Number(bid.total_freight_cost || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                      عملة التسعير: {bid.currency}
                    </div>
                  </div>

                  {/* تفاصيل التكاليف وأيام السماح */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>نولون بحري (OF):</span>
                      <strong>${Number(bid.ocean_freight || 0).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>عوائد موانئ (THC):</span>
                      <strong>${(Number(bid.thc_origin || 0) + Number(bid.thc_destination || 0)).toLocaleString()}</strong>
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
                  {isAwarded ? 'تعديل عرض السعر' : 'اعتماد السعر وإصدار عرض للعميل ←'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
