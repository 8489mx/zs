import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { maritimeApi } from '../api/maritime-freight.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

export function PublicShipmentTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      maritimeApi.getPublicTracking(token)
        .then((res) => setData(res))
        .catch((err) => setError(err?.message || 'تعذر العثور على بيانات الشحنة أو انتهت صلاحية الرابط'))
        .finally(() => setLoading(false));
    }
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#170e5e', fontWeight: 700 }}>
          جاري تحميل بيانات تتبع الشحنة المباشرة...
        </div>
      </div>
    );
  }

  if (error || !data?.shipment) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#ffffff', padding: '30px', borderRadius: '16px', border: '1px solid #fee2e2', textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ color: '#dc2626', display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <AppIcons.AlertTriangle size={36} />
          </div>
          <h2 style={{ color: '#991b1b', margin: '0 0 8px', fontSize: '1.1rem' }}>رابط التتبع غير صالح أو منتهي</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{error || 'يرجى مراجعة مسؤول الشحن للحصول على رابط تتبع محدث.'}</p>
        </div>
      </div>
    );
  }

  const { shipment, milestones, containers } = data;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '20px 16px', fontFamily: 'system-ui, sans-serif', direction: 'rtl' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* هيدر التتبع المباشر */}
        <div style={{ background: '#170e5e', color: '#ffffff', padding: '24px 20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(23, 14, 94, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AppIcons.Ship size={24} />
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>تتبع الشحنة البحرية الحي</span>
            </div>
            <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700 }}>
              {shipment.status === 'active' ? 'قيد التنفيذ والإبحار' : 'مكتملة ومسلمة'}
            </span>
          </div>

          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
            {shipment.job_number}
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '4px' }}>
            العميل: {shipment.customer_name}
          </div>

          {/* مسار الشحنة */}
          <div style={{ marginTop: '18px', background: 'rgba(255,255,255,0.08)', padding: '12px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ميناء الشحن</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, marginTop: '2px' }}>{shipment.pol_name}</div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>{shipment.pol_code}</div>
            </div>
            <div style={{ fontSize: '1.2rem', color: '#facc15' }}>➔</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ميناء الوصول المقدر</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, marginTop: '2px' }}>{shipment.pod_name}</div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>{shipment.pod_code}</div>
            </div>
          </div>

          {/* تفاصيل السفينة والخط */}
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1' }}>
            <div>الخط: <strong>{shipment.shipping_line_name}</strong></div>
            <div>السفينة: <strong>{shipment.vessel_name || 'قيد الجدولة'}</strong></div>
            <div>ETA: <strong>{shipment.eta || 'قيد التحديث'}</strong></div>
          </div>
        </div>

        {/* الحاويات التابعة للشحنة */}
        <div style={{ background: '#ffffff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcons.Container size={18} />
            <span>بيانات الحاويات ({containers?.length || 0})</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {containers?.map((c: any, i: number) => (
              <div key={i} style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#170e5e', fontSize: '0.9rem' }}>{c.container_number}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    النوع: {c.container_type} | الختم: {c.seal_number || 'بدون'}
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>
                    فترة السماح: {c.free_days} يوم
                  </div>
                  {c.return_deadline && (
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      آخر موعد: {c.return_deadline}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* السجل الزمني للمحطات DCSA */}
        <div style={{ background: '#ffffff', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '0.92rem', fontWeight: 800, color: '#170e5e' }}>
            مراحل وتتبع الشحنة المباشر
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {milestones?.map((m: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                  ✓
                </div>
                <div style={{ flex: 1, borderBottom: idx < milestones.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: '10px' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.86rem' }}>{m.milestone_title}</div>
                  {m.notes && <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>{m.notes}</div>}
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                    {new Date(m.occurred_at).toLocaleString('ar-EG')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', padding: '12px' }}>
          نظام التتبع اللوجستي الموحد — Z-Systems
        </div>
      </div>
    </div>
  );
}
