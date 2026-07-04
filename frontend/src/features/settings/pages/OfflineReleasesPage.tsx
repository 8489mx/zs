import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type OfflineRelease } from '@/features/settings/api/settings.api';
import { FormSection } from '@/shared/components/form-section';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function OfflineReleasesPage() {
  const queryClient = useQueryClient();

  // ── Form state ──────────────────────────────────────────────────────────
  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [patchUrl, setPatchUrl] = useState('');
  const [formError, setFormError] = useState('');

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: releases = [], isLoading, isError } = useQuery<OfflineRelease[]>({
    queryKey: ['offline-releases'],
    queryFn: () => settingsApi.offlineReleases.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['offline-releases'] });

  const createMutation = useMutation({
    mutationFn: settingsApi.offlineReleases.create,
    onSuccess: () => {
      invalidate();
      setVersion('');
      setChangelog('');
      setPatchUrl('');
      setFormError('');
    },
    onError: (err: any) => setFormError(err?.message || 'حدث خطأ عند الإنشاء'),
  });

  const promoteMutation = useMutation({
    mutationFn: (id: number) => settingsApi.offlineReleases.promote(id),
    onSuccess: invalidate,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => settingsApi.offlineReleases.deactivate(id),
    onSuccess: invalidate,
  });

  const activeRelease = releases.find((r) => r.isActive);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!version.trim()) return setFormError('رقم الإصدار مطلوب');
    if (!patchUrl.trim()) return setFormError('رابط ملف التحديث مطلوب');
    setFormError('');
    createMutation.mutate({ version: version.trim(), changelog: changelog.trim(), patchUrl: patchUrl.trim() });
  }

  return (
    <main className="document-prototype-column" dir="rtl">
      <div className="page-header">
        <div>
          <h1 className="page-title">إصدارات التحديث الأوفلاين</h1>
          <p className="page-description">
            أنشئ إصدارات جديدة واعتمد النسخة المستقرة التي ستصل إشعاراتها لعملاء النسخة الأوفلاين (Portable).
          </p>
        </div>
      </div>

      {/* ── Active release banner ─────────────────────────────────────── */}
      {activeRelease && (
        <div className="success-box" style={{ marginBottom: 8 }}>
          <strong>✅ النسخة المعتمدة حالياً للعملاء:</strong>{' '}
          <span style={{ fontFamily: 'monospace', fontSize: 15 }}>v{activeRelease.version}</span>
          {activeRelease.promotedBy && (
            <span className="muted"> — اعتمدها {activeRelease.promotedBy} في {formatDate(activeRelease.promotedAt)}</span>
          )}
        </div>
      )}

      {/* ── Create new release ──────────────────────────────────────────── */}
      <FormSection
        title="إنشاء إصدار جديد"
        description="أدخل رقم الإصدار ورابط ملف التحديث (patch.zip). الإصدار يُحفظ كـ Draft حتى تعتمده."
      >
        <form onSubmit={handleCreate} className="form-grid">
          <Field label="رقم الإصدار">
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.5.0"
              disabled={createMutation.isPending}
              style={{ fontFamily: 'monospace' }}
            />
            <small className="muted">مثال: 1.5.0</small>
          </Field>
          <Field label="رابط ملف التحديث (patch_url)">
            <input
              value={patchUrl}
              onChange={(e) => setPatchUrl(e.target.value)}
              placeholder="https://example.com/updates/patch-1.5.0.zip"
              disabled={createMutation.isPending}
              dir="ltr"
            />
            <small className="muted">رابط مباشر لتحميل ملف zip يحتوي backend/dist و frontend/dist</small>
          </Field>
          <Field label="ملاحظات الإصدار (Changelog)">
            <textarea
              rows={4}
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder={'- إصلاح مشكلة عرض المخزن\n- تحسين سرعة صفحة الأصناف'}
              disabled={createMutation.isPending}
            />
            <small className="muted">اختياري — ما الذي تغيّر في هذا الإصدار؟</small>
          </Field>
          {formError && <div className="warning-box" style={{ gridColumn: '1 / -1' }}>{formError}</div>}
          {createMutation.isSuccess && <div className="success-box" style={{ gridColumn: '1 / -1' }}>✅ تم إنشاء الإصدار بنجاح</div>}
          <div className="actions" style={{ gridColumn: '1 / -1' }}>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'جاري الحفظ...' : '+ إنشاء إصدار'}
            </Button>
          </div>
        </form>
      </FormSection>

      {/* ── Releases list ───────────────────────────────────────────────── */}
      <FormSection
        title="سجل الإصدارات"
        description="جميع الإصدارات المنشأة. الإصدار المفعّل هو الذي يراه عملاء الأوفلاين."
      >
        {isLoading && <div className="muted">جاري التحميل...</div>}
        {isError && <div className="warning-box">تعذر تحميل الإصدارات</div>}
        {!isLoading && !isError && releases.length === 0 && (
          <div className="muted small">لا توجد إصدارات بعد — أنشئ إصدارًا من الأعلى.</div>
        )}
        {releases.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الإصدار</th>
                  <th>الحالة</th>
                  <th>ملاحظات الإصدار</th>
                  <th>رابط الملف</th>
                  <th>تاريخ الإنشاء</th>
                  <th>اعتُمد بواسطة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((release) => (
                  <tr key={release.id} className={release.isActive ? 'table-row-selected' : undefined}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>v{release.version}</span>
                    </td>
                    <td>
                      {release.isActive ? (
                        <span className="status-badge status-posted">✅ مفعّل</span>
                      ) : (
                        <span className="status-badge status-draft">Draft</span>
                      )}
                    </td>
                    <td>
                      <span className="muted small" style={{ whiteSpace: 'pre-wrap', maxWidth: 200, display: 'block' }}>
                        {release.changelog || '—'}
                      </span>
                    </td>
                    <td>
                      {release.patchUrl ? (
                        <a href={release.patchUrl} target="_blank" rel="noreferrer" className="muted small" dir="ltr" style={{ wordBreak: 'break-all' }}>
                          {release.patchUrl.length > 40 ? release.patchUrl.slice(0, 40) + '...' : release.patchUrl}
                        </a>
                      ) : '—'}
                    </td>
                    <td><span className="muted small">{formatDate(release.createdAt)}</span></td>
                    <td>
                      <span className="muted small">
                        {release.promotedBy ? `${release.promotedBy}` : '—'}
                        {release.promotedAt ? <><br />{formatDate(release.promotedAt)}</> : null}
                      </span>
                    </td>
                    <td>
                      <div className="actions" style={{ gap: 6 }}>
                        {!release.isActive && (
                          <Button
                            variant="primary"
                            type="button"
                            disabled={promoteMutation.isPending}
                            onClick={() => promoteMutation.mutate(release.id)}
                          >
                            ✓ اعتماد كنسخة مستقرة
                          </Button>
                        )}
                        {release.isActive && (
                          <Button
                            variant="secondary"
                            type="button"
                            disabled={deactivateMutation.isPending}
                            onClick={() => deactivateMutation.mutate(release.id)}
                          >
                            إلغاء التفعيل
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(promoteMutation.isSuccess || deactivateMutation.isSuccess) && (
          <div className="success-box" style={{ marginTop: 12 }}>
            ✅ {promoteMutation.data?.message || deactivateMutation.data?.message}
          </div>
        )}
        {(promoteMutation.isError || deactivateMutation.isError) && (
          <div className="warning-box" style={{ marginTop: 12 }}>حدث خطأ — حاول مرة أخرى</div>
        )}
      </FormSection>
    </main>
  );
}
