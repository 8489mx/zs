import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { mobilePunchApi, type MobileAttendanceUser, type TodayAttendanceStatus } from '../api/mobile-punch.api';
import { CameraIcon, MapPinIcon, SmartphoneIcon, CheckIcon, XIcon, AlertTriangleIcon, UsersIcon } from '@/shared/components/icons/AppIcons';

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
      if (res.branch.lat && res.branch.lng && gpsLocation) {
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

    // Take selfie snapshot
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

  // ==========================================
  // LOGIN SCREEN (إذا لم يكن مسجل دخول)
  // ==========================================
  if (!token) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '36px 30px',
            boxShadow: '0 8px 30px -4px rgba(15, 23, 42, 0.08)',
            boxSizing: 'border-box',
          }}
        >
          {/* Logo & Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #170e5e 0%, #2563eb 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(23, 14, 94, 0.25)',
                marginBottom: '16px',
              }}
            >
              <SmartphoneIcon size={30} color="#ffffff" strokeWidth={2} />
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>
              بصمة الموبايل والـ GPS
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              Z-Systems Mobile Attendance & GPS Punch
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#991b1b',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <AlertTriangleIcon size={16} color="#991b1b" />
              <span>{errorMsg}</span>
            </div>
          )}

          {disambiguationTenants && disambiguationTenants.length > 0 && (
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e40af', marginBottom: '8px' }}>
                تم العثور على حسابك في أكثر من منشأة، يرجى اختيار المنشأة:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {disambiguationTenants.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleLogin(undefined, t.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #93c5fd',
                      backgroundColor: '#ffffff',
                      color: '#1e40af',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'right',
                    }}
                  >
                    {t.name || t.slug || t.id}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رقم الهاتف المحمول:
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 01012345678"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  direction: 'ltr',
                  textAlign: 'right',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رمز الدخول السري (PIN):
              </label>
              <input
                type="password"
                maxLength={8}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="الرمز السري المكون من 4 إلى 6 أرقام"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '16px',
                  letterSpacing: '2px',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '8px',
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(23, 14, 94, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? 'جاري التحقق...' : 'دخول وتسجيل البصمة'}
            </button>
          </form>

          <div
            style={{
              marginTop: '24px',
              padding: '14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '12px',
              color: '#64748b',
              lineHeight: 1.6,
              textAlign: 'center',
            }}
          >
            لأول تسجيل حضور: يمكنك استخدام رمز PIN الافتراضي <strong style={{ color: '#170e5e' }}>1234</strong> أو المسجل لك في شؤون العاملين.
          </div>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Link
              to="/portal"
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#170e5e',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <UsersIcon size={16} color="#170e5e" />
              <span>الانتقال لبوابة الموظف الذاتية (ESS)</span>
            </Link>
          </div>

          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <Link
              to="/hub"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                textDecoration: 'none',
              }}
            >
              ← العودة لمركز البوابات
            </Link>
          </div>
        </div>

        <div style={{ marginTop: '20px', fontSize: '11.5px', color: '#94a3b8', textAlign: 'center' }}>
          Z-Systems Cloud ERP • منظومة الحضور والانصراف الذكي بالـ GPS
        </div>
      </div>
    );
  }

  // ==========================================
  // AUTHENTICATED PUNCH SCREEN
  // ==========================================
  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Navigation Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #170e5e 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(23, 14, 94, 0.2)',
            }}
          >
            <SmartphoneIcon size={22} color="#ffffff" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a' }}>بصمة الموبايل والـ GPS</h1>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>الحضور والانصراف الذكي للموظفين</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            to="/portal"
            style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
            }}
            title="الانتقال لبوابة الموظف الذاتية"
          >
            البوابة الذاتية
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            خروج
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 18,
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 30px -4px rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ padding: '20px' }}>
          {/* Employee Banner */}
          <div
            style={{
              background: '#f1f5f9',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{employee?.name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {employee?.employeeNo} | {status?.branch?.name || employee?.branchName}
              </div>
            </div>
            <div
              style={{
                background: '#e0e7ff',
                color: '#3730a3',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <CheckIcon size={12} color="#3730a3" strokeWidth={2.5} />
              <span>موظف معتمد</span>
            </div>
          </div>

          {/* Geofence & GPS Status Banner */}
          <div
            style={{
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 16,
              border: `1px solid ${isInsideGeofence ? '#bbf7d0' : '#fecaca'}`,
              background: isInsideGeofence ? '#f0fdf4' : '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: isInsideGeofence ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isInsideGeofence ? <MapPinIcon size={20} color="#166534" strokeWidth={2} /> : <AlertTriangleIcon size={20} color="#991b1b" strokeWidth={2} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: isInsideGeofence ? '#166534' : '#991b1b' }}>
                {isInsideGeofence ? 'أنت داخل نطاق الفرع (GPS معتمد)' : 'تنبيه: أنت خارج نطاق الفرع!'}
              </div>
              <div style={{ fontSize: 11, color: isInsideGeofence ? '#15803d' : '#b91c1c' }}>
                {gpsDistance !== null
                  ? `المسافة الحالية عن الفرع: ${gpsDistance} متر (الحد الأقصى المسموح: ${radius}م)`
                  : gpsError || 'جاري رصد إحداثيات الـ GPS...'}
              </div>
            </div>
            <button
              type="button"
              onClick={requestLocation}
              style={{
                background: 'none',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              تحديث
            </button>
          </div>

          {/* Camera Selfie Section */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 140,
                height: 140,
                margin: '0 auto',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #170e5e',
                position: 'relative',
                background: '#f1f5f9',
                boxShadow: '0 4px 14px rgba(23, 14, 94, 0.15)',
              }}
            >
              {!capturedSelfie ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)',
                    }}
                  />
                  {!cameraActive && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#ffffff',
                        fontSize: 12,
                        padding: 10,
                      }}
                    >
                      جاري تشغيل الكاميرا...
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={capturedSelfie}
                  alt="Selfie"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                  }}
                />
              )}
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <span style={{ fontSize: 12, color: '#64748b', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {capturedSelfie ? (
                <>
                  <CheckIcon size={14} color="#16a34a" strokeWidth={2.5} />
                  <span>تم التقاط صورة الوجه</span>
                </>
              ) : (
                <span>وجّه وجهك إلى الكاميرا للتحقق</span>
              )}
            </span>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                marginBottom: 14,
                textAlign: 'center',
              }}
            >
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                marginBottom: 14,
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              {successMsg}
            </div>
          )}

          {/* Punch Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {/* Check In Button */}
            <button
              type="button"
              disabled={punching || status?.hasCheckedIn || !isInsideGeofence}
              onClick={() => handlePunch('check_in')}
              style={{
                padding: '16px 12px',
                borderRadius: 14,
                border: 'none',
                background: status?.hasCheckedIn
                  ? '#cbd5e1'
                  : isInsideGeofence
                  ? '#16a34a'
                  : '#94a3b8',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 800,
                cursor: status?.hasCheckedIn || !isInsideGeofence ? 'not-allowed' : 'pointer',
                boxShadow: status?.hasCheckedIn ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckIcon size={20} color="#ffffff" strokeWidth={2.5} />
              <span>تسجيل حضور</span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>Check In</span>
            </button>

            {/* Check Out Button */}
            <button
              type="button"
              disabled={punching || !status?.hasCheckedIn || status?.hasCheckedOut || !isInsideGeofence}
              onClick={() => handlePunch('check_out')}
              style={{
                padding: '16px 12px',
                borderRadius: 14,
                border: 'none',
                background: status?.hasCheckedOut || !status?.hasCheckedIn
                  ? '#cbd5e1'
                  : isInsideGeofence
                  ? '#dc2626'
                  : '#94a3b8',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 800,
                cursor: status?.hasCheckedOut || !status?.hasCheckedIn || !isInsideGeofence ? 'not-allowed' : 'pointer',
                boxShadow: status?.hasCheckedOut || !status?.hasCheckedIn ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <XIcon size={20} color="#ffffff" strokeWidth={2.5} />
              <span>تسجيل انصراف</span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>Check Out</span>
            </button>
          </div>

          {/* Today's Log Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '14px',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
              سجل بصمات اليوم ({status?.workDate || 'اليوم'}):
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: '#64748b' }}>وقت الحضور:</span>
              <span style={{ fontWeight: 700, color: status?.checkInTime ? '#166534' : '#94a3b8' }}>
                {status?.checkInTime || 'لم يُسجل بعد'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#64748b' }}>وقت الانصراف:</span>
              <span style={{ fontWeight: 700, color: status?.checkOutTime ? '#991b1b' : '#94a3b8' }}>
                {status?.checkOutTime || 'لم يُسجل بعد'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 11.5, color: '#94a3b8', textAlign: 'center' }}>
        Z-Systems Cloud ERP • منظومة الحضور الذكي بالـ GPS
      </div>
    </div>
  );
}
