import { useState, useEffect, useRef } from 'react';
import { mobilePunchApi, type MobileAttendanceUser, type TodayAttendanceStatus } from '../api/mobile-punch.api';
import { MobilePunchLoginScreen } from '../components/punch/MobilePunchLoginScreen';
import { MobilePunchCamera } from '../components/punch/MobilePunchCamera';
import { MobilePunchGpsCard } from '../components/punch/MobilePunchGpsCard';
import { MobilePunchTimeline } from '../components/punch/MobilePunchTimeline';

export default function MobilePunchPage() {
  const [token, setToken] = useState<string | null>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('zs_mobile_punch_token') : null;
  });

  const [employee, setEmployee] = useState<MobileAttendanceUser | null>(() => {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('zs_mobile_punch_employee') : null;
    return raw ? JSON.parse(raw) : null;
  });

  const [status, setStatus] = useState<TodayAttendanceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [punching, setPunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form state
  const [phone, setPhone] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [disambiguationTenants, setDisambiguationTenants] = useState<Array<{ id: string; name: string; slug: string }> | null>(null);

  // GPS state
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);

  // Fetch status if logged in
  useEffect(() => {
    if (token) {
      loadStatus();
    }
  }, [token]);

  // Request GPS when logged in
  useEffect(() => {
    if (token) {
      requestLocation();
    }
  }, [token]);

  // Setup camera stream when logged in
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (token && !capturedSelfie) {
      navigator.mediaDevices?.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => undefined);
          setCameraActive(true);
        }
      })
      .catch((err) => {
        console.warn('Camera access denied or unavailable:', err);
        setCameraActive(false);
      });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [token, capturedSelfie]);

  async function loadStatus() {
    try {
      setLoading(true);
      const res = await mobilePunchApi.getStatus();
      setStatus(res);
      if (res.branch?.lat && res.branch?.lng && gpsLocation) {
        computeDistance(gpsLocation.lat, gpsLocation.lng, res.branch.lat, res.branch.lng);
      }
    } catch (err: any) {
      if (err?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }

  function requestLocation() {
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('متصفحك لا يدعم تحديد الموقع الجغرافي بالـ GPS');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsLocation(coords);
        if (status?.branch?.lat && status?.branch?.lng) {
          computeDistance(coords.lat, coords.lng, status.branch.lat, status.branch.lng);
        }
      },
      (err) => {
        setGpsError('تعذر الحصول على موقع الـ GPS، يرجى السماح بالإذن في الهاتف');
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function computeDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = Math.round(R * c);
    setGpsDistance(dist);
  }

  function takeSnapshot(): string | null {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedSelfie(dataUrl);
    return dataUrl;
  }

  async function handleLogin(e?: React.FormEvent, selectedTenantId?: string) {
    if (e) e.preventDefault();
    setErrorMsg('');
    setDisambiguationTenants(null);
    setLoading(true);
    try {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const companyCode = selectedTenantId || urlParams?.get('c') || urlParams?.get('tenant') || (typeof localStorage !== 'undefined' ? localStorage.getItem('zs_last_company_code') : null) || undefined;
      const res = await mobilePunchApi.login({ phone: phone.trim(), pinCode: pinCode.trim(), companyCode });
      if (companyCode) {
        localStorage.setItem('zs_last_company_code', companyCode);
      }
      localStorage.setItem('zs_mobile_punch_token', res.token);
      localStorage.setItem('zs_mobile_punch_employee', JSON.stringify(res.employee));
      setToken(res.token);
      setEmployee(res.employee);
      await loadStatus();
    } catch (err: any) {
      const details = err?.details || err?.response?.data?.details || err?.response?.data || err;
      const tenants = details?.tenants || details?.error?.tenants || err?.tenants;
      const code = err?.code || details?.code || err?.response?.data?.code;

      if ((code === 'MULTIPLE_TENANTS' || code === 'AMBIGUOUS_EMPLOYEE_CREDENTIALS') && Array.isArray(tenants) && tenants.length > 0) {
        setDisambiguationTenants(tenants);
        return;
      }
      setErrorMsg(err?.message || 'بيانات الدخول غير صحيحة أو رمز PIN غير مطابق');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('zs_mobile_punch_token');
    localStorage.removeItem('zs_mobile_punch_employee');
    setToken(null);
    setEmployee(null);
    setStatus(null);
    setCapturedSelfie(null);
  }

  async function handlePunch(type: 'check_in' | 'check_out') {
    setErrorMsg('');
    setSuccessMsg('');

    if (!gpsLocation) {
      setErrorMsg('جاري جلب إحداثيات الـ GPS، يرجى الانتظار ثانية أو إعادة المحاولة.');
      requestLocation();
      return;
    }

    const selfie = capturedSelfie || takeSnapshot();

    setPunching(true);
    try {
      const res = await mobilePunchApi.recordPunch({
        type,
        latitude: gpsLocation.lat,
        longitude: gpsLocation.lng,
        selfieDataUrl: selfie || undefined,
      });

      setSuccessMsg(res.message);
      await loadStatus();
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر تسجيل البصمة، تأكد من وجودك داخل محيط الفرع');
    } finally {
      setPunching(false);
    }
  }

  const radius = status?.branch?.geofenceRadius || employee?.geofenceRadiusMeters || 100;
  const isInsideGeofence = gpsDistance !== null ? gpsDistance <= radius : true;

  if (!token) {
    return (
      <MobilePunchLoginScreen
        phone={phone}
        onPhoneChange={setPhone}
        pinCode={pinCode}
        onPinCodeChange={setPinCode}
        onSubmit={handleLogin}
        loading={loading}
        errorMsg={errorMsg}
        disambiguationTenants={disambiguationTenants}
      />
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderRadius: '12px', padding: '10px 14px', border: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{employee?.name}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{status?.branch?.name || 'الفرع الرئيسي'}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
          >
            خروج
          </button>
        </div>

        {/* Camera */}
        <MobilePunchCamera
          videoRef={videoRef}
          canvasRef={canvasRef}
          cameraActive={cameraActive}
          capturedSelfie={capturedSelfie}
          onRetake={() => setCapturedSelfie(null)}
        />

        {/* GPS Card */}
        <MobilePunchGpsCard
          gpsLocation={gpsLocation}
          gpsDistance={gpsDistance}
          radius={radius}
          isInsideGeofence={isInsideGeofence}
          gpsError={gpsError}
          onRequestLocation={requestLocation}
          branch={status?.branch}
        />

        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', color: '#991b1b', fontSize: '12px', fontWeight: 700, border: '1px solid #fecaca' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '12px', fontWeight: 700, border: '1px solid #a7f3d0' }}>
            {successMsg}
          </div>
        )}

        {/* Punch Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            type="button"
            disabled={punching}
            onClick={() => handlePunch('check_in')}
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: '#059669',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
            }}
          >
            {punching ? 'جارٍ التسجيل...' : 'تسجيل حضور'}
          </button>

          <button
            type="button"
            disabled={punching}
            onClick={() => handlePunch('check_out')}
            style={{
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
            }}
          >
            {punching ? 'جارٍ التسجيل...' : 'تسجيل انصراف'}
          </button>
        </div>

        {/* Timeline */}
        <MobilePunchTimeline punches={status?.todayPunches || []} />
      </div>
    </div>
  );
}
