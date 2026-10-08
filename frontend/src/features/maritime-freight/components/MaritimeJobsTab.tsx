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

  const MILESTONE_SHORT_LABELS: Record<string, string> = {
    BOOK: 'تأكيد الحجز',
    GTI: 'دخول الميناء',
    LOAD: 'تم التحميل',
    DEPT: 'أبحرت السفينة',
    ARRI: 'وصلت السفينة',
    DISC: 'تفريغ الحاوية',
    CUST: 'إنهاء التخليص',
    GTO: 'خروج الحاوية',
    DLVR: 'تسليم البضاعة',
    RETN: 'إعادة الحاوية',
    BKD: 'حجز مؤكد',
    RCS: 'استلام المطار',
    MAN: 'على المانيفست',
    DEP: 'أقلعت الرحلة',
    ARR: 'هبطت الرحلة',
    RCF: 'تفريغ المطار',
    NFD: 'إشعار العميل',
    AWD: 'تسليم المستندات',
    DLV: 'تم التسليم (POD)',
    TRK_POD: 'تم التسليم برياً',
    POD: 'تم التسليم (POD)',
  };

  const getShortShippingLineName = (fullName?: string): string => {
    if (!fullName) return '';
    const match = fullName.match(/\((.*?)\)/);
    if (match && match[1] && match[1].length <= 8) {
      return match[1].trim();
    }
    return fullName.replace(/\s*\(.*?\).*/g, '').trim();
  };

  const getShortMilestoneLabel = (key?: string): string => {
    if (!key) return 'قيد المتابعة';
    if (MILESTONE_SHORT_LABELS[key]) return MILESTONE_SHORT_LABELS[key];
    const found = DCSA_STANDARD_MILESTONES.find((m) => m.key === key);
    if (found) return found.title_ar.split(' ')[0] + ' ' + (found.title_ar.split(' ')[1] || '');
    return key;
  };

  const getFullMilestoneTitle = (key?: string): string => {
    if (!key) return '';
    const found = DCSA_STANDARD_MILESTONES.find((m) => m.key === key);
    if (found) return `${found.key} - ${found.title_ar}`;
    return key;
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

  const oceanJobsCount = jobs.filter((j) => (j.transport_mode || 'sea') === 'sea').length;
  const airRoadJobsCount = jobs.filter((j) => j.transport_mode === 'air' || j.transport_mode === 'road').length;
  const completedCount = jobs.filter((j) => j.status === 'completed' || j.milestone_status === 'DLVR' || j.milestone_status === 'DLV').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* بطاقات المؤشرات اللوجستية لأوامر الشحن القياسية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>إجمالي أوامر التشغيل</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
              {jobs.length} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>أمر</span>
            </div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
            <AppIcons.FileText size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>شحنات النقل البحري</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
              {oceanJobsCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>شحنة</span>
            </div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eef2ff', border: '1px solid #e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca', flexShrink: 0 }}>
            <AppIcons.Ship size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>شحنات جوية وبرية</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
              {airRoadJobsCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>شحنة</span>
            </div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
            <AppIcons.Plane size={18} />
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '88px', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>مكتملة ومفرجة جمركياً</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
              {completedCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>شحنة</span>
            </div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
            <AppIcons.CheckCircle size={18} />
          </div>
        </div>
      </div>

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

      <div style={{ overflowX: 'auto' }} className="thin-scrollbar">
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.80rem' }}>
          <colgroup>
            <col style={{ width: '11%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
              <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>كود العملية / الوسيلة</th>
              <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>العميل والمسار</th>
              <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>الناقل والرحلة</th>
              <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>الشحنة والمعدات / الأوزان</th>
              <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'center' }}>المرحلة التشغيلية</th>
              <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'center' }}>إذن التسليم (D/O)</th>
              <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'center' }}>ربحية الشحنة</th>
              <th style={{ padding: '8px 6px', fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'center' }}>الإجراءات</th>
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
                  {/* 1. كود العملية والوسيلة */}
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 800, color: '#170e5e', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                        {job.job_number}
                      </span>
                      {getModeBadge(job.transport_mode)}
                    </div>
                  </td>

                  {/* 2. العميل والمسار */}
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle', overflow: 'hidden' }}>
                    <div
                      style={{
                        fontWeight: 650,
                        color: '#0f172a',
                        fontSize: '0.69rem',
                        lineHeight: 1.35,
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                      title={job.customer_name}
                    >
                      {job.customer_name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: '#64748b',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={`${job.pol_name || job.pol_code} ➔ ${job.pod_name || job.pod_code} (${job.direction === 'import' ? 'وارد' : job.direction === 'export' ? 'صادر' : 'ترانزيت'})`}
                    >
                      {job.pol_code} ➔ {job.pod_code}{' '}
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                        ({job.direction === 'import' ? 'وارد' : job.direction === 'export' ? 'صادر' : 'ترانزيت'})
                      </span>
                    </div>
                  </td>

                  {/* 3. الناقل والرحلة */}
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle', overflow: 'hidden' }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: '#0f172a',
                        fontSize: '0.74rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={job.shipping_line_name || 'غير محدد'}
                    >
                      {getShortShippingLineName(job.shipping_line_name) || 'غير محدد'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.69rem',
                        color: '#64748b',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={
                        job.transport_mode === 'air'
                          ? (job.flight_number ? `رحلة: ${job.flight_number}` : job.mawb_number ? `AWB: ${job.mawb_number}` : 'شحن جوي')
                          : job.transport_mode === 'road'
                          ? (job.booking_number ? `بوليصة: ${job.booking_number}` : 'نقل بري')
                          : (job.vessel_name ? `${job.vessel_name} / ${job.voyage_number || '-'}` : (job.booking_number ? `حجز: ${job.booking_number}` : 'شحن بحري'))
                      }
                    >
                      {job.transport_mode === 'air'
                        ? (job.flight_number ? `رحلة: ${job.flight_number}` : job.mawb_number ? `AWB: ${job.mawb_number}` : 'شحن جوي')
                        : job.transport_mode === 'road'
                        ? (job.booking_number ? `بوليصة: ${job.booking_number}` : 'نقل بري')
                        : (job.vessel_name ? `${job.vessel_name} / ${job.voyage_number || '-'}` : (job.booking_number ? `حجز: ${job.booking_number}` : 'شحن بحري'))
                      }
                    </div>
                  </td>

                  {/* 4. الشحنة والمعدات / الأوزان */}
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle', overflow: 'hidden' }}>
                    {job.transport_mode === 'air' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span
                          title={`${job.chargeable_weight_kg || job.gross_weight_kg || 0} كجم خاضع للرسوم`}
                          style={{
                            display: 'inline-block',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            padding: '2px 6px',
                            background: '#f0f9ff',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.70rem',
                          }}
                        >
                          {Number(job.chargeable_weight_kg || job.gross_weight_kg || 0).toLocaleString()} كجم
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {job.package_count || 0} طرد • {job.total_cbm || 0} CBM
                        </span>
                      </div>
                    ) : job.transport_mode === 'road' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span
                          title={`${job.gross_weight_kg || 0} كجم`}
                          style={{
                            display: 'inline-block',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            padding: '2px 6px',
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.70rem',
                          }}
                        >
                          {Number(job.gross_weight_kg || 0).toLocaleString()} كجم
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {job.total_cbm || 0} CBM
                        </span>
                      </div>
                    ) : (
                      <span
                        style={{
                          display: 'inline-block',
                          maxWidth: '100%',
                          whiteSpace: 'nowrap',
                          padding: '2px 8px',
                          background: job.hasOverdueContainers ? '#fef2f2' : '#f1f5f9',
                          color: job.hasOverdueContainers ? '#b91c1c' : '#334155',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.71rem',
                        }}
                      >
                        {job.containersCount || 0} حاويات
                      </span>
                    )}
                  </td>

                  {/* 5. المرحلة التشغيلية */}
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle', textAlign: 'center', overflow: 'hidden' }}>
                    <span
                      title={getFullMilestoneTitle(job.milestone_status)}
                      style={{
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        padding: '2px 8px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: '12px',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                      }}
                    >
                      {getShortMilestoneLabel(job.milestone_status)}
                    </span>
                  </td>

                  {/* 6. إذن التسليم والسداد */}
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle', textAlign: 'center', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          background: job.payment_status === 'paid' ? '#dcfce7' : job.payment_status === 'partially_paid' ? '#fef3c7' : '#f1f5f9',
                          color: job.payment_status === 'paid' ? '#15803d' : job.payment_status === 'partially_paid' ? '#b45309' : '#64748b',
                        }}
                      >
                        {job.payment_status === 'paid' ? 'مسدد بالكامل' : job.payment_status === 'partially_paid' ? 'مسدد جزئياً' : 'غير مسدد'}
                      </span>
                      {job.delivery_order_released ? (
                        <span style={{ color: '#15803d', fontWeight: 600, fontSize: '0.68rem', whiteSpace: 'nowrap' }}>تم التسليم (D/O)</span>
                      ) : (
                        <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.68rem', whiteSpace: 'nowrap' }}>إذن تسليم معلق</span>
                      )}
                    </div>
                  </td>

                  {/* 7. ربحية الشحنة */}
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle', textAlign: 'center', overflow: 'hidden' }}>
                    <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      +${Number(job.net_profit || 0).toLocaleString()}
                    </div>
                  </td>

                  {/* 8. الإجراءات */}
                  <td style={{ padding: '8px 6px', verticalAlign: 'middle', textAlign: 'center', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => onSelectJob(job)}
                      title="استعراض وتفاصيل ملف أمر التشغيل"
                      style={{
                        padding: '0 8px',
                        height: '26px',
                        background: '#170e5e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                        width: '100%',
                        maxWidth: '100px',
                        boxSizing: 'border-box',
                        boxShadow: '0 1px 2px rgba(23, 14, 94, 0.2)',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#251785';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#170e5e';
                      }}
                    >
                      <AppIcons.FileText size={11} />
                      <span>استعراض الملف</span>
                    </button>
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
