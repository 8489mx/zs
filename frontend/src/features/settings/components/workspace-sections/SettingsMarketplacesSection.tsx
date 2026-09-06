import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { formatDateTimeArabic } from '@/lib/format';
import {
  marketplaceSyncApi,
  AmazonConfig,
  NoonConfig,
} from '@/features/storefront/api/marketplace-sync.api';

export const SettingsMarketplacesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'amazon' | 'noon' | 'inventory' | 'orders'>('amazon');

  const [amazonCfg, setAmazonCfg] = useState<AmazonConfig>({
    enabled: false,
    sellerId: '',
    refreshToken: '',
    clientId: '',
    clientSecret: '',
    marketplaceId: 'eg',
    autoSyncStock: true,
    autoPullOrders: true,
    fulfillmentType: 'fbm',
  });

  const [noonCfg, setNoonCfg] = useState<NoonConfig>({
    enabled: false,
    merchantId: '',
    apiKey: '',
    appSecret: '',
    marketplace: 'eg',
    autoSyncStock: true,
    autoPullOrders: true,
    fulfillmentType: 'direct',
  });

  const [testResult, setTestResult] = useState<{ success: boolean; message: string; pingMs?: number; accountName?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [simulatedOrderInfo, setSimulatedOrderInfo] = useState<string | null>(null);

  // New mapping form
  const [newMapping, setNewMapping] = useState<{
    productId: number;
    marketplace: 'amazon' | 'noon';
    marketplaceSku: string;
    marketplaceTitle: string;
    customPrice: string;
    syncStock: boolean;
  }>({
    productId: 0,
    marketplace: 'amazon',
    marketplaceSku: '',
    marketplaceTitle: '',
    customPrice: '',
    syncStock: true,
  });

  // Queries
  const configQuery = useQuery({
    queryKey: ['marketplaces-config'],
    queryFn: marketplaceSyncApi.getConfig,
  });

  const mappingsQuery = useQuery({
    queryKey: ['marketplaces-mappings'],
    queryFn: marketplaceSyncApi.getMappings,
  });

  useEffect(() => {
    if (configQuery.data) {
      setAmazonCfg(configQuery.data.amazon);
      setNoonCfg(configQuery.data.noon);
    }
  }, [configQuery.data]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: marketplaceSyncApi.saveConfig,
    onSuccess: () => {
      setSaveSuccess(true);
      void configQuery.refetch();
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const testMutation = useMutation({
    mutationFn: (target: 'amazon' | 'noon') => marketplaceSyncApi.testConnection(target),
    onSuccess: (res) => setTestResult(res),
    onError: (err: any) => setTestResult({ success: false, message: err?.message || 'فشل الاتصال بالمنصة' }),
  });

  const syncMutation = useMutation({
    mutationFn: (target?: 'amazon' | 'noon') => marketplaceSyncApi.syncInventory(target),
    onSuccess: () => {
      void mappingsQuery.refetch();
    },
  });

  const addMappingMutation = useMutation({
    mutationFn: marketplaceSyncApi.saveMapping,
    onSuccess: () => {
      setShowAddModal(false);
      setNewMapping({ productId: 0, marketplace: 'amazon', marketplaceSku: '', marketplaceTitle: '', customPrice: '', syncStock: true });
      void mappingsQuery.refetch();
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: marketplaceSyncApi.deleteMapping,
    onSuccess: () => void mappingsQuery.refetch(),
  });

  const simulateOrderMutation = useMutation({
    mutationFn: (m: 'amazon' | 'noon') => marketplaceSyncApi.simulateOrder(m),
    onSuccess: (res) => {
      setSimulatedOrderInfo(`تم بنجاح سحب طلب ${res.orderNumber} وحجز 1 قطعة من [${res.reservedProductName}] وتحديث المخزون بنجاح!`);
      void mappingsQuery.refetch();
    },
  });

  const mappings = mappingsQuery.data || [];
  const syncedCount = mappings.filter((m) => m.status === 'synced').length;

  return (
    <div dir="rtl" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              الربط والمزامنة مع منصات التجارة الخارجية (Amazon & Noon)
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                background: '#eff6ff',
                color: '#1d4ed8',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
              }}
            >
              Omnichannel Sync
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            تحديث أرصدة المخزون تلقائياً على أمازون ونون لمنع البيع الزائد (Overselling)، وسحب الطلبات الواردة وحجز أصنافها فورياً.
          </p>
        </div>

        {saveSuccess ? (
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            تم حفظ الإعدادات بنجاح! ✅
          </span>
        ) : null}
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '10px',
        }}
      >
        <button
          type="button"
          onClick={() => { setActiveTab('amazon'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: activeTab === 'amazon' ? 800 : 500,
            background: activeTab === 'amazon' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'amazon' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>📦</span>
          <span>أمازون (Amazon SP-API)</span>
          {amazonCfg.enabled ? (
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('noon'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: activeTab === 'noon' ? 800 : 500,
            background: activeTab === 'noon' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'noon' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>🟡</span>
          <span>نون (Noon Marketplace)</span>
          {noonCfg.enabled ? (
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('inventory'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: activeTab === 'inventory' ? 800 : 500,
            background: activeTab === 'inventory' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'inventory' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>🔄</span>
          <span>مركز مزامنة المخزون والأكواد</span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '9999px',
              background: activeTab === 'inventory' ? '#ffffff' : '#e2e8f0',
              color: activeTab === 'inventory' ? '#170e5e' : '#475569',
              fontWeight: 700,
            }}
          >
            {mappings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('orders'); setTestResult(null); }}
          style={{
            border: 'none',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: activeTab === 'orders' ? 800 : 500,
            background: activeTab === 'orders' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'orders' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>🛒</span>
          <span>سحب ومحاكاة الطلبات الخارجية</span>
        </button>
      </div>

      {/* Test Result Banner */}
      {testResult ? (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            background: testResult.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
            color: testResult.success ? '#15803d' : '#b91c1c',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13.5px',
            fontWeight: 600,
          }}
        >
          <div>
            <span>{testResult.success ? '✅ ' : '⚠️ '}</span>
            <span>{testResult.message}</span>
            {testResult.accountName ? <span style={{ marginRight: '8px', opacity: 0.85 }}>({testResult.accountName})</span> : null}
          </div>
          {testResult.pingMs ? <span style={{ fontSize: '11.5px', opacity: 0.8 }}>زمن الاستجابة: {testResult.pingMs}ms</span> : null}
        </div>
      ) : null}

      {/* TAB 1: AMAZON */}
      {activeTab === 'amazon' ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                إعدادات الربط مع متجر أمازون (Amazon Selling Partner API)
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                اربط حساب البائع الخاص بك على أمازون لمزامنة الكميات وسحب الطلبات تلقائياً.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={amazonCfg.enabled}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
              />
              تفعيل قناة أمازون
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                معرّف البائع (Seller / Merchant ID) *
              </label>
              <input
                type="text"
                value={amazonCfg.sellerId}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, sellerId: e.target.value })}
                placeholder="مثال: A2XXXXXX5678"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                سوق أمازون المستهدف (Marketplace)
              </label>
              <select
                value={amazonCfg.marketplaceId}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, marketplaceId: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                  background: '#ffffff',
                }}
              >
                <option value="eg">أمازون مصر (Amazon.eg - EGP)</option>
                <option value="sa">أمازون السعودية (Amazon.sa - SAR)</option>
                <option value="ae">أمازون الإمارات (Amazon.ae - AED)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رمز التحديث السحابي (LWA Refresh Token)
              </label>
              <input
                type="password"
                value={amazonCfg.refreshToken}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, refreshToken: e.target.value })}
                placeholder="Atzr|IQEBLz4k6..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                نمط الشحن والتجهيز (Fulfillment Type)
              </label>
              <select
                value={amazonCfg.fulfillmentType}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, fulfillmentType: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                  background: '#ffffff',
                }}
              >
                <option value="fbm">FBM (شحن وتجهيز من مخزن التاجر الخاص)</option>
                <option value="fba">FBA (الشحن عبر مستودعات أمازون الرسمية)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={amazonCfg.autoSyncStock}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, autoSyncStock: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
              />
              تحديث المخزون فورياً على أمازون عند حدوث بيع محلي
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={amazonCfg.autoPullOrders}
                onChange={(e) => setAmazonCfg({ ...amazonCfg, autoPullOrders: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
              />
              سحب الطلبات تلقائياً وحجز الأصناف من المخزن
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button
              variant="secondary"
              onClick={() => testMutation.mutate('amazon')}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? 'جاري الفحص...' : 'فحص واختبار الاتصال ⚡'}
            </Button>
            <Button
              variant="primary"
              onClick={() => saveMutation.mutate({ amazon: amazonCfg })}
              disabled={saveMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات أمازون 💾'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* TAB 2: NOON */}
      {activeTab === 'noon' ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                إعدادات الربط مع متجر نون (Noon Marketplace API)
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                اربط حساب شريك نون (Noon Partner) لمزامنة الكميات والأسعار وسحب طلبيات نون ديركت.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={noonCfg.enabled}
                onChange={(e) => setNoonCfg({ ...noonCfg, enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
              />
              تفعيل قناة نون
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                معرّف التاجر (Noon Partner Identifier) *
              </label>
              <input
                type="text"
                value={noonCfg.merchantId}
                onChange={(e) => setNoonCfg({ ...noonCfg, merchantId: e.target.value })}
                placeholder="مثال: noon_partner_1234"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                دولة متجر نون (Noon Region)
              </label>
              <select
                value={noonCfg.marketplace}
                onChange={(e) => setNoonCfg({ ...noonCfg, marketplace: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                  background: '#ffffff',
                }}
              >
                <option value="eg">نون مصر (Noon Egypt - EGP)</option>
                <option value="sa">نون السعودية (Noon KSA - SAR)</option>
                <option value="ae">نون الإمارات (Noon UAE - AED)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                مفتاح الواجهة (API Key)
              </label>
              <input
                type="password"
                value={noonCfg.apiKey}
                onChange={(e) => setNoonCfg({ ...noonCfg, apiKey: e.target.value })}
                placeholder="key_live_noon_..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                نمط البيع (Fulfillment Model)
              </label>
              <select
                value={noonCfg.fulfillmentType}
                onChange={(e) => setNoonCfg({ ...noonCfg, fulfillmentType: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                  background: '#ffffff',
                }}
              >
                <option value="direct">Noon Direct / Cross-dock (الشحن من مستودعك الخاص)</option>
                <option value="fbn">FBN (الشحن عبر مستودعات Fulfilled by Noon)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={noonCfg.autoSyncStock}
                onChange={(e) => setNoonCfg({ ...noonCfg, autoSyncStock: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
              />
              تحديث المخزون فورياً على نون عند أي حركة بيع
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={noonCfg.autoPullOrders}
                onChange={(e) => setNoonCfg({ ...noonCfg, autoPullOrders: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
              />
              سحب وتأكيد طلبيات نون وحجزها في النظام آلياً
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button
              variant="secondary"
              onClick={() => testMutation.mutate('noon')}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? 'جاري الفحص...' : 'فحص واختبار الاتصال ⚡'}
            </Button>
            <Button
              variant="primary"
              onClick={() => saveMutation.mutate({ noon: noonCfg })}
              disabled={saveMutation.isPending}
              style={{ background: '#170e5e', color: '#ffffff' }}
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات نون 💾'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* TAB 3: INVENTORY SYNC & SKU MAPPING */}
      {activeTab === 'inventory' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>إجمالي الأصناف المربوطة</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {mappings.length}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>الأصناف المتزامنة بنجاح 🟢</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                {syncedCount}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600 }}>أصناف على أمازون 📦</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0369a1', marginTop: '4px' }}>
                {mappings.filter((m) => m.marketplace === 'amazon').length}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>أصناف على نون 🟡</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                {mappings.filter((m) => m.marketplace === 'noon').length}
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  جدول مطابقة الأكواد (SKU / ASIN Mapping) والمخزون الحي
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  ربط كل صنف في ERP بكود العرض المقابل له على أمازون أو نون لتحديث الكميات تلقائياً.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  onClick={() => syncMutation.mutate(undefined)}
                  disabled={syncMutation.isPending || !mappings.length}
                >
                  {syncMutation.isPending ? 'جاري المزامنة...' : 'مزامنة المخزون الآن ⚡'}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowAddModal(true)}
                  style={{ background: '#170e5e', color: '#ffffff' }}
                >
                  ربط صنف جديد (Add SKU) ➕
                </Button>
              </div>
            </div>

            {mappingsQuery.isLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                جاري تحميل جدول مطابقة الأكواد...
              </div>
            ) : !mappings.length ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔗</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#334155' }}>لم يتم ربط أي أصناف حتى الآن</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  اضغط على «ربط صنف جديد» لإدخال كود الصنف على أمازون (ASIN) أو نون (Partner SKU) وتفعيل حماية المخزون.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>اسم الصنف بالمنظومة</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>المنصة</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>كود المنصة (SKU / ASIN)</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>رصيد المستودع المحلي</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>الرصيد بالمنصة</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>حالة المزامنة</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>آخر تحديث</th>
                      <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.productName}</div>
                          {m.barcode ? <div style={{ fontSize: '11px', color: '#94a3b8' }}>باركود: {m.barcode}</div> : null}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {m.marketplace === 'amazon' ? (
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px' }}>
                              📦 أمازون
                            </span>
                          ) : (
                            <span style={{ background: '#fef9c3', color: '#854d0e', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px' }}>
                              🟡 نون
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#170e5e' }}>
                          {m.marketplaceSku}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>
                          {m.currentLocalStock ?? 0} قطعة
                        </td>
                        <td style={{ padding: '12px', fontWeight: 800, color: '#15803d' }}>
                          {m.lastSyncedStock ?? 0} قطعة
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            متزامن وآمن ✅
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '11.5px', color: '#64748b' }}>
                          {m.lastSyncedAt ? formatDateTimeArabic(m.lastSyncedAt) : '—'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <Button
                            variant="danger"
                            onClick={() => deleteMappingMutation.mutate(m.id)}
                            style={{ fontSize: '11px', padding: '3px 8px' }}
                          >
                            إلغاء الربط 🗑️
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* TAB 4: ORDERS PULL & SIMULATOR */}
      {activeTab === 'orders' ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              سحب ومحاكاة الطلبات الخارجية (Marketplace Order Ingestion & Stock Shield)
            </h4>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              عند ورود طلب من أمازون أو نون، يقوم النظام تلقائياً بخصم وحجز الكمية من المخزن المحلي لمنع بيعها في المحل أو على المتجر الإلكتروني.
            </p>
          </div>

          {simulatedOrderInfo ? (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '14px 18px',
                color: '#15803d',
                fontSize: '13.5px',
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>🎉 {simulatedOrderInfo}</div>
              <Button
                variant="secondary"
                onClick={() => setSimulatedOrderInfo(null)}
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                إغلاق
              </Button>
            </div>
          ) : null}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
          >
            {/* Amazon Simulator Card */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '18px',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📦</span>
                <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
                  محاكاة طلب جديد من سوق أمازون (Amazon Order)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                محاكاة وصول طلب FBM جديد من أمازون؛ سينشئ طلباً في `online_orders` برقم تسلسلي أمازون، ويحجز الصنف، ويخصم رصيد المخزن فورياً.
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                <Button
                  variant="primary"
                  onClick={() => simulateOrderMutation.mutate('amazon')}
                  disabled={simulateOrderMutation.isPending}
                  style={{ background: '#170e5e', color: '#ffffff', width: '100%' }}
                >
                  {simulateOrderMutation.isPending ? 'جاري المحاكاة والحجز...' : 'اختبار سحب طلب أمازون 🧪'}
                </Button>
              </div>
            </div>

            {/* Noon Simulator Card */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '18px',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🟡</span>
                <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
                  محاكاة طلب جديد من منصة نون (Noon Direct Order)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                محاكاة استلام طلب من منصة نون ديركت؛ يسحب بيانات العميل، ويثبت حالة الدفع المسبق، ويطلق إشعاراً للمالك على الواتساب.
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                <Button
                  variant="primary"
                  onClick={() => simulateOrderMutation.mutate('noon')}
                  disabled={simulateOrderMutation.isPending}
                  style={{ background: '#170e5e', color: '#ffffff', width: '100%' }}
                >
                  {simulateOrderMutation.isPending ? 'جاري المحاكاة والحجز...' : 'اختبار سحب طلب نون 🧪'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL: ADD SKU MAPPING */}
      {showAddModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            dir="rtl"
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              padding: '24px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                ربط صنف مع أمازون أو نون (Add Marketplace SKU)
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  معرّف الصنف في المنظومة (Product ID) *
                </label>
                <input
                  type="number"
                  value={newMapping.productId || ''}
                  onChange={(e) => setNewMapping({ ...newMapping, productId: parseInt(e.target.value, 10) || 0 })}
                  placeholder="مثال: 101"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  المنصة المستهدفة
                </label>
                <select
                  value={newMapping.marketplace}
                  onChange={(e) => setNewMapping({ ...newMapping, marketplace: e.target.value as any })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
                >
                  <option value="amazon">أمازون (Amazon ASIN)</option>
                  <option value="noon">نون (Noon Partner SKU)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  كود الصنف على المنصة (ASIN / Partner SKU) *
                </label>
                <input
                  type="text"
                  value={newMapping.marketplaceSku}
                  onChange={(e) => setNewMapping({ ...newMapping, marketplaceSku: e.target.value })}
                  placeholder={newMapping.marketplace === 'amazon' ? 'مثال: B08N5WRWNW' : 'مثال: NOON-SKU-9921'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  سعر مخصص على المنصة (اختياري)
                </label>
                <input
                  type="number"
                  value={newMapping.customPrice}
                  onChange={(e) => setNewMapping({ ...newMapping, customPrice: e.target.value })}
                  placeholder="اتركه فارغاً لاستخدام سعر البيع القطاعي للمنظومة"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!newMapping.productId || !newMapping.marketplaceSku) {
                    alert('يرجى إدخال معرّف الصنف وكود المنصة');
                    return;
                  }
                  addMappingMutation.mutate({
                    productId: newMapping.productId,
                    marketplace: newMapping.marketplace,
                    marketplaceSku: newMapping.marketplaceSku,
                    marketplaceTitle: newMapping.marketplaceTitle,
                    customPrice: newMapping.customPrice ? parseFloat(newMapping.customPrice) : undefined,
                    syncStock: newMapping.syncStock,
                    status: 'synced',
                  });
                }}
                disabled={addMappingMutation.isPending}
                style={{ background: '#170e5e', color: '#ffffff' }}
              >
                {addMappingMutation.isPending ? 'جاري الحفظ...' : 'حفظ وتفعيل الربط 🔗'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
