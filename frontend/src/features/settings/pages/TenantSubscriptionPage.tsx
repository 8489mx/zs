import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { tenantSubscriptionApi, TenantSubscriptionData } from '../api/tenant-subscription.api';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';

export function TenantSubscriptionPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<{ id: number; name: string; price: number; currency: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'xpay' | 'paymob' | 'instapay' | 'vodafone_cash' | 'bank_transfer' | 'cash'>('xpay');
  const [notes, setNotes] = useState('');
  const [requestSuccessMessage, setRequestSuccessMessage] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tenant-my-subscription'],
    queryFn: () => tenantSubscriptionApi.getMySubscription(),
  });

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
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        <p>تعذر تحميل بيانات الاشتراك.</p>
        <Button variant="secondary" onClick={() => refetch()} style={{ marginTop: '10px' }}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const { tenant, subscription, usage, statusMeta, availablePlans, payments } = data;
  const isTrial = tenant.status === 'trial';
  const planName = subscription?.planName || (isTrial ? 'الفترة التجريبية المجانية' : 'خطة مخصصة');
  const daysLeft = statusMeta.daysRemaining ?? 0;

  const usersLimit = usage.users.max;
  const usersPercent = usersLimit ? Math.min(100, Math.round((usage.users.current / usersLimit) * 100)) : null;

  const branchesLimit = usage.branches.max;
  const branchesPercent = branchesLimit ? Math.min(100, Math.round((usage.branches.current / branchesLimit) * 100)) : null;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }} dir="rtl">
      
      {/* 1. Request Success Notification Banner */}
      {requestSuccessMessage && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#065f46', fontWeight: 700 }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <span>{requestSuccessMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setRequestSuccessMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 800, fontSize: '14px' }}
          >
            إغلاق ✕
          </button>
        </div>
      )}

      {/* 2. Hero Card: Current Subscription Status */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', padding: '28px', color: '#ffffff', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', padding: '3px 10px', borderRadius: '20px', fontWeight: 700, letterSpacing: '0.5px' }}>
                {isTrial ? 'فترة تجريبية نشطة' : 'اشتراك رسمي مفعّل'}
              </span>
              <span style={{ fontSize: '12px', background: '#3b82f6', color: '#ffffff', padding: '3px 10px', borderRadius: '20px', fontWeight: 800 }}>
                نسخة سحابية
              </span>
            </div>

            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#ffffff' }}>
              {planName}
            </h2>
            
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
              المنشأة: <strong style={{ color: '#f8fafc' }}>{tenant.businessName}</strong> ({tenant.slug})
            </p>
          </div>

          {/* Countdown & Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: daysLeft > 5 ? '#34d399' : daysLeft > 0 ? '#fbbf24' : '#f87171', lineHeight: 1 }}>
                {daysLeft}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>
                {daysLeft > 0 ? 'يوم متبقي' : 'منتهي'}
              </div>
            </div>

            <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.15)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                تاريخ التجديد: <strong>{subscription?.endsAt ? new Date(subscription.endsAt).toLocaleDateString('ar-EG') : tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString('ar-EG') : 'غير محدد'}</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  const targetPlan = availablePlans[0] || { id: 1, name: 'الباقة الاحترافية', price: 7500, currency: 'EGP' };
                  setSelectedPlanForUpgrade(targetPlan);
                }}
                style={{ background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2563eb')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#3b82f6')}
              >
                <span>تجديد / ترقية الباقة</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Resource Usage & Quotas */}
      <div>
        <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>استهلاك الموارد والمحددات لباقاتك</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Users Quota */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>المستخدمين النشطين</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
              {usage.users.current} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>/ {usersLimit ? `${usersLimit} مسموح` : 'غير محدود'}</span>
            </div>
            {usersPercent !== null && (
              <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${usersPercent}%`, height: '100%', background: usersPercent > 85 ? '#ef4444' : '#3b82f6', transition: 'width 0.3s' }} />
              </div>
            )}
          </div>

          {/* Branches Quota */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>الفروع المفتوحة</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
              {usage.branches.current} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>/ {branchesLimit ? `${branchesLimit} مسموح` : 'غير محدود'}</span>
            </div>
            {branchesPercent !== null && (
              <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${branchesPercent}%`, height: '100%', background: branchesPercent > 85 ? '#ef4444' : '#10b981', transition: 'width 0.3s' }} />
              </div>
            )}
          </div>

          {/* Warehouses Count */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>المخازن ومواقع التخزين</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
              {usage.locations.current} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>موقع تخزين</span>
            </div>
          </div>

          {/* Total Invoices */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>إجمالي الفواتير الصادرة</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
              {usage.sales.current.toLocaleString('ar-EG')} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>فاتورة</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Upgrade / Available Plans Section */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
              باقات الاشتراك والترقية السحابية
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              اختر الخطة المناسبة لحجم نشاطك وتمتع بتحديثات سحابية مستمرة ودعم فني متواصل
            </p>
          </div>

          {/* Monthly / Annual Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: !isAnnual ? '#ffffff' : 'transparent',
                color: !isAnnual ? '#0f172a' : '#64748b',
                boxShadow: !isAnnual ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              دفع شهري
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                background: isAnnual ? '#0f172a' : 'transparent',
                color: isAnnual ? '#ffffff' : '#64748b',
                boxShadow: isAnnual ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>دفع سنوي</span>
              <span style={{ fontSize: '10px', background: '#10b981', color: '#ffffff', padding: '1px 6px', borderRadius: '10px' }}>
                وفّر شهرين
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* 1. Starter Plan */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fafafa', position: 'relative' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>الباقة الأساسية</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '8px 0 4px' }}>
                {isAnnual ? '3,500' : '350'} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>جنيه / {isAnnual ? 'سنة' : 'شهر'}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>مناسبة للمحلات الفردية والأنشطة الصغيرة</p>
              
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                <div>✓ نقطة بيع وكاشير سريع (POS)</div>
                <div>✓ حتى <strong>فرع واحد</strong> و <strong>2 مستخدمين</strong></div>
                <div>✓ إدارة المخزون والمشتريات</div>
                <div>✓ فواتير وتقارير يومية</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPlanForUpgrade({ id: 1, name: 'الباقة الأساسية', price: isAnnual ? 3500 : 350, currency: 'EGP' })}
              style={{ marginTop: '20px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              اختيار الأساسية
            </button>
          </div>

          {/* 2. Professional Plan (Featured) */}
          <div style={{ border: '2px solid #3b82f6', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff', position: 'relative', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.1)' }}>
            <div style={{ position: 'absolute', top: '-12px', right: '20px', background: '#3b82f6', color: '#ffffff', fontSize: '11px', fontWeight: 900, padding: '2px 10px', borderRadius: '20px' }}>
              الأكثر طلباً
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>الباقة الاحترافية (Pro)</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '8px 0 4px' }}>
                {isAnnual ? '7,500' : '750'} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>جنيه / {isAnnual ? 'سنة' : 'شهر'}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>للشركات المتوسطة وسلاسل الفروع وتجار الجملة</p>
              
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                <div>✓ <strong>كل ميزات الأساسية</strong></div>
                <div>✓ حتى <strong>3 فروع</strong> و <strong>10 مستخدمين</strong></div>
                <div>✓ الحسابات العامة وقيود اليومية وشجرة الحسابات</div>
                <div>✓ الفاتورة الضريبية وإرسال فواتير عبر واتساب</div>
                <div>✓ شؤون الموظفين والمرتبات المتقدمة</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPlanForUpgrade({ id: 2, name: 'الباقة الاحترافية', price: isAnnual ? 7500 : 750, currency: 'EGP' })}
              style={{ marginTop: '20px', padding: '10px', borderRadius: '8px', border: 'none', background: '#0f172a', color: '#ffffff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              ترقية للاحترافية الآن
            </button>
          </div>

          {/* 3. Enterprise Plan */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fafafa', position: 'relative' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>باقة المؤسسات والتصنيع</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '8px 0 4px' }}>
                {isAnnual ? '15,000' : '1,500'} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>جنيه / {isAnnual ? 'سنة' : 'شهر'}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>للمصانع والشركات الكبرى ذات خطوط الإنتاج</p>
              
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                <div>✓ <strong>كل ميزات الاحترافية</strong></div>
                <div>✓ موديول <strong>التصنيع وتكاليف خطوط الإنتاج الكاملة</strong></div>
                <div>✓ <strong>فروع ومستخدمين غير محدودين</strong></div>
                <div>✓ دعم فني وتدريب مباشر</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPlanForUpgrade({ id: 3, name: 'باقة المؤسسات', price: isAnnual ? 15000 : 1500, currency: 'EGP' })}
              style={{ marginTop: '20px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 800, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              اختيار المؤسسات
            </button>
          </div>

        </div>
      </div>

      {/* 5. Billing & Invoices History */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>سجل المدفوعات وإيصالات السداد</span>
        </h3>

        {payments.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>
            لا توجد إيصالات سداد مسجلة حتى الآن.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', textAlign: 'center' }}>
                  <th style={{ padding: '10px', fontWeight: 800 }}>رقم الإيصال</th>
                  <th style={{ padding: '10px', fontWeight: 800 }}>الباقة</th>
                  <th style={{ padding: '10px', fontWeight: 800 }}>المبلغ المسدد</th>
                  <th style={{ padding: '10px', fontWeight: 800 }}>طريقة الدفع</th>
                  <th style={{ padding: '10px', fontWeight: 800 }}>تاريخ السداد</th>
                  <th style={{ padding: '10px', fontWeight: 800 }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700 }}>#{p.id}</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{p.planName || 'تجديد اشتراك'}</td>
                    <td style={{ padding: '12px', fontWeight: 800, color: '#059669' }}>
                      {Number(p.amount).toLocaleString('ar-EG')} {p.currency}
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>{p.method}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(p)}
                        style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#0f172a' }}
                      >
                        طباعة إيصال
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Upgrade / Renewal Modal with XPay & Online Checkout */}
      {selectedPlanForUpgrade && (
        <DialogShell
          open={Boolean(selectedPlanForUpgrade)}
          onClose={() => setSelectedPlanForUpgrade(null)}
          ariaLabel={`ترقية / تجديد: ${selectedPlanForUpgrade.name}`}
          width="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '16px 20px' }} dir="rtl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                ترقية / تجديد: {selectedPlanForUpgrade.name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPlanForUpgrade(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{selectedPlanForUpgrade.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>المدة: {isAnnual ? 'سنة واحدة (12 شهراً)' : 'شهر واحد'}</div>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#2563eb' }}>
                {selectedPlanForUpgrade.price.toLocaleString('ar-EG')} {selectedPlanForUpgrade.currency}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                اختر طريقة السداد (دفع آلي وتفعيل فوري):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                
                {/* 1. XPay (Featured) */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('xpay')}
                  style={{
                    border: paymentMethod === 'xpay' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: paymentMethod === 'xpay' ? '#eff6ff' : '#ffffff',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#0f172a' }}>بوابة XPay الإلكترونية</span>
                    <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px' }}>آلي فوري</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                    فيزا / ماستركارد / ميزة / محافظ / تقسيط
                  </span>
                </button>

                {/* 2. Paymob */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('paymob')}
                  style={{
                    border: paymentMethod === 'paymob' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: paymentMethod === 'paymob' ? '#eff6ff' : '#ffffff',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#0f172a' }}>بوابة Paymob</span>
                    <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>أونلاين</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                    فودافون كاش / بطاقات بنكية
                  </span>
                </button>

                {/* 3. InstaPay */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('instapay')}
                  style={{
                    border: paymentMethod === 'instapay' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: paymentMethod === 'instapay' ? '#eff6ff' : '#ffffff',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'right',
                  }}
                >
                  إنستاباي InstaPay (تحويل فوري)
                </button>

                {/* 4. Bank Transfer */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  style={{
                    border: paymentMethod === 'bank_transfer' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: paymentMethod === 'bank_transfer' ? '#eff6ff' : '#ffffff',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'right',
                  }}
                >
                  تحويل بنكي مباشر
                </button>
              </div>
            </div>

            {/* If offline method selected, show note field */}
            {paymentMethod !== 'xpay' && paymentMethod !== 'paymob' && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  ملاحظات أو رقم المرجع / الحوالة (اختياري):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: تم التحويل من حساب رقم 010xxxxxx"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="secondary" onClick={() => setSelectedPlanForUpgrade(null)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                disabled={requestMutation.isPending || onlinePaymentMutation.isPending}
                onClick={handleConfirmAction}
              >
                {requestMutation.isPending || onlinePaymentMutation.isPending
                  ? 'جاري المعالجة...'
                  : paymentMethod === 'xpay' || paymentMethod === 'paymob'
                    ? 'الانتقال للدفع الإلكتروني والتفعيل الآلي'
                    : 'تأكيد طلب الترقية / التجديد'}
              </Button>
            </div>
          </div>
        </DialogShell>
      )}

    </div>
  );
}
