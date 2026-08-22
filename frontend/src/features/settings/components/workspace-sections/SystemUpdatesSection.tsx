import { useState, useRef, useEffect } from 'react';
import { resolveRequestUrl, http } from '@/lib/http';
import { Button } from '@/shared/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useOfflineUpdateCheck } from '@/shared/hooks/use-offline-update-check';
import { DialogShell } from '@/shared/components/dialog-shell';
import { ClientPortal } from '@/shared/components/ClientPortal';

export function SystemUpdatesSection() {
  const deploymentMode = useAuthStore((state) => state.activationStatus?.deploymentMode);
  
  // Update checker hooks
  const { data: updateInfo, refetch: checkUpdates, isFetching: isCheckingUpdates, dataUpdatedAt, isLoading: isCheckingHistory } = useOfflineUpdateCheck(deploymentMode);
  
  const [updateCheckResult, setUpdateCheckResult] = useState<{ open: boolean; type: 'checking' | 'up-to-date' | 'error' | 'available'; data?: any } | null>(null);
  const [selectedReleaseIndex, setSelectedReleaseIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localUpdateState, setLocalUpdateState] = useState<{ open: boolean; file: File | null; status: 'idle' | 'uploading' | 'error' | 'success'; error?: string }>({ open: false, file: null, status: 'idle' });

  const staticVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.14';
  const [currentVersion, setCurrentVersion] = useState<string>(staticVersion);

  useEffect(() => {
    fetch(resolveRequestUrl('/api/updates/version'))
      .then(res => res.json())
      .then(data => {
        if (data && data.version) {
          setCurrentVersion(data.version);
        }
      })
      .catch(err => console.error('Failed to fetch runtime version:', err));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLocalUpdateState({ open: true, file: e.target.files[0], status: 'idle' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyLocalUpdate = async () => {
    if (!localUpdateState.file) return;
    setLocalUpdateState(s => ({ ...s, status: 'uploading' }));
    
    const formData = new FormData();
    formData.append('file', localUpdateState.file);

    try {
      await http('/api/local-updates/apply-local-zip', {
        method: 'POST',
        body: formData,
        timeoutMs: 5 * 60 * 1000,
      });
      setLocalUpdateState(s => ({ ...s, status: 'success' }));
    } catch (e: any) {
      setLocalUpdateState(s => ({ ...s, status: 'error', error: e.message }));
    }
  };

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

  const handleApplyOnlineUpdate = async (version: string, patchUrl: string, changelog?: string) => {
    setUpdateCheckResult(null);
    setSelectedReleaseIndex(null);
    setLocalUpdateState({ open: true, file: null, status: 'uploading' });

    try {
      await http('/api/local-updates/apply', {
        method: 'POST',
        body: JSON.stringify({ version, patchUrl, changelog }),
        timeoutMs: 5 * 60 * 1000,
      });
      setLocalUpdateState(s => ({ ...s, status: 'success' }));
    } catch (e: any) {
      setLocalUpdateState(s => ({ ...s, status: 'error', error: e.message }));
    }
  };

  const updateHistory = updateInfo?.releases || [];
  const selectedRelease = selectedReleaseIndex !== null && updateHistory ? updateHistory[selectedReleaseIndex] : null;

  return (
    <div className="system-updates-hub">
      {/* Hidden File Input for Offline ZIP */}
      <input type="file" accept=".zip" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

      {/* 1. Hero Update Banner */}
      <div className="system-update-hero">
        <div className="system-update-hero-content">
          <div className="system-update-hero-info">
            <div className="system-update-icon-box">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div className="system-update-hero-text">
              <div className="system-update-title-row">
                <span className="system-update-hero-title">مركز إدارة وتحديثات النظام</span>
                <span className="system-update-version-chip">
                  <span className="system-update-pulse-dot" />
                  الإصدار الحالي: v{currentVersion}
                </span>
              </div>
              <div className="system-update-hero-meta">
                <div className="system-update-hero-meta-item">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  <span>آخر فحص: {dataUpdatedAt ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dataUpdatedAt)) : 'اليوم، مستقر'}</span>
                </div>
                <span>•</span>
                <div className="system-update-hero-meta-item">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <span>القناة: الإصدارات المستقرة للمؤسسات (Enterprise LTS)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="system-update-hero-actions">
            <button 
              type="button" 
              className="system-update-btn-glass" 
              onClick={() => fileInputRef.current?.click()}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span>تحديث يدوي من ملف ZIP</span>
            </button>
            <button 
              type="button" 
              className="system-update-btn-primary" 
              onClick={handleCheckUpdates} 
              disabled={isCheckingUpdates}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isCheckingUpdates ? 'spin 1s linear infinite' : 'none' }}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
              <span>{isCheckingUpdates ? 'جارِ فحص السيرفر...' : 'فحص التحديثات الآن'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. System Integrity & Safety 3-Cards Grid */}
      <div className="system-update-metrics-grid">
        <div className="system-update-metric-card">
          <div className="system-update-metric-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          <div className="system-update-metric-body">
            <span className="system-update-metric-label">الحماية والنسخ الاحتياطي</span>
            <strong className="system-update-metric-val">نسخ احتياطي تلقائي مُفعّل</strong>
            <span className="system-update-metric-desc">يتم إنشاء نقطة استعادة آمنة لقاعدة البيانات والملفات تلقائياً قبل أي ترقية.</span>
          </div>
        </div>

        <div className="system-update-metric-card">
          <div className="system-update-metric-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
          </div>
          <div className="system-update-metric-body">
            <span className="system-update-metric-label">بيئة تشغيل السيرفر</span>
            <strong className="system-update-metric-val">Node.js + PostgreSQL Engine</strong>
            <span className="system-update-metric-desc">بيئة تشغيل عالية الاستقرار تدعم التحديثات الساخنة والإقلاع الفوري.</span>
          </div>
        </div>

        <div className="system-update-metric-card">
          <div className="system-update-metric-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
          </div>
          <div className="system-update-metric-body">
            <span className="system-update-metric-label">وضع النشر والاتصال</span>
            <strong className="system-update-metric-val">{deploymentMode === 'server' ? 'سيرفر شبكي (Server Mode)' : 'مكتبي محلي (Desktop Mode)'}</strong>
            <span className="system-update-metric-desc">يدعم استلام الترقيات السحابية والتثبيت دون الحاجة لإنترنت مستمر.</span>
          </div>
        </div>
      </div>

      {/* 3. Available Update Alert (if any) */}
      {updateInfo?.updateAvailable && (
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderRadius: '14px', border: '1px solid #fde68a', boxShadow: '0 4px 16px rgba(217, 119, 6, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#d97706', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#92400e', marginBottom: '4px' }}>
                يتوفر إصدار ترقية جديد للنظام ({updateInfo.latestVersion})
              </div>
              <div style={{ fontSize: '13px', color: '#b45309' }}>
                يتضمن هذا الإصدار تحسينات أداء هامة وإصلاحات أمنية وميزات تشغيلية جديدة لنقاط البيع والمخازن.
              </div>
            </div>
          </div>
          <Button 
            variant="primary" 
            onClick={() => {
              if (updateInfo.latestVersion && updateInfo.patchUrl) {
                handleApplyOnlineUpdate(updateInfo.latestVersion, updateInfo.patchUrl, updateInfo.changelog ?? undefined);
              }
            }} 
            style={{ background: '#d97706', borderColor: '#b45309', color: '#ffffff', fontWeight: 800, padding: '10px 22px' }}
          >
            تطبيق الترقية الآن
          </Button>
        </div>
      )}

      {/* 4. Release History & Changelogs */}
      <div className="system-releases-card">
        <div className="system-releases-header">
          <div className="system-releases-title">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            <span>سجل الإصدارات المعتمدة وقوائم التغييرات</span>
            <span className="system-releases-badge-count">{updateHistory.length} إصدارات مسجلة</span>
          </div>
        </div>

        <div className="system-releases-list">
          {isCheckingHistory ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              جارِ فحص وتحديث سجل الإصدارات من السيرفر...
            </div>
          ) : updateHistory && updateHistory.length > 0 ? (
            updateHistory.map((release, idx) => (
              <div key={release.version} className="system-release-item">
                <div className="system-release-info">
                  <div className="system-release-icon-tag">
                    v{release.version.split('.')[1] || '1'}
                  </div>
                  <div className="system-release-details">
                    <div className="system-release-version-row">
                      <span className="system-release-version-num">الإصدار {release.version}</span>
                      {release.version === currentVersion ? (
                        <span className="system-release-tag-active">✓ الإصدار الحالي المستقر</span>
                      ) : (
                        <span className="system-release-tag-available">سجل معتمد</span>
                      )}
                    </div>
                    <div className="system-release-date">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      <span>تاريخ النشر: {release.promotedAt ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(new Date(release.promotedAt)) : 'مؤرشف'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <Button 
                    variant="secondary" 
                    onClick={() => setSelectedReleaseIndex(idx)}
                    style={{ fontWeight: 700, fontSize: '13px', padding: '6px 16px', borderRadius: '8px' }}
                  >
                    عرض التفاصيل وسجل التغييرات
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              لا توجد إصدارات سابقة مسجلة في هذا النشاط.
            </div>
          )}
        </div>
      </div>

      {/* Release Details Modal */}
      {selectedRelease && (
        <ClientPortal targetId="root">
          <DialogShell open={true} onClose={() => setSelectedReleaseIndex(null)} width="min(620px, 100%)" ariaLabel="تفاصيل الإصدار">
            <div className="dialog-header">
              <h3 className="dialog-title">سجل التغييرات والميزات • الإصدار v{selectedRelease.version}</h3>
            </div>
            <div className="dialog-body stack gap-16" style={{ padding: '24px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>تاريخ الإصدار الرسمي:</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                  {selectedRelease.promotedAt ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(selectedRelease.promotedAt)) : '-'}
                </strong>
              </div>

              {selectedRelease.changelog && (
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '8px', color: '#0f172a' }}>ملاحظات وسجل التحسينات:</div>
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', fontSize: '13px', whiteSpace: 'pre-wrap', maxHeight: 280, overflowY: 'auto', lineHeight: 1.7, border: '1px solid #e2e8f0', color: '#334155' }}>
                    {selectedRelease.changelog}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="secondary" onClick={() => setSelectedReleaseIndex(null)}>إغلاق</Button>
                {selectedRelease.version !== currentVersion && (
                  <Button variant="primary" onClick={() => {
                    if (selectedRelease.version && selectedRelease.patchUrl) {
                      handleApplyOnlineUpdate(selectedRelease.version, selectedRelease.patchUrl, selectedRelease.changelog ?? undefined);
                    }
                  }}>تطبيق هذا الإصدار</Button>
                )}
              </div>
            </div>
          </DialogShell>
        </ClientPortal>
      )}

      {/* Update Check Result Modal */}
      {updateCheckResult && updateCheckResult.open && (
        <ClientPortal targetId="root">
          <DialogShell open={true} onClose={() => setUpdateCheckResult(null)} width="min(480px, 100%)" ariaLabel="فحص التحديثات">
            <div className="dialog-header">
              <h3 className="dialog-title">نتيجة فحص التحديثات السحابية</h3>
            </div>
            <div className="dialog-body stack gap-16" style={{ padding: '28px 24px', textAlign: 'center' }}>
              {updateCheckResult.type === 'checking' && (
                <div style={{ padding: '24px 0' }}>
                  <div style={{ width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>جارِ الاتصال بسيرفر التحديثات المعتمد...</h4>
                  <p className="muted small" style={{ marginTop: 8 }}>يتم فحص وجود ترقيات جديدة متوافقة مع قاعدة البيانات.</p>
                </div>
              )}
              {updateCheckResult.type === 'up-to-date' && (
                <div>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>أنت تعمل على أحدث إصدار معتمد!</h4>
                  <p className="muted small" style={{ marginTop: 8, lineHeight: 1.6 }}>
                    نظامك يعمل حالياً بالإصدار <strong>v{currentVersion}</strong> المستقر، ولم تصدر أي تحديثات لاحقة حتى اللحظة.
                  </p>
                  <div style={{ marginTop: 24 }}>
                    <Button variant="primary" onClick={() => setUpdateCheckResult(null)} style={{ minWidth: '120px' }}>تمام</Button>
                  </div>
                </div>
              )}
              {updateCheckResult.type === 'error' && (
                <div>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#991b1b' }}>تعذر الاتصال بسيرفر التحديثات</h4>
                  <p className="muted small" style={{ marginTop: 8, lineHeight: 1.6 }}>
                    يرجى التحقق من اتصال الإنترنت، أو استخدام خاصية التحديث اليدوي من ملف ZIP إذا كنت في بيئة أوفلاين.
                  </p>
                  <div style={{ marginTop: 24 }}>
                    <Button variant="secondary" onClick={() => setUpdateCheckResult(null)}>إغلاق</Button>
                  </div>
                </div>
              )}
              {updateCheckResult.type === 'available' && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1, padding: 14, background: '#f8fafc', borderRadius: 10, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div className="muted small">الإصدار الحالي</div>
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a', marginTop: 4 }}>v{currentVersion}</div>
                    </div>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: '#4f46e5' }}><polyline points="15 18 9 12 15 6" /></svg>
                    <div style={{ flex: 1, padding: 14, background: '#e0e7ff', color: '#3730a3', borderRadius: 10, textAlign: 'center', border: '1px solid #c7d2fe' }}>
                      <div className="small" style={{ fontWeight: 700 }}>الإصدار الجديد المتوفر</div>
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#312e81', marginTop: 4 }}>v{updateCheckResult.data.latestVersion}</div>
                    </div>
                  </div>
                  {updateCheckResult.data.changelog && (
                    <div style={{ marginBottom: 20 }}>
                      <div className="small" style={{ fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>سجل التحسينات والتغييرات:</div>
                      <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto', border: '1px solid #e2e8f0', lineHeight: 1.6 }}>
                        {updateCheckResult.data.changelog}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button variant="primary" style={{ flex: 1 }} onClick={() => {
                      if (updateCheckResult.data.latestVersion && updateCheckResult.data.patchUrl) {
                        handleApplyOnlineUpdate(updateCheckResult.data.latestVersion, updateCheckResult.data.patchUrl, updateCheckResult.data.changelog ?? undefined);
                      }
                    }}>تطبيق الترقية الآن</Button>
                    <Button variant="secondary" onClick={() => setUpdateCheckResult(null)}>لاحقاً</Button>
                  </div>
                </div>
              )}
            </div>
          </DialogShell>
        </ClientPortal>
      )}

      {/* Local Update Modal */}
      {localUpdateState.open && (
        <ClientPortal targetId="root">
          <DialogShell open={true} onClose={() => localUpdateState.status !== 'uploading' && setLocalUpdateState(s => ({ ...s, open: false }))} width="min(480px, 100%)" ariaLabel="تطبيق التحديث اليدوي">
            <div className="dialog-header">
              <h3 className="dialog-title">تطبيق حزمة التحديث اليدوية (.ZIP)</h3>
            </div>
            <div className="dialog-body stack gap-16" style={{ padding: '28px 24px', textAlign: 'center' }}>
              {localUpdateState.status === 'idle' && localUpdateState.file && (
                <>
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>{localUpdateState.file.name}</div>
                    <div className="muted small" style={{ marginTop: 4 }}>حجم الحزمة: {(localUpdateState.file.size / 1024 / 1024).toFixed(2)} ميجابايت</div>
                  </div>
                  <div style={{ background: '#fffbeb', color: '#92400e', padding: 14, borderRadius: 10, fontSize: '13px', marginBottom: 20, border: '1px solid #fde68a', lineHeight: 1.6, textAlign: 'right' }}>
                    ⚠️ <strong>إجراء الأمان</strong>: سيتم عمل نسخة احتياطية كاملة لقاعدة البيانات والملفات تلقائياً، ثم تطبيق حزمة التحديث وإعادة تشغيل الخادم فوراً. يرجى عدم إغلاق البرنامج.
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button variant="primary" style={{ flex: 1 }} onClick={handleApplyLocalUpdate}>تأكيد وبدء التثبيت</Button>
                    <Button variant="secondary" onClick={() => setLocalUpdateState(s => ({ ...s, open: false }))}>إلغاء</Button>
                  </div>
                </>
              )}
              {localUpdateState.status === 'uploading' && (
                <div style={{ padding: '36px 0' }}>
                  <div style={{ width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  <div style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a', marginBottom: 8 }}>جاري استخراج وتطبيق الحزمة وإعادة تشغيل النظام...</div>
                  <div className="muted small" style={{ color: '#d97706' }}>برجاء الانتظار بضع ثوانٍ وعدم إغلاق النافذة...</div>
                </div>
              )}
              {localUpdateState.status === 'error' && (
                <>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#991b1b' }}>فشل تثبيت الحزمة</h4>
                  <p className="muted small" style={{ marginTop: 8 }}>{localUpdateState.error}</p>
                  <div style={{ marginTop: 24 }}>
                    <Button variant="secondary" onClick={() => setLocalUpdateState(s => ({ ...s, open: false }))}>إغلاق</Button>
                  </div>
                </>
              )}
              {localUpdateState.status === 'success' && (
                <>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>تم تحديث النظام بنجاح!</h4>
                  <p className="muted small" style={{ marginTop: 8 }}>يتم الآن إعادة تحميل الصفحة لتطبيق التغييرات الأخيرة...</p>
                </>
              )}
            </div>
          </DialogShell>
        </ClientPortal>
      )}
    </div>
  );
}
