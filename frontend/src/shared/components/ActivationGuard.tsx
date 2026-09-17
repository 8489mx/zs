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
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    async function checkLicense() {
      // Bypass activation if in DEV or if NOT running inside Electron
      if (import.meta.env.DEV || typeof window === 'undefined' || !(window as any).electronAPI) {
        setIsActivated(true);
        return;
      }
      try {
        const id = await getHardwareId();
        setHardwareId(id || 'WIN-SYSTEM-DEVICE-01');

        // 1. Check disk-persisted license from Electron first (reads Windows Registry & ProgramData)
        if ((window as any).electronAPI.getSavedLicense) {
          const diskLicense = await (window as any).electronAPI.getSavedLicense();
          if (diskLicense && diskLicense.licenseKey) {
            const isValid = await verifyLicense(id, diskLicense.licenseKey);
            if (isValid) {
              localStorage.setItem('zsystems_license_key', diskLicense.licenseKey);
              setIsActivated(true);
              return;
            }
          }
        }

        // 2. Check localStorage fallback
        const savedKey = localStorage.getItem('zsystems_license_key');
        if (savedKey) {
          const isValid = await verifyLicense(id, savedKey);
          if (isValid) {
            if ((window as any).electronAPI.saveLicenseKey) {
              await (window as any).electronAPI.saveLicenseKey(savedKey);
            }
            setIsActivated(true);
            return;
          }
        }
        setIsActivated(false);
      } catch (err) {
        console.error('[ACTIVATION] Error verifying license:', err);
        setIsActivated(false);
      }
    }
    checkLicense();
  }, []);

  const handleCopyHardwareId = () => {
    if (!hardwareId) return;
    navigator.clipboard.writeText(hardwareId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleKeyChange = (val: string) => {
    const raw = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
    const parts: string[] = [];
    for (let i = 0; i < raw.length; i += 4) {
      parts.push(raw.slice(i, i + 4));
    }
    setLicenseInput(parts.join('-'));
    setErrorMsg('');
  };

  const handleActivate = async () => {
    const cleaned = licenseInput.trim();
    if (!cleaned) {
      setErrorMsg('الرجاء إدخال مفتاح التفعيل المعتمد.');
      return;
    }

    setIsChecking(true);
    setErrorMsg('');

    try {
      const activeHwId = hardwareId || await getHardwareId();
      const isValid = await verifyLicense(activeHwId, cleaned);
      if (isValid) {
        localStorage.setItem('zsystems_license_key', cleaned);
        if (typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.saveLicenseKey) {
          try {
            await (window as any).electronAPI.saveLicenseKey(cleaned);
          } catch (e) {
            console.error('[ACTIVATION] Failed to persist license to Registry/disk:', e);
          }
        }
        setIsActivated(true);
      } else {
        setErrorMsg('مفتاح التفعيل غير صحيح أو لا يطابق هذا الجهاز.');
      }
    } catch (e) {
      setErrorMsg('تعذر التحقق من مفتاح التفعيل.');
    } finally {
      setIsChecking(false);
    }
  };

  if (isActivated === null) {
    return (
      <div dir="rtl" style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
        color: '#64748b',
        fontSize: '0.9rem',
        fontWeight: 600,
      }}>
        جاري التحقق من ترخيص المنظومة...
      </div>
    );
  }

  if (isActivated) {
    return <>{children}</>;
  }

  return (
    <div dir="rtl" style={{
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: '20px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: '#ffffff', 
        padding: '36px 32px 30px', 
        borderRadius: '18px', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0',
        maxWidth: '440px',
        width: '100%',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}>
        {/* Logo Emblem */}
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        }}>
          <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
            <path d="M 22 22 H 78 L 46 72 H 78 V 84 H 22 L 54 34 H 22 Z" fill="#170e5e" />
          </svg>
        </div>

        <h2 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>
          ترخيص وتفعيل المنظومة
        </h2>
        <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: '0.82rem', lineHeight: 1.5 }}>
          يرجى إرسال الرمز التعريفي التالي لخدمة العملاء للحصول على مفتاح التفعيل المعتمد لهذا الجهاز.
        </p>

        {/* Hardware ID Field with 1-Click Copy */}
        <div style={{ marginBottom: '18px', textAlign: 'right' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.8rem' }}>
            الرمز التعريفي للجهاز (Hardware ID):
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              readOnly 
              value={hardwareId}
              dir="ltr"
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                textAlign: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
                color: '#170e5e',
                fontFamily: 'monospace, sans-serif',
                letterSpacing: '0.04em',
                outline: 'none',
              }}
              onFocus={e => e.target.select()}
            />
            <button
              type="button"
              onClick={handleCopyHardwareId}
              style={{
                padding: '9px 14px',
                background: copied ? '#ecfdf5' : '#f1f5f9',
                color: copied ? '#047857' : '#334155',
                border: copied ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? 'تم النسخ' : 'نسخ'}
            </button>
          </div>
        </div>

        {/* License Key Input */}
        <div style={{ marginBottom: '18px', textAlign: 'right' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontWeight: 700, fontSize: '0.8rem' }}>
            مفتاح التفعيل (License Key):
          </label>
          <input 
            type="text" 
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={licenseInput}
            dir="ltr"
            onChange={(e) => handleKeyChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && licenseInput.trim() && !isChecking) {
                handleActivate();
              }
            }}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              textAlign: 'center',
              fontSize: '0.95rem',
              fontWeight: 800,
              color: '#0f172a',
              fontFamily: 'monospace, sans-serif',
              letterSpacing: '0.08em',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {errorMsg && (
          <div style={{ 
            color: '#b91c1c', 
            background: '#fef2f2', 
            border: '1px solid #fca5a5', 
            borderRadius: '8px', 
            padding: '8px 12px', 
            marginBottom: '16px', 
            fontSize: '0.8rem', 
            fontWeight: 600,
            textAlign: 'center',
          }}>
            {errorMsg}
          </div>
        )}

        <button 
          type="button"
          disabled={isChecking || !licenseInput.trim()}
          onClick={handleActivate}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: isChecking || !licenseInput.trim() ? '#94a3b8' : '#170e5e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: isChecking || !licenseInput.trim() ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 6px rgba(23, 14, 94, 0.25)',
            transition: 'all 0.15s ease',
          }}
        >
          {isChecking ? 'جاري التحقق...' : 'تفعيل المنظومة الآن'}
        </button>

        <div style={{ marginTop: '18px', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
          منظومة Z-Systems المؤسسية • التفعيل الدائم المعتمد
        </div>
      </div>
    </div>
  );
}
