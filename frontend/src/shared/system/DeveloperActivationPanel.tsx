import { useEffect, useState } from 'react';
import { useQuery, useMutation,  } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { DialogShell } from '@/shared/components/dialog-shell';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';

import { useAuthStore } from '@/stores/auth-store';
import { isDesktopOfflineApp } from '@/app/router/access';

const AVAILABLE_FEATURES = [
  { id: 'catalog', name: 'المنتجات والأصناف' },
  { id: 'sales', name: 'المبيعات ونقاط البيع' },
  { id: 'sessions', name: 'ورديات العمل' },
  { id: 'cashDrawer', name: 'صندوق الكاشير والخزينة' },
  { id: 'purchases', name: 'المشتريات والموردين' },
  { id: 'inventory', name: 'المخزون المتقدم والجرد' },
  { id: 'reports', name: 'التقارير المتقدمة وسجل النشاط' },
  { id: 'hr', name: 'الموارد البشرية والرواتب' },
  { id: 'manufacturing', name: 'التصنيع والإنتاج' },
  { id: 'accounting', name: 'الحسابات العامة وشجرة الحسابات' },
  { id: 'deliveryReps', name: 'مناديب التوصيل' },
  { id: 'taxIntegration', name: 'الربط الضريبي والفاتورة الإلكترونية' },
  { id: 'import', name: 'الاستيراد والحاويات والشراكة' },
  { id: 'pharmacy', name: 'الصيدليات والأدوية والروشتات' },
  { id: 'maintenance', name: 'إدارة الصيانة والأجهزة' },
  { id: 'restaurant', name: 'المطاعم والكافيهات والطاولات' },
  { id: 'clothing', name: 'المتغيرات والمقاسات والألوان' },
  { id: 'storefront', name: 'المتجر الإلكتروني وطلبات الأونلاين' },
];

export function DeveloperActivationPanel() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const isSuperAdmin = user?.role === 'super_admin';
  const [open, setOpen] = useState(false);
  
  const [masterPassword, setMasterPassword] = useState('');
  const [planId, setPlanId] = useState('');
  const [extraFeatures, setExtraFeatures] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (open && tenant) {
      setPlanId(tenant.planId || '');
      setExtraFeatures(tenant.extraFeatures || []);
      setError('');
      setSuccessMsg('');
      setMasterPassword('');
    }
  }, [open, tenant]);

  // Listen for Ctrl+Alt+Shift+L (Exclusively for Super Admin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (user?.role !== 'super_admin') return;
      if (e.ctrlKey && e.altKey && e.shiftKey && (e.code === 'KeyL' || e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user?.role]);

  const featurePlansQuery = useQuery({
    queryKey: ['saas-feature-plans'],
    queryFn: () => http<any[]>('/api/developer/feature-plans', { skipUnauthorizedInterceptor: true }),
    enabled: open,
  });
  const featurePlans = featurePlansQuery.data || [];

  const updateMutation = useMutation({
    mutationFn: () => http<{ ok: boolean }>('/api/developer/update-plan', { 
      method: 'POST', 
      skipUnauthorizedInterceptor: true,
      body: JSON.stringify({ tenantId: tenant?.id, masterPassword, planId, extraFeatures }) 
    }),
    onSuccess: async () => {
      setSuccessMsg('تم تفعيل الباقة والميزات بنجاح!');
      setError('');
      setMasterPassword('');
      // Force reload to fetch fresh tenant data from the backend
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err) => {
      setError(getFriendlyApiErrorMessage(err, 'كلمة المرور غير صحيحة أو حدث خطأ'));
      setSuccessMsg('');
    },
  });

  if (!open || !isSuperAdmin) return null;

  const toggleFeature = (featId: string) => {
    setExtraFeatures(prev => {
      const isBaseIncluded = selectedPlanFeatures.includes(featId);
      
      if (isBaseIncluded) {
        // If it's in the base plan, we negate it to exclude it
        if (prev.includes(`-${featId}`)) {
          return prev.filter(f => f !== `-${featId}`); // Re-include it
        } else {
          return [...prev, `-${featId}`]; // Exclude it
        }
      } else {
        // Normal extra feature logic
        if (prev.includes(featId)) {
          return prev.filter(f => f !== featId);
        } else {
          return [...prev, featId];
        }
      }
    });
  };

  const selectedPlanFeatures = featurePlans.find(p => String(p.id) === planId)?.features || [];

  return (
    <DialogShell open={open} onClose={() => setOpen(false)} width="min(720px, 95vw)" zIndex={9999} ariaLabel="إعدادات ترخيص النظام">
      <div style={{ padding: '24px 28px', direction: 'rtl', background: '#ffffff', borderRadius: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                إعدادات ترخيص النظام
              </h2>
              <span style={{
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '5px',
                letterSpacing: '0.04em',
              }}>
                DEV CONSOLE
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              التحكم في الباقات وتفعيل / تعطيل الوحدات والميزات للمستأجر الحالي
            </p>
            {!isDesktopOfflineApp() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                <a
                  href="/saas-admin/tenants"
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span>إدارة المشتركين والنسخ</span>
                </a>
                <a
                  href="/saas-admin/plans"
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  <span>باقات الاشتراكات والأسعار</span>
                </a>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
          >
            ✕
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: 600 }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: 700 }}>
            {successMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Master Password Input */}
          <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              كلمة مرور المطور (Master Password) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              className="secure-password-field"
              name="developer_master_pwd_nosave"
              autoComplete="off"
              autoCorrect="off" 
              autoCapitalize="off" 
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              value={masterPassword} 
              onChange={(e) => setMasterPassword(e.target.value)} 
              placeholder="أدخل كلمة المرور السرية لتأكيد التعديلات..." 
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#0f172a'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
            />
          </div>

          {/* Segmented Plan Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              باقة الترخيص الأساسية:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPlanId('')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: planId === '' ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                  background: planId === '' ? '#0f172a' : '#f8fafc',
                  color: planId === '' ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                بدون باقة (مخصص)
              </button>

              {featurePlans.map((p) => {
                const isActive = String(p.id) === planId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanId(String(p.id))}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '8px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isActive ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                      background: isActive ? '#0f172a' : '#f8fafc',
                      color: isActive ? '#ffffff' : '#334155',
                      boxShadow: isActive ? '0 2px 8px rgba(15,23,42,0.12)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Features Module Switchboard */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                تخصيص الوحدات البرمجية المتاحة:
              </span>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                اضغط على أي وحدة للتبديل بين التفعيل والإيقاف
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '8px',
              maxHeight: '36vh',
              overflowY: 'auto',
              padding: '2px',
            }}>
              {AVAILABLE_FEATURES.map((feat) => {
                const isBaseIncluded = selectedPlanFeatures.includes(feat.id);
                const isExcluded = extraFeatures.includes(`-${feat.id}`);
                const isExtraIncluded = extraFeatures.includes(feat.id);
                const isChecked = (isBaseIncluded && !isExcluded) || isExtraIncluded;
                
                return (
                  <div
                    key={feat.id}
                    onClick={() => toggleFeature(feat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 14px',
                      borderRadius: '8px',
                      border: isChecked ? '1px solid #cbd5e1' : '1px solid #f1f5f9',
                      background: isChecked ? '#ffffff' : '#fafafa',
                      boxShadow: isChecked ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      opacity: isExcluded ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = isChecked ? '#cbd5e1' : '#f1f5f9'; }}
                  >
                    {/* Feature Name & Mini Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: isChecked ? '#0f172a' : '#64748b' }}>
                        {feat.name}
                      </span>
                      {isBaseIncluded && isExcluded && (
                        <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', border: '1px solid #fee2e2' }}>
                          مستثناة
                        </span>
                      )}
                      {!isBaseIncluded && isExtraIncluded && (
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', border: '1px solid #dbeafe' }}>
                          إضافية
                        </span>
                      )}
                    </div>

                    {/* Modern iOS/macOS Style Toggle Switch */}
                    <div style={{
                      width: '32px',
                      height: '18px',
                      borderRadius: '10px',
                      background: isChecked ? '#0f172a' : '#cbd5e1',
                      position: 'relative',
                      transition: 'background 0.2s ease',
                      flexShrink: 0,
                    }}>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '2px',
                        right: isChecked ? '16px' : '2px',
                        transition: 'right 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={updateMutation.isPending}
            style={{
              padding: '8px 20px',
              fontSize: '0.84rem',
              fontWeight: 600,
              borderRadius: '7px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !masterPassword}
            style={{
              padding: '8px 24px',
              fontSize: '0.84rem',
              fontWeight: 700,
              borderRadius: '7px',
              border: '1px solid #0f172a',
              background: '#0f172a',
              color: '#ffffff',
              cursor: updateMutation.isPending || !masterPassword ? 'not-allowed' : 'pointer',
              opacity: updateMutation.isPending || !masterPassword ? 0.6 : 1,
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 6px rgba(15,23,42,0.15)',
            }}
            onMouseEnter={(e) => {
              if (!updateMutation.isPending && masterPassword) {
                e.currentTarget.style.background = '#1e293b';
              }
            }}
            onMouseLeave={(e) => {
              if (!updateMutation.isPending && masterPassword) {
                e.currentTarget.style.background = '#0f172a';
              }
            }}
          >
            {updateMutation.isPending ? 'جاري التفعيل...' : 'تفعيل الترخيص'}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
