import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { saasAdminApi, SaasTenantRow, TenantTimelineEvent } from '../api/saas-admin.api';
import { formatDate } from '@/lib/format';
import { XIcon } from '@/shared/components/icons/AppIcons';

interface TenantDetailsModalProps {
  tenantId: string | null;
  onClose: () => void;
  onOpenActionHub?: (tenant: SaasTenantRow) => void;
}

export function TenantDetailsModal({ tenantId, onClose, onOpenActionHub }: TenantDetailsModalProps) {
  const { t } = useTranslation();
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

  return (
    <DialogShell open={Boolean(tenantId)} onClose={onClose} width="780px" ariaLabel={t('saas_admin.tenant_details_modal.s0', "تفاصيل النسخة وسجل النشاط")}>
      <div className="dialog-card" dir="rtl" style={{ padding: '22px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#170e5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                  {tenant?.businessName || tenant?.slug || t('saas_admin.tenant_details_modal.s1', "تفاصيل النسخة")}
                </h3>
                {isPlatform ? (
                  <span style={{ fontSize: '10.5px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 8px', borderRadius: '4px', fontWeight: 800 }}>
                    {t('saas_admin.tenant_details_modal.s2', "المنصة المركزية")}
                  </span>
                ) : tenant ? (
                  <span className={`tenant-status-pill ${tenant.status === 'active' ? 'active' : tenant.status === 'trial' ? 'trial' : 'suspended'}`} style={{ fontSize: '10.5px' }}>
                    {tenant.status === 'active' ? t('saas_admin.tenant_details_modal.s3', "مفعلة") : tenant.status === 'trial' ? t('saas_admin.tenant_details_modal.s4', "تجريبية") : tenant.status}
                  </span>
                ) : null}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                {isPlatform ? t('saas_admin.tenant_details_modal.s5', "مراجعة بيانات نسخة النظام الأساسي وسجل العمليات والأحداث المركزية.") : t('saas_admin.tenant_details_modal.s6', "مراجعة بيانات المنشأة والمالك وتاريخ الاشتراكات والعمليات.")}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={onClose}
            title={t('saas_admin.tenant_details_modal.s7', "إغلاق")}
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', color: '#64748b' }}
          >
            <XIcon size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
            <div>{t('saas_admin.tenant_details_modal.s8', "جاري تحميل تفاصيل النسخة وسجل الأحداث...")}</div>
          </div>
        ) : error ? (
          <div className="warning-box">{error}</div>
        ) : tenant ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 1. قسم الكروت المنظمة (معلومات المنشأة + الاشتراك) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
              {/* كارت 1: بيانات المنشأة والمالك */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', marginBottom: '12px' }}>
                  <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{t('saas_admin.tenant_details_modal.s9', "بيانات المنشأة والمالك")}</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s10', "اسم المنشأة:")}</span>
                    <strong style={{ color: '#0f172a' }}>{tenant.businessName || tenant.slug}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s11', "المعرف (Slug):")}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'monospace', color: '#334155', direction: 'ltr', background: '#f8fafc', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                        {tenant.slug}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText('slug', tenant.slug)}
                        title="نسخ المعرف"
                        style={{ border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        {copiedKey === 'slug' ? <span style={{ color: '#166534', fontWeight: 700 }}>تم النسخ</span> : <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s14', "اسم المالك:")}</span>
                    <strong style={{ color: '#0f172a' }}>{tenant.ownerName || t('saas_admin.tenant_details_modal.s15', "المسؤول")}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s16', "اسم الدخول (Username):")}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <code style={{ fontFamily: 'monospace', color: '#170e5e', fontWeight: 700, background: '#f8fafc', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', direction: 'ltr', fontSize: '11px' }}>
                        {tenant.ownerUsername || '-'}
                      </code>
                      {tenant.ownerUsername && (
                        <button
                          type="button"
                          onClick={() => copyText('username', tenant.ownerUsername || '')}
                          title="نسخ اسم الدخول"
                          style={{ border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          {copiedKey === 'username' ? <span style={{ color: '#166534', fontWeight: 700 }}>تم النسخ</span> : <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s19', "رقم الهاتف:")}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ direction: 'ltr', color: '#0f172a' }}>{tenant.ownerPhone || '-'}</strong>
                      {tenant.ownerPhone && (
                        <a
                          href={`https://wa.me/${tenant.ownerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}
                          title={t('saas_admin.tenant_details_modal.s20', "مراسلة عبر واتساب")}
                        >
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s21', "البريد الإلكتروني:")}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ direction: 'ltr', color: '#334155', fontSize: '11.5px' }}>{tenant.ownerEmail || '-'}</span>
                      {tenant.ownerEmail && (
                        <button
                          type="button"
                          onClick={() => copyText('email', tenant.ownerEmail || '')}
                          title="نسخ البريد"
                          style={{ border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          {copiedKey === 'email' ? <span style={{ color: '#166534', fontWeight: 700 }}>تم النسخ</span> : <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s24', "تاريخ الإنشاء:")}</span>
                    <span style={{ color: '#475569', fontSize: '11.5px' }}>{tenant.createdAt ? formatDate(tenant.createdAt) : '-'}</span>
                  </div>
                </div>
              </div>

              {/* كارت 2: تفاصيل الاشتراك والتشغيل (بدون خلفية بنفسجية فاقعة) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', marginBottom: '12px' }}>
                  <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                    {isPlatform ? t('saas_admin.tenant_details_modal.s25', "ترخيص المنظومة وحالة التشغيل") : t('saas_admin.tenant_details_modal.s26', "الاشتراك وحالة التشغيل")}
                  </strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s27', "الباقة الحالية:")}</span>
                    {isPlatform ? (
                      <span style={{ margin: 0, background: '#f8fafc', color: '#170e5e', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '11px', padding: '2px 8px', borderRadius: '5px' }}>
                        {t('saas_admin.tenant_details_modal.s28', "مالك المنظومة (كامل الصلاحيات)")}
                      </span>
                    ) : (
                      <span style={{ margin: 0, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600 }}>
                        {tenant.planName || t('saas_admin.tenant_details_modal.s29', "بدون باقة")}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s30', "نهاية الصلاحية:")}</span>
                    {isPlatform ? (
                      <strong style={{ color: '#166534', fontWeight: 700, fontSize: '12px' }}>
                        {t('saas_admin.tenant_details_modal.s31', "دائمة مدى الحياة (Lifetime)")}
                      </strong>
                    ) : (
                      <strong style={{ color: '#0f172a' }}>
                        {tenant.subscriptionEndDate ? formatDate(tenant.subscriptionEndDate) : tenant.trialEndsAt ? formatDate(tenant.trialEndsAt) : '-'}
                      </strong>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s32', "الأيام المتبقية:")}</span>
                    {isPlatform ? (
                      <span style={{ fontWeight: 700, color: '#166534', fontSize: '12px' }}>
                        {t('saas_admin.tenant_details_modal.s33', "غير محدودة بأجل (مستمر)")}
                      </span>
                    ) : (
                      <span style={{ fontWeight: 700, color: (tenant.trialDaysRemaining ?? 0) > 0 ? '#166534' : '#991b1b' }}>
                        {tenant.trialDaysRemaining != null ? `${tenant.trialDaysRemaining} يوم` : '-'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s34', "آخر تسجيل دخول:")}</span>
                    <span style={{ color: tenant.lastLoginAt ? '#166534' : '#94a3b8', fontWeight: 600, fontSize: '11.5px' }}>
                      {tenant.lastLoginAt ? formatDate(tenant.lastLoginAt) : t('saas_admin.tenant_details_modal.s35', "لم يسجل دخول بعد")}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s36', "آخر نشاط (Last Seen):")}</span>
                    <span style={{ color: '#475569', fontSize: '11.5px' }}>{tenant.lastSeenAt ? formatDate(tenant.lastSeenAt) : '-'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>{t('saas_admin.tenant_details_modal.s37', "حالة الحساب:")}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: tenant.ownerLocked ? '#991b1b' : '#166534' }}>
                      {tenant.ownerLocked ? t('saas_admin.tenant_details_modal.s38', "مقفل (محاولات خاطئة)") : t('saas_admin.tenant_details_modal.s39', "طبيعي (نشط)")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. قسم سجل النشاط والعمليات (Clean Vertical Timeline) */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    {t('saas_admin.tenant_details_modal.s40', "سجل العمليات والأحداث")}
                  </h4>
                </div>
                <span style={{ fontSize: '11px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  {events.length} {t('saas_admin.tenant_details_modal.s41', "حدث مسجل")}
                </span>
              </div>

              {events.length === 0 ? (
                <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                  {t('saas_admin.tenant_details_modal.s42', "لا توجد أحداث أو عمليات مسجلة لهذه النسخة حتى الآن.")}
                </div>
              ) : (
                <div style={{ maxHeight: '240px', overflowY: 'auto', position: 'relative', paddingInlineStart: '16px', paddingRight: '4px' }}>
                  {/* خط التايم لاين الرأسي الموحد */}
                  <div style={{ position: 'absolute', top: '8px', bottom: '8px', right: '5px', width: '2px', background: '#e2e8f0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {events.map((ev) => {
                      return (
                        <div key={ev.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {/* نقطة التايم لاين */}
                          <div style={{
                            position: 'absolute',
                            right: '-15px',
                            top: '4px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#170e5e',
                            border: '2px solid #ffffff',
                            boxShadow: '0 0 0 1px #e2e8f0',
                          }} />

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                                {ev.action}
                              </span>
                              {ev.actorName && (
                                <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                                  • بواسطة {ev.actorName}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', direction: 'ltr' }}>
                              {formatDate(ev.createdAt)}
                            </span>
                          </div>

                          {ev.details && (
                            <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.45, marginTop: '1px' }}>
                              {ev.details}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    cursor: 'pointer',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  <span>{t('saas_admin.tenant_details_modal.s45', "مركز الإجراءات الكاملة")}</span>
                </button>
              ) : <div />}

              <button
                type="button"
                className="button"
                style={{
                  background: '#170e5e',
                  color: '#ffffff',
                  padding: '7px 22px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                }}
                onClick={onClose}
              >
                {t('saas_admin.tenant_details_modal.s46', "إغلاق")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}
