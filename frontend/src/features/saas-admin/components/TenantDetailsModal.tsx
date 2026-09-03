import { useEffect, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { saasAdminApi, SaasTenantRow, TenantTimelineEvent } from '../api/saas-admin.api';
import { formatDate } from '@/lib/format';

interface TenantDetailsModalProps {
  tenantId: string | null;
  onClose: () => void;
  onOpenActionHub?: (tenant: SaasTenantRow) => void;
}

export function TenantDetailsModal({ tenantId, onClose, onOpenActionHub }: TenantDetailsModalProps) {
  const [tenant, setTenant] = useState<SaasTenantRow | null>(null);
  const [events, setEvents] = useState<TenantTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isPlatform =
    tenant?.isPlatform === true ||
    tenant?.id === 'default' ||
    tenant?.slug === 'default' ||
    tenantId === 'default';

  useEffect(() => {
    if (!tenantId) return;
    let mounted = true;
    setLoading(true);
    setError('');
    
    Promise.all([
      saasAdminApi.getTenantById(tenantId),
      saasAdminApi.getTenantTimeline(tenantId)
    ]).then(([tenantRes, timelineRes]) => {
      if (mounted) {
        setTenant(tenantRes.tenant);
        setEvents(timelineRes.events || []);
        setLoading(false);
      }
    }).catch((err) => {
      console.error(err);
      if (mounted) {
        setError('حدث خطأ أثناء جلب تفاصيل النسخة');
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [tenantId]);

  const copyText = (key: string, text: string) => {
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const getEventBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('دخول') || act.includes('login')) return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    if (act.includes('اشتراك') || act.includes('تجديد') || act.includes('renew') || act.includes('دفع') || act.includes('payment')) return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    if (act.includes('ترقية') || act.includes('plan')) return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
    if (act.includes('ايقاف') || act.includes('تعطيل') || act.includes('suspend') || act.includes('قفل')) return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
    return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
  };

  return (
    <DialogShell open={Boolean(tenantId)} onClose={onClose} width="780px" ariaLabel="تفاصيل النسخة وسجل النشاط">
      <div className="dialog-card" dir="rtl" style={{ padding: '22px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(30, 27, 75, 0.2)',
            }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  {tenant?.businessName || tenant?.slug || 'تفاصيل النسخة'}
                </h3>
                {isPlatform ? (
                  <span style={{ fontSize: '11px', background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '2px 10px', borderRadius: '9999px', fontWeight: 800 }}>
                    النسخة الأم المركزية (محمية)
                  </span>
                ) : tenant ? (
                  <span className={`tenant-status-pill ${tenant.status === 'active' ? 'active' : tenant.status === 'trial' ? 'trial' : 'suspended'}`} style={{ fontSize: '11px' }}>
                    {tenant.status === 'active' ? 'مفعلة' : tenant.status === 'trial' ? 'تجريبية' : tenant.status}
                  </span>
                ) : null}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                {isPlatform ? 'مراجعة بيانات نسخة النظام الأساسي وسجل العمليات والأحداث المركزية.' : 'مراجعة بيانات المنشأة والمالك وتاريخ الاشتراكات والعمليات.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={onClose}
            title="إغلاق"
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#312e81', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
            <div>جاري تحميل تفاصيل النسخة وسجل الأحداث...</div>
          </div>
        ) : error ? (
          <div className="warning-box">{error}</div>
        ) : tenant ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. قسم الكروت المنظمة (معلومات المنشأة + الاشتراك) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              {/* كارت 1: بيانات المنشأة والمالك */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0', marginBottom: '12px' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#312e81" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>بيانات المنشأة والمالك</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>اسم المنشأة:</span>
                    <strong style={{ color: '#0f172a' }}>{tenant.businessName || tenant.slug}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>المعرف (Slug):</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="tenant-slug-badge" style={{ margin: 0 }}>{tenant.slug}</span>
                      <button
                        type="button"
                        onClick={() => copyText('slug', tenant.slug)}
                        style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: '11px', padding: '1px 4px', fontWeight: 700 }}
                      >
                        {copiedKey === 'slug' ? '✓ تم' : 'نسخ'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>اسم المالك:</span>
                    <strong style={{ color: '#0f172a' }}>{tenant.ownerName || 'المسؤول'}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>اسم الدخول (Username):</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <code style={{ fontFamily: 'monospace', color: '#170e5e', fontWeight: 800, background: '#f1f5f9', padding: '2px 8px', borderRadius: '5px', border: '1px solid #e2e8f0', direction: 'ltr' }}>
                        {tenant.ownerUsername || '-'}
                      </code>
                      {tenant.ownerUsername && (
                        <button
                          type="button"
                          onClick={() => copyText('username', tenant.ownerUsername || '')}
                          style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: '11px', padding: '1px 4px', fontWeight: 700 }}
                        >
                          {copiedKey === 'username' ? '✓ تم' : 'نسخ'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>رقم الهاتف:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ direction: 'ltr', color: '#0f172a' }}>{tenant.ownerPhone || '-'}</strong>
                      {tenant.ownerPhone && (
                        <a
                          href={`https://wa.me/${tenant.ownerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}
                          title="مراسلة عبر واتساب"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>البريد الإلكتروني:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ direction: 'ltr', color: '#334155', fontSize: '11.5px' }}>{tenant.ownerEmail || '-'}</span>
                      {tenant.ownerEmail && (
                        <button
                          type="button"
                          onClick={() => copyText('email', tenant.ownerEmail || '')}
                          style={{ border: 'none', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: '11px', padding: '1px 4px', fontWeight: 700 }}
                        >
                          {copiedKey === 'email' ? '✓ تم' : 'نسخ'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>تاريخ الإنشاء:</span>
                    <span style={{ color: '#475569', fontSize: '11.5px' }}>{tenant.createdAt ? formatDate(tenant.createdAt) : '-'}</span>
                  </div>
                </div>
              </div>

              {/* كارت 2: تفاصيل الاشتراك والتشغيل */}
              <div style={{ background: isPlatform ? '#faf5ff' : '#f8fafc', border: `1px solid ${isPlatform ? '#e9d5ff' : '#e2e8f0'}`, borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: `1px solid ${isPlatform ? '#e9d5ff' : '#e2e8f0'}`, marginBottom: '12px' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={isPlatform ? '#7c3aed' : '#059669'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                    {isPlatform ? 'ترخيص المنظومة وحالة التشغيل' : 'الاشتراك وحالة التشغيل'}
                  </strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>الباقة الحالية:</span>
                    {isPlatform ? (
                      <span className="tenant-plan-badge" style={{ margin: 0, background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd', fontWeight: 800, fontSize: '11.5px' }}>
                        مالك المنظومة (كامل الصلاحيات والأنظمة)
                      </span>
                    ) : (
                      <span className="tenant-plan-badge" style={{ margin: 0 }}>{tenant.planName || 'بدون باقة'}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>نهاية الصلاحية:</span>
                    {isPlatform ? (
                      <strong style={{ color: '#059669', fontWeight: 800, fontSize: '12.5px' }}>
                        دائمة مدى الحياة (Lifetime ♾️)
                      </strong>
                    ) : (
                      <strong style={{ color: '#0f172a' }}>
                        {tenant.subscriptionEndDate ? formatDate(tenant.subscriptionEndDate) : tenant.trialEndsAt ? formatDate(tenant.trialEndsAt) : '-'}
                      </strong>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>الأيام المتبقية:</span>
                    {isPlatform ? (
                      <span style={{ fontWeight: 800, color: '#059669', fontSize: '12.5px' }}>
                        غير محدودة بأجل ♾️
                      </span>
                    ) : (
                      <span style={{ fontWeight: 700, color: (tenant.trialDaysRemaining ?? 0) > 0 ? '#15803d' : '#b91c1c' }}>
                        {tenant.trialDaysRemaining != null ? `${tenant.trialDaysRemaining} يوم` : '-'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>آخر تسجيل دخول:</span>
                    <span style={{ color: tenant.lastLoginAt ? '#059669' : '#94a3b8', fontWeight: 600, fontSize: '11.5px' }}>
                      {tenant.lastLoginAt ? formatDate(tenant.lastLoginAt) : 'لم يسجل دخول بعد'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>آخر نشاط (Last Seen):</span>
                    <span style={{ color: '#475569', fontSize: '11.5px' }}>{tenant.lastSeenAt ? formatDate(tenant.lastSeenAt) : '-'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>حالة الحساب:</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: tenant.ownerLocked ? '#b91c1c' : '#15803d' }}>
                      {tenant.ownerLocked ? 'مقفل (محاولات خاطئة)' : 'طبيعي (نشط)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. قسم سجل النشاط والعمليات (Activity Feed) */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                    سجل العمليات والأحداث
                  </h4>
                </div>
                <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  {events.length} حدث مسجل
                </span>
              </div>

              {events.length === 0 ? (
                <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  لا توجد أحداث أو عمليات مسجلة لهذه النسخة حتى الآن.
                </div>
              ) : (
                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
                  {events.map((ev) => {
                    const badge = getEventBadge(ev.action || '');
                    return (
                      <div 
                        key={ev.id} 
                        style={{ 
                          padding: '10px 14px', 
                          background: '#f8fafc', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            padding: '2px 8px',
                            borderRadius: '5px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                          }}>
                            {ev.action}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                            {formatDate(ev.createdAt)}
                          </span>
                        </div>
                        {ev.details && (
                          <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                            {ev.details}
                          </div>
                        )}
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                          بواسطة: <strong style={{ color: '#64748b' }}>{ev.actorName || 'النظام'}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              {onOpenActionHub ? (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    onClose();
                    onOpenActionHub(tenant);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700 }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  <span>مركز الإجراءات الكاملة</span>
                </button>
              ) : <div />}

              <button
                type="button"
                className="button"
                style={{ background: '#0f172a', color: '#ffffff', padding: '7px 20px', fontWeight: 800, borderRadius: '8px' }}
                onClick={onClose}
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}
