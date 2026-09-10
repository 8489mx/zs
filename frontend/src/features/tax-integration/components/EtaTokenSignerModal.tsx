import { useState } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';

interface EtaTokenSignerModalProps {
  open: boolean;
  onClose: () => void;
  saleId?: number;
  docNo?: string;
}

export function EtaTokenSignerModal({ open, onClose, saleId, docNo }: EtaTokenSignerModalProps) {
  const [step, setStep] = useState<'prepare' | 'sign' | 'attach' | 'done'>('prepare');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canonicalHash, setCanonicalHash] = useState('');
  const [cadesSignature, setCadesSignature] = useState('');

  const handleClose = () => {
    setStep('prepare'); setError(''); setCanonicalHash(''); setCadesSignature('');
    onClose();
  };

  const prepareDocument = async () => {
    if (!saleId) { setError('رقم الفاتورة مطلوب'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/tax-integration/eta/invoices/' + saleId + '/canonical', {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'فشل تحضير الوثيقة');
      setCanonicalHash(data.data.canonicalHashBase64);
      setStep('sign');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const attachSignature = async () => {
    if (!cadesSignature.trim()) { setError('يرجى لصق التوقيع الإلكتروني CAdES-BES'); return; }
    if (!saleId) return;
    setLoading(true); setError('');
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
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <StandardDialog
      open={open}
      onClose={handleClose}
      title="توقيع الفاتورة المصرية – USB Token CAdES-BES"
      subtitle={docNo ? 'الفاتورة: ' + docNo : 'توقيع إلكتروني عبر التوكن المحلي (Egypt Trust / Misr Clearing)'}
      width="min(620px, 96vw)"
      footerActions={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
          {step === 'prepare' && (
            <Button onClick={prepareDocument} disabled={loading} style={{ background: '#170e5e', color: '#fff' }}>
              {loading ? 'جار التحضير...' : 'تحضير الوثيقة للتوقيع'}
            </Button>
          )}
          {step === 'sign' && (
            <Button onClick={attachSignature} disabled={loading} style={{ background: '#170e5e', color: '#fff' }}>
              {loading ? 'جار الربط...' : 'ربط التوقيع بالفاتورة'}
            </Button>
          )}
          {step === 'done' && (
            <Button onClick={handleClose} style={{ background: '#170e5e', color: '#fff' }}>إغلاق</Button>
          )}
          <Button variant="secondary" onClick={handleClose}>إلغاء</Button>
        </div>
      }
    >
      <div dir="rtl" style={{ padding: '0 4px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.83rem' }}>
            {error}
          </div>
        )}

        {step === 'prepare' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6 }}>
                هذه الأداة تُجهز الـ Canonical JSON للفاتورة وتحسب الـ SHA-256 Hash اللازم للتوقيع بالتوكن المحلي.
              </p>
              <p style={{ margin: '10px 0 0', fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6 }}>
                الخطوات: ① تحضير الوثيقة ← ② نسخ الهاش للبرنامج المحلي ← ③ لصق التوقيع ← ④ ربط بالفاتورة
              </p>
            </div>
          </div>
        )}

        {step === 'sign' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>
                الهاش SHA-256 (انسخه لبرنامج التوقيع المحلي)
              </label>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.72rem', wordBreak: 'break-all', color: '#334155', direction: 'ltr' }}>
                {canonicalHash}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(canonicalHash)}
                style={{ marginTop: 6, background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', cursor: 'pointer', color: '#64748b' }}
              >
                نسخ الهاش
              </button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>
                التوقيع الإلكتروني CAdES-BES (Base64 من برنامج التوكن المحلي)
              </label>
              <textarea
                value={cadesSignature}
                onChange={e => setCadesSignature(e.target.value)}
                placeholder="الصق هنا التوقيع الإلكتروني CAdES-BES المُنتج من برنامج Egypt Trust أو Misr Clearing..."
                rows={5}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.72rem', fontFamily: 'monospace', direction: 'ltr', wordBreak: 'break-all', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '2rem', color: '#15803d', marginBottom: 12 }}>&#10003;</div>
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
