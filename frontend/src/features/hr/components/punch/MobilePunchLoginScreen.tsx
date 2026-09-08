import React from 'react';
import { SmartphoneIcon, AlertTriangleIcon, UsersIcon } from '@/shared/components/icons/AppIcons';
import { Link } from 'react-router-dom';

interface MobilePunchLoginScreenProps {
  phone: string;
  onPhoneChange: (val: string) => void;
  pinCode: string;
  onPinCodeChange: (val: string) => void;
  onSubmit: (e?: React.FormEvent, tenantId?: string) => void;
  loading: boolean;
  errorMsg: string;
  disambiguationTenants: Array<{ id: string; name: string; slug: string }> | null;
}

export function MobilePunchLoginScreen({
  phone,
  onPhoneChange,
  pinCode,
  onPinCodeChange,
  onSubmit,
  loading,
  errorMsg,
  disambiguationTenants,
}: MobilePunchLoginScreenProps) {
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

        {disambiguationTenants && (
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1d4ed8', fontWeight: 800, fontSize: '13px', marginBottom: '10px' }}>
              <UsersIcon size={16} />
              <span>اختر المنشأة التابع لها:</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {disambiguationTenants.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSubmit(undefined, t.id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'right',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{t.name}</span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{t.slug}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={(e) => onSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              رقم الهاتف المسجل *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="01xxxxxxxxx"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              رمز الدخول السريع (PIN Code) *
            </label>
            <input
              type="password"
              required
              maxLength={8}
              value={pinCode}
              onChange={(e) => onPinCodeChange(e.target.value)}
              placeholder="••••"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '18px',
                textAlign: 'center',
                letterSpacing: '6px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(23, 14, 94, 0.2)',
              marginTop: '8px',
            }}
          >
            {loading ? 'جارٍ التحقق...' : 'تسجيل الدخول لبصمة الموبايل'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          <Link to="/login" style={{ color: '#170e5e', textDecoration: 'none', fontWeight: 700 }}>
            الرجوع لتسجيل الدخول كمسؤول أو كاشير
          </Link>
        </div>
      </div>
    </div>
  );
}
