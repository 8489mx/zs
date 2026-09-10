import { MaritimeJob } from '../api/maritime-freight.api';
import { DCSA_STANDARD_MILESTONES } from '../maritime-freight.types';

interface MaritimeJobsTabProps {
  jobs: MaritimeJob[];
  loading: boolean;
  onSelectJob: (job: MaritimeJob) => void;
  onOpenCreateJob?: () => void;
}

export function MaritimeJobsTab({
  jobs,
  loading,
  onSelectJob,
  onOpenCreateJob,
}: MaritimeJobsTabProps) {
  const getMilestoneLabel = (key: string) => {
    const found = DCSA_STANDARD_MILESTONES.find((m) => m.key === key);
    return found ? `${found.key} - ${found.title_ar}` : key;
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      {/* Header الكارت الموحد */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
            أوامر التشغيل والعمليات الملاحية (Shipment Jobs)
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            ملفات العمليات التشغيلية، تتبع مسارات السفن والبوالص، وتدقيق الأرباح والخسائر للعملية
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
            {jobs.length} أمر تشغيل
          </span>
          {onOpenCreateJob && (
            <button
              type="button"
              onClick={onOpenCreateJob}
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

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '12px 14px' }}>كود العملية</th>
              <th style={{ padding: '12px 14px' }}>العميل والمسار</th>
              <th style={{ padding: '12px 14px' }}>الخط والسفينة</th>
              <th style={{ padding: '12px 14px' }}>الحاويات</th>
              <th style={{ padding: '12px 14px' }}>مرحلة DCSA الحالية</th>
              <th style={{ padding: '12px 14px' }}>إذن التسليم (D/O)</th>
              <th style={{ padding: '12px 14px' }}>ربحية الشحنة</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  جاري تحميل ملفات العمليات...
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  لا توجد أوامر تشغيل مسجلة بعد. يمكنك تحويل أي عرض سعر معتمد إلى أمر تشغيل بنقرة واحدة.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#170e5e' }}>
                    {job.job_number}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{job.customer_name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {job.pol_code} ➔ {job.pod_code} ({job.direction})
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{job.shipping_line_name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {job.vessel_name ? `${job.vessel_name} / ${job.voyage_number || '-'}` : 'حجز: ' + (job.booking_number || '-')}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '2px 8px', background: job.hasOverdueContainers ? '#fef2f2' : '#f1f5f9', color: job.hasOverdueContainers ? '#b91c1c' : '#334155', borderRadius: '10px', fontWeight: 700 }}>
                      {job.containersCount || 0} حاويات
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '14px', fontSize: '0.74rem', fontWeight: 700 }}>
                      {getMilestoneLabel(job.milestone_status)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {job.delivery_order_released ? (
                      <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.75rem' }}>تم التسليم ✓</span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.75rem' }}>محتجز 🔒</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 800, color: '#15803d' }}>
                      +${Number(job.net_profit || 0).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onSelectJob(job)}
                      style={{
                        padding: '5px 12px',
                        background: '#170e5e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      استعراض الملف ➔
                    </button>
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
