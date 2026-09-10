import { useState } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';

type Step = 'create' | 'compliance' | 'production' | 'done';

interface EgsUnit {
  id: string;
  deviceName: string;
  status: string;
}

interface ZatcaOnboardingWizardModalProps {
  open: boolean;
  onClose: () => void;
}

export function ZatcaOnboardingWizardModal({ open, onClose }: ZatcaOnboardingWizardModalProps) {
  const [step, setStep] = useState<Step>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [egsUnit, setEgsUnit] = useState<EgsUnit | null>(null);
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({ deviceName: '', customId: '', environment: 'sandbox' as const });

  const handleClose = () => {
    setStep('create'); setError(''); setSuccessMsg(''); setEgsUnit(null); setOtp('');
    onClose();
  };

  const createUnit = async () => {
    if (!form.deviceName.trim()) { setError('اسم الجهاز مطلوب'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/tax-integration/zatca/egs-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deviceName: form.deviceName, customId: form.customId, environment: form.environment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل إنشاء وحدة EGS');
      setEgsUnit(data.egsUnit);
      setSuccessMsg(data.message);
      setStep('compliance');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const requestCompliance = async () => {
    if (!otp || otp.length !== 6) { setError('رمز OTP يجب أن يكون 6 أرقام'); return; }
    if (!egsUnit) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/tax-integration/zatca/egs-units/request-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ egsId: egsUnit.id, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل طلب شهادة الامتثال');
      setSuccessMsg(data.message);
      setStep('production');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const requestProduction = async () => {
    if (!egsUnit) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/tax-integration/zatca/egs-units/' + egsUnit.id + '/request-production', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل تفعيل شهادة الإنتاج');
      setSuccessMsg(data.message);
      setStep('done');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const stepLabels: Record<Step, string> = {
    create: '1. تسجيل وحدة EGS',
    compliance: '2. شهادة الامتثال (OTP)',
    production: '3. شهادة الإنتاج',
    done: 'اكتمل الربط',
  };

  return (
    <StandardDialog
      open={open}
      onClose={handleClose}
      title="معالج ربط ZATCA Phase 2 – هيئة الزكاة والضريبة"
      subtitle="اتبع الخطوات لتسجيل جهاز الفاتورة الإلكترونية والحصول على شهادات CSID"
      width="min(680px, 96vw)"
      footerActions={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
          {step === 'create' && <Button onClick={createUnit} disabled={loading} style={{ background: '#170e5e', color: '#fff' }}>{loading ? 'جار الإنشاء...' : 'إنشاء وحدة EGS'}</Button>}
          {step === 'compliance' && <Button onClick={requestCompliance} disabled={loading} style={{ background: '#170e5e', color: '#fff' }}>{loading ? 'جار الطلب...' : 'طلب شهادة الامتثال'}</Button>}
          {step === 'production' && <Button onClick={requestProduction} disabled={loading} style={{ background: '#170e5e', color: '#fff' }}>{loading ? 'جار التفعيل...' : 'تفعيل شهادة الإنتاج'}</Button>}
          {step === 'done' && <Button onClick={handleClose} style={{ background: '#170e5e', color: '#fff' }}>إغلاق</Button>}
          <Button variant="secondary" onClick={handleClose}>إلغاء</Button>
        </div>
      }
    >
      <div dir="rtl" style={{ padding: '0 4px' }}>
        {/* Stepper */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {(['create', 'compliance', 'production', 'done'] as Step[]).map((s) => (
            <div key={s} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
              background: step === s ? '#170e5e' : '#f1f5f9',
              color: step === s ? '#fff' : '#64748b',
              border: '1px solid', borderColor: step === s ? '#170e5e' : '#e2e8f0',
            }}>
              {stepLabels[s]}
            </div>
          ))}
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.83rem' }}>{error}</div>}
        {successMsg && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.83rem' }}>{successMsg}</div>}

        {step === 'create' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>اسم الجهاز / نقطة البيع</label><input value={form.deviceName} onChange={e => setForm(f => ({ ...f, deviceName: e.target.value }))} placeholder="مثال: POS-01 فرع الرياض" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.8125rem', boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>المعرف المخصص (اختياري)</label><input value={form.customId} onChange={e => setForm(f => ({ ...f, customId: e.target.value }))} placeholder="مثال: ZS-POS-001" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.8125rem', boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>بيئة التشغيل</label><select value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value as any }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.8125rem', boxSizing: 'border-box' }}><option value="sandbox">Sandbox (اختبار)</option><option value="simulation">Simulation (محاكاة)</option><option value="production">Production (إنتاج)</option></select></div>
          </div>
        )}

        {step === 'compliance' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0 }}>يرجى تسجيل الدخول إلى <strong>بوابة فاتورة (fatoora.zatca.gov.sa)</strong> والحصول على رمز OTP مكون من 6 أرقام.</p>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>رمز OTP (6 أرقام) من بوابة هيئة الزكاة</label><input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" maxLength={6} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '1rem', letterSpacing: 4, textAlign: 'center', boxSizing: 'border-box' }} /></div>
          </div>
        )}

        {step === 'production' && (
          <div>
            <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>تمت مرحلة الامتثال بنجاح. اضغط لتفعيل شهادة الإنتاج وبدء إصدار الفواتير الحية.</p>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>&#10003;</div>
            <p style={{ color: '#15803d', fontSize: '1rem', fontWeight: 700 }}>تم ربط وحدة EGS بهيئة الزكاة والضريبة بنجاح!</p>
            <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>الوحدة الآن في وضع الإنتاج وجاهزة لتوقيع الفواتير الإلكترونية وإرسالها.</p>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
