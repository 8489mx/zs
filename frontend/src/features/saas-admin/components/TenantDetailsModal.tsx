import { useEffect, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { FormSection } from '@/shared/components/form-section';
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
    <DialogShell open={Boolean(tenantId)} onClose={onClose} ariaLabel="تفاصيل النسخة والنشاط">
      <FormSection 
        title="تفاصيل النسخة والنشاط"
        actions={<button type="button" className="button button-secondary" onClick={onClose}>إغلاق</button>}
      >
        <div className="space-y-6">
          {loading ? (
            <div className="text-center p-4">جاري التحميل...</div>
          ) : error ? (
            <div className="warning-box">{error}</div>
          ) : tenant ? (
            <div className="stack gap-12">
              <div className="grid-2" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div>
                  <span className="muted small block">الاسم:</span>
                  <strong>{tenant.businessName || tenant.slug}</strong>
                </div>
                <div>
                  <span className="muted small block">المالك:</span>
                  <strong>{tenant.ownerName}</strong>
                </div>
                <div>
                  <span className="muted small block">رقم الهاتف:</span>
                  <strong>{tenant.ownerPhone || '-'}</strong>
                </div>
                <div>
                  <span className="muted small block">البريد الإلكتروني:</span>
                  <strong>{tenant.ownerEmail || '-'}</strong>
                </div>
                <div>
                  <span className="muted small block">حالة النسخة:</span>
                  <strong>{tenant.status}</strong>
                </div>
                <div>
                  <span className="muted small block">الخطة الحالية:</span>
                  <strong>{tenant.planName || '-'}</strong>
                </div>
                <div>
                  <span className="muted small block">نهاية الاشتراك/السماح:</span>
                  <strong>{tenant.subscriptionEndDate ? formatDate(tenant.subscriptionEndDate) : '-'}</strong>
                </div>
                <div>
                  <span className="muted small block">تاريخ الإنشاء:</span>
                  <strong>{tenant.createdAt ? formatDate(tenant.createdAt) : '-'}</strong>
                </div>
                <div>
                  <span className="muted small block">آخر تسجيل دخول:</span>
                  <strong>{tenant.lastLoginAt ? formatDate(tenant.lastLoginAt) : '-'}</strong>
                </div>
                <div>
                  <span className="muted small block">آخر نشاط (Last Seen):</span>
                  <strong>{tenant.lastSeenAt ? formatDate(tenant.lastSeenAt) : '-'}</strong>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3">سجل النشاط (أهم الأحداث)</h3>
                {events.length === 0 ? (
                  <div className="muted small">لا يوجد نشاط مسجل.</div>
                ) : (
                  <div className="space-y-4">
                    {events.map((ev) => (
                      <div key={ev.id} style={{ padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                        <div className="flex" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong style={{ color: '#0f172a' }}>{ev.action}</strong>
                          <span className="muted small" style={{ color: '#6366f1' }}>{formatDate(ev.createdAt)}</span>
                        </div>
                        <div className="small" style={{ color: '#475569', marginBottom: '0.25rem' }}>{ev.details}</div>
                        <div className="muted small">بواسطة: {ev.actorName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </FormSection>
    </DialogShell>
  );
}
