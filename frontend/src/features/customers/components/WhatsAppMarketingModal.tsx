import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
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
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const tenant = useAuthStore((state) => state.tenant);
  const businessName = tenant?.businessName || (isEn ? 'our store' : 'متجرنا');

  const getDefaultTemplate = (english?: boolean) =>
    english
      ? `Dear {name}, we really miss you at ${businessName}! We'd love to offer you an exclusive 10% discount on your next purchase. Looking forward to welcoming you anytime!`
      : `أهلاً بحضرتك يا {name}، بنفتقدك جداً في ${businessName}! حبينا نهديك خصم خاص 10% على مشترياتك القادمة، منتظرين تشرفنا في أي وقت!`;

  const [days, setDays] = useState(30);
  const [template, setTemplate] = useState(() => getDefaultTemplate(isEn));
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (open) {
      setTemplate(getDefaultTemplate(isEn));
    }
  }, [open, isEn, businessName]);

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
      title={t('customers.whats_app_marketing_modal.s0', "حملات الواتساب وإعادة استهداف العملاء المنقطعين")}
      subtitle={t('customers.whats_app_marketing_modal.s1', "تحديد العملاء الذين لم يشتروا منذ فترة، وإرسال عروض ترويجية مخصصة لإعادتهم للشراء")}
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
            <span>{copiedAll ? t('customers.whats_app_marketing_modal.s2', "تم نسخ جميع الأرقام بنجاح!") : t('customers.whats_app_marketing_modal.s3', "نسخ أرقام الهواتف للحملات")}</span>
          </Button>

          <StandardDialogFooter
            onCancel={onClose}
            cancelText={t('customers.whats_app_marketing_modal.s4', "إغلاق")}
          />
        </div>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} dir={isEn ? 'ltr' : 'rtl'}>
        
        {/* Section 1: Days Filter */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Filter size={15} />
            <span>{t('customers.whats_app_marketing_modal.s5', "تصفية العملاء المنقطعين منذ:")}</span>
          </div>

          {[
            { label: t('customers.whats_app_marketing_modal.s6', "15 يوماً"), val: 15 },
            { label: t('customers.whats_app_marketing_modal.s7', "30 يوماً (شهر)"), val: 30 },
            { label: t('customers.whats_app_marketing_modal.s8', "60 يوماً (شهرين)"), val: 60 },
            { label: t('customers.whats_app_marketing_modal.s9', "90 يوماً (3 أشهر)"), val: 90 },
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
            <span>{t('customers.whats_app_marketing_modal.s10', "العدد المستهدف:")} {customers.length} {t('customers.whats_app_marketing_modal.s11', "عميل")}</span>
          </span>
        </div>

        {/* Section 2: Template Box */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: 700, color: '#170e5e' }}>
              <AppIcons.FileText size={15} />
              <span>{t('customers.whats_app_marketing_modal.s12', "نص رسالة العرض الترويجي (تتغير تلقائياً باسم كل عميل):")}</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{t('customers.whats_app_marketing_modal.s13', "استخدم")} {'{name}'} {t('customers.whats_app_marketing_modal.s14', "لوضع اسم العميل تلقائياً")}</span>
          </div>
          <textarea
            rows={2}
            value={template}
            dir={isEn ? 'ltr' : 'rtl'}
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
            <span>{t('customers.whats_app_marketing_modal.s15', "قائمة العملاء المستهدفين للإرسال المباشر")}</span>
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>{t('customers.whats_app_marketing_modal.s16', "جاري جلب العملاء المستهدفين...")}</div>
            ) : customers.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#166534', fontWeight: 700, fontSize: '0.84rem' }}>
                {t('customers.whats_app_marketing_modal.s17', "ممتاز! لا يوجد عملاء منقطعون عن الشراء خلال هذه الفترة.")}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: isEn ? 'left' : 'right', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>{t('customers.whats_app_marketing_modal.s18', "اسم العميل")}</th>
                    <th style={{ padding: '8px 12px' }}>{t('customers.whats_app_marketing_modal.s19', "رقم الهاتف")}</th>
                    <th style={{ padding: '8px 12px' }}>{t('customers.whats_app_marketing_modal.s20', "آخر عملية شراء")}</th>
                    <th style={{ padding: '8px 12px' }}>{t('customers.whats_app_marketing_modal.s21', "نقاط الولاء")}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>{t('customers.whats_app_marketing_modal.s22', "إجراء المراسلة")}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{c.name}</td>
                      <td style={{ padding: '8px 12px', color: '#64748b', direction: 'ltr', textAlign: isEn ? 'left' : 'right' }}>{c.phone || t('customers.whats_app_marketing_modal.s23', "بدون هاتف")}</td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>
                        {c.lastSaleAt ? new Date(c.lastSaleAt).toLocaleDateString(isEn ? 'en-US' : 'ar-EG') : t('customers.whats_app_marketing_modal.s24', "لم يشترِ بعد")}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem' }}>
                          {c.loyaltyPoints} {t('customers.whats_app_marketing_modal.s25', "نقطة")}
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
                            <span>{t('customers.whats_app_marketing_modal.s26', "إرسال عبر واتساب")}</span>
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>{t('customers.whats_app_marketing_modal.s27', "لا يوجد رقم")}</span>
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
