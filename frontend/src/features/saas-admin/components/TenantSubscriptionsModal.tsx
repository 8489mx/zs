import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { formatDate } from '@/lib/format';
import { saasAdminApi, SaasTenantRow } from '../api/saas-admin.api';

interface TenantSubscriptionsModalProps {
  tenant: SaasTenantRow;
  onClose: () => void;
  onRenew: (tenant: SaasTenantRow) => void;
  onRecordPayment: (tenant: SaasTenantRow) => void;
}

export function TenantSubscriptionsModal({
  tenant,
  onClose,
  onRenew,
  onRecordPayment,
}: TenantSubscriptionsModalProps) {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'payments'>('subscriptions');
  const [printingItem, setPrintingItem] = useState<{
    type: 'subscription' | 'payment';
    data: any;
  } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saas-tenant-subscriptions', tenant.id],
    queryFn: () => saasAdminApi.getSubscriptions(tenant.id),
  });

  const subscriptions = data?.subscriptions || [];
  const payments = data?.payments || [];

  const handlePrintReceipt = (item: any, type: 'subscription' | 'payment') => {
    setPrintingItem({ type, data: item });
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="820px"
      ariaLabel="سجل الاشتراكات والمدفوعات"
    >
      <div className="dialog-card" dir="rtl" style={{ padding: '22px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '1px solid #f1f5f9',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(30, 27, 75, 0.2)',
            }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                سجل الاشتراكات والمدفوعات
              </h3>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                المنشأة: <strong style={{ color: '#0f172a' }}>{tenant.businessName || tenant.slug}</strong> • المعرف: <span className="tenant-slug-badge" style={{ margin: 0 }}>{tenant.slug}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onRecordPayment(tenant)}
              style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>تسجيل دفعة</span>
            </button>
            <button
              type="button"
              className="button"
              onClick={() => onRenew(tenant)}
              style={{ fontSize: '12px', padding: '6px 14px', background: '#0f172a', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 800 }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
              <span>تجديد الاشتراك</span>
            </button>
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
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '6px',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '8px',
          width: 'fit-content',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            style={{
              border: 'none',
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'subscriptions' ? '#ffffff' : 'transparent',
              color: activeTab === 'subscriptions' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'subscriptions' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            سجل فترات الاشتراك ({subscriptions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            style={{
              border: 'none',
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'payments' ? '#ffffff' : 'transparent',
              color: activeTab === 'payments' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'payments' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            سجل المدفوعات والإيصالات ({payments.length})
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
            <div style={{ display: 'inline-block', width: '26px', height: '26px', border: '3px solid #e2e8f0', borderTopColor: '#312e81', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '10px' }} />
            <div>جاري تحميل سجل الاشتراكات والمدفوعات...</div>
          </div>
        ) : activeTab === 'subscriptions' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {subscriptions.length === 0 ? (
              <div style={{ padding: '36px 20px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#334155', marginBottom: '4px' }}>لا توجد اشتراكات مسجلة بعد</strong>
                  <span style={{ fontSize: '12px' }}>يمكنك تفعيل أول اشتراك أو تجديد النسخة مباشرة من الزر بالأسفل.</span>
                </div>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => onRenew(tenant)}
                  style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px' }}
                >
                  + تفعيل أو تجديد الاشتراك الآن
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                      <th style={{ padding: '10px 12px' }}>الباقة</th>
                      <th style={{ padding: '10px 12px' }}>تاريخ البدء</th>
                      <th style={{ padding: '10px 12px' }}>تاريخ الانتهاء</th>
                      <th style={{ padding: '10px 12px' }}>المدة</th>
                      <th style={{ padding: '10px 12px' }}>الحالة</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub: any, idx: number) => {
                      const isExpired = sub.status === 'expired' || (sub.ends_at && new Date(sub.ends_at) < new Date());
                      const isActive = sub.status === 'active' && !isExpired;

                      return (
                        <tr key={sub.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: isActive ? '#f0fdf4' : '#ffffff' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>
                            {sub.plan_name || sub.plan_code || 'باقة مخصصة'}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            <bdi dir="ltr">{sub.starts_at ? formatDate(sub.starts_at) : '-'}</bdi>
                          </td>
                          <td style={{ padding: '10px 12px', color: isExpired ? '#dc2626' : '#15803d', fontWeight: 700 }}>
                            <bdi dir="ltr">{sub.ends_at ? formatDate(sub.ends_at) : 'مدى الحياة'}</bdi>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            {sub.billing_period_months ? `${sub.billing_period_months} شهر` : '-'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: isActive ? '#dcfce7' : '#fee2e2',
                              color: isActive ? '#166534' : '#991b1b',
                            }}>
                              {isActive ? 'ساري نشط' : 'منتهي'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handlePrintReceipt(sub, 'subscription')}
                              style={{
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#1e293b',
                                padding: '4px 10px',
                                borderRadius: '5px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 6 2 18 2 18 9"/>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                                <rect x="6" y="14" width="12" height="8"/>
                              </svg>
                              <span>إيصال اشتراك</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {payments.length === 0 ? (
              <div style={{ padding: '36px 20px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#334155', marginBottom: '4px' }}>لا توجد مدفوعات مسجلة حتى الآن</strong>
                  <span style={{ fontSize: '12px' }}>يمكنك تسجيل دفعة سداد جديدة لهذه النسخة في أي وقت.</span>
                </div>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => onRecordPayment(tenant)}
                  style={{ fontSize: '12px', fontWeight: 700, marginTop: '4px' }}
                >
                  + تسجيل دفعة جديدة
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                      <th style={{ padding: '10px 12px' }}>المبلغ</th>
                      <th style={{ padding: '10px 12px' }}>طريقة الدفع</th>
                      <th style={{ padding: '10px 12px' }}>تاريخ السداد</th>
                      <th style={{ padding: '10px 12px' }}>رقم المرجع / الإيصال</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>طباعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((pay: any, idx: number) => (
                      <tr key={pay.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: '#15803d', fontSize: '13px' }}>
                          {pay.amount} {pay.currency || 'EGP'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>
                          {pay.method === 'cash' ? 'نقدي' : pay.method === 'transfer' ? 'تحويل بنكي / محفظة' : pay.method === 'card' ? 'فيزا / بطاقة' : (pay.method || 'يدوي')}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>
                          <bdi dir="ltr">{pay.paid_at ? formatDate(pay.paid_at) : '-'}</bdi>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569', fontFamily: 'monospace' }}>
                          {pay.reference || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(pay, 'payment')}
                            style={{
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#1e293b',
                              padding: '4px 10px',
                              borderRadius: '5px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 6 2 18 2 18 9"/>
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                              <rect x="6" y="14" width="12" height="8"/>
                            </svg>
                            <span>طباعة إيصال سداد</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Printable Receipt Template (Hidden on Screen, Visible on Print) */}
        {printingItem && (
          <div className="print-only" style={{ display: 'none' }} id="saas-subscription-print-receipt">
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #saas-subscription-print-receipt, #saas-subscription-print-receipt * { visibility: visible !important; }
                #saas-subscription-print-receipt {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  display: block !important;
                  padding: 24px !important;
                  font-family: Cairo, Tahoma, sans-serif !important;
                  color: #000000 !important;
                }
              }
            `}</style>
            <div style={{ border: '2px solid #0f172a', borderRadius: '12px', padding: '24px', maxWidth: '650px', margin: '0 auto' }} dir="rtl">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>منظومة Z-Systems السحابية</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>إيصال استلام اشتراك رسمي - SaaS Subscription Receipt</p>
                </div>
                <div style={{ textAlign: 'left', fontSize: '12px', color: '#475569' }}>
                  <div>التاريخ: <bdi dir="ltr">{formatDate(new Date().toISOString())}</bdi></div>
                  <div>المعرف السحابي: <strong>{tenant.slug}</strong></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>اسم المنشأة / النشاط:</span>
                  <strong style={{ fontSize: '15px' }}>{tenant.businessName || tenant.slug}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>اسم المالك / المسؤول:</span>
                  <strong style={{ fontSize: '15px' }}>{tenant.ownerName}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>رقم الهاتف:</span>
                  <strong style={{ fontSize: '13px', direction: 'ltr' }}>{tenant.ownerPhone || '-'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>نوع النشاط:</span>
                  <strong style={{ fontSize: '13px' }}>{tenant.activityType || 'تجارة وإدارة أعمال'}</strong>
                </div>
              </div>

              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>تفاصيل المعاملة والاشتراك</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13.5px' }}>
                  {printingItem.type === 'subscription' ? (
                    <>
                      <div>الباقة: <strong>{printingItem.data.plan_name || tenant.planName || 'باقة مخصصة'}</strong></div>
                      <div>المدة: <strong>{printingItem.data.billing_period_months ? `${printingItem.data.billing_period_months} شهر` : '-'}</strong></div>
                      <div>تاريخ البدء: <bdi dir="ltr">{printingItem.data.starts_at ? formatDate(printingItem.data.starts_at) : '-'}</bdi></div>
                      <div>تاريخ الانتهاء: <bdi dir="ltr">{printingItem.data.ends_at ? formatDate(printingItem.data.ends_at) : 'مدى الحياة'}</bdi></div>
                    </>
                  ) : (
                    <>
                      <div>المبلغ المسدد: <strong style={{ color: '#15803d', fontSize: '16px' }}>{printingItem.data.amount} {printingItem.data.currency || 'EGP'}</strong></div>
                      <div>طريقة الدفع: <strong>{printingItem.data.method === 'cash' ? 'نقدي' : printingItem.data.method === 'transfer' ? 'تحويل بنكي / محفظة' : 'فيزا'}</strong></div>
                      <div>تاريخ السداد: <bdi dir="ltr">{printingItem.data.paid_at ? formatDate(printingItem.data.paid_at) : '-'}</bdi></div>
                      <div>رقم المرجع: <strong>{printingItem.data.reference || '—'}</strong></div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  * هذا الإيصال صادر إلكترونياً من إدارة منصة Z-Systems السحابية لإدارة الأعمال.
                </div>
                <div style={{ textAlign: 'center', width: '160px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '24px' }}>توقيع وخاتم المنصة</div>
                  <div style={{ borderBottom: '1px solid #000' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => refetch()}
            style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            <span>تحديث البيانات</span>
          </button>
          <button
            type="button"
            className="button"
            style={{ background: '#0f172a', color: '#ffffff', padding: '6px 18px', fontWeight: 700, borderRadius: '7px' }}
            onClick={onClose}
          >
            إغلاق
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
