import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { maritimeApi, MaritimeJob } from '../api/maritime-freight.api';
import { DCSA_STANDARD_MILESTONES, DcsaMilestoneKey } from '../maritime-freight.types';

interface JobDetailsModalProps {
  open: boolean;
  jobId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function JobDetailsModal({ open, jobId, onClose, onUpdated }: JobDetailsModalProps) {
  const [job, setJob] = useState<MaritimeJob | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'containers' | 'milestones' | 'finance'>('overview');
  const [nextMilestone, setNextMilestone] = useState<DcsaMilestoneKey>('GTI');
  const [milestoneNotes, setMilestoneNotes] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchJob = async () => {
    if (!jobId) return;
    try {
      const data = await maritimeApi.getJobById(jobId);
      setJob(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (open && jobId) {
      fetchJob();
    }
  }, [open, jobId]);

  if (!job) return null;

  const handleAdvanceMilestone = async () => {
    try {
      await maritimeApi.addJobMilestone(job.id, nextMilestone, milestoneNotes || undefined);
      setMilestoneNotes('');
      await fetchJob();
      onUpdated();
    } catch (err: any) {
      alert(err?.message || 'فشل تحديث المرحلة الملاحية');
    }
  };

  const handleReleaseDo = async () => {
    if (!confirm('هل أنت متأكد من اعتماد وتسليم إذن التسليم الملاحي الرسمي (Delivery Order D/O) للعميل؟')) return;
    try {
      await maritimeApi.releaseDeliveryOrder(job.id);
      await fetchJob();
      onUpdated();
    } catch (err: any) {
      alert(err?.message || 'فشل تسليم إذن الإفراج');
    }
  };

  const trackingUrl = job.tracking_token
    ? `${window.location.origin}/public/track/${job.tracking_token}`
    : '';

  const handleCopyTrackingLink = () => {
    if (trackingUrl) {
      navigator.clipboard.writeText(trackingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={`ملف العملية الملاحية: ${job.job_number}`}
      subtitle={`العميل: ${job.customer_name} | المسار: ${job.pol_name} إلى ${job.pod_name}`}
      width="min(880px, 95vw)"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          cancelText="إغلاق"
        />
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* هيدر التبويبات القياسي */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'overview' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'overview' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            بيانات الرحلة والحجز
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('containers')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'containers' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'containers' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            الحاويات ({job.containers?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'milestones' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'milestones' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            مسار التتبع DCSA ({job.milestones?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'finance' ? '#170e5e' : '#f1f5f9',
              color: activeTab === 'finance' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            ربحية العملية (Job P&L)
          </button>
        </div>

        {/* Tab 1: نظرة عامة وبيانات الحجز */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>الخط الملاحي ورقم الحجز</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#170e5e', marginTop: '4px' }}>
                {job.shipping_line_name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '2px' }}>
                رقم الحجز (Booking No): <strong>{job.booking_number || 'غير محدد'}</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>السفينة ورقم الرحلة (Vessel / Voyage)</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#170e5e', marginTop: '4px' }}>
                {job.vessel_name || 'لم تسجل السفينة'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '2px' }}>
                الرحلة: {job.voyage_number || '-'} | طريقة السداد: {job.payment_term}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>مواعيد الإبحار والوصول (ETD / ETA)</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#170e5e', marginTop: '4px' }}>
                الإبحار: {job.etd || 'قيد الجدولة'} ➔ الوصول: {job.eta || 'قيد الجدولة'}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>بوالص الشحن (B/L Details)</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#170e5e', marginTop: '4px' }}>
                Master B/L: {job.mbl_number || 'قيد الإصدار'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                House B/L: {job.hbl_number || 'قيد الإصدار'} ({job.bl_type})
              </div>
            </div>

            {/* رابط تتبع العميل السحابي المباشر */}
            <div style={{ gridColumn: '1 / -1', background: '#eff6ff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e40af' }}>
                  رابط التتبع المباشر للعميل (Client Live Tracking Link):
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px', wordBreak: 'break-all' }}>
                  {trackingUrl || 'جاري توليد الرابط...'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyTrackingLink}
                style={{
                  padding: '6px 14px',
                  background: copiedLink ? '#22c55e' : '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {copiedLink ? 'تم النسخ!' : 'نسخ الرابط'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: قائمة الحاويات والتأمين */}
        {activeTab === 'containers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {job.containers?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '0.85rem' }}>
                لا توجد حاويات مسجلة في هذا الملف بعد.
              </div>
            ) : (
              job.containers?.map((c) => (
                <div key={c.id} style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: '#170e5e' }}>{c.container_number}</span>
                      <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                        {c.container_type}
                      </span>
                      {c.seal_number && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ختم: {c.seal_number}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px' }}>
                      فترة السماح: {c.free_days} يوم | آخر موعد للإرجاع: {c.return_deadline || 'لم يحدد'} | التأمين: {Number(c.deposit_amount).toLocaleString()} {c.deposit_currency} ({c.deposit_status})
                    </div>
                  </div>
                  <div>
                    {c.empty_returned_at ? (
                      <span style={{ padding: '4px 10px', background: '#f1f5f9', color: '#475569', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                        تم إرجاع الفارغ بنجاح
                      </span>
                    ) : (
                      <span style={{ padding: '4px 10px', background: c.is_overdue ? '#fef2f2' : '#f0fdf4', color: c.is_overdue ? '#b91c1c' : '#15803d', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {c.is_overdue ? 'تجاوزت فترة السماح (غرامات)' : 'سارية ضمن فترة السماح'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: مسار التتبع DCSA */}
        {activeTab === 'milestones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* ترقية المرحلة */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>ترقية المرحلة الملاحية (DCSA Milestone)</div>
                <select
                  value={nextMilestone}
                  onChange={(e) => setNextMilestone(e.target.value as any)}
                  style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem' }}
                >
                  {DCSA_STANDARD_MILESTONES.map((m) => (
                    <option key={m.key} value={m.key}>
                      [{m.key}] {m.title_ar} - {m.title_en}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>ملاحظات المرحلة أو الموقع</div>
                <input
                  type="text"
                  value={milestoneNotes}
                  onChange={(e) => setMilestoneNotes(e.target.value)}
                  placeholder="مثال: رست السفينة برصيف 45"
                  style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.85rem' }}
                />
              </div>
              <button
                type="button"
                onClick={handleAdvanceMilestone}
                style={{
                  height: '36px',
                  marginTop: '18px',
                  padding: '0 16px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                تحديث المرحلة
              </button>
            </div>

            {/* زر تسليم إذن التسليم D/O */}
            {!job.delivery_order_released && (
              <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>
                  إذن التسليم (Delivery Order D/O) محتجز حتى تحصيل مستحقات الشحن.
                </div>
                <button
                  type="button"
                  onClick={handleReleaseDo}
                  style={{
                    padding: '6px 14px',
                    background: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  اعتماد وتسليم إذن الإفراج (Release D/O)
                </button>
              </div>
            )}

            {/* السجل الزمني للمحطات */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {job.milestones?.map((m, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{m.milestone_title}</div>
                      {m.notes && <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>{m.notes}</div>}
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                        {new Date(m.occurred_at).toLocaleString('ar-EG')}
                      </div>
                    </div>
                  </div>

                  {job.customer_phone && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const alertData = await maritimeApi.getJobWhatsAppAlert(job.id, m.milestone_key);
                          const cleanPhone = (alertData.customerPhone || job.customer_phone || '').replace(/[^0-9]/g, '');
                          if (cleanPhone) {
                            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(alertData.message)}`, '_blank');
                          } else {
                            alert('لا يوجد رقم هاتف للعميل');
                          }
                        } catch (err: any) {
                          alert(err?.message || 'فشل توليد رسالة واتساب');
                        }
                      }}
                      title="إرسال إشعار بالواتساب للعميل"
                      style={{
                        padding: '4px 8px',
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      إشعار واتساب
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: ربحية العملية والحسابات */}
        {activeTab === 'finance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#170e5e', color: '#ffffff', padding: '18px', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>إجمالي الفاتورة للعميل (Revenue)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                  ${Number(job.client_invoiced_total || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', color: '#fca5a5' }}>تكلفة الخط الملاحي (Cost)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
                  ${Number(job.carrier_cost_total || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', color: '#86efac' }}>صافي ربح العملية (Net P&L)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4ade80', marginTop: '4px' }}>
                  ${Number(job.net_profit || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#475569' }}>
              مركز التكلفة المرتبط في دليل الحسابات: <strong>{job.cost_center_id ? `ID #${job.cost_center_id} (${job.job_number})` : 'مفعل تلقائياً'}</strong>. يتم ترحيل كافة فواتير الخدمات ومصروفات الموانئ وسندات صرف التأمين مباشرة لهذا المركز.
            </div>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
