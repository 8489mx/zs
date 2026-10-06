import { useState } from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { maritimeApi } from '../api/maritime-freight.api';
import { toast } from '@/shared/components/system-alert';

const SUPPORTED_CARRIERS = [
  { code: 'MAEU', name: 'ميرسك لاين (Maersk Line)', logo: 'MAERSK', color: '#002b49' },
  { code: 'MSCU', name: 'إم إس سي (MSC Mediterranean)', logo: 'MSC', color: '#d97706' },
  { code: 'CMDU', name: 'سي إم إيه سي جي إم (CMA CGM)', logo: 'CMA CGM', color: '#dc2626' },
  { code: 'HLCU', name: 'هاباج لويد (Hapag-Lloyd)', logo: 'HAPAG-LLOYD', color: '#ea580c' },
  { code: 'COSU', name: 'كوسكو شيبنج (COSCO Shipping)', logo: 'COSCO', color: '#0284c7' },
  { code: 'ONEY', name: 'أوشن نتورك إكسبرس (ONE)', logo: 'ONE', color: '#db2777' },
  { code: 'EGLV', name: 'إيفرجرين لاين (Evergreen)', logo: 'EVERGREEN', color: '#16a34a' },
];

export function CarrierTrackingHubTab() {
  const [carrierCode, setCarrierCode] = useState('MSCU');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);

  const handleSyncTracking = async () => {
    if (!trackingNumber.trim()) {
      toast.error('يرجى إدخال رقم الحاوية أو بوليصة الشحن');
      return;
    }

    try {
      setIsSyncing(true);
      const res = await maritimeApi.syncCarrierTracking(carrierCode, trackingNumber.trim().toUpperCase());

      const events = await maritimeApi.listCarrierApiEvents(trackingNumber.trim().toUpperCase());
      setTrackingEvents(events);
      toast.success(`تمت المزامنة اللحظية بنجاح مع خوادم الخط الملاحي (${res.eventsCount} أحداث مسجلة)`);
    } catch (err: any) {
      toast.error(err.message || 'فشل الاتصال بالخط الملاحي');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* 1. Header Banner */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppIcons.Globe size={20} />
            <span>بوابة وتكامل التتبع اللحظي للنواقل والخطوط الملاحية (Carrier Live Tracking Hub)</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
            الربط المباشر مع واجهات API وأنظمة تتبع كبرى الخطوط الملاحية العالمية وفق معايير DCSA Track & Trace
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            DCSA API Gateway Active
          </span>
        </div>
      </div>

      {/* 2. Interactive Carrier Selector & Query Box */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#170e5e' }}>
          اختر الخط الملاحي وأدخل رقم الحاوية أو البوليصة (Container / B/L Number)
        </div>

        {/* Carrier Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          {SUPPORTED_CARRIERS.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCarrierCode(c.code)}
              style={{
                padding: '10px 8px',
                borderRadius: '8px',
                border: carrierCode === c.code ? `2px solid ${c.color}` : '1px solid #e2e8f0',
                background: carrierCode === c.code ? '#f8fafc' : '#ffffff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.1s ease',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: c.color }}>{c.logo}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name.split(' ')[0]}</div>
            </button>
          ))}
        </div>

        {/* Input & Action */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <input
            type="text"
            placeholder="أدخل رقم الحاوية (مثال: MSCU9284710) أو رقم البوليصة Master B/L..."
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSyncTracking()}
            style={{
              flex: 1,
              height: '42px',
              padding: '0 14px',
              borderRadius: '8px',
              border: '2px solid #cbd5e1',
              fontSize: '0.92rem',
              fontWeight: 700,
              fontFamily: 'monospace',
              letterSpacing: '0.5px',
            }}
          />

          <button
            type="button"
            onClick={handleSyncTracking}
            disabled={isSyncing}
            style={{
              height: '42px',
              padding: '0 24px',
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.875rem',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(23, 14, 94, 0.15)',
            }}
          >
            <AppIcons.RefreshCw size={16} />
            <span>{isSyncing ? 'جاري الاتصال بالسيرفر...' : 'مزامنة لحظية من الخط'}</span>
          </button>
        </div>
      </div>

      {/* 3. Tracking Results & Timeline */}
      {trackingEvents.length > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#170e5e' }}>
                سجل الأحداث والمحطات اللوجستية للحاوية: <span style={{ fontFamily: 'monospace' }}>{trackingNumber}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                الخط الملاحي الناقل: {SUPPORTED_CARRIERS.find((c) => c.code === carrierCode)?.name} | معيار DCSA v2.2
              </div>
            </div>
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '0.75rem' }}>
              تم استلام {trackingEvents.length} أحداث
            </span>
          </div>

          {/* Vertical Stepper Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', paddingRight: '20px' }}>
            <div style={{ position: 'absolute', top: '10px', bottom: '10px', right: '7px', width: '2px', background: '#e2e8f0' }} />

            {trackingEvents.map((evt, idx) => (
              <div key={evt.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', position: 'relative' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: idx === 0 ? '#16a34a' : '#170e5e',
                    border: '3px solid #ffffff',
                    boxShadow: '0 0 0 2px #cbd5e1',
                    zIndex: 1,
                    marginTop: '3px',
                  }}
                />
                <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                      {evt.event_type === 'BOOK' ? 'تأكيد الحجز الملاحي (Booking Confirmed)'
                        : evt.event_type === 'GTI' ? 'دخول الحاوية محطة الميناء (Gate-in at POL)'
                        : evt.event_type === 'LOAD' ? 'تحميل الحاوية على السفينة (Vessel Loaded)'
                        : evt.event_type === 'DEPT' ? 'إبحار السفينة (Vessel Departed)'
                        : evt.event_type === 'ARRI' ? 'وصول السفينة لميناء الوصول (Vessel Arrived)'
                        : evt.event_type}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {new Date(evt.event_time).toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>
                    الموقع: <strong>{evt.event_location || 'Terminal Area'}</strong> | الناقل: <strong>{evt.carrier_code}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
