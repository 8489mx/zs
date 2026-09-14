import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { customersApi } from '@/shared/api/customers.api';
import { useAuthStore } from '@/stores/auth-store';

interface WhatsAppMarketingModalProps {
  open: boolean;
  onClose: () => void;
}

export function WhatsAppMarketingModal({ open, onClose }: WhatsAppMarketingModalProps) {
  const tenant = useAuthStore((state) => state.tenant);
  const businessName = tenant?.businessName || 'متجرنا';
  const [days, setDays] = useState(30);
  const [template, setTemplate] = useState(
    `أهلاً بحضرتك يا {name}، بنفتقدك جداً في ${businessName}! حبينا نهديك خصم خاص 10% على مشترياتك القادمة، منتظرين تشرفنا في أي وقت!`
  );
  const [copiedAll, setCopiedAll] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['inactive-customers-marketing', days],
    queryFn: () => customersApi.getInactiveMarketing(days),
    enabled: open,
  });

  const customers = data?.customers || [];

  const handleSendWhatsApp = (phone: string, name: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const target = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;
    const msg = template.replace('{name}', name);
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyAllPhones = () => {
    const phones = customers.map((c) => c.phone).filter(Boolean).join('\n');
    navigator.clipboard.writeText(phones).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    });
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="حملات الواتساب وإعادة استهداف العملاء المنقطعين"
      subtitle="تحديد العملاء الذين لم يشتروا منذ فترة، وإرسال عروض ترويجية مخصصة لإعادتهم للشراء"
      width="min(880px, 95vw)"
      minHeight="auto"
      footerActions={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Button
            variant="secondary"
            onClick={handleCopyAllPhones}
            disabled={customers.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}
          >
            {copiedAll ? <AppIcons.Check size={14} color="#16a34a" /> : <AppIcons.Copy size={14} />}
            <span>{copiedAll ? 'تم نسخ جميع الأرقام بنجاح!' : 'نسخ أرقام الهواتف للحملات'}</span>
          </Button>

          <StandardDialogFooter
            onCancel={onClose}
            cancelText="إغلاق"
          />
        </div>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} dir="rtl">
        
        {/* Section 1: Days Filter */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Filter size={15} />
            <span>تصفية العملاء المنقطعين منذ:</span>
          </div>

          {[
            { label: '15 يوماً', val: 15 },
            { label: '30 يوماً (شهر)', val: 30 },
            { label: '60 يوماً (شهرين)', val: 60 },
            { label: '90 يوماً (3 أشهر)', val: 90 },
          ].map((d) => (
            <button
              key={d.val}
              type="button"
              onClick={() => setDays(d.val)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: days === d.val ? '#166534' : '#cbd5e1',
                cursor: 'pointer',
                background: days === d.val ? '#166534' : '#ffffff',
                color: days === d.val ? '#ffffff' : '#334155',
                transition: 'all 0.15s',
              }}
            >
              {d.label}
            </button>
          ))}

          <span style={{
            marginInlineStart: 'auto',
            fontSize: '0.8125rem',
            fontWeight: 800,
            color: '#166534',
            background: '#dcfce7',
            border: '1px solid #bbf7d0',
            padding: '4px 10px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <AppIcons.Users size={14} />
            <span>العدد المستهدف: {customers.length} عميل</span>
          </span>
        </div>

        {/* Section 2: Template Box */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: 700, color: '#170e5e' }}>
              <AppIcons.FileText size={15} />
              <span>نص رسالة العرض الترويجي (تتغير تلقائياً باسم كل عميل):</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>استخدم {'{name}'} لوضع اسم العميل تلقائياً</span>
          </div>
          <textarea
            rows={2}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              boxSizing: 'border-box',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Section 3: Customer List */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
            <AppIcons.Users size={14} />
            <span>قائمة العملاء المستهدفين للإرسال المباشر</span>
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>جاري جلب العملاء المستهدفين...</div>
            ) : customers.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#166534', fontWeight: 700, fontSize: '0.84rem' }}>
                ممتاز! لا يوجد عملاء منقطعون عن الشراء خلال هذه الفترة.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>اسم العميل</th>
                    <th style={{ padding: '8px 12px' }}>رقم الهاتف</th>
                    <th style={{ padding: '8px 12px' }}>آخر عملية شراء</th>
                    <th style={{ padding: '8px 12px' }}>نقاط الولاء</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>إجراء المراسلة</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{c.name}</td>
                      <td style={{ padding: '8px 12px', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>{c.phone || 'بدون هاتف'}</td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>
                        {c.lastSaleAt ? new Date(c.lastSaleAt).toLocaleDateString('ar-EG') : 'لم يشترِ بعد'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem' }}>
                          {c.loyaltyPoints} نقطة
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {c.phone ? (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(c.phone, c.name)}
                            style={{
                              background: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 12px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <AppIcons.Send size={12} />
                            <span>إرسال عبر واتساب</span>
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>لا يوجد رقم</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </StandardDialog>
  );
}
