import { useState, useMemo } from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { MaritimeJob } from '../api/maritime-freight.api';
import { DCSA_STANDARD_MILESTONES } from '../maritime-freight.types';
import { useMaritime } from '../context/MaritimeContext';

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
  const { pipelineConfig } = useMaritime();
  const enableSeaFreight = pipelineConfig?.enableSeaFreight !== false;
  const enableAirFreight = pipelineConfig?.enableAirFreight !== false;
  const enableRoadFreight = pipelineConfig?.enableRoadFreight !== false;
  const activeModesCount = (enableSeaFreight ? 1 : 0) + (enableAirFreight ? 1 : 0) + (enableRoadFreight ? 1 : 0);

  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'sea' | 'air' | 'road'>('all');

  const availableModes = useMemo(() => {
    const list: Array<{ id: 'all' | 'sea' | 'air' | 'road'; label: string; icon: any }> = [{ id: 'all', label: 'الكل', icon: null }];
    if (enableSeaFreight) list.push({ id: 'sea', label: 'بحري', icon: AppIcons.Ship });
    if (enableAirFreight) list.push({ id: 'air', label: 'جوي', icon: AppIcons.Plane });
    if (enableRoadFreight) list.push({ id: 'road', label: 'بري', icon: AppIcons.Truck });
    return list;
  }, [enableSeaFreight, enableAirFreight, enableRoadFreight]);

  const getMilestoneLabel = (key: string) => {
    const found = DCSA_STANDARD_MILESTONES.find((m) => m.key === key);
    return found ? `${found.key} - ${found.title_ar}` : key;
  };

  const getModeBadge = (mode?: string) => {
    if (mode === 'air') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
          <AppIcons.Plane size={11} />
          <span>شحن جوي</span>
        </span>
      );
    }
    if (mode === 'road') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
          <AppIcons.Truck size={11} />
          <span>شحن بري</span>
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
        <AppIcons.Ship size={11} />
        <span>شحن بحري</span>
      </span>
    );
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchMode = modeFilter === 'all' || (job.transport_mode || 'sea') === modeFilter;
      const matchQuery =
        !searchQuery ||
        job.job_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.pol_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.pod_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.shipping_line_name && job.shipping_line_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (job.mawb_number && job.mawb_number.includes(searchQuery)) ||
        (job.booking_number && job.booking_number.includes(searchQuery));
      return matchMode && matchQuery;
    });
  }, [jobs, modeFilter, searchQuery]);

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      {/* Header الكارت الموحد */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
            أوامر التشغيل والعمليات اللوجستية (Shipment Jobs)
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            ملفات العمليات التشغيلية (بحري / جوي / بري)، تتبع الرحلات والبوالص، وتدقيق الأرباح والخسائر للعملية
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
            {filteredJobs.length} من {jobs.length} أمر تشغيل
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

      {/* شريط الفلاتر والبحث */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <input
            type="text"
            role="searchbox"
            name="search_jobs"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم العملية، العميل، البوليصة..."
            style={{
              width: '100%',
              height: '34px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              padding: '0 32px 0 10px',
              fontSize: '0.8125rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ position: 'absolute', right: '10px', top: '9px', color: '#94a3b8', pointerEvents: 'none' }}>
            <AppIcons.Search size={15} />
          </div>
        </div>

        {activeModesCount > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>الوسيلة:</span>
            {availableModes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = modeFilter === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setModeFilter(mode.id as any)}
                  style={{
                    height: '28px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid #170e5e' : '1px solid #e2e8f0',
                    background: isSelected ? '#170e5e' : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#475569',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {Icon && <Icon size={12} />}
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '12px 14px' }}>كود العملية / الوسيلة</th>
              <th style={{ padding: '12px 14px' }}>العميل والمسار</th>
              <th style={{ padding: '12px 14px' }}>الناقل والرحلة</th>
              <th style={{ padding: '12px 14px' }}>الشحنة والمعدات / الأوزان</th>
              <th style={{ padding: '12px 14px' }}>المرحلة التشغيلية</th>
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
            ) : filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  لا توجد أوامر تشغيل مطابقة لمعايير البحث. يمكنك تحويل أي عرض سعر معتمد إلى أمر تشغيل بنقرة واحدة.
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#170e5e' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span>{job.job_number}</span>
                      {getModeBadge(job.transport_mode)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{job.customer_name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {job.pol_code} ➔ {job.pod_code} ({job.direction === 'import' ? 'وارد' : job.direction === 'export' ? 'صادر' : 'ترانزيت'})
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{job.shipping_line_name || 'غير محدد'}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {job.transport_mode === 'air'
                        ? job.flight_number
                          ? `رحلة: ${job.flight_number}`
                          : job.mawb_number
                          ? `AWB: ${job.mawb_number}`
                          : 'شحن جوي'
                        : job.vessel_name
                        ? `${job.vessel_name} / ${job.voyage_number || '-'}`
                        : 'حجز: ' + (job.booking_number || '-')}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {job.transport_mode === 'air' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ padding: '2px 8px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '8px', fontWeight: 700, fontSize: '0.74rem' }}>
                          {job.chargeable_weight_kg || job.gross_weight_kg || 0} كجم (خاضع للرسوم)
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {job.package_count || 0} طرد • {job.total_cbm || 0} CBM
                        </span>
                      </div>
                    ) : job.transport_mode === 'road' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ padding: '2px 8px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: '8px', fontWeight: 700, fontSize: '0.74rem' }}>
                          {job.gross_weight_kg || 0} كجم
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {job.total_cbm || 0} CBM
                        </span>
                      </div>
                    ) : (
                      <span style={{ padding: '2px 8px', background: job.hasOverdueContainers ? '#fef2f2' : '#f1f5f9', color: job.hasOverdueContainers ? '#b91c1c' : '#334155', borderRadius: '10px', fontWeight: 700 }}>
                        {job.containersCount || 0} حاويات
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '14px', fontSize: '0.74rem', fontWeight: 700 }}>
                      {getMilestoneLabel(job.milestone_status)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          background: job.payment_status === 'paid' ? '#dcfce7' : job.payment_status === 'partially_paid' ? '#fef3c7' : '#f1f5f9',
                          color: job.payment_status === 'paid' ? '#15803d' : job.payment_status === 'partially_paid' ? '#b45309' : '#64748b',
                        }}
                      >
                        {job.payment_status === 'paid' ? 'مسدد بالكامل' : job.payment_status === 'partially_paid' ? 'مسدد جزئياً' : 'غير مسدد'}
                      </span>
                      {job.delivery_order_released ? (
                        <span style={{ color: '#15803d', fontWeight: 600, fontSize: '0.7rem' }}>تم التسليم (D/O)</span>
                      ) : (
                        <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.7rem' }}>إذن تسليم معلق</span>
                      )}
                    </div>
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
                      استعراض الملف ←
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
