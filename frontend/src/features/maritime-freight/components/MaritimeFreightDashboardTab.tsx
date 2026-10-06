import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { maritimeApi, MaritimeJob, MaritimeContainer } from '../api/maritime-freight.api';
import { useMaritime } from '../context/MaritimeContext';

export function MaritimeFreightDashboard() {
  const navigate = useNavigate();
  const { counts, setIsCreateInquiryOpen, setIsCreateRfqOpen } = useMaritime();
  const { currencySymbol } = useSystemCurrency();

  const [jobs, setJobs] = useState<MaritimeJob[]>([]);
  const [containers, setContainers] = useState<MaritimeContainer[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [jobsRes, containersRes] = await Promise.all([
          maritimeApi.getJobs().catch(() => []),
          maritimeApi.getContainers().catch(() => []),
        ]);
        if (isMounted) {
          setJobs(jobsRes || []);
          setContainers(containersRes || []);
        }
      } catch (err) {
        console.error('Failed to load maritime dashboard metrics:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Financial aggregates
  const financialMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCarrierCost = 0;
    let totalOtherCosts = 0;

    for (const job of jobs) {
      totalRevenue += Number(job.client_invoiced_total || 0);
      totalCarrierCost += Number(job.carrier_cost_total || 0);
      totalOtherCosts += Number(job.other_costs_total || 0);
    }

    const totalCosts = totalCarrierCost + totalOtherCosts;
    const netProfit = totalRevenue - totalCosts;
    const marginPct = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    return {
      totalRevenue,
      totalCarrierCost,
      totalCosts,
      netProfit,
      marginPct,
    };
  }, [jobs]);

  // Multimodal Distribution
  const modeMetrics = useMemo(() => {
    let seaCount = 0;
    let airCount = 0;
    let roadCount = 0;

    for (const job of jobs) {
      const mode = job.transport_mode || 'sea';
      if (mode === 'air') airCount++;
      else if (mode === 'road') roadCount++;
      else seaCount++;
    }

    const total = jobs.length || 1;
    return {
      seaCount,
      airCount,
      roadCount,
      seaPct: Math.round((seaCount / total) * 100),
      airPct: Math.round((airCount / total) * 100),
      roadPct: Math.round((roadCount / total) * 100),
    };
  }, [jobs]);

  // Containers & Demurrage Metrics
  const containerMetrics = useMemo(() => {
    let totalTeu = 0;
    let overdueCount = 0;
    let criticalCount = 0;
    let returnedCount = 0;

    for (const c of containers) {
      if (c.container_type?.includes('40')) {
        totalTeu += 2;
      } else {
        totalTeu += 1;
      }

      if (c.empty_returned_at) {
        returnedCount++;
      } else if (c.is_overdue || (c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining < 0)) {
        overdueCount++;
      } else if (c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining <= 3) {
        criticalCount++;
      }
    }

    return {
      totalContainers: containers.length,
      totalTeu,
      overdueCount,
      criticalCount,
      returnedCount,
    };
  }, [containers]);

  // Top Shipping Lines / Carriers
  const topCarriers = useMemo(() => {
    const carrierMap = new Map<string, { count: number; spend: number }>();

    for (const job of jobs) {
      const name = job.shipping_line_name || 'غير محدد';
      const existing = carrierMap.get(name) || { count: 0, spend: 0 };
      existing.count += 1;
      existing.spend += Number(job.carrier_cost_total || 0);
      carrierMap.set(name, existing);
    }

    return Array.from(carrierMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);
  }, [jobs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }} dir="rtl">
      {/* 1. بطاقات المؤشرات المالية والتشغيلية الرئيسية (Executive KPI Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Card 1: الإيرادات المفوترة */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            borderTop: '3px solid #170e5e',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
            إيرادات الشحن واللوجستيات
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#170e5e', marginTop: '4px' }}>
            {currencySymbol} {financialMetrics.totalRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            مفوترة من {jobs.length} أمر تشغيل
          </div>
        </div>

        {/* Card 2: تكاليف النواقل والموانئ */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            borderTop: '3px solid #b91c1c',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
            تكلفة النواقل المباشرة
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b91c1c', marginTop: '4px' }}>
            {currencySymbol} {financialMetrics.totalCarrierCost.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            نولون الخطوط ومصروفات الموانئ
          </div>
        </div>

        {/* Card 3: صافي الربح التشغيلي */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            borderTop: '3px solid #15803d',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>صافي الأرباح التشغيلية</span>
            <span style={{ padding: '1px 6px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
              {financialMetrics.marginPct}%
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
            {currencySymbol} {financialMetrics.netProfit.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            المساهمة الصافية بعد خصم كافة التكاليف
          </div>
        </div>

        {/* Card 4: حجم الشحن والحاويات TEU */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            borderTop: '3px solid #0369a1',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
            حجم الحاويات المشحونة
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0369a1', marginTop: '4px' }}>
            {containerMetrics.totalTeu} <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>TEU</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            إجمالي {containerMetrics.totalContainers} حاوية مسجلة
          </div>
        </div>

        {/* Card 5: مؤشر الحاويات الحرجة ورادار الغرامات */}
        <div
          style={{
            background: containerMetrics.overdueCount > 0 ? '#fffdfd' : '#ffffff',
            border: containerMetrics.overdueCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            borderTop: containerMetrics.overdueCount > 0 ? '3px solid #dc2626' : '3px solid #f59e0b',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: containerMetrics.overdueCount > 0 ? '#b91c1c' : '#64748b' }}>
            رادار الحاويات الحرجة
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: containerMetrics.overdueCount > 0 ? '#dc2626' : '#b45309', marginTop: '4px' }}>
            {containerMetrics.overdueCount + containerMetrics.criticalCount} <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>حاوية</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            {containerMetrics.overdueCount} متأخرة | {containerMetrics.criticalCount} متبقي &le; 3 أيام
          </div>
        </div>
      </div>

      {/* 2. الشبكة التحليلية المتوازنة (Symmetrical 2x2 Clean White Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Card A: توزيع وسائط الشحن واللوجستيات (Multimodal Breakdown) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                توزيع وسائط الشحن (Multimodal Transport Share)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                مقارنة حجم العمليات بحسب نمط النقل (بحري / جوي / بري)
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/maritime/jobs')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#170e5e',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              عرض أوامر التشغيل &larr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* الشحن البحري */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#170e5e' }}>
                  <AppIcons.Ship size={15} />
                  <span>الشحن البحري (Ocean Freight - FCL / LCL)</span>
                </span>
                <span style={{ color: '#0f172a' }}>{modeMetrics.seaCount} شحنة ({modeMetrics.seaPct}%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${modeMetrics.seaPct}%`, height: '100%', background: '#170e5e', borderRadius: '4px' }} />
              </div>
            </div>

            {/* الشحن الجوي */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0369a1' }}>
                  <AppIcons.Plane size={15} />
                  <span>الشحن الجوي السريع (Air Cargo - IATA Standards)</span>
                </span>
                <span style={{ color: '#0f172a' }}>{modeMetrics.airCount} شحنة ({modeMetrics.airPct}%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${modeMetrics.airPct}%`, height: '100%', background: '#0284c7', borderRadius: '4px' }} />
              </div>
            </div>

            {/* الشحن البري */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#b45309' }}>
                  <AppIcons.Truck size={15} />
                  <span>النقل البري والترانزيت (Road Freight - CMR)</span>
                </span>
                <span style={{ color: '#0f172a' }}>{modeMetrics.roadCount} شحنة ({modeMetrics.roadPct}%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${modeMetrics.roadPct}%`, height: '100%', background: '#d97706', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Card B: كبار النواقل المعتمدة وحجم الإنفاق (Top Carrier Spend) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                كبار النواقل المعتمدة (Top Carrier Spend)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                أعلى الخطوط الملاحية وشركات الطيران بحسب حجم الإنفاق والشحنات
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/maritime/lines')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#170e5e',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              دليل النواقل &larr;
            </button>
          </div>

          {topCarriers.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
              لا توجد عمليات مسجلة حتى الآن.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'right' }}>
              <thead>
                <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 700 }}>اسم الناقل</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'center' }}>الشحنات</th>
                  <th style={{ padding: '6px 8px', fontWeight: 700 }}>إجمالي النولون</th>
                </tr>
              </thead>
              <tbody>
                {topCarriers.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a' }}>{c.name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {c.count} أمر
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontWeight: 800, color: '#b91c1c' }}>
                      ${Number(c.spend || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Card C: مسار دورة الشحن والتحويل (Freight Pipeline Flow) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              تدفق دورة الشحن والأتمتة (Freight Pipeline Funnel)
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
              تتبع انتقال العمليات من استفسار العميل المبدئي وحتى التسليم والإفراج الجمركي
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>الاستفسارات</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#170e5e', marginTop: '2px' }}>
                {counts.inquiries}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>طلب عميل</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>تسعير RFQ</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e40af', marginTop: '2px' }}>
                {counts.rfqs}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>جلسة تسعير</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>عروض الأسعار</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#a16207', marginTop: '2px' }}>
                {counts.quotations}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>عرض صادر</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>أوامر التشغيل</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                {counts.jobs}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>شحنة قيد التنفيذ</div>
            </div>
          </div>
        </div>

        {/* Card D: الإجراءات السريعة ومفاتيح الرقابة (Operational Control Hub) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              مركز التحكم والإجراءات السريعة (Operational Quick Hub)
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
              الوصول المباشر إلى الشاشات التخصصية وأدوات الرقابة المالية
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsCreateInquiryOpen(true)}
              style={{
                padding: '10px 14px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.Plus size={15} />
              <span>تسجيل طلب شحن عميل</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateRfqOpen(true)}
              style={{
                padding: '10px 14px',
                background: '#ffffff',
                color: '#170e5e',
                border: '1.5px solid #170e5e',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.Mail size={15} />
              <span>طلب تسعير خطوط (RFQ)</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/maritime/radar')}
              style={{
                padding: '10px 14px',
                background: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.Clock size={15} />
              <span>رادار الغرامات والسماح</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/maritime/audit')}
              style={{
                padding: '10px 14px',
                background: '#eff6ff',
                color: '#1e40af',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <AppIcons.CheckShield size={15} />
              <span>تدقيق فواتير النواقل</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { MaritimeFreightDashboard as MaritimeFreightDashboardTab };
