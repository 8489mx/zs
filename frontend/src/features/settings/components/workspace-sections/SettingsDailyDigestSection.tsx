import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { dailyDigestApi, DailyDigestConfig } from '@/features/settings/api/daily-digest.api';
import {
  ClockIcon,
  SmartphoneIcon,
  XIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  TruckIcon,
  AlertTriangleIcon,
} from '@/shared/components/icons/AppIcons';

export const SettingsDailyDigestSection: React.FC = () => {
  const [config, setConfig] = useState<DailyDigestConfig>({
    enabled: true,
    phone: '',
    timeOfDay: '23:30',
    includeSales: true,
    includeTransfers: true,
    includeShortages: true,
  });

  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; text?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const query = useQuery({
    queryKey: ['daily-digest-config'],
    queryFn: dailyDigestApi.getConfig,
  });

  useEffect(() => {
    if (query.data) {
      setConfig(query.data);
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: dailyDigestApi.saveConfig,
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const testMutation = useMutation({
    mutationFn: (phone?: string) => dailyDigestApi.sendTest(phone),
    onSuccess: (res) => {
      setTestResult(res);
    },
    onError: (err: any) => {
      setTestResult({ success: false, message: err?.message || 'فشل إرسال التقرير التجريبي' });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleSendTest = () => {
    setTestResult(null);
    testMutation.mutate(config.phone);
  };

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Title & Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                flexShrink: 0,
              }}
            >
              <ClockIcon size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  الملخص التنفيذي واللوجستي اليومي للمدير
                </h2>
                <span
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: config.enabled ? '#10b981' : '#94a3b8',
                    }}
                  />
                  واتساب مجدول
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
                إرسال تقرير ليلي تلقائي يجمع بين مبيعات اليوم، تفاصيل أذون الصرف المنقولة للمحل، ونواقص المستودع الرئيسي
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={handleSendTest}
              disabled={testMutation.isPending}
              style={{
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0 16px',
                height: '38px',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <SmartphoneIcon size={15} color="#475569" />
              <span>{testMutation.isPending ? 'جاري الإرسال...' : 'إرسال ملخص تجريبي الآن'}</span>
            </Button>

            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              style={{
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0 22px',
                height: '38px',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {saveSuccess ? <CheckCircleIcon size={15} color="#ffffff" /> : null}
              <span>{saveMutation.isPending ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ بنجاح' : 'حفظ الإعدادات'}</span>
            </Button>
          </div>
        </div>

        {/* Test Result Alert Banner */}
        {testResult ? (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: testResult.success ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
              color: testResult.success ? '#15803d' : '#b91c1c',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {testResult.success ? (
                <CheckCircleIcon size={16} color="#15803d" />
              ) : (
                <AlertTriangleIcon size={16} color="#b91c1c" />
              )}
              <span>
                {testResult.success
                  ? 'تم إرسال رسالة الملخص اليومي التجريبية بنجاح إلى رقم الواتساب!'
                  : testResult.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <XIcon size={15} />
            </button>
          </div>
        ) : null}
      </div>

      {/* 2. Symmetrical 2-Column Responsive Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '20px',
          alignItems: 'start',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Column 1: Settings Form */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div
            style={{
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              خيارات الجدولة والإرسال
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>إعدادات التوقيت والمحتوى</span>
          </div>

          {/* Toggle Enable */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: config.enabled ? '#f8fafc' : '#fef2f2',
              border: `1px solid ${config.enabled ? '#e2e8f0' : '#fecaca'}`,
              borderRadius: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                تفعيل التقرير الليلي المجدول
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                إرسال الرسالة آلياً في الوقت المحدد دون تدخل بشري
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
              style={{
                width: '46px',
                height: '26px',
                borderRadius: '999px',
                background: config.enabled ? '#170e5e' : '#cbd5e1',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s ease',
                  transform: config.enabled ? 'translateX(-20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          {/* Phone Input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              رقم هاتف الواتساب للمدير / المالك:
            </label>
            <input
              type="text"
              value={config.phone}
              onChange={(e) => setConfig((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="010XXXXXXXX أو 201XXXXXXXXX"
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 14px',
                fontSize: '13.5px',
                fontFamily: 'monospace',
                color: '#0f172a',
                background: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '5px 0 0 0' }}>
              يُترك فارغاً لاستخدام رقم هاتف المالك المسجل في بيانات المنشأة تلقائياً.
            </p>
          </div>

          {/* Time of Day Input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              موعد الإرسال اليومي (توقيت محلي):
            </label>
            <input
              type="time"
              value={config.timeOfDay}
              onChange={(e) => setConfig((prev) => ({ ...prev, timeOfDay: e.target.value }))}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 14px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0f172a',
                background: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '5px 0 0 0' }}>
              التوقيت الموصى به: 11:30 مساءً أو 12:00 منتصف الليل بعد إغلاق كافة الورديات.
            </p>
          </div>

          {/* Section Checkboxes */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
              محتويات وأقسام التقرير المطلوب تضمينها:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option 1: Sales */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${config.includeSales ? '#93c5fd' : '#e2e8f0'}`,
                  background: config.includeSales ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={config.includeSales}
                  onChange={(e) => setConfig((prev) => ({ ...prev, includeSales: e.target.checked }))}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#170e5e',
                    marginTop: '2px',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUpIcon size={16} color="#2563eb" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      بلوك المبيعات والنشاط اليومي
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    إجمالي المبيعات، عدد الفواتير، السيولة النقدية والشبكة، والأصناف الأكثر رواجاً.
                  </span>
                </div>
              </label>

              {/* Option 2: Transfers */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${config.includeTransfers ? '#c4b5fd' : '#e2e8f0'}`,
                  background: config.includeTransfers ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={config.includeTransfers}
                  onChange={(e) => setConfig((prev) => ({ ...prev, includeTransfers: e.target.checked }))}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#170e5e',
                    marginTop: '2px',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TruckIcon size={16} color="#7c3aed" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      بلوك أذون الصرف والإمداد التفصيلية للمحل
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    كشف تفصيلي بكل صنف تم صرفه ونقله من المستودع للمحل وكميته الدقيقة واسم المشرف المعتمد.
                  </span>
                </div>
              </label>

              {/* Option 3: Shortages */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${config.includeShortages ? '#fdba74' : '#e2e8f0'}`,
                  background: config.includeShortages ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={config.includeShortages}
                  onChange={(e) => setConfig((prev) => ({ ...prev, includeShortages: e.target.checked }))}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#170e5e',
                    marginTop: '2px',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangleIcon size={16} color="#ea580c" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      بلوك نواقص المستودع الحرج
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    قائمة بالأصناف التي نفدت أو أوشكت على النفاد في المستودع لإصدار أمر شراء للموردين.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Column 2: Live WhatsApp Message Simulator */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              معاينة الرسالة الحية على الواتساب
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#047857',
                background: '#ecfdf5',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #a7f3d0',
              }}
            >
              تحديث فوري
            </span>
          </div>

          {/* Simulator Container */}
          <div
            style={{
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            }}
          >
            {/* WhatsApp App Header Bar */}
            <div
              style={{
                background: '#075e54',
                color: '#ffffff',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '15px',
                    color: '#ffffff',
                  }}
                >
                  Z
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                    بوت الإدارة والملخص اليومي
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#a7f3d0' }}>
                    متصل الآن عبر واتساب
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  color: '#e2e8f0',
                }}
              >
                {config.timeOfDay || '23:30'}
              </span>
            </div>

            {/* Chat Body (Authentic Wallpaper Background) */}
            <div
              style={{
                background: '#efeae2',
                padding: '16px',
                minHeight: '340px',
                boxSizing: 'border-box',
              }}
            >
              {/* WhatsApp Speech Bubble */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '12px 0 12px 12px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  fontSize: '12.5px',
                  lineHeight: '1.7',
                  color: '#0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Bubble Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#075e54', fontSize: '13px' }}>
                    الملخص التنفيذي واللوجستي اليومي
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    اليوم
                  </span>
                </div>

                {/* Sales Section */}
                {config.includeSales ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12.5px' }}>
                      المبيعات والإيرادات:
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#475569', paddingRight: '8px', lineHeight: '1.6' }}>
                      <div>• إجمالي المبيعات: <b>42,850 ج.م</b> (58 فاتورة)</div>
                      <div>• نقدية بالصندوق (كاش): <b>28,150 ج.م</b></div>
                      <div>• شبكة وماكينات دفع: <b>11,500 ج.م</b></div>
                      <div>• إنستاباي ومحافظ: <b>3,200 ج.م</b></div>
                      <div style={{ color: '#059669', fontWeight: 600 }}>
                        الأكثر مبيعاً: زيت عافية (36 ق)، شاي (24 ق)
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Transfers Section */}
                {config.includeTransfers ? (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12.5px' }}>
                      أذون الصرف والإمداد للمحل:
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#475569', paddingRight: '8px', lineHeight: '1.6' }}>
                      <div style={{ fontWeight: 700, color: '#4338ca' }}>
                        إذن رقم #TR-882 إلى صالة المحل:
                      </div>
                      <div style={{ paddingRight: '6px' }}>
                        <div>• زيت عافية ذرة: <b>24 قطعة</b> (2 كرتونة)</div>
                        <div>• شاي العروسة 250جم: <b>15 قطعة</b></div>
                        <div>• سكر الأسرة: <b>25 قطعة</b></div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                          (إجمالي إذن الصرف: 64 قطعة - المشرف: أحمد فتحي)
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Shortages Section */}
                {config.includeShortages ? (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12.5px' }}>
                      نواقص المستودع التي تحتاج شراء:
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#475569', paddingRight: '8px', lineHeight: '1.6' }}>
                      <div>• سكر الأسرة: <span style={{ color: '#dc2626', fontWeight: 800 }}>نفد تماماً (0)</span></div>
                      <div>• أرز الضحى: <span style={{ color: '#d97706', fontWeight: 800 }}>متبقي 5 أكياس</span></div>
                    </div>
                  </div>
                ) : null}

                {!config.includeSales && !config.includeTransfers && !config.includeShortages ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    لم يتم تحديد أي أقسام للتضمين في التقرير. فعّل قسماً واحداً على الأقل لمعاينة المحتوى.
                  </div>
                ) : null}

                {/* Bubble Footer */}
                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10.5px',
                    color: '#94a3b8',
                  }}
                >
                  <span>نظام Z-Systems المؤتمت</span>
                  <span style={{ color: '#0284c7', fontWeight: 700 }}>تمت القراءة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
