import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
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
    <DialogShell open={open} onClose={onClose} ariaLabel="حملات الواتساب وإعادة استهداف العملاء" width="850px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px' }} dir="rtl">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
              حملات الواتساب وإعادة استهداف العملاء المنقطعين
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              تحديد العملاء الذين لم يشتروا منذ فترة، وإرسال عروض ترويجية مخصصة لإعادتهم للشراء.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        {/* Days Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>تصفية العملاء المنقطعين منذ:</span>
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
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: days === d.val ? '#166534' : '#f1f5f9',
                color: days === d.val ? '#ffffff' : '#334155',
              }}
            >
              {d.label}
            </button>
          ))}

          <span style={{ marginInlineStart: 'auto', fontSize: '13px', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '4px 10px', borderRadius: '6px' }}>
            العدد المستهدف: {customers.length} عميل
          </span>
        </div>

        {/* Message Template Box */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
              نص رسالة العرض الترويجي (تتغير تلقائياً باسم كل عميل):
            </label>
            <span style={{ fontSize: '11px', color: '#64748b' }}>استخدم {'{name}'} لوضع اسم العميل تلقائياً</span>
          </div>
          <textarea
            rows={2}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Customer List */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', maxHeight: '360px', overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جاري جلب العملاء المستهدفين...</div>
          ) : customers.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#166534', fontWeight: 700 }}>
              ممتاز! لا يوجد عملاء منقطعون عن الشراء خلال هذه الفترة.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
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
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{c.phone || 'بدون هاتف'}</td>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>
                      {c.lastSaleAt ? new Date(c.lastSaleAt).toLocaleDateString('ar-EG') : 'لم يشترِ بعد'}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ background: '#fdf2f8', color: '#be185d', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px' }}>
                        ⭐ {c.loyaltyPoints}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {c.phone ? (
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(c.phone, c.name)}
                          style={{
                            background: '#22c55e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          إرسال واتساب
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>لا يوجد رقم</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <Button variant="secondary" onClick={handleCopyAllPhones} disabled={customers.length === 0}>
            {copiedAll ? '✓ تم نسخ جميع الأرقام!' : 'نسخ أرقام الهواتف للحملات'}
          </Button>

          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
