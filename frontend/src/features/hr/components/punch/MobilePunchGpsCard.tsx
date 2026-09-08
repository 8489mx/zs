import { MapPinIcon, CheckIcon, XIcon } from '@/shared/components/icons/AppIcons';
import type { TodayAttendanceStatus } from '../../api/mobile-punch.api';

interface MobilePunchGpsCardProps {
  gpsLocation: { lat: number; lng: number } | null;
  gpsDistance: number | null;
  radius: number;
  isInsideGeofence: boolean;
  gpsError: string;
  onRequestLocation: () => void;
  branch?: TodayAttendanceStatus['branch'];
}

export function MobilePunchGpsCard({
  gpsLocation,
  gpsDistance,
  radius,
  isInsideGeofence,
  gpsError,
  onRequestLocation,
  branch,
}: MobilePunchGpsCardProps) {
  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPinIcon size={18} color="#170e5e" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>فحص النطاق الجغرافي (Geofence)</span>
        </div>
        <button
          type="button"
          onClick={onRequestLocation}
          style={{ border: 'none', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
        >
          تحديث الموقع
        </button>
      </div>

      {gpsError ? (
        <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>{gpsError}</div>
      ) : gpsLocation ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
            <span style={{ color: '#64748b' }}>الفرع المخصص:</span>
            <strong style={{ color: '#0f172a' }}>{branch?.name || 'الفرع الرئيسي'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
            <span style={{ color: '#64748b' }}>المسافة الحالية عن الفرع:</span>
            <strong style={{ color: isInsideGeofence ? '#059669' : '#dc2626' }}>
              {gpsDistance !== null ? `${gpsDistance} متر` : 'غير محدد'} (المسموح: {radius} متر)
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '12px', fontWeight: 700, color: isInsideGeofence ? '#059669' : '#dc2626' }}>
            {isInsideGeofence ? <CheckIcon size={16} /> : <XIcon size={16} />}
            <span>{isInsideGeofence ? 'أنت متواجد داخل النطاق المعتمد للفرع' : 'أنت خارج نطاق الفرع! يرجى الاقتراب'}</span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: '#64748b' }}>جاري تحديد موقعك الجغرافي بالـ GPS...</div>
      )}
    </div>
  );
}
