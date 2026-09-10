import { useState, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CheckCircleIcon, AlertCircleIcon } from '@/shared/components/icons/AppIcons';

interface EtaTokenSignerModalProps {
  open: boolean;
  onClose: () => void;
  saleId?: number;
  docNo?: string;
}

interface CertificateInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  validTo: string;
  isHardwareToken?: boolean;
}

export function EtaTokenSignerModal({ open, onClose, saleId, docNo }: EtaTokenSignerModalProps) {
  const [step, setStep] = useState<'prepare' | 'sign' | 'attach' | 'done'>('prepare');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canonicalHash, setCanonicalHash] = useState('');
  const [cadesSignature, setCadesSignature] = useState('');
  const [tokenPin, setTokenPin] = useState('');

  // Local Signer Bridge state
  const [bridgeStatus, setBridgeStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [detectedCert, setDetectedCert] = useState<CertificateInfo | null>(null);

  useEffect(() => {
    if (open) {
      checkLocalBridge();
    }
  }, [open]);

  const checkLocalBridge = async () => {
    setBridgeStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch('http://127.0.0.1:8585/health', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setBridgeStatus('connected');
        if (data.certificates && data.certificates.length > 0) {
          setDetectedCert(data.certificates[0]);
        }
      } else {
        setBridgeStatus('disconnected');
      }
    } catch {
      setBridgeStatus('disconnected');
    }
  };

  const handleClose = () => {
    setStep('prepare');
    setError('');
    setCanonicalHash('');
    setCadesSignature('');
    setTokenPin('');
    onClose();
  };

  // 1-Click Auto Sign & Attach via Local USB Bridge
  const handleAutoSign = async () => {
    if (!saleId) {
      setError('رقم الفاتورة مطلوب');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // 1. Fetch canonical hash from ERP backend
      const canRes = await fetch(`/api/tax-integration/eta/invoices/${saleId}/canonical`, {
        credentials: 'include',
      });
      const canData = await canRes.json();
      if (!canRes.ok) {
        throw new Error(canData.message || 'فشل تحضير الوثيقة والتسلسل المعياري');
      }
      const hash = canData.data.canonicalHashBase64;
      setCanonicalHash(hash);

      // 2. Sign via local USB bridge microservice
      const signRes = await fetch('http://127.0.0.1:8585/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonicalHash: hash,
          pin: tokenPin || undefined,
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok || signData.status !== 'success') {
        throw new Error(signData.message || 'فشل التوقيع من جهاز الـ USB Token المحلي');
      }
      const signature = signData.cadesSignature;
      setCadesSignature(signature);

      // 3. Attach CAdES signature to ERP backend
      const attachRes = await fetch('/api/tax-integration/eta/invoices/attach-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          saleId,
          cadesSignature: signature,
        }),
      });
      const attachData = await attachRes.json();
      if (!attachRes.ok) {
        throw new Error(attachData.message || 'فشل ربط الختم بالفاتورة');
      }

      setStep('done');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء دورة التوقيع الآلي');
    } finally {
      setLoading(false);
    }
  };

  // Manual workflow fallback
  const prepareDocument = async () => {
    if (!saleId) {
      setError('رقم الفاتورة مطلوب');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tax-integration/eta/invoices/${saleId}/canonical`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل تحضير الوثيقة');
      setCanonicalHash(data.data.canonicalHashBase64);
      setStep('sign');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const attachSignature = async () => {
    if (!cadesSignature.trim()) {
      setError('يرجى لصق التوقيع الإلكتروني CAdES-BES');
      return;
    }
    if (!saleId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tax-integration/eta/invoices/attach-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ saleId, cadesSignature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل ربط التوقيع');
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={handleClose}
      title="توقيع الفاتورة المصرية – USB Token CAdES-BES"
      subtitle={docNo ? `الفاتورة: ${docNo}` : 'الختم الإلكتروني المعتمد لمصلحة الضرائب المصرية (Egypt Trust / Misr Clearing)'}
      width="min(640px, 96vw)"
      footerActions={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
          {step === 'prepare' && bridgeStatus === 'connected' && (
            <Button
              onClick={handleAutoSign}
              disabled={loading}
              style={{ background: '#170e5e', color: '#fff' }}
            >
              {loading ? 'جاري التوقيع والختم...' : 'توقيع بالتوكن تلقائياً وإرسال'}
            </Button>
          )}

          {step === 'prepare' && bridgeStatus !== 'connected' && (
            <Button
              onClick={prepareDocument}
              disabled={loading}
              style={{ background: '#170e5e', color: '#fff' }}
            >
              {loading ? 'جار التحضير...' : 'تحضير الوثيقة للتوقيع اليدوي'}
            </Button>
          )}

          {step === 'sign' && (
            <Button
              onClick={attachSignature}
              disabled={loading}
              style={{ background: '#170e5e', color: '#fff' }}
            >
              {loading ? 'جار الربط...' : 'ربط التوقيع بالفاتورة'}
            </Button>
          )}

          {step === 'done' && (
            <Button onClick={handleClose} style={{ background: '#170e5e', color: '#fff' }}>
              إغلاق
            </Button>
          )}
          <Button variant="secondary" onClick={handleClose}>
            إلغاء
          </Button>
        </div>
      }
    >
      <div dir="rtl" style={{ padding: '0 4px' }}>
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: '0.83rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Bridge Status Indicator Card */}
        <div
          style={{
            background: bridgeStatus === 'connected' ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${bridgeStatus === 'connected' ? '#86efac' : '#e2e8f0'}`,
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {bridgeStatus === 'connected' ? (
              <CheckCircleIcon size={20} color="#15803d" />
            ) : (
              <AlertCircleIcon size={20} color="#64748b" />
            )}
            <div>
              <div
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: bridgeStatus === 'connected' ? '#15803d' : '#334155',
                }}
              >
                {bridgeStatus === 'connected'
                  ? 'جهاز التوقيع متصل (ZS Local Signer Active)'
                  : bridgeStatus === 'checking'
                  ? 'جاري فحص اتصال أداة التوقيع المحلي...'
                  : 'أداة التوقيع المحلي غير نشطة (منفذ 8585)'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                {bridgeStatus === 'connected' && detectedCert
                  ? `الشهادة: ${detectedCert.subject} (${detectedCert.issuer})`
                  : bridgeStatus === 'connected'
                  ? 'تم الاتصال بالخدمة بنجاح، جاهز لقراءة التوكن'
                  : 'لتفعيل التوقيع التلقائي بنقرة واحدة، شغّل zs-eta-signer.exe'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={checkLocalBridge}
            disabled={bridgeStatus === 'checking'}
            style={{
              background: 'transparent',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: '0.72rem',
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            {bridgeStatus === 'checking' ? 'فحص...' : 'إعادة فحص'}
          </button>
        </div>

        {step === 'prepare' && bridgeStatus === 'connected' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: 6,
                  color: '#1e293b',
                }}
              >
                كلمة مرور التوكن (PIN) (اختياري / أو يتم طلبها تلقائياً من نظام Windows)
              </label>
              <input
                type="password"
                value={tokenPin}
                onChange={(e) => setTokenPin(e.target.value)}
                placeholder="أدخل رمز الـ PIN إذا أردت التوقيع الصامت..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div
              style={{
                fontSize: '0.78rem',
                color: '#64748b',
                background: '#f8fafc',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #f1f5f9',
              }}
            >
              سيتم سحب بيانات الفاتورة وتوليد التسلسل المعياري وتوقيعها بختم CAdES-BES عبر التوكن الموصول وربطها بالفاتورة بضغطة زر واحدة.
            </div>
          </div>
        )}

        {step === 'prepare' && bridgeStatus !== 'connected' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '14px 16px',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6 }}>
                يمكنك التوقيع التلقائي بتشغيل <strong>ZS Local ETA Signer</strong> (من المجلد <code>tools/zs-eta-signer</code>)، أو استخدام مسار التوقيع اليدوي أدناه.
              </p>
              <p style={{ margin: '10px 0 0', fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6 }}>
                الخطوات اليدوية: ① تحضير الوثيقة ➔ ② نسخ الهاش لبرنامج التوقيع المحلي ➔ ③ لصق التوقيع ➔ ④ ربط بالفاتورة.
              </p>
            </div>
          </div>
        )}

        {step === 'sign' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: 6,
                  color: '#1e293b',
                }}
              >
                الهاش SHA-256 (انسخه لبرنامج التوقيع المحلي)
              </label>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontFamily: 'monospace',
                  fontSize: '0.72rem',
                  wordBreak: 'break-all',
                  color: '#334155',
                  direction: 'ltr',
                }}
              >
                {canonicalHash}
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(canonicalHash)}
                style={{
                  marginTop: 6,
                  background: 'transparent',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '4px 12px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                نسخ الهاش
              </button>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: 6,
                  color: '#1e293b',
                }}
              >
                التوقيع الإلكتروني CAdES-BES (Base64 من برنامج التوكن المحلي)
              </label>
              <textarea
                value={cadesSignature}
                onChange={(e) => setCadesSignature(e.target.value)}
                placeholder="الصق هنا التوقيع الإلكتروني CAdES-BES المُنتج من برنامج Egypt Trust أو Misr Clearing..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  direction: 'ltr',
                  wordBreak: 'break-all',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <CheckCircleIcon size={48} color="#15803d" />
            </div>
            <p style={{ color: '#15803d', fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              تم ختم الفاتورة بالتوقيع الإلكتروني بنجاح
            </p>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0 }}>
              الفاتورة جاهزة للإرسال إلى منظومة الفواتير الإلكترونية المصرية (ETA)
            </p>
          </div>
        )}
      </div>
    </StandardDialog>
  );
}
