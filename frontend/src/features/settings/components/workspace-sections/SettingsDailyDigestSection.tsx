import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { SubmitButton } from '@/shared/components/submit-button';
import { toast } from '@/shared/components/system-alert';
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

import { useAuthStore } from '@/stores/auth-store';
import { resolveCurrentVertical } from '@/shared/verticals/vertical-scope';

export const SettingsDailyDigestSection: React.FC = () => {
  const { t } = useTranslation();
  const tenant = useAuthStore((s) => s.tenant);
  const vertical = resolveCurrentVertical(tenant);
  const isMaritime = vertical === 'maritime';
  const isContracting = vertical === 'contracting';

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
      toast.success('تم حفظ وتفعيل إعدادات الملخص اليومي الذكي بنجاح!');
      setTimeout(() => setSaveSuccess(false), 3500);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل حفظ إعدادات الملخص اليومي');
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
                  {t('settings.workspace_sections.settings_daily_digest_section.s0', "الملخص التنفيذي واللوجستي اليومي للمدير")}
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
                  {t('settings.workspace_sections.settings_daily_digest_section.s1', "واتساب مجدول")}
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
                {isMaritime
                  ? t('settings.workspace_sections.settings_daily_digest_section.s2', "إرسال تقرير ليلي تلقائي يجمع بين إيرادات ونولون الشحن، حركة دخول وخروج الحاويات، وبوالص التخليص المنجزة.")
                  : isContracting
                  ? t('settings.workspace_sections.settings_daily_digest_section.s3', "إرسال تقرير ليلي تلقائي يجمع بين مستخلصات الأعمال المعتمدة، تشوينات وتوريدات المواد للمواقع، وحالات الدفع.")
                  : t('settings.workspace_sections.settings_daily_digest_section.s4', "إرسال تقرير ليلي تلقائي يجمع بين مبيعات اليوم، تفاصيل أذون الصرف المنقولة للمحل، ونواقص المستودع الرئيسي.")}
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
              <span>{testMutation.isPending ? t('settings.workspace_sections.settings_daily_digest_section.s5', "جاري الإرسال...") : t('settings.workspace_sections.settings_daily_digest_section.s6', "إرسال ملخص تجريبي الآن")}</span>
            </Button>

            <SubmitButton
              type="button"
              onClick={handleSave}
              isPending={saveMutation.isPending}
              isSuccess={saveSuccess}
              idleText={t('settings.workspace_sections.settings_daily_digest_section.s9', "حفظ الإعدادات")}
              pendingText={t('settings.workspace_sections.settings_daily_digest_section.s7', "جاري الحفظ...")}
              successText={t('settings.workspace_sections.settings_daily_digest_section.s8', "تم الحفظ بنجاح")}
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
              }}
            />
          </div>

          {saveSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '8px',
                color: '#15803d',
                fontSize: '12.5px',
                fontWeight: 800,
                marginTop: '10px',
                boxShadow: '0 1px 4px rgba(22, 163, 74, 0.12)',
              }}
            >
              <CheckCircleIcon size={16} color="#16a34a" />
              <span>تم حفظ إعدادات الملخص اليومي بنجاح! سيتم إرسال التقارير في الموعد المحدد.</span>
            </div>
          )}
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
                  ? t('settings.workspace_sections.settings_daily_digest_section.s10', "تم إرسال رسالة الملخص اليومي التجريبية بنجاح إلى رقم الواتساب!")
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
              {t('settings.workspace_sections.settings_daily_digest_section.s11', "خيارات الجدولة والإرسال")}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{t('settings.workspace_sections.settings_daily_digest_section.s12', "إعدادات التوقيت والمحتوى")}</span>
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
                {t('settings.workspace_sections.settings_daily_digest_section.s13', "تفعيل التقرير الليلي المجدول")}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                {t('settings.workspace_sections.settings_daily_digest_section.s14', "إرسال الرسالة آلياً في الوقت المحدد دون تدخل بشري")}
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
              {t('settings.workspace_sections.settings_daily_digest_section.s15', "رقم هاتف الواتساب للمدير / المالك:")}
            </label>
            <input
              type="text"
              value={config.phone}
              onChange={(e) => setConfig((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder={t('settings.workspace_sections.settings_daily_digest_section.s16', "010XXXXXXXX أو 201XXXXXXXXX")}
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
              {t('settings.workspace_sections.settings_daily_digest_section.s17', "يُترك فارغاً لاستخدام رقم هاتف المالك المسجل في بيانات المنشأة تلقائياً.")}
            </p>
          </div>

          {/* Time of Day Input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {t('settings.workspace_sections.settings_daily_digest_section.s18', "موعد الإرسال اليومي (توقيت محلي):")}
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
              {t('settings.workspace_sections.settings_daily_digest_section.s19', "التوقيت الموصى به: 11:30 مساءً أو 12:00 منتصف الليل بعد إغلاق كافة الورديات.")}
            </p>
          </div>

          {/* Section Checkboxes */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
              {t('settings.workspace_sections.settings_daily_digest_section.s20', "محتويات وأقسام التقرير المطلوب تضمينها:")}
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
                      {isMaritime
                        ? t('settings.workspace_sections.settings_daily_digest_section.s21', "بلوك إيرادات ونولون الشحن والخدمات الملاحية")
                        : isContracting
                        ? t('settings.workspace_sections.settings_daily_digest_section.s22', "بلوك المستخلصات وإيرادات الأعمال المعتمدة")
                        : t('settings.workspace_sections.settings_daily_digest_section.s23', "بلوك المبيعات والنشاط اليومي")}
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    {isMaritime
                      ? t('settings.workspace_sections.settings_daily_digest_section.s24', "إجمالي إيرادات النولون، بوالص الشحن المصدرة، تحصيلات الخطوط الملاحية، ومبالغ التحصيل بالعملات.")
                      : isContracting
                      ? t('settings.workspace_sections.settings_daily_digest_section.s25', "إجمالي المستخلصات المعتمدة، الدفعات المستلمة، والاستقطاعات التعاقدية المنفذة اليوم.")
                      : t('settings.workspace_sections.settings_daily_digest_section.s26', "إجمالي المبيعات، عدد الفواتير، السيولة النقدية والشبكة، والأصناف الأكثر رواجاً.")}
                  </span>
                </div>
              </label>

              {/* Option 2: Transfers / Operations */}
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
                      {isMaritime
                        ? t('settings.workspace_sections.settings_daily_digest_section.s27', "بلوك حركة تداول الحاويات وأوامر التشغيل الملاحية")
                        : isContracting
                        ? t('settings.workspace_sections.settings_daily_digest_section.s28', "بلوك أذون تشوين وتوريد المواد للمواقع")
                        : t('settings.workspace_sections.settings_daily_digest_section.s29', "بلوك أذون الصرف والإمداد التفصيلية للمحل")}
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    {isMaritime
                      ? t('settings.workspace_sections.settings_daily_digest_section.s30', "كشف تفصيلي بالحاويات المستلمة والمشحونة والمفرغة بالموانئ والمحطات المعتمدة وأذون التسليم.")
                      : isContracting
                      ? t('settings.workspace_sections.settings_daily_digest_section.s31', "كشف تفصيلي بالمواد الإنشائية الموردة للمشروع (حديد، أسمنت، خرسانة) والمشرف المستلم.")
                      : t('settings.workspace_sections.settings_daily_digest_section.s32', "كشف تفصيلي بكل صنف تم صرفه ونقله من المستودع للمحل وكميته الدقيقة واسم المشرف المعتمد.")}
                  </span>
                </div>
              </label>

              {/* Option 3: Shortages / Demurrage */}
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
                      {isMaritime
                        ? t('settings.workspace_sections.settings_daily_digest_section.s33', "بلوك تنبيهات فترات السماح وغرامات الحاويات (Demurrage)")
                        : isContracting
                        ? t('settings.workspace_sections.settings_daily_digest_section.s34', "بلوك تنبيهات استحقاقات رد الدفعة المقدمة والضمان")
                        : t('settings.workspace_sections.settings_daily_digest_section.s35', "بلوك نواقص المستودع الحرج")}
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    {isMaritime
                      ? t('settings.workspace_sections.settings_daily_digest_section.s36', "الحاويات التي أوشكت فترات سماحها على النفاد لتفادي احتساب غرامات أرضيات وتأخير الخطوط.")
                      : isContracting
                      ? t('settings.workspace_sections.settings_daily_digest_section.s37', "مواعيد انتهاء خطابات الضمان البنكية واستحقاق رد محجوزات ضمان الأعمال.")
                      : t('settings.workspace_sections.settings_daily_digest_section.s38', "قائمة بالأصناف التي نفدت أو أوشكت على النفاد في المستودع لإصدار أمر شراء للموردين.")}
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
              {t('settings.workspace_sections.settings_daily_digest_section.s39', "معاينة الرسالة الحية على الواتساب")}
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
              {t('settings.workspace_sections.settings_daily_digest_section.s40', "تحديث فوري")}
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
                    {t('settings.workspace_sections.settings_daily_digest_section.s41', "بوت الإدارة والملخص اليومي")}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#a7f3d0' }}>
                    {t('settings.workspace_sections.settings_daily_digest_section.s42', "متصل الآن عبر واتساب")}
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
                    {isMaritime
                      ? t('settings.workspace_sections.settings_daily_digest_section.s43', "الملخص التنفيذي لشحن البضائع والتوكيلات الملاحية")
                      : isContracting
                      ? t('settings.workspace_sections.settings_daily_digest_section.s44', "الملخص التنفيذي للمشاريع والمقاولات")
                      : t('settings.workspace_sections.settings_daily_digest_section.s45', "الملخص التنفيذي واللوجستي اليومي")}
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {t('settings.workspace_sections.settings_daily_digest_section.s46', "اليوم")}
                  </span>
                </div>

                {/* Sales / Revenues Section */}
                {config.includeSales ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12.5px' }}>
                      {isMaritime ? t('settings.workspace_sections.settings_daily_digest_section.s47', "إيرادات النولون والخدمات الملاحية:") : isContracting ? t('settings.workspace_sections.settings_daily_digest_section.s48', "المستخلصات والدفعات المعتمدة:") : t('settings.workspace_sections.settings_daily_digest_section.s49', "المبيعات والإيرادات:")}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#475569', paddingRight: '8px', lineHeight: '1.6' }}>
                      {isMaritime ? (
                        <>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s50', "• إجمالي نولون الشحن:")} <b dir="ltr">$24,500</b> + <b>{t('settings.workspace_sections.settings_daily_digest_section.s51', "185,000 ج.م")}</b> {t('settings.workspace_sections.settings_daily_digest_section.s52', "(12 بوليصة)")}</div>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s53', "• تحصيلات خطوط ملاحية:")} <b dir="ltr">$18,200</b></div>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s54', "• رسوم تفريغ وتخليص:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s55', "42,000 ج.م")}</b></div>
                          <div style={{ color: '#059669', fontWeight: 600 }}>
                            {t('settings.workspace_sections.settings_daily_digest_section.s56', "الأكثر نشاطاً: خط الشرق الأقصى (CMA CGM)، ميناء دمياط")}
                          </div>
                        </>
                      ) : isContracting ? (
                        <>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s57', "• إجمالي المستخلصات المعتمدة:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s58', "1,450,000 ج.م")}</b></div>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s59', "• دفعات محصلة بالحساب البنكي:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s60', "980,000 ج.م")}</b></div>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s61', "• استقطاعات دفعة مقدمة وضمان:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s62', "217,500 ج.م")}</b></div>
                          <div style={{ color: '#059669', fontWeight: 600 }}>
                            {t('settings.workspace_sections.settings_daily_digest_section.s63', "المشروع الأكثر إنجازاً: أبراج العاصمة الإدارية")}
                          </div>
                        </>
                      ) : (
                        <>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s64', "• إجمالي المبيعات:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s65', "42,850 ج.م")}</b> {t('settings.workspace_sections.settings_daily_digest_section.s66', "(58 فاتورة)")}</div>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s67', "• نقدية بالصندوق (كاش):")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s68', "28,150 ج.م")}</b></div>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s69', "• شبكة وماكينات دفع:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s70', "11,500 ج.م")}</b></div>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s71', "• إنستاباي ومحافظ:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s72', "3,200 ج.م")}</b></div>
                          <div style={{ color: '#059669', fontWeight: 600 }}>
                            {t('settings.workspace_sections.settings_daily_digest_section.s73', "الأكثر مبيعاً: زيت عافية (36 ق)، شاي (24 ق)")}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Transfers / Logistics Section */}
                {config.includeTransfers ? (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12.5px' }}>
                      {isMaritime ? t('settings.workspace_sections.settings_daily_digest_section.s74', "حركة تداول الحاويات وأوامر التشغيل:") : isContracting ? t('settings.workspace_sections.settings_daily_digest_section.s75', "أذون توريد وتشوين المواد للمواقع:") : t('settings.workspace_sections.settings_daily_digest_section.s76', "أذون الصرف والإمداد للمحل:")}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#475569', paddingRight: '8px', lineHeight: '1.6' }}>
                      {isMaritime ? (
                        <>
                          <div style={{ fontWeight: 700, color: '#4338ca' }}>
                            {t('settings.workspace_sections.settings_daily_digest_section.s77', "أمر تشغيل #JOB-260914-0012 بميناء الإسكندرية:")}
                          </div>
                          <div style={{ paddingRight: '6px' }}>
                            <div>{t('settings.workspace_sections.settings_daily_digest_section.s78', "• حاويات 40HQ مفرغة بالمحطة:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s79', "14 حاوية")}</b></div>
                            <div>{t('settings.workspace_sections.settings_daily_digest_section.s80', "• حاويات 20FT مشحونة بورسعيد:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s81', "22 حاوية")}</b></div>
                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                              {t('settings.workspace_sections.settings_daily_digest_section.s82', "(إجمالي الحاويات: 36 حاوية TEU - المشرف: م/ طارق كمال)")}
                            </div>
                          </div>
                        </>
                      ) : isContracting ? (
                        <>
                          <div style={{ fontWeight: 700, color: '#4338ca' }}>
                            {t('settings.workspace_sections.settings_daily_digest_section.s83', "إذن تشوين #MAT-260914-004 بموقع البرج A:")}
                          </div>
                          <div style={{ paddingRight: '6px' }}>
                            <div>{t('settings.workspace_sections.settings_daily_digest_section.s84', "• حديد تسليح عز 16مم:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s85', "35 طن")}</b></div>
                            <div>{t('settings.workspace_sections.settings_daily_digest_section.s86', "• أسمنت بورتلاندي فائق:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s87', "50 طن")}</b></div>
                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                              {t('settings.workspace_sections.settings_daily_digest_section.s88', "(المشرف المستلم: مهندس التنفيذ / حسام علي)")}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 700, color: '#4338ca' }}>
                            {t('settings.workspace_sections.settings_daily_digest_section.s89', "إذن رقم #TR-882 إلى صالة المحل:")}
                          </div>
                          <div style={{ paddingRight: '6px' }}>
                            <div>{t('settings.workspace_sections.settings_daily_digest_section.s90', "• زيت عافية ذرة:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s91', "24 قطعة")}</b> {t('settings.workspace_sections.settings_daily_digest_section.s92', "(2 كرتونة)")}</div>
                            <div>{t('settings.workspace_sections.settings_daily_digest_section.s93', "• شاي العروسة 250جم:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s94', "15 قطعة")}</b></div>
                            <div>{t('settings.workspace_sections.settings_daily_digest_section.s95', "• سكر الأسرة:")} <b>{t('settings.workspace_sections.settings_daily_digest_section.s96', "25 قطعة")}</b></div>
                            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                              {t('settings.workspace_sections.settings_daily_digest_section.s97', "(إجمالي إذن الصرف: 64 قطعة - المشرف: أحمد فتحي)")}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Shortages / Demurrage Section */}
                {config.includeShortages ? (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12.5px' }}>
                      {isMaritime ? t('settings.workspace_sections.settings_daily_digest_section.s98', "تنبيهات فترات السماح وغرامات الحاويات (Demurrage):") : isContracting ? t('settings.workspace_sections.settings_daily_digest_section.s99', "تنبيهات خطابات الضمان واستحقاقات الرد:") : t('settings.workspace_sections.settings_daily_digest_section.s100', "نواقص المستودع التي تحتاج شراء:")}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#475569', paddingRight: '8px', lineHeight: '1.6' }}>
                      {isMaritime ? (
                        <>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s101', "• حاوية CMAU9283719:")} <span style={{ color: '#dc2626', fontWeight: 800 }}>{t('settings.workspace_sections.settings_daily_digest_section.s102', "باقي 2 يوم سماح (ميناء السخنة)")}</span></div>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s103', "• حاوية MSCU4829104:")} <span style={{ color: '#d97706', fontWeight: 800 }}>{t('settings.workspace_sections.settings_daily_digest_section.s104', "باقي 1 يوم سماح (ميناء دمياط)")}</span></div>
                        </>
                      ) : isContracting ? (
                        <>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s105', "• ضمان بنكي نهائي:")} <span style={{ color: '#dc2626', fontWeight: 800 }}>{t('settings.workspace_sections.settings_daily_digest_section.s106', "يستحق التجديد خلال 5 أيام")}</span></div>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s107', "• رد محجوز ضمان أعمال:")} <span style={{ color: '#059669', fontWeight: 800 }}>{t('settings.workspace_sections.settings_daily_digest_section.s108', "مستحق للصرف (مستخلص 4)")}</span></div>
                        </>
                      ) : (
                        <>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s109', "• سكر الأسرة:")} <span style={{ color: '#dc2626', fontWeight: 800 }}>{t('settings.workspace_sections.settings_daily_digest_section.s110', "نفد تماماً (0)")}</span></div>
                          <div>{t('settings.workspace_sections.settings_daily_digest_section.s111', "• أرز الضحى:")} <span style={{ color: '#d97706', fontWeight: 800 }}>{t('settings.workspace_sections.settings_daily_digest_section.s112', "متبقي 5 أكياس")}</span></div>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {!config.includeSales && !config.includeTransfers && !config.includeShortages ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    {t('settings.workspace_sections.settings_daily_digest_section.s113', "لم يتم تحديد أي أقسام للتضمين في التقرير. فعّل قسماً واحداً على الأقل لمعاينة المحتوى.")}
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
                  <span>{t('settings.workspace_sections.settings_daily_digest_section.s114', "نظام Z-Systems المؤتمت")}</span>
                  <span style={{ color: '#0284c7', fontWeight: 700 }}>{t('settings.workspace_sections.settings_daily_digest_section.s115', "تمت القراءة")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
