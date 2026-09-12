import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { Button } from '@/shared/ui/button';
import { MessageSquareIcon, LightbulbIcon } from '@/shared/components/icons/AppIcons';

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
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  // 1. WhatsApp Gateway Config
  const { data } = useQuery<WhatsAppGatewayConfig>({
    queryKey: ['settings-whatsapp-config'],
    queryFn: () => http<WhatsAppGatewayConfig>('/api/settings/whatsapp'),
  });

  const [form, setForm] = useState<Partial<WhatsAppGatewayConfig>>({});

  const currentConfig: WhatsAppGatewayConfig = {
    enabled: form.enabled ?? data?.enabled ?? false,
    provider: form.provider ?? data?.provider ?? 'ultramsg',
    apiUrl: form.apiUrl ?? data?.apiUrl ?? '',
    instanceId: form.instanceId ?? data?.instanceId ?? '',
    token: form.token ?? data?.token ?? '',
    autoSendInvoice: form.autoSendInvoice ?? data?.autoSendInvoice ?? false,
    autoSendOnlineOrder: form.autoSendOnlineOrder ?? data?.autoSendOnlineOrder ?? false,
    invoiceTemplate: form.invoiceTemplate ?? data?.invoiceTemplate ??
      'مرحباً بك يا {customerName} في {businessName}، يسعدنا تسوقك معنا! يمكنك استعراض فاتورتك رقم #{invoiceNo} بقيمة {totalAmount} <CurrencySymbol /> عبر الرابط التالي: {invoiceLink}',
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
      setFeedback({ kind: 'success', message: 'تم حفظ إعدادات الواتساب وبوت الذكاء الاصطناعي بنجاح!' });
      setTimeout(() => setFeedback(null), 3500);
    },
    onError: (err: any) => {
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
  const [aiFeedback, setAiFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (aiConfig) {
      if (aiConfig.provider) {
        setSelectedProvider(aiConfig.provider);
      }
      if (aiConfig.model) {
        setCustomModel(aiConfig.model);
      }
      if (aiConfig.baseUrl) {
        setCustomBaseUrl(aiConfig.baseUrl);
      }
    }
  }, [aiConfig]);

  const handleApiKeyChange = (val: string) => {
    setCustomApiKey(val);
    const trimmed = val.trim();
    if (trimmed.startsWith('sk-')) {
      setSelectedProvider('openai');
    } else if (trimmed.startsWith('AIza') || trimmed.startsWith('AQ.')) {
      setSelectedProvider('gemini');
    }
  };

  const saveAiKeyMutation = useMutation({
    mutationFn: (payload: { apiKey: string; provider: 'gemini' | 'openai' | 'custom'; model?: string; baseUrl?: string }) =>
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

  const testAiKeyMutation = useMutation({
    mutationFn: (params?: { apiKey?: string; provider?: 'gemini' | 'openai' | 'custom'; model?: string; baseUrl?: string }) =>
      http<{ success: boolean; message: string }>('/api/ai-copilot/test-key', {
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
      text: 'أهلاً بك يا فندم! مرحباً بك في المتجر، اكتب أي استفسار عن المنتجات أو الأسعار لتجربة الرد الفوري المولد بالذكاء الاصطناعي.',
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
                محرك ومفتاح الذكاء الاصطناعي (Universal AI Engine)
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
                  ? `${aiConfig.provider === 'openai' ? 'OpenAI' : aiConfig.provider === 'custom' ? 'محرك مخصص' : 'Gemini'} متصل ونشط${aiConfig.model ? ` (${aiConfig.model})` : ''}`
                  : 'يعمل بالمحرك المحلي المدمج'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              يدعم كلاً من <strong>Google Gemini</strong> و <strong>OpenAI (ChatGPT)</strong> ومزودي النماذج المتوافقة مثل <strong>DeepSeek</strong>. يغذي <strong>مستشار الإدارة (زاد AI)</strong> وبوت <strong>الرد الآلي على الواتساب</strong>.
            </p>
          </div>
        </div>

        {/* AI Key & Multi-Provider Settings */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Provider Selector Tabs */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
              اختر مزود الذكاء الاصطناعي (AI Provider):
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'gemini', label: 'Google Gemini (مجاني وسريع)', tag: 'موصى به' },
                { id: 'openai', label: 'OpenAI / ChatGPT (GPT-4o & Mini)', tag: 'متقدم' },
                { id: 'custom', label: 'مزود مخصص (DeepSeek / Groq / Local)', tag: 'مفتوح' },
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

          {/* API Key Input */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
              {selectedProvider === 'gemini'
                ? 'مفتاح Google Gemini API:'
                : selectedProvider === 'openai'
                ? 'مفتاح OpenAI API (sk-...):'
                : 'مفتاح API الخاص بالمزود المخصص:'}
            </label>
            <input
              type="password"
              placeholder={
                aiConfig?.hasApiKey
                  ? `المفتاح مسجل: ${aiConfig.maskedKey}`
                  : selectedProvider === 'gemini'
                  ? 'الصق مفتاح AIzaSy... الخاص بك هنا'
                  : selectedProvider === 'openai'
                  ? 'الصق مفتاح sk-... الخاص بك هنا'
                  : 'الصق مفتاح API الخاص بك هنا'
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

          {/* Custom Model and Base URL Fields */}
          {selectedProvider !== 'gemini' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedProvider === 'custom' ? '1fr 1fr' : '1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  اسم النموذج (Model) - اختياري:
                </label>
                <input
                  type="text"
                  placeholder={selectedProvider === 'openai' ? 'gpt-4o-mini (الافتراضي)' : 'deepseek-chat أو أي نموذج'}
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
                    عنوان الرابط الأساسي (API Base URL) - اختياري:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: https://api.deepseek.com/v1"
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
                  apiKey: customApiKey.trim(),
                  provider: selectedProvider,
                  model: customModel.trim() || undefined,
                  baseUrl: customBaseUrl.trim() || undefined,
                })
              }
              style={{ background: '#170e5e', fontSize: '12.5px', padding: '8px 18px', fontWeight: 800 }}
            >
              {saveAiKeyMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات المحرك'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={testAiKeyMutation.isPending || (!customApiKey.trim() && !aiConfig?.hasApiKey)}
              onClick={() =>
                testAiKeyMutation.mutate({
                  provider: selectedProvider,
                  apiKey: customApiKey.trim() || undefined,
                  model: customModel.trim() || undefined,
                  baseUrl: customBaseUrl.trim() || undefined,
                })
              }
              style={{ fontSize: '12.5px', padding: '8px 16px', fontWeight: 800 }}
            >
              {testAiKeyMutation.isPending ? 'جاري فحص الاتصال...' : 'فحص الاتصال بالمحرك'}
            </Button>

            {aiConfig?.isCustomKey && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  saveAiKeyMutation.mutate({
                    apiKey: '',
                    provider: 'gemini',
                    model: '',
                    baseUrl: '',
                  })
                }
                style={{ fontSize: '12px', padding: '8px 12px', color: '#dc2626' }}
                title="حذف المفتاح المخصص والرجوع للإعداد الافتراضي"
              >
                حذف المفتاح المخصص
              </Button>
            )}
          </div>

          {/* Quick Guide Card */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#1e40af', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <LightbulbIcon size={15} color="#1d4ed8" />
              <strong>إرشادات الحصول على مفاتيح الذكاء الاصطناعي:</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                <strong>1. Google Gemini (مجاني وسريع):</strong>
                <br />
                احصل على مفتاح مجاني بدون بطاقة بنكية عبر{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 800, textDecoration: 'underline' }}>
                  Google AI Studio
                </a>
                . يدعم أحدث نماذج فلاش الحديثة تلقائياً.
              </div>
              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                <strong>2. OpenAI / ChatGPT:</strong>
                <br />
                احصل على المفتاح من منصة{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', fontWeight: 800, textDecoration: 'underline' }}>
                  OpenAI Platform
                </a>
                . متوافق مع GPT-4o و GPT-4o-mini.
              </div>
              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                <strong>3. المزود المخصص (DeepSeek / Groq / خادم محلي):</strong>
                <br />
                يمكنك ربط أي مزود يقدم واجهة متوافقة مع OpenAI API فقط بتحديد عنوان الرابط واسم النموذج.
              </div>
            </div>
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
                بوت واتساب التفاعلي لخدمة ومبيعات العملاء (Conversational AI Bot)
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
                {currentConfig.aiBotEnabled ? 'الرد الآلي مفعل' : 'الرد الآلي متوقف'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              يقوم البوت بالرد التلقائي الذكي على استفسارات الزبائن حول أسعار المنتجات وتوفر المقاسات والألوان في المخزن لحظياً، مع إرسال روابط الشراء المباشرة.
            </p>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: currentConfig.aiBotEnabled ? '#166534' : '#475569' }}>
              {currentConfig.aiBotEnabled ? 'مفعل' : 'تفعيل البوت'}
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
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>رابط استقبال رسائل الزبائن (Inbound Webhook URL):</strong>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              انسخ هذا الرابط وضعه في خانة <strong>Webhook URL</strong> في لوحة UltraMsg أو GreenAPI أو Meta Official API لاستقبال رسائل العملاء فورياً:
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
                {copiedWebhook ? 'تم النسخ!' : 'نسخ الرابط'}
              </Button>
            </div>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
              يدعم كود المحاكاة، UltraMsg، GreenAPI، و Meta Cloud API بنظام Webhook تلقائي موحد.
            </span>
          </div>

          {/* Custom Personality Prompt */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>توجيهات مخصصة للبوت (Shop Prompt Rules):</strong>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b' }}>
              اكتب أي شروط أو سياسات خاصة بمتجرك (مثال: نبرة الصوت، التوصيل المجاني، سياسة الاستبدال):
            </label>
            <textarea
              rows={3}
              placeholder="مثال: رحب بالعميل باسم متجرنا، واذكر أن مصاريف الشحن 35 ج فقط داخل القاهرة، ولدينا استبدال مجاني خلال 14 يوم..."
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
                محاكي محادثة واتساب التفاعلي (WhatsApp AI Live Simulator)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                اختبر ردود بوت الذكاء الاصطناعي مباشرة كأنك عميل على واتساب وتحقق من دقته في فحص أسعار ومخزون منتجاتك الحالية:
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
                <div style={{ fontSize: '13.5px', fontWeight: 800 }}>مساعد المتجر الذكي (WhatsApp AI Bot)</div>
                <div style={{ fontSize: '11px', opacity: 0.85 }}>متصل الآن • بالذكاء الاصطناعي</div>
              </div>
            </div>
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px' }}>
              تجربة حية
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
                جاري التفكير وصياغة الرد بالذكاء الاصطناعي...
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips */}
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {[
              'بكام المنتجات عندكم؟',
              'عندكم مقاس L متوفر وبكام؟',
              'عايز أطلب أونلاين يوصلني إمتى؟',
              'في عروض أو تخفيضات النهاردة؟',
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
              placeholder="اكتب سؤالك كأنك زبون يراسل المتجر على واتساب..."
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
              إرسال
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
                إعدادات حساب واتساب السحابي (Cloud WhatsApp Credentials)
              </h3>
              <span style={{ fontSize: '11px', background: currentConfig.enabled ? '#dcfce7' : '#f1f5f9', color: currentConfig.enabled ? '#166534' : '#64748b', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                {currentConfig.enabled ? 'البوابة مفعلة' : 'متوقفة'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              بيانات الاتصال برقم الواتساب لإرسال الفواتير الإلكترونية وإشعارات المتجر للعملاء.
            </p>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: currentConfig.enabled ? '#166534' : '#475569' }}>
              {currentConfig.enabled ? 'البوابة مفعلة' : 'تفعيل البوابة'}
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
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>مزود خدمة الواتساب السحابي:</strong>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                المزود المعتمد:
              </label>
              <select
                value={currentConfig.provider}
                onChange={(e) => setForm({ ...currentConfig, provider: e.target.value as any })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', fontWeight: 700 }}
              >
                <option value="ultramsg">UltraMsg (الأشهر في مصر والوطن العربي)</option>
                <option value="greenapi">Green API (بوابة عالمية مستقرة)</option>
                <option value="custom_webhook">Custom Webhook (بوابة أو سيرفر خاص بك)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                معرّف الحساب / Instance ID:
              </label>
              <input
                type="text"
                placeholder="مثال: instance98765"
                value={currentConfig.instanceId || ''}
                onChange={(e) => setForm({ ...currentConfig, instanceId: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', direction: 'ltr', textAlign: 'left', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                مفتاح الاتصال / Token:
              </label>
              <input
                type="password"
                placeholder="رمز الـ Token السري الخاص بحسابك..."
                value={currentConfig.token || ''}
                onChange={(e) => setForm({ ...currentConfig, token: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff', direction: 'ltr', textAlign: 'left', boxSizing: 'border-box' }}
              />
            </div>

            {currentConfig.provider === 'custom_webhook' && (
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                  رابط الويب هوك (Webhook URL):
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
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>قواعد الإرسال التلقائي الصامت:</strong>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={currentConfig.autoSendInvoice}
                onChange={(e) => setForm({ ...currentConfig, autoSendInvoice: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              <span>إرسال رابط الفاتورة الإلكترونية للعميل تلقائياً فور حفظ الفاتورة بالكاشير.</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={currentConfig.autoSendOnlineOrder}
                onChange={(e) => setForm({ ...currentConfig, autoSendOnlineOrder: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              <span>إرسال رسالة تأكيد للعميل فور وصول طلب من المتجر الإلكتروني.</span>
            </label>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                قالب رسالة الفاتورة (تتغير المتغيرات تلقائياً):
              </label>
              <textarea
                rows={3}
                value={currentConfig.invoiceTemplate}
                onChange={(e) => setForm({ ...currentConfig, invoiceTemplate: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#ffffff', boxSizing: 'border-box' }}
              />
              <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                المتغيرات المتاحة: {'{customerName}'}, {'{businessName}'}, {'{invoiceNo}'}, {'{totalAmount}'}, {'{invoiceLink}'}
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
              placeholder="رقم الهاتف للتجربة (مثلاً 010...)"
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
                  setFeedback({ kind: 'error', message: 'يرجى إدخال رقم الهاتف لإجراء الاختبار' });
                  return;
                }
                setFeedback(null);
                testMutation.mutate(testPhone.trim());
              }}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              {testMutation.isPending ? 'جاري الإرسال...' : 'إرسال رسالة اختبار'}
            </Button>
          </div>

          <Button
            type="button"
            variant="primary"
            disabled={saveMutation.isPending}
            onClick={handleSaveAll}
            style={{ background: '#170e5e', fontSize: '13px', padding: '8px 20px', fontWeight: 800 }}
          >
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات بالكامل'}
          </Button>
        </div>
      </div>
    </div>
  );
}
