import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';

export function StorefrontPaymentGatewaysManager() {
  const queryClient = useQueryClient();
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyXPaySuccess, setCopyXPaySuccess] = useState(false);
  const [copyTapSuccess, setCopyTapSuccess] = useState(false);
  const [copyStripeSuccess, setCopyStripeSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const settingsQuery = useQuery({
    queryKey: ['storefront-admin-settings'],
    queryFn: storefrontApi.getSettings,
  });

  const [formState, setFormState] = useState({
    onlinePaymentEnabled: false,
    onlinePaymentProvider: 'tap',
    paymobApiKey: '',
    paymobIntegrationId: '',
    paymobIframeId: '',
    paymobHmacSecret: '',
    paymobTestMode: true,
    xpayApiKey: '',
    xpayCommunityId: '',
    xpayTestMode: true,
    tapSecretKey: '',
    tapPublishableKey: '',
    tapTestMode: true,
    stripeSecretKey: '',
    stripePublishableKey: '',
    stripeWebhookSecret: '',
    stripeTestMode: true,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      const data = settingsQuery.data as any;
      setFormState({
        onlinePaymentEnabled: Boolean(data.onlinePaymentEnabled),
        onlinePaymentProvider: data.onlinePaymentProvider || 'tap',
        paymobApiKey: data.paymobApiKey || '',
        paymobIntegrationId: data.paymobIntegrationId || '',
        paymobIframeId: data.paymobIframeId || '',
        paymobHmacSecret: data.paymobHmacSecret || '',
        paymobTestMode: data.paymobTestMode !== false,
        xpayApiKey: data.xpayApiKey || '',
        xpayCommunityId: data.xpayCommunityId || '',
        xpayTestMode: data.xpayTestMode !== false,
        tapSecretKey: data.tapSecretKey || '',
        tapPublishableKey: data.tapPublishableKey || '',
        tapTestMode: data.tapTestMode !== false,
        stripeSecretKey: data.stripeSecretKey || '',
        stripePublishableKey: data.stripePublishableKey || '',
        stripeWebhookSecret: data.stripeWebhookSecret || '',
        stripeTestMode: data.stripeTestMode !== false,
      });
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: storefrontApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-settings'] });
      setSaveSuccess(true);
      setSaveError('');
      setTimeout(() => setSaveSuccess(false), 3500);
    },
    onError: (err: any) => {
      setSaveError(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
      setSaveSuccess(false);
    },
  });

  const handleSave = () => {
    setSaveError('');
    updateMutation.mutate(formState);
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/storefront/webhooks/paymob`
    : '/api/storefront/webhooks/paymob';

  const xpayWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/storefront/webhooks/xpay`
    : '/api/storefront/webhooks/xpay';

  const tapWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/storefront/webhooks/tap`
    : '/api/storefront/webhooks/tap';

  const stripeWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/storefront/webhooks/stripe`
    : '/api/storefront/webhooks/stripe';

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const handleCopyXPayWebhook = async () => {
    try {
      await navigator.clipboard.writeText(xpayWebhookUrl);
      setCopyXPaySuccess(true);
      setTimeout(() => setCopyXPaySuccess(false), 2500);
    } catch {
      setCopyXPaySuccess(true);
      setTimeout(() => setCopyXPaySuccess(false), 2500);
    }
  };

  const handleCopyTapWebhook = async () => {
    try {
      await navigator.clipboard.writeText(tapWebhookUrl);
      setCopyTapSuccess(true);
      setTimeout(() => setCopyTapSuccess(false), 2500);
    } catch {
      setCopyTapSuccess(true);
      setTimeout(() => setCopyTapSuccess(false), 2500);
    }
  };

  const handleCopyStripeWebhook = async () => {
    try {
      await navigator.clipboard.writeText(stripeWebhookUrl);
      setCopyStripeSuccess(true);
      setTimeout(() => setCopyStripeSuccess(false), 2500);
    } catch {
      setCopyStripeSuccess(true);
      setTimeout(() => setCopyStripeSuccess(false), 2500);
    }
  };

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Header Info Banner */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#e0e7ff',
              color: '#170e5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            💳
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              بوابات الدفع الإلكتروني التلقائية للمتجر (Payment Gateways)
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              ربط مباشر لخصم البطاقات البنكية (Visa / MasterCard / Meeza) وتأكيد سداد الفواتير تلقائياً عبر الـ Webhooks
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              background: formState.onlinePaymentEnabled ? '#f0fdf4' : '#f8fafc',
              border: formState.onlinePaymentEnabled ? '1.5px solid #22c55e' : '1px solid #cbd5e1',
              padding: '8px 16px',
              borderRadius: '10px',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              type="checkbox"
              checked={formState.onlinePaymentEnabled}
              onChange={(e) => setFormState({ ...formState, onlinePaymentEnabled: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', fontWeight: 700, color: formState.onlinePaymentEnabled ? '#15803d' : '#475569' }}>
              {formState.onlinePaymentEnabled ? 'الدفع الإلكتروني مفعّل' : 'الدفع الإلكتروني معطّل'}
            </span>
          </label>

          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            style={{
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 22px',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(23, 14, 94, 0.2)',
              opacity: updateMutation.isPending ? 0.7 : 1,
            }}
          >
            {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div
          style={{
            background: '#dcfce7',
            border: '1px solid #86efac',
            color: '#15803d',
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '13.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ✓ تم حفظ إعدادات بوابة الدفع الإلكتروني بنجاح!
        </div>
      )}

      {saveError && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '13.5px',
            fontWeight: 700,
          }}
        >
          ✕ {saveError}
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Left Column: Gateway Provider & Mode */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              اختيار مزود الخدمة ووضع التشغيل
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              حدد بوابة الدفع المعتمدة وطور التشغيل (تجريبي أو إنتاجي مباشر)
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              مزود بوابة الدفع المعتمد
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
              {/* Tap Payments (GCC) */}
              <div
                onClick={() => setFormState({ ...formState, onlinePaymentProvider: 'tap' })}
                style={{
                  border: formState.onlinePaymentProvider === 'tap' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  background: formState.onlinePaymentProvider === 'tap' ? '#f0fdf4' : '#ffffff',
                  borderRadius: '12px',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '22px' }}>🇸🇦</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>تاب (Tap GCC)</div>
                  <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700 }}>مدى / KNET / Apple Pay</div>
                </div>
              </div>

              {/* Stripe (International) */}
              <div
                onClick={() => setFormState({ ...formState, onlinePaymentProvider: 'stripe' })}
                style={{
                  border: formState.onlinePaymentProvider === 'stripe' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  background: formState.onlinePaymentProvider === 'stripe' ? '#eff6ff' : '#ffffff',
                  borderRadius: '12px',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '22px' }}>🌍</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>سترايب (Stripe)</div>
                  <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 700 }}>بطاقات عالمية & Apple</div>
                </div>
              </div>

              {/* Paymob */}
              <div
                onClick={() => setFormState({ ...formState, onlinePaymentProvider: 'paymob' })}
                style={{
                  border: formState.onlinePaymentProvider === 'paymob' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  background: formState.onlinePaymentProvider === 'paymob' ? '#f8fafc' : '#ffffff',
                  borderRadius: '12px',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '22px' }}>🏦</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Paymob</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>فيزا / ماستركارد</div>
                </div>
              </div>

              {/* XPay */}
              <div
                onClick={() => setFormState({ ...formState, onlinePaymentProvider: 'xpay' })}
                style={{
                  border: formState.onlinePaymentProvider === 'xpay' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  background: formState.onlinePaymentProvider === 'xpay' ? '#f8fafc' : '#ffffff',
                  borderRadius: '12px',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '22px' }}>💳</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>إكس باي (XPay)</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>بطاقات وفوري</div>
                </div>
              </div>

              {/* Mock Simulator */}
              <div
                onClick={() => setFormState({ ...formState, onlinePaymentProvider: 'mock' })}
                style={{
                  border: formState.onlinePaymentProvider === 'mock' ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  background: formState.onlinePaymentProvider === 'mock' ? '#f8fafc' : '#ffffff',
                  borderRadius: '12px',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '22px' }}>🧪</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Sandbox Mock</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>محاكي تجريبي</div>
                </div>
              </div>
            </div>
          </div>

          {/* Test Mode / Sandbox Toggle */}
          {formState.onlinePaymentProvider === 'tap' && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>وضع التجربة (Tap Sandbox Mode)</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  اختبار كامل دورة الدفع الخليجي (مدى، KNET، Apple Pay) ببيئة الاختبار
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formState.tapTestMode}
                  onChange={(e) => setFormState({ ...formState, tapTestMode: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
                />
              </label>
            </div>
          )}

          {formState.onlinePaymentProvider === 'stripe' && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>وضع التجربة (Stripe Test Mode)</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  اختبار البطاقات الدولية عبر مفاتيح الاختبار بدون خصم أموال حقيقية
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formState.stripeTestMode}
                  onChange={(e) => setFormState({ ...formState, stripeTestMode: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
                />
              </label>
            </div>
          )}

          {formState.onlinePaymentProvider === 'paymob' && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>وضع التجربة (Paymob Sandbox)</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  اختبار كامل دورة الدفع ببطاقات تجريبية دون سحب أموال حقيقية
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formState.paymobTestMode}
                  onChange={(e) => setFormState({ ...formState, paymobTestMode: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
                />
              </label>
            </div>
          )}

          {formState.onlinePaymentProvider === 'xpay' && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>وضع التجربة (XPay Staging Mode)</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  استخدام خوادم الاختبار (staging.xpay.app) لاختبار الدفع
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formState.xpayTestMode}
                  onChange={(e) => setFormState({ ...formState, xpayTestMode: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
                />
              </label>
            </div>
          )}

          {/* Webhook Configuration Card for Tap Payments */}
          {formState.onlinePaymentProvider === 'tap' && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔗</span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803d' }}>
                  رابط إشعار العمليات الفوري (Tap Webhook URL)
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: '#166534', lineHeight: '1.5' }}>
                قم بنسخ هذا الرابط ووضعه في لوحة تحكم Tap (Developers &gt; Webhooks):
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                }}
              >
                <code style={{ fontSize: '11.5px', color: '#0f172a', direction: 'ltr', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tapWebhookUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyTapWebhook}
                  style={{
                    background: copyTapSuccess ? '#16a34a' : '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copyTapSuccess ? 'تم النسخ!' : 'نسخ الرابط'}
                </button>
              </div>
            </div>
          )}

          {/* Webhook Configuration Card for Stripe */}
          {formState.onlinePaymentProvider === 'stripe' && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔗</span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1d4ed8' }}>
                  رابط إشعار العمليات الفوري (Stripe Webhook URL)
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: '#1e40af', lineHeight: '1.5' }}>
                قم بنسخ هذا الرابط ووضعه في لوحة تحكم سترايب (Developers &gt; Webhooks &gt; Add Endpoint):
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                }}
              >
                <code style={{ fontSize: '11.5px', color: '#0f172a', direction: 'ltr', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stripeWebhookUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyStripeWebhook}
                  style={{
                    background: copyStripeSuccess ? '#16a34a' : '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copyStripeSuccess ? 'تم النسخ!' : 'نسخ الرابط'}
                </button>
              </div>
            </div>
          )}

          {/* Webhook Configuration Card for Paymob */}
          {formState.onlinePaymentProvider === 'paymob' && (
            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔗</span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0369a1' }}>
                  رابط إشعار العمليات الفوري (Paymob Webhook URL)
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: '#0c4a6e', lineHeight: '1.5' }}>
                قم بنسخ هذا الرابط ووضعه في لوحة تحكم Paymob تحت (Transaction Processed Callback):
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                }}
              >
                <code style={{ fontSize: '11.5px', color: '#0f172a', direction: 'ltr', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  style={{
                    background: copySuccess ? '#16a34a' : '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copySuccess ? 'تم النسخ!' : 'نسخ الرابط'}
                </button>
              </div>
            </div>
          )}

          {/* Webhook Configuration Card for XPay */}
          {formState.onlinePaymentProvider === 'xpay' && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🔗</span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803d' }}>
                  رابط إشعار العمليات الفوري (XPay Webhook URL)
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: '#166534', lineHeight: '1.5' }}>
                قم بنسخ هذا الرابط ووضعه في لوحة تحكم إكس باي تحت (Webhooks / Payment Notification URL):
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 12px',
                }}
              >
                <code style={{ fontSize: '11.5px', color: '#0f172a', direction: 'ltr', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {xpayWebhookUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyXPayWebhook}
                  style={{
                    background: copyXPaySuccess ? '#16a34a' : '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copyXPaySuccess ? 'تم النسخ!' : 'نسخ الرابط'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: API Credentials based on selected provider */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          {formState.onlinePaymentProvider === 'tap' && (
            <>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px' }}>🇸🇦</span>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    مفاتيح بوابة تاب للمدفوعات (Tap Payments GCC)
                  </h4>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  تدعم بطاقات مدى السعودية 🇸🇦، شبكة كي نت الكويتية 🇰🇼، بطاقات ناباس القطرية 🇶🇦، وبطاقات بنفت 🇧🇭، وApple Pay 🍎 بالكامل.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  المفتاح السري (Tap Secret Key)
                </label>
                <input
                  type="password"
                  value={formState.tapSecretKey}
                  onChange={(e) => setFormState({ ...formState, tapSecretKey: e.target.value })}
                  placeholder="sk_test_... أو sk_live_..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  المفتاح السري لإنشاء جلسات الدفع وخصم الفواتير عبر خوادم Tap.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  المفتاح العام (Tap Publishable Key)
                </label>
                <input
                  type="text"
                  value={formState.tapPublishableKey}
                  onChange={(e) => setFormState({ ...formState, tapPublishableKey: e.target.value })}
                  placeholder="pk_test_... أو pk_live_..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  المفتاح العام المخصص للواجهة الأمامية وتوثيق عمليات Apple Pay المباشرة.
                </span>
              </div>
            </>
          )}

          {formState.onlinePaymentProvider === 'stripe' && (
            <>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px' }}>🌍</span>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    مفاتيح بوابة سترايب (Stripe Global Payments)
                  </h4>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  تدعم بطاقات فيزا، ماستركارد، أمريكان إكسبريس، وApple Pay وGoogle Pay عالمياً بكل العملات.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  المفتاح السري (Stripe Secret Key)
                </label>
                <input
                  type="password"
                  value={formState.stripeSecretKey}
                  onChange={(e) => setFormState({ ...formState, stripeSecretKey: e.target.value })}
                  placeholder="sk_test_... أو sk_live_..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  المفتاح العام (Stripe Publishable Key)
                </label>
                <input
                  type="text"
                  value={formState.stripePublishableKey}
                  onChange={(e) => setFormState({ ...formState, stripePublishableKey: e.target.value })}
                  placeholder="pk_test_... أو pk_live_..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  مفتاح توقيع الويب هوك (Webhook Signing Secret)
                </label>
                <input
                  type="password"
                  value={formState.stripeWebhookSecret}
                  onChange={(e) => setFormState({ ...formState, stripeWebhookSecret: e.target.value })}
                  placeholder="whsec_..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  للتحقق من صحة أحداث سترايب عند استلام إشعارات الدفع التلقائية (checkout.session.completed).
                </span>
              </div>
            </>
          )}

          {formState.onlinePaymentProvider === 'paymob' && (
            <>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  مفاتيح الربط والاعتماد (Paymob API Keys)
                </h4>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  يمكنك استخراج هذه المفاتيح مباشرة من لوحة حسابك في Paymob
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  مفتاح الـ API العام (API Key)
                </label>
                <input
                  type="password"
                  value={formState.paymobApiKey}
                  onChange={(e) => setFormState({ ...formState, paymobApiKey: e.target.value })}
                  placeholder="مثال: ZXlKaGJHY2lPaUpJVXpVe..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    معرف التكامل (Integration ID)
                  </label>
                  <input
                    type="text"
                    value={formState.paymobIntegrationId}
                    onChange={(e) => setFormState({ ...formState, paymobIntegrationId: e.target.value })}
                    placeholder="مثال: 456789"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      direction: 'ltr',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    معرف الإطار (Iframe ID)
                  </label>
                  <input
                    type="text"
                    value={formState.paymobIframeId}
                    onChange={(e) => setFormState({ ...formState, paymobIframeId: e.target.value })}
                    placeholder="مثال: 812345"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      direction: 'ltr',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  المفتاح السري للتحقق الأمني (HMAC Secret)
                </label>
                <input
                  type="password"
                  value={formState.paymobHmacSecret}
                  onChange={(e) => setFormState({ ...formState, paymobHmacSecret: e.target.value })}
                  placeholder="مثال: A8B4F12E99..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  يُستخدم لتأكيد صحة التوقيع الرقمي للـ Webhook ومنع تزوير عمليات الدفع نهائياً.
                </span>
              </div>
            </>
          )}

          {formState.onlinePaymentProvider === 'xpay' && (
            <>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  مفاتيح الربط والاعتماد (XPay API Credentials)
                </h4>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  يمكنك استخراج هذه المفاتيح من لوحة حساب التاجر في منصة إكس باي (XPay Dashboard)
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  مفتاح API السري (x-api-key)
                </label>
                <input
                  type="password"
                  value={formState.xpayApiKey}
                  onChange={(e) => setFormState({ ...formState, xpayApiKey: e.target.value })}
                  placeholder="مثال: xpay_sec_key_..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  يُرسل في الترويسة (Header) الخاصة بالطلب للتحقق من هوية التاجر.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  معرف المجتمع في إكس باي (Community ID)
                </label>
                <input
                  type="text"
                  value={formState.xpayCommunityId}
                  onChange={(e) => setFormState({ ...formState, xpayCommunityId: e.target.value })}
                  placeholder="مثال: cm_987654..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  المعرّف الخاص بمنشأتك أو متجرك في منصة إكس باي لتوجيه العمليات المالية.
                </span>
              </div>
            </>
          )}

          {formState.onlinePaymentProvider === 'mock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                🧪 وضع المحاكاة التجريبي نشط
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.6', margin: 0 }}>
                هذا الوضع مخصص لتجربة ومحاكاة عمليات الدفع بالبطاقات محلياً بدون إدخال أي مفاتيح بنكية حقيقية. سيتمكن زوار المتجر من تجربة إدخال بطاقة وهمية والحصول على تأكيد السداد وإشعار الواتساب التلقائي فوراً.
              </p>
            </div>
          )}

          <div
            style={{
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#475569',
              lineHeight: '1.4',
            }}
          >
            💡 في حال تفعيل <strong>وضع التجربة (Sandbox / Staging)</strong> وعدم إدخال مفاتيح حية، سيوفر المتجر تلقائياً تجربة دفع بطاقة تجريبية متكاملة لضمان فحص دورة الشراء بالكامل.
          </div>
        </div>
      </div>
    </div>
  );
}
