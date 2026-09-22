import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { QueryCard } from '@/shared/components/query-card';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { DownloadIcon, UploadIcon } from '@/shared/components/icons/AppIcons';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { ApiError } from '@/lib/http';
import { triggerDownload } from '@/lib/browser';
import { settingsApi, type TenantImportReport, type TenantPickOption } from '@/features/settings/api/settings.api';

// Moves this business between the cloud and the desktop app (backend: src/core/tenant-transfer).
// Export downloads a .zsbak of this business; import replaces ALL of this business's data with a
// .zsbak, or with one business picked from a nightly server backup (.zip / .zip.enc).

const CONFIRMATION = 'IMPORT TENANT';

async function fetchPackageBlob(): Promise<{ blob: Blob; fileName: string }> {
  const headers = new Headers();
  const localSessionId = typeof window !== 'undefined'
    ? window.localStorage.getItem('zs.localSessionId') || window.sessionStorage.getItem('zs.localSessionId')
    : null;
  if (localSessionId) headers.set('x-session-id', localSessionId);
  const response = await fetch(settingsApi.tenantTransferExportUrl(), { credentials: 'include', headers });
  if (!response.ok) throw new Error((await response.text()) || 'تعذر تجهيز حزمة البيانات.');
  const disposition = response.headers.get('content-disposition') || '';
  const match = /filename="([^"]+)"/.exec(disposition);
  return { blob: await response.blob(), fileName: match?.[1] || 'ZERP-tenant.zsbak' };
}

function errorPayload(error: unknown): { code?: string; message: string; tenants?: TenantPickOption[] } {
  if (error instanceof ApiError) {
    const details = (error.details || {}) as Record<string, any>;
    const tenants = details?.details?.tenants ?? details?.tenants;
    return { code: error.code, message: error.message, tenants: Array.isArray(tenants) ? tenants : undefined };
  }
  return { message: error instanceof Error ? error.message : 'تعذر تنفيذ العملية.' };
}

export function TenantTransferCard({ canManage }: { canManage: boolean }) {
  const infoQuery = useQuery({ queryKey: ['tenant-transfer-info'], queryFn: settingsApi.tenantTransferInfo, enabled: canManage, staleTime: Infinity });
  const isDesktop = infoQuery.data?.mode === 'desktop';
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantPickOption[] | null>(null);
  const [pick, setPick] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const exportMutation = useMutation({
    mutationFn: fetchPackageBlob,
    onSuccess: ({ blob, fileName }) => {
      triggerDownload(blob, fileName);
      setFeedback({ kind: 'success', message: 'تم تنزيل حزمة بيانات المنشأة. احفظها في مكان آمن.' });
    },
    onError: (error) => setFeedback({ kind: 'error', message: errorPayload(error).message }),
  });

  const importMutation = useMutation({
    mutationFn: () => settingsApi.importTenantPackage(file!, { confirmation, passphrase: passphrase || undefined, pick: pick || undefined }),
    onSuccess: (report: TenantImportReport) => {
      closeDialog();
      setFeedback({
        kind: 'success',
        message: `تم استيراد بيانات "${report.sourceTenant.businessName || report.sourceTenant.slug}" (${report.rows} سجل). سيتم تسجيل الخروج الآن، ادخل بحسابات المنشأة المستوردة.`,
      });
      window.setTimeout(() => window.location.reload(), 3000);
    },
    onError: (error) => {
      const payload = errorPayload(error);
      if (payload.code === 'TENANT_PICK_REQUIRED' && payload.tenants) {
        setTenantOptions(payload.tenants);
        return;
      }
      if (payload.code === 'BACKUP_PASSPHRASE') setNeedsPassphrase(true);
      setFeedback({ kind: 'error', message: payload.message });
    },
  });

  function closeDialog() {
    setFile(null);
    setPassphrase('');
    setNeedsPassphrase(false);
    setTenantOptions(null);
    setPick('');
    setConfirmation('');
    if (fileInput.current) fileInput.current.value = '';
  }

  if (!canManage) return null;

  const dialogOpen = Boolean(file);
  const canSubmit = Boolean(file) && confirmation.trim() === CONFIRMATION && (!tenantOptions || Boolean(pick)) && !importMutation.isPending;

  return (
    <>
      <QueryCard
        className="settings-admin-card"
        title="نقل البيانات بين السحابة ونسخة الديسكتوب"
        actions={<span className="nav-pill">{isDesktop ? 'نسخة الديسكتوب' : 'النسخة السحابية'}</span>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>
            {isDesktop
              ? 'استورد بيانات منشأتك من السحابة لتعمل على هذا الجهاز بدون إنترنت، ثم صدّرها عند العودة لترفعها للسحابة كما هي. كل سجل ينتقل برقمه الأصلي فتبقى الفواتير والقيود والأرصدة مترابطة.'
              : 'صدّر بيانات منشأتك كاملة لتشغيلها على نسخة الديسكتوب عند انقطاع الإنترنت أو توقف الخادم، ثم استوردها هنا عند العودة. كل سجل ينتقل برقمه الأصلي فتبقى الفواتير والقيود والأرصدة مترابطة.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <strong style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 800 }}>تصدير بيانات المنشأة</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                ملف واحد (.zsbak) فيه كل بيانات المنشأة: الأصناف والفواتير والقيود والعملاء والموظفين والمستخدمين.
              </span>
              <Button type="button" onClick={() => { setFeedback(null); exportMutation.mutate(); }} disabled={exportMutation.isPending}
                style={{ background: '#170e5e', color: '#ffffff', fontWeight: 700, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <DownloadIcon size={16} />
                {exportMutation.isPending ? 'جاري التجهيز...' : 'تنزيل حزمة البيانات'}
              </Button>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #fecdd3', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <strong style={{ fontSize: '0.9rem', color: '#991b1b', fontWeight: 800 }}>استيراد بيانات منشأة</strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                يقبل حزمة منشأة (.zsbak) أو نسخة الخادم الليلية (.zip / .zip.enc) ويختار منها المنشأة. <strong>يستبدل كل بيانات هذه المنشأة الحالية.</strong>
              </span>
              <input ref={fileInput} type="file" accept=".zsbak,.zip,.enc" style={{ display: 'none' }}
                onChange={(event) => { setFeedback(null); setFile(event.target.files?.[0] ?? null); }} />
              <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={importMutation.isPending}
                style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#be123c', border: '1px solid #fecdd3' }}>
                <UploadIcon size={16} />
                اختيار ملف للاستيراد
              </Button>
            </div>
          </div>

          {feedback && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
              background: feedback.kind === 'success' ? '#ecfdf5' : '#fef2f2',
              color: feedback.kind === 'success' ? '#047857' : '#b91c1c',
              border: feedback.kind === 'success' ? '1px solid #a7f3d0' : '1px solid #fca5a5',
            }}>
              {feedback.message}
            </div>
          )}
        </div>
      </QueryCard>

      <StandardDialog
        open={dialogOpen}
        onClose={() => { if (!importMutation.isPending) closeDialog(); }}
        title="تأكيد استيراد بيانات منشأة"
        subtitle={file?.name}
        maxWidth="520px"
        loading={importMutation.isPending}
        loadingText="جاري الاستيراد والتحقق من سلامة البيانات..."
        footerActions={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog} disabled={importMutation.isPending}>إلغاء</Button>
            <Button type="button" onClick={() => { setFeedback(null); importMutation.mutate(); }} disabled={!canSubmit}
              style={{ background: '#be123c', color: '#ffffff', fontWeight: 700 }}>
              استبدال البيانات بالملف
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 14px', fontSize: '0.8rem', color: '#7f1d1d', lineHeight: 1.6 }}>
            كل بيانات هذه المنشأة الحالية ستُستبدل بمحتوى الملف، وسيتم تسجيل خروج كل المستخدمين. لو ظهرت أي مشكلة في سلامة البيانات يُلغى الاستيراد بالكامل ولا يتغير شيء.
          </div>

          {tenantOptions && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                الملف فيه أكثر من منشأة: اختر المنشأة المطلوبة
              </label>
              <CustomSelect
                value={pick}
                onChange={setPick}
                placeholder="اختر المنشأة"
                options={tenantOptions.map((t) => ({ value: t.slug, label: t.businessName || t.slug, hint: `${t.slug} · ${t.rows} سجل` }))}
              />
            </div>
          )}

          {(needsPassphrase || /\.enc$/i.test(file?.name || '')) && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                كلمة سر النسخ الاحتياطي
              </label>
              <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} autoComplete="off"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', direction: 'ltr' }} />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              للتأكيد اكتب: <span style={{ direction: 'ltr', display: 'inline-block', fontFamily: 'monospace' }}>{CONFIRMATION}</span>
            </label>
            <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', direction: 'ltr' }} />
          </div>

          {feedback?.kind === 'error' && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
              {feedback.message}
            </div>
          )}
        </div>
      </StandardDialog>
    </>
  );
}
