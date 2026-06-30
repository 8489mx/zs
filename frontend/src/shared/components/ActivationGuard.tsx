import React, { useEffect, useState } from 'react';
import { getHardwareId, verifyLicense } from '@/lib/activation';

interface ActivationGuardProps {
  children: React.ReactNode;
}

export function ActivationGuard({ children }: ActivationGuardProps) {
  const [isActivated, setIsActivated] = useState<boolean | null>(null);
  const [hardwareId, setHardwareId] = useState<string>('');
  const [licenseInput, setLicenseInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function checkLicense() {
      // Bypass activation if in DEV or if NOT running inside Electron
      if (import.meta.env.DEV || typeof window === 'undefined' || !(window as any).electronAPI) {
        setIsActivated(true);
        return;
      }
      const id = await getHardwareId();
      setHardwareId(id);

      const savedKey = localStorage.getItem('zsystems_license_key');
      if (savedKey) {
        const isValid = await verifyLicense(id, savedKey);
        if (isValid) {
          setIsActivated(true);
          return;
        }
      }
      setIsActivated(false);
    }
    checkLicense();
  }, []);

  const handleActivate = async () => {
    if (!licenseInput.trim()) {
      setErrorMsg('الرجاء إدخال مفتاح التفعيل.');
      return;
    }

    const isValid = await verifyLicense(hardwareId, licenseInput.trim());
    if (isValid) {
      localStorage.setItem('zsystems_license_key', licenseInput.trim());
      setIsActivated(true);
    } else {
      setErrorMsg('مفتاح التفعيل غير صحيح.');
    }
  };

  if (isActivated === null) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>جاري التحقق من التفعيل...</div>;
  }

  if (isActivated) {
    return <>{children}</>;
  }

  return (
    <div dir="rtl" style={{
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: '#fff', 
        padding: '2rem', 
        borderRadius: '12px', 
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h2 style={{ margin: '0 0 1rem', color: '#1e293b' }}>تفعيل النظام</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          يرجى إرسال الرمز التعريفي التالي للدعم الفني للحصول على مفتاح التفعيل.
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#334155', fontWeight: 600 }}>الرمز التعريفي (Hardware ID):</label>
          <input 
            type="text" 
            readOnly 
            value={hardwareId}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f1f5f9',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#0f172a'
            }}
            onFocus={e => e.target.select()}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#334155', fontWeight: 600 }}>مفتاح التفعيل:</label>
          <input 
            type="text" 
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={licenseInput}
            onChange={(e) => {
              setLicenseInput(e.target.value);
              setErrorMsg('');
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              textAlign: 'center',
              textTransform: 'uppercase'
            }}
          />
        </div>

        {errorMsg && (
          <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>
            {errorMsg}
          </div>
        )}

        <button 
          onClick={handleActivate}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#0f172a',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          تفعيل الآن
        </button>
      </div>
    </div>
  );
}
