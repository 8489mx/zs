import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { 
  CreditCardIcon, 
  GlobeIcon, 
  BuildingIcon, 
  CheckCircleIcon, 
  AlertCircleIcon, 
  LinkIcon, 
  LightbulbIcon 
} from '@/shared/components/icons/AppIcons';

export function StorefrontPaymentGatewaysManager() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyXPaySuccess, setCopyXPaySuccess] = useState(false);
  const [copyTapSuccess, setCopyTapSuccess] = useState(false);
  const [copyStripeSuccess, setCopyStripeSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [showAllGateways, setShowAllGateways] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['storefront-admin-settings'],
    queryFn: storefrontApi.getSettings,
  });

  const storeCurrency = (settingsQuery.data?.currency || 'EGP').toUpperCase();
  const storeCountryCode = (settingsQuery.data?.countryCode || (
    storeCurrency === 'KWD' ? 'KW' :
    storeCurrency === 'SAR' ? 'SA' :
    storeCurrency === 'AED' ? 'AE' :
    storeCurrency === 'QAR' ? 'QA' :
    storeCurrency === 'BHD' ? 'BH' :
    storeCurrency === 'OMR' ? 'OM' :
    storeCurrency === 'EGP' ? 'EG' : 'OTHER'
  )).toUpperCase();

  const isKuwait = storeCountryCode === 'KW' || storeCurrency === 'KWD';
  const isGcc = ['KW', 'SA', 'AE', 'QA', 'BH', 'OM'].includes(storeCountryCode) ||
    ['KWD', 'SAR', 'AED', 'QAR', 'BHD', 'OMR'].includes(storeCurrency);
  const isEgypt = storeCountryCode === 'EG' || storeCurrency === 'EGP';

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
      let activeProvider = data.onlinePaymentProvider;
      if (!activeProvider) {
        activeProvider = isGcc ? 'tap' : 'paymob';
      } else if (isGcc && (activeProvider === 'paymob' || activeProvider === 'xpay')) {
        // Auto-heal legacy unisolated default for Kuwait / GCC
        activeProvider = 'tap';
      }

      setFormState({
        onlinePaymentEnabled: Boolean(data.onlinePaymentEnabled),
        onlinePaymentProvider: activeProvider,
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
  }, [settingsQuery.data, isGcc]);

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
            }}
          >
            <CreditCardIcon size={24} color="#170e5e" />
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              {t('storefront.storefront_payment_gateways_manager.s0', "بوابات الدفع الإلكتروني التلقائية للمتجر (Payment Gateways)")}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {isKuwait
                ? t('storefront.storefront_payment_gateways_manager.s1_kw', "ربط مباشر لخصم البطاقات البنكية والكي نت (K-NET / Apple Pay / Visa) وتأكيد سداد الفواتير تلقائياً")
                : isGcc
                ? t('storefront.storefront_payment_gateways_manager.s1_gcc', "ربط مباشر لخصم البطاقات البنكية ومدى (Mada / Apple Pay / Visa) وتأكيد سداد الفواتير تلقائياً")
                : t('storefront.storefront_payment_gateways_manager.s1', "ربط مباشر لخصم البطاقات البنكية (Visa / MasterCard / Meeza) وتأكيد سداد الفواتير تلقائياً عبر الـ Webhooks")}
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
              {formState.onlinePaymentEnabled ? t('storefront.storefront_payment_gateways_manager.s2', "الدفع الإلكتروني مفعّل") : t('storefront.storefront_payment_gateways_manager.s3', "الدفع الإلكتروني معطّل")}
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
            {updateMutation.isPending ? t('storefront.storefront_payment_gateways_manager.s4', "جاري الحفظ...") : t('storefront.storefront_payment_gateways_manager.s5', "حفظ الإعدادات")}
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
          <CheckCircleIcon size={18} color="#15803d" />
          <span>{t('storefront.storefront_payment_gateways_manager.s6', "تم حفظ إعدادات بوابة الدفع الإلكتروني بنجاح!")}</span>
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircleIcon size={18} color="#991b1b" />
          <span>{saveError}</span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {t('storefront.storefront_payment_gateways_manager.s7', "اختيار مزود الخدمة ووضع التشغيل")}
              </h4>
              {isKuwait ? (
                <span style={{ fontSize: '11px', fontWeight: 800, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px' }}>
                  بوابات الكويت المعتمدة (K-NET & Apple Pay) • {storeCurrency}
                </span>
              ) : isGcc ? (
                <span style={{ fontSize: '11px', fontWeight: 800, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px' }}>
                  بوابات الخليج المعتمدة (مدى & Apple Pay) • {storeCurrency}
                </span>
              ) : isEgypt ? (
                <span style={{ fontSize: '11px', fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px' }}>
                  بوابات مصر المعتمدة (Visa / MasterCard / ميزة) • {storeCurrency}
                </span>
              ) : (
                <span style={{ fontSize: '11px', fontWeight: 800, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '6px' }}>
                  بوابات الدفع الدولية • {storeCurrency}
                </span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '4px' }}>
              {t('storefront.storefront_payment_gateways_manager.s8', "حدد بوابة الدفع المعتمدة وطور التشغيل (تجريبي أو إنتاجي مباشر)")}
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              {t('storefront.storefront_payment_gateways_manager.s9', "مزود بوابة الدفع المعتمد")}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
              {/* Tap Payments (GCC - Kuwait, Saudi, UAE, etc.) */}
              {(isGcc || showAllGateways) && (
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
                  <CreditCardIcon size={22} color={formState.onlinePaymentProvider === 'tap' ? '#15803d' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{t('storefront.storefront_payment_gateways_manager.s10', "تاب (Tap GCC)")}</div>
                    <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700 }}>
                      {isKuwait ? 'KNET / Apple Pay' : 'مدى / Apple Pay'}
                    </div>
                  </div>
                </div>
              )}

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
                <GlobeIcon size={22} color={formState.onlinePaymentProvider === 'stripe' ? '#2563eb' : '#64748b'} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{t('storefront.storefront_payment_gateways_manager.s12', "سترايب (Stripe)")}</div>
                  <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 700 }}>{t('storefront.storefront_payment_gateways_manager.s13', "بطاقات عالمية & Apple")}</div>
                </div>
              </div>

              {/* Paymob (Egypt) */}
              {(isEgypt || showAllGateways) && (
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
                  <BuildingIcon size={22} color={formState.onlinePaymentProvider === 'paymob' ? '#170e5e' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Paymob</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{t('storefront.storefront_payment_gateways_manager.s14', "فيزا / ماستركارد / ميزة")}</div>
                  </div>
                </div>
              )}

              {/* XPay (Egypt) */}
              {(isEgypt || showAllGateways) && (
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
                  <CreditCardIcon size={22} color={formState.onlinePaymentProvider === 'xpay' ? '#170e5e' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{t('storefront.storefront_payment_gateways_manager.s15', "إكس باي (XPay)")}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{t('storefront.storefront_payment_gateways_manager.s16', "بطاقات وفوري")}</div>
                  </div>
                </div>
              )}

              {/* Mock Simulator */}
              {showAllGateways && (
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
                  <CreditCardIcon size={22} color={formState.onlinePaymentProvider === 'mock' ? '#170e5e' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Sandbox Mock</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{t('storefront.storefront_payment_gateways_manager.s17', "محاكي تجريبي")}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAllGateways((prev) => !prev)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '4px',
                }}
              >
                {showAllGateways
                  ? t('storefront.storefront_payment_gateways_manager.hide_all', "إخفاء البوابات غير الإقليمية")
                  : t('storefront.storefront_payment_gateways_manager.show_all', "عرض كافة بوابات الدفع الدولية الأخرى (+)")}
              </button>
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
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{t('storefront.storefront_payment_gateways_manager.s18', "وضع التجربة (Tap Sandbox Mode)")}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  {t('storefront.storefront_payment_gateways_manager.s19', "اختبار كامل دورة الدفع الخليجي (مدى، KNET، Apple Pay) ببيئة الاختبار")}
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
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{t('storefront.storefront_payment_gateways_manager.s20', "وضع التجربة (Stripe Test Mode)")}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  {t('storefront.storefront_payment_gateways_manager.s21', "اختبار البطاقات الدولية عبر مفاتيح الاختبار بدون خصم أموال حقيقية")}
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
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{t('storefront.storefront_payment_gateways_manager.s22', "وضع التجربة (Paymob Sandbox)")}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  {t('storefront.storefront_payment_gateways_manager.s23', "اختبار كامل دورة الدفع ببطاقات تجريبية دون سحب أموال حقيقية")}
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
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{t('storefront.storefront_payment_gateways_manager.s24', "وضع التجربة (XPay Staging Mode)")}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  {t('storefront.storefront_payment_gateways_manager.s25', "استخدام خوادم الاختبار (staging.xpay.app) لاختبار الدفع")}
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
                <LinkIcon size={16} color="#15803d" />
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803d' }}>
                  {t('storefront.storefront_payment_gateways_manager.s26', "رابط إشعار العمليات الفوري (Tap Webhook URL)")}
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: '#166534', lineHeight: '1.5' }}>
                {t('storefront.storefront_payment_gateways_manager.s27', "قم بنسخ هذا الرابط ووضعه في لوحة تحكم Tap (Developers > Webhooks):")}
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
                  {copyTapSuccess ? t('storefront.storefront_payment_gateways_manager.s28', "تم النسخ!") : t('storefront.storefront_payment_gateways_manager.s29', "نسخ الرابط")}
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
                <LinkIcon size={16} color="#1d4ed8" />
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1d4ed8' }}>
                  {t('storefront.storefront_payment_gateways_manager.s30', "رابط إشعار العمليات الفوري (Stripe Webhook URL)")}
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: '#1e40af', lineHeight: '1.5' }}>
                {t('storefront.storefront_payment_gateways_manager.s31', "قم بنسخ هذا الرابط ووضعه في لوحة تحكم سترايب (Developers > Webhooks > Add Endpoint):")}
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
                  {copyStripeSuccess ? t('storefront.storefront_payment_gateways_manager.s32', "تم النسخ!") : t('storefront.storefront_payment_gateways_manager.s33', "نسخ الرابط")}
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
                <LinkIcon size={16} color="#0369a1" />
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0369a1' }}>
                  {t('storefront.storefront_payment_gateways_manager.s34', "رابط إشعار العمليات الفوري (Paymob Webhook URL)")}
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: '#0c4a6e', lineHeight: '1.5' }}>
                {t('storefront.storefront_payment_gateways_manager.s35', "قم بنسخ هذا الرابط ووضعه في لوحة تحكم Paymob تحت (Transaction Processed Callback):")}
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
                  {copySuccess ? t('storefront.storefront_payment_gateways_manager.s36', "تم النسخ!") : t('storefront.storefront_payment_gateways_manager.s37', "نسخ الرابط")}
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
                <LinkIcon size={16} color="#15803d" />
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803d' }}>
                  {t('storefront.storefront_payment_gateways_manager.s38', "رابط إشعار العمليات الفوري (XPay Webhook URL)")}
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: '#166534', lineHeight: '1.5' }}>
                {t('storefront.storefront_payment_gateways_manager.s39', "قم بنسخ هذا الرابط ووضعه في لوحة تحكم إكس باي تحت (Webhooks / Payment Notification URL):")}
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
                  {copyXPaySuccess ? t('storefront.storefront_payment_gateways_manager.s40', "تم النسخ!") : t('storefront.storefront_payment_gateways_manager.s41', "نسخ الرابط")}
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
                  <CreditCardIcon size={18} color="#170e5e" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    {t('storefront.storefront_payment_gateways_manager.s42', "مفاتيح بوابة تاب للمدفوعات (Tap Payments GCC)")}
                  </h4>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {t('storefront.storefront_payment_gateways_manager.s43', "تدعم بطاقات مدى السعودية، شبكة كي نت الكويتية، بطاقات ناباس القطرية، وبطاقات بنفت، وApple Pay بالكامل.")}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {t('storefront.storefront_payment_gateways_manager.s44', "المفتاح السري (Tap Secret Key)")}
                </label>
                <input
                  type="password"
                  value={formState.tapSecretKey}
                  onChange={(e) => setFormState({ ...formState, tapSecretKey: e.target.value })}
                  placeholder={t('storefront.storefront_payment_gateways_manager.s45', "sk_test_... أو sk_live_...")}
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
                  {t('storefront.storefront_payment_gateways_manager.s46', "المفتاح السري لإنشاء جلسات الدفع وخصم الفواتير عبر خوادم Tap.")}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {t('storefront.storefront_payment_gateways_manager.s47', "المفتاح العام (Tap Publishable Key)")}
                </label>
                <input
                  type="text"
                  value={formState.tapPublishableKey}
                  onChange={(e) => setFormState({ ...formState, tapPublishableKey: e.target.value })}
                  placeholder={t('storefront.storefront_payment_gateways_manager.s48', "pk_test_... أو pk_live_...")}
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
                  {t('storefront.storefront_payment_gateways_manager.s49', "المفتاح العام المخصص للواجهة الأمامية وتوثيق عمليات Apple Pay المباشرة.")}
                </span>
              </div>
            </>
          )}

          {formState.onlinePaymentProvider === 'stripe' && (
            <>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <GlobeIcon size={18} color="#170e5e" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    {t('storefront.storefront_payment_gateways_manager.s50', "مفاتيح بوابة سترايب (Stripe Global Payments)")}
                  </h4>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {t('storefront.storefront_payment_gateways_manager.s51', "تدعم بطاقات فيزا، ماستركارد، أمريكان إكسبريس، وApple Pay وGoogle Pay عالمياً بكل العملات.")}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {t('storefront.storefront_payment_gateways_manager.s52', "المفتاح السري (Stripe Secret Key)")}
                </label>
                <input
                  type="password"
                  value={formState.stripeSecretKey}
                  onChange={(e) => setFormState({ ...formState, stripeSecretKey: e.target.value })}
                  placeholder={t('storefront.storefront_payment_gateways_manager.s53', "sk_test_... أو sk_live_...")}
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
                  {t('storefront.storefront_payment_gateways_manager.s54', "المفتاح العام (Stripe Publishable Key)")}
                </label>
                <input
                  type="text"
                  value={formState.stripePublishableKey}
                  onChange={(e) => setFormState({ ...formState, stripePublishableKey: e.target.value })}
                  placeholder={t('storefront.storefront_payment_gateways_manager.s55', "pk_test_... أو pk_live_...")}
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
                  {t('storefront.storefront_payment_gateways_manager.s56', "مفتاح توقيع الويب هوك (Webhook Signing Secret)")}
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
                  {t('storefront.storefront_payment_gateways_manager.s57', "للتحقق من صحة أحداث سترايب عند استلام إشعارات الدفع التلقائية (checkout.session.completed).")}
                </span>
              </div>
            </>
          )}

          {formState.onlinePaymentProvider === 'paymob' && (
            <>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {t('storefront.storefront_payment_gateways_manager.s58', "مفاتيح الربط والاعتماد (Paymob API Keys)")}
                </h4>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {t('storefront.storefront_payment_gateways_manager.s59', "يمكنك استخراج هذه المفاتيح مباشرة من لوحة حسابك في Paymob")}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {t('storefront.storefront_payment_gateways_manager.s60', "مفتاح الـ API العام (API Key)")}
                </label>
                <input
                  type="password"
                  value={formState.paymobApiKey}
                  onChange={(e) => setFormState({ ...formState, paymobApiKey: e.target.value })}
                  placeholder={t('storefront.storefront_payment_gateways_manager.s61', "مثال: ZXlKaGJHY2lPaUpJVXpVe...")}
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
                    {t('storefront.storefront_payment_gateways_manager.s62', "معرف التكامل (Integration ID)")}
                  </label>
                  <input
                    type="text"
                    value={formState.paymobIntegrationId}
                    onChange={(e) => setFormState({ ...formState, paymobIntegrationId: e.target.value })}
                    placeholder={t('storefront.storefront_payment_gateways_manager.s63', "مثال: 456789")}
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
                    {t('storefront.storefront_payment_gateways_manager.s64', "معرف الإطار (Iframe ID)")}
                  </label>
                  <input
                    type="text"
                    value={formState.paymobIframeId}
                    onChange={(e) => setFormState({ ...formState, paymobIframeId: e.target.value })}
                    placeholder={t('storefront.storefront_payment_gateways_manager.s65', "مثال: 812345")}
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
                  {t('storefront.storefront_payment_gateways_manager.s66', "المفتاح السري للتحقق الأمني (HMAC Secret)")}
                </label>
                <input
                  type="password"
                  value={formState.paymobHmacSecret}
                  onChange={(e) => setFormState({ ...formState, paymobHmacSecret: e.target.value })}
                  placeholder={t('storefront.storefront_payment_gateways_manager.s67', "مثال: A8B4F12E99...")}
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
                  {t('storefront.storefront_payment_gateways_manager.s68', "يُستخدم لتأكيد صحة التوقيع الرقمي للـ Webhook ومنع تزوير عمليات الدفع نهائياً.")}
                </span>
              </div>
            </>
          )}

          {formState.onlinePaymentProvider === 'xpay' && (
            <>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {t('storefront.storefront_payment_gateways_manager.s69', "مفاتيح الربط والاعتماد (XPay API Credentials)")}
                </h4>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {t('storefront.storefront_payment_gateways_manager.s70', "يمكنك استخراج هذه المفاتيح من لوحة حساب التاجر في منصة إكس باي (XPay Dashboard)")}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {t('storefront.storefront_payment_gateways_manager.s71', "مفتاح API السري (x-api-key)")}
                </label>
                <input
                  type="password"
                  value={formState.xpayApiKey}
                  onChange={(e) => setFormState({ ...formState, xpayApiKey: e.target.value })}
                  placeholder={t('storefront.storefront_payment_gateways_manager.s72', "مثال: xpay_sec_key_...")}
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
                  {t('storefront.storefront_payment_gateways_manager.s73', "يُرسل في الترويسة (Header) الخاصة بالطلب للتحقق من هوية التاجر.")}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {t('storefront.storefront_payment_gateways_manager.s74', "معرف المجتمع في إكس باي (Community ID)")}
                </label>
                <input
                  type="text"
                  value={formState.xpayCommunityId}
                  onChange={(e) => setFormState({ ...formState, xpayCommunityId: e.target.value })}
                  placeholder={t('storefront.storefront_payment_gateways_manager.s75', "مثال: cm_987654...")}
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
                  {t('storefront.storefront_payment_gateways_manager.s76', "المعرّف الخاص بمنشأتك أو متجرك في منصة إكس باي لتوجيه العمليات المالية.")}
                </span>
              </div>
            </>
          )}

          {formState.onlinePaymentProvider === 'mock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCardIcon size={16} color="#64748b" />
                <span>{t('storefront.storefront_payment_gateways_manager.s77', "وضع المحاكاة التجريبي نشط")}</span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.6', margin: 0 }}>
                {t('storefront.storefront_payment_gateways_manager.s78', "هذا الوضع مخصص لتجربة ومحاكاة عمليات الدفع بالبطاقات محلياً بدون إدخال أي مفاتيح بنكية حقيقية. سيتمكن زوار المتجر من تجربة إدخال بطاقة وهمية والحصول على تأكيد السداد وإشعار الواتساب التلقائي فوراً.")}
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
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <LightbulbIcon size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              {t('storefront.storefront_payment_gateways_manager.s79', "في حال تفعيل")} <strong>{t('storefront.storefront_payment_gateways_manager.s80', "وضع التجربة (Sandbox / Staging)")}</strong> {t('storefront.storefront_payment_gateways_manager.s81', "وعدم إدخال مفاتيح حية، سيوفر المتجر تلقائياً تجربة دفع بطاقة تجريبية متكاملة لضمان فحص دورة الشراء بالكامل.")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
