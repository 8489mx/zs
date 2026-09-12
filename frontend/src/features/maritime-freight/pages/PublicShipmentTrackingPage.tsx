import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { maritimeApi } from '../api/maritime-freight.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

export function PublicShipmentTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [searchInput, setSearchInput] = useState(token || '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = (queryToken: string) => {
    if (!queryToken || queryToken.trim().length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    maritimeApi
      .getPublicTracking(queryToken.trim())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || 'تعذر العثور على بيانات الشحنة أو انتهت صلاحية الرابط');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (token) {
      setSearchInput(token);
      fetchTracking(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchTracking(searchInput);
    }
  };

  const job = data?.job || data?.shipment;
  const milestones = data?.milestones || [];
  const containers = data?.containers || [];
  const company = data?.company || { name: 'منظومة Z-Systems للشحن الملاحي' };

  // DCSA Milestones order definition
  const MILESTONE_SEQUENCE = [
    { key: 'BOOK', label: 'تأكيد الحجز' },
    { key: 'GTI', label: 'دخول ساحة الميناء' },
    { key: 'LOAD', label: 'التحميل على السفينة' },
    { key: 'DEPT', label: 'إبحار السفينة' },
    { key: 'ARRI', label: 'وصول الميناء' },
    { key: 'DISC', label: 'تفريغ الحاويات' },
    { key: 'CUST', label: 'التخليص الجمركي' },
    { key: 'GTO', label: 'إذن التسليم وخروج البوابة' },
    { key: 'DLVR', label: 'التسليم للمستودع' },
    { key: 'RETN', label: 'إرجاع الحاوية الفارغة' },
  ];

  const currentMilestoneIndex = job
    ? MILESTONE_SEQUENCE.findIndex((m) => m.key === job.milestoneStatus || m.key === job.milestone_status)
    : -1;

  const vesselTrackingUrl = job?.vesselName || job?.vessel_name
    ? `https://www.marinetraffic.com/en/ais/details/ships/shipid:0/shipname:${encodeURIComponent(job.vesselName || job.vessel_name)}`
    : null;

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Navbar */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#170e5e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <AppIcons.Ship size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#170e5e' }}>{company.name}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>بوابة التتبع الملاحي الحي للشحنات والحاويات</div>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 300px', maxWidth: '420px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="رقم البوليصة B/L، الحاوية، أو كود التتبع..."
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 32px 0 12px',
                  fontSize: '0.825rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
                <AppIcons.Search size={15} />
              </span>
            </div>
            <button
              type="submit"
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              تتبع
            </button>
          </form>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1100px', margin: '24px auto', padding: '0 16px' }}>
        {loading && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>جاري استرجاع بيانات التتبع الملاحي...</div>
            <div style={{ fontSize: '0.825rem', color: '#94a3b8' }}>يتم الاتصال بقاعدة بيانات الموانئ والخطوط الملاحية</div>
          </div>
        )}

        {error && !loading && (
          <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: '12px', padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <AppIcons.AlertTriangle size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px', color: '#991b1b', fontSize: '1.05rem' }}>تعذر استرجاع الشحنة</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem' }}>{error}</p>
            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
              يرجى التأكد من إدخال رقم أمر التشغيل أو رقم البوليصة بشكل سليم، أو مراجعة مسؤول الشحن.
            </div>
          </div>
        )}

        {!loading && !error && job && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Overview Banner Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8' }}>
                      {job.direction === 'import' ? 'شحن وارد (Import)' : 'شحن صادر (Export)'}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                      أمر تشغيل #{job.jobNumber || job.job_number}
                    </span>
                  </div>
                  <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#170e5e' }}>
                    {job.customerName || job.customer_name}
                  </h1>
                </div>

                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>الخط الملاحي الناقل</div>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{job.shippingLineName || job.shipping_line_name}</div>
                  {(job.bookingNumber || job.booking_number) && (
                    <div style={{ fontSize: '0.76rem', color: '#475569', fontFamily: 'monospace' }}>
                      Booking: <strong>{job.bookingNumber || job.booking_number}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Transit Ports Visualizer */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', background: '#f8fafc', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>ميناء الشحن والتحميل (POL)</div>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{job.polName || job.pol_name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '2px' }}>
                    كود الميناء: <strong>{job.polCode || job.pol_code}</strong> {job.etd ? `| الإبحار: ${job.etd}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.85rem' }}>
                    <AppIcons.Ship size={18} />
                    <span>{job.vesselName || job.vessel_name || 'السفينة الناقلة'}</span>
                  </div>
                  {job.voyageNumber && (
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      رحلة رقم: {job.voyageNumber}
                    </div>
                  )}
                  {vesselTrackingUrl && (
                    <a
                      href={vesselTrackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, textDecoration: 'underline', marginTop: '4px' }}
                    >
                      رادار القمر الصناعي الحي (AIS)
                    </a>
                  )}
                </div>

                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>ميناء الوصول والتفريغ (POD)</div>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{job.podName || job.pod_name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '2px' }}>
                    كود الميناء: <strong>{job.podCode || job.pod_code}</strong> {job.eta ? `| موعد الوصول: ${job.eta}` : ''}
                  </div>
                </div>
              </div>

              {/* Progress Milestones Timeline */}
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#170e5e', marginBottom: '14px' }}>
                  خط سير الشحنة الميداني (DCSA Milestone Timeline)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px' }}>
                  {MILESTONE_SEQUENCE.map((step, idx) => {
                    const isCompleted = idx <= currentMilestoneIndex;
                    const isCurrent = idx === currentMilestoneIndex;
                    return (
                      <div
                        key={step.key}
                        style={{
                          textAlign: 'center',
                          padding: '8px 4px',
                          borderRadius: '8px',
                          background: isCurrent ? '#170e5e' : isCompleted ? '#eff6ff' : '#f8fafc',
                          color: isCurrent ? '#ffffff' : isCompleted ? '#1d4ed8' : '#94a3b8',
                          border: isCurrent ? '1px solid #170e5e' : isCompleted ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, marginBottom: '2px' }}>
                          {idx + 1}. {step.label}
                        </div>
                        <div style={{ fontSize: '0.64rem', opacity: isCurrent ? 0.9 : 0.7 }}>
                          {isCurrent ? 'المرحلة الحالية' : isCompleted ? 'مكتمل' : 'قادم'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Containers & Equipment Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#170e5e', fontSize: '0.98rem' }}>
                  <AppIcons.Container size={20} />
                  <span>الحاويات وأيام السماح بالميناء ({containers.length} حاوية)</span>
                </div>
                {job.deliveryOrderReleased && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                    تم اعتماد وإصدار إذن التسليم (D/O Released)
                  </span>
                )}
              </div>

              {containers.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                  لم يتم قيد أرقام الحاويات في هذا الملف حتى الآن
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                  {containers.map((c: any) => {
                    const isOverdue = c.isOverdue || c.is_overdue;
                    return (
                      <div
                        key={c.id || c.containerNumber || c.container_number}
                        style={{
                          border: isOverdue ? '1px solid #f87171' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          background: isOverdue ? '#fff5f5' : '#ffffff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.98rem', color: '#170e5e' }}>
                            {c.containerNumber || c.container_number}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                            {c.containerType || c.container_type}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: '#475569' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>رقم السيل (Seal No):</span>
                            <strong>{c.sealNumber || c.seal_number || '—'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>فترة السماح (Free Days):</span>
                            <strong>{c.freeDays || c.free_days || 14} يوم</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>تاريخ مهلة الإرجاع:</span>
                            <strong style={{ color: isOverdue ? '#dc2626' : '#15803d' }}>
                              {c.returnDeadline || c.return_deadline || 'تحت الاحتساب'}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>حالة الحاوية:</span>
                            <strong>
                              {c.emptyReturnedAt || c.empty_returned_at
                                ? 'تم إرجاع الحاوية فارغة'
                                : c.gatedOutAt || c.gated_out_at
                                ? 'خرجت من بوابة الميناء'
                                : c.dischargedAt || c.discharged_at
                                ? 'تم التفريغ بساحة الميناء'
                                : 'على متن السفينة'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Milestones Log Table */}
            {milestones.length > 0 && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontWeight: 800, color: '#170e5e', fontSize: '0.98rem', marginBottom: '14px' }}>
                  سجل التحديثات الميدانية الموثقة ({milestones.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {milestones.map((m: any, i: number) => (
                    <div
                      key={m.id || i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.82rem',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#170e5e' }} />
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{m.title}</span>
                        {m.location && <span style={{ color: '#64748b' }}>({m.location})</span>}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {new Date(m.occurredAt || m.occurred_at).toLocaleString('ar-EG')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '40px', borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: '24px', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
        <div>{company.name} — منظومة إدارة الشحن والعمليات اللوجستية الموحدة</div>
        {company.phone && <div style={{ marginTop: '4px' }}>هاتف خدمة العملاء: {company.phone}</div>}
      </footer>
    </div>
  );
}
