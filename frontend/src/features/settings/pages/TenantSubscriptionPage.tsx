import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { tenantSubscriptionApi, TenantSubscriptionData } from '../api/tenant-subscription.api';
import { Button } from '@/shared/ui/button';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { CurrentSubscriptionHeroCard } from '../components/subscription/CurrentSubscriptionHeroCard';
import { SubscriptionPlansCards } from '../components/subscription/SubscriptionPlansCards';
import { DetailedPlanFeaturesMatrix } from '../components/subscription/DetailedPlanFeaturesMatrix';
import { UpgradeRenewalModal } from '../components/subscription/UpgradeRenewalModal';
import { SubscriptionPaymentsTable } from '../components/subscription/SubscriptionPaymentsTable';

export function TenantSubscriptionPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  // لا منتقي عملات: البلد يُشتق من سجل المنشأة في الخادم لا من اختيار العميل (البند C8).
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<{ id: number; name: string; price: number; currency: string; levelId: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'xpay' | 'paymob' | 'instapay' | 'vodafone_cash' | 'bank_transfer' | 'cash'>('xpay');
  const [notes, setNotes] = useState('');
  const [requestSuccessMessage, setRequestSuccessMessage] = useState<string | null>(null);

  // التسعير المعتمد: مستويات نطاق المنشأة بأسعار بلدها، من `pricing-catalog.json`.
  const { data: pricing } = useQuery({
    queryKey: ['tenant-resolved-pricing'],
    queryFn: () => tenantSubscriptionApi.getPricing(),
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tenant-my-subscription'],
    queryFn: () => tenantSubscriptionApi.getMySubscription(),
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('payment_success=1')) {
      setRequestSuccessMessage('تم سداد الاشتراك وتفعيل الباقة بنجاح! شكراً لاشتراكك في Z-Systems.');
      refetch();
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [refetch]);

  const requestMutation = useMutation({
    mutationFn: (payload: { planId: number; billingPeriodMonths: number; paymentMethod: string; notes: string }) =>
      tenantSubscriptionApi.requestRenewal(payload),
    onSuccess: (res) => {
      setRequestSuccessMessage(res.message || 'تم إرسال طلب الترقية بنجاح!');
      setSelectedPlanForUpgrade(null);
      setNotes('');
    },
    onError: (err: any) => {
      alert(err.message || 'فشل إرسال طلب الترقية');
    },
  });

  const onlinePaymentMutation = useMutation({
    mutationFn: (payload: { planId: number; billingPeriodMonths: number; gateway: 'xpay' | 'paymob' | 'stripe'; redirectUrl?: string }) =>
      tenantSubscriptionApi.initiateOnlinePayment(payload),
    onSuccess: (res) => {
      if (res.paymentUrl) {
        window.open(res.paymentUrl, '_blank', 'noopener,noreferrer');
        setRequestSuccessMessage(
          `تم فتح صفحة الدفع الإلكتروني عبر بوابة ${res.gateway.toUpperCase()}. بعد إتمام الدفع بنجاح، سيتم تفعيل باقتك تلقائياً وبدون أي تدخل.`
        );
        setSelectedPlanForUpgrade(null);
      }
    },
    onError: (err: any) => {
      alert(err.message || 'فشل تجهيز بوابة الدفع');
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <p>جاري تحميل تفاصيل الاشتراك والباقة...</p>
      </div>
    );
  }

  if (isError || !data) {
    const errorMsg = (error as any)?.message || 'تعذر تحميل بيانات الاشتراك.';
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        <p style={{ fontWeight: 700, margin: '0 0 4px' }}>{errorMsg}</p>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px' }}>
          يرجى إعادة المحاولة، أو التواصل مع إدارة النظام في حال استمرار المشكلة.
        </p>
        <Button variant="secondary" onClick={() => refetch()} style={{ marginTop: '4px' }}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const { tenant, subscription, usage, statusMeta, availablePlans, payments } = data;
  const isTrial = tenant.status === 'trial';
  const planName = subscription?.planName || (isTrial ? 'الفترة التجريبية المجانية' : 'خطة مخصصة');

  /*
   * ربط مستوى الكتالوج بصف الباقة في `saas_plans` — الصف يحمل الهوية التي تشير
   * إليها الاشتراكات، والسعر يأتي من الكتالوج وحده (البند C9). غياب الصف يعني
   * «تواصل معنا» لا معرّفاً وهمياً كما كان (كانت `{ id: 1, ... }` تُمرَّر للدفع).
   */
  const LEVEL_TO_LEGACY_CODE: Record<string, string[]> = {
    L1: ['basic'],
    L2: ['pro'],
    L3: ['ultimate', 'enterprise', 'omnichannel'],
  };
  const planIdForLevel = (levelId: string): number | null => {
    const codes = LEVEL_TO_LEGACY_CODE[levelId] ?? [];
    const row = availablePlans.find((p: any) => codes.includes(String(p.code || '').toLowerCase()));
    return row ? row.id : null;
  };
  const currentLevelId = (() => {
    const code = String(subscription?.planCode || '').toLowerCase();
    if (!code) return null;
    return Object.keys(LEVEL_TO_LEGACY_CODE).find((lvl) => LEVEL_TO_LEGACY_CODE[lvl].includes(code)) ?? null;
  })();

  const handlePrintReceipt = (payment: TenantSubscriptionData['payments'][0]) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>إيصال سداد اشتراك - ${tenant.businessName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; margin: 0; }
            .receipt-box { border: 2px solid #0f172a; border-radius: 12px; padding: 25px; max-width: 600px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: 800; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .label { color: #64748b; font-size: 14px; }
            .val { font-weight: 700; font-size: 14px; }
            .amount-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; }
            .amount { font-size: 24px; font-weight: 900; color: #059669; }
            .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 25px; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <div>
                <div class="title">إيصال سداد اشتراك سحابي</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">منظومة Z-Systems السحابية</div>
              </div>
              <div style="font-family: monospace; font-size: 13px; font-weight: bold;">
                رقم الإيصال: #${payment.id}
              </div>
            </div>

            <div class="row"><span class="label">اسم المنشأة:</span><span class="val">${tenant.businessName}</span></div>
            <div class="row"><span class="label">المعرف السحابي:</span><span class="val" style="font-family: monospace;">${tenant.slug}</span></div>
            <div class="row"><span class="label">اسم المالك:</span><span class="val">${tenant.ownerName || '-'}</span></div>
            <div class="row"><span class="label">الباقة المشترك بها:</span><span class="val">${payment.planName || planName}</span></div>
            <div class="row"><span class="label">تاريخ السداد:</span><span class="val">${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span></div>
            <div class="row"><span class="label">طريقة الدفع:</span><span class="val">${payment.method}</span></div>
            ${payment.reference ? `<div class="row"><span class="label">رقم المرجع / الحوالة:</span><span class="val" style="font-family: monospace;">${payment.reference}</span></div>` : ''}

            <div class="amount-box">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">المبلغ المسدد بالكامل</div>
              <div class="amount">${Number(payment.amount).toLocaleString('ar-EG')} ${payment.currency}</div>
            </div>

            <div class="footer">
              تم إصدار هذا الإيصال إلكترونياً وهو معتمد كإثبات سداد رسمي لاشتراك النسخة السحابية.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleConfirmAction = () => {
    if (!selectedPlanForUpgrade) return;
    const duration = isAnnual ? 12 : 1;

    if (paymentMethod === 'xpay' || paymentMethod === 'paymob') {
      onlinePaymentMutation.mutate({
        planId: selectedPlanForUpgrade.id,
        billingPeriodMonths: duration,
        gateway: paymentMethod,
        redirectUrl: `${window.location.origin}/settings/subscription?payment_success=1`,
      });
    } else {
      requestMutation.mutate({
        planId: selectedPlanForUpgrade.id,
        billingPeriodMonths: duration,
        paymentMethod,
        notes,
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', paddingBottom: '40px' }} dir="rtl">
      {/* 1. Request Success Notification Banner */}
      {requestSuccessMessage && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#065f46', fontWeight: 700 }}>
            <span>{requestSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setRequestSuccessMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>إغلاق</span>
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* 2. Hero Card: Current Subscription Status */}
      <CurrentSubscriptionHeroCard
        tenant={tenant}
        subscription={subscription}
        statusMeta={statusMeta}
        usage={usage}
        onUpgradeClick={() => {
          // الترقية المقترحة = المستوى التالي في نطاق المنشأة، وسعره من الكتالوج
          const nextLevel = pricing?.levels.find((l) => l.id !== currentLevelId && planIdForLevel(l.id) != null);
          const planId = nextLevel ? planIdForLevel(nextLevel.id) : null;
          if (!nextLevel || planId == null) return;
          setSelectedPlanForUpgrade({
            id: planId,
            name: nextLevel.name,
            price: pricing?.quoteAnnuallyOnly || isAnnual ? nextLevel.annual : nextLevel.monthly,
            currency: nextLevel.currency,
            levelId: nextLevel.id,
          });
        }}
      />

      {/* 3. Pricing Matrix Controls: Billing Toggle (no currency selector — see C8) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>دورة الفوترة:</span>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: !isAnnual ? '#ffffff' : 'transparent',
                color: !isAnnual ? '#170e5e' : '#64748b',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              شهري
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: isAnnual ? '#ffffff' : 'transparent',
                color: isAnnual ? '#170e5e' : '#64748b',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>سنوي (وفر شهرين مجاناً)</span>
            </button>
          </div>
        </div>

      </div>

      {/* 4. Plan Cards Grid */}
      {pricing && (
        <SubscriptionPlansCards
          pricing={pricing}
          isAnnual={isAnnual}
          planIdForLevel={planIdForLevel}
          onSelectPlan={setSelectedPlanForUpgrade}
          currentLevelId={currentLevelId}
        />
      )}

      {/* 5. Detailed Features Matrix */}
      {pricing && <DetailedPlanFeaturesMatrix pricing={pricing} />}

      {/* 6. Payments History Table */}
      <SubscriptionPaymentsTable
        payments={payments}
        onPrintReceipt={handlePrintReceipt}
      />

      {/* 7. Upgrade / Renewal Modal */}
      <UpgradeRenewalModal
        selectedPlan={selectedPlanForUpgrade}
        onClose={() => setSelectedPlanForUpgrade(null)}
        isAnnual={isAnnual}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        notes={notes}
        onNotesChange={setNotes}
        onConfirm={handleConfirmAction}
        isSubmitting={requestMutation.isPending || onlinePaymentMutation.isPending}
      />
    </div>
  );
}
