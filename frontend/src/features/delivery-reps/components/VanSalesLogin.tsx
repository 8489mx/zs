import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TruckIcon } from '@/shared/components/icons/AppIcons';
import { driverPortalApi } from '@/shared/api/delivery-reps.api';

interface VanSalesLoginProps {
  onLoginSuccess: (session: any) => void;
}

export const VanSalesLogin: React.FC<VanSalesLoginProps> = ({ onLoginSuccess }) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [disambiguationTenants, setDisambiguationTenants] = useState<Array<{ id: string; name: string; slug: string }> | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setDisambiguationTenants(null);
    const cleanPhone = phoneInput.trim();
    const cleanPin = pinInput.trim();
    if (!cleanPhone || !cleanPin) {
      setLoginError('يرجى إدخال رقم الهاتف ورمز الـ PIN');
      return;
    }

    setIsLoggingIn(true);
    try {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const companyCode = urlParams?.get('c') || urlParams?.get('tenant') || (typeof localStorage !== 'undefined' ? localStorage.getItem('zs_driver_last_company_code') : null) || undefined;
      const res = await driverPortalApi.login(cleanPhone, cleanPin, companyCode);
      if (companyCode) {
        localStorage.setItem('zs_driver_last_company_code', companyCode);
      }
      onLoginSuccess(res);
    } catch (err: any) {
      const details = err?.details || err?.error?.details || err?.response?.data?.details || err?.response?.data || err;
      const tenants = details?.tenants || details?.error?.tenants || err?.tenants;
      const code = err?.code || details?.code || details?.error?.code || err?.response?.data?.code;

      if ((code === 'MULTIPLE_TENANTS' || code === 'AMBIGUOUS_DRIVER_TENANT') && Array.isArray(tenants) && tenants.length > 0) {
        setDisambiguationTenants(tenants);
        return;
      }
      setLoginError(err.message || 'بيانات الدخول غير صحيحة، تأكد من رقم الهاتف والرمز السري');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSelectTenant = async (tenantId: string) => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const cleanPhone = phoneInput.trim();
      const cleanPin = pinInput.trim();
      const res = await driverPortalApi.login(cleanPhone, cleanPin, tenantId);
      localStorage.setItem('zs_driver_last_company_code', tenantId);
      setDisambiguationTenants(null);
      onLoginSuccess(res);
    } catch (err: any) {
      setLoginError(err.message || 'تعذر تسجيل الدخول للمنشأة المحددة');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '32px 24px',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)',
            }}
          >
            <TruckIcon size={32} color="#170e5e" strokeWidth={1.8} />
          </div>
          <div>
            <span
              style={{
                display: 'inline-block',
                background: '#f0f9ff',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                borderRadius: '20px',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 800,
                marginBottom: '8px',
              }}
            >
              فان كاشير • بيع وتوزيع ميداني
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
            بوابة مبيعات سيارات التوزيع والفان
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
            أدخل رقم الهاتف والرمز السري (PIN) لمباشرة خط السير وفواتير السيارة
          </p>
        </div>

        {loginError && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '16px',
              fontSize: '12.5px',
              color: '#dc2626',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {loginError}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              رقم هاتف المندوب
            </label>
            <input
              type="text"
              placeholder="مثال: 01012345678"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: '#ffffff',
                direction: 'ltr',
                textAlign: 'right',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              رمز الدخول السريع (PIN Code)
            </label>
            <input
              type="password"
              maxLength={6}
              placeholder="مثال: 1234"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '16px',
                boxSizing: 'border-box',
                background: '#ffffff',
                direction: 'ltr',
                textAlign: 'center',
                letterSpacing: '4px',
                outline: 'none',
              }}
            />
            <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              * الرمز السري المخصص لمندوب الفان من إدارة المستودعات
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            style={{
              width: '100%',
              padding: '13px',
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(23, 14, 94, 0.25)',
              marginTop: '6px',
              opacity: isLoggingIn ? 0.7 : 1,
            }}
          >
            {isLoggingIn ? 'جاري التحقق...' : 'تسجيل الدخول ومباشرة البيع'}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center' }}>
          <Link
            to="/driver"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#0284c7',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>الانتقال لبوابة طياري التوصيل والدليفري ←</span>
          </Link>
          <Link
            to="/hub"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>← العودة لمركز البوابات</span>
          </Link>
        </div>
      </div>

      {disambiguationTenants && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              maxWidth: '460px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                تعدد حسابات المنشآت
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                رقم الهاتف مسجل لدى أكثر من شركة. اختر المنشأة المراد إدارة سيارات التوزيع فيها:
              </p>
            </div>

            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {disambiguationTenants.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => handleSelectTenant(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease-in-out',
                    textAlign: 'right',
                    width: '100%',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>كود المنشأة: {t.slug || t.id}</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={isLoggingIn}
                onClick={() => setDisambiguationTenants(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
