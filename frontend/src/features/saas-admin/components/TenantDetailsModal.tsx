import { useEffect, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { saasAdminApi, SaasTenantRow, TenantTimelineEvent } from '../api/saas-admin.api';
import { formatDate } from '@/lib/format';

interface TenantDetailsModalProps {
  tenantId: string | null;
  onClose: () => void;
}

export function TenantDetailsModal({ tenantId, onClose }: TenantDetailsModalProps) {
  const [tenant, setTenant] = useState<SaasTenantRow | null>(null);
  const [events, setEvents] = useState<TenantTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        setError('حدث خطأ أثناء جلب التفاصيل');
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [tenantId]);

  return (
    <DialogShell open={Boolean(tenantId)} onClose={onClose} width="760px" ariaLabel="تفاصيل النسخة وسجل النشاط">
      <div className="dialog-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              تفاصيل النسخة وسجل النشاط
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              مراجعة بيانات المنشأة والمالك وتاريخ العمليات وتسجيلات الدخول.
            </p>
          </div>
          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={onClose}
            title="إغلاق"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            جاري تحميل تفاصيل النسخة وسجل الأحداث...
          </div>
        ) : error ? (
          <div className="warning-box">{error}</div>
        ) : tenant ? (
          <div className="stack gap-12">
            {/* 1. بطاقة ملخص بيانات النسخة */}
            <div className="saas-modal-card">
              <div className="saas-modal-card-title">
                <span>بيانات المنشأة والمالك</span>
              </div>
              <div className="saas-modal-grid-3">
                <div>
                  <span className="muted small" style={{ display: 'block', marginBottom: '2px' }}>اسم النشاط:</span>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{tenant.businessName || tenant.slug}</strong>
                </div>
                <div>
                  <span className="muted small" style={{ display: 'block', marginBottom: '2px' }}>المعرف السحابي:</span>
                  <span className="tenant-slug-badge" style={{ marginTop: 0 }}>{tenant.slug}</span>
                </div>
                <div>
                  <span className="muted small" style={{ display: 'block', marginBottom: '2px' }}>اسم المالك:</span>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{tenant.ownerName}</strong>
                </div>
                <div>
                  <span className="muted small" style={{ display: 'block', marginBottom: '2px' }}>رقم الهاتف:</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, direction: 'ltr', display: 'inline-block' }}>{tenant.ownerPhone || '-'}</span>
                </div>
                <div>
                  <span className="muted small" style={{ display: 'block', marginBottom: '2px' }}>البريد الإلكتروني:</span>
                  <span style={{ fontSize: '12px', direction: 'ltr', display: 'inline-block' }}>{tenant.ownerEmail || '-'}</span>
                </div>
                <div>
                  <span className="muted small" style={{ display: 'block', marginBottom: '2px' }}>حالة النسخة:</span>
                  <span className={`tenant-status-pill ${tenant.status === 'active' ? 'active' : tenant.status === 'trial' ? 'trial' : 'suspended'}`}>
                    {tenant.status === 'active' ? 'مفعلة' : tenant.status === 'trial' ? 'تجريبية' : tenant.status}
                  </span>
                </div>
                <div>
                  <span className="muted small" style={{ display: 'block', marginBottom: '2px' }}>الخطة الحالية:</span>
                  <span className="tenant-plan-badge">{tenant.planName || 'بدون باقة'}</span>
                </div>
                <div>
                  <span className="muted small" style={{ display: 'block', marginBottom: '2px' }}>نهاية الاشتراك:</span>
                  <strong style={{ fontSize: '12.5px' }}>{tenant.subscriptionEndDate ? formatDate(tenant.subscriptionEndDate) : '-'}</strong>
                </div>
                <div>
                  <span className="muted small" style={{ display: 'block', marginBottom: '2px' }}>تاريخ الإنشاء:</span>
                  <span style={{ fontSize: '12px' }}>{tenant.createdAt ? formatDate(tenant.createdAt) : '-'}</span>
                </div>
                <div>
                  <span className="muted small" style={{ display: 'block', marginBottom: '2px' }}>آخر تسجيل دخول:</span>
                  <span style={{ fontSize: '12px', color: tenant.lastLoginAt ? '#059669' : '#94a3b8', fontWeight: 600 }}>
                    {tenant.lastLoginAt ? formatDate(tenant.lastLoginAt) : 'لم يسجل دخول بعد'}
                  </span>
                </div>
                <div>
                  <span className="muted small" style={{ display: 'block', marginBottom: '2px' }}>آخر نشاط (Last Seen):</span>
                  <span style={{ fontSize: '12px' }}>{tenant.lastSeenAt ? formatDate(tenant.lastSeenAt) : '-'}</span>
                </div>
              </div>
            </div>

            {/* 2. سجل النشاط وأهم الأحداث */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  سجل الأحداث والعمليات ({events.length})
                </h4>
              </div>

              {events.length === 0 ? (
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  لا توجد أحداث أو عمليات مسجلة لهذه النسخة حتى الآن.
                </div>
              ) : (
                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {events.map((ev) => (
                    <div 
                      key={ev.id} 
                      style={{ 
                        padding: '10px 14px', 
                        background: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px', 
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{ev.action}</strong>
                        <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>{formatDate(ev.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px', lineHeight: 1.5 }}>
                        {ev.details}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        بواسطة: <strong>{ev.actorName || 'النظام'}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="button button-secondary" onClick={onClose}>
                إغلاق
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
}
