import { useState, useEffect } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { maritimeApi, MaritimeJob } from '../api/maritime-freight.api';
import { DCSA_STANDARD_MILESTONES, DcsaMilestoneKey } from '../maritime-freight.types';
import { toast, systemConfirm } from '@/shared/components/system-alert';

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
    } else if (!open) {
      setJob(null);
    }
  }, [open, jobId]);

  if (!open) return null;

  if (!job) {
    return (
      <StandardDialog
        open={open}
        onClose={onClose}
        title="ملف العملية الملاحية"
        subtitle="جاري جلب تفاصيل وبيانات العملية..."
        width="min(1080px, 95vw)"
        height="min(760px, 90vh)"
        loading={true}
        loadingText="جاري تحميل ملف العملية الملاحية..."
      >
        <div style={{ minHeight: '420px' }} />
      </StandardDialog>
    );
  }

  const handleAdvanceMilestone = async () => {
    try {
      await maritimeApi.addJobMilestone(job.id, nextMilestone, milestoneNotes || undefined);
      setMilestoneNotes('');
      await fetchJob();
      onUpdated();
      toast.success('تم تسجيل المرحلة الملاحية وتحديث التتبع بنجاح');
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث المرحلة الملاحية');
    }
  };

  const handleReleaseDo = async () => {
    const confirmed = await systemConfirm({
      title: 'اعتماد وتسليم إذن التسليم الملاحي D/O',
      badge: job.job_number,
      message: 'هل أنت متأكد من اعتماد وتسليم إذن التسليم الملاحي الرسمي (Delivery Order) للعميل؟',
      impactItems: [
        'تسجيل مرحلة D/O الرسمية في سجل الشحنة وتحديث بوابات التتبع للعميل.',
        'إتمام إجراءات الإفراج الجمركي والسماح بخروج الحاويات من ساحات الميناء.',
      ],
      confirmText: 'اعتماد وتسليم إذن الإفراج',
      cancelText: 'تراجع',
      variant: 'primary',
    });
    if (!confirmed) return;
    try {
      await maritimeApi.releaseDeliveryOrder(job.id);
      await fetchJob();
      onUpdated();
      toast.success('تم اعتماد وتسليم إذن التسليم D/O بنجاح');
    } catch (err: any) {
      toast.error(err?.message || 'فشل تسليم إذن الإفراج');
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
      width="min(1080px, 95vw)"
      height="min(760px, 90vh)"
      footerActions={(
        <StandardDialogFooter
          onCancel={onClose}
          cancelText="إغلاق"
        />
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
        {/* هيدر التبويبات القياسي */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', flexShrink: 0 }}>
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

        {/* جسم التبويبات الموحد بارتفاع ثابت يمنع التذبذب أو التغير نهائياً */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingInlineEnd: '4px' }}>
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
                <CustomSelect
                  value={nextMilestone}
                  onChange={(val) => setNextMilestone(val as DcsaMilestoneKey)}
                  options={DCSA_STANDARD_MILESTONES.map((m) => ({
                    value: m.key,
                    label: `[${m.key}] ${m.title_ar} - ${m.title_en}`,
                  }))}
                  placeholder="اختر المرحلة الملاحية..."
                />
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
                            toast.warning('لا يوجد رقم هاتف مسجل للعميل');
                          }
                        } catch (err: any) {
                          toast.error(err?.message || 'فشل توليد رسالة واتساب');
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
        {activeTab === 'finance' && (() => {
          const revenue = Number(job.client_invoiced_total || 0);
          const carrierCost = Number(job.carrier_cost_total || 0);
          const otherCosts = Number(job.other_costs_total || 0);
          const totalCost = carrierCost + otherCosts;
          const netProfit = Number(job.net_profit || (revenue - totalCost));
          const marginPercent = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0';
          const containerDeposits = job.containers?.reduce((acc, c) => acc + (Number(c.deposit_amount) || 0), 0) || 0;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. الثلاث بطاقات المالية المعتمدة (Clean White KPI Cards) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {/* Card 1: Revenue */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    borderTop: '3px solid #170e5e',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي الفاتورة للعميل</span>
                    <span style={{ padding: '2px 8px', background: '#eff6ff', color: '#1e40af', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                      Revenue
                    </span>
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#170e5e', letterSpacing: '-0.02em' }}>
                    ${revenue.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    مبيعات الشحن والخدمات البحرية
                  </div>
                </div>

                {/* Card 2: Cost */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    borderTop: '3px solid #ef4444',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تكلفة الخط والموانئ</span>
                    <span style={{ padding: '2px 8px', background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                      Direct Cost
                    </span>
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: totalCost > 0 ? '#b91c1c' : '#0f172a', letterSpacing: '-0.02em' }}>
                    ${totalCost.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    نولون بحري ومصروفات محطات الموانئ
                  </div>
                </div>

                {/* Card 3: Net Profit */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    borderTop: '3px solid #10b981',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>صافي ربح العملية</span>
                    <span style={{ padding: '2px 8px', background: '#f0fdf4', color: '#166534', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                      هامش: {marginPercent}%
                    </span>
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: netProfit >= 0 ? '#15803d' : '#b91c1c', letterSpacing: '-0.02em' }}>
                    ${netProfit.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    المساهمة الصافية في أرباح التشغيل
                  </div>
                </div>
              </div>

              {/* 2. جدول البيان المالي وتفكيك التكاليف والإيرادات */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '8px 14px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    بيان وتفكيك الحسابات التقديرية والفعلية للعملية
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    العملة الأساسية: الدولار الأمريكي (USD)
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                      <th style={{ padding: '8px 14px', fontWeight: 700 }}>بند الحساب</th>
                      <th style={{ padding: '8px 14px', fontWeight: 700 }}>الطرف والجهة</th>
                      <th style={{ padding: '8px 14px', fontWeight: 700 }}>التصنيف المحاسبي</th>
                      <th style={{ padding: '8px 14px', fontWeight: 700 }}>المبلغ</th>
                      <th style={{ padding: '8px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 14px', fontWeight: 700, color: '#170e5e' }}>إيراد الشحن البحري للعميل (Ocean Freight Billed)</td>
                      <td style={{ padding: '8px 14px', color: '#334155' }}>{job.customer_name}</td>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>إيراد تشغيلي معتمد</td>
                      <td style={{ padding: '8px 14px', fontWeight: 800, color: '#170e5e' }}>${revenue.toLocaleString()}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', background: '#eff6ff', color: '#1e40af', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>مفوتر بالكامل</span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 14px', fontWeight: 700, color: '#0f172a' }}>نولون الخط الملاحي الأساسي (Carrier Ocean Freight)</td>
                      <td style={{ padding: '8px 14px', color: '#334155' }}>{job.shipping_line_name || 'غير محدد'}</td>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>تكلفة شحن مباشرة</td>
                      <td style={{ padding: '8px 14px', fontWeight: 800, color: totalCost > 0 ? '#b91c1c' : '#64748b' }}>${carrierCost.toLocaleString()}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>مطابقة الخط</span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 14px', fontWeight: 700, color: '#0f172a' }}>مصروفات الموانئ والمناولة (Port & THC Charges)</td>
                      <td style={{ padding: '8px 14px', color: '#334155' }}>{job.pol_name} ➔ {job.pod_name}</td>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>خدمات موانئ وتداول</td>
                      <td style={{ padding: '8px 14px', fontWeight: 800, color: otherCosts > 0 ? '#b91c1c' : '#64748b' }}>
                        {otherCosts > 0 ? `$${otherCosts.toLocaleString()}` : 'ضمن النولون'}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>تسوية مباشرة</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 14px', fontWeight: 700, color: '#0f172a' }}>تأمين الحاويات المسترد (Container Deposit)</td>
                      <td style={{ padding: '8px 14px', color: '#334155' }}>خزينة أمانات الخط الملاحي</td>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>أمانات مستردة (خارج الأرباح)</td>
                      <td style={{ padding: '8px 14px', fontWeight: 800, color: '#475569' }}>
                        ${containerDeposits.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', background: '#f0fdf4', color: '#166534', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>تحت التسوية</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. بطاقة تكامل دليل الحسابات ومراكز التكلفة */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#eff6ff',
                      color: '#1e40af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      flexShrink: 0,
                    }}
                  >
                    GL
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#170e5e' }}>
                      {job.cost_center_id ? `مركز تكلفة #${job.cost_center_id} (${job.job_number})` : `مركز تكلفة ملاحي #${job.job_number}`}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                      مربوط بدليل الحسابات العام (شجرة الحسابات ➔ مراكز تكلفة الشحن واللوجستيات)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      background: '#f0fdf4',
                      color: '#166534',
                      border: '1px solid #bbf7d0',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    الترحيل الآلي للقيود مفعل
                  </span>
                  <span
                    style={{
                      padding: '3px 10px',
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                    }}
                  >
                    {job.payment_term === 'prepaid' ? 'سداد مسبق (Prepaid)' : 'تحصيل بميناء الوصول (Collect)'}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
        </div>
      </div>
    </StandardDialog>
  );
}
