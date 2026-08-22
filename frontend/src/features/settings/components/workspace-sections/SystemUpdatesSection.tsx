import { useState, useRef, useEffect } from 'react';
import { resolveRequestUrl, http } from '@/lib/http';
import { Button } from '@/shared/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useOfflineUpdateCheck } from '@/shared/hooks/use-offline-update-check';
import { DialogShell } from '@/shared/components/dialog-shell';
import { ClientPortal } from '@/shared/components/ClientPortal';

export function SystemUpdatesSection() {
  const deploymentMode = useAuthStore((state) => state.activationStatus?.deploymentMode);
  const userRole = useAuthStore((state) => state.user?.role);
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';

  // Update checker hooks
  const { data: updateInfo, refetch: checkUpdates, isFetching: isCheckingUpdates, dataUpdatedAt, isLoading: isCheckingHistory } = useOfflineUpdateCheck(deploymentMode);
  
  const [updateCheckResult, setUpdateCheckResult] = useState<{ open: boolean; type: 'checking' | 'up-to-date' | 'error' | 'available'; data?: any } | null>(null);
  const [selectedReleaseIndex, setSelectedReleaseIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local ZIP & Online Update States
  const [localUpdateState, setLocalUpdateState] = useState<{ open: boolean; file: File | null; passcode: string; status: 'idle' | 'uploading' | 'error' | 'success'; error?: string }>({ open: false, file: null, passcode: '', status: 'idle' });
  const [onlineUpdatePasscode, setOnlineUpdatePasscode] = useState<string>('');
  
  // Admin Passcode Reveal State
  const [revealedPasscode, setRevealedPasscode] = useState<{ version: string; passcode: string } | null>(null);
  const [copiedPasscode, setCopiedPasscode] = useState<boolean>(false);

  // Developer Simulator State
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [simFromVersion, setSimFromVersion] = useState<string>('1.1.2');
  const [simTargetVersion, setSimTargetVersion] = useState<string>('1.1.14');
  const [simPasscode, setSimPasscode] = useState<string>('ZS-UPD-1114-E9AF-8D27');
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const staticVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.14';
  const [currentVersion, setCurrentVersion] = useState<string>(staticVersion);

  // Premium Upgrade Progress State
  const [progressInfo, setProgressInfo] = useState<{
    percent: number;
    stepTitle: string;
    stepDesc: string;
  }>({
    percent: 0,
    stepTitle: '',
    stepDesc: '',
  });

  const startProgressSequence = () => {
    setProgressInfo({
      percent: 20,
      stepTitle: 'التحقق من كود التفعيل والحزمة...',
      stepDesc: 'فحص التوقيع الرقمي ومطابقة الملفات لضمان أمان النظام',
    });

    const t1 = setTimeout(() => {
      setProgressInfo({
        percent: 45,
        stepTitle: 'إنشاء نقطة استعادة احتياطية...',
        stepDesc: 'حفظ نسخة أمان كاملة لقاعدة البيانات والملفات قبل الترقية',
      });
    }, 1000);

    const t2 = setTimeout(() => {
      setProgressInfo({
        percent: 75,
        stepTitle: 'فك الضغط واستبدال ملفات النظام...',
        stepDesc: 'تطبيق التحديثات البرمجية وترقية واجهات المستخدم',
      });
    }, 2400);

    const t3 = setTimeout(() => {
      setProgressInfo({
        percent: 92,
        stepTitle: 'مزامنة الجداول وترقية التوافق...',
        stepDesc: 'تجهيز قاعدة البيانات لبيئة العمل الجديدة',
      });
    }, 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

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
      setLocalUpdateState({ open: true, file: e.target.files[0], passcode: '', status: 'idle' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyLocalUpdate = async () => {
    if (!localUpdateState.file) return;
    setLocalUpdateState(s => ({ ...s, status: 'uploading' }));
    const cancelProgress = startProgressSequence();
    
    const formData = new FormData();
    formData.append('file', localUpdateState.file);
    if (localUpdateState.passcode) {
      formData.append('passcode', localUpdateState.passcode);
    }

    try {
      try {
        await http('/api/local-updates/apply-local-zip', {
          method: 'POST',
          body: formData,
          timeoutMs: 5 * 60 * 1000,
        });
      } catch (err: any) {
        if (err.status === 404) {
          await http('/api/updates/apply-local-zip', {
            method: 'POST',
            body: formData,
            timeoutMs: 5 * 60 * 1000,
          });
        } else {
          throw err;
        }
      }
      cancelProgress();
      setProgressInfo({
        percent: 100,
        stepTitle: 'اكتمل التثبيت بنجاح!',
        stepDesc: 'جاري تشغيل المنظومة تلقائياً بالإصدار الجديد خلال ثوانٍ...',
      });
      setLocalUpdateState(s => ({ ...s, status: 'success' }));
    } catch (e: any) {
      cancelProgress();
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

  const handleApplyOnlineUpdate = async (version: string, patchUrl: string, changelog?: string, passcode?: string) => {
    setUpdateCheckResult(null);
    setSelectedReleaseIndex(null);
    setLocalUpdateState({ open: true, file: null, passcode: '', status: 'uploading' });
    const cancelProgress = startProgressSequence();

    try {
      await http('/api/local-updates/apply', {
        method: 'POST',
        body: JSON.stringify({ version, patchUrl, changelog, passcode: passcode || onlineUpdatePasscode }),
        timeoutMs: 5 * 60 * 1000,
      });
      cancelProgress();
      setProgressInfo({
        percent: 100,
        stepTitle: 'اكتمل التثبيت بنجاح!',
        stepDesc: 'جاري تشغيل المنظومة تلقائياً بالإصدار الجديد خلال ثوانٍ...',
      });
      setLocalUpdateState(s => ({ ...s, status: 'success' }));
    } catch (e: any) {
      cancelProgress();
      setLocalUpdateState(s => ({ ...s, status: 'error', error: e.message }));
    }
  };

  const handleRevealPasscode = async (release?: any) => {
    if (!release || !release.version) return;
    if (release.passcode) {
      setRevealedPasscode({ version: release.version, passcode: release.passcode });
      return;
    }
    try {
      if (release.id) {
        const res = await http<any>(`/api/admin/offline-releases/${release.id}/passcode`);
        if (res && res.passcode) {
          setRevealedPasscode({ version: res.version || release.version, passcode: res.passcode });
          return;
        }
      }
      // Fallback fetch by version string
      const res = await http<any>(`/api/admin/offline-releases/passcode-by-version?version=${encodeURIComponent(release.version)}`);
      if (res && res.passcode) {
        setRevealedPasscode({ version: res.version || release.version, passcode: res.passcode });
        return;
      }
    } catch (e: any) {
      console.error('Failed to fetch passcode:', e);
      alert(e.message || 'تعذر جلب كود التفعيل لهذا الإصدار');
    }
  };

  const handleRunSimulation = async () => {
    setSimLoading(true);
    setSimError(null);
    setSimResult(null);
    try {
      const res = await http<any>('/api/updates/simulate', {
        method: 'POST',
        body: JSON.stringify({
          fromVersion: simFromVersion,
          targetVersion: simTargetVersion,
          passcode: simPasscode,
        }),
      });
      setSimResult(res);
    } catch (e: any) {
      setSimError(e.message || 'فشلت محاكاة التحديث');
    } finally {
      setSimLoading(false);
    }
  };

  const updateHistory = updateInfo?.releases || [];
  const selectedRelease = selectedReleaseIndex !== null && updateHistory ? updateHistory[selectedReleaseIndex] : null;

  return (
    <div className="system-updates-hub">
      <input type="file" accept=".zip" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

      <div className="system-update-hero">
        <div className="system-update-hero-content">
          <div className="system-update-hero-info">
            <div className="system-update-icon-box">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '5px', 
                  background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', 
                  color: '#065f46', 
                  border: '1px solid #a7f3d0', 
                  padding: '3px 10px', 
                  borderRadius: '16px', 
                  fontSize: '11px', 
                  fontWeight: 700 
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  تحديث سحابي مباشر متصل
                </span>
              </div>
              <div className="system-update-hero-meta">
                <div className="system-update-hero-meta-item">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  <span>آخر فحص: {dataUpdatedAt ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dataUpdatedAt)) : 'اليوم، مستقر'}</span>
                </div>
                <span>•</span>
                <div className="system-update-hero-meta-item">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
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
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span>تحديث يدوي من ملف ZIP</span>
            </button>
            <button 
              type="button" 
              className="system-update-btn-primary" 
              onClick={handleCheckUpdates} 
              disabled={isCheckingUpdates}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: isCheckingUpdates ? 'spin 1s linear infinite' : 'none' }}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
              <span>{isCheckingUpdates ? 'جارِ الفحص...' : 'فحص التحديثات الآن'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="system-update-metrics-grid">
        <div className="system-update-metric-card">
          <div className="system-update-metric-icon" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
          </div>
          <div className="system-update-metric-body">
            <span className="system-update-metric-label">الحماية والنسخ الاحتياطي</span>
            <strong className="system-update-metric-val">نسخ احتياطي تلقائي مُفعّل</strong>
            <span className="system-update-metric-desc">إنشاء نقطة استعادة آمنة لقاعدة البيانات والملفات تلقائياً قبل أي ترقية.</span>
          </div>
        </div>

        <div className="system-update-metric-card">
          <div className="system-update-metric-icon" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
          </div>
          <div className="system-update-metric-body">
            <span className="system-update-metric-label">بيئة تشغيل السيرفر</span>
            <strong className="system-update-metric-val">Node.js + PostgreSQL Engine</strong>
            <span className="system-update-metric-desc">بيئة تشغيل عالية الاستقرار تدعم التحديثات الساخنة والإقلاع الفوري.</span>
          </div>
        </div>

        <div className="system-update-metric-card">
          <div className="system-update-metric-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
          </div>
          <div className="system-update-metric-body">
            <span className="system-update-metric-label">وضع النشر والاتصال</span>
            <strong className="system-update-metric-val">{deploymentMode === 'server' ? 'سيرفر شبكي (Server Mode)' : 'مكتبي محلي (Desktop Mode)'}</strong>
            <span className="system-update-metric-desc">يدعم استلام الترقيات السحابية والتثبيت دون الحاجة لإنترنت مستمر.</span>
          </div>
        </div>
      </div>

      {updateInfo?.updateAvailable && (
        <div style={{ padding: '18px 22px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#d97706', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#92400e', marginBottom: '2px' }}>
                يتوفر إصدار جديد معتمد للنظام: <span style={{ textDecoration: 'underline' }}>v{updateInfo.latestVersion}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#b45309' }}>
                يتضمن هذا التحديث سجل تغييرات تراكمي لكافة الإصدارات السابقة وميزات تشغيلية جديدة.
              </div>
            </div>
          </div>
          <Button 
            variant="primary" 
            onClick={() => {
              setUpdateCheckResult({ open: true, type: 'available', data: updateInfo });
            }} 
            style={{ background: '#d97706', borderColor: '#b45309', color: '#ffffff', fontWeight: 800, padding: '8px 20px', borderRadius: '8px' }}
          >
            تطبيق الترقية الآن
          </Button>
        </div>
      )}

      <div className="system-releases-card">
        <div className="system-releases-header">
          <div className="system-releases-title">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            <span>سجل الإصدارات المعتمدة وقوائم التغييرات</span>
            <span className="system-releases-badge-count">{updateHistory.length} إصدارات مسجلة</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowSimulator(!showSimulator)}
              className="system-update-btn-glass"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              🧪 {showSimulator ? 'إخفاء محاكي المطور' : 'محاكي تحديثات المطور'}
            </button>
          </div>
        </div>

        <div className="system-releases-list">
          {isCheckingHistory ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
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
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      <span>تاريخ النشر: {release.promotedAt ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(new Date(release.promotedAt)) : 'مؤرشف'}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSuperAdmin && (
                    <Button 
                      variant="secondary" 
                      onClick={() => handleRevealPasscode(release)}
                      style={{ fontWeight: 700, fontSize: '12px', padding: '6px 12px', borderRadius: '8px', background: '#f8fafc' }}
                      title="عرض كود تفعيل هذا التحديث المخصص للعملاء"
                    >
                      كود التفعيل
                    </Button>
                  )}
                  <Button 
                    variant="secondary" 
                    onClick={() => setSelectedReleaseIndex(idx)}
                    style={{ fontWeight: 700, fontSize: '12px', padding: '6px 14px', borderRadius: '8px' }}
                  >
                    عرض التفاصيل وسجل التغييرات
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              لا توجد إصدارات سابقة مسجلة في هذا النشاط.
            </div>
          )}
        </div>
      </div>

      {showSimulator && (
        <div className="system-simulator-card">
          <div className="system-simulator-header">
            <div className="system-simulator-title">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
              <span>بيئة محاكاة واختبار تحديثات المطور (Developer Sandbox)</span>
            </div>
            <span className="system-simulator-badge">⚡ بيئة اختبار فورية</span>
          </div>
          
          <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6, margin: '0 0 14px 0' }}>
            تتيح لك هذه البيئة محاكاة سيناريو كامل لتحديث عميل يمتلك نسخة قديمة (مثل 1.1.2) إلى أحدث إصدار مع التحقق من كود التفعيل والـ Checksum وتطبيق المايجريشنز في ثوانٍ معدودة دون الحاجة لبناء ملف Electron EXE.
          </p>

          <div className="system-simulator-form">
            <div className="system-simulator-input-group">
              <label>إصدار العميل الحالي (المحاكى):</label>
              <input 
                type="text" 
                value={simFromVersion} 
                onChange={(e) => setSimFromVersion(e.target.value)} 
                placeholder="مثال: 1.1.2" 
              />
            </div>
            <div className="system-simulator-input-group">
              <label>الإصدار المستهدف للترقية:</label>
              <input 
                type="text" 
                value={simTargetVersion} 
                onChange={(e) => setSimTargetVersion(e.target.value)} 
                placeholder="مثال: 1.1.14" 
              />
            </div>
            <div className="system-simulator-input-group" style={{ flex: 1.5 }}>
              <label>كود التفعيل (Passcode):</label>
              <input 
                type="text" 
                value={simPasscode} 
                onChange={(e) => setSimPasscode(e.target.value)} 
                placeholder="ZS-UPD-XXXX-XXXX" 
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <Button 
                variant="primary" 
                onClick={handleRunSimulation} 
                disabled={simLoading}
                style={{ background: '#4f46e5', borderColor: '#4338ca', fontWeight: 800, padding: '9px 18px', borderRadius: '8px' }}
              >
                {simLoading ? 'جارِ المحاكاة...' : '⚡ تشغيل محاكاة التحديث'}
              </Button>
            </div>
          </div>

          {simError && (
            <div style={{ padding: '12px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '12px', fontWeight: 700, marginTop: 10 }}>
              ⚠️ {simError}
            </div>
          )}

          {simResult && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontWeight: 800, fontSize: '13px' }}>
                <span>✅ اكتملت محاكاة التحديث بنجاح ({simResult.cumulativeReleasesCount} إصدارات تراكمية مدمجة)</span>
                <span style={{ fontSize: '11px', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>v{simResult.fromVersion} ➔ v{simResult.targetVersion}</span>
              </div>

              <div className="system-simulator-steps-list">
                {simResult.steps?.map((st: any) => (
                  <div key={st.step} className="system-simulator-step completed">
                    <span style={{ fontWeight: 800, minWidth: '20px' }}>✓ {st.step}.</span>
                    <div>
                      <strong>{st.title}:</strong> <span style={{ color: '#334155' }}>{st.message}</span>
                    </div>
                  </div>
                ))}
              </div>

              {simResult.cumulativeChangelog && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>سجل التغييرات التراكمي الشامل المحسوب للعميل:</div>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto' }}>
                    {simResult.cumulativeChangelog}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 1. Admin Passcode Reveal Modal */}
      {revealedPasscode && (
        <ClientPortal targetId="root">
          <DialogShell open={true} showCloseButton={true} onClose={() => { setRevealedPasscode(null); setCopiedPasscode(false); }} width="min(460px, 100%)" ariaLabel="كود التفعيل">
            <div className="system-update-modal-header">
              <h3 className="system-update-modal-title">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="15" r="4" /><line x1="10.85" y1="12.15" x2="19" y2="4" /><line x1="18" y1="5" x2="20" y2="7" /><line x1="15" y1="8" x2="17" y2="10" /></svg>
                <span>كود تفعيل التحديث المعتمد 🔑</span>
              </h3>
            </div>
            <div className="system-update-modal-body stack gap-16" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                هذا هو كود الترخيص المشفر المخصص للإصدار <strong>v{revealedPasscode.version}</strong>. يمكنك إعطاؤه للعميل بعد التحصيل والمحاسبة ليتمكن من فك وتطبيق التحديث.
              </div>

              <div style={{ padding: '16px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px', margin: '4px 0 10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>كود الترخيص الفريد</div>
                <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 900, letterSpacing: '2px', color: '#0f172a' }}>
                  {revealedPasscode.passcode}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button 
                  variant="primary" 
                  style={{ flex: 1, fontWeight: 800 }}
                  onClick={() => {
                    navigator.clipboard.writeText(revealedPasscode.passcode);
                    setCopiedPasscode(true);
                    setTimeout(() => setCopiedPasscode(false), 2000);
                  }}
                >
                  {copiedPasscode ? '✓ تم النسخ بنجاح!' : '📋 نسخ كود التفعيل'}
                </Button>
                <Button variant="secondary" onClick={() => { setRevealedPasscode(null); setCopiedPasscode(false); }}>إغلاق</Button>
              </div>
            </div>
          </DialogShell>
        </ClientPortal>
      )}

      {/* 2. Release Details Modal */}
      {selectedRelease && (
        <ClientPortal targetId="root">
          <DialogShell open={true} showCloseButton={true} onClose={() => setSelectedReleaseIndex(null)} width="min(640px, 100%)" ariaLabel="تفاصيل الإصدار">
            <div className="system-update-modal-header">
              <h3 className="system-update-modal-title">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                <span>سجل التغييرات والميزات • الإصدار v{selectedRelease.version}</span>
              </h3>
            </div>
            <div className="system-update-modal-body stack gap-16">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>تاريخ الإصدار الرسمي:</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                  {selectedRelease.promotedAt ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(selectedRelease.promotedAt)) : 'مؤرشف'}
                </strong>
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '8px', color: '#0f172a' }}>ملاحظات وسجل التحسينات:</div>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', fontSize: '13px', whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto', lineHeight: 1.7, border: '1px solid #e2e8f0', color: '#334155' }}>
                  {selectedRelease.changelog || 'لا توجد ملاحظات مسجلة لهذا الإصدار.'}
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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

      {/* 3. Update Check Result Modal */}
      {updateCheckResult && updateCheckResult.open && (
        <ClientPortal targetId="root">
          <DialogShell open={true} showCloseButton={true} onClose={() => setUpdateCheckResult(null)} width="min(540px, 100%)" ariaLabel="فحص التحديثات">
            <div className="system-update-modal-header">
              <h3 className="system-update-modal-title">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                <span>نتيجة فحص التحديثات السحابية</span>
              </h3>
            </div>
            <div className="system-update-modal-body stack gap-16" style={{ textAlign: 'center' }}>
              {updateCheckResult.type === 'checking' && (
                <div style={{ padding: '24px 0' }}>
                  <div style={{ width: '44px', height: '44px', border: '3px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>جارِ الاتصال بسيرفر التحديثات المعتمد...</h4>
                  <p className="muted small" style={{ marginTop: 6 }}>يتم فحص وجود ترقيات جديدة وسجلات تغييرات تراكمية.</p>
                </div>
              )}
              {updateCheckResult.type === 'up-to-date' && (
                <div>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>أنت تعمل على أحدث إصدار معتمد!</h4>
                  <p className="muted small" style={{ marginTop: 6, lineHeight: 1.6 }}>
                    نظامك يعمل حالياً بالإصدار <strong>v{currentVersion}</strong> المستقر، ولم تصدر أي تحديثات لاحقة حتى اللحظة.
                  </p>
                  <div style={{ marginTop: 20 }}>
                    <Button variant="primary" onClick={() => setUpdateCheckResult(null)} style={{ minWidth: '120px' }}>تمام</Button>
                  </div>
                </div>
              )}
              {updateCheckResult.type === 'error' && (
                <div>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#991b1b' }}>تعذر الاتصال بسيرفر التحديثات</h4>
                  <p className="muted small" style={{ marginTop: 6, lineHeight: 1.6 }}>
                    يرجى التحقق من اتصال الإنترنت، أو استخدام خاصية التحديث اليدوي من ملف ZIP إذا كنت في بيئة أوفلاين.
                  </p>
                  <div style={{ marginTop: 20 }}>
                    <Button variant="secondary" onClick={() => setUpdateCheckResult(null)}>إغلاق</Button>
                  </div>
                </div>
              )}
              {updateCheckResult.type === 'available' && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1, padding: 12, background: '#f8fafc', borderRadius: 8, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div className="muted small">الإصدار الحالي</div>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginTop: 2 }}>v{currentVersion}</div>
                    </div>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: '#0f172a' }}><polyline points="15 18 9 12 15 6" /></svg>
                    <div style={{ flex: 1, padding: 12, background: '#ecfdf5', color: '#065f46', borderRadius: 8, textAlign: 'center', border: '1px solid #a7f3d0' }}>
                      <div className="small" style={{ fontWeight: 700 }}>الإصدار الجديد المتوفر</div>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: '#065f46', marginTop: 2 }}>v{updateCheckResult.data.latestVersion}</div>
                    </div>
                  </div>

                  {(updateCheckResult.data.cumulativeChangelog || updateCheckResult.data.changelog) && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="small" style={{ fontWeight: 800, marginBottom: 6, color: '#0f172a' }}>سجل التحسينات والتغييرات التراكمي:</div>
                      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: '12px', whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto', border: '1px solid #e2e8f0', lineHeight: 1.6 }}>
                        {updateCheckResult.data.cumulativeChangelog || updateCheckResult.data.changelog}
                      </div>
                    </div>
                  )}

                  <div className="system-passcode-input-box">
                    <label>كود تفعيل التحديث المعتمد (Passcode):</label>
                    <input
                      type="text"
                      className="system-passcode-field"
                      placeholder="ZS-UPD-XXXX-XXXX"
                      value={onlineUpdatePasscode}
                      onChange={(e) => setOnlineUpdatePasscode(e.target.value)}
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: 4 }}>
                      أدخل كود الترخيص الذي استلمته من إدارة النظام لبدء فك التحديث وتطبيقه.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <Button variant="primary" style={{ flex: 1, fontWeight: 800 }} onClick={() => {
                      if (updateCheckResult.data.latestVersion && updateCheckResult.data.patchUrl) {
                        handleApplyOnlineUpdate(
                          updateCheckResult.data.latestVersion, 
                          updateCheckResult.data.patchUrl, 
                          updateCheckResult.data.changelog ?? undefined,
                          onlineUpdatePasscode
                        );
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

      {/* 4. Local Update Modal */}
      {localUpdateState.open && (
        <ClientPortal targetId="root">
          <DialogShell open={true} showCloseButton={localUpdateState.status !== 'uploading'} onClose={() => localUpdateState.status !== 'uploading' && setLocalUpdateState(s => ({ ...s, open: false }))} width="min(520px, 100%)" ariaLabel="تطبيق التحديث اليدوي">
            <div className="system-update-modal-header">
              <h3 className="system-update-modal-title">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                <span>تطبيق حزمة التحديث اليدوية (.ZIP)</span>
              </h3>
            </div>
            <div className="system-update-modal-body stack gap-16" style={{ textAlign: 'center' }}>
              {localUpdateState.status === 'idle' && localUpdateState.file && (
                <>
                  <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{localUpdateState.file.name}</div>
                    <div className="muted small" style={{ marginTop: 2 }}>حجم الحزمة: {(localUpdateState.file.size / 1024 / 1024).toFixed(2)} ميجابايت</div>
                  </div>

                  <div className="system-passcode-input-box">
                    <label>كود تفعيل التحديث المعتمد (Passcode):</label>
                    <input
                      type="text"
                      className="system-passcode-field"
                      placeholder="ZS-UPD-XXXX-XXXX"
                      value={localUpdateState.passcode}
                      onChange={(e) => setLocalUpdateState(s => ({ ...s, passcode: e.target.value }))}
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: 4 }}>
                      يرجى إدخال كود الترخيص لفك تشفير وتطبيق الحزمة.
                    </div>
                  </div>

                  <div style={{ background: '#fffbeb', color: '#92400e', padding: 12, borderRadius: 8, fontSize: '12px', marginBottom: 16, border: '1px solid #fde68a', lineHeight: 1.5, textAlign: 'right' }}>
                    <strong>إجراء الأمان</strong>: سيتم أخذ نسخة احتياطية كاملة لقاعدة البيانات والملفات تلقائياً، وتطبيق الباتش وإعادة تشغيل الخادم فوراً.
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Button variant="primary" style={{ flex: 1, fontWeight: 800 }} onClick={handleApplyLocalUpdate}>تأكيد وبدء التثبيت</Button>
                    <Button variant="secondary" onClick={() => setLocalUpdateState(s => ({ ...s, open: false }))}>إلغاء</Button>
                  </div>
                </>
              )}
              {(localUpdateState.status === 'uploading' || localUpdateState.status === 'success') && (
                <div style={{
                  padding: '36px 20px',
                  background: 'linear-gradient(145deg, #170c5c 0%, #0d0638 100%)',
                  borderRadius: '16px',
                  color: '#ffffff',
                  boxShadow: '0 20px 45px rgba(15, 6, 60, 0.45)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Glowing ambient light */}
                  <div style={{
                    position: 'absolute',
                    top: '-60px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '220px',
                    height: '220px',
                    background: 'radial-gradient(circle, rgba(124, 58, 237, 0.35) 0%, rgba(0,0,0,0) 70%)',
                    pointerEvents: 'none'
                  }} />

                  {/* Pulsing Brand Icon */}
                  <div style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                    boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    {localUpdateState.status === 'success' ? (
                      <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#ffffff" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ffffff" strokeWidth="2" style={{ animation: 'spin 2s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    )}
                  </div>

                  {/* Dynamic Phase Title */}
                  <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
                    {progressInfo.stepTitle || 'جاري تطبيق الترقية البرمجية...'}
                  </h3>

                  {/* Phase Description */}
                  <p style={{ margin: '0 0 22px', fontSize: '13px', color: '#c7d2fe', lineHeight: 1.5 }}>
                    {progressInfo.stepDesc || 'يرجى الانتظار، يتم إعداد الملفات بدقة وأمان'}
                  </p>

                  {/* Progress Bar Container */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '999px',
                    height: '10px',
                    padding: '2px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    marginBottom: '10px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${progressInfo.percent}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                      boxShadow: '0 0 16px rgba(139, 92, 246, 0.8)',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>

                  {/* Percentage & Step Indicator */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#a5b4fc', fontWeight: 700, marginBottom: '20px' }}>
                    <span>التقدم العام للترقية</span>
                    <span style={{ fontSize: '14px', color: '#ffffff' }}>{progressInfo.percent}%</span>
                  </div>

                  {/* Security Reassurance Banner */}
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '12px',
                    color: '#e0e7ff',
                    lineHeight: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <span>يرجى الانتظار وعدم إغلاق البرنامج، سيتم تشغيل المنظومة تلقائياً.</span>
                  </div>
                </div>
              )}
              {localUpdateState.status === 'error' && (
                <>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#991b1b' }}>فشل تثبيت التحديث</h4>
                  <p className="muted small" style={{ marginTop: 6, lineHeight: 1.6 }}>{localUpdateState.error}</p>
                  <div style={{ marginTop: 20 }}>
                    <Button variant="secondary" onClick={() => setLocalUpdateState(s => ({ ...s, open: false }))}>إغلاق</Button>
                  </div>
                </>
              )}
            </div>
          </DialogShell>
        </ClientPortal>
      )}
    </div>
  );
}
