import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { Button } from '@/shared/ui/button';
import { SubmitButton } from '@/shared/components/submit-button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { MessageSquareIcon, RefreshCwIcon, CheckIcon } from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { useAuthStore } from '@/stores/auth-store';
import { resolveCurrentVertical } from '@/shared/verticals/vertical-scope';

export interface WhatsAppGatewayConfig {
  enabled: boolean;
  provider: 'ultramsg' | 'greenapi' | 'custom_webhook';
  apiUrl?: string;
  instanceId?: string;
  token?: string;
  autoSendInvoice: boolean;
  autoSendOnlineOrder: boolean;
  invoiceTemplate?: string;
  aiBotEnabled?: boolean;
  aiBotPrompt?: string;
  aiBotWelcomeMessage?: string;
  aiBotOffHoursOnly?: boolean;
}

interface AiConfigResponse {
  hasApiKey: boolean;
  isCustomKey: boolean;
  maskedKey: string;
  engine: string;
  provider?: 'gemini' | 'openai' | 'custom';
  model: string;
  baseUrl?: string;
}

interface SimChatMessage {
  id: string;
  sender: 'customer' | 'bot';
  text: string;
  time: string;
  engine?: string;
}

export function SettingsWhatsAppGatewaySection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const currentVertical = resolveCurrentVertical(tenant);
  const isMaritime = currentVertical === 'maritime';
  const isContracting = currentVertical === 'contracting';

  const [testPhone, setTestPhone] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  // 1. WhatsApp Gateway Config
  const { data } = useQuery<WhatsAppGatewayConfig>({
    queryKey: ['settings-whatsapp-config'],
    queryFn: () => http<WhatsAppGatewayConfig>('/api/settings/whatsapp'),
  });

  const [form, setForm] = useState<Partial<WhatsAppGatewayConfig>>({});

  const defaultInvoiceTemplate = isMaritime
    ? 'مرحباً بكم بشركة {businessName}، مرفق تفاصيل فاتورة ومستندات الشحن رقم #{invoiceNo} بقيمة {totalAmount} عبر الرابط التالي: {invoiceLink}'
    : isContracting
    ? 'مرحباً بكم بشركة {businessName}، مرفق تفاصيل مستخلص / فاتورة الأعمال رقم #{invoiceNo} بقيمة {totalAmount} عبر الرابط التالي: {invoiceLink}'
    : 'مرحباً بك يا {customerName} في {businessName}، يسعدنا تسوقك معنا! يمكنك استعراض فاتورتك رقم #{invoiceNo} بقيمة {totalAmount} <CurrencySymbol /> عبر الرابط التالي: {invoiceLink}';

  const currentConfig: WhatsAppGatewayConfig = {
    enabled: form.enabled ?? data?.enabled ?? false,
    provider: form.provider ?? data?.provider ?? 'ultramsg',
    apiUrl: form.apiUrl ?? data?.apiUrl ?? '',
    instanceId: form.instanceId ?? data?.instanceId ?? '',
    token: form.token ?? data?.token ?? '',
    autoSendInvoice: form.autoSendInvoice ?? data?.autoSendInvoice ?? false,
    autoSendOnlineOrder: form.autoSendOnlineOrder ?? data?.autoSendOnlineOrder ?? false,
    invoiceTemplate: form.invoiceTemplate ?? data?.invoiceTemplate ?? defaultInvoiceTemplate,
    aiBotEnabled: form.aiBotEnabled ?? data?.aiBotEnabled ?? false,
    aiBotPrompt: form.aiBotPrompt ?? data?.aiBotPrompt ?? '',
    aiBotWelcomeMessage: form.aiBotWelcomeMessage ?? data?.aiBotWelcomeMessage ?? '',
    aiBotOffHoursOnly: form.aiBotOffHoursOnly ?? data?.aiBotOffHoursOnly ?? false,
  };

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<WhatsAppGatewayConfig>) =>
      http<{ ok: boolean }>('/api/settings/whatsapp', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-whatsapp-config'] });
      toast.success('تم حفظ وتطبيق إعدادات الواتساب وبوت الذكاء الاصطناعي بنجاح!');
      setFeedback({ kind: 'success', message: 'تم حفظ إعدادات الواتساب وبوت الذكاء الاصطناعي بنجاح!' });
      setTimeout(() => setFeedback(null), 3500);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل حفظ الإعدادات');
      setFeedback({ kind: 'error', message: err?.message || 'فشل حفظ الإعدادات' });
    },
  });

  const testMutation = useMutation({
    mutationFn: (phone: string) =>
      http<{ success: boolean; message?: string }>('/api/settings/whatsapp/test', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),
    onSuccess: (res) => {
      if (res.success) {
        setFeedback({ kind: 'success', message: 'وصل الاختبار بنجاح إلى هاتفك! البوابة تعمل وجاهزة.' });
      } else {
        setFeedback({ kind: 'error', message: res.message || 'فشل إرسال رسالة الاختبار. تأكد من البيانات والاشتراك.' });
      }
    },
    onError: (err: any) => {
      setFeedback({ kind: 'error', message: err?.message || 'خطأ أثناء فحص البوابة' });
    },
  });

  // 2. Universal AI Engine Config (Gemini / OpenAI / Custom)
  const { data: aiConfig, refetch: refetchAiConfig } = useQuery<AiConfigResponse>({
    queryKey: ['settings-ai-config'],
    queryFn: () => http<AiConfigResponse>('/api/ai-copilot/config'),
  });

  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai' | 'custom'>('gemini');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [geminiAvailableModels, setGeminiAvailableModels] = useState<Array<{ id: string; displayName: string }>>([]);

  const fetchKeyModels = async (keyToUse?: string) => {
    const k = (keyToUse || customApiKey).trim();
    if (!k && !aiConfig?.hasApiKey) {
      setGeminiAvailableModels([]);
      return;
    }
    setFetchingModels(true);
    try {
      const res = await http<{ models: Array<{ id: string; displayName: string }> }>('/api/ai-copilot/models', {
        method: 'POST',
        body: JSON.stringify({ apiKey: k || undefined, provider: selectedProvider }),
      });
      if (res?.models && res.models.length > 0) {
        setGeminiAvailableModels(res.models);
        try {
          localStorage.setItem('zs_gemini_models_cache', JSON.stringify(res.models));
        } catch {}
        setAiFeedback({ kind: 'success', message: `تم جلب ${res.models.length} نموذج متاح لمفتاحك من سيرفرات Google!` });
        setTimeout(() => setAiFeedback(null), 3000);
      } else {
        setGeminiAvailableModels([]);
      }
    } catch {
      setGeminiAvailableModels([]);
    } finally {
      setFetchingModels(false);
    }
  };

  // 1. Hydrate cached models from localStorage on mount (0ms, zero network calls)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('zs_gemini_models_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGeminiAvailableModels(parsed);
        }
      }
    } catch {}
  }, []);

  // 2. Hydrate saved configuration from backend without re-fetching models automatically
  useEffect(() => {
    if (aiConfig) {
      if (aiConfig.provider) {
        setSelectedProvider(aiConfig.provider);
      }
      const rawModel = (aiConfig.model || '').trim();
      const cleanModel = rawModel && !/[^\x20-\x7E]/.test(rawModel) ? rawModel : '';
      setCustomModel(cleanModel);
      if (aiConfig.baseUrl) {
        setCustomBaseUrl(aiConfig.baseUrl);
      }
      // Note: We deliberately do NOT call fetchKeyModels() automatically on page load.
      // The user's saved model is preserved and shown, and models are only queried on explicit user demand.
    }
  }, [aiConfig]);

  const handleApiKeyChange = (val: string) => {
    setCustomApiKey(val);
    const trimmed = val.trim();
    if (!trimmed) {
      if (!aiConfig?.hasApiKey) {
        setGeminiAvailableModels([]);
      }
    } else if (trimmed.startsWith('sk-')) {
      setSelectedProvider('openai');
    } else if (trimmed.startsWith('AIza') || trimmed.startsWith('AQ.')) {
      setSelectedProvider('gemini');
    }
  };

  const saveAiKeyMutation = useMutation({
    mutationFn: (payload: { apiKey?: string; provider: 'gemini' | 'openai' | 'custom'; model?: string; baseUrl?: string }) =>
      http<{ ok: boolean }>('/api/ai-copilot/config', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      refetchAiConfig();
      setAiFeedback({ kind: 'success', message: 'تم حفظ إعدادات ومفتاح محرك الذكاء الاصطناعي بنجاح!' });
      setCustomApiKey('');
      setTimeout(() => setAiFeedback(null), 3500);
    },
    onError: (err: any) => {
      setAiFeedback({ kind: 'error', message: err?.message || 'فشل حفظ إعدادات الذكاء الاصطناعي' });
    },
  });

  const deleteAiKeyMutation = useMutation({
    mutationFn: () =>
      http<{ ok: boolean }>('/api/ai-copilot/config', {
        method: 'POST',
        body: JSON.stringify({ apiKey: '' }),
      }),
    onSuccess: () => {
      refetchAiConfig();
      setCustomApiKey('');
      setCustomModel('');
      setGeminiAvailableModels([]);
      try {
        localStorage.removeItem('zs_gemini_models_cache');
      } catch {}
      setAiFeedback({ kind: 'success', message: 'تم حذف المفتاح المخصص وإلغاء الربط بنجاح!' });
      setTimeout(() => setAiFeedback(null), 3500);
    },
    onError: (err: any) => {
      setAiFeedback({ kind: 'error', message: err?.message || 'فشل حذف المفتاح المخصص' });
    },
  });

  const testAiKeyMutation = useMutation({
    mutationFn: (params?: { apiKey?: string; provider?: 'gemini' | 'openai' | 'custom'; model?: string; baseUrl?: string }) =>
      http<{ success: boolean; message: string; model?: string; availableModels?: Array<{ id: string; displayName: string }> }>('/api/ai-copilot/test-key', {
        method: 'POST',
        body: JSON.stringify({
          provider: params?.provider || selectedProvider,
          apiKey: (params?.apiKey !== undefined ? params.apiKey : customApiKey) || undefined,
          model: (params?.model !== undefined ? params.model : customModel) || undefined,
          baseUrl: (params?.baseUrl !== undefined ? params.baseUrl : customBaseUrl) || undefined,
        }),
      }),
    onSuccess: (res) => {
      if (res.success) {
        setAiFeedback({ kind: 'success', message: res.message });
        if (res.availableModels && res.availableModels.length > 0) {
          setGeminiAvailableModels(res.availableModels);
          try {
            localStorage.setItem('zs_gemini_models_cache', JSON.stringify(res.availableModels));
          } catch {}
        }
      } else {
        setAiFeedback({ kind: 'error', message: res.message });
      }
    },
    onError: (err: any) => {
      setAiFeedback({ kind: 'error', message: err?.message || 'خطأ أثناء فحص اتصال الذكاء الاصطناعي' });
    },
  });

  // 3. Interactive WhatsApp Chat Simulator
  const [simQuestion, setSimQuestion] = useState('');
  const [simChatHistory, setSimChatHistory] = useState<SimChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: isMaritime
        ? 'أهلاً بك يا فندم! مرحباً بك في قسم الشحن والملاحة البحرية، اكتب أي استفسار حول نولون الشحن، تتبع الحاويات أو الموانئ لتجربة الرد الذكي.'
        : isContracting
        ? 'أهلاً بك يا فندم! مرحباً بك في الإدارة الهندسية، اكتب أي استفسار حول المستخلصات والمشاريع لتجربة الرد الذكي.'
        : 'أهلاً بك يا فندم! مرحباً بك في المتجر، اكتب أي استفسار عن المنتجات أو الأسعار لتجربة الرد الفوري المولد بالذكاء الاصطناعي.',
      time: 'الآن',
      engine: 'gemini_llm',
    },
  ]);

  const simulateMutation = useMutation({
    mutationFn: (question: string) =>
      http<{ handled: boolean; reply?: string; engine?: string; message?: string }>('/api/settings/whatsapp/simulate-bot', {
        method: 'POST',
        body: JSON.stringify({ question }),
      }),
    onSuccess: (res) => {
      const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      if (res.handled && res.reply) {
        setSimChatHistory((prev) => [
          ...prev,
          { id: String(Date.now()), sender: 'bot', text: res.reply!, time: now, engine: res.engine },
        ]);
      } else {
        setSimChatHistory((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            sender: 'bot',
            text: res.message || 'عذراً، لم أتمكن من الرد. يرجى التأكد من تفعيل البوت في الإعدادات أعلاه.',
            time: now,
            engine: 'local_smart',
          },
        ]);
      }
    },
    onError: (err: any) => {
      const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      setSimChatHistory((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: `خطأ أثناء المحاكاة: ${err?.message || 'تعذر الاتصال بالخادم'}`,
          time: now,
        },
      ]);
    },
  });

  const handleSendSim = (text?: string) => {
    const q = (text || simQuestion).trim();
    if (!q) return;
    const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    setSimChatHistory((prev) => [
      ...prev,
      { id: String(Date.now()) + '-u', sender: 'customer', text: q, time: now },
    ]);
    setSimQuestion('');
    simulateMutation.mutate(q);
  };

  const handleSaveAll = () => {
    setFeedback(null);
    saveMutation.mutate(currentConfig);
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : '/api/whatsapp/webhook';

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const handleCopyWebhook = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} dir="rtl">
      {/* CARD 1: UNIVERSAL AI ENGINE (GEMINI, OPENAI, CUSTOM) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                {t('settings.workspace_sections.settings_whats_app_gateway_section.s0', "محرك ومفتاح الذكاء الاصطناعي (Universal AI Engine)")}
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  background: aiConfig?.hasApiKey ? '#dcfce7' : '#fef3c7',
                  color: aiConfig?.hasApiKey ? '#166534' : '#92400e',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 800,
                }}
              >
                {aiConfig?.hasApiKey
                  ? `${aiConfig.provider === 'openai' ? 'OpenAI' : aiConfig.provider === 'custom' ? t('settings.workspace_sections.settings_whats_app_gateway_section.s1', "محرك مخصص") : 'Gemini'} متصل ونشط${aiConfig.model ? ` (${aiConfig.model})` : ''}`
                  : t('settings.workspace_sections.settings_whats_app_gateway_section.s2', "يعمل بالمحرك المحلي المدمج")}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              {t('settings.workspace_sections.settings_whats_app_gateway_section.s3', "يدعم كلاً من")} <strong>Google Gemini</strong> {t('settings.workspace_sections.settings_whats_app_gateway_section.s4', "و")} <strong>OpenAI (ChatGPT)</strong> {t('settings.workspace_sections.settings_whats_app_gateway_section.s5', "ومزودي النماذج المتوافقة مثل")} <strong>DeepSeek</strong>{t('settings.workspace_sections.settings_whats_app_gateway_section.s6', ". يغذي")} <strong>{t('settings.workspace_sections.settings_whats_app_gateway_section.s7', "مستشار الإدارة (زاد AI)")}</strong> {t('settings.workspace_sections.settings_whats_app_gateway_section.s8', "وبوت")} <strong>{t('settings.workspace_sections.settings_whats_app_gateway_section.s9', "الرد الآلي على الواتساب")}</strong>.
            </p>
          </div>
        </div>

        {/* AI Key & Multi-Provider Settings */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Provider Selector Tabs */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
              {t('settings.workspace_sections.settings_whats_app_gateway_section.s10', "اختر مزود الذكاء الاصطناعي (AI Provider):")}
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'gemini', label: 'Google Gemini', tag: t('settings.workspace_sections.settings_whats_app_gateway_section.s11', "موصى به") },
                { id: 'openai', label: 'OpenAI / ChatGPT (GPT-4o & Mini)', tag: t('settings.workspace_sections.settings_whats_app_gateway_section.s12', "متقدم") },
                { id: 'custom', label: t('settings.workspace_sections.settings_whats_app_gateway_section.s13', "مزود مخصص (DeepSeek / Groq / Local)"), tag: t('settings.workspace_sections.settings_whats_app_gateway_section.s14', "مفتوح") },
              ].map((p) => {
                const active = selectedProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProvider(p.id as any)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: active ? '2px solid #170e5e' : '1px solid #cbd5e1',
                      background: active ? '#f5f3ff' : '#ffffff',
                      color: active ? '#170e5e' : '#475569',
                      fontWeight: active ? 800 : 600,
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{p.label}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        background: active ? '#170e5e' : '#f1f5f9',
                        color: active ? '#ffffff' : '#64748b',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {p.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key Input - Anti-Autofill Protected */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
                {selectedProvider === 'gemini'
                  ? t('settings.workspace_sections.settings_whats_app_gateway_section.s15', "مفتاح Google Gemini API:")
                  : selectedProvider === 'openai'
                  ? t('settings.workspace_sections.settings_whats_app_gateway_section.s16', "مفتاح OpenAI API (sk-...):")
                  : t('settings.workspace_sections.settings_whats_app_gateway_section.s17', "مفتاح API الخاص بالمزود المخصص:")}
              </label>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1d4ed8',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                {showApiKey ? t('settings.workspace_sections.settings_whats_app_gateway_section.s18', "إخفاء الرمز") : t('settings.workspace_sections.settings_whats_app_gateway_section.s19', "إظهار الرمز")}
              </button>
            </div>
            <input
              type="text"
              name="ai_gateway_token_no_autofill"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              data-bwignore="true"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className={showApiKey ? '' : 'secure-password-field'}
              placeholder={
                aiConfig?.hasApiKey
                  ? `المفتاح مسجل: ${aiConfig.maskedKey}`
                  : selectedProvider === 'gemini'
                  ? t('settings.workspace_sections.settings_whats_app_gateway_section.s20', "الصق مفتاح AIzaSy... الخاص بك هنا")
                  : selectedProvider === 'openai'
                  ? t('settings.workspace_sections.settings_whats_app_gateway_section.s21', "الصق مفتاح sk-... الخاص بك هنا")
                  : t('settings.workspace_sections.settings_whats_app_gateway_section.s22', "الصق مفتاح API الخاص بك هنا")
              }
              value={customApiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                background: '#ffffff',
                direction: 'ltr',
                textAlign: 'left',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Gemini Model Selection - 100% Dynamic from Google */}
          {selectedProvider === 'gemini' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
                  {t('settings.workspace_sections.settings_whats_app_gateway_section.s23', "اختيار نموذج Google Gemini (Model):")}
                </label>
                {(customApiKey.trim() || aiConfig?.hasApiKey) && (
                  <button
                    type="button"
                    onClick={() => fetchKeyModels()}
                    disabled={fetchingModels}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1d4ed8',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                    }}
                    title={t('settings.workspace_sections.settings_whats_app_gateway_section.s24', "استعراض كافة النماذج التي يدعمها مفتاحك من سيرفرات جوجل مباشرة")}
                  >
                    <RefreshCwIcon size={12} className={fetchingModels ? 'animate-spin' : ''} />
                    <span>{fetchingModels ? t('settings.workspace_sections.settings_whats_app_gateway_section.s25', "جاري الفحص من جوجل...") : t('settings.workspace_sections.settings_whats_app_gateway_section.s26', "استعراض نماذج مفتاحك من جوجل")}</span>
                  </button>
                )}
              </div>

              {!customApiKey.trim() && !aiConfig?.hasApiKey ? (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                    fontSize: '12px',
                    lineHeight: 1.5,
                  }}
                >
                  {t('settings.workspace_sections.settings_whats_app_gateway_section.s27', "أدخل مفتاح Google Gemini أعلاه لاختيار نموذج من النماذج المتاحة لمفتاحك.")}
                </div>
              ) : (
                <CustomSelect
                  value={customModel || ''}
                  onChange={(val) => setCustomModel(val)}
                  placeholder={customModel || t('settings.workspace_sections.settings_whats_app_gateway_section.s28', "اختر نموذجاً أو اتركه تلقائياً")}
                  options={[
                    { value: '', label: t('settings.workspace_sections.settings_whats_app_gateway_section.s29', "تلقائي (اختيار أحدث نموذج متاح ومستقر لمفتاحك تلقائياً)"), hint: t('settings.workspace_sections.settings_whats_app_gateway_section.s30', "تلقائي") },
                    ...(customModel && !geminiAvailableModels.some((m) => m.id === customModel)
                      ? [{ value: customModel, label: customModel, hint: t('settings.workspace_sections.settings_whats_app_gateway_section.s31', "النموذج المحفوظ حالياً") }]
                      : []),
                    ...geminiAvailableModels.map((m) => ({
                      value: m.id,
                      label: m.displayName && m.displayName !== m.id ? `${m.displayName} (${m.id})` : m.id,
                      hint: m.id,
                    })),
                  ]}
                />
              )}
            </div>
          )}

          {/* Custom Model and Base URL Fields for OpenAI / Custom */}
          {selectedProvider !== 'gemini' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedProvider === 'custom' ? '1fr 1fr' : '1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  {t('settings.workspace_sections.settings_whats_app_gateway_section.s32', "اسم النموذج (Model) - اختياري:")}
                </label>
                <input
                  type="text"
                  placeholder={selectedProvider === 'openai' ? t('settings.workspace_sections.settings_whats_app_gateway_section.s33', "gpt-4o-mini (الافتراضي)") : t('settings.workspace_sections.settings_whats_app_gateway_section.s34', "deepseek-chat أو أي نموذج")}
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    background: '#ffffff',
                    direction: 'ltr',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              {selectedProvider === 'custom' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    {t('settings.workspace_sections.settings_whats_app_gateway_section.s35', "عنوان الرابط الأساسي (API Base URL) - اختياري:")}
                  </label>
                  <input
                    type="text"
                    placeholder={t('settings.workspace_sections.settings_whats_app_gateway_section.s36', "مثال: https://api.deepseek.com/v1")}
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      background: '#ffffff',
                      direction: 'ltr',
                      textAlign: 'left',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions Row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="primary"
              disabled={saveAiKeyMutation.isPending || (!customApiKey.trim() && !aiConfig?.hasApiKey && !customModel && !customBaseUrl)}
              onClick={() =>
                saveAiKeyMutation.mutate({
                  apiKey: customApiKey.trim() || undefined,
                  provider: selectedProvider,
                  model: customModel.trim(),
                  baseUrl: customBaseUrl.trim() || undefined,
                })
              }
              style={{ background: '#170e5e', fontSize: '12.5px', padding: '8px 18px', fontWeight: 800 }}
            >
              {saveAiKeyMutation.isPending ? t('settings.workspace_sections.settings_whats_app_gateway_section.s37', "جاري الحفظ...") : t('settings.workspace_sections.settings_whats_app_gateway_section.s38', "حفظ إعدادات المحرك")}
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={testAiKeyMutation.isPending || (!customApiKey.trim() && !aiConfig?.hasApiKey)}
              onClick={() =>
                testAiKeyMutation.mutate({
                  provider: selectedProvider,
                  apiKey: customApiKey.trim() || undefined,
                  model: customModel.trim(),
                  baseUrl: customBaseUrl.trim() || undefined,
                })
              }
              style={{ fontSize: '12.5px', padding: '8px 16px', fontWeight: 800 }}
            >
              {testAiKeyMutation.isPending ? t('settings.workspace_sections.settings_whats_app_gateway_section.s39', "جاري فحص الاتصال...") : t('settings.workspace_sections.settings_whats_app_gateway_section.s40', "فحص الاتصال بالمحرك")}
            </Button>

            {aiConfig?.isCustomKey && (
              <Button
                type="button"
                variant="secondary"
                disabled={deleteAiKeyMutation.isPending}
                onClick={() => deleteAiKeyMutation.mutate()}
                style={{ fontSize: '12px', padding: '8px 12px', color: '#dc2626' }}
                title={t('settings.workspace_sections.settings_whats_app_gateway_section.s41', "حذف المفتاح المخصص والرجوع للإعداد الافتراضي")}
              >
                {deleteAiKeyMutation.isPending ? t('settings.workspace_sections.settings_whats_app_gateway_section.s42', "جاري الحذف...") : t('settings.workspace_sections.settings_whats_app_gateway_section.s43', "حذف المفتاح المخصص")}
              </Button>
            )}
          </div>


          {aiFeedback && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                background: aiFeedback.kind === 'success' ? '#dcfce7' : '#fee2e2',
                color: aiFeedback.kind === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${aiFeedback.kind === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {aiFeedback.message}
            </div>
          )}
        </div>
      </div>

      {/* CARD 2: CONVERSATIONAL WHATSAPP AI BOT */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquareIcon size={18} color="#15803d" />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                {t('settings.workspace_sections.settings_whats_app_gateway_section.s44', "بوت واتساب التفاعلي لخدمة ومبيعات العملاء (Conversational AI Bot)")}
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  background: currentConfig.aiBotEnabled ? '#dcfce7' : '#f1f5f9',
                  color: currentConfig.aiBotEnabled ? '#166534' : '#64748b',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 800,
                }}
              >
                {currentConfig.aiBotEnabled ? t('settings.workspace_sections.settings_whats_app_gateway_section.s45', "الرد الآلي مفعل") : t('settings.workspace_sections.settings_whats_app_gateway_section.s46', "الرد الآلي متوقف")}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              {isMaritime
                ? t('settings.workspace_sections.settings_whats_app_gateway_section.s47', "يقوم البوت بالرد التلقائي الذكي على استفسارات العملاء حول مواعيد وصول السفن، تتبع الحاويات، رسوم النولون وخدمات التخليص الملاحي.")
                : isContracting
                ? t('settings.workspace_sections.settings_whats_app_gateway_section.s48', "يقوم البوت بالرد التلقائي الذكي على استفسارات الملاك والاستشاريين ومقاولي الباطن حول بنود المقايسات وحالات المستخلصات.")
                : t('settings.workspace_sections.settings_whats_app_gateway_section.s49', "يقوم البوت بالرد التلقائي الذكي على استفسارات الزبائن حول أسعار المنتجات وتوفر المقاسات والألوان في المخزن لحظياً، مع إرسال روابط الشراء المباشرة.")}
            </p>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: currentConfig.aiBotEnabled ? '#166534' : '#475569' }}>
              {currentConfig.aiBotEnabled ? t('settings.workspace_sections.settings_whats_app_gateway_section.s50', "مفعل") : t('settings.workspace_sections.settings_whats_app_gateway_section.s51', "تفعيل البوت")}
            </span>
            <input
              type="checkbox"
              checked={currentConfig.aiBotEnabled}
              onChange={(e) => setForm({ ...currentConfig, aiBotEnabled: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* Bot Rules & Webhook Box */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* Webhook Configuration */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>{t('settings.workspace_sections.settings_whats_app_gateway_section.s52', "رابط استقبال رسائل الزبائن (Inbound Webhook URL):")}</strong>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              {t('settings.workspace_sections.settings_whats_app_gateway_section.s53', "انسخ هذا الرابط وضعه في خانة")} <strong>Webhook URL</strong> {t('settings.workspace_sections.settings_whats_app_gateway_section.s54', "في لوحة UltraMsg أو GreenAPI أو Meta Official API لاستقبال رسائل العملاء فورياً:")}
            </p>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={webhookUrl}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  background: '#f1f5f9',
                  color: '#334155',
                  direction: 'ltr',
                  textAlign: 'left',
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleCopyWebhook}
                style={{ fontSize: '11.5px', padding: '7px 12px', whiteSpace: 'nowrap' }}
              >
                {copiedWebhook ? t('settings.workspace_sections.settings_whats_app_gateway_section.s55', "تم النسخ!") : t('settings.workspace_sections.settings_whats_app_gateway_section.s56', "نسخ الرابط")}
              </Button>
            </div>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
              {t('settings.workspace_sections.settings_whats_app_gateway_section.s57', "يدعم كود المحاكاة، UltraMsg، GreenAPI، و Meta Cloud API بنظام Webhook تلقائي موحد.")}
            </span>
          </div>

          {/* Custom Personality Prompt */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>{t('settings.workspace_sections.settings_whats_app_gateway_section.s58', "توجيهات مخصصة للبوت (Shop Prompt Rules):")}</strong>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b' }}>
              {t('settings.workspace_sections.settings_whats_app_gateway_section.s59', "اكتب أي شروط أو سياسات خاصة بمتجرك (مثال: نبرة الصوت، التوصيل المجاني، سياسة الاستبدال):")}
            </label>
            <textarea
              rows={3}
              placeholder={t('settings.workspace_sections.settings_whats_app_gateway_section.s60', "مثال: رحب بالعميل باسم متجرنا، واذكر أن مصاريف الشحن 35 ج فقط داخل القاهرة، ولدينا استبدال مجاني خلال 14 يوم...")}
              value={currentConfig.aiBotPrompt || ''}
              onChange={(e) => setForm({ ...currentConfig, aiBotPrompt: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* CARD 3: INTERACTIVE WHATSAPP BOT SIMULATOR */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquareIcon size={18} color="#059669" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 900, color: '#0f172a' }}>
                {t('settings.workspace_sections.settings_whats_app_gateway_section.s61', "محاكي محادثة واتساب التفاعلي (WhatsApp AI Live Simulator)")}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                {t('settings.workspace_sections.settings_whats_app_gateway_section.s62', "اختبر ردود بوت الذكاء الاصطناعي مباشرة كأنك عميل على واتساب وتحقق من دقته في فحص أسعار ومخزون منتجاتك الحالية:")}
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Mock Chat Window */}
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#efeae2',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          {/* Mock Header */}
          <div
            style={{
              background: '#075e54',
              color: '#ffffff',
              padding: '10px 16px',
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
                  background: '#128c7e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <MessageSquareIcon size={18} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800 }}>{t('settings.workspace_sections.settings_whats_app_gateway_section.s63', "مساعد المتجر الذكي (WhatsApp AI Bot)")}</div>
                <div style={{ fontSize: '11px', opacity: 0.85 }}>{t('settings.workspace_sections.settings_whats_app_gateway_section.s64', "متصل الآن • بالذكاء الاصطناعي")}</div>
              </div>
            </div>
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px' }}>
              {t('settings.workspace_sections.settings_whats_app_gateway_section.s65', "تجربة حية")}
            </span>
          </div>

          {/* Chat Messages Body */}
          <div
            style={{
              height: '280px',
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {simChatHistory.map((msg) => {
              const isCustomer = msg.sender === 'customer';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isCustomer ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  <div
                    style={{
                      background: isCustomer ? '#dcf8c6' : '#ffffff',
                      color: '#0f172a',
                      padding: '8px 12px',
                      borderRadius: isCustomer ? '10px 0 10px 10px' : '0 10px 10px 10px',
                      boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {msg.text}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#64748b',
                      marginTop: '2px',
                      alignSelf: isCustomer ? 'flex-end' : 'flex-start',
                      display: 'flex',
                      gap: '4px',
                    }}
                  >
                    <span>{msg.time}</span>
                    {msg.engine && (
                      <span style={{ color: msg.engine === 'gemini_llm' || msg.engine === 'openai_llm' || msg.engine === 'custom_llm' ? '#2563eb' : '#059669', fontWeight: 700 }}>
                        ({msg.engine === 'gemini_llm' ? 'Gemini' : msg.engine === 'openai_llm' ? 'OpenAI' : msg.engine === 'custom_llm' ? 'AI Cloud' : 'Smart Local'})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {simulateMutation.isPending && (
              <div style={{ alignSelf: 'flex-start', background: '#ffffff', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', color: '#64748b' }}>
                {t('settings.workspace_sections.settings_whats_app_gateway_section.s66', "جاري التفكير وصياغة الرد بالذكاء الاصطناعي...")}
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips */}
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {[
              t('settings.workspace_sections.settings_whats_app_gateway_section.s67', "بكام المنتجات عندكم؟"),
              t('settings.workspace_sections.settings_whats_app_gateway_section.s68', "عندكم مقاس L متوفر وبكام؟"),
              t('settings.workspace_sections.settings_whats_app_gateway_section.s69', "عايز أطلب أونلاين يوصلني إمتى؟"),
              t('settings.workspace_sections.settings_whats_app_gateway_section.s70', "في عروض أو تخفيضات النهاردة؟"),
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendSim(chip)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '16px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  color: '#334155',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div style={{ background: '#f0f2f5', padding: '10px 14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder={t('settings.workspace_sections.settings_whats_app_gateway_section.s71', "اكتب سؤالك كأنك زبون يراسل المتجر على واتساب...")}
              value={simQuestion}
              onChange={(e) => setSimQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendSim();
                }
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                background: '#ffffff',
              }}
            />
            <Button
              type="button"
              variant="primary"
              disabled={simulateMutation.isPending || !simQuestion.trim()}
              onClick={() => handleSendSim()}
              style={{ background: '#075e54', fontSize: '12px', padding: '8px 16px', fontWeight: 800 }}
            >
              {t('settings.workspace_sections.settings_whats_app_gateway_section.s72', "إرسال")}
            </Button>
          </div>
        </div>
      </div>

      {/* CARD 4: CLOUD WHATSAPP GATEWAY & OUTBOUND AUTOMATION */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquareIcon size={18} color="#166534" />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                {t('settings.workspace_sections.settings_whats_app_gateway_section.s73', "إعدادات حساب واتساب السحابي (Cloud WhatsApp Credentials)")}
              </h3>
              <span style={{ fontSize: '11px', background: currentConfig.enabled ? '#dcfce7' : '#f1f5f9', color: currentConfig.enabled ? '#166534' : '#64748b', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                {currentConfig.enabled ? t('settings.workspace_sections.settings_whats_app_gateway_section.s74', "البوابة مفعلة") : t('settings.workspace_sections.settings_whats_app_gateway_section.s75', "متوقفة")}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              {t('settings.workspace_sections.settings_whats_app_gateway_section.s76', "بيانات الاتصال برقم الواتساب لإرسال الفواتير الإلكترونية وإشعارات المتجر للعملاء.")}
            </p>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: currentConfig.enabled ? '#166534' : '#475569' }}>
              {currentConfig.enabled ? t('settings.workspace_sections.settings_whats_app_gateway_section.s77', "البوابة مفعلة") : t('settings.workspace_sections.settings_whats_app_gateway_section.s78', "تفعيل البوابة")}
            </span>
            <input
              type="checkbox"
              checked={currentConfig.enabled}
              onChange={(e) => setForm({ ...currentConfig, enabled: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* 2-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* Provider & Credentials */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>{t('settings.workspace_sections.settings_whats_app_gateway_section.s79', "مزود خدمة الواتساب السحابي:")}</strong>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                {t('settings.workspace_sections.settings_whats_app_gateway_section.s80', "المزود المعتمد:")}
              </label>
              <select
                value={currentConfig.provider}
                onChange={(e) => setForm({ ...currentConfig, provider: e.target.value as any })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', fontWeight: 700 }}
              >
                <option value="ultramsg">{t('settings.workspace_sections.settings_whats_app_gateway_section.s81', "UltraMsg (الأشهر في مصر والوطن العربي)")}</option>
                <option value="greenapi">{t('settings.workspace_sections.settings_whats_app_gateway_section.s82', "Green API (بوابة عالمية مستقرة)")}</option>
                <option value="custom_webhook">{t('settings.workspace_sections.settings_whats_app_gateway_section.s83', "Custom Webhook (بوابة أو سيرفر خاص بك)")}</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                {t('settings.workspace_sections.settings_whats_app_gateway_section.s84', "معرّف الحساب / Instance ID:")}
              </label>
              <input
                type="text"
                placeholder={t('settings.workspace_sections.settings_whats_app_gateway_section.s85', "مثال: instance98765")}
                value={currentConfig.instanceId || ''}
                onChange={(e) => setForm({ ...currentConfig, instanceId: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', direction: 'ltr', textAlign: 'left', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                {t('settings.workspace_sections.settings_whats_app_gateway_section.s86', "مفتاح الاتصال / Token:")}
              </label>
              <input
                type="password"
                placeholder={t('settings.workspace_sections.settings_whats_app_gateway_section.s87', "رمز الـ Token السري الخاص بحسابك...")}
                value={currentConfig.token || ''}
                onChange={(e) => setForm({ ...currentConfig, token: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', direction: 'ltr', textAlign: 'left', boxSizing: 'border-box' }}
              />
            </div>

            {currentConfig.provider === 'custom_webhook' && (
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  {t('settings.workspace_sections.settings_whats_app_gateway_section.s88', "رابط الويب هوك (Webhook URL):")}
                </label>
                <input
                  type="url"
                  placeholder="https://your-api.com/send-message"
                  value={currentConfig.apiUrl || ''}
                  onChange={(e) => setForm({ ...currentConfig, apiUrl: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', direction: 'ltr', textAlign: 'left', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </div>

          {/* Automation Rules */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>{t('settings.workspace_sections.settings_whats_app_gateway_section.s89', "قواعد الإرسال التلقائي الصامت:")}</strong>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={currentConfig.autoSendInvoice}
                onChange={(e) => setForm({ ...currentConfig, autoSendInvoice: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              <span>
                {isMaritime
                  ? t('settings.workspace_sections.settings_whats_app_gateway_section.s90', "إرسال رابط الفاتورة والمستندات للعميل تلقائياً فور إصدار واعتماد فاتورة الشحن.")
                  : isContracting
                  ? t('settings.workspace_sections.settings_whats_app_gateway_section.s91', "إرسال رابط المستخلص للجهة المالكة تلقائياً فور اعتماده.")
                  : t('settings.workspace_sections.settings_whats_app_gateway_section.s92', "إرسال رابط الفاتورة الإلكترونية للعميل تلقائياً فور حفظ الفاتورة بالكاشير.")}
              </span>
            </label>

            {!isMaritime && !isContracting && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={currentConfig.autoSendOnlineOrder}
                  onChange={(e) => setForm({ ...currentConfig, autoSendOnlineOrder: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>{t('settings.workspace_sections.settings_whats_app_gateway_section.s93', "إرسال رسالة تأكيد للعميل فور وصول طلب من المتجر الإلكتروني.")}</span>
              </label>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                {t('settings.workspace_sections.settings_whats_app_gateway_section.s94', "قالب رسالة الفاتورة (تتغير المتغيرات تلقائياً):")}
              </label>
              <textarea
                rows={3}
                value={currentConfig.invoiceTemplate}
                onChange={(e) => setForm({ ...currentConfig, invoiceTemplate: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#ffffff', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                {t('settings.workspace_sections.settings_whats_app_gateway_section.s95', "المتغيرات المتاحة:")} {'{customerName}'}, {'{businessName}'}, {'{invoiceNo}'}, {'{totalAmount}'}, {'{invoiceLink}'}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              marginBottom: '14px',
              background: feedback.kind === 'success' ? '#dcfce7' : '#fee2e2',
              color: feedback.kind === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${feedback.kind === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Footer Actions & Testing */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="tel"
              placeholder={t('settings.workspace_sections.settings_whats_app_gateway_section.s96', "رقم الهاتف للتجربة (مثلاً 010...)")}
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              style={{ width: '190px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#ffffff', direction: 'ltr', textAlign: 'left' }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={testMutation.isPending || !currentConfig.enabled}
              onClick={() => {
                if (!testPhone.trim()) {
                  setFeedback({ kind: 'error', message: t('settings.workspace_sections.settings_whats_app_gateway_section.s97', "يرجى إدخال رقم الهاتف لإجراء الاختبار") });
                  return;
                }
                setFeedback(null);
                testMutation.mutate(testPhone.trim());
              }}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              {testMutation.isPending ? t('settings.workspace_sections.settings_whats_app_gateway_section.s98', "جاري الإرسال...") : t('settings.workspace_sections.settings_whats_app_gateway_section.s99', "إرسال رسالة اختبار")}
            </Button>
          </div>

          <SubmitButton
            type="button"
            isPending={saveMutation.isPending}
            isSuccess={saveMutation.isSuccess}
            idleText={t('settings.workspace_sections.settings_whats_app_gateway_section.s101', "حفظ الإعدادات بالكامل")}
            pendingText={t('settings.workspace_sections.settings_whats_app_gateway_section.s100', "جاري الحفظ...")}
            successText="تم حفظ إعدادات الواتساب بنجاح!"
            onClick={handleSaveAll}
            style={{ background: '#170e5e', color: '#ffffff', fontSize: '13px', padding: '8px 20px', fontWeight: 800 }}
          />
        </div>

        {saveMutation.isSuccess && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '8px',
              color: '#15803d',
              fontSize: '12.5px',
              fontWeight: 800,
              marginTop: '12px',
              boxShadow: '0 1px 4px rgba(22, 163, 74, 0.12)',
            }}
          >
            <CheckIcon size={16} color="#16a34a" />
            <span>تم حفظ وتحديث إعدادات الواتساب والرد الآلي بنجاح! التغييرات مفعلة مباشرة.</span>
          </div>
        )}
      </div>
    </div>
  );
}
