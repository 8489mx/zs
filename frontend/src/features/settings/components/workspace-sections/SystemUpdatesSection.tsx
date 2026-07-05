import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/components/form-section';
import { useAuthStore } from '@/stores/auth-store';
import { useOfflineUpdateCheck } from '@/features/updates/hooks/useOfflineUpdateCheck';
import { DialogShell } from '@/shared/components/dialog-shell';
import { ClientPortal } from '@/shared/components/ClientPortal';


export function SystemUpdatesSection() {
  const deploymentMode = useAuthStore((state) => state.activationStatus?.deploymentMode);
  
  // Update checker hooks
  const { data: updateInfo, refetch: checkUpdates, isFetching: isCheckingUpdates, dataUpdatedAt, isLoading: isCheckingHistory } = useOfflineUpdateCheck(deploymentMode);
  
  const [updateCheckResult, setUpdateCheckResult] = useState<{ open: boolean; type: 'checking' | 'up-to-date' | 'error' | 'available'; data?: any } | null>(null);
  const [selectedReleaseIndex, setSelectedReleaseIndex] = useState<number | null>(null);

  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

  const handleCheckUpdates = () => {
    setUpdateCheckResult({ open: true, type: 'checking' });
    checkUpdates().then((res) => {
      if (res.data?.updateAvailable) {
        setUpdateCheckResult({ open: true, type: 'available', data: res.data });
      } else if (res.isError || !navigator.onLine) {
        setUpdateCheckResult({ open: true, type: 'error' });
      } else {
        setUpdateCheckResult({ open: true, type: 'up-to-date' });
      }
    });
  };

  const updateHistory = updateInfo?.releases || [];
  const selectedRelease = selectedReleaseIndex !== null && updateHistory ? updateHistory[selectedReleaseIndex] : null;

  return (
    <div className="stack gap-24">
      <FormSection title="حالة التحديث">
        <div className="stack gap-16">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div className="stack gap-4">
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>الإصدار الحالي: {currentVersion}</div>
              <div className="muted small">
                آخر فحص: {dataUpdatedAt ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(dataUpdatedAt)) : 'لم يتم الفحص بعد'}
              </div>
            </div>
            <div>
              <Button variant="primary" onClick={handleCheckUpdates} disabled={isCheckingUpdates}>
                {isCheckingUpdates ? 'جارِ الفحص...' : 'فحص التحديثات الآن'}
              </Button>
            </div>
          </div>
          
          {updateInfo?.updateAvailable && (
            <div style={{ padding: '16px', background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)', borderRadius: '8px', border: '1px solid var(--color-warning)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 8 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                يوجد تحديث متوفر ({updateInfo.latestVersion})
              </div>
              <p className="small" style={{ marginBottom: 12 }}>يرجى تحميل التحديث للحصول على أحدث الميزات وإصلاحات الأمان.</p>
              <Button variant="secondary" onClick={() => {
                if (updateInfo.patchUrl) window.open(updateInfo.patchUrl, '_blank');
              }} style={{ borderColor: 'var(--color-warning-dark)', color: 'var(--color-warning-dark)' }}>
                تحميل التحديث الآن
              </Button>
            </div>
          )}
        </div>
      </FormSection>

      {/* Temporary Debug Block */}
      <FormSection title="Debug مرئي (مؤقت)">
        <div style={{ background: '#1e1e1e', color: '#00ff00', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.85rem', direction: 'ltr', textAlign: 'left', overflowX: 'auto' }}>
          <div><strong>currentVersion:</strong> {currentVersion}</div>
          <div><strong>updateCheckUrl:</strong> {import.meta.env.VITE_OFFLINE_UPDATE_API_BASE_URL || 'https://api.karimzakaria.com'}/api/updates/check?version={currentVersion}</div>
          <div><strong>response status:</strong> {isCheckingUpdates ? 'Checking...' : (updateInfo ? 'Success' : 'Failed/Not checked')}</div>
          <div><strong>latestVersion:</strong> {updateInfo?.latestVersion || 'N/A'}</div>
          <div><strong>patchUrl:</strong> {updateInfo?.patchUrl || 'N/A'}</div>
          <div><strong>releases count:</strong> {updateHistory?.length ?? 'N/A'}</div>
          <div><strong>decision:</strong> {updateCheckResult?.type || (updateInfo?.updateAvailable ? 'update' : 'no_update')}</div>
          <hr style={{ borderColor: '#333', margin: '12px 0' }} />
          <pre style={{ margin: 0 }}>
            {JSON.stringify({ updateInfo, updateCheckResult }, null, 2)}
          </pre>
        </div>
      </FormSection>

      <FormSection title="سجل الإصدارات المتاحة">
        <div className="stack gap-12">
          {isCheckingHistory ? (
            <div className="muted small" style={{ padding: 16, textAlign: 'center' }}>جارِ تحميل سجل الإصدارات...</div>
          ) : updateHistory && updateHistory.length > 0 ? (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>رقم الإصدار</th>
                    <th>تاريخ الإصدار</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {updateHistory.map((release, idx) => (
                    <tr key={release.version}>
                      <td style={{ fontWeight: release.version === currentVersion ? 600 : 400 }}>
                        {release.version} {release.version === currentVersion && <span className="nav-pill" style={{ marginRight: 8, background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>الحالي</span>}
                      </td>
                      <td>{release.promotedAt ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(new Date(release.promotedAt)) : '-'}</td>
                      <td>
                        <Button variant="secondary" onClick={() => setSelectedReleaseIndex(idx)} style={{ padding: '4px 12px', fontSize: '0.8rem', height: 'auto' }}>تفاصيل</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="muted small" style={{ padding: 16, textAlign: 'center' }}>لا يوجد سجل إصدارات متاح.</div>
          )}
        </div>
      </FormSection>

      {/* Release Details Modal */}
      {selectedRelease && (
        <ClientPortal targetId="root">
          <DialogShell open={true} onClose={() => setSelectedReleaseIndex(null)} width="min(600px, 100%)" ariaLabel="تفاصيل الإصدار">
            <div className="dialog-header">
              <h3 className="dialog-title">تفاصيل التحديث v{selectedRelease.version}</h3>
            </div>
            <div className="dialog-body stack gap-16" style={{ padding: '24px 20px' }}>
              <div className="muted small" style={{ marginBottom: 16 }}>
                تاريخ النشر: {selectedRelease.promotedAt ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(selectedRelease.promotedAt)) : '-'}
              </div>
              {selectedRelease.changelog && (
                <div>
                  <div className="small" style={{ fontWeight: 600, marginBottom: 8 }}>ملاحظات التحديث:</div>
                  <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.9rem', whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto', lineHeight: 1.6 }}>
                    {selectedRelease.changelog}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 24, textAlign: 'left' }}>
                <Button variant="primary" onClick={() => {
                  if (selectedRelease.patchUrl) window.open(selectedRelease.patchUrl, '_blank');
                  setSelectedReleaseIndex(null);
                }}>تحميل هذا الإصدار</Button>
                <span style={{ margin: '0 8px' }}></span>
                <Button variant="secondary" onClick={() => setSelectedReleaseIndex(null)}>إغلاق</Button>
              </div>
            </div>
          </DialogShell>
        </ClientPortal>
      )}

      {/* Update Check Result Modal */}
      {updateCheckResult && updateCheckResult.open && (
        <ClientPortal targetId="root">
          <DialogShell open={true} onClose={() => setUpdateCheckResult(null)} width="min(450px, 100%)" ariaLabel="فحص التحديثات">
            <div className="dialog-header">
              <h3 className="dialog-title">فحص التحديثات</h3>
            </div>
            <div className="dialog-body stack gap-16" style={{ padding: '24px 20px', textAlign: 'center' }}>
              {updateCheckResult.type === 'checking' && (
                <div>جارِ فحص التحديثات...</div>
              )}
              {updateCheckResult.type === 'up-to-date' && (
                <div>
                  <svg style={{ width: 48, height: 48, color: '#10b981', margin: '0 auto 12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <h4 style={{ margin: 0 }}>أنت على أحدث إصدار</h4>
                  <p className="muted small" style={{ marginTop: 8 }}>لا توجد تحديثات جديدة متوفرة في الوقت الحالي.</p>
                </div>
              )}
              {updateCheckResult.type === 'error' && (
                <div>
                  <svg style={{ width: 48, height: 48, color: '#ef4444', margin: '0 auto 12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <h4 style={{ margin: 0 }}>تعذر فحص التحديثات</h4>
                  <p className="muted small" style={{ marginTop: 8 }}>تأكد من الاتصال بالإنترنت أو حاول مرة أخرى لاحقاً.</p>
                </div>
              )}
              {updateCheckResult.type === 'available' && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
                      <div className="muted small">الإصدار الحالي</div>
                      <div style={{ fontWeight: 600 }}>{currentVersion}</div>
                    </div>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    <div style={{ flex: 1, padding: 12, background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', borderRadius: 8, textAlign: 'center' }}>
                      <div className="small">الإصدار الجديد</div>
                      <div style={{ fontWeight: 600 }}>{updateCheckResult.data.latestVersion}</div>
                    </div>
                  </div>
                  {updateCheckResult.data.changelog && (
                    <div style={{ marginBottom: 20 }}>
                      <div className="small" style={{ fontWeight: 600, marginBottom: 8 }}>ملاحظات التحديث:</div>
                      <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto' }}>
                        {updateCheckResult.data.changelog}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button variant="primary" style={{ flex: 1 }} onClick={() => {
                      if (updateCheckResult.data.patchUrl) {
                        window.open(updateCheckResult.data.patchUrl, '_blank');
                      }
                      setUpdateCheckResult(null);
                    }}>تحميل التحديث</Button>
                    <Button variant="secondary" onClick={() => setUpdateCheckResult(null)}>لاحقاً</Button>
                  </div>
                </div>
              )}
              
              {updateCheckResult.type !== 'available' && (
                <div style={{ marginTop: 24 }}>
                  <Button variant="secondary" onClick={() => setUpdateCheckResult(null)}>إغلاق</Button>
                </div>
              )}
            </div>
          </DialogShell>
        </ClientPortal>
      )}
    </div>
  );
}
