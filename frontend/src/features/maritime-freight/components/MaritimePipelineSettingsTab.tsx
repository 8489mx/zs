import { useState, useEffect } from 'react';
import {
  maritimeApi,
  MaritimePipelineConfig,
} from '../api/maritime-freight.api';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  TrendingUpIcon,
  SendIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ZapIcon,
  UsersIcon,
  MessageSquareIcon,
  MailIcon,
  CheckIcon,
} from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { Field } from '@/shared/ui/field';
import { toast } from '@/shared/components/system-alert';

const DEFAULT_CONFIG: MaritimePipelineConfig = {
  automationMode: 'hybrid',
  defaultMarginType: 'fixed',
  defaultMarginValue: 200,
  marginFloor: 150,
  defaultExchangeRate: 48.5,
  rfqCutOffHoursStandard: 24,
  rfqCutOffHoursUrgent: 6,
  earlyAwardingEnabled: true,
  earlyAwardingMinFreeDays: 14,
  requireManualRfqDispatch: false,
  requireManualAwardAndMargin: true,
  requireManualQuoteDispatch: false,
  autoSendWhatsAppQuote: true,
  autoSendEmailQuote: true,
};

export function MaritimePipelineSettingsTab() {
  const [config, setConfig] = useState<MaritimePipelineConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningTrigger, setRunningTrigger] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await maritimeApi.getPipelineSettings();
      if (data) {
        setConfig(data);
      }
    } catch (err: any) {
      console.error('Failed to load pipeline settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setFeedback(null);
      const updated = await maritimeApi.savePipelineSettings(config);
      setConfig(updated);
      setFeedback({
        type: 'success',
        message: 'تم حفظ وتفعيل قواعد مسار الأتمتة وهامش الربح بنجاح.',
      });
      toast.success('تم حفظ قواعد الأتمتة الملاحية بنجاح', undefined, 2500);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'فشل حفظ قواعد الأتمتة الملاحية',
      });
      toast.error('فشل حفظ إعدادات الأتمتة');
    } finally {
      setSaving(false);
    }
  };

  const handleRunPipelineNow = async () => {
    try {
      setRunningTrigger(true);
      const res = await maritimeApi.triggerPipeline();
      const summaryMsg = `تم فحص ${res.processedRfqs} طلب: تمت ترسية ${res.awardedCount} وإصدار ${res.quotesGenerated} عرض سعر بنجاح.`;
      toast.success(summaryMsg, 'تشغيل مسار الأتمتة اللوجستية');
      if (res.details && res.details.length > 0) {
        setFeedback({
          type: 'success',
          message: summaryMsg + ' ' + res.details.join(' | '),
        });
      }
    } catch (err: any) {
      toast.error(err?.message || 'فشل تشغيل فحص الأتمتة');
    } finally {
      setRunningTrigger(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#ffffff', padding: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
        جاري تحميل قواعد مسار الأتمتة...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* هيدر البطاقة والأزرار الإجرائية */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#170e5e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ZapIcon size={18} />
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#170e5e', margin: 0 }}>
                محرك مسارات الأتمتة الملاحية وهوامش الربح
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
              التحكم في درجة أتمتة دورة الشحن، ضبط هوامش الربح الافتراضية، مؤقت مهل عروض تسعير الخطوط، ومحطات التوقف والمراجعة البشرية.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              disabled={runningTrigger}
              onClick={handleRunPipelineNow}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                fontWeight: 700,
                background: '#f8fafc',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                cursor: runningTrigger ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
              }}
              title="فحص فوري لجميع طلبات التسعير المفتوحة وترسية المكتمل منها حالاً"
            >
              <RefreshCwIcon size={15} style={{ animation: runningTrigger ? 'spin 1s linear infinite' : 'none' }} />
              <span>{runningTrigger ? 'جاري الفحص والترسية...' : 'تشغيل فحص الأتمتة الآن (Run Pipeline)'}</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              style={{
                height: '38px',
                padding: '0 20px',
                borderRadius: '8px',
                fontWeight: 700,
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8125rem',
                boxShadow: '0 2px 4px rgba(23, 14, 94, 0.15)',
              }}
            >
              <CheckIcon size={16} />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ قواعد الأتمتة'}</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: feedback.type === 'success' ? '#166534' : '#991b1b',
            }}
          >
            {feedback.type === 'success' ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* بطاقة 1: النمط التشغيلي العام للمنظومة */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#170e5e', fontWeight: 700, fontSize: '0.92rem' }}>
          <ShieldCheckIcon size={18} />
          <span>1. النمط التشغيلي العام للمنشأة (Master Automation Mode)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {[
            {
              id: 'full_autonomous',
              title: 'أتمتة كاملة ذاتية (Full Zero-Touch)',
              desc: 'الدورة تدور ذاتياً بنسبة 100%: جمع العروض، فرز أفضل قيمة، تطبيق الهامش الافتراضي، وإصدار وإرسال العرض للعميل دون أي تدخل يدوي.',
              badge: 'أقصى سرعة',
              badgeBg: '#dcfce7',
              badgeColor: '#15803d',
            },
            {
              id: 'hybrid',
              title: 'هجين ذكي (Smart Hybrid)',
              desc: 'السستم يجمع العروض ويرتبها آلياً، لكنه يقف عند محطة اعتماد الهامش أو مراجعة العرض النهائي لإعطاء الموظف القرار الأخير.',
              badge: 'الموصى به',
              badgeBg: '#eff6ff',
              badgeColor: '#1d4ed8',
            },
            {
              id: 'manual',
              title: 'تحكم يدوي كلاسيكي (Manual Control)',
              desc: 'إيقاف الأتمتة الذاتية بالكامل، وتتطلب كل خطوة ضغطات يدوية منفصلة من موظف العمليات والمبيعات.',
              badge: 'تقليدي',
              badgeBg: '#f1f5f9',
              badgeColor: '#475569',
            },
          ].map((mode) => {
            const isSelected = config.automationMode === mode.id;
            return (
              <div
                key={mode.id}
                onClick={() => {
                  if (mode.id === 'full_autonomous') {
                    setConfig({
                      ...config,
                      automationMode: 'full_autonomous',
                      requireManualAwardAndMargin: false,
                      requireManualQuoteDispatch: false,
                    });
                  } else if (mode.id === 'hybrid') {
                    setConfig({
                      ...config,
                      automationMode: 'hybrid',
                      requireManualAwardAndMargin: true,
                    });
                  } else {
                    setConfig({
                      ...config,
                      automationMode: 'manual',
                      requireManualAwardAndMargin: true,
                      requireManualQuoteDispatch: true,
                    });
                  }
                }}
                style={{
                  border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  background: isSelected ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isSelected ? '#170e5e' : '#1e293b' }}>
                    {mode.title}
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: mode.badgeBg, color: mode.badgeColor }}>
                    {mode.badge}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                  {mode.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* بطاقة 2: قواعد هامش الربح الآلي */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#170e5e', fontWeight: 700, fontSize: '0.92rem' }}>
          <TrendingUpIcon size={18} />
          <span>2. قواعد هامش الربح الآلي (Autonomous Margin & Markup Engine)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <Field label="نوع الهامش الافتراضي المطبق آلياً *">
            <CustomSelect
              value={config.defaultMarginType}
              onChange={(val) => setConfig({ ...config, defaultMarginType: (val || 'fixed') as any })}
              options={[
                { value: 'fixed', label: 'مبلغ مقطوع ثابت لكل حاوية ($ Fixed per Container)' },
                { value: 'percentage', label: 'نسبة مئوية مضافة من النولون (% Markup Rate)' },
              ]}
            />
          </Field>

          <Field label={config.defaultMarginType === 'fixed' ? 'قيمة الربح الثابت للحاوية ($ USD) *' : 'نسبة الربح المئوية المضافة (%) *'}>
            <input
              type="number"
              min={1}
              value={config.defaultMarginValue}
              onChange={(e) => setConfig({ ...config, defaultMarginValue: parseFloat(e.target.value) || 0 })}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="الحد الأدنى للأمان الربحي للحاوية ($ Margin Floor) *">
            <input
              type="number"
              min={0}
              value={config.marginFloor}
              onChange={(e) => setConfig({ ...config, marginFloor: parseFloat(e.target.value) || 0 })}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="سعر الصرف الافتراضي (USD / EGP) *">
            <input
              type="number"
              step="0.1"
              min={1}
              value={config.defaultExchangeRate}
              onChange={(e) => setConfig({ ...config, defaultExchangeRate: parseFloat(e.target.value) || 48.5 })}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.85rem' }}
            />
          </Field>
        </div>

        <div style={{ marginTop: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569' }}>
          <strong>معادلة التسعير الآلية:</strong> إذا جاء أفضل عرض نولون بحري بـ <strong>$1,800</strong>، سيتم تطبيق هامش {config.defaultMarginType === 'fixed' ? `$${config.defaultMarginValue}` : `${config.defaultMarginValue}%`} ليصبح السعر النهائي المعروض للعميل هو <strong>${config.defaultMarginType === 'fixed' ? (1800 + config.defaultMarginValue).toLocaleString() : (1800 * (1 + config.defaultMarginValue / 100)).toLocaleString()}</strong> (مع ضمان ألا يقل صافي ربحكم عن ${config.marginFloor}$).
        </div>
      </div>

      {/* بطاقة 3: مؤقت مهل عروض الأسعار والترسية المبكرة */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#170e5e', fontWeight: 700, fontSize: '0.92rem' }}>
          <ClockIcon size={18} />
          <span>3. مؤقت مهل عروض الأسعار وقواعد الترسية المبكرة (Cut-off & Early Awarding)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <Field label="مهلة انتظار عروض الشحنات العادية (بالساعات) *">
            <input
              type="number"
              min={1}
              max={168}
              value={config.rfqCutOffHoursStandard}
              onChange={(e) => setConfig({ ...config, rfqCutOffHoursStandard: parseInt(e.target.value, 10) || 24 })}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="مهلة انتظار عروض الشحنات العاجلة Spot (بالساعات) *">
            <input
              type="number"
              min={1}
              max={48}
              value={config.rfqCutOffHoursUrgent}
              onChange={(e) => setConfig({ ...config, rfqCutOffHoursUrgent: parseInt(e.target.value, 10) || 6 })}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.85rem' }}
            />
          </Field>

          <Field label="الحد الأدنى لأيام السماح للترسية المبكرة (أيام)">
            <input
              type="number"
              min={7}
              max={45}
              value={config.earlyAwardingMinFreeDays}
              onChange={(e) => setConfig({ ...config, earlyAwardingMinFreeDays: parseInt(e.target.value, 10) || 14 })}
              style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '0.85rem' }}
            />
          </Field>
        </div>

        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            id="earlyAwardingToggle"
            checked={config.earlyAwardingEnabled}
            onChange={(e) => setConfig({ ...config, earlyAwardingEnabled: e.target.checked })}
            style={{ width: '18px', height: '18px', accentColor: '#170e5e', cursor: 'pointer' }}
          />
          <label htmlFor="earlyAwardingToggle" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
            تفعيل ميزة الترسية الفورية المبكرة (Early Awarding): في حال ورد عرض سعر من خط ملاحي يحقق سقف السعر المستهدف للعميل مع أيام سماح لا تقل عن {config.earlyAwardingMinFreeDays} يوماً، تتم الترسية فوراً دون انتظار انقضاء ساعات التايمر.
          </label>
        </div>
      </div>

      {/* بطاقة 4: محطات التوقف والمراجعة البشرية */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#170e5e', fontWeight: 700, fontSize: '0.92rem' }}>
          <UsersIcon size={18} />
          <span>4. محطات التوقف والمراجعة البشرية (Human-in-the-Loop Checkpoints)</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: config.requireManualRfqDispatch ? '#fffbeb' : '#f8fafc',
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1e293b' }}>
                المحطة 1: مراجعة طلب الـ RFQ يدوياً قبل الإرسال للخطوط الملاحية
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                عند التفعيل: يحفظ طلب التسعير كـ مسودة (Draft) ولا يرسل للخطوط الملاحية إلا بعد مراجعة الموظف والضغط على زر الإرسال.
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.requireManualRfqDispatch}
              onChange={(e) => setConfig({ ...config, requireManualRfqDispatch: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#170e5e' }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: config.requireManualAwardAndMargin ? '#fffbeb' : '#f8fafc',
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1e293b' }}>
                المحطة 2: التوقف لمراجعة أفضل عرض واعتماد الهامش يدوياً
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                عند التفعيل: عند اكتمال العروض أو انتهاء المهلة، لا يتم إصدار العرض آلياً، بل يُرسل إشعار للموظف ليفتح تبويب المصفوفة ويضغط "اعتماد السعر وتحديد الهامش".
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.requireManualAwardAndMargin}
              onChange={(e) => setConfig({ ...config, requireManualAwardAndMargin: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#170e5e' }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: config.requireManualQuoteDispatch ? '#fffbeb' : '#f8fafc',
              cursor: 'pointer',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1e293b' }}>
                المحطة 3: مراجعة عرض السعر النهائي قبل إرساله للعميل
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                عند التفعيل: يصدر العرض بحالة "مسودة (Draft Quote)" ولا يتم إرساله لواتساب أو إيميل العميل إلا بعد موافقة مدير المبيعات.
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.requireManualQuoteDispatch}
              onChange={(e) => setConfig({ ...config, requireManualQuoteDispatch: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#170e5e' }}
            />
          </label>
        </div>
      </div>

      {/* بطاقة 5: قنوات الإرسال المباشر للعميل */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#170e5e', fontWeight: 700, fontSize: '0.92rem' }}>
          <SendIcon size={18} />
          <span>5. قنوات الإرسال التلقائي للعميل (Instant Client Quotation Dispatch)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: config.autoSendWhatsAppQuote ? '#f0fdf4' : '#ffffff',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={config.autoSendWhatsAppQuote}
              onChange={(e) => setConfig({ ...config, autoSendWhatsAppQuote: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#15803d' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquareIcon size={16} />
                <span>إرسال العرض فورياً بالواتساب (WhatsApp Gateway)</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                إرسال ملخص تفاصيل الشحنة والسعر الإجمالي وفترة السماح لرقم هاتف العميل فور توليد العرض.
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: config.autoSendEmailQuote ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={config.autoSendEmailQuote}
              onChange={(e) => setConfig({ ...config, autoSendEmailQuote: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#1d4ed8' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MailIcon size={16} />
                <span>إرسال العرض فورياً بالبريد الإلكتروني (Email Quote Dispatch)</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                إرسال ملف PDF رسمي لعرض السعر إلى إيميل العميل المسجل.
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
